import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../../_lib/cors';
import { supabase } from '../../_lib/supabaseClient';
import { INITIAL_COURSES, Course, Student } from '../../_lib/initialData';

const memoryCourses: Course[] = [...INITIAL_COURSES];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const courseId = req.query.courseId as string;
  const body: Student = req.body;

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('students')
        .insert({
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

      // Increment students_count on the course
      const { data: course } = await supabase
        .from('courses')
        .select('students_count')
        .eq('id', courseId)
        .single();
      if (course) {
        await supabase
          .from('courses')
          .update({ students_count: (course.students_count || 0) + 1 })
          .eq('id', courseId);
      }

      return res.json({ success: true, data });
    }

    const course = memoryCourses.find(c => c.id === courseId);
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

    const newStudent = { ...body, id: `stud-${Date.now()}` };
    course.studentsList.push(newStudent);
    course.studentsCount = course.studentsList.length;
    return res.json({ success: true, data: newStudent });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
