import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, ScanFace, SlidersHorizontal, Sparkles } from 'lucide-react';
import { AdSlot } from '../../components/AdSlot';
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider';
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
  applyBackgroundReplace,
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
import {
  compositeSegmentedPerson,
  extractPersonMask,
  isSegmenterCached,
} from '../../utils/personSegmentation';
import {
  computeAutoFitCrop,
  detectPortraitFace,
  evaluateFacePosition,
  type DetectedFaceBox,
  type FaceHintStatus,
} from '../../utils/facePlacement';

const BG_OPTIONS = [
  { id: 'none', label: 'Keep Original', hex: '' },
  { id: 'white', label: 'White', hex: '#FFFFFF' },
  { id: 'sky', label: 'Light Blue', hex: '#DCEEFF' },
  { id: 'blue', label: 'Studio Blue', hex: '#2563EB' },
  { id: 'red', label: 'Red', hex: '#DC2626' },
  { id: 'custom', label: 'Custom', hex: '#E2E8F0' },
];

const FAQS: FaqItem[] = [
  {
    question: 'How does KiloForm keep hair and face crisp when replacing dark backgrounds?',
    answer:
      'KiloForm runs MediaPipe Selfie Segmentation locally inside your browser to separate the person from the backdrop using an alpha mask with adjustable edge softness (0–5 px) and halo refinement, so hair and facial features never blend into the replacement colour.',
  },
  {
    question: 'How does KiloForm reach exact KB limits without making my face blurry?',
    answer:
      'KiloForm resizes your cropped portrait to the exact pixel dimensions computed from your centimetre or pixel requirement (e.g. 3.5×4.5 cm at 300 DPI = 413×531 px) and then performs an automated binary search across JPEG quality settings.',
  },
  {
    question: 'Does the Photo Resizer embed 200 DPI or 300 DPI into the JPEG file?',
    answer:
      'Yes. KiloForm writes a valid JFIF APP0 header directly inside the exported JPEG binary with your selected 72, 96, 200, or 300 DPI value.',
  },
  {
    question: 'Should I choose JPG, PNG, or WEBP for Indian exam portals?',
    answer:
      'Always use JPG (the default for every exam preset). Most Indian portals including SSC, UPSC, IBPS, and NTA reject WEBP and PNG files unless the official notification explicitly states otherwise.',
  },
  {
    question: 'Are my photographs uploaded to a server during background segmentation?',
    answer:
      'No. After downloading the one-time segmentation model directly into your browser cache, all inference, edge feathering, cropping, and compression happen 100% locally on your device.',
  },
];

export const PhotoResizerPage: React.FC = () => {
  const { t, lastPresetId, setLastPresetId } = useAppContext();
  const [searchParams] = useSearchParams();
  const urlPresetId = searchParams.get('preset');

  const initialPreset = useMemo(
    () => getPresetById(urlPresetId) || getPresetById(lastPresetId) || getPresetById('ssc-cgl')!,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [presetId, setPresetId] = useState<string>(initialPreset.id);
  const [width, setWidth] = useState<number>(initialPreset.photo.width);
  const [height, setHeight] = useState<number>(initialPreset.photo.height);
  const [unit, setUnit] = useState<DimensionUnit>(initialPreset.photo.unit);
  const [dpi, setDpi] = useState<number>(initialPreset.photo.dpi);
  const [minKB, setMinKB] = useState<number>(initialPreset.photo.minKB);
  const [maxKB, setMaxKB] = useState<number>(initialPreset.photo.maxKB);
  const [format, setFormat] = useState<ImageFormat>('jpeg');

  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [bgReplacedCanvas, setBgReplacedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);

  const [crop, setCrop] = useState<CropState>({ ...DEFAULT_CROP_STATE });
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);

  // Background replacement controls
  const [bgColorId, setBgColorId] = useState<string>('none');
  const [customBgHex, setCustomBgHex] = useState<string>('#E2E8F0');
  const [edgeSoftness, setEdgeSoftness] = useState<number>(1.5);
  const [maskStrength, setMaskStrength] = useState<number>(50);
  const [refineEdge, setRefineEdge] = useState<boolean>(true);
  const [bgMode, setBgMode] = useState<'ai' | 'simple'>('ai');
  const [bgTolerance, setBgTolerance] = useState<number>(18);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [modelFailed, setModelFailed] = useState<boolean>(false);

  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedFace, setDetectedFace] = useState<DetectedFaceBox | null>(null);
  const [faceDetecting, setFaceDetecting] = useState<boolean>(false);

  const prevLoadedUrlRef = useRef<string | null>(null);
  const prevBgPreviewUrlRef = useRef<string | null>(null);
  const prevResultUrlRef = useRef<string | null>(null);
  const faceJobRef = useRef<number>(0);
  const detectedOrientKeyRef = useRef<string>('0|false|false');

  useEffect(() => {
    if (!urlPresetId) return;
    const found = getPresetById(urlPresetId);
    if (found) applyPreset(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPresetId]);

  useEffect(() => {
    return () => {
      if (prevLoadedUrlRef.current) URL.revokeObjectURL(prevLoadedUrlRef.current);
      if (prevBgPreviewUrlRef.current) URL.revokeObjectURL(prevBgPreviewUrlRef.current);
      if (prevResultUrlRef.current) URL.revokeObjectURL(prevResultUrlRef.current);
    };
  }, []);

  const applyPreset = (preset: ExamPreset | null) => {
    if (!preset) {
      setPresetId('custom');
      return;
    }
    setPresetId(preset.id);
    setLastPresetId(preset.id);
    setWidth(preset.photo.width);
    setHeight(preset.photo.height);
    setUnit(preset.photo.unit); // Always keep preset's native unit (e.g. cm for SSC CGL)
    setDpi(preset.photo.dpi);
    setMinKB(preset.photo.minKB);
    setMaxKB(preset.photo.maxKB);
    setFormat('jpeg'); // Default output format = JPG for every exam preset
  };

  const targetPxW = useMemo(() => unitToPixels(width, unit, dpi), [width, unit, dpi]);
  const targetPxH = useMemo(() => unitToPixels(height, unit, dpi), [height, unit, dpi]);
  const targetCmW = useMemo(() => pixelsToCm(targetPxW, dpi).toFixed(2), [targetPxW, dpi]);
  const targetCmH = useMemo(() => pixelsToCm(targetPxH, dpi).toFixed(2), [targetPxH, dpi]);

  const runAutoFitFace = async (
    sourceCanvas: HTMLCanvasElement,
    orientation: { rotation: number; flipH: boolean; flipV: boolean },
    applyPlacement = true
  ) => {
    const jobId = ++faceJobRef.current;
    const orientKey = `${orientation.rotation}|${orientation.flipH}|${orientation.flipV}`;
    detectedOrientKeyRef.current = orientKey;
    setFaceDetecting(true);
    try {
      const box = await detectPortraitFace(sourceCanvas, orientation);
      if (jobId !== faceJobRef.current) return;
      setDetectedFace(box);
      if (applyPlacement) {
        if (box) {
          setCrop(computeAutoFitCrop(box, targetPxW / targetPxH, orientation));
        } else {
          setCrop({ ...DEFAULT_CROP_STATE, ...orientation });
        }
      }
    } finally {
      if (jobId === faceJobRef.current) {
        setFaceDetecting(false);
      }
    }
  };

  useEffect(() => {
    if (!loaded) return;
    const orientKey = `${crop.rotation}|${crop.flipH}|${crop.flipV}`;
    if (orientKey === detectedOrientKeyRef.current) return;
    void runAutoFitFace(
      loaded.canvas,
      { rotation: crop.rotation, flipH: crop.flipH, flipV: crop.flipV },
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, crop.rotation, crop.flipH, crop.flipV]);

  const handleFilesSelected = async (files: File[]) => {
    setError(null);
    setProcessing(true);
    try {
      const next = await loadImageFile(files[0]);
      if (prevLoadedUrlRef.current) URL.revokeObjectURL(prevLoadedUrlRef.current);
      prevLoadedUrlRef.current = next.previewUrl;
      setLoaded(next);
      setCrop({ ...DEFAULT_CROP_STATE });
      setDetectedFace(null);
      setBrightness(0);
      setContrast(0);
      setBgColorId('none');
      void runAutoFitFace(next.canvas, { rotation: 0, flipH: false, flipV: false }, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load image.');
    } finally {
      setProcessing(false);
    }
  };

  const activeBgHex = useMemo(() => {
    if (bgColorId === 'none') return '';
    if (bgColorId === 'custom') return customBgHex;
    return BG_OPTIONS.find((b) => b.id === bgColorId)?.hex || '#FFFFFF';
  }, [bgColorId, customBgHex]);

  // Run person segmentation (MediaPipe) or fallback Simple mode when background replacement is active
  useEffect(() => {
    let cancelled = false;
    const runBg = async () => {
      if (!loaded) {
        setBgReplacedCanvas(null);
        if (prevBgPreviewUrlRef.current) {
          URL.revokeObjectURL(prevBgPreviewUrlRef.current);
          prevBgPreviewUrlRef.current = null;
        }
        setBgPreviewUrl(null);
        return;
      }

      if (!activeBgHex) {
        setBgReplacedCanvas(loaded.canvas);
        if (prevBgPreviewUrlRef.current) {
          URL.revokeObjectURL(prevBgPreviewUrlRef.current);
          prevBgPreviewUrlRef.current = null;
        }
        setBgPreviewUrl(null);
        return;
      }

      let outCanvas: HTMLCanvasElement;
      if (bgMode === 'ai' && !modelFailed) {
        const needsDownload = !isSegmenterCached();
        if (needsDownload) setModelLoading(true);
        try {
          const maskData = await extractPersonMask(loaded.canvas);
          if (cancelled) return;
          outCanvas = compositeSegmentedPerson(loaded.canvas, maskData, {
            backgroundColor: activeBgHex,
            edgeSoftness,
            refineEdge,
            maskStrength,
          });
        } catch {
          if (cancelled) return;
          setModelFailed(true);
          setBgMode('simple');
          outCanvas = await applyBackgroundReplace(loaded.canvas, activeBgHex, bgTolerance);
        } finally {
          if (!cancelled) setModelLoading(false);
        }
      } else {
        outCanvas = await applyBackgroundReplace(loaded.canvas, activeBgHex, bgTolerance);
      }

      if (cancelled) return;
      setBgReplacedCanvas(outCanvas);

      // Update before/after preview blob URL
      outCanvas.toBlob(
        (b) => {
          if (!b || cancelled) return;
          const nextUrl = URL.createObjectURL(b);
          if (prevBgPreviewUrlRef.current) URL.revokeObjectURL(prevBgPreviewUrlRef.current);
          prevBgPreviewUrlRef.current = nextUrl;
          setBgPreviewUrl(nextUrl);
        },
        'image/jpeg',
        0.9
      );
    };

    void runBg();
    return () => {
      cancelled = true;
    };
  }, [loaded, activeBgHex, bgMode, modelFailed, edgeSoftness, maskStrength, refineEdge, bgTolerance]);

  const activePreset = useMemo(() => getPresetById(presetId), [presetId]);
  const faceStatus: FaceHintStatus = useMemo(() => {
    if (faceDetecting) return 'detecting';
    return evaluateFacePosition(detectedFace, crop, targetPxW, targetPxH);
  }, [faceDetecting, detectedFace, crop, targetPxW, targetPxH]);

  useEffect(() => {
    if (!bgReplacedCanvas) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setProcessing(true);
      try {
        const cropped = renderCroppedCanvas(bgReplacedCanvas, targetPxW, targetPxH, crop, {
          brightness,
          contrast,
          fitMode: 'cover',
        });
        const encoded = await encodeCanvasToSpec(cropped, {
          format,
          dpi,
          minKB,
          maxKB,
          expectedWidth: activePreset ? targetPxW : undefined,
          expectedHeight: activePreset ? targetPxH : undefined,
          expectedFormat: activePreset ? activePreset.photo.format : undefined,
        });
        if (cancelled) {
          URL.revokeObjectURL(encoded.url);
          return;
        }
        if (prevResultUrlRef.current) URL.revokeObjectURL(prevResultUrlRef.current);
        prevResultUrlRef.current = encoded.url;
        setResult(encoded);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to process image.');
        }
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 160);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    bgReplacedCanvas,
    targetPxW,
    targetPxH,
    crop,
    brightness,
    contrast,
    format,
    dpi,
    minKB,
    maxKB,
    activePreset,
  ]);

  const ext = format === 'jpeg' ? 'jpg' : format;
  const outputFileName = `KiloForm-${presetId === 'custom' ? 'custom' : presetId}-photo-${targetPxW}x${targetPxH}.${ext}`;

  return (
    <>
      <SeoHead
        title="Exam Photo Resizer – Crop, DPI, AI Background & KB Compressor"
        description="Resize and compress photos for SSC CGL, UPSC, IBPS, SBI, NEET, JEE, and Passport forms. Person-segmented white/blue background replace, exact cm/px dimensions, 200/300 DPI, and target KB."
        path="/photo-resizer"
        faqs={FAQS}
      />

      <ToolLayout>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t.navCta}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select your exam preset or custom dimensions, crop your portrait, replace the background cleanly with person segmentation, and download an exam-ready JPG.
          </p>
        </div>

        <FileDropzone onFilesSelected={handleFilesSelected} error={error} />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Controls */}
          <div className="xl:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
            <PresetSelect selectedId={presetId} onSelect={applyPreset} mode="photo" />

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

            {/* Tone & Person Segmentation Background Replacement */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Tone &amp; Background Replace</span>
                </div>
                {bgColorId !== 'none' && (
                  <button
                    type="button"
                    onClick={() => setBgMode((m) => (m === 'ai' ? 'simple' : 'ai'))}
                    className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {bgMode === 'ai' ? 'Switch to Simple mode' : 'Try Person AI mode'}
                  </button>
                )}
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>{t.brightness}</span>
                  <span className="font-mono tabular-nums">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>{t.contrast}</span>
                  <span className="font-mono tabular-nums">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t.bgReplace}
                </label>
                <div className="flex flex-wrap gap-2">
                  {BG_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBgColorId(opt.id)}
                      className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                        bgColorId === opt.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt.id === 'custom' ? (
                        <span
                          className="w-3 h-3 rounded-sm border border-slate-300"
                          style={{ backgroundColor: customBgHex }}
                        />
                      ) : (
                        opt.hex && (
                          <span
                            className="w-3 h-3 rounded-sm border border-slate-300"
                            style={{ backgroundColor: opt.hex }}
                          />
                        )
                      )}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>

                {bgColorId === 'custom' && (
                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-xs text-slate-600 dark:text-slate-400">
                      Pick colour:
                    </label>
                    <input
                      type="color"
                      value={customBgHex}
                      onChange={(e) => setCustomBgHex(e.target.value)}
                      aria-label="Custom background colour"
                      className="w-12 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 cursor-pointer"
                    />
                    <span className="text-xs font-mono uppercase text-slate-600 dark:text-slate-400">
                      {customBgHex}
                    </span>
                  </div>
                )}

                {modelLoading && (
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-3 py-2 text-xs text-blue-800 dark:text-blue-300">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
                    <span>Loading background model (one time only)...</span>
                  </div>
                )}

                {bgColorId !== 'none' && bgMode === 'ai' && !modelFailed && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                        <span>Mask strength</span>
                        <span className="font-mono tabular-nums">{maskStrength}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={maskStrength}
                        onChange={(e) => setMaskStrength(Number(e.target.value))}
                        aria-label="Mask strength"
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                        <span>Edge softness</span>
                        <span className="font-mono tabular-nums">{edgeSoftness.toFixed(1)} px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={0.5}
                        value={edgeSoftness}
                        onChange={(e) => setEdgeSoftness(Number(e.target.value))}
                        aria-label="Edge softness in pixels"
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <label className="inline-flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={refineEdge}
                        onChange={(e) => setRefineEdge(e.target.checked)}
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                      <span>Refine edge (decontaminate &amp; remove hair halo)</span>
                    </label>
                  </div>
                )}

                {bgColorId !== 'none' && (bgMode === 'simple' || modelFailed) && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        Simple mode (colour tolerance fallback) active—quality may be lower on dark or textured backgrounds.
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                        <span>{t.tolerance}</span>
                        <span className="font-mono tabular-nums">{bgTolerance}</span>
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={45}
                        value={bgTolerance}
                        onChange={(e) => setBgTolerance(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Crop & Live Before/After Preview */}
          <div className="xl:col-span-7 space-y-6">
            {loaded && bgReplacedCanvas ? (
              <>
                <CropEditor
                  sourceCanvas={bgReplacedCanvas}
                  aspectRatio={targetPxW / targetPxH}
                  crop={crop}
                  onChange={setCrop}
                  brightness={brightness}
                  contrast={contrast}
                />

                {/* Auto-fit face action & live framing hint */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5">
                  <button
                    type="button"
                    disabled={faceDetecting}
                    onClick={() =>
                      loaded &&
                      void runAutoFitFace(
                        loaded.canvas,
                        { rotation: crop.rotation, flipH: crop.flipH, flipV: crop.flipV },
                        true
                      )
                    }
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    {faceDetecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <ScanFace className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>Auto-fit face</span>
                  </button>

                  {faceStatus === 'detecting' && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" aria-hidden="true" />
                      <span>Detecting face...</span>
                    </span>
                  )}

                  {faceStatus === 'good' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Face position looks good</span>
                    </span>
                  )}

                  {faceStatus === 'head-cut-off' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Head is cut off at the top</span>
                    </span>
                  )}

                  {faceStatus === 'too-close' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Face is too close, zoom out so the full head is visible</span>
                    </span>
                  )}

                  {faceStatus === 'too-small' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Face looks too small, use a closer photo</span>
                    </span>
                  )}

                  {faceStatus === 'not-found' && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Face not detected, adjust the crop manually</span>
                    </span>
                  )}
                </div>

                {/* Interactive Before / After Slider when background replacement is active */}
                {bgColorId !== 'none' && bgPreviewUrl && (
                  <BeforeAfterSlider
                    beforeUrl={loaded.previewUrl}
                    afterUrl={bgPreviewUrl}
                    beforeLabel="Original Background"
                    afterLabel="Replaced Background"
                  />
                )}

                {/* Final Before vs After Output Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{t.before}</span>
                      <span className="font-mono tabular-nums">
                        {loaded.originalWidth}×{loaded.originalHeight} ·{' '}
                        {(loaded.originalSizeBytes / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <div className="h-44 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden p-2">
                      <img
                        src={loaded.previewUrl}
                        alt="Original uploaded photo"
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{t.after}</span>
                      <span className="font-mono tabular-nums">
                        {processing ? t.processing : result ? `${result.sizeKB} KB` : ''}
                      </span>
                    </div>
                    <div className="h-44 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden p-2">
                      {result ? (
                        <img
                          src={result.url}
                          alt="Processed exam photo output"
                          className="max-h-full max-w-full object-contain rounded shadow-sm"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">{t.processing}</span>
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
                      toolName="Exam Photo Resizer"
                      dimensions={`${result.width}×${result.height} px`}
                      sizeKB={result.sizeKB}
                      format={result.format}
                      className="w-full sm:w-auto"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
                <div className="w-11 h-11 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Live Crop &amp; Validation Preview
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Upload a portrait above to unlock interactive drag-and-zoom cropping, person-segmented background replacement, and instant {targetPxW}×{targetPxH} px ({targetCmW}×{targetCmH} cm, {minKB}–{maxKB} KB) output.
                </p>
              </div>
            )}
          </div>
        </div>

        <AdSlot variant="result-below" />

        <ToolContentSection
          title="Prepare Examination Photographs with Exact Pixels, DPI, and KB"
          intro="Indian competitive examination portals such as SSC, UPSC, IBPS, SBI, Railway RRB, and NTA NEET/JEE apply automated validation scripts the moment you upload your photograph. Even a slight mismatch in aspect ratio, file extension, or kilobyte ceiling blocks form submission. KiloForm processes your portrait locally on your device canvas, computes exact pixels from your centimetre dimensions and DPI, segments the person cleanly from busy or dark backgrounds, and adjusts compression automatically until your photo lands cleanly inside the official size range."
          steps={[
            {
              title: 'Choose your exam preset or custom dimensions',
              detail:
                'Pick your target examination from the searchable preset dropdown (such as SSC CGL, IBPS PO, UPSC CSE, or NEET UG), or switch to Custom to specify width, height, cm/mm/inch/px units, DPI, and min–max KB.',
            },
            {
              title: 'Upload, paste, or capture your portrait',
              detail:
                'Drag a JPG, PNG, WEBP, or iPhone HEIC photo into the dropzone, paste directly with Ctrl+V, or tap Use Camera on mobile. All files remain strictly inside browser memory.',
            },
            {
              title: 'Crop and replace background with Person AI',
              detail:
                'Drag and zoom inside the locked aspect-ratio frame, select White, Blue, Red, or a custom colour, fine-tune Edge softness (0–5 px) and Refine edge, and compare with the Before/After slider.',
            },
            {
              title: 'Verify the green badge and download JPG',
              detail:
                'Confirm the green "Meets requirement" badge showing exact pixels, centimetre dimensions, DPI, and KB before downloading your ready-to-upload JPEG.',
            },
          ]}
          requirements={[
            { label: 'SSC CGL / CHSL / GD', spec: '3.5×4.5 cm · 20–50 KB JPG', notes: 'Plain light/white background; no spectacles or cap.' },
            { label: 'UPSC CSE (OTR)', spec: '350×350–1000×1000 px · 20–300 KB JPG', notes: 'White background; recent cycle may require name & date.' },
            { label: 'IBPS / SBI PO & Clerk', spec: '200×230 px · 20–50 KB JPG (200 DPI)', notes: 'Exact 200×230 pixel dimensions recommended.' },
            { label: 'Railway RRB NTPC', spec: '35×45 mm · 30–70 KB JPG', notes: '50% face coverage on plain white backdrop.' },
            { label: 'NTA NEET / JEE / CUET', spec: '3.5×4.5 cm · 10–200 KB JPG', notes: '80% face visible without mask; ears clearly visible.' },
          ]}
          rejectionReasons={[
            'Wearing eyeglasses, sunglasses, or caps that cast glare or hide facial landmarks.',
            'Dark, patterned, or outdoor backgrounds instead of plain white or off-white walls.',
            'Blurred selfies taken in dim indoor lighting or stretched aspect ratios.',
            'Uploading a WEBP or PNG screenshot instead of true JPEG (.jpg) encoding.',
            'File size falling slightly below minimum KB (e.g. under 20 KB) or exceeding 50 KB.',
            'Cropping too close to the chin or cutting off the top of the hair and ears.',
          ]}
          faqs={FAQS}
        />
      </ToolLayout>
    </>
  );
};
