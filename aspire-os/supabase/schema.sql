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

-- ── XP + display name on profiles ───────────────────────────────────────────
-- Run these ALTER TABLE statements after the initial CREATE TABLE above.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

-- ── protocol_completions ──────────────────────────────────────────────────────
-- Tracks which protocol tasks a user checked off each day.
CREATE TABLE IF NOT EXISTS public.protocol_completions (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date DATE        NOT NULL,
  task_index     INTEGER     NOT NULL,
  task_text      TEXT        NOT NULL,
  xp_earned      INTEGER     NOT NULL DEFAULT 10,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE (user_id, completed_date, task_index)
);

ALTER TABLE public.protocol_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "protocol_completions: users manage own"
  ON public.protocol_completions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── cadence_protocols ────────────────────────────────────────────────────────
-- Stores each user's generated Cadence protocol per day for cross-device sync.
CREATE TABLE IF NOT EXISTS public.cadence_protocols (
  user_id       UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_date DATE  NOT NULL,
  protocol_json JSONB NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, protocol_date)
);

ALTER TABLE public.cadence_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cadence_protocols: users manage own"
  ON public.cadence_protocols FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── user_oauth ────────────────────────────────────────────────────────────────
-- Stores encrypted OAuth tokens for all third-party integrations.
-- Keyed by (session_id, provider) — session_id is the cadence_session cookie.
-- RLS is intentionally disabled: this table is only accessed server-side via
-- API routes that enforce access through the session cookie.
CREATE TABLE IF NOT EXISTS public.user_oauth (
  session_id   TEXT        NOT NULL,
  provider     TEXT        NOT NULL,
  access_token TEXT        NOT NULL,
  refresh_token TEXT,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, provider)
);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS user_oauth_updated_at ON public.user_oauth;
CREATE TRIGGER user_oauth_updated_at
  BEFORE UPDATE ON public.user_oauth
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
