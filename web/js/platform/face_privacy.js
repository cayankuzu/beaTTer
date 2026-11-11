// @ts-check
/**
 * beaTTer v4 — face privacy: the player's face is defocused on the camera overlay, on every device.
 *
 * Behaviour is carried over unchanged from the previous version (it was the part that worked):
 *   1. BlazeFace detections (at most every 28 ms), box smoothed with alpha 0.42;
 *   2. when the detector sees nothing (low light, hand passing in front of the face): a skin-chroma head
 *      cluster on a 64x48 YCbCr scan every third frame, excluding the hand's bounding box, adopted after
 *      8 lost frames (alpha 0.25);
 *   3. when nothing has been found (or for 180 frames): an anatomical upper-centre zone (alpha 0.15) — the
 *      blur never drops;
 *   4. the blur itself is a three-stage bilinear down/up-sampling pyramid (28x28 -> 11x11 -> 32x32 with
 *      four sub-texel taps -> 256x256), which works where `ctx.filter` does not (iOS/iPadOS Safari), with a
 *      radial `destination-in` feather so it looks like optical defocus, not a mask.
 *
 * Nothing here stores or transmits image data: all canvases are scratch buffers in memory.
 */

const DETECT_EVERY_MS = 28;
const PATCH = 256;

export function createFacePrivacy() {
  let enabled = true;
  /** @type {{detect:(video:HTMLVideoElement, tMs:number) => any[]}|null} */ let detector = null;
  /** @type {any[]} */ let detections = [];
  let lastDetectT = -Infinity;
  /** @type {{originX:number, originY:number, width:number, height:number}|null} */ let smoothed = null;
  /** @type {{originX:number, originY:number, width:number, height:number}|null} */ let skinBox = null;
  let lostFrames = 0, skinScanFrame = 0;

  const mk = (/** @type {number} */ w, /** @type {number} */ h, /** @type {boolean} */ read = false) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return { c, x: /** @type {CanvasRenderingContext2D} */ (c.getContext('2d', read ? { willReadFrequently: true } : undefined)) };
  };
  const pyr1 = mk(28, 28), pyr2 = mk(11, 11), pyr3 = mk(32, 32), patch = mk(PATCH, PATCH), scan = mk(64, 48, true);

  const reset = () => { detections = []; smoothed = null; skinBox = null; lostFrames = 0; skinScanFrame = 0; };

  /** Skin-chroma head cluster on a 64x48 scan (YCbCr), excluding the hand region. */
  const detectSkinHeadCluster = (/** @type {HTMLVideoElement} */ video, /** @type {any[]|null} */ hand, /** @type {number} */ vw, /** @type {number} */ vh) => {
    try {
      const sw = 64, sh = 48;
      scan.x.drawImage(video, 0, 0, sw, sh);
      const data = scan.x.getImageData(0, 0, sw, sh).data;
      let hxMin = 2, hxMax = -1, hyMin = 2, hyMax = -1;
      if (hand && hand.length >= 21) {
        for (const p of hand) { if (p.x < hxMin) hxMin = p.x; if (p.x > hxMax) hxMax = p.x; if (p.y < hyMin) hyMin = p.y; if (p.y > hyMax) hyMax = p.y; }
        hxMin -= 0.12; hxMax += 0.12; hyMin -= 0.12; hyMax += 0.12;
      }
      let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumW = 0, count = 0;
      for (let y = 2; y < 42; y++) {
        const ny = y / sh;
        for (let x = 4; x < 60; x++) {
          const nx = x / sw;
          if (nx >= hxMin && nx <= hxMax && ny >= hyMin && ny <= hyMax) continue;
          const i = (y * sw + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          if (luma < 16 || luma > 246) continue;
          const minGB = g < b ? g : b;
          if (r <= g || r <= b || r - minGB < 7) continue;
          const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          if (cr >= 131 && cr <= 178 && cb >= 77 && cb <= 134) {
            const w = (1.15 - Math.abs(nx - 0.5) * 0.8) * (ny < 0.72 ? 1.2 : 0.7); // central-upper weighting
            sumX += x * w; sumY += y * w; sumX2 += x * x * w; sumY2 += y * y * w; sumW += w; count += 1;
          }
        }
      }
      if (count < 16 || sumW <= 0) return null;
      const meanX = sumX / sumW, meanY = sumY / sumW;
      const stdX = Math.sqrt(Math.max(4, sumX2 / sumW - meanX * meanX));
      const stdY = Math.sqrt(Math.max(6, sumY2 / sumW - meanY * meanY));
      const boxW = Math.max(vw * 0.24, Math.min(vw * 0.56, ((stdX * 3.5) / sw) * vw));
      const boxH = Math.max(vh * 0.30, Math.min(vh * 0.64, ((stdY * 3.7) / sh) * vh));
      return {
        originX: Math.max(0, Math.min(vw - boxW, (meanX / sw) * vw - boxW * 0.5)),
        originY: Math.max(0, Math.min(vh - boxH, (meanY / sh) * vh - boxH * 0.5)),
        width: boxW, height: boxH,
      };
    } catch { return null; }
  };

  const follow = (/** @type {{originX:number, originY:number, width:number, height:number}} */ target, /** @type {number} */ alpha) => {
    if (!smoothed) { smoothed = { ...target }; return; }
    smoothed.originX += (target.originX - smoothed.originX) * alpha;
    smoothed.originY += (target.originY - smoothed.originY) * alpha;
    smoothed.width += (target.width - smoothed.width) * alpha;
    smoothed.height += (target.height - smoothed.height) * alpha;
  };

  /**
   * Run the face detector if it is due. Call once per camera frame.
   * @param {HTMLVideoElement} video @param {number} tMs
   */
  const update = (video, tMs) => {
    if (!enabled || !detector || video.readyState < 2 || video.videoWidth === 0 || video.paused) return;
    if (tMs - lastDetectT < DETECT_EVERY_MS && detections.length > 0) return;
    lastDetectT = tMs;
    detections = detector.detect(video, tMs);
  };

  /**
   * Paint the defocus patches over the face region(s). The canvas is assumed to cover the video element
   * with `object-fit: cover`; drawing is done in canvas pixels regardless of any transform set by the caller.
   * @param {CanvasRenderingContext2D} ctx @param {HTMLVideoElement} video @param {HTMLCanvasElement} canvas
   * @param {any[]|null} [hand] image landmarks of the hand (excluded from the skin scan)
   */
  const draw = (ctx, video, canvas, hand = null) => {
    if (!enabled || !video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    const cw = canvas.width, ch = canvas.height;
    const dpr = canvas.clientWidth > 0 ? cw / canvas.clientWidth : 1;
    const normalise = (/** @type {any} */ raw) => {
      if (!raw) return null;
      const isNorm = raw.width <= 2 && raw.height <= 2 && raw.originX <= 2 && raw.originY <= 2;
      return isNorm ? { originX: raw.originX * vw, originY: raw.originY * vh, width: raw.width * vw, height: raw.height * vh } : { originX: raw.originX, originY: raw.originY, width: raw.width, height: raw.height };
    };

    const primary = detections.length > 0 && detections[0] && detections[0].boundingBox ? normalise(detections[0].boundingBox) : null;
    if (primary) {
      lostFrames = 0;
      follow(primary, 0.42);
    } else {
      lostFrames += 1; skinScanFrame += 1;
      if (skinScanFrame % 3 === 0 || !skinBox) { const s = detectSkinHeadCluster(video, hand, vw, vh); if (s) skinBox = s; }
      if (skinBox && (!smoothed || lostFrames > 8)) follow(skinBox, 0.25);
      else if (!smoothed || lostFrames > 180) follow({ originX: vw * 0.27, originY: vh * 0.08, width: vw * 0.46, height: vh * 0.48 }, 0.15);
    }
    if (!smoothed) return;

    const scale = Math.max(cw / vw, ch / vh);
    const offsetX = (cw - vw * scale) * 0.5, offsetY = (ch - vh * scale) * 0.5;
    const boxes = [smoothed];
    for (let i = 1; i < detections.length; i++) { const b = detections[i] && detections[i].boundingBox ? normalise(detections[i].boundingBox) : null; if (b) boxes.push(b); }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const box of boxes) {
      const cx = box.originX * scale + offsetX + (box.width * scale) / 2;
      const cy = box.originY * scale + offsetY + (box.height * scale) / 2;
      const rx = Math.max(46 * dpr, ((box.width * scale) / 2) * 1.62);
      const ry = Math.max(58 * dpr, ((box.height * scale) / 2) * 1.82);
      const srcX = Math.max(0, Math.min(vw - 16, (cx - rx - offsetX) / scale));
      const srcY = Math.max(0, Math.min(vh - 16, (cy - ry - offsetY) / scale));
      const srcW = Math.max(16, Math.min(vw - srcX, (rx * 2) / scale));
      const srcH = Math.max(16, Math.min(vh - srcY, (ry * 2) / scale));

      for (const p of [pyr1, pyr2, pyr3]) p.x.imageSmoothingEnabled = true;
      pyr1.x.clearRect(0, 0, 28, 28);
      pyr1.x.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, 28, 28);
      pyr2.x.clearRect(0, 0, 11, 11);
      pyr2.x.drawImage(pyr1.c, 0, 0, 28, 28, 0, 0, 11, 11);
      pyr3.x.clearRect(0, 0, 32, 32);
      pyr3.x.globalAlpha = 1;
      pyr3.x.drawImage(pyr2.c, 0, 0, 11, 11, 0, 0, 32, 32);
      pyr3.x.globalAlpha = 0.35; // four sub-texel taps hide the bilinear grid
      pyr3.x.drawImage(pyr2.c, 0, 0, 11, 11, -0.7, -0.7, 32.7, 32.7);
      pyr3.x.drawImage(pyr2.c, 0, 0, 11, 11, 0.7, -0.7, 31.3, 32.7);
      pyr3.x.drawImage(pyr2.c, 0, 0, 11, 11, -0.7, 0.7, 32.7, 31.3);
      pyr3.x.drawImage(pyr2.c, 0, 0, 11, 11, 0.7, 0.7, 31.3, 31.3);
      pyr3.x.globalAlpha = 1;

      const px = patch.x;
      px.clearRect(0, 0, PATCH, PATCH);
      px.imageSmoothingEnabled = true;
      try { px.filter = 'blur(14px) saturate(1.12) contrast(1.04)'; } catch { /* unsupported: the pyramid alone blurs */ }
      px.drawImage(pyr3.c, 0, 0, 32, 32, 0, 0, PATCH, PATCH);
      try { px.filter = 'none'; } catch { /* ignore */ }
      // feathered radial falloff: optical bokeh, no hard edge
      const half = PATCH / 2;
      px.save();
      px.globalCompositeOperation = 'destination-in';
      const grad = px.createRadialGradient(half, half, half * 0.18, half, half, half * 0.98);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.98)');
      grad.addColorStop(0.72, 'rgba(0,0,0,0.74)');
      grad.addColorStop(0.88, 'rgba(0,0,0,0.28)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      px.fillStyle = grad;
      px.beginPath();
      px.arc(half, half, half, 0, Math.PI * 2);
      px.fill();
      px.restore();

      ctx.drawImage(patch.c, 0, 0, PATCH, PATCH, cx - rx, cy - ry, rx * 2, ry * 2);
    }
    ctx.restore();
  };

  return {
    update, draw,
    /** @param {boolean} on */
    setEnabled(on) { enabled = !!on; if (!enabled) reset(); },
    get enabled() { return enabled; },
    /** @param {{detect:(video:HTMLVideoElement, tMs:number) => any[]}|null} d null = detector unavailable (fallbacks still blur) */
    setDetector(d) { detector = d; },
    get hasDetector() { return !!detector; },
  };
}
