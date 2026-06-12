import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_lib/cors';
import { supabase } from './_lib/supabaseClient';
import { INITIAL_COURSES } from './_lib/initialData';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    if (!supabase) {
      // Fallback: compute from memory
      const allStudents = INITIAL_COURSES.flatMap(c => c.studentsList || []);
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

    return res.json({ success: true, avgAttendance, avgGrade });
  } catch (e: any) {
    console.error('GET /api/stats error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
