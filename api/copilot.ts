import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { setCors } from './_lib/cors';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

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
}
