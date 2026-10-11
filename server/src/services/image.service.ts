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

  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  let url = `data:image/webp;base64,${data.toString('base64')}`;

  // If not in a serverless read-only environment, attempt saving to disk
  if (!isServerless) {
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(targetPath, data);
      url = `/uploads/${folder}/${filename}`;
    } catch (fsErr: any) {
      console.warn(`[ImageService] Disk write unavailable (${fsErr?.message || fsErr}). Using optimized WebP base64 data URL.`);
      url = `data:image/webp;base64,${data.toString('base64')}`;
    }
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

/**
 * Optimizes an incoming base64 data URL if it exceeds 100KB:
 * - Resizes to maxWidth (default 800px)
 * - Converts to efficient WebP (quality 75)
 * - Keeps visual fidelity while cutting byte size by 80-90%
 */
export async function optimizeBase64IfNeeded(
  dataUrl?: string | null,
  maxWidth = 800,
  quality = 75
): Promise<string | null> {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl || null;
  const trimmed = dataUrl.trim();
  if (!trimmed.startsWith('data:image/')) return trimmed;
  // If already compact (< 100KB), return as is
  if (trimmed.length < 100000) return trimmed;

  try {
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx === -1) return trimmed;
    const base64Str = trimmed.slice(commaIdx + 1);
    const buffer = Buffer.from(base64Str, 'base64');

    const optimized = await sharp(buffer)
      .rotate()
      .resize({
        width: maxWidth,
        height: maxWidth,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 3 })
      .toBuffer();

    return `data:image/webp;base64,${optimized.toString('base64')}`;
  } catch (err) {
    console.warn('[ImageService] Failed to optimize base64 image, keeping original:', err);
    return trimmed;
  }
}

