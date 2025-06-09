
export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeLimit: number;
  questions: Question[];
  createdAt: Date;
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentName: string;
  score: number;
  totalPoints: number;
  completedAt: Date;
  answers: Record<string, string>;
}
