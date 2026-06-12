import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../_lib/cors';
import { supabase } from '../_lib/supabaseClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

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
}
