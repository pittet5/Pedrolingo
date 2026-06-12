import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_lib/cors';
import { supabase } from './_lib/supabaseClient';
import { INITIAL_COURSES, Course, Student, mapDBCourse } from './_lib/initialData';

// In-memory fallback (note: does not persist between Vercel function invocations)
const memoryCourses: Course[] = [...INITIAL_COURSES];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  // GET /api/courses
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('courses')
          .select('*, studentsList:students(*)');
        if (error) throw error;
        return res.json({ success: true, data: (data || []).map(mapDBCourse) });
      }
      return res.json({ success: true, data: memoryCourses });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // POST /api/courses
  if (req.method === 'POST') {
    try {
      const body: Course = req.body;
      if (supabase) {
        const { data, error } = await supabase
          .from('courses')
          .insert({
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

        if (body.studentsList && body.studentsList.length > 0) {
          const studentsToInsert = body.studentsList.map((s: Student) => ({
            course_id: data.id,
            name: s.name,
            email: s.email,
            grade: s.grade,
            attendance: s.attendance,
            completed_lessons: s.completedLessons
          }));
          await supabase.from('students').insert(studentsToInsert);
        }

        return res.json({ success: true, data });
      }

      const newCourse = { ...body, id: `course-${Date.now()}` };
      memoryCourses.push(newCourse);
      return res.json({ success: true, data: newCourse });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
