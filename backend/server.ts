import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabaseClient.js';
import {
  INITIAL_COURSES,
  INITIAL_SUBMISSIONS,
  INITIAL_ASSIGNMENTS,
  Course,
  Student,
  Assignment,
  StudentSubmission
} from './initialData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from root .env first, then local backend .env if exists
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Local memory store for fallback mode
let memoryCourses: Course[] = [...INITIAL_COURSES];
let memoryAssignments: Assignment[] = [...INITIAL_ASSIGNMENTS];
let memorySubmissions: StudentSubmission[] = [...INITIAL_SUBMISSIONS];

// Database mapping helpers
function mapDBCourse(c: any): Course {
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    language: c.language,
    term: c.term,
    studentsCount: c.students_count ?? 0,
    averageAttendance: c.average_attendance ?? 0,
    averageGrade: c.average_grade ?? 'N/A',
    studentsList: (c.studentsList || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      grade: s.grade ?? 0,
      attendance: s.attendance ?? 0,
      completedLessons: s.completed_lessons ?? 0
    }))
  };
}

function mapDBAssignment(a: any): Assignment {
  return {
    id: a.id,
    title: a.title,
    courseId: a.course_id,
    courseCode: a.course_code,
    dueDate: a.due_date,
    type: a.type,
    maxScore: a.max_score,
    description: a.description
  };
}

function mapDBSubmission(s: any): StudentSubmission {
  return {
    id: s.id,
    assignmentId: s.assignment_id,
    assignmentTitle: s.assignment_title,
    courseId: s.course_id,
    courseCode: s.course_code,
    studentName: s.student_name,
    studentResponse: s.student_response,
    submittedAt: s.submitted_at,
    graded: s.graded ?? false,
    score: s.score ?? undefined,
    feedback: s.feedback ?? undefined
  };
}

// AI Copilot Route
app.post('/api/copilot', async (req, res) => {
  try {
    const { message, actionType, courseInfo } = req.body;
    let promptText = `Você é o Co-Pilot de IA Pedrolingo. Responda ao usuário com dicas pedagógicas, gere quizzes ou sugeria planos de aula de acordo com a solicitação.\nMensagem: ${message}`;

    if (courseInfo) {
      promptText += `\nContexto do Curso: ${courseInfo.title} (${courseInfo.language}, código ${courseInfo.code}).`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
    });
    res.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error('Error with AI:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/courses
app.get('/api/courses', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('courses')
        .select('*, studentsList:students(*)');
      if (error) throw error;
      res.json({ success: true, data: (data || []).map(mapDBCourse) });
    } else {
      res.json({ success: true, data: memoryCourses });
    }
  } catch (e: any) {
    console.error('GET /api/courses error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/courses
app.post('/api/courses', async (req, res) => {
  try {
    const body: Course = req.body;
    if (supabase) {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          // Do NOT pass id — let Supabase generate a valid UUID automatically
          code: body.code,
          title: body.title,
          language: body.language,
          term: body.term,
          students_count: body.studentsCount ?? 0,
          average_attendance: body.averageAttendance ?? 0,
          average_grade: body.averageGrade ?? 'N/A'
        })
        .select()
        .single();
      if (error) throw error;

      // If students list was provided in body, insert them too
      if (body.studentsList && body.studentsList.length > 0) {
        const studentsToInsert = body.studentsList.map((s: Student) => ({
          // Do NOT pass id — let Supabase generate a valid UUID automatically
          course_id: data.id,
          name: s.name,
          email: s.email,
          grade: s.grade,
          attendance: s.attendance,
          completed_lessons: s.completedLessons
        }));
        await supabase.from('students').insert(studentsToInsert);
      }

      res.json({ success: true, data });
    } else {
      const newCourse = { ...body, id: body.id || `course-${Date.now()}` };
      memoryCourses.push(newCourse);
      res.json({ success: true, data: newCourse });
    }
  } catch (e: any) {
    console.error('POST /api/courses error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/courses/:courseId/students
app.post('/api/courses/:courseId/students', async (req, res) => {
  try {
    const { courseId } = req.params;
    const body: Student = req.body;
    if (supabase) {
      const { data, error } = await supabase
        .from('students')
        .insert({
          // Do NOT pass id — let Supabase generate a valid UUID automatically
          course_id: courseId,
          name: body.name,
          email: body.email,
          grade: body.grade,
          attendance: body.attendance,
          completed_lessons: body.completedLessons
        })
        .select()
        .single();
      if (error) throw error;

      // Update course count
      const { data: course } = await supabase.from('courses').select('students_count').eq('id', courseId).single();
      if (course) {
        await supabase
          .from('courses')
          .update({ students_count: (course.students_count || 0) + 1 })
          .eq('id', courseId);
      }

      res.json({ success: true, data });
    } else {
      const course = memoryCourses.find(c => c.id === courseId);
      if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

      const newStudent = { ...body, id: body.id || `stud-${Date.now()}` };
      course.studentsList.push(newStudent);
      course.studentsCount = course.studentsList.length;
      res.json({ success: true, data: newStudent });
    }
  } catch (e: any) {
    console.error('POST /api/courses/:courseId/students error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/assignments
app.get('/api/assignments', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('assignments').select('*');
      if (error) throw error;
      res.json({ success: true, data: (data || []).map(mapDBAssignment) });
    } else {
      res.json({ success: true, data: memoryAssignments });
    }
  } catch (e: any) {
    console.error('GET /api/assignments error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/assignments
app.post('/api/assignments', async (req, res) => {
  try {
    const body: Assignment = req.body;
    if (supabase) {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          id: body.id || undefined,
          course_id: body.courseId,
          course_code: body.courseCode,
          title: body.title,
          due_date: body.dueDate,
          type: body.type,
          max_score: body.maxScore,
          description: body.description
        })
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, data: mapDBAssignment(data) });
    } else {
      const newAssignment = { ...body, id: body.id || `assign-${Date.now()}` };
      memoryAssignments.push(newAssignment);
      res.json({ success: true, data: newAssignment });
    }
  } catch (e: any) {
    console.error('POST /api/assignments error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/submissions
app.get('/api/submissions', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('student_submissions').select('*');
      if (error) throw error;
      res.json({ success: true, data: (data || []).map(mapDBSubmission) });
    } else {
      res.json({ success: true, data: memorySubmissions });
    }
  } catch (e: any) {
    console.error('GET /api/submissions error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/submissions/:submissionId/grade
app.put('/api/submissions/:submissionId/grade', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;

    if (supabase) {
      // 1. Update the submission
      const { data: updatedSub, error: subErr } = await supabase
        .from('student_submissions')
        .update({ graded: true, score, feedback })
        .eq('id', submissionId)
        .select()
        .single();
      if (subErr) throw subErr;

      // 2. Load submission course info to find student and recalculate average
      const submission = mapDBSubmission(updatedSub);

      // Fetch students in this course
      const { data: student, error: studFetchErr } = await supabase
        .from('students')
        .select('*')
        .eq('course_id', submission.courseId)
        .eq('name', submission.studentName)
        .single();

      if (!studFetchErr && student) {
        // Recalculate student grade (approximate logic matching App.tsx)
        const newStudentGrade = Math.round((student.grade + score) / 2);
        const newCompletedLessons = student.completed_lessons + 1;

        await supabase
          .from('students')
          .update({ grade: newStudentGrade, completed_lessons: newCompletedLessons })
          .eq('id', student.id);

        // Re-evaluate course average grade
        const { data: allStudents } = await supabase
          .from('students')
          .select('grade')
          .eq('course_id', submission.courseId);

        if (allStudents && allStudents.length > 0) {
          const avgGradeNum = allStudents.reduce((acc: number, s: any) => acc + (s.grade || 0), 0) / allStudents.length;
          let avgLabel = 'B+';
          if (avgGradeNum >= 90) avgLabel = 'A-';
          else if (avgGradeNum >= 85) avgLabel = 'B+';
          else if (avgGradeNum >= 80) avgLabel = 'B';
          else avgLabel = 'C';

          await supabase
            .from('courses')
            .update({ average_grade: avgLabel })
            .eq('id', submission.courseId);
        }
      }

      res.json({ success: true, data: submission });
    } else {
      const submission = memorySubmissions.find((s: StudentSubmission) => s.id === submissionId);
      if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });

      submission.graded = true;
      submission.score = score;
      submission.feedback = feedback;

      // Find the corresponding student inside memoryCourses
      const course = memoryCourses.find(c => c.id === submission.courseId);
      if (course) {
        const student = course.studentsList.find((s: Student) => s.name === submission.studentName);
        if (student) {
          student.grade = Math.round((student.grade + score) / 2);
          student.completedLessons += 1;
        }

        // Re-calculate course average grade
        const avgGradeNum = course.studentsList.reduce((acc: number, s: Student) => acc + s.grade, 0) / (course.studentsList.length || 1);
        let avgLabel = 'B+';
        if (avgGradeNum >= 90) avgLabel = 'A-';
        else if (avgGradeNum >= 85) avgLabel = 'B+';
        else if (avgGradeNum >= 80) avgLabel = 'B';
        else avgLabel = 'C';

        course.averageGrade = avgLabel;
      }

      res.json({ success: true, data: submission });
    }
  } catch (e: any) {
    console.error('PUT /api/submissions/:submissionId/grade error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Setup paths for serving frontend build in production
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

// Fallback all non-API requests to index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Frontend not built. Please run "npm run build" first.');
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
