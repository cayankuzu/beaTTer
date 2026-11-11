// @ts-check
/**
 * beaTTer v4 — tiny DOM helpers for the views (no framework, no innerHTML).
 *
 *  - h() / s()         element builders (HTML / SVG)
 *  - setText/setAttr…  write-if-changed setters: the 20 Hz store stream never touches the DOM needlessly
 *  - modal helpers     focusable lookup and focus trap for dialogs
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** @typedef {Node|string|number|null|undefined|false} Child */

/**
 * @param {Element} el
 * @param {Record<string, any>|null|undefined} props
 *   class: string · text: string · on: {event: handler} · data: {k: v} · style: {'--var': value}
 *   every other key is set as an attribute (false/null/undefined = omitted, true = empty attribute)
 */
function applyProps(el, props) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'on') { for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, /** @type {EventListener} */ (fn)); }
    else if (k === 'data') { for (const [dk, dv] of Object.entries(v)) /** @type {HTMLElement} */ (el).dataset[dk] = String(dv); }
    else if (k === 'style') { for (const [sk, sv] of Object.entries(v)) /** @type {HTMLElement} */ (el).style.setProperty(sk, String(sv)); }
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}

/** @param {Element} el @param {Child[]} children */
function append(el, children) {
  for (const c of children.flat(3)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

/**
 * HTML element. @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag @param {Record<string, any>|null} [props] @param {...(Child|Child[])} children
 * @returns {HTMLElementTagNameMap[K]}
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  applyProps(el, props);
  append(el, /** @type {Child[]} */ (children));
  return el;
}

/**
 * SVG element. @param {string} tag @param {Record<string, any>|null} [props] @param {...(Child|Child[])} children
 * @returns {SVGElement}
 */
export function s(tag, props, ...children) {
  const el = /** @type {SVGElement} */ (document.createElementNS(SVG_NS, tag));
  applyProps(el, props);
  append(el, /** @type {Child[]} */ (children));
  return el;
}

/** Remove every child. @param {Element} el */
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

/** Replace the children. @param {Element} el @param {...(Child|Child[])} children */
export function fill(el, ...children) { clear(el); append(el, /** @type {Child[]} */ (children)); textCache.delete(el); }

/** @type {WeakMap<Element, string>} */ const textCache = new WeakMap();
/** @type {WeakMap<Element, Map<string, string|null>>} */ const attrCache = new WeakMap();

/** textContent, only when it changed. @param {Element} el @param {string} value */
export function setText(el, value) {
  if (textCache.get(el) === value) return;
  textCache.set(el, value);
  el.textContent = value;
}

/** @param {Element} el @param {string} key @param {string|null} value @returns {boolean} true when it changed */
function changed(el, key, value) {
  let m = attrCache.get(el);
  if (!m) { m = new Map(); attrCache.set(el, m); }
  if (m.get(key) === value && m.has(key)) return false;
  m.set(key, value);
  return true;
}

/** Attribute (null removes it), only when it changed. @param {Element} el @param {string} name @param {string|number|boolean|null} value */
export function setAttr(el, name, value) {
  const v = value === null || value === false ? null : value === true ? '' : String(value);
  if (!changed(el, `a:${name}`, v)) return;
  if (v === null) el.removeAttribute(name); else el.setAttribute(name, v);
}

/** CSS custom property through the CSSOM (allowed by the strict CSP), only when it changed. @param {Element} el @param {string} name @param {string|number} value */
export function setVar(el, name, value) {
  const v = String(value);
  if (!changed(el, `v:${name}`, v)) return;
  /** @type {HTMLElement} */ (el).style.setProperty(name, v);
}

/** @param {Element} el @param {string} cls @param {boolean} on */
export function toggle(el, cls, on) {
  if (!changed(el, `c:${cls}`, on ? '1' : '0')) return;
  el.classList.toggle(cls, on);
}

/** @param {Element} el @param {boolean} visible */
export function show(el, visible) { setAttr(el, 'hidden', visible ? null : true); }

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Visible, enabled, tabbable descendants. @param {Element} root @returns {HTMLElement[]} */
export function focusables(root) {
  return /** @type {HTMLElement[]} */ ([...root.querySelectorAll(FOCUSABLE)]).filter((el) => !el.closest('[hidden]') && !el.closest('[inert]') && el.getClientRects().length > 0);
}

/** Keep Tab inside `root` (call from a keydown handler). @param {Element} root @param {KeyboardEvent} e */
export function trapTab(root, e) {
  if (e.key !== 'Tab') return;
  const list = focusables(root);
  if (list.length === 0) { e.preventDefault(); return; }
  const first = list[0], last = list[list.length - 1];
  const active = /** @type {HTMLElement|null} */ (document.activeElement);
  if (!active || !root.contains(active)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}

/** True when the event target is a control that owns its own keys (typing, selecting, activating). @param {EventTarget|null} t */
export function isFormControl(t) {
  if (!(t instanceof Element)) return false;
  return !!t.closest('input, select, textarea, [contenteditable="true"]');
}

/** True when Space/Enter on the target would activate something by itself. @param {EventTarget|null} t */
export function isActivatable(t) {
  if (!(t instanceof Element)) return false;
  return !!t.closest('button, a[href], summary, input, select, textarea, [role="tab"], [role="radio"], [role="switch"], [contenteditable="true"]');
}

let uid = 0;
/** Unique id for aria-labelledby wiring. @param {string} prefix */
export function nextId(prefix) { uid += 1; return `${prefix}-${uid}`; }

/**
 * Roving-tabindex keyboard navigation for a tablist / radiogroup.
 * @param {HTMLElement} group @param {string} selector @param {(el: HTMLElement) => void} activate
 */
export function roving(group, selector, activate) {
  group.addEventListener('keydown', (e) => {
    const items = /** @type {HTMLElement[]} */ ([...group.querySelectorAll(selector)]);
    const i = items.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    if (i < 0) return;
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = items.length - 1;
    if (j < 0) return;
    e.preventDefault();
    items[j].focus();
    activate(items[j]);
  });
}
