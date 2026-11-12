-- ============================================================================
-- beaTTer v4 — optional, anonymous statistics store (Supabase / PostgreSQL)
-- Project ref: znfvjfafkcahpkkcbdjc
--
-- HOW TO APPLY: paste the whole file into the Supabase SQL editor and run it.
-- It is idempotent and safe on an existing v3 database (no table is dropped).
--
-- Design
-- ------
-- The browser ships a PUBLIC anon key: whoever opens the page can use it. The
-- database is therefore the only protection, and the rule is simple:
--
--     the anon role can do exactly ONE thing: call beatter_push_round().
--
-- It cannot read, change or delete any table. The function validates every
-- field, writes one telemetry row and keeps the profile counters monotone.
-- Nothing is ever read back by the application.
--
-- What is stored (only for valid rounds of real players who opted in):
--   moves, outcome, the measured decision lead, two measured kinematic scalars,
--   the belief's confidence when a kinematic prediction was made, the SHA-256
--   of the judged seal, the explanation code, and round counters.
-- Never stored: camera frames, landmarks, nonces, anything from the demo.
-- Unknown measurements are NULL - never a made-up 0.
--
-- Known limit: a write-only anonymous endpoint can be spammed by anyone who
-- reads the page source. The checks below bound the size and the values of a
-- row; if abuse appears, add Supabase rate limiting in front of the function.
-- ============================================================================

-- ---------------------------------------------------------------- 1. tables
CREATE TABLE IF NOT EXISTS public.player_profiles (
    id TEXT PRIMARY KEY,                       -- random anonymous id generated in the browser
    player_tag TEXT NOT NULL DEFAULT 'Oyuncu',
    hand_geometry_ratio FLOAT DEFAULT 0.0,     -- v3 legacy, unused by v4
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    total_games INT DEFAULT 0,                 -- valid rounds
    total_wins INT DEFAULT 0,                  -- human wins
    total_losses INT DEFAULT 0,                -- AI wins
    total_ties INT DEFAULT 0,
    rock_freq INT DEFAULT 0,                   -- v3 legacy columns below, unused by v4
    paper_freq INT DEFAULT 0,
    scissors_freq INT DEFAULT 0,
    feint_count INT DEFAULT 0,
    feint_rate FLOAT DEFAULT 0.0,
    wsls_stay_win_rate FLOAT DEFAULT 0.50,
    wsls_shift_loss_rate FLOAT DEFAULT 0.75,
    markov_matrix JSONB DEFAULT '{}'::jsonb,
    q_weights JSONB DEFAULT '{}'::jsonb,
    lessons_learned JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.match_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT REFERENCES public.player_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    game_mode TEXT NOT NULL DEFAULT 'rps',
    series_id TEXT,
    round_number INT NOT NULL,
    player_move TEXT NOT NULL,
    ai_move TEXT NOT NULL,
    outcome TEXT NOT NULL,                     -- 'AI', 'USER', 'TIE'
    early_predicted_move TEXT,                 -- NULL when the judged seal was not a kinematic prediction
    anticipation_ms INT,                       -- judged seal -> landing, measured (frame time)
    feint_detected BOOLEAN DEFAULT FALSE,
    v_angle FLOAT,
    tendon_velocity FLOAT,
    confidence FLOAT,
    seal_hash TEXT,
    ai_reasoning TEXT
);

-- v4: unknown measurements are NULL. Remove the defaults that used to turn "unknown" into 0.
ALTER TABLE public.match_telemetry
    ALTER COLUMN anticipation_ms DROP DEFAULT,
    ALTER COLUMN v_angle DROP DEFAULT,
    ALTER COLUMN tendon_velocity DROP DEFAULT,
    ALTER COLUMN confidence DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_telemetry_player_id ON public.match_telemetry(player_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON public.match_telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_last_seen ON public.player_profiles(last_seen_at DESC);

-- ------------------------------------------------- 2. lock the tables down
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_telemetry ENABLE ROW LEVEL SECURITY;

-- every policy of the earlier versions goes: with row-level security on and no
-- policy, the anon and authenticated roles see and change nothing
DROP POLICY IF EXISTS "Public player profiles read"   ON public.player_profiles;
DROP POLICY IF EXISTS "Public player profiles upsert" ON public.player_profiles;
DROP POLICY IF EXISTS "v4 profile insert"             ON public.player_profiles;
DROP POLICY IF EXISTS "v4 profile update"             ON public.player_profiles;
DROP POLICY IF EXISTS "Public match telemetry read"   ON public.match_telemetry;
DROP POLICY IF EXISTS "Public match telemetry insert" ON public.match_telemetry;
DROP POLICY IF EXISTS "v4 telemetry insert"           ON public.match_telemetry;

REVOKE ALL ON TABLE public.player_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.match_telemetry FROM anon, authenticated;

-- v3's "global brain" table is not used by v4 (no player's data may change what
-- another player's opponent does). If it exists, take it away from the public key too.
DO $$
BEGIN
    IF to_regclass('public.global_brain_weights') IS NOT NULL THEN
        ALTER TABLE public.global_brain_weights ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public brain weights read"   ON public.global_brain_weights;
        DROP POLICY IF EXISTS "Public brain weights upsert" ON public.global_brain_weights;
        REVOKE ALL ON TABLE public.global_brain_weights FROM anon, authenticated;
    END IF;
END
$$;

-- --------------------------------------------- 3. the one thing anon may do
CREATE OR REPLACE FUNCTION public.beatter_push_round(p_player text, p_round jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_moves   constant text[] := ARRAY['ROCK', 'PAPER', 'SCISSORS'];
    v_pm      text := p_round->>'player_move';
    v_am      text := p_round->>'ai_move';
    v_out     text := p_round->>'outcome';
    v_pred    text := p_round->>'early_predicted_move';
    v_hash    text := p_round->>'seal_hash';
    v_reason  text := p_round->>'ai_reasoning';
    v_round   int;
    v_lead    int;
    v_conf    double precision;
    v_angle   double precision;
    v_vel     double precision;
    v_games   int;
    v_wins    int;
    v_losses  int;
    v_ties    int;
BEGIN
    -- shape and size
    IF p_player IS NULL OR char_length(p_player) NOT BETWEEN 8 AND 64 OR p_player !~ '^[A-Za-z0-9_.:-]+$' THEN
        RAISE EXCEPTION 'beatter: invalid player id' USING ERRCODE = '22023';
    END IF;
    IF p_round IS NULL OR jsonb_typeof(p_round) <> 'object' OR pg_column_size(p_round) > 4096 THEN
        RAISE EXCEPTION 'beatter: invalid round document' USING ERRCODE = '22023';
    END IF;

    -- categorical fields
    IF v_pm IS NULL OR NOT (v_pm = ANY (v_moves)) OR v_am IS NULL OR NOT (v_am = ANY (v_moves)) THEN
        RAISE EXCEPTION 'beatter: invalid move' USING ERRCODE = '22023';
    END IF;
    IF v_out IS NULL OR v_out NOT IN ('AI', 'USER', 'TIE') THEN
        RAISE EXCEPTION 'beatter: invalid outcome' USING ERRCODE = '22023';
    END IF;
    IF coalesce(p_round->>'game_mode', 'rps') <> 'rps' THEN
        RAISE EXCEPTION 'beatter: invalid game mode' USING ERRCODE = '22023';
    END IF;
    IF v_pred IS NOT NULL AND NOT (v_pred = ANY (v_moves)) THEN
        RAISE EXCEPTION 'beatter: invalid prediction' USING ERRCODE = '22023';
    END IF;
    -- the outcome must agree with the moves (ROCK beats SCISSORS, PAPER beats ROCK, SCISSORS beats PAPER)
    IF v_out <> CASE
            WHEN v_pm = v_am THEN 'TIE'
            WHEN (v_am, v_pm) IN (('ROCK', 'SCISSORS'), ('PAPER', 'ROCK'), ('SCISSORS', 'PAPER')) THEN 'AI'
            ELSE 'USER'
        END THEN
        RAISE EXCEPTION 'beatter: outcome does not match the moves' USING ERRCODE = '22023';
    END IF;
    IF v_hash IS NOT NULL AND v_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'beatter: invalid seal hash' USING ERRCODE = '22023';
    END IF;
    IF v_reason IS NOT NULL AND v_reason !~ '^[A-Z_]{1,40}$' THEN
        RAISE EXCEPTION 'beatter: invalid explanation code' USING ERRCODE = '22023';
    END IF;

    -- numbers: present and numeric, or absent / null (unknown stays unknown)
    IF jsonb_typeof(p_round->'round_number') <> 'number' THEN
        RAISE EXCEPTION 'beatter: round number missing' USING ERRCODE = '22023';
    END IF;
    v_round := (p_round->>'round_number')::numeric::int;
    IF jsonb_typeof(p_round->'anticipation_ms') = 'number' THEN v_lead  := round((p_round->>'anticipation_ms')::numeric)::int; END IF;
    IF jsonb_typeof(p_round->'confidence')      = 'number' THEN v_conf  := (p_round->>'confidence')::double precision; END IF;
    IF jsonb_typeof(p_round->'v_angle')         = 'number' THEN v_angle := (p_round->>'v_angle')::double precision; END IF;
    IF jsonb_typeof(p_round->'tendon_velocity') = 'number' THEN v_vel   := (p_round->>'tendon_velocity')::double precision; END IF;
    IF v_round < 1 OR v_round > 1000000
       OR (v_lead  IS NOT NULL AND (v_lead  < 0 OR v_lead  > 600000))   -- a single-stroke seal may stand for minutes
       OR (v_conf  IS NOT NULL AND (v_conf  < 0 OR v_conf  > 1))
       OR (v_angle IS NOT NULL AND (v_angle < 0 OR v_angle > 180))
       OR (v_vel   IS NOT NULL AND (v_vel   < 0 OR v_vel   > 100000)) THEN
        RAISE EXCEPTION 'beatter: value out of range' USING ERRCODE = '22023';
    END IF;

    -- profile counters
    IF jsonb_typeof(p_round->'total_games') <> 'number' OR jsonb_typeof(p_round->'total_wins') <> 'number'
       OR jsonb_typeof(p_round->'total_losses') <> 'number' OR jsonb_typeof(p_round->'total_ties') <> 'number' THEN
        RAISE EXCEPTION 'beatter: counters missing' USING ERRCODE = '22023';
    END IF;
    v_games  := (p_round->>'total_games')::numeric::int;
    v_wins   := (p_round->>'total_wins')::numeric::int;
    v_losses := (p_round->>'total_losses')::numeric::int;
    v_ties   := (p_round->>'total_ties')::numeric::int;
    IF v_games < 0 OR v_wins < 0 OR v_losses < 0 OR v_ties < 0 OR v_games > 10000000
       OR v_wins + v_losses + v_ties <> v_games THEN
        RAISE EXCEPTION 'beatter: inconsistent counters' USING ERRCODE = '22023';
    END IF;

    -- counters only ever grow: a caller cannot zero or rewrite somebody's history
    INSERT INTO public.player_profiles AS p (id, player_tag, updated_at, last_seen_at, total_games, total_wins, total_losses, total_ties)
    VALUES (p_player, 'Oyuncu #' || upper(left(regexp_replace(p_player, '[^A-Za-z0-9]', '', 'g'), 4)), now(), now(), v_games, v_wins, v_losses, v_ties)
    ON CONFLICT (id) DO UPDATE SET
        updated_at   = now(),
        last_seen_at = now(),
        total_games  = GREATEST(p.total_games,  EXCLUDED.total_games),
        total_wins   = GREATEST(p.total_wins,   EXCLUDED.total_wins),
        total_losses = GREATEST(p.total_losses, EXCLUDED.total_losses),
        total_ties   = GREATEST(p.total_ties,   EXCLUDED.total_ties);

    INSERT INTO public.match_telemetry
        (player_id, game_mode, round_number, player_move, ai_move, outcome, early_predicted_move,
         anticipation_ms, feint_detected, v_angle, tendon_velocity, confidence, seal_hash, ai_reasoning)
    VALUES
        (p_player, 'rps', v_round, v_pm, v_am, v_out, v_pred,
         v_lead, coalesce((p_round->>'feint_detected')::boolean, false), v_angle, v_vel, v_conf, v_hash, v_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.beatter_push_round(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beatter_push_round(text, jsonb) TO anon, authenticated;

-- -------------------------------------- 4. diagnostic & two-way model store
ALTER TABLE public.player_profiles ADD COLUMN IF NOT EXISTS model_state JSONB DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.diagnostic_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    round_number INT,
    verdict TEXT NOT NULL,
    code TEXT,
    player_move TEXT,
    ai_move TEXT,
    lead_ms DOUBLE PRECISION,
    flight_ms DOUBLE PRECISION,
    fps DOUBLE PRECISION,
    tracked_ratio DOUBLE PRECISION,
    onset_front_ms DOUBLE PRECISION,
    onset_back_ms DOUBLE PRECISION,
    v_spread_deg DOUBLE PRECISION,
    peak_vel DOUBLE PRECISION,
    h_front DOUBLE PRECISION,
    h_back DOUBLE PRECISION,
    reanchored BOOLEAN DEFAULT FALSE,
    trace_uf JSONB DEFAULT '[]'::jsonb,
    trace_ub JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_diag_created_at ON public.diagnostic_telemetry(created_at DESC);
ALTER TABLE public.diagnostic_telemetry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.diagnostic_telemetry FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.beatter_push_diagnostic(p_player text, p_diag jsonb, p_model jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_player IS NULL OR char_length(p_player) NOT BETWEEN 8 AND 64 OR p_player !~ '^[A-Za-z0-9_.:-]+$' THEN
        RETURN;
    END IF;
    IF p_diag IS NULL OR jsonb_typeof(p_diag) <> 'object' OR pg_column_size(p_diag) > 8192 THEN
        RETURN;
    END IF;

    INSERT INTO public.diagnostic_telemetry (
        player_id, round_number, verdict, code, player_move, ai_move,
        lead_ms, flight_ms, fps, tracked_ratio, onset_front_ms, onset_back_ms,
        v_spread_deg, peak_vel, h_front, h_back, reanchored, trace_uf, trace_ub
    ) VALUES (
        p_player,
        CASE WHEN jsonb_typeof(p_diag->'round') = 'number' THEN (p_diag->>'round')::numeric::int ELSE NULL END,
        coalesce(left(p_diag->>'verdict', 32), 'UNKNOWN'),
        left(p_diag->>'code', 40),
        left(p_diag->>'player_move', 16),
        left(p_diag->>'ai_move', 16),
        CASE WHEN jsonb_typeof(p_diag->'lead_ms') = 'number' THEN (p_diag->>'lead_ms')::double precision ELSE NULL END,
        CASE WHEN jsonb_typeof(p_diag->'flight_ms') = 'number' THEN (p_diag->>'flight_ms')::double precision ELSE NULL END,
        CASE WHEN jsonb_typeof(p_diag->'fps') = 'number' THEN (p_diag->>'fps')::double precision ELSE NULL END,
        CASE WHEN jsonb_typeof(p_diag->'tracked_ratio') = 'number' THEN (p_diag->>'tracked_ratio')::double precision ELSE NULL END,
        CASE WHEN jsonb_typeof(p_diag->'onset_front_ms') = 'number' THEN (p_diag->>'onset_front_ms')::double precision ELSE NULL END,
        CASE WHEN jsonb_typeof(p_diag->'onset_back_ms') = 'number' THEN (p_diag->>'onset_back_ms')::double precision ELSE NULL END,
        CASE WHEN jsonb_typeof(p_diag->'v_spread_deg') = 'number' THEN (p_diag->>'v_spread_deg')::double precision ELSE NULL END,
        CASE WHEN jsonb_typeof(p_diag->'peak_vel') = 'number' THEN (p_diag->>'peak_vel')::double precision ELSE NULL END,
        CASE WHEN jsonb_typeof(p_diag->'h_front') = 'number' THEN (p_diag->>'h_front')::double precision ELSE NULL END,
        CASE WHEN jsonb_typeof(p_diag->'h_back') = 'number' THEN (p_diag->>'h_back')::double precision ELSE NULL END,
        coalesce((p_diag->>'reanchored')::boolean, false),
        CASE WHEN jsonb_typeof(p_diag->'trace_uf') = 'array' THEN p_diag->'trace_uf' ELSE '[]'::jsonb END,
        CASE WHEN jsonb_typeof(p_diag->'trace_ub') = 'array' THEN p_diag->'trace_ub' ELSE '[]'::jsonb END
    );

    IF p_model IS NOT NULL AND jsonb_typeof(p_model) = 'object' AND pg_column_size(p_model) <= 32768 THEN
        UPDATE public.player_profiles
        SET model_state = p_model, updated_at = now(), last_seen_at = now()
        WHERE id = p_player;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.beatter_push_diagnostic(text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beatter_push_diagnostic(text, jsonb, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.beatter_pull_state(p_player text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_model jsonb := NULL;
    v_global jsonb;
BEGIN
    IF p_player IS NOT NULL AND char_length(p_player) BETWEEN 8 AND 64 THEN
        SELECT model_state INTO v_model FROM public.player_profiles WHERE id = p_player;
    END IF;
    SELECT jsonb_build_object(
        'total_rounds', count(*),
        'mean_lead_ms', round(avg(anticipation_ms)::numeric, 1),
        'mean_v_angle', round(avg(v_angle)::numeric, 1)
    ) INTO v_global
    FROM public.match_telemetry;
    RETURN jsonb_build_object('model', v_model, 'global', v_global);
END;
$$;

REVOKE ALL ON FUNCTION public.beatter_pull_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beatter_pull_state(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.beatter_pull_recent_diagnostics(p_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rows jsonb;
BEGIN
    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_rows
    FROM (
        SELECT created_at, player_id, round_number, verdict, code, player_move, ai_move,
               lead_ms, flight_ms, fps, tracked_ratio, onset_front_ms, onset_back_ms,
               v_spread_deg, peak_vel, h_front, h_back, reanchored, trace_uf, trace_ub
        FROM public.diagnostic_telemetry
        ORDER BY created_at DESC
        LIMIT LEAST(GREATEST(coalesce(p_limit, 50), 1), 200)
    ) t;
    RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.beatter_pull_recent_diagnostics(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beatter_pull_recent_diagnostics(int) TO anon, authenticated;

-- -------------------------------------------------------------- 5. retention
-- Per-round telemetry older than 180 days can be purged by a scheduled job, e.g.
--   DELETE FROM public.match_telemetry WHERE created_at < now() - interval '180 days';
