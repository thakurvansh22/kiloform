import React, { useEffect, useRef, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { AdSlot } from '../../components/AdSlot';
import { DownloadButton } from '../../components/DownloadButton';
import { FileDropzone } from '../../components/FileDropzone';
import { ResultBadge } from '../../components/ResultBadge';
import { SeoHead, type FaqItem } from '../../components/SeoHead';
import { ToolContentSection, ToolLayout } from '../../components/ToolContentSection';
import {
  encodeCanvasToSpec,
  loadImageFile,
  type LoadedImage,
  type ProcessedResult,
} from '../../utils/imageEngine';

type SheetSize = '4x6' | 'a4';
type PhotoTileSize = '35x45' | '2x2';

const FAQS: FaqItem[] = [
  {
    question: 'Which paper size should I choose for cheap photo lab printing?',
    answer:
      'Choose 4×6 inch (1200×1800 px at 300 DPI). Nearly every photo studio and stationery print shop in India prints a standard 4×6 postcard sheet for a fraction of individual studio passport prices.',
  },
  {
    question: 'Should I download the JPG or the PDF for printing?',
    answer:
      'Download the JPG if you are sending the sheet to a photo lab or printing on photo paper at a cyber café. Download the PDF if you are printing directly on an A4 inkjet/laser printer at home—set printer scale to 100% (Actual Size).',
  },
  {
    question: 'What do the Cut Guides do?',
    answer:
      'Cut Guides draw fine grey corner crop lines and subtle dashed borders around every passport photo tile so you can cut each copy straight and evenly with scissors or a paper cutter.',
  },
  {
    question: 'Are the physical sizes (3.5×4.5 cm and 2×2 inch) accurate in the PDF?',
    answer:
      'Yes. Our PDF generator uses pdf-lib to set exact PDF point dimensions (72 points per inch—288×432 pt for 4×6 inch and 595.28×841.89 pt for A4) so every copy prints at true-to-life scale.',
  },
  {
    question: 'Can I arrange 12 copies on a single 4×6 sheet?',
    answer:
      'On 4×6 inch paper, up to 8 copies of 3.5×4.5 cm fit comfortably with cutting margins; for 12 copies at full 3.5×4.5 cm size, A4 paper gives generous spacing, or KiloForm auto-scales cleanly on 4×6.',
  },
];

export const PassportPhotoSheetPage: React.FC = () => {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [copies, setCopies] = useState<4 | 6 | 8 | 12>(8);
  const [sheetSize, setSheetSize] = useState<SheetSize>('4x6');
  const [tileSize, setTileSize] = useState<PhotoTileSize>('35x45');
  const [spacingMm, setSpacingMm] = useState<number>(3);
  const [cutGuides, setCutGuides] = useState<boolean>(true);

  const [jpgResult, setJpgResult] = useState<ProcessedResult | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
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
    try {
      const next = await loadImageFile(files[0]);
      if (prevLoadedUrlRef.current) URL.revokeObjectURL(prevLoadedUrlRef.current);
      prevLoadedUrlRef.current = next.previewUrl;
      setLoaded(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load photo.');
    }
  };

  useEffect(() => {
    if (!loaded) {
      setJpgResult(null);
      setPdfBlob(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setProcessing(true);
      try {
        const DPI = 300;
        const sheetW = sheetSize === '4x6' ? Math.round(6 * DPI) : Math.round((210 / 25.4) * DPI); // landscape 6x4 or A4 portrait
        const sheetH = sheetSize === '4x6' ? Math.round(4 * DPI) : Math.round((297 / 25.4) * DPI);

        const rawTileW =
          tileSize === '2x2' ? Math.round(2 * DPI) : Math.round((35 / 25.4) * DPI); // 600 or 413 px
        const rawTileH =
          tileSize === '2x2' ? Math.round(2 * DPI) : Math.round((45 / 25.4) * DPI); // 600 or 531 px
        const gap = Math.round((spacingMm / 25.4) * DPI);

        // Determine grid cols x rows
        let cols = 4;
        let rows = 2;
        if (sheetSize === '4x6') {
          if (copies === 4) {
            cols = 2;
            rows = 2;
          } else if (copies === 6) {
            cols = 3;
            rows = 2;
          } else if (copies === 8) {
            cols = 4;
            rows = 2;
          } else {
            cols = 4;
            rows = 3;
          }
        } else {
          // A4
          if (copies === 4) {
            cols = 2;
            rows = 2;
          } else if (copies === 6) {
            cols = 3;
            rows = 2;
          } else if (copies === 8) {
            cols = 4;
            rows = 2;
          } else {
            cols = 4;
            rows = 3;
          }
        }

        // Fit tile size safely inside sheet bounds if 12 copies on 4x6
        const margin = Math.round(0.25 * DPI);
        const availW = sheetW - margin * 2 - gap * (cols - 1);
        const availH = sheetH - margin * 2 - gap * (rows - 1);
        const fitFactor = Math.min(1, availW / (cols * rawTileW), availH / (rows * rawTileH));
        const tileW = Math.round(rawTileW * fitFactor);
        const tileH = Math.round(rawTileH * fitFactor);

        const totalGridW = cols * tileW + (cols - 1) * gap;
        const totalGridH = rows * tileH + (rows - 1) * gap;
        const startX = Math.round((sheetW - totalGridW) / 2);
        const startY = Math.round((sheetH - totalGridH) / 2);

        const canvas = document.createElement('canvas');
        canvas.width = sheetW;
        canvas.height = sheetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sheetW, sheetH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Cover-crop source photo to tile aspect ratio once
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = tileW;
        tileCanvas.height = tileH;
        const tCtx = tileCanvas.getContext('2d');
        if (tCtx) {
          const sScale = Math.max(tileW / loaded.canvas.width, tileH / loaded.canvas.height);
          const sw = loaded.canvas.width * sScale;
          const sh = loaded.canvas.height * sScale;
          tCtx.imageSmoothingEnabled = true;
          tCtx.imageSmoothingQuality = 'high';
          tCtx.drawImage(loaded.canvas, (tileW - sw) / 2, (tileH - sh) / 2, sw, sh);
        }

        let drawn = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (drawn >= copies) break;
            const x = startX + c * (tileW + gap);
            const y = startY + r * (tileH + gap);
            ctx.drawImage(tileCanvas, x, y);

            if (cutGuides) {
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, tileW, tileH);

              // Corner tick marks outside tile
              const tick = 16;
              ctx.strokeStyle = '#475569';
              ctx.lineWidth = 2;
              ctx.beginPath();
              // top-left
              ctx.moveTo(x - tick, y);
              ctx.lineTo(x - 4, y);
              ctx.moveTo(x, y - tick);
              ctx.lineTo(x, y - 4);
              // top-right
              ctx.moveTo(x + tileW + 4, y);
              ctx.lineTo(x + tileW + tick, y);
              ctx.moveTo(x + tileW, y - tick);
              ctx.lineTo(x + tileW, y - 4);
              // bottom-left
              ctx.moveTo(x - tick, y + tileH);
              ctx.lineTo(x - 4, y + tileH);
              ctx.moveTo(x, y + tileH + 4);
              ctx.lineTo(x, y + tileH + tick);
              // bottom-right
              ctx.moveTo(x + tileW + 4, y + tileH);
              ctx.lineTo(x + tileW + tick, y + tileH);
              ctx.moveTo(x + tileW, y + tileH + 4);
              ctx.lineTo(x + tileW, y + tileH + tick);
              ctx.stroke();
            }
            drawn++;
          }
        }

        const encoded = await encodeCanvasToSpec(canvas, {
          format: 'jpeg',
          dpi: 300,
          minKB: 0,
          maxKB: 0,
          allowDownscale: false,
          padMinKB: false,
        });

        // Build matching exact-scale PDF via pdf-lib
        const pdfDoc = await PDFDocument.create();
        const ptW = sheetSize === '4x6' ? 6 * 72 : 595.28;
        const ptH = sheetSize === '4x6' ? 4 * 72 : 841.89;
        const page = pdfDoc.addPage([ptW, ptH]);
        const jpgBytes = await encoded.blob.arrayBuffer();
        const embedded = await pdfDoc.embedJpg(jpgBytes);
        page.drawImage(embedded, { x: 0, y: 0, width: ptW, height: ptH });
        const pdfBytes = await pdfDoc.save();
        const nextPdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

        if (cancelled) {
          URL.revokeObjectURL(encoded.url);
          return;
        }
        if (prevResultUrlRef.current) URL.revokeObjectURL(prevResultUrlRef.current);
        prevResultUrlRef.current = encoded.url;
        setJpgResult(encoded);
        setPdfBlob(nextPdfBlob);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to build print sheet.');
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loaded, copies, sheetSize, tileSize, spacingMm, cutGuides]);

  const downloadPdf = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KiloForm-sheet-${sheetSize}-${copies}copies.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <>
      <SeoHead
        title="Passport Photo Sheet Maker (4x6 & A4) – Download JPG & PDF"
        description="Arrange 4, 6, 8, or 12 passport size photo copies on a 4x6 inch or A4 printable sheet with cut guides. Export 300 DPI JPG and exact-scale PDF locally."
        path="/passport-photo-sheet"
        faqs={FAQS}
      />

      <ToolLayout>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Passport Photo Print Sheet
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tile 4, 6, 8, or 12 copies of your passport portrait onto a 4×6 inch or A4 sheet with cut guides and export both JPG and PDF.
          </p>
        </div>

        <FileDropzone onFilesSelected={handleFilesSelected} error={error} />

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Number of Copies
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([4, 6, 8, 12] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setCopies(count)}
                    className={`min-h-[42px] rounded-xl border text-xs font-mono font-semibold tabular-nums transition-colors ${
                      copies === count
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Paper Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSheetSize('4x6')}
                  className={`min-h-[42px] rounded-xl border text-xs font-semibold transition-colors ${
                    sheetSize === '4x6'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  4 × 6 inch
                </button>
                <button
                  type="button"
                  onClick={() => setSheetSize('a4')}
                  className={`min-h-[42px] rounded-xl border text-xs font-semibold transition-colors ${
                    sheetSize === 'a4'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  A4 Paper
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Single Photo Size
              </label>
              <select
                value={tileSize}
                onChange={(e) => setTileSize(e.target.value as PhotoTileSize)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="35x45">3.5 × 4.5 cm (India Standard)</option>
                <option value="2x2">2 × 2 inch (Passport / Visa)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <label className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span>Gap between photos: {spacingMm} mm</span>
              <input
                type="range"
                min={1}
                max={8}
                value={spacingMm}
                onChange={(e) => setSpacingMm(Number(e.target.value))}
                className="w-28 accent-blue-600"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={cutGuides}
                onChange={(e) => setCutGuides(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <span>Show scissor cut guides &amp; corner marks</span>
            </label>
          </div>
        </div>

        {loaded && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Printable Sheet Preview ({sheetSize.toUpperCase()} · {copies} Copies)
                </span>
                <span className="font-mono tabular-nums">
                  {processing ? 'Rendering 300 DPI sheet...' : jpgResult ? `${jpgResult.width}×${jpgResult.height} px` : ''}
                </span>
              </div>
              <div className="flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-4 overflow-hidden">
                {jpgResult && (
                  <img
                    src={jpgResult.url}
                    alt="Printable passport photo sheet"
                    className="max-h-96 max-w-full object-contain border border-slate-300 shadow-sm"
                  />
                )}
              </div>
            </div>

            {jpgResult && (
              <div className="space-y-4">
                <ResultBadge result={jpgResult} />
                <div className="flex flex-wrap gap-3">
                  <DownloadButton
                    blob={jpgResult.blob}
                    fileName={`KiloForm-sheet-${sheetSize}-${copies}copies-300dpi.jpg`}
                    toolName="Passport Photo Sheet"
                    dimensions={`${jpgResult.width}×${jpgResult.height} px`}
                    sizeKB={jpgResult.sizeKB}
                    format="jpeg"
                    label="Download JPG (300 DPI)"
                  />
                  <button
                    type="button"
                    onClick={downloadPdf}
                    disabled={!pdfBlob}
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-slate-100 transition-colors whitespace-nowrap"
                  >
                    <FileText className="w-4 h-4 text-blue-600" aria-hidden="true" />
                    <Download className="w-4 h-4" aria-hidden="true" />
                    <span>Download Print PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <AdSlot variant="result-below" />

        <ToolContentSection
          title="Print Passport Size Photo Sheets at Home or Photo Studios"
          intro="Getting physical passport prints for college admissions, bank document verification, PAN applications, or admit cards costs far less when you take a single 4×6 or A4 sheet to a local printer. KiloForm arranges 4, 6, 8, or 12 crisp 300 DPI copies automatically, adds corner scissor guides, and builds both a 300 DPI JPEG and an exact physical-dimension PDF using pdf-lib."
          steps={[
            {
              title: 'Upload your prepared portrait photo',
              detail: 'Drop your cropped white-background passport portrait into the box above.',
            },
            {
              title: 'Select copy count and paper size',
              detail: 'Choose 4, 6, 8, or 12 copies on either 4×6 inch photo paper or standard A4 sheet.',
            },
            {
              title: 'Toggle spacing and cut guides',
              detail: 'Keep cut guides enabled for clean scissor edges and adjust spacing between photos.',
            },
            {
              title: 'Download JPG or Print-Ready PDF',
              detail: 'Save the 300 DPI JPEG for photo labs or print the PDF at 100% Actual Size on your home printer.',
            },
          ]}
          requirements={[
            { label: '4×6 Inch Sheet', spec: '1800×1200 px · 300 DPI', notes: 'Fits up to 8 copies of 3.5×4.5 cm cleanly.' },
            { label: 'A4 Printable Sheet', spec: '2480×3508 px · 300 DPI', notes: 'Fits 4, 6, 8, or 12 copies at full physical size.' },
            { label: 'India Passport Tile', spec: '3.5×4.5 cm (413×531 px)', notes: 'Standard size for SSC, colleges, and offline forms.' },
            { label: '2×2 Inch Tile', spec: '51×51 mm (600×600 px)', notes: 'US/OCI/Indian Visa square passport tile.' },
          ]}
          rejectionReasons={[
            'Printing PDFs with "Fit to Page" enabled instead of "100% / Actual Size", shrinking photo height.',
            'Printing low-resolution 72 DPI screenshots on glossy paper resulting in pixelated faces.',
            'Omitting white spacing between tiles, making clean cutting difficult.',
          ]}
          faqs={FAQS}
        />
      </ToolLayout>
    </>
  );
};
