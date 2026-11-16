import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Combine,
  Crop,
  FileArchive,
  FileImage,
  FileText,
  Fingerprint,
  Grid,
  Minimize2,
  PenTool,
  Search,
  ShieldCheck,
  Type,
  WifiOff,
  Clock,
  Trash2,
} from 'lucide-react';
import { AdSlot } from '../components/AdSlot';
import { SeoHead, type FaqItem } from '../components/SeoHead';
import { CORE_TOOLS, SITE_CONFIG } from '../config/site';
import { useAppContext } from '../context/AppContext';
import { EXAM_PRESETS, VERIFICATION_DISCLAIMER } from '../data/presets';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  'photo-resizer': <Crop className="w-5 h-5" aria-hidden="true" />,
  'signature-resizer': <PenTool className="w-5 h-5" aria-hidden="true" />,
  'thumb-impression-resizer': <Fingerprint className="w-5 h-5" aria-hidden="true" />,
  'image-to-pdf-under-kb': <FileText className="w-5 h-5" aria-hidden="true" />,
  'compress-image-to-kb': <Minimize2 className="w-5 h-5" aria-hidden="true" />,
  'resize-image': <FileImage className="w-5 h-5" aria-hidden="true" />,
  'photo-signature-combine': <Combine className="w-5 h-5" aria-hidden="true" />,
  'photo-with-name-date': <Type className="w-5 h-5" aria-hidden="true" />,
  'passport-photo-sheet': <Grid className="w-5 h-5" aria-hidden="true" />,
  'bulk-resize': <FileArchive className="w-5 h-5" aria-hidden="true" />,
};

const HOME_FAQS: FaqItem[] = [
  {
    question: `Are my photos and signatures uploaded to ${SITE_CONFIG.brandName} servers?`,
    answer:
      'Never. Every crop, background replacement, DPI update, and KB compression runs 100% locally inside your web browser using HTML5 Canvas and Web Workers. Your documents never leave your device.',
  },
  {
    question: 'Which Indian competitive exams are pre-configured?',
    answer:
      'We include presets for SSC CGL, SSC CHSL, SSC GD, UPSC CSE, Railway RRB NTPC, IBPS PO/Clerk, SBI PO/Clerk, NEET UG, JEE Main, CUET UG, Indian Passport, and Aadhaar-style portals—plus full Custom sizing.',
  },
  {
    question: 'Does KiloForm embed real 200 DPI or 300 DPI metadata in JPG files?',
    answer:
      'Yes. KiloForm modifies the binary JFIF APP0 header of exported JPEG files so portals that inspect DPI metadata (such as IBPS, SBI, and state PSC portals) read 200 or 300 DPI accurately.',
  },
  {
    question: 'Can I use KiloForm offline on my mobile phone?',
    answer:
      'Yes. KiloForm is an installable Progressive Web App (PWA). Tap Install App or Add to Home Screen once, and every photo, signature, and print sheet tool continues working even without internet.',
  },
  {
    question: 'Can I convert iPhone HEIC photos to exam-ready JPG?',
    answer:
      'Yes. Drop or choose HEIC/HEIF photos directly from an iPhone gallery and KiloForm decodes them locally into standard JPEG files.',
  },
];

export const HomePage: React.FC = () => {
  const { t, language, recentFiles, clearHistory } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

  const popularPresets = useMemo(
    () => EXAM_PRESETS.filter((p) => p.popular).slice(0, 8),
    []
  );

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return EXAM_PRESETS.filter(
      (p) =>
        p.examName.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searchQuery]);

  return (
    <>
      <SeoHead
        title={`${SITE_CONFIG.brandName} – Exam Photo, Signature & Document Resizer`}
        description="Free private browser tool for Indian students to resize, crop, clean backgrounds, and compress exam photos and signatures to exact KB, cm, pixel, and DPI requirements."
        path="/"
        faqs={HOME_FAQS}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-16">
        {/* Hero Section */}
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-10 sm:px-10 sm:py-14">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
              {t.heroHeadline}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              {t.heroSubhead}
            </p>

            {/* Search your exam */}
            <div className="relative max-w-xl">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 min-h-[52px] focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
                <Search className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  aria-label="Search exam preset"
                  className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {searchMatches.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                  {searchMatches.map((preset) => (
                    <Link
                      key={preset.id}
                      to={`/exam/${preset.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {preset.examName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          Photo: {preset.photo.width}×{preset.photo.height} {preset.photo.unit} ({preset.photo.minKB}–{preset.photo.maxKB} KB) · Sig: {preset.signature.minKB}–{preset.signature.maxKB} KB
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Exam Interactive Chips */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.popularExams}
              </p>
              <div className="flex flex-wrap gap-2">
                {popularPresets.map((preset) => (
                  <Link
                    key={preset.id}
                    to={`/photo-resizer?preset=${preset.id}`}
                    className="inline-flex items-center min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors whitespace-nowrap"
                  >
                    {preset.shortName}
                  </Link>
                ))}
                <Link
                  to="/presets"
                  className="inline-flex items-center min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  All exams &rarr;
                </Link>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>{t.trustLocal}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                <span>{t.trustFast}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <WifiOff className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" aria-hidden="true" />
                <span>{t.trustOffline}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Banner Ad directly below home hero */}
        <AdSlot variant="banner" />

        {/* Recent Processed Files (when present in localStorage) */}
        {recentFiles.length > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Clock className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span>{t.recentFiles}</span>
              </div>
              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.clearRecent}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentFiles.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2.5 text-xs"
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {item.fileName}
                  </p>
                  <p className="mt-0.5 text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {item.dimensions} · {item.sizeKB} KB · {item.format}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Core Tool Cards */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t.allToolsTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Every tool runs directly on your browser canvas—fast, free, and completely private.
              </p>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {VERIFICATION_DISCLAIMER}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CORE_TOOLS.map((tool) => (
              <Link
                key={tool.id}
                to={tool.path}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 hover:border-blue-500 transition-colors"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    {TOOL_ICONS[tool.id]}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {language === 'hi' ? tool.titleHi : tool.titleEn}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {language === 'hi' ? tool.shortDescHi : tool.shortDescEn}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>{t.openTool}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t.howItWorksTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-2">
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                01.
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Select Exam Preset or Tool
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Pick SSC, UPSC, IBPS, SBI, NEET, JEE, or Passport specs, or enter exact custom width, height, DPI, and KB bounds.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-2">
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                02.
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Crop &amp; Clean in Your Browser
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Drag, zoom, rotate, swap backgrounds to white, clean faint paper signatures, or add a Name &amp; Date strip with live preview.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-2">
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                03.
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Verify &amp; Download Instantly
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Check the green &ldquo;Meets requirement&rdquo; badge for pixel, DPI, and KB compliance, then download straight to your phone or PC.
              </p>
            </div>
          </div>
        </section>

        {/* Home FAQs */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.faqTitle}</h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {HOME_FAQS.map((faq) => (
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
