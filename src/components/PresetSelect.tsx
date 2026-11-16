import React, { useMemo, useState } from 'react';
import { ChevronDown, Search, Info } from 'lucide-react';
import { EXAM_PRESETS, VERIFICATION_DISCLAIMER, type ExamPreset } from '../data/presets';
import { useAppContext } from '../context/AppContext';

interface PresetSelectProps {
  selectedId: string; // preset id or 'custom'
  onSelect: (preset: ExamPreset | null) => void;
  mode?: 'photo' | 'signature';
  allowCustom?: boolean;
}

export const PresetSelect: React.FC<PresetSelectProps> = ({
  selectedId,
  onSelect,
  mode = 'photo',
  allowCustom = true,
}) => {
  const { t } = useAppContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedPreset = useMemo(
    () => EXAM_PRESETS.find((p) => p.id === selectedId) || null,
    [selectedId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXAM_PRESETS;
    return EXAM_PRESETS.filter(
      (p) =>
        p.examName.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="relative space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {t.presetLabel}
      </label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-left text-sm text-slate-900 dark:text-slate-100 hover:border-blue-400 transition-colors"
      >
        <div className="min-w-0">
          <span className="font-semibold block truncate">
            {selectedPreset ? selectedPreset.examName : t.customMode}
          </span>
          {selectedPreset && (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {mode === 'photo'
                ? `${selectedPreset.photo.width}×${selectedPreset.photo.height} ${selectedPreset.photo.unit} · ${selectedPreset.photo.minKB}–${selectedPreset.photo.maxKB} KB`
                : `${selectedPreset.signature.width}×${selectedPreset.signature.height} ${selectedPreset.signature.unit} · ${selectedPreset.signature.minKB}–${selectedPreset.signature.maxKB} KB`}
            </span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter exams (SSC, UPSC, IBPS, NEET...)"
              autoFocus
              className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {allowCustom && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                  selectedId === 'custom'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {t.customMode} (Enter manual width, height, DPI &amp; KB)
              </button>
            )}

            {filtered.map((preset) => {
              const spec = mode === 'photo' ? preset.photo : preset.signature;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSelect(preset);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    selectedId === preset.id ? 'bg-blue-50 dark:bg-blue-950/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {preset.examName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      {preset.category}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {spec.width}×{spec.height} {spec.unit} · {spec.dpi} DPI · {spec.minKB}–{spec.maxKB} KB
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <p className="px-3.5 py-4 text-xs text-slate-500 dark:text-slate-400">
                No matching exam found. Choose Custom dimensions above.
              </p>
            )}
          </div>
        </div>
      )}

      {selectedPreset && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Info className="w-3.5 h-3.5 shrink-0 text-blue-500" aria-hidden="true" />
          <span>
            {VERIFICATION_DISCLAIMER} ({selectedPreset.shortName} updated {selectedPreset.lastUpdated})
          </span>
        </p>
      )}
    </div>
  );
};
