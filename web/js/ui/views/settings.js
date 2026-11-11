// @ts-check
/**
 * beaTTer v4 — settings drawer. Every control writes through `actions.setSetting(key, value)` and
 * reflects the store; nothing is kept locally.
 */

import { h, nextId, setText, show } from '../dom.js';
import { icon } from '../icons.js';
import { T, M, RULE_NAMES } from '../strings_tr.js';
import { createDialog, dialogHead, createSwitch, createSegmented } from './dialog.js';

/** @typedef {import('../index.js').UIContext} UIContext */

/** @param {string} label @param {(Node|string|null)[]} controls @param {string|Node|null} [desc] */
function row(label, controls, desc = null) {
  return h('div', { class: 'set' }, h('span', { class: 'set__label' }, label), controls, desc ? (typeof desc === 'string' ? h('p', { class: 'set__desc' }, desc) : desc) : null);
}

/** @param {string} title @param {...Node} rows */
function group(title, ...rows) {
  const id = nextId('set-g');
  return h('section', { class: 'setgroup', 'aria-labelledby': id }, h('h3', { class: 'setgroup__h', id }, title), rows);
}

/** @param {UIContext} ctx */
export function mountSettings(ctx) {
  const { store, actions } = ctx;
  const titleId = nextId('set-title');
  const close = () => actions.closePanel();
  const dialog = createDialog({ kind: 'drawer', labelledby: titleId, onDismiss: close });
  const { head, close: closeBtn } = dialogHead({ id: titleId, title: T.settings, iconName: 'gear', onClose: close });

  const set = (/** @type {string} */ key) => (/** @type {any} */ v) => actions.setSetting(key, v);

  /** Range with a live read-out; commits on change (not on every input step). */
  const range = (/** @type {string} */ key, /** @type {number} */ min, /** @type {number} */ max, /** @type {number} */ step, /** @type {(v:number)=>string} */ format, /** @type {string} */ label) => {
    const out = h('output');
    const input = h('input', { type: 'range', min, max, step, 'aria-label': label });
    input.addEventListener('input', () => { out.textContent = format(Number(input.value)); input.setAttribute('aria-valuetext', format(Number(input.value))); });
    input.addEventListener('change', () => actions.setSetting(key, Number(input.value)));
    return { el: h('div', { class: 'range' }, input, out), set(/** @type {number} */ v) { if (document.activeElement !== input) input.value = String(v); out.textContent = format(v); input.setAttribute('aria-valuetext', format(v)); } };
  };

  const rules = createSegmented({ label: T.sRules, options: ['serbest', 'standart', 'turnuva'].map((v) => ({ value: v, label: RULE_NAMES[v] })), onChange: set('rules') });
  const rulesDesc = h('p', { class: 'set__desc' });
  const rhythm = createSegmented({ label: T.sRhythm, options: [{ value: 'free', label: T.rhythmFree }, { value: 'metronome', label: T.rhythmMetronome }], onChange: set('rhythm') });
  const prime = createSegmented({ label: T.sPrime, options: [{ value: 3, label: '3' }, { value: 2, label: '2' }, { value: 0, label: '0' }], onChange: set('primeBeats') });
  const bpm = range('metronomeBpm', 60, 160, 1, (v) => `${v} ${T.bpm}`, T.sBpm);
  const sens = range('sensitivity', 1, 5, 1, (v) => `${v} / 5`, T.sSensitivity);
  const series = createSegmented({ label: T.sSeries, options: [3, 5, 7, 9].map((v) => ({ value: v, label: String(v) })), onChange: set('seriesLength') });
  const privacy = createSwitch({ label: T.sPrivacy, block: true, onToggle: set('privacy') });
  const sound = createSwitch({ label: T.sSound, block: true, onToggle: (v) => { ctx.unlockAudio(); actions.setSetting('muted', !v); } });
  const voice = createSwitch({ label: T.sVoice, block: true, onToggle: set('voice') });
  const live = createSwitch({ label: T.sLive, block: true, onToggle: set('liveBeliefs') });
  const motion = createSegmented({ label: T.sMotion, options: [{ value: 'auto', label: T.motionAuto }, { value: 'on', label: T.motionOn }, { value: 'off', label: T.motionOff }], onChange: set('reducedMotion') });
  const freeze = range('freezeLeadMs', 0, 300, 10, (v) => `${v} ms`, T.sFreeze);

  const demoLabel = h('span');
  const demoBtn = h('button', { class: 'btn btn--block', type: 'button', on: { click: () => { ctx.unlockAudio(); if (store.get().boot.source === 'demo') actions.stopDemo(); else { actions.closePanel(); actions.startDemo(); } } } }, icon('play'), demoLabel);
  const camSelect = h('select', { class: 'select', 'aria-label': T.sCamera, on: { change: (/** @type {Event} */ e) => { const id = /** @type {HTMLSelectElement} */ (e.target).value; if (id) { ctx.unlockAudio(); actions.closePanel(); actions.startCamera(id); } } } });
  const camRow = row(T.sCamera, [camSelect]);
  const onbBtn = h('button', { class: 'btn btn--block', type: 'button', on: { click: () => actions.openPanel('onboarding') } }, T.sOnboarding);
  const rulesBtn = h('button', { class: 'btn btn--block', type: 'button', on: { click: () => actions.openPanel('rules') } }, icon('rules'), T.rulesH);

  const body = h('div', { class: 'sets scroll-y' },
    group(T.gReferee, row(T.sRules, [rules.el], rulesDesc), rulesBtn),
    group(T.gRhythm, row(T.sRhythm, [rhythm.el], T.rhythmDesc), row(T.sPrime, [prime.el], T.primeDesc), row(T.sBpm, [bpm.el]), row(T.sSensitivity, [sens.el], T.sensitivityDesc)),
    group(T.gGame, row(T.sSeries, [series.el]), row(T.sDemo, [demoBtn], T.demoDesc), camRow),
    group(T.gDisplay,
      h('div', { class: 'set' }, privacy.el, h('p', { class: 'set__desc' }, T.sPrivacyDesc)),
      h('div', { class: 'set' }, sound.el),
      h('div', { class: 'set' }, voice.el, h('p', { class: 'set__desc' }, T.sVoiceDesc)),
      h('div', { class: 'set' }, live.el, h('p', { class: 'set__desc' }, T.sLiveDesc)),
      row(T.sMotion, [motion.el])),
    group(T.gAdvanced, row(T.sFreeze, [freeze.el], T.freezeDesc), onbBtn),
    group(T.gKeys, h('dl', { class: 'keys' }, T.keys.map(([keys, what]) => [h('dt', null, keys.map((k) => h('kbd', { class: 'kbd' }, k))), h('dd', null, what)]))));
  dialog.el.append(head, body);

  store.subscribe((st) => st.settings, (se) => {
    rules.set(se.rules); setText(rulesDesc, T.ruleDesc[se.rules] ?? '');
    rhythm.set(se.rhythm); prime.set(se.primeBeats); bpm.set(se.metronomeBpm); sens.set(se.sensitivity);
    series.set(se.seriesLength); privacy.set(se.privacy); sound.set(!se.muted); voice.set(se.voice); live.set(se.liveBeliefs);
    motion.set(se.reducedMotion); freeze.set(se.freezeLeadMs);
  });
  store.subscribe((st) => ({ source: st.boot.source, devices: st.boot.devices }), ({ source, devices }) => {
    setText(demoLabel, source === 'demo' ? T.demoStop : T.demoStart);
    show(camRow, devices.length > 1);
    while (camSelect.firstChild) camSelect.removeChild(camSelect.firstChild);
    camSelect.append(h('option', { value: '' }, T.gateDevice), ...devices.map((d, i) => h('option', { value: d.id }, d.label || `${M.camera('')} ${i + 1}`)));
  });

  return { dialog, focusTarget: () => closeBtn };
}
