import { supabase } from './supabase';
import type { Difficulty, GeneratedQuiz } from '../types/quiz.types';

/**
 * Calls the Supabase Edge Function `generate-quiz`, which proxies the Anthropic
 * Claude API server-side. The API key never leaves Supabase.
 */
export async function generateQuiz(params: {
  bookTitle: string;
  authorName: string;
  difficulty?: Difficulty;
  bookDescription?: string | null;
}): Promise<GeneratedQuiz> {
  const { bookTitle, authorName, difficulty = 'medium', bookDescription = null } = params;

  const { data, error } = await supabase.functions.invoke('generate-quiz', {
    body: { bookTitle, authorName, difficulty, bookDescription },
  });

  if (error) {
    throw new Error(prettifyEdgeError(error.message));
  }
  if (!data || !data.quiz || !Array.isArray(data.quiz.questions)) {
    throw new Error("Quiz generation returned an unexpected format. Please try again.");
  }
  return data.quiz as GeneratedQuiz;
}

function prettifyEdgeError(message: string): string {
  if (!message) return "Couldn't generate a quiz right now. Please try again.";
  if (message.includes('not found')) {
    return "Quiz generator isn't deployed yet. Check the Supabase Edge Function setup.";
  }
  if (message.toLowerCase().includes('unauthorized')) {
    return "Sign in expired. Please sign out and back in.";
  }
  return `Quiz generation failed: ${message}`;
}
