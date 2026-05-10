export type RankTier =
  | 'page_turner'
  | 'challenger'
  | 'bookworm'
  | 'scholar'
  | 'literati'
  | 'sage'
  | 'grand_sage';

export type RankSubdivision = 1 | 2 | 3 | 4;

export type RankTheme =
  | 'original'
  | 'fantasy'
  | 'sci_fi'
  | 'romance'
  | 'grand_sage_exclusive';

export interface RankProfile {
  userId: string;
  tier: RankTier;
  subdivision: RankSubdivision;
  rankPoints: number;                    // Points within current subdivision (0–99)
  lastCompetitiveActivity: string | null; // ISO datetime
  peakTier: RankTier;
  peakSubdivision: RankSubdivision;
  activeTheme: RankTheme;
  unlockedThemes: RankTheme[];
}

export interface EloResult {
  winnerPointsDelta: number;
  loserPointsDelta: number;
}
