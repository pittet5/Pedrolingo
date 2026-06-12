import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'pedrolingomvp@gmail.com',
    pass: process.env.SMTP_PASS
  }
});

// Password strength: at least 8 chars, 1 letter, 1 number, 1 special char
function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


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

// ─── AUTH ROUTES ────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, avatar } = req.body;

    if (!name || !email || !password || !role || !avatar) {
      return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'Senha fraca. Use ao menos 8 caracteres com letra, número e símbolo.'
      });
    }
    if (!supabase) {
      return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });
    }

    // Check if email is already registered
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id, email_verified')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    if (existing) {
      if (existing.email_verified) {
        return res.status(409).json({ success: false, error: 'Este e-mail já está cadastrado.' });
      }
      // Re-register: update code for unverified account
      await supabase
        .from('user_profiles')
        .update({
          name,
          password_hash: passwordHash,
          role,
          avatar,
          verification_code: code,
          verification_expires_at: expiresAt
        })
        .eq('email', email.toLowerCase());
    } else {
      const { error: insertError } = await supabase.from('user_profiles').insert({
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role,
        avatar,
        email_verified: false,
        verification_code: code,
        verification_expires_at: expiresAt
      });
      if (insertError) throw insertError;
    }

    // Send verification email via Gmail SMTP
    await transporter.sendMail({
      from: `"Pedrolingo" <${process.env.SMTP_USER || 'pedrolingomvp@gmail.com'}>`,
      to: email,
      subject: 'Seu código de verificação Pedrolingo',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0A1929;border-radius:16px;color:#fff;">
          <h1 style="font-size:24px;margin-bottom:8px;">🎓 Pedrolingo</h1>
          <p style="color:#94a3b8;margin-bottom:24px;">Olá, <strong style="color:#fff;">${name}</strong>! Use o código abaixo para verificar seu e-mail:</p>
          <div style="background:#102A43;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:40px;font-weight:bold;color:#EFE4B0;margin-bottom:24px;">${code}</div>
          <p style="color:#64748b;font-size:13px;">Este código expira em <strong>15 minutos</strong>. Se você não fez este cadastro, ignore este e-mail.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Código de verificação enviado para ' + email });
  } catch (e: any) {
    console.error('POST /api/auth/register error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/auth/verify
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'E-mail e código são obrigatórios.' });
    }
    if (!supabase) {
      return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }
    if (profile.email_verified) {
      return res.status(400).json({ success: false, error: 'E-mail já verificado. Faça login.' });
    }
    if (profile.verification_code !== code) {
      return res.status(400).json({ success: false, error: 'Código incorreto.' });
    }
    if (new Date() > new Date(profile.verification_expires_at)) {
      return res.status(400).json({ success: false, error: 'Código expirado. Solicite um novo.' });
    }

    await supabase
      .from('user_profiles')
      .update({ email_verified: true, verification_code: null, verification_expires_at: null })
      .eq('id', profile.id);

    res.json({
      success: true,
      profile: { id: profile.id, name: profile.name, role: profile.role, avatar: profile.avatar, email: profile.email }
    });
  } catch (e: any) {
    console.error('POST /api/auth/verify error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
    }
    if (!supabase) {
      return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!profile) {
      return res.status(401).json({ success: false, error: 'E-mail ou senha incorretos.' });
    }
    if (!profile.email_verified) {
      return res.status(403).json({ success: false, error: 'E-mail não verificado. Verifique sua caixa de entrada.', needsVerification: true, email: profile.email });
    }

    const passwordMatch = await bcrypt.compare(password, profile.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'E-mail ou senha incorretos.' });
    }

    res.json({
      success: true,
      profile: { id: profile.id, name: profile.name, role: profile.role, avatar: profile.avatar, email: profile.email }
    });
  } catch (e: any) {
    console.error('POST /api/auth/login error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/auth/resend-code
app.post('/api/auth/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'E-mail é obrigatório.' });
    }
    if (!supabase) {
      return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, name, email_verified')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }
    if (profile.email_verified) {
      return res.status(400).json({ success: false, error: 'E-mail já verificado.' });
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase
      .from('user_profiles')
      .update({ verification_code: code, verification_expires_at: expiresAt })
      .eq('id', profile.id);

    await transporter.sendMail({
      from: `"Pedrolingo" <${process.env.SMTP_USER || 'pedrolingomvp@gmail.com'}>`,
      to: email,
      subject: 'Novo código de verificação Pedrolingo',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0A1929;border-radius:16px;color:#fff;">
          <h1 style="font-size:24px;margin-bottom:8px;">🎓 Pedrolingo</h1>
          <p style="color:#94a3b8;margin-bottom:24px;">Olá, <strong style="color:#fff;">${profile.name}</strong>! Aqui está seu novo código:</p>
          <div style="background:#102A43;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:40px;font-weight:bold;color:#EFE4B0;margin-bottom:24px;">${code}</div>
          <p style="color:#64748b;font-size:13px;">Este código expira em <strong>15 minutos</strong>.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Novo código enviado.' });
  } catch (e: any) {
    console.error('POST /api/auth/resend-code error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});


// ─── PROFILE MANAGEMENT ─────────────────────────────────────────────────────

// GET /api/auth/profile/:id
app.get('/api/auth/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, name, role, avatar, email, notifications_enabled, animations_enabled')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Perfil não encontrado.' });

    res.json({ success: true, profile: data });
  } catch (e: any) {
    console.error('GET /api/auth/profile/:id error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH /api/auth/profile/:id  — update preferences
app.patch('/api/auth/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { notifications_enabled, animations_enabled } = req.body;
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

    const updates: Record<string, any> = {};
    if (notifications_enabled !== undefined) updates.notifications_enabled = notifications_enabled;
    if (animations_enabled !== undefined) updates.animations_enabled = animations_enabled;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select('id, notifications_enabled, animations_enabled')
      .single();

    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (e: any) {
    console.error('PATCH /api/auth/profile/:id error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/auth/profile/:id
app.delete('/api/auth/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    console.error('DELETE /api/auth/profile/:id error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── STUDENT PROGRESS ───────────────────────────────────────────────────────

// GET /api/student/progress/:userId  — fetch or auto-create progress row
app.get('/api/student/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

    let { data, error } = await supabase
      .from('student_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    // Auto-create if not yet existing
    if (!data) {
      const { data: created, error: createErr } = await supabase
        .from('student_progress')
        .insert({ user_id: userId, goal_progress: 0, completed_quizzes: [] })
        .select()
        .single();
      if (createErr) throw createErr;
      data = created;
    }

    res.json({ success: true, progress: data });
  } catch (e: any) {
    console.error('GET /api/student/progress/:userId error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH /api/student/progress/:userId  — update goal_progress and/or completed_quizzes
app.patch('/api/student/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { goal_progress, completed_quizzes } = req.body;
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (goal_progress !== undefined) updates.goal_progress = goal_progress;
    if (completed_quizzes !== undefined) updates.completed_quizzes = completed_quizzes;

    const { data, error } = await supabase
      .from('student_progress')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, progress: data });
  } catch (e: any) {
    console.error('PATCH /api/student/progress/:userId error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── TEACHER STATS ──────────────────────────────────────────────────────────

// GET /api/stats  — compute real averages from DB
app.get('/api/stats', async (req, res) => {
  try {
    if (!supabase) {
      // Fallback: compute from memory
      const allStudents = memoryCourses.flatMap(c => c.studentsList);
      const count = allStudents.length || 1;
      const avgAttendance = Math.round(allStudents.reduce((a, s) => a + s.attendance, 0) / count);
      const avgGrade = Math.round(allStudents.reduce((a, s) => a + s.grade, 0) / count);
      return res.json({ success: true, avgAttendance, avgGrade });
    }

    const { data: students, error } = await supabase
      .from('students')
      .select('grade, attendance');

    if (error) throw error;

    const count = students?.length || 0;
    if (count === 0) {
      return res.json({ success: true, avgAttendance: 0, avgGrade: 0 });
    }

    const avgAttendance = Math.round(
      students.reduce((a: number, s: any) => a + (s.attendance || 0), 0) / count
    );
    const avgGrade = Math.round(
      students.reduce((a: number, s: any) => a + (s.grade || 0), 0) / count
    );

    res.json({ success: true, avgAttendance, avgGrade });
  } catch (e: any) {
    console.error('GET /api/stats error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── AI COPILOT ─────────────────────────────────────────────────────────────


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
