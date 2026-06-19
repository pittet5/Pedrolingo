import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Award, CheckCircle, Clock, Volume2, Globe, Sparkles,
  Check, ArrowRight, X, MessageCircle, Upload, Send, FileText,
  ChevronDown, ChevronUp, AlertCircle, Paperclip
} from 'lucide-react';
import { Course, Assignment, Student, ChatMessage, AssignmentFile } from '../types';

type StudentDashboardProps = {
  studentName: string;
  studentId: string;
  studentEmail: string;
  courses: Course[];
  onEnroll?: (courseId: string, student: Student) => void;
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StudentDashboard({ studentName, studentId, studentEmail, courses, onEnroll, onUpdateMilestone }: StudentDashboardProps) {
  const [goalProgress, setGoalProgress] = useState(0);
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<{
    id: string;
    title: string;
    questions: QuizQuestion[];
    requiresFileUpload?: boolean;
    fileUploadDescription?: string;
    courseId?: string;
  } | null>(null);
  const [activeMedia, setActiveMedia] = useState<{ text?: string, imageUrl?: string, videoUrl?: string } | null>(null);

  // Quiz completion flows
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Course detail modal
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseTeacher, setCourseTeacher] = useState<{ id: string; name: string; email: string; avatar?: string } | null>(null);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<AssignmentFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await fetch('/api/assignments');
        const data = await res.json();
        if (data.success && data.data) {
          setAssignments(data.data);
        }
      } catch (e) {
        console.error('Error fetching assignments:', e);
      }
    };
    fetchAssignments();
  }, []);

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

  const availableCourses = courses.filter(
    (course) => !enrolledCourses.some((ec) => ec.id === course.id)
  );

  // Assignments that belong to enrolled courses
  const enrolledAssignments = assignments.filter((a) =>
    enrolledCourses.some((c) => c.id === a.courseId)
  );

  // Pending (not yet completed) assignments only
  const pendingAssignments = enrolledAssignments.filter(a => !completedQuizzes.includes(a.id));

  // The last enrolled course that has at least one pending assignment
  const activeCourse = (() => {
    for (let i = enrolledCourses.length - 1; i >= 0; i--) {
      const course = enrolledCourses[i];
      if (pendingAssignments.some((a) => a.courseId === course.id)) {
        return course;
      }
    }
    return null;
  })();

  // % of completed quizzes out of total assignments across all enrolled courses
  const activityProgress = enrolledAssignments.length > 0
    ? Math.round((completedQuizzes.filter((qId) =>
      enrolledAssignments.some((a) => a.id === qId)
    ).length / enrolledAssignments.length) * 100)
    : 0;

  // The first pending assignment in the active course
  const nextAssignment = activeCourse
    ? pendingAssignments.find((a) => a.courseId === activeCourse.id) ?? null
    : null;

  // ─── Course Detail Modal ───────────────────────────────────────────────────

  const openCourseDetail = async (course: Course) => {
    setSelectedCourse(course);
    setCourseTeacher(null);
    // Fetch teacher info
    if (course.id) {
      try {
        const res = await fetch(`/api/courses/${course.id}/teacher`);
        const data = await res.json();
        if (data.success && data.teacher) setCourseTeacher(data.teacher);
      } catch (_) { /* no teacher info */ }
    }
  };

  const closeCourseDetail = () => {
    setSelectedCourse(null);
    setCourseTeacher(null);
    setChatOpen(false);
    setChatMessages([]);
    if (chatPollRef.current) clearInterval(chatPollRef.current);
  };

  // ─── Chat ──────────────────────────────────────────────────────────────────

  const fetchChatMessages = async (courseId: string) => {
    try {
      const res = await fetch(`/api/chat/${courseId}/${studentId}`);
      const data = await res.json();
      if (data.success) setChatMessages(data.messages || []);
    } catch (_) { /* silent */ }
  };

  const openChat = (course: Course) => {
    setChatOpen(true);
    setChatMessages([]);
    fetchChatMessages(course.id);
    chatPollRef.current = setInterval(() => fetchChatMessages(course.id), 5000);
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatMessages([]);
    if (chatPollRef.current) clearInterval(chatPollRef.current);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChatMessage = async () => {
    if (!selectedCourse || !chatInput.trim()) return;
    setChatSending(true);
    try {
      const res = await fetch(`/api/chat/${selectedCourse.id}/${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: studentId,
          senderRole: 'student',
          senderName: studentName,
          message: chatInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, data.message]);
        setChatInput('');
      }
    } catch (_) { /* silent */ }
    setChatSending(false);
  };

  // ─── File Upload ───────────────────────────────────────────────────────────

  const fetchUploadedFiles = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/files/${studentId}`);
      const data = await res.json();
      if (data.success) setUploadedFiles(data.files || []);
    } catch (_) { /* silent */ }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeQuiz || !e.target.files?.[0]) return;
    const file = e.target.files[0];

    if (file.size > 100 * 1024 * 1024) {
      setUploadError('O arquivo excede o limite de 100MB.');
      return;
    }

    setUploadError(null);
    setUploadingFile(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentId', studentId);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 15, 85));
      }, 300);

      const res = await fetch(`/api/assignments/${activeQuiz.id}/upload`, {
        method: 'POST',
        body: formData
      });
      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (data.success) {
        setUploadedFiles(prev => [data.file, ...prev]);
        setTimeout(() => setUploadProgress(0), 800);
      } else {
        setUploadError(data.error || 'Erro ao enviar arquivo.');
        setUploadProgress(0);
      }
    } catch (err: any) {
      setUploadError('Erro de conexão ao enviar arquivo.');
      setUploadProgress(0);
    }
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Quiz ──────────────────────────────────────────────────────────────────

  const launchQuiz = (assignment: Assignment) => {
    let questions: QuizQuestion[] = [];
    let media = null;
    let title = assignment.title;
    let id = assignment.id;

    try {
      const parsed = JSON.parse(assignment.description);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      }
      media = {
        text: parsed.text,
        imageUrl: parsed.imageUrl,
        videoUrl: parsed.videoUrl
      };
    } catch (e) {
      if (id === 'conjugation' || id === 'assign-2' || title.toLowerCase().includes('conjug')) {
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
            explanation: 'La estrutura hipotética "Si + imperfecto de subjuntivo" se completa con el condicional simple (compraría).'
          }
        ];
      } else if (id === 'pronunciation' || title.toLowerCase().includes('pronúnc')) {
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
      media = { text: assignment.description };
    }

    setUploadedFiles([]);
    setUploadError(null);
    setActiveMedia(media);
    setActiveQuiz({
      id,
      title,
      questions,
      requiresFileUpload: assignment.requiresFileUpload,
      fileUploadDescription: assignment.fileUploadDescription,
      courseId: assignment.courseId
    });
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizFinished(false);

    // Fetch any previously uploaded files for this assignment
    if (assignment.requiresFileUpload) {
      fetchUploadedFiles(assignment.id);
    }
  };

  const handleOptionSelect = (idx: number) => {
    if (selectedOption !== null) return;
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

      saveProgress(nextGoal, nextQuizzes);
    }
  };

  // ─── Per-course stats helpers ──────────────────────────────────────────────

  const getCourseProgress = (courseId: string) => {
    const courseAssignments = enrolledAssignments.filter(a => a.courseId === courseId);
    if (courseAssignments.length === 0) return 0;
    const done = courseAssignments.filter(a => completedQuizzes.includes(a.id)).length;
    return Math.round((done / courseAssignments.length) * 100);
  };

  const getCoursePendingAssignments = (courseId: string) =>
    enrolledAssignments
      .filter(a => a.courseId === courseId && !completedQuizzes.includes(a.id))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const getCourseCompletedAssignments = (courseId: string) =>
    enrolledAssignments
      .filter(a => a.courseId === courseId && completedQuizzes.includes(a.id))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

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
                background: `conic-gradient(#102A43 ${activityProgress * 3.6}deg, transparent 0deg)`
              }}
            />
            {/* Inner background mask */}
            <div className="absolute inset-3 bg-white dark:bg-[#0A1929] rounded-full flex flex-col items-center justify-center shadow-inner z-10">
              <span className="text-3xl font-extrabold text-[#102A43] dark:text-white">{activityProgress}%</span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Atividades</span>
            </div>
          </div>

          <div className="space-y-3 flex-1 text-center sm:text-left">
            {pendingAssignments.length === 0 ? (
              // Empty state: no pending assignments
              <>
                <span className="inline-block px-2.5 py-0.5 bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full font-bold text-[10px] uppercase">
                  Nenhuma atividade pendente
                </span>
                <h3 className="text-lg font-extrabold text-[#102A43] dark:text-white">
                  Tudo em dia por aqui! 🌟
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Você não possui atividades pendentes nos seus cursos no momento. Que tal explorar novos conteúdos ou descansar as energias para amanhã?
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    onClick={() => {
                      document.getElementById('available-courses-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-[#102A43] dark:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 active:scale-95 transition cursor-pointer"
                  >
                    🔍 Buscar Cursos
                  </button>
                  <button
                    className="border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition cursor-pointer"
                    onClick={() => { }}
                  >
                    😴 Guardar Energias
                  </button>
                </div>
              </>
            ) : (
              // Normal state: show active course info
              <>
                <span className="inline-block px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full font-bold text-[10px] uppercase">
                  {activeCourse ? `${activeCourse.code} · ${activeCourse.term}` : "Atividade Disponível"}
                </span>
                <h3 className="text-lg font-extrabold text-[#102A43] dark:text-white">
                  {activeCourse
                    ? nextAssignment
                      ? nextAssignment.title
                      : activeCourse.title
                    : "Atividade Pendente"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {activeCourse
                    ? `${activeCourse.title} — Você completou ${activityProgress}% das atividades dos seus cursos. Continue assim!`
                    : `Você tem ${pendingAssignments.length} atividade(s) pendente(s). Clique para começar!`
                  }
                </p>
                <button
                  onClick={() => nextAssignment && launchQuiz(nextAssignment)}
                  disabled={!nextAssignment}
                  className="bg-[#102A43] dark:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 active:scale-95 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {nextAssignment ? `▶ ${nextAssignment.title}` : 'Tudo Concluído ✓'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Up Next Activities Feed — only pending, ordered by dueDate ASC */}
        <div className="md:col-span-4 bg-white dark:bg-[#0A1929] border border-slate-150 dark:border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-slate-50 dark:border-white/10 pb-2">
            <h3 className="text-sm font-bold text-[#102A43] dark:text-white">Atividades Pendentes</h3>
            <span className="text-[10px] text-slate-400 font-bold">{pendingAssignments.length} restante(s)</span>
          </div>

          <div className="space-y-3 flex-1">
            {pendingAssignments.length > 0 ? (
              [...pendingAssignments]
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map((assignment) => (
                  <div
                    key={assignment.id}
                    onClick={() => launchQuiz(assignment)}
                    className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-[#050C14] hover:bg-amber-50/40 dark:hover:bg-white/5 rounded-xl cursor-pointer transition border border-transparent hover:border-amber-200/40 dark:hover:border-white/10 group text-left w-full"
                  >
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/20 text-[#102A43] dark:text-indigo-400 rounded-lg group-hover:bg-[#EFE4B0] dark:group-hover:bg-[#EFE4B0]/20 transition">
                      {assignment.type === 'quiz' ? <Globe className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 truncate">
                      <h4 className="font-bold text-slate-800 dark:text-white">{assignment.title}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Prazo: {new Date(assignment.dueDate).toLocaleDateString()} • {assignment.courseCode}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-350 group-hover:translate-x-0.5 transition" />
                  </div>
                ))
            ) : (
              <div className="py-6 text-center text-slate-400 space-y-1">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-500">Tudo concluído!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Enrollment Cards */}
      <section className="space-y-5">
        <div className="flex justify-between items-center pb-2">
          <h3 className="text-lg font-bold text-[#102A43] dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Matérias Matriculadas
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">Clique para mais detalhes</span>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="bg-white dark:bg-[#0A1929] border border-slate-150 dark:border-white/10 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
            Você não está matriculado em nenhuma matéria no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {enrolledCourses.map((course) => {
              const courseProgress = getCourseProgress(course.id);
              const coursePending = getCoursePendingAssignments(course.id).length;

              return (
                <div
                  key={course.id}
                  onClick={() => openCourseDetail(course)}
                  className="bg-white dark:bg-[#0A1929] border border-slate-150 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm group hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition cursor-pointer"
                >
                  <div className={`h-24 bg-gradient-to-r ${getGradient(course.language)} border-b-4 border-[#EFE4B0] flex items-end p-3 relative`}>
                    <span className="text-[10px] font-bold text-[#EFE4B0] uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded">
                      {course.language}
                    </span>
                    {coursePending > 0 && (
                      <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {coursePending} pendente{coursePending > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <h4 className="font-extrabold text-slate-800 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">{course.title}</h4>
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-400 dark:text-slate-500">Progresso</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{courseProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-[#102A43] dark:bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${courseProgress}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-white/10 pt-2.5 mt-2">
                      <span>{course.code} · {course.term}</span>
                      <span className="text-indigo-500 dark:text-indigo-400 flex items-center gap-0.5">
                        Ver detalhes <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Available Courses Section */}
      <section id="available-courses-section" className="space-y-5">
        <div className="flex justify-between items-center pb-2">
          <h3 className="text-lg font-bold text-[#102A43] dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Cursos Disponíveis
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">Explore novas jornadas</span>
        </div>

        {availableCourses.length === 0 ? (
          <div className="bg-white dark:bg-[#0A1929] border border-slate-150 dark:border-white/10 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
            Você já está matriculado em todos os cursos disponíveis!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {availableCourses.map((course) => (
              <div key={course.id} className="bg-white dark:bg-[#0A1929] border border-slate-150 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm group hover:shadow-md transition flex flex-col">
                <div className={`h-24 bg-gradient-to-r ${getGradient(course.language)} border-b-4 border-[#EFE4B0] flex items-end p-3 relative`}>
                  <span className="text-[10px] font-bold text-[#EFE4B0] uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded">
                    {course.language}
                  </span>
                </div>
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-white text-sm">{course.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{course.code} • {course.term}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">{course.studentsCount} alunos matriculados</p>
                  </div>

                  <button
                    onClick={() => {
                      if (onEnroll) {
                        onEnroll(course.id, {
                          id: '',
                          name: studentName,
                          email: studentEmail,
                          grade: 0,
                          attendance: 100,
                          completedLessons: 0
                        });
                      }
                    }}
                    className="mt-4 w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white font-bold py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Matricular-se
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL: DETALHES DO CURSO */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0A1929] rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-white/10 animate-scale-up flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Header */}
            <div className={`h-28 bg-gradient-to-r ${getGradient(selectedCourse.language)} rounded-t-2xl flex items-end p-5 relative shrink-0`}>
              <div>
                <span className="text-[10px] font-bold text-[#EFE4B0] uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded">
                  {selectedCourse.language}
                </span>
                <h3 className="text-xl font-extrabold text-white mt-1">{selectedCourse.title}</h3>
                <p className="text-xs text-white/70 font-medium">{selectedCourse.code} • {selectedCourse.term}</p>
              </div>
              <button onClick={closeCourseDetail} className="absolute top-4 right-4 text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Progress + Teacher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Progress */}
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progresso do Curso</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-extrabold text-[#102A43] dark:text-white">{getCourseProgress(selectedCourse.id)}%</span>
                    <span className="text-xs text-slate-400 mb-1 font-medium">concluído</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-700"
                      style={{ width: `${getCourseProgress(selectedCourse.id)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {getCourseCompletedAssignments(selectedCourse.id).length} concluída(s) · {getCoursePendingAssignments(selectedCourse.id).length} pendente(s)
                  </p>
                </div>

                {/* Teacher */}
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Professor do Curso</p>
                  {courseTeacher ? (
                    <div className="flex items-center gap-3">
                      {courseTeacher.avatar ? (
                        <img src={courseTeacher.avatar} alt={courseTeacher.name} className="w-10 h-10 rounded-full object-cover border-2 border-indigo-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 font-bold text-sm">
                          {courseTeacher.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-xs">{courseTeacher.name}</p>
                        <p className="text-[10px] text-slate-400">{courseTeacher.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Professor não vinculado</p>
                  )}
                  {courseTeacher && (
                    <button
                      onClick={() => chatOpen ? closeChat() : openChat(selectedCourse)}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {chatOpen ? 'Fechar Chat' : 'Abrir Chat com Professor'}
                    </button>
                  )}
                </div>
              </div>

              {/* CHAT (inline, expands) */}
              {chatOpen && courseTeacher && (
                <div className="border border-indigo-200 dark:border-indigo-500/30 rounded-xl overflow-hidden">
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 flex items-center gap-2 border-b border-indigo-200 dark:border-indigo-500/30">
                    <MessageCircle className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Chat com {courseTeacher.name}</span>
                  </div>
                  <div className="h-48 overflow-y-auto p-3 space-y-2 bg-white dark:bg-[#050C14]">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-6">
                        <p>Nenhuma mensagem ainda. Inicie a conversa!</p>
                      </div>
                    ) : chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderRole === 'student' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs font-medium shadow-sm ${
                          msg.senderRole === 'student'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white rounded-bl-none'
                        }`}>
                          <p>{msg.message}</p>
                          <p className={`text-[9px] mt-0.5 ${msg.senderRole === 'student' ? 'text-white/60' : 'text-slate-400'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="border-t border-slate-100 dark:border-white/10 p-2 flex gap-2 bg-white dark:bg-[#050C14]">
                    <input
                      type="text"
                      placeholder="Sua dúvida..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChatMessage()}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-white/5 focus:bg-white dark:text-white"
                    />
                    <button
                      onClick={handleSendChatMessage}
                      disabled={chatSending || !chatInput.trim()}
                      className="p-2 bg-indigo-600 text-white rounded-xl hover:opacity-90 transition disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Completed Activities */}
              {getCourseCompletedAssignments(selectedCourse.id).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Atividades Concluídas
                  </h4>
                  <div className="space-y-2">
                    {getCourseCompletedAssignments(selectedCourse.id).map((a) => (
                      <div key={a.id} className="flex items-center gap-3 p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 dark:text-white">{a.title}</p>
                          <p className="text-[10px] text-slate-400">Prazo: {new Date(a.dueDate).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Activities */}
              {getCoursePendingAssignments(selectedCourse.id).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Atividades Pendentes
                  </h4>
                  <div className="space-y-2">
                    {getCoursePendingAssignments(selectedCourse.id).map((a) => (
                      <div
                        key={a.id}
                        onClick={() => { closeCourseDetail(); launchQuiz(a); }}
                        className="flex items-center gap-3 p-2.5 bg-white dark:bg-[#050C14] rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition group"
                      >
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{a.title}</p>
                          <p className="text-[10px] text-slate-400">Prazo: {new Date(a.dueDate).toLocaleDateString('pt-BR')}</p>
                        </div>
                        {a.requiresFileUpload && (
                          <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Paperclip className="w-2.5 h-2.5" /> Entrega
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {getCourseCompletedAssignments(selectedCourse.id).length === 0 &&
               getCoursePendingAssignments(selectedCourse.id).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Nenhuma atividade cadastrada neste curso ainda.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRÁTICA INTERATIVA DE QUIZ */}
      {activeQuiz && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up border border-slate-100 text-xs flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="flex justify-between items-center border-b border-slate-100 p-5 shrink-0">
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

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!quizFinished ? (
                <div className="space-y-4">
                  {/* Media Section */}
                  {activeMedia && (activeMedia.text || activeMedia.imageUrl || activeMedia.videoUrl) && (
                    <div className="space-y-4 mb-4">
                      {activeMedia.text && (
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">
                          {activeMedia.text}
                        </p>
                      )}
                      {activeMedia.imageUrl && (
                        <div className="rounded-lg overflow-hidden border border-slate-200">
                          <img src={activeMedia.imageUrl} alt="Material de apoio" className="w-full h-auto" />
                        </div>
                      )}
                      {activeMedia.videoUrl && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 aspect-video">
                          <iframe
                            src={activeMedia.videoUrl.replace('watch?v=', 'embed/')}
                            className="w-full h-full"
                            allowFullScreen
                          ></iframe>
                        </div>
                      )}
                    </div>
                  )}

                  {activeQuiz.questions.length > 0 ? (
                    <>
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
                    </>
                  ) : (
                    <div className="pt-4 flex justify-end border-t border-slate-100">
                      <button
                        onClick={() => handleNextQuestion()}
                        className="w-full py-3 bg-[#102A43] text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition"
                      >
                        Marcar como Concluído
                      </button>
                    </div>
                  )}

                  {/* File Upload Section (if required) */}
                  {activeQuiz.requiresFileUpload && (
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <Paperclip className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-700">Entrega Obrigatória</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            {activeQuiz.fileUploadDescription || 'Envie o documento solicitado pelo professor.'}
                          </p>
                        </div>
                      </div>

                      {/* Upload button */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="*/*"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="w-full border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingFile ? 'Enviando...' : 'Selecionar Arquivo (máx. 100MB)'}
                      </button>

                      {/* Upload progress */}
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="space-y-1">
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 text-center">{uploadProgress}% enviado...</p>
                        </div>
                      )}

                      {uploadError && (
                        <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <p className="text-[11px] font-medium">{uploadError}</p>
                        </div>
                      )}

                      {/* Uploaded files list */}
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arquivos Enviados:</p>
                          {uploadedFiles.map((f) => (
                            <div key={f.id} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                              <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-800 hover:text-indigo-600 truncate block">
                                  {f.fileName}
                                </a>
                                <p className="text-[9px] text-slate-400">
                                  {formatFileSize(f.fileSize)} · Expira em {new Date(f.expiresAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}
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

                  {activeQuiz.questions.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-lg border text-slate-700 font-bold inline-block">
                      Sua Pontuação: {quizScore} de {activeQuiz.questions.length} questões corretas
                    </div>
                  )}

                  <div className="text-slate-400 font-medium">
                    🎉 +15 pontos adicionados à sua Meta de Atividade!
                  </div>

                  {/* File upload in finished state (if required and not yet uploaded) */}
                  {activeQuiz.requiresFileUpload && uploadedFiles.length === 0 && (
                    <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-2 text-left">
                      <p className="font-bold text-amber-700 flex items-center gap-1.5 text-xs">
                        <AlertCircle className="w-4 h-4" /> Entrega pendente
                      </p>
                      <p className="text-[11px] text-amber-600">{activeQuiz.fileUploadDescription || 'Envie o documento obrigatório.'}</p>
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="w-full border border-amber-400 text-amber-700 font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-100 transition cursor-pointer disabled:opacity-60"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingFile ? 'Enviando...' : 'Enviar Documento'}
                      </button>
                    </div>
                  )}

                  {uploadedFiles.length > 0 && (
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-xs font-bold text-emerald-700">Documento enviado com sucesso!</p>
                    </div>
                  )}

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
        </div>
      )}
    </div>
  );
}
