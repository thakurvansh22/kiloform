import React, { useRef, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Original',
  afterLabel = 'New Background',
}) => {
  const [position, setPosition] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<boolean>(false);

  const updateFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, Math.round(pct))));
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          Background Before / After Comparison
        </span>
        <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
          Drag slider ({position}%)
        </span>
      </div>

      <div
        ref={containerRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          draggingRef.current = true;
          updateFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) updateFromClientX(e.clientX);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        className="relative h-64 w-full rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden select-none touch-none cursor-ew-resize"
      >
        {/* After (full layer underneath) */}
        <img
          src={afterUrl}
          alt={afterLabel}
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* Before (clipped left portion) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={beforeUrl}
            alt={beforeLabel}
            draggable={false}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Vertical divider line & handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-600 shadow pointer-events-none"
          style={{ left: `${position}%` }}
        >
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-600 text-white shadow-md flex items-center justify-center">
            <MoveHorizontal className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>

        {/* Corner text markers */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/75 text-[11px] font-medium text-white pointer-events-none">
          {beforeLabel}
        </span>
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-blue-700/85 text-[11px] font-medium text-white pointer-events-none">
          {afterLabel}
        </span>
      </div>

      {/* Accessible range scrubber */}
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label="Before and after background comparison slider"
        className="w-full accent-blue-600"
      />
    </div>
  );
};
