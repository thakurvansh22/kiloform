import React from 'react';
import { useAppContext } from '../context/AppContext';

interface AdSlotProps {
  variant: 'banner' | 'result-below' | 'sidebar';
  className?: string;
}

/**
 * Placeholder-only ad container. Renders zero external scripts and enforces
 * generous clearance (>= 80px) from tool action buttons when placed below results.
 */
export const AdSlot: React.FC<AdSlotProps> = ({ variant, className = '' }) => {
  const { t } = useAppContext();

  if (variant === 'sidebar') {
    return (
      <aside
        aria-label={t.adSpace}
        className={`hidden lg:flex flex-col items-center justify-center w-full min-h-[300px] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-900/60 text-xs font-medium text-slate-500 dark:text-slate-400 p-4 ${className}`}
      >
        <span>{t.adSpace}</span>
        <span className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">300 × 250</span>
      </aside>
    );
  }

  if (variant === 'result-below') {
    return (
      <div
        aria-label={t.adSpace}
        className={`mt-24 mb-6 flex flex-col items-center justify-center w-full min-h-[100px] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-900/60 text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-6 ${className}`}
      >
        <span>{t.adSpace}</span>
      </div>
    );
  }

  return (
    <div
      aria-label={t.adSpace}
      className={`my-8 flex flex-col items-center justify-center w-full min-h-[92px] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-900/60 text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-5 ${className}`}
    >
      <span>{t.adSpace}</span>
    </div>
  );
};
