import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../../_lib/cors';
import { supabase } from '../../_lib/supabaseClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID é obrigatório.' });
  }

  if (!supabase) {
    return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });
  }

  // GET /api/student/progress/:userId
  if (req.method === 'GET') {
    try {
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

      return res.json({ success: true, progress: data });
    } catch (e: any) {
      console.error('GET /api/student/progress/:userId error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // PATCH /api/student/progress/:userId
  if (req.method === 'PATCH') {
    try {
      const { goal_progress, completed_quizzes } = req.body;
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
      return res.json({ success: true, progress: data });
    } catch (e: any) {
      console.error('PATCH /api/student/progress/:userId error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
