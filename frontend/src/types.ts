export type Course = {
  id: string;
  code: string;
  title: string;
  language: string;
  term: string;
  studentsCount: number;
  studentsList: Student[];
  averageAttendance: number;
  averageGrade: string;
  teacherId?: string;
};

export type Student = {
  id: string;
  name: string;
  email: string;
  grade: number; // 0 - 100
  attendance: number; // 0 - 100
  completedLessons: number;
};

export type Assignment = {
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
};

export type StudentSubmission = {
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
};

export type ChatMessage = {
  id: string;
  courseId: string;
  studentId: string;
  senderId: string;
  senderRole: 'student' | 'teacher';
  senderName: string;
  message: string;
  createdAt: string;
};

export type AssignmentFile = {
  id: string;
  assignmentId: string;
  studentId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType?: string;
  uploadedAt: string;
  expiresAt: string;
};

export type CoPilotMessage = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isQuickAction?: boolean;
  actionType?: 'quiz' | 'resources' | 'lesson_plan' | 'insight';
};
