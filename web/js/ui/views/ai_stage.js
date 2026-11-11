// @ts-check
/**
 * beaTTer v4 — AI stage: the mechanical hand, the seal badge and the belief bars (RPS), or the digital
 * twin with its measured forecast skill (MindTwin).
 *
 * Invariant: nothing here can show the AI's move before `state.result` exists. The engine snapshot does
 * not contain it; the hand stays a fist and the seal shows only the published hash until the reveal.
 */

import { h, s, setText, setAttr, setVar, show, toggle, nextId } from '../dom.js';
import { glyph, setSymbol, glyphId } from '../icons.js';
import { T, M, fmt, MOVE_NAMES, RULE_NAMES, DASH, expertLabel } from '../strings_tr.js';
import { createSurface } from '../render/canvas.js';
import { createHandRenderer, POSE_FIST, POSE_MOVES } from '../render/hand_renderer.js';
import { theme } from '../render/theme.js';

/** @typedef {import('../index.js').UIContext} UIContext */

/** Three belief rows (rock, paper, scissors). @param {string} cls */
export function beliefRows(cls = '') {
  return MOVE_NAMES.map((name, i) => {
    const fillEl = h('span', { class: 'bar__fill' });
    // the tick marks the behavioural prior and carries its number (the meter's aria-valuetext says it too)
    const tickVal = h('span');
    const tick = h('span', { class: 'bar__tick', 'aria-hidden': 'true' }, h('b', null, h('i', null, `${T.beliefKey} `), tickVal));
    const bar = h('div', { class: `bar ${cls}`.trim(), role: 'meter', 'aria-label': name, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, fillEl, tick);
    const val = h('span', { class: 'brow__val' }, DASH);
    const row = h('div', { class: 'brow' }, glyph(i), h('span', { class: 'brow__name', 'aria-hidden': 'true' }, name), bar, val);
    return { row, bar, val, tickVal };
  });
}

/**
 * Write a distribution into belief rows. @param {ReturnType<typeof beliefRows>} rows
 * @param {number[]|null} p values shown by the bars @param {number[]|null} prior tick positions
 * @param {{veiled?: boolean, mark?: boolean}} [o]
 */
export function setBelief(rows, p, prior, o = {}) {
  let top = -1;
  if (p && !o.veiled && o.mark !== false) { top = 0; for (let i = 1; i < 3; i++) if (p[i] > p[top]) top = i; if (p.every((v) => Math.abs(v - p[top]) < 1e-9)) top = -1; }
  rows.forEach((r, i) => {
    const v = p && Number.isFinite(p[i]) ? Math.round(p[i] * 100) : null;
    const pr = prior && Number.isFinite(prior[i]) ? Math.round(prior[i] * 100) : null;
    setVar(r.bar, '--v', o.veiled || v === null ? 0 : v);
    setVar(r.bar, '--p', pr === null ? 0 : pr);
    toggle(r.bar, 'no-tick', pr === null || !!o.veiled);
    setText(r.tickVal, pr === null ? '' : `%${pr}`);
    setText(r.val, o.veiled ? T.beliefVeiled : v === null ? DASH : `%${v}`);
    setAttr(r.bar, 'aria-valuenow', o.veiled || v === null ? null : v);
    setAttr(r.bar, 'aria-valuetext', o.veiled ? T.beliefVeiled : v === null ? DASH : pr === null ? `%${v}` : `%${v}, ${T.beliefKey} %${pr}`);
    toggle(r.row, 'is-top', i === top);
  });
}

/** @param {UIContext} ctx */
export function mountAiStage(ctx) {
  const { store } = ctx;
  const headId = nextId('ai-h'), belId = nextId('bel-h'), twinId = nextId('twin-h');

  // ---- hand
  const canvas = h('canvas', { class: 'ai__canvas', role: 'img', 'aria-label': T.aiHandLabelFist });
  const surface = createSurface(canvas);
  const hand = createHandRenderer();
  const cap = h('p', { class: 'ai__cap' });

  // ---- seal badge
  const stampGlyph = s('use', { class: 'seal__lock', href: '#g-rock', x: 17, y: 17, width: 22, height: 22 });
  const stamp = h('div', { class: 'seal__stamp', 'aria-hidden': 'true' },
    s('svg', { viewBox: '0 0 56 56' },
      s('circle', { class: 'seal__dial seal__dial--ticks', cx: 28, cy: 28, r: 24.5 }), s('circle', { class: 'seal__dial', cx: 28, cy: 28, r: 19 }),
      s('g', { class: 'seal__g-open' }, s('rect', { class: 'seal__lock', x: 21, y: 26.5, width: 14, height: 10.5, rx: 2 }), s('path', { class: 'seal__lock', d: 'M24 26.5v-3.2a4 4 0 0 1 7.6-1.8' })),
      s('g', { class: 'seal__g-closed' }, s('rect', { class: 'seal__lock seal__lock--body', x: 21, y: 26.5, width: 14, height: 10.5, rx: 2 }), s('path', { class: 'seal__lock', d: 'M24 26.5v-3.2a4 4 0 0 1 8 0v3.2' })),
      s('g', { class: 'seal__g-glyph' }, stampGlyph)));
  const sealTitle = h('p', { class: 'seal__title' });
  const sealHashSr = h('span', { class: 'sr-only' }, T.sealHashSr);
  const sealHashTxt = h('span');
  const sealHash = h('p', { class: 'seal__hash', hidden: true }, sealHashSr, sealHashTxt);
  const sealNote = h('p', { class: 'seal__note' }, T.sealNoneNote);
  const factA = h('span'), factB = h('b'), factSeq = h('span', { class: 'seal__seq' });
  const sealFacts = h('p', { class: 'seal__facts', hidden: true }, factA, h('span', null, factB), factSeq);
  const seal = h('div', { class: 'seal' }, stamp, h('div', { class: 'seal__main' }, sealTitle, sealHash, sealNote), sealFacts);

  // ---- belief
  const rows = beliefRows();
  const belTitle = h('span');
  const expert = h('p', { class: 'belief__expert' });
  const belief = h('div', { class: 'belief belief--live', role: 'group', 'aria-labelledby': belId },
    h('div', { class: 'belief__head' },
      h('h3', { class: 'belief__title', id: belId }, belTitle, h('span', { class: 'belief__sub' }, T.beliefSub)),
      h('span', { class: 'belief__key' }, h('i', { 'aria-hidden': 'true' }), T.beliefKey)),
    rows.map((r) => r.row), expert);

  // ---- MindTwin panel
  const twNum = h('span', { class: 'twin__num' }, DASH);
  const twN = h('dd'), twF = h('dd'), twP = h('dd'), twA = h('dd'), twH = h('dd');
  const twEmpty = h('p', { class: 'twin__note', hidden: true }, T.twinNoData);
  const twShort = h('p', { class: 'twin__note twin__note--short' }, T.twinNoteShort);
  const twin = h('div', { class: 'twin', hidden: true, role: 'group', 'aria-labelledby': twinId },
    h('h3', { class: 'twin__title', id: twinId }, T.twinTitle),
    h('p', { class: 'twin__hero' }, twNum, h('span', { class: 'eyebrow' }, T.twinSkill)),
    h('dl', { class: 'kv' },
      h('dt', null, T.twinN), twN, h('dt', null, T.twinMaeForecast), twF, h('dt', null, T.twinMaePersist), twP,
      h('dt', null, T.twinAgreement), twA, h('dt', null, T.twinHorizon), twH),
    twEmpty, twShort, h('p', { class: 'twin__note twin__note--long' }, T.twinNote));

  const tagLong = h('span', { class: 'tag-long' }), tagShort = h('span', { class: 'tag-short' });
  const meta = h('p', { class: 'ai__meta' });
  const panel = h('div', { class: 'ai__panel' }, seal, belief, twin);
  const el = h('section', { class: 'stage ai', 'aria-labelledby': headId },
    h('h2', { class: 'stage__tag', id: headId }, h('i', { class: 'mk mk--ai', 'aria-hidden': 'true' }), h('b', null, 'B'), tagLong, tagShort),
    meta,
    h('div', { class: 'ai__body' }, h('div', { class: 'ai__hand' }, canvas, cap), panel));

  // ---- mode
  store.subscribe((st) => ({ mode: st.mode, rules: st.engine ? st.engine.rules : st.settings.rules }), ({ mode, rules }) => {
    const tw = mode === 'mindtwin';
    setText(tagLong, tw ? T.twinTagLong : T.aiTagLong);
    setText(tagShort, tw ? T.twinTagShort : T.aiTagShort);
    show(seal, !tw); show(belief, !tw); show(twin, tw);
    toggle(el, 'ai--twin', tw);
    setText(meta, tw ? '' : `${T.aiMetaRules}${(RULE_NAMES[rules] ?? rules).toLocaleLowerCase('tr')}`);
  });

  // ---- hand pose, port, caption (RPS)
  let lastBeat = 0;
  let lastPhase = 'IDLE';
  /** @type {any} */ let lastResult = null;
  store.subscribe((st) => ({
    mode: st.mode, source: st.boot.source, result: st.result,
    phase: st.engine ? st.engine.phase : 'IDLE', beat: st.engine ? st.engine.beat : 0,
    sealed: !!(st.engine && st.engine.standing),
  }), (v) => {
    if (v.mode !== 'rps') { lastBeat = 0; lastPhase = 'IDLE'; lastResult = null; return; }
    hand.setGhost(null);
    if (v.result) {
      hand.setTarget(POSE_MOVES[v.result.aiMove] ?? POSE_FIST);
      hand.setPort(v.result.sealOk && v.result.chainOk ? 'revealed' : 'failed');
      if (v.result !== lastResult) hand.kick(1.25);
      setText(cap, M.aiCapRevealed(v.result.aiMove));
      setAttr(canvas, 'aria-label', M.aiHandLabel(v.result.aiMove));
    } else {
      hand.setTarget(POSE_FIST);
      hand.setPort(v.sealed ? 'sealed' : 'idle');
      if (v.beat > lastBeat) hand.kick(1);
      else if (v.phase === 'FLIGHT' && lastPhase !== 'FLIGHT') hand.kick(0.7);
      setText(cap, v.source === 'none' ? T.aiCapNoSource : v.sealed ? T.aiCapSealed : v.phase === 'PRIMING' ? T.aiCapPriming : v.phase === 'FLIGHT' || v.phase === 'ARMED' ? T.aiCapFlight : T.aiCapIdle);
      setAttr(canvas, 'aria-label', T.aiHandLabelFist);
    }
    lastBeat = v.beat; lastPhase = v.phase; lastResult = v.result;
  });

  // ---- seal badge
  store.subscribe((st) => ({ standing: st.engine ? st.engine.standing : null, result: st.result, thought: st.engine ? st.engine.thought : null, mode: st.mode }), (v) => {
    if (v.mode !== 'rps') return;
    const r = v.result, sd = v.standing;
    toggle(seal, 'seal--on', !r && !!sd);
    toggle(seal, 'seal--open', !!r && r.sealOk && r.chainOk);
    toggle(seal, 'seal--bad', !!r && !(r.sealOk && r.chainOk));
    show(sealHash, !!r || !!sd); show(sealFacts, !!r || !!sd); show(sealNote, !r && !sd);
    if (r) {
      const judged = r.commits.find((/** @type {any} */ c) => c.seq === r.judgedSeq) ?? null;
      setText(sealTitle, M.revealed(r.aiMove));
      stampGlyph.setAttribute('href', `#${glyphId(r.aiMove)}`);
      setText(sealHashTxt, fmt.hash8(judged ? judged.short : null));
      setText(factA, M.sealBefore(r.timing.leadToLandingMs));
      setText(factB, r.sealOk && r.chainOk ? T.sealVerified : T.sealFailed);
      setText(factSeq, `#${r.judgedSeq}`);
    } else if (sd) {
      const ms = v.thought && v.thought.params && Number.isFinite(v.thought.params.msToLanding) ? v.thought.params.msToLanding : null;
      setText(sealTitle, T.sealOn);
      setText(sealHashTxt, fmt.hash8(sd.short));
      setText(factA, M.sealToLanding(ms));
      setText(factB, M.revisions(sd.revisions));
      setText(factSeq, `#${sd.seq}`);
    } else {
      setText(sealTitle, T.sealNone);
    }
  });

  // ---- belief bars + top expert
  store.subscribe((st) => ({ e: st.engine, live: st.settings.liveBeliefs, mode: st.mode, source: st.boot.source }), ({ e, live, mode, source }) => {
    if (mode !== 'rps') return;
    const phase = e ? e.phase : 'IDLE';
    const veiled = !live && (phase === 'PRIMING' || phase === 'FLIGHT' || phase === 'ARMED' || phase === 'SETTLING');
    const post = e && e.post ? e.post : null, prior = e && e.prior ? e.prior : null;
    const known = source !== 'none' || post !== null;
    setBelief(rows, known ? post ?? prior : null, post && prior ? prior : null, { veiled });
    setText(belTitle, veiled ? T.beliefVeiledTitle : post ? T.beliefLive : T.beliefPrior);
    toggle(belief, 'is-prior', !post && !veiled);
    toggle(belief, 'is-veiled', veiled);
    const top = e && e.topExperts && e.topExperts[0] ? e.topExperts[0] : null;
    setText(expert, veiled || !known ? '' : top ? `${T.expertLead}${expertLabel(top.name, top.rotation)} · ${T.weight} ${fmt.pct(top.weight)}` : T.expertNone);
  });

  // ---- MindTwin
  store.subscribe((st) => ({ mode: st.mode, twin: st.twin }), ({ mode, twin: tw }) => {
    if (mode !== 'mindtwin') return;
    const sk = tw ? tw.skill : null;
    const has = !!(tw && tw.present && tw.ahead && tw.now);
    hand.setPort('none');
    if (has) { hand.setTarget(tw.ahead, { fast: true }); hand.setGhost(tw.now); } else { hand.setTarget(POSE_FIST); hand.setGhost(null); }
    setText(cap, T.twinCap);
    setAttr(canvas, 'aria-label', M.twinHandLabel(sk ? sk.horizonMs : 0));
    setText(twNum, sk && sk.skill !== null ? fmt.num(sk.skill, 2) : DASH);
    setText(twN, sk ? M.nEq(sk.n) : DASH);
    setText(twF, sk ? fmt.pct(sk.maeForecast, 1) : DASH);
    setText(twP, sk ? fmt.pct(sk.maePersistence, 1) : DASH);
    setText(twA, sk ? fmt.pct(sk.agreement) : DASH);
    setText(twH, sk ? fmt.ms(sk.horizonMs) : DASH);
    const none = !sk || sk.n === 0;
    show(twEmpty, none);
    show(twShort, !none); // compact stages show one note at a time: "no data yet" or what the number means
  });

  let lastT = 0;
  return {
    el,
    /** Called once per animation frame. @param {number} now performance.now() */
    paint(now) {
      const dt = lastT ? now - lastT : 16;
      lastT = now;
      const reduced = ctx.reducedMotion();
      const changed = hand.step(dt, reduced);
      const dirty = surface.takeDirty();
      if (!changed && !dirty) return;
      const c = surface.begin();
      hand.draw(c, surface.w, surface.h, theme(), { timeMs: now, reduced, dim: store.get().boot.source === 'none' });
    },
    invalidate() { surface.invalidate(); },
  };
}
