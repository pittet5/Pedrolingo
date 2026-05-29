import React, { useState } from 'react';
import { INITIAL_COURSES, INITIAL_SUBMISSIONS, INITIAL_ASSIGNMENTS } from './data';
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
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(INITIAL_SUBMISSIONS);
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Portal Toggle
  const [currentPortal, setCurrentPortal] = useState<'teacher' | 'student'>('teacher');
  
  // Custom alerts/toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // State update handlers
  const handleAddCourse = (newCourse: Course) => {
    setCourses((prev) => [...prev, newCourse]);
    triggerToast(`Turma "${newCourse.title}" criada com sucesso!`);
  };

  const handleGradeSubmission = (subId: string, score: number, feedback: string) => {
    // 1. Update the submission
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === subId ? { ...sub, graded: true, score, feedback } : sub
      )
    );

    // Find the submission to update corresponding student grade
    const sub = submissions.find((s) => s.id === subId);
    if (sub) {
      setCourses((prevCourses) =>
        prevCourses.map((c) => {
          if (c.code === sub.courseCode) {
            // Update student score
            const updatedStudents = c.studentsList.map((stud) => {
              if (stud.name === sub.studentName) {
                // Approximate new average grade
                const newGrade = Math.round((stud.grade + score) / 2);
                return { ...stud, grade: newGrade, completedLessons: stud.completedLessons + 1 };
              }
              return stud;
            });

            // Re-calculate course average grade
            const avgGradeNum = updatedStudents.reduce((acc, s) => acc + s.grade, 0) / (updatedStudents.length || 1);
            let avgLabel = 'B+';
            if (avgGradeNum >= 90) avgLabel = 'A-';
            else if (avgGradeNum >= 85) avgLabel = 'B+';
            else if (avgGradeNum >= 80) avgLabel = 'B';
            else avgLabel = 'C';

            return {
              ...c,
              studentsList: updatedStudents,
              averageGrade: avgLabel
            };
          }
          return c;
        })
      );
      triggerToast(`Nota ${score}/100 atribuída para ${sub.studentName}!`);
    }
  };

  const handleAddStudent = (courseId: string, student: Student) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          const newList = [...c.studentsList, student];
          return {
            ...c,
            studentsCount: c.studentsCount + 1,
            studentsList: newList
          };
        }
        return c;
      })
    );
    triggerToast(`Aluno "${student.name}" matriculado no curso!`);
  };

  const handleAddMaterialFromAI = (title: string, content: string) => {
    triggerToast(`Material "${title}" adicionado com sucesso às lições!`);
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
