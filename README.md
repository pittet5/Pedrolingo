[Tech Spec.md](https://github.com/user-attachments/files/29117759/Tech.Spec.md)
*
# 📐 Especificação Técnica — Pedrolingo

**Versão:** 1.0.0
**Data:** Junho 2026
**Repositório:** [github.com/pittet5/Pedrolingo](https://github.com/pittet5/Pedrolingo)
**Deploy:** [pedrolingo.vercel.app](https://pedrolingo.vercel.app)

---

## 1. Visão Geral do Sistema

O Pedrolingo é uma plataforma educacional full-stack para ensino de idiomas, estruturada como um **monorepo** com workspace separado para frontend e backend. O sistema adota uma arquitetura cliente-servidor clássica com banco de dados relacional gerenciado via Supabase e integração com IA generativa via Google Gemini.

### Diagrama de Arquitetura

```
┌────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                   │
│              React SPA (Vite + TypeScript)             │
└──────────────────────┬─────────────────────────────────┘
                       │ HTTP / REST
┌──────────────────────▼─────────────────────────────────┐
│               BACKEND (Node.js / Express)              │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Auth Routes│  │Course Routes │  │  AI Co-Pilot  │  │
│  └────────────┘  └──────────────┘  └───────────────┘  │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │Assignment  │  │  File Upload │  │   Chat Routes │  │
│  │  Routes    │  │   (Multer)   │  │               │  │
│  └────────────┘  └──────────────┘  └───────────────┘  │
└──────────┬────────────────────────────────┬────────────┘
           │                                │
┌──────────▼──────────┐        ┌────────────▼────────────┐
│  Supabase (Postgres) │        │   Google Gemini API     │
│  - user_profiles     │        │   (IA Co-Pilot)         │
│  - courses           │        └─────────────────────────┘
│  - assignments       │
│  - submissions       │        ┌─────────────────────────┐
│  - chat_messages     │        │   Gmail SMTP            │
│  - file storage      │        │   (Nodemailer)          │
└─────────────────────┘         └─────────────────────────┘
```

---

## 2. Stack Tecnológica Detalhada

### 2.1 Frontend

| Item | Detalhes |
|------|----------|
| Framework | React 18 |
| Build Tool | Vite |
| Linguagem | TypeScript |
| Estrutura | SPA (Single Page Application) |
| Estilização | (a confirmar — CSS/Tailwind/etc.) |
| Comunicação | REST API via fetch/axios |

### 2.2 Backend

| Item | Detalhes |
|------|----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Linguagem | TypeScript (compilado) |
| Upload | Multer (memória, limite 100MB) |
| Hash de senha | bcryptjs (salt rounds: 12) |
| E-mail | Nodemailer + Gmail SMTP |
| IA | Google GenAI SDK (`@google/genai`) |

### 2.3 Banco de Dados

| Item | Detalhes |
|------|----------|
| Provedor | Supabase |
| Engine | PostgreSQL |
| ORM | Supabase JS Client (`@supabase/supabase-js`) |
| Modo | Cliente direto (sem RLS por usuário — autenticação customizada) |

### 2.4 Infraestrutura e Deploy

| Item | Detalhes |
|------|----------|
| Plataforma | Vercel |
| Configuração | `vercel.json` na raiz |
| Monorepo | npm workspaces (`frontend`, `backend`) |
| Variáveis de Ambiente | `.env` na raiz |

---

## 3. Modelo de Dados (Banco de Dados)

### 3.1 Tabelas Principais

#### `user_profiles`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `name` | TEXT | Nome do usuário |
| `email` | TEXT | E-mail (único, lowercase) |
| `password_hash` | TEXT | Senha hasheada (bcrypt) |
| `role` | TEXT | `'teacher'` ou `'student'` |
| `avatar` | TEXT | Identificador do avatar |
| `email_verified` | BOOLEAN | Status de verificação |
| `verification_code` | TEXT | Código de 6 dígitos (OTP) |
| `verification_expires_at` | TIMESTAMP | Expiração do código (15min) |

#### `courses`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `code` | TEXT | Código do curso |
| `title` | TEXT | Título do curso |
| `language` | TEXT | Idioma ensinado |
| `term` | TEXT | Semestre/período |
| `teacher_id` | UUID | FK → user_profiles (professor) |
| `students_count` | INT | Contagem de alunos |
| `average_attendance` | FLOAT | Frequência média |
| `average_grade` | TEXT | Nota média |

#### `assignments`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `title` | TEXT | Título da atividade |
| `course_id` | UUID | FK → courses |
| `course_code` | TEXT | Código do curso |
| `due_date` | TEXT | Data de entrega |
| `type` | TEXT | Tipo da atividade |
| `max_score` | INT | Pontuação máxima |
| `description` | TEXT | Descrição |
| `requires_file_upload` | BOOLEAN | Exige upload de arquivo |
| `file_upload_description` | TEXT | Instruções do arquivo |

#### `submissions`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `assignment_id` | UUID | FK → assignments |
| `course_id` | UUID | FK → courses |
| `student_name` | TEXT | Nome do aluno |
| `student_response` | TEXT | Resposta textual |
| `submitted_at` | TIMESTAMP | Data de entrega |
| `graded` | BOOLEAN | Foi corrigida? |
| `score` | INT | Nota atribuída |
| `feedback` | TEXT | Feedback do professor |

#### `chat_messages`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `course_id` | UUID | FK → courses |
| `student_id` | UUID | FK → user_profiles |
| `sender_role` | TEXT | `'teacher'` ou `'student'` |
| `message` | TEXT | Conteúdo da mensagem |
| `created_at` | TIMESTAMP | Data/hora |

---

## 4. Autenticação e Segurança

O sistema utiliza **autenticação customizada** (não a auth nativa do Supabase) com as seguintes etapas:

### Fluxo de Registro
1. Usuário preenche nome, e-mail, senha, role e avatar
2. Backend valida força da senha (≥8 chars, letra + número + símbolo especial)
3. Senha é hasheada com `bcryptjs` (12 salt rounds)
4. Código OTP de 6 dígitos é gerado e armazenado com expiração de 15 minutos
5. E-mail de verificação é enviado via Gmail SMTP
6. Usuário insere o código → conta é verificada

### Fluxo de Login
1. Usuário envia e-mail e senha
2. Backend busca perfil no Supabase
3. Verifica se e-mail está confirmado
4. Compara senha com hash via `bcrypt.compare`
5. Retorna dados do perfil (sem JWT — sessão gerenciada no cliente)

### Considerações de Segurança
- Senhas nunca trafegam em texto simples além do HTTPS
- Códigos OTP expiram em 15 minutos
- E-mails são normalizados para lowercase antes de armazenar
- Verificação de e-mail obrigatória antes do primeiro login

---

## 5. Integração com IA (Co-Pilot)

O Co-Pilot é alimentado pela **Google Gemini API** via SDK oficial `@google/genai`.

- **Modelo:** Gemini (versão configurada via `GEMINI_API_KEY`)
- **Uso:** Assistente pedagógico para professores e alunos dentro dos cursos
- **Integração:** Server-side (chave da API no backend, nunca exposta ao frontend)

---

## 6. Rotas da API

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro de usuário |
| POST | `/api/auth/verify` | Verificação de e-mail (OTP) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/resend-code` | Reenviar código de verificação |
| GET | `/api/auth/profile/:id` | Buscar perfil |
| PUT | `/api/auth/profile/:id` | Atualizar perfil |

### Cursos, Atividades, Submissões, Chat e IA
_(rotas adicionais definidas em `server.ts` — a ser documentado conforme expansão da API)_

---

## 7. Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `SUPABASE_URL` | URL do projeto Supabase | ✅ |
| `SUPABASE_ANON_KEY` | Chave anônima do Supabase | ✅ |
| `GEMINI_API_KEY` | Chave da Google Gemini API | ✅ |
| `SMTP_USER` | E-mail do Gmail para envios | ✅ |
| `SMTP_PASS` | Senha de app do Gmail | ✅ |

---

## 8. Scripts Disponíveis

```bash
npm run dev          # Roda frontend + backend em paralelo
npm run dev:frontend # Apenas frontend (Vite dev server)
npm run dev:backend  # Apenas backend (Express)
npm run build        # Build de produção (frontend + backend)
npm run start        # Inicia o backend em produção
npm run lint         # Lint do frontend + typecheck do backend
```

---

## 9. Roadmap

### ✅ MVP (Entregue)
- [x] Autenticação customizada com verificação por e-mail
- [x] Painel do Professor (cursos, alunos, atividades, notas)
- [x] Painel do Aluno (cursos, entregas, progresso)
- [x] Upload de arquivos em atividades
- [x] Chat professor ↔ aluno por curso
- [x] Co-Pilot de IA integrado
- [x] Deploy na Vercel

### 🔄 Em Progresso / Planejado
- [ ] Sistema de notificações em tempo real (WebSocket ou Supabase Realtime)
- [ ] Geração automática de feedback com IA nas correções
- [ ] Dashboard de analytics para professores
- [ ] Suporte a múltiplos idiomas na interface (i18n)
- [ ] Aplicativo mobile (React Native)
- [ ] Integração com ferramentas externas (Google Meet, Zoom)
- [ ] Sistema de gamificação (pontos, conquistas, ranking)
- [ ] Planos de assinatura / monetização

---

## 10. Pitch

> **Pedrolingo** é a plataforma que transforma o ensino de idiomas em uma experiência verdadeiramente conectada e inteligente.

Hoje, professores de idiomas perdem horas gerenciando planilhas, grupos de WhatsApp, e-mails e arquivos espalhados. Alunos ficam sem acompanhamento personalizado e sem visibilidade do próprio progresso. O mercado de ensino de idiomas no Brasil movimenta mais de **R$ 10 bilhões por ano** — e ainda carece de ferramentas digitais pensadas para a realidade de professores independentes e pequenas escolas.

O **Pedrolingo** resolve isso com uma plataforma única que centraliza:
- 📋 Gerenciamento de turmas e atividades
- 📊 Acompanhamento de notas e frequência em tempo real
- 💬 Comunicação direta entre professor e aluno
- 🤖 Um Co-Pilot de IA que auxilia tanto professores quanto alunos

Nossa tecnologia é moderna, escalável e pronta para crescer: React + Node.js + Supabase + Google Gemini. O deploy é automatizado via Vercel, garantindo alta disponibilidade desde o dia um.

Estamos no MVP com todas as funcionalidades core funcionando e disponível em produção. O próximo passo é adquirir os primeiros professores beta, validar o produto com usuários reais e iniciar a monetização via planos de assinatura.

**Se você quer transformar como idiomas são ensinados no Brasil — o Pedrolingo é o lugar certo.**

---

*Documentação gerada em Junho de 2026*
