import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { setCors } from '../_lib/cors';
import { supabase } from '../_lib/supabaseClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

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
      return res.status(403).json({
        success: false,
        error: 'E-mail não verificado. Verifique sua caixa de entrada.',
        needsVerification: true,
        email: profile.email
      });
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
}
