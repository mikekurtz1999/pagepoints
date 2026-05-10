import type { Book } from '../types/book.types';
import { supabase } from './supabase';

/**
 * Updates a user's reading_stats after a completed quiz attempt.
 * - Increments quizzes_taken
 * - Increments total_questions and correct_answers (drives accuracy_rate)
 * - Tallies the book's genres in genres_read JSON
 *
 * Called once per quiz attempt right after submitAttempt.
 */
export async function updateReadingStatsAfterAttempt(params: {
  userId: string;
  book: Book;
  totalQuestions: number;
  correctAnswers: number;
}): Promise<void> {
  const { userId, book, totalQuestions, correctAnswers } = params;

  const { data: existing, error: fetchErr } = await supabase
    .from('reading_stats')
    .select('quizzes_taken, total_questions, correct_answers, genres_read')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchErr) {
    console.warn('[stats.service] fetch error:', fetchErr.message);
    return;
  }

  const prevGenres = (existing?.genres_read ?? {}) as Record<string, number>;
  const nextGenres = { ...prevGenres };
  for (const g of book.genre ?? []) {
    if (!g) continue;
    nextGenres[g] = (nextGenres[g] ?? 0) + 1;
  }

  const update = {
    quizzes_taken: (existing?.quizzes_taken ?? 0) + 1,
    total_questions: (existing?.total_questions ?? 0) + totalQuestions,
    correct_answers: (existing?.correct_answers ?? 0) + correctAnswers,
    genres_read: nextGenres,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase
    .from('reading_stats')
    .upsert({ user_id: userId, ...update }, { onConflict: 'user_id' });

  if (upsertErr) console.warn('[stats.service] upsert error:', upsertErr.message);
}

/**
 * Updates streak fields on the user's profile.
 * Streak rules: completing a quiz on a new calendar day continues the streak.
 * Skipping a day resets the streak to 1.
 */
export async function updateStreak(userId: string): Promise<void> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_quiz_date')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  const last = profile.last_quiz_date ? new Date(profile.last_quiz_date) : null;
  if (last) last.setHours(0, 0, 0, 0);

  let newStreak = profile.current_streak ?? 0;

  if (!last) {
    newStreak = 1;
  } else {
    const lastIso = last.toISOString().slice(0, 10);
    if (lastIso === todayIso) {
      // Already counted today — leave streak alone.
      return;
    }
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((today.getTime() - last.getTime()) / oneDay);
    newStreak = diffDays === 1 ? newStreak + 1 : 1;
  }

  const longest = Math.max(profile.longest_streak ?? 0, newStreak);

  await supabase
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: longest,
      last_quiz_date: todayIso,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}
