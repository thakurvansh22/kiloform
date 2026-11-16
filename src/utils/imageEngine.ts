import type { DimensionUnit, ImageFormat } from '../data/presets';
import type { PixelWorkerRequest, PixelWorkerResponse } from '../workers/pixelWorker';

export interface LoadedImage {
  canvas: HTMLCanvasElement;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  originalSizeBytes: number;
  fileName: string;
}

export interface CropState {
  zoom: number;
  offsetX: number; // normalized -1..1 relative to frame
  offsetY: number;
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
}

export const DEFAULT_CROP_STATE: CropState = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
};

export interface ProcessedResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  dpi: number;
  sizeBytes: number;
  sizeKB: number;
  format: ImageFormat;
  meetsRequirement: boolean;
  statusReason: string;
}

export function unitToPixels(value: number, unit: DimensionUnit, dpi: number): number {
  const safeValue = Math.max(0.01, Number.isFinite(value) ? value : 1);
  const safeDpi = Math.max(72, Number.isFinite(dpi) ? dpi : 200);
  switch (unit) {
    case 'px':
      return Math.max(10, Math.round(safeValue));
    case 'inch':
      return Math.max(10, Math.round(safeValue * safeDpi));
    case 'cm':
      return Math.max(10, Math.round((safeValue / 2.54) * safeDpi));
    case 'mm':
      return Math.max(10, Math.round((safeValue / 25.4) * safeDpi));
    default:
      return Math.max(10, Math.round(safeValue));
  }
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Loads JPG, PNG, WEBP, or HEIC/HEIF locally and scales down huge photos (>2400px)
 * to keep mobile & desktop canvas memory responsive.
 */
export async function loadImageFile(file: File): Promise<LoadedImage> {
  const lower = file.name.toLowerCase();
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    lower.endsWith('.heic') ||
    lower.endsWith('.heif');

  let sourceBlob: Blob = file;
  if (isHeic) {
    try {
      const heicModule = await import('heic2any');
      const convert = heicModule.default;
      const converted = await convert({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92,
      });
      sourceBlob = Array.isArray(converted) ? converted[0] : converted;
    } catch {
      throw new Error(
        'Could not decode this HEIC/HEIF file. Please try exporting as JPG or PNG from your gallery.'
      );
    }
  }

  const rawUrl = URL.createObjectURL(sourceBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
      el.src = rawUrl;
    });

    const MAX_DIM = 2200;
    let targetW = img.naturalWidth;
    let targetH = img.naturalHeight;
    if (targetW > MAX_DIM || targetH > MAX_DIM) {
      const scale = Math.min(MAX_DIM / targetW, MAX_DIM / targetH);
      targetW = Math.round(targetW * scale);
      targetH = Math.round(targetH * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Browser canvas context is unavailable.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const previewBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to build image preview.'))),
        'image/jpeg',
        0.92
      );
    });

    return {
      canvas,
      previewUrl: URL.createObjectURL(previewBlob),
      originalWidth: img.naturalWidth,
      originalHeight: img.naturalHeight,
      originalSizeBytes: file.size,
      fileName: file.name,
    };
  } finally {
    URL.revokeObjectURL(rawUrl);
  }
}

let sharedWorker: Worker | null = null;
let workerMsgId = 1;

function getPixelWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!sharedWorker) {
    try {
      sharedWorker = new Worker(new URL('../workers/pixelWorker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      return null;
    }
  }
  return sharedWorker;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

function runWorkerTask(req: DistributiveOmit<PixelWorkerRequest, 'id'>): Promise<PixelWorkerResponse> {
  const worker = getPixelWorker();
  if (!worker) {
    return Promise.resolve({ id: 0, ok: false, error: 'Web Worker unavailable' });
  }
  const id = workerMsgId++;
  return new Promise((resolve) => {
    const onMessage = (e: MessageEvent<PixelWorkerResponse>) => {
      if (e.data.id === id) {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        resolve(e.data);
      }
    };
    const onError = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      resolve({ id, ok: false, error: 'Worker execution failed' });
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    const payload = { ...req, id } as PixelWorkerRequest;
    worker.postMessage(payload, [payload.buffer]);
  });
}

export async function applyBackgroundReplace(
  sourceCanvas: HTMLCanvasElement,
  targetHex: string,
  tolerance: number
): Promise<HTMLCanvasElement> {
  const out = document.createElement('canvas');
  out.width = sourceCanvas.width;
  out.height = sourceCanvas.height;
  const ctx = out.getContext('2d');
  if (!ctx) return sourceCanvas;
  ctx.drawImage(sourceCanvas, 0, 0);

  const r = parseInt(targetHex.slice(1, 3), 16);
  const g = parseInt(targetHex.slice(3, 5), 16);
  const b = parseInt(targetHex.slice(5, 7), 16);

  const imgData = ctx.getImageData(0, 0, out.width, out.height);
  const copyBuf = imgData.data.buffer.slice(0);
  const res = await runWorkerTask({
    type: 'floodFillBackground',
    buffer: copyBuf,
    width: out.width,
    height: out.height,
    targetRgb: [r, g, b],
    tolerance,
  });

  if (res.ok) {
    const nextData = new ImageData(new Uint8ClampedArray(res.buffer), res.width, res.height);
    ctx.putImageData(nextData, 0, 0);
  }
  return out;
}

export async function applySignatureCleanup(
  sourceCanvas: HTMLCanvasElement,
  options: {
    mode: 'bw' | 'enhance' | 'original';
    thickness: number;
    whiteBg: boolean;
    autoCrop: boolean;
  }
): Promise<HTMLCanvasElement> {
  const work = document.createElement('canvas');
  work.width = sourceCanvas.width;
  work.height = sourceCanvas.height;
  const ctx = work.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, work.width, work.height);
  ctx.drawImage(sourceCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, work.width, work.height);
  const copyBuf = imgData.data.buffer.slice(0);

  const res = await runWorkerTask({
    type: 'cleanSignature',
    buffer: copyBuf,
    width: work.width,
    height: work.height,
    mode: options.mode,
    thickness: options.thickness,
    whiteBg: options.whiteBg,
    autoCrop: options.autoCrop,
  });

  if (!res.ok) return work;

  const processed = new ImageData(new Uint8ClampedArray(res.buffer), res.width, res.height);
  ctx.putImageData(processed, 0, 0);

  if (options.autoCrop && res.cropBox) {
    const { x, y, w, h } = res.cropBox;
    const cropped = document.createElement('canvas');
    cropped.width = Math.max(10, w);
    cropped.height = Math.max(10, h);
    const cCtx = cropped.getContext('2d');
    if (cCtx) {
      cCtx.fillStyle = '#ffffff';
      cCtx.fillRect(0, 0, cropped.width, cropped.height);
      cCtx.drawImage(work, x, y, w, h, 0, 0, cropped.width, cropped.height);
      return cropped;
    }
  }

  return work;
}

export async function applyThumbCleanup(
  sourceCanvas: HTMLCanvasElement,
  options: {
    contrast: number;
    threshold: number;
    bw: boolean;
    autoCrop: boolean;
  }
): Promise<HTMLCanvasElement> {
  const work = document.createElement('canvas');
  work.width = sourceCanvas.width;
  work.height = sourceCanvas.height;
  const ctx = work.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, work.width, work.height);
  ctx.drawImage(sourceCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, work.width, work.height);
  const copyBuf = imgData.data.buffer.slice(0);

  const res = await runWorkerTask({
    type: 'cleanThumbImpression',
    buffer: copyBuf,
    width: work.width,
    height: work.height,
    contrast: options.contrast,
    threshold: options.threshold,
    bw: options.bw,
    autoCrop: options.autoCrop,
  });

  if (!res.ok) return work;

  const processed = new ImageData(new Uint8ClampedArray(res.buffer), res.width, res.height);
  ctx.putImageData(processed, 0, 0);

  if (options.autoCrop && res.cropBox) {
    const { x, y, w, h } = res.cropBox;
    const cropped = document.createElement('canvas');
    cropped.width = Math.max(10, w);
    cropped.height = Math.max(10, h);
    const cCtx = cropped.getContext('2d');
    if (cCtx) {
      cCtx.fillStyle = '#ffffff';
      cCtx.fillRect(0, 0, cropped.width, cropped.height);
      cCtx.drawImage(work, x, y, w, h, 0, 0, cropped.width, cropped.height);
      return cropped;
    }
  }

  return work;
}

/**
 * Renders cropped/rotated/flipped/adjusted source canvas onto exact target pixel dimensions.
 */
export function renderCroppedCanvas(
  source: HTMLCanvasElement,
  targetW: number,
  targetH: number,
  crop: CropState,
  adjustments: {
    brightness: number; // -50..50
    contrast: number; // -50..50
    fitMode?: 'cover' | 'contain';
    backgroundColor?: string;
  }
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = Math.max(10, Math.round(targetW));
  out.height = Math.max(10, Math.round(targetH));
  const ctx = out.getContext('2d');
  if (!ctx) return out;

  ctx.fillStyle = adjustments.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);

  // Build rotated intermediate canvas
  const rotRad = (crop.rotation * Math.PI) / 180;
  const swap = crop.rotation % 180 !== 0;
  const rotW = swap ? source.height : source.width;
  const rotH = swap ? source.width : source.height;

  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = rotW;
  rotCanvas.height = rotH;
  const rCtx = rotCanvas.getContext('2d');
  if (!rCtx) return out;

  rCtx.save();
  rCtx.translate(rotW / 2, rotH / 2);
  rCtx.rotate(rotRad);
  rCtx.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1);
  rCtx.drawImage(source, -source.width / 2, -source.height / 2);
  rCtx.restore();

  const bVal = 100 + adjustments.brightness;
  const cVal = 100 + adjustments.contrast;
  ctx.filter = `brightness(${bVal}%) contrast(${cVal}%)`;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const baseScale =
    adjustments.fitMode === 'contain'
      ? Math.min(out.width / rotW, out.height / rotH)
      : Math.max(out.width / rotW, out.height / rotH);
  const drawScale = baseScale * Math.max(0.4, crop.zoom);
  const drawW = rotW * drawScale;
  const drawH = rotH * drawScale;

  const dx = (out.width - drawW) / 2 + crop.offsetX * (out.width * 0.5);
  const dy = (out.height - drawH) / 2 + crop.offsetY * (out.height * 0.5);

  ctx.drawImage(rotCanvas, dx, dy, drawW, drawH);
  ctx.filter = 'none';
  return out;
}

/**
 * Patches or inserts a standard JFIF APP0 marker with exact X/Y DPI into JPEG bytes.
 */
export async function writeJpegDpi(jpegBlob: Blob, dpi: number): Promise<Blob> {
  const safeDpi = Math.max(72, Math.min(1200, Math.round(dpi)));
  const buf = await jpegBlob.arrayBuffer();
  const bytes = new Uint8Array(buf);

  if (bytes.length < 18 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return jpegBlob;
  }

  // Check for existing JFIF APP0 header at offset 2
  if (
    bytes[2] === 0xff &&
    bytes[3] === 0xe0 &&
    bytes[6] === 0x4a && // J
    bytes[7] === 0x46 && // F
    bytes[8] === 0x49 && // I
    bytes[9] === 0x46 && // F
    bytes[10] === 0x00
  ) {
    const out = new Uint8Array(bytes);
    out[13] = 1; // Density units: 1 = dots per inch
    out[14] = (safeDpi >> 8) & 0xff;
    out[15] = safeDpi & 0xff;
    out[16] = (safeDpi >> 8) & 0xff;
    out[17] = safeDpi & 0xff;
    return new Blob([out], { type: 'image/jpeg' });
  }

  // Insert 18-byte JFIF APP0 marker immediately after SOI (FF D8)
  const jfif = new Uint8Array([
    0xff,
    0xe0,
    0x00,
    0x10,
    0x4a,
    0x46,
    0x49,
    0x46,
    0x00,
    0x01,
    0x01,
    0x01,
    (safeDpi >> 8) & 0xff,
    safeDpi & 0xff,
    (safeDpi >> 8) & 0xff,
    safeDpi & 0xff,
    0x00,
    0x00,
  ]);
  const combined = new Uint8Array(bytes.length + jfif.length);
  combined.set(bytes.subarray(0, 2), 0);
  combined.set(jfif, 2);
  combined.set(bytes.subarray(2), 2 + jfif.length);
  return new Blob([combined], { type: 'image/jpeg' });
}

/**
 * Inserts a harmless JPEG COM (0xFF 0xFE) comment segment when a very small clean image
 * falls slightly below the portal's required minKB even at 99% quality.
 */
async function padJpegToMinKB(jpegBlob: Blob, minBytes: number): Promise<Blob> {
  const current = jpegBlob.size;
  if (current >= minBytes) return jpegBlob;
  const deficit = minBytes - current;
  // Cap padding safely so we don't bloat unexpectedly
  if (deficit > 256 * 1024) return jpegBlob;

  const buf = new Uint8Array(await jpegBlob.arrayBuffer());
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return jpegBlob;

  const chunks: Uint8Array[] = [];
  let remaining = deficit;
  while (remaining > 0) {
    // Max COM payload ~65000 bytes
    const payloadLen = Math.min(64000, Math.max(8, remaining));
    const segLen = payloadLen + 2;
    const seg = new Uint8Array(2 + segLen);
    seg[0] = 0xff;
    seg[1] = 0xfe;
    seg[2] = (segLen >> 8) & 0xff;
    seg[3] = segLen & 0xff;
    seg.fill(0x20, 4); // spaces
    chunks.push(seg);
    remaining -= seg.length;
  }

  const totalExtra = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(buf.length + totalExtra);
  out.set(buf.subarray(0, 2), 0);
  let offset = 2;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  out.set(buf.subarray(2), offset);
  return new Blob([out], { type: 'image/jpeg' });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode image'))),
      mime,
      quality
    );
  });
}

export function pixelsToCm(px: number, dpi: number): number {
  const safeDpi = Math.max(72, Number.isFinite(dpi) ? dpi : 200);
  return Number(((px / safeDpi) * 2.54).toFixed(2));
}

export async function encodeCanvasToSpec(
  canvas: HTMLCanvasElement,
  spec: {
    format: ImageFormat;
    dpi: number;
    minKB: number;
    maxKB: number;
    expectedWidth?: number;
    expectedHeight?: number;
    expectedFormat?: ImageFormat;
    allowDownscale?: boolean;
    padMinKB?: boolean;
  }
): Promise<ProcessedResult> {
  const mime =
    spec.format === 'png'
      ? 'image/png'
      : spec.format === 'webp'
      ? 'image/webp'
      : 'image/jpeg';

  const minBytes = Math.max(0, spec.minKB) * 1024;
  const maxBytes = spec.maxKB > 0 ? spec.maxKB * 1024 : Infinity;

  let workingCanvas = canvas;
  let bestBlob: Blob | null = null;

  if (spec.format === 'png') {
    bestBlob = await canvasToBlob(workingCanvas, mime);
    if (bestBlob.size > maxBytes && spec.allowDownscale !== false) {
      for (let step = 0; step < 6 && bestBlob.size > maxBytes; step++) {
        await nextFrame();
        const scaled = document.createElement('canvas');
        scaled.width = Math.max(20, Math.round(workingCanvas.width * 0.85));
        scaled.height = Math.max(20, Math.round(workingCanvas.height * 0.85));
        const sCtx = scaled.getContext('2d');
        if (!sCtx) break;
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        sCtx.drawImage(workingCanvas, 0, 0, scaled.width, scaled.height);
        workingCanvas = scaled;
        bestBlob = await canvasToBlob(workingCanvas, mime);
      }
    }
  } else {
    // Binary search JPEG/WEBP quality targeting the middle of [minKB, maxKB] when a range is set,
    // and only going higher if needed to keep quality good (>= 0.72) or meet minKB. Never exceed maxBytes.
    const runBinarySearch = async (
      targetCanvas: HTMLCanvasElement,
      ceilingBytes: number,
      maxQuality = 0.98
    ): Promise<{ blob: Blob; quality: number }> => {
      let low = 0.08;
      let high = maxQuality;
      let underBest: Blob | null = null;
      let underQuality = low;
      let smallestBlob: Blob | null = null;
      let smallestQuality = low;

      for (let i = 0; i < 10; i++) {
        await nextFrame();
        const mid = (low + high) / 2;
        let b = await canvasToBlob(targetCanvas, mime, mid);
        if (spec.format === 'jpeg') {
          b = await writeJpegDpi(b, spec.dpi);
        }
        if (!smallestBlob || b.size < smallestBlob.size) {
          smallestBlob = b;
          smallestQuality = mid;
        }
        if (b.size <= ceilingBytes) {
          underBest = b;
          underQuality = mid;
          low = mid;
        } else {
          high = mid;
        }
      }
      return underBest
        ? { blob: underBest, quality: underQuality }
        : { blob: smallestBlob!, quality: smallestQuality };
    };

    const searchQuality = async (targetCanvas: HTMLCanvasElement): Promise<Blob> => {
      const hasRange = minBytes > 0 && Number.isFinite(maxBytes) && maxBytes > minBytes;
      if (!hasRange) {
        const res = await runBinarySearch(targetCanvas, maxBytes, 0.99);
        return res.blob;
      }

      const midBytes = (minBytes + maxBytes) / 2;
      const midRes = await runBinarySearch(targetCanvas, midBytes, 0.98);

      // Keep the middle-of-range result when quality is already crisp and above minBytes
      if (midRes.blob.size >= minBytes && midRes.blob.size <= maxBytes && midRes.quality >= 0.72) {
        return midRes.blob;
      }

      // Only go higher toward maxBytes if needed to keep quality good (>= 0.72..0.85) or meet minBytes
      const capQuality = midRes.blob.size < minBytes ? 0.99 : 0.85;
      const highRes = await runBinarySearch(targetCanvas, maxBytes, capQuality);
      if (highRes.blob.size <= maxBytes && highRes.blob.size >= midRes.blob.size) {
        return highRes.blob;
      }
      return midRes.blob.size <= maxBytes ? midRes.blob : highRes.blob;
    };

    bestBlob = await searchQuality(workingCanvas);

    // If still over maxBytes, downscale gently until under limit
    if (bestBlob.size > maxBytes && spec.allowDownscale !== false) {
      for (let step = 0; step < 6 && bestBlob.size > maxBytes; step++) {
        await nextFrame();
        const scaled = document.createElement('canvas');
        scaled.width = Math.max(20, Math.round(workingCanvas.width * 0.86));
        scaled.height = Math.max(20, Math.round(workingCanvas.height * 0.86));
        const sCtx = scaled.getContext('2d');
        if (!sCtx) break;
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        sCtx.drawImage(workingCanvas, 0, 0, scaled.width, scaled.height);
        workingCanvas = scaled;
        bestBlob = await searchQuality(workingCanvas);
      }
    }

    // If clean JPEG fell slightly under minKB (common for 140x60 signatures), pad safely if requested
    if (
      spec.format === 'jpeg' &&
      spec.padMinKB !== false &&
      minBytes > 0 &&
      bestBlob.size < minBytes &&
      minBytes <= maxBytes
    ) {
      const targetMin = Math.min(maxBytes - 256, minBytes + 1024);
      if (targetMin > bestBlob.size) {
        bestBlob = await padJpegToMinKB(bestBlob, targetMin);
      }
    }
  }

  const sizeBytes = bestBlob.size;
  const sizeKB = Number((sizeBytes / 1024).toFixed(1));
  const reasons: string[] = [];

  if (spec.maxKB > 0 && sizeBytes > maxBytes) {
    reasons.push(`File size (${sizeKB} KB) exceeds maximum limit of ${spec.maxKB} KB.`);
  } else if (spec.minKB > 0 && sizeBytes < minBytes) {
    reasons.push(`File size (${sizeKB} KB) is below minimum limit of ${spec.minKB} KB.`);
  }

  if (
    typeof spec.expectedWidth === 'number' &&
    typeof spec.expectedHeight === 'number' &&
    (Math.abs(workingCanvas.width - spec.expectedWidth) > 1 ||
      Math.abs(workingCanvas.height - spec.expectedHeight) > 1)
  ) {
    reasons.push(
      `Output dimensions (${workingCanvas.width}×${workingCanvas.height} px) were scaled down from ${spec.expectedWidth}×${spec.expectedHeight} px to fit KB limit.`
    );
  }

  if (spec.expectedFormat && spec.format !== spec.expectedFormat) {
    const expLabel = spec.expectedFormat === 'jpeg' ? 'JPG' : spec.expectedFormat.toUpperCase();
    const curLabel = spec.format === 'jpeg' ? 'JPG' : spec.format.toUpperCase();
    reasons.push(`Preset requires ${expLabel} format, but ${curLabel} is selected.`);
  }

  const meetsRequirement = reasons.length === 0;
  const statusReason = meetsRequirement
    ? 'Exact dimensions, format, DPI, and KB limits matched.'
    : reasons.join(' ');

  return {
    blob: bestBlob,
    url: URL.createObjectURL(bestBlob),
    width: workingCanvas.width,
    height: workingCanvas.height,
    dpi: spec.dpi,
    sizeBytes,
    sizeKB,
    format: spec.format,
    meetsRequirement,
    statusReason,
  };
}
