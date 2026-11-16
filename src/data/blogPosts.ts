export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readMinutes: number;
  author: string;
  relatedToolPath: string;
  relatedToolLabel: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
  }>;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'ssc-photo-and-signature-size-guide',
    title: 'SSC Photo and Signature Size Guide (CGL, CHSL, GD & MTS)',
    excerpt:
      'Every dimension, KB limit, background rule, and signature guideline you need to pass SSC One-Time Registration and exam uploads without rejection.',
    category: 'Exam Guides',
    publishedAt: '2026-10-22',
    readMinutes: 5,
    author: 'Vansh Thakur',
    relatedToolPath: '/photo-resizer?preset=ssc-cgl',
    relatedToolLabel: 'Open SSC Photo Resizer',
    sections: [
      {
        heading: 'Why SSC Photo Validation Is So Strict',
        paragraphs: [
          'Every year, tens of thousands of hardworking candidates preparing for SSC CGL, SSC CHSL, SSC GD Constable, and SSC MTS lose their chance before even entering the examination hall because of avoidable upload mistakes. The Staff Selection Commission automated screening system flags photographs that appear blurred, inverted, cropped tightly around the chin, or captured with spectacles and dark shadows.',
          'Understanding the exact technical parameters required by SSC portals eliminates guesswork. Whether the current cycle asks for live webcam capture or a pre-prepared file upload, having a properly framed 3.5 cm by 4.5 cm portrait stored locally on your phone or laptop saves crucial minutes during high-traffic deadline days.',
        ],
      },
      {
        heading: 'Exact Photo Specifications for SSC Exams',
        paragraphs: [
          'For standard SSC uploads, your photograph must measure 3.5 cm in width and 4.5 cm in height. At 200 DPI, that translates cleanly to roughly 276 by 354 pixels. The file format must strictly be JPEG (.jpg or .jpeg), and the file size must stay between 20 KB and 50 KB. Files smaller than 20 KB often trigger low-resolution errors, while anything above 50 KB is immediately blocked by the upload button.',
          'Stand facing a bright window or soft LED light against a plain white or light off-white wall. Both ears must remain clearly visible, eyes must look straight into the lens, and hats, caps, or tinted glasses must never be worn. Even regular transparent prescription glasses are strictly discouraged in recent SSC circulars because studio flash creates glare over the pupils.',
        ],
      },
      {
        heading: 'Signature Rules: Dimensions, Ink Colour, and Script',
        paragraphs: [
          'Your SSC signature upload must measure 4.0 cm wide by 2.0 cm high in JPEG format, weighing strictly between 10 KB and 20 KB. Draw a neat rectangular box on plain white unlined paper—never ruled notebook pages—and sign inside using black or dark blue ballpoint or gel ink.',
          'One rule candidates frequently overlook is that signatures written entirely in capital block letters (for example, "ROHIT SHARMA") are treated as invalid. Always use your natural running-hand signature that matches the signature you will write on the attendance sheet inside the exam centre. After photographing your signature, use the KiloForm Signature Resizer to trim excess white margins, enhance ink blackness, and convert faint grey paper into pure crisp white.',
        ],
      },
      {
        heading: 'Should You Print Name and Date on Your SSC Photo?',
        paragraphs: [
          'SSC guidelines have evolved across recruitment cycles. Whenever a specific recruitment notice states that the Date of Photograph (DOP) must be printed clearly on the front of the image, open our Photo with Name & Date tool, select the SSC preset, and generate a clean white strip underneath your portrait. When a notice specifically asks for a plain undated photograph, leave the strip off. Always read the latest official notification PDF for that exact cycle before hitting final submit.',
        ],
      },
    ],
  },
  {
    slug: 'how-to-reduce-image-size-to-50kb',
    title: 'How to Reduce Image Size to 50KB Without Losing Clarity',
    excerpt:
      'Learn how smartphone cameras create 5MB files and how binary-search JPEG compression shrinks photos cleanly under 50KB with sharp facial detail.',
    category: 'Tutorials',
    publishedAt: '2026-10-18',
    readMinutes: 5,
    author: 'Vansh Thakur',
    relatedToolPath: '/compress-image-to-kb',
    relatedToolLabel: 'Open Compress to KB Tool',
    sections: [
      {
        heading: 'Why Mobile Photos Are Too Large for Government Portals',
        paragraphs: [
          'Modern smartphones capture photographs at 12 to 50 megapixels, producing files anywhere from 3 MB to 12 MB. Indian government exam portals, scholarship websites, and university admission systems intentionally enforce strict 20 KB to 50 KB upload caps so millions of applicants can submit forms simultaneously over congested networks without crashing portal storage.',
          'If you simply take a screenshot of a photo or forward it through a messaging app, the resulting image often ends up at 150 KB with unpredictable aspect ratios and heavy compression artefacts. Instead, smart compression combines exact pixel resizing with precision JPEG quality tuning.',
        ],
      },
      {
        heading: 'Step 1: Resize Dimensions Before Compressing Quality',
        paragraphs: [
          'Trying to squeeze a 4000 x 3000 pixel image down to 50 KB while keeping all 12 million pixels forces the JPEG encoder to use quality 5%, which turns faces into unreadable blocky squares. The secret used by professional studios is shrinking pixel dimensions first.',
          'For passport photos, 200 x 230 pixels up to 413 x 531 pixels holds plenty of facial clarity while needing only a fraction of the byte budget. Once the pixel dimensions match the form specification—such as 3.5 x 4.5 cm at 200 DPI—the JPEG encoder can retain high visual quality (75% to 90%) and still stay comfortably under 50 KB.',
        ],
      },
      {
        heading: 'Step 2: How Binary-Search Quality Compression Works',
        paragraphs: [
          'Instead of making you guess a random quality slider between 1 and 100, KiloForm runs an automated binary search inside your browser. Within fractions of a second, it tests middle quality values, inspects the exact byte length of the generated JPEG blob, and narrows down to the highest possible visual quality that fits strictly below your 50 KB limit (and above any minimum like 20 KB).',
          'If an image contains complex textured clothing or noisy backgrounds and still exceeds 50 KB even at moderate quality, the engine gently scales down dimensions in small steps until the file lands cleanly inside your target KB window.',
        ],
      },
      {
        heading: 'Step 3: Keep Your Documents Private',
        paragraphs: [
          'Many online "reduce image to 50KB" websites upload your passport photo, signature, and marksheet to unknown remote servers just to run a 10-millisecond resize script. KiloForm executes every canvas operation, JFIF DPI header patch, and JPEG encoding step directly on your own phone or computer. You can even turn off mobile data after loading the page and compress files completely offline.',
        ],
      },
    ],
  },
  {
    slug: 'why-exam-form-photos-get-rejected',
    title: '7 Reasons Exam Form Photos Get Rejected (And How to Fix Each One)',
    excerpt:
      'Avoid last-minute application cancellation by checking lighting, ear visibility, spectacles, background colour, and DPI headers before uploading.',
    category: 'Troubleshooting',
    publishedAt: '2026-10-14',
    readMinutes: 6,
    author: 'Vansh Thakur',
    relatedToolPath: '/photo-resizer',
    relatedToolLabel: 'Check Your Photo Now',
    sections: [
      {
        heading: '1. Blurred, Out-of-Focus, or Low-Light Portraits',
        paragraphs: [
          'The number one cause of automated rejection in SSC, UPSC, and NTA NEET/JEE forms is motion blur or grainy indoor lighting. When a front-facing camera shoots in a dim room, it raises ISO noise and slows shutter speed, smearing eyes and eyebrows. Always face natural window light or stand outdoors in open shade so your facial features appear sharp and evenly lit.',
        ],
      },
      {
        heading: '2. Wearing Spectacles, Caps, or Goggles',
        paragraphs: [
          'Exam boards match your uploaded photo against biometric cameras at the exam venue. Glare on eyeglasses hides your iris and confuses facial recognition checks. Even if you wear prescription lenses every day, take them off for your form photograph unless the specific notice explicitly permits glare-free clear frames.',
        ],
      },
      {
        heading: '3. Busy, Dark, or Patterned Backgrounds',
        paragraphs: [
          'Standing in front of a painted yellow wall, wooden cupboard, or outdoor trees violates the plain white/light background rule. If you already clicked a sharp portrait against a slightly grey or blue wall, open the KiloForm Photo Resizer and use our White Background Replace tool with the tolerance slider to clean the backdrop cleanly around your shoulders.',
        ],
      },
      {
        heading: '4. Wrong Aspect Ratio or Stretched Faces',
        paragraphs: [
          'Typing 200 width and 230 height into a generic resizer without cropping first squishes a square or landscape photo vertically, making your face look abnormally thin. Always crop to the locked preset aspect ratio (for example, 3.5:4.5 or 200:230) before exporting.',
        ],
      },
      {
        heading: '5. Incorrect File Format or Hidden HEIC Extension',
        paragraphs: [
          'iPhones save pictures in HEIC format, and screenshots save as PNG. Even if you manually rename ".png" to ".jpg" in your file manager, the underlying file signature remains PNG, causing government portals to throw "Invalid File Format" errors. Always export a true JPEG from KiloForm.',
        ],
      },
      {
        heading: '6. Missing DPI Metadata (72 vs 200 DPI)',
        paragraphs: [
          'Certain portals like IBPS, SBI, and state PSCs inspect the JFIF header inside your JPEG to verify 200 DPI print density. Standard browser downloads default to 96 or 72 DPI. KiloForm automatically writes the chosen 200 or 300 DPI directly into the binary JFIF header of every JPEG you download.',
        ],
      },
      {
        heading: '7. Signature Written in Capital Letters or on Ruled Paper',
        paragraphs: [
          'Signing on lined notebook paper leaves horizontal blue lines behind your signature, and writing in ALL CAPS violates SSC and banking rules. Use plain white A4 paper, sign naturally with dark black ink, and verify the preview inside KiloForm Signature Resizer before uploading.',
        ],
      },
    ],
  },
  {
    slug: 'how-to-scan-and-resize-signature',
    title: 'How to Scan and Resize Your Signature Perfectly on a Phone',
    excerpt:
      'Turn a smartphone photo of your signature on white paper into a crisp 140x60 px or 4x2 cm JPEG between 10KB and 20KB in under a minute.',
    category: 'Tutorials',
    publishedAt: '2026-10-09',
    readMinutes: 5,
    author: 'Vansh Thakur',
    relatedToolPath: '/signature-resizer',
    relatedToolLabel: 'Open Signature Resizer',
    sections: [
      {
        heading: 'Preparing the Paper and Pen',
        paragraphs: [
          'You do not need a flatbed scanner at a cyber café to produce a studio-clean digital signature. Take a fresh sheet of unruled white A4 printing paper—avoid ruled copy pages or textured envelopes. Use a dark black gel pen or smooth rollerball pen so the strokes look bold and continuous without skipped ink gaps.',
          'Hold the paper flat on a well-lit table near a window. Do not use your phone camera flash directly overhead, because flash creates a bright white hotspot in the middle and dark grey corners around the edges.',
        ],
      },
      {
        heading: 'Capturing and Cleaning Up in KiloForm',
        paragraphs: [
          'Open the KiloForm Signature Resizer on your phone and tap Camera or Upload. Choose the "Photograph Signature Cleanup" preset or adjust the Black & White contrast and Ink Thickness sliders. Our client-side canvas engine automatically strips away grey paper shadows, boosts faint pen strokes into solid dark ink, and converts the entire background into pure #FFFFFF white.',
          'Next, tap Auto-Crop Whitespace. The engine scans every pixel row and column to find the exact bounding box of your signature, trimming dead margins while leaving a small uniform breathing border so your signature fills the 140 x 60 px or 4 x 2 cm frame cleanly.',
        ],
      },
      {
        heading: 'Using the Built-In Draw Pad When You Have No Paper Handy',
        paragraphs: [
          'If you are filling a form urgently and do not have plain white paper nearby, switch to the Draw Signature tab inside our Signature Resizer. Using your finger, stylus, or mouse, sign smoothly on the high-DPI canvas pad, adjust pen thickness, undo if needed, and click Apply to Engine. It immediately crops, resizes, sets 200 DPI, and compresses your signature into 10–20 KB.',
        ],
      },
      {
        heading: 'Final Checklist Before Uploading Your Signature',
        paragraphs: [
          'Confirm that your signature is horizontal (landscape orientation), never sideways or upside down. Check the green "Meets requirement" badge in KiloForm to verify that both pixel dimensions and exact KB limits (such as 10–20 KB for SSC/IBPS or 4–30 KB for NTA) match your target exam.',
        ],
      },
    ],
  },
  {
    slug: 'passport-size-photo-at-home',
    title: 'How to Make and Print a Passport Size Photo at Home for Free',
    excerpt:
      'Shoot a crisp portrait with your smartphone, replace the background to white, and lay out 4, 6, 8, or 12 copies on a 4x6 or A4 print sheet.',
    category: 'DIY Guides',
    publishedAt: '2026-10-02',
    readMinutes: 6,
    author: 'Vansh Thakur',
    relatedToolPath: '/passport-photo-sheet',
    relatedToolLabel: 'Create Print Sheet Now',
    sections: [
      {
        heading: 'Setting Up Your Home Photo Corner',
        paragraphs: [
          'Paying for studio prints every time a college admission, internship, or government exam requires physical copies quickly adds up. With a smartphone camera and good natural lighting, you can create studio-grade passport photographs right at home in five minutes.',
          'Stand about two feet in front of a plain light-coloured wall facing a bright window. Leaving two feet between your back and the wall prevents harsh shadows from falling behind your head. Ask a friend or prop your phone on a shelf at eye level, keep your shoulders straight, look directly at the lens, and leave a little space above your hair.',
        ],
      },
      {
        heading: 'Cropping to Standard 3.5x4.5 cm or 2x2 Inch Ratios',
        paragraphs: [
          'Open the KiloForm Photo Resizer first if your photo needs cropping or background cleanup. Choose Indian Passport (2x2 inch) or standard Passport (3.5x4.5 cm), drag and zoom so your face occupies roughly 70% to 80% of the frame height, and use the White Background Replace slider if your home wall looks slightly cream or shadowed.',
          'Subtle brightness and contrast adjustments also help balance indoor lighting without making skin tones look artificial.',
        ],
      },
      {
        heading: 'Arranging 4, 6, 8, or 12 Copies on a 4x6 or A4 Sheet',
        paragraphs: [
          'Once your single portrait looks crisp, open the KiloForm Passport Photo Print Sheet tool. Upload the portrait, pick 4x6 inch (standard postcard photo paper available at any local stationery or print shop) or A4 paper, and choose 4, 6, 8, or 12 copies.',
          'Enable Cut Guides so fine corner crop marks appear around every tile, making scissor or paper-cutter trimming effortless. Export either a 300 DPI JPEG for local photo labs or a ready-to-print exact-scale PDF generated locally via pdf-lib.',
        ],
      },
      {
        heading: 'Printing Tips for Crisp Studio Results',
        paragraphs: [
          'When printing the PDF on an inkjet printer or at a local print shop, always set Scale to 100% (Actual Size)—never "Fit to Page", which slightly shrinks the 3.5 x 4.5 cm dimensions. Use 180–260 GSM glossy or matte photo paper for sharp colours and durable prints.',
        ],
      },
    ],
  },
];

export function getBlogPostBySlug(slug: string | undefined): BlogPost | undefined {
  if (!slug) return undefined;
  return BLOG_POSTS.find((post) => post.slug === slug);
}
