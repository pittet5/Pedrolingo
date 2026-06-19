export interface Student {
  id: string;
  name: string;
  email: string;
  grade: number;
  attendance: number;
  completedLessons: number;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  language: string;
  term: string;
  studentsCount: number;
  averageAttendance: number;
  averageGrade: string;
  studentsList: Student[];
  teacherId?: string;
}

export interface Assignment {
  id: string;
  title: string;
  courseId: string;
  courseCode: string;
  dueDate: string;
  type: 'quiz' | 'essay' | 'drill';
  maxScore: number;
  description: string;
  requiresFileUpload?: boolean;
  fileUploadDescription?: string;
}

export interface StudentSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseCode: string;
  studentName: string;
  studentResponse: string;
  submittedAt: string;
  graded: boolean;
  score?: number;
  feedback?: string;
}

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-1',
    code: 'SPAN-301',
    title: 'Advanced Spanish Syntax',
    language: 'Espanhol',
    term: 'Spring 2026',
    studentsCount: 42,
    averageAttendance: 94,
    averageGrade: 'A-',
    studentsList: [
      { id: 'stud-1', name: 'Alex Rivera', email: 'alex.rivera@edu.com', grade: 92, attendance: 96, completedLessons: 12 },
      { id: 'stud-2', name: 'Bruna Silva', email: 'bruna.silva@edu.com', grade: 88, attendance: 90, completedLessons: 11 },
      { id: 'stud-3', name: 'Carlos Mendoza', email: 'carlos.m@edu.com', grade: 79, attendance: 85, completedLessons: 9 },
      { id: 'stud-4', name: 'Diana Prince', email: 'diana.p@edu.com', grade: 95, attendance: 100, completedLessons: 14 },
      { id: 'stud-5', name: 'Emerson Fittipaldi', email: 'emerson@edu.com', grade: 85, attendance: 92, completedLessons: 10 }
    ]
  },
  {
    id: 'course-2',
    code: 'PORT-101',
    title: 'Beginner Portuguese',
    language: 'Português',
    term: 'Spring 2026',
    studentsCount: 128,
    averageAttendance: 91,
    averageGrade: 'B+',
    studentsList: [
      { id: 'stud-6', name: 'John Smith', email: 'john.smith@edu.com', grade: 76, attendance: 88, completedLessons: 5 },
      { id: 'stud-7', name: 'Sarah Connor', email: 'sarah.c@edu.com', grade: 90, attendance: 95, completedLessons: 8 },
      { id: 'stud-8', name: 'Bruce Wayne', email: 'bruce@gotham.edu', grade: 98, attendance: 80, completedLessons: 10 }
    ]
  },
  {
    id: 'course-3',
    code: 'FRN-202',
    title: 'Intermediate French Conversations',
    language: 'Francês',
    term: 'Spring 2026',
    studentsCount: 25,
    averageAttendance: 89,
    averageGrade: 'B',
    studentsList: [
      { id: 'stud-9', name: 'Esther Green', email: 'esther.g@edu.com', grade: 82, attendance: 90, completedLessons: 7 },
      { id: 'stud-10', name: 'Robert Downey', email: 'robert@edu.com', grade: 87, attendance: 88, completedLessons: 8 }
    ]
  }
];

export const INITIAL_SUBMISSIONS: StudentSubmission[] = [
  {
    id: 'sub-1',
    assignmentId: 'assign-1',
    assignmentTitle: 'Essay: El Futuro del Arte',
    courseId: 'course-1',
    courseCode: 'SPAN-301',
    studentName: 'Carlos Mendoza',
    studentResponse: 'Creo que el arte del futuro estará muy influenciado por la tecnología. Sin embargo, el toque humano y la emoción real jamás podrán ser reemplazados por completo por algoritmos. El linguagem del arte conecta almas, no procesadores.',
    submittedAt: '2026-05-28T18:30:00Z',
    graded: false
  },
  {
    id: 'sub-2',
    assignmentId: 'assign-2',
    assignmentTitle: 'Quiz: Conjugação Subjuntivo',
    courseId: 'course-2',
    courseCode: 'PORT-101',
    studentName: 'John Smith',
    studentResponse: 'Espero que as aulas comecem logo. Se eu tivesse tempo, estudaria mais português. Se nós fôssemos ao mercado, compraríamos pão de queijo quentinho!',
    submittedAt: '2026-05-29T10:15:00Z',
    graded: false
  },
  {
    id: 'sub-3',
    assignmentId: 'assign-3',
    assignmentTitle: 'Ensaio Prático: Minha Cidade',
    courseId: 'course-2',
    courseCode: 'PORT-101',
    studentName: 'Sarah Connor',
    studentResponse: 'Moro em Los Angeles. Minha cidade tem praias bonitas, muitas pessoas ocupadas e sol quase o ano todo. Eu gosto de correr de manhã nas montanhas e beber água de coco gelada.',
    submittedAt: '2026-05-29T14:40:00Z',
    graded: false
  }
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: 'assign-1',
    title: 'Essay: El Futuro del Arte',
    courseId: 'course-1',
    courseCode: 'SPAN-301',
    dueDate: '2026-06-05',
    type: 'essay',
    maxScore: 100,
    description: 'Escreva um ensaio de 300 palavras sobre como as novas mídias digitais e de IA impactarão a interpretação artística literária na Espanha.'
  },
  {
    id: 'assign-2',
    title: 'Quiz: Conjugação Subjuntivo',
    courseId: 'course-2',
    courseCode: 'PORT-101',
    dueDate: '2026-06-02',
    type: 'quiz',
    maxScore: 30,
    description: 'Preencha as lacunas utilizando os verbos no pretérito imperfeito do subjuntivo correspondente.'
  },
  {
    id: 'assign-3',
    title: 'Ensaio Prático: Minha Cidade',
    courseId: 'course-2',
    courseCode: 'PORT-101',
    dueDate: '2026-06-03',
    type: 'essay',
    maxScore: 50,
    description: 'Descreva a sua cidade natal, focando na comida típica e nos pontos turísticos usando adjetivos adequados em português.'
  }
];
