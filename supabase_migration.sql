-- ═══════════════════════════════════════════════════════════════════
--  Pedrolingo — SQL Migration
--  Executar no Supabase SQL Editor (Settings > SQL Editor)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Adicionar teacher_id em courses (vinculado ao professor criador)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- 2. Adicionar campos de entrega de documento em assignments
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS requires_file_upload BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS file_upload_description TEXT;

-- 3. Criar tabela de mensagens de chat (professor <-> aluno por curso)
CREATE TABLE IF NOT EXISTS chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_role   TEXT NOT NULL CHECK (sender_role IN ('student', 'teacher')),
  sender_name   TEXT NOT NULL,
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca eficiente por curso + aluno
CREATE INDEX IF NOT EXISTS idx_chat_messages_course_student
  ON chat_messages (course_id, student_id, created_at ASC);

-- 4. Criar bucket de storage para arquivos de atividades
-- (Executar via Supabase Dashboard > Storage > New Bucket)
-- Nome do bucket: assignment-files
-- Public: true (ou use RLS para controle de acesso)

-- 5. Criar tabela de metadados dos arquivos enviados
CREATE TABLE IF NOT EXISTS assignment_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_size       BIGINT NOT NULL,
  mime_type       TEXT,
  uploaded_at     TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- Índice para busca e limpeza de arquivos expirados
CREATE INDEX IF NOT EXISTS idx_assignment_files_lookup
  ON assignment_files (assignment_id, student_id);

CREATE INDEX IF NOT EXISTS idx_assignment_files_expiry
  ON assignment_files (expires_at);

-- ═══════════════════════════════════════════════════════════════════
--  RLS (Row Level Security) — Recomendado para produção
-- ═══════════════════════════════════════════════════════════════════

-- Habilitar RLS nas novas tabelas
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_files ENABLE ROW LEVEL SECURITY;

-- Política básica: service_role tem acesso total (o backend usa service_role)
-- Para projetos públicos, adicione políticas mais restritivas conforme necessário.

-- ═══════════════════════════════════════════════════════════════════
--  Limpeza automática via pg_cron (opcional, requer extensão pg_cron)
-- ═══════════════════════════════════════════════════════════════════
-- SELECT cron.schedule(
--   'cleanup-expired-assignment-files',
--   '0 2 * * *',  -- Todo dia às 2h
--   $$
--     DELETE FROM assignment_files WHERE expires_at < now();
--   $$
-- );
