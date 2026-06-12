import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_lib/cors';
import { supabase } from './_lib/supabaseClient';
import { INITIAL_ASSIGNMENTS, Assignment, mapDBAssignment } from './_lib/initialData';

const memoryAssignments: Assignment[] = [...INITIAL_ASSIGNMENTS];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  // GET /api/assignments
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('assignments').select('*');
        if (error) throw error;
        return res.json({ success: true, data: (data || []).map(mapDBAssignment) });
      }
      return res.json({ success: true, data: memoryAssignments });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // POST /api/assignments
  if (req.method === 'POST') {
    try {
      const body: Assignment = req.body;
      if (supabase) {
        const { data, error } = await supabase
          .from('assignments')
          .insert({
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
        return res.json({ success: true, data: mapDBAssignment(data) });
      }

      const newAssignment = { ...body, id: `assign-${Date.now()}` };
      memoryAssignments.push(newAssignment);
      return res.json({ success: true, data: newAssignment });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
