// @ts-check
/**
 * beaTTer v4 — laboratory (wide drawer): small-multiple cards built from `state.metrics`
 * (core/metrics.js summary()) and `state.profile` (core/player_model.js profile()).
 *
 * Honesty: every statistic shows its n and, where the data give one, its confidence interval; empty
 * states are explicit; demo numbers are labelled as simulation.
 */

import { h, fill, nextId, setText, show } from '../dom.js';
import { icon, glyph, pip } from '../icons.js';
import { T, M, fmt, DASH, MOVE_NAMES } from '../strings_tr.js';
import { createDialog, dialogHead, simChip, createSwitch } from './dialog.js';
import { intervalBar, leadHistogram, sparkline, reliability } from '../render/charts.js';

/** @typedef {import('../index.js').UIContext} UIContext */

/** Literature baseline, % stay / up / down after a win, a tie and a loss (Forder & Dyson 2016). */
const LITERATURE = [[42, 29, 28], [29, 37, 33], [21, 39, 39]];
const THIN_N = 10;

/** @param {string} idx @param {string} title @param {string} meta @param {string} [cls] */
function card(idx, title, meta, cls = '') {
  const id = nextId('lab-card');
  const metaEl = h('span', { class: 'card__meta' }, meta);
  const el = h('article', { class: `card ${cls}`.trim(), 'aria-labelledby': id },
    h('header', { class: 'card__head' }, h('span', { class: 'card__ix', 'aria-hidden': 'true' }, idx), h('h3', { class: 'card__title', id }, title), metaEl));
  return { el, metaEl };
}

/** @param {string} k @param {(string|Node|null)[]|string} v @param {string} [n] */
const stat = (k, v, n) => h('div', { class: 'stat' }, h('span', { class: 'stat__k' }, k), h('span', { class: 'stat__v' }, v), n ? h('span', { class: 'stat__n' }, n) : null);
const empty = (/** @type {string} */ text) => h('div', { class: 'empty' }, h('b', null, T.emptyTitle), h('span', null, text));
/** "%91 [%84–%95]" @param {{p:number|null, lo:number|null, hi:number|null}} r */
const rateNodes = (r) => [fmt.pct(r.p), ' ', h('small', null, fmt.ci(r.lo, r.hi))];

/** @param {UIContext} ctx */
export function mountLab(ctx) {
  const { store, actions } = ctx;
  const titleId = nextId('lab-title');
  const close = () => actions.closePanel();
  const dialog = createDialog({ kind: 'drawer', cls: 'drawer--wide lab', labelledby: titleId, onDismiss: close });
  const meta = h('p', { class: 'dhead__meta' });
  const simSlot = h('span', { class: 'dhead__extra', hidden: true }, simChip());
  const { head, close: closeBtn } = dialogHead({ id: titleId, title: T.lab, iconName: 'flask', meta, extra: simSlot, closeLabel: T.labBack, onClose: close });
  const statsGrid = h('div', { class: 'lab__grid' });
  const simNote = h('p', { class: 'card__note', hidden: true }, T.labSimNote);
  const dataSlot = h('div', { class: 'lab__grid' });
  const body = h('div', { class: 'lab__body scroll-y', tabindex: '0', role: 'region', 'aria-label': T.labCards }, simNote, statsGrid, dataSlot, h('p', { class: 'lab__foot' }, T.labFoot));
  dialog.el.append(head, body);

  // ------------------------------------------------------------------ statistic cards
  const scoreCard = (/** @type {any} */ m) => {
    const n = m.rounds.valid;
    const voids = Object.values(m.rounds.voids).reduce((/** @type {number} */ a, /** @type {any} */ v) => a + v, 0);
    const c = card('L1', T.cScore, `${T.cScoreMeta} · ${M.nEq(n)}`);
    c.el.append(h('p', { class: 'card__note' }, M.roundsLine(n, m.rounds.fouls, /** @type {number} */ (voids))));
    // unconditional view: every judged attempt counts, so a weak detector cannot hide behind fouls and voids
    const attempts = () => [
      stat(T.attemptWin, rateNodes(m.attemptWinRate), `${M.kOfN(m.attemptWinRate.k, m.attemptWinRate.n)} ${T.attempts}`),
      stat(T.noResult, rateNodes(m.noResultRate), `${M.kOfN(m.noResultRate.k, m.noResultRate.n)} ${T.attempts}`),
      h('p', { class: 'card__note' }, T.condNote),
    ];
    if (n === 0) { c.el.append(empty(T.emptyScore)); if (m.rounds.judged > 0) c.el.append(...attempts()); return c.el; }
    const o = m.outcome;
    c.el.append(
      h('div', { class: 'gbm' },
        h('div', { class: 'stat' }, h('span', { class: 'stat__k' }, pip('ai'), T.W), h('span', { class: 'stat__v' }, String(o.ai)), h('span', { class: 'stat__n' }, T.win)),
        h('div', { class: 'stat' }, h('span', { class: 'stat__k' }, pip('draw'), T.D), h('span', { class: 'stat__v' }, String(o.tie)), h('span', { class: 'stat__n' }, T.tie)),
        h('div', { class: 'stat' }, h('span', { class: 'stat__k' }, pip('you'), T.L), h('span', { class: 'stat__v' }, String(o.player)), h('span', { class: 'stat__n' }, T.loss))),
      h('div', { class: 'split', role: 'img', 'aria-label': M.splitLabel(o.ai, o.tie, o.player) },
        o.ai ? h('i', { class: 'split__w', style: { '--f': o.ai } }) : null, o.tie ? h('i', { class: 'split__d', style: { '--f': o.tie } }) : null, o.player ? h('i', { class: 'split__l', style: { '--f': o.player } }) : null),
      stat(T.winRate, rateNodes(m.winRate), `${M.kOfN(m.winRate.k, m.winRate.n)} · ${M.nEq(m.winRate.n)}`),
      intervalBar({ p: m.winRate.p, lo: m.winRate.lo, hi: m.winRate.hi, ref: 1 / 3, refLabel: T.chance, label: M.intervalLabel(T.cScore, m.winRate.p, m.winRate.lo, m.winRate.hi) }),
      stat(T.unbeaten, rateNodes(m.unbeaten), M.nEq(m.unbeaten.n)),
      ...attempts());
    const lastW = m.curve.slice(-20).map((/** @type {any} */ x) => x.w);
    if (lastW.length) {
      const a = lastW.filter((/** @type {number} */ w) => w > 0).length, t = lastW.filter((/** @type {number} */ w) => w === 0).length, y = lastW.length - a - t;
      c.el.append(h('div', { class: 'stat' }, h('span', { class: 'stat__k' }, M.last(lastW.length)),
        h('div', { class: 'last20', role: 'img', 'aria-label': M.lastLabel(a, t, y) }, lastW.map((/** @type {number} */ w) => pip(w > 0 ? 'ai' : w < 0 ? 'you' : 'draw')))));
    }
    c.el.append(h('p', { class: 'pval' }, fmt.pValue(m.pValueVsChance), ' ', h('small', null, `${T.pNote} · ${M.nEq(n)}`)));
    return c.el;
  };

  const leadCard = (/** @type {any} */ m) => {
    const L = m.leadToLandingMs;
    const c = card('L2', T.cLead, `${T.cLeadMeta} · ${M.nEq(L.n)}`);
    if (!L.n) { c.el.append(empty(T.emptyLead)); return c.el; }
    const held = m.heldBehaviourShare, prog = m.progressAtCommit;
    c.el.append(
      h('div', { class: 'stats' },
        stat(T.median, [fmt.num(L.median), ' ', h('small', null, 'ms')], `${T.beforeLanding} · ${M.nEq(L.n)}`),
        stat(T.iqr, [`${fmt.num(L.q1)}–${fmt.num(L.q3)}`, ' ', h('small', null, 'ms')], M.nEq(L.n)),
        stat(T.meanProgress, fmt.pct(prog.mean), M.nEq(prog.n)),
        stat(T.heldShare, rateNodes(held), `${M.kOfN(held.k, held.n)} · ${T.heldShareNote}`),
        stat(T.kinLead, [fmt.num(m.kinematicLeadMs.median), ' ', h('small', null, 'ms')], `${T.kinLeadNote} · ${M.nEq(m.kinematicLeadMs.n)}`)),
      leadHistogram({ values: L.values, median: L.median, label: M.histLabel(L.n, L.median), axisLabel: T.leadAxis, countLabel: T.leadRounds, medianLabel: `${T.median.toLocaleLowerCase('tr')} ${fmt.num(L.median)}` }));
    const ls = m.curve.map((/** @type {any} */ x) => x.l).filter((/** @type {any} */ v) => Number.isFinite(v));
    if (ls.length) c.el.append(h('span', { class: 'card__h' }, T.sparkLabel), sparkline({ values: ls, label: M.sparkLabel(ls.length, ls[0], ls[ls.length - 1]), unit: T.leadRounds }));
    const over = L.values.filter((/** @type {number} */ v) => v >= 300).length;
    if (over) c.el.append(h('p', { class: 'card__note' }, M.over300(over)));
    return c.el;
  };

  const predCard = (/** @type {any} */ m) => {
    const p = m.prediction;
    const c = card('L3', T.cPred, M.nEq(p.n));
    if (!p.n) { c.el.append(empty(T.emptyPred)); return c.el; }
    c.el.append(
      h('div', { class: 'calib' },
        h('div', { class: 'stats' },
          stat(T.accuracy, rateNodes(p.accuracy), `${T.accuracyNote} (${M.kOfN(p.accuracy.k, p.accuracy.n)})`),
          stat(T.brier, fmt.num(p.brier, 2), `${T.brierNote} · ${M.nEq(p.n)}`),
          stat(T.logloss, fmt.num(p.loglossBits, 2), `${T.loglossNote} · ${M.nEq(p.n)}`),
          stat(T.infoGain, fmt.num(p.infoGainBits, 2), `${T.infoGainNote} · ${M.nEq(p.n)}`),
          stat(T.ece, fmt.num(p.ece, 2), `${T.eceNote} · ${M.nEq(p.n)}`)),
        reliability({ bins: p.reliability, label: M.relLabel(p.n, p.ece), xLabel: T.relX, yLabel: T.relY })),
      h('p', { class: 'card__note' }, T.relNote));
    return c.el;
  };

  const behaviourCard = (/** @type {any} */ m, /** @type {any} */ pf) => {
    const b = m.behaviourOnly;
    const c = card('L4', T.cBeh, `${T.cBehMeta} · ${M.nEq(b.n)}`);
    if (!b.n) c.el.append(empty(T.emptyBeh));
    else {
      c.el.append(
        h('div', { class: 'gbm' },
          h('div', { class: 'stat' }, h('span', { class: 'stat__k' }, T.W), h('span', { class: 'stat__v' }, String(b.ai)), h('span', { class: 'stat__n' }, T.win)),
          h('div', { class: 'stat' }, h('span', { class: 'stat__k' }, T.D), h('span', { class: 'stat__v' }, String(b.tie)), h('span', { class: 'stat__n' }, T.tie)),
          h('div', { class: 'stat' }, h('span', { class: 'stat__k' }, T.L), h('span', { class: 'stat__v' }, String(b.player)), h('span', { class: 'stat__n' }, T.loss))),
        stat(T.behOnlyRate, rateNodes(b.winRate), `${M.kOfN(b.winRate.k, b.winRate.n)} · ${M.nEq(b.winRate.n)}`),
        intervalBar({ p: b.winRate.p, lo: b.winRate.lo, hi: b.winRate.hi, ref: 1 / 3, refLabel: T.chance, label: M.intervalLabel(T.cBeh, b.winRate.p, b.winRate.lo, b.winRate.hi) }),
        h('p', { class: 'card__note' }, T.behNote));
    }
    if (pf) {
      c.el.append(h('dl', { class: 'kv' },
        h('dt', null, T.safetyLambda), h('dd', null, fmt.num(pf.safety ? pf.safety.lambda : null, 2)),
        h('dt', null, T.safetyBudget), h('dd', null, fmt.num(pf.safety ? pf.safety.budget : null, 2)),
        h('dt', null, T.fusionPrior), h('dd', null, fmt.num(pf.fusion ? pf.fusion.wPrior : null, 2)),
        h('dt', null, T.fusionKin), h('dd', null, fmt.num(pf.fusion ? pf.fusion.wKin : null, 2))));
    }
    return c.el;
  };

  const profileCard = (/** @type {any} */ pf) => {
    const bh = pf ? pf.behaviour : null;
    const n = bh ? bh.n : 0;
    const trans = bh ? bh.conditional.reduce((/** @type {number} */ a, /** @type {number[]} */ r) => a + r[0] + r[1] + r[2], 0) : 0;
    const c = card('L5', T.cProfile, `${M.nEq(n)} · ${trans} ${T.transitions}`, 'card--wide');
    if (!bh || n === 0) { c.el.append(empty(T.emptyProfile)); return c.el; }
    const freqRows = MOVE_NAMES.map((name, i) => {
      const p = bh.freq[i] / n;
      return h('div', { class: 'brow' }, glyph(i), h('span', { class: 'brow__name' }, name),
        h('div', { class: 'bar bar--you', style: { '--v': Math.round(p * 100), '--p': 33.3 }, role: 'img', 'aria-label': `${name}: ${fmt.pct(p)}, ${bh.freq[i]}/${n}` }, h('span', { class: 'bar__fill' }), h('span', { class: 'bar__tick' })),
        h('span', { class: 'brow__val' }, fmt.pct(p), ' ', h('small', null, `· ${bh.freq[i]}`)));
    });
    const respRows = [T.afterWin, T.afterTie, T.afterLoss].map((label, ri) => {
      const row = bh.conditional[ri];
      const rn = row[0] + row[1] + row[2];
      const thin = rn < THIN_N;
      return h('tr', { class: thin ? 'is-thin' : null },
        h('th', { scope: 'row' }, label, h('small', null, thin ? h('span', { class: 'resp__flag' }, icon('warning', 'ic--sm'), `${M.nEq(rn)} · ${T.thinData}`) : M.nEq(rn))),
        row.map((/** @type {number} */ k, ci) => {
          const p = rn > 0 ? k / rn : null;
          return h('td', null,
            h('span', { class: 'resp__v' }, p === null ? DASH : fmt.pct(p)),
            h('div', { class: 'bar bar--you', 'aria-hidden': 'true', style: { '--v': p === null ? 0 : Math.round(p * 100), '--p': LITERATURE[ri][ci] } }, h('span', { class: 'bar__fill' }), h('span', { class: 'bar__tick' })),
            h('span', { class: 'resp__lit' }, `${T.lit} %${LITERATURE[ri][ci]}`));
        }));
    });
    c.el.append(h('div', { class: 'beh' },
      h('div', { class: 'beh__freq' }, h('h4', { class: 'card__h' }, T.freqH), h('div', { class: 'belief' }, freqRows),
        h('dl', { class: 'kv' }, h('dt', null, T.entropy), h('dd', null, fmt.num(bh.entropyBits, 2), ' ', h('small', null, T.entropyUnit)))),
      h('div', { class: 'beh__resp' }, h('h4', { class: 'card__h' }, T.respH),
        h('div', { class: 'resp-wrap' }, h('table', { class: 'resp' },
          h('caption', { class: 'sr-only' }, T.respCaption),
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, T.respPrev)), h('th', { scope: 'col' }, T.stay), h('th', { scope: 'col' }, T.up), h('th', { scope: 'col' }, T.down))),
          h('tbody', null, respRows))),
        h('p', { class: 'card__note' }, T.litNote))));
    return c.el;
  };

  const kinCard = (/** @type {any} */ pf) => {
    const n = pf && pf.onsetLeadFrontMs ? pf.onsetLeadFrontMs.n : 0;
    const c = card('L6', T.cKin, M.nEq(n), 'card--last');
    if (!pf) { c.el.append(empty(T.emptyKin)); return c.el; }
    /** Measured rows show mean ± sd (n); rows with n = 0 show the prior, labelled as such. */
    const nig = (/** @type {any} */ x, /** @type {string} */ unit) => (x && x.n > 0
      ? [fmt.meanSd(x, unit), ' ', h('small', null, `(${M.nEq(x.n)})`)]
      : [h('small', null, `${T.prior} ${x ? fmt.meanSd(x, unit) : DASH}`), ' ', h('small', null, `(${M.nEq(0)})`)]);
    const sk = pf.stroke ?? {};
    if (n === 0) c.el.append(empty(T.emptyKin));
    const item = (/** @type {string} */ label, /** @type {any} */ value) => h('div', null, h('dt', null, label), h('dd', null, value));
    c.el.append(h('dl', { class: 'kvgrid' },
      item(T.kOnsetFront, nig(pf.onsetLeadFrontMs, 'ms')),
      item(T.kOnsetBack, nig(pf.onsetLeadBackMs, 'ms')),
      item(T.kOpening, pf.openingMs && pf.openingMs.n > 0 ? [fmt.ms(pf.openingMs.median), ' ', h('small', null, `(${M.nEq(pf.openingMs.n)})`)] : [h('small', null, `${T.prior} ${pf.openingMs ? fmt.ms(pf.openingMs.median) : DASH}`), ' ', h('small', null, `(${M.nEq(0)})`)]),
      item(T.kGroupDelay, nig(pf.groupDelayMs, 'ms')),
      item(T.kNoise, fmt.num(pf.noiseSd, 3)),
      item(T.kDescent, [fmt.ms(sk.meanDescentMs), ' ', h('small', null, `(${M.nEq(sk.n ?? 0)})`)]),
      item(T.kApex, [fmt.ms(sk.meanApexToBottomMs), ' ', h('small', null, `(${M.nEq(sk.n ?? 0)})`)]),
      item(T.kBias, sk.n ? fmt.pct(sk.lastIntervalBias, 1) : DASH)),
      h('p', { class: 'card__note' }, T.kinNote));
    return c.el;
  };

  // ------------------------------------------------------------------ data & privacy (built once, updated in place)
  const dataCard = card('L7', T.cData, T.cDataMeta, 'card--last data');
  const keep1 = h('span');
  const where = h('p', { class: 'card__note' });
  const cloudDescId = nextId('cloud-desc');
  const cloud = createSwitch({ label: T.cloudSwitch, block: true, describedby: cloudDescId, onToggle: (v) => actions.setSetting('cloud', v) });
  const confirmBox = h('div', { class: 'data__confirm', hidden: true });
  const resetBtn = h('button', { class: 'btn btn--danger btn--block', type: 'button' }, icon('warning'), T.resetMemory);
  const exportBtn = h('button', { class: 'btn btn--block', type: 'button' }, icon('export'), T.exportJson);
  const yesBtn = h('button', { class: 'btn btn--danger', type: 'button' }, T.resetYes);
  const noBtn = h('button', { class: 'btn', type: 'button' }, T.cancel);
  confirmBox.append(h('p', null, T.resetConfirm), h('div', null, yesBtn, noBtn));
  resetBtn.addEventListener('click', () => { confirmBox.hidden = false; resetBtn.hidden = true; noBtn.focus(); });
  noBtn.addEventListener('click', () => { confirmBox.hidden = true; resetBtn.hidden = false; resetBtn.focus(); });
  yesBtn.addEventListener('click', () => { confirmBox.hidden = true; resetBtn.hidden = false; actions.resetMemory(); resetBtn.focus(); });
  exportBtn.addEventListener('click', () => {
    const data = actions.exportData();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = h('a', { href: url, download: `${T.exportName}-${new Date().toISOString().slice(0, 10)}.json`, hidden: true });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
  const profList = h('ul', { class: 'profiles__list' });
  const profNote = h('p', { class: 'card__note', hidden: true }, T.profilesDemo);
  const profInput = h('input', { class: 'input', type: 'text', maxlength: 24, autocomplete: 'off', id: nextId('prof-new') });
  const profCreate = h('button', { class: 'btn', type: 'button' }, icon('plus'), T.profileCreate);
  profCreate.addEventListener('click', () => { actions.createProfile(profInput.value.trim() || undefined); profInput.value = ''; });
  profInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); profCreate.click(); } });
  const profNew = h('div', { class: 'profiles__new' }, h('label', null, h('span', { class: 'field__label' }, T.profileNew), profInput), profCreate);
  dataCard.el.append(h('div', { class: 'data__body' },
    h('div', { class: 'data__side' },
      h('ul', { class: 'keep' },
        h('li', null, icon('check', 'ic--sm'), h('span', null, h('span', { class: 'sr-only' }, T.keepSr), keep1)),
        h('li', null, icon('check', 'ic--sm'), h('span', null, h('span', { class: 'sr-only' }, T.keepSr), T.keep2)),
        h('li', null, icon('check', 'ic--sm'), h('span', null, h('span', { class: 'sr-only' }, T.keepSr), T.keep3)),
        h('li', { class: 'keep__no' }, icon('none', 'ic--sm'), h('span', null, T.keepNo))),
      where),
    h('div', { class: 'data__side' },
      cloud.el, h('p', { class: 'card__note', id: cloudDescId }, T.cloudNote),
      h('div', { class: 'data__actions' }, exportBtn, resetBtn, confirmBox)),
    h('div', { class: 'profiles' }, h('h4', { class: 'card__h' }, T.profilesH), profList, profNote, profNew)));
  dataSlot.append(dataCard.el);

  const renderProfiles = (/** @type {any} */ st) => {
    const demo = st.boot.source === 'demo';
    const list = actions.listProfiles();
    const hadFocus = profList.contains(document.activeElement);
    fill(profList, list.map((/** @type {any} */ p) => {
      const active = p.id === st.player.id && !demo;
      return h('li', { class: 'profile' },
        h('button', { class: 'btn profile__pick', type: 'button', 'aria-pressed': active ? 'true' : 'false', disabled: demo, on: { click: () => actions.selectProfile(p.id) } },
          icon('user'), h('span', null, p.tag), active ? h('span', { class: 'prose__active' }, T.profileActive) : null),
        h('button', { class: 'iconbtn', type: 'button', 'aria-label': `${T.profileDelete}: ${p.tag}`, title: T.profileDelete, disabled: demo || list.length <= 1, on: { click: () => actions.deleteProfile(p.id) } }, icon('trash')));
    }));
    show(profNote, demo);
    profInput.disabled = demo; profCreate.disabled = demo;
    if (hadFocus) { const b = /** @type {HTMLElement|null} */ (profList.querySelector('[aria-pressed="true"]') ?? profList.querySelector('button:not([disabled])')); if (b) b.focus(); }
  };

  // ------------------------------------------------------------------ subscriptions (render only while open)
  store.subscribe((st) => ({ open: st.ui.panel === 'lab', m: st.metrics, pf: st.profile }), ({ open, m, pf }) => {
    if (!open) return;
    if (!m) { fill(statsGrid, h('div', { class: 'card card--wide' }, empty(T.emptyScore))); return; }
    fill(statsGrid, scoreCard(m), leadCard(m), predCard(m), behaviourCard(m, pf), profileCard(pf), kinCard(pf));
  });
  store.subscribe((st) => ({ open: st.ui.panel === 'lab', player: st.player, source: st.boot.source, storage: st.boot.storage, cloud: st.settings.cloud }), (v, st) => {
    if (!v.open) return;
    const demo = v.source === 'demo';
    setText(meta, `${M.labMeta(v.player.rounds, v.player.tag || DASH)} · ${T.labMetaLocal}`);
    simSlot.hidden = !demo; show(simNote, demo);
    setText(keep1, `${T.keep1} (${v.player.rounds} ${T.leadRounds})`);
    setText(where, demo ? T.keepWhereSim : v.storage ? T.keepWhere : T.keepWhereOff);
    cloud.set(v.cloud);
    renderProfiles(st);
  });

  return { dialog, focusTarget: () => closeBtn };
}
