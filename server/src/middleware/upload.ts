import multer from 'multer';
import type { Request } from 'express';

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
  ];
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image type. Supported formats: JPG, JPEG, PNG, WebP, GIF, SVG, BMP, TIFF.'));
  }
};

// Store uploads in memory buffer so sharp can process, compress & convert to WebP before writing to disk
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter,
});
