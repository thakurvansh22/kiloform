export type Language = 'en' | 'hi';

export const TRANSLATIONS: Record<
  Language,
  {
    navTools: string;
    navPresets: string;
    navBlog: string;
    navAbout: string;
    navContact: string;
    navCta: string;
    heroHeadline: string;
    heroSubhead: string;
    searchPlaceholder: string;
    popularExams: string;
    trustLocal: string;
    trustFast: string;
    trustOffline: string;
    howItWorksTitle: string;
    faqTitle: string;
    allToolsTitle: string;
    openTool: string;
    uploadTitle: string;
    uploadSubtitle: string;
    cameraBtn: string;
    pasteHint: string;
    presetLabel: string;
    customMode: string;
    width: string;
    height: string;
    unit: string;
    dpi: string;
    minKB: string;
    maxKB: string;
    format: string;
    brightness: string;
    contrast: string;
    bgReplace: string;
    tolerance: string;
    rotate: string;
    flipH: string;
    flipV: string;
    reset: string;
    before: string;
    after: string;
    download: string;
    processing: string;
    meetsRequirement: string;
    notMeeting: string;
    verifyDisclaimer: string;
    adSpace: string;
    recentFiles: string;
    clearRecent: string;
    installApp: string;
    offlineBadge: string;
    footerTagline: string;
  }
> = {
  en: {
    navTools: 'Tools',
    navPresets: 'Exam Presets',
    navBlog: 'Guides',
    navAbout: 'About',
    navContact: 'Contact',
    navCta: 'Photo Resizer',
    heroHeadline: 'Exam photos & signatures sized right on the first try',
    heroSubhead:
      'Crop, clean backgrounds, embed DPI, and hit exact KB limits for SSC, UPSC, Railway, Banking, NEET, JEE, and Passport forms—100% inside your browser.',
    searchPlaceholder: 'Search your exam (e.g. SSC CGL, IBPS, UPSC, NEET)...',
    popularExams: 'Popular exam presets',
    trustLocal: 'Files never leave your device',
    trustFast: 'Exact KB & JFIF DPI output',
    trustOffline: 'Works offline as an app',
    howItWorksTitle: 'How it works',
    faqTitle: 'Frequently asked questions',
    allToolsTitle: 'All exam document tools',
    openTool: 'Open tool',
    uploadTitle: 'Drop photo here, paste (Ctrl+V), or browse',
    uploadSubtitle: 'Supports JPG, PNG, WEBP, and iPhone HEIC locally on your device',
    cameraBtn: 'Use Camera',
    pasteHint: 'Tip: You can also press Ctrl+V anywhere on this page to paste an image',
    presetLabel: 'Exam preset',
    customMode: 'Custom dimensions',
    width: 'Width',
    height: 'Height',
    unit: 'Unit',
    dpi: 'DPI',
    minKB: 'Min KB',
    maxKB: 'Max KB',
    format: 'Format',
    brightness: 'Brightness',
    contrast: 'Contrast',
    bgReplace: 'Background colour',
    tolerance: 'Colour tolerance',
    rotate: 'Rotate 90°',
    flipH: 'Flip H',
    flipV: 'Flip V',
    reset: 'Reset',
    before: 'Original',
    after: 'Processed output',
    download: 'Download file',
    processing: 'Processing locally...',
    meetsRequirement: 'Meets requirement',
    notMeeting: 'Not meeting requirement',
    verifyDisclaimer: 'Verify with the official notification',
    adSpace: 'Ad space',
    recentFiles: 'Recent processed files',
    clearRecent: 'Clear history',
    installApp: 'Install App',
    offlineBadge: 'Offline mode active — all image tools continue working locally',
    footerTagline: 'Private, browser-only exam photo and signature studio built for Indian students.',
  },
  hi: {
    navTools: 'टूल्स',
    navPresets: 'परीक्षा प्रीसेट',
    navBlog: 'गाइड',
    navAbout: 'परिचय',
    navContact: 'संपर्क',
    navCta: 'फोटो रिसाइज़र',
    heroHeadline: 'परीक्षा फोटो और हस्ताक्षर पहली ही बार में बिल्कुल सही साइज में',
    heroSubhead:
      'SSC, UPSC, रेलवे, बैंकिंग, NEET, JEE और पासपोर्ट फॉर्म के लिए फोटो क्रॉप करें, बैकग्राउंड साफ करें, DPI सेट करें और सटीक KB साइज पाएं—पूरी तरह आपके ब्राउज़र में।',
    searchPlaceholder: 'अपनी परीक्षा खोजें (जैसे SSC CGL, IBPS, UPSC, NEET)...',
    popularExams: 'लोकप्रिय परीक्षा प्रीसेट',
    trustLocal: 'फाइलें आपके डिवाइस से बाहर नहीं जातीं',
    trustFast: 'सटीक KB और JFIF DPI आउटपुट',
    trustOffline: 'ऑफलाइन ऐप की तरह काम करता है',
    howItWorksTitle: 'यह कैसे काम करता है',
    faqTitle: 'अक्सर पूछे जाने वाले प्रश्न',
    allToolsTitle: 'सभी परीक्षा डॉक्यूमेंट टूल्स',
    openTool: 'टूल खोलें',
    uploadTitle: 'फोटो यहाँ डालें, पेस्ट करें (Ctrl+V), या चुनें',
    uploadSubtitle: 'JPG, PNG, WEBP और iPhone HEIC आपके डिवाइस पर ही प्रोसेस होते हैं',
    cameraBtn: 'कैमरा खोलें',
    pasteHint: 'सुझाव: आप इस पेज पर कहीं भी Ctrl+V दबाकर इमेज पेस्ट कर सकते हैं',
    presetLabel: 'परीक्षा प्रीसेट',
    customMode: 'कस्टम साइज',
    width: 'चौड़ाई',
    height: 'ऊंचाई',
    unit: 'इकाई',
    dpi: 'DPI',
    minKB: 'न्यूनतम KB',
    maxKB: 'अधिकतम KB',
    format: 'फॉर्मेट',
    brightness: 'चमक (Brightness)',
    contrast: 'कंट्रास्ट (Contrast)',
    bgReplace: 'बैकग्राउंड रंग',
    tolerance: 'रंग टॉलरेंस',
    rotate: '90° घुमाएं',
    flipH: 'क्षैतिज पलटें',
    flipV: 'लंबवत पलटें',
    reset: 'रीसेट',
    before: 'मूल इमेज',
    after: 'तैयार आउटपुट',
    download: 'फाइल डाउनलोड करें',
    processing: 'लोकल प्रोसेसिंग जारी है...',
    meetsRequirement: 'आवश्यकता के अनुरूप',
    notMeeting: 'आवश्यकता पूरी नहीं हुई',
    verifyDisclaimer: 'आधिकारिक अधिसूचना से अवश्य जांचें',
    adSpace: 'विज्ञापन स्थान',
    recentFiles: 'हाल ही में प्रोसेस की गई फाइलें',
    clearRecent: 'इतिहास साफ करें',
    installApp: 'ऐप इंस्टॉल करें',
    offlineBadge: 'ऑफलाइन मोड सक्रिय — सभी फोटो टूल्स स्थानीय रूप से काम कर रहे हैं',
    footerTagline: 'भारतीय छात्रों के लिए पूरी तरह सुरक्षित और ब्राउज़र-आधारित फोटो व हस्ताक्षर स्टूडियो।',
  },
};
