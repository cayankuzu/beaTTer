-- ============================================================================
-- beaTTer // Autonomous Cognitive AI & Swarm Telemetry Database Schema
-- Supabase Project Ref: znfvjfafkcahpkkcbdjc
-- ============================================================================

-- 1. Enable UUID Extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Player Profiles Table: Long-term player recognition, habit memory & Markov models
CREATE TABLE IF NOT EXISTS public.player_profiles (
    id TEXT PRIMARY KEY,                       -- Unique player fingerprint (UUID / device FP)
    player_tag TEXT NOT NULL DEFAULT 'Oyuncu', -- Display name or auto-generated badge (#8821)
    hand_geometry_ratio FLOAT DEFAULT 0.0,    -- Anatomical palm/finger ratio for physical ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    total_games INT DEFAULT 0,
    total_wins INT DEFAULT 0,                 -- Human wins
    total_losses INT DEFAULT 0,               -- AI wins
    total_ties INT DEFAULT 0,
    rock_freq INT DEFAULT 0,
    paper_freq INT DEFAULT 0,
    scissors_freq INT DEFAULT 0,
    feint_count INT DEFAULT 0,
    feint_rate FLOAT DEFAULT 0.0,
    wsls_stay_win_rate FLOAT DEFAULT 0.50,
    wsls_shift_loss_rate FLOAT DEFAULT 0.75,
    markov_matrix JSONB DEFAULT '{
        "ROCK": {"ROCK": 0.33, "PAPER": 0.34, "SCISSORS": 0.33},
        "PAPER": {"ROCK": 0.33, "PAPER": 0.33, "SCISSORS": 0.34},
        "SCISSORS": {"ROCK": 0.34, "PAPER": 0.33, "SCISSORS": 0.33}
    }'::jsonb,
    q_weights JSONB DEFAULT '{
        "OPENING": {"ROCK": 0.0, "PAPER": 0.0, "SCISSORS": 0.0},
        "AFTER_WIN": {"ROCK": 0.0, "PAPER": 0.0, "SCISSORS": 0.0},
        "AFTER_LOSS": {"ROCK": 0.0, "PAPER": 0.0, "SCISSORS": 0.0},
        "AFTER_TIE": {"ROCK": 0.0, "PAPER": 0.0, "SCISSORS": 0.0},
        "FEINT_DEFENSE": {"ROCK": 0.0, "PAPER": 0.0, "SCISSORS": 0.0}
    }'::jsonb,
    lessons_learned JSONB DEFAULT '[]'::jsonb
);

-- 3. Match Telemetry Table: Detailed per-round clash forensics & cryptographic audit trail
CREATE TABLE IF NOT EXISTS public.match_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT REFERENCES public.player_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    game_mode TEXT NOT NULL DEFAULT 'rps',    -- 'rps' or 'mindtwin'
    series_id TEXT,
    round_number INT NOT NULL,
    player_move TEXT NOT NULL,
    ai_move TEXT NOT NULL,
    outcome TEXT NOT NULL,                    -- 'AI', 'USER', 'TIE'
    early_predicted_move TEXT,
    anticipation_ms INT DEFAULT 0,
    feint_detected BOOLEAN DEFAULT FALSE,
    v_angle FLOAT DEFAULT 0.0,
    tendon_velocity FLOAT DEFAULT 0.0,
    confidence FLOAT DEFAULT 0.0,
    seal_hash TEXT,
    ai_reasoning TEXT
);

-- 4. Global Swarm Brain Weights: Swarm intelligence aggregated across all players worldwide
CREATE TABLE IF NOT EXISTS public.global_brain_weights (
    state_key TEXT PRIMARY KEY,
    q_rock FLOAT NOT NULL DEFAULT 0.0,
    q_paper FLOAT NOT NULL DEFAULT 0.0,
    q_scissors FLOAT NOT NULL DEFAULT 0.0,
    sample_count INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed Baseline Game-Theory Priors into Global Swarm Brain
INSERT INTO public.global_brain_weights (state_key, q_rock, q_paper, q_scissors, sample_count)
VALUES
    ('OPENING_ROUND_1', 0.25, 0.40, 0.35, 100),       -- Humans favor Rock on opening; Paper is counter
    ('AFTER_WIN_ROCK', 0.15, 0.60, 0.25, 100),        -- Winner repeats Rock -> Counter with Paper
    ('AFTER_WIN_PAPER', 0.20, 0.20, 0.60, 100),       -- Winner repeats Paper -> Counter with Scissors
    ('AFTER_WIN_SCISSORS', 0.65, 0.15, 0.20, 100),    -- Winner repeats Scissors -> Counter with Rock
    ('AFTER_LOSS_ROCK', 0.50, 0.25, 0.25, 100),       -- Loser shifts to Scissors/Paper -> Counter accordingly
    ('AFTER_LOSS_PAPER', 0.25, 0.50, 0.25, 100),
    ('AFTER_LOSS_SCISSORS', 0.25, 0.25, 0.50, 100),
    ('AFTER_TIE', 0.33, 0.34, 0.33, 100),
    ('FEINT_SUSPECTED_PAPER_TO_ROCK', 0.10, 0.80, 0.10, 100) -- Anticipate fake paper -> fist, play Paper
ON CONFLICT (state_key) DO NOTHING;

-- 6. Indices for High-Speed Queries
CREATE INDEX IF NOT EXISTS idx_telemetry_player_id ON public.match_telemetry(player_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON public.match_telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_last_seen ON public.player_profiles(last_seen_at DESC);

-- 7. Row Level Security (RLS) Policies
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_brain_weights ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated users to read and write player profiles
DROP POLICY IF EXISTS "Public player profiles read" ON public.player_profiles;
CREATE POLICY "Public player profiles read" ON public.player_profiles
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public player profiles upsert" ON public.player_profiles;
CREATE POLICY "Public player profiles upsert" ON public.player_profiles
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Allow anon and authenticated users to read and insert match telemetry
DROP POLICY IF EXISTS "Public match telemetry read" ON public.match_telemetry;
CREATE POLICY "Public match telemetry read" ON public.match_telemetry
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public match telemetry insert" ON public.match_telemetry;
CREATE POLICY "Public match telemetry insert" ON public.match_telemetry
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow anon and authenticated users to read and update global brain weights
DROP POLICY IF EXISTS "Public brain weights read" ON public.global_brain_weights;
CREATE POLICY "Public brain weights read" ON public.global_brain_weights
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public brain weights upsert" ON public.global_brain_weights;
CREATE POLICY "Public brain weights upsert" ON public.global_brain_weights
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Grant privileges to anon, authenticated and service_role
GRANT ALL ON TABLE public.player_profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.match_telemetry TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.global_brain_weights TO anon, authenticated, service_role;
