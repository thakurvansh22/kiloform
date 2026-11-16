import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import { SITE_CONFIG } from '../config/site';
import { BLOG_POSTS, getBlogPostBySlug } from '../data/blogPosts';

export const BlogListPage: React.FC = () => {
  return (
    <>
      <SeoHead
        title={`Exam Form Photo & Signature Guides | ${SITE_CONFIG.brandName}`}
        description="Practical guides for Indian students on SSC photo rules, compressing images to 50KB, scanning signatures on mobile, and printing passport sheets at home."
        path="/blog"
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Exam Form Guides &amp; Tutorials
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Step-by-step instructions to prevent photo rejection on SSC, UPSC, Railway, IBPS, and NTA portals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BLOG_POSTS.map((post) => (
            <article
              key={post.slug}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span>{post.category}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{post.publishedAt}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{post.readMinutes} min read</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  <Link
                    to={`/blog/${post.slug}`}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>
              <Link
                to={`/blog/${post.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>Read full guide</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </main>
    </>
  );
};

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Article not found</h1>
        <Link to="/blog" className="text-sm font-semibold text-blue-600 hover:underline">
          Back to all guides
        </Link>
      </main>
    );
  }

  return (
    <>
      <SeoHead
        title={post.title}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        includeWebAppSchema={false}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Guides</span>
        </Link>

        <article className="space-y-6">
          <header className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>{post.category}</span>
              <span aria-hidden="true"> · </span>
              <span>By {post.author}</span>
              <span aria-hidden="true"> · </span>
              <span>{post.publishedAt}</span>
              <span aria-hidden="true"> · </span>
              <span>{post.readMinutes} min read</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              {post.title}
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {post.excerpt}
            </p>
          </header>

          <div className="space-y-8">
            {post.sections.map((section) => (
              <section key={section.heading} className="space-y-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {section.heading}
                </h2>
                {section.paragraphs.map((p, idx) => (
                  <p
                    key={idx}
                    className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed"
                  >
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Ready to prepare your file?
            </p>
            <Link
              to={post.relatedToolPath}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
            >
              <span>{post.relatedToolLabel}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </article>
      </main>
    </>
  );
};
