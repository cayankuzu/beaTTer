// @ts-check
/**
 * beaTTer v4 — round report (bottom sheet on desktop, full screen on phones). Opens when
 * `state.result !== null`; closing it is `actions.nextRound()`.
 *
 * Order: (a) verdict and both moves, (b) when the decision was made + annotated timeline, (c) why this
 * move, (d) the seal chain with "verify it yourself", (e) this round's measurements, (f) actions.
 * Every value comes from the RoundResult; unknown values render as "—".
 */

import { h, fill, nextId } from '../dom.js';
import { icon, glyph } from '../icons.js';
import { T, M, fmt, DASH, RULE_NAMES, moveName, verdictHeadline, verdictSentence, explanationText, counterfactualText, expertLabel } from '../strings_tr.js';
import { createDialog, dialogHead, simChip } from './dialog.js';
import { beliefRows, setBelief } from './ai_stage.js';
import { createSurface } from '../render/canvas.js';
import { drawRoundTimeline } from '../render/timeline.js';
import { theme } from '../render/theme.js';

/** @typedef {import('../index.js').UIContext} UIContext */

const ix = (/** @type {string} */ n) => h('span', { class: 'rp__ix', 'aria-hidden': 'true' }, n);

/** @param {UIContext} ctx */
export function mountReport(ctx) {
  const { store, actions } = ctx;
  const titleId = nextId('rp-title');
  const close = () => actions.nextRound();
  const dialog = createDialog({ kind: 'sheet', labelledby: titleId, onDismiss: close });

  const meta = h('p', { class: 'dhead__meta' });
  const simSlot = h('span', { class: 'dhead__extra', hidden: true }, simChip());
  const { head } = dialogHead({ id: titleId, title: T.reportTitle, meta, extra: simSlot, closeLabel: T.reportClose, onClose: close, grip: true });
  const body = h('div', { class: 'dbody scroll-y', tabindex: '0', role: 'region', 'aria-label': T.reportBody });
  const nextBtn = h('button', { class: 'btn btn--primary', type: 'button', on: { click: close } }, T.nextRound, h('kbd', { class: 'kbd', 'aria-hidden': 'true' }, T.keySpace));
  const labBtn = h('button', { class: 'btn', type: 'button', on: { click: () => actions.openPanel('lab') } }, icon('flask'), T.lab);
  dialog.el.append(head, body, h('footer', { class: 'dfoot' }, nextBtn, labBtn));

  /** @type {ReturnType<typeof createSurface>|null} */ let surface = null;
  /** @type {any} */ let shown = null;

  // ------------------------------------------------------------------ (a) verdict
  const verdict = (/** @type {any} */ r, /** @type {any} */ series) => {
    const youWin = r.verdict === 'PLAYER', aiWin = r.verdict === 'AI';
    const win = () => h('p', { class: 'rp-verdict__win' }, icon('check', 'ic--sm'), T.winner);
    const hid = nextId('rp-verdict');
    return h('section', { class: `rp-verdict${r.valid ? '' : ' is-void'}`, 'aria-labelledby': hid },
      h('div', { class: `rp-move rp-move--you${youWin ? ' is-winner' : ''}` },
        h('span', { class: 'rp-move__glyph' }, glyph(r.playerMove)),
        h('p', { class: 'rp-move__who' }, h('i', { class: 'mk mk--you', 'aria-hidden': 'true' }), T.you),
        h('p', { class: 'rp-move__name' }, r.playerMove === null || r.playerMove === undefined ? T.notRecognised : moveName(r.playerMove)),
        youWin ? win() : null),
      h('div', { class: 'rp-verdict__mid' },
        h('h3', { class: 'rp-verdict__title', id: hid }, r.valid ? null : icon('warning', 'ic--lg'), verdictHeadline(r.verdict)),
        h('p', { class: 'rp-verdict__rule' }, verdictSentence(r)),
        h('p', { class: 'rp-move__meta' }, M.seriesLine(series.player, series.ai))),
      h('div', { class: `rp-move rp-move--ai${aiWin ? ' is-winner' : ''}` },
        h('span', { class: 'rp-move__glyph' }, glyph(r.aiMove)),
        h('p', { class: 'rp-move__who' }, h('span', { class: 'tag-long' }, T.aiTagLong), h('span', { class: 'tag-short' }, T.aiTagShort), h('i', { class: 'mk mk--ai', 'aria-hidden': 'true' })),
        h('p', { class: 'rp-move__name' }, moveName(r.aiMove)),
        aiWin ? win() : null));
  };

  // ------------------------------------------------------------------ (a2) plain-language step-by-step guide & series history
  const plainGuide = (/** @type {any} */ r, /** @type {any} */ st) => {
    const hid = nextId('rp-plain');
    const lead = r.timing ? r.timing.leadToLandingMs : null;
    const prog = r.progressAtCommit;
    const firstCommit = Array.isArray(r.commits) && r.commits.length ? r.commits[0] : null;
    const judgedCommit = Array.isArray(r.commits) ? r.commits.find((/** @type {any} */ c) => c.seq === r.judgedSeq) : null;
    const youMove = r.playerMove === null || r.playerMove === undefined ? 'belirsiz' : moveName(r.playerMove);
    const aiMove = moveName(r.aiMove);
    const firstMove = firstCommit ? moveName(firstCommit.move) : aiMove;
    const leadStr = Number.isFinite(lead) && lead >= 0 ? `${Math.round(lead)} ms önce` : 'iniş anında';
    const progPct = Number.isFinite(prog) ? Math.round(Math.min(1, Math.max(0, prog)) * 100) : null;

    let step1 = `Sen elini sallamaya başlarken yapay zekâ geçmiş hamle alışkanlığına bakarak ilk tahminini "${firstMove}" olarak kilitledi.`;
    let step2 = '';
    let mistakeBox = null;

    if (r.valid) {
      if (r.explanation && r.explanation.code === 'HELD_BEHAVIOUR') {
        step2 = `Elin 4. vuruş için inerken parmakların kapalı kaldı veya ilk tahmini değiştirecek bir hareket olmadı. Yapay zekâ elin inmeden ${leadStr} "${aiMove}" kararını korudu.`;
      } else if (r.playerMove === 0) {
        step2 = `Elin aşağı inerken parmaklarının açılmadığını (yumruk kaldığını) elin inmeden ${leadStr} tespit etti; Taş geleceğini anlayıp "${aiMove}" hamlesini kilitledi.`;
      } else {
        const progText = progPct !== null ? ` (parmakların henüz %${progPct} açılmışken)` : '';
        step2 = `Elin daha havadayken, yere inmeden ${leadStr}${progText} parmaklarının "${youMove}" için açıldığını gördü ve cevabını "${aiMove}" olarak kilitledi.`;
      }
    } else {
      const code = r.explanation ? r.explanation.code : r.verdict;
      let errTitle = 'Tur Geçersiz Sayıldı';
      let errWhat = 'Bu turda el hareketi kurallara uygun tamamlanamadı.';
      let errHow = 'Elini kameranın ortasında tutarak 3 kez yumruk salla ve 4. vuruşta elin havadayken hamleni aç.';
      if (code === 'FOUL_LATE_OPEN') {
        errTitle = 'Senin Hatan: El İndikten Sonra Açtın (Geç Hamle)';
        errWhat = '4. vuruşta elin aşağı inerken yumruk halindeydi; parmaklarını elin durduktan sonra açtın.';
        errHow = '1-Taş, 2-Kağıt, 3-Makas derken yumruk salla; 4. vuruşta ("VUR!" derken) elin daha havadayken parmaklarını aç.';
      } else if (code === 'FOUL_LATE_CLOSE') {
        errTitle = 'Senin Hatan: Son Anda Parmak Kapattın (Geç Hamle)';
        errWhat = 'Elin havadayken parmakların açıktı (Kağıt gibi), ancak elin inerken son anda parmaklarını kapattın.';
        errHow = '4. vuruşta seçtiğin şekli havada net olarak aç ve elin durana kadar şekli değiştirme.';
      } else if (r.verdict === 'VOID_NO_HAND') {
        errTitle = 'El Kamerada Net Görünmedi';
        errWhat = 'Son vuruş sırasında elin kamera açısından çıktı ya da çok hızlı savrulduğu için takip edilemedi.';
        errHow = 'Elini kameraya çok yaklaştırmadan, ekranın orta kısmında tutarak salla.';
      } else if (r.verdict === 'VOID_NO_FIST') {
        errTitle = 'Başlangıçta Elin Yumruk Değildi';
        errWhat = 'Sayım vuruşlarını yaparken parmakların açık başladı; bu yüzden açılma hareketi ölçülemedi.';
        errHow = 'İlk 3 vuruşta (Taş-Kağıt-Makas derken) elini kapalı yumruk tut, sadece 4. vuruşta aç.';
      } else if (r.verdict === 'VOID_UNKNOWN') {
        errTitle = 'El Şekli Anlaşılamadı';
        errWhat = 'Elin durduğunda yaptığın şekil Taş, Kağıt veya Makas olarak net seçilemedi.';
        errHow = 'Kağıt için 4 parmağını tam aç, Makas için işaret ve orta parmağını V şeklinde aç, Taş için tam yumruk yap.';
      }
      step2 = errWhat;
      mistakeBox = h('div', { class: 'rp-plain__alert' },
        h('p', { class: 'rp-plain__alert-title' }, icon('warning', 'ic--sm'), errTitle),
        h('p', { class: 'rp-plain__alert-body' }, errWhat),
        h('p', { class: 'rp-plain__alert-tip' }, h('b', null, 'Nasıl düzeltilir: '), errHow));
    }

    const step3 = judgedCommit
      ? `Elin indiğinde yapay zekânın "${aiMove}" hamlesi çoktan kilitliydi (Mühür #${judgedCommit.seq}). Sonradan hamle değiştirme yapılmadı.`
      : `Tur tamamlandığında tüm mühürler açıldı ve doğrulandı.`;

    const prof = st.profile;
    const adaptPct = prof && prof.diagnostics ? prof.diagnostics.adaptationPct : (prof && prof.rounds ? Math.min(100, Math.round(100 * (1 - Math.exp(-prof.rounds / 10)))) : 0);
    const meanLead = prof && prof.onsetLeadFrontMs && prof.onsetLeadFrontMs.n > 0 ? Math.round(prof.onsetLeadFrontMs.mean) : null;
    const favMove = prof && prof.diagnostics && prof.diagnostics.favMove !== null ? moveName(prof.diagnostics.favMove) : null;
    const learnParts = [];
    if (prof && prof.rounds > 0) {
      learnParts.push(`Toplam ${prof.rounds} geçerli tur analiz edildi (Uyum: %${adaptPct}).`);
      if (meanLead !== null) learnParts.push(`Parmaklarını inişten ortalama ${meanLead} ms önce açıyorsun.`);
      if (favMove) learnParts.push(`En sık tercih ettiğin hamle: ${favMove}.`);
    } else {
      learnParts.push('İlk geçerli turunu tamamladığında el açılış hızın ve hamle alışkanlığın burada özetlenir.');
    }

    // Series round-by-round mini history
    const sr = st.series;
    const historyRows = sr && Array.isArray(sr.rounds) && sr.rounds.length
      ? sr.rounds.map((/** @type {any} */ item, /** @type {number} */ idx) => {
          const itemLead = Number.isFinite(item.leadMs) && item.leadMs >= 0 ? `${Math.round(item.leadMs)} ms önce okudu` : 'davranış tahmini';
          const resLabel = item.verdict === 'AI' ? 'YZ Kazandı' : item.verdict === 'PLAYER' ? 'Sen Kazandın' : 'Berabere';
          return h('li', { class: `rp-hist__item is-${item.verdict.toLowerCase()}` },
            h('span', { class: 'rp-hist__n' }, `${idx + 1}. Tur`),
            h('span', { class: 'rp-hist__moves' }, `Sen: ${moveName(item.playerMove)} · YZ: ${moveName(item.aiMove)}`),
            h('span', { class: 'rp-hist__lead' }, itemLead),
            h('b', { class: 'rp-hist__res' }, resLabel));
        })
      : [h('li', { class: 'rp-hist__empty' }, 'Bu seride henüz tamamlanmış geçerli tur yok.')];

    return h('section', { class: 'rp rp--panel rp-plain', 'aria-labelledby': hid },
      h('h3', { class: 'rp__h', id: hid }, 'Bu Turda Ne Oldu? (Adım Adım Özet)'),
      mistakeBox,
      h('ol', { class: 'rp-steps' },
        h('li', { class: 'rp-step' }, h('b', null, '1. Başlangıç Tahmini: '), step1),
        h('li', { class: 'rp-step' }, h('b', null, '2. Karar Anı: '), step2),
        h('li', { class: 'rp-step' }, h('b', null, '3. Doğrulama: '), step3)),
      h('div', { class: 'rp-coach' },
        h('p', { class: 'rp-coach__title' }, 'Yapay Zekâ Senden Ne Öğrendi?'),
        h('p', { class: 'rp-coach__text' }, learnParts.join(' '))),
      h('div', { class: 'rp-hist' },
        h('p', { class: 'rp-coach__title' }, `Bu Seride Tur Tur Geçmiş (${sr.rounds.length}/${sr.length} Geçerli Tur · ${sr.fouls} Faul)`),
        h('ol', { class: 'rp-hist__list' }, historyRows)));
  };

  // ------------------------------------------------------------------ (b) hero + timeline
  const hero = (/** @type {any} */ r) => {
    const lead = r.timing.leadToLandingMs, comp = r.timing.leadToCompletionMs, prog = r.progressAtCommit;
    const hid = nextId('rp-hero');
    const known = Number.isFinite(lead);
    const metric = h('div', { class: 'rp-hero__metric' },
      h('h3', { class: 'rp__h', id: hid }, ix('01'), T.heroH),
      h('p', { class: 'rp-hero__line' }, h('span', { class: 'rp-hero__pre' }, T.heroPre), ' ',
        h('strong', { class: 'rp-hero__num' }, known ? fmt.ms(Math.abs(lead)) : DASH), ' ', h('span', null, known && lead < 0 ? T.heroAfter : T.heroBefore)));
    if (Number.isFinite(prog)) {
      const parts = M.heroProgress(prog);
      const pct = Math.round(Math.min(1, Math.max(0, prog)) * 100);
      metric.append(
        h('p', { class: 'rp-hero__sub' }, parts[0], h('b', null, parts[1]), parts[2]),
        h('div', { class: 'rp-hero__formed', 'aria-hidden': 'true' }, h('div', { class: 'bar bar--you no-tick', style: { '--v': pct } }, h('span', { class: 'bar__fill' })), h('span', null, `%${pct} / %100`)));
    }
    if (Number.isFinite(comp)) {
      const parts = M.heroCompletion(comp);
      metric.append(h('p', { class: 'rp-hero__facts' }, h('span', null, parts[0], h('b', null, parts[1]), parts[2])));
    }

    const seals = r.commits.map((/** @type {any} */ c) => M.tlSealSr(c.seq, T.reasons[c.reason] ?? c.reason, c.leadMs));
    const doneRel = Number.isFinite(r.timing.tComplete) ? r.timing.tComplete - r.timing.tLanding : null;
    const canvas = h('canvas', { class: 'tl__canvas', role: 'img', 'aria-label': M.tlLabel(seals, doneRel) });
    if (surface) surface.destroy();
    surface = createSurface(canvas);
    const figure = h('figure', { class: 'tl' },
      h('p', { class: 'tl__cap', 'aria-hidden': 'true' }, T.tlCap),
      h('div', { class: 'tl__plot' }, canvas),
      h('figcaption', { class: 'tl__legend' },
        h('span', { class: 'lg lg--front' }, T.tlFront), h('span', { class: 'lg lg--back' }, T.tlBack), h('span', { class: 'lg lg--read' }, T.tlRead),
        h('span', { class: 'lg' }, T.tlPalm), h('span', { class: 'lg lg--seal' }, T.tlSeal), h('span', { class: 'lg lg--done' }, T.tlDone), h('span', { class: 'lg lg--land' }, T.tlLand)));
    return h('section', { class: 'rp rp-hero', 'aria-labelledby': hid }, metric, figure);
  };

  // ------------------------------------------------------------------ (c) why
  const why = (/** @type {any} */ r) => {
    const hid = nextId('rp-why'), bid = nextId('rp-bel');
    const b = r.beliefAtFinalCommit;
    const judged = r.commits.find((/** @type {any} */ c) => c.seq === r.judgedSeq) ?? null;
    let beliefEl;
    if (b && Array.isArray(b.post)) {
      const rows = beliefRows();
      setBelief(rows, b.post, Array.isArray(b.prior) ? b.prior : null);
      beliefEl = h('div', { class: 'belief', role: 'group', 'aria-labelledby': bid },
        h('div', { class: 'belief__head' },
          h('h4', { class: 'belief__title', id: bid }, T.beliefAtSeal, h('span', { class: 'belief__sub' }, M.beliefAtSealSub(r.judgedSeq, judged ? judged.leadMs : null))),
          h('span', { class: 'belief__key' }, h('i', { 'aria-hidden': 'true' }), T.beliefKey)),
        rows.map((x) => x.row));
    } else {
      beliefEl = h('div', { class: 'belief' }, h('h4', { class: 'belief__title', id: bid }, T.beliefAtSeal), h('p', { class: 'rp-empty' }, `${DASH} ${T.beliefNone}`));
    }
    const top = r.behaviour && Array.isArray(r.behaviour.top) ? r.behaviour.top[0] : null;
    return h('section', { class: 'rp rp--panel rp-why', 'aria-labelledby': hid },
      h('h3', { class: 'rp__h', id: hid }, ix('02'), T.whyH),
      h('p', { class: 'rp-why__text' }, explanationText(r.explanation)),
      beliefEl,
      h('p', { class: 'rp-why__expert' },
        h('span', null, T.topExpert), ' ', h('b', null, top ? expertLabel(top.name, top.rotation) : DASH), ' ',
        h('span', { class: 'num' }, top ? `(${T.weight} ${fmt.pct(top.weight)})` : ''),
        h('small', null, counterfactualText(r.behaviour ? r.behaviour.wouldBe : null))));
  };

  // ------------------------------------------------------------------ (d) seal chain
  const payloadNodes = (/** @type {string} */ payload) => {
    /** @type {(string|Node)[]} */ const out = [];
    String(payload).split('|').forEach((part, i, all) => { out.push(i < all.length - 1 ? `${part}|` : part); if (i < all.length - 1) out.push(h('wbr')); });
    return out;
  };

  const verifyBlock = (/** @type {any} */ c) => {
    const out = h('div', { class: 'verify__out' });
    const btn = h('button', { class: 'btn', type: 'button' }, icon('reset'), T.verifyBtn);
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const v = await actions.verifySeal(c);
        fill(out,
          h('dl', null,
            h('div', null, h('dt', null, T.verifyOwn), h('dd', null, h('code', { class: 'code code--hash' }, fmt.hashGroups(v.own)))),
            h('div', null, h('dt', null, T.verifyWeb), h('dd', null, h('code', { class: 'code code--hash' }, v.webCrypto === null ? T.verifyNoCrypto : fmt.hashGroups(v.webCrypto))))),
          h('p', { class: `verify__res ${v.ok ? 'ok' : 'bad'}` }, icon(v.ok ? 'check' : 'warning'), v.ok ? T.verifyMatch : T.verifyMismatch));
        ctx.announce(`${M.verifyHintSeq(c.seq)}: ${v.ok ? T.verifyMatch : T.verifyMismatch}`);
      } finally { btn.disabled = false; }
    });
    const hash = String(c.hash ?? '');
    const details = h('details', { class: 'verify' },
      h('summary', null, icon('chevron', 'ic--sm verify__chev'), T.verifySelf, h('span', { class: 'verify__hint' }, icon('lock', 'ic--sm'), M.verifyHintSeq(c.seq))),
      h('div', { class: 'verify__body' },
        h('dl', null,
          h('div', null, h('dt', null, T.verifyPayload), h('dd', null, h('code', { class: 'code' }, c.payload ? payloadNodes(c.payload) : DASH))),
          h('div', null, h('dt', null, T.verifyHash), h('dd', null, h('code', { class: 'code code--hash' }, h('b', null, fmt.hash8(hash.slice(0, 8))), ' ', fmt.hashGroups(hash.slice(8)))))),
        h('p', { class: 'verify__note' }, T.verifyNote),
        h('div', { class: 'verify__act' }, btn, h('small', null, T.verifyHint)),
        out));
    return details;
  };

  const chain = (/** @type {any} */ r) => {
    const hid = nextId('rp-chain');
    const rows = r.commits.map((/** @type {any} */ c) => {
      const judged = c.seq === r.judgedSeq;
      return h('tr', { class: judged ? 'chain__final' : null },
        h('th', { scope: 'row' }, `#${c.seq}`, judged ? h('span', { class: 'chain__mark' }, icon('seal', 'ic--sm'), h('span', { class: 'chain__judged' }, T.judged)) : null),
        h('td', { class: 'num' }, fmt.rel(c.leadMs)),
        h('td', null, T.reasons[c.reason] ?? c.reason ?? DASH),
        h('td', null, h('span', { class: 'chain__move' }, glyph(c.move, { label: moveName(c.move) }), h('span', { 'aria-hidden': 'true' }, moveName(c.move)))),
        h('td', { class: 'num' }, fmt.hash8(c.short)),
        h('td', null,
          c.verified
            ? h('span', { class: 'ok' }, icon('check', 'ic--sm'), h('span', { class: 'sr-only' }, T.verified), h('span', { class: 'ok__t', 'aria-hidden': 'true' }, T.verified))
            : h('span', { class: 'bad' }, icon('warning', 'ic--sm'), T.verifyFailed),
          c.postLanding ? h('span', { class: 'chain__late' }, T.postLanding) : null));
    });
    const okN = r.commits.filter((/** @type {any} */ c) => c.verified).length;
    const allOk = r.sealOk && r.chainOk;
    return h('section', { class: 'rp rp--panel rp-chain', 'aria-labelledby': hid },
      h('h3', { class: 'rp__h', id: hid }, ix('03'), T.chainH, h('span', { class: 'rp__aside' }, T.chainAside)),
      h('div', { class: 'chain-wrap' }, h('table', { class: 'chain' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, T.thSeq), h('th', { scope: 'col' }, T.thTime), h('th', { scope: 'col' }, T.thReason), h('th', { scope: 'col' }, h('span', { class: 'th-sm' }, T.thMove)), h('th', { scope: 'col' }, T.thHash), h('th', { scope: 'col' }, h('span', { class: 'th-sm' }, T.thStatus)))),
        h('tbody', null, rows))),
      h('p', { class: `chain__foot${allOk ? '' : ' is-bad'}` }, icon(allOk ? 'seal' : 'warning'), h('span', null, M.chainFoot(okN, r.commits.length, r.judgedSeq), r.chainOk ? '' : ` ${M.chainBroken}`)),
      h('div', { class: 'verifies' }, r.commits.map((/** @type {any} */ c) => verifyBlock(c))));
  };

  // ------------------------------------------------------------------ (e) measurements
  const metrics = (/** @type {any} */ r) => {
    const hid = nextId('rp-metrics');
    const k = r.kinematics ?? {}, tm = r.timing ?? {};
    const lead = (/** @type {number|null} */ v) => (Number.isFinite(v) ? `${fmt.ms(v)} ${T.beforeLanding}` : DASH);
    /** @type {[string, string][]} */
    const items = [
      [T.mOnsetFront, lead(k.onsetLeadFrontMs)],
      [T.mOnsetBack, lead(k.onsetLeadBackMs)],
      [T.mOpening, fmt.ms(k.openingMsFront)],
      [T.mPeakVel, fmt.unit(k.peakFlexionVelDegS, T.degPerS)],
      [T.mVSpread, Number.isFinite(k.vSpreadDeg) ? `${fmt.num(k.vSpreadDeg, 1)}${T.deg}` : DASH],
      [T.mTracked, fmt.pct(tm.trackedInFlight)],
      [T.mFps, fmt.unit(tm.fpsInFlight, T.fps)],
      [T.mLandingSrc, r.landingSource ? T.landingSources[r.landingSource] ?? String(r.landingSource) : DASH],
      [T.mHeadFront, fmt.pct(k.headingFront)],
      [T.mHeadBack, fmt.pct(k.headingBack)],
      [T.mFlight, fmt.ms(tm.flightMs)],
      [T.mToLanding, fmt.ms(tm.leadToLandingMs)],
      [T.mSealLatency, fmt.ms(tm.sealLatencyMs)],
      [T.mWallLead, fmt.ms(tm.wallLeadMs)],
      [T.mToComplete, fmt.ms(tm.leadToCompletionMs)],
      [T.mProgress, fmt.pct(r.progressAtCommit)],
      [T.mLastInAir, fmt.ms(tm.lastInAirAgeMs)],
      [T.mNoise, fmt.num(k.noiseSd, 3)],
      [T.mRules, r.rules ? `${RULE_NAMES[r.rules.preset] ?? r.rules.preset} · εF ${fmt.num(r.rules.epsF, 2)} · εB ${fmt.num(r.rules.epsB, 2)}` : DASH],
    ];
    return h('section', { class: 'rp rp--panel rp-metrics', 'aria-labelledby': hid },
      h('h3', { class: 'rp__h', id: hid }, ix('04'), T.metricsH),
      h('dl', { class: 'kvgrid' }, items.map(([label, value]) => h('div', null, h('dt', null, label), h('dd', null, value)))));
  };

  // ------------------------------------------------------------------ render
  store.subscribe((st) => st.result, (r, st) => {
    if (!r) { shown = null; return; }
    if (r === shown) return;
    shown = r;
    const bpm = st.engine && Number.isFinite(st.engine.periodMs) && st.engine.periodMs > 0 ? 60000 / st.engine.periodMs : null;
    meta.textContent = M.reportMeta(r.round, st.series.rounds.length + (r.valid ? 0 : 1), st.series.length, bpm);
    simSlot.hidden = st.boot.source !== 'demo';
    const tech = h('details', { class: 'rp-tech' },
      h('summary', { class: 'rp-tech__sum' }, icon('chevron', 'ic--sm verify__chev'), 'Detaylı Zaman Grafiği, Mühür Zinciri ve Teknik Ölçümler'),
      h('div', { class: 'rp-tech__body' }, hero(r), why(r), chain(r), metrics(r)));
    tech.addEventListener('toggle', () => { if (tech.open && surface) surface.invalidate(); });
    fill(body, verdict(r, st.series), plainGuide(r, st), tech);
    body.scrollTop = 0;
    ctx.announce(M.outcomeAnnounce(r));
  });

  return {
    dialog,
    /** Element that receives focus when the sheet opens. */
    focusTarget: () => nextBtn,
    /** Called once per animation frame: the static timeline redraws only after a resize or a new result. */
    paint() {
      if (!surface || !shown) return;
      if (!surface.takeDirty()) return;
      if (surface.w < 8 || surface.h < 8) return;
      drawRoundTimeline(surface.begin(), surface.w, surface.h, shown, theme(), { labels: { landing: T.tlLand, done: T.tlDone } });
    },
    invalidate() { if (surface) surface.invalidate(); },
  };
}
