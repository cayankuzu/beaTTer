// @ts-check
/**
 * beaTTer v4 — small hand-built SVG charts for the laboratory. Each returns an <svg role="img"> whose
 * aria-label (passed in by the view) summarises the numbers; colours come from css/charts.css.
 * Only measured values are plotted: empty bins stay empty, missing intervals are not drawn.
 */

import { s } from '../dom.js';

const f1 = (/** @type {number} */ v) => +v.toFixed(1);
/** @param {string} str @param {number} x @param {number} y @param {Record<string, any>} [a] */
const text = (str, x, y, a = {}) => s('text', { x: f1(x), y: f1(y), ...a }, str);

/**
 * Interval bar on a 0..100 % axis: point estimate, Wilson interval, chance reference.
 * @param {{p:number|null, lo:number|null, hi:number|null, ref?:number, refLabel?:string, label:string, you?:boolean}} o
 */
export function intervalBar(o) {
  const X = (/** @type {number} */ p) => 12 + 256 * p;
  const el = s('svg', { class: 'chart', viewBox: '0 0 280 58', role: 'img', 'aria-label': o.label });
  el.append(s('path', { class: 'ch-axis', d: 'M12 36H268M12 36v4M76 36v4M140 36v4M204 36v4M268 36v4' }));
  if (o.ref !== undefined) {
    el.append(s('path', { class: 'ch-ref', d: `M${f1(X(o.ref))} 8v28` }));
    if (o.refLabel) el.append(text(o.refLabel, X(o.ref) + 5, 16));
  }
  if (o.p !== null && o.lo !== null && o.hi !== null) {
    el.append(s('path', { class: `ch-ci${o.you ? ' ch-ci--you' : ''}`, d: `M${f1(X(o.lo))} 24H${f1(X(o.hi))}` }));
    el.append(s('circle', { class: `ch-dot${o.you ? ' ch-dot--you' : ''}`, cx: f1(X(o.p)), cy: 24, r: 5 }));
  }
  el.append(text('%0', 12, 54), text('%50', 140, 54, { 'text-anchor': 'middle' }), text('%100', 268, 54, { 'text-anchor': 'end' }));
  return el;
}

/**
 * Histogram of lead times: 20 ms bins from 0 to 300 ms plus one overflow bin ("300+").
 * @param {{values:number[], median:number|null, label:string, axisLabel:string, countLabel:string, medianLabel:string}} o
 */
export function leadHistogram(o) {
  const BIN = 20, N = 15;
  const bins = new Array(N).fill(0);
  let over = 0, under = 0;
  for (const v of o.values) {
    if (!Number.isFinite(v)) continue;
    if (v < 0) under += 1; else if (v >= BIN * N) over += 1; else bins[Math.floor(v / BIN)] += 1;
  }
  bins[0] += under; // decisions at or after the landing are counted in the first bin (0 ms lead)
  const max = Math.max(1, over, ...bins);
  const top = max <= 4 ? 4 : Math.ceil(max / 5) * 5;
  const x0 = 34, x1 = 244, y0 = 100, yTop = 20;
  const bw = (x1 - x0) / N;
  const Y = (/** @type {number} */ c) => y0 - (c / top) * (y0 - yTop);
  const el = s('svg', { class: 'chart', viewBox: '0 0 280 134', role: 'img', 'aria-label': o.label });
  el.append(s('path', { class: 'ch-grid', d: `M${x0} ${f1(Y(top / 2))}H268M${x0} ${f1(Y(top))}H268` }));
  el.append(s('path', { class: 'ch-axis', d: `M${x0} ${y0}H${x1 + 1}M251 ${y0}H268M${x0} ${y0}v4M${f1(x0 + 5 * bw)} ${y0}v4M${f1(x0 + 10 * bw)} ${y0}v4M${x1} ${y0}v4` }));
  const g = s('g', { class: 'ch-bar' });
  bins.forEach((c, i) => { if (c > 0) g.append(s('rect', { x: f1(x0 + i * bw + 1), y: f1(Y(c)), width: f1(bw - 2), height: f1(y0 - Y(c)) })); });
  el.append(g);
  if (over > 0) el.append(s('rect', { class: 'ch-bar--over', x: 253.5, y: f1(Y(over)), width: 11, height: f1(y0 - Y(over)) }));
  if (o.median !== null && Number.isFinite(o.median)) {
    const mx = x0 + (Math.min(BIN * N, Math.max(0, o.median)) / BIN) * bw;
    el.append(s('path', { class: 'ch-ref', d: `M${f1(mx)} 6v94` }));
    const right = mx < 150;
    el.append(text(o.medianLabel, right ? mx + 5 : mx - 5, 14, { class: 'ch-strong', 'text-anchor': right ? 'start' : 'end' }));
  }
  el.append(text('0', 28, 104, { 'text-anchor': 'end' }), text(String(top / 2), 28, Y(top / 2) + 4, { 'text-anchor': 'end' }), text(String(top), 28, Y(top) + 4, { 'text-anchor': 'end' }));
  el.append(text(o.countLabel, 4, 12));
  el.append(text('0', x0, 118, { 'text-anchor': 'middle' }), text('100', x0 + 5 * bw, 118, { 'text-anchor': 'middle' }), text('200', x0 + 10 * bw, 118, { 'text-anchor': 'middle' }), text('300+', 259, 118, { 'text-anchor': 'middle' }));
  el.append(text(o.axisLabel, 139, 132, { 'text-anchor': 'middle' }));
  return el;
}

/**
 * Sparkline of one value per round (oldest left).
 * @param {{values:number[], label:string, unit:string}} o
 */
export function sparkline(o) {
  const vals = o.values.filter((v) => Number.isFinite(v));
  const el = s('svg', { class: 'chart', viewBox: '0 0 280 54', role: 'img', 'aria-label': o.label });
  if (vals.length === 0) return el;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const x0 = 40, x1 = 240, yT = 8, yB = 40;
  const X = (/** @type {number} */ i) => (vals.length === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (vals.length - 1));
  const Y = (/** @type {number} */ v) => (hi === lo ? (yT + yB) / 2 : yB - ((v - lo) / (hi - lo)) * (yB - yT));
  el.append(s('path', { class: 'ch-grid', d: `M${x0} ${yT}H${x1}M${x0} ${yB}H${x1}` }));
  if (vals.length > 1) el.append(s('path', { class: 'ch-line', d: vals.map((v, i) => `${i ? 'L' : 'M'}${f1(X(i))} ${f1(Y(v))}`).join('') }));
  const last = vals[vals.length - 1];
  el.append(s('circle', { class: 'ch-dot', cx: f1(X(vals.length - 1)), cy: f1(Y(last)), r: 3.5 }));
  el.append(text(String(Math.round(last)), X(vals.length - 1) + 7, Y(last) + 4, { class: 'ch-strong' }));
  el.append(text(String(Math.round(hi)), x0 - 6, yT + 4, { 'text-anchor': 'end' }));
  if (hi !== lo) el.append(text(String(Math.round(lo)), x0 - 6, yB + 4, { 'text-anchor': 'end' }));
  el.append(text('1', x0, 53), text(`${vals.length} · ${o.unit}`, x1, 53, { 'text-anchor': 'end' }));
  return el;
}

/**
 * Reliability diagram: mean confidence against observed accuracy per bin; dot area follows the bin count.
 * @param {{bins:{n:number, confidence:number|null, accuracy:number|null}[], label:string, xLabel:string, yLabel:string}} o
 */
export function reliability(o) {
  const x0 = 44, x1 = 172, y0 = 140, y1 = 12;
  const X = (/** @type {number} */ p) => x0 + (x1 - x0) * p, Y = (/** @type {number} */ p) => y0 - (y0 - y1) * p;
  const el = s('svg', { class: 'chart chart--sq', viewBox: '0 0 184 172', role: 'img', 'aria-label': o.label });
  el.append(s('path', { class: 'ch-grid', d: `M${X(0.5)} ${y1}v${y0 - y1}M${x0} ${Y(0.5)}h${x1 - x0}` }));
  el.append(s('path', { class: 'ch-axis', d: `M${x0} ${y1}v${y0 - y1}h${x1 - x0}` }));
  el.append(s('path', { class: 'ch-ref', d: `M${x0} ${y0}L${x1} ${y1}` }));
  const nMax = Math.max(1, ...o.bins.map((b) => b.n));
  for (const b of o.bins) {
    if (!b.n || b.confidence === null || b.accuracy === null) continue;
    el.append(s('circle', { class: 'ch-dot', cx: f1(X(b.confidence)), cy: f1(Y(b.accuracy)), r: f1(2.2 + 6 * Math.sqrt(b.n / nMax)) }));
  }
  el.append(text('0', 38, 144, { 'text-anchor': 'end' }), text('50', 38, Y(0.5) + 4, { 'text-anchor': 'end' }), text('100', 38, 16, { 'text-anchor': 'end' }));
  el.append(text('0', x0, 155, { 'text-anchor': 'middle' }), text('50', X(0.5), 155, { 'text-anchor': 'middle' }), text('100', x1, 155, { 'text-anchor': 'end' }));
  el.append(text(o.xLabel, X(0.5), 170, { 'text-anchor': 'middle' }));
  el.append(text(o.yLabel, 12, Y(0.5), { 'text-anchor': 'middle', transform: `rotate(-90 12 ${Y(0.5)})` }));
  return el;
}
