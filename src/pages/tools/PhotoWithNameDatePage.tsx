import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { AdSlot } from '../../components/AdSlot';
import { CropEditor } from '../../components/CropEditor';
import { DownloadButton } from '../../components/DownloadButton';
import { FileDropzone } from '../../components/FileDropzone';
import { ResultBadge } from '../../components/ResultBadge';
import { SeoHead, type FaqItem } from '../../components/SeoHead';
import { ToolContentSection, ToolLayout } from '../../components/ToolContentSection';
import { useAppContext } from '../../context/AppContext';
import {
  DEFAULT_CROP_STATE,
  encodeCanvasToSpec,
  loadImageFile,
  renderCroppedCanvas,
  unitToPixels,
  type CropState,
  type LoadedImage,
  type ProcessedResult,
} from '../../utils/imageEngine';

const FAQS: FaqItem[] = [
  {
    question: 'Which Indian exams ask for Name and Date (DOP) on the photograph?',
    answer:
      'UPSC CSE, Railway RRB, and several SSC / state recruitment cycles have required candidates to print their full name and the Date of Photograph (DOP) on a clear white strip at the bottom of the photo. Always check your current notification PDF.',
  },
  {
    question: 'What date format should I write on my exam photo?',
    answer:
      'DD-MM-YYYY (for example 15-11-2026), DD/MM/YYYY, or DD MMM YYYY is universally accepted across Indian exam forms. You can also toggle the "DOP:" prefix on or off.',
  },
  {
    question: 'Should the Name & Date strip sit below the photo or overlay on top?',
    answer:
      'Bottom of Photo (reducing the photo slice cleanly so photo plus strip still equals exact 3.5×4.5 cm dimensions) is preferred because it never covers your face or collar.',
  },
  {
    question: 'What font and text colour work best for Name & Date strips?',
    answer:
      'Clean bold black text (#0F172A or #000000) in a sans-serif font on a pure white (#FFFFFF) strip offers maximum contrast and passes automated OCR/human checks reliably.',
  },
  {
    question: 'Does adding text increase file size above 50 KB?',
    answer:
      'Sharp black text can slightly increase JPEG bytes, which is why KiloForm runs its binary-search compressor after rendering the text strip so your final file still lands neatly inside 20–50 KB.',
  },
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface TextPos {
  xPct: number; // % of canvas width
  yPct: number; // % of strip height
}

interface TextBoxRect {
  kind: 'name' | 'date';
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_NAME_POS: TextPos = { xPct: 50, yPct: 34 };
const DEFAULT_DATE_POS: TextPos = { xPct: 50, yPct: 72 };

export const PhotoWithNameDatePage: React.FC = () => {
  const { t } = useAppContext();
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [crop, setCrop] = useState<CropState>({ ...DEFAULT_CROP_STATE });

  const [candidateName, setCandidateName] = useState<string>('AARAV SHARMA');
  const [photoDate, setPhotoDate] = useState<string>(formatToday());
  const [includeDopPrefix, setIncludeDopPrefix] = useState<boolean>(true);
  const [dateFormat, setDateFormat] = useState<'dash' | 'slash' | 'mmm'>('dash');
  const [fontFamily, setFontFamily] = useState<string>('Arial, sans-serif');
  const [fontSize, setFontSize] = useState<number>(18);
  const [isBold, setIsBold] = useState<boolean>(true);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [stripBg, setStripBg] = useState<string>('#ffffff');
  const [stripPosition, setStripPosition] = useState<'bottom' | 'top' | 'overlay'>('bottom');

  // Separate draggable positions for Name and Date inside the strip
  const [namePos, setNamePos] = useState<TextPos>({ ...DEFAULT_NAME_POS });
  const [datePos, setDatePos] = useState<TextPos>({ ...DEFAULT_DATE_POS });
  const [selectedText, setSelectedText] = useState<'name' | 'date'>('name');

  const [presetMode, setPresetMode] = useState<'ssc' | 'upsc' | 'custom'>('ssc');
  const [minKB, setMinKB] = useState<number>(20);
  const [maxKB, setMaxKB] = useState<number>(50);

  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const boxesRef = useRef<TextBoxRect[]>([]);
  const dragRef = useRef<
    | { type: 'none' }
    | { type: 'move'; target: 'name' | 'date'; startClientX: number; startClientY: number; startPos: TextPos }
    | { type: 'resize'; startClientY: number; startFontSize: number }
  >({ type: 'none' });

  const prevLoadedUrlRef = useRef<string | null>(null);
  const prevResultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (prevLoadedUrlRef.current) URL.revokeObjectURL(prevLoadedUrlRef.current);
      if (prevResultUrlRef.current) URL.revokeObjectURL(prevResultUrlRef.current);
    };
  }, []);

  const targetDims = useMemo(() => {
    if (presetMode === 'upsc') {
      return { w: 420, h: 420, dpi: 200 };
    }
    return {
      w: unitToPixels(3.5, 'cm', 200), // 276
      h: unitToPixels(4.5, 'cm', 200), // 354
      dpi: 200,
    };
  }, [presetMode]);

  const formattedDate = useMemo(() => {
    if (!photoDate) return '';
    const [y, m, d] = photoDate.split('-');
    if (!y || !m || !d) return photoDate;
    let base: string;
    if (dateFormat === 'mmm') {
      const mIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
      base = `${d} ${SHORT_MONTHS[mIdx]} ${y}`;
    } else if (dateFormat === 'slash') {
      base = `${d}/${m}/${y}`;
    } else {
      base = `${d}-${m}-${y}`;
    }
    return includeDopPrefix ? `DOP: ${base}` : base;
  }, [photoDate, dateFormat, includeDopPrefix]);

  const stripH = useMemo(() => Math.max(46, Math.round(fontSize * 2.7)), [fontSize]);
  const photoAreaH = useMemo(
    () => (stripPosition === 'overlay' ? targetDims.h : Math.max(80, targetDims.h - stripH)),
    [stripPosition, targetDims.h, stripH]
  );

  const handleFilesSelected = async (files: File[]) => {
    setError(null);
    try {
      const next = await loadImageFile(files[0]);
      if (prevLoadedUrlRef.current) URL.revokeObjectURL(prevLoadedUrlRef.current);
      prevLoadedUrlRef.current = next.previewUrl;
      setLoaded(next);
      setCrop({ ...DEFAULT_CROP_STATE });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load image.');
    }
  };

  const handleAlignmentClick = (align: 'left' | 'center' | 'right') => {
    setTextAlign(align);
    const xPct = align === 'left' ? 6 : align === 'right' ? 94 : 50;
    setNamePos((prev) => ({ ...prev, xPct }));
    setDatePos((prev) => ({ ...prev, xPct }));
  };

  const resetLayout = () => {
    setStripPosition('bottom');
    setTextAlign('center');
    setFontSize(18);
    setIsBold(true);
    setNamePos({ ...DEFAULT_NAME_POS });
    setDatePos({ ...DEFAULT_DATE_POS });
    setCrop({ ...DEFAULT_CROP_STATE });
  };

  const renderComposition = useCallback((): { canvas: HTMLCanvasElement; boxes: TextBoxRect[] } | null => {
    if (!loaded) return null;
    const { w, h } = targetDims;
    const photoH = stripPosition === 'overlay' ? h : Math.max(80, h - stripH);

    const photoPart = renderCroppedCanvas(loaded.canvas, w, photoH, crop, {
      brightness: 0,
      contrast: 0,
      fitMode: 'cover',
    });

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = w;
    finalCanvas.height = h;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Draw photo shifted below strip if stripPosition === 'top'
    const photoY = stripPosition === 'top' ? stripH : 0;
    ctx.drawImage(photoPart, 0, photoY);

    const barY = stripPosition === 'top' ? 0 : h - stripH;
    ctx.fillStyle = stripBg;
    ctx.fillRect(0, barY, w, stripH);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const borderY = stripPosition === 'top' ? stripH : barY;
    ctx.moveTo(0, borderY);
    ctx.lineTo(w, borderY);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'middle';

    const nameText = candidateName.trim().toUpperCase();
    const weight1 = isBold ? '700' : '500';
    const weight2 = isBold ? '600' : '400';
    const line1Font = `${weight1} ${fontSize}px ${fontFamily}`;
    const line2Size = Math.max(10, fontSize - 2);
    const line2Font = `${weight2} ${line2Size}px ${fontFamily}`;

    const boxes: TextBoxRect[] = [];
    const maxTextW = Math.max(40, w - 16);

    const drawTextItem = (
      kind: 'name' | 'date',
      text: string,
      pos: TextPos,
      font: string,
      sizePx: number
    ) => {
      if (!text) return;
      ctx.font = font;
      const x = (Math.max(4, Math.min(96, pos.xPct)) / 100) * w;
      const y = barY + (Math.max(12, Math.min(88, pos.yPct)) / 100) * stripH;
      ctx.fillText(text, x, y, maxTextW);

      const measuredW = Math.min(maxTextW, ctx.measureText(text).width);
      const boxX =
        textAlign === 'left'
          ? x
          : textAlign === 'right'
          ? x - measuredW
          : x - measuredW / 2;
      boxes.push({
        kind,
        x: Math.max(2, boxX - 4),
        y: Math.max(barY + 1, y - sizePx * 0.65),
        w: Math.max(24, measuredW + 8),
        h: sizePx * 1.3,
      });
    };

    if (nameText) {
      drawTextItem('name', nameText, namePos, line1Font, fontSize);
    }
    if (formattedDate) {
      drawTextItem('date', formattedDate, datePos, line2Font, line2Size);
    }

    return { canvas: finalCanvas, boxes };
  }, [
    loaded,
    targetDims,
    stripPosition,
    stripH,
    crop,
    stripBg,
    textColor,
    textAlign,
    candidateName,
    formattedDate,
    isBold,
    fontSize,
    fontFamily,
    namePos,
    datePos,
  ]);

  // Paint live interactive strip preview with selection box + corner resize handle
  useEffect(() => {
    const preview = previewCanvasRef.current;
    if (!preview) return;
    const comp = renderComposition();
    if (!comp) return;
    boxesRef.current = comp.boxes;

    const { w, h } = targetDims;
    const displayScale = 2;
    preview.width = w * displayScale;
    preview.height = h * displayScale;

    const ctx = preview.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(comp.canvas, 0, 0, preview.width, preview.height);

    const activeBox = comp.boxes.find((b) => b.kind === selectedText) || comp.boxes[0];
    if (activeBox) {
      const bx = activeBox.x * displayScale;
      const by = activeBox.y * displayScale;
      const bw = activeBox.w * displayScale;
      const bh = activeBox.h * displayScale;

      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);

      // Corner resize handle (bottom-right)
      const hx = bx + bw;
      const hy = by + bh;
      ctx.beginPath();
      ctx.arc(hx, hy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2563eb';
      ctx.stroke();
      ctx.restore();
    }
  }, [renderComposition, targetDims, selectedText]);

  // Debounced JPEG export + Max KB binary search
  useEffect(() => {
    if (!loaded) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setProcessing(true);
      try {
        const comp = renderComposition();
        if (!comp) return;
        const encoded = await encodeCanvasToSpec(comp.canvas, {
          format: 'jpeg',
          dpi: targetDims.dpi,
          minKB,
          maxKB,
          expectedWidth: targetDims.w,
          expectedHeight: targetDims.h,
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to render photo.');
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loaded, renderComposition, targetDims, minKB, maxKB]);

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const el = previewCanvasRef.current;
    if (!el) return { x: 0, y: 0, scaleX: 1 };
    const rect = el.getBoundingClientRect();
    const scaleX = targetDims.w / Math.max(1, rect.width);
    const scaleY = targetDims.h / Math.max(1, rect.height);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      scaleX,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const boxes = boxesRef.current;
    if (boxes.length === 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toCanvasCoords(e.clientX, e.clientY);
    const hitTol = Math.max(10, 12 * pt.scaleX);

    // 1. Check active box bottom-right corner resize handle
    const activeBox = boxes.find((b) => b.kind === selectedText) || boxes[0];
    if (activeBox) {
      const hx = activeBox.x + activeBox.w;
      const hy = activeBox.y + activeBox.h;
      if (Math.hypot(pt.x - hx, pt.y - hy) <= hitTol) {
        dragRef.current = {
          type: 'resize',
          startClientY: e.clientY,
          startFontSize: fontSize,
        };
        return;
      }
    }

    // 2. Check if user grabbed Name or Date text box (order: prioritize date if overlapping lower, name if upper)
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (pt.x >= b.x - 8 && pt.x <= b.x + b.w + 8 && pt.y >= b.y - 6 && pt.y <= b.y + b.h + 6) {
        setSelectedText(b.kind);
        dragRef.current = {
          type: 'move',
          target: b.kind,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPos: b.kind === 'name' ? { ...namePos } : { ...datePos },
        };
        return;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag.type === 'none') return;
    const el = previewCanvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (drag.type === 'resize') {
      const dyPx = e.clientY - drag.startClientY;
      const deltaSize = Math.round(dyPx / 4);
      setFontSize(Math.max(10, Math.min(28, drag.startFontSize + deltaSize)));
      return;
    }

    if (drag.type === 'move') {
      const stripPixelDisplayH = Math.max(24, (stripH / targetDims.h) * rect.height);
      const dxPct = ((e.clientX - drag.startClientX) / Math.max(1, rect.width)) * 100;
      const dyPct = ((e.clientY - drag.startClientY) / stripPixelDisplayH) * 100;
      const nextPos: TextPos = {
        xPct: Number(Math.max(4, Math.min(96, drag.startPos.xPct + dxPct)).toFixed(1)),
        yPct: Number(Math.max(14, Math.min(86, drag.startPos.yPct + dyPct)).toFixed(1)),
      };
      if (drag.target === 'name') {
        setNamePos(nextPos);
      } else {
        setDatePos(nextPos);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = { type: 'none' };
  };

  return (
    <>
      <SeoHead
        title="Add Name and Date on Photo (SSC, UPSC & Railway DOP)"
        description="Add a clean candidate Name and Date of Photo (DOP) strip onto your passport photograph for SSC, UPSC, and Railway RRB forms. Drag to position text, pick date format, and export 20–50 KB JPG."
        path="/photo-with-name-date"
        faqs={FAQS}
      />

      <ToolLayout>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Photo with Name &amp; Date (DOP)
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Add your name and Date of Photograph strip cleanly onto your exam photo, position text directly on the preview, and stay within exact KB limits.
          </p>
        </div>

        <FileDropzone onFilesSelected={handleFilesSelected} error={error} />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Controls */}
          <div className="xl:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Exam Output Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ssc', label: 'SSC / RRB (3.5×4.5cm)', min: 20, max: 50 },
                  { id: 'upsc', label: 'UPSC (420×420)', min: 20, max: 300 },
                  { id: 'custom', label: 'Custom KB', min: minKB, max: maxKB },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPresetMode(opt.id as 'ssc' | 'upsc' | 'custom');
                      if (opt.id !== 'custom') {
                        setMinKB(opt.min);
                        setMaxKB(opt.max);
                      }
                    }}
                    className={`min-h-[40px] px-2 rounded-xl border text-[11px] font-semibold transition-colors ${
                      presetMode === opt.id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Candidate Name
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Enter full name (optional)"
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Date of photo
                </label>
                <input
                  type="date"
                  value={photoDate}
                  onChange={(e) => setPhotoDate(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Date format
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as 'dash' | 'slash' | 'mmm')}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="dash">DD-MM-YYYY</option>
                  <option value="slash">DD/MM/YYYY</option>
                  <option value="mmm">DD MMM YYYY</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDopPrefix}
                onChange={(e) => setIncludeDopPrefix(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <span>Include &ldquo;DOP:&rdquo; label before date</span>
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Strip position
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bottom', label: 'Bottom' },
                  { id: 'top', label: 'Top' },
                  { id: 'overlay', label: 'Overlay on photo' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStripPosition(opt.id as 'bottom' | 'top' | 'overlay')}
                    className={`min-h-[38px] px-2 rounded-lg border text-xs font-semibold transition-colors ${
                      stripPosition === opt.id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Text alignment
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => handleAlignmentClick(a)}
                      className={`min-h-[38px] rounded-lg border text-xs font-semibold capitalize transition-colors ${
                        textAlign === a
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
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Font Style
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="Arial, sans-serif">Clean Sans</option>
                  <option value="Georgia, serif">Classic Serif</option>
                  <option value="'Courier New', monospace">Monospace</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>Font size</span>
                  <span className="font-mono tabular-nums">{fontSize} px</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={28}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  aria-label="Font size in pixels"
                  className="w-full accent-blue-600"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsBold((b) => !b)}
                aria-pressed={isBold}
                className={`mt-4 min-h-[38px] px-3.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${
                  isBold
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Bold {isBold ? 'On' : 'Off'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Text Colour
                </label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Strip Background
                </label>
                <input
                  type="color"
                  value={stripBg}
                  onChange={(e) => setStripBg(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Min KB
                </label>
                <input
                  type="number"
                  min={0}
                  value={minKB}
                  onChange={(e) => {
                    setPresetMode('custom');
                    setMinKB(Math.max(0, Number(e.target.value) || 0));
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
                  min={5}
                  value={maxKB}
                  onChange={(e) => {
                    setPresetMode('custom');
                    setMaxKB(Math.max(5, Number(e.target.value) || 50));
                  }}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={resetLayout}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset layout</span>
              </button>
            </div>
          </div>

          {/* Crop + Live Interactive Strip Preview */}
          <div className="xl:col-span-7 space-y-6">
            {loaded ? (
              <>
                <CropEditor
                  sourceCanvas={loaded.canvas}
                  aspectRatio={targetDims.w / photoAreaH}
                  crop={crop}
                  onChange={setCrop}
                />

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Final Photo with Name &amp; Date
                    </span>
                    <span className="font-mono tabular-nums">
                      {processing ? t.processing : result ? `${result.width}×${result.height} · ${result.sizeKB} KB` : ''}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-4 gap-2">
                    <canvas
                      ref={previewCanvasRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className="max-h-[340px] max-w-full border border-slate-300 dark:border-slate-600 shadow-sm cursor-grab active:cursor-grabbing touch-none bg-white"
                      aria-label="Interactive Name and Date strip preview. Drag name or date separately, use corner handle to resize text."
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                      Drag to move, use the handles to resize
                    </p>
                  </div>
                </div>

                {result && (
                  <div className="space-y-4">
                    <ResultBadge result={result} minKB={minKB} maxKB={maxKB} />
                    <DownloadButton
                      blob={result.blob}
                      fileName={`KiloForm-name-date-${result.width}x${result.height}.jpg`}
                      toolName="Photo with Name & Date"
                      dimensions={`${result.width}×${result.height} px`}
                      sizeKB={result.sizeKB}
                      format="jpeg"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Name &amp; Date Strip Preview
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Upload your passport portrait to preview your Name and Date of Photograph strip with live SSC/UPSC sizing.
                </p>
              </div>
            )}
          </div>
        </div>

        <AdSlot variant="result-below" />

        <ToolContentSection
          title="Add Name and Date of Photo (DOP) Strip to Exam Photographs"
          intro="Multiple Indian government recruitment cycles—including UPSC Civil Services OTR, Railway RRB, and SSC examinations—periodically require candidates to print their full name and the exact date the photograph was taken on a clean white strip at the bottom of the image. KiloForm places crisp, centered typography below your portrait without covering your collar or face while maintaining exact 200 DPI and KB requirements."
          steps={[
            {
              title: 'Upload your recent portrait photograph',
              detail: 'Drop a clear front-facing photo against a light background into the uploader.',
            },
            {
              title: 'Type your name and select the photo date',
              detail: 'Enter your name exactly as on your Aadhaar/10th certificate and pick the recent date.',
            },
            {
              title: 'Customize font, size, and exam preset',
              detail: 'Adjust font size so both lines fit cleanly inside the white strip and pick SSC/RRB or UPSC dimensions.',
            },
            {
              title: 'Download the verified JPEG',
              detail: 'Verify the green requirement badge and save the ready-to-upload JPG.',
            },
          ]}
          requirements={[
            { label: 'SSC / Railway Format', spec: '3.5×4.5 cm · 20–50 KB JPG', notes: 'Clear white strip below portrait; date within last 3 months.' },
            { label: 'UPSC CSE Format', spec: '420×420 px · 20–300 KB JPG', notes: 'Candidate name & date printed legibly at bottom.' },
            { label: 'NTA Notice Option', spec: '3.5×4.5 cm · 10–200 KB JPG', notes: 'Use when information bulletin asks for name & DOP.' },
          ]}
          rejectionReasons={[
            'Printing a tiny or low-contrast grey date that becomes unreadable after portal compression.',
            'Using a photograph date older than 3 months from the official notification date.',
            'Covering the candidate chin or neck by placing an oversized overlay bar over the face.',
            'Writing a nickname instead of the official full name from your application form.',
          ]}
          faqs={FAQS}
        />
      </ToolLayout>
    </>
  );
};
