import React, { useState, useEffect } from 'react';
import { BookOpen, Award, CheckCircle, Clock, Volume2, Globe, Sparkles, Check, ArrowRight, X } from 'lucide-react';
import { Course } from '../types';

type StudentDashboardProps = {
  studentName: string;
  studentId: string;
  studentEmail: string;
  courses: Course[];
  onUpdateMilestone?: (increment: number) => void;
};

type QuizQuestion = {
  question: string;
  options: string[];
  answer: number; // Index
  explanation: string;
};

const getGradient = (lang: string) => {
  switch (lang?.toLowerCase()) {
    case 'espanhol':
      return 'from-blue-900 to-[#102A43]';
    case 'português':
      return 'from-teal-950 to-emerald-900';
    case 'francês':
      return 'from-slate-900 to-indigo-950';
    default:
      return 'from-amber-950 to-amber-900';
  }
};

export default function StudentDashboard({ studentName, studentId, studentEmail, courses, onUpdateMilestone }: StudentDashboardProps) {
  const [goalProgress, setGoalProgress] = useState(0);
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<{
    id: string;
    title: string;
    questions: QuizQuestion[];
  } | null>(null);

  // Quiz completion flows
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    if (studentId) {
      const fetchProgress = async () => {
        try {
          const res = await fetch(`/api/student/progress/${studentId}`);
          const data = await res.json();
          if (data.success && data.progress) {
            setGoalProgress(data.progress.goal_progress ?? 0);
            setCompletedQuizzes(data.progress.completed_quizzes ?? []);
          }
        } catch (e) {
          console.error('Error fetching student progress:', e);
        }
      };
      fetchProgress();
    }
  }, [studentId]);

  const saveProgress = async (newGoal: number, newQuizzes: string[]) => {
    try {
      await fetch(`/api/student/progress/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_progress: newGoal,
          completed_quizzes: newQuizzes
        })
      });
    } catch (e) {
      console.error('Error saving progress:', e);
    }
  };

  const enrolledCourses = courses.filter((course) =>
    course.studentsList?.some(
      (s) =>
        s.email?.toLowerCase() === studentEmail?.toLowerCase() ||
        s.name?.toLowerCase() === studentName?.toLowerCase()
    )
  );

  const activeCourse = enrolledCourses[0] || null;

  const launchQuiz = (id: string, title: string) => {
    let questions: QuizQuestion[] = [];
    if (id === 'conjugation') {
      questions = [
        {
          question: '¿Cuál es la forma correcta del subjuntivo para: "Espero que tú _____ (venir) a la fiesta"?',
          options: ['vienes', 'vengas', 'vengas tú', 'vinieras'],
          answer: 1,
          explanation: 'Para expresar deseos (espero que), usamos el presente de subjuntivo del verbo venir (vengas).'
        },
        {
          question: 'Completa la frase con el condicional: "Si yo tuviera dinero, _____ (comprar) una casa."',
          options: ['compraré', 'compro', 'compraría', 'comprara'],
          answer: 2,
          explanation: 'La estructura hipotética "Si + imperfecto de subjuntivo" se completa con el condicional simple (compraría).'
        }
      ];
    } else if (id === 'pronunciation') {
      questions = [
        {
          question: 'Em Português, a pronúncia da palavra "Excluir" tem o som de "X" semelhante a:',
          options: ['Sexta-feira (som de S)', 'Enxame (som de CH)', 'Exame (som de Z)', 'Fixo (som de KS)'],
          answer: 1,
          explanation: '"Excluir" em português se pronuncia estruturalmente com o som de "S" surdo, assim como "Sexta-feira".'
        }
      ];
    } else {
      questions = [
        {
          question: 'Qual palavra significa "Maçã" em espanhol?',
          options: ['Manzana', 'Fresa', 'Uva', 'Melocotón'],
          answer: 0,
          explanation: '"Manzana" é a tradução espanhola correta de maçã.'
        }
      ];
    }

    setActiveQuiz({ id, title, questions });
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizFinished(false);
  };

  const handleOptionSelect = (idx: number) => {
    if (selectedOption !== null) return; // Answered already
    setSelectedOption(idx);
    if (idx === activeQuiz?.questions[currentQuestionIndex].answer) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (!activeQuiz) return;
    if (currentQuestionIndex + 1 < activeQuiz.questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      setQuizFinished(true);
      
      const nextQuizzes = completedQuizzes.includes(activeQuiz.id)
        ? completedQuizzes
        : [...completedQuizzes, activeQuiz.id];
      setCompletedQuizzes(nextQuizzes);
      
      const nextGoal = Math.min(goalProgress + 10, 100);
      setGoalProgress(nextGoal);
      
      if (onUpdateMilestone) {
        onUpdateMilestone(15);
      }

      // Save to database
      saveProgress(nextGoal, nextQuizzes);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in text-xs">
      {/* Welcome Title */}
      <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-white/10 pb-5">
        <h2 className="text-3xl font-extrabold text-[#102A43] dark:text-white tracking-tight">Bem-vindo de volta, {studentName}!</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Você dominou 3 novas competências linguísticas esta semana. Continue assim!</p>
      </div>

      {/* Learning Milestone & Continue Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Progress Circle & Goal Description */}
        <div className="md:col-span-8 bg-white dark:bg-[#0A1929] border border-slate-150 dark:border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm hover:shadow-md transition">
          {/* Custom Conic Progress Circle wrapper */}
          <div className="relative w-40 h-40 shrink-0 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
            {/* outer visual indicator ring */}
            <div 
              className="absolute inset-0 rounded-full transition-all duration-700"
              style={{
                background: `conic-gradient(#102A43 ${goalProgress * 3.6}deg, transparent 0deg)`
              }}
            />
            {/* Inner background mask */}
            <div className="absolute inset-3 bg-white dark:bg-[#0A1929] rounded-full flex flex-col items-center justify-center shadow-inner z-10">
              <span className="text-3xl font-extrabold text-[#102A43] dark:text-white">{goalProgress}%</span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Meta Semanal</span>
            </div>
          </div>

          <div className="space-y-3 flex-1 text-center sm:text-left">
            <span className="inline-block px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full font-bold text-[10px] uppercase">
              {activeCourse ? "Certificação em Andamento" : "Nenhuma certificação em andamento"}
            </span>
            <h3 className="text-lg font-extrabold text-[#102A43] dark:text-white">
              {activeCourse ? `Proficiência em ${activeCourse.language}` : "Sem Certificação Ativa"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {activeCourse 
                ? `Você está cursando ${activeCourse.title} (${activeCourse.term}). Faltam apenas ${100 - goalProgress > 0 ? Math.ceil((100 - goalProgress)/10) : 0} lições práticas rápidas para completar os objetivos deste semestre.`
                : "Você não possui nenhuma matrícula ativa. Fale com um professor para se matricular em um curso e iniciar sua jornada de aprendizado!"
              }
            </p>
            <button 
              onClick={() => launchQuiz('general', 'Prática Diária de Vocabulário')}
              className="bg-[#102A43] dark:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              Continuar Jornada
            </button>
          </div>
        </div>

        {/* Up Next Activities Feed */}
        <div className="md:col-span-4 bg-white dark:bg-[#0A1929] border border-slate-150 dark:border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-slate-50 dark:border-white/10 pb-2">
            <h3 className="text-sm font-bold text-[#102A43] dark:text-white">Atividades Próximas</h3>
            <span className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer">Ver todas</span>
          </div>

          <div className="space-y-3 flex-1">
            {/* Task 1 */}
            <div 
              onClick={() => launchQuiz('conjugation', 'Desafio Prático de Conjugação')}
              className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-[#050C14] hover:bg-amber-50/40 dark:hover:bg-white/5 rounded-xl cursor-pointer transition border border-transparent hover:border-amber-200/40 dark:hover:border-white/10 group text-left w-full"
            >
              <div className="p-2 bg-indigo-50 dark:bg-indigo-500/20 text-[#102A43] dark:text-indigo-400 rounded-lg group-hover:bg-[#EFE4B0] dark:group-hover:bg-[#EFE4B0]/20 transition">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 truncate">
                <h4 className="font-bold text-slate-800 dark:text-white">Conjugação Subjuntivo</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Auto-ritmo • 5-10 minutos</p>
              </div>
              {completedQuizzes.includes('conjugation') ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-350 group-hover:translate-x-0.5 transition" />
              )}
            </div>

            {/* Task 2 */}
            <div 
              onClick={() => launchQuiz('pronunciation', 'Drill de Pronúncia Fonética')}
              className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-[#050C14] hover:bg-amber-50/40 dark:hover:bg-white/5 rounded-xl cursor-pointer transition border border-transparent hover:border-amber-200/40 dark:hover:border-white/10 group text-left w-full"
            >
              <div className="p-2 bg-indigo-50 dark:bg-indigo-500/20 text-[#102A43] dark:text-indigo-400 rounded-lg group-hover:bg-[#EFE4B0] dark:group-hover:bg-[#EFE4B0]/20 transition">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="flex-1 truncate">
                <h4 className="font-bold text-slate-800 dark:text-white">Drill Prático de Pronúncia</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Praticar • 5 minutos</p>
              </div>
              {completedQuizzes.includes('pronunciation') ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-350 group-hover:translate-x-0.5 transition" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course Enrollment Cards with actual progresses */}
      <section className="space-y-5">
        <div className="flex justify-between items-center pb-2">
          <h3 className="text-lg font-bold text-[#102A43] dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Matérias Matriculadas
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">Progresso Geral Semestral</span>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="bg-white dark:bg-[#0A1929] border border-slate-150 dark:border-white/10 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
            Você não está matriculado em nenhuma matéria no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {enrolledCourses.map((course) => {
              const studentInfo = course.studentsList?.find(
                (s) =>
                  s.email?.toLowerCase() === studentEmail?.toLowerCase() ||
                  s.name?.toLowerCase() === studentName?.toLowerCase()
              );
              const progressPercent = studentInfo
                ? Math.min(Math.round((studentInfo.completedLessons / 15) * 100), 100)
                : 0;

              return (
                <div key={course.id} className="bg-white dark:bg-[#0A1929] border border-slate-150 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm group hover:shadow-md transition">
                  <div className={`h-24 bg-gradient-to-r ${getGradient(course.language)} border-b-4 border-[#EFE4B0] flex items-end p-3 relative`}>
                    <span className="text-[10px] font-bold text-[#EFE4B0] uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded">
                      {course.language}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    <h4 className="font-extrabold text-slate-800 dark:text-white text-sm">{course.title}</h4>
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-400 dark:text-slate-500">Progresso ({studentInfo?.completedLessons ?? 0}/15 lições)</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-[#102A43] dark:bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                    {/* Additional Stats inside the card */}
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-white/10 pt-2.5 mt-2">
                      <span>Nota: <span className="text-slate-700 dark:text-slate-300">{studentInfo?.grade ?? 0}/100</span></span>
                      <span>Presença: <span className="text-slate-700 dark:text-slate-300">{studentInfo?.attendance ?? 0}%</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL: PRÁTICA INTERATIVA DE QUIZ */}
      {activeQuiz && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up space-y-5 border border-slate-100 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[9px] uppercase font-bold text-[#102A43] bg-indigo-50 px-2 py-0.5 rounded">
                  Exercício Prático
                </span>
                <h3 className="text-base font-extrabold text-[#102A43] mt-1">{activeQuiz.title}</h3>
              </div>
              <button onClick={() => setActiveQuiz(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!quizFinished ? (
              <div className="space-y-4">
                {/* Question Info */}
                <span className="text-xs font-bold text-slate-400">
                  Questão {currentQuestionIndex + 1} de {activeQuiz.questions.length}
                </span>

                <div className="p-4 bg-slate-50 rounded-xl font-bold text-slate-800">
                  {activeQuiz.questions[currentQuestionIndex].question}
                </div>

                {/* Options List */}
                <div className="space-y-2">
                  {activeQuiz.questions[currentQuestionIndex].options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === activeQuiz.questions[currentQuestionIndex].answer;
                    
                    let btnStyle = 'border-slate-150 bg-white hover:bg-slate-50';
                    if (selectedOption !== null) {
                      if (isSelected) {
                        btnStyle = isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100' : 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-100';
                      } else if (isCorrect) {
                        btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800';
                      } else {
                        btnStyle = 'border-slate-100 opacity-60 bg-white';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedOption !== null}
                        onClick={() => handleOptionSelect(idx)}
                        className={`w-full p-3.5 border rounded-xl text-left font-semibold transition ${btnStyle}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback or Next Question Button */}
                {selectedOption !== null && (
                  <div className="space-y-3 animate-slide-up">
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 text-slate-700 rounded-lg">
                      <p className="font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Explicação do AI-Tutor:
                      </p>
                      <p className="mt-1 font-medium">{activeQuiz.questions[currentQuestionIndex].explanation}</p>
                    </div>

                    <button
                      onClick={handleNextQuestion}
                      className="w-full py-3 bg-[#102A43] text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition"
                    >
                      {currentQuestionIndex + 1 < activeQuiz.questions.length ? 'Avançar' : 'Concluir Desafio'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Quiz Finished Screen
              <div className="text-center py-6 space-y-4 animate-scale-up">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <Check className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-[#102A43]">Atividade Concluída!</h4>
                  <p className="text-slate-500 font-medium">Você concluiu o Desafio de Fixação da Semana!</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border text-slate-700 font-bold inline-block">
                  Sua Pontuação: {quizScore} de {activeQuiz.questions.length} questões corretas
                </div>

                <div className="text-slate-400 font-medium">
                  🎉 +15 pontos adicionados à sua Meta de Atividade!
                </div>

                <button
                  onClick={() => setActiveQuiz(null)}
                  className="w-full py-2.5 bg-[#102A43] text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition"
                >
                  Continuar Aprendendo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
