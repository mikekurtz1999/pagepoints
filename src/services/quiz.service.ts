import type { Book } from '../types/book.types';
import type {
  AnswerLetter,
  AttemptResult,
  Difficulty,
  Question,
  Quiz,
} from '../types/quiz.types';
import { calculatePoints } from '../utils/points.utils';
import { generateQuiz } from './claude.service';
import { awardQuizPoints } from './points.service';
import { getBookById } from './books.service';
import { updateReadingStatsAfterAttempt, updateStreak } from './stats.service';
import { supabase } from './supabase';

/**
 * Returns an active quiz for a book, generating one via Claude if none exists.
 * For MVP we keep difficulty fixed to 'medium' — we can add a difficulty picker later.
 */
export async function getOrCreateQuizForBook(book: Book, difficulty: Difficulty = 'medium'): Promise<Quiz> {
  const { data: existing, error: existingError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('book_id', book.id)
    .eq('status', 'active')
    .eq('difficulty', difficulty)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(`Could not load quizzes: ${existingError.message}`);
  if (existing) return existing as Quiz;

  const generated = await generateQuiz({
    bookTitle: book.title,
    authorName: book.author,
    difficulty,
    bookDescription: book.description,
  });

  const { data: newQuiz, error: insertQuizError } = await supabase
    .from('quizzes')
    .insert({
      book_id: book.id,
      source: 'ai_generated',
      status: 'active',
      difficulty: generated.difficulty ?? difficulty,
      question_count: generated.questions.length,
    })
    .select('*')
    .single();

  if (insertQuizError || !newQuiz) {
    throw new Error(`Could not save quiz: ${insertQuizError?.message ?? 'unknown error'}`);
  }

  const questionRows = generated.questions.map((q, idx) => ({
    quiz_id: newQuiz.id,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    question_order: idx,
  }));

  const { error: insertQError } = await supabase.from('questions').insert(questionRows);
  if (insertQError) throw new Error(`Could not save questions: ${insertQError.message}`);

  return newQuiz as Quiz;
}

export async function getQuestionsForQuiz(quizId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('question_order', { ascending: true });
  if (error) throw new Error(`Could not load questions: ${error.message}`);
  return (data ?? []) as Question[];
}

export async function startAttempt(params: {
  userId: string;
  quizId: string;
  bookId: string;
}): Promise<string> {
  const { data: existing } = await supabase
    .from('quiz_attempts')
    .select('id, status')
    .eq('user_id', params.userId)
    .eq('quiz_id', params.quizId)
    .maybeSingle();

  if (existing && existing.status === 'in_progress') return existing.id as string;
  if (existing && existing.status === 'completed') {
    throw new Error('You already finished this quiz. Each quiz can only be taken once.');
  }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: params.userId,
      quiz_id: params.quizId,
      book_id: params.bookId,
      status: 'in_progress',
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(`Could not start quiz: ${error?.message ?? 'unknown'}`);
  return data.id as string;
}

/**
 * Score and finalize a completed attempt:
 *   1. compute score (% correct)
 *   2. compute points using calculatePoints()
 *   3. atomically award points + check level-up via the add_points RPC
 *   4. update reading_stats and streak
 *   5. write final score + points back onto the attempt row
 */
export async function submitAttempt(params: {
  attemptId: string;
  answers: Record<string, AnswerLetter>;
}): Promise<AttemptResult> {
  const { data: attempt, error: attemptErr } = await supabase
    .from('quiz_attempts')
    .select('id, quiz_id, user_id, book_id, status')
    .eq('id', params.attemptId)
    .single();
  if (attemptErr || !attempt) {
    throw new Error(`Could not load attempt: ${attemptErr?.message ?? 'not found'}`);
  }
  if (attempt.status === 'completed') {
    throw new Error('This quiz attempt was already submitted.');
  }

  // 1. Pull questions and the parent quiz so we can score + know difficulty/level.
  const [{ data: quiz }, questions, book] = await Promise.all([
    supabase.from('quizzes').select('id, difficulty').eq('id', attempt.quiz_id as string).single(),
    getQuestionsForQuiz(attempt.quiz_id as string),
    getBookById(attempt.book_id as string),
  ]);

  let correctCount = 0;
  const questionResults: AttemptResult['questionResults'] = questions.map((q) => {
    const yourAnswer = params.answers[q.id] ?? null;
    const correct = yourAnswer === q.correct_answer;
    if (correct) correctCount++;
    return {
      questionId: q.id,
      questionText: q.question_text,
      yourAnswer,
      correctAnswer: q.correct_answer,
      correct,
      explanation: q.explanation,
      options: {
        a: q.option_a,
        b: q.option_b,
        c: q.option_c,
        d: q.option_d,
      },
    };
  });

  const score = questions.length === 0 ? 0 : (correctCount / questions.length) * 100;

  // 2. Calculate points
  const breakdown = calculatePoints({
    accuracy: score,
    difficulty: (quiz?.difficulty as Difficulty) ?? 'medium',
    readingLevel: book?.reading_level ?? null,
  });

  // 3. Award points via RPC (only if > 0). RPC handles the level-up logic.
  let levelUp: AttemptResult['levelUp'] = null;
  let newTotalPoints: number | undefined = undefined;
  if (breakdown.total > 0) {
    const result = await awardQuizPoints({
      userId: attempt.user_id as string,
      attemptId: attempt.id as string,
      points: breakdown.total,
    });
    newTotalPoints = result.newTotal;
    if (result.leveledUp) {
      levelUp = { oldLevel: result.oldLevel, newLevel: result.newLevel };
    }
  }

  // 4. Update reading_stats + streak (best-effort; failures shouldn't block the result)
  if (book) {
    try {
      await updateReadingStatsAfterAttempt({
        userId: attempt.user_id as string,
        book,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
      });
    } catch (e) {
      console.warn('[submitAttempt] reading_stats update failed:', e);
    }
  }
  try {
    await updateStreak(attempt.user_id as string);
  } catch (e) {
    console.warn('[submitAttempt] streak update failed:', e);
  }

  // 5. Persist score + points on the attempt row
  const { error: updateErr } = await supabase
    .from('quiz_attempts')
    .update({
      status: 'completed',
      answers: params.answers,
      score,
      points_earned: breakdown.total,
      completed_at: new Date().toISOString(),
    })
    .eq('id', params.attemptId);

  if (updateErr) throw new Error(`Could not save score: ${updateErr.message}`);

  return {
    attemptId: params.attemptId,
    score,
    correctCount,
    totalCount: questions.length,
    pointsEarned: breakdown.total,
    pointBreakdown: {
      base: breakdown.base,
      difficultyMultiplier: breakdown.difficultyMultiplier,
      accuracyMultiplier: breakdown.accuracyMultiplier,
      readingLevelBonus: breakdown.readingLevelBonus,
      passed: breakdown.passed,
    },
    levelUp,
    newTotalPoints,
    questionResults,
  };
}

export async function getAttemptResult(attemptId: string): Promise<AttemptResult | null> {
  const { data: attempt, error } = await supabase
    .from('quiz_attempts')
    .select('id, quiz_id, score, points_earned, answers, status')
    .eq('id', attemptId)
    .maybeSingle();
  if (error || !attempt || attempt.status !== 'completed') return null;

  const questions = await getQuestionsForQuiz(attempt.quiz_id as string);
  const answers = (attempt.answers ?? {}) as Record<string, AnswerLetter>;
  let correctCount = 0;
  const questionResults: AttemptResult['questionResults'] = questions.map((q) => {
    const yourAnswer = answers[q.id] ?? null;
    const correct = yourAnswer === q.correct_answer;
    if (correct) correctCount++;
    return {
      questionId: q.id,
      questionText: q.question_text,
      yourAnswer,
      correctAnswer: q.correct_answer,
      correct,
      explanation: q.explanation,
      options: {
        a: q.option_a,
        b: q.option_b,
        c: q.option_c,
        d: q.option_d,
      },
    };
  });

  return {
    attemptId,
    score: Number(attempt.score ?? 0),
    correctCount,
    totalCount: questions.length,
    pointsEarned: attempt.points_earned ?? 0,
    questionResults,
  };
}
