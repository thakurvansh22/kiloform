import React from 'react';
import { Link } from 'react-router-dom';
import { CORE_TOOLS, SITE_CONFIG } from '../config/site';
import { useAppContext } from '../context/AppContext';
import { EXAM_PRESETS } from '../data/presets';

export const Footer: React.FC = () => {
  const { language, t } = useAppContext();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link
              to="/"
              className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white"
            >
              {SITE_CONFIG.brandName}
            </Link>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.footerTagline}
            </p>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
              {SITE_CONFIG.ownerName} ·{' '}
              <a
                href={`mailto:${SITE_CONFIG.contactEmail}`}
                className="hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2"
              >
                {SITE_CONFIG.contactEmail}
              </a>
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t.navTools}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              {CORE_TOOLS.map((tool) => (
                <li key={tool.id}>
                  <Link
                    to={tool.path}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {language === 'hi' ? tool.titleHi : tool.titleEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t.popularExams}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              {EXAM_PRESETS.slice(0, 6).map((preset) => (
                <li key={preset.id}>
                  <Link
                    to={`/exam/${preset.id}`}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {preset.shortName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Information
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/presets" className="hover:text-blue-600 dark:hover:text-blue-400">
                  All Exam Presets
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-blue-600 dark:hover:text-blue-400">
                  Guides &amp; Blog
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-blue-600 dark:hover:text-blue-400">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-600 dark:hover:text-blue-400">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-blue-600 dark:hover:text-blue-400">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-blue-600 dark:hover:text-blue-400">
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} {SITE_CONFIG.brandName}. Operated by{' '}
            {SITE_CONFIG.ownerName}.
          </p>
          <p>{t.verifyDisclaimer}</p>
        </div>
      </div>
    </footer>
  );
};
