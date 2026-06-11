-- ============================================================
-- Aspire OS — Auth & Goals Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────────────────────
-- One row per auth user. Created automatically via trigger on signup.
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  onboarded  BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: users read own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: users update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── goals ─────────────────────────────────────────────────────────────────────
-- Admin-managed goal catalogue. Authenticated users can read active goals.
-- Edit label/description here in the DB — no code deploy needed.
CREATE TABLE IF NOT EXISTS public.goals (
  id         UUID    NOT NULL DEFAULT gen_random_uuid(),
  slug       TEXT    NOT NULL UNIQUE,
  label      TEXT    NOT NULL,
  description TEXT   NOT NULL,
  pillar     TEXT    NOT NULL CHECK (pillar IN ('sleep', 'sun', 'satiate', 'serenity')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id)
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals: authenticated users read active"
  ON public.goals FOR SELECT
  USING (auth.role() = 'authenticated' AND active = TRUE);

-- ── user_goals ────────────────────────────────────────────────────────────────
-- Join table between users and goals. is_primary marks the primary goal.
CREATE TABLE IF NOT EXISTS public.user_goals (
  user_id    UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  goal_id    UUID        NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  is_primary BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, goal_id)
);

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_goals: users read own"
  ON public.user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_goals: users insert own"
  ON public.user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_goals: users update own"
  ON public.user_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_goals: users delete own"
  ON public.user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ── Auto-create profile on user signup ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Seed goals ────────────────────────────────────────────────────────────────
-- Label and description are intentionally editable from the DB.
INSERT INTO public.goals (slug, label, description, pillar, sort_order) VALUES
  ('more-energy',    'More energy',    'Stop running on empty by 2pm.',           'satiate',  1),
  ('better-sleep',   'Better sleep',   'Fall asleep faster, wake up recovered.',  'sleep',    2),
  ('more-time',      'More time',      'Get your hours back from the day.',       'serenity', 3),
  ('sharper-focus',  'Sharper focus',  'Hold deep work without the crash.',       'sun',      4),
  ('less-stress',    'Less stress',    'Lower the baseline noise.',               'serenity', 5),
  ('more-strength',  'More strength',  'Build a body that holds up.',             'satiate',  6)
ON CONFLICT (slug) DO NOTHING;
