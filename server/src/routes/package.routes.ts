import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// List packages
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10));
    const search = (req.query.search as string || '').trim();
    const destination = (req.query.destination as string || '').trim();
    const packageType = (req.query.packageType as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const sortBy = (req.query.sortBy as string || 'createdAt').trim();
    const sortOrder = (req.query.sortOrder as string || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const allowedSorts = ['packageName', 'destination', 'price', 'duration', 'status', 'createdAt'];
    const orderBy: any = {};
    if (allowedSorts.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const where: any = {};
    if (search) {
      where.OR = [
        { packageName: { contains: search } },
        { destination: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (destination) where.destination = { contains: destination };
    if (packageType) where.packageType = packageType;
    if (status) where.status = status;

    const [total, packages] = await Promise.all([
      prisma.package.count({ where }),
      prisma.package.findMany({
        where,
        include: {
          itineraries: { orderBy: { dayNumber: 'asc' } },
          _count: { select: { bookings: true, leads: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
    ]);

    res.json({
      data: packages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Single Package with itineraries
router.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        itineraries: { orderBy: { dayNumber: 'asc' } },
        _count: { select: { bookings: true, leads: true } },
      },
    });

    if (!pkg) {
      res.status(404).json({ message: 'Travel package not found.' });
      return;
    }

    res.json(pkg);
  } catch (error) {
    next(error);
  }
});

const packageSchema = z.object({
  packageName: z.string().min(2, 'Package name is required'),
  destination: z.string().min(2, 'Destination is required'),
  duration: z.string().min(1, 'Duration is required'),
  description: z.string().min(5, 'Description is required'),
  price: z.number().min(0, 'Price must be 0 or positive'),
  packageType: z.string().default('HOLIDAY'),
  inclusions: z.string().optional().nullable(),
  exclusions: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  gallery: z.string().optional().nullable(),
  status: z.string().default('ACTIVE'),
  itineraries: z.array(z.object({
    dayNumber: z.number().int().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    activities: z.string().optional().nullable(),
    places: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    images: z.string().optional().nullable(),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
  })).optional(),
});

// Create Package
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = packageSchema.parse(req.body);

    const pkg = await prisma.package.create({
      data: {
        packageName: data.packageName.trim(),
        destination: data.destination.trim(),
        duration: data.duration.trim(),
        description: data.description.trim(),
        price: data.price,
        packageType: data.packageType || 'HOLIDAY',
        inclusions: data.inclusions || null,
        exclusions: data.exclusions || null,
        imageUrl: data.imageUrl || null,
        gallery: data.gallery || null,
        status: data.status || 'ACTIVE',
        itineraries: data.itineraries ? {
          create: data.itineraries.map(d => ({
            dayNumber: d.dayNumber,
            title: d.title.trim(),
            description: d.description.trim(),
            activities: d.activities?.trim() || null,
            places: d.places?.trim() || null,
            imageUrl: d.imageUrl || null,
            images: d.images || null,
            startTime: d.startTime || null,
            endTime: d.endTime || null,
          })),
        } : undefined,
      },
      include: {
        itineraries: { orderBy: { dayNumber: 'asc' } },
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'PACKAGE',
      entityId: pkg.id,
      details: `Created package "${pkg.packageName}" (${pkg.destination}) for ₹${pkg.price}`,
      ipAddress: req.ip,
    });

    res.status(201).json(pkg);
  } catch (error) {
    next(error);
  }
});

// Update Package
router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const data = packageSchema.partial().parse(req.body);

    const updatePayload: any = { ...data };
    delete updatePayload.itineraries;

    const updated = await prisma.package.update({
      where: { id },
      data: updatePayload,
      include: {
        itineraries: { orderBy: { dayNumber: 'asc' } },
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'PACKAGE',
      entityId: id,
      details: `Updated package details for "${updated.packageName}"`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Replace / Save Itinerary Days for a Package
router.post('/:id/itineraries', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { days } = req.body;

    if (!Array.isArray(days)) {
      res.status(400).json({ message: 'Days array is required.' });
      return;
    }

    // Delete existing days and insert updated days inside a transaction
    await prisma.$transaction([
      prisma.itineraryDay.deleteMany({ where: { packageId: id } }),
      prisma.itineraryDay.createMany({
        data: days.map((d: any, index: number) => ({
          packageId: id,
          dayNumber: d.dayNumber || (index + 1),
          title: d.title || `Day ${index + 1}`,
          description: d.description || '',
          activities: d.activities || null,
          places: d.places || null,
          imageUrl: d.imageUrl || null,
          images: d.images ? (typeof d.images === 'string' ? d.images : JSON.stringify(d.images)) : null,
          startTime: d.startTime || null,
          endTime: d.endTime || null,
        })),
      }),
    ]);

    const updatedPackage = await prisma.package.findUnique({
      where: { id },
      include: { itineraries: { orderBy: { dayNumber: 'asc' } } },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'PACKAGE',
      entityId: id,
      details: `Saved ${days.length} itinerary days for package`,
      ipAddress: req.ip,
    });

    res.json(updatedPackage);
  } catch (error) {
    next(error);
  }
});

export default router;
