import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, Moon, Sun, X, Languages } from 'lucide-react';
import { CORE_TOOLS, SITE_CONFIG } from '../config/site';
import { useAppContext } from '../context/AppContext';
import { PWAInstallButton } from './PWAControls';

export const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { pathname } = useLocation();
  const toolsRef = useRef<HTMLDivElement>(null);
  const { t, language, toggleLanguage, theme, toggleTheme } = useAppContext();

  const isToolRoute = CORE_TOOLS.some((tool) => tool.path === pathname);

  useEffect(() => {
    setToolsOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!toolsOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToolsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [toolsOpen]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 hover:text-blue-600 dark:hover:text-blue-400 ${
      isActive
        ? 'text-blue-600 dark:text-blue-400 underline underline-offset-4'
        : 'text-slate-600 dark:text-slate-300'
    }`;

  return (
    <>
      {/* Sticky Top Header strictly adhering to the 3-zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element brand wordmark */}
          <Link
            to="/"
            className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            {SITE_CONFIG.brandName}
          </Link>

          {/* Zone 2: 5 concise single-line text links / dropdown */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
            <div ref={toolsRef} className="relative">
              <button
                type="button"
                onClick={() => setToolsOpen((prev) => !prev)}
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 hover:text-blue-600 dark:hover:text-blue-400 ${
                  isToolRoute
                    ? 'text-blue-600 dark:text-blue-400 underline underline-offset-4'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <span>{t.navTools}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${toolsOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {toolsOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-2 z-40"
                >
                  {CORE_TOOLS.map((tool) => {
                    const active = pathname === tool.path;
                    return (
                      <Link
                        key={tool.id}
                        to={tool.path}
                        role="menuitem"
                        onClick={() => setToolsOpen(false)}
                        className={`block px-4 py-2 text-xs transition-colors ${
                          active
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {language === 'hi' ? tool.titleHi : tool.titleEn}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <NavLink to="/presets" className={navLinkClass}>
              {t.navPresets}
            </NavLink>
            <NavLink to="/blog" className={navLinkClass}>
              {t.navBlog}
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              {t.navAbout}
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              {t.navContact}
            </NavLink>
          </nav>

          {/* Zone 3: Primary action CTA (plus mobile menu trigger on small screens) */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/photo-resizer"
              className="hidden md:inline-flex items-center justify-center min-h-[38px] px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
            >
              {t.navCta}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-2 max-h-[75vh] overflow-y-auto">
            <nav aria-label="Mobile navigation" className="flex flex-col space-y-1">
              {CORE_TOOLS.map((tool) => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  onClick={() => setMobileOpen(false)}
                  className="min-h-[42px] flex items-center px-3 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {language === 'hi' ? tool.titleHi : tool.titleEn}
                </Link>
              ))}
              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
              <Link
                to="/presets"
                onClick={() => setMobileOpen(false)}
                className="min-h-[42px] flex items-center px-3 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t.navPresets}
              </Link>
              <Link
                to="/blog"
                onClick={() => setMobileOpen(false)}
                className="min-h-[42px] flex items-center px-3 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t.navBlog}
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileOpen(false)}
                className="min-h-[42px] flex items-center px-3 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t.navAbout}
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileOpen(false)}
                className="min-h-[42px] flex items-center px-3 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t.navContact}
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Non-sticky Workspace & Preference Strip (Language EN/HI, Theme Light/Dark, PWA Install) */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            <span>{t.trustLocal}</span>
          </div>
          <div className="flex items-center gap-2">
            <PWAInstallButton />
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label="Toggle language between English and Hindi"
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Languages className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{language === 'en' ? 'हिंदी' : 'English'}</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Light</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
