// @ts-check
/**
 * beaTTer v4 — icon sprite (custom glyphs, inline SVG, built with DOM APIs; no innerHTML, no external files).
 *
 *  g-*  move glyphs (32 grid): the three moves are told apart by shape, never by colour
 *  i-*  UI icons (24 grid), one stroke weight
 *  p-*  series pips: player = circle, AI = diamond, tie = bar, current = ring, upcoming = small ring
 */

import { s } from './dom.js';

/** @typedef {[tag: string, attrs: Record<string, string|number>]} Shape */

const P = (/** @type {string} */ d, /** @type {Record<string, string|number>} */ extra = {}) => /** @type {Shape} */ (['path', { d, 'vector-effect': 'non-scaling-stroke', ...extra }]);

/** @type {Record<string, {vb: string, shapes: Shape[]}>} */
const SYMBOLS = {
  'g-rock': { vb: '0 0 32 32', shapes: [
    P('M7 20v-7.5a2.25 2.25 0 0 1 4.5 0v-1a2.25 2.25 0 0 1 4.5 0v.7a2.25 2.25 0 0 1 4.5 0v1.3a2.25 2.25 0 0 1 4.5 0V20a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8z'),
    P('M11.5 12.5V17M16 12.2V17M20.5 13.5V17M7 19.5h9a2.75 2.75 0 0 1 0 5.5h-2.5', { fill: 'none' }),
  ] },
  'g-paper': { vb: '0 0 32 32', shapes: [
    P('M8.5 21V11a2 2 0 0 1 4 0V7.5a2 2 0 0 1 4 0V6a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v9l2.6-2.6a2 2 0 0 1 2.9 2.8l-4.5 5.3C25 26.5 21.5 29 17.5 29h-1c-4.5 0-8-3.5-8-8z'),
    P('M12.5 11v7.5M16.5 7.5v11M20.5 8v10.5', { fill: 'none' }),
  ] },
  'g-scissors': { vb: '0 0 32 32', shapes: [
    P('M9 22v-4.5L6.4 7.9a2 2 0 0 1 3.86-1.04l2.5 9.2L16.2 5.2a2 2 0 0 1 3.8 1.25L17.2 15.6v.4a2.1 2.1 0 0 1 4.2 0v1a2 2 0 0 1 4 0v5c0 4-3 7-7 7H16c-4 0-7-3-7-7z'),
    P('M21.4 17v3.5M9 21.5h8.2a2.6 2.6 0 0 1 0 5.2h-2.4', { fill: 'none' }),
  ] },
  'g-unknown': { vb: '0 0 32 32', shapes: [
    ['circle', { cx: 16, cy: 16, r: 11, 'vector-effect': 'non-scaling-stroke', 'stroke-dasharray': '3 3' }],
    P('M12.5 13a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.2-1.5 2.3M16 22.4v.1', { fill: 'none' }),
  ] },
  'i-lock': { vb: '0 0 24 24', shapes: [P('M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5M6.5 10.5h11A1.5 1.5 0 0 1 19 12v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5zM12 14.5V17')] },
  'i-seal': { vb: '0 0 24 24', shapes: [P('M21.6 12Q19.82 14.1 20.31 16.8Q17.73 17.73 16.8 20.31Q14.1 19.82 12 21.6Q9.9 19.82 7.2 20.31Q6.27 17.73 3.69 16.8Q4.18 14.1 2.4 12Q4.18 9.9 3.69 7.2Q6.27 6.27 7.2 3.69Q9.9 4.18 12 2.4Q14.1 4.18 16.8 3.69Q17.73 6.27 20.31 7.2Q19.82 9.9 21.6 12ZM8.4 12.2l2.5 2.5 4.7-5')] },
  'i-shield': { vb: '0 0 24 24', shapes: [P('M12 3.2l7 2.6v5.5c0 4.3-2.8 7.6-7 9.5-4.2-1.9-7-5.2-7-9.5V5.8l7-2.6zM9 12.2l2.2 2.2L15.2 10')] },
  'i-shield-off': { vb: '0 0 24 24', shapes: [P('M12 3.2l7 2.6v5.5c0 4.3-2.8 7.6-7 9.5-4.2-1.9-7-5.2-7-9.5V5.8l7-2.6zM4 4l16 16')] },
  'i-flask': { vb: '0 0 24 24', shapes: [P('M9.5 3.5h5M10.5 3.5v5.7l-5 8.6a2 2 0 0 0 1.7 3h9.6a2 2 0 0 0 1.7-3l-5-8.6V3.5M7.7 15.5h8.6')] },
  'i-gear': { vb: '0 0 24 24', shapes: [
    P('M18.65 10.16L21.17 10.47L21.17 13.53L18.65 13.84L18.01 15.4L19.57 17.4L17.4 19.57L15.4 18.01L13.84 18.65L13.53 21.17L10.47 21.17L10.16 18.65L8.6 18.01L6.6 19.57L4.43 17.4L5.99 15.4L5.35 13.84L2.83 13.53L2.83 10.47L5.35 10.16L5.99 8.6L4.43 6.6L6.6 4.43L8.6 5.99L10.16 5.35L10.47 2.83L13.53 2.83L13.84 5.35L15.4 5.99L17.4 4.43L19.57 6.6L18.01 8.6Z'),
    ['circle', { cx: 12, cy: 12, r: 2.8, 'vector-effect': 'non-scaling-stroke' }],
  ] },
  'i-speaker': { vb: '0 0 24 24', shapes: [P('M4 9.6v4.8h3.3l4.7 3.9V5.7L7.3 9.6H4zM15.6 9.2a4 4 0 0 1 0 5.6M18.2 6.8a7.4 7.4 0 0 1 0 10.4')] },
  'i-speaker-off': { vb: '0 0 24 24', shapes: [P('M4 9.6v4.8h3.3l4.7 3.9V5.7L7.3 9.6H4zM15.5 9.5l5 5M20.5 9.5l-5 5')] },
  'i-metronome': { vb: '0 0 24 24', shapes: [P('M9 3.5h6l3.6 17H5.4L9 3.5zM6.3 16h11.4M12 16l4.6-9.2M13.6 9.9l2.3 1.16')] },
  'i-camera': { vb: '0 0 24 24', shapes: [P('M4.5 7h9A1.5 1.5 0 0 1 15 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 3 15.5v-7A1.5 1.5 0 0 1 4.5 7zM15 10.5l6-3v9l-6-3')] },
  'i-camera-off': { vb: '0 0 24 24', shapes: [P('M4.5 7h9A1.5 1.5 0 0 1 15 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 3 15.5v-7A1.5 1.5 0 0 1 4.5 7zM15 10.5l6-3v9l-6-3M3 4l18 17')] },
  'i-check': { vb: '0 0 24 24', shapes: [P('M5 12.5l4.5 4.5L19 7.5')] },
  'i-warning': { vb: '0 0 24 24', shapes: [P('M12 4l9 15.5H3L12 4zM12 10v4.2M12 16.9v.1')] },
  'i-close': { vb: '0 0 24 24', shapes: [P('M6.5 6.5l11 11M17.5 6.5l-11 11')] },
  'i-chevron': { vb: '0 0 24 24', shapes: [P('M9.5 6l6 6-6 6')] },
  'i-export': { vb: '0 0 24 24', shapes: [P('M12 4v10.5M7.8 10.8L12 15l4.2-4.2M5 19.5h14')] },
  'i-reset': { vb: '0 0 24 24', shapes: [P('M5 12a7 7 0 1 0 2.2-5.1M5 4.8v3.9h3.9')] },
  'i-none': { vb: '0 0 24 24', shapes: [['circle', { cx: 12, cy: 12, r: 8.5, 'vector-effect': 'non-scaling-stroke' }], P('M6 6l12 12')] },
  'i-play': { vb: '0 0 24 24', shapes: [P('M8 5.5v13l10.5-6.5L8 5.5z')] },
  'i-next': { vb: '0 0 24 24', shapes: [P('M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5')] },
  'i-rules': { vb: '0 0 24 24', shapes: [P('M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a2.7 2.7 0 0 0 5 0L5 8zM19 8l-2.5 6a2.7 2.7 0 0 0 5 0L19 8z')] },
  'i-disk': { vb: '0 0 24 24', shapes: [P('M5 4.5h11.5L19.5 7.5V19a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5zM8 4.5v5h7v-5M8 19.5v-6h8v6')] },
  'i-cloud': { vb: '0 0 24 24', shapes: [P('M7 18.5a4 4 0 0 1-.6-7.95 5.5 5.5 0 0 1 10.7-1.2A4.6 4.6 0 0 1 17 18.5H7z')] },
  'i-cloud-off': { vb: '0 0 24 24', shapes: [P('M7 18.5a4 4 0 0 1-.6-7.95 5.5 5.5 0 0 1 10.7-1.2A4.6 4.6 0 0 1 17 18.5H7zM4 4l16 17')] },
  'i-plus': { vb: '0 0 24 24', shapes: [P('M12 5v14M5 12h14')] },
  'i-trash': { vb: '0 0 24 24', shapes: [P('M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 10.5v6M14 10.5v6')] },
  'i-user': { vb: '0 0 24 24', shapes: [['circle', { cx: 12, cy: 8.5, r: 3.6, 'vector-effect': 'non-scaling-stroke' }], P('M5 19.5c.8-3.4 3.6-5.2 7-5.2s6.2 1.8 7 5.2')] },
  'p-you': { vb: '0 0 14 14', shapes: [['circle', { class: 'pip__you', cx: 7, cy: 7, r: 5 }]] },
  'p-ai': { vb: '0 0 14 14', shapes: [['rect', { class: 'pip__ai', x: 2.9, y: 2.9, width: 8.2, height: 8.2, transform: 'rotate(45 7 7)' }]] },
  'p-now': { vb: '0 0 14 14', shapes: [['circle', { class: 'pip__now', cx: 7, cy: 7, r: 5.2 }], ['circle', { class: 'pip__nowdot', cx: 7, cy: 7, r: 1.8 }]] },
  'p-todo': { vb: '0 0 14 14', shapes: [['circle', { class: 'pip__todo', cx: 7, cy: 7, r: 3.2 }]] },
  'p-draw': { vb: '0 0 14 14', shapes: [['rect', { class: 'pip__draw', x: 2, y: 5.5, width: 10, height: 3, rx: 1 }]] },
};

const GLYPH_IDS = ['g-rock', 'g-paper', 'g-scissors'];

/** The hidden sprite all icons reference; append once to the document. */
export function buildSprite() {
  const defs = s('defs');
  for (const [id, sym] of Object.entries(SYMBOLS)) {
    defs.appendChild(s('symbol', { id, viewBox: sym.vb }, sym.shapes.map(([tag, attrs]) => s(tag, attrs))));
  }
  return s('svg', { class: 'sprite', width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' }, defs);
}

/**
 * Decorative UI icon. @param {string} name symbol name without the "i-" prefix
 * @param {string} [cls] extra classes ("ic--sm", "ic--lg", ...)
 */
export function icon(name, cls = '') {
  return s('svg', { class: `ic${cls ? ` ${cls}` : ''}`, 'aria-hidden': 'true', focusable: 'false' }, s('use', { href: `#i-${name}` }));
}

/** Symbol id of a move glyph. @param {number|null|undefined} move */
export const glyphId = (move) => (move === 0 || move === 1 || move === 2 ? GLYPH_IDS[move] : 'g-unknown');

/**
 * Move glyph. Decorative unless `label` is given.
 * @param {number|null|undefined} move 0 rock, 1 paper, 2 scissors; anything else = unknown
 * @param {{cls?: string, label?: string}} [o]
 */
export function glyph(move, o = {}) {
  const el = s('svg', { class: `glyph${o.cls ? ` ${o.cls}` : ''}`, focusable: 'false' }, s('use', { href: `#${glyphId(move)}` }));
  if (o.label) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', o.label); } else el.setAttribute('aria-hidden', 'true');
  return el;
}

/** Point an existing icon / glyph / pip at another symbol. @param {Element} svgEl @param {string} id full symbol id */
export function setSymbol(svgEl, id) {
  const use = svgEl.firstElementChild;
  if (use && use.getAttribute('href') !== `#${id}`) use.setAttribute('href', `#${id}`);
}

/** Series pip. @param {'you'|'ai'|'draw'|'now'|'todo'} kind */
export function pip(kind) {
  return s('svg', { class: 'pip', 'aria-hidden': 'true', focusable: 'false' }, s('use', { href: `#p-${kind}` }));
}
