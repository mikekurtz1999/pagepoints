import { supabase } from './supabase';
import type {
  RankProfile,
  RankTier,
  RankSubdivision,
  RankTheme,
  EloResult,
} from '../types/rank.types';
import {
  RANK_TIERS,
  RANK_TIER_NAMES,
  SUBDIVISION_LABELS,
  POINTS_TO_ADVANCE,
  SUBDIVISION_FLOOR,
  ELO_K_FACTOR,
  DECAY_WARNING_DAYS,
  DECAY_DROP_DAYS,
  DECAY_POINTS_PER_DAY,
} from '../constants/ranks';

// ─── Fetch / Init ─────────────────────────────────────────────────────────────

export async function getRankProfile(userId: string): Promise<RankProfile | null> {
  const { data, error } = await supabase
    .from('rank_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Could not load rank profile: ${error.message}`);
  if (!data) return null;
  return rowToProfile(data);
}

export async function getOrCreateRankProfile(userId: string): Promise<RankProfile> {
  const existing = await getRankProfile(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('rank_profiles')
    .insert({
      user_id: userId,
      tier: 'page_turner',
      subdivision: 1,
      rank_points: 0,
      last_competitive_activity: null,
      peak_tier: 'page_turner',
      peak_subdivision: 1,
      active_theme: 'original',
      unlocked_themes: ['original'],
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(`Could not create rank profile: ${error?.message}`);
  return rowToProfile(data);
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function getRankLabel(tier: RankTier, subdivision: RankSubdivision): string {
  return `${RANK_TIER_NAMES[tier]} ${SUBDIVISION_LABELS[subdivision]}`;
}

export function getTierIndex(tier: RankTier): number {
  return RANK_TIERS.indexOf(tier);
}

// ─── Elo calculation ──────────────────────────────────────────────────────────

/**
 * Calculates how many rank points each player gains/loses from a match.
 * Uses the standard Elo expected-score formula with K = ELO_K_FACTOR.
 */
export function calculateElo(
  winnerTier: RankTier, winnerSubdiv: RankSubdivision, winnerPoints: number,
  loserTier:  RankTier, loserSubdiv:  RankSubdivision, loserPoints:  number,
): EloResult {
  const winnerRating = toGlobalRating(winnerTier, winnerSubdiv, winnerPoints);
  const loserRating  = toGlobalRating(loserTier,  loserSubdiv,  loserPoints);

  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));

  const winnerDelta = Math.round(ELO_K_FACTOR * (1 - expectedWinner));
  const loserDelta  = Math.round(ELO_K_FACTOR * (0 - (1 - expectedWinner)));

  return {
    winnerPointsDelta: Math.max(1, winnerDelta),
    loserPointsDelta:  Math.min(-1, loserDelta),
  };
}

/** Maps tier + subdivision + points to a continuous numeric scale for Elo. */
function toGlobalRating(tier: RankTier, subdiv: RankSubdivision, points: number): number {
  return (getTierIndex(tier) * 4 + (subdiv - 1)) * POINTS_TO_ADVANCE + points;
}

// ─── Match resolution ─────────────────────────────────────────────────────────

/**
 * Applies the result of a competitive match to both players.
 * Call this after every head-to-head challenge or tournament match.
 */
export async function applyMatchResult(
  winnerId: string,
  loserId: string,
): Promise<{ winner: RankProfile; loser: RankProfile }> {
  const [winner, loser] = await Promise.all([
    getOrCreateRankProfile(winnerId),
    getOrCreateRankProfile(loserId),
  ]);

  const { winnerPointsDelta, loserPointsDelta } = calculateElo(
    winner.tier, winner.subdivision, winner.rankPoints,
    loser.tier,  loser.subdivision,  loser.rankPoints,
  );

  const [updatedWinner, updatedLoser] = await Promise.all([
    applyPointDelta(winner, winnerPointsDelta, true),
    applyPointDelta(loser,  loserPointsDelta,  false),
  ]);

  return { winner: updatedWinner, loser: updatedLoser };
}

// ─── Point delta + promotion / demotion ──────────────────────────────────────

async function applyPointDelta(
  profile: RankProfile,
  delta: number,
  isWin: boolean,
): Promise<RankProfile> {
  let { tier, subdivision } = profile;
  let points = profile.rankPoints + delta;

  // Losses cannot push below the subdivision floor
  if (!isWin && points < SUBDIVISION_FLOOR) points = SUBDIVISION_FLOOR;

  // Promotions: advance while points overflow the subdivision cap
  while (points >= POINTS_TO_ADVANCE) {
    points -= POINTS_TO_ADVANCE;
    ({ tier, subdivision } = promoteOne(tier, subdivision));
  }

  // Update peak if new position is higher
  const newPeak = isHigherRank(tier, subdivision, profile.peakTier, profile.peakSubdivision)
    ? { peakTier: tier, peakSubdivision: subdivision }
    : { peakTier: profile.peakTier, peakSubdivision: profile.peakSubdivision };

  const { data, error } = await supabase
    .from('rank_profiles')
    .update({
      tier,
      subdivision,
      rank_points: points,
      peak_tier: newPeak.peakTier,
      peak_subdivision: newPeak.peakSubdivision,
      last_competitive_activity: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.userId)
    .select('*')
    .single();

  if (error || !data) throw new Error(`Could not update rank: ${error?.message}`);
  return rowToProfile(data);
}

function promoteOne(
  tier: RankTier,
  subdivision: RankSubdivision,
): { tier: RankTier; subdivision: RankSubdivision } {
  if (subdivision < 4) return { tier, subdivision: (subdivision + 1) as RankSubdivision };
  const next = RANK_TIERS[getTierIndex(tier) + 1];
  return next ? { tier: next, subdivision: 1 } : { tier, subdivision }; // cap at Grand Sage IV
}

function demoteOne(
  tier: RankTier,
  subdivision: RankSubdivision,
): { tier: RankTier; subdivision: RankSubdivision } {
  if (tier === 'page_turner' && subdivision === 1) return { tier, subdivision }; // absolute floor
  if (subdivision > 1) return { tier, subdivision: (subdivision - 1) as RankSubdivision };
  return { tier: RANK_TIERS[getTierIndex(tier) - 1], subdivision: 4 };
}

function isHigherRank(
  tier: RankTier, subdiv: RankSubdivision,
  peakTier: RankTier, peakSubdiv: RankSubdivision,
): boolean {
  return (getTierIndex(tier) * 4 + subdiv) > (getTierIndex(peakTier) * 4 + peakSubdiv);
}

// ─── Inactivity decay ─────────────────────────────────────────────────────────

/**
 * Checks whether the user's rank should decay due to inactivity and applies it.
 * Call on app open or before showing the rank on the profile screen.
 */
export async function checkAndApplyDecay(userId: string): Promise<RankProfile> {
  const profile = await getOrCreateRankProfile(userId);
  if (!profile.lastCompetitiveActivity) return profile;

  const days = daysBetween(new Date(profile.lastCompetitiveActivity), new Date());
  if (days < DECAY_WARNING_DAYS) return profile;

  if (days >= DECAY_DROP_DAYS) {
    // Drop one full subdivision
    const { tier, subdivision } = demoteOne(profile.tier, profile.subdivision);
    const { data, error } = await supabase
      .from('rank_profiles')
      .update({ tier, subdivision, rank_points: SUBDIVISION_FLOOR, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error || !data) throw new Error(`Could not apply rank decay: ${error?.message}`);
    return rowToProfile(data);
  }

  // Progressive point decay between warning and drop
  const decayDays   = days - DECAY_WARNING_DAYS;
  const decayAmount = Math.floor(decayDays * DECAY_POINTS_PER_DAY);
  const newPoints   = Math.max(SUBDIVISION_FLOOR, profile.rankPoints - decayAmount);
  if (newPoints === profile.rankPoints) return profile;

  const { data, error } = await supabase
    .from('rank_profiles')
    .update({ rank_points: newPoints, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(`Could not apply rank decay: ${error?.message}`);
  return rowToProfile(data);
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Theme management ─────────────────────────────────────────────────────────

export async function setActiveTheme(userId: string, theme: RankTheme): Promise<RankProfile> {
  const profile = await getOrCreateRankProfile(userId);
  if (!profile.unlockedThemes.includes(theme)) {
    throw new Error(`Theme "${theme}" is not unlocked.`);
  }
  const { data, error } = await supabase
    .from('rank_profiles')
    .update({ active_theme: theme, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(`Could not update theme: ${error?.message}`);
  return rowToProfile(data);
}

export async function unlockTheme(userId: string, theme: RankTheme): Promise<RankProfile> {
  const profile = await getOrCreateRankProfile(userId);
  if (profile.unlockedThemes.includes(theme)) return profile;

  if (theme === 'grand_sage_exclusive') {
    if (profile.tier !== 'grand_sage' || profile.subdivision !== 4) {
      throw new Error('Grand Sage Exclusive requires reaching Grand Sage IV.');
    }
  }

  const { data, error } = await supabase
    .from('rank_profiles')
    .update({
      unlocked_themes: [...profile.unlockedThemes, theme],
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(`Could not unlock theme: ${error?.message}`);
  return rowToProfile(data);
}

// ─── DB row mapping ───────────────────────────────────────────────────────────

function rowToProfile(row: Record<string, any>): RankProfile {
  return {
    userId:                   row.user_id,
    tier:                     row.tier as RankTier,
    subdivision:              row.subdivision as RankSubdivision,
    rankPoints:               row.rank_points ?? 0,
    lastCompetitiveActivity:  row.last_competitive_activity ?? null,
    peakTier:                 row.peak_tier as RankTier,
    peakSubdivision:          row.peak_subdivision as RankSubdivision,
    activeTheme:              (row.active_theme ?? 'original') as RankTheme,
    unlockedThemes:           (row.unlocked_themes ?? ['original']) as RankTheme[],
  };
}
