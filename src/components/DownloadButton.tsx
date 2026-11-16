import React from 'react';
import { Download } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface DownloadButtonProps {
  blob: Blob | null;
  fileName: string;
  toolName: string;
  dimensions: string;
  sizeKB: number;
  format: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  blob,
  fileName,
  toolName,
  dimensions,
  sizeKB,
  format,
  label,
  disabled = false,
  className = '',
}) => {
  const { t, recordRecentFile } = useAppContext();

  const handleDownload = () => {
    if (!blob || disabled) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    recordRecentFile({
      fileName,
      toolName,
      dimensions,
      sizeKB,
      format: format.toUpperCase(),
    });
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={!blob || disabled}
      className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-sm font-semibold text-white transition-colors whitespace-nowrap ${className}`}
    >
      <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{label || t.download}</span>
    </button>
  );
};
