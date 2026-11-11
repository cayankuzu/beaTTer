// @ts-check
/**
 * beaTTer v4 — dialog chrome shared by the report sheet, the lab and settings drawers and the small
 * modals. A dialog is `role="dialog" aria-modal="true"`, traps Tab, and closes from its close button,
 * a click on the backdrop, or Esc (handled centrally in ui/index.js, which also manages inertness of
 * everything behind the top dialog and returns focus on close).
 */

import { h, trapTab } from '../dom.js';
import { icon } from '../icons.js';
import { T } from '../strings_tr.js';

/**
 * @param {Object} o
 * @param {'sheet'|'drawer'|'modal'} o.kind
 * @param {string} [o.cls] extra classes on the dialog element
 * @param {string} [o.wrapCls] extra classes on the backdrop
 * @param {string} o.labelledby id of the heading
 * @param {() => void} o.onDismiss
 */
export function createDialog({ kind, cls = '', wrapCls = '', labelledby, onDismiss }) {
  const el = h('section', { class: `${kind} ${cls}`.trim(), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': labelledby, tabindex: '-1' });
  const wrap = h('div', { class: `dlg dlg--${kind} ${wrapCls}`.trim(), hidden: true }, el);
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) onDismiss(); });
  el.addEventListener('keydown', (e) => trapTab(el, e));
  return { wrap, el, onDismiss };
}

/**
 * Dialog header: title (+ optional icon and meta line), optional extra node, close button.
 * @param {Object} o
 * @param {string} o.id heading id
 * @param {string} o.title
 * @param {string} [o.iconName]
 * @param {HTMLElement} [o.meta]
 * @param {HTMLElement|null} [o.extra]
 * @param {string} [o.closeLabel]
 * @param {() => void} o.onClose
 * @param {boolean} [o.grip]
 */
export function dialogHead({ id, title, iconName, meta, extra = null, closeLabel = T.close, onClose, grip = false }) {
  const close = h('button', { class: 'iconbtn dhead__close', type: 'button', 'aria-label': closeLabel, title: closeLabel, on: { click: onClose } }, icon('close'));
  const head = h('header', { class: 'dhead' },
    grip ? h('span', { class: 'dhead__grip', 'aria-hidden': 'true' }) : null,
    h('div', { class: 'dhead__main' }, h('h2', { class: 'dhead__title', id }, iconName ? icon(iconName, 'ic--lg') : null, title), meta ?? null),
    extra, close);
  return { head, close };
}

/** The persistent simulation label used inside dialogs. */
export function simChip() {
  return h('span', { class: 'chip chip--sim dhead__sim' }, T.simLabel);
}

/**
 * Accessible switch (role="switch") as a button.
 * @param {{label: string, onToggle: (next: boolean) => void, block?: boolean, describedby?: string}} o
 */
export function createSwitch({ label, onToggle, block = false, describedby }) {
  const state = h('span', { class: 'switch__state', 'aria-hidden': 'true' }, T.off);
  const el = h('button', { class: `switch${block ? ' switch--block' : ''}`, type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-describedby': describedby ?? null },
    h('span', { class: 'switch__track', 'aria-hidden': 'true' }), h('span', { class: 'switch__label' }, label), state);
  let on = false;
  el.addEventListener('click', () => onToggle(!on));
  return {
    el,
    /** @param {boolean} v */
    set(v) { on = !!v; el.setAttribute('aria-checked', on ? 'true' : 'false'); state.textContent = on ? T.on : T.off; },
  };
}

/**
 * Segmented control (role="radiogroup", roving tabindex, arrow keys).
 * @template {string|number} V
 * @param {{label: string, options: {value: V, label: string}[], onChange: (v: V) => void}} o
 */
export function createSegmented({ label, options, onChange }) {
  const buttons = options.map((opt) => h('button', { class: 'seg__opt', type: 'button', role: 'radio', 'aria-checked': 'false', tabindex: '-1' }, icon('check', 'ic--sm'), opt.label));
  const el = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label }, buttons);
  buttons.forEach((b, i) => b.addEventListener('click', () => onChange(options[i].value)));
  el.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
    if (i < 0) return;
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % buttons.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = buttons.length - 1;
    if (j < 0) return;
    e.preventDefault();
    buttons[j].focus();
    onChange(options[j].value);
  });
  return {
    el,
    /** @param {V} v */
    set(v) {
      let any = false;
      buttons.forEach((b, i) => {
        const on = options[i].value === v;
        if (on) any = true;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.setAttribute('tabindex', on ? '0' : '-1');
      });
      if (!any) buttons[0].setAttribute('tabindex', '0');
    },
  };
}
