import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info, Search } from 'lucide-react';
import { SeoHead, type FaqItem } from '../components/SeoHead';
import { EXAM_PRESETS, VERIFICATION_DISCLAIMER, type ExamCategory } from '../data/presets';

const CATEGORIES: Array<'All' | ExamCategory> = [
  'All',
  'SSC',
  'UPSC',
  'Railway',
  'Banking',
  'Medical & Engineering',
  'Identity & Travel',
];

const FAQS: FaqItem[] = [
  {
    question: 'Are these exam photo and signature presets updated for 2026 cycles?',
    answer:
      'Yes, our preset file lists the latest standard specifications for SSC, UPSC, Railway RRB, IBPS, SBI, NTA NEET/JEE/CUET, and Passport Seva. Always verify with the specific cycle official notification PDF.',
  },
  {
    question: 'Can I open the resizer with an exam preset preloaded?',
    answer:
      'Yes. Click "Resize Photo" or "Resize Signature" on any exam card to open the tool with exact dimensions, DPI, format, and min/max KB already configured.',
  },
];

export const PresetsPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | ExamCategory>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXAM_PRESETS.filter((p) => {
      const catOk = category === 'All' || p.category === category;
      const textOk =
        !q ||
        p.examName.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return catOk && textOk;
    });
  }, [query, category]);

  return (
    <>
      <SeoHead
        title="Exam Photo & Signature Size Presets Directory (SSC, UPSC, IBPS, NEET)"
        description="Searchable directory of photo and signature pixel, cm, DPI, and KB size requirements for SSC CGL, CHSL, GD, UPSC, RRB NTPC, IBPS, SBI, NEET, JEE, CUET, and Passport."
        path="/presets"
        faqs={FAQS}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Exam Photo &amp; Signature Presets
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Search your examination below to inspect exact photo and signature dimensions or launch the resizer preloaded with those specs.
          </p>
        </div>

        {/* Search + Category Tabs */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 max-w-lg rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 min-h-[46px]">
            <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exam name (e.g. SSC, IBPS, NEET, Passport)..."
              className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                  category === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((preset) => (
            <article
              key={preset.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span>{preset.category}</span>
                  <span aria-hidden="true"> · </span>
                  <span>Updated {preset.lastUpdated}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  <Link to={`/exam/${preset.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                    {preset.examName}
                  </Link>
                </h2>

                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <dt className="text-slate-500 dark:text-slate-400">Photo</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {preset.photo.width}×{preset.photo.height} {preset.photo.unit} · {preset.photo.minKB}–{preset.photo.maxKB} KB
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <dt className="text-slate-500 dark:text-slate-400">Signature</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {preset.signature.width}×{preset.signature.height} {preset.signature.unit} · {preset.signature.minKB}–{preset.signature.maxKB} KB
                    </dd>
                  </div>
                </dl>

                <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Info className="w-3.5 h-3.5 shrink-0 text-blue-500" aria-hidden="true" />
                  <span>{VERIFICATION_DISCLAIMER}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Link
                  to={`/photo-resizer?preset=${preset.id}`}
                  className="inline-flex items-center justify-center min-h-[40px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
                >
                  Resize Photo
                </Link>
                <Link
                  to={`/signature-resizer?preset=${preset.id}`}
                  className="inline-flex items-center justify-center min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Signature
                </Link>
                <Link
                  to={`/exam/${preset.id}`}
                  className="inline-flex items-center gap-1 ml-auto text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Guide</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-600 dark:text-slate-400">
            No exam presets matched &ldquo;{query}&rdquo;. You can still enter custom dimensions inside the{' '}
            <Link to="/photo-resizer" className="text-blue-600 underline">
              Photo Resizer
            </Link>
            .
          </div>
        )}
      </main>
    </>
  );
};
