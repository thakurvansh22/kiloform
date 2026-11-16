export interface RecentFileEntry {
  id: string;
  fileName: string;
  toolName: string;
  dimensions: string;
  sizeKB: number;
  format: string;
  createdAt: string;
}

const KEYS = {
  lastPresetId: 'KiloForm_last_preset',
  recentFiles: 'KiloForm_recent_files',
  language: 'KiloForm_language',
  theme: 'KiloForm_theme',
} as const;

export function getLastPresetId(): string {
  try {
    return window.localStorage.getItem(KEYS.lastPresetId) || 'ssc-cgl';
  } catch {
    return 'ssc-cgl';
  }
}

export function saveLastPresetId(presetId: string): void {
  try {
    window.localStorage.setItem(KEYS.lastPresetId, presetId);
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export function getRecentFiles(): RecentFileEntry[] {
  try {
    const raw = window.localStorage.getItem(KEYS.recentFiles);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentFile(entry: Omit<RecentFileEntry, 'id' | 'createdAt'>): RecentFileEntry[] {
  const newItem: RecentFileEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  try {
    const existing = getRecentFiles();
    const updated = [newItem, ...existing].slice(0, 8);
    window.localStorage.setItem(KEYS.recentFiles, JSON.stringify(updated));
    return updated;
  } catch {
    return [newItem];
  }
}

export function clearRecentFiles(): void {
  try {
    window.localStorage.removeItem(KEYS.recentFiles);
  } catch {
    // Ignore storage errors
  }
}

export function getSavedLanguage(): 'en' | 'hi' {
  try {
    const val = window.localStorage.getItem(KEYS.language);
    return val === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

export function saveLanguage(lang: 'en' | 'hi'): void {
  try {
    window.localStorage.setItem(KEYS.language, lang);
  } catch {
    // Ignore
  }
}

export function getSavedTheme(): 'light' | 'dark' {
  try {
    const val = window.localStorage.getItem(KEYS.theme);
    if (val === 'dark' || val === 'light') return val;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    window.localStorage.setItem(KEYS.theme, theme);
  } catch {
    // Ignore
  }
}
