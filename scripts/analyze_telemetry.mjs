#!/usr/bin/env node
/**
 * scripts/analyze_telemetry.mjs
 *
 * beaTTer — Self-Diagnosing Telemetry & Replay Analyzer.
 * Pulls rounds from:
 *   1. Local playtest logs (`.local_telemetry/rounds.jsonl`)
 *   2. Supabase remote diagnostics (`beatter_pull_recent_diagnostics` RPC)
 *
 * Replays recorded hand-pose traces against the current `opening.js` +
 * `player_model.js` + SCISSORS tendon-coupling rules to verify biomechanical
 * fixes, detect remaining edge cases, and output a structured health report.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOpeningDetector } from '../web/js/core/opening.js';
import { createPlayerModel } from '../web/js/core/player_model.js';
import { foulNow } from '../web/js/core/decision.js';
import { RULES } from '../web/js/core/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOCAL_JSONL = path.join(ROOT, '.local_telemetry', 'rounds.jsonl');
const REMOTE_CACHE_JSONL = path.join(ROOT, '.local_telemetry', 'remote_diagnostics.jsonl');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://znfvjfafkcahpkkcbdjc.supabase.co';
// The diagnostics of all players are readable with the service-role key only (supabase_schema.sql): it
// is a secret, so it comes from the environment and is never written into a file of the repository.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MOVE_NAMES = ['ROCK', 'PAPER', 'SCISSORS'];

async function fetchRemoteDiagnostics(limit = 100) {
  if (!SUPABASE_SERVICE_ROLE_KEY) return { status: 'SKIPPED (set SUPABASE_SERVICE_ROLE_KEY to read the remote diagnostics)', rows: [] };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/beatter_pull_recent_diagnostics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ p_limit: limit }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { status: `HTTP ${res.status}`, rows: [] };
    }
    const data = await res.json();
    const rows = Array.isArray(data) ? data : [];
    if (rows.length > 0) {
      fs.mkdirSync(path.dirname(REMOTE_CACHE_JSONL), { recursive: true });
      fs.writeFileSync(
        REMOTE_CACHE_JSONL,
        rows.map((r) => JSON.stringify(r)).join('\n') + '\n',
        'utf8'
      );
    }
    return { status: 'OK', rows };
  } catch (err) {
    return { status: `OFFLINE (${err.cause?.code || err.message})`, rows: [] };
  }
}

function loadLocalRounds() {
  if (!fs.existsSync(LOCAL_JSONL)) return [];
  return fs
    .readFileSync(LOCAL_JSONL, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Replay the referee's foul test on a recorded in-flight trace with the current detectors. Like the engine
 * (round_engine.js: F and B), the referee reads the finger groups AS MEASURED; the scissors coupling is
 * the referee's rule for a hand that settles as a clear scissors. The trace holds no settled shape, so a
 * throw the classifier read as SCISSORS is taken as a clear one. An APPROXIMATION, not the engine: the
 * trace keeps three decimals, the noise variance is the stored per-round summary (the engine estimates one
 * per group), and neither the latch over the last in-air frames nor the void rules are replayed. Rounds
 * without a classified throw cannot be replayed.
 */
function replayTraceWithCurrentEngine(raw) {
  const r = raw.payload || raw;
  const tr = r.trace;
  const move = r.playerMove;
  if (!tr || !Array.isArray(tr.t) || tr.t.length < 3 || (move !== 0 && move !== 1 && move !== 2)) return null;

  const F = createOpeningDetector({ legalProgress: 0.105, stayVar: 0.0032 });
  const B = createOpeningDetector({ legalProgress: 0.135, stayVar: 0.0042, closedMin: 0.2, reanchorFrames: 1 });
  const noiseVar = (r.kinematics?.noiseSd ?? 0.04) ** 2;
  const tLand = r.timing?.tLanding ?? tr.t[tr.t.length - 1];
  let hF = 0;
  let hB = 0;
  for (let i = 0; i < tr.t.length; i++) {
    const t = tr.t[i];
    if (t >= tLand - 1e-6) break; // pre-landing frames only (I1, I5)
    F.observe(t, tr.uF[i], noiseVar);
    B.observe(t, tr.uB[i], noiseVar);
    hF = F.headingNow();
    hB = B.headingNow();
  }

  const R = RULES[r.rules?.preset || 'turnuva'] || RULES.turnuva;
  const isFoul = foulNow(hF, hB, R, { coupledScissors: move === 2 })[move];
  return { oldVerdict: r.verdict, expCode: r.explanation?.code, newVerdict: isFoul ? 'FOUL_LATE' : 'VALID', hF: +hF.toFixed(3), hB: +hB.toFixed(3) };
}

function analyzeAndReplay(rounds, label, isLocal) {
  console.log(`\n========================================================`);
  console.log(`  ${label} (${rounds.length} kayıt)`);
  console.log(`========================================================`);
  if (rounds.length === 0) {
    console.log('  Kayıt bulunamadı.');
    return;
  }

  const realRounds = rounds.filter((x) => !(x.payload || x).simulated);
  const target = realRounds.length > 0 ? realRounds : rounds;
  console.log(`  Gerçek Kamera Kayıtları: ${realRounds.length} / Toplam: ${rounds.length}`);

  const byVerdict = {};
  const byMove = { ROCK: 0, PAPER: 0, SCISSORS: 0 };
  const leads = [];
  const fpsList = [];

  let fixedCount = 0;
  const fixedDetails = [];

  for (const raw0 of target) {
    const raw = fromRemoteRow(raw0);
    const r = raw.payload || raw;
    const v = r.explanation?.code || r.verdict || r.kind || 'UNKNOWN';
    byVerdict[v] = (byVerdict[v] || 0) + 1;

    const mv = typeof r.playerMove === 'number' ? MOVE_NAMES[r.playerMove] : r.humanMove;
    if (mv && byMove[mv] !== undefined) byMove[mv] += 1;

    const lead = r.timing?.leadToLandingMs ?? r.leadMs;
    if (Number.isFinite(lead) && lead > 0) leads.push(lead);

    const fps = r.timing?.fpsInFlight ?? r.fps;
    if (Number.isFinite(fps) && fps > 0) fpsList.push(fps);

    const rep = replayTraceWithCurrentEngine(raw);
    if (rep && rep.oldVerdict === 'FOUL_LATE' && rep.newVerdict === 'VALID') {
      fixedCount += 1;
      fixedDetails.push(`Tur #${r.round} (${rep.expCode}): FAUL -> GEÇERLİ (hF=${rep.hF}, hB=${rep.hB})`);
    }
  }

  // an average that was never measured is shown as a dash, not as 0 (I4)
  const avgLead = leads.length ? `+${Math.round(leads.reduce((a, b) => a + b, 0) / leads.length)} ms` : '—';
  const avgFps = fpsList.length ? Math.round(fpsList.reduce((a, b) => a + b, 0) / fpsList.length) : 0;
  console.log(`  Sonuç Dağılımı      :`, JSON.stringify(byVerdict));
  console.log(`  Hamle Dağılımı      :`, JSON.stringify(byMove));
  console.log(`  Ortalama Erkenlik   : ${avgLead} (Ortalama Uçuş FPS: ${avgFps || '—'})`);
  if (isLocal) {
    const ratio = sessionEnslaveRatio();
    if (ratio !== null) console.log(`  Tendon bağlantı oranı (dışa aktarılan oturumun modelinden, kırpılmadan): ${ratio}`);
  } else {
    console.log('  Bulut satırları zaman eksenini taşımaz (izin son on değeri): yeniden oynatılamaz.');
  }
  if (fixedCount > 0) {
    console.log(`  Güncel hakem kuralının yeniden oynatımında faul çıkmayan turlar (${fixedCount}; yaklaşık, bkz. replayTraceWithCurrentEngine):`);
    for (const d of fixedDetails) console.log(`    - ${d}`);
  }
}

/**
 * The coupling ratio of the player of the last exported session, if there is one: computed with the
 * current code from the exported MODEL. (The number stored in the export's profile was computed by the
 * version that exported it; v4.2.0-v4.2.2 never reported less than 0.15.)
 */
function sessionEnslaveRatio() {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(ROOT, '.local_telemetry', 'latest_session.json'), 'utf8'));
    const model = createPlayerModel();
    if (!s?.player?.model || !model.load(s.player.model)) return null;
    const v = model.profile().diagnostics.enslaveRatio;
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * A row of diagnostic_telemetry (snake_case columns, moves as words, no time axis) in the shape of a
 * RoundResult, as far as it goes. Anything else is returned unchanged.
 */
function fromRemoteRow(row) {
  if (!row || typeof row !== 'object' || row.payload || !('player_move' in row || 'round_number' in row)) return row;
  const move = MOVE_NAMES.indexOf(row.player_move);
  return {
    round: row.round_number, verdict: row.verdict, simulated: false,
    playerMove: move >= 0 ? move : null,
    explanation: row.code ? { code: row.code } : null,
    timing: { leadToLandingMs: row.lead_ms, fpsInFlight: row.fps, flightMs: row.flight_ms, trackedInFlight: row.tracked_ratio },
    kinematics: { headingFront: row.h_front, headingBack: row.h_back, vSpreadDeg: row.v_spread_deg },
    trace: null, // trace_uf / trace_ub hold the last ten openings without their times: nothing to replay
  };
}

const localRounds = loadLocalRounds();
analyzeAndReplay(localRounds, 'YEREL TELEMETRİ (.local_telemetry/rounds.jsonl)', true);

const remote = await fetchRemoteDiagnostics(100);
console.log(`\n[Supabase Bulut Durumu]: ${remote.status}`);
if (remote.rows.length > 0) {
  analyzeAndReplay(remote.rows, 'SUPABASE BULUT TELEMETRİSİ (diagnostic_telemetry)', false);
}
