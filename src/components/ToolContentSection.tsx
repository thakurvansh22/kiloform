import React from 'react';
import { Link } from 'react-router-dom';
import type { FaqItem } from './SeoHead';
import { AdSlot } from './AdSlot';

export interface RequirementRow {
  label: string;
  spec: string;
  notes: string;
}

interface ToolContentSectionProps {
  title: string;
  intro: string;
  steps: Array<{ title: string; detail: string }>;
  requirements: RequirementRow[];
  rejectionReasons: string[];
  faqs: FaqItem[];
}

export const ToolLayout: React.FC<{
  children: React.ReactNode;
  sidebarBottom?: React.ReactNode;
}> = ({ children, sidebarBottom }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-9 space-y-8">{children}</div>
        <div className="lg:col-span-3 space-y-6">
          <AdSlot variant="sidebar" />
          <div className="hidden lg:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Quick Exam Presets
            </h2>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/exam/ssc-cgl" className="hover:text-blue-600 dark:hover:text-blue-400">
                  SSC CGL Photo &amp; Signature
                </Link>
              </li>
              <li>
                <Link to="/exam/upsc-cse" className="hover:text-blue-600 dark:hover:text-blue-400">
                  UPSC CSE OTR Specs
                </Link>
              </li>
              <li>
                <Link to="/exam/ibps-po" className="hover:text-blue-600 dark:hover:text-blue-400">
                  IBPS PO / Clerk (200×230 px)
                </Link>
              </li>
              <li>
                <Link to="/exam/neet-ug" className="hover:text-blue-600 dark:hover:text-blue-400">
                  NEET UG Photo Guidelines
                </Link>
              </li>
              <li>
                <Link to="/exam/rrb-ntpc" className="hover:text-blue-600 dark:hover:text-blue-400">
                  Railway RRB NTPC Specs
                </Link>
              </li>
            </ul>
            <Link
              to="/presets"
              className="inline-block text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Browse all exam presets &rarr;
            </Link>
          </div>
          {sidebarBottom}
        </div>
      </div>
    </div>
  );
};

export const ToolContentSection: React.FC<ToolContentSectionProps> = ({
  title,
  intro,
  steps,
  requirements,
  rejectionReasons,
  faqs,
}) => {
  return (
    <section className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-12">
      <div className="max-w-3xl space-y-3">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          {intro}
        </p>
      </div>

      {/* How to use - 4 steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          How to use this tool (4 simple steps)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                0{index + 1}.
              </span>
              <h4 className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {step.title}
              </h4>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Requirements table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Standard Portal Requirements Reference
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Exam / Portal</th>
                <th className="px-4 py-3">Dimensions &amp; KB</th>
                <th className="px-4 py-3">Key Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {requirements.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                    {row.spec}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Common rejection reasons */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Common Rejection Reasons &amp; How to Avoid Them
        </h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-300">
          {rejectionReasons.map((reason) => (
            <li
              key={reason}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 leading-relaxed"
            >
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* 5 Unique FAQs */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Frequently Asked Questions
        </h3>
        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {faqs.map((faq) => (
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
      </div>
    </section>
  );
};
