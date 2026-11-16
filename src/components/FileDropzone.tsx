import React, { useEffect, useId, useRef, useState } from 'react';
import { Camera, Upload, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  enablePaste?: boolean;
  cameraFacing?: 'user' | 'environment';
  label?: string;
  compact?: boolean;
  error?: string | null;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
  multiple = false,
  accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif',
  enablePaste = true,
  cameraFacing = 'user',
  label,
  compact = false,
  error,
}) => {
  const { t } = useAppContext();
  const inputId = useId();
  const cameraId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateAndEmit = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;

    const valid: File[] = [];
    for (const f of arr) {
      const lower = f.name.toLowerCase();
      const okType =
        f.type.startsWith('image/') ||
        lower.endsWith('.heic') ||
        lower.endsWith('.heif') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png') ||
        lower.endsWith('.webp');
      if (!okType) {
        setLocalError(`"${f.name}" is not a supported image (JPG, PNG, WEBP, or HEIC).`);
        return;
      }
      if (f.size > 40 * 1024 * 1024) {
        setLocalError(`"${f.name}" exceeds 40 MB. Please choose a smaller image.`);
        return;
      }
      valid.push(f);
    }
    setLocalError(null);
    onFilesSelected(multiple ? valid : [valid[0]]);
  };

  useEffect(() => {
    if (!enablePaste) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const f = items[i].getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        validateAndEmit(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const activeError = error || localError;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files) validateAndEmit(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed transition-colors ${
          compact ? 'p-4' : 'p-6 sm:p-8'
        } ${
          dragging
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
        }`}
      >
        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            if (e.target.files) validateAndEmit(e.target.files);
            e.target.value = '';
          }}
          className="sr-only"
        />
        <input
          id={cameraId}
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture={cameraFacing}
          onChange={(e) => {
            if (e.target.files) validateAndEmit(e.target.files);
            e.target.value = '';
          }}
          className="sr-only"
        />

        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Upload className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {label || t.uploadTitle}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.uploadSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <label
              htmlFor={inputId}
              className="cursor-pointer inline-flex items-center justify-center min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition-colors whitespace-nowrap"
            >
              Choose Image
            </label>
            {!multiple && (
              <label
                htmlFor={cameraId}
                className="cursor-pointer inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
              >
                <Camera className="w-4 h-4" aria-hidden="true" />
                <span>{t.cameraBtn}</span>
              </label>
            )}
          </div>
          {enablePaste && !compact && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{t.pasteHint}</p>
          )}
        </div>
      </div>

      {activeError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-800 dark:text-red-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
};
