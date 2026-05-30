import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer();
