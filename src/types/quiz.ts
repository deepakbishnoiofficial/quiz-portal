// src/types/quiz.ts

// Defines the structure for a single question
export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  question: string;
  options?: string[]; // This is optional
  correctAnswer: string;
  points: number;
}

// Defines the structure for a quiz
export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeLimit: number; // Time in minutes
  questions: Question[];
  createdAt: Date;
}

// Live Quiz Session structure
export interface LiveQuizSession {
  id: string;
  quiz_id: string;
  host_id: string;
  join_code: string | null; // null for private quizzes
  status: 'waiting' | 'in_progress' | 'completed';
  scheduled_start?: Date;
  scheduled_end?: Date;
  started_at?: Date;
  ended_at?: Date;
  created_at: Date;
  is_private?: boolean;
  private_join_code?: string | null; // null for public quizzes
  quiz?: Quiz;
}

// Defines the structure for a user's quiz results
export interface QuizResult {
  id: string;
  quizId: string;
  studentName: string;
  score: number;
  totalPoints: number;
  answers: Record<string, string>;
  completedAt: Date;
  timeTaken: number; // Time in seconds
}
