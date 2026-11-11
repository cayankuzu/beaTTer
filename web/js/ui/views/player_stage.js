// @ts-check
/**
 * beaTTer v4 — player stage: the mirrored camera video under an overlay canvas (private picture: all
 * defocused but the tracked hand; hand skeleton), status chips, the five finger-extension meters and the
 * camera gate (call to action, loading, error). In demo mode there is no video: the synthetic skeleton is
 * drawn on the backdrop and a persistent label says so.
 */

import { h, fill, setText, setAttr, setVar, show, toggle, nextId, focusables } from '../dom.js';
import { icon, glyph } from '../icons.js';
import { T, M, FINGER_NAMES, FINGER_LETTERS, MOVE_UPPER, DASH, cameraError } from '../strings_tr.js';
import { createSurface } from '../render/canvas.js';
import { drawSkeleton, projection } from '../render/skeleton.js';
import { theme } from '../render/theme.js';

/** @typedef {import('../index.js').UIContext} UIContext */

/** @param {UIContext} ctx */
export function mountPlayerStage(ctx) {
  const { store, actions } = ctx;
  const headId = nextId('cam-h');

  const video = /** @type {HTMLVideoElement} */ (document.getElementById('camera-video'));
  const canvas = h('canvas', { class: 'cam__canvas is-mirrored', role: 'img', 'aria-label': T.camCanvasLabel });
  const surface = createSurface(canvas);

  const sim = h('p', { class: 'chip chip--sim cam__sim', hidden: true }, T.simLabel);
  const poseDot = h('i', { class: 'chip__live', 'aria-hidden': 'true', hidden: true });
  const poseTxt = h('span');
  const poseLong = h('span', { class: 'tag-long' });
  const poseVal = h('span');
  const pose = h('span', { class: 'chip cam__pose' }, poseDot, h('span', null, poseTxt, poseLong, poseVal));
  const fpsTxt = h('span');
  const latTxt = h('span');
  const fps = h('span', { class: 'chip cam__fps' }, h('span', null, fpsTxt, h('span', { class: 'cam__lat' }, latTxt, h('span', { class: 'tag-long' }, ` ${T.latency}`))));
  const faceIcon = icon('shield', 'ic--sm');
  const faceTxt = h('span');
  const face = h('span', { class: 'chip cam__face', hidden: true }, faceIcon, faceTxt);

  /** @type {{el: HTMLElement, fillEl: HTMLElement}[]} */
  const meters = FINGER_NAMES.map((name, i) => {
    const fillEl = h('i', { class: 'meter__fill' });
    const el = h('span', { class: 'meter', role: 'meter', 'aria-label': M.meterSr(name, 0), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 },
      h('span', { class: 'meter__track' }, fillEl), h('span', { class: 'meter__lbl', 'aria-hidden': 'true' }, FINGER_LETTERS[i]));
    return { el, fillEl };
  });
  const metersBox = h('div', { class: 'meters is-empty', role: 'group', 'aria-label': T.metersLabel },
    h('span', { class: 'meters__cap', 'aria-hidden': 'true' }, T.metersCap), h('div', { class: 'meters__row' }, meters.map((m) => m.el)));
  const prompt = h('p', { class: 'cam__prompt', hidden: true });
  // where to hold the fist while the camera has not found a hand yet (decorative: the chip and the prompt say it)
  const guide = h('div', { class: 'cam__guide', hidden: true, 'aria-hidden': 'true' }, glyph(0));
  const gate = h('div', { class: 'gate', hidden: true });

  const el = h('section', { class: 'stage cam', 'aria-labelledby': headId },
    h('h2', { class: 'stage__tag cam__tag', id: headId }, h('i', { class: 'mk mk--you', 'aria-hidden': 'true' }), h('b', null, 'A'), h('span', { class: 'tag-long' }, T.camTag), h('span', { class: 'tag-short' }, T.camTagShort)),
    h('div', { class: 'cam__backdrop', 'aria-hidden': 'true' }),
    video, canvas, guide, sim,
    h('div', { class: 'cam__chips' }, pose, fps, face),
    metersBox, prompt, gate);

  // ---- chips
  store.subscribe((st) => ({
    source: st.boot.source, mode: st.mode,
    phase: st.engine ? st.engine.phase : 'IDLE', hand: st.mode === 'mindtwin' ? !!(st.twin && st.twin.present) : !!(st.engine && st.engine.handPresent),
    uF: st.engine && st.engine.phase === 'FLIGHT' && st.engine.hand && st.engine.hand.uF !== null ? Math.round(Math.min(1, Math.max(0, st.engine.hand.uF)) * 100) : null,
    move: st.result ? st.result.playerMove : undefined,
  }), (v) => {
    let text = T.poseSearching, dim = true, live = false, long = '', val = '';
    if (v.source === 'none') text = T.poseNoSource;
    else if (!v.hand) text = T.poseSearching;
    else if (v.mode === 'mindtwin') { text = T.poseSeen; dim = false; }
    else if (v.phase === 'PRIMING') { text = T.poseFist; dim = false; }
    else if (v.phase === 'ARMED') { text = T.poseArmed; dim = false; }
    else if (v.phase === 'FLIGHT') { text = T.poseOpening; if (v.uF !== null) { long = ` · ${T.lgFront}`; val = ` %${v.uF}`; } dim = false; live = true; }
    else if (v.phase === 'SETTLING') { text = T.poseLanded; dim = false; }
    else if (v.phase === 'RESOLVED' && v.move !== undefined) { text = v.move === null ? DASH : MOVE_UPPER[v.move]; dim = false; }
    else { text = T.poseSeen; dim = false; }
    setText(poseTxt, text); setText(poseLong, long); setText(poseVal, val);
    toggle(poseTxt, 'chip__dim', dim);
    show(poseDot, live);
    show(guide, v.source === 'camera' && !v.hand);
  });

  store.subscribe((st) => ({
    fps: st.perf.fps === null ? null : Math.round(st.perf.fps), lat: st.perf.latencyMs === null ? null : Math.round(st.perf.latencyMs),
    infer: st.perf.inferMs === null ? null : Math.round(st.perf.inferMs), source: st.boot.source, delegate: st.boot.delegate,
  }), (v) => {
    show(fps, v.source !== 'none');
    setText(fpsTxt, `${v.fps === null ? DASH : v.fps} ${T.fps}`);
    setText(latTxt, ` · ${v.lat === null ? DASH : v.lat} ${T.msUnit}`);
    toggle(fps, 'is-nolat', v.lat === null); // compact stages drop the unknown latency instead of showing a bare dash
    // where the hand tracker runs and what one frame costs: the first thing to look at when tracking lags
    setAttr(fps, 'title', v.source === 'camera' ? M.trackerTitle(v.delegate, v.infer) : null);
  });

  // the chip never claims more than is true: "on" while the private picture is painted, and a failed
  // painter hides the picture altogether
  let blurFailed = false;
  const syncFace = () => {
    const st = store.get();
    const on = st.settings.privacy;
    setText(faceTxt, !on ? T.faceOff : blurFailed ? T.faceFailed : T.faceOn);
    setAttr(face, 'title', on && !blurFailed ? T.faceOnTitle : null);
    toggle(face, 'chip--warn', !on || blurFailed);
    toggle(el, 'cam--noblur', on && blurFailed);
    // defence in depth: the video element itself is blurred too whenever privacy is on (CSS) - also while
    // the camera is starting and the tracker loads behind the 90 % opaque gate, and before the first paint
    toggle(el, 'cam--private', on);
  };
  store.subscribe((st) => ({ source: st.boot.source, on: st.settings.privacy }), (v) => {
    show(face, v.source === 'camera');
    if (!v.on || v.source !== 'camera') blurFailed = false;
    syncFace();
    show(sim, v.source === 'demo');
    setAttr(canvas, 'aria-label', v.source === 'demo' ? T.camCanvasDemoLabel : T.camCanvasLabel);
  });

  // ---- meters (thumb..pinky); MindTwin reads the twin's "now"
  store.subscribe((st) => (st.mode === 'mindtwin' ? (st.twin ? st.twin.now : null) : st.engine && st.engine.hand ? st.engine.hand.e : null), (e) => {
    toggle(metersBox, 'is-empty', !e);
    for (let i = 0; i < 5; i++) {
      const v = e && Number.isFinite(e[i]) ? Math.round(Math.min(1, Math.max(0, e[i])) * 100) : 0;
      setVar(meters[i].el, '--v', v);
      setAttr(meters[i].el, 'aria-valuenow', v);
      setAttr(meters[i].el, 'aria-valuetext', e ? null : DASH); // with a hand the percentage itself is the value
    }
  });

  // ---- prompt
  store.subscribe((st) => ({
    source: st.boot.source, mode: st.mode, rhythm: st.settings.rhythm,
    phase: st.engine ? st.engine.phase : 'IDLE', open: st.result !== null,
    twinHand: !!(st.twin && st.twin.present),
  }), (v) => {
    let text = '';
    if (v.source !== 'none' && !v.open) {
      if (v.mode === 'mindtwin') text = v.twinHand ? '' : T.promptTwin;
      else if (v.phase === 'IDLE') text = v.rhythm === 'metronome' ? T.promptMetronome : T.promptFree;
    }
    show(prompt, text !== '');
    if (text) setText(prompt, text);
  });

  // ---- camera gate
  let lastGate = '';
  const startCamera = (/** @type {string} */ deviceId) => { ctx.unlockAudio(); actions.startCamera(deviceId || undefined); };
  const startDemo = () => { ctx.unlockAudio(); actions.startDemo(); };

  store.subscribe((st) => st.boot, (boot) => {
    // the video is laid out as soon as the camera is being opened (frame callbacks need a rendered element);
    // the gate covers it until tracking has started
    show(video, boot.source === 'camera' || boot.camera === 'starting' || boot.camera === 'on');
    const kind = boot.source !== 'none' ? 'off' : boot.camera === 'error' ? 'error' : boot.camera === 'starting' || boot.camera === 'on' ? 'starting' : 'idle';
    toggle(el, 'cam--gated', kind !== 'off'); // chips, meters and prompt have nothing to say behind the gate
    const key = `${kind}|${boot.camera}|${boot.tracker}|${boot.cameraError ? boot.cameraError.code : ''}|${boot.devices.length}`;
    if (key === lastGate) return;
    const announceIt = kind !== lastGate.split('|')[0];
    lastGate = key;
    const hadFocus = gate.contains(document.activeElement);
    show(gate, kind !== 'off');
    toggle(gate, 'gate--error', kind === 'error');
    if (kind === 'off') { fill(gate); return; }

    if (kind === 'idle') {
      fill(gate, h('div', { class: 'gate__box' },
        icon('camera', 'ic--lg gate__icon'),
        h('h3', { class: 'gate__title' }, T.gateIdleTitle),
        h('p', { class: 'gate__text' }, T.gateIdleText),
        h('div', { class: 'gate__actions' },
          h('button', { class: 'btn btn--primary', type: 'button', on: { click: () => startCamera('') } }, icon('camera'), T.gateOpen),
          h('button', { class: 'btn', type: 'button', on: { click: startDemo } }, T.gateDemo))));
    } else if (kind === 'starting') {
      const camDone = boot.camera === 'on';
      const step = (/** @type {string} */ label, /** @type {'wait'|'load'|'done'|'fail'} */ state) => h('li', { class: `gate__step${state === 'done' ? ' is-done' : state === 'fail' ? ' is-fail' : ''}` },
        state === 'done' ? icon('check', 'ic--sm') : state === 'fail' ? icon('warning', 'ic--sm') : h('i', { class: 'spinner', 'aria-hidden': 'true' }),
        `${label}: ${state === 'done' ? T.gateStepReady : state === 'fail' ? T.gateStepFailed : state === 'load' ? T.gateStepLoading : T.gateStepWaiting}`);
      fill(gate, h('div', { class: 'gate__box' },
        h('h3', { class: 'gate__title' }, T.gateStartingTitle),
        h('ol', { class: 'gate__steps' },
          step(T.gateStepCamera, camDone ? 'done' : 'wait'),
          step(T.gateStepModel, boot.tracker === 'ready' ? 'done' : boot.tracker === 'error' ? 'fail' : 'load'))));
      if (announceIt) ctx.announce(T.liveCameraStarting);
    } else {
      const err = cameraError(boot.cameraError ? boot.cameraError.code : null);
      const select = boot.devices.length > 1
        ? h('select', { class: 'select', on: { change: (/** @type {Event} */ e) => startCamera(/** @type {HTMLSelectElement} */ (e.target).value) } },
          h('option', { value: '' }, T.gateDevice), boot.devices.map((d, i) => h('option', { value: d.id }, d.label || `${M.camera('')} ${i + 1}`)))
        : null;
      fill(gate, h('div', { class: 'gate__box' },
        icon('camera-off', 'ic--lg gate__icon'),
        h('h3', { class: 'gate__title' }, err.title),
        h('p', { class: 'gate__text' }, err.help),
        boot.cameraError && boot.cameraError.detail ? h('p', { class: 'gate__code' }, `${T.gateErrorDetail}: ${boot.cameraError.code} · ${boot.cameraError.detail.slice(0, 160)}`) : boot.cameraError ? h('p', { class: 'gate__code' }, boot.cameraError.code) : null,
        h('div', { class: 'gate__actions' },
          h('button', { class: 'btn btn--primary', type: 'button', on: { click: () => startCamera('') } }, icon('reset'), T.gateRetry),
          h('button', { class: 'btn', type: 'button', on: { click: startDemo } }, T.gateDemo)),
        select ? h('label', { class: 'gate__device' }, h('span', { class: 'field__label' }, T.gateDevice), select) : null));
      if (announceIt) ctx.announce(`${err.title}. ${err.help}`);
    }
    if (hadFocus) { const f = focusables(gate)[0]; if (f) f.focus(); }
  });

  // ---- overlay canvas (requestAnimationFrame)
  /** @type {any} */ let lastImage = null;
  let lastSource = 'none';
  let lastBlur = false;
  let blank = true;

  return {
    el,
    /** Called once per animation frame. */
    paint() {
      const f = ctx.frame();
      const dirty = surface.takeDirty();
      if (f.source === 'none') {
        if (!blank || dirty) { surface.beginRaw(); blank = true; }
        lastSource = 'none'; lastImage = null; lastBlur = false;
        return;
      }
      const p = f.source === 'camera' ? ctx.privacy() : null;
      // the tracked frame (its landmarks are the sharp window); the live element only before the first one
      const picture = f.picture ?? video;
      const blur = !!(p && p.enabled === true && (f.picture ? f.picture.width > 0 : video.videoWidth > 0));
      const wasBlur = lastBlur;
      lastBlur = blur;
      // without the private picture the canvas only changes when a new set of landmarks arrives - and once
      // when the private picture has just been switched off, which must clear it
      if (!blur && !wasBlur && !dirty && f.image === lastImage && f.source === lastSource) return;
      lastImage = f.image; lastSource = f.source;
      const c = surface.beginRaw();
      blank = false;
      if (blur && p) {
        c.save();
        try {
          // the whole frame defocused, the hand of this frame sharp (raw landmarks: no smoothing lag)
          p.draw(c, picture, canvas, f.raw ?? f.image);
          if (blurFailed) { blurFailed = false; syncFace(); }
        } catch (e) {
          // fail closed: a picture that cannot be made private is not shown; the skeleton still draws
          if (!blurFailed) { blurFailed = true; console.error('[beaTTer] privacy painter failed', e); syncFace(); }
        }
        c.restore();
      }
      if (!f.image) { blank = !blur; return; }
      surface.toCss();
      const cam = f.source === 'camera' && video.videoWidth > 0 && video.videoHeight > 0;
      const pr = cam ? projection(surface.w, surface.h, video.videoWidth, video.videoHeight, 'cover') : projection(surface.w, surface.h, 4, 3, 'contain');
      drawSkeleton(c, f.image, pr, theme(), { glow: true, box: true });
    },
  };
}
