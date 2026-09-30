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

  const folderParam = (req.query?.folder as string) || (req.body?.folder as string) || '';
  const isItinerary = req.originalUrl.includes('itinerary') || folderParam.includes('itinerar');
  const isCompany = req.originalUrl.includes('company') || folderParam.includes('company');
  const folder = isItinerary ? 'itineraries' : (isCompany ? 'company' : 'packages');

  let fileUrl = '';
  if (req.file.filename) {
    fileUrl = `/uploads/${folder}/${req.file.filename}`;
  } else if ((req.file as any).buffer) {
    fileUrl = `data:${req.file.mimetype};base64,${(req.file as any).buffer.toString('base64')}`;
  }

  res.json({
    url: fileUrl,
    filename: req.file.filename || req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

export default router;
