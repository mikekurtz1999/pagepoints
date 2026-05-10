export type QuizSource = 'prebuilt' | 'ai_generated' | 'user_submitted';
export type QuizStatus = 'active' | 'pending_review' | 'rejected';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned';
export type AnswerLetter = 'a' | 'b' | 'c' | 'd';

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: AnswerLetter;
  explanation: string | null;
  question_order: number;
  created_at: string;
}

export interface Quiz {
  id: string;
  book_id: string;
  source: QuizSource;
  status: QuizStatus;
  difficulty: Difficulty;
  question_count: number;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  book_id: string;
  status: AttemptStatus;
  answers: Record<string, AnswerLetter> | null;
  score: number | null;
  points_earned: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface AttemptResult {
  attemptId: string;
  score: number;
  correctCount: number;
  totalCount: number;
  pointsEarned: number;
  pointBreakdown?: {
    base: number;
    difficultyMultiplier: number;
    accuracyMultiplier: number;
    readingLevelBonus: number;
    passed: boolean;
  };
  levelUp?: {
    oldLevel: number;
    newLevel: number;
  } | null;
  newTotalPoints?: number;
  questionResults: Array<{
    questionId: string;
    questionText: string;
    yourAnswer: AnswerLetter | null;
    correctAnswer: AnswerLetter;
    correct: boolean;
    explanation: string | null;
    options: Record<AnswerLetter, string>;
  }>;
}

export interface GeneratedQuiz {
  difficulty: Difficulty;
  questions: Array<{
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: AnswerLetter;
    explanation: string;
  }>;
}
