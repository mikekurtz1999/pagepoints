import { POINTS_CONFIG } from '../constants/points';
import type { Difficulty } from '../types/quiz.types';

export interface PointCalculationInput {
  accuracy: number; // 0–100
  difficulty: Difficulty;
  readingLevel: number | null; // e.g. 5.2 — null falls back to 4.0
}

export interface PointBreakdown {
  total: number;
  base: number;
  difficultyMultiplier: number;
  accuracyMultiplier: number;
  readingLevelBonus: number;
  passed: boolean;
}

/**
 * Returns total points earned for a quiz attempt + a breakdown for display.
 * Below the pass threshold, the user gets nothing.
 */
export function calculatePoints(input: PointCalculationInput): PointBreakdown {
  const { accuracy, difficulty, readingLevel } = input;

  if (accuracy < POINTS_CONFIG.MIN_PASS_SCORE) {
    return {
      total: 0,
      base: POINTS_CONFIG.BASE_POINTS,
      difficultyMultiplier: POINTS_CONFIG.DIFFICULTY_MULTIPLIERS[difficulty],
      accuracyMultiplier: 0,
      readingLevelBonus: 0,
      passed: false,
    };
  }

  const base = POINTS_CONFIG.BASE_POINTS;
  const difficultyMultiplier = POINTS_CONFIG.DIFFICULTY_MULTIPLIERS[difficulty];
  const accuracyMultiplier = pickAccuracyMultiplier(accuracy);
  const level = readingLevel ?? 4.0;
  const readingLevelBonus = Math.max(0, level - 1.0) * POINTS_CONFIG.READING_LEVEL_BONUS_PER_UNIT;

  const raw = base * difficultyMultiplier * accuracyMultiplier + readingLevelBonus;
  const total = Math.min(Math.round(raw), POINTS_CONFIG.MAX_POINTS_PER_QUIZ);

  return {
    total,
    base,
    difficultyMultiplier,
    accuracyMultiplier,
    readingLevelBonus: Math.round(readingLevelBonus),
    passed: true,
  };
}

function pickAccuracyMultiplier(accuracy: number): number {
  for (const tier of POINTS_CONFIG.ACCURACY_TIERS) {
    if (accuracy >= tier.min) return tier.multiplier;
  }
  return 0;
}
