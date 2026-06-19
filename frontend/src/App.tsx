import React, { useState, useEffect } from 'react';
import { Course, StudentSubmission, Student, Assignment } from './types';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import LoginScreen, { UserProfile } from './components/LoginScreen';
import SettingsModal from './components/SettingsModal';
import AICopilot from './components/AICopilot';
import { 
  Users, BookOpen, Clock, Plus, Award, CheckCircle, 
  ChevronRight, Calendar, UserPlus, Sparkles, GraduationCap,
  Play, Check, Heart, HelpCircle, Bell, Settings
} from 'lucide-react';

export default function App() {
  // Global Shared States
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Portal Toggle
  const [currentPortal, setCurrentPortal] = useState<'teacher' | 'student'>('teacher');
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
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

  const handleAddAssignment = async (assignment: Partial<Assignment>) => {
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment)
      });
      const res = await response.json();
      if (res.success) {
        await loadAllData();
        triggerToast(`Atividade "${assignment.title}" criada com sucesso!`);
      } else {
        throw new Error(res.error || 'Erro ao criar atividade');
      }
    } catch (e: any) {
      console.error(e);
      triggerToast(`Erro ao criar atividade: ${e.message}`);
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

  if (!currentProfile) {
    return (
      <LoginScreen onLogin={(profile) => {
        setCurrentPortal(profile.role);
        setCurrentProfile(profile);
      }} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-[#050C14] dark:text-slate-200 flex flex-col font-sans relative pb-10 transition-colors duration-300">
      
      {/* Dynamic Floating Toast feedback */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#102A43] text-[#EFE4B0] border border-[#EFE4B0]/40 px-6 py-3 rounded-full flex items-center gap-2.5 shadow-2xl font-semibold text-xs animate-slide-up">
          <CheckCircle className="w-5.5 h-5.5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Responsive Header shared bar */}
      <header className="fixed top-0 w-full h-16 bg-white dark:bg-[#0A1929] border-b border-slate-200 dark:border-white/10 shadow-sm z-50 flex justify-between items-center px-6 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow shrink-0 bg-white">
            <img src="/logo.png" alt="Pedrolingo Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-extrabold text-[#102A43] dark:text-white tracking-tight">Pedrolingo</span>
          <span className="hidden sm:inline-block h-4 w-px bg-slate-200 dark:bg-white/10 mx-1" />
          <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Portal Acadêmico
          </span>
        </div>

        {/* Role badge — shows current portal, no switching allowed */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-4 py-1.5 rounded-xl border dark:border-white/10 transition-colors">
          {currentPortal === 'teacher' ? (
            <>
              <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Portal do Professor</span>
            </>
          ) : (
            <>
              <Users className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Portal do Aluno</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-300">
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition cursor-pointer">
            <Settings className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition">
            <Bell className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-full pr-3 border border-slate-200 dark:border-white/10 shadow-sm transition hover:shadow-md">
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 overflow-hidden shrink-0">
              <img 
                src={currentProfile.avatar} 
                alt={currentProfile.name} 
                className="w-full h-full object-cover" 
              />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden md:inline-block">
              {currentProfile.name.split(' ')[0]}
            </span>
            <button 
              onClick={() => {
                setCurrentProfile(null);
                triggerToast('Você saiu da conta.');
              }}
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
            >
              SAIR
            </button>
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
            teacherId={currentProfile.id}
            teacherName={currentProfile.name}
            onAddCourse={handleAddCourse}
            onGradeSubmission={handleGradeSubmission}
            onSelectCourse={setSelectedCourse}
            onAddAssignment={handleAddAssignment}
          />
        ) : (
          <StudentDashboard
            studentName={currentProfile.name}
            studentId={currentProfile.id}
            studentEmail={currentProfile.email}
            courses={courses}
            onEnroll={handleAddStudent}
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

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        currentProfileId={currentProfile.id}
        onProfileDeleted={(id) => {
          if (id === currentProfile.id) {
            setCurrentProfile(null);
          }
        }}
      />
    </div>
  );
}
