// @ts-check
/**
 * beaTTer v4 — console: beat track, tempo, the live timeline strip, the one-line "düşünce" read-out and
 * the primary action. In MindTwin mode the beat track and the strip give way to per-finger
 * now-versus-forecast meters.
 */

import { h, fill, setText, setAttr, setVar, show, toggle } from '../dom.js';
import { icon } from '../icons.js';
import { T, M, fmt, FINGER_NAMES, DASH, thoughtText } from '../strings_tr.js';
import { createSurface } from '../render/canvas.js';
import { drawLiveStrip } from '../render/timeline.js';
import { theme } from '../render/theme.js';

/** @typedef {import('../index.js').UIContext} UIContext */

/** @param {UIContext} ctx */
export function mountConsole(ctx) {
  const { store, actions } = ctx;

  // ---- beats
  const beats = h('ol', { class: 'beats', 'aria-label': T.beatsLabel });
  /** @type {HTMLElement[]} */ let beatEls = [];

  // ---- tempo
  const tempoV = h('span', { class: 'tempo__v' }, DASH);
  const tempoSr = h('span', { class: 'sr-only' });
  const tempoNote = h('span', { class: 'tempo__note' });
  const tempo = h('div', { class: 'tempo' }, icon('metronome'), tempoV, tempoSr, h('span', { class: 'tempo__u', 'aria-hidden': 'true' }, T.bpm), tempoNote);

  // ---- live strip
  const canvas = h('canvas', { class: 'scope__canvas', 'aria-hidden': 'true' });
  const surface = createSurface(canvas);
  const idle = h('p', { class: 'scope__idle' }, T.scopeIdle);
  const scope = h('div', { class: 'scope', role: 'group', 'aria-label': T.scopeLabel },
    h('div', { class: 'scope__head', 'aria-hidden': 'true' },
      h('span', { class: 'lg' }, T.lgPalm), h('span', { class: 'lg lg--front' }, T.lgFront), h('span', { class: 'lg lg--back' }, T.lgBack),
      h('span', { class: 'lg lg--seal' }, T.lgSeal), h('span', { class: 'lg lg--land lg--hide-sm' }, T.lgLand), h('span', { class: 'scope__grid' }, T.scopeGrid)),
    h('div', { class: 'scope__plot' }, canvas, idle));

  // ---- thought
  const thoughtT = h('span', { class: 'thought__t' });
  const thought = h('p', { class: 'thought' }, h('span', { class: 'thought__k' }, T.thoughtKey), thoughtT);

  // ---- primary action
  const action = h('div', { class: 'console__action' });
  const startBtn = h('button', { class: 'btn btn--primary', type: 'button', on: { click: () => { ctx.unlockAudio(); actions.primary(); } } },
    h('span', { class: 'btn__row' }, icon('play'), T.startCount), h('kbd', { class: 'kbd' }, T.keySpace));
  const nextBtn = h('button', { class: 'btn btn--primary', type: 'button', on: { click: () => actions.nextRound() } },
    h('span', { class: 'btn__row' }, T.nextRound, icon('next')), h('kbd', { class: 'kbd' }, T.keySpace));
  const camBtn = h('button', { class: 'btn btn--primary', type: 'button', on: { click: () => { ctx.unlockAudio(); actions.startCamera(''); } } },
    h('span', { class: 'btn__row' }, icon('camera'), T.gateOpen));
  const hint = h('p', { class: 'hint' });
  action.append(startBtn, nextBtn, camBtn, hint);

  // ---- MindTwin meters
  /** @type {{now: HTMLElement, ahead: HTMLElement, vNow: HTMLElement, vAhead: HTMLElement}[]} */
  const twinRows = [];
  const aheadK = FINGER_NAMES.map(() => h('span', { class: 'twinbar__k' }));
  const twinbars = h('div', { class: 'twinbars', hidden: true, role: 'group', 'aria-label': T.twinBarsLabel }, FINGER_NAMES.map((name, i) => {
    const now = h('div', { class: 'bar bar--you', role: 'meter', 'aria-label': `${name} · ${T.twinNow}`, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, h('span', { class: 'bar__fill' }));
    const ahead = h('div', { class: 'bar bar--ahead', role: 'meter', 'aria-label': `${name} · ${T.twinAheadSr}`, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, h('span', { class: 'bar__fill' }));
    const vNow = h('span', { class: 'twinbar__v' }, DASH), vAhead = h('span', { class: 'twinbar__v' }, DASH);
    twinRows.push({ now, ahead, vNow, vAhead });
    return h('div', { class: 'twinbar' }, h('span', { class: 'twinbar__name' }, name),
      h('span', { class: 'twinbar__k' }, T.twinNow), now, vNow, aheadK[i], ahead, vAhead);
  }));

  const el = h('section', { class: 'console', 'aria-label': T.consoleLabel }, beats, tempo, scope, thought, action, twinbars);

  // ---- mode
  store.subscribe((st) => st.mode, (mode) => {
    const tw = mode === 'mindtwin';
    toggle(el, 'console--twin', tw);
    show(beats, !tw); show(tempo, !tw); show(scope, !tw); show(action, !tw); show(twinbars, tw);
    surface.invalidate();
  });

  // ---- beat labels follow the number of priming beats
  store.subscribe((st) => st.settings.primeBeats, (pb) => {
    const words = T.beatWords[pb] ?? T.beatWords[3];
    beatEls = words.map((w, i) => h('li', { class: 'beat' },
      h('span', { class: 'beat__n', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 'beat__w' }, w),
      icon('check', 'beat__ok'), h('i', { class: 'beat__dot', 'aria-hidden': 'true' }), h('i', { class: 'beat__led', 'aria-hidden': 'true' })));
    fill(beats, beatEls);
    setVar(beats, '--beats', words.length);
  });

  // ---- lit beats
  store.subscribe((st) => ({ phase: st.engine ? st.engine.phase : 'IDLE', beat: st.engine ? st.engine.beat : 0, throwStarted: !!(st.engine && st.engine.throwStarted), pb: st.settings.primeBeats, open: st.result !== null }), (v) => {
    const n = beatEls.length; // priming beats + the throw
    for (let i = 0; i < n; i++) {
      const idx = i + 1;
      let done = false, active = false;
      if (v.phase === 'PRIMING') { done = idx < v.beat; active = idx === v.beat; }
      else if (v.phase === 'FLIGHT' && v.pb > 0 && !v.throwStarted) { done = idx < v.pb; active = idx === v.pb; }
      else if (v.phase === 'FLIGHT' || v.phase === 'ARMED') { done = idx < n; active = idx === n; }
      else if (v.phase === 'SETTLING' || v.phase === 'RESOLVED' || v.open) done = true;
      toggle(beatEls[i], 'is-done', done);
      toggle(beatEls[i], 'is-active', active);
      setAttr(beatEls[i], 'aria-current', active ? 'step' : null);
    }
  });

  // ---- tempo
  store.subscribe((st) => (st.engine && Number.isFinite(st.engine.periodMs) && st.engine.periodMs > 0 ? Math.round(st.engine.periodMs) : null), (period) => {
    setText(tempoV, period === null ? DASH : fmt.bpm(60000 / period));
    setText(tempoSr, period === null ? T.tempoNoneSr : '');
    setText(tempoNote, period === null ? T.tempoNone : M.beatGap(period));
  });

  // ---- thought (plain text, 20 Hz at most, not a live region)
  store.subscribe((st) => ({ th: st.engine ? st.engine.thought : null, source: st.boot.source, mode: st.mode, live: st.settings.liveBeliefs, twin: st.mode === 'mindtwin' ? !!(st.twin && st.twin.present) : false }), (v) => {
    if (v.mode === 'mindtwin') { setText(thoughtT, v.source === 'none' ? thoughtText(null, { source: 'none', hidden: false }) : v.twin ? T.twinCap : T.promptTwin); return; }
    setText(thoughtT, thoughtText(v.th, { source: v.source, hidden: !v.live }));
  });

  // ---- primary action
  store.subscribe((st) => ({ source: st.boot.source, rhythm: st.settings.rhythm, phase: st.engine ? st.engine.phase : 'IDLE', open: st.result !== null }), (v) => {
    const isNoSource = v.source === 'none';
    const start = !v.open && !isNoSource && v.rhythm === 'metronome' && v.phase === 'IDLE';
    show(camBtn, isNoSource && !v.open);
    show(startBtn, start);
    show(nextBtn, v.open);
    show(hint, !start && !v.open && !isNoSource);
    if (!isNoSource) {
      setText(hint, v.phase === 'IDLE' ? T.hintFree
        : v.phase === 'PRIMING' ? T.hintCounting : T.hintInRound);
    }
  });

  // ---- MindTwin meters
  store.subscribe((st) => (st.mode === 'mindtwin' ? st.twin : null), (tw) => {
    const hz = tw && tw.skill ? tw.skill.horizonMs : null;
    for (let i = 0; i < 5; i++) {
      const r = twinRows[i];
      const n = tw && tw.now ? Math.round(Math.min(1, Math.max(0, tw.now[i])) * 100) : null;
      const a = tw && tw.ahead ? Math.round(Math.min(1, Math.max(0, tw.ahead[i])) * 100) : null;
      setVar(r.now, '--v', n ?? 0); setVar(r.ahead, '--v', a ?? 0);
      setAttr(r.now, 'aria-valuenow', n); setAttr(r.ahead, 'aria-valuenow', a);
      setText(r.vNow, n === null ? DASH : `%${n}`); setText(r.vAhead, a === null ? DASH : `%${a}`);
      setText(aheadK[i], hz === null ? T.twinAheadSr : M.horizon(hz)); // the row keeps a name while the horizon is unknown
    }
  });

  // ---- live strip (requestAnimationFrame)
  let lastNow = /** @type {number|null} */ (-1), lastLen = -1, lastCommits = -1, lastBeats = -1, lastLand = /** @type {number|null} */ (null), lastHat = /** @type {number|null} */ (null), hadSignal = false;
  return {
    el,
    /** Called once per animation frame. */
    paint() {
      const st = store.get();
      if (st.mode !== 'rps') return;
      const live = st.live;
      const dirty = surface.takeDirty();
      if (!dirty && live.now === lastNow && live.t.length === lastLen && live.commits.length === lastCommits && live.beats.length === lastBeats && live.landingT === lastLand && live.tLandHat === lastHat) return;
      lastNow = live.now; lastLen = live.t.length; lastCommits = live.commits.length; lastBeats = live.beats.length; lastLand = live.landingT; lastHat = live.tLandHat;
      const c = surface.begin();
      const drawn = surface.w > 4 && surface.h > 4 && drawLiveStrip(c, surface.w, surface.h, live, theme(), { labels: { landing: T.scopeLanding, landingHat: T.scopeLandingHat }, glow: !ctx.reducedMotion() });
      if (drawn !== hadSignal) { hadSignal = drawn; show(idle, !drawn); }
    },
    invalidate() { surface.invalidate(); },
  };
}
