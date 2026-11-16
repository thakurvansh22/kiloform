import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_CONFIG } from '../config/site';

export interface FaqItem {
  question: string;
  answer: string;
}

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  faqs?: FaqItem[];
  appName?: string;
  includeWebAppSchema?: boolean;
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  path,
  faqs,
  appName,
  includeWebAppSchema = true,
}) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = `${SITE_CONFIG.domain}${cleanPath}`;
  const fullTitle = title.includes(SITE_CONFIG.brandName)
    ? title
    : `${title} | ${SITE_CONFIG.brandName}`;

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: appName || `${SITE_CONFIG.brandName} – ${title}`,
    url: canonicalUrl,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires HTML5 Canvas and JavaScript',
    description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    creator: {
      '@type': 'Person',
      name: SITE_CONFIG.ownerName,
    },
  };

  const faqSchema =
    faqs && faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        }
      : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_CONFIG.brandName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {includeWebAppSchema && (
        <script type="application/ld+json">{JSON.stringify(webAppSchema)}</script>
      )}
      {faqSchema && (
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      )}
    </Helmet>
  );
};
