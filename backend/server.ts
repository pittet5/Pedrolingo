import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import multer from 'multer';
import { supabase } from './supabaseClient.js';
import {
  INITIAL_COURSES,
  INITIAL_SUBMISSIONS,
  INITIAL_ASSIGNMENTS,
  Course,
  Student,
  Assignment,
  StudentSubmission
} from './initialData.js';

// Multer: store uploads in memory (max 100MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from root .env first, then local backend .env if exists
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'pedrolingomvp@gmail.com',
    pass: process.env.SMTP_PASS
  }
});

// Password strength: at least 8 chars, 1 letter, 1 number, 1 special char
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


// Local memory store for fallback mode
let memoryCourses: Course[] = [...INITIAL_COURSES];
let memoryAssignments: Assignment[] = [...INITIAL_ASSIGNMENTS];
let memorySubmissions: StudentSubmission[] = [...INITIAL_SUBMISSIONS];

// Database mapping helpers
function mapDBCourse(c: any): Course {
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    language: c.language,
    term: c.term,
    studentsCount: c.students_count ?? 0,
    averageAttendance: c.average_attendance ?? 0,
    averageGrade: c.average_grade ?? 'N/A',
    teacherId: c.teacher_id ?? undefined,
    studentsList: (c.studentsList || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      grade: s.grade ?? 0,
      attendance: s.attendance ?? 0,
      completedLessons: s.completed_lessons ?? 0
    }))
  };
}

function mapDBAssignment(a: any): Assignment {
  return {
    id: a.id,
    title: a.title,
    courseId: a.course_id,
    courseCode: a.course_code,
    dueDate: a.due_date,
    type: a.type,
    maxScore: a.max_score,
    description: a.description,
    requiresFileUpload: a.requires_file_upload ?? false,
    fileUploadDescription: a.file_upload_description ?? undefined
  };
}

function mapDBSubmission(s: any): StudentSubmission {
  return {
    id: s.id,
    assignmentId: s.assignment_id,
    assignmentTitle: s.assignment_title,
    courseId: s.course_id,
    courseCode: s.course_code,
    studentName: s.student_name,
    studentResponse: s.student_response,
    submittedAt: s.submitted_at,
    graded: s.graded ?? false,
    score: s.score ?? undefined,
    feedback: s.feedback ?? undefined
  };
}

// ─── AUTH ROUTES ────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
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
});

// POST /api/auth/verify
app.post('/api/auth/verify', async (req, res) => {
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
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
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
      return res.status(403).json({ success: false, error: 'E-mail não verificado. Verifique sua caixa de entrada.', needsVerification: true, email: profile.email });
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
});

// POST /api/auth/resend-code
app.post('/api/auth/resend-code', async (req, res) => {
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
});


// ─── PROFILE MANAGEMENT ─────────────────────────────────────────────────────

// GET /api/auth/profile/:id
app.get('/api/auth/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, name, role, avatar, email, notifications_enabled, animations_enabled')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Perfil não encontrado.' });

    res.json({ success: true, profile: data });
  } catch (e: any) {
    console.error('GET /api/auth/profile/:id error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH /api/auth/profile/:id  — update preferences
app.patch('/api/auth/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { notifications_enabled, animations_enabled } = req.body;
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

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
    res.json({ success: true, profile: data });
  } catch (e: any) {
    console.error('PATCH /api/auth/profile/:id error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/auth/profile/:id
app.delete('/api/auth/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    console.error('DELETE /api/auth/profile/:id error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── STUDENT PROGRESS ───────────────────────────────────────────────────────

// GET /api/student/progress/:userId  — fetch or auto-create progress row
app.get('/api/student/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

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

    res.json({ success: true, progress: data });
  } catch (e: any) {
    console.error('GET /api/student/progress/:userId error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH /api/student/progress/:userId  — update goal_progress and/or completed_quizzes
app.patch('/api/student/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { goal_progress, completed_quizzes } = req.body;
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

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
    res.json({ success: true, progress: data });
  } catch (e: any) {
    console.error('PATCH /api/student/progress/:userId error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── TEACHER STATS ──────────────────────────────────────────────────────────

// GET /api/stats  — compute real averages from DB
app.get('/api/stats', async (req, res) => {
  try {
    if (!supabase) {
      // Fallback: compute from memory
      const allStudents = memoryCourses.flatMap(c => c.studentsList);
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

    res.json({ success: true, avgAttendance, avgGrade });
  } catch (e: any) {
    console.error('GET /api/stats error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── AI COPILOT ─────────────────────────────────────────────────────────────


// AI Copilot Route
app.post('/api/copilot', async (req, res) => {
  try {
    const { message, actionType, courseInfo } = req.body;
    let promptText = `Você é o Co-Pilot de IA Pedrolingo. Responda ao usuário com dicas pedagógicas, gere quizzes ou sugeria planos de aula de acordo com a solicitação.\nMensagem: ${message}`;

    if (courseInfo) {
      promptText += `\nContexto do Curso: ${courseInfo.title} (${courseInfo.language}, código ${courseInfo.code}).`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
    });
    res.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error('Error with AI:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/courses
app.get('/api/courses', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('courses')
        .select('*, studentsList:students(*)');
      if (error) throw error;
      res.json({ success: true, data: (data || []).map(mapDBCourse) });
    } else {
      res.json({ success: true, data: memoryCourses });
    }
  } catch (e: any) {
    console.error('GET /api/courses error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/courses
app.post('/api/courses', async (req, res) => {
  try {
    const body: Course & { teacherId?: string } = req.body;
    if (supabase) {
      // Enforce: one active course per teacher
      if (body.teacherId) {
        const { data: existing } = await supabase
          .from('courses')
          .select('id, title')
          .eq('teacher_id', body.teacherId)
          .maybeSingle();
        if (existing) {
          return res.status(409).json({
            success: false,
            error: `Você já possui um curso ativo: "${existing.title}". Cada professor pode ter apenas um curso ativo por vez.`
          });
        }
      }

      const { data, error } = await supabase
        .from('courses')
        .insert({
          code: body.code,
          title: body.title,
          language: body.language,
          term: body.term,
          students_count: body.studentsCount ?? 0,
          average_attendance: body.averageAttendance ?? 0,
          average_grade: body.averageGrade ?? 'N/A',
          teacher_id: body.teacherId ?? null
        })
        .select()
        .single();
      if (error) throw error;

      // If students list was provided in body, insert them too
      if (body.studentsList && body.studentsList.length > 0) {
        const studentsToInsert = body.studentsList.map((s: Student) => ({
          course_id: data.id,
          name: s.name,
          email: s.email,
          grade: s.grade,
          attendance: s.attendance,
          completed_lessons: s.completedLessons
        }));
        await supabase.from('students').insert(studentsToInsert);
      }

      res.json({ success: true, data: mapDBCourse(data) });
    } else {
      // In-memory: one active course per teacher
      if (body.teacherId) {
        const existing = memoryCourses.find(c => (c as any).teacherId === body.teacherId);
        if (existing) {
          return res.status(409).json({
            success: false,
            error: `Você já possui um curso ativo: "${existing.title}". Cada professor pode ter apenas um curso ativo por vez.`
          });
        }
      }
      const newCourse = { ...body, id: body.id || `course-${Date.now()}` };
      memoryCourses.push(newCourse);
      res.json({ success: true, data: newCourse });
    }
  } catch (e: any) {
    console.error('POST /api/courses error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/courses/:courseId/students
app.post('/api/courses/:courseId/students', async (req, res) => {
  try {
    const { courseId } = req.params;
    const body: Student = req.body;
    if (supabase) {
      const { data, error } = await supabase
        .from('students')
        .insert({
          // Do NOT pass id — let Supabase generate a valid UUID automatically
          course_id: courseId,
          name: body.name,
          email: body.email,
          grade: body.grade,
          attendance: body.attendance,
          completed_lessons: body.completedLessons
        })
        .select()
        .single();
      if (error) throw error;

      // Update course count
      const { data: course } = await supabase.from('courses').select('students_count').eq('id', courseId).single();
      if (course) {
        await supabase
          .from('courses')
          .update({ students_count: (course.students_count || 0) + 1 })
          .eq('id', courseId);
      }

      res.json({ success: true, data });
    } else {
      const course = memoryCourses.find(c => c.id === courseId);
      if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

      const newStudent = { ...body, id: body.id || `stud-${Date.now()}` };
      course.studentsList.push(newStudent);
      course.studentsCount = course.studentsList.length;
      res.json({ success: true, data: newStudent });
    }
  } catch (e: any) {
    console.error('POST /api/courses/:courseId/students error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/assignments
app.get('/api/assignments', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('assignments').select('*');
      if (error) throw error;
      res.json({ success: true, data: (data || []).map(mapDBAssignment) });
    } else {
      res.json({ success: true, data: memoryAssignments });
    }
  } catch (e: any) {
    console.error('GET /api/assignments error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/assignments
app.post('/api/assignments', async (req, res) => {
  try {
    const body: Assignment = req.body;
    if (supabase) {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          id: body.id || undefined,
          course_id: body.courseId,
          course_code: body.courseCode,
          title: body.title,
          due_date: body.dueDate,
          type: body.type,
          max_score: body.maxScore,
          description: body.description,
          requires_file_upload: body.requiresFileUpload ?? false,
          file_upload_description: body.fileUploadDescription ?? null
        })
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, data: mapDBAssignment(data) });
    } else {
      const newAssignment = { ...body, id: body.id || `assign-${Date.now()}` };
      memoryAssignments.push(newAssignment);
      res.json({ success: true, data: newAssignment });
    }
  } catch (e: any) {
    console.error('POST /api/assignments error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── TEACHER INFO ────────────────────────────────────────────────────────────

// GET /api/courses/:courseId/teacher — fetch teacher profile for a course
app.get('/api/courses/:courseId/teacher', async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .maybeSingle();
    if (courseErr) throw courseErr;
    if (!course?.teacher_id) return res.json({ success: true, teacher: null });

    const { data: teacher, error: teacherErr } = await supabase
      .from('user_profiles')
      .select('id, name, email, avatar')
      .eq('id', course.teacher_id)
      .maybeSingle();
    if (teacherErr) throw teacherErr;

    res.json({ success: true, teacher });
  } catch (e: any) {
    console.error('GET /api/courses/:courseId/teacher error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── CHAT ────────────────────────────────────────────────────────────────────

// GET /api/chat/:courseId/:studentId — fetch messages for a student-teacher conversation
app.get('/api/chat/:courseId/:studentId', async (req, res) => {
  try {
    const { courseId, studentId } = req.params;
    if (!supabase) return res.json({ success: true, messages: [] });

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const messages = (data || []).map((m: any) => ({
      id: m.id,
      courseId: m.course_id,
      studentId: m.student_id,
      senderId: m.sender_id,
      senderRole: m.sender_role,
      senderName: m.sender_name,
      message: m.message,
      createdAt: m.created_at
    }));
    res.json({ success: true, messages });
  } catch (e: any) {
    console.error('GET /api/chat error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/chat/:courseId/:studentId — send a chat message
app.post('/api/chat/:courseId/:studentId', async (req, res) => {
  try {
    const { courseId, studentId } = req.params;
    const { senderId, senderRole, senderName, message } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, error: 'Mensagem não pode ser vazia.' });
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ course_id: courseId, student_id: studentId, sender_id: senderId, sender_role: senderRole, sender_name: senderName, message: message.trim() })
      .select()
      .single();
    if (error) throw error;

    res.json({
      success: true,
      message: {
        id: data.id,
        courseId: data.course_id,
        studentId: data.student_id,
        senderId: data.sender_id,
        senderRole: data.sender_role,
        senderName: data.sender_name,
        message: data.message,
        createdAt: data.created_at
      }
    });
  } catch (e: any) {
    console.error('POST /api/chat error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────

// POST /api/assignments/:assignmentId/upload — upload a file for an assignment (max 100MB)
app.post('/api/assignments/:assignmentId/upload', upload.single('file'), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { studentId } = req.body;

    if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado.' });
    if (!studentId) return res.status(400).json({ success: false, error: 'studentId é obrigatório.' });
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

    const file = req.file;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `assignments/${assignmentId}/${studentId}/${Date.now()}_${safeName}`;

    // Upload to Supabase Storage bucket "assignment-files"
    const { data: storageData, error: storageErr } = await supabase.storage
      .from('assignment-files')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });
    if (storageErr) throw storageErr;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('assignment-files')
      .getPublicUrl(storagePath);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Save metadata to DB
    const { data: fileMeta, error: metaErr } = await supabase
      .from('assignment_files')
      .insert({
        assignment_id: assignmentId,
        student_id: studentId,
        file_name: file.originalname,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.mimetype,
        expires_at: expiresAt
      })
      .select()
      .single();
    if (metaErr) throw metaErr;

    res.json({
      success: true,
      file: {
        id: fileMeta.id,
        assignmentId: fileMeta.assignment_id,
        studentId: fileMeta.student_id,
        fileName: fileMeta.file_name,
        fileUrl: fileMeta.file_url,
        fileSize: fileMeta.file_size,
        mimeType: fileMeta.mime_type,
        uploadedAt: fileMeta.uploaded_at,
        expiresAt: fileMeta.expires_at
      }
    });
  } catch (e: any) {
    console.error('POST /api/assignments/:assignmentId/upload error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/assignments/:assignmentId/files/:studentId — list uploaded files for an assignment
app.get('/api/assignments/:assignmentId/files/:studentId', async (req, res) => {
  try {
    const { assignmentId, studentId } = req.params;
    if (!supabase) return res.json({ success: true, files: [] });

    const { data, error } = await supabase
      .from('assignment_files')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;

    const files = (data || []).map((f: any) => ({
      id: f.id,
      assignmentId: f.assignment_id,
      studentId: f.student_id,
      fileName: f.file_name,
      fileUrl: f.file_url,
      fileSize: f.file_size,
      mimeType: f.mime_type,
      uploadedAt: f.uploaded_at,
      expiresAt: f.expires_at
    }));
    res.json({ success: true, files });
  } catch (e: any) {
    console.error('GET /api/assignments/:assignmentId/files/:studentId error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/files/cleanup — remove expired files from storage and DB
app.delete('/api/files/cleanup', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ success: false, error: 'Banco de dados não configurado.' });

    const now = new Date().toISOString();
    const { data: expired, error: fetchErr } = await supabase
      .from('assignment_files')
      .select('id, file_url')
      .lt('expires_at', now);
    if (fetchErr) throw fetchErr;
    if (!expired || expired.length === 0) return res.json({ success: true, deleted: 0 });

    // Extract storage paths from URLs
    for (const f of expired) {
      try {
        const url = new URL(f.file_url);
        // Path after "/storage/v1/object/public/assignment-files/"
        const prefix = '/storage/v1/object/public/assignment-files/';
        const storagePath = url.pathname.startsWith(prefix)
          ? url.pathname.slice(prefix.length)
          : null;
        if (storagePath) {
          await supabase.storage.from('assignment-files').remove([storagePath]);
        }
      } catch (_) { /* ignore individual errors */ }
    }

    const ids = expired.map((f: any) => f.id);
    const { error: delErr } = await supabase.from('assignment_files').delete().in('id', ids);
    if (delErr) throw delErr;

    res.json({ success: true, deleted: ids.length });
  } catch (e: any) {
    console.error('DELETE /api/files/cleanup error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Internal cleanup: run on server start and every 24h
const runFileCleanup = async () => {
  if (!supabase) return;
  try {
    const now = new Date().toISOString();
    const { data: expired } = await supabase
      .from('assignment_files')
      .select('id, file_url')
      .lt('expires_at', now);
    if (!expired || expired.length === 0) return;
    for (const f of expired) {
      try {
        const url = new URL(f.file_url);
        const prefix = '/storage/v1/object/public/assignment-files/';
        const storagePath = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : null;
        if (storagePath) await supabase.storage.from('assignment-files').remove([storagePath]);
      } catch (_) { /* ignore */ }
    }
    const ids = expired.map((f: any) => f.id);
    await supabase.from('assignment_files').delete().in('id', ids);
    console.log(`[cleanup] Removed ${ids.length} expired file(s).`);
  } catch (e) {
    console.error('[cleanup] Error during file cleanup:', e);
  }
};
// Run cleanup on startup and every 24h
runFileCleanup();
setInterval(runFileCleanup, 24 * 60 * 60 * 1000);

// GET /api/submissions
app.get('/api/submissions', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('student_submissions').select('*');
      if (error) throw error;
      res.json({ success: true, data: (data || []).map(mapDBSubmission) });
    } else {
      res.json({ success: true, data: memorySubmissions });
    }
  } catch (e: any) {
    console.error('GET /api/submissions error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/submissions/:submissionId/grade
app.put('/api/submissions/:submissionId/grade', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;

    if (supabase) {
      // 1. Update the submission
      const { data: updatedSub, error: subErr } = await supabase
        .from('student_submissions')
        .update({ graded: true, score, feedback })
        .eq('id', submissionId)
        .select()
        .single();
      if (subErr) throw subErr;

      // 2. Load submission course info to find student and recalculate average
      const submission = mapDBSubmission(updatedSub);

      // Fetch students in this course
      const { data: student, error: studFetchErr } = await supabase
        .from('students')
        .select('*')
        .eq('course_id', submission.courseId)
        .eq('name', submission.studentName)
        .single();

      if (!studFetchErr && student) {
        // Recalculate student grade (approximate logic matching App.tsx)
        const newStudentGrade = Math.round((student.grade + score) / 2);
        const newCompletedLessons = student.completed_lessons + 1;

        await supabase
          .from('students')
          .update({ grade: newStudentGrade, completed_lessons: newCompletedLessons })
          .eq('id', student.id);

        // Re-evaluate course average grade
        const { data: allStudents } = await supabase
          .from('students')
          .select('grade')
          .eq('course_id', submission.courseId);

        if (allStudents && allStudents.length > 0) {
          const avgGradeNum = allStudents.reduce((acc: number, s: any) => acc + (s.grade || 0), 0) / allStudents.length;
          let avgLabel = 'B+';
          if (avgGradeNum >= 90) avgLabel = 'A-';
          else if (avgGradeNum >= 85) avgLabel = 'B+';
          else if (avgGradeNum >= 80) avgLabel = 'B';
          else avgLabel = 'C';

          await supabase
            .from('courses')
            .update({ average_grade: avgLabel })
            .eq('id', submission.courseId);
        }
      }

      res.json({ success: true, data: submission });
    } else {
      const submission = memorySubmissions.find((s: StudentSubmission) => s.id === submissionId);
      if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });

      submission.graded = true;
      submission.score = score;
      submission.feedback = feedback;

      // Find the corresponding student inside memoryCourses
      const course = memoryCourses.find(c => c.id === submission.courseId);
      if (course) {
        const student = course.studentsList.find((s: Student) => s.name === submission.studentName);
        if (student) {
          student.grade = Math.round((student.grade + score) / 2);
          student.completedLessons += 1;
        }

        // Re-calculate course average grade
        const avgGradeNum = course.studentsList.reduce((acc: number, s: Student) => acc + s.grade, 0) / (course.studentsList.length || 1);
        let avgLabel = 'B+';
        if (avgGradeNum >= 90) avgLabel = 'A-';
        else if (avgGradeNum >= 85) avgLabel = 'B+';
        else if (avgGradeNum >= 80) avgLabel = 'B';
        else avgLabel = 'C';

        course.averageGrade = avgLabel;
      }

      res.json({ success: true, data: submission });
    }
  } catch (e: any) {
    console.error('PUT /api/submissions/:submissionId/grade error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Setup paths for serving frontend build in production
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

// Fallback all non-API requests to index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Frontend not built. Please run "npm run build" first.');
    }
  });
});

const port = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

export default app;
