import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { setCors } from '../_lib/cors';
import { supabase } from '../_lib/supabaseClient';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'pedrolingomvp@gmail.com',
    pass: process.env.SMTP_PASS
  }
});

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'E-mail é obrigatório.' });
    }
    if (!supabase) {
      return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, name, email_verified')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }
    if (profile.email_verified) {
      return res.status(400).json({ success: false, error: 'E-mail já verificado.' });
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase
      .from('user_profiles')
      .update({ verification_code: code, verification_expires_at: expiresAt })
      .eq('id', profile.id);

    await transporter.sendMail({
      from: `"Pedrolingo" <${process.env.SMTP_USER || 'pedrolingomvp@gmail.com'}>`,
      to: email,
      subject: 'Novo código de verificação Pedrolingo',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0A1929;border-radius:16px;color:#fff;">
          <h1 style="font-size:24px;margin-bottom:8px;">🎓 Pedrolingo</h1>
          <p style="color:#94a3b8;margin-bottom:24px;">Olá, <strong style="color:#fff;">${profile.name}</strong>! Aqui está seu novo código:</p>
          <div style="background:#102A43;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:40px;font-weight:bold;color:#EFE4B0;margin-bottom:24px;">${code}</div>
          <p style="color:#64748b;font-size:13px;">Este código expira em <strong>15 minutos</strong>.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Novo código enviado.' });
  } catch (e: any) {
    console.error('POST /api/auth/resend-code error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}
