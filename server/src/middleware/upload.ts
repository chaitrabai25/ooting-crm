import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Request } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HybridStorage implements multer.StorageEngine {
  _handleFile(
    req: Request,
    file: Express.Multer.File,
    cb: (error?: any, info?: Partial<Express.Multer.File>) => void
  ) {
    const folderParam = (req.query?.folder as string) || (req.body?.folder as string) || '';
    let folder = 'packages';
    if (req.originalUrl.includes('itinerary') || folderParam.includes('itinerar')) {
      folder = 'itineraries';
    } else if (req.originalUrl.includes('company') || folderParam.includes('company')) {
      folder = 'company';
    }

    const dest = path.resolve(__dirname, `../../uploads/${folder}`);

    // Check if destination directory can be created and written to
    let canWriteToDisk = false;
    try {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      canWriteToDisk = true;
    } catch {
      canWriteToDisk = false;
    }

    if (canWriteToDisk) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
      const finalPath = path.join(dest, filename);

      const outStream = fs.createWriteStream(finalPath);
      file.stream.pipe(outStream);
      outStream.on('error', (err) => cb(err));
      outStream.on('finish', () => {
        cb(null, {
          destination: dest,
          filename,
          path: finalPath,
          size: outStream.bytesWritten,
        });
      });
    } else {
      // Memory buffer fallback for serverless / read-only filesystems (e.g. Vercel)
      const chunks: Buffer[] = [];
      file.stream.on('data', (chunk) => chunks.push(chunk));
      file.stream.on('error', (err) => cb(err));
      file.stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        cb(null, {
          buffer,
          size: buffer.length,
        });
      });
    }
  }

  _removeFile(
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null) => void
  ) {
    if (file.path) {
      fs.unlink(file.path, cb);
    } else {
      cb(null);
    }
  }
}

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/svg+xml'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and SVG images are allowed.'));
  }
};

export const upload = multer({
  storage: new HybridStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter,
});
