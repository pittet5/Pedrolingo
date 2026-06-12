import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../../_lib/cors';
import { supabase } from '../../_lib/supabaseClient';
import { INITIAL_COURSES, INITIAL_SUBMISSIONS, mapDBSubmission } from '../../_lib/initialData';

const memorySubmissions = [...INITIAL_SUBMISSIONS];
const memoryCourses = [...INITIAL_COURSES];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;
  if (req.method !== 'PUT') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const submissionId = req.query.submissionId as string;
  if (!submissionId) {
    return res.status(400).json({ success: false, error: 'Submission ID é obrigatório.' });
  }

  const { score, feedback } = req.body;

  try {
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
        // Recalculate student grade
        const newStudentGrade = Math.round((student.grade + score) / 2);
        const newCompletedLessons = (student.completed_lessons || 0) + 1;

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

      return res.json({ success: true, data: submission });
    } else {
      const submission = memorySubmissions.find(s => s.id === submissionId);
      if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });

      submission.graded = true;
      submission.score = score;
      submission.feedback = feedback;

      // Find the corresponding student inside memoryCourses
      const course = memoryCourses.find(c => c.id === submission.courseId);
      if (course) {
        const student = course.studentsList.find(s => s.name === submission.studentName);
        if (student) {
          student.grade = Math.round((student.grade + score) / 2);
          student.completedLessons += 1;
        }

        // Re-calculate course average grade
        const avgGradeNum = course.studentsList.reduce((acc, s) => acc + s.grade, 0) / (course.studentsList.length || 1);
        let avgLabel = 'B+';
        if (avgGradeNum >= 90) avgLabel = 'A-';
        else if (avgGradeNum >= 85) avgLabel = 'B+';
        else if (avgGradeNum >= 80) avgLabel = 'B';
        else avgLabel = 'C';

        course.averageGrade = avgLabel;
      }

      return res.json({ success: true, data: submission });
    }
  } catch (e: any) {
    console.error('PUT /api/submissions/:submissionId/grade error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
