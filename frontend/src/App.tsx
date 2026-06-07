import React, { useState, useEffect } from 'react';
import { Course, StudentSubmission, Student, Assignment } from './types';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import AICopilot from './components/AICopilot';
import { 
  Users, BookOpen, Clock, Plus, Award, CheckCircle, 
  ChevronRight, Calendar, UserPlus, Sparkles, GraduationCap,
  Play, Check, Heart, HelpCircle, Bell, ArrowLeftRight
} from 'lucide-react';

export default function App() {
  // Global Shared States
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Portal Toggle
  const [currentPortal, setCurrentPortal] = useState<'teacher' | 'student'>('teacher');
  
  // Custom alerts/toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async () => {
    try {
      const [coursesRes, submissionsRes, assignmentsRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/submissions'),
        fetch('/api/assignments')
      ]);

      const [coursesPayload, submissionsPayload, assignmentsPayload] = await Promise.all([
        coursesRes.json(),
        submissionsRes.json(),
        assignmentsRes.json()
      ]);

      if (coursesPayload.success) setCourses(coursesPayload.data);
      if (submissionsPayload.success) setSubmissions(submissionsPayload.data);
      if (assignmentsPayload.success) setAssignments(assignmentsPayload.data);
    } catch (err) {
      console.error('Error fetching academic data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // State update handlers
  const handleAddCourse = async (newCourse: Course) => {
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      });
      const res = await response.json();
      if (res.success) {
        await loadAllData();
        triggerToast(`Turma "${newCourse.title}" criada com sucesso!`);
      } else {
        throw new Error(res.error || 'Erro ao criar turma');
      }
    } catch (e: any) {
      console.error(e);
      triggerToast(`Erro ao criar turma: ${e.message}`);
    }
  };

  const handleGradeSubmission = async (subId: string, score: number, feedback: string) => {
    try {
      const response = await fetch(`/api/submissions/${subId}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, feedback })
      });
      const res = await response.json();
      if (res.success) {
        await loadAllData();
        
        // Also refresh selectedCourse if it matches the current course code
        const sub = submissions.find((s) => s.id === subId);
        if (sub && selectedCourse && selectedCourse.code === sub.courseCode) {
          const coursesRes = await fetch('/api/courses');
          const coursesPayload = await coursesRes.json();
          if (coursesPayload.success && coursesPayload.data) {
            const freshCourse = coursesPayload.data.find((c: Course) => c.code === sub.courseCode);
            if (freshCourse) setSelectedCourse(freshCourse);
          }
        }
        
        triggerToast(`Nota ${score}/100 atribuída com sucesso!`);
      } else {
        throw new Error(res.error || 'Erro ao atribuir nota');
      }
    } catch (e: any) {
      console.error(e);
      triggerToast(`Erro ao atribuir nota: ${e.message}`);
    }
  };

  const handleAddStudent = async (courseId: string, student: Student) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
      });
      const res = await response.json();
      if (res.success) {
        await loadAllData();
        
        // Update selectedCourse if it was currently selected
        if (selectedCourse && selectedCourse.id === courseId) {
          const coursesRes = await fetch('/api/courses');
          const coursesPayload = await coursesRes.json();
          if (coursesPayload.success && coursesPayload.data) {
            const freshCourse = coursesPayload.data.find((c: Course) => c.id === courseId);
            if (freshCourse) setSelectedCourse(freshCourse);
          }
        }
        
        triggerToast(`Aluno "${student.name}" matriculado no curso!`);
      } else {
        throw new Error(res.error || 'Erro ao matricular aluno');
      }
    } catch (e: any) {
      console.error(e);
      triggerToast(`Erro ao matricular aluno: ${e.message}`);
    }
  };

  const handleAddMaterialFromAI = async (title: string, content: string) => {
    if (!selectedCourse) {
      triggerToast('Selecione um curso no painel para vincular este material!');
      return;
    }

    try {
      const newAssignment = {
        title,
        courseId: selectedCourse.id,
        courseCode: selectedCourse.code,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        type: 'essay',
        maxScore: 100,
        description: content
      };

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssignment)
      });
      const res = await response.json();
      
      if (res.success) {
        await loadAllData();
        triggerToast(`Material "${title}" adicionado com sucesso às lições!`);
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      console.error(e);
      triggerToast(`Erro ao salvar material gerado pela IA.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative pb-10">
      
      {/* Dynamic Floating Toast feedback */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#102A43] text-[#EFE4B0] border border-[#EFE4B0]/40 px-6 py-3 rounded-full flex items-center gap-2.5 shadow-2xl font-semibold text-xs animate-slide-up">
          <CheckCircle className="w-5.5 h-5.5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Responsive Header shared bar */}
      <header className="fixed top-0 w-full h-16 bg-white border-b border-slate-200 shadow-sm z-50 flex justify-between items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-[#102A43] to-blue-900 rounded-xl flex items-center justify-center text-white shadow font-black text-xl tracking-tighter">
            P
          </div>
          <span className="text-xl font-extrabold text-[#102A43] tracking-tight">Pedrolingo</span>
          <span className="hidden sm:inline-block h-4 w-px bg-slate-200 mx-1" />
          <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Portal Acadêmico
          </span>
        </div>

        {/* Dynamic Portal View Selector toggles */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border">
          <button
            onClick={() => {
              setCurrentPortal('teacher');
              triggerToast('Entrando no Painel do Docente...');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              currentPortal === 'teacher'
                ? 'bg-white text-[#102A43] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            Professor
          </button>
          <button
            onClick={() => {
              setCurrentPortal('student');
              triggerToast('Entrando no Painel do Estudante...');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              currentPortal === 'student'
                ? 'bg-white text-[#102A43] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            Aluno
          </button>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <button className="p-2 hover:bg-slate-100 rounded-full transition">
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 overflow-hidden shrink-0">
            <img 
              src={
                currentPortal === 'teacher'
                  ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyX-THKXWPBeDg-RR6uU_S-JtjxT097KMRuXgtroKOeiRMSKCEOZD_fcuHoNxYJVPPufDBjDzhBgC-_WnzyTSjf7DTeFZ8UXPNqU4vgXJSdb2zhOuduEBKl9Jgt7OqqbBWJk-Fp1SG859JP59l3It3KruIRZ5E5YC0ZzVkC3KrmavgM5Fd1PWBI0SsXkea12J1-_3vC5kRu_mJjzZnTlznIvXZrH2-7TmE_UgcQ1dQYeomuz2QXXgGq5sWifuQJz7lY7E9y_05etc'
                  : 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9H_7_MqmLtdVC99kSuTGPFM3MdE-yzTZ6wGLeCEiYkCN2naUn3HGSJ-29re9wQgpG-eAMgUbPj6ibVOs5zjxP5qaeUbfFoODjs-J286Ue4ryPavPOBywBZwCO5LsyahrppMnQVP83qsvQlzIyEOYDKm0p5vaU5J4KV0u7BcVn9ub2GCrvGNIwisSmidXwp7IcCmgWyuAvN9dVJOohZipq1zqL_9j4tOk3Smv1tHX97h5elTfczG9qg8GeELanWXWA5lHh_tv2O08'
              } 
              alt="Avatar" 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>
      </header>

      {/* Main Content Area Side Margin Configs */}
      <main className={`pt-24 px-6 max-w-7xl w-full mx-auto transition-all ${
        currentPortal === 'teacher' ? 'lg:pr-88' : ''
      }`}>
        {currentPortal === 'teacher' ? (
          <TeacherDashboard
            courses={courses}
            submissions={submissions}
            assignments={assignments}
            onAddCourse={handleAddCourse}
            onGradeSubmission={handleGradeSubmission}
            onAddStudent={handleAddStudent}
            onSelectCourse={setSelectedCourse}
          />
        ) : (
          <StudentDashboard
            studentName="Alex Rivera"
            onUpdateMilestone={(inc) => triggerToast(`Parabéns! +${inc} pontos para a meta semanal!`)}
          />
        )}
      </main>

      {/* Render AI Co-Pilot only in Teacher dashboard view */}
      {currentPortal === 'teacher' && (
        <AICopilot 
          activeCourse={selectedCourse} 
          onApplyMaterials={handleAddMaterialFromAI}
        />
      )}
    </div>
  );
}
