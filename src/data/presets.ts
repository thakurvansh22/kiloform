export type DimensionUnit = 'px' | 'cm' | 'mm' | 'inch';
export type ImageFormat = 'jpeg' | 'png' | 'webp';
export type ExamCategory =
  | 'SSC'
  | 'UPSC'
  | 'Railway'
  | 'Banking'
  | 'Medical & Engineering'
  | 'Identity & Travel';

export interface MediaSpec {
  width: number;
  height: number;
  unit: DimensionUnit;
  dpi: number;
  minKB: number;
  maxKB: number;
  format: ImageFormat;
  backgroundNote: string;
}

export interface ExamPreset {
  id: string;
  examName: string;
  shortName: string;
  category: ExamCategory;
  popular?: boolean;
  photo: MediaSpec;
  signature: MediaSpec;
  notes: string;
  sourceUrl: string;
  lastUpdated: string;
  verificationNote: string;
  faqs: Array<{ question: string; answer: string }>;
}

export const VERIFICATION_DISCLAIMER = 'Verify with the official notification';

export const EXAM_PRESETS: ExamPreset[] = [
  {
    id: 'ssc-cgl',
    examName: 'SSC CGL (Combined Graduate Level)',
    shortName: 'SSC CGL',
    category: 'SSC',
    popular: true,
    photo: {
      width: 3.5,
      height: 4.5,
      unit: 'cm',
      dpi: 200,
      minKB: 20,
      maxKB: 50,
      format: 'jpeg',
      backgroundNote: 'Plain light or white background; no cap or spectacles; ears clearly visible.',
    },
    signature: {
      width: 4.0,
      height: 2.0,
      unit: 'cm',
      dpi: 200,
      minKB: 10,
      maxKB: 20,
      format: 'jpeg',
      backgroundNote: 'Black or blue ink signature on plain unruled white paper, horizontal orientation.',
    },
    notes:
      'SSC portals often ask for either live webcam capture or a crisp 3.5 x 4.5 cm JPEG between 20 KB and 50 KB. Avoid blurred selfies or cropped edges.',
    sourceUrl: 'https://ssc.gov.in',
    lastUpdated: '2026-10-15',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'What is the SSC CGL photo size in KB and cm?',
        answer:
          'SSC CGL requires a colour passport-size photograph measuring 3.5 cm wide by 4.5 cm high, saved in JPEG format between 20 KB and 50 KB.',
      },
      {
        question: 'Is date on photo mandatory for SSC CGL?',
        answer:
          'Recent SSC notifications specify live capture or a clean undated front-facing photo unless explicitly asked in the current cycle notice. Use our Name & Date tool only when a notification instructs it.',
      },
      {
        question: 'What is the SSC CGL signature size requirement?',
        answer:
          'The signature must be 4.0 cm wide by 2.0 cm high in JPEG format with a file size strictly between 10 KB and 20 KB on white paper.',
      },
      {
        question: 'Can I wear glasses in my SSC CGL photo?',
        answer:
          'No. SSC strictly rejects photographs with spectacles, sunglasses, caps, or glare on the face. Remove glasses before taking the photo.',
      },
    ],
  },
  {
    id: 'ssc-chsl',
    examName: 'SSC CHSL (Combined Higher Secondary Level)',
    shortName: 'SSC CHSL',
    category: 'SSC',
    popular: true,
    photo: {
      width: 3.5,
      height: 4.5,
      unit: 'cm',
      dpi: 200,
      minKB: 20,
      maxKB: 50,
      format: 'jpeg',
      backgroundNote: 'Plain white/off-white background; straight face looking at camera.',
    },
    signature: {
      width: 4.0,
      height: 2.0,
      unit: 'cm',
      dpi: 200,
      minKB: 10,
      maxKB: 20,
      format: 'jpeg',
      backgroundNote: 'Signature in running hand (not all capital letters) on white unlined paper.',
    },
    notes:
      'SSC CHSL follows the standard SSC OTR dimensions: 3.5 x 4.5 cm photo (20–50 KB) and 4.0 x 2.0 cm signature (10–20 KB).',
    sourceUrl: 'https://ssc.gov.in',
    lastUpdated: '2026-10-15',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'What dimensions are required for SSC CHSL photo upload?',
        answer:
          'The SSC CHSL photograph must measure 3.5 cm x 4.5 cm (approximately 276 x 354 pixels at 200 DPI) and weigh between 20 KB and 50 KB in JPEG format.',
      },
      {
        question: 'Why does SSC CHSL reject blurred signatures?',
        answer:
          'Signatures scanned under dim lighting or over-compressed below 10 KB turn jagged. Use our Signature Resizer to boost dark ink contrast on pure white paper while keeping size between 10 and 20 KB.',
      },
      {
        question: 'Can I sign in block capital letters for SSC CHSL?',
        answer:
          'No, SSC prohibits signatures written entirely in capital letters. Write your normal running-hand signature with a black or dark blue pen.',
      },
      {
        question: 'Which image format should I download for SSC CHSL?',
        answer:
          'Always export as JPEG (.jpg) because SSC application portals do not accept PNG, WEBP, or HEIC uploads.',
      },
    ],
  },
  {
    id: 'ssc-gd',
    examName: 'SSC GD Constable',
    shortName: 'SSC GD',
    category: 'SSC',
    popular: true,
    photo: {
      width: 3.5,
      height: 4.5,
      unit: 'cm',
      dpi: 200,
      minKB: 20,
      maxKB: 50,
      format: 'jpeg',
      backgroundNote: 'Light neutral background, front-facing without spectacles or headgear.',
    },
    signature: {
      width: 4.0,
      height: 2.0,
      unit: 'cm',
      dpi: 200,
      minKB: 10,
      maxKB: 20,
      format: 'jpeg',
      backgroundNote: 'Clear black ink signature on clean white paper.',
    },
    notes:
      'For SSC GD Constable, ensure both shoulders are visible and the photo is not older than 3 months. Check whether the latest notice requires DOP printed.',
    sourceUrl: 'https://ssc.gov.in',
    lastUpdated: '2026-10-12',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'What is the file size for SSC GD Constable photo?',
        answer:
          'Your SSC GD photograph must be in JPEG format between 20 KB and 50 KB, sized at 3.5 cm width by 4.5 cm height.',
      },
      {
        question: 'What is the SSC GD signature dimension in cm and KB?',
        answer:
          'The signature should be 4.0 cm wide by 2.0 cm high in JPEG format and between 10 KB and 20 KB.',
      },
      {
        question: 'How do I add a date to my SSC GD photo if required?',
        answer:
          'Open the KiloForm Name & Date tool, select the SSC preset, enter your name and Date of Photo (DOP), and export directly within 20–50 KB.',
      },
      {
        question: 'Are mobile selfies accepted in SSC GD?',
        answer:
          'Avoid mirrored selfies. Have someone take a straight chest-up photo against a bright white wall in natural daylight.',
      },
    ],
  },
  {
    id: 'upsc-cse',
    examName: 'UPSC Civil Services (IAS / IPS / OTR)',
    shortName: 'UPSC CSE',
    category: 'UPSC',
    popular: true,
    photo: {
      width: 350,
      height: 350,
      unit: 'px',
      dpi: 200,
      minKB: 20,
      maxKB: 300,
      format: 'jpeg',
      backgroundNote: 'Plain white background; 3/4th of photo should show full face.',
    },
    signature: {
      width: 350,
      height: 350,
      unit: 'px',
      dpi: 200,
      minKB: 20,
      maxKB: 300,
      format: 'jpeg',
      backgroundNote: 'Black ink signature on plain white paper; square or balanced 350x350 px canvas.',
    },
    notes:
      'UPSC OTR strictly checks minimum 350 x 350 px up to 1000 x 1000 px, 20 KB–300 KB, bit depth 24-bit JPG, and often mandates candidate name and date printed on the photograph.',
    sourceUrl: 'https://upsconline.nic.in',
    lastUpdated: '2026-10-20',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'What pixel size does UPSC CSE require for photo and signature?',
        answer:
          'UPSC specifies a minimum resolution of 350 x 350 pixels and maximum of 1000 x 1000 pixels in JPEG format, between 20 KB and 300 KB.',
      },
      {
        question: 'Does UPSC require Name and Date on the photograph?',
        answer:
          'Yes, recent UPSC CSE notifications require the candidate name and date on which the photograph was taken clearly printed at the bottom of the photo.',
      },
      {
        question: 'Why does UPSC portal show invalid pixel dimension error?',
        answer:
          'If either width or height is under 350 px or over 1000 px, UPSC rejects the file. Using 350 x 350 px or 500 x 500 px in KiloForm passes validation reliably.',
      },
      {
        question: 'Can I upload a PNG file on UPSC OTR?',
        answer:
          'No, UPSC OTR only accepts standard .jpg / .jpeg images with 24-bit colour depth.',
      },
    ],
  },
  {
    id: 'rrb-ntpc',
    examName: 'Railway RRB NTPC / Group D',
    shortName: 'RRB NTPC',
    category: 'Railway',
    popular: true,
    photo: {
      width: 35,
      height: 45,
      unit: 'mm',
      dpi: 200,
      minKB: 30,
      maxKB: 70,
      format: 'jpeg',
      backgroundNote: 'Plain white background; 50% of image covered by face; no tinted glasses.',
    },
    signature: {
      width: 50,
      height: 20,
      unit: 'mm',
      dpi: 200,
      minKB: 30,
      maxKB: 70,
      format: 'jpeg',
      backgroundNote: 'Running-hand signature in black/blue ink on white paper; box 50mm x 20mm.',
    },
    notes:
      'Railway Recruitment Board (RRB) typically specifies 35mm x 45mm (or 320x240 px minimum) between 30 KB and 70 KB for photos and 50mm x 20mm (30–70 KB) for signatures.',
    sourceUrl: 'https://www.rrbapply.gov.in',
    lastUpdated: '2026-10-10',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'What is the RRB NTPC photo size in KB and mm?',
        answer:
          'RRB NTPC requires a colour passport photo measuring 35 mm x 45 mm on a plain white background, saved as JPEG between 30 KB and 70 KB.',
      },
      {
        question: 'What is the Railway RRB signature box size?',
        answer:
          'Draw a 50 mm x 20 mm box on white paper and sign inside in running script. The uploaded JPEG must be between 30 KB and 70 KB.',
      },
      {
        question: 'Are spectacles allowed in Railway RRB photos?',
        answer:
          'Spectacles with dark/tinted lenses or flash reflection are rejected. If you wear regular clear glasses, ensure zero glare—or remove them to be safe.',
      },
      {
        question: 'Why did my RRB photo fail the minimum 30 KB check?',
        answer:
          'Simple white-background photos compress very small. KiloForm adjusts JPEG quality upward automatically so your file stays cleanly inside 30–70 KB.',
      },
    ],
  },
  {
    id: 'ibps-po',
    examName: 'IBPS PO / Clerk / RRB Banking',
    shortName: 'IBPS PO/Clerk',
    category: 'Banking',
    popular: true,
    photo: {
      width: 200,
      height: 230,
      unit: 'px',
      dpi: 200,
      minKB: 20,
      maxKB: 50,
      format: 'jpeg',
      backgroundNote: 'Light-coloured preferably white background; dimensions 200 x 230 px (4.5 x 3.5 cm).',
    },
    signature: {
      width: 140,
      height: 60,
      unit: 'px',
      dpi: 200,
      minKB: 10,
      maxKB: 20,
      format: 'jpeg',
      backgroundNote: 'Black ink signature on white paper, 140 x 60 pixels, strictly not in CAPITAL letters.',
    },
    notes:
      'IBPS strictly validates exact pixel counts: 200 x 230 px for photo (20–50 KB) and 140 x 60 px for signature (10–20 KB) at 200 DPI.',
    sourceUrl: 'https://www.ibps.in',
    lastUpdated: '2026-10-18',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'What are the exact IBPS photo pixel dimensions?',
        answer:
          'IBPS specifies 200 x 230 pixels (preferred) in JPEG format with a file size between 20 KB and 50 KB at 200 DPI.',
      },
      {
        question: 'What is the IBPS signature pixel size and KB limit?',
        answer:
          'The IBPS signature must be 140 x 60 pixels in JPEG format with file size between 10 KB and 20 KB, signed with black ink on white paper.',
      },
      {
        question: 'Does IBPS also require a left thumb impression and handwritten declaration?',
        answer:
          'Yes! IBPS forms usually require a 240 x 240 px thumb impression (20–50 KB) and an 800 x 400 px handwritten declaration (50–100 KB), both of which you can resize in our custom tool.',
      },
      {
        question: 'Can I sign in blue ink for IBPS PO?',
        answer:
          'IBPS guidelines explicitly state black ink on white paper. You can use our Signature Resizer to convert blue ink cleanly to crisp black ink on white paper.',
      },
    ],
  },
  {
    id: 'sbi-po',
    examName: 'SBI PO / Clerk (Junior Associate)',
    shortName: 'SBI PO/Clerk',
    category: 'Banking',
    popular: true,
    photo: {
      width: 200,
      height: 230,
      unit: 'px',
      dpi: 200,
      minKB: 20,
      maxKB: 50,
      format: 'jpeg',
      backgroundNote: 'Plain light or white background; 200 x 230 px preferred.',
    },
    signature: {
      width: 140,
      height: 60,
      unit: 'px',
      dpi: 200,
      minKB: 10,
      maxKB: 20,
      format: 'jpeg',
      backgroundNote: 'Black ink on white paper, 140 x 60 px, running script only.',
    },
    notes:
      'SBI uses the IBPS upload engine: 200 x 230 px (20–50 KB) for photograph and 140 x 60 px (10–20 KB) for signature at 200 DPI.',
    sourceUrl: 'https://sbi.co.in/web/careers',
    lastUpdated: '2026-10-18',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'Is SBI PO photo size identical to IBPS?',
        answer:
          'Yes, SBI careers portals follow the same 200 x 230 pixel (20–50 KB) photo and 140 x 60 pixel (10–20 KB) signature specifications at 200 DPI.',
      },
      {
        question: 'How do I set 200 DPI in my SBI photo?',
        answer:
          'Select the SBI PO/Clerk preset in KiloForm. Our engine embeds 200 DPI directly into the exported JPEG JFIF header automatically.',
      },
      {
        question: 'What happens if my signature is over 20 KB on SBI portal?',
        answer:
          'The SBI form immediately throws a file-size validation error and blocks proceeding to payment. Compress it between 10 KB and 20 KB before uploading.',
      },
      {
        question: 'Can I resize my SBI handwritten declaration here too?',
        answer:
          'Yes, switch to Custom dimensions in our Photo Resizer or Resize Image tool and enter 800 x 400 px with a 50–100 KB limit.',
      },
    ],
  },
  {
    id: 'neet-ug',
    examName: 'NEET UG (NTA Medical Entrance)',
    shortName: 'NEET UG',
    category: 'Medical & Engineering',
    popular: true,
    photo: {
      width: 3.5,
      height: 4.5,
      unit: 'cm',
      dpi: 200,
      minKB: 10,
      maxKB: 200,
      format: 'jpeg',
      backgroundNote: 'White background; 80% face coverage including ears; no mask.',
    },
    signature: {
      width: 4.0,
      height: 2.0,
      unit: 'cm',
      dpi: 200,
      minKB: 4,
      maxKB: 30,
      format: 'jpeg',
      backgroundNote: 'Full signature in running hand with black pen on white paper.',
    },
    notes:
      'NTA NEET UG asks for a passport photo (10–200 KB), a postcard photo 4x6 inch (10–200 KB), and a signature (4–30 KB), all in JPG with white background.',
    sourceUrl: 'https://neet.nta.nic.in',
    lastUpdated: '2026-10-14',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'What is the NEET UG passport photo requirement?',
        answer:
          'NTA requires a passport-size colour photo on a white background with 80% face visibility (ears visible), in JPEG format between 10 KB and 200 KB.',
      },
      {
        question: 'What about the 4x6 postcard photo for NEET UG?',
        answer:
          'You can select Custom in KiloForm Photo Resizer, choose Inch unit, set 4 x 6 inch at 200 DPI, and set 10–200 KB for your postcard photograph.',
      },
      {
        question: 'What is the NEET UG signature size in KB?',
        answer:
          'Your NEET UG signature must be in JPEG format between 4 KB and 30 KB on a clean white background.',
      },
      {
        question: 'Does NTA require name and date on the NEET photo?',
        answer:
          'Historically NTA has advised including candidate name and date of photo at the bottom on a white strip. Check the latest information bulletin and use our Name & Date tool if needed.',
      },
    ],
  },
  {
    id: 'jee-main',
    examName: 'JEE Main (NTA Engineering Entrance)',
    shortName: 'JEE Main',
    category: 'Medical & Engineering',
    popular: true,
    photo: {
      width: 3.5,
      height: 4.5,
      unit: 'cm',
      dpi: 200,
      minKB: 10,
      maxKB: 200,
      format: 'jpeg',
      backgroundNote: 'White background; 80% face without mask; ears clearly visible.',
    },
    signature: {
      width: 4.0,
      height: 2.0,
      unit: 'cm',
      dpi: 200,
      minKB: 4,
      maxKB: 30,
      format: 'jpeg',
      backgroundNote: 'Black pen signature on white paper, 4–30 KB JPG.',
    },
    notes:
      'NTA JEE Main uses 10–200 KB JPG for passport photo (80% face visibility on white background) and 4–30 KB JPG for signature.',
    sourceUrl: 'https://jeemain.nta.nic.in',
    lastUpdated: '2026-10-14',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'What is the JEE Main photo size limit?',
        answer:
          'JEE Main accepts colour or black-and-white recent photographs (prefer colour with white background) in JPG/JPEG between 10 KB and 200 KB.',
      },
      {
        question: 'What is the JEE Main signature file size?',
        answer:
          'The scanned signature must be in JPG/JPEG format with file size between 4 KB and 30 KB.',
      },
      {
        question: 'Can I upload a blue background photo for JEE Main?',
        answer:
          'NTA specifically recommends a white background with 80% face coverage. Use KiloForm background colour replace to convert a light blue wall to pure white.',
      },
      {
        question: 'Are spectacles allowed in JEE Main photos?',
        answer:
          'Only regular spectacles worn daily are permitted if there is zero glare and eyes remain fully visible; otherwise remove them.',
      },
    ],
  },
  {
    id: 'cuet-ug',
    examName: 'CUET UG (Common University Entrance Test)',
    shortName: 'CUET UG',
    category: 'Medical & Engineering',
    photo: {
      width: 3.5,
      height: 4.5,
      unit: 'cm',
      dpi: 200,
      minKB: 10,
      maxKB: 200,
      format: 'jpeg',
      backgroundNote: 'White background; 80% face without mask, ears visible.',
    },
    signature: {
      width: 4.0,
      height: 2.0,
      unit: 'cm',
      dpi: 200,
      minKB: 4,
      maxKB: 30,
      format: 'jpeg',
      backgroundNote: 'Running signature on white unruled sheet, 4–30 KB JPG.',
    },
    notes:
      'CUET UG follows NTA standards: 10–200 KB JPEG photograph on white background and 4–30 KB JPEG signature.',
    sourceUrl: 'https://cuet.nta.nic.in',
    lastUpdated: '2026-10-14',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'What is the CUET UG photo size in KB?',
        answer:
          'CUET UG requires a JPEG photograph between 10 KB and 200 KB showing 80% of your face against a white background.',
      },
      {
        question: 'What is the CUET UG signature size in KB?',
        answer:
          'Your CUET UG signature must be between 4 KB and 30 KB in JPEG format.',
      },
      {
        question: 'Do I need a PDF for my CUET category certificate?',
        answer:
          'Category and PwBD certificates on NTA portals are usually uploaded as PDFs (50–300 KB). Photos and signatures remain JPEG.',
      },
      {
        question: 'How do I fix a dark background in my CUET photo?',
        answer:
          'Upload your photo to KiloForm Photo Resizer, choose White background replacement, adjust the tolerance slider, and export.',
      },
    ],
  },
  {
    id: 'indian-passport',
    examName: 'Indian Passport (Passport Seva / Visa)',
    shortName: 'Passport',
    category: 'Identity & Travel',
    popular: true,
    photo: {
      width: 2.0,
      height: 2.0,
      unit: 'inch',
      dpi: 300,
      minKB: 20,
      maxKB: 200,
      format: 'jpeg',
      backgroundNote: 'Plain white background; 2x2 inch (51x51 mm) or 35x45 mm depending on centre.',
    },
    signature: {
      width: 4.0,
      height: 2.0,
      unit: 'cm',
      dpi: 200,
      minKB: 10,
      maxKB: 50,
      format: 'jpeg',
      backgroundNote: 'Black or blue ink signature on white background for online forms.',
    },
    notes:
      'Indian Passport Seva / OCI applications commonly require 2x2 inch (51x51 mm, 600x600 px at 300 DPI) or 35x45 mm print sheets on plain white background without shadows.',
    sourceUrl: 'https://www.passportindia.gov.in',
    lastUpdated: '2026-10-05',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'What is the official Indian Passport photo size?',
        answer:
          'Indian Passport / OCI online portals commonly require 2 x 2 inches (51 x 51 mm) square photos or 3.5 x 4.5 cm prints on a plain white background at 300 DPI.',
      },
      {
        question: 'Can I print multiple Indian passport photos at home?',
        answer:
          'Yes! After cropping to 2x2 inch or 3.5x4.5 cm, open our Passport Photo Print Sheet tool to arrange 4, 6, 8, or 12 copies onto a 4x6 inch or A4 PDF/JPG.',
      },
      {
        question: 'What background colour is required for an Indian passport?',
        answer:
          'A pure white, shadow-free background is mandatory for Indian Passport and OCI photos.',
      },
      {
        question: 'Are smiles allowed in passport photos?',
        answer:
          'Maintain a neutral facial expression with your mouth closed and both eyes open looking straight at the camera.',
      },
    ],
  },
  {
    id: 'aadhaar-style',
    examName: 'Aadhaar-Style Photo & Portal Upload',
    shortName: 'Aadhaar-style',
    category: 'Identity & Travel',
    photo: {
      width: 3.5,
      height: 4.5,
      unit: 'cm',
      dpi: 200,
      minKB: 15,
      maxKB: 100,
      format: 'jpeg',
      backgroundNote: 'Clean white or light neutral background; clear front-facing portrait.',
    },
    signature: {
      width: 4.0,
      height: 2.0,
      unit: 'cm',
      dpi: 200,
      minKB: 10,
      maxKB: 40,
      format: 'jpeg',
      backgroundNote: 'Dark ink signature on white sheet for KYC/portal forms.',
    },
    notes:
      'Ideal for e-KYC, DigiLocker, scholarship portals, state PSCs, and Aadhaar-linked document portals requiring clean 3.5 x 4.5 cm photos under 100 KB.',
    sourceUrl: 'https://uidai.gov.in',
    lastUpdated: '2026-10-01',
    verificationNote: VERIFICATION_DISCLAIMER,
    faqs: [
      {
        question: 'What size works best for Indian scholarship and KYC portals?',
        answer:
          'A 3.5 x 4.5 cm JPEG photo at 200 DPI between 15 KB and 100 KB passes nearly all state scholarship, PAN, and e-KYC portals.',
      },
      {
        question: 'Does KiloForm store my Aadhaar-style photo or documents?',
        answer:
          'Never. Every crop, compression, and resize runs 100% locally on your browser canvas. Zero files ever touch a server.',
      },
      {
        question: 'Can I convert a mobile camera HEIC photo to JPG here?',
        answer:
          'Yes, KiloForm automatically decodes iPhone HEIC/HEIF photos and huge camera files locally before exporting clean JPGs.',
      },
      {
        question: 'What DPI should I choose for government KYC portals?',
        answer:
          '200 DPI is the standard sweet spot for Indian portals, balancing sharp facial details with compact 20–50 KB file sizes.',
      },
    ],
  },
];

export function getPresetById(id: string | null | undefined): ExamPreset | undefined {
  if (!id) return undefined;
  return EXAM_PRESETS.find((preset) => preset.id === id);
}

export interface ThumbPreset {
  id: string;
  examName: string;
  shortName: string;
  category: string;
  spec: MediaSpec;
  verificationNote: string;
}

export const THUMB_PRESETS: ThumbPreset[] = [
  {
    id: 'ibps-sbi-lti',
    examName: 'IBPS / SBI PO & Clerk (Left Thumb Impression)',
    shortName: 'IBPS / SBI LTI',
    category: 'Banking',
    spec: {
      width: 240,
      height: 240,
      unit: 'px',
      dpi: 200,
      minKB: 20,
      maxKB: 50,
      format: 'jpeg',
      backgroundNote: 'Black or blue ink left thumb impression on white paper, 240×240 px (3×3 cm), 20–50 KB JPG.',
    },
    verificationNote: VERIFICATION_DISCLAIMER,
  },
  {
    id: 'nta-neet-thumb',
    examName: 'NTA NEET / JEE / CUET (Thumb & Fingers Impression)',
    shortName: 'NTA NEET Thumb',
    category: 'Medical & Engineering',
    spec: {
      width: 3.5,
      height: 2.5,
      unit: 'cm',
      dpi: 200,
      minKB: 10,
      maxKB: 200,
      format: 'jpeg',
      backgroundNote: 'Clear black/blue ink impression on clean white paper, 10–200 KB JPG.',
    },
    verificationNote: VERIFICATION_DISCLAIMER,
  },
  {
    id: 'ssc-psc-thumb',
    examName: 'SSC / Police / State PSC (Thumb Impression)',
    shortName: 'SSC / State PSC',
    category: 'SSC & State PSC',
    spec: {
      width: 4.0,
      height: 3.0,
      unit: 'cm',
      dpi: 200,
      minKB: 10,
      maxKB: 50,
      format: 'jpeg',
      backgroundNote: 'Horizontal 4.0×3.0 cm impression on unruled white sheet, 10–50 KB JPG.',
    },
    verificationNote: VERIFICATION_DISCLAIMER,
  },
  {
    id: 'rrb-defence-thumb',
    examName: 'Railway RRB / Defence (Left Thumb Impression)',
    shortName: 'Railway RRB / Defence',
    category: 'Railway',
    spec: {
      width: 35,
      height: 25,
      unit: 'mm',
      dpi: 200,
      minKB: 15,
      maxKB: 50,
      format: 'jpeg',
      backgroundNote: '35×25 mm crisp ink thumb print on plain white paper, 15–50 KB JPG.',
    },
    verificationNote: VERIFICATION_DISCLAIMER,
  },
  {
    id: 'kyc-portal-thumb',
    examName: 'Scholarship / e-KYC / University Portal Thumb',
    shortName: 'e-KYC / Portal',
    category: 'Identity & KYC',
    spec: {
      width: 300,
      height: 200,
      unit: 'px',
      dpi: 200,
      minKB: 10,
      maxKB: 40,
      format: 'jpeg',
      backgroundNote: '300×200 px high-contrast black ink on pure white sheet, 10–40 KB JPG.',
    },
    verificationNote: VERIFICATION_DISCLAIMER,
  },
];

export function getThumbPresetById(id: string | null | undefined): ThumbPreset | undefined {
  if (!id) return undefined;
  return THUMB_PRESETS.find((preset) => preset.id === id);
}
