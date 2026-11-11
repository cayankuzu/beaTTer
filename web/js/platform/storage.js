// @ts-check
/**
 * beaTTer v4 — persistence adapter (browser localStorage, with an in-memory fallback).
 *
 * Keys:  beatter.v4.settings | beatter.v4.profiles | beatter.v4.player.<id>
 * Models of the previous versions (jm_v2_*, beatter_player_profile_v3_*) are deliberately NOT migrated:
 * their data came from rounds in which the AI's move was the counter of the pose visible at the strike,
 * so importing them would contaminate the new statistics. Only the anonymous player id is reused.
 */

export const DEFAULT_SETTINGS = Object.freeze({
  rules: 'turnuva',          // referee preset: 'serbest' | 'standart' | 'turnuva'
  rhythm: 'free',            // 'free' (player-led pumping) | 'metronome' (app-led count-in)
  primeBeats: 3,             // 3 | 2 | 0
  metronomeBpm: 100,
  sensitivity: 3,            // 1..5 -> stroke threshold multiplier
  privacy: true,             // face blur
  muted: false,
  voice: true,
  liveBeliefs: true,         // show the live posterior during the round
  cloud: false,              // optional anonymous statistics sync - opt-in (privacy by design)
  freezeLeadMs: 0,           // advanced: decision freeze before landing
  reducedMotion: 'auto',     // 'auto' | 'on' | 'off'
  seriesLength: 5,
  onboarded: false,
});

const KEY = { settings: 'beatter.v4.settings', profiles: 'beatter.v4.profiles', player: 'beatter.v4.player.', legacyId: 'beatter_player_fp' };

/** @param {any} v @param {any} d */
const oneOf = (v, d, /** @type {any[]} */ allowed) => (allowed.includes(v) ? v : d);

/** Validate a settings object field by field (anything unknown falls back to the default). @param {any} raw */
export function sanitiseSettings(raw) {
  const d = DEFAULT_SETTINGS, r = raw && typeof raw === 'object' ? raw : {};
  const num = (/** @type {any} */ v, /** @type {number} */ lo, /** @type {number} */ hi, /** @type {number} */ def) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
  const bool = (/** @type {any} */ v, /** @type {boolean} */ def) => (typeof v === 'boolean' ? v : def);
  return {
    rules: oneOf(r.rules, d.rules, ['serbest', 'standart', 'turnuva']),
    rhythm: oneOf(r.rhythm, d.rhythm, ['free', 'metronome']),
    primeBeats: oneOf(r.primeBeats, d.primeBeats, [3, 2, 0]),
    metronomeBpm: Math.round(num(r.metronomeBpm, 60, 160, d.metronomeBpm)),
    sensitivity: Math.round(num(r.sensitivity, 1, 5, d.sensitivity)),
    privacy: bool(r.privacy, d.privacy),
    muted: bool(r.muted, d.muted),
    voice: bool(r.voice, d.voice),
    liveBeliefs: bool(r.liveBeliefs, d.liveBeliefs),
    cloud: bool(r.cloud, d.cloud),
    freezeLeadMs: Math.round(num(r.freezeLeadMs, 0, 300, d.freezeLeadMs)),
    reducedMotion: oneOf(r.reducedMotion, d.reducedMotion, ['auto', 'on', 'off']),
    seriesLength: oneOf(r.seriesLength, d.seriesLength, [3, 5, 7, 9]),
    onboarded: bool(r.onboarded, d.onboarded),
  };
}

/**
 * @param {Storage|null} [backend] defaults to window.localStorage when usable
 */
export function createStorage(backend) {
  /** @type {Map<string,string>} */ const memory = new Map();
  let ls = backend ?? null;
  let available = false;
  try {
    if (!ls && typeof localStorage !== 'undefined') ls = localStorage;
    if (ls) { ls.setItem('beatter.v4.probe', '1'); ls.removeItem('beatter.v4.probe'); available = true; }
  } catch { available = false; }

  // `memory` mirrors every value this session has read or written. If the backend starts failing
  // (quota, storage revoked), reads fall back to the mirror first and to the backend second, so one
  // failed write never turns the current settings and profile into defaults.
  /** @type {Set<string>} */ const removed = new Set();
  const read = (/** @type {string} */ k) => {
    try {
      let v = memory.has(k) ? /** @type {string} */ (memory.get(k)) : null;
      if (v === null && ls && !removed.has(k)) { try { v = ls.getItem(k); } catch { v = null; } if (v !== null) memory.set(k, v); }
      return v === null ? null : JSON.parse(v);
    } catch { return null; }
  };
  const write = (/** @type {string} */ k, /** @type {any} */ v) => {
    const text = JSON.stringify(v);
    memory.set(k, text); removed.delete(k);
    if (!ls) return true;
    try { ls.setItem(k, text); available = true; return true; } catch { available = false; return false; }
  };
  const remove = (/** @type {string} */ k) => { memory.delete(k); removed.add(k); try { if (ls) ls.removeItem(k); } catch { /* ignore */ } };

  const newId = () => {
    try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch { /* insecure context */ }
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  };
  const tagOf = (/** @type {string} */ id) => `Oyuncu #${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;

  /** @returns {{active:string, list:{id:string, tag:string, createdAt:number}[]}} */
  const profiles = () => {
    const p = read(KEY.profiles);
    if (p && typeof p.active === 'string' && Array.isArray(p.list) && p.list.some((/** @type {any} */ x) => x && x.id === p.active)) {
      return { active: p.active, list: p.list.filter((/** @type {any} */ x) => x && typeof x.id === 'string').map((/** @type {any} */ x) => ({ id: x.id, tag: typeof x.tag === 'string' ? x.tag.slice(0, 24) : tagOf(x.id), createdAt: Number(x.createdAt) || 0 })) };
    }
    // first run: keep the anonymous id of earlier versions so the player tag stays the same
    let id = null;
    try { id = ls ? ls.getItem(KEY.legacyId) : null; } catch { id = null; }
    if (typeof id !== 'string' || id.length < 8 || id.length > 64) id = newId();
    const fresh = { active: id, list: [{ id, tag: tagOf(id), createdAt: Date.now() }] };
    write(KEY.profiles, fresh);
    return fresh;
  };

  /** @type {Map<string, ReturnType<typeof setTimeout>>} */ const timers = new Map();
  /** @type {Map<string, any>} */ const pending = new Map();
  const flush = (/** @type {string} */ id) => { if (pending.has(id)) { write(KEY.player + id, pending.get(id)); pending.delete(id); } timers.delete(id); };

  return {
    get available() { return available; },
    getSettings: () => sanitiseSettings(read(KEY.settings)),
    /** @param {Partial<typeof DEFAULT_SETTINGS>} patch */
    setSettings(patch) { const next = sanitiseSettings({ ...sanitiseSettings(read(KEY.settings)), ...patch }); write(KEY.settings, next); return next; },
    listProfiles: () => profiles().list,
    activeProfileId: () => profiles().active,
    /** @param {string} id */
    setActiveProfile(id) { const p = profiles(); if (p.list.some((x) => x.id === id)) { p.active = id; write(KEY.profiles, p); return true; } return false; },
    /** @param {string} [tag] */
    createProfile(tag) { const p = profiles(); const id = newId(); p.list.push({ id, tag: (tag && tag.trim().slice(0, 24)) || tagOf(id), createdAt: Date.now() }); p.active = id; write(KEY.profiles, p); return id; },
    /** @param {string} id */
    deleteProfile(id) {
      const p = profiles();
      if (p.list.length <= 1) return false;
      p.list = p.list.filter((x) => x.id !== id);
      if (p.active === id) p.active = p.list[0].id;
      write(KEY.profiles, p); remove(KEY.player + id); pending.delete(id);
      return true;
    },
    /** @param {string} id */
    loadPlayer: (id) => read(KEY.player + id),
    /** Debounced save of a player model. @param {string} id @param {any} json */
    savePlayer(id, json) {
      pending.set(id, json);
      if (!timers.has(id)) timers.set(id, setTimeout(() => flush(id), 500));
    },
    /** @param {string} id */
    clearPlayer(id) { pending.delete(id); remove(KEY.player + id); },
    flushAll() { for (const id of [...pending.keys()]) { const t = timers.get(id); if (t) clearTimeout(t); flush(id); } },
    tagOf,
  };
}
