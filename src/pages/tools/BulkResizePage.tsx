import React, { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { Archive, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { AdSlot } from '../../components/AdSlot';
import { FileDropzone } from '../../components/FileDropzone';
import { PresetSelect } from '../../components/PresetSelect';
import { SeoHead, type FaqItem } from '../../components/SeoHead';
import { ToolContentSection, ToolLayout } from '../../components/ToolContentSection';
import { useAppContext } from '../../context/AppContext';
import { getPresetById, type DimensionUnit, type ExamPreset, type ImageFormat } from '../../data/presets';
import {
  encodeCanvasToSpec,
  loadImageFile,
  nextFrame,
  renderCroppedCanvas,
  DEFAULT_CROP_STATE,
  unitToPixels,
} from '../../utils/imageEngine';

interface BatchItemResult {
  id: string;
  originalName: string;
  outputName: string;
  originalKB: number;
  finalKB: number;
  dimensions: string;
  meetsRequirement: boolean;
  blob: Blob;
  previewUrl: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'How many images can I resize at once with Bulk Resize?',
    answer:
      'You can drop 5, 10, 20, or more photos, marksheets, or certificates simultaneously. KiloForm processes them sequentially using non-blocking animation frames so your browser never freezes.',
  },
  {
    question: 'How are the resized files packaged for download?',
    answer:
      'Once all images finish processing, click Download All as ZIP to bundle every resized image cleanly into a single .zip archive generated locally via JSZip.',
  },
  {
    question: 'Can I apply an exam preset like SSC CGL or IBPS to a batch of images?',
    answer:
      'Yes. Select any preset from the Exam Preset selector or choose Custom dimensions, DPI, format, and max KB—every image in your batch receives identical output dimensions and JFIF DPI.',
  },
  {
    question: 'What if one image in my batch is an iPhone HEIC photo?',
    answer:
      'KiloForm detects HEIC/HEIF files individually inside the batch, converts them locally in the browser, and outputs clean JPG/PNG/WEBP files alongside the rest of your queue.',
  },
  {
    question: 'Can I download an individual photo from the batch without the ZIP?',
    answer:
      'Yes. Each processed row in the results list includes its own direct Download button in addition to the full ZIP bundle.',
  },
];

export const BulkResizePage: React.FC = () => {
  const { t, recordRecentFile } = useAppContext();
  const defaultPreset = useMemo(() => getPresetById('ssc-cgl')!, []);

  const [presetId, setPresetId] = useState<string>(defaultPreset.id);
  const [width, setWidth] = useState<number>(defaultPreset.photo.width);
  const [height, setHeight] = useState<number>(defaultPreset.photo.height);
  const [unit, setUnit] = useState<DimensionUnit>(defaultPreset.photo.unit);
  const [dpi, setDpi] = useState<number>(defaultPreset.photo.dpi);
  const [minKB, setMinKB] = useState<number>(defaultPreset.photo.minKB);
  const [maxKB, setMaxKB] = useState<number>(defaultPreset.photo.maxKB);
  const [format, setFormat] = useState<ImageFormat>(defaultPreset.photo.format);

  const [filesQueue, setFilesQueue] = useState<File[]>([]);
  const [results, setResults] = useState<BatchItemResult[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [running, setRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      results.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    };
  }, [results]);

  const applyPreset = (preset: ExamPreset | null) => {
    if (!preset) {
      setPresetId('custom');
      return;
    }
    setPresetId(preset.id);
    setWidth(preset.photo.width);
    setHeight(preset.photo.height);
    setUnit(preset.photo.unit);
    setDpi(preset.photo.dpi);
    setMinKB(preset.photo.minKB);
    setMaxKB(preset.photo.maxKB);
    setFormat(preset.photo.format);
  };

  const handleFilesSelected = (incoming: File[]) => {
    setError(null);
    setFilesQueue((prev) => [...prev, ...incoming]);
  };

  const runBatch = async () => {
    if (filesQueue.length === 0) return;
    setError(null);
    setRunning(true);
    results.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setResults([]);
    setProgress({ done: 0, total: filesQueue.length });

    const targetW = unitToPixels(width, unit, dpi);
    const targetH = unitToPixels(height, unit, dpi);
    const ext = format === 'jpeg' ? 'jpg' : format;
    const collected: BatchItemResult[] = [];

    try {
      for (let i = 0; i < filesQueue.length; i++) {
        await nextFrame();
        const f = filesQueue[i];
        const loaded = await loadImageFile(f);
        const fitted = renderCroppedCanvas(loaded.canvas, targetW, targetH, DEFAULT_CROP_STATE, {
          brightness: 0,
          contrast: 0,
          fitMode: 'cover',
        });
        URL.revokeObjectURL(loaded.previewUrl);

        const encoded = await encodeCanvasToSpec(fitted, {
          format,
          dpi,
          minKB,
          maxKB,
        });

        const baseName = f.name.replace(/\.[^/.]+$/, '');
        collected.push({
          id: `${i}-${f.name}`,
          originalName: f.name,
          outputName: `${baseName}-${encoded.width}x${encoded.height}.${ext}`,
          originalKB: Number((f.size / 1024).toFixed(1)),
          finalKB: encoded.sizeKB,
          dimensions: `${encoded.width}×${encoded.height} px`,
          meetsRequirement: encoded.meetsRequirement,
          blob: encoded.blob,
          previewUrl: encoded.url,
        });

        setResults([...collected]);
        setProgress({ done: i + 1, total: filesQueue.length });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch processing interrupted.');
    } finally {
      setRunning(false);
    }
  };

  const downloadZip = async () => {
    if (results.length === 0) return;
    const zip = new JSZip();
    results.forEach((item) => {
      zip.file(item.outputName, item.blob);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    const fileName = `KiloForm-bulk-${presetId}-${results.length}files.zip`;
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    recordRecentFile({
      fileName,
      toolName: 'Bulk Resize (ZIP)',
      dimensions: `${results.length} images`,
      sizeKB: Number((zipBlob.size / 1024).toFixed(1)),
      format: 'ZIP',
    });
  };

  const downloadSingle = (item: BatchItemResult) => {
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.outputName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <>
      <SeoHead
        title="Bulk Image & Document Resizer – Apply Preset & Download ZIP"
        description="Resize multiple photos, marksheets, or documents in one batch using exam presets or custom KB limits. Process locally with live progress bar and download as a ZIP archive."
        path="/bulk-resize"
        faqs={FAQS}
      />

      <ToolLayout>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Bulk Document &amp; Photo Resizer
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Drop multiple images or scanned certificates, apply one preset or KB target, and download all resized files in one ZIP archive.
          </p>
        </div>

        <FileDropzone
          onFilesSelected={handleFilesSelected}
          multiple
          enablePaste={false}
          label="Drop multiple photos or certificates here, or click to select files"
          error={error}
        />

        {/* Batch Settings */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <PresetSelect selectedId={presetId} onSelect={applyPreset} mode="photo" />

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.width}
              </label>
              <input
                type="number"
                step="0.1"
                value={width}
                onChange={(e) => {
                  setPresetId('custom');
                  setWidth(Math.max(1, Number(e.target.value) || 1));
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
                value={height}
                onChange={(e) => {
                  setPresetId('custom');
                  setHeight(Math.max(1, Number(e.target.value) || 1));
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
                onChange={(e) => setUnit(e.target.value as DimensionUnit)}
                className="w-full min-h-[40px] px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="px">px</option>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="inch">inch</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.dpi}
              </label>
              <select
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="w-full min-h-[40px] px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              >
                <option value={72}>72</option>
                <option value={96}>96</option>
                <option value={200}>200</option>
                <option value={300}>300</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.maxKB}
              </label>
              <input
                type="number"
                min={5}
                value={maxKB}
                onChange={(e) => setMaxKB(Math.max(5, Number(e.target.value) || 50))}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.format}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ImageFormat)}
                className="w-full min-h-[40px] px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm uppercase text-slate-900 dark:text-slate-100"
              >
                <option value="jpeg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
              </select>
            </div>
          </div>

          {filesQueue.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                {filesQueue.length} file{filesQueue.length === 1 ? '' : 's'} queued
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilesQueue([]);
                    setResults([]);
                    setProgress({ done: 0, total: 0 });
                  }}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Clear Queue</span>
                </button>
                <button
                  type="button"
                  onClick={() => void runBatch()}
                  disabled={running}
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-xs font-semibold text-white transition-colors"
                >
                  {running && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  <span>{running ? `Processing (${progress.done}/${progress.total})` : 'Resize All Images'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {progress.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                <span>Batch Progress</span>
                <span>
                  {progress.done} / {progress.total} ({pct}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Batch Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Processed Batch ({results.length})
              </h2>
              <button
                type="button"
                onClick={() => void downloadZip()}
                disabled={running}
                className="inline-flex items-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-sm font-semibold text-white transition-colors"
              >
                <Archive className="w-4 h-4" aria-hidden="true" />
                <span>Download All as ZIP</span>
              </button>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.previewUrl}
                      alt={item.outputName}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.outputName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {item.originalKB} KB &rarr; {item.finalKB} KB · {item.dimensions}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{item.meetsRequirement ? 'Ready' : 'Check KB'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadSingle(item)}
                      className="min-h-[38px] px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <AdSlot variant="result-below" />

        <ToolContentSection
          title="Batch Resize Multiple Certificates, Marksheets, and Photos"
          intro="When applying to university counseling, scholarship portals, or state recruitment drives, you often need to upload 10th marksheet, 12th marksheet, caste certificate, domicile certificate, and ID proof—each compressed under 100 KB or 200 KB. Resizing them one by one takes forever. KiloForm processes your entire folder locally in a smooth non-blocking queue and packages everything into a single ZIP file."
          steps={[
            {
              title: 'Select or drop multiple images at once',
              detail: 'Add as many JPG, PNG, WEBP, or HEIC images as needed into the multi-file queue.',
            },
            {
              title: 'Choose one preset or custom KB target',
              detail: 'Pick an exam preset or enter custom width, height, DPI, format, and max KB.',
            },
            {
              title: 'Run batch processing locally',
              detail: 'Click Resize All Images and watch the progress bar as each file is processed in-browser.',
            },
            {
              title: 'Download all as ZIP or individually',
              detail: 'Save the complete .zip bundle with one click or download individual files.',
            },
          ]}
          requirements={[
            { label: 'Marksheets & Certificates', spec: '1000×1400 px · 100–200 KB JPG', notes: 'Set Custom px + 200 KB cap for sharp text.' },
            { label: 'Batch Passport Photos', spec: '3.5×4.5 cm · 20–50 KB JPG', notes: 'Apply SSC or Aadhaar-style preset across files.' },
            { label: 'KYC ID Scans', spec: '800×600 px · 50–100 KB JPG', notes: 'Balanced clarity for Aadhaar/PAN front & back.' },
          ]}
          rejectionReasons={[
            'Uploading raw 5 MB phone camera scans of marksheets that fail 200 KB portal caps.',
            'Mixing HEIC and PNG files when portals only accept standard JPEG.',
            'Forgetting to verify individual document legibility after aggressive compression.',
          ]}
          faqs={FAQS}
        />
      </ToolLayout>
    </>
  );
};
