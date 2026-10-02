import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { processAndSaveImage } from '../services/image.service.js';

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

export default router;
