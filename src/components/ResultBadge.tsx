import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { pixelsToCm, type ProcessedResult } from '../utils/imageEngine';

interface ResultBadgeProps {
  result: ProcessedResult;
  minKB?: number;
  maxKB?: number;
}

export const ResultBadge: React.FC<ResultBadgeProps> = ({ result, minKB, maxKB }) => {
  const { t } = useAppContext();
  const cmW = pixelsToCm(result.width, result.dpi).toFixed(2);
  const cmH = pixelsToCm(result.height, result.dpi).toFixed(2);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <div
        className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
          result.meetsRequirement
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
            : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900'
        }`}
      >
        {result.meetsRequirement ? (
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        )}
        <div>
          <p>{result.meetsRequirement ? t.meetsRequirement : t.notMeeting}</p>
          <p className="mt-0.5 font-normal opacity-90">{result.statusReason}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
          <dt className="text-slate-500 dark:text-slate-400">File Size</dt>
          <dd className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {result.sizeKB} KB
          </dd>
          {typeof maxKB === 'number' && maxKB > 0 && (
            <dd className="text-[11px] text-slate-400 tabular-nums">
              Target: {minKB || 0}–{maxKB} KB
            </dd>
          )}
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
          <dt className="text-slate-500 dark:text-slate-400">Dimensions</dt>
          <dd className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {result.width} × {result.height} px
          </dd>
          <dd className="text-[11px] text-slate-400 tabular-nums">
            {cmW} × {cmH} cm
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
          <dt className="text-slate-500 dark:text-slate-400">Print DPI</dt>
          <dd className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {result.dpi} DPI
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
          <dt className="text-slate-500 dark:text-slate-400">Format</dt>
          <dd className="mt-0.5 font-mono font-semibold uppercase text-slate-900 dark:text-slate-100">
            {result.format === 'jpeg' ? 'JPG' : result.format}
          </dd>
        </div>
      </dl>
    </div>
  );
};
