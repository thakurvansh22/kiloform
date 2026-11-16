import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/PWAControls';
import { AppProvider } from './context/AppContext';
import { BlogListPage, BlogPostPage } from './pages/BlogPages';
import { ExamDetailPage } from './pages/ExamDetailPage';
import { HomePage } from './pages/HomePage';
import { PresetsPage } from './pages/PresetsPage';
import {
  AboutPage,
  ContactPage,
  PrivacyPolicyPage,
  TermsPage,
} from './pages/StaticPages';
import { BulkResizePage } from './pages/tools/BulkResizePage';
import { CompressToKbPage } from './pages/tools/CompressToKbPage';
import { ImageToPdfPage } from './pages/tools/ImageToPdfPage';
import { PassportPhotoSheetPage } from './pages/tools/PassportPhotoSheetPage';
import { PhotoResizerPage } from './pages/tools/PhotoResizerPage';
import { PhotoSignatureCombinePage } from './pages/tools/PhotoSignatureCombinePage';
import { PhotoWithNameDatePage } from './pages/tools/PhotoWithNameDatePage';
import { ResizeImagePage } from './pages/tools/ResizeImagePage';
import { SignatureResizerPage } from './pages/tools/SignatureResizerPage';
import { ThumbImpressionResizerPage } from './pages/tools/ThumbImpressionResizerPage';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export default function App() {
  return (
    <HelmetProvider>
      <AppProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            <Navbar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/photo-resizer" element={<PhotoResizerPage />} />
                <Route path="/signature-resizer" element={<SignatureResizerPage />} />
                <Route path="/thumb-impression-resizer" element={<ThumbImpressionResizerPage />} />
                <Route path="/image-to-pdf-under-kb" element={<ImageToPdfPage />} />
                <Route path="/compress-image-to-kb" element={<CompressToKbPage />} />
                <Route path="/resize-image" element={<ResizeImagePage />} />
                <Route path="/photo-signature-combine" element={<PhotoSignatureCombinePage />} />
                <Route path="/photo-with-name-date" element={<PhotoWithNameDatePage />} />
                <Route path="/passport-photo-sheet" element={<PassportPhotoSheetPage />} />
                <Route path="/bulk-resize" element={<BulkResizePage />} />
                <Route path="/presets" element={<PresetsPage />} />
                <Route path="/exam/:examId" element={<ExamDetailPage />} />
                <Route path="/blog" element={<BlogListPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </div>
            <Footer />
            <OfflineIndicator />
          </div>
        </BrowserRouter>
      </AppProvider>
    </HelmetProvider>
  );
}
