import type { RankTier, RankTheme } from '../types/rank.types';

// ─── Tier ordering ────────────────────────────────────────────────────────────

export const RANK_TIERS: RankTier[] = [
  'page_turner',
  'challenger',
  'bookworm',
  'scholar',
  'literati',
  'sage',
  'grand_sage',
];

export const RANK_TIER_NAMES: Record<RankTier, string> = {
  page_turner: 'Page Turner',
  challenger:  'Challenger',
  bookworm:    'Bookworm',
  scholar:     'Scholar',
  literati:    'Literati',
  sage:        'Sage',
  grand_sage:  'Grand Sage',
};

export const SUBDIVISION_LABELS = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' } as const;

// ─── Elo / rank mechanics ─────────────────────────────────────────────────────

/** Points needed to advance one subdivision. */
export const POINTS_TO_ADVANCE = 100;

/** Minimum points at the start of each subdivision (loss floor). */
export const SUBDIVISION_FLOOR = 0;

/** Standard Elo K-factor — maximum points exchanged per match. */
export const ELO_K_FACTOR = 32;

// ─── Inactivity decay ────────────────────────────────────────────────────────

/** Days without competitive activity before point decay begins. */
export const DECAY_WARNING_DAYS = 14;

/** Days without competitive activity before dropping one subdivision. */
export const DECAY_DROP_DAYS = 30;

/** Points lost per day during the decay window. */
export const DECAY_POINTS_PER_DAY = 2;

// ─── Theme metadata ───────────────────────────────────────────────────────────

export const THEME_NAMES: Record<RankTheme, string> = {
  original:              'Original',
  fantasy:               'Fantasy',
  sci_fi:                'Sci-Fi',
  romance:               'Romance',
  grand_sage_exclusive:  'Grand Sage Exclusive',
};

export const THEME_UNLOCK_INFO: Record<RankTheme, string> = {
  original:              'Free for all users',
  fantasy:               'Complete a seasonal tournament',
  sci_fi:                'One-time purchase',
  romance:               'One-time purchase',
  grand_sage_exclusive:  'Reach Grand Sage IV',
};

// ─── Tier visual configuration ────────────────────────────────────────────────

export interface TierVisualConfig {
  /** Primary ring / band color. */
  primary: string;
  /** Darker secondary color for shadows, notches, inner bands. */
  secondary: string;
  /** Lighter accent color for highlights and dots. */
  accent: string;
  /** Color used for dark gap lines between bands. */
  gapColor: string;
  /** Optional gem / inset color. */
  gemColor?: string;
  /** Fraction of total size used for the avatar area (0–1). */
  avatarRatio: number;
}

export const TIER_VISUALS: Record<RankTier, TierVisualConfig> = {
  page_turner: {
    primary:     '#9A9A9A',
    secondary:   '#6B6B6B',
    accent:      '#C8C8C8',
    gapColor:    '#1A1A3E',
    avatarRatio: 0.80,
  },
  challenger: {
    primary:     '#CD7F32',
    secondary:   '#8B5E3C',
    accent:      '#E8A050',
    gapColor:    '#1A1A3E',
    avatarRatio: 0.78,
  },
  bookworm: {
    primary:     '#C0C0C0',
    secondary:   '#808080',
    accent:      '#E8E8E8',
    gapColor:    '#1A1A3E',
    avatarRatio: 0.74,
  },
  scholar: {
    primary:     '#7C3AED',
    secondary:   '#5B21B6',
    accent:      '#A78BFA',
    gapColor:    '#1A1A3E',
    gemColor:    '#C084FC',
    avatarRatio: 0.72,
  },
  literati: {
    primary:     '#FFD700',
    secondary:   '#B8860B',
    accent:      '#FFEC8B',
    gapColor:    '#1A1A3E',
    gemColor:    '#FFF8DC',
    avatarRatio: 0.68,
  },
  sage: {
    primary:     '#DC143C',
    secondary:   '#8B0000',
    accent:      '#FF6B6B',
    gapColor:    '#1A1A3E',
    gemColor:    '#FF2244',
    avatarRatio: 0.65,
  },
  grand_sage: {
    primary:     '#FFD700',
    secondary:   '#B8860B',
    accent:      '#FFFFFF',
    gapColor:    '#0F0F23',
    gemColor:    '#FFD700',
    avatarRatio: 0.60,
  },
};

/** Cardinal gem colors unique to Grand Sage. */
export const GRAND_SAGE_CARDINAL_GEMS = {
  top:    '#4169E1',  // Sapphire  (blue)
  right:  '#9B59B6',  // Amethyst  (purple)
  bottom: '#50C878',  // Emerald   (green)
  left:   '#DC143C',  // Ruby      (red)
} as const;
