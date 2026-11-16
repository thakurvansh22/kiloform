import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { AdSlot } from '../../components/AdSlot';
import { DownloadButton } from '../../components/DownloadButton';
import { FileDropzone } from '../../components/FileDropzone';
import { ResultBadge } from '../../components/ResultBadge';
import { SeoHead, type FaqItem } from '../../components/SeoHead';
import { ToolContentSection, ToolLayout } from '../../components/ToolContentSection';
import { useAppContext } from '../../context/AppContext';
import type { DimensionUnit, ImageFormat } from '../../data/presets';
import {
  encodeCanvasToSpec,
  loadImageFile,
  unitToPixels,
  type LoadedImage,
  type ProcessedResult,
} from '../../utils/imageEngine';

type ResizeUnit = DimensionUnit | 'percent';

const FAQS: FaqItem[] = [
  {
    question: 'How does Lock Aspect Ratio prevent stretched or squished faces?',
    answer:
      'When Lock Aspect Ratio is enabled, changing either the width or height automatically updates the other dimension proportionally so circles remain circular and faces never look stretched.',
  },
  {
    question: 'Can I convert PNG or WEBP screenshots into standard JPG?',
    answer:
      'Yes. Select JPG as your output format and KiloForm re-encodes PNG, WEBP, or HEIC images onto a solid white background with genuine JPEG JFIF headers.',
  },
  {
    question: 'How does percentage resizing work?',
    answer:
      'Selecting Percentage (%) scales your original pixel width and height by your chosen percentage—for example, 50% turns a 2000×1500 px image into 1000×750 px.',
  },
  {
    question: 'Are DPI values embedded when resizing in centimetres or inches?',
    answer:
      'Yes. Choosing 200 DPI or 300 DPI calculates exact physical pixel counts from your centimetre or inch values and writes that DPI directly into exported JPEGs.',
  },
  {
    question: 'Does resizing happen locally on my device?',
    answer:
      'Completely. Every pixel scaling operation and format conversion runs directly on your browser canvas without sending data over the network.',
  },
];

export const ResizeImagePage: React.FC = () => {
  const { t } = useAppContext();
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);

  const [unit, setUnit] = useState<ResizeUnit>('px');
  const [widthVal, setWidthVal] = useState<number>(800);
  const [heightVal, setHeightVal] = useState<number>(600);
  const [percentVal, setPercentVal] = useState<number>(50);
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [dpi, setDpi] = useState<number>(200);
  const [format, setFormat] = useState<ImageFormat>('jpeg');

  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevLoadedUrlRef = useRef<string | null>(null);
  const prevResultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (prevLoadedUrlRef.current) URL.revokeObjectURL(prevLoadedUrlRef.current);
      if (prevResultUrlRef.current) URL.revokeObjectURL(prevResultUrlRef.current);
    };
  }, []);

  const handleFilesSelected = async (files: File[]) => {
    setError(null);
    setProcessing(true);
    try {
      const next = await loadImageFile(files[0]);
      if (prevLoadedUrlRef.current) URL.revokeObjectURL(prevLoadedUrlRef.current);
      prevLoadedUrlRef.current = next.previewUrl;
      setLoaded(next);
      if (unit === 'px') {
        setWidthVal(next.canvas.width);
        setHeightVal(next.canvas.height);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load image.');
    } finally {
      setProcessing(false);
    }
  };

  const aspectRatio = loaded ? loaded.canvas.width / loaded.canvas.height : 4 / 3;

  const handleWidthChange = (nextW: number) => {
    const safe = Math.max(1, nextW);
    setWidthVal(safe);
    if (lockRatio) {
      setHeightVal(Number((safe / aspectRatio).toFixed(unit === 'px' ? 0 : 2)));
    }
  };

  const handleHeightChange = (nextH: number) => {
    const safe = Math.max(1, nextH);
    setHeightVal(safe);
    if (lockRatio) {
      setWidthVal(Number((safe * aspectRatio).toFixed(unit === 'px' ? 0 : 2)));
    }
  };

  const targetPx = useMemo(() => {
    if (!loaded) return { w: 800, h: 600 };
    if (unit === 'percent') {
      const factor = Math.max(5, Math.min(300, percentVal)) / 100;
      return {
        w: Math.max(10, Math.round(loaded.canvas.width * factor)),
        h: Math.max(10, Math.round(loaded.canvas.height * factor)),
      };
    }
    return {
      w: unitToPixels(widthVal, unit, dpi),
      h: unitToPixels(heightVal, unit, dpi),
    };
  }, [loaded, unit, widthVal, heightVal, percentVal, dpi]);

  useEffect(() => {
    if (!loaded) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setProcessing(true);
      try {
        const out = document.createElement('canvas');
        out.width = targetPx.w;
        out.height = targetPx.h;
        const ctx = out.getContext('2d');
        if (ctx) {
          if (format === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, out.width, out.height);
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(loaded.canvas, 0, 0, out.width, out.height);
        }
        const encoded = await encodeCanvasToSpec(out, {
          format,
          dpi,
          minKB: 0,
          maxKB: 0,
          allowDownscale: false,
          padMinKB: false,
        });
        if (cancelled) {
          URL.revokeObjectURL(encoded.url);
          return;
        }
        if (prevResultUrlRef.current) URL.revokeObjectURL(prevResultUrlRef.current);
        prevResultUrlRef.current = encoded.url;
        setResult(encoded);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Resize failed.');
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loaded, targetPx, format, dpi]);

  const ext = format === 'jpeg' ? 'jpg' : format;

  return (
    <>
      <SeoHead
        title="Resize Image by Pixels, CM, Percentage & Format Converter"
        description="Resize any image by exact pixels, centimetres, millimetres, inches, or percentage with aspect ratio lock. Convert HEIC, PNG, and WEBP to JPG locally."
        path="/resize-image"
        faqs={FAQS}
      />

      <ToolLayout>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Image Resizer &amp; Format Converter
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Change dimensions in pixels, centimetres, inches, or percentage with optional aspect ratio lock, and convert cleanly between JPG, PNG, and WEBP.
          </p>
        </div>

        <FileDropzone onFilesSelected={handleFilesSelected} error={error} />

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Resize By
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ResizeUnit)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="px">Pixels (px)</option>
                <option value="cm">Centimetres (cm)</option>
                <option value="mm">Millimetres (mm)</option>
                <option value="inch">Inches (in)</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.dpi}
              </label>
              <select
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              >
                <option value={72}>72 DPI</option>
                <option value={96}>96 DPI</option>
                <option value={200}>200 DPI</option>
                <option value={300}>300 DPI</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Output Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ImageFormat)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm uppercase text-slate-900 dark:text-slate-100"
              >
                <option value="jpeg">JPG / JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
              </select>
            </div>
          </div>

          {unit === 'percent' ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Scale Percentage</span>
                <span className="font-mono font-semibold tabular-nums">{percentVal}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={200}
                value={percentVal}
                onChange={(e) => setPercentVal(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.width} ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  value={widthVal}
                  onChange={(e) => handleWidthChange(Number(e.target.value) || 1)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="button"
                onClick={() => setLockRatio((r) => !r)}
                aria-pressed={lockRatio}
                title="Toggle aspect ratio lock"
                className={`min-h-[42px] px-3.5 rounded-xl border inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  lockRatio
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {lockRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{lockRatio ? 'Locked' : 'Unlocked'}</span>
              </button>

              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.height} ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  value={heightVal}
                  onChange={(e) => handleHeightChange(Number(e.target.value) || 1)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}
        </div>

        {loaded && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{t.before}</span>
                  <span className="font-mono tabular-nums">
                    {loaded.originalWidth}×{loaded.originalHeight} px
                  </span>
                </div>
                <div className="h-48 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-2 overflow-hidden">
                  <img
                    src={loaded.previewUrl}
                    alt="Original image"
                    className="max-h-full max-w-full object-contain rounded"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{t.after}</span>
                  <span className="font-mono tabular-nums">
                    {processing ? t.processing : `${targetPx.w}×${targetPx.h} px`}
                  </span>
                </div>
                <div className="h-48 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-2 overflow-hidden">
                  {result && (
                    <img
                      src={result.url}
                      alt="Resized image preview"
                      className="max-h-full max-w-full object-contain rounded"
                    />
                  )}
                </div>
              </div>
            </div>

            {result && (
              <div className="space-y-4">
                <ResultBadge result={result} />
                <DownloadButton
                  blob={result.blob}
                  fileName={`KiloForm-resized-${result.width}x${result.height}.${ext}`}
                  toolName="Resize Image"
                  dimensions={`${result.width}×${result.height} px`}
                  sizeKB={result.sizeKB}
                  format={result.format}
                />
              </div>
            )}
          </div>
        )}

        <AdSlot variant="result-below" />

        <ToolContentSection
          title="Resize Images by Pixels, Centimetres, or Percentage"
          intro="Different government departments ask for image specifications in different units—bank forms specify pixels (800×400 px for handwritten declarations), state portals specify centimetres (3.5×4.5 cm), and passport centres specify inches (2×2 in). KiloForm converts any unit seamlessly using your chosen print DPI and lets you convert between JPG, PNG, and WEBP without installing heavy desktop software."
          steps={[
            {
              title: 'Upload your image or document scan',
              detail: 'Drop a JPG, PNG, WEBP, or iPhone HEIC file into the dropzone or paste from clipboard.',
            },
            {
              title: 'Pick your measurement unit',
              detail: 'Choose Pixels, Centimetres, Millimetres, Inches, or Percentage scaling.',
            },
            {
              title: 'Enter target dimensions & DPI',
              detail: 'Keep Aspect Ratio Locked to prevent distortion, and choose 200 or 300 DPI for print-accurate JPEGs.',
            },
            {
              title: 'Choose output format and download',
              detail: 'Select JPG, PNG, or WEBP and click Download to save your resized image locally.',
            },
          ]}
          requirements={[
            { label: 'IBPS Handwritten Declaration', spec: '800×400 px · JPG', notes: 'Clean white paper scan; 50–100 KB.' },
            { label: 'IBPS Left Thumb Impression', spec: '240×240 px · JPG', notes: 'Black/blue ink on white sheet; 20–50 KB.' },
            { label: 'Postcard Photo (NEET)', spec: '4×6 inch · JPG', notes: 'Set Inches + 200 DPI (800×1200 px).' },
            { label: 'Standard A4 Certificate', spec: '21×29.7 cm · JPG', notes: 'Set Centimetres + 96 or 150 DPI.' },
          ]}
          rejectionReasons={[
            'Unlocking aspect ratio and stretching portraits horizontally or vertically.',
            'Renaming a .png screenshot directly to .jpg without re-encoding.',
            'Resizing with 72 DPI when a portal requires 200 DPI physical dimensions.',
            'Upscaling tiny low-resolution thumbnails above 150%, causing jagged pixels.',
          ]}
          faqs={FAQS}
        />
      </ToolLayout>
    </>
  );
};
