import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { AdSlot } from '../../components/AdSlot';
import { DownloadButton } from '../../components/DownloadButton';
import { FileDropzone } from '../../components/FileDropzone';
import { ResultBadge } from '../../components/ResultBadge';
import { SeoHead, type FaqItem } from '../../components/SeoHead';
import { ToolContentSection, ToolLayout } from '../../components/ToolContentSection';
import { useAppContext } from '../../context/AppContext';
import {
  encodeCanvasToSpec,
  loadImageFile,
  type LoadedImage,
  type ProcessedResult,
} from '../../utils/imageEngine';

interface CombinePreset {
  id: string;
  label: string;
  layout: 'vertical' | 'horizontal';
  width: number;
  height: number;
  maxKB: number;
}

const COMBINE_PRESETS: CombinePreset[] = [
  { id: 'std-vert', label: 'Vertical Strip (200×290 px · 20–50 KB)', layout: 'vertical', width: 200, height: 290, maxKB: 50 },
  { id: 'cm-vert', label: '3.5×5.5 cm @200 DPI (276×433 px · 20–100 KB)', layout: 'vertical', width: 276, height: 433, maxKB: 100 },
  { id: 'horiz', label: 'Horizontal Strip (400×220 px · 20–80 KB)', layout: 'horizontal', width: 400, height: 220, maxKB: 80 },
  { id: 'custom', label: 'Custom Dimensions', layout: 'vertical', width: 300, height: 420, maxKB: 60 },
];

const FAQS: FaqItem[] = [
  {
    question: 'Which Indian exams ask for photo and signature in one combined image?',
    answer:
      'Several state PSCs, police recruitment boards, university admission portals, and regional job forms ask candidates to upload a single composite JPG containing their passport photograph on top and signature directly underneath.',
  },
  {
    question: 'Should I choose vertical or horizontal layout?',
    answer:
      'Most Indian portals require vertical stacking (photo on top, signature below). Choose horizontal only if your specific portal template displays side-by-side boxes.',
  },
  {
    question: 'Does the combiner keep both images crisp inside a 50 KB limit?',
    answer:
      'Yes. Our engine fits the portrait cleanly into the primary slot, lets you position and resize your signature inside the strip on a pure white background, and binary-searches JPEG quality to stay below your target KB.',
  },
  {
    question: 'Can I add a thin divider line between photo and signature?',
    answer:
      'Yes. Toggle the Divider Border option to draw a crisp hairline frame separating the photograph from the signature area.',
  },
  {
    question: 'Are my photo and signature uploaded to combine them?',
    answer:
      'No. Both files are drawn onto a single HTML5 Canvas inside your browser memory and exported locally without ever touching an external server.',
  },
];

type CornerHandle = 'nw' | 'ne' | 'sw' | 'se';

interface SigRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PhotoAreaRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function getZoneMetrics(w: number, h: number, layout: 'vertical' | 'horizontal') {
  const pad = Math.max(4, Math.round(Math.min(w, h) * 0.025));
  if (layout === 'vertical') {
    const splitY = Math.round(h * 0.74);
    const photoRect: PhotoAreaRect = {
      x: pad,
      y: pad,
      w: Math.max(20, w - pad * 2),
      h: Math.max(20, splitY - pad * 2),
    };
    const sigZone = {
      x: pad,
      y: splitY + pad,
      w: Math.max(20, w - pad * 2),
      h: Math.max(20, h - splitY - pad * 2),
    };
    return { pad, split: splitY, photoRect, sigZone };
  }
  const splitX = Math.round(w * 0.48);
  const photoRect: PhotoAreaRect = {
    x: pad,
    y: pad,
    w: Math.max(20, splitX - pad * 2),
    h: Math.max(20, h - pad * 2),
  };
  const sigZone = {
    x: splitX + pad,
    y: pad,
    w: Math.max(20, w - splitX - pad * 2),
    h: Math.max(20, h - pad * 2),
  };
  return { pad, split: splitX, photoRect, sigZone };
}

function computeDefaultSigPlacement(
  sigCanvas: HTMLCanvasElement,
  w: number,
  h: number,
  layout: 'vertical' | 'horizontal'
): { sizePct: number; xPct: number; yPct: number } {
  const { sigZone } = getZoneMetrics(w, h, layout);
  const sScale = Math.min(sigZone.w / sigCanvas.width, sigZone.h / sigCanvas.height);
  const fittedW = sigCanvas.width * sScale;
  const sizePct = Math.max(10, Math.min(100, Math.round((fittedW / w) * 100)));
  const xPct = Number((((sigZone.x + sigZone.w / 2) / w) * 100).toFixed(1));
  const yPct = Number((((sigZone.y + sigZone.h / 2) / h) * 100).toFixed(1));
  return { sizePct, xPct, yPct };
}

function computeClampedSigRect(
  sigCanvas: HTMLCanvasElement,
  w: number,
  h: number,
  sizePct: number,
  xPct: number,
  yPct: number
): { rect: SigRect; clampedXPct: number; clampedYPct: number; effectiveSizePct: number } {
  const sigAspect = Math.max(0.1, sigCanvas.width / Math.max(1, sigCanvas.height));
  let sigW = Math.max(12, (Math.max(10, Math.min(100, sizePct)) / 100) * w);
  let sigH = sigW / sigAspect;

  if (sigW > w) {
    sigW = w;
    sigH = sigW / sigAspect;
  }
  if (sigH > h) {
    sigH = h;
    sigW = sigH * sigAspect;
  }

  const minCenterX = sigW / 2;
  const maxCenterX = Math.max(minCenterX, w - sigW / 2);
  const minCenterY = sigH / 2;
  const maxCenterY = Math.max(minCenterY, h - sigH / 2);

  const rawCx = (xPct / 100) * w;
  const rawCy = (yPct / 100) * h;
  const cx = Math.max(minCenterX, Math.min(maxCenterX, rawCx));
  const cy = Math.max(minCenterY, Math.min(maxCenterY, rawCy));

  return {
    rect: {
      x: cx - sigW / 2,
      y: cy - sigH / 2,
      w: sigW,
      h: sigH,
    },
    clampedXPct: Number(((cx / w) * 100).toFixed(1)),
    clampedYPct: Number(((cy / h) * 100).toFixed(1)),
    effectiveSizePct: Number(((sigW / w) * 100).toFixed(1)),
  };
}

export const PhotoSignatureCombinePage: React.FC = () => {
  const { t } = useAppContext();
  const [photoImg, setPhotoImg] = useState<LoadedImage | null>(null);
  const [sigImg, setSigImg] = useState<LoadedImage | null>(null);

  const [presetId, setPresetId] = useState<string>('std-vert');
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
  const [width, setWidth] = useState<number>(200);
  const [height, setHeight] = useState<number>(290);
  const [maxKB, setMaxKB] = useState<number>(50);
  const [showDivider, setShowDivider] = useState<boolean>(true);

  // Photo pan & zoom inside its area
  const [photoZoom, setPhotoZoom] = useState<number>(1);
  const [photoPanX, setPhotoPanX] = useState<number>(0); // normalized relative to photoRect
  const [photoPanY, setPhotoPanY] = useState<number>(0);

  // Signature position (% of strip) & size (% of strip width, keeping aspect ratio)
  const [sigSizePct, setSigSizePct] = useState<number>(72);
  const [sigXPct, setSigXPct] = useState<number>(50);
  const [sigYPct, setSigYPct] = useState<number>(87);
  const [sigAlign, setSigAlign] = useState<'left' | 'center' | 'right'>('center');

  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<
    | { type: 'none' }
    | { type: 'sig-move'; startClientX: number; startClientY: number; startXPct: number; startYPct: number }
    | {
        type: 'sig-resize';
        handle: CornerHandle;
        anchorX: number;
        anchorY: number;
        aspect: number;
      }
    | { type: 'photo-pan'; startClientX: number; startClientY: number; startPanX: number; startPanY: number }
  >({ type: 'none' });

  const prevPhotoUrlRef = useRef<string | null>(null);
  const prevSigUrlRef = useRef<string | null>(null);
  const prevResultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (prevPhotoUrlRef.current) URL.revokeObjectURL(prevPhotoUrlRef.current);
      if (prevSigUrlRef.current) URL.revokeObjectURL(prevSigUrlRef.current);
      if (prevResultUrlRef.current) URL.revokeObjectURL(prevResultUrlRef.current);
    };
  }, []);

  const w = Math.max(80, Math.round(width));
  const h = Math.max(80, Math.round(height));

  const resetLayout = useCallback(
    (nextLayout: 'vertical' | 'horizontal' = layout, nextW = w, nextH = h, targetSig = sigImg) => {
      setPhotoZoom(1);
      setPhotoPanX(0);
      setPhotoPanY(0);
      setSigAlign('center');
      if (targetSig) {
        const def = computeDefaultSigPlacement(targetSig.canvas, nextW, nextH, nextLayout);
        setSigSizePct(def.sizePct);
        setSigXPct(def.xPct);
        setSigYPct(def.yPct);
      } else {
        setSigSizePct(nextLayout === 'vertical' ? 72 : 44);
        setSigXPct(nextLayout === 'vertical' ? 50 : 74);
        setSigYPct(nextLayout === 'vertical' ? 87 : 50);
      }
    },
    [layout, w, h, sigImg]
  );

  const selectPreset = (p: CombinePreset) => {
    setPresetId(p.id);
    if (p.id !== 'custom') {
      setLayout(p.layout);
      setWidth(p.width);
      setHeight(p.height);
      setMaxKB(p.maxKB);
      resetLayout(p.layout, p.width, p.height);
    }
  };

  const handleLayoutChange = (nextLayout: 'vertical' | 'horizontal') => {
    setLayout(nextLayout);
    resetLayout(nextLayout, w, h);
  };

  const handlePhotoUpload = async (files: File[]) => {
    setError(null);
    try {
      const next = await loadImageFile(files[0]);
      if (prevPhotoUrlRef.current) URL.revokeObjectURL(prevPhotoUrlRef.current);
      prevPhotoUrlRef.current = next.previewUrl;
      setPhotoImg(next);
      setPhotoZoom(1);
      setPhotoPanX(0);
      setPhotoPanY(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photo.');
    }
  };

  const handleSigUpload = async (files: File[]) => {
    setError(null);
    try {
      const next = await loadImageFile(files[0]);
      if (prevSigUrlRef.current) URL.revokeObjectURL(prevSigUrlRef.current);
      prevSigUrlRef.current = next.previewUrl;
      setSigImg(next);
      const def = computeDefaultSigPlacement(next.canvas, w, h, layout);
      setSigSizePct(def.sizePct);
      setSigXPct(def.xPct);
      setSigYPct(def.yPct);
      setSigAlign('center');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signature.');
    }
  };

  const sigPlacement = useMemo(() => {
    if (!sigImg) return null;
    return computeClampedSigRect(sigImg.canvas, w, h, sigSizePct, sigXPct, sigYPct);
  }, [sigImg, w, h, sigSizePct, sigXPct, sigYPct]);

  const handleAlignSignature = (align: 'left' | 'center' | 'right') => {
    setSigAlign(align);
    if (!sigPlacement) return;
    const { pad, sigZone } = getZoneMetrics(w, h, layout);
    const sigW = sigPlacement.rect.w;
    let nextCx = w / 2;
    if (align === 'left') {
      nextCx = sigZone.x + sigW / 2;
    } else if (align === 'center') {
      nextCx = sigZone.x + sigZone.w / 2;
    } else {
      nextCx = w - pad - sigW / 2;
    }
    const clampedCx = Math.max(sigW / 2, Math.min(w - sigW / 2, nextCx));
    setSigXPct(Number(((clampedCx / w) * 100).toFixed(1)));
  };

  // Shared canvas renderer (exported JPEG matches preview 100%)
  const renderCombinedCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!photoImg || !sigImg || !sigPlacement) return null;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const { pad, split, photoRect } = getZoneMetrics(w, h, layout);

    // 1. Draw photo clipped inside its own area with pan + zoom
    ctx.save();
    ctx.beginPath();
    ctx.rect(photoRect.x, photoRect.y, photoRect.w, photoRect.h);
    ctx.clip();

    const baseScale = Math.min(photoRect.w / photoImg.canvas.width, photoRect.h / photoImg.canvas.height);
    const drawScale = baseScale * Math.max(0.5, photoZoom);
    const pW = photoImg.canvas.width * drawScale;
    const pH = photoImg.canvas.height * drawScale;
    const drawX = photoRect.x + (photoRect.w - pW) / 2 + photoPanX * photoRect.w;
    const drawY = photoRect.y + (photoRect.h - pH) / 2 + photoPanY * photoRect.h;

    ctx.drawImage(photoImg.canvas, drawX, drawY, pW, pH);
    ctx.restore();

    // 2. Divider line
    if (showDivider) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (layout === 'vertical') {
        ctx.moveTo(pad, split);
        ctx.lineTo(w - pad, split);
      } else {
        ctx.moveTo(split, pad);
        ctx.lineTo(split, h - pad);
      }
      ctx.stroke();
    }

    // 3. Draw signature at exact clamped rect inside strip boundaries
    const { x, y, w: sW, h: sH } = sigPlacement.rect;
    ctx.drawImage(sigImg.canvas, x, y, sW, sH);

    return canvas;
  }, [photoImg, sigImg, sigPlacement, w, h, layout, photoZoom, photoPanX, photoPanY, showDivider]);

  // Paint live interactive preview canvas with selection handles
  useEffect(() => {
    const preview = previewCanvasRef.current;
    if (!preview || !sigPlacement) return;
    const rendered = renderCombinedCanvas();
    if (!rendered) return;

    const displayScale = Math.max(1, Math.min(3, Math.floor(420 / Math.max(w, h)) || 2));
    const pw = w * displayScale;
    const ph = h * displayScale;
    preview.width = pw;
    preview.height = ph;

    const ctx = preview.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(rendered, 0, 0, pw, ph);

    // Draw interactive dashed border + 4 corner handles around signature
    const sx = sigPlacement.rect.x * displayScale;
    const sy = sigPlacement.rect.y * displayScale;
    const sw = sigPlacement.rect.w * displayScale;
    const sh = sigPlacement.rect.h * displayScale;

    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([]);

    const handleR = Math.max(5, Math.round(displayScale * 3));
    const corners = [
      [sx, sy],
      [sx + sw, sy],
      [sx, sy + sh],
      [sx + sw, sy + sh],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, handleR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2563eb';
      ctx.stroke();
    }
    ctx.restore();
  }, [renderCombinedCanvas, sigPlacement, w, h]);

  // Debounced JPEG export + Max KB binary search
  useEffect(() => {
    if (!photoImg || !sigImg) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setProcessing(true);
      try {
        const canvas = renderCombinedCanvas();
        if (!canvas) return;
        const encoded = await encodeCanvasToSpec(canvas, {
          format: 'jpeg',
          dpi: 200,
          minKB: 5,
          maxKB,
          expectedWidth: w,
          expectedHeight: h,
          expectedFormat: 'jpeg',
        });
        if (cancelled) {
          URL.revokeObjectURL(encoded.url);
          return;
        }
        if (prevResultUrlRef.current) URL.revokeObjectURL(prevResultUrlRef.current);
        prevResultUrlRef.current = encoded.url;
        setResult(encoded);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Combine failed.');
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [photoImg, sigImg, renderCombinedCanvas, maxKB, w, h]);

  const toStripCoords = (clientX: number, clientY: number) => {
    const el = previewCanvasRef.current;
    if (!el) return { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    const rect = el.getBoundingClientRect();
    const scaleX = w / Math.max(1, rect.width);
    const scaleY = h / Math.max(1, rect.height);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      scaleX,
      scaleY,
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sigPlacement || !sigImg) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toStripCoords(e.clientX, e.clientY);
    const { x, y, w: sW, h: sH } = sigPlacement.rect;
    const hitTol = Math.max(10, 14 * pt.scaleX);

    // 1. Check 4 corner handles first
    const corners: { id: CornerHandle; cx: number; cy: number; ax: number; ay: number }[] = [
      { id: 'nw', cx: x, cy: y, ax: x + sW, ay: y + sH },
      { id: 'ne', cx: x + sW, cy: y, ax: x, ay: y + sH },
      { id: 'sw', cx: x, cy: y + sH, ax: x + sW, ay: y },
      { id: 'se', cx: x + sW, cy: y + sH, ax: x, ay: y },
    ];
    for (const c of corners) {
      if (Math.hypot(pt.x - c.cx, pt.y - c.cy) <= hitTol) {
        dragStateRef.current = {
          type: 'sig-resize',
          handle: c.id,
          anchorX: c.ax,
          anchorY: c.ay,
          aspect: Math.max(0.1, sigImg.canvas.width / Math.max(1, sigImg.canvas.height)),
        };
        return;
      }
    }

    // 2. Check inside signature box
    if (pt.x >= x - 4 && pt.x <= x + sW + 4 && pt.y >= y - 4 && pt.y <= y + sH + 4) {
      dragStateRef.current = {
        type: 'sig-move',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startXPct: sigPlacement.clampedXPct,
        startYPct: sigPlacement.clampedYPct,
      };
      return;
    }

    // 3. Check inside photo area for photo pan
    const { photoRect } = getZoneMetrics(w, h, layout);
    if (
      pt.x >= photoRect.x &&
      pt.x <= photoRect.x + photoRect.w &&
      pt.y >= photoRect.y &&
      pt.y <= photoRect.y + photoRect.h
    ) {
      dragStateRef.current = {
        type: 'photo-pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: photoPanX,
        startPanY: photoPanY,
      };
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStateRef.current;
    if (drag.type === 'none' || !sigImg) return;
    const el = previewCanvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (drag.type === 'sig-move') {
      const dxPct = ((e.clientX - drag.startClientX) / Math.max(1, rect.width)) * 100;
      const dyPct = ((e.clientY - drag.startClientY) / Math.max(1, rect.height)) * 100;
      const clamped = computeClampedSigRect(
        sigImg.canvas,
        w,
        h,
        sigSizePct,
        drag.startXPct + dxPct,
        drag.startYPct + dyPct
      );
      setSigXPct(clamped.clampedXPct);
      setSigYPct(clamped.clampedYPct);
    } else if (drag.type === 'sig-resize') {
      const pt = toStripCoords(e.clientX, e.clientY);
      const rawW = Math.max(16, Math.abs(pt.x - drag.anchorX));
      const rawH = Math.max(12, Math.abs(pt.y - drag.anchorY));
      let nextW = Math.max(rawW, rawH * drag.aspect);
      let nextH = nextW / drag.aspect;

      // Keep anchored corner + dragged corner strictly inside [0, w] x [0, h]
      const maxAvailW = drag.handle.includes('w') ? drag.anchorX : w - drag.anchorX;
      const maxAvailH = drag.handle.includes('n') ? drag.anchorY : h - drag.anchorY;
      if (nextW > maxAvailW) {
        nextW = Math.max(14, maxAvailW);
        nextH = nextW / drag.aspect;
      }
      if (nextH > maxAvailH) {
        nextH = Math.max(10, maxAvailH);
        nextW = nextH * drag.aspect;
      }

      const newX = drag.handle.includes('w') ? drag.anchorX - nextW : drag.anchorX;
      const newY = drag.handle.includes('n') ? drag.anchorY - nextH : drag.anchorY;
      const cx = newX + nextW / 2;
      const cy = newY + nextH / 2;

      setSigSizePct(Math.max(10, Math.min(100, Number(((nextW / w) * 100).toFixed(1)))));
      setSigXPct(Number(((cx / w) * 100).toFixed(1)));
      setSigYPct(Number(((cy / h) * 100).toFixed(1)));
    } else if (drag.type === 'photo-pan') {
      const { photoRect } = getZoneMetrics(w, h, layout);
      const scaleX = w / Math.max(1, rect.width);
      const scaleY = h / Math.max(1, rect.height);
      const dxStrip = (e.clientX - drag.startClientX) * scaleX;
      const dyStrip = (e.clientY - drag.startClientY) * scaleY;
      setPhotoPanX(Math.max(-1.2, Math.min(1.2, drag.startPanX + dxStrip / photoRect.w)));
      setPhotoPanY(Math.max(-1.2, Math.min(1.2, drag.startPanY + dyStrip / photoRect.h)));
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragStateRef.current = { type: 'none' };
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const pt = toStripCoords(e.clientX, e.clientY);
    const { photoRect } = getZoneMetrics(w, h, layout);
    if (
      pt.x >= photoRect.x &&
      pt.x <= photoRect.x + photoRect.w &&
      pt.y >= photoRect.y &&
      pt.y <= photoRect.y + photoRect.h
    ) {
      e.preventDefault();
      const step = e.deltaY < 0 ? 0.08 : -0.08;
      setPhotoZoom((z) => Number(Math.max(0.5, Math.min(4.0, z + step)).toFixed(2)));
    }
  };

  return (
    <>
      <SeoHead
        title="Combine Photo & Signature into One Image – Vertical & Horizontal"
        description="Merge passport photo and signature into a single vertical or horizontal JPEG image for Indian exam forms and job portals. Set exact dimensions and KB limit offline."
        path="/photo-signature-combine"
        faqs={FAQS}
      />

      <ToolLayout>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Combine Photo &amp; Signature
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Upload your passport photograph and signature separately, position and resize cleanly inside the preview, and export an exam-ready JPEG strip.
          </p>
        </div>

        {/* Dual Uploaders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              1. Upload Passport Photo
            </p>
            <FileDropzone
              onFilesSelected={handlePhotoUpload}
              enablePaste={false}
              compact
              label={photoImg ? `Photo loaded: ${photoImg.fileName}` : 'Upload Portrait Photo'}
              error={null}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              2. Upload Signature
            </p>
            <FileDropzone
              onFilesSelected={handleSigUpload}
              enablePaste={false}
              cameraFacing="environment"
              compact
              label={sigImg ? `Signature loaded: ${sigImg.fileName}` : 'Upload Signature Image'}
              error={error}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Size Preset
              </label>
              <select
                value={presetId}
                onChange={(e) => {
                  const found = COMBINE_PRESETS.find((p) => p.id === e.target.value);
                  if (found) selectPreset(found);
                }}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
              >
                {COMBINE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Layout Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleLayoutChange('vertical')}
                  className={`min-h-[42px] rounded-xl border text-xs font-semibold transition-colors ${
                    layout === 'vertical'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  Vertical (Stacked)
                </button>
                <button
                  type="button"
                  onClick={() => handleLayoutChange('horizontal')}
                  className={`min-h-[42px] rounded-xl border text-xs font-semibold transition-colors ${
                    layout === 'horizontal'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  Horizontal (Side-by-Side)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Width (px)
              </label>
              <input
                type="number"
                min={80}
                value={width}
                onChange={(e) => {
                  setPresetId('custom');
                  setWidth(Math.max(80, Number(e.target.value) || 200));
                }}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Height (px)
              </label>
              <input
                type="number"
                min={80}
                value={height}
                onChange={(e) => {
                  setPresetId('custom');
                  setHeight(Math.max(80, Number(e.target.value) || 290));
                }}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Max KB
              </label>
              <input
                type="number"
                min={10}
                value={maxKB}
                onChange={(e) => setMaxKB(Math.max(10, Number(e.target.value) || 50))}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Signature & Photo positioning controls */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Align signature
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => handleAlignSignature(a)}
                      className={`min-h-[38px] rounded-lg border text-xs font-semibold capitalize transition-colors ${
                        sigAlign === a
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>Signature size</span>
                  <span className="font-mono tabular-nums">
                    {sigPlacement ? sigPlacement.effectiveSizePct : sigSizePct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={100}
                  step={1}
                  value={sigSizePct}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    setSigSizePct(nextSize);
                    if (sigImg) {
                      const c = computeClampedSigRect(sigImg.canvas, w, h, nextSize, sigXPct, sigYPct);
                      setSigXPct(c.clampedXPct);
                      setSigYPct(c.clampedYPct);
                    }
                  }}
                  aria-label="Signature size percentage"
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  X (% of strip)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={sigPlacement ? sigPlacement.clampedXPct : sigXPct}
                  onChange={(e) => {
                    const nextX = Number(e.target.value);
                    if (!Number.isFinite(nextX)) return;
                    if (sigImg) {
                      const c = computeClampedSigRect(sigImg.canvas, w, h, sigSizePct, nextX, sigYPct);
                      setSigXPct(c.clampedXPct);
                    } else {
                      setSigXPct(Math.max(0, Math.min(100, nextX)));
                    }
                  }}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Y (% of strip)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={sigPlacement ? sigPlacement.clampedYPct : sigYPct}
                  onChange={(e) => {
                    const nextY = Number(e.target.value);
                    if (!Number.isFinite(nextY)) return;
                    if (sigImg) {
                      const c = computeClampedSigRect(sigImg.canvas, w, h, sigSizePct, sigXPct, nextY);
                      setSigYPct(c.clampedYPct);
                    } else {
                      setSigYPct(Math.max(0, Math.min(100, nextY)));
                    }
                  }}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>Photo zoom</span>
                  <span className="font-mono tabular-nums">{photoZoom.toFixed(2)}×</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Zoom out photo"
                    onClick={() => setPhotoZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                    className="min-w-[36px] min-h-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min={0.5}
                    max={4.0}
                    step={0.05}
                    value={photoZoom}
                    onChange={(e) => setPhotoZoom(parseFloat(e.target.value))}
                    aria-label="Photo zoom inside area"
                    className="flex-1 accent-blue-600"
                  />
                  <button
                    type="button"
                    aria-label="Zoom in photo"
                    onClick={() => setPhotoZoom((z) => Math.min(4.0, Number((z + 0.1).toFixed(2))))}
                    className="min-w-[36px] min-h-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDivider}
                  onChange={(e) => setShowDivider(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>Draw subtle divider line between photo and signature</span>
              </label>

              <button
                type="button"
                onClick={() => resetLayout(layout, w, h)}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset layout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Combined Strip Preview + Export */}
        {photoImg && sigImg && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Combined Strip Preview
                </span>
                <span className="font-mono tabular-nums">
                  {processing ? t.processing : result ? `${result.width}×${result.height} · ${result.sizeKB} KB` : ''}
                </span>
              </div>
              <div className="min-h-[240px] flex flex-col items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-4 gap-2">
                <canvas
                  ref={previewCanvasRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  onWheel={handleCanvasWheel}
                  className="max-h-[340px] max-w-full border border-slate-300 dark:border-slate-600 shadow-sm cursor-grab active:cursor-grabbing touch-none bg-white"
                  aria-label="Interactive combined photo and signature preview. Drag signature or photo to move, use corner handles to resize signature."
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  Drag to move, use the handles to resize
                </p>
              </div>
            </div>

            {result && (
              <div className="space-y-4">
                <ResultBadge result={result} minKB={5} maxKB={maxKB} />
                <DownloadButton
                  blob={result.blob}
                  fileName={`KiloForm-combined-${result.width}x${result.height}.jpg`}
                  toolName="Photo & Signature Combine"
                  dimensions={`${result.width}×${result.height} px`}
                  sizeKB={result.sizeKB}
                  format="jpeg"
                />
              </div>
            )}
          </div>
        )}

        <AdSlot variant="result-below" />

        <ToolContentSection
          title="Merge Photograph and Signature into One Composite Strip"
          intro="Certain state recruitment boards, university entrance portals, and medical/nursing registration forms require candidates to upload a single combined image containing both their passport photo and handwritten signature. Doing this manually in Paint often produces misaligned borders or oversized files. KiloForm automatically centers both files onto a crisp white template and compresses the combined JPEG to fit your exact KB limit."
          steps={[
            {
              title: 'Upload your passport photograph',
              detail: 'Select or drop your portrait photo in the first upload box.',
            },
            {
              title: 'Upload your scanned signature',
              detail: 'Select or drop your clean signature image in the second upload box.',
            },
            {
              title: 'Choose vertical or horizontal layout & preset',
              detail: 'Pick vertical stacking (most common) or side-by-side layout and adjust pixels or max KB if needed.',
            },
            {
              title: 'Inspect the combined preview and download',
              detail: 'Confirm both photo and signature are clearly legible inside the preview and click Download.',
            },
          ]}
          requirements={[
            { label: 'Vertical Composite Strip', spec: '200×290 px · 20–50 KB JPG', notes: 'Photo occupies top 74%, signature bottom 26%.' },
            { label: 'Print Ratio Composite', spec: '3.5×5.5 cm · 20–100 KB JPG', notes: '276×433 px at 200 DPI.' },
            { label: 'Horizontal Strip', spec: '400×220 px · 20–80 KB JPG', notes: 'Side-by-side placement with divider.' },
          ]}
          rejectionReasons={[
            'Uploading a sideways signature rotated vertically alongside the photo.',
            'Dark shadows behind the signature contrasting sharply with a white border.',
            'Exceeding the portal maximum file size limit (typically 50 KB or 100 KB).',
            'Overlapping text or cutting off the candidate chin/ears while merging.',
          ]}
          faqs={FAQS}
        />
      </ToolLayout>
    </>
  );
};
