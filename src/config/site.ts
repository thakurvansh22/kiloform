/**
 * Single source of truth for brand identity, domain, owner contact, and route metadata.
 * Update BRAND_NAME or DOMAIN here to rebrand across every page, SEO tag, and sitemap.
 */
export const SITE_CONFIG = {
  brandName: 'KiloForm',
  shortName: 'KiloForm',
  domain: 'https://KiloForm.in',
  ownerName: 'Vansh Thakur',
  contactEmail: 'Vanshthakur50568@gmail.com',
  tagline: 'Exam form photo, signature and PDF resizer. Files never leave your device.',
  description:
    'Free 100% browser-based photo, signature, and document resizer tailored for SSC, UPSC, Railway, IBPS, NEET, JEE, CUET, and Passport forms.',
} as const;

export interface ToolNavInfo {
  id: string;
  path: string;
  titleEn: string;
  titleHi: string;
  shortDescEn: string;
  shortDescHi: string;
}

export const CORE_TOOLS: ToolNavInfo[] = [
  {
    id: 'photo-resizer',
    path: '/photo-resizer',
    titleEn: 'Exam Photo Resizer',
    titleHi: 'परीक्षा फोटो रिसाइज़र',
    shortDescEn: 'Crop, set exact cm/px, DPI, white/blue background, and target KB.',
    shortDescHi: 'सही सेमी/पिक्सल, DPI, सफेद/नीला बैकग्राउंड और टारगेट KB सेट करें।',
  },
  {
    id: 'signature-resizer',
    path: '/signature-resizer',
    titleEn: 'Signature Resizer & Cleaner',
    titleHi: 'हस्ताक्षर रिसाइज़र और क्लीनर',
    shortDescEn: 'Auto-crop, dark ink boost, draw pad, and 10–20 KB compression.',
    shortDescHi: 'ऑटो-क्रॉप, स्पष्ट काली स्याही, ड्रॉ पैड और 10–20 KB कम्प्रेशन।',
  },
  {
    id: 'compress-image-to-kb',
    path: '/compress-image-to-kb',
    titleEn: 'Compress Image to KB',
    titleHi: 'इमेज को KB में कम्प्रेश करें',
    shortDescEn: 'Hit 10KB, 20KB, 50KB, 100KB, or 200KB precisely under limit.',
    shortDescHi: '10KB, 20KB, 50KB, 100KB या 200KB सीमा के भीतर सटीक साइज पाएं।',
  },
  {
    id: 'resize-image',
    path: '/resize-image',
    titleEn: 'Image Resizer & Converter',
    titleHi: 'इमेज रिसाइज़र और कन्वर्टर',
    shortDescEn: 'Resize by pixels, cm, mm, inches, or percentage and convert format.',
    shortDescHi: 'पिक्सल, सेमी, मिमी, इंच या प्रतिशत से आकार बदलें और फॉर्मेट कन्वर्ट करें।',
  },
  {
    id: 'photo-signature-combine',
    path: '/photo-signature-combine',
    titleEn: 'Combine Photo & Signature',
    titleHi: 'फोटो और हस्ताक्षर जोड़ें',
    shortDescEn: 'Merge photo and signature into one vertical or horizontal strip.',
    shortDescHi: 'फोटो और हस्ताक्षर को एक वर्टिकल या हॉरिजॉन्टल इमेज में जोड़ें।',
  },
  {
    id: 'photo-with-name-date',
    path: '/photo-with-name-date',
    titleEn: 'Photo with Name & Date',
    titleHi: 'नाम और तारीख वाली फोटो',
    shortDescEn: 'Add candidate name and DOP strip for SSC and Railway forms.',
    shortDescHi: 'SSC और रेलवे फॉर्म के लिए फोटो पर नाम और तारीख (DOP) पट्टी जोड़ें।',
  },
  {
    id: 'passport-photo-sheet',
    path: '/passport-photo-sheet',
    titleEn: 'Passport Photo Print Sheet',
    titleHi: 'पासपोर्ट फोटो प्रिंट शीट',
    shortDescEn: 'Arrange 4, 6, 8, or 12 copies on 4x6 or A4 sheet as JPG & PDF.',
    shortDescHi: '4x6 या A4 शीट पर 4, 6, 8 या 12 कॉपी कट गाइड के साथ JPG/PDF पाएं।',
  },
  {
    id: 'bulk-resize',
    path: '/bulk-resize',
    titleEn: 'Bulk Document Resizer',
    titleHi: 'बल्क डॉक्यूमेंट रिसाइज़र',
    shortDescEn: 'Resize multiple marksheets or photos at once and download ZIP.',
    shortDescHi: 'एक साथ कई इमेज या दस्तावेज़ रिसाइज करें और ZIP डाउनलोड करें।',
  },
  {
    id: 'thumb-impression-resizer',
    path: '/thumb-impression-resizer',
    titleEn: 'Thumb Impression Resizer',
    titleHi: 'अंगूठे का निशान रिसाइज़र',
    shortDescEn: 'Auto-crop ink print, convert to crisp black-on-white, and hit exact KB.',
    shortDescHi: 'अंगूठे के निशान को ऑटो-क्रॉप करें, साफ काले-सफेद रूप और सटीक KB पाएं।',
  },
  {
    id: 'image-to-pdf-under-kb',
    path: '/image-to-pdf-under-kb',
    titleEn: 'Image to PDF Under KB',
    titleHi: 'इमेज से PDF (टारगेट KB)',
    shortDescEn: 'Merge & compress JPG/PNG/WEBP pages into a single PDF under 50–500 KB.',
    shortDescHi: 'एक या अधिक इमेज को 50–500 KB सीमा के भीतर PDF में बदलें।',
  },
];
