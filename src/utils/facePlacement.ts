import type { FaceDetector } from '@mediapipe/tasks-vision';
import type { CropState } from './imageEngine';
import { DEFAULT_CROP_STATE } from './imageEngine';
import { extractPersonMask } from './personSegmentation';

const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

export interface DetectedFaceBox {
  originX: number;
  originY: number;
  width: number;
  height: number;
  imgWidth: number;
  imgHeight: number;
}

export type FaceHintStatus =
  | 'detecting'
  | 'good'
  | 'too-small'
  | 'too-close'
  | 'head-cut-off'
  | 'not-found';

let cachedDetector: FaceDetector | null = null;
let loadingDetectorPromise: Promise<FaceDetector> | null = null;

async function getFaceDetector(): Promise<FaceDetector> {
  if (cachedDetector) return cachedDetector;
  if (loadingDetectorPromise) return loadingDetectorPromise;

  loadingDetectorPromise = (async () => {
    const visionModule = await import('@mediapipe/tasks-vision');
    const { FilesetResolver, FaceDetector } = visionModule;
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

    let detector: FaceDetector;
    try {
      detector = await FaceDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: FACE_MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.45,
      });
    } catch {
      detector = await FaceDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: FACE_MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.45,
      });
    }
    cachedDetector = detector;
    return detector;
  })();

  try {
    return await loadingDetectorPromise;
  } catch (err) {
    loadingDetectorPromise = null;
    throw err;
  }
}

function buildOrientedCanvas(
  source: HTMLCanvasElement,
  rotation: number,
  flipH: boolean,
  flipV: boolean
): HTMLCanvasElement {
  if (rotation === 0 && !flipH && !flipV) return source;
  const rotRad = (rotation * Math.PI) / 180;
  const swap = rotation % 180 !== 0;
  const rotW = swap ? source.height : source.width;
  const rotH = swap ? source.width : source.height;

  const out = document.createElement('canvas');
  out.width = rotW;
  out.height = rotH;
  const ctx = out.getContext('2d');
  if (!ctx) return source;

  ctx.translate(rotW / 2, rotH / 2);
  ctx.rotate(rotRad);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return out;
}

/**
 * Fallback head-area estimator from person segmentation mask if FaceDetector fails to load.
 */
async function detectHeadFromSegmentation(
  canvas: HTMLCanvasElement
): Promise<DetectedFaceBox | null> {
  try {
    const seg = await extractPersonMask(canvas);
    const { width: w, height: h, personMask } = seg;
    let minY = h;
    let maxY = -1;
    let minX = w;
    let maxX = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (personMask[y * w + x] > 0.55) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    if (maxY <= minY || maxX <= minX) return null;

    const personH = maxY - minY;
    const estFaceH = Math.max(20, Math.round(personH * 0.30));
    const estFaceW = Math.round(estFaceH * 0.8);
    // Find horizontal center inside top head region
    const headBottom = Math.min(h, minY + estFaceH * 1.35);
    let sumX = 0;
    let countX = 0;
    for (let y = minY; y < headBottom; y++) {
      for (let x = 0; x < w; x++) {
        if (personMask[y * w + x] > 0.55) {
          sumX += x;
          countX++;
        }
      }
    }
    const centerX = countX > 0 ? sumX / countX : (minX + maxX) / 2;
    const scaleX = canvas.width / w;
    const scaleY = canvas.height / h;

    // Offset originY downward by 35% of estFaceH so (originY - 0.35 * height) aligns with minY (hair top)
    return {
      originX: Math.max(0, (centerX - estFaceW / 2) * scaleX),
      originY: (minY + estFaceH * 0.35) * scaleY,
      width: estFaceW * scaleX,
      height: estFaceH * scaleY,
      imgWidth: canvas.width,
      imgHeight: canvas.height,
    };
  } catch {
    return null;
  }
}

/**
 * Detects the primary face bounding box on the (optionally rotated/flipped) image canvas.
 */
export async function detectPortraitFace(
  sourceCanvas: HTMLCanvasElement,
  orientation: { rotation: number; flipH: boolean; flipV: boolean } = {
    rotation: 0,
    flipH: false,
    flipV: false,
  }
): Promise<DetectedFaceBox | null> {
  const oriented = buildOrientedCanvas(
    sourceCanvas,
    orientation.rotation,
    orientation.flipH,
    orientation.flipV
  );

  try {
    const detector = await getFaceDetector();
    const res = detector.detect(oriented);
    const detections = res.detections || [];
    if (detections.length === 0) {
      return null;
    }

    // Pick largest/most prominent face
    let best = detections[0];
    let bestArea = 0;
    for (const det of detections) {
      const box = det.boundingBox;
      if (!box) continue;
      const area = box.width * box.height;
      if (area > bestArea) {
        bestArea = area;
        best = det;
      }
    }

    const box = best.boundingBox;
    if (!box || box.width <= 0 || box.height <= 0) return null;

    return {
      originX: box.originX,
      originY: box.originY,
      width: box.width,
      height: box.height,
      imgWidth: oriented.width,
      imgHeight: oriented.height,
    };
  } catch {
    // Only fall back to segmentation head estimate if FaceDetector asset failed to load
    return detectHeadFromSegmentation(oriented);
  }
}

const HEAD_TOP_EXTEND_RATIO = 0.35; // Estimate head/hair top as face top - 35% of face height
const MAX_CROP_ZOOM = 6.0;

/**
 * Computes CropState (zoom, offsetX, offsetY) so:
 * - Face height (chin to detector forehead top) is ~48% of crop height (within 45-55%)
 * - Full head including hair (estimated at originY - 0.35 * height) has ~10% top margin
 * - Face is horizontally centered and shoulders remain visible at bottom
 * - Never zooms in more than needed; if too small, zooms to max; never extends crop outside image
 */
export function computeAutoFitCrop(
  faceBox: DetectedFaceBox,
  aspectRatio: number,
  orientation: { rotation: number; flipH: boolean; flipV: boolean } = {
    rotation: 0,
    flipH: false,
    flipV: false,
  }
): CropState {
  const safeAspect = Math.max(0.25, Math.min(4, aspectRatio || 1));
  const W = 1000;
  const H = Math.round(W / safeAspect);

  const imgW = faceBox.imgWidth;
  const imgH = faceBox.imgHeight;
  const baseScale = Math.max(W / imgW, H / imgH);

  // Target face height = 48% of crop height (within 45-55%), leaving ~10% top margin + ~16.8% hair + ~25.2% shoulders
  const targetFaceFrac = 0.48;
  const desiredDrawScale = (targetFaceFrac * H) / Math.max(10, faceBox.height);
  const zoom = Math.max(1.0, Math.min(MAX_CROP_ZOOM, desiredDrawScale / baseScale));

  const drawScale = baseScale * zoom;
  const drawW = imgW * drawScale;
  const drawH = imgH * drawScale;

  // Estimate head top (including hair) as face top minus 35% of face height
  const headTopY = faceBox.originY - faceBox.height * HEAD_TOP_EXTEND_RATIO;
  const targetTopMarginFrac = 0.1; // ~10% of crop height above the hair

  // Center face horizontally and place estimated head top at 10% from crop top
  const faceCenterX = faceBox.originX + faceBox.width / 2;
  const desiredDx = W / 2 - faceCenterX * drawScale;
  const desiredDy = targetTopMarginFrac * H - headTopY * drawScale;

  let offsetX = (desiredDx - (W - drawW) / 2) / (W * 0.5);
  let offsetY = (desiredDy - (H - drawH) / 2) / (H * 0.5);

  // Strictly clamp offsets so crop NEVER extends outside source image bounds
  const maxOffsetX = Math.max(0, (drawW - W) / W);
  const maxOffsetY = Math.max(0, (drawH - H) / H);
  offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX));
  offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY));

  return {
    ...DEFAULT_CROP_STATE,
    rotation: orientation.rotation,
    flipH: orientation.flipH,
    flipV: orientation.flipV,
    zoom: Number(zoom.toFixed(3)),
    offsetX: Number(offsetX.toFixed(4)),
    offsetY: Number(offsetY.toFixed(4)),
  };
}

/**
 * Evaluates current face-to-crop height ratio & head-top visibility:
 * - 'head-cut-off': any part of estimated head top is cut off above top edge of crop
 * - 'too-close': face height > 60% of crop height
 * - 'too-small': face height < 40% of crop height
 * - 'good': ONLY when 40-60% of crop height AND head top is inside crop
 */
export function evaluateFacePosition(
  faceBox: DetectedFaceBox | null,
  crop: CropState,
  targetW: number,
  targetH: number
): FaceHintStatus {
  if (!faceBox) return 'not-found';
  const safeW = Math.max(10, targetW);
  const safeH = Math.max(10, targetH);

  const baseScale = Math.max(safeW / faceBox.imgWidth, safeH / faceBox.imgHeight);
  const drawScale = baseScale * Math.max(0.4, crop.zoom);
  const drawH = faceBox.imgHeight * drawScale;
  const dy = (safeH - drawH) / 2 + crop.offsetY * (safeH * 0.5);

  const displayedFaceH = faceBox.height * drawScale;
  const ratio = displayedFaceH / safeH;

  const rawHeadTopY = faceBox.originY - faceBox.height * HEAD_TOP_EXTEND_RATIO;
  const cropHeadTopY = dy + rawHeadTopY * drawScale;

  if (cropHeadTopY < 0) return 'head-cut-off';
  if (ratio > 0.6) return 'too-close';
  if (ratio < 0.4) return 'too-small';
  return 'good';
}
