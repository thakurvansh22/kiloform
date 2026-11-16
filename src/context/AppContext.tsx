import React, { createContext, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS, type Language } from '../data/translations';
import {
  addRecentFile,
  clearRecentFiles,
  getLastPresetId,
  getRecentFiles,
  getSavedLanguage,
  getSavedTheme,
  saveLanguage,
  saveLastPresetId,
  saveTheme,
  type RecentFileEntry,
} from '../utils/storage';

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (typeof TRANSLATIONS)['en'];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  lastPresetId: string;
  setLastPresetId: (id: string) => void;
  recentFiles: RecentFileEntry[];
  recordRecentFile: (entry: Omit<RecentFileEntry, 'id' | 'createdAt'>) => void;
  clearHistory: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => getSavedLanguage());
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => getSavedTheme());
  const [lastPresetId, setLastPresetIdState] = useState<string>(() => getLastPresetId());
  const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>(() => getRecentFiles());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en';
    saveLanguage(language);
  }, [language]);

  const setLanguage = (lang: Language) => setLanguageState(lang);
  const toggleLanguage = () => setLanguageState((prev) => (prev === 'en' ? 'hi' : 'en'));
  const toggleTheme = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));

  const setLastPresetId = (id: string) => {
    setLastPresetIdState(id);
    saveLastPresetId(id);
  };

  const recordRecentFile = (entry: Omit<RecentFileEntry, 'id' | 'createdAt'>) => {
    const updated = addRecentFile(entry);
    setRecentFiles(updated);
  };

  const clearHistory = () => {
    clearRecentFiles();
    setRecentFiles([]);
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t: TRANSLATIONS[language],
        theme,
        toggleTheme,
        lastPresetId,
        setLastPresetId,
        recentFiles,
        recordRecentFile,
        clearHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
