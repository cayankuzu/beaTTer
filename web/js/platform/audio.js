// @ts-check
/**
 * beaTTer v4 — audio feedback (Web Audio blips + Turkish speech). Entirely optional: every method is a
 * no-op until `unlock()` has run inside a user gesture (autoplay policies) or when muted.
 *
 * Metronome clicks are scheduled on the AudioContext clock, so they are sample-accurate regardless of
 * main-thread load. Auditory beats are used on purpose: people synchronise to an auditory rhythm far more
 * precisely than to a flashing visual one [Repp2005].
 */

/** Tone presets: [startHz, endHz, durationS, gain, wave]. */
const TONES = Object.freeze({
  beat: [[587, 490, 0.11, 0.34, 'triangle'], [698, 587, 0.11, 0.34, 'triangle'], [880, 740, 0.11, 0.36, 'triangle'], [1046, 1175, 0.13, 0.40, 'triangle']],
  sealSoft: [520, 780, 0.08, 0.16, 'sine'],
  sealHard: [880, 1760, 0.12, 0.32, 'sine'],
  landing: [160, 42, 0.24, 0.48, 'sawtooth'],
  win: [330, 220, 0.3, 0.26, 'triangle'],
  lose: [523, 784, 0.3, 0.28, 'triangle'],
  tie: [440, 440, 0.18, 0.22, 'triangle'],
  foul: [240, 190, 0.24, 0.26, 'square'],
  mode: [420, 840, 0.12, 0.24, 'sine'],
});

const BEAT_WORDS = ['Taş', 'Kağıt', 'Makas', 'Vur'];
const MOVE_WORDS = ['Taş', 'Kağıt', 'Makas'];

export function createAudio() {
  /** @type {AudioContext|null} */ let ctx = null;
  /** @type {GainNode|null} */ let master = null;
  let muted = false;
  /** @type {SpeechSynthesisVoice|null} */ let voice = null;
  /** Keep a reference so Chromium GC never collects an active utterance mid-speech. */
  /** @type {SpeechSynthesisUtterance|null} */ let activeUtterance = null;
  /** Pending count-in: oscillators and speech timers that can still be cancelled. */
  /** @type {{nodes: OscillatorNode[], timers: any[]}} */ let countIn = { nodes: [], timers: [] };

  const pickVoice = () => {
    if (!('speechSynthesis' in window)) return;
    try {
      const voices = speechSynthesis.getVoices();
      voice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('tr') && v.localService)
        ?? voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('tr'))
        ?? null;
    } catch { /* ignore */ }
  };

  const unlock = () => {
    try {
      if (!ctx && typeof window !== 'undefined') {
        const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
        if (AC) {
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.95;
          master.connect(ctx.destination);
        }
      }
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (!voice) {
          pickVoice();
          if (!voice) speechSynthesis.addEventListener('voiceschanged', pickVoice, { once: true });
        }
        if (speechSynthesis.paused) speechSynthesis.resume();
      }
    } catch { /* audio is optional */ }
  };

  /** @param {any[]} tone @param {number} [delayS] */
  const play = (tone, delayS = 0) => {
    if (muted) return null;
    if (!ctx) unlock();
    if (!ctx || !master) return null;
    if (ctx.state === 'suspended') { try { ctx.resume().catch(() => {}); } catch { /* ignore */ } }
    try {
      const [f0, f1, dur, gain, wave] = tone;
      const t = ctx.currentTime + Math.max(0, delayS);
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + dur + 0.02);
      return osc;
    } catch { /* ignore */ }
    return null;
  };

  /** @param {string} text @param {number} [delayMs] @param {number} [rate] */
  const speak = (text, delayMs = 0, rate = 1.38) => {
    if (muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const say = () => {
      if (muted) return; // muted while the word was waiting
      try {
        if (!voice) pickVoice();
        if (speechSynthesis.paused) speechSynthesis.resume();
        if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'tr-TR';
        u.rate = rate;
        u.volume = 1;
        if (voice) u.voice = voice;
        activeUtterance = u;
        u.onend = () => { if (activeUtterance === u) activeUtterance = null; };
        u.onerror = () => { if (activeUtterance === u) activeUtterance = null; };
        speechSynthesis.speak(u);
      } catch { /* ignore */ }
    };
    if (delayMs > 0) return setTimeout(say, delayMs);
    say();
    return null;
  };

  const cancelMetronome = () => {
    for (const n of countIn.nodes) { try { n.stop(); n.disconnect(); } catch { /* already stopped */ } }
    for (const t of countIn.timers) clearTimeout(t);
    countIn = { nodes: [], timers: [] };
  };

  return {
    unlock,
    /** @param {boolean} m */
    setMuted(m) { muted = !!m; if (muted) { cancelMetronome(); if (typeof window !== 'undefined' && 'speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch { /* ignore */ } } } },
    get muted() { return muted; },
    /** A detected (player-led) beat. @param {number} n 1-based @param {boolean} [withVoice] */
    beat(n, withVoice = false) {
      const idx = Math.min(3, Math.max(0, n - 1));
      play(TONES.beat[idx]);
      if (withVoice) speak(BEAT_WORDS[idx], 0, 1.5);
    },
    /** Cue when the throw stroke itself begins after priming beats. @param {boolean} [withVoice] @param {number} [primeBeats] */
    throwCue(withVoice = false, primeBeats = 3) {
      play(TONES.beat[3]);
      if (withVoice) speak(primeBeats === 2 ? BEAT_WORDS[2] : BEAT_WORDS[3], 0, 1.5);
    },
    /** A seal was made. @param {boolean} kinematic false = the pre-movement behavioural seal */
    seal(kinematic) { play(kinematic ? TONES.sealHard : TONES.sealSoft); },
    landing() { play(TONES.landing); },
    /** @param {string} verdict */
    verdict(verdict) { play(verdict === 'AI' ? TONES.win : verdict === 'PLAYER' ? TONES.lose : verdict === 'TIE' ? TONES.tie : TONES.foul, 0.12); },
    /** @param {any} result RoundResult */
    speakVerdict(result) {
      if (result.verdict === 'AI') speak(`${MOVE_WORDS[result.aiMove]}. Yapay zekâ kazandı.`, 250);
      else if (result.verdict === 'PLAYER') speak('Tebrikler, kazandın.', 250);
      else if (result.verdict === 'TIE') speak('Berabere.', 250);
      else if (result.verdict === 'FOUL_LATE') speak('Geç hamle. Tur tekrar.', 250);
      else speak('Tur geçersiz. Tekrar.', 250);
    },
    modeSwitch() { play(TONES.mode); },
    /**
     * Schedule the count-in clicks (and optionally the spoken beat words).
     * @param {number[]} offsetsMs delays from now for each beat (the last one is the throw)
     * @param {boolean} withVoice
     */
    scheduleMetronome(offsetsMs, withVoice) {
      cancelMetronome(); // one count-in at a time
      offsetsMs.forEach((ms, i) => {
        const last = i === offsetsMs.length - 1;
        const osc = play(TONES.beat[last ? 3 : Math.min(2, i)], ms / 1000);
        if (osc) countIn.nodes.push(osc);
        if (withVoice) { const timer = speak(BEAT_WORDS[last ? 3 : Math.min(2, i)], Math.max(0, ms - 60)); if (timer !== null) countIn.timers.push(timer); }
      });
    },
    /** Silence a count-in that was scheduled but is no longer wanted (abort, mode or settings change). */
    cancelMetronome,
    speak,
  };
}
