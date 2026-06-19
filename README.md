[Readme Pedrolingo.md](https://github.com/user-attachments/files/29117788/Readme.Pedrolingo.md)
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

## 🌐 Acesse a Plataforma

O Pedrolingo está disponível online — nenhuma instalação necessária!

👉 **[pedrolingo.vercel.app](https://pedrolingo.vercel.app)**

1. Acesse o link acima
2. Crie sua conta como **Professor** ou **Aluno**
3. Verifique seu e-mail com o código enviado
4. Comece a usar!

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
