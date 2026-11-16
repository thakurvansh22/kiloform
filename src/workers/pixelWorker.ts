export type PixelWorkerRequest =
  | {
      id: number;
      type: 'floodFillBackground';
      buffer: ArrayBuffer;
      width: number;
      height: number;
      targetRgb: [number, number, number];
      tolerance: number;
    }
  | {
      id: number;
      type: 'cleanSignature';
      buffer: ArrayBuffer;
      width: number;
      height: number;
      mode: 'bw' | 'enhance' | 'original';
      thickness: number;
      whiteBg: boolean;
      autoCrop: boolean;
    }
  | {
      id: number;
      type: 'cleanThumbImpression';
      buffer: ArrayBuffer;
      width: number;
      height: number;
      contrast: number; // 0..100
      threshold: number; // 80..230
      bw: boolean;
      autoCrop: boolean;
    };

export type PixelWorkerResponse =
  | {
      id: number;
      ok: true;
      buffer: ArrayBuffer;
      width: number;
      height: number;
      cropBox?: { x: number; y: number; w: number; h: number };
    }
  | {
      id: number;
      ok: false;
      error: string;
    };

function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  targetRgb: [number, number, number],
  tolerance: number
) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const bgMask = new Uint8Array(total);
  const threshold = Math.max(8, tolerance * 2.6);
  const thresholdSq = threshold * threshold;

  // Sample corner colours to handle slightly uneven wall lighting
  const sampleCoords = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
  ];

  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  // Seed flood fill from all 4 outer border edges
  for (let x = 0; x < width; x++) {
    const topIdx = x;
    if (!visited[topIdx]) {
      visited[topIdx] = 1;
      queue[tail++] = topIdx;
    }
    const botIdx = (height - 1) * width + x;
    if (!visited[botIdx]) {
      visited[botIdx] = 1;
      queue[tail++] = botIdx;
    }
  }
  for (let y = 1; y < height - 1; y++) {
    const leftIdx = y * width;
    if (!visited[leftIdx]) {
      visited[leftIdx] = 1;
      queue[tail++] = leftIdx;
    }
    const rightIdx = y * width + (width - 1);
    if (!visited[rightIdx]) {
      visited[rightIdx] = 1;
      queue[tail++] = rightIdx;
    }
  }

  // Reference colour per seed region: use average of top-left and top-right if similar, else closest seed
  const seeds = sampleCoords.map(([sx, sy]) => {
    const p = (sy * width + sx) * 4;
    return [data[p], data[p + 1], data[p + 2]] as [number, number, number];
  });

  const matchesBg = (idx: number): boolean => {
    const p = idx * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    for (let s = 0; s < seeds.length; s++) {
      const dr = r - seeds[s][0];
      const dg = g - seeds[s][1];
      const db = b - seeds[s][2];
      if (dr * dr + dg * dg + db * db <= thresholdSq) {
        return true;
      }
    }
    return false;
  };

  while (head < tail) {
    const idx = queue[head++];
    if (!matchesBg(idx)) continue;
    bgMask[idx] = 1;

    const x = idx % width;
    const y = (idx - x) / width;

    if (x > 0) {
      const n = idx - 1;
      if (!visited[n]) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
    if (x < width - 1) {
      const n = idx + 1;
      if (!visited[n]) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
    if (y > 0) {
      const n = idx - width;
      if (!visited[n]) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
    if (y < height - 1) {
      const n = idx + width;
      if (!visited[n]) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  // Apply target colour with 1px soft edge anti-aliasing
  const [tr, tg, tb] = targetRgb;
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    if (bgMask[i]) {
      data[p] = tr;
      data[p + 1] = tg;
      data[p + 2] = tb;
      data[p + 3] = 255;
    } else {
      const x = i % width;
      const y = (i - x) / width;
      let bgNeighbors = 0;
      if (x > 0 && bgMask[i - 1]) bgNeighbors++;
      if (x < width - 1 && bgMask[i + 1]) bgNeighbors++;
      if (y > 0 && bgMask[i - width]) bgNeighbors++;
      if (y < height - 1 && bgMask[i + width]) bgNeighbors++;
      if (bgNeighbors > 0) {
        const blend = Math.min(0.45, bgNeighbors * 0.12);
        data[p] = Math.round(data[p] * (1 - blend) + tr * blend);
        data[p + 1] = Math.round(data[p + 1] * (1 - blend) + tg * blend);
        data[p + 2] = Math.round(data[p + 2] * (1 - blend) + tb * blend);
      }
    }
  }
}

function cleanSignature(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  mode: 'bw' | 'enhance' | 'original',
  thickness: number,
  whiteBg: boolean,
  autoCrop: boolean
): { x: number; y: number; w: number; h: number } | undefined {
  const total = width * height;

  // Estimate paper luminance from outer corners/edges
  let sumLum = 0;
  let count = 0;
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 20))) {
    for (const y of [0, height - 1]) {
      const p = (y * width + x) * 4;
      sumLum += 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      count++;
    }
  }
  const avgPaperLum = count > 0 ? sumLum / count : 230;
  // Threshold shifts slightly with thickness (-2..+3)
  const cutoff = Math.max(85, Math.min(235, avgPaperLum - 32 + thickness * 12));

  if (mode !== 'original' || whiteBg) {
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const a = data[p + 3];
      if (a < 20) {
        data[p] = 255;
        data[p + 1] = 255;
        data[p + 2] = 255;
        data[p + 3] = 255;
        continue;
      }
      const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      if (mode === 'bw') {
        if (lum < cutoff) {
          const dark = Math.max(0, Math.min(40, Math.round((lum / cutoff) * 40)));
          data[p] = dark;
          data[p + 1] = dark;
          data[p + 2] = dark;
          data[p + 3] = 255;
        } else {
          data[p] = 255;
          data[p + 1] = 255;
          data[p + 2] = 255;
          data[p + 3] = 255;
        }
      } else if (mode === 'enhance') {
        if (lum >= cutoff && whiteBg) {
          data[p] = 255;
          data[p + 1] = 255;
          data[p + 2] = 255;
          data[p + 3] = 255;
        } else if (lum < cutoff) {
          const factor = 0.55;
          data[p] = Math.round(data[p] * factor);
          data[p + 1] = Math.round(data[p + 1] * factor);
          data[p + 2] = Math.round(data[p + 2] * factor);
          data[p + 3] = 255;
        }
      } else if (whiteBg && lum > 240) {
        data[p] = 255;
        data[p + 1] = 255;
        data[p + 2] = 255;
        data[p + 3] = 255;
      }
    }
  }

  // Optional morphological dilation for positive ink thickness > 0
  if (thickness > 0 && mode !== 'original') {
    const passes = Math.min(2, Math.floor(thickness));
    const copy = new Uint8ClampedArray(data);
    for (let pass = 0; pass < passes; pass++) {
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const lum = copy[idx];
          if (lum > 180) {
            // Check 4-neighbors for dark ink
            const up = copy[((y - 1) * width + x) * 4];
            const down = copy[((y + 1) * width + x) * 4];
            const left = copy[(y * width + (x - 1)) * 4];
            const right = copy[(y * width + (x + 1)) * 4];
            const minN = Math.min(up, down, left, right);
            if (minN < 110) {
              data[idx] = Math.min(data[idx], minN + 25);
              data[idx + 1] = Math.min(data[idx + 1], copy[((y - 1) * width + x) * 4 + 1] + 25);
              data[idx + 2] = Math.min(data[idx + 2], copy[((y - 1) * width + x) * 4 + 2] + 25);
            }
          }
        }
      }
      copy.set(data);
    }
  }

  if (!autoCrop) return undefined;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      if (lum < 232 && data[p + 3] > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    return { x: 0, y: 0, w: width, h: height };
  }

  const padX = Math.max(6, Math.round((maxX - minX) * 0.06));
  const padY = Math.max(6, Math.round((maxY - minY) * 0.12));
  const cx = Math.max(0, minX - padX);
  const cy = Math.max(0, minY - padY);
  const cw = Math.min(width - cx, maxX - minX + 1 + padX * 2);
  const ch = Math.min(height - cy, maxY - minY + 1 + padY * 2);
  return { x: cx, y: cy, w: cw, h: ch };
}

function cleanThumbImpression(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  contrast: number,
  threshold: number,
  bw: boolean,
  autoCrop: boolean
): { x: number; y: number; w: number; h: number } | undefined {
  const total = width * height;
  // Normalize contrast slider (0..100) into steepness factor (0.7..4.5)
  const cFactor = 0.7 + (Math.max(0, Math.min(100, contrast)) / 100) * 3.8;
  const thresh = Math.max(60, Math.min(235, threshold));

  // Weighted ink intensity emphasizes blue/purple stamp-pad ink against white/cream paper
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    const a = data[p + 3];
    if (a < 20) {
      data[p] = 255;
      data[p + 1] = 255;
      data[p + 2] = 255;
      data[p + 3] = 255;
      continue;
    }

    const inkLum = 0.42 * data[p] + 0.46 * data[p + 1] + 0.12 * data[p + 2];

    if (bw) {
      // Soft S-curve around threshold modulated by contrast so ridge lines stay crisp & paper stays pure white
      const delta = (inkLum - thresh) / Math.max(12, 85 / cFactor);
      const val = 1 / (1 + Math.exp(-delta));
      const out = val > 0.88 ? 255 : val < 0.12 ? 0 : Math.round(val * 255);
      data[p] = out;
      data[p + 1] = out;
      data[p + 2] = out;
      data[p + 3] = 255;
    } else {
      // Keep tint but bleach background > thresh to white and boost contrast on ridges
      if (inkLum >= thresh + 14) {
        data[p] = 255;
        data[p + 1] = 255;
        data[p + 2] = 255;
        data[p + 3] = 255;
      } else {
        const gain = Math.min(2.2, 0.9 + cFactor * 0.25);
        data[p] = Math.max(0, Math.min(255, Math.round((data[p] - 128) * gain + 128 - 25)));
        data[p + 1] = Math.max(0, Math.min(255, Math.round((data[p + 1] - 128) * gain + 128 - 25)));
        data[p + 2] = Math.max(0, Math.min(255, Math.round((data[p + 2] - 128) * gain + 128 - 25)));
        data[p + 3] = 255;
      }
    }
  }

  if (!autoCrop) return undefined;

  // Row/col density scan so isolated dust specks near borders don't break ink bounding box
  const colCounts = new Int32Array(width);
  const rowCounts = new Int32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      if (lum < 210) {
        colCounts[x]++;
        rowCounts[y]++;
      }
    }
  }

  const minRowInk = Math.max(2, Math.floor(width * 0.005));
  const minColInk = Math.max(2, Math.floor(height * 0.005));

  let minX = 0;
  while (minX < width - 1 && colCounts[minX] < minColInk) minX++;
  let maxX = width - 1;
  while (maxX > minX && colCounts[maxX] < minColInk) maxX--;
  let minY = 0;
  while (minY < height - 1 && rowCounts[minY] < minRowInk) minY++;
  let maxY = height - 1;
  while (maxY > minY && rowCounts[maxY] < minRowInk) maxY--;

  if (maxX - minX < 10 || maxY - minY < 10) {
    return { x: 0, y: 0, w: width, h: height };
  }

  const padX = Math.max(8, Math.round((maxX - minX) * 0.08));
  const padY = Math.max(8, Math.round((maxY - minY) * 0.08));
  const cx = Math.max(0, minX - padX);
  const cy = Math.max(0, minY - padY);
  const cw = Math.min(width - cx, maxX - minX + 1 + padX * 2);
  const ch = Math.min(height - cy, maxY - minY + 1 + padY * 2);
  return { x: cx, y: cy, w: cw, h: ch };
}

self.onmessage = (event: MessageEvent<PixelWorkerRequest>) => {
  const msg = event.data;
  try {
    const data = new Uint8ClampedArray(msg.buffer);
    if (msg.type === 'floodFillBackground') {
      floodFill(data, msg.width, msg.height, msg.targetRgb, msg.tolerance);
      const res: PixelWorkerResponse = {
        id: msg.id,
        ok: true,
        buffer: data.buffer,
        width: msg.width,
        height: msg.height,
      };
      (self as unknown as Worker).postMessage(res, [data.buffer]);
    } else if (msg.type === 'cleanSignature') {
      const cropBox = cleanSignature(
        data,
        msg.width,
        msg.height,
        msg.mode,
        msg.thickness,
        msg.whiteBg,
        msg.autoCrop
      );
      const res: PixelWorkerResponse = {
        id: msg.id,
        ok: true,
        buffer: data.buffer,
        width: msg.width,
        height: msg.height,
        cropBox,
      };
      (self as unknown as Worker).postMessage(res, [data.buffer]);
    } else if (msg.type === 'cleanThumbImpression') {
      const cropBox = cleanThumbImpression(
        data,
        msg.width,
        msg.height,
        msg.contrast,
        msg.threshold,
        msg.bw,
        msg.autoCrop
      );
      const res: PixelWorkerResponse = {
        id: msg.id,
        ok: true,
        buffer: data.buffer,
        width: msg.width,
        height: msg.height,
        cropBox,
      };
      (self as unknown as Worker).postMessage(res, [data.buffer]);
    }
  } catch (err) {
    const res: PixelWorkerResponse = {
      id: msg.id,
      ok: false,
      error: err instanceof Error ? err.message : 'Pixel processing failed',
    };
    (self as unknown as Worker).postMessage(res);
  }
};
