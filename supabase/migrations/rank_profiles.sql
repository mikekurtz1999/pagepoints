-- ═══════════════════════════════════════════════════════════════════════════
-- PagePoints — Rank System Schema
-- Run this in Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rank_profiles (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current rank position
  tier              TEXT    NOT NULL DEFAULT 'page_turner'
                    CHECK (tier IN ('page_turner','challenger','bookworm','scholar','literati','sage','grand_sage')),
  subdivision       INTEGER NOT NULL DEFAULT 1
                    CHECK (subdivision BETWEEN 1 AND 4),
  rank_points       INTEGER NOT NULL DEFAULT 0
                    CHECK (rank_points >= 0),

  -- Inactivity tracking
  last_competitive_activity  TIMESTAMPTZ,

  -- Peak rank (never decays)
  peak_tier         TEXT    NOT NULL DEFAULT 'page_turner'
                    CHECK (peak_tier IN ('page_turner','challenger','bookworm','scholar','literati','sage','grand_sage')),
  peak_subdivision  INTEGER NOT NULL DEFAULT 1
                    CHECK (peak_subdivision BETWEEN 1 AND 4),

  -- Border themes
  active_theme      TEXT    NOT NULL DEFAULT 'original'
                    CHECK (active_theme IN ('original','fantasy','sci_fi','romance','grand_sage_exclusive')),
  unlocked_themes   TEXT[]  NOT NULL DEFAULT ARRAY['original'],

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.rank_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can see rank data (leaderboards etc.)
CREATE POLICY "rank_profiles_read_all"
  ON public.rank_profiles FOR SELECT
  USING (true);

-- Users can only modify their own rank profile
CREATE POLICY "rank_profiles_insert_own"
  ON public.rank_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rank_profiles_update_own"
  ON public.rank_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Auto-create on sign-up ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_rank_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.rank_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach to the existing user-creation trigger (safe if already exists)
DROP TRIGGER IF EXISTS on_auth_user_created_rank ON auth.users;
CREATE TRIGGER on_auth_user_created_rank
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_rank_profile();

-- ── Backfill existing users ───────────────────────────────────────────────────
-- Creates a default Page Turner I profile for every user that already exists.

INSERT INTO public.rank_profiles (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
