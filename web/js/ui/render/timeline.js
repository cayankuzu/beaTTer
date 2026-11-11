// @ts-check
/**
 * beaTTer v4 — timeline drawings (pure): the live strip in the console and the annotated round timeline
 * in the report. Both draw only what is in the data they are given; nothing is interpolated beyond
 * joining consecutive samples.
 */

import { alpha, font } from './theme.js';

const AXIS_H = 14;

/** @param {number[]} a */
function range(a) {
  let lo = Infinity, hi = -Infinity;
  for (const v of a) { if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }
  return lo <= hi ? { lo, hi } : null;
}

/**
 * @param {CanvasRenderingContext2D} ctx @param {number[]} ts @param {number[]} vs
 * @param {(t:number)=>number} X @param {(v:number)=>number} Y
 */
function polyline(ctx, ts, vs, X, Y) {
  ctx.beginPath();
  let pen = false;
  const n = Math.min(ts.length, vs.length);
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(vs[i]) || !Number.isFinite(ts[i])) { pen = false; continue; }
    if (pen) ctx.lineTo(X(ts[i]), Y(vs[i])); else { ctx.moveTo(X(ts[i]), Y(vs[i])); pen = true; }
  }
  ctx.stroke();
}

/**
 * Live strip. Time runs left to right from the first beat (or the first sample) of the round.
 * @param {CanvasRenderingContext2D} ctx context in CSS pixels
 * @param {number} w @param {number} h
 * @param {any} live state.live (see app/store.js emptyLive)
 * @param {import('./theme.js').Theme} t
 * @param {{labels: {landing: string, landingHat: string}, glow: boolean}} o
 * @returns {boolean} false when there was nothing to draw
 */
export function drawLiveStrip(ctx, w, h, live, t, o) {
  const ts = live.t;
  const first = live.t0 ?? (ts.length ? ts[0] : null);
  if (first === null || (ts.length === 0 && live.beats.length === 0)) return false;
  const t0 = Math.min(first, ts.length ? ts[0] : first, live.beats.length ? live.beats[0].t : first) - 60;
  const now = live.now ?? (ts.length ? ts[ts.length - 1] : first);
  const landMark = live.landingT ?? live.tLandHat;
  const t1 = Math.max(t0 + 2200, now + 150, (landMark ?? now) + 220);
  const plotH = h - AXIS_H;
  const X = (/** @type {number} */ tt) => ((tt - t0) / (t1 - t0)) * w;

  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // graticule: 100 ms (500 ms when the strip is too dense)
  const pxPer100 = (100 / (t1 - t0)) * w;
  const step = pxPer100 >= 7 ? 100 : 500;
  ctx.strokeStyle = t.line1; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let g = Math.ceil(t0 / step) * step; g < t1; g += step) { const x = Math.round(X(g)) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, plotH); }
  ctx.stroke();
  ctx.strokeStyle = t.line2;
  ctx.beginPath(); ctx.moveTo(0, plotH + 0.5); ctx.lineTo(w, plotH + 0.5); ctx.stroke();

  // beats: dotted line + number on the axis
  ctx.font = font(12, 500); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  for (const b of live.beats) {
    const x = Math.round(X(b.t)) + 0.5;
    ctx.strokeStyle = t.line3; ctx.setLineDash([1, 3]);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = t.text2;
    ctx.fillText(String(b.n), Math.min(w - 6, Math.max(6, x)), plotH + AXIS_H / 2 + 1);
  }

  // palm height (top band): image y grows downwards, so a lower hand plots lower
  const cyR = range(live.cy);
  if (cyR && ts.length > 1) {
    const span = Math.max(cyR.hi - cyR.lo, 1e-6);
    const Yc = (/** @type {number} */ v) => plotH * (0.1 + 0.3 * ((v - cyR.lo) / span));
    ctx.strokeStyle = t.text2; ctx.lineWidth = 1.25;
    polyline(ctx, ts, live.cy, X, Yc);
  }
  // opening of the back and front finger groups (bottom band): 0 = fist baseline, 1 = fully open
  const Yu = (/** @type {number} */ u) => plotH * (0.92 - 0.44 * Math.min(1.15, Math.max(-0.1, u)));
  if (ts.length > 1) {
    ctx.strokeStyle = t.player; ctx.lineWidth = 1.25; ctx.setLineDash([5, 4]);
    polyline(ctx, ts, live.uB, X, Yu);
    ctx.setLineDash([]);
    ctx.lineWidth = 1.75;
    if (o.glow) { ctx.shadowColor = t.player; ctx.shadowBlur = 6; }
    polyline(ctx, ts, live.uF, X, Yu);
    ctx.shadowBlur = 0;
  }

  // seals: line, flag triangle, "#seq"
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  let lastLabelX = -Infinity;
  for (const c of live.commits) {
    const x = Math.round(X(c.t)) + 0.5;
    ctx.strokeStyle = t.sealInk; ctx.fillStyle = t.sealInk; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 4, 0); ctx.lineTo(x + 4, 0); ctx.lineTo(x, 6); ctx.closePath(); ctx.fill();
    if (w >= 300 && x - lastLabelX > 34) {
      const label = `#${c.seq}`;
      const tw = ctx.measureText(label).width;
      const lx = x - 5 < tw + 2 ? x + 5 + tw : x - 5;
      ctx.fillStyle = t.bg; ctx.fillRect(lx - tw - 2, 8, tw + 4, 13);
      ctx.fillStyle = t.sealInk; ctx.fillText(label, lx, 9);
      lastLabelX = x;
    }
  }

  // landing: measured (solid) or predicted (dashed)
  if (landMark !== null && landMark !== undefined) {
    const real = live.landingT !== null && live.landingT !== undefined;
    const x = Math.round(X(landMark)) + (real ? 0 : 0.5);
    ctx.strokeStyle = t.text1; ctx.lineWidth = real ? 2 : 1;
    if (!real) ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
    ctx.setLineDash([]);
    // label in the axis band, under its line: the plot itself stays free for the curves and the seal flags.
    // It never runs into the last beat number; when there is no room it is left out.
    if (w >= 240) {
      const label = real ? o.labels.landing : o.labels.landingHat;
      const tw = ctx.measureText(label).width;
      const after = live.beats.length ? X(live.beats[live.beats.length - 1].t) + 10 : 2;
      const lx = Math.min(w - tw - 3, Math.max(x - tw / 2, after));
      if (lx >= after) {
        ctx.fillStyle = t.text1; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(label, lx, plotH + AXIS_H / 2 + 1);
      }
    }
  }

  // now
  if (live.landingT === null || live.landingT === undefined) {
    const x = Math.round(X(now)) + 0.5;
    ctx.strokeStyle = t.text1; ctx.fillStyle = t.text1; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, 3, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  return true;
}

/**
 * Annotated timeline of one judged round; the x axis is time relative to the landing (ms).
 * @param {CanvasRenderingContext2D} ctx context in CSS pixels
 * @param {number} w @param {number} h
 * @param {any} result RoundResult
 * @param {import('./theme.js').Theme} t
 * @param {{labels: {landing: string, done: string}}} o
 */
export function drawRoundTimeline(ctx, w, h, result, t, o) {
  const tr = result.trace, L = result.timing.tLanding;
  if (!tr || !Array.isArray(tr.t) || !Number.isFinite(L)) return;
  const rel = tr.t.map((/** @type {number} */ v) => v - L);
  const commits = result.commits.map((/** @type {any} */ c) => ({ seq: c.seq, x: c.t - L, judged: c.seq === result.judgedSeq, late: !!c.postLanding, ok: !!c.verified }));
  const done = Number.isFinite(result.timing.tComplete) ? result.timing.tComplete - L : null;
  let lo = rel.length ? rel[0] : -400, hi = rel.length ? rel[rel.length - 1] : 100;
  for (const c of commits) { lo = Math.min(lo, c.x); hi = Math.max(hi, c.x); }
  if (done !== null) { lo = Math.min(lo, done); hi = Math.max(hi, done); }
  lo = Math.min(lo, -120) - 30; hi = Math.max(hi, 60) + 20;

  const padL = 40, padR = 10, flagsH = 34, axisH = 20;
  const pw = w - padL - padR, ph = h - flagsH - axisH;
  const py0 = flagsH;
  const X = (/** @type {number} */ ms) => padL + ((ms - lo) / (hi - lo)) * pw;
  const Yu = (/** @type {number} */ u) => py0 + ph * (0.9 - 0.78 * Math.min(1.12, Math.max(-0.1, u)));

  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.font = font(12, 500);

  // frame, 0 % and 100 % rules
  ctx.strokeStyle = t.line1; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const u of [0, 1]) { const y = Math.round(Yu(u)) + 0.5; ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); }
  ctx.stroke();
  ctx.fillStyle = t.text2; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText('%100', padL - 5, Yu(1)); ctx.fillText('%0', padL - 5, Yu(0));

  // time axis: ticks every 100 / 200 / 500 ms
  const span = hi - lo;
  const pxPerMs = pw / span;
  const step = 100 * pxPerMs >= 54 ? 100 : 200 * pxPerMs >= 54 ? 200 : 500;
  ctx.strokeStyle = t.line3; ctx.beginPath();
  ctx.moveTo(padL, py0 + ph + 0.5); ctx.lineTo(w - padR, py0 + ph + 0.5);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let g = Math.ceil(lo / step) * step; g <= hi; g += step) {
    const x = Math.round(X(g)) + 0.5;
    ctx.moveTo(x, py0 + ph); ctx.lineTo(x, py0 + ph + 4);
    const label = g === 0 ? '0 ms' : g < 0 ? `−${-g}` : `+${g}`;
    ctx.fillStyle = g === 0 ? t.text1 : t.text2;
    ctx.fillText(label, Math.min(w - padR - 14, Math.max(padL + 12, x)), py0 + ph + 6);
  }
  ctx.stroke();

  ctx.save();
  ctx.beginPath(); ctx.rect(padL, py0, pw, ph); ctx.clip();

  // palm height: thin grey, scaled into the upper third (shape only, no unit)
  const cyR = range(tr.cy);
  if (cyR) {
    const s = Math.max(cyR.hi - cyR.lo, 1e-6);
    ctx.strokeStyle = alpha(t.text2, 0.7); ctx.lineWidth = 1;
    polyline(ctx, rel, tr.cy, X, (v) => py0 + ph * (0.06 + 0.26 * ((v - cyR.lo) / s)));
  }
  // the AI's reading: probability that each group is opening (thin orange)
  ctx.strokeStyle = t.ai; ctx.lineWidth = 1;
  polyline(ctx, rel, tr.hF, X, Yu);
  ctx.setLineDash([2, 3]); polyline(ctx, rel, tr.hB, X, Yu); ctx.setLineDash([]);
  // measured opening: back (dashed) and front (solid)
  ctx.strokeStyle = t.player; ctx.lineWidth = 1.25; ctx.setLineDash([5, 4]);
  polyline(ctx, rel, tr.uB, X, Yu);
  ctx.setLineDash([]); ctx.lineWidth = 2;
  polyline(ctx, rel, tr.uF, X, Yu);
  ctx.restore();

  // landing
  const xl = Math.round(X(0));
  ctx.strokeStyle = t.text1; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(xl, py0 - 6); ctx.lineTo(xl, py0 + ph); ctx.stroke();
  ctx.fillStyle = t.text1; ctx.font = font(12, 700); ctx.textBaseline = 'alphabetic';
  if (xl + 6 + ctx.measureText(o.labels.landing).width < w - padR) { ctx.textAlign = 'left'; ctx.fillText(o.labels.landing, xl + 6, py0 - 8); }
  else { ctx.textAlign = 'right'; ctx.fillText(o.labels.landing, xl - 6, py0 - 8); }

  // seals: line + numbered flag; the judged one is brighter and carries the lead dimension
  ctx.font = font(12, 700);
  let row = 0, lastX = -Infinity;
  for (const c of commits) {
    const x = Math.round(X(c.x)) + 0.5;
    const col = !c.ok ? t.warnInk : c.judged ? t.sealInk : t.seal;
    ctx.strokeStyle = col; ctx.lineWidth = c.judged ? 1.5 : 1;
    if (c.late) ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, py0 - 2); ctx.lineTo(x, py0 + ph); ctx.stroke();
    ctx.setLineDash([]);
    const label = `#${c.seq}`;
    const tw = ctx.measureText(label).width + 8;
    row = x - lastX < tw + 2 ? (row + 1) % 2 : 0;
    lastX = x;
    const fx = Math.min(w - padR - tw, Math.max(padL, x - (x - tw < padL ? 0 : tw)));
    const fy = 2 + row * 16;
    ctx.fillStyle = col; ctx.fillRect(fx, fy, tw, 15);
    ctx.fillStyle = t.bg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, fx + 4, fy + 8);
  }
  const judged = commits.find((/** @type {any} */ c) => c.judged);
  if (judged && Math.abs(judged.x) > 1 && !judged.late) {
    const xa = X(judged.x), y = py0 + ph * 0.955;
    ctx.strokeStyle = t.sealInk; ctx.fillStyle = t.sealInk; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xl, y); ctx.stroke();
    for (const [x, d] of /** @type {[number, number][]} */ ([[xa, 1], [xl, -1]])) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * 6, y - 3.5); ctx.lineTo(x + d * 6, y + 3.5); ctx.closePath(); ctx.fill();
    }
    const label = `${Math.round(Math.abs(judged.x))} ms`;
    const tw = ctx.measureText(label).width;
    if (Math.abs(xl - xa) > tw + 18) {
      ctx.fillStyle = t.bg; ctx.fillRect((xa + xl) / 2 - tw / 2 - 3, y - 8, tw + 6, 15);
      ctx.fillStyle = t.sealInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, (xa + xl) / 2, y);
    }
  }

  // shape complete: diamond on the 100 % rule with a stem
  if (done !== null) {
    const x = X(done), y = Yu(1);
    ctx.strokeStyle = t.player; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, py0); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = t.player; ctx.strokeStyle = t.bg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 5.5); ctx.lineTo(x + 5.5, y); ctx.lineTo(x, y + 5.5); ctx.lineTo(x - 5.5, y); ctx.closePath();
    ctx.stroke(); ctx.fill();
  }
  ctx.restore();
}
