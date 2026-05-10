import { create } from 'zustand';
import type { AnswerLetter, AttemptResult, Question } from '../types/quiz.types';

interface QuizState {
  quizId: string | null;
  attemptId: string | null;
  bookId: string | null;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, AnswerLetter>;
  lastResult: AttemptResult | null;
  setActiveQuiz: (params: {
    quizId: string;
    attemptId: string;
    bookId: string;
    questions: Question[];
  }) => void;
  setAnswer: (questionId: string, answer: AnswerLetter) => void;
  setLastResult: (result: AttemptResult | null) => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizId: null,
  attemptId: null,
  bookId: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  lastResult: null,
  setActiveQuiz: ({ quizId, attemptId, bookId, questions }) =>
    set({ quizId, attemptId, bookId, questions, currentIndex: 0, answers: {} }),
  setAnswer: (questionId, answer) =>
    set((s) => ({ answers: { ...s.answers, [questionId]: answer } })),
  setLastResult: (result) => set({ lastResult: result }),
  next: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1) set({ currentIndex: currentIndex + 1 });
  },
  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },
  goTo: (index) => {
    const { questions } = get();
    if (index >= 0 && index < questions.length) set({ currentIndex: index });
  },
  reset: () =>
    set({
      quizId: null,
      attemptId: null,
      bookId: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      // intentionally keep lastResult so the results screen can read it after reset
    }),
}));
