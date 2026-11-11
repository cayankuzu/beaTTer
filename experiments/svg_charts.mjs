// @ts-check
/**
 * Minimal, dependency-free SVG charts for the experiment figures (line and grouped-bar charts).
 * Colours are the Okabe-Ito colour-universal-design palette; series are also distinguished by marker
 * shape / dash pattern, so the figures do not rely on colour alone.
 */

const PALETTE = ['#0072B2', '#E69F00', '#009E73', '#D55E00', '#CC79A7', '#56B4E9'];
const W = 760, H = 420, M = { l: 70, r: 24, t: 54, b: 64 };
const esc = (/** @type {string} */ s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "Nice" axis ticks. @param {number} lo @param {number} hi @param {number} [count] */
function ticks(lo, hi, count = 5) {
  if (!(hi > lo)) hi = lo + 1;
  const raw = (hi - lo) / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

const frame = (/** @type {string} */ title, /** @type {string} */ body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="13">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="${M.l}" y="28" font-size="15" font-weight="600" fill="#111827">${esc(title)}</text>
${body}
</svg>
`;

/** @param {{name:string}[]} series */
const legend = (series) => series.map((s, i) => `<g transform="translate(${M.l + i * 170}, ${H - 16})"><rect width="14" height="4" y="-6" fill="${PALETTE[i % PALETTE.length]}"/><text x="20" fill="#374151">${esc(s.name)}</text></g>`).join('');

/**
 * @param {{title:string, xLabel:string, yLabel:string, yMax?:number, series:{name:string, points:number[][], dashed?:boolean}[]}} o
 */
export function lineChart({ title, xLabel, yLabel, yMax, series }) {
  const xs = series.flatMap((s) => s.points.map((p) => p[0])), ys = series.flatMap((s) => s.points.map((p) => p[1]));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = 0, y1 = yMax ?? Math.max(1e-9, ...ys) * 1.12;
  const px = (/** @type {number} */ x) => M.l + ((x - x0) / (x1 - x0 || 1)) * (W - M.l - M.r);
  const py = (/** @type {number} */ y) => H - M.b - ((y - y0) / (y1 - y0 || 1)) * (H - M.t - M.b);
  let body = '';
  for (const t of ticks(y0, y1)) body += `<line x1="${M.l}" x2="${W - M.r}" y1="${py(t)}" y2="${py(t)}" stroke="#e5e7eb"/><text x="${M.l - 8}" y="${py(t) + 4}" text-anchor="end" fill="#4b5563">${t}</text>`;
  for (const t of ticks(x0, x1, 6)) body += `<text x="${px(t)}" y="${H - M.b + 18}" text-anchor="middle" fill="#4b5563">${t}</text>`;
  body += `<line x1="${M.l}" x2="${W - M.r}" y1="${py(0)}" y2="${py(0)}" stroke="#6b7280"/><line x1="${M.l}" x2="${M.l}" y1="${M.t}" y2="${H - M.b}" stroke="#6b7280"/>`;
  body += `<text x="${(M.l + W - M.r) / 2}" y="${H - M.b + 40}" text-anchor="middle" fill="#111827">${esc(xLabel)}</text>`;
  body += `<text transform="translate(18, ${(M.t + H - M.b) / 2}) rotate(-90)" text-anchor="middle" fill="#111827">${esc(yLabel)}</text>`;
  series.forEach((s, i) => {
    const col = PALETTE[i % PALETTE.length];
    const d = s.points.map((p, k) => `${k ? 'L' : 'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ');
    body += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.5"${s.dashed ? ' stroke-dasharray="6 5"' : ''}/>`;
    if (!s.dashed) for (const p of s.points) body += i % 2 ? `<rect x="${px(p[0]) - 4}" y="${py(p[1]) - 4}" width="8" height="8" fill="${col}"/>` : `<circle cx="${px(p[0])}" cy="${py(p[1])}" r="4.5" fill="${col}"/>`;
  });
  return frame(title, body + legend(series));
}

/**
 * @param {{title:string, yLabel:string, categories:string[], series:{name:string, values:number[]}[]}} o
 */
export function barChart({ title, yLabel, categories, series }) {
  const all = series.flatMap((s) => s.values);
  const y0 = Math.min(0, ...all) * 1.15, y1 = Math.max(1e-9, ...all) * 1.15;
  const py = (/** @type {number} */ y) => H - M.b - ((y - y0) / (y1 - y0 || 1)) * (H - M.t - M.b);
  const band = (W - M.l - M.r) / categories.length, bw = (band * 0.72) / series.length;
  let body = '';
  for (const t of ticks(y0, y1)) body += `<line x1="${M.l}" x2="${W - M.r}" y1="${py(t)}" y2="${py(t)}" stroke="#e5e7eb"/><text x="${M.l - 8}" y="${py(t) + 4}" text-anchor="end" fill="#4b5563">${t}</text>`;
  body += `<line x1="${M.l}" x2="${W - M.r}" y1="${py(0)}" y2="${py(0)}" stroke="#6b7280"/>`;
  body += `<text transform="translate(18, ${(M.t + H - M.b) / 2}) rotate(-90)" text-anchor="middle" fill="#111827">${esc(yLabel)}</text>`;
  categories.forEach((c, k) => {
    const x = M.l + k * band + band * 0.14;
    series.forEach((s, i) => {
      const v = s.values[k] ?? 0, top = py(Math.max(0, v)), h = Math.abs(py(v) - py(0));
      body += `<rect x="${(x + i * bw).toFixed(1)}" y="${top.toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${Math.max(0.5, h).toFixed(1)}" fill="${PALETTE[i % PALETTE.length]}"/>`;
      body += `<text x="${(x + i * bw + bw / 2 - 1).toFixed(1)}" y="${(v >= 0 ? top - 4 : py(v) + 13).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="#374151">${Number.isInteger(v) ? v : v.toFixed(Math.abs(v) < 1 ? 3 : 1)}</text>`;
    });
    const label = c.length > 14 ? `${c.slice(0, 13)}…` : c;
    body += `<text x="${(M.l + k * band + band / 2).toFixed(1)}" y="${H - M.b + 18}" text-anchor="middle" fill="#4b5563" font-size="12">${esc(label)}</text>`;
  });
  return frame(title, body + legend(series));
}
