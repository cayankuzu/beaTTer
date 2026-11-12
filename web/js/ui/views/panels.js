// @ts-check
/**
 * beaTTer v4 — the small dialogs: onboarding, rules explainer, series summary; and the toast.
 */

import { h, fill, nextId, setText, show } from '../dom.js';
import { icon, glyph } from '../icons.js';
import { T, M, fmt, DASH, RULE_NAMES, moveName, toastText } from '../strings_tr.js';
import { createDialog, dialogHead, simChip, createSwitch } from './dialog.js';

/** @typedef {import('../index.js').UIContext} UIContext */

// --------------------------------------------------------------------------------------- onboarding
/** @param {UIContext} ctx */
export function mountOnboarding(ctx) {
  const { store, actions } = ctx;
  const titleId = nextId('onb-title'), rulesId = nextId('onb-rules'), optId = nextId('onb-opt');
  const skip = () => actions.finishOnboarding();
  const dialog = createDialog({ kind: 'modal', cls: 'onb scroll-y', wrapCls: 'dlg--dots', labelledby: titleId, onDismiss: skip });
  let userToggledOptin = false;
  const optin = createSwitch({ label: T.onbOptin, block: true, describedby: optId, onToggle: (v) => { userToggledOptin = true; actions.setSetting('cloud', v); } });
  const openBtn = h('button', { class: 'btn btn--primary', type: 'button', on: { click: () => { ctx.unlockAudio(); if (!userToggledOptin) actions.setSetting('cloud', true); actions.finishOnboarding(); actions.startCamera(); } } }, icon('camera'), T.onbOpen);
  const demoBtn = h('button', { class: 'btn', type: 'button', on: { click: () => { ctx.unlockAudio(); actions.finishOnboarding(); actions.startDemo(); } } }, T.onbDemo);
  const skipBtn = h('button', { class: 'btn btn--quiet btn--sm onb__skip', type: 'button', on: { click: skip } }, T.onbSkip);
  dialog.el.append(h('div', { class: 'onb__panel' },
    h('div', { class: 'onb__intro' }, h('p', { class: 'eyebrow' }, T.onbEyebrow), h('h2', { class: 'onb__title', id: titleId }, T.onbTitle), h('p', { class: 'onb__lead' }, T.onbLead)),
    h('div', { class: 'onb__rulebox' },
      h('p', { class: 'eyebrow', id: rulesId }, T.onbRulesH),
      h('ol', { class: 'onb__rules', 'aria-labelledby': rulesId },
        h('li', { class: 'onb__rule' }, h('span', { class: 'onb__n', 'aria-hidden': 'true' }, '1'), h('span', { class: 'onb__ico' }, glyph(0)), h('span', null, T.onbRule1)),
        h('li', { class: 'onb__rule' }, h('span', { class: 'onb__n', 'aria-hidden': 'true' }, '2'), h('span', { class: 'onb__ico' }, glyph(2)), h('span', null, T.onbRule2)),
        h('li', { class: 'onb__rule onb__rule--foul' }, h('span', { class: 'onb__n', 'aria-hidden': 'true' }, '3'), h('span', { class: 'onb__ico' }, icon('warning', 'ic--lg')), h('span', null, T.onbRule3)))),
    h('p', { class: 'onb__privacy' }, icon('shield', 'ic--lg'), h('span', null, T.onbPrivacy)),
    h('div', { class: 'onb__optin' }, optin.el, h('p', { class: 'set__desc', id: optId }, T.onbOptinDesc)),
    h('div', { class: 'onb__actions' }, openBtn, demoBtn, skipBtn)));
  store.subscribe((st) => st.settings.cloud, (on) => optin.set(on));
  return { dialog, focusTarget: () => openBtn };
}

// ------------------------------------------------------------------------------------------- rules
/** @param {UIContext} ctx */
export function mountRules(ctx) {
  const { store, actions } = ctx;
  const titleId = nextId('rules-title');
  const close = () => actions.closePanel();
  const dialog = createDialog({ kind: 'modal', cls: 'modal--wide', labelledby: titleId, onDismiss: close });
  const { head, close: closeBtn } = dialogHead({ id: titleId, title: T.rulesH, iconName: 'rules', onClose: close });
  const presets = h('div', { class: 'prose' });
  const body = h('div', { class: 'dbody scroll-y prose', tabindex: '0', role: 'region', 'aria-label': T.rulesBody },
    h('section', null, h('h3', null, T.rules3H), h('ul', null, T.rules3.map((x) => h('li', null, x)))),
    h('section', null, h('h3', null, T.rulesLateH), h('p', null, T.rulesLate)),
    h('section', null, h('h3', null, T.rulesPresetH), presets),
    h('section', null, h('h3', null, T.rulesSealH), h('p', null, T.rulesSealYes), h('p', null, T.rulesSealNo)));
  dialog.el.append(head, body, h('footer', { class: 'dfoot' },
    h('button', { class: 'btn', type: 'button', on: { click: () => actions.openPanel('settings') } }, icon('gear'), T.rulesChange),
    h('button', { class: 'btn btn--primary', type: 'button', on: { click: close } }, T.close)));
  store.subscribe((st) => st.settings.rules, (active) => {
    fill(presets, ['turnuva', 'standart', 'serbest'].map((k) => h('div', { class: `rulecard${k === active ? ' is-active' : ''}` },
      h('h4', null, RULE_NAMES[k], k === active ? h('span', { class: 'prose__active' }, icon('check', 'ic--sm'), T.rulesActive) : null),
      h('p', null, T.ruleDesc[k]))));
  });
  return { dialog, focusTarget: () => closeBtn };
}

// ------------------------------------------------------------------------------------------ series
/** @param {UIContext} ctx */
export function mountSeries(ctx) {
  const { store, actions } = ctx;
  const titleId = nextId('ser-title');
  const again = () => actions.newSeries();
  const dialog = createDialog({ kind: 'modal', cls: 'modal--wide', labelledby: titleId, onDismiss: again });
  const simSlot = h('span', { class: 'dhead__extra', hidden: true }, simChip());
  const { head } = dialogHead({ id: titleId, title: T.seriesTitle, extra: simSlot, closeLabel: T.seriesNew, onClose: again });
  const body = h('div', { class: 'dbody scroll-y', tabindex: '0', role: 'region', 'aria-label': T.seriesBody });
  const newBtn = h('button', { class: 'btn btn--primary', type: 'button', on: { click: again } }, T.seriesNew, h('kbd', { class: 'kbd', 'aria-hidden': 'true' }, T.keySpace));
  const labBtn = h('button', { class: 'btn', type: 'button', on: { click: () => actions.openPanel('lab') } }, icon('flask'), T.lab);
  dialog.el.append(head, body, h('footer', { class: 'dfoot' }, newBtn, labBtn));

  store.subscribe((st) => ({ open: st.ui.panel === 'series', series: st.series, source: st.boot.source }), ({ open, series: sr, source }) => {
    if (!open) return;
    simSlot.hidden = source !== 'demo';
    const headline = sr.ai > sr.player ? T.seriesAiWon : sr.player > sr.ai ? T.seriesYouWon : T.seriesDraw;
    const res = (/** @type {string} */ v) => (v === 'AI' ? T.resAi : v === 'PLAYER' ? T.resYou : T.resTie);
    fill(body,
      h('p', { class: 'ser__headline' }, headline),
      h('p', { class: 'ser__score' },
        h('span', { class: 'ser__who' }, h('span', { class: 'series__who series__who--you' }, h('i', { class: 'mk mk--you', 'aria-hidden': 'true' }), T.seriesYou), String(sr.player)),
        h('span', { class: 'series__dash', 'aria-hidden': 'true' }, '–'),
        h('span', { class: 'ser__who' }, h('span', { class: 'series__who series__who--ai' }, T.seriesAi, h('i', { class: 'mk mk--ai', 'aria-hidden': 'true' })), String(sr.ai))),
      h('p', { class: 'ser__sub' }, `${sr.ties} ${T.tie} · ${sr.fouls} ${T.roundsFouls}`),
      h('div', { class: 'chain-wrap' }, h('table', { class: 'chain' },
        h('caption', { class: 'sr-only' }, T.seriesRounds),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, T.thRound), h('th', { scope: 'col' }, T.thYou), h('th', { scope: 'col' }, T.thAi), h('th', { scope: 'col' }, T.thResult), h('th', { scope: 'col' }, T.thLead), h('th', { scope: 'col' }, T.thSeal))),
        h('tbody', null, sr.rounds.map((/** @type {any} */ r, /** @type {number} */ i) => h('tr', null,
          h('th', { scope: 'row' }, String(i + 1)),
          h('td', null, h('span', { class: 'chain__move' }, glyph(r.playerMove, { label: moveName(r.playerMove) }), h('span', { 'aria-hidden': 'true' }, moveName(r.playerMove)))),
          h('td', null, h('span', { class: 'chain__move' }, glyph(r.aiMove, { label: moveName(r.aiMove) }), h('span', { 'aria-hidden': 'true' }, moveName(r.aiMove)))),
          h('td', null, res(r.verdict)),
          h('td', { class: 'num' }, fmt.rel(r.leadMs)),
          h('td', null, r.sealOk
            ? h('span', { class: 'ok' }, icon('check', 'ic--sm'), h('span', { class: 'num' }, fmt.hash8(r.short)), h('span', { class: 'sr-only' }, T.verified))
            : h('span', { class: 'bad' }, icon('warning', 'ic--sm'), r.short ? fmt.hash8(r.short) : DASH, h('span', { class: 'sr-only' }, T.verifyFailed)))))))));
    ctx.announce(`${T.seriesTitle}. ${headline}. ${M.seriesLine(sr.player, sr.ai)}`);
  });
  return { dialog, focusTarget: () => newBtn };
}

// ------------------------------------------------------------------------------------------- toast
/** @param {UIContext} ctx */
export function mountToast(ctx) {
  const { store, actions } = ctx;
  const text = h('span', { class: 'toast__text' });
  const iconSlot = h('span', { 'aria-hidden': 'true' });
  const toast = h('div', { class: 'toast', hidden: true }, iconSlot, text,
    h('button', { class: 'iconbtn', type: 'button', 'aria-label': T.dismiss, title: T.dismiss, on: { click: () => actions.dismissToast() } }, icon('close')));
  const el = h('div', { class: 'toasts' }, toast);
  /** @type {any} */ let timer = null;
  store.subscribe((st) => st.ui.toast, (t) => {
    clearTimeout(timer);
    show(toast, !!t);
    if (!t) return;
    const message = toastText(t.code, t.params);
    const okTone = t.code === 'MEMORY_RESET';
    fill(iconSlot, icon(okTone ? 'check' : 'warning'));
    toast.dataset.tone = okTone ? 'ok' : 'warn';
    setText(text, message);
    ctx.announce(message);
    const id = t.id;
    timer = setTimeout(() => { const cur = store.get().ui.toast; if (cur && cur.id === id) actions.dismissToast(); }, 6000);
  });
  return { el };
}
