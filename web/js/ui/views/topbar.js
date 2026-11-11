// @ts-check
/**
 * beaTTer v4 — top bar: wordmark, mode tabs, series pips and score, status chip, tools.
 */

import { h, fill, setText, setAttr, show, toggle, roving } from '../dom.js';
import { icon, pip, setSymbol } from '../icons.js';
import { T, M, RULE_NAMES } from '../strings_tr.js';

/** @typedef {import('../index.js').UIContext} UIContext */

/** @param {UIContext} ctx */
export function mountTopbar(ctx) {
  const { store, actions } = ctx;

  // ---- mode tabs (roving tabindex)
  const tabRps = h('button', { class: 'modes__tab', type: 'button', role: 'tab', id: 'tab-rps', 'aria-controls': 'arena', data: { mode: 'rps' } }, T.modeRps);
  const tabTwin = h('button', { class: 'modes__tab', type: 'button', role: 'tab', id: 'tab-mindtwin', 'aria-controls': 'arena', data: { mode: 'mindtwin' } }, T.modeTwin);
  const modes = h('div', { class: 'modes', role: 'tablist', 'aria-label': T.modesLabel }, tabRps, tabTwin);
  const pick = (/** @type {HTMLElement} */ el) => { const m = el.dataset.mode; if (m && m !== store.get().mode) { ctx.unlockAudio(); actions.setMode(/** @type {'rps'|'mindtwin'} */ (m)); } };
  modes.addEventListener('click', (e) => { const b = /** @type {HTMLElement|null} */ (/** @type {Element} */ (e.target).closest('.modes__tab')); if (b) pick(b); });
  roving(modes, '.modes__tab', pick);

  // ---- series
  const round = h('span', { class: 'series__round' });
  const pips = h('ol', { class: 'pips' });
  const scoreYou = h('span', { class: 'num', 'aria-hidden': 'true' }, '0'), scoreAi = h('span', { class: 'num', 'aria-hidden': 'true' }, '0');
  const scoreSr = h('span', { class: 'sr-only' });
  const series = h('div', { class: 'series', role: 'group' },
    round, pips,
    h('span', { class: 'series__score' }, scoreSr,
      h('span', { class: 'series__who series__who--you', 'aria-hidden': 'true' }, h('i', { class: 'mk mk--you' }), h('span', { class: 'series__whotxt' }, T.seriesYou)),
      scoreYou, h('span', { class: 'series__dash', 'aria-hidden': 'true' }, '–'), scoreAi,
      h('span', { class: 'series__who series__who--ai', 'aria-hidden': 'true' }, h('span', { class: 'series__whotxt' }, T.seriesAi), h('i', { class: 'mk mk--ai' }))));
  const spacer = h('span', { class: 'topbar__spacer' });

  // ---- status chip (memory / cloud / simulation): icon + text, never colour alone
  const statusIcon = icon('disk', 'ic--sm');
  const statusTxt = h('span', { class: 'status__txt', 'aria-hidden': 'true' });
  const statusSr = h('span', { class: 'sr-only' });
  const status = h('span', { class: 'status' }, statusIcon, statusTxt, statusSr);

  // ---- tools
  const rulesName = h('span', { class: 'tools__rulesname' });
  const rulesBtn = h('button', { class: 'btn btn--quiet tools__rules', type: 'button', title: T.rulesTitle, on: { click: () => actions.openPanel('rules') } },
    icon('rules'), h('span', { class: 'sr-only' }, `${T.rulesChip}: `), rulesName);
  const labBtn = h('button', { class: 'btn btn--quiet tools__lab', type: 'button', 'aria-label': T.lab, title: T.labTitle, 'aria-haspopup': 'dialog', on: { click: () => actions.openPanel('lab') } },
    icon('flask'), h('span', { class: 'tools__label', 'aria-hidden': 'true' }, T.lab));
  const setBtn = h('button', { class: 'iconbtn', type: 'button', 'aria-label': T.settings, title: T.settingsTitle, 'aria-haspopup': 'dialog', on: { click: () => actions.openPanel('settings') } }, icon('gear'));
  const soundIcon = icon('speaker');
  const soundBtn = h('button', { class: 'iconbtn', type: 'button', 'aria-label': T.sound, on: { click: () => { ctx.unlockAudio(); actions.setSetting('muted', !store.get().settings.muted); } } }, soundIcon);
  const privIcon = icon('shield');
  const privBtn = h('button', { class: 'iconbtn', type: 'button', 'aria-label': T.privacy, on: { click: () => actions.setSetting('privacy', !store.get().settings.privacy) } }, privIcon);
  const tools = h('div', { class: 'tools' }, rulesBtn, labBtn, setBtn, soundBtn, privBtn);

  const el = h('header', { class: 'topbar' },
    h('h1', { class: 'wordmark', 'aria-label': T.appName }, h('span', { 'aria-hidden': 'true' }, 'bea', h('span', { class: 'wordmark__you' }, 'T'), h('span', { class: 'wordmark__ai' }, 'T'), 'er')),
    modes, series, spacer, status, tools);

  // ---- subscriptions
  store.subscribe((st) => st.mode, (mode) => {
    for (const tab of [tabRps, tabTwin]) {
      const on = tab.dataset.mode === mode;
      setAttr(tab, 'aria-selected', on ? 'true' : 'false');
      setAttr(tab, 'tabindex', on ? '0' : '-1');
    }
    show(series, mode === 'rps');
    show(spacer, mode !== 'rps');
  });

  store.subscribe((st) => ({ series: st.series, open: st.result !== null }), ({ series: sr, open }) => {
    const played = sr.rounds.length;
    const current = Math.min(sr.length, played + (open || sr.done ? 0 : 1));
    setText(round, played === 0 && !open ? M.seriesOf(sr.length) : M.roundOf(Math.max(1, current), sr.length));
    setAttr(series, 'aria-label', M.seriesLabel(sr.length));
    toggle(pips, 'pips--dense', sr.length > 5);
    const items = [];
    for (let i = 0; i < sr.length; i++) {
      const r = sr.rounds[i];
      const kind = r ? (r.verdict === 'AI' ? 'ai' : r.verdict === 'PLAYER' ? 'you' : 'draw') : i === played && !sr.done ? 'now' : 'todo';
      const state = r ? M.pipStates[r.verdict] : kind === 'now' ? M.pipStates.now : M.pipStates.todo;
      items.push(h('li', null, pip(/** @type {any} */ (kind)), h('span', { class: 'sr-only' }, M.pipSr(i + 1, state))));
    }
    fill(pips, items);
    setText(scoreYou, String(sr.player));
    setText(scoreAi, String(sr.ai));
    setText(scoreSr, M.scoreSr(sr.player, sr.ai));
  });

  store.subscribe((st) => st.settings, (se) => {
    setText(rulesName, RULE_NAMES[se.rules] ?? se.rules);
    setSymbol(soundIcon, se.muted ? 'i-speaker-off' : 'i-speaker');
    setAttr(soundBtn, 'aria-pressed', se.muted ? 'false' : 'true');
    setAttr(soundBtn, 'title', se.muted ? T.soundOff : T.soundOn);
    setSymbol(privIcon, se.privacy ? 'i-shield' : 'i-shield-off');
    setAttr(privBtn, 'aria-pressed', se.privacy ? 'true' : 'false');
    setAttr(privBtn, 'title', se.privacy ? T.privacyOn : T.privacyOff);
  });

  store.subscribe((st) => st.ui.panel, (panel) => {
    setAttr(labBtn, 'aria-expanded', panel === 'lab' ? 'true' : 'false');
    setAttr(setBtn, 'aria-expanded', panel === 'settings' ? 'true' : 'false');
  });

  store.subscribe((st) => ({ storage: st.boot.storage, source: st.boot.source, cloud: st.cloud }), ({ storage, source, cloud }) => {
    /** @type {[string, string, string|null]} */
    const v = source === 'demo' ? ['flask', T.statusSim, 'sim']
      : !storage ? ['warning', T.statusNoStorage, 'warn']
      : cloud === 'online' ? ['cloud', T.statusOnline, 'ok']
      : cloud === 'connecting' ? ['cloud', T.statusConnecting, null]
      : cloud === 'offline' ? ['cloud-off', T.statusOffline, 'warn']
      : ['disk', T.statusLocal, null];
    setSymbol(statusIcon, `i-${v[0]}`);
    setText(statusTxt, v[1]);
    setText(statusSr, v[1]);
    setAttr(status, 'title', v[1]);
    setAttr(status, 'data-tone', v[2]);
  });

  return { el };
}
