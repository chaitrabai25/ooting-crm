import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ProcessedImageResult {
  url: string;
  thumbUrl?: string;
  filename: string;
  originalName: string;
  size: number;
  width?: number;
  height?: number;
  format: string;
}

export interface ProcessImageOptions {
  folder?: string;
  maxDimension?: number;
  quality?: number;
  generateThumb?: boolean;
}

/**
 * Generates a clean, collision-free filename from original filename
 * e.g. "Jog Falls Shimoga.PNG" -> "jog-falls-shimoga-1727756182-a1b2c3.webp"
 */
export function generateSafeWebpFilename(originalName: string, prefix = ''): string {
  const baseName = path.parse(originalName).name;
  const cleanSlug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  const safePrefix = prefix ? `${prefix.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-` : '';
  const timestamp = Date.now();
  const randomHex = Math.random().toString(16).substring(2, 8);

  const finalSlug = cleanSlug || 'image';
  return `${safePrefix}${finalSlug}-${timestamp}-${randomHex}.webp`;
}

/**
 * Optimizes an image buffer:
 * - Resizes intelligently to max bounds while strictly preserving aspect ratio
 * - Converts to modern, ultra-efficient WebP
 * - Saves to disk in designated uploads folder
 * - Returns metadata & relative web path
 */
export async function processAndSaveImage(
  buffer: Buffer,
  originalName: string,
  options: ProcessImageOptions = {}
): Promise<ProcessedImageResult> {
  const folder = options.folder || 'packages';
  const maxDim = options.maxDimension || 1600;
  const quality = options.quality || 82;

  const uploadsRoot = path.resolve(__dirname, '../../uploads');
  const targetDir = path.join(uploadsRoot, folder);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filename = generateSafeWebpFilename(originalName);
  const targetPath = path.join(targetDir, filename);

  // Initialize sharp pipeline
  const pipeline = sharp(buffer)
    .rotate() // Auto-orient based on EXIF
    .resize({
      width: maxDim,
      height: maxDim,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 4,
    });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  let url = `/uploads/${folder}/${filename}`;

  // Try writing to disk; on read-only serverless environments (e.g. Vercel), fallback cleanly to base64 WebP data URL
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, data);
  } catch (fsErr: any) {
    console.warn(`[ImageService] Disk write unavailable (${fsErr?.message || fsErr}). Using optimized WebP base64 data URL.`);
    url = `data:image/webp;base64,${data.toString('base64')}`;
  }

  return {
    url,
    filename,
    originalName,
    size: info.size,
    width: info.width,
    height: info.height,
    format: 'webp',
  };
}

