import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PenTool, Upload, Eraser, Check } from 'lucide-react';
import { AdSlot } from '../../components/AdSlot';
import { CropEditor } from '../../components/CropEditor';
import { DownloadButton } from '../../components/DownloadButton';
import { FileDropzone } from '../../components/FileDropzone';
import { PresetSelect } from '../../components/PresetSelect';
import { ResultBadge } from '../../components/ResultBadge';
import { SeoHead, type FaqItem } from '../../components/SeoHead';
import { ToolContentSection, ToolLayout } from '../../components/ToolContentSection';
import { useAppContext } from '../../context/AppContext';
import { getPresetById, type DimensionUnit, type ExamPreset, type ImageFormat } from '../../data/presets';
import {
  applySignatureCleanup,
  DEFAULT_CROP_STATE,
  encodeCanvasToSpec,
  loadImageFile,
  pixelsToCm,
  renderCroppedCanvas,
  unitToPixels,
  type CropState,
  type LoadedImage,
  type ProcessedResult,
} from '../../utils/imageEngine';

const FAQS: FaqItem[] = [
  {
    question: 'What is the standard signature size for SSC and IBPS bank exams?',
    answer:
      'IBPS and SBI banking portals strictly ask for 140 × 60 pixels between 10 KB and 20 KB in JPEG format at 200 DPI. SSC exams specify 4.0 × 2.0 cm (approximately 315 × 157 px at 200 DPI or 472 × 236 px at 300 DPI) between 10 KB and 20 KB.',
  },
  {
    question: 'How does Photograph Signature Cleanup remove grey paper shadows?',
    answer:
      'Our client-side Web Worker samples the paper tone along the borders, separates dark pen strokes from shadows, sets the background to pure #FFFFFF white, and optionally enhances ink contrast or converts blue pen into crisp black.',
  },
  {
    question: 'What does Auto-Crop Whitespace do for my scanned signature?',
    answer:
      'Auto-crop scans every pixel to detect the exact bounding box of your pen strokes and trims away empty paper margins while leaving balanced padding so your signature fills the target frame clearly.',
  },
  {
    question: 'Can I draw my signature directly on screen if I have no paper?',
    answer:
      'Yes. Switch to the Draw Signature tab to sign smoothly with your finger, stylus, or mouse on a white canvas, adjust stroke thickness, and apply it directly to the resizer and KB compressor.',
  },
  {
    question: 'Which format should I export my signature in: JPG, PNG, or WEBP?',
    answer:
      'Keep JPG selected (the default for all exam presets). Most Indian exam portals do not accept WEBP or PNG signatures.',
  },
];

export const SignatureResizerPage: React.FC = () => {
  const { t, lastPresetId, setLastPresetId } = useAppContext();
  const [searchParams] = useSearchParams();
  const urlPresetId = searchParams.get('preset');

  const initialPreset = useMemo(
    () => getPresetById(urlPresetId) || getPresetById(lastPresetId) || getPresetById('ibps-po')!,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [inputMode, setInputMode] = useState<'upload' | 'draw'>('upload');
  const [presetId, setPresetId] = useState<string>(initialPreset.id);
  const [width, setWidth] = useState<number>(initialPreset.signature.width);
  const [height, setHeight] = useState<number>(initialPreset.signature.height);
  const [unit, setUnit] = useState<DimensionUnit>(initialPreset.signature.unit);
  const [dpi, setDpi] = useState<number>(initialPreset.signature.dpi);
  const [minKB, setMinKB] = useState<number>(initialPreset.signature.minKB);
  const [maxKB, setMaxKB] = useState<number>(initialPreset.signature.maxKB);
  const [format, setFormat] = useState<ImageFormat>('jpeg');

  const [cleanupMode, setCleanupMode] = useState<'bw' | 'enhance' | 'original'>('bw');
  const [thickness, setThickness] = useState<number>(1);
  const [whiteBg, setWhiteBg] = useState<boolean>(true);
  const [autoCrop, setAutoCrop] = useState<boolean>(true);

  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [originalMeta, setOriginalMeta] = useState<string>('');
  const [cleanedCanvas, setCleanedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [crop, setCrop] = useState<CropState>({ ...DEFAULT_CROP_STATE });

  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const [penSize, setPenSize] = useState<number>(4);

  const prevOrigUrlRef = useRef<string | null>(null);
  const prevResultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!urlPresetId) return;
    const found = getPresetById(urlPresetId);
    if (found) applyPreset(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPresetId]);

  useEffect(() => {
    return () => {
      if (prevOrigUrlRef.current) URL.revokeObjectURL(prevOrigUrlRef.current);
      if (prevResultUrlRef.current) URL.revokeObjectURL(prevResultUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (inputMode !== 'draw') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [inputMode]);

  const applyPreset = (preset: ExamPreset | null) => {
    if (!preset) {
      setPresetId('custom');
      return;
    }
    setPresetId(preset.id);
    setLastPresetId(preset.id);
    setWidth(preset.signature.width);
    setHeight(preset.signature.height);
    setUnit(preset.signature.unit); // Always keep preset's native unit
    setDpi(preset.signature.dpi);
    setMinKB(preset.signature.minKB);
    setMaxKB(preset.signature.maxKB);
    setFormat('jpeg'); // Default output format = JPG for every exam preset
  };

  const handleFilesSelected = async (files: File[]) => {
    setError(null);
    setProcessing(true);
    try {
      const loaded: LoadedImage = await loadImageFile(files[0]);
      if (prevOrigUrlRef.current) URL.revokeObjectURL(prevOrigUrlRef.current);
      prevOrigUrlRef.current = loaded.previewUrl;
      setOriginalPreviewUrl(loaded.previewUrl);
      setOriginalMeta(
        `${loaded.originalWidth}×${loaded.originalHeight} · ${(loaded.originalSizeBytes / 1024).toFixed(0)} KB`
      );
      setSourceCanvas(loaded.canvas);
      setCrop({ ...DEFAULT_CROP_STATE });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load signature image.');
    } finally {
      setProcessing(false);
    }
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleDrawStart = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    isDrawingRef.current = true;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const handleDrawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handleDrawEnd = () => {
    isDrawingRef.current = false;
  };

  const clearDrawPad = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const applyDrawnSignature = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext('2d');
    if (ctx) ctx.drawImage(canvas, 0, 0);

    copy.toBlob((b) => {
      if (b) {
        const url = URL.createObjectURL(b);
        if (prevOrigUrlRef.current) URL.revokeObjectURL(prevOrigUrlRef.current);
        prevOrigUrlRef.current = url;
        setOriginalPreviewUrl(url);
        setOriginalMeta(`${copy.width}×${copy.height} · Drawn pad`);
      }
    }, 'image/png');

    setSourceCanvas(copy);
    setCrop({ ...DEFAULT_CROP_STATE });
  };

  useEffect(() => {
    let cancelled = false;
    const runCleanup = async () => {
      if (!sourceCanvas) {
        setCleanedCanvas(null);
        return;
      }
      const next = await applySignatureCleanup(sourceCanvas, {
        mode: cleanupMode,
        thickness,
        whiteBg,
        autoCrop,
      });
      if (!cancelled) {
        setCleanedCanvas(next);
      }
    };
    void runCleanup();
    return () => {
      cancelled = true;
    };
  }, [sourceCanvas, cleanupMode, thickness, whiteBg, autoCrop]);

  const targetPxW = useMemo(() => unitToPixels(width, unit, dpi), [width, unit, dpi]);
  const targetPxH = useMemo(() => unitToPixels(height, unit, dpi), [height, unit, dpi]);
  const targetCmW = useMemo(() => pixelsToCm(targetPxW, dpi).toFixed(2), [targetPxW, dpi]);
  const targetCmH = useMemo(() => pixelsToCm(targetPxH, dpi).toFixed(2), [targetPxH, dpi]);

  const activePreset = useMemo(() => getPresetById(presetId), [presetId]);

  useEffect(() => {
    if (!cleanedCanvas) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setProcessing(true);
      try {
        const rendered = renderCroppedCanvas(cleanedCanvas, targetPxW, targetPxH, crop, {
          brightness: 0,
          contrast: 0,
          fitMode: 'contain',
          backgroundColor: '#ffffff',
        });
        const encoded = await encodeCanvasToSpec(rendered, {
          format,
          dpi,
          minKB,
          maxKB,
          expectedWidth: activePreset ? targetPxW : undefined,
          expectedHeight: activePreset ? targetPxH : undefined,
          expectedFormat: activePreset ? activePreset.signature.format : undefined,
        });
        if (cancelled) {
          URL.revokeObjectURL(encoded.url);
          return;
        }
        if (prevResultUrlRef.current) URL.revokeObjectURL(prevResultUrlRef.current);
        prevResultUrlRef.current = encoded.url;
        setResult(encoded);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Signature encoding failed.');
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 160);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cleanedCanvas, targetPxW, targetPxH, crop, format, dpi, minKB, maxKB, activePreset]);

  const ext = format === 'jpeg' ? 'jpg' : format;
  const outputFileName = `KiloForm-${presetId === 'custom' ? 'custom' : presetId}-signature-${targetPxW}x${targetPxH}.${ext}`;

  return (
    <>
      <SeoHead
        title="Signature Resizer & Cleaner – 140x60 px, 10–20 KB & Draw Pad"
        description="Resize and clean scanned signatures for IBPS, SBI, SSC CGL, UPSC, and NEET forms. Auto-crop whitespace, boost black ink, draw on screen, and hit 10–20 KB at 200 DPI."
        path="/signature-resizer"
        faqs={FAQS}
      />

      <ToolLayout>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Signature Resizer &amp; Cleaner
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Upload a phone photo of your signature or draw directly on screen. Auto-crop margins, brighten paper to pure white, and hit 10–20 KB.
          </p>
        </div>

        {/* Input Mode Switch */}
        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 gap-1">
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              inputMode === 'upload'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Photograph Signature</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('draw')}
            className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              inputMode === 'draw'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Draw Signature Pad</span>
          </button>
        </div>

        {inputMode === 'upload' ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            cameraFacing="environment"
            label="Upload or take a photo of your signature on white paper"
            error={error}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Sign smoothly inside the white pad below
              </p>
              <label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <span>Pen width</span>
                <input
                  type="range"
                  min={2}
                  max={10}
                  value={penSize}
                  onChange={(e) => setPenSize(Number(e.target.value))}
                  className="w-24 accent-blue-600"
                />
              </label>
            </div>

            <canvas
              ref={drawCanvasRef}
              width={700}
              height={260}
              onPointerDown={handleDrawStart}
              onPointerMove={handleDrawMove}
              onPointerUp={handleDrawEnd}
              onPointerCancel={handleDrawEnd}
              className="w-full max-w-2xl h-48 sm:h-56 rounded-xl border border-slate-300 dark:border-slate-700 bg-white touch-none cursor-crosshair"
              aria-label="Signature drawing pad"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={applyDrawnSignature}
                className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Apply Drawn Signature</span>
              </button>
              <button
                type="button"
                onClick={clearDrawPad}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Eraser className="w-4 h-4" aria-hidden="true" />
                <span>Clear Pad</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Controls */}
          <div className="xl:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
            <PresetSelect selectedId={presetId} onSelect={applyPreset} mode="signature" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.width}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0.5}
                  value={width}
                  onChange={(e) => {
                    setPresetId('custom');
                    setWidth(Math.max(0.5, Number(e.target.value) || 1));
                  }}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.height}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0.5}
                  value={height}
                  onChange={(e) => {
                    setPresetId('custom');
                    setHeight(Math.max(0.5, Number(e.target.value) || 1));
                  }}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.unit}
                </label>
                <select
                  value={unit}
                  onChange={(e) => {
                    setPresetId('custom');
                    setUnit(e.target.value as DimensionUnit);
                  }}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="px">Pixels (px)</option>
                  <option value="cm">Centimetres (cm)</option>
                  <option value="mm">Millimetres (mm)</option>
                  <option value="inch">Inches (in)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.dpi}
                </label>
                <select
                  value={dpi}
                  onChange={(e) => setDpi(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                >
                  <option value={72}>72 DPI</option>
                  <option value={96}>96 DPI</option>
                  <option value={200}>200 DPI</option>
                  <option value={300}>300 DPI</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.minKB}
                </label>
                <input
                  type="number"
                  min={0}
                  value={minKB}
                  onChange={(e) => setMinKB(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.maxKB}
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxKB}
                  onChange={(e) => setMaxKB(Math.max(1, Number(e.target.value) || 20))}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Live computed pixels and cm feedback */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-600 dark:text-slate-400">Computed Output Size</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {targetPxW} × {targetPxH} px ({targetCmW} × {targetCmH} cm @ {dpi} DPI)
              </span>
            </div>

            {/* Format selector + WEBP warning */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t.format}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['jpeg', 'png', 'webp'] as ImageFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`min-h-[40px] rounded-xl border text-xs font-semibold uppercase transition-colors ${
                      format === fmt
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {fmt === 'jpeg' ? 'JPG' : fmt}
                  </button>
                ))}
              </div>
              <p
                className={`text-[11px] leading-snug ${
                  format === 'webp'
                    ? 'text-amber-700 dark:text-amber-300 font-medium'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Most exam portals do not accept WEBP. Use JPG unless the form says otherwise.
              </p>
            </div>

            {/* Ink & Cleanup controls */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Signature Ink &amp; Paper Cleanup
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bw', label: 'Black & White' },
                  { id: 'enhance', label: 'Keep Ink Colour' },
                  { id: 'original', label: 'Original' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCleanupMode(m.id as 'bw' | 'enhance' | 'original')}
                    className={`min-h-[38px] px-2 rounded-xl border text-xs font-medium transition-colors ${
                      cleanupMode === m.id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>Ink Thickness</span>
                  <span className="font-mono tabular-nums">{thickness > 0 ? `+${thickness}` : thickness}</span>
                </div>
                <input
                  type="range"
                  min={-2}
                  max={3}
                  step={1}
                  value={thickness}
                  onChange={(e) => setThickness(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <label className="inline-flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCrop}
                    onChange={(e) => setAutoCrop(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span>Auto-crop empty white paper margins</span>
                </label>
                <label className="inline-flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whiteBg}
                    onChange={(e) => setWhiteBg(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span>Clean paper background to pure white (#FFFFFF)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Live Preview & Output */}
          <div className="xl:col-span-7 space-y-6">
            {cleanedCanvas ? (
              <>
                <CropEditor
                  sourceCanvas={cleanedCanvas}
                  aspectRatio={targetPxW / targetPxH}
                  crop={crop}
                  onChange={setCrop}
                  fitMode="contain"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{t.before}</span>
                      <span className="font-mono tabular-nums">{originalMeta}</span>
                    </div>
                    <div className="h-36 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-2 overflow-hidden">
                      {originalPreviewUrl && (
                        <img
                          src={originalPreviewUrl}
                          alt="Original signature"
                          className="max-h-full max-w-full object-contain"
                        />
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{t.after}</span>
                      <span className="font-mono tabular-nums">
                        {processing ? t.processing : result ? `${result.sizeKB} KB` : ''}
                      </span>
                    </div>
                    <div className="h-36 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-2 overflow-hidden">
                      {result && (
                        <img
                          src={result.url}
                          alt="Cleaned signature preview"
                          className="max-h-full max-w-full object-contain border border-slate-200"
                        />
                      )}
                    </div>
                    {result && (
                      <p className="text-[11px] font-mono tabular-nums text-center text-slate-600 dark:text-slate-300">
                        {result.width} × {result.height} px · {pixelsToCm(result.width, result.dpi).toFixed(2)} ×{' '}
                        {pixelsToCm(result.height, result.dpi).toFixed(2)} cm @ {result.dpi} DPI
                      </p>
                    )}
                  </div>
                </div>

                {result && (
                  <div className="space-y-4">
                    <ResultBadge result={result} minKB={minKB} maxKB={maxKB} />
                    <DownloadButton
                      blob={result.blob}
                      fileName={outputFileName}
                      toolName="Signature Resizer"
                      dimensions={`${result.width}×${result.height} px`}
                      sizeKB={result.sizeKB}
                      format={result.format}
                      className="w-full sm:w-auto"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Signature Cleanup Preview
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Upload a photo of your signature or draw on the pad to see instant whitespace cropping, dark ink boost, and {targetPxW}×{targetPxH} px ({targetCmW}×{targetCmH} cm, {minKB}–{maxKB} KB) validation.
                </p>
              </div>
            )}
          </div>
        </div>

        <AdSlot variant="result-below" />

        <ToolContentSection
          title="Scan, Clean, and Resize Signatures for Government Forms"
          intro="Signature uploads fail more often than photographs because smartphone cameras capture yellow or grey paper tones and leave wide empty margins around tiny pen strokes. When resized down to 140 × 60 pixels, faint signatures become unreadable. KiloForm automatically detects your ink strokes, strips shadows into pure white, boosts ink thickness, crops out excess paper, and ensures your JPEG meets exact 10–20 KB or 4–30 KB portal limits."
          steps={[
            {
              title: 'Select your exam signature preset',
              detail:
                'Choose IBPS/SBI (140×60 px, 10–20 KB), SSC (4×2 cm, 10–20 KB), NEET/JEE (4–30 KB), or enter custom dimensions.',
            },
            {
              title: 'Upload a paper photo or draw on screen',
              detail:
                'Snap a quick photo of your signature on plain white paper, or switch to the Draw Signature Pad to sign cleanly with a mouse or finger.',
            },
            {
              title: 'Enable Auto-Crop and Black & White boost',
              detail:
                'Keep Auto-Crop and Pure White Background enabled, and adjust the Ink Thickness slider if your pen strokes look too thin.',
            },
            {
              title: 'Check the green badge and download JPG',
              detail:
                'Verify your signature looks crisp inside the After preview and hits the required pixels, cm size, and KB window before downloading.',
            },
          ]}
          requirements={[
            { label: 'IBPS / SBI PO & Clerk', spec: '140×60 px · 10–20 KB JPG', notes: 'Black ink on white paper at 200 DPI; running hand only.' },
            { label: 'SSC CGL / CHSL / GD', spec: '4.0×2.0 cm · 10–20 KB JPG', notes: 'Horizontal box; no block capital letters.' },
            { label: 'UPSC CSE (OTR)', spec: '350×350 px · 20–300 KB JPG', notes: 'Black ink on plain white sheet.' },
            { label: 'Railway RRB NTPC', spec: '50×20 mm · 30–70 KB JPG', notes: '30–70 KB range; black or blue ink.' },
            { label: 'NTA NEET / JEE / CUET', spec: '4.0×2.0 cm · 4–30 KB JPG', notes: 'Full running signature on white background.' },
          ]}
          rejectionReasons={[
            'Signing on lined or ruled notebook paper instead of plain unruled white A4 paper.',
            'Writing your name in all capital letters (BLOCK LETTERS) instead of running script.',
            'Uploading a vertical/sideways signature image instead of horizontal orientation.',
            'Dim camera shadows turning the background dark grey after compression.',
            'Signature falling under 10 KB or exceeding 20 KB on IBPS and SSC portals.',
            'Faint blue ballpoint strokes disappearing when resized to 140 × 60 pixels.',
          ]}
          faqs={FAQS}
        />
      </ToolLayout>
    </>
  );
};
