import type { Difficulty } from '../types/quiz.types';

export const POINTS_CONFIG = {
  BASE_POINTS: 100,
  DIFFICULTY_MULTIPLIERS: {
    easy: 0.75,
    medium: 1.0,
    hard: 1.5,
  } satisfies Record<Difficulty, number>,
  // Accuracy thresholds (descending). First match wins.
  ACCURACY_TIERS: [
    { min: 90, multiplier: 1.0 },
    { min: 70, multiplier: 0.75 },
    { min: 50, multiplier: 0.5 },
  ],
  READING_LEVEL_BONUS_PER_UNIT: 10, // bonus points per reading-level unit above 1.0
  MAX_POINTS_PER_QUIZ: 500,
  MIN_PASS_SCORE: 50, // below 50% = 0 points (must re-read and try again)
} as const;
