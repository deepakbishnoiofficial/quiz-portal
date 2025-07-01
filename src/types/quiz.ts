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