import React, { useState, useEffect } from 'react';
import { Course, StudentSubmission, Student, Assignment } from '../types';
import { 
  Users, BookOpen, Clock, Plus, Award, CheckCircle, 
  ChevronRight, Calendar, UserPlus, FileText, Check, Trophy, X
} from 'lucide-react';

type TeacherDashboardProps = {
  courses: Course[];
  submissions: StudentSubmission[];
  assignments: Assignment[];
  onAddCourse: (newCourse: Course) => void;
  onGradeSubmission: (subId: string, score: number, feedback: string) => void;
  onAddStudent: (courseId: string, student: Student) => void;
  onSelectCourse: (course: Course | null) => void;
};

export default function TeacherDashboard({
  courses,
  submissions,
  assignments,
  onAddCourse,
  onGradeSubmission,
  onAddStudent,
  onSelectCourse
}: TeacherDashboardProps) {
  // Modal states
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState<StudentSubmission | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState<Course | null>(null);
  
  // Selected course details
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Stats state
  const [stats, setStats] = useState({ avgAttendance: 0, avgGrade: 0 });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats({
          avgAttendance: data.avgAttendance,
          avgGrade: data.avgGrade
        });
      }
    } catch (e) {
      console.error('Error fetching teacher stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [courses, submissions]);

  // Form states
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseLanguage, setNewCourseLanguage] = useState('Espanhol');
  const [newCourseTerm, setNewCourseTerm] = useState('Spring 2026');

  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('85');
  const [newStudentAtt, setNewStudentAtt] = useState('90');

  const [gradeScore, setGradeScore] = useState<number>(85);
  const [gradeFeedback, setGradeFeedback] = useState('');

  // Course selection handler
  const handleCourseClick = (course: Course) => {
    const id = selectedCourseId === course.id ? null : course.id;
    setSelectedCourseId(id);
    onSelectCourse(id ? course : null);
  };

  // Add course submit
  const handleAddCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName || !newCourseCode) return;

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      code: newCourseCode.toUpperCase().trim(),
      title: newCourseName,
      language: newCourseLanguage,
      term: newCourseTerm,
      studentsCount: 0,
      studentsList: [],
      averageAttendance: 100,
      averageGrade: 'A'
    };

    onAddCourse(newCourse);
    setNewCourseName('');
    setNewCourseCode('');
    setShowAddCourseModal(false);
  };

  // Add student submit
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddStudentModal || !newStudentName || !newStudentEmail) return;

    const newStudent: Student = {
      id: `stud-${Date.now()}`,
      name: newStudentName,
      email: newStudentEmail,
      grade: Number(newStudentGrade),
      attendance: Number(newStudentAtt),
      completedLessons: 0
    };

    onAddStudent(showAddStudentModal.id, newStudent);
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentGrade('85');
    setNewStudentAtt('90');
    setShowAddStudentModal(null);
  };

  // Grade submit
  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showGradeModal) return;

    onGradeSubmission(showGradeModal.id, gradeScore, gradeFeedback);
    setGradeFeedback('');
    setGradeScore(85);
    setShowGradeModal(null);
  };

  // Calculate high level metrics
  const totalStudentsTotal = courses.reduce((acc, c) => acc + c.studentsCount, 0);
  const pendingGradingCount = submissions.filter(s => !s.graded).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Title and Quick stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-white/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-[#102A43] dark:text-white tracking-tight">Bem-vindo de volta, Professor Pedro</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Veja as novidades e materiais pedagógicos das suas turmas hoje.</p>
        </div>
        <button
          onClick={() => setShowAddCourseModal(true)}
          className="bg-[#EFE4B0] text-[#102A43] font-bold px-5 py-2.5 rounded-xl hover:bg-[#EFE4B0]/80 transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
        >
          <Plus className="w-5 h-5 text-[#102A43]" />
          Criar Novo Curso
        </button>
      </div>

      {/* Grid Status Quick Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-[#0A1929] p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-500/20 text-[#102A43] dark:text-blue-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Total de Alunos</span>
            <span className="text-2xl font-extrabold text-[#102A43] dark:text-white">{totalStudentsTotal}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A1929] p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Pendentes de Nota</span>
            <span className="text-2xl font-extrabold text-[#102A43] dark:text-white">{pendingGradingCount} tarefas</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A1929] p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Nota Média</span>
            <span className="text-2xl font-extrabold text-[#102A43] dark:text-white">{stats.avgGrade}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A1929] p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Presença Média</span>
            <span className="text-2xl font-extrabold text-[#102A43] dark:text-white">{stats.avgAttendance}%</span>
          </div>
        </div>
      </div>

      {/* Bento Layout: Main Active Courses & Side Pending Grading Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Course management block */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#102A43] dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              Seus Cursos Ativos
            </h3>
            <span className="text-xs bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-full text-slate-500 dark:text-slate-300 font-bold">
              {courses.length} cursos cadastrados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {courses.map((course) => {
              const isSelected = selectedCourseId === course.id;
              return (
                <div
                  key={course.id}
                  onClick={() => handleCourseClick(course)}
                  className={`bg-white dark:bg-[#0A1929] rounded-2xl p-5 border cursor-pointer transition-all duration-300 relative overflow-hidden group hover:shadow-md ${
                    isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-100 dark:border-white/10'
                  }`}
                >
                  <div className="absolute top-0 right-0 p-3">
                    <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {course.term}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 px-2 py-0.5 rounded block w-fit mb-3">
                    {course.code} • {course.language}
                  </span>

                  <h4 className="text-md font-extrabold text-[#102A43] dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate-words">
                    {course.title}
                  </h4>

                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-50 dark:border-white/5 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Alunos</span>
                      <p className="text-sm font-extrabold text-[#102A43] dark:text-white">{course.studentsCount}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Frequência</span>
                      <p className="text-sm font-extrabold text-[#102A43] dark:text-white">{course.averageAttendance}%</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Aprov.</span>
                      <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{course.averageGrade}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center text-xs text-slate-400 select-none pt-2">
                    <span className="font-medium">Gestão de Alunos e Notas</span>
                    <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isSelected ? 'rotate-90 text-indigo-500' : 'group-hover:translate-x-1'}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expanded Course Details Panel (Students, Assign more tasks) */}
          {selectedCourseId && (
            <div className="bg-white border text-xs border-slate-100 rounded-2xl p-6 shadow-sm space-y-5 animate-slide-up">
              {(() => {
                const currentCourse = courses.find(c => c.id === selectedCourseId);
                if (!currentCourse) return null;
                return (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-[#102A43]">{currentCourse.title}</h4>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold rounded uppercase text-[10px]">
                            {currentCourse.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Gestão acadêmica do Semestre • {currentCourse.language}</p>
                      </div>
                      <button
                        onClick={() => setShowAddStudentModal(currentCourse)}
                        className="bg-indigo-50 text-indigo-600 font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        Matricular Aluno
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100">
                            <th className="pb-3 font-bold">Nome</th>
                            <th className="pb-3 font-bold">Contato Email</th>
                            <th className="pb-3 font-bold text-center">Frequência</th>
                            <th className="pb-3 font-bold text-center">Aulas Feitas</th>
                            <th className="pb-3 font-bold text-center">Média Atual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {currentCourse.studentsList && currentCourse.studentsList.length > 0 ? (
                            currentCourse.studentsList.map((stud) => (
                              <tr key={stud.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-3 font-extrabold text-slate-800">{stud.name}</td>
                                <td className="py-3 text-slate-500 font-mono">{stud.email}</td>
                                <td className="py-3 text-center font-bold">
                                  <span className={`px-2 py-0.5 rounded ${stud.attendance >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {stud.attendance}%
                                  </span>
                                </td>
                                <td className="py-3 text-center text-slate-600">{stud.completedLessons} Lições</td>
                                <td className="py-3 text-center font-extrabold text-indigo-600">{stud.grade}/100</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-slate-400">
                                Nenhum aluno matriculado ainda para este curso. Clique em "Matricular Aluno" para adicionar.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </section>

        {/* Pending Grading section */}
        <section className="lg:col-span-4 bg-white dark:bg-[#0A1929] p-5 rounded-2xl border border-slate-100 dark:border-white/10 h-fit space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/10 pb-3">
            <Trophy className="w-5 h-5 text-[#EFE4B0]" />
            <h3 className="text-base font-bold text-[#102A43] dark:text-white">Avaliações de Alunos</h3>
          </div>

          <div className="space-y-4">
            {submissions.filter(s => !s.graded).length > 0 ? (
              submissions.filter(s => !s.graded).map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => {
                    const assign = assignments.find(a => a.id === sub.assignmentId);
                    setGradeScore(85);
                    setGradeFeedback('');
                    setShowGradeModal(sub);
                  }}
                  className="p-4 rounded-xl bg-[#EFE4B0]/10 border border-[#EFE4B0]/30 hover:bg-[#EFE4B0]/20 transition cursor-pointer hover:scale-[1.01]"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded">
                      {sub.courseCode}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Aguarda correção</span>
                  </div>

                  <h4 className="text-xs font-bold text-[#102A43] dark:text-white truncate-words">{sub.assignmentTitle}</h4>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium">Aluno(a): <strong className="text-slate-700 dark:text-slate-300">{sub.studentName}</strong></p>

                  <div className="mt-3 pt-2 border-t border-slate-100/50 flex justify-end items-center text-[10px] text-indigo-600 font-bold gap-1">
                    <span>Atribuir Nota</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto animate-bounce" />
                <p className="text-xs font-bold text-slate-500">Tudo em dia!</p>
                <p className="text-[11px]">Nenhuma submissão aguarda correção por enquanto.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* OVERALL PERFORMANCE CHARTS OR GRAPHICS */}
      <section className="bg-white dark:bg-[#0A1929] p-6 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#102A43] dark:text-white uppercase tracking-wider">Desempenho Semestral Geral</h3>
        {courses.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 font-medium">
            Sem dados do semestre
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-end">
                <span className="font-bold text-slate-500">Média Geral de Frequência das Turmas</span>
                <span className="text-sm font-extrabold text-[#102A43] dark:text-white">{stats.avgAttendance}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-white/5 h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#EFE4B0] h-full rounded-full transition-all duration-500" style={{ width: `${stats.avgAttendance}%` }}></div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-end">
                <span className="font-bold text-slate-500">Média de Aprovação de Notas de Redações</span>
                <span className="text-sm font-extrabold text-[#102A43] dark:text-white">{stats.avgGrade}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-white/5 h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#102A43] h-full rounded-full transition-all duration-500" style={{ width: `${stats.avgGrade}%` }}></div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* MODAL: CORREÇÃO E ATRIBUIÇÃO DE NOTA */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#102A43]">Avaliação de Atividade</h3>
                <p className="text-xs text-slate-400 mt-0.5">{showGradeModal.courseCode} • {showGradeModal.studentName}</p>
              </div>
              <button onClick={() => setShowGradeModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5 pointer-events-none" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Exercício Enviado:</span>
              <h4 className="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded">{showGradeModal.assignmentTitle}</h4>
              <div className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100 italic leading-relaxed whitespace-pre-line max-h-44 overflow-y-auto">
                "{showGradeModal.studentResponse}"
              </div>
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="col-span-1 font-bold text-slate-500 uppercase tracking-wider">Média Atribuída:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={gradeScore}
                  onChange={(e) => setGradeScore(Number(e.target.value))}
                  className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase tracking-wider block">Feedback Pedagógico:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Excelente uso do subjuntivo espanhol! Preste atenção nos termos acentuados..."
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-[#102A43] text-white font-bold rounded-lg transition"
                >
                  Confirmar Nota e Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVO CURSO */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-[#102A43]">Lançar Nova Turma</h3>
              <button onClick={() => setShowAddCourseModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCourseSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5 pb-1">
                <label className="font-bold text-slate-500 uppercase">Qual o nome da Matéria / Turma?</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Introducción a la Literatura Hispánica"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 uppercase">Código da Turma</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: SPAN-402"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 uppercase">Período Letivo</label>
                  <input
                    type="text"
                    required
                    value={newCourseTerm}
                    onChange={(e) => setNewCourseTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase">Idioma</label>
                <select
                  value={newCourseLanguage}
                  onChange={(e) => setNewCourseLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                >
                  <option value="Espanhol">Espanhol (Spanish)</option>
                  <option value="Português">Português (Portuguese)</option>
                  <option value="Francês">Francês (French)</option>
                  <option value="Inglês">Inglês (English)</option>
                  <option value="Alemão">Alemão (German)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCourseModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-[#102A43] text-white font-bold rounded-lg transition"
                >
                  Salvar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MATRICULAR ALUNO */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-[#102A43]">Matricular Aluno em {showAddStudentModal.code}</h3>
              <button onClick={() => setShowAddStudentModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5 bh-1">
                <label className="font-bold text-slate-500 uppercase">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pedro Alvares"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase">Email Acadêmico</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: pedro@edu.com"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 uppercase">Nota de Entrada (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={newStudentGrade}
                    onChange={(e) => setNewStudentGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 uppercase">Frequência (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={newStudentAtt}
                    onChange={(e) => setNewStudentAtt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-[#102A43] text-white font-bold rounded-lg transition"
                >
                  Matricular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
