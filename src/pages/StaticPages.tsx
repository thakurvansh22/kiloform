import React, { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import { SITE_CONFIG } from '../config/site';

export const AboutPage: React.FC = () => {
  return (
    <>
      <SeoHead
        title={`About ${SITE_CONFIG.brandName}`}
        description={`Learn about ${SITE_CONFIG.brandName}, built by ${SITE_CONFIG.ownerName} to help Indian students prepare exam photos, signatures, and print sheets privately in their browser.`}
        path="/about"
        includeWebAppSchema={false}
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          About {SITE_CONFIG.brandName}
        </h1>
        <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          {SITE_CONFIG.brandName} was built by {SITE_CONFIG.ownerName} to solve a practical everyday frustration faced by millions of students and job applicants across India: getting photos, signatures, and certificates accepted cleanly on government examination portals without paying cyber cafés or uploading sensitive personal documents to unknown remote servers.
        </p>
        <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          Every tool on {SITE_CONFIG.brandName}—from our preset-driven Photo Resizer and Signature Cleanup engine to Passport Print Sheets and Bulk ZIP compression—runs 100% locally inside your web browser using HTML5 Canvas and Web Workers. No image bytes ever leave your phone or laptop.
        </p>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Contact &amp; Ownership</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Operated by {SITE_CONFIG.ownerName}. For preset corrections, bug reports, or feedback, write to{' '}
            <a
              href={`mailto:${SITE_CONFIG.contactEmail}`}
              className="text-blue-600 dark:text-blue-400 underline"
            >
              {SITE_CONFIG.contactEmail}
            </a>
            .
          </p>
        </div>
      </main>
    </>
  );
};

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Preset feedback or support');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `Name: ${name || 'Student'}\n\n${message}`;
    const mailtoUrl = `mailto:${SITE_CONFIG.contactEmail}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <>
      <SeoHead
        title={`Contact ${SITE_CONFIG.brandName}`}
        description={`Contact ${SITE_CONFIG.ownerName} regarding ${SITE_CONFIG.brandName} exam presets, bug reports, or general inquiries via email.`}
        path="/contact"
        includeWebAppSchema={false}
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Contact Us
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Have an updated exam notification specification or suggestion? Send an email directly to{' '}
            {SITE_CONFIG.ownerName}.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Mail className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Direct Email</p>
              <a
                href={`mailto:${SITE_CONFIG.contactEmail}`}
                className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
              >
                {SITE_CONFIG.contactEmail}
              </a>
            </div>
          </div>
          <a
            href={`mailto:${SITE_CONFIG.contactEmail}`}
            className="inline-flex items-center justify-center min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Open Email App
          </a>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Compose Email Message
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Message
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              placeholder="Describe the exam preset or feedback..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 min-h-[46px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition-colors"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>Open in Mail App</span>
          </button>
        </form>
      </main>
    </>
  );
};

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <>
      <SeoHead
        title={`Privacy Policy | ${SITE_CONFIG.brandName}`}
        description={`Read the ${SITE_CONFIG.brandName} Privacy Policy. All images are processed 100% locally in your browser without server uploads.`}
        path="/privacy-policy"
        includeWebAppSchema={false}
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Effective Date: November 2026 · Owner: {SITE_CONFIG.ownerName}
        </p>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            1. Local Browser Image Processing
          </h2>
          <p>
            {SITE_CONFIG.brandName} processes all photographs, signatures, and documents exclusively inside your device&apos;s browser using client-side HTML5 Canvas and Web Workers. Your files are never uploaded to, stored on, or transmitted across any remote server controlled by us.
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-2">
            2. Local Preferences (localStorage)
          </h2>
          <p>
            We optionally store your theme preference (light/dark), selected UI language (English/Hindi), last used exam preset ID, and lightweight metadata of recently exported filenames inside your browser&apos;s localStorage so the tool opens faster on repeat visits. You can clear this history anytime from the home page or browser settings.
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-2">
            3. Third-Party Advertising &amp; Cookies
          </h2>
          <p>
            To keep {SITE_CONFIG.brandName} free for students, future or active pages may display advertisements served by third-party ad providers such as Google AdSense. Third-party vendors, including Google, may use cookies or similar technologies to serve ads based on prior visits to this website or other websites on the internet. Users may opt out of personalized advertising by visiting Google Ads Settings or aboutads.info.
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-2">
            4. Contact
          </h2>
          <p>
            For any privacy questions, email {SITE_CONFIG.ownerName} at{' '}
            <a
              href={`mailto:${SITE_CONFIG.contactEmail}`}
              className="text-blue-600 dark:text-blue-400 underline"
            >
              {SITE_CONFIG.contactEmail}
            </a>
            .
          </p>
        </section>
      </main>
    </>
  );
};

export const TermsPage: React.FC = () => {
  return (
    <>
      <SeoHead
        title={`Terms of Use | ${SITE_CONFIG.brandName}`}
        description={`Terms of use and exam preset verification disclaimer for ${SITE_CONFIG.brandName}.`}
        path="/terms"
        includeWebAppSchema={false}
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Terms of Use
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Effective Date: November 2026 · Owner: {SITE_CONFIG.ownerName}
        </p>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            1. Informational Exam Presets
          </h2>
          <p>
            Exam photo, signature, DPI, and KB presets provided on {SITE_CONFIG.brandName} are compiled from public examination guidelines for convenience. Recruiting boards periodically revise their portal rules between cycles. Always verify final requirements against the official notification PDF before submitting any application form.
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-2">
            2. User Responsibility
          </h2>
          <p>
            Because all image editing occurs locally on your device, you remain solely responsible for inspecting the preview, clarity, orientation, and accuracy of your final downloaded files before uploading them to third-party portals.
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-2">
            3. Availability &amp; Contact
          </h2>
          <p>
            {SITE_CONFIG.brandName} is provided free of charge &ldquo;as is&rdquo; without warranties of uninterrupted availability. Inquiries may be directed to{' '}
            <a
              href={`mailto:${SITE_CONFIG.contactEmail}`}
              className="text-blue-600 dark:text-blue-400 underline"
            >
              {SITE_CONFIG.contactEmail}
            </a>
            .
          </p>
        </section>
      </main>
    </>
  );
};
