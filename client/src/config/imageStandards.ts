export interface ImageStandardSpec {
  id: string;
  name: string;
  description: string;
  recommendedWidth: number;
  recommendedHeight: number;
  aspectRatioDisplay: string;
  aspectRatioNumeric: number;
  tolerance: number; // e.g. 0.08 tolerance before warning
  orientation: 'Portrait' | 'Landscape' | 'Square' | 'Flexible';
  minResolution: string;
  maxSizeBytes: number;
  maxSizeDisplay: string;
  acceptedFormatsDisplay: string;
  acceptedMimeTypes: string[];
  allowMultiple: boolean;
  allowFeatured: boolean;
  guidanceText: string;
}

export const IMAGE_STANDARDS: Record<string, ImageStandardSpec> = {
  ITINERARY_DAY: {
    id: 'ITINERARY_DAY',
    name: 'Itinerary Day Image',
    description: 'High-resolution photo for printable A4 itinerary schedule and day cover.',
    recommendedWidth: 1500,
    recommendedHeight: 2400,
    aspectRatioDisplay: '5:8 Portrait',
    aspectRatioNumeric: 5 / 8, // 0.625
    tolerance: 0.1,
    orientation: 'Portrait',
    minResolution: '1500 × 2400 px or higher',
    maxSizeBytes: 10 * 1024 * 1024,
    maxSizeDisplay: '10 MB',
    acceptedFormatsDisplay: 'JPG, JPEG, PNG, WebP',
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    allowMultiple: true,
    allowFeatured: true,
    guidanceText:
      'For best results, upload the image using the recommended ratio and resolution. Other ratios are accepted, but the complete image will be preserved without unwanted cropping.',
  },

  PACKAGE_BANNER: {
    id: 'PACKAGE_BANNER',
    name: 'Package Banner & Catalog Hero',
    description: 'Wide hero banner for package detail header and catalog card display.',
    recommendedWidth: 1920,
    recommendedHeight: 1080,
    aspectRatioDisplay: '16:9 Landscape',
    aspectRatioNumeric: 16 / 9, // 1.777
    tolerance: 0.15,
    orientation: 'Landscape',
    minResolution: '1920 × 1080 px',
    maxSizeBytes: 10 * 1024 * 1024,
    maxSizeDisplay: '10 MB',
    acceptedFormatsDisplay: 'JPG, JPEG, PNG, WebP',
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    allowMultiple: false,
    allowFeatured: false,
    guidanceText:
      'For best results, upload the image using the recommended ratio and resolution. Other ratios are accepted, but the complete image will be preserved without unwanted cropping.',
  },

  DESTINATION_PLACE: {
    id: 'DESTINATION_PLACE',
    name: 'Destination Sightseeing Photo',
    description: 'Scenic attraction view for itinerary cards and tourist place suggestions.',
    recommendedWidth: 1500,
    recommendedHeight: 2400,
    aspectRatioDisplay: '5:8 Portrait',
    aspectRatioNumeric: 5 / 8,
    tolerance: 0.1,
    orientation: 'Portrait',
    minResolution: '1500 × 2400 px or higher',
    maxSizeBytes: 10 * 1024 * 1024,
    maxSizeDisplay: '10 MB',
    acceptedFormatsDisplay: 'JPG, JPEG, PNG, WebP',
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    allowMultiple: true,
    allowFeatured: true,
    guidanceText:
      'For best results, upload the image using the recommended ratio and resolution. Other ratios are accepted, but the complete image will be preserved without unwanted cropping.',
  },

  COMPANY_LOGO: {
    id: 'COMPANY_LOGO',
    name: 'Official Company Letterhead Logo',
    description: 'High-contrast logo for quotation headers, invoices, vouchers, and PDF letterheads.',
    recommendedWidth: 512,
    recommendedHeight: 512,
    aspectRatioDisplay: '1:1 Square / Proportional',
    aspectRatioNumeric: 1.0,
    tolerance: 0.3,
    orientation: 'Square',
    minResolution: '512 × 512 px',
    maxSizeBytes: 5 * 1024 * 1024,
    maxSizeDisplay: '5 MB',
    acceptedFormatsDisplay: 'PNG (with transparent background), JPG, JPEG, WebP',
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    allowMultiple: false,
    allowFeatured: false,
    guidanceText:
      'Upload a crisp logo with transparent background if available. The logo will maintain its exact aspect ratio without distortion.',
  },

  PAYMENT_RECEIPT: {
    id: 'PAYMENT_RECEIPT',
    name: 'Payment Screenshot / Bank Receipt',
    description: 'Audit screenshot showing UPI UTR / Bank Reference, timestamp, and amount.',
    recommendedWidth: 1080,
    recommendedHeight: 1920,
    aspectRatioDisplay: 'Any / Full Receipt',
    aspectRatioNumeric: 0.5625,
    tolerance: 1.0, // Any ratio allowed
    orientation: 'Flexible',
    minResolution: 'Sharp readable screenshot',
    maxSizeBytes: 10 * 1024 * 1024,
    maxSizeDisplay: '10 MB',
    acceptedFormatsDisplay: 'JPG, JPEG, PNG, WebP',
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    allowMultiple: false,
    allowFeatured: false,
    guidanceText:
      'Ensure the UTR, Transaction ID, and transferred amount are clearly legible in the image.',
  },
};

/**
 * Calculates human-readable aspect ratio string from pixel width and height.
 */
export function calculateAspectRatioDisplay(width: number, height: number): string {
  if (!width || !height) return 'Unknown';
  const ratio = width / height;

  if (Math.abs(ratio - 1.0) < 0.05) return '1:1 Square';
  if (Math.abs(ratio - 5 / 8) < 0.06) return '5:8 Portrait';
  if (Math.abs(ratio - 4 / 5) < 0.06) return '4:5 Portrait';
  if (Math.abs(ratio - 9 / 16) < 0.06) return '9:16 Portrait';
  if (Math.abs(ratio - 16 / 9) < 0.06) return '16:9 Landscape';
  if (Math.abs(ratio - 4 / 3) < 0.06) return '4:3 Landscape';
  if (Math.abs(ratio - 3 / 2) < 0.06) return '3:2 Landscape';

  if (width > height) {
    return `${(width / height).toFixed(2)}:1 Landscape`;
  } else {
    return `1:${(height / width).toFixed(2)} Portrait`;
  }
}
