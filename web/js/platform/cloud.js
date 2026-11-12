// @ts-check
/**
 * beaTTer v4 — optional, anonymous statistics sync (Supabase REST). Never required, never blocking.
 *
 * What is sent, and only for VALID rounds of the real (camera) player:
 *   - one telemetry row per round: moves, outcome, the MEASURED decision lead, the measured V-spread and
 *     peak finger velocity, the confidence of the belief at the judged seal, the full SHA-256 of that seal
 *     and the explanation code;
 *   - a profile summary: counts and move frequencies.
 * Never sent: camera frames, landmarks, nonces/payloads of unrevealed seals, anything from demo rounds.
 *
 * Unknown measurements are sent as null, never as a made-up 0, and a prediction is reported only when the
 * belief at the judged seal was informative (honesty invariant I4).
 *
 * The anon key is public by design (it is shipped to every browser); what it may do is decided entirely
 * by the database: with supabase_schema.sql applied, the key can only call one validating function and
 * cannot read, change or delete any table. The application decides WHETHER to sync in exactly one place
 * (controller.syncCloud): the settings switch, never in demo mode, never on a development host unless
 * ?cloud=1. Nothing is read back.
 */

const URL_BASE = 'https://znfvjfafkcahpkkcbdjc.supabase.co/rest/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZnZqZmFma2NhaHBra2NiZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyOTQ2MDcsImV4cCI6MjEwODg3MDYwN30.ICVlzOkYFgl0qdxNKk7CWnCLdgVWuUHSRI3DK73ozoo';
const TIMEOUT_MS = 4000;
const MOVES = ['ROCK', 'PAPER', 'SCISSORS'];

const numOrNull = (/** @type {any} */ v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * The row for one valid round. Exported for the tests: nothing else may leave the page.
 * @param {any} result RoundResult @param {any} metrics metrics.summary()
 */
export function roundPayload(result, metrics) {
  const b = result.beliefAtFinalCommit;
  const judged = Array.isArray(result.commits) ? result.commits.find((/** @type {any} */ c) => c.seq === result.judgedSeq) : null;
  // a prediction exists only if the judged seal came from watching the hand and has a unique maximum
  let predicted = null, confidence = null;
  if (judged && judged.reason !== 'BEHAVIOUR' && b && Array.isArray(b.post) && b.post.length === 3 && b.post.every(Number.isFinite)) {
    const top = Math.max(...b.post);
    if (b.post.filter((/** @type {number} */ p) => p === top).length === 1) { predicted = MOVES[b.post.indexOf(top)]; confidence = top; }
  }
  const k = result.kinematics ?? {};
  const lead = numOrNull(result.timing ? result.timing.leadToLandingMs : null);
  return {
    game_mode: 'rps',
    round_number: result.round,
    player_move: MOVES[result.playerMove],
    ai_move: MOVES[result.aiMove],
    outcome: result.verdict === 'PLAYER' ? 'USER' : result.verdict,
    early_predicted_move: predicted,
    anticipation_ms: lead === null ? null : Math.round(lead),
    feint_detected: !!k.reanchored,
    v_angle: numOrNull(k.vSpreadDeg),
    tendon_velocity: numOrNull(k.peakFlexionVelDegS),
    confidence,
    seal_hash: judged ? judged.hash : null,
    ai_reasoning: result.explanation ? result.explanation.code : null,
    total_games: metrics.rounds.valid,
    total_wins: metrics.outcome.player,
    total_losses: metrics.outcome.ai,
    total_ties: metrics.outcome.tie,
  };
}

/**
 * Compact diagnostic payload for any camera round (valid, foul, or void) or abort event.
 * @param {any} result
 */
export function diagnosticPayload(result) {
  if (!result || typeof result !== 'object') return null;
  const k = result.kinematics ?? {};
  const tm = result.timing ?? {};
  const tr = result.trace ?? null;
  const tail = (/** @type {any} */ a) => (Array.isArray(a) ? a.slice(-10) : []);
  return {
    round: numOrNull(result.round),
    verdict: typeof result.verdict === 'string' ? result.verdict.slice(0, 32) : 'ABORT',
    code: result.explanation && typeof result.explanation.code === 'string' ? result.explanation.code.slice(0, 40) : (typeof result.code === 'string' ? result.code.slice(0, 40) : null),
    player_move: result.playerMove === 0 || result.playerMove === 1 || result.playerMove === 2 ? MOVES[result.playerMove] : null,
    ai_move: result.aiMove === 0 || result.aiMove === 1 || result.aiMove === 2 ? MOVES[result.aiMove] : null,
    lead_ms: numOrNull(tm.leadToLandingMs),
    flight_ms: numOrNull(tm.flightMs),
    fps: numOrNull(tm.fpsInFlight),
    tracked_ratio: numOrNull(tm.trackedInFlight),
    onset_front_ms: numOrNull(k.onsetLeadFrontMs),
    onset_back_ms: numOrNull(k.onsetLeadBackMs),
    v_spread_deg: numOrNull(k.vSpreadDeg),
    peak_vel: numOrNull(k.peakFlexionVelDegS),
    h_front: numOrNull(k.headingFront),
    h_back: numOrNull(k.headingBack),
    reanchored: !!k.reanchored,
    trace_uf: tail(tr ? tr.uF : null),
    trace_ub: tail(tr ? tr.uB : null),
  };
}

/**
 * @param {{enabled:boolean, onStatus?: (s:'off'|'connecting'|'online'|'offline') => void, fetchImpl?: typeof fetch}} o
 */
export function createCloud({ enabled, onStatus, fetchImpl }) {
  const doFetch = fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  let on = !!enabled && !!doFetch;
  /** @type {'off'|'connecting'|'online'|'offline'} */ let status = on ? 'connecting' : 'off';
  const set = (/** @type {'off'|'connecting'|'online'|'offline'} */ s) => { if (s !== status) { status = s; if (onStatus) { try { onStatus(s); } catch { /* ignore */ } } } };

  /** @param {string} path @param {any} body @param {Record<string,string>} [extra] */
  const post = async (path, body, extra = {}) => {
    if (!on || !doFetch) return false;
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null;
    try {
      const res = await doFetch(`${URL_BASE}/${path}`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal', ...extra },
        body: JSON.stringify(body),
        signal: ctl ? ctl.signal : undefined,
      });
      set(res.ok ? 'online' : 'offline');
      return res.ok;
    } catch {
      set('offline');
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  /** @param {string} path @param {any} body */
  const postJson = async (path, body) => {
    if (!on || !doFetch) return null;
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null;
    try {
      const res = await doFetch(`${URL_BASE}/${path}`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctl ? ctl.signal : undefined,
      });
      if (!res.ok) return null;
      set('online');
      return await res.json();
    } catch {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  return {
    status: () => status,
    /** @param {boolean} v */
    setEnabled(v) { const next = !!v && !!doFetch; if (next === on) return; on = next; set(on ? 'connecting' : 'off'); },
    /**
     * Upload one valid round and the refreshed profile summary. Never throws, never blocks the game.
     * @param {string} playerId anonymous random id @param {any} result RoundResult @param {any} metrics metrics.summary()
     */
    async pushRound(playerId, result, metrics) {
      if (!on || !result || !result.valid || result.simulated || typeof playerId !== 'string') return;
      await post('rpc/beatter_push_round', { p_player: playerId, p_round: roundPayload(result, metrics) });
    },
    /**
     * Upload diagnostic trace (including fouls, voids, and learned model snapshot) for remote analysis.
     * @param {string} playerId @param {any} result @param {any} [modelJson]
     */
    async pushDiagnostic(playerId, result, modelJson = null) {
      if (!on || !result || result.simulated || typeof playerId !== 'string') return;
      const diag = diagnosticPayload(result);
      if (!diag) return;
      await post('rpc/beatter_push_diagnostic', { p_player: playerId, p_diag: diag, p_model: modelJson });
    },
    /**
     * Pull cloud-stored player model and global population priors if available.
     * @param {string} playerId
     */
    async pullState(playerId) {
      if (!on || typeof playerId !== 'string') return null;
      return postJson('rpc/beatter_pull_state', { p_player: playerId });
    },
  };
}
