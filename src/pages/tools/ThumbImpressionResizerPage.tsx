import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Fingerprint, Sparkles } from 'lucide-react';
import { AdSlot } from '../../components/AdSlot';
import { CropEditor } from '../../components/CropEditor';
import { DownloadButton } from '../../components/DownloadButton';
import { FileDropzone } from '../../components/FileDropzone';
import { ResultBadge } from '../../components/ResultBadge';
import { SeoHead, type FaqItem } from '../../components/SeoHead';
import { ToolContentSection, ToolLayout } from '../../components/ToolContentSection';
import { useAppContext } from '../../context/AppContext';
import {
  THUMB_PRESETS,
  VERIFICATION_DISCLAIMER,
  getThumbPresetById,
  type DimensionUnit,
  type ThumbPreset,
} from '../../data/presets';
import {
  DEFAULT_CROP_STATE,
  applyThumbCleanup,
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
    question: 'What is the required thumb impression size for IBPS and SBI exams?',
    answer:
      'IBPS PO, Clerk, RRB, and SBI forms specify a Left Thumb Impression (LTI) on white paper in JPG/JPEG format measuring 240 × 240 pixels (roughly 3.0 × 3.0 cm at 200 DPI) with a file size between 20 KB and 50 KB.',
  },
  {
    question: 'Should I use black or blue ink for my thumb impression scan?',
    answer:
      'Most Indian portals accept either black or blue stamp-pad ink on plain unruled white paper, though many forms prefer black ink. If you only have a blue stamp pad, keep High-Contrast Black Ink enabled so KiloForm converts your ridges into crisp black ink on pure white paper.',
  },
  {
    question: 'How do the Contrast and Threshold sliders improve a smudged phone photo?',
    answer:
      'Smartphone photos of paper often pick up yellowish ambient lighting or grey shadows. Raising the Threshold slider whitens more of the background paper pixels to pure #FFFFFF, while raising Contrast sharpens the dark fingerprint ridges so lines stay legible after 20–50 KB JPEG compression.',
  },
  {
    question: 'Why does Auto-Crop Ink Area help pass portal checks?',
    answer:
      'Candidates frequently photograph their thumb impression from a distance, leaving huge blank margins around a tiny print. Auto-Crop automatically detects the inked fingerprint region and trims away extra blank sheet margins before resizing to 240×240 px or 3.5×2.5 cm.',
  },
  {
    question: 'Are my thumbprint and biometric scans ever uploaded to a server?',
    answer:
      'No. Every pixel threshold, auto-crop bounding box, DPI header write, and JPEG KB compression runs 100% inside your browser using a local Web Worker and HTML5 Canvas. Your thumb impression image never leaves your phone or laptop.',
  },
];

export const ThumbImpressionResizerPage: React.FC = () => {
  const { t } = useAppContext();

  const initialPreset = useMemo(() => getThumbPresetById('ibps-sbi-lti') || THUMB_PRESETS[0], []);

  const [presetId, setPresetId] = useState<string>(initialPreset.id);
  const [width, setWidth] = useState<number>(initialPreset.spec.width);
  const [height, setHeight] = useState<number>(initialPreset.spec.height);
  const [unit, setUnit] = useState<DimensionUnit>(initialPreset.spec.unit);
  const [dpi, setDpi] = useState<number>(initialPreset.spec.dpi);
  const [minKB, setMinKB] = useState<number>(initialPreset.spec.minKB);
  const [maxKB, setMaxKB] = useState<number>(initialPreset.spec.maxKB);

  const [bw, setBw] = useState<boolean>(true);
  const [autoCrop, setAutoCrop] = useState<boolean>(true);
  const [contrast, setContrast] = useState<number>(50);
  const [threshold, setThreshold] = useState<number>(165);

  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [originalMeta, setOriginalMeta] = useState<string>('');
  const [cleanedCanvas, setCleanedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [crop, setCrop] = useState<CropState>({ ...DEFAULT_CROP_STATE });

  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevOrigUrlRef = useRef<string | null>(null);
  const prevResultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (prevOrigUrlRef.current) URL.revokeObjectURL(prevOrigUrlRef.current);
      if (prevResultUrlRef.current) URL.revokeObjectURL(prevResultUrlRef.current);
    };
  }, []);

  const applyPreset = (preset: ThumbPreset | null) => {
    if (!preset) {
      setPresetId('custom');
      return;
    }
    setPresetId(preset.id);
    setWidth(preset.spec.width);
    setHeight(preset.spec.height);
    setUnit(preset.spec.unit);
    setDpi(preset.spec.dpi);
    setMinKB(preset.spec.minKB);
    setMaxKB(preset.spec.maxKB);
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
      setError(err instanceof Error ? err.message : 'Unable to load thumb impression image.');
    } finally {
      setProcessing(false);
    }
  };

  // Run ink cleanup & auto-crop in Web Worker whenever source or sliders change
  useEffect(() => {
    if (!sourceCanvas) {
      setCleanedCanvas(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const cleaned = await applyThumbCleanup(sourceCanvas, {
        contrast,
        threshold,
        bw,
        autoCrop,
      });
      if (!cancelled) {
        setCleanedCanvas(cleaned);
      }
    }, 60);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sourceCanvas, contrast, threshold, bw, autoCrop]);

  const targetPxW = useMemo(() => unitToPixels(width, unit, dpi), [width, unit, dpi]);
  const targetPxH = useMemo(() => unitToPixels(height, unit, dpi), [height, unit, dpi]);
  const targetCmW = useMemo(() => pixelsToCm(targetPxW, dpi).toFixed(2), [targetPxW, dpi]);
  const targetCmH = useMemo(() => pixelsToCm(targetPxH, dpi).toFixed(2), [targetPxH, dpi]);
  const activePreset = useMemo(() => getThumbPresetById(presetId), [presetId]);

  // Encode cropped thumb impression to JPG with JFIF DPI & KB bounds
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
          format: 'jpeg',
          dpi,
          minKB,
          maxKB,
          expectedWidth: activePreset ? targetPxW : undefined,
          expectedHeight: activePreset ? targetPxH : undefined,
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Thumb impression encoding failed.');
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cleanedCanvas, targetPxW, targetPxH, crop, dpi, minKB, maxKB, activePreset]);

  const outputFileName = `KiloForm-${presetId === 'custom' ? 'custom' : presetId}-thumb-${targetPxW}x${targetPxH}.jpg`;

  return (
    <>
      <SeoHead
        title="Thumb Impression Resizer & Cleaner – 240x240 px, 20–50 KB JPG"
        description="Crop, convert to crisp black ink on white paper, and resize Left Thumb Impression (LTI) for IBPS, SBI, NEET, JEE, SSC, and RRB forms in exact px/cm, 200 DPI, and KB limits."
        path="/thumb-impression-resizer"
        faqs={FAQS}
      />

      <ToolLayout>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Fingerprint className="w-4 h-4" aria-hidden="true" />
            <span>100% Client-Side Biometric Safe</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Thumb Impression Resizer &amp; Ink Cleaner
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Upload a photo of your left or right thumb impression, auto-crop to the ink area, convert faint stamp-pad ink into crisp black on pure white paper, and export exact KB JPG.
          </p>
        </div>

        <FileDropzone
          onFilesSelected={handleFilesSelected}
          cameraFacing="environment"
          label="Upload or snap a photo of your thumb impression on plain white paper"
          error={error}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Controls Panel */}
          <div className="xl:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
            {/* Thumb Exam Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="thumb-preset-select"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Select Exam Thumb Preset
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {VERIFICATION_DISCLAIMER}
                </span>
              </div>
              <select
                id="thumb-preset-select"
                value={presetId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    applyPreset(null);
                  } else {
                    applyPreset(getThumbPresetById(val) || null);
                  }
                }}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-slate-100"
              >
                {THUMB_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortName} ({p.spec.width}×{p.spec.height} {p.spec.unit}, {p.spec.minKB}–{p.spec.maxKB} KB)
                  </option>
                ))}
                <option value="custom">Custom Dimensions &amp; KB</option>
              </select>
              {activePreset?.spec.backgroundNote && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {activePreset.spec.backgroundNote}
                </p>
              )}
            </div>

            {/* Dimensions, Unit, DPI & KB */}
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
                  onChange={(e) => setMaxKB(Math.max(1, Number(e.target.value) || 50))}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Live computed output summary */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 px-3.5 py-2.5 text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Output Spec</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {targetPxW} × {targetPxH} px ({targetCmW} × {targetCmH} cm @ {dpi} DPI)
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Format</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  JPG (Standard JFIF with {dpi} DPI)
                </span>
              </div>
            </div>

            {/* Ink Cleanup & Auto-Crop Controls */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                <span>Ink &amp; Paper Cleanup</span>
              </div>

              <div className="flex flex-col gap-2.5">
                <label className="inline-flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bw}
                    onChange={(e) => setBw(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span>High-contrast black ink on pure white (#FFFFFF)</span>
                </label>
                <label className="inline-flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCrop}
                    onChange={(e) => setAutoCrop(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span>Auto-crop closely around inked thumbprint area</span>
                </label>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>Ink Contrast</span>
                  <span className="font-mono tabular-nums">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={2}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  aria-label="Ink contrast"
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>Paper Whiteness Threshold</span>
                  <span className="font-mono tabular-nums">{threshold}</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={230}
                  step={2}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  aria-label="Background threshold"
                  className="w-full accent-blue-600"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Slide right to remove grey/yellow paper tint; slide left to preserve faint fingerprint ridges.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Crop + Before / After Preview */}
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
                    <div className="h-44 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-2 overflow-hidden">
                      {originalPreviewUrl && (
                        <img
                          src={originalPreviewUrl}
                          alt="Original thumb impression"
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
                    <div className="h-44 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-2 overflow-hidden">
                      {result && (
                        <img
                          src={result.url}
                          alt="Cleaned thumb impression output"
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
                      toolName="Thumb Impression Resizer"
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
                  Thumb Impression Preview &amp; Spec Validator
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Upload a phone photo of your thumb impression to automatically crop around the ink, clean yellow/grey paper background to pure white, and verify {targetPxW}×{targetPxH} px ({minKB}–{maxKB} KB JPG).
                </p>
              </div>
            )}
          </div>
        </div>

        <AdSlot variant="result-below" />

        <ToolContentSection
          title="How to Clean & Resize Left Thumb Impression (LTI) for Online Forms"
          intro="Indian banking, medical, railway, and state recruitment portals reject thousands of applications every cycle because thumb impression scans either look too dark and muddy from indoor phone lighting or sit tiny inside an uncropped A4 sheet. When shrunken to 240 × 240 pixels, faint ink ridges vanish. KiloForm runs stamp-pad colour separation, background whitening, automatic ink-area cropping, JFIF DPI embedding, and exact KB compression completely inside your browser."
          steps={[
            {
              title: 'Choose your exam thumb preset or custom size',
              detail:
                'Select IBPS / SBI LTI (240×240 px, 20–50 KB), NTA NEET / JEE (3.5×2.5 cm, 10–200 KB), SSC / State PSC (4×3 cm, 10–50 KB), RRB (35×25 mm), or set custom pixel/cm dimensions and DPI.',
            },
            {
              title: 'Upload a well-lit phone photo on plain white paper',
              detail:
                'Press your left thumb cleanly onto plain unruled white paper using a black or blue stamp pad, snap a clear photo, and drop it into KiloForm.',
            },
            {
              title: 'Auto-crop and refine black ink with Contrast & Threshold',
              detail:
                'Keep Auto-Crop Ink Area and High-Contrast Black Ink enabled, then fine-tune the Threshold and Contrast sliders until paper is pure white and fingerprint ridges stay sharp.',
            },
            {
              title: 'Verify the green requirement badge and download JPG',
              detail:
                'Confirm that pixels, physical cm/mm dimensions, DPI metadata, and KB size all pass the green badge before downloading your portal-ready JPG file.',
            },
          ]}
          requirements={[
            {
              label: 'IBPS / SBI PO & Clerk (LTI)',
              spec: '240×240 px · 20–50 KB JPG',
              notes: 'Left thumb impression on white paper at 200 DPI (~3×3 cm).',
            },
            {
              label: 'NTA NEET / JEE / CUET',
              spec: '3.5×2.5 cm · 10–200 KB JPG',
              notes: 'Horizontal impression on clean white sheet, ridges clearly visible.',
            },
            {
              label: 'SSC / Police / State PSC',
              spec: '4.0×3.0 cm · 10–50 KB JPG',
              notes: 'Pure white unruled paper, black or dark blue ink.',
            },
            {
              label: 'Railway RRB / Defence',
              spec: '35×25 mm · 15–50 KB JPG',
              notes: 'Crisp black ink scan without smudges or heavy paper shadows.',
            },
            {
              label: 'e-KYC / Scholarship Portals',
              spec: '300×200 px · 10–40 KB JPG',
              notes: 'Compact JPEG file with embedded 200 DPI metadata.',
            },
          ]}
          rejectionReasons={[
            'Smudged over-inked thumbprint looking like a solid black blob with no visible fingerprint ridges.',
            'Wrong thumb uploaded (uploading right thumb when notification strictly asks for Left Thumb Impression).',
            'Photographing on ruled notebook lines or textured coloured paper instead of plain white paper.',
            'Leaving huge empty white margins around a tiny thumbprint instead of cropping closely to the ink area.',
            'File falling below 20 KB or exceeding 50 KB on strict IBPS/SBI recruitment upload portals.',
          ]}
          faqs={FAQS}
        />
      </ToolLayout>
    </>
  );
};
