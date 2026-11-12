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
import { createPlayerModel } from '../web/js/core/player_model.js';
import { createOpeningDetector } from '../web/js/core/opening.js';
import { foulNow } from '../web/js/core/decision.js';
import { RULES } from '../web/js/core/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOCAL_JSONL = path.join(ROOT, '.local_telemetry', 'rounds.jsonl');
const REMOTE_CACHE_JSONL = path.join(ROOT, '.local_telemetry', 'remote_diagnostics.jsonl');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://znfvjfafkcahpkkcbdjc.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZnZqZmFma2NhaHBra2NiZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyOTQ2MDcsImV4cCI6MjEwODg3MDYwN30.ICVlzOkYFgl0qdxNKk7CWnCLdgVWuUHSRI3DK73ozoo';
const MOVE_NAMES = ['ROCK', 'PAPER', 'SCISSORS'];

async function fetchRemoteDiagnostics(limit = 100) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/beatter_pull_recent_diagnostics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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

function replayTraceWithCurrentEngine(raw, simPlayer) {
  const r = raw.payload || raw;
  const tr = r.trace;
  if (!tr || !Array.isArray(tr.t) || tr.t.length < 3) return null;

  const F = createOpeningDetector({ legalProgress: 0.105, stayVar: 0.0032 });
  const B = createOpeningDetector({ legalProgress: 0.135, stayVar: 0.0042, closedMin: 0.2, reanchorFrames: 1 });
  const noiseVar = (r.kinematics?.noiseSd ?? 0.04) ** 2;

  const tLand = r.timing?.tLanding ?? tr.t[tr.t.length - 1];
  const vSp = r.kinematics?.vSpreadDeg ?? 0;
  let hF = 0;
  let hB = 0;
  let lastF = 0;
  let lastB = 0;

  for (let i = 0; i < tr.t.length; i++) {
    const t = tr.t[i];
    if (t >= tLand - 1e-6) break; // pre-landing frames only (I1, I5)
    const uF = tr.uF[i];
    const uB = tr.uB[i];
    lastF = uF;
    lastB = uB;
    const enslaveGain = Math.max(0.28, Math.min(0.6, (simPlayer.enslaveRatio ?? 0.15) + 0.24));
    const isScissorPose =
      uF >= 0.45 && (uF - uB >= 0.18 || (vSp >= 18 && uB <= 0.62)) && uB <= 0.62;
    const enslave = isScissorPose ? Math.min(uB, enslaveGain * uF + (vSp >= 18 ? 0.16 : 0)) : 0;
    const uBObs = uB - enslave;
    F.observe(t, uF, noiseVar);
    B.observe(t, uBObs, noiseVar);
    hF = F.headingNow();
    hB = B.headingNow();
  }

  const move = r.playerMove;
  if (move === 2) {
    simPlayer.learnPosture([0, lastF, lastF, lastB, lastB], 2);
  }

  const R = RULES[r.rules?.preset || 'turnuva'] || RULES.turnuva;
  const isFoul = typeof move === 'number' ? foulNow(hF, hB, R)[move] : false;
  const newVerdict = isFoul ? 'FOUL_LATE' : 'VALID';

  return { oldVerdict: r.verdict, expCode: r.explanation?.code, newVerdict, hF: +hF.toFixed(3), hB: +hB.toFixed(3) };
}

function analyzeAndReplay(rounds, label) {
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

  const simPlayer = createPlayerModel();
  let fixedCount = 0;
  const fixedDetails = [];

  for (const raw of target) {
    const r = raw.payload || raw;
    const v = r.explanation?.code || r.verdict || r.kind || 'UNKNOWN';
    byVerdict[v] = (byVerdict[v] || 0) + 1;

    const mv = typeof r.playerMove === 'number' ? MOVE_NAMES[r.playerMove] : r.humanMove;
    if (mv && byMove[mv] !== undefined) byMove[mv] += 1;

    const lead = r.timing?.leadToLandingMs ?? r.leadMs;
    if (Number.isFinite(lead) && lead > 0) leads.push(lead);

    const fps = r.timing?.fpsInFlight ?? r.fps;
    if (Number.isFinite(fps) && fps > 0) fpsList.push(fps);

    const rep = replayTraceWithCurrentEngine(raw, simPlayer);
    if (rep && rep.oldVerdict === 'FOUL_LATE' && rep.newVerdict === 'VALID') {
      fixedCount += 1;
      fixedDetails.push(`Tur #${r.round} (${rep.expCode}): FAUL -> GEÇERLİ (hF=${rep.hF}, hB=${rep.hB})`);
    }
  }

  const avgLead = leads.length ? Math.round(leads.reduce((a, b) => a + b, 0) / leads.length) : 0;
  const avgFps = fpsList.length ? Math.round(fpsList.reduce((a, b) => a + b, 0) / fpsList.length) : 0;
  const prof = simPlayer.profile();

  console.log(`  Sonuç Dağılımı      :`, JSON.stringify(byVerdict));
  console.log(`  Hamle Dağılımı      :`, JSON.stringify(byMove));
  console.log(`  Ortalama Erkenlik   : +${avgLead} ms (Ortalama Uçuş FPS: ${avgFps || '—'})`);
  console.log(
    `  Biyomekanik Profil  : Tendon Bağlantı Oranı (enslaveRatio)=${prof.diagnostics?.enslaveRatio}`
  );
  if (fixedCount > 0) {
    console.log(`  ★ Güncel Motor İyileştirmesi (${fixedCount} hatalı faul çözüldü):`);
    for (const d of fixedDetails) console.log(`    - ${d}`);
  }
}

const localRounds = loadLocalRounds();
analyzeAndReplay(localRounds, 'YEREL TELEMETRİ (.local_telemetry/rounds.jsonl)');

const remote = await fetchRemoteDiagnostics(100);
console.log(`\n[Supabase Bulut Durumu]: ${remote.status}`);
if (remote.rows.length > 0) {
  analyzeAndReplay(remote.rows, 'SUPABASE BULUT TELEMETRİSİ (diagnostic_telemetry)');
}
