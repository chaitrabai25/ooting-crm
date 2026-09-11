import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();
router.use(authenticate);

router.post('/image', upload.single('image'), (req: AuthRequest, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ message: 'No image file uploaded.' });
    return;
  }

  // Determine relative path based on destination folder
  const isItinerary = req.originalUrl.includes('itinerary');
  const isCompany = req.originalUrl.includes('company');
  const folder = isItinerary ? 'itineraries' : (isCompany ? 'company' : 'packages');
  const fileUrl = `/uploads/${folder}/${req.file.filename}`;

  res.json({
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

export default router;
