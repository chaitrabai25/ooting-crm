import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { processAndSaveImage } from '../services/image.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
router.use(authenticate);

router.post(
  '/image',
  (req: AuthRequest, res: Response, next) => {
    upload.single('image')(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Image upload error.' });
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ message: 'No image file uploaded.' });
      return;
    }

  try {
    const rawFolder = (req.query?.folder as string) || (req.body?.folder as string) || '';
    let folder = 'packages';
    if (rawFolder.includes('place')) {
      folder = 'places';
    } else if (rawFolder.includes('hotel')) {
      folder = 'hotels';
    } else if (rawFolder.includes('itinerar') || req.originalUrl.includes('itinerary')) {
      folder = 'itineraries';
    } else if (rawFolder.includes('company') || req.originalUrl.includes('company')) {
      folder = 'company';
    } else if (rawFolder) {
      folder = rawFolder.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    }

    const processed = await processAndSaveImage(req.file.buffer, req.file.originalname, {
      folder,
      maxDimension: 1600,
      quality: 82,
    });

    res.json({
      url: processed.url,
      filename: processed.filename,
      originalName: processed.originalName || req.file.originalname,
      size: processed.size,
      width: processed.width,
      height: processed.height,
      format: processed.format,
      message: 'Image optimized and converted to WebP successfully.',
    });
  } catch (error: any) {
    console.error('Image optimization failed:', error);
    res.status(500).json({
      message: error?.message ? `Image optimization failed: ${error.message}` : 'Image upload failed. Please try again.',
    });
  }
});

// Bulk Multiple Image Upload (Upload up to 20 images in one request)
router.post(
  '/images',
  (req: AuthRequest, res: Response, next) => {
    upload.array('images', 20)(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Bulk image upload error.' });
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response): Promise<void> => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No image files uploaded.' });
      return;
    }

    try {
      const rawFolder = (req.query?.folder as string) || (req.body?.folder as string) || '';
      let folder = 'packages';
      if (rawFolder.includes('place')) {
        folder = 'places';
      } else if (rawFolder.includes('hotel')) {
        folder = 'hotels';
      } else if (rawFolder.includes('itinerar') || req.originalUrl.includes('itinerary')) {
        folder = 'itineraries';
      } else if (rawFolder.includes('company') || req.originalUrl.includes('company')) {
        folder = 'company';
      } else if (rawFolder) {
        folder = rawFolder.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      }

      const results = await Promise.all(
        files.map((file) =>
          processAndSaveImage(file.buffer, file.originalname, {
            folder,
            maxDimension: 1600,
            quality: 82,
          })
        )
      );

      res.json({
        urls: results.map((r) => r.url),
        images: results,
        message: `${results.length} images processed and optimized successfully.`,
      });
    } catch (error: any) {
      console.error('Bulk image optimization failed:', error);
      res.status(500).json({
        message: error?.message ? `Bulk image optimization failed: ${error.message}` : 'Bulk image upload failed.',
      });
    }
  }
);

// Upload PDF document for WhatsApp broadcast & customer communications
const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 35 * 1024 * 1024 }, // 35MB max for PDFs
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed.'));
    }
  },
});

router.post(
  '/document',
  (req: AuthRequest, res: Response, next) => {
    docUpload.single('file')(req, res, (err: any) => {
      if (err) return res.status(400).json({ message: err.message || 'PDF upload error.' });
      next();
    });
  },
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ message: 'No document file uploaded.' });
      return;
    }
    try {
      const uploadsDir = path.resolve(__dirname, '../../uploads/documents');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const cleanName = path.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeFilename = `${cleanName}-${Date.now()}.pdf`;
      const destPath = path.join(uploadsDir, safeFilename);
      fs.writeFileSync(destPath, req.file.buffer);

      const fileUrl = `/uploads/documents/${safeFilename}`;
      res.json({
        url: fileUrl,
        filename: safeFilename,
        originalName: req.file.originalname,
        size: req.file.size,
        message: 'PDF document uploaded successfully.',
      });
    } catch (error: any) {
      console.error('Document upload error:', error);
      res.status(500).json({ message: error.message || 'Failed to upload PDF document.' });
    }
  }
);

export default router;
