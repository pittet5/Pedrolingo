import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap, Users, ArrowRight, Sparkles, ChevronLeft,
  UserCircle, Mail, Lock, Eye, EyeOff, CheckCircle, XCircle, RefreshCw, ShieldCheck
} from 'lucide-react';

export interface UserProfile {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  avatar: string;
  email: string;
}

interface LoginScreenProps {
  onLogin: (profile: UserProfile) => void;
}

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Adrian&backgroundColor=d1d4f9',
];

type View = 'welcome' | 'login' | 'register' | 'verify';

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  checks: { label: string; passed: boolean }[];
}

function evaluatePassword(password: string): PasswordStrength {
  const checks = [
    { label: 'Mínimo 8 caracteres', passed: password.length >= 8 },
    { label: 'Uma letra', passed: /[a-zA-Z]/.test(password) },
    { label: 'Um número', passed: /[0-9]/.test(password) },
    { label: 'Um símbolo (!@#$...)', passed: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.passed).length;
  const labels = ['Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  return { score, label: labels[score], color: colors[score], checks };
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [view, setView] = useState<View>('welcome');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState<'teacher' | 'student' | null>(null);
  const [regAvatar, setRegAvatar] = useState(AVATARS[0]);

  // Verify state
  const [verifyEmail, setVerifyEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const passwordStrength = evaluatePassword(regPassword);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(v => v - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const clearMessages = () => { setError(null); setSuccessMsg(null); };

  // ── LOGIN ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.profile);
      } else if (data.needsVerification) {
        setVerifyEmail(data.email || loginEmail);
        setView('verify');
      } else {
        setError(data.error || 'Erro ao fazer login.');
      }
    } catch {
      setError('Erro de rede. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ─────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!regRole) { setError('Selecione o tipo de perfil.'); return; }
    if (passwordStrength.score < 4) { setError('Escolha uma senha mais forte.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, role: regRole, avatar: regAvatar })
      });
      const data = await res.json();
      if (data.success) {
        setVerifyEmail(regEmail);
        setResendCooldown(60);
        setView('verify');
        setSuccessMsg('Código enviado! Verifique seu e-mail.');
      } else {
        setError(data.error || 'Erro ao criar conta.');
      }
    } catch {
      setError('Erro de rede. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── VERIFY ───────────────────────────────────────────────────────────────
  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const code = otp.join('');
    if (code.length < 6) { setError('Digite o código completo de 6 dígitos.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail, code })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.profile);
      } else {
        setError(data.error || 'Código inválido.');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } catch {
      setError('Erro de rede. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Novo código enviado!');
        setResendCooldown(60);
      } else {
        setError(data.error || 'Erro ao reenviar.');
      }
    } catch {
      setError('Erro de rede. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A1929] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-20 h-20 rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/30 mb-6 border border-white/10 z-10 bg-white flex shrink-0"
      >
        <img src="/logo.png" alt="Pedrolingo Logo" className="w-full h-full object-contain" />
      </motion.div>

      {/* Error / Success toast */}
      <AnimatePresence>
        {(error || successMsg) && (
          <motion.div
            key={error ? 'error' : 'success'}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full flex items-center gap-2.5 shadow-2xl text-sm font-semibold ${error
              ? 'bg-red-950/90 border border-red-500/40 text-red-300'
              : 'bg-emerald-950/90 border border-emerald-500/40 text-emerald-300'
              }`}
          >
            {error ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            {error || successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-lg relative z-10">
        <AnimatePresence mode="wait">

          {/* ── WELCOME ── */}
          {view === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center"
            >
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
                Bem-vindo ao <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Pedrolingo</span>
              </h1>
              <p className="text-slate-400 text-base mb-10 max-w-sm">
                Plataforma acadêmica para professores e alunos. Faça login ou crie sua conta para começar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { clearMessages(); setView('login'); }}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  <Lock className="w-5 h-5" />
                  Entrar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { clearMessages(); setView('register'); }}
                  className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/10 transition cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Criar Conta
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── LOGIN ── */}
          {view === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <button onClick={() => { clearMessages(); setView('welcome'); }} className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6 font-semibold text-sm cursor-pointer">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="text-3xl font-bold text-white mb-1">Entrar</h2>
              <p className="text-slate-400 text-sm mb-8">Use seu e-mail e senha cadastrados.</p>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                {/* Password */}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  <button type="button" onClick={() => setShowLoginPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer">
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.02 } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" /> Entrar</>}
                </motion.button>
              </form>

              <p className="text-center text-slate-500 text-sm mt-6">
                Não tem conta?{' '}
                <button onClick={() => { clearMessages(); setView('register'); }} className="text-blue-400 hover:text-blue-300 font-semibold transition cursor-pointer">
                  Criar agora
                </button>
              </p>
            </motion.div>
          )}

          {/* ── REGISTER ── */}
          {view === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <button onClick={() => { clearMessages(); setView('welcome'); }} className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6 font-semibold text-sm cursor-pointer">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="text-3xl font-bold text-white mb-1">Criar Conta</h2>
              <p className="text-slate-400 text-sm mb-8">Preencha os dados para se cadastrar.</p>

              <form onSubmit={handleRegister} className="space-y-5">
                {/* Name */}
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="reg-name"
                    type="text"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Password + Strength */}
                <div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Crie uma senha forte"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <button type="button" onClick={() => setShowRegPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer">
                      {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {regPassword && (
                    <div className="mt-3 space-y-2">
                      {/* Strength bar */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className="flex-1 h-1.5 rounded-full transition-all duration-300"
                            style={{ background: i <= passwordStrength.score ? passwordStrength.color : '#1e293b' }}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-semibold" style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {passwordStrength.checks.map(c => (
                          <div key={c.label} className={`flex items-center gap-1.5 text-[11px] font-medium ${c.passed ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {c.passed ? <CheckCircle className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                            {c.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tipo de Perfil</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      id="role-student"
                      onClick={() => setRegRole('student')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${regRole === 'student' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                    >
                      <Users className={`w-7 h-7 ${regRole === 'student' ? 'text-blue-400' : ''}`} />
                      <span className="font-bold text-sm">Aluno</span>
                    </button>
                    <button
                      type="button"
                      id="role-teacher"
                      onClick={() => setRegRole('teacher')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${regRole === 'teacher' ? 'bg-emerald-500/20 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                    >
                      <GraduationCap className={`w-7 h-7 ${regRole === 'teacher' ? 'text-emerald-400' : ''}`} />
                      <span className="font-bold text-sm">Professor</span>
                    </button>
                  </div>
                </div>

                {/* Avatar */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Escolha um Avatar</label>
                  <div className="flex flex-wrap gap-3">
                    {AVATARS.map(url => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setRegAvatar(url)}
                        className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${regAvatar === url ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/30' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                      >
                        <img src={url} alt="Avatar" className="w-full h-full object-cover bg-white" />
                      </button>
                    ))}
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || !regName || !regEmail || !regPassword || !regRole}
                  whileHover={(!loading && regName && regEmail && regPassword && regRole) ? { scale: 1.02 } : {}}
                  whileTap={(!loading && regName && regEmail && regPassword && regRole) ? { scale: 0.98 } : {}}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {loading
                    ? <RefreshCw className="w-5 h-5 animate-spin" />
                    : <><ArrowRight className="w-5 h-5" /> Criar Conta e Verificar E-mail</>
                  }
                </motion.button>
              </form>

              <p className="text-center text-slate-500 text-sm mt-6">
                Já tem conta?{' '}
                <button onClick={() => { clearMessages(); setView('login'); }} className="text-blue-400 hover:text-blue-300 font-semibold transition cursor-pointer">
                  Fazer login
                </button>
              </p>
            </motion.div>
          )}

          {/* ── VERIFY ── */}
          {view === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Verificar E-mail</h2>
              <p className="text-slate-400 text-sm mb-2">
                Enviamos um código de 6 dígitos para
              </p>
              <p className="text-white font-semibold text-sm mb-8 bg-white/5 inline-block px-4 py-1.5 rounded-full border border-white/10">
                {verifyEmail}
              </p>

              <form onSubmit={handleVerify} className="space-y-6">
                {/* OTP inputs */}
                <div className="flex gap-3 justify-center">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  ))}
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || otp.join('').length < 6}
                  whileHover={(!loading && otp.join('').length === 6) ? { scale: 1.02 } : {}}
                  whileTap={(!loading && otp.join('').length === 6) ? { scale: 0.98 } : {}}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {loading
                    ? <RefreshCw className="w-5 h-5 animate-spin" />
                    : <><CheckCircle className="w-5 h-5" /> Verificar e Entrar</>
                  }
                </motion.button>
              </form>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleResendCode}
                  disabled={loading || resendCooldown > 0}
                  className="flex items-center justify-center gap-2 mx-auto text-sm font-semibold text-slate-400 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
                </button>
                <button
                  onClick={() => { clearMessages(); setView('register'); }}
                  className="block mx-auto text-xs text-slate-600 hover:text-slate-400 transition cursor-pointer"
                >
                  Voltar ao cadastro
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
