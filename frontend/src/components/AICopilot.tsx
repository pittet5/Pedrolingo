import React, { useState } from 'react';
import { Sparkles, Send, FileText, BookOpen, ListTodo, GraduationCap, X, AlertCircle } from 'lucide-react';
import { CoPilotMessage, Course } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

type AICopilotProps = {
  activeCourse: Course | null;
  onApplyMaterials?: (title: string, content: string) => void;
};

export default function AICopilot({ activeCourse, onApplyMaterials }: AICopilotProps) {
  const [messages, setMessages] = useState<CoPilotMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Olá! Sou o seu **Co-Pilot de IA Pedrolingo**. Posso lhe ajudar a criar experiências de ensino marcantes. \n\nSelecione um curso ao lado e use as **ferramentas rápidas** abaixo para gerar materiais pedagógicos instantâneos!`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<'quiz' | 'resources' | 'lesson_plan' | null>(null);
  const [actionInput, setActionInput] = useState('');

  const [aiError, setAiError] = useState<string | null>(null);

  const handleSendMessage = async (textToSend: string, actionType?: 'quiz' | 'resources' | 'lesson_plan') => {
    if (!textToSend.trim()) return;

    const userMsg: CoPilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: actionType 
        ? `[Ferramenta: ${actionType === 'quiz' ? 'Gerar Quiz' : actionType === 'resources' ? 'Sugerir Recursos' : 'Esboçar Plano de Aula'}] sobre: ${textToSend}`
        : textToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setActionInput('');
    setActiveAction(null);
    setLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: textToSend,
          actionType,
          courseInfo: activeCourse ? { title: activeCourse.title, language: activeCourse.language, code: activeCourse.code } : undefined
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMsg: CoPilotMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.text,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          isQuickAction: !!actionType,
          actionType
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || 'Erro na resposta do modelo.');
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Não foi possível conectar ao servidor de IA.');
      
      // Fallback response inside flow
      const fallbackMsg: CoPilotMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `⚠️ **Ops! Não consegui conectar ao modelo de IA.**\n\nIsso geralmente ocorre se a chave de API não foi configurada ainda. \n\n**O que você sugeriu:** "${textToSend}"`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickActionClick = (type: 'quiz' | 'resources' | 'lesson_plan') => {
    setActiveAction(type);
    if (type === 'quiz') {
      setActionInput('Vocabulário de viagem e pronomes reflexivos');
    } else if (type === 'resources') {
      setActionInput('Cultura tradicional e pronúncia coloquial');
    } else if (type === 'lesson_plan') {
      setActionInput('Diferenças entre Pretérito Indefinido e Imperfeito');
    }
  };

  return (
    <aside id="copilot-sidebar" className="w-80 bg-slate-50 border-l border-slate-200 h-screen fixed right-0 top-0 flex flex-col z-40 shadow-sm">
      {/* Header */}
      <div className="p-4 bg-[#102A43] text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#EFE4B0] animate-pulse" />
          <h2 className="font-header text-md font-bold tracking-tight">AI Co-Pilot Pedrolingo</h2>
        </div>
        {activeCourse && (
          <span className="text-[10px] bg-[#EFE4B0]/20 text-[#EFE4B0] px-2 py-0.5 rounded font-mono font-medium">
            {activeCourse.code}
          </span>
        )}
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[90%] ${
              msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            <span className="text-[10px] text-slate-400 mb-1 px-1">
              {msg.sender === 'user' ? 'Você' : 'Co-Pilot IA'} • {msg.timestamp}
            </span>
            <div
              className={`p-3 rounded-xl text-xs shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-[#102A43] text-white rounded-br-none'
                  : 'bg-[#EFE4B0]/25 text-slate-800 border border-[#EFE4B0]/50 rounded-bl-none'
              }`}
            >
              <MarkdownRenderer text={msg.text} />
              
              {msg.isQuickAction && msg.sender === 'ai' && onApplyMaterials && (
                <button
                  onClick={() => onApplyMaterials(
                    msg.actionType === 'quiz' ? 'Novo Quiz Gerado' : msg.actionType === 'resources' ? 'Dicas de Recursos' : 'Plano de Aula Gerado',
                    msg.text
                  )}
                  className="mt-3 w-full py-1.5 px-3 bg-[#102A43] text-white rounded font-semibold text-[10px] text-center hover:bg-[#102A43]/90 transition"
                >
                  Adicionar este Material ao Curso
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs px-2 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            <span>Processando insights pedagógicos...</span>
          </div>
        )}

        {aiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Aviso da Chave de API</p>
              <p className="text-[11px] text-red-500">A IA retornará respostas simuladas se a GEMINI_API_KEY não estiver ativa na aba lateral.</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Modals within sidebar */}
      {activeAction && (
        <div className="p-3 bg-amber-50/75 border-t border-b border-amber-200 text-xs space-y-2">
          <div className="flex justify-between items-center font-bold text-[#102A43]">
            <span className="flex items-center gap-1">
              {activeAction === 'quiz' && <ListTodo className="w-3.5 h-3.5 text-amber-600" />}
              {activeAction === 'resources' && <BookOpen className="w-3.5 h-3.5 text-amber-600" />}
              {activeAction === 'lesson_plan' && <GraduationCap className="w-3.5 h-3.5 text-amber-600" />}
              Configurar {activeAction === 'quiz' ? 'Gerador de Quiz' : activeAction === 'resources' ? 'Sugestor de Recursos' : 'Esboço de Aula'}
            </span>
            <button onClick={() => setActiveAction(null)} className="text-slate-500 hover:text-slate-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Para o curso <strong className="text-slate-700">{activeCourse?.title || 'Todos'}</strong>, sobre qual tema deseja gerar?
          </p>
          <div className="flex gap-1.5">
            <input
              type="text"
              className="flex-1 px-2 py-1 text-xs border border-slate-350 rounded focus:ring-1 focus:ring-primary focus:outline-none bg-white font-medium"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="Ex: Pretérito Perfeito em Espanhol"
            />
            <button
              onClick={() => handleSendMessage(actionInput, activeAction)}
              className="px-3 py-1 bg-amber-600 text-white rounded text-[11px] font-bold hover:bg-amber-700 transition"
            >
              Gerar
            </button>
          </div>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200 space-y-2">
        {!activeAction && (
          <div className="grid grid-cols-3 gap-1.5 pb-2">
            <button
              onClick={() => handleQuickActionClick('quiz')}
              className="flex flex-col items-center gap-1 p-2 bg-slate-50 hover:bg-amber-50/50 rounded border border-slate-150 text-center transition"
            >
              <ListTodo className="w-4 h-4 text-amber-600" />
              <span className="text-[9px] font-bold text-slate-700">Gerar Quiz</span>
            </button>
            <button
              onClick={() => handleQuickActionClick('resources')}
              className="flex flex-col items-center gap-1 p-2 bg-slate-50 hover:bg-amber-50/50 rounded border border-slate-150 text-center transition"
            >
              <BookOpen className="w-4 h-4 text-[#102A43]" />
              <span className="text-[9px] font-bold text-slate-700">Recursos</span>
            </button>
            <button
              onClick={() => handleQuickActionClick('lesson_plan')}
              className="flex flex-col items-center gap-1 p-2 bg-slate-50 hover:bg-amber-50/50 rounded border border-slate-150 text-center transition"
            >
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span className="text-[9px] font-bold text-slate-700">Plano Aula</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <textarea
            className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none placeholder:text-slate-400 bg-slate-50 hover:bg-slate-100/50 transition"
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(inputValue);
              }
            }}
            placeholder="Pergunte sobre aulas ou dicas..."
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            className="p-2 bg-[#102A43] text-white rounded-lg hover:opacity-90 active:scale-95 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[8px] text-center text-slate-400 font-mono">
          Pedrolingo AI Engine • Gemini 3.5 Flash
        </p>
      </div>
    </aside>
  );
}
