import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../../_lib/cors';
import { supabase } from '../../_lib/supabaseClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ success: false, error: 'ID do perfil é obrigatório.' });
  }

  if (!supabase) {
    return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });
  }

  // GET /api/auth/profile/:id
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, role, avatar, email, notifications_enabled, animations_enabled')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, error: 'Perfil não encontrado.' });

      return res.json({ success: true, profile: data });
    } catch (e: any) {
      console.error('GET /api/auth/profile/:id error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // PATCH /api/auth/profile/:id
  if (req.method === 'PATCH') {
    try {
      const { notifications_enabled, animations_enabled } = req.body;
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
      return res.json({ success: true, profile: data });
    } catch (e: any) {
      console.error('PATCH /api/auth/profile/:id error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // DELETE /api/auth/profile/:id
  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      console.error('DELETE /api/auth/profile/:id error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
