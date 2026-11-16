import React, { useEffect, useRef, useState } from 'react';
import { AdSlot } from '../../components/AdSlot';
import { DownloadButton } from '../../components/DownloadButton';
import { FileDropzone } from '../../components/FileDropzone';
import { ResultBadge } from '../../components/ResultBadge';
import { SeoHead, type FaqItem } from '../../components/SeoHead';
import { ToolContentSection, ToolLayout } from '../../components/ToolContentSection';
import { useAppContext } from '../../context/AppContext';
import type { ImageFormat } from '../../data/presets';
import {
  encodeCanvasToSpec,
  loadImageFile,
  type LoadedImage,
  type ProcessedResult,
} from '../../utils/imageEngine';

const QUICK_KB_TARGETS = [10, 20, 50, 100, 200, 500];

const FAQS: FaqItem[] = [
  {
    question: 'How does Compress Image to KB hit my exact target size?',
    answer:
      'KiloForm runs a 10-step binary search across compression quality to output the highest visual clarity that fits strictly under your chosen KB cap. If quality alone cannot reach a tiny target like 10 KB or 20 KB, it smoothly scales pixel dimensions down until the file lands under target.',
  },
  {
    question: 'Will my compressed image exceed the target KB limit?',
    answer:
      'No. The compressor searches specifically for the largest quality value whose final byte count stays strictly below your chosen target KB so government upload forms accept it immediately.',
  },
  {
    question: 'Which format compresses smaller: JPG or WEBP?',
    answer:
      'WEBP typically saves 20–30% more space than JPG at identical visual quality. However, most Indian government portals (SSC, UPSC, IBPS, NTA) require JPG, so keep JPG selected for exam forms.',
  },
  {
    question: 'Can I compress a 10 MB DSLR or smartphone photo down to 50 KB?',
    answer:
      'Yes. KiloForm safely normalizes large multi-megapixel photos inside your browser first, then reduces quality and dimensions step by step until your file drops cleanly below 50 KB.',
  },
  {
    question: 'Is there any daily limit or watermark on compressed photos?',
    answer:
      'None at all. You can compress unlimited photos, signatures, and documents completely free with zero watermarks and zero server uploads.',
  },
];

export const CompressToKbPage: React.FC = () => {
  const { t } = useAppContext();
  const [targetKB, setTargetKB] = useState<number>(50);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load image.');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!loaded) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setProcessing(true);
      try {
        const encoded = await encodeCanvasToSpec(loaded.canvas, {
          format,
          dpi: 200,
          minKB: 0,
          maxKB: Math.max(2, targetKB),
          allowDownscale: true,
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Compression failed.');
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loaded, targetKB, format]);

  const origKB = loaded ? Number((loaded.originalSizeBytes / 1024).toFixed(1)) : 0;
  const savedPct =
    loaded && result && origKB > 0
      ? Math.max(0, Math.round(((origKB - result.sizeKB) / origKB) * 100))
      : 0;
  const ext = format === 'jpeg' ? 'jpg' : format;

  return (
    <>
      <SeoHead
        title="Compress Image to Exact KB (10KB, 20KB, 50KB, 100KB, 200KB)"
        description="Reduce JPG or WEBP image size cleanly under 10KB, 20KB, 50KB, 100KB, 200KB, or 500KB inside your browser. Compare before and after size savings instantly."
        path="/compress-image-to-kb"
        faqs={FAQS}
      />

      <ToolLayout>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Compress Image to KB
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Pick a target KB cap (10, 20, 50, 100, 200, 500 KB, or custom) and export the sharpest image strictly under your limit.
          </p>
        </div>

        <FileDropzone onFilesSelected={handleFilesSelected} error={error} />

        {/* Target KB & Format Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Target Maximum Size (KB)
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_KB_TARGETS.map((kb) => (
                <button
                  key={kb}
                  type="button"
                  onClick={() => setTargetKB(kb)}
                  className={`min-h-[40px] px-4 rounded-xl border text-xs font-mono font-semibold tabular-nums transition-colors ${
                    targetKB === kb
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {kb} KB
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Custom Target KB
              </label>
              <input
                type="number"
                min={2}
                max={5000}
                value={targetKB}
                onChange={(e) => setTargetKB(Math.max(2, Number(e.target.value) || 50))}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Output Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['jpeg', 'webp'] as ImageFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`min-h-[42px] rounded-xl border text-xs font-semibold uppercase transition-colors ${
                      format === fmt
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {fmt === 'jpeg' ? 'JPG' : 'WEBP'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Before / After Preview & Savings */}
        {loaded && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{t.before}</span>
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {origKB} KB · {loaded.originalWidth}×{loaded.originalHeight} px
                  </span>
                </div>
                <div className="h-52 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-2 overflow-hidden">
                  <img
                    src={loaded.previewUrl}
                    alt="Original uncompressed image"
                    className="max-h-full max-w-full object-contain rounded"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{t.after}</span>
                  <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                    {processing
                      ? t.processing
                      : result
                      ? `${result.sizeKB} KB (${savedPct}% smaller)`
                      : ''}
                  </span>
                </div>
                <div className="h-52 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-2 overflow-hidden">
                  {result && (
                    <img
                      src={result.url}
                      alt="Compressed image preview"
                      className="max-h-full max-w-full object-contain rounded"
                    />
                  )}
                </div>
              </div>
            </div>

            {result && (
              <div className="space-y-4">
                <ResultBadge result={result} minKB={0} maxKB={targetKB} />
                <DownloadButton
                  blob={result.blob}
                  fileName={`KiloForm-compressed-${targetKB}kb.${ext}`}
                  toolName="Compress Image to KB"
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
          title="Compress Any Photo or Marksheet to Exact Kilobytes"
          intro="Most smartphone photos and document scans start at 2 MB to 8 MB, while Indian examination, scholarship, and university portals enforce strict 20 KB, 50 KB, 100 KB, or 200 KB upload limits. Guessing random quality percentages wastes time and ruins readability. KiloForm searches automatically for the highest visual quality whose output file size sits cleanly below your chosen KB cap."
          steps={[
            {
              title: 'Upload or paste your image',
              detail:
                'Drop any JPG, PNG, WEBP, or iPhone HEIC photo into the box above or press Ctrl+V to paste directly from clipboard.',
            },
            {
              title: 'Choose a preset KB limit or enter your own',
              detail:
                'Tap 10 KB, 20 KB, 50 KB, 100 KB, 200 KB, or 500 KB, or type any exact KB target required by your application form.',
            },
            {
              title: 'Compare Before and After clarity',
              detail:
                'Review the side-by-side preview along with percentage size savings and final pixel dimensions.',
            },
            {
              title: 'Download your compressed file',
              detail:
                'Confirm the green "Meets requirement" badge and save the ready-to-upload JPG or WEBP straight to your device.',
            },
          ]}
          requirements={[
            { label: 'Signature Portals', spec: '10–20 KB JPG', notes: 'SSC, IBPS, SBI signature uploads.' },
            { label: 'Passport Photo Portals', spec: '20–50 KB JPG', notes: 'Standard exam & scholarship passport photo limit.' },
            { label: 'Thumb & Declaration', spec: '50–100 KB JPG', notes: 'IBPS/SBI handwritten declaration & thumb impressions.' },
            { label: 'Marksheets & Certificates', spec: '100–200 KB JPG', notes: 'College admission, CUET, and KYC document scans.' },
            { label: 'High-Detail Scans', spec: '200–500 KB JPG', notes: 'Passport Seva and state PSC document attachments.' },
          ]}
          rejectionReasons={[
            'Forwarding photos over messaging apps that strip quality unpredictably and still exceed 50 KB.',
            'Trying to compress a 4000 px wide scan to 20 KB without proportional downscaling.',
            'Uploading PNG screenshots that stay huge even after light compression.',
            'Leaving image size 0.5 KB above the portal maximum limit.',
          ]}
          faqs={FAQS}
        />
      </ToolLayout>
    </>
  );
};
