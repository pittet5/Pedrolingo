[Readme Pedrolingo.md](https://github.com/user-attachments/files/29117766/Readme.Pedrolingo.md)
# 🎓 Pedrolingo

> Plataforma de aprendizado inteligente de idiomas com painéis interativos para Professores e Alunos, gerenciamento de cursos, atribuição de notas e um Co-Pilot de IA integrado.

**🌐 Live:** [pedrolingo.vercel.app](https://pedrolingo.vercel.app)

---

## 📖 Sobre o Projeto

O **Pedrolingo** é uma plataforma educacional full-stack voltada para o ensino de idiomas. Ela conecta professores e alunos em um ambiente digital moderno, oferecendo gerenciamento de cursos, atividades, entregas, notas e um assistente de IA (Co-Pilot) integrado diretamente na experiência de aprendizado.

A plataforma resolve a fragmentação de ferramentas no ensino de idiomas — reunindo em um só lugar o painel do professor, o painel do aluno, comunicação por chat, upload de trabalhos e feedback com IA.

---

## ✨ Funcionalidades

### Para Professores
- 📋 Criação e gerenciamento de cursos
- 📝 Criação de atividades com suporte a entrega de arquivos
- 📊 Acompanhamento de notas e frequência dos alunos
- 💬 Chat direto com alunos por curso
- 🤖 Co-Pilot de IA para auxílio pedagógico

### Para Alunos
- 📚 Acesso aos cursos matriculados
- 📤 Entrega de atividades (texto e arquivos)
- 📈 Acompanhamento do próprio progresso
- 💬 Chat com o professor do curso
- 🤖 Co-Pilot de IA para suporte ao aprendizado

### Geral
- 🔐 Autenticação com verificação de e-mail (código de 6 dígitos)
- 👤 Perfis de usuário com avatar
- 📧 Envio de e-mails transacionais via Gmail SMTP

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- npm 9+
- Conta no [Supabase](https://supabase.com)
- Chave de API do [Google Gemini](https://ai.google.dev)

### 1. Clone o repositório
```bash
git clone https://github.com/pittet5/Pedrolingo.git
cd Pedrolingo
```

### 2. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
```

### 3. Execute a migration no Supabase
Acesse o **SQL Editor** do seu projeto no Supabase e execute o conteúdo do arquivo `supabase_migration.sql`.

### 4. Instale as dependências e rode
```bash
npm install
npm run dev
```

O frontend estará em `http://localhost:5173` e o backend em `http://localhost:3000`.

---

## 🏗️ Estrutura do Projeto

```
Pedrolingo/
├── frontend/          # React + Vite + TypeScript
│   ├── src/
│   └── public/
├── backend/           # Node.js + Express + TypeScript
│   ├── server.ts      # Servidor principal com todas as rotas
│   ├── supabaseClient.ts
│   └── initialData.ts
├── supabase_migration.sql  # Schema do banco de dados
├── vercel.json        # Configuração de deploy
└── package.json       # Monorepo root
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Banco de Dados | Supabase (PostgreSQL) |
| IA / Co-Pilot | Google Gemini API (`@google/genai`) |
| Autenticação | Custom (bcryptjs + verificação por e-mail) |
| Upload de Arquivos | Multer (memória, até 100MB) |
| E-mail | Nodemailer + Gmail SMTP |
| Deploy | Vercel |

---

## 🚢 Deploy

O projeto é deployado na **Vercel** como monorepo. A configuração está no arquivo `vercel.json`.

---

## 📄 Licença

Este projeto está em desenvolvimento ativo. Entre em contato para mais informações.

---

*Feito com ❤️ por [pittet5](https://github.com/pittet5)*
