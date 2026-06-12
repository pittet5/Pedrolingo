import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcrypt';
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

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { name, email, password, role, avatar } = req.body;

    if (!name || !email || !password || !role || !avatar) {
      return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'Senha fraca. Use ao menos 8 caracteres com letra, número e símbolo.'
      });
    }
    if (!supabase) {
      return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });
    }

    // Check if email is already registered
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id, email_verified')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    if (existing) {
      if (existing.email_verified) {
        return res.status(409).json({ success: false, error: 'Este e-mail já está cadastrado.' });
      }
      // Re-register: update code for unverified account
      await supabase
        .from('user_profiles')
        .update({
          name,
          password_hash: passwordHash,
          role,
          avatar,
          verification_code: code,
          verification_expires_at: expiresAt
        })
        .eq('email', email.toLowerCase());
    } else {
      const { error: insertError } = await supabase.from('user_profiles').insert({
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role,
        avatar,
        email_verified: false,
        verification_code: code,
        verification_expires_at: expiresAt
      });
      if (insertError) throw insertError;
    }

    // Send verification email via Gmail SMTP
    await transporter.sendMail({
      from: `"Pedrolingo" <${process.env.SMTP_USER || 'pedrolingomvp@gmail.com'}>`,
      to: email,
      subject: 'Seu código de verificação Pedrolingo',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0A1929;border-radius:16px;color:#fff;">
          <h1 style="font-size:24px;margin-bottom:8px;">🎓 Pedrolingo</h1>
          <p style="color:#94a3b8;margin-bottom:24px;">Olá, <strong style="color:#fff;">${name}</strong>! Use o código abaixo para verificar seu e-mail:</p>
          <div style="background:#102A43;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:40px;font-weight:bold;color:#EFE4B0;margin-bottom:24px;">${code}</div>
          <p style="color:#64748b;font-size:13px;">Este código expira em <strong>15 minutos</strong>. Se você não fez este cadastro, ignore este e-mail.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Código de verificação enviado para ' + email });
  } catch (e: any) {
    console.error('POST /api/auth/register error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}
