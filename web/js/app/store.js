// @ts-check
/**
 * beaTTer v4 — tiny observable store.
 *
 * One immutable-by-convention state object; `set(patch)` shallow-merges and notifies subscribers whose
 * selected slice changed (strict equality, or shallow equality for arrays/plain objects one level deep).
 * Views subscribe to the slices they render; nothing else is shared between them.
 */

/** @param {any} a @param {any} b */
function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

/**
 * @template T
 * @param {T} initial
 */
export function createStore(initial) {
  let state = initial;
  /** @type {Set<{sel:(s:T)=>any, fn:(v:any, s:T)=>void, last:any}>} */
  const subs = new Set();
  let notifying = false, dirty = false;

  const notify = () => {
    if (notifying) { dirty = true; return; }
    notifying = true;
    try {
      do {
        dirty = false;
        for (const s of subs) {
          const v = s.sel(state);
          if (!shallowEqual(v, s.last)) { s.last = v; try { s.fn(v, state); } catch (e) { console.error('[beaTTer] view error', e); } }
        }
      } while (dirty);
    } finally { notifying = false; }
  };

  return {
    get: () => state,
    /** @param {Partial<T>} patch */
    set(patch) { state = { ...state, ...patch }; notify(); },
    /**
     * @template V
     * @param {(s:T)=>V} selector @param {(v:V, s:T)=>void} listener called immediately and on change
     * @returns {() => void} unsubscribe
     */
    subscribe(selector, listener) {
      const entry = { sel: selector, fn: listener, last: selector(state) };
      subs.add(entry);
      try { listener(entry.last, state); } catch (e) { console.error('[beaTTer] view error', e); }
      return () => subs.delete(entry);
    },
  };
}

/**
 * The application state. Everything a view may render is here; high-frequency drawing data (landmarks,
 * video) is read through `controller.frame()` instead.
 * @param {any} settings sanitised settings
 */
export function initialState(settings) {
  return {
    /** boot / device status */
    boot: {
      tracker: /** @type {'idle'|'loading'|'ready'|'error'} */ ('idle'),
      camera: /** @type {'idle'|'starting'|'on'|'error'} */ ('idle'),
      cameraError: /** @type {null|{code:string, detail:string}} */ (null),
      source: /** @type {'none'|'camera'|'demo'} */ ('none'),
      storage: true,
      /** face detector behind the privacy blur: 'ready' = detected faces, 'approx' = fallback zones only */
      face: /** @type {'idle'|'loading'|'ready'|'approx'} */ ('idle'),
      devices: /** @type {{id:string, label:string}[]} */ ([]),
    },
    settings,
    mode: /** @type {'rps'|'mindtwin'} */ ('rps'),
    /** latest EngineSnapshot (core/round_engine.js) or null before the first frame */
    engine: /** @type {any} */ (null),
    /** live trace of the round in progress, for the timeline strip */
    live: emptyLive(),
    /** RoundResult being shown in the report sheet (null = sheet closed) */
    result: /** @type {any} */ (null),
    series: emptySeries(settings.seriesLength),
    /** player.metrics.summary() and player.profile() after each judged round */
    metrics: /** @type {any} */ (null),
    profile: /** @type {any} */ (null),
    /** MindTwin: { now:number[5], ahead:number[5], skill:{n, maeForecast, maePersistence, skill, agreement, horizonMs} } */
    twin: /** @type {any} */ (null),
    perf: { fps: /** @type {number|null} */ (null), inferMs: /** @type {number|null} */ (null), engineMs: /** @type {number|null} */ (null), latencyMs: /** @type {number|null} */ (null) },
    player: { id: '', tag: '', rounds: 0 },
    cloud: /** @type {'off'|'connecting'|'online'|'offline'} */ ('off'),
    ui: {
      panel: /** @type {null|'lab'|'settings'|'onboarding'|'series'|'rules'} */ (null),
      toast: /** @type {null|{id:number, code:string, params:any}} */ (null),
    },
  };
}

export function emptyLive() {
  return {
    round: 0,
    t0: /** @type {number|null} */ (null),
    t: /** @type {number[]} */ ([]),
    cy: /** @type {number[]} */ ([]),
    uF: /** @type {number[]} */ ([]),
    uB: /** @type {number[]} */ ([]),
    beats: /** @type {{n:number, t:number}[]} */ ([]),
    commits: /** @type {{seq:number, t:number, reason:string, short:string}[]} */ ([]),
    flightT: /** @type {number|null} */ (null),
    landingT: /** @type {number|null} */ (null),
    tLandHat: /** @type {number|null} */ (null),
    now: /** @type {number|null} */ (null),
  };
}

/** @param {number} length */
export function emptySeries(length) {
  return { length, ai: 0, player: 0, ties: 0, fouls: 0, rounds: /** @type {any[]} */ ([]), done: false };
}
