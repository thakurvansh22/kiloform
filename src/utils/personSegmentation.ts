import type { ImageSegmenter } from '@mediapipe/tasks-vision';

const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const SELFIE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

export interface SegmentationMaskData {
  width: number;
  height: number;
  personMask: Float32Array;
}

let cachedSegmenter: ImageSegmenter | null = null;
let loadingPromise: Promise<ImageSegmenter> | null = null;
const maskCache = new WeakMap<HTMLCanvasElement, SegmentationMaskData>();

export function isSegmenterCached(): boolean {
  return cachedSegmenter !== null;
}

/**
 * Loads and caches the MediaPipe ImageSegmenter (selfie_segmenter) singleton once per session.
 */
export async function getPersonSegmenter(): Promise<ImageSegmenter> {
  if (cachedSegmenter) return cachedSegmenter;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const visionModule = await import('@mediapipe/tasks-vision');
    const { FilesetResolver, ImageSegmenter } = visionModule;
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

    let segmenter: ImageSegmenter;
    try {
      segmenter = await ImageSegmenter.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: SELFIE_MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    } catch {
      segmenter = await ImageSegmenter.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: SELFIE_MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    }

    cachedSegmenter = segmenter;
    return segmenter;
  })();

  try {
    return await loadingPromise;
  } catch (err) {
    loadingPromise = null;
    throw err;
  }
}

/**
 * Runs selfie segmentation on a source canvas and caches the smooth [0..1] person mask.
 */
export async function extractPersonMask(
  sourceCanvas: HTMLCanvasElement
): Promise<SegmentationMaskData> {
  const existing = maskCache.get(sourceCanvas);
  if (existing) return existing;

  const segmenter = await getPersonSegmenter();
  const result = segmenter.segment(sourceCanvas);

  try {
    const masks = result.confidenceMasks;
    if (!masks || masks.length === 0) {
      throw new Error('Segmentation model returned no confidence mask.');
    }

    const labels = segmenter.getLabels();
    let maskIdx = 0;
    if (masks.length > 1) {
      const personLabelIdx = labels.findIndex((l) =>
        /person|selfie|foreground/i.test(l)
      );
      maskIdx = personLabelIdx >= 0 ? personLabelIdx : 1;
    }

    const chosenMask = masks[maskIdx];
    const w = chosenMask.width;
    const h = chosenMask.height;
    const rawCopy = new Float32Array(chosenMask.getAsFloat32Array());

    // Sanity check: if outer corners have higher confidence than center portrait box, invert once.
    const cornerAvg =
      (rawCopy[0] +
        rawCopy[w - 1] +
        rawCopy[(h - 1) * w] +
        rawCopy[h * w - 1]) /
      4;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    const centerSample = rawCopy[cy * w + cx];
    if (cornerAvg > 0.65 && centerSample < 0.35) {
      for (let i = 0; i < rawCopy.length; i++) {
        rawCopy[i] = 1 - rawCopy[i];
      }
    }

    const data: SegmentationMaskData = { width: w, height: h, personMask: rawCopy };
    maskCache.set(sourceCanvas, data);
    return data;
  } finally {
    result.close();
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-4, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Keeps only the largest 4-connected foreground region (alpha > 0) and zeros out isolated blobs.
 */
function keepLargestConnectedComponent(alpha: Float32Array, width: number, height: number): void {
  const n = width * height;
  const labels = new Int32Array(n);
  const queue = new Int32Array(n);
  let currentLabel = 0;
  let largestLabel = 0;
  let largestArea = 0;

  for (let start = 0; start < n; start++) {
    if (alpha[start] <= 0 || labels[start] !== 0) continue;
    currentLabel++;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    labels[start] = currentLabel;
    let area = 0;

    while (head < tail) {
      const idx = queue[head++];
      area++;
      const x = idx % width;
      const y = (idx - x) / width;

      if (x > 0) {
        const left = idx - 1;
        if (alpha[left] > 0 && labels[left] === 0) {
          labels[left] = currentLabel;
          queue[tail++] = left;
        }
      }
      if (x + 1 < width) {
        const right = idx + 1;
        if (alpha[right] > 0 && labels[right] === 0) {
          labels[right] = currentLabel;
          queue[tail++] = right;
        }
      }
      if (y > 0) {
        const up = idx - width;
        if (alpha[up] > 0 && labels[up] === 0) {
          labels[up] = currentLabel;
          queue[tail++] = up;
        }
      }
      if (y + 1 < height) {
        const down = idx + width;
        if (alpha[down] > 0 && labels[down] === 0) {
          labels[down] = currentLabel;
          queue[tail++] = down;
        }
      }
    }

    if (area > largestArea) {
      largestArea = area;
      largestLabel = currentLabel;
    }
  }

  if (largestLabel > 0) {
    for (let i = 0; i < n; i++) {
      if (labels[i] !== largestLabel) {
        alpha[i] = 0;
      }
    }
  }
}

/**
 * Replaces edge pixels' RGB (0 < alpha < 242) with the nearest solid person pixel's RGB (alpha >= 242)
 * using a fast 2-pass Chamfer distance transform to eliminate background colour halos.
 */
function decontaminateEdgeColors(
  srcData: Uint8ClampedArray,
  maskAlpha: Uint8ClampedArray,
  width: number,
  height: number
): void {
  const n = width * height;
  const INF = 1_000_000_000;
  const dist = new Int32Array(n);
  const nearest = new Int32Array(n);
  const SOLID_ALPHA = 242;
  let hasSolid = false;

  for (let i = 0; i < n; i++) {
    if (maskAlpha[i * 4 + 3] >= SOLID_ALPHA) {
      dist[i] = 0;
      nearest[i] = i;
      hasSolid = true;
    } else {
      dist[i] = INF;
      nearest[i] = -1;
    }
  }
  if (!hasSolid) return;

  // Forward pass (top-left -> bottom-right)
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const i = row + x;
      let d = dist[i];
      if (d === 0) continue;
      let best = nearest[i];

      if (x > 0 && dist[i - 1] + 2 < d) {
        d = dist[i - 1] + 2;
        best = nearest[i - 1];
      }
      if (y > 0) {
        const up = i - width;
        if (dist[up] + 2 < d) {
          d = dist[up] + 2;
          best = nearest[up];
        }
        if (x > 0 && dist[up - 1] + 3 < d) {
          d = dist[up - 1] + 3;
          best = nearest[up - 1];
        }
        if (x + 1 < width && dist[up + 1] + 3 < d) {
          d = dist[up + 1] + 3;
          best = nearest[up + 1];
        }
      }
      dist[i] = d;
      nearest[i] = best;
    }
  }

  // Backward pass (bottom-right -> top-left)
  for (let y = height - 1; y >= 0; y--) {
    const row = y * width;
    for (let x = width - 1; x >= 0; x--) {
      const i = row + x;
      let d = dist[i];
      if (d === 0) continue;
      let best = nearest[i];

      if (x + 1 < width && dist[i + 1] + 2 < d) {
        d = dist[i + 1] + 2;
        best = nearest[i + 1];
      }
      if (y + 1 < height) {
        const down = i + width;
        if (dist[down] + 2 < d) {
          d = dist[down] + 2;
          best = nearest[down];
        }
        if (x + 1 < width && dist[down + 1] + 3 < d) {
          d = dist[down + 1] + 3;
          best = nearest[down + 1];
        }
        if (x > 0 && dist[down - 1] + 3 < d) {
          d = dist[down - 1] + 3;
          best = nearest[down - 1];
        }
      }
      dist[i] = d;
      nearest[i] = best;
    }
  }

  // Replace edge pixel colours with nearest solid person colour (up to ~18px reach)
  for (let i = 0; i < n; i++) {
    const a = maskAlpha[i * 4 + 3];
    if (a > 0 && a < SOLID_ALPHA) {
      const srcIdx = nearest[i];
      if (srcIdx >= 0 && dist[i] <= 36) {
        const dstP = i * 4;
        const srcP = srcIdx * 4;
        srcData[dstP] = srcData[srcP];
        srcData[dstP + 1] = srcData[srcP + 1];
        srcData[dstP + 2] = srcData[srcP + 2];
      }
    }
  }
}

/**
 * Composites the segmented person cleanly onto a target background colour with:
 * - Adjustable mask strength threshold (default 50 -> alpha <0.35 = 0, >0.65 = 1, smoothstep in between)
 * - Largest connected component filtering (removes isolated smoky blobs)
 * - Edge softness feathering (0..5 px)
 * - Optional Refine edge (halo trim + nearest-solid-person edge colour decontamination)
 */
export function compositeSegmentedPerson(
  sourceCanvas: HTMLCanvasElement,
  maskData: SegmentationMaskData,
  options: {
    backgroundColor: string;
    edgeSoftness: number; // 0..5 px
    refineEdge: boolean;
    maskStrength?: number; // 0..100 (default 50)
  }
): HTMLCanvasElement {
  const { width, height, personMask } = maskData;

  // 1. Apply mask threshold: default middle (50) => <0.35 becomes 0, >0.65 becomes 1
  const strength = typeof options.maskStrength === 'number' ? options.maskStrength : 50;
  const strengthNorm = (Math.max(0, Math.min(100, strength)) - 50) / 50; // -1..+1
  const lowThresh = Math.max(0.05, Math.min(0.6, 0.35 + strengthNorm * 0.22));
  const highThresh = Math.max(lowThresh + 0.12, Math.min(0.95, 0.65 + strengthNorm * 0.22));

  const alphaFloat = new Float32Array(personMask.length);
  for (let i = 0; i < personMask.length; i++) {
    const p = personMask[i];
    if (p <= lowThresh) {
      alphaFloat[i] = 0;
    } else if (p >= highThresh) {
      alphaFloat[i] = 1;
    } else {
      alphaFloat[i] = smoothstep(lowThresh, highThresh, p);
    }
  }

  // 2. Keep only the largest connected person region and strip isolated blobs
  keepLargestConnectedComponent(alphaFloat, width, height);

  // 3. Optional gentle 1px fringe erosion when Refine edge is active
  let finalAlpha = alphaFloat;
  if (options.refineEdge) {
    const eroded = new Float32Array(alphaFloat.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          eroded[idx] = alphaFloat[idx];
          continue;
        }
        const minNeighbor = Math.min(
          alphaFloat[idx],
          alphaFloat[idx - 1],
          alphaFloat[idx + 1],
          alphaFloat[idx - width],
          alphaFloat[idx + width]
        );
        eroded[idx] = minNeighbor * 0.75 + alphaFloat[idx] * 0.25;
      }
    }
    finalAlpha = eroded;
  }

  // 4. Build mask canvas at segmentation resolution
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) return sourceCanvas;

  const maskImg = maskCtx.createImageData(width, height);
  const mData = maskImg.data;
  for (let i = 0; i < finalAlpha.length; i++) {
    const a = Math.max(0, Math.min(255, Math.round(finalAlpha[i] * 255)));
    const p = i * 4;
    mData[p] = 255;
    mData[p + 1] = 255;
    mData[p + 2] = 255;
    mData[p + 3] = a;
  }
  maskCtx.putImageData(maskImg, 0, 0);

  // 5. Upscale and apply edge feathering (0-5 px) onto full-resolution mask canvas
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const featherCanvas = document.createElement('canvas');
  featherCanvas.width = W;
  featherCanvas.height = H;
  const fCtx = featherCanvas.getContext('2d');
  if (!fCtx) return sourceCanvas;

  const blurPx = Math.max(0, Math.min(5, options.edgeSoftness));
  if (blurPx > 0) {
    fCtx.filter = `blur(${blurPx}px)`;
  }
  fCtx.imageSmoothingEnabled = true;
  fCtx.imageSmoothingQuality = 'high';
  fCtx.drawImage(maskCanvas, 0, 0, W, H);
  fCtx.filter = 'none';

  // 6. Prepare foreground canvas + decontaminate edge pixel colours if Refine edge is active
  const fgCanvas = document.createElement('canvas');
  fgCanvas.width = W;
  fgCanvas.height = H;
  const fgCtx = fgCanvas.getContext('2d');
  if (!fgCtx) return sourceCanvas;
  fgCtx.drawImage(sourceCanvas, 0, 0);

  if (options.refineEdge) {
    const fgImg = fgCtx.getImageData(0, 0, W, H);
    const fullMaskData = fCtx.getImageData(0, 0, W, H).data;
    decontaminateEdgeColors(fgImg.data, fullMaskData, W, H);
    const dLen = fgImg.data.length;
    for (let p = 0; p < dLen; p += 4) {
      fgImg.data[p + 3] = fullMaskData[p + 3];
    }
    fgCtx.putImageData(fgImg, 0, 0);
  } else {
    fgCtx.globalCompositeOperation = 'destination-in';
    fgCtx.drawImage(featherCanvas, 0, 0);
    fgCtx.globalCompositeOperation = 'source-over';
  }

  // 7. Composite over chosen background colour
  const outCanvas = document.createElement('canvas');
  outCanvas.width = W;
  outCanvas.height = H;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return sourceCanvas;

  outCtx.fillStyle = options.backgroundColor;
  outCtx.fillRect(0, 0, W, H);
  outCtx.drawImage(fgCanvas, 0, 0);

  return outCanvas;
}
