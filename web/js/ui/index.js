// @ts-check
/**
 * beaTTer v4 — user interface entry point.
 *
 *   mountUI(root, { store, actions, frame, privacy, unlockAudio })
 *
 * Builds the shell (top bar, arena, console), the dialog layer (report sheet, lab, settings, onboarding,
 * rules, series summary), the toast and the single polite live region; wires the keyboard; runs one
 * requestAnimationFrame loop for the canvases. Views own their DOM subtree and subscribe to the store
 * slices they render; text only changes when its value changed.
 */

import { h, show, isFormControl, isActivatable } from './dom.js';
import { buildSprite } from './icons.js';
import { T } from './strings_tr.js';
import { invalidateTheme } from './render/theme.js';
import { mountTopbar } from './views/topbar.js';
import { mountPlayerStage } from './views/player_stage.js';
import { mountAiStage } from './views/ai_stage.js';
import { mountConsole } from './views/console.js';
import { mountReport } from './views/report.js';
import { mountLab } from './views/lab.js';
import { mountSettings } from './views/settings.js';
import { mountOnboarding, mountRules, mountSeries, mountToast } from './views/panels.js';

/**
 * @typedef {Object} UIContext
 * @property {ReturnType<typeof import('../app/store.js').createStore<ReturnType<typeof import('../app/store.js').initialState>>>} store
 * @property {ReturnType<typeof import('../app/controller.js').createController>['actions']} actions
 * @property {() => {image: any, demo: boolean, video: HTMLVideoElement|null, source: 'none'|'camera'|'demo'}} frame
 * @property {() => any} privacy            privacy painter (all defocused but the hand), or null before the camera was ever started
 * @property {() => void} unlockAudio
 * @property {(message: string) => void} announce   polite live-region announcement (outcomes and status only)
 * @property {() => boolean} reducedMotion  true when non-essential motion must be removed
 */

/** @typedef {{dialog: {wrap: HTMLElement, el: HTMLElement, onDismiss: () => void}, focusTarget: () => HTMLElement}} DialogView */

/**
 * @param {HTMLElement} root
 * @param {Omit<UIContext, 'announce'|'reducedMotion'>} deps
 */
export function mountUI(root, deps) {
  const { store, actions } = deps;

  // ---- the one live region (never inside an inert subtree)
  const live = h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  /** @type {any} */ let liveTimer = null;
  const announce = (/** @type {string} */ message) => {
    clearTimeout(liveTimer);
    live.textContent = '';
    liveTimer = setTimeout(() => { live.textContent = message; }, 80);
  };

  // ---- motion preference: settings.reducedMotion ('auto' | 'on' | 'off') + the system setting
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = false;
  const syncMotion = () => {
    const s = store.get().settings.reducedMotion;
    reduced = s === 'on' || (s === 'auto' && mq.matches);
    document.documentElement.dataset.motion = s === 'on' ? 'reduce' : s === 'off' ? 'full' : 'auto';
  };

  /** @type {UIContext} */
  const ctx = { ...deps, announce, reducedMotion: () => reduced };

  // ---- shell
  const topbar = mountTopbar(ctx);
  const player = mountPlayerStage(ctx);
  const ai = mountAiStage(ctx);
  const cons = mountConsole(ctx);
  const arena = h('main', { class: 'arena', id: 'arena', tabindex: '-1' }, player.el, ai.el);
  const shell = h('div', { class: 'app' }, topbar.el, arena, cons.el);

  // ---- dialog layer: the report sits below the panels, so DOM order is the stacking order
  const report = mountReport(ctx);
  /** @type {Record<string, DialogView>} */
  const panels = { lab: mountLab(ctx), settings: mountSettings(ctx), onboarding: mountOnboarding(ctx), rules: mountRules(ctx), series: mountSeries(ctx) };
  /** @type {DialogView[]} */
  const dialogs = [report, ...Object.values(panels)];
  const layer = h('div', { class: 'layer' }, dialogs.map((d) => d.dialog.wrap));
  const toast = mountToast(ctx);

  root.append(buildSprite(), shell, layer, toast.el, live);

  store.subscribe((st) => st.settings.reducedMotion, () => { syncMotion(); ai.invalidate(); cons.invalidate(); });
  mq.addEventListener('change', () => { syncMotion(); ai.invalidate(); cons.invalidate(); });

  // ---- modal management: inert background, focus into the top dialog, focus return on close
  /** @type {DialogView[]} */ let stack = [];
  /** @type {Map<DialogView, Element|null>} */ const returnTo = new Map();
  const usable = (/** @type {Element|null|undefined} */ el) => !!el && el instanceof HTMLElement && el.isConnected && !el.closest('[hidden]') && !el.closest('[inert]') && el !== document.body;

  store.subscribe((st) => ({ result: st.result !== null, panel: st.ui.panel }), ({ result, panel }) => {
    /** @type {DialogView[]} */ const next = [];
    if (result) next.push(report);
    if (panel && panels[panel]) next.push(panels[panel]);
    const prevTop = stack.length ? stack[stack.length - 1] : null;
    const top = next.length ? next[next.length - 1] : null;
    const active = document.activeElement;

    for (const d of next) if (!stack.includes(d)) returnTo.set(d, active);
    for (const d of dialogs) {
      const open = next.includes(d);
      show(d.dialog.wrap, open);
      d.dialog.wrap.inert = open && d !== top;
    }
    shell.inert = next.length > 0;

    /** @type {Element|null|undefined} */ let restore = null;
    for (const d of stack) if (!next.includes(d)) { if (d === prevTop) restore = returnTo.get(d); returnTo.delete(d); }
    if (top !== prevTop) {
      if (top && !stack.includes(top)) top.focusTarget().focus({ preventScroll: true });
      else if (usable(restore)) /** @type {HTMLElement} */ (restore).focus({ preventScroll: true });
      else if (top) top.focusTarget().focus({ preventScroll: true });
      else if (active instanceof HTMLElement && !usable(active)) arena.focus({ preventScroll: true }); // keep keyboard users in the arena
    }
    stack = next;
    if (result) report.invalidate();
  });

  // ---- status announcements (source changes)
  let lastSource = store.get().boot.source;
  store.subscribe((st) => st.boot.source, (source) => {
    if (source === lastSource) return;
    if (source === 'demo') announce(T.liveDemoOn);
    else if (source === 'camera') announce(T.liveCameraOn);
    else if (lastSource === 'demo') announce(T.liveDemoOff);
    lastSource = source;
  });

  // ---- audio unlock on the first gesture (autoplay policies)
  const unlockOnce = () => {
    deps.unlockAudio();
    window.removeEventListener('pointerdown', unlockOnce, true);
    window.removeEventListener('keydown', unlockOnce, true);
  };
  window.addEventListener('pointerdown', unlockOnce, true);
  window.addEventListener('keydown', unlockOnce, true);

  // ---- keyboard
  const togglePanel = (/** @type {'lab'|'settings'} */ name) => { if (store.get().ui.panel === name) actions.closePanel(); else actions.openPanel(name); };
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    const st = store.get();
    if (e.key === 'Escape') {
      const top = stack.length ? stack[stack.length - 1] : null;
      if (top) { e.preventDefault(); top.dialog.onDismiss(); }
      else if (st.ui.toast) { e.preventDefault(); actions.dismissToast(); }
      else if (st.mode === 'rps' && st.engine && ['PRIMING', 'ARMED', 'FLIGHT', 'SETTLING'].includes(st.engine.phase)) { e.preventDefault(); actions.abortRound(); } // stop the round in progress
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isFormControl(e.target)) return;

    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      if (isActivatable(e.target)) return;                       // the focused control acts by itself
      if (e.key !== 'Enter' && e.target instanceof Element && e.target.closest('.scroll-y')) return; // Space scrolls a focused panel
      if (st.ui.panel && st.ui.panel !== 'series') return;       // a panel is open: nothing to start behind it
      e.preventDefault();
      if (e.repeat) return;
      deps.unlockAudio();
      actions.primary();
      return;
    }
    if (e.repeat || e.shiftKey) return;
    const onboarding = st.ui.panel === 'onboarding';
    switch (e.key.toLowerCase()) {
      case 'l': if (!onboarding) { e.preventDefault(); togglePanel('lab'); } break;
      case 's': if (!onboarding) { e.preventDefault(); togglePanel('settings'); } break;
      case 'm': e.preventDefault(); actions.setSetting('muted', !st.settings.muted); break;
      case 'p': e.preventDefault(); actions.setSetting('privacy', !st.settings.privacy); break;
      case 'd': if (!onboarding) { e.preventDefault(); if (st.boot.source === 'demo') actions.stopDemo(); else actions.startDemo(); } break;
      default: break;
    }
  });

  // ---- canvases: one animation-frame loop
  let raf = 0;
  /** @type {Set<string>} */ const reported = new Set();
  const safely = (/** @type {string} */ name, /** @type {() => void} */ fn) => {
    try { fn(); } catch (e) { if (!reported.has(name)) { reported.add(name); console.error(`[beaTTer] painter "${name}" failed`, e); } }
  };
  const tick = (/** @type {number} */ now) => {
    // re-arm first and isolate the painters: one failing canvas must not freeze the others (the private
    // camera picture lives in this loop)
    raf = requestAnimationFrame(tick);
    safely('player', () => player.paint());
    safely('ai', () => ai.paint(now));
    safely('console', () => cons.paint());
    safely('report', () => report.paint());
  };
  raf = requestAnimationFrame(tick);

  // web fonts change the metrics of canvas text: redraw once they are in
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { invalidateTheme(); ai.invalidate(); cons.invalidate(); report.invalidate(); }).catch(() => {});
  }

  return {
    destroy() { cancelAnimationFrame(raf); },
  };
}
