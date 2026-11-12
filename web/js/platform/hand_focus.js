// @ts-check
/**
 * beaTTer v4 — camera privacy: the whole picture is defocused, only the tracked hand stays sharp.
 *
 * The previous version blurred the FACE: a face detector (BlazeFace) at a low confidence threshold, a
 * skin-colour fallback and a fixed zone. In real use the blur wandered onto the hand and the arm, the
 * fallback could leave the face uncovered, and the detector cost about 10 ms per frame on top of the hand
 * tracker. Now nothing has to be found for the face to be hidden:
 *   - the frame is defocused as a whole (sigma about 5 % of the frame width: faces, text and the room are
 *     reduced to soft colour fields);
 *   - only the hand the tracker reports is kept sharp: capsules along the bones, the palm and the wrist,
 *     with a feathered edge;
 *   - when no hand is tracked, everything is defocused.
 * The picture painted is the TRACKED frame (a copy the camera source makes before running the tracker on
 * it), not whatever the <video> element shows at paint time: the sharp window is computed from that very
 * frame, so it always sits on the hand, at the price of showing the camera one tracker inference late.
 * Defence in depth: while privacy is on, the <video> element underneath carries a CSS blur of its own,
 * so the face stays hidden if this painter fails or has not painted yet (CSS filters do not affect
 * drawImage; the painter covers the element completely).
 *
 * Background: the frame is reduced in two steps to BG_COLS columns, blurred once more at that size and
 * scaled back up with smoothing; a padded buffer keeps the edges from darkening. The blur uses the
 * canvas filter where it exists and a small separable Gaussian in JavaScript (a few thousand values)
 * where it does not, so the defocus is the same in every browser.
 *
 * Nothing here stores or transmits image data: all canvases are scratch buffers in memory.
 */

/** Columns of the reduced background frame (rows follow the frame's aspect). */
export const BG_COLS = 32;
/** Columns of the intermediate reduction (area averaging before the final reduction). */
const MID_COLS = 128;
/** Extra blur at the reduced size (Gaussian sigma in cells). */
export const BG_BLUR_CELLS = 1.6;
/** Padding of the reduced frame (cells): the blur samples real colours at the edges, not transparency. */
export const BG_PAD = 4;

/** Bones of the hand (MediaPipe numbering): each becomes a capsule of the sharp region. */
export const BONES = Object.freeze([
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]);
/** Wrist, thumb base and the four knuckles: the palm polygon. */
export const PALM = Object.freeze([0, 1, 2, 5, 9, 13, 17]);

/**
 * Sizes relative to the hand's reference length (see handMaskGeometry). A finger is about 0.1 palm
 * lengths wide on each side of its bone line; the capsule adds about as much again for landmark jitter,
 * but no more: everything sharp around the hand is a part of the picture that is no longer private (a
 * hand held in front of the face uncovers the face right next to it).
 */
export const SHAPE = Object.freeze({ capsule: 0.22, wrist: 0.36, feather: 0.09, minRefPx: 14 });

/**
 * Geometry of the sharp region in canvas pixels (pure). The reference length is the larger of the palm
 * length (wrist to middle knuckle) and 0.45 x the larger side of the landmarks' bounding box, so that a
 * fist seen knuckles-first (foreshortened palm) still gets a capsule as wide as its fingers.
 * @param {{x:number, y:number}[]|null|undefined} lm 21 normalised landmarks
 * @param {{x:(n:number)=>number, y:(n:number)=>number}} pr projection to canvas pixels
 * @returns {null | {pts:{x:number,y:number}[], ref:number, radius:number, wristRadius:number, feather:number,
 *                   box:{x0:number, y0:number, x1:number, y1:number}}}
 */
export function handMaskGeometry(lm, pr) {
  if (!Array.isArray(lm) || lm.length < 21) return null;
  /** @type {{x:number,y:number}[]} */ const pts = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 21; i++) {
    const p = lm[i];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    const q = { x: pr.x(p.x), y: pr.y(p.y) };
    if (!Number.isFinite(q.x) || !Number.isFinite(q.y)) return null;
    pts.push(q);
    if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x;
    if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y;
  }
  const palm = Math.hypot(pts[9].x - pts[0].x, pts[9].y - pts[0].y);
  const ref = Math.max(palm, 0.45 * Math.max(x1 - x0, y1 - y0), SHAPE.minRefPx);
  const radius = SHAPE.capsule * ref, wristRadius = SHAPE.wrist * ref, feather = SHAPE.feather * ref;
  const pad = Math.max(radius, wristRadius) + 2.5 * feather;
  return { pts, ref, radius, wristRadius, feather, box: { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad } };
}

/**
 * Object-fit: cover mapping of a frame (vw x vh) into a canvas (cw x ch), in canvas pixels.
 * @param {number} cw @param {number} ch @param {number} vw @param {number} vh
 */
export function coverFit(cw, ch, vw, vh) {
  const scale = Math.max(cw / vw, ch / vh);
  const dx = (cw - vw * scale) / 2, dy = (ch - vh * scale) / 2;
  return { scale, dx, dy, x: (/** @type {number} */ nx) => dx + nx * vw * scale, y: (/** @type {number} */ ny) => dy + ny * vh * scale };
}

/**
 * Separable Gaussian blur of an RGBA buffer in place (pure; edges clamped). Used where the canvas has no
 * `filter`, on the reduced background only (a few thousand values per frame).
 * @param {Uint8ClampedArray} data @param {number} w @param {number} h @param {number} sigma in pixels
 */
export function blurRGBA(data, w, h, sigma) {
  if (!(sigma > 0) || w < 1 || h < 1) return data;
  const r = Math.max(1, Math.ceil(3 * sigma));
  const k = new Float64Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); sum += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float64Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 4; c++) {
        let acc = 0;
        for (let i = -r; i <= r; i++) { const xx = Math.min(w - 1, Math.max(0, x + i)); acc += k[i + r] * data[(y * w + xx) * 4 + c]; }
        tmp[(y * w + x) * 4 + c] = acc;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 4; c++) {
        let acc = 0;
        for (let i = -r; i <= r; i++) { const yy = Math.min(h - 1, Math.max(0, y + i)); acc += k[i + r] * tmp[(yy * w + x) * 4 + c]; }
        data[(y * w + x) * 4 + c] = acc;
      }
    }
  }
  return data;
}

/**
 * Pixel size of a frame source (a <video>, or a canvas copy of a frame), or null when it has no frame.
 * @param {any} src
 * @returns {{w:number, h:number}|null}
 */
export function frameSize(src) {
  if (!src) return null;
  if (typeof src.videoWidth === 'number') {
    return src.readyState >= 2 && src.videoWidth > 0 && src.videoHeight > 0 ? { w: src.videoWidth, h: src.videoHeight } : null;
  }
  return src.width > 0 && src.height > 0 ? { w: src.width, h: src.height } : null;
}

export function createHandFocus() {
  let enabled = true;
  const mk = (/** @type {boolean} */ read = false) => {
    const c = document.createElement('canvas');
    c.width = 2; c.height = 2;
    return { c, x: /** @type {CanvasRenderingContext2D} */ (c.getContext('2d', read ? { willReadFrequently: true } : undefined)) };
  };
  const probe = /** @type {CanvasRenderingContext2D} */ (document.createElement('canvas').getContext('2d'));
  const canFilter = typeof probe.filter === 'string';
  // without canvas filters the reduced background is blurred in JavaScript: read it back cheaply
  const mid = mk(), pad = mk(!canFilter), bg = mk(), shapes = mk(), mask = mk(), sharp = mk();

  /** @param {{c:HTMLCanvasElement}} b @param {number} w @param {number} h grow-only, so a moving hand does not reallocate every frame */
  const ensure = (b, w, h) => {
    if (b.c.width < w || b.c.height < h) { b.c.width = Math.max(b.c.width, Math.ceil(w)); b.c.height = Math.max(b.c.height, Math.ceil(h)); }
  };

  /** The whole frame, defocused, drawn with the cover mapping. */
  const background = (/** @type {CanvasRenderingContext2D} */ ctx, /** @type {CanvasImageSource} */ src, /** @type {ReturnType<typeof coverFit>} */ fit, /** @type {number} */ vw, /** @type {number} */ vh) => {
    const cols = BG_COLS, rows = Math.max(2, Math.round((BG_COLS * vh) / vw));
    const mc = MID_COLS, mr = Math.max(2, Math.round((MID_COLS * vh) / vw));
    const W = cols + 2 * BG_PAD, H = rows + 2 * BG_PAD;
    if (mid.c.width !== mc || mid.c.height !== mr) { mid.c.width = mc; mid.c.height = mr; }
    if (pad.c.width !== W || pad.c.height !== H) { pad.c.width = W; pad.c.height = H; bg.c.width = W; bg.c.height = H; }
    for (const b of [mid, pad]) b.x.imageSmoothingEnabled = true;
    mid.x.drawImage(src, 0, 0, mc, mr);                  // first reduction: averages, does not point-sample
    pad.x.drawImage(mid.c, 0, 0, W, H);                  // stretched underlay: plausible colours in the padding
    pad.x.drawImage(mid.c, BG_PAD, BG_PAD, cols, rows);  // the frame itself
    /** @type {HTMLCanvasElement} */ let out = pad.c;
    if (canFilter) {
      bg.x.clearRect(0, 0, W, H);
      bg.x.filter = `blur(${BG_BLUR_CELLS}px)`;
      bg.x.drawImage(pad.c, 0, 0);
      bg.x.filter = 'none';
      out = bg.c;
    } else {
      const img = pad.x.getImageData(0, 0, W, H);
      blurRGBA(img.data, W, H, BG_BLUR_CELLS);
      pad.x.putImageData(img, 0, 0);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(out, BG_PAD, BG_PAD, cols, rows, fit.dx, fit.dy, vw * fit.scale, vh * fit.scale);
  };

  /** The hand, sharp, with a feathered edge. Returns false when there is nothing to draw. */
  const hand = (/** @type {CanvasRenderingContext2D} */ ctx, /** @type {CanvasImageSource} */ src, /** @type {ReturnType<typeof coverFit>} */ fit, /** @type {number} */ vw, /** @type {number} */ vh, /** @type {number} */ cw, /** @type {number} */ ch, /** @type {any[]} */ lm) => {
    const g = handMaskGeometry(lm, fit);
    if (!g) return false;
    // work on the region extended past the canvas by the feather's reach: a hand crossing the edge of the
    // stage keeps its sharp edge there instead of fading against the clipped-off part of the mask
    const m = Math.ceil(3 * Math.max(1, g.feather));
    const ex0 = Math.max(-m, Math.floor(g.box.x0)), ey0 = Math.max(-m, Math.floor(g.box.y0));
    const ex1 = Math.min(cw + m, Math.ceil(g.box.x1)), ey1 = Math.min(ch + m, Math.ceil(g.box.y1));
    const ew = ex1 - ex0, eh = ey1 - ey0;
    const bx0 = Math.max(0, ex0), by0 = Math.max(0, ey0), bx1 = Math.min(cw, ex1), by1 = Math.min(ch, ey1);
    if (ew < 2 || eh < 2 || bx1 - bx0 < 1 || by1 - by0 < 1) return false;
    // Downscale the alpha mask buffer when blurring: ~8x fewer pixels and a proportionally smaller blur
    // kernel makes main-thread mask generation ~20x faster with identical feathered edges.
    const ms = canFilter ? 0.35 : 1;
    const mw = Math.max(2, Math.ceil(ew * ms)), mh = Math.max(2, Math.ceil(eh * ms));
    for (const b of [shapes, mask]) ensure(b, mw, mh);
    ensure(sharp, ew, eh);

    // 1. the region: capsules along the bones, the palm polygon, the wrist
    const s = shapes.x;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.clearRect(0, 0, mw, mh);
    s.setTransform(ms, 0, 0, ms, -ex0 * ms, -ey0 * ms);
    s.fillStyle = '#fff'; s.strokeStyle = '#fff';
    s.lineCap = 'round'; s.lineJoin = 'round';
    s.lineWidth = 2 * g.radius;
    s.beginPath();
    for (const [a, b] of BONES) { s.moveTo(g.pts[a].x, g.pts[a].y); s.lineTo(g.pts[b].x, g.pts[b].y); }
    s.stroke();
    s.beginPath();
    PALM.forEach((k, i) => { if (i === 0) s.moveTo(g.pts[k].x, g.pts[k].y); else s.lineTo(g.pts[k].x, g.pts[k].y); });
    s.closePath();
    s.fill(); s.stroke();
    s.beginPath();
    s.arc(g.pts[0].x, g.pts[0].y, g.wristRadius, 0, Math.PI * 2);
    s.fill();
    s.setTransform(1, 0, 0, 1, 0, 0);

    // 2. feathered mask (hard-edged where the canvas has no filter: cosmetic only, the region is the same)
    let maskCanvas = shapes.c;
    if (canFilter) {
      mask.x.clearRect(0, 0, mw, mh);
      mask.x.filter = `blur(${Math.max(0.8, g.feather * ms).toFixed(2)}px)`;
      mask.x.drawImage(shapes.c, 0, 0, mw, mh, 0, 0, mw, mh);
      mask.x.filter = 'none';
      maskCanvas = mask.c;
    }

    // 3. the tracked frame inside the region (source rectangle clamped to the frame)
    const sx0 = Math.max(0, (ex0 - fit.dx) / fit.scale), sy0 = Math.max(0, (ey0 - fit.dy) / fit.scale);
    const sx1 = Math.min(vw, (ex1 - fit.dx) / fit.scale), sy1 = Math.min(vh, (ey1 - fit.dy) / fit.scale);
    if (sx1 - sx0 < 1 || sy1 - sy0 < 1) return false;
    const h = sharp.x;
    h.globalCompositeOperation = 'source-over';
    h.clearRect(0, 0, ew, eh);
    h.drawImage(src, sx0, sy0, sx1 - sx0, sy1 - sy0,
      fit.dx + sx0 * fit.scale - ex0, fit.dy + sy0 * fit.scale - ey0, (sx1 - sx0) * fit.scale, (sy1 - sy0) * fit.scale);
    h.globalCompositeOperation = 'destination-in';
    h.imageSmoothingEnabled = true;
    h.drawImage(maskCanvas, 0, 0, mw, mh, 0, 0, ew, eh);
    h.globalCompositeOperation = 'source-over';

    // 4. the visible part only
    ctx.drawImage(sharp.c, bx0 - ex0, by0 - ey0, bx1 - bx0, by1 - by0, bx0, by0, bx1 - bx0, by1 - by0);
    return true;
  };

  /**
   * Paint the private picture: the whole frame defocused, the tracked hand sharp. The canvas is assumed to
   * cover the video element with `object-fit: cover` (and the same mirroring); drawing is done in canvas
   * pixels regardless of any transform set by the caller.
   * @param {CanvasRenderingContext2D} ctx
   * @param {any} src the tracked frame (a canvas copy) or, before the first tracked frame, the <video>
   * @param {HTMLCanvasElement} canvas
   * @param {{x:number,y:number}[]|null} [lm] image landmarks of the hand in `src`, null when there is none
   * @returns {boolean} true when the picture was painted (false: no frame yet; the CSS blur covers it)
   */
  const draw = (ctx, src, canvas, lm = null) => {
    const size = enabled ? frameSize(src) : null;
    if (!size) return false;
    const vw = size.w, vh = size.h, cw = canvas.width, ch = canvas.height;
    if (cw < 2 || ch < 2) return false;
    const fit = coverFit(cw, ch, vw, vh);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    background(ctx, src, fit, vw, vh);
    if (lm) hand(ctx, src, fit, vw, vh, cw, ch, lm);
    ctx.restore();
    return true;
  };

  return {
    draw,
    /** @param {boolean} on */
    setEnabled(on) { enabled = !!on; },
    get enabled() { return enabled; },
  };
}
