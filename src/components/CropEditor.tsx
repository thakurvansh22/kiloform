import React, { useEffect, useRef } from 'react';
import { FlipHorizontal, FlipVertical, RotateCw, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DEFAULT_CROP_STATE, renderCroppedCanvas, type CropState } from '../utils/imageEngine';

interface CropEditorProps {
  sourceCanvas: HTMLCanvasElement;
  aspectRatio: number; // width / height
  crop: CropState;
  onChange: (next: CropState) => void;
  brightness?: number;
  contrast?: number;
  fitMode?: 'cover' | 'contain';
}

export const CropEditor: React.FC<CropEditorProps> = ({
  sourceCanvas,
  aspectRatio,
  crop,
  onChange,
  brightness = 0,
  contrast = 0,
  fitMode = 'cover',
}) => {
  const { t } = useAppContext();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastDragRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);

  // Render live interactive crop preview
  useEffect(() => {
    const target = previewCanvasRef.current;
    if (!target) return;
    const safeRatio = Math.max(0.2, Math.min(5, aspectRatio || 1));
    const previewW = safeRatio >= 1 ? 360 : Math.round(360 * safeRatio);
    const previewH = safeRatio >= 1 ? Math.round(360 / safeRatio) : 360;

    target.width = previewW;
    target.height = previewH;

    const rendered = renderCroppedCanvas(sourceCanvas, previewW, previewH, crop, {
      brightness,
      contrast,
      fitMode,
    });
    const ctx = target.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, previewW, previewH);
      ctx.drawImage(rendered, 0, 0);

      // Subtle rule-of-thirds crop guide overlay
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(previewW / 3, 0);
      ctx.lineTo(previewW / 3, previewH);
      ctx.moveTo((previewW * 2) / 3, 0);
      ctx.lineTo((previewW * 2) / 3, previewH);
      ctx.moveTo(0, previewH / 3);
      ctx.lineTo(previewW, previewH / 3);
      ctx.moveTo(0, (previewH * 2) / 3);
      ctx.lineTo(previewW, (previewH * 2) / 3);
      ctx.stroke();
    }
  }, [sourceCanvas, aspectRatio, crop, brightness, contrast, fitMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      lastDragRef.current = { x: e.clientX, y: e.clientY };
      lastPinchDistRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      lastPinchDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinchDistRef.current && lastPinchDistRef.current > 0) {
        const deltaScale = dist / lastPinchDistRef.current;
        const nextZoom = Math.max(0.5, Math.min(6.0, crop.zoom * deltaScale));
        onChange({ ...crop, zoom: Number(nextZoom.toFixed(3)) });
      }
      lastPinchDistRef.current = dist;
    } else if (pointersRef.current.size === 1 && lastDragRef.current) {
      const dx = e.clientX - lastDragRef.current.x;
      const dy = e.clientY - lastDragRef.current.y;
      lastDragRef.current = { x: e.clientX, y: e.clientY };
      const rect = e.currentTarget.getBoundingClientRect();
      const normDx = (dx / Math.max(100, rect.width)) * 2;
      const normDy = (dy / Math.max(100, rect.height)) * 2;
      onChange({
        ...crop,
        offsetX: Math.max(-2.5, Math.min(2.5, crop.offsetX + normDx)),
        offsetY: Math.max(-2.5, Math.min(2.5, crop.offsetY + normDy)),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) lastPinchDistRef.current = null;
    if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      lastDragRef.current = { x: remaining.x, y: remaining.y };
    } else if (pointersRef.current.size === 0) {
      lastDragRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.08 : -0.08;
    const nextZoom = Math.max(0.5, Math.min(6.0, crop.zoom + step));
    onChange({ ...crop, zoom: Number(nextZoom.toFixed(2)) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 p-4">
        <canvas
          ref={previewCanvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          className="max-w-full max-h-[300px] rounded-lg border border-blue-500/50 shadow-sm cursor-grab active:cursor-grabbing touch-none bg-white"
          aria-label="Interactive crop frame. Drag to pan, scroll or pinch to zoom."
        />
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Drag to position · Scroll or pinch to zoom
        </p>
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange({ ...crop, zoom: Math.max(0.5, Number((crop.zoom - 0.1).toFixed(2))) })}
          aria-label="Zoom out"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <input
          type="range"
          min={0.5}
          max={6.0}
          step={0.05}
          value={crop.zoom}
          onChange={(e) => onChange({ ...crop, zoom: parseFloat(e.target.value) })}
          aria-label="Crop zoom level"
          className="flex-1 accent-blue-600"
        />
        <button
          type="button"
          onClick={() => onChange({ ...crop, zoom: Math.min(6.0, Number((crop.zoom + 0.1).toFixed(2))) })}
          aria-label="Zoom in"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Rotate / Flip / Reset buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...crop, rotation: (crop.rotation + 90) % 360 })}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.rotate}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...crop, flipH: !crop.flipH })}
          className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
            crop.flipH
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <FlipHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.flipH}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...crop, flipV: !crop.flipV })}
          className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
            crop.flipV
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <FlipVertical className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.flipV}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_CROP_STATE })}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.reset}</span>
        </button>
      </div>
    </div>
  );
};
