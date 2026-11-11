// @ts-check
/**
 * beaTTer v4 — HiDPI canvas surface.
 *
 * The backing store always equals the element's CSS box times devicePixelRatio (kept in sync by a
 * ResizeObserver, never measured in the frame path). `begin()` clears and returns a context scaled so
 * that drawing code works in CSS pixels; `beginRaw()` clears and leaves the context in device pixels.
 */

/**
 * @param {HTMLCanvasElement} canvas
 */
export function createSurface(canvas) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  let w = 0, h = 0, dpr = 1;
  let dirty = true;

  /** @param {number} cssW @param {number} cssH @param {number} [pxW] @param {number} [pxH] */
  const resize = (cssW, cssH, pxW, pxH) => {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const bw = Math.max(1, Math.round(pxW ?? cssW * ratio)), bh = Math.max(1, Math.round(pxH ?? cssH * ratio));
    w = cssW; h = cssH; dpr = cssW > 0 ? bw / cssW : ratio;
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    dirty = true;
  };

  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const box = e.contentBoxSize && e.contentBoxSize[0];
      const dp = /** @type {any} */ (e).devicePixelContentBoxSize && /** @type {any} */ (e).devicePixelContentBoxSize[0];
      const cssW = box ? box.inlineSize : e.contentRect.width, cssH = box ? box.blockSize : e.contentRect.height;
      if (dp) resize(cssW, cssH, dp.inlineSize, dp.blockSize); else resize(cssW, cssH);
    }
  });
  try { ro.observe(canvas, { box: 'device-pixel-content-box' }); } catch { ro.observe(canvas); }

  return {
    canvas, ctx,
    get w() { return w; },
    get h() { return h; },
    get dpr() { return dpr; },
    /** true once after every resize (and after `invalidate()`): static canvases redraw only then */
    takeDirty() { const d = dirty; dirty = false; return d; },
    invalidate() { dirty = true; },
    /** Clear; context in CSS pixels. */
    begin() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    },
    /** Clear; context in device pixels (identity transform). */
    beginRaw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return ctx;
    },
    /** Switch an already cleared context to CSS pixels. */
    toCss() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx; },
    destroy() { ro.disconnect(); },
  };
}
