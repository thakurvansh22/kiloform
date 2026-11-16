import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Trash2,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { AdSlot } from '../../components/AdSlot';
import { DownloadButton } from '../../components/DownloadButton';
import { FileDropzone } from '../../components/FileDropzone';
import { SeoHead, type FaqItem } from '../../components/SeoHead';
import { ToolContentSection, ToolLayout } from '../../components/ToolContentSection';
import { loadImageFile, nextFrame } from '../../utils/imageEngine';

type PdfPageSize = 'a4' | 'fit';

interface PdfImageItem {
  id: string;
  fileName: string;
  previewUrl: string;
  canvas: HTMLCanvasElement;
  originalWidth: number;
  originalHeight: number;
  originalSizeBytes: number;
}

interface PdfBuildResult {
  blob: Blob;
  sizeBytes: number;
  sizeKB: number;
  pageCount: number;
  qualityUsed: number;
  maxDimUsed: number;
  meetsRequirement: boolean;
  reason: string;
}

const TARGET_PRESETS = [50, 100, 200, 500];

const FAQS: FaqItem[] = [
  {
    question: 'How does KiloForm compress multiple images into a single PDF under 100 KB or 200 KB?',
    answer:
      'KiloForm renders each page onto an HTML5 Canvas, converts it to JPEG, and builds a real multi-page PDF locally using pdf-lib. It then runs an adaptive search over image quality (down to readable JPEG bounds) and resolution scale step-by-step until the combined PDF file size fits strictly below your target KB limit.',
  },
  {
    question: 'Should I pick A4 or Fit Image for government form PDF uploads?',
    answer:
      'Choose A4 when uploading marksheets, caste/EWS/income certificates, or admit verification forms that are printed on standard paper and reviewed by officers. Choose Fit Image when scanning ID cards, receipts, or mixed aspect-ratio images where you do not want white letterbox borders added.',
  },
  {
    question: 'What happens if I merge 10 high-resolution scans and set a tiny 50 KB target?',
    answer:
      'Every PDF page consumes header overhead plus compressed image bytes. If too many pages are packed into a 50 KB target, KiloForm compresses as hard as possible while alerting you with a red status badge if the final PDF still exceeds your chosen KB cap—so you can raise the limit to 100–200 KB or split documents.',
  },
  {
    question: 'Can I upload PNG screenshots or iPhone HEIC photos and reorder pages before exporting?',
    answer:
      'Yes. Upload any mix of JPG, PNG, WEBP, or iPhone HEIC files, drag or click the Up/Down arrow buttons to arrange page 1, page 2, and so on, remove unwanted pages, and download a unified clean white-backed PDF.',
  },
  {
    question: 'Are my marksheets, PAN, Aadhaar, or category certificates uploaded anywhere?',
    answer:
      'Never. Image decoding, canvas downscaling, JPEG encoding, and pdf-lib assembly execute 100% client-side inside your device memory. Your sensitive identity documents never leave your browser.',
  },
];

async function renderPageJpegBytes(
  source: HTMLCanvasElement,
  maxDim: number,
  quality: number
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const longest = Math.max(source.width, source.height);
  const scale = longest > maxDim ? maxDim / longest : 1;
  const w = Math.max(60, Math.round(source.width * scale));
  const h = Math.max(60, Math.round(source.height * scale));

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const ctx = work.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Solid white fill ensures PNG transparency never turns black inside JPEG
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve, reject) => {
    work.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode PDF page JPEG'))),
      'image/jpeg',
      quality
    );
  });

  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: w, height: h };
}

async function assemblePdf(
  items: PdfImageItem[],
  pageSize: PdfPageSize,
  maxDim: number,
  quality: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const item of items) {
    const rendered = await renderPageJpegBytes(item.canvas, maxDim, quality);
    const embedded = await pdfDoc.embedJpg(rendered.bytes);

    if (pageSize === 'a4') {
      const isLandscape = rendered.width > rendered.height;
      const pageW = isLandscape ? 841.89 : 595.28;
      const pageH = isLandscape ? 595.28 : 841.89;
      const margin = 16;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;
      const fitScale = Math.min(availW / rendered.width, availH / rendered.height);
      const drawW = rendered.width * fitScale;
      const drawH = rendered.height * fitScale;

      const page = pdfDoc.addPage([pageW, pageH]);
      page.drawImage(embedded, {
        x: (pageW - drawW) / 2,
        y: (pageH - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    } else {
      // Exact aspect fit in PDF points (72 pt/in vs 96 px/in)
      const ptW = Math.max(72, Number((rendered.width * 0.75).toFixed(2)));
      const ptH = Math.max(72, Number((rendered.height * 0.75).toFixed(2)));
      const page = pdfDoc.addPage([ptW, ptH]);
      page.drawImage(embedded, { x: 0, y: 0, width: ptW, height: ptH });
    }
  }

  return pdfDoc.save();
}

export const ImageToPdfPage: React.FC = () => {
  const [items, setItems] = useState<PdfImageItem[]>([]);
  const [pageSize, setPageSize] = useState<PdfPageSize>('a4');
  const [targetKB, setTargetKB] = useState<number>(200);
  const [pdfResult, setPdfResult] = useState<PdfBuildResult | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const itemsRef = useRef<PdfImageItem[]>([]);
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const handleFilesSelected = async (files: File[]) => {
    setError(null);
    setProcessing(true);
    try {
      const added: PdfImageItem[] = [];
      for (const file of files) {
        const loaded = await loadImageFile(file);
        added.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: file.name,
          previewUrl: loaded.previewUrl,
          canvas: loaded.canvas,
          originalWidth: loaded.originalWidth,
          originalHeight: loaded.originalHeight,
          originalSizeBytes: loaded.originalSizeBytes,
        });
      }
      setItems((prev) => [...prev, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load one or more image files.');
    } finally {
      setProcessing(false);
    }
  };

  const moveItem = (index: number, delta: -1 | 1) => {
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= items.length) return;
    setItems((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIdx, 0, moved);
      return copy;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
    setPdfResult(null);
  };

  // Build & iteratively compress PDF under targetKB whenever pages, pageSize, or targetKB change
  useEffect(() => {
    if (items.length === 0) {
      setPdfResult(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setProcessing(true);
      setError(null);
      try {
        const safeTargetKB = Math.max(10, targetKB || 100);
        const targetBytes = safeTargetKB * 1024;
        const dimSteps = [1800, 1400, 1100, 860, 680, 540, 420, 320, 240];

        let chosenBytes: Uint8Array | null = null;
        let chosenQuality = 0.85;
        let chosenDim = dimSteps[0];

        for (const maxDim of dimSteps) {
          if (cancelled) return;
          await nextFrame();

          // Quick check at high readable quality (0.86)
          const hiBytes = await assemblePdf(items, pageSize, maxDim, 0.86);
          if (hiBytes.byteLength <= targetBytes) {
            chosenBytes = hiBytes;
            chosenQuality = 0.86;
            chosenDim = maxDim;
            break;
          }

          // Quick check at floor readable quality (0.16)
          const loBytes = await assemblePdf(items, pageSize, maxDim, 0.16);
          if (loBytes.byteLength > targetBytes) {
            // Even lowest quality at this resolution exceeds limit — downscale further
            chosenBytes = loBytes;
            chosenQuality = 0.16;
            chosenDim = maxDim;
            continue;
          }

          // Binary search quality between 0.16 and 0.86 at this resolution
          let low = 0.16;
          let high = 0.86;
          let bestUnder: Uint8Array = loBytes;
          let bestQ = 0.16;

          for (let step = 0; step < 5; step++) {
            if (cancelled) return;
            await nextFrame();
            const mid = Number(((low + high) / 2).toFixed(2));
            const testBytes = await assemblePdf(items, pageSize, maxDim, mid);
            if (testBytes.byteLength <= targetBytes) {
              bestUnder = testBytes;
              bestQ = mid;
              low = mid;
            } else {
              high = mid;
            }
          }

          chosenBytes = bestUnder;
          chosenQuality = bestQ;
          chosenDim = maxDim;
          break;
        }

        // Last-resort emergency pass if many pages were squeezed into tiny targetKB
        if (chosenBytes && chosenBytes.byteLength > targetBytes && !cancelled) {
          const fallbackBytes = await assemblePdf(items, pageSize, 180, 0.1);
          if (fallbackBytes.byteLength < chosenBytes.byteLength) {
            chosenBytes = fallbackBytes;
            chosenQuality = 0.1;
            chosenDim = 180;
          }
        }

        if (cancelled || !chosenBytes) return;

        const blob = new Blob([new Uint8Array(chosenBytes)], { type: 'application/pdf' });
        const sizeBytes = blob.size;
        const sizeKB = Number((sizeBytes / 1024).toFixed(1));
        const meetsRequirement = sizeBytes <= targetBytes;
        const reason = meetsRequirement
          ? `PDF size (${sizeKB} KB) is strictly under the ${safeTargetKB} KB target limit.`
          : `PDF size (${sizeKB} KB) exceeds ${safeTargetKB} KB even after minimum scale. Try fewer pages or a higher KB target.`;

        setPdfResult({
          blob,
          sizeBytes,
          sizeKB,
          pageCount: items.length,
          qualityUsed: Math.round(chosenQuality * 100),
          maxDimUsed: chosenDim,
          meetsRequirement,
          reason,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'PDF generation failed.');
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [items, pageSize, targetKB]);

  return (
    <>
      <SeoHead
        title="Image to PDF Under KB (50 KB, 100 KB, 200 KB, 500 KB) – Client-Side"
        description="Combine JPG, PNG, WEBP, or HEIC document scans into one A4 or Fit-Image PDF strictly under 50 KB, 100 KB, 200 KB, or 500 KB. Reorder pages and download locally."
        path="/image-to-pdf-under-kb"
        faqs={FAQS}
      />

      <ToolLayout>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <FileText className="w-4 h-4" aria-hidden="true" />
            <span>Multi-Page PDF Compressor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Image to PDF Under Target KB
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Merge one or more marksheet, certificate, or ID images into a single PDF under 50 KB, 100 KB, 200 KB, or 500 KB. Reorder pages and compress locally—zero server uploads.
          </p>
        </div>

        <FileDropzone
          onFilesSelected={handleFilesSelected}
          multiple={true}
          enablePaste={false}
          label="Upload one or more document images (JPG, PNG, WEBP, HEIC)"
          error={error}
        />

        {/* Settings Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Page Size */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                PDF Page Size
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPageSize('a4')}
                  className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold transition-colors ${
                    pageSize === 'a4'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  A4 Standard Page
                </button>
                <button
                  type="button"
                  onClick={() => setPageSize('fit')}
                  className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold transition-colors ${
                    pageSize === 'fit'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  Fit Image Aspect
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                A4 auto-rotates landscape scans cleanly with neat white margins; Fit Image matches each photo&apos;s exact proportions.
              </p>
            </div>

            {/* Target PDF KB */}
            <div className="space-y-2">
              <label
                htmlFor="pdf-target-kb"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Target Maximum Size (KB)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {TARGET_PRESETS.map((kb) => (
                  <button
                    key={kb}
                    type="button"
                    onClick={() => setTargetKB(kb)}
                    className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-mono font-semibold tabular-nums transition-colors ${
                      targetKB === kb
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {kb} KB
                  </button>
                ))}
                <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                  <input
                    id="pdf-target-kb"
                    type="number"
                    min={10}
                    max={5000}
                    value={targetKB}
                    onChange={(e) => setTargetKB(Math.max(10, Math.min(5000, Number(e.target.value) || 50)))}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">KB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Uploaded Pages Reorder Queue */}
        {items.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                PDF Pages Order ({items.length} {items.length === 1 ? 'page' : 'pages'})
              </h2>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <img
                      src={item.previewUrl}
                      alt={`Page ${idx + 1}: ${item.fileName}`}
                      className="w-12 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.fileName}
                      </p>
                      <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {item.originalWidth}×{item.originalHeight} px ·{' '}
                        {(item.originalSizeBytes / 1024).toFixed(0)} KB source
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move page ${idx + 1} up`}
                      className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === items.length - 1}
                      aria-label={`Move page ${idx + 1} down`}
                      className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove page ${idx + 1}`}
                      className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result Badge & Download */}
        {processing && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-sm font-medium text-slate-600 dark:text-slate-300">
            Building &amp; compressing PDF under {targetKB} KB locally...
          </div>
        )}

        {pdfResult && !processing && (
          <div className="space-y-4">
            <div
              className={`rounded-2xl border p-4 space-y-3 ${
                pdfResult.meetsRequirement
                  ? 'border-emerald-200 dark:border-emerald-900/80 bg-emerald-50/70 dark:bg-emerald-950/30'
                  : 'border-red-200 dark:border-red-900/80 bg-red-50/70 dark:bg-red-950/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {pdfResult.meetsRequirement ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
                  )}
                  <div>
                    <p
                      className={`text-sm font-bold ${
                        pdfResult.meetsRequirement
                          ? 'text-emerald-900 dark:text-emerald-200'
                          : 'text-red-900 dark:text-red-200'
                      }`}
                    >
                      {pdfResult.meetsRequirement ? 'Meets requirement' : 'Not meeting requirement'}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {pdfResult.reason}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Final PDF Size</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {pdfResult.sizeKB} KB / {targetKB} KB
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Pages</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {pdfResult.pageCount} ({pageSize === 'a4' ? 'A4' : 'Fit Image'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Scaled Long Edge</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    ≤ {pdfResult.maxDimUsed} px
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Format / Quality</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    PDF ({pdfResult.qualityUsed}% JPEG)
                  </span>
                </div>
              </div>
            </div>

            <DownloadButton
              blob={pdfResult.blob}
              fileName={`KiloForm-document-under-${targetKB}kb.pdf`}
              toolName="Image to PDF Under KB"
              dimensions={`${pdfResult.pageCount} page(s) · ${pageSize === 'a4' ? 'A4' : 'Fit'}`}
              sizeKB={pdfResult.sizeKB}
              format="pdf"
              label={`Download PDF (${pdfResult.sizeKB} KB)`}
              className="w-full sm:w-auto"
            />
          </div>
        )}

        <AdSlot variant="result-below" />

        <ToolContentSection
          title="Convert & Compress Document Images to PDF Under Target KB"
          intro="Indian scholarship, university admission, UPSC DAF, and government job portals strictly cap uploaded certificates and marksheets to 50 KB, 100 KB, 200 KB, or 500 KB PDF files. Saving photos directly from a smartphone camera produces huge 5–12 MB PDFs that fail every upload validator. KiloForm lets you combine multiple JPG, PNG, WEBP, or HEIC pages locally using pdf-lib, reorder pages cleanly, choose A4 or Fit Image framing, and automatically tune JPEG quality and page scale until the finished PDF fits below your KB target."
          steps={[
            {
              title: 'Upload one or multiple certificate photos',
              detail:
                'Drop your 10th/12th marksheet, category/EWS certificate, Aadhaar, or degree pages (JPG, PNG, WEBP, or iPhone HEIC) into the upload area.',
            },
            {
              title: 'Reorder or remove pages in the queue',
              detail:
                'Use the Up and Down buttons beside any page thumbnail to place front and back sides in the exact order required by your portal.',
            },
            {
              title: 'Select A4 or Fit Image and pick your target KB',
              detail:
                'Pick A4 for standard printable document pages or Fit Image for edge-to-edge scans, then click 50, 100, 200, or 500 KB—or enter any custom KB cap.',
            },
            {
              title: 'Verify the green requirement badge and download PDF',
              detail:
                'Check that Final PDF Size stays strictly below your chosen target KB in the green badge, then click Download PDF.',
            },
          ]}
          requirements={[
            {
              label: 'NTA CUET / NEET Certificates',
              spec: '50–300 KB PDF',
              notes: 'Category, PwBD, and EWS certificates formatted cleanly on A4.',
            },
            {
              label: 'UPSC DAF / OTR Documents',
              spec: '20–300 KB PDF',
              notes: 'Class 10 certificate, graduation degree, and ID proof scans.',
            },
            {
              label: 'State Scholarship / e-District',
              spec: 'Under 100 KB or 200 KB PDF',
              notes: 'Income, domicile, and bank passbook scans merged in sequence.',
            },
            {
              label: 'College / University Admissions',
              spec: 'Under 200 KB or 500 KB PDF',
              notes: 'Multi-page marksheet + migration certificate PDF.',
            },
            {
              label: 'Compact Portal Proof Upload',
              spec: 'Under 50 KB PDF',
              notes: 'Single-page ID card or fee receipt compressed for tight portals.',
            },
          ]}
          rejectionReasons={[
            'Merging multi-megabyte smartphone photos without compressing image resolution first, creating a 6 MB PDF.',
            'Uploading two-sided certificates (front + back) as separate uploads instead of a single 2-page PDF.',
            'Dark, skewed, or blurry text after over-compressing 8+ heavy pages into a 50 KB budget.',
            'Transparent PNG screenshots rendering with black backgrounds inside poorly encoded PDFs.',
          ]}
          faqs={FAQS}
        />
      </ToolLayout>
    </>
  );
};
