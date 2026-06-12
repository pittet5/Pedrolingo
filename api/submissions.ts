import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_lib/cors';
import { supabase } from './_lib/supabaseClient';
import { INITIAL_SUBMISSIONS, mapDBSubmission } from './_lib/initialData';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    if (supabase) {
      const { data, error } = await supabase.from('student_submissions').select('*');
      if (error) throw error;
      return res.json({ success: true, data: (data || []).map(mapDBSubmission) });
    } else {
      return res.json({ success: true, data: INITIAL_SUBMISSIONS });
    }
  } catch (e: any) {
    console.error('GET /api/submissions error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
