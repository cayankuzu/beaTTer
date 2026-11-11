// @ts-check
/**
 * beaTTer v4 — canvas theme: colours and fonts read from the CSS custom properties (css/tokens.css), so
 * no colour is hard-coded in JavaScript. Read once and cached; `invalidateTheme()` re-reads (font load,
 * colour-scheme change).
 */

const VARS = {
  bg: '--c-bg', surface1: '--c-surface-1', surface2: '--c-surface-2', surface3: '--c-surface-3',
  line1: '--c-line-1', line2: '--c-line-2', line3: '--c-line-3',
  text1: '--c-text-1', text2: '--c-text-2', text3: '--c-text-3',
  player: '--c-player', ai: '--c-ai', aiTint: '--c-ai-tint',
  seal: '--c-seal', sealInk: '--c-seal-ink', sealTint: '--c-seal-tint',
  warn: '--c-warn', warnInk: '--c-warn-ink',
  fontMono: '--font-mono', fontUi: '--font-ui',
};

/** @typedef {{[K in keyof typeof VARS]: string}} Theme */

/** @type {Theme|null} */ let cache = null;

/** Resolve a custom property that may itself be a var() reference. @param {CSSStyleDeclaration} cs @param {string} name */
function read(cs, name) {
  return cs.getPropertyValue(name).trim();
}

/** @returns {Theme} */
export function theme() {
  if (cache) return cache;
  const cs = getComputedStyle(document.documentElement);
  const t = /** @type {any} */ ({});
  for (const [k, v] of Object.entries(VARS)) t[k] = read(cs, v);
  cache = /** @type {Theme} */ (t);
  return cache;
}

export function invalidateTheme() { cache = null; }

/** Canvas font shorthand in CSS px. @param {number} px @param {number} [weight] @param {boolean} [mono] */
export function font(px, weight = 500, mono = true) {
  const t = theme();
  return `${weight} ${px}px ${mono ? t.fontMono : t.fontUi}`;
}

/** rgba() from a #rrggbb token. @param {string} hex @param {number} a */
export function alpha(hex, a) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${a})`;
}
