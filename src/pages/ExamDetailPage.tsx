import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ExternalLink, Info } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import { getPresetById, VERIFICATION_DISCLAIMER } from '../data/presets';
import { unitToPixels } from '../utils/imageEngine';

export const ExamDetailPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const preset = getPresetById(examId);

  if (!preset) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Exam preset not found</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Browse all supported Indian exam photo and signature presets or use custom sizing.
        </p>
        <Link
          to="/presets"
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-blue-600 text-sm font-semibold text-white"
        >
          View All Presets
        </Link>
      </main>
    );
  }

  const photoPxW = unitToPixels(preset.photo.width, preset.photo.unit, preset.photo.dpi);
  const photoPxH = unitToPixels(preset.photo.height, preset.photo.unit, preset.photo.dpi);
  const sigPxW = unitToPixels(preset.signature.width, preset.signature.unit, preset.signature.dpi);
  const sigPxH = unitToPixels(preset.signature.height, preset.signature.unit, preset.signature.dpi);

  return (
    <>
      <SeoHead
        title={`${preset.shortName} Photo and Signature Size (Dimensions, DPI & KB)`}
        description={`Official ${preset.examName} photo size (${preset.photo.width}×${preset.photo.height} ${preset.photo.unit}, ${preset.photo.minKB}–${preset.photo.maxKB} KB) and signature guidelines. Resize instantly online for free.`}
        path={`/exam/${preset.id}`}
        faqs={preset.faqs}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Header & Primary Action Buttons */}
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <Link to="/presets" className="hover:underline">
              Exam Presets
            </Link>
            <span aria-hidden="true"> / </span>
            <span>{preset.category}</span>
            <span aria-hidden="true"> · </span>
            <span>Updated {preset.lastUpdated}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {preset.shortName} Photo and Signature Size
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            {preset.notes}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to={`/photo-resizer?preset=${preset.id}`}
              className="inline-flex items-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition-colors"
            >
              <span>Open Photo Resizer ({preset.shortName})</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              to={`/signature-resizer?preset=${preset.id}`}
              className="inline-flex items-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white transition-colors"
            >
              <span>Open Signature Resizer</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Info className="w-4 h-4 text-blue-500 shrink-0" aria-hidden="true" />
              <span>{VERIFICATION_DISCLAIMER}</span>
            </span>
            <a
              href={preset.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>Official Portal Reference</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Requirement Table */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {preset.shortName} Upload Requirements Table
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">Document Type</th>
                  <th className="px-4 py-3">Physical / Pixel Size</th>
                  <th className="px-4 py-3">File Size (KB)</th>
                  <th className="px-4 py-3">DPI &amp; Format</th>
                  <th className="px-4 py-3">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                    Photograph
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                    {preset.photo.width}×{preset.photo.height} {preset.photo.unit} ({photoPxW}×{photoPxH} px)
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                    {preset.photo.minKB} – {preset.photo.maxKB} KB
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs tabular-nums uppercase text-slate-700 dark:text-slate-300">
                    {preset.photo.dpi} DPI · {preset.photo.format === 'jpeg' ? 'JPG' : preset.photo.format}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                    {preset.photo.backgroundNote}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                    Signature
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                    {preset.signature.width}×{preset.signature.height} {preset.signature.unit} ({sigPxW}×{sigPxH} px)
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                    {preset.signature.minKB} – {preset.signature.maxKB} KB
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs tabular-nums uppercase text-slate-700 dark:text-slate-300">
                    {preset.signature.dpi} DPI · {preset.signature.format === 'jpeg' ? 'JPG' : preset.signature.format}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                    {preset.signature.backgroundNote}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Steps */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            How to prepare your {preset.shortName} photo and signature
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <li className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <span className="text-xs font-mono font-semibold text-blue-600">01.</span>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">Launch with {preset.shortName} preloaded</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Tap Open Photo Resizer above so exact {preset.photo.width}×{preset.photo.height} {preset.photo.unit} dimensions and {preset.photo.minKB}–{preset.photo.maxKB} KB bounds load automatically.
              </p>
            </li>
            <li className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <span className="text-xs font-mono font-semibold text-blue-600">02.</span>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">Frame face &amp; clean background</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Center your eyes and both ears inside the crop frame, and replace off-white walls with pure white if needed.
              </p>
            </li>
            <li className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <span className="text-xs font-mono font-semibold text-blue-600">03.</span>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">Clean your scanned signature</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Sign on unruled white paper, open Signature Resizer, enable auto-crop + black-and-white contrast, and export at {preset.signature.minKB}–{preset.signature.maxKB} KB.
              </p>
            </li>
            <li className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <span className="text-xs font-mono font-semibold text-blue-600">04.</span>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">Verify notification &amp; upload</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Confirm the green badge in KiloForm and double-check the latest official {preset.shortName} notification before final submission.
              </p>
            </li>
          </ol>
        </section>

        {/* FAQs */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {preset.shortName} Frequently Asked Questions
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {preset.faqs.map((faq) => (
              <details key={faq.question} className="group p-5">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span>{faq.question}</span>
                  <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
};
