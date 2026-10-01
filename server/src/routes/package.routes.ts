import { Router, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// List packages
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '10', 10));
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
  description: z.string().optional().default(''),
  price: z.number().min(0, 'Price must be 0 or positive').default(0),
  packageType: z.string().default('HOLIDAY'),
  inclusions: z.string().optional().nullable(),
  exclusions: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  gallery: z.string().optional().nullable(),
  status: z.string().default('ACTIVE'),
  itineraries: z.array(z.object({
    dayNumber: z.coerce.number().int().min(1),
    title: z.string().optional().default(''),
    description: z.string().optional().default(''),
    activities: z.string().optional().nullable(),
    places: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    highlights: z.string().optional().nullable(),
    travelDetails: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    images: z.union([z.string(), z.array(z.any())]).optional().nullable(),
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
          create: data.itineraries.map((d, index) => {
            let imagesStr: string | null = null;
            if (d.images) {
              imagesStr = typeof d.images === 'string' ? d.images : JSON.stringify(d.images);
            }
            return {
              dayNumber: parseInt(String(d.dayNumber), 10) || (index + 1),
              title: String(d.title || `Day ${index + 1}`).trim(),
              description: String(d.description || '').trim(),
              activities: d.activities ? String(d.activities).trim() : null,
              places: d.places ? String(d.places).trim() : null,
              date: d.date ? String(d.date).trim() : null,
              highlights: d.highlights ? String(d.highlights).trim() : null,
              travelDetails: d.travelDetails ? String(d.travelDetails).trim() : null,
              imageUrl: d.imageUrl ? String(d.imageUrl).trim() : null,
              images: imagesStr,
              startTime: d.startTime ? String(d.startTime).trim() : null,
              endTime: d.endTime ? String(d.endTime).trim() : null,
            };
          }),
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

    const incomingItineraries = data.itineraries;
    if (incomingItineraries && Array.isArray(incomingItineraries)) {
      await prisma.$transaction(async (tx) => {
        await tx.itineraryDay.deleteMany({ where: { packageId: id } });
        await tx.itineraryDay.createMany({
          data: incomingItineraries.map((d: any, index: number) => {
            let imagesStr: string | null = null;
            if (d.images) {
              imagesStr = typeof d.images === 'string' ? d.images : JSON.stringify(d.images);
            }
            return {
              packageId: id,
              dayNumber: parseInt(String(d.dayNumber), 10) || (index + 1),
              title: String(d.title || `Day ${index + 1}`).trim(),
              description: String(d.description || '').trim(),
              activities: d.activities ? String(d.activities).trim() : null,
              places: d.places ? String(d.places).trim() : null,
              date: d.date ? String(d.date).trim() : null,
              highlights: d.highlights ? String(d.highlights).trim() : null,
              travelDetails: d.travelDetails ? String(d.travelDetails).trim() : null,
              imageUrl: d.imageUrl ? String(d.imageUrl).trim() : null,
              images: imagesStr,
              startTime: d.startTime ? String(d.startTime).trim() : null,
              endTime: d.endTime ? String(d.endTime).trim() : null,
            };
          }),
        });
      }, {
        timeout: 30000,
        maxWait: 10000,
      });
    }

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

    const targetPackage = await prisma.package.findUnique({
      where: { id },
    });
    if (!targetPackage) {
      res.status(404).json({ message: 'Travel package not found.' });
      return;
    }

    const sanitizedData = days.map((d: any, index: number) => {
      let imagesStr: string | null = null;
      if (d.images) {
        imagesStr = typeof d.images === 'string' ? d.images : JSON.stringify(d.images);
      }
      return {
        packageId: id,
        dayNumber: parseInt(String(d.dayNumber), 10) || (index + 1),
        title: String(d.title || `Day ${index + 1}`).trim(),
        description: String(d.description || '').trim(),
        activities: d.activities ? String(d.activities).trim() : null,
        places: d.places ? String(d.places).trim() : null,
        date: d.date ? String(d.date).trim() : null,
        highlights: d.highlights ? String(d.highlights).trim() : null,
        travelDetails: d.travelDetails ? String(d.travelDetails).trim() : null,
        hotelId: d.hotelId ? String(d.hotelId).trim() : null,
        hotelName: d.hotelName ? String(d.hotelName).trim() : null,
        hotelStarCategory: d.hotelStarCategory ? String(d.hotelStarCategory).trim() : null,
        hotelImageUrl: d.hotelImageUrl ? String(d.hotelImageUrl).trim() : null,
        hotelLocation: d.hotelLocation ? String(d.hotelLocation).trim() : null,
        hotelDetails: d.hotelDetails ? String(d.hotelDetails).trim() : null,
        mealPlan: d.mealPlan ? String(d.mealPlan).trim() : null,
        imageUrl: d.imageUrl ? String(d.imageUrl).trim() : null,
        images: imagesStr,
        startTime: d.startTime ? String(d.startTime).trim() : null,
        endTime: d.endTime ? String(d.endTime).trim() : null,
      };
    });

    // Delete existing days and insert updated days inside a transaction
    await prisma.$transaction(async (tx) => {
      await tx.itineraryDay.deleteMany({ where: { packageId: id } });
      if (sanitizedData.length > 0) {
        await tx.itineraryDay.createMany({ data: sanitizedData });
      }
    }, {
      timeout: 30000,
      maxWait: 10000,
    });

    const updatedPackage = await prisma.package.findUnique({
      where: { id },
      include: { itineraries: { orderBy: { dayNumber: 'asc' } } },
    });

    if (req.user?.id) {
      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        action: 'UPDATE',
        entity: 'PACKAGE',
        entityId: id,
        details: `Saved ${days.length} itinerary days for package "${targetPackage.packageName}"`,
        ipAddress: req.ip,
      });
    }

    res.json(updatedPackage);
  } catch (error: any) {
    console.error('Failed to save package itineraries:', error?.stack || error);
    res.status(500).json({ message: error?.message || 'Failed to save itinerary changes to database.' });
  }
});

// Save / Upsert a single itinerary day (lightweight, completely prevents 413 Payload Too Large on Vercel)
router.post('/:id/itineraries/day', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const { day } = req.body;

    if (!day) {
      res.status(400).json({ message: 'Day data is required.' });
      return;
    }

    const targetPackage = await prisma.package.findUnique({
      where: { id },
      include: { itineraries: true },
    });

    if (!targetPackage) {
      res.status(404).json({ message: 'Travel package not found.' });
      return;
    }

    let imagesStr: string | null = null;
    if (day.images) {
      imagesStr = typeof day.images === 'string' ? day.images : JSON.stringify(day.images);
    }

    const targetDayNumber = parseInt(String(day.dayNumber), 10) || 1;
    const sanitizedDayData = {
      packageId: id,
      dayNumber: targetDayNumber,
      title: String(day.title || `Day ${targetDayNumber}`).trim(),
      description: String(day.description || '').trim(),
      activities: day.activities ? String(day.activities).trim() : null,
      places: day.places ? String(day.places).trim() : null,
      date: day.date ? String(day.date).trim() : null,
      highlights: day.highlights ? String(day.highlights).trim() : null,
      travelDetails: day.travelDetails ? String(day.travelDetails).trim() : null,
      hotelId: day.hotelId ? String(day.hotelId).trim() : null,
      hotelName: day.hotelName ? String(day.hotelName).trim() : null,
      hotelStarCategory: day.hotelStarCategory ? String(day.hotelStarCategory).trim() : null,
      hotelImageUrl: day.hotelImageUrl ? String(day.hotelImageUrl).trim() : null,
      hotelLocation: day.hotelLocation ? String(day.hotelLocation).trim() : null,
      hotelDetails: day.hotelDetails ? String(day.hotelDetails).trim() : null,
      mealPlan: day.mealPlan ? String(day.mealPlan).trim() : null,
      imageUrl: day.imageUrl ? String(day.imageUrl).trim() : null,
      images: imagesStr,
      startTime: day.startTime ? String(day.startTime).trim() : null,
      endTime: day.endTime ? String(day.endTime).trim() : null,
    };

    await prisma.$transaction(async (tx) => {
      let existingDay = null;
      if (day.id) {
        existingDay = await tx.itineraryDay.findFirst({
          where: { id: day.id, packageId: id },
        });
      }
      if (!existingDay) {
        existingDay = await tx.itineraryDay.findFirst({
          where: { packageId: id, dayNumber: targetDayNumber },
        });
      }

      if (existingDay) {
        await tx.itineraryDay.update({
          where: { id: existingDay.id },
          data: sanitizedDayData,
        });
      } else {
        await tx.itineraryDay.create({
          data: sanitizedDayData,
        });
      }
    }, {
      timeout: 30000,
      maxWait: 10000,
    });

    const updatedPackage = await prisma.package.findUnique({
      where: { id },
      include: { itineraries: { orderBy: { dayNumber: 'asc' } } },
    });

    if (req.user?.id) {
      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        action: 'UPDATE',
        entity: 'PACKAGE',
        entityId: id,
        details: `Saved Day ${targetDayNumber} itinerary for package "${targetPackage.packageName}"`,
        ipAddress: req.ip,
      });
    }

    res.json(updatedPackage);
  } catch (error: any) {
    console.error('Failed to save itinerary day:', error?.stack || error);
    res.status(500).json({ message: error?.message || 'Failed to save itinerary day changes.' });
  }
});

// Reorder Itinerary Days (atomic single transaction, preserves all day content)
router.post('/:id/itineraries/reorder', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const { orderedDays, orderedDayIds } = req.body;

    const targetPackage = await prisma.package.findUnique({
      where: { id },
      include: { itineraries: { orderBy: { dayNumber: 'asc' } } },
    });

    if (!targetPackage) {
      res.status(404).json({ message: 'Travel package not found.' });
      return;
    }

    const updates: Array<{ id: string; dayNumber: number; date?: string | null }> = [];
    if (Array.isArray(orderedDays) && orderedDays.length > 0) {
      orderedDays.forEach((d: any, idx: number) => {
        if (d && d.id) {
          updates.push({
            id: String(d.id),
            dayNumber: idx + 1,
            date: d.date !== undefined ? d.date : undefined,
          });
        }
      });
    } else if (Array.isArray(orderedDayIds) && orderedDayIds.length > 0) {
      orderedDayIds.forEach((dayId: any, idx: number) => {
        if (dayId) {
          updates.push({
            id: String(dayId),
            dayNumber: idx + 1,
          });
        }
      });
    }

    if (updates.length === 0) {
      res.status(400).json({ message: 'No valid day ordering payload provided.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const item of updates) {
        const data: any = { dayNumber: item.dayNumber };
        if (item.date !== undefined) data.date = item.date;
        await tx.itineraryDay.update({
          where: { id: item.id },
          data,
        });
      }
    }, {
      timeout: 30000,
      maxWait: 10000,
    });

    const updatedPackage = await prisma.package.findUnique({
      where: { id },
      include: { itineraries: { orderBy: { dayNumber: 'asc' } } },
    });

    if (req.user?.id) {
      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        action: 'UPDATE',
        entity: 'PACKAGE',
        entityId: id,
        details: `Reordered itinerary schedule (${updates.length} days) for package "${targetPackage.packageName}"`,
        ipAddress: req.ip,
      });
    }

    res.json(updatedPackage);
  } catch (error: any) {
    console.error('Failed to reorder itineraries:', error);
    res.status(500).json({ message: error?.message || 'Failed to reorder itinerary days.' });
  }
});

// Copy / Duplicate Day (creates duplicate with independent database primary key ID)
router.post('/:id/itineraries/day/:dayId/copy', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const dayId = String(req.params.dayId);

    const targetPackage = await prisma.package.findUnique({
      where: { id },
      include: { itineraries: { orderBy: { dayNumber: 'asc' } } },
    });

    if (!targetPackage) {
      res.status(404).json({ message: 'Travel package not found.' });
      return;
    }

    const dayToCopy = targetPackage.itineraries.find(
      (d) => d.id === dayId || String(d.dayNumber) === dayId
    );

    if (!dayToCopy) {
      res.status(404).json({ message: 'Itinerary day to copy not found.' });
      return;
    }

    const nextDayNumber = targetPackage.itineraries.length + 1;

    // Automatic sequential date calculation if original has date
    let calculatedDate: string | null = null;
    if (dayToCopy.date) {
      try {
        const parsed = new Date(dayToCopy.date);
        if (!isNaN(parsed.getTime())) {
          parsed.setDate(parsed.getDate() + 1);
          calculatedDate = parsed.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        }
      } catch {
        calculatedDate = null;
      }
    }

    const cleanTitle = dayToCopy.title.replace(/^Day\s*\d+:\s*/i, '');
    const newDay = await prisma.itineraryDay.create({
      data: {
        packageId: id,
        dayNumber: nextDayNumber,
        title: `Day ${nextDayNumber}: ${cleanTitle}`,
        description: dayToCopy.description,
        places: dayToCopy.places,
        activities: dayToCopy.activities,
        highlights: dayToCopy.highlights,
        travelDetails: dayToCopy.travelDetails,
        startTime: dayToCopy.startTime,
        endTime: dayToCopy.endTime,
        imageUrl: dayToCopy.imageUrl,
        images: dayToCopy.images,
        hotelId: (dayToCopy as any).hotelId || null,
        hotelName: (dayToCopy as any).hotelName || null,
        hotelStarCategory: (dayToCopy as any).hotelStarCategory || null,
        hotelImageUrl: (dayToCopy as any).hotelImageUrl || null,
        hotelLocation: (dayToCopy as any).hotelLocation || null,
        hotelDetails: (dayToCopy as any).hotelDetails || null,
        mealPlan: (dayToCopy as any).mealPlan || null,
        date: calculatedDate || dayToCopy.date,
      },
    });

    const updatedPackage = await prisma.package.findUnique({
      where: { id },
      include: { itineraries: { orderBy: { dayNumber: 'asc' } } },
    });

    if (req.user?.id) {
      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        action: 'CREATE',
        entity: 'PACKAGE',
        entityId: id,
        details: `Duplicated Day ${dayToCopy.dayNumber} into new Day ${nextDayNumber} for package "${targetPackage.packageName}"`,
        ipAddress: req.ip,
      });
    }

    res.status(201).json({
      message: `Day ${dayToCopy.dayNumber} copied to Day ${nextDayNumber} successfully.`,
      newDay,
      package: updatedPackage,
      itineraries: updatedPackage?.itineraries,
    });
  } catch (error: any) {
    console.error('Failed to copy itinerary day:', error);
    res.status(500).json({ message: error?.message || 'Failed to copy itinerary day.' });
  }
});

// Delete a single itinerary day (lightweight, zero body payload)
router.delete('/:id/itineraries/day/:dayIdentifier', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const dayIdentifier = String(req.params.dayIdentifier);

    const targetPackage = await prisma.package.findUnique({
      where: { id },
      include: { itineraries: { orderBy: { dayNumber: 'asc' } } },
    });

    if (!targetPackage) {
      res.status(404).json({ message: 'Travel package not found.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const dayNum = parseInt(dayIdentifier, 10);
      const dayToDelete = await tx.itineraryDay.findFirst({
        where: {
          packageId: id,
          OR: [
            { id: dayIdentifier },
            ...(isNaN(dayNum) ? [] : [{ dayNumber: dayNum }]),
          ],
        },
      });

      if (dayToDelete) {
        await tx.itineraryDay.delete({
          where: { id: dayToDelete.id },
        });

        // Re-number remaining days sequentially
        const remaining = await tx.itineraryDay.findMany({
          where: { packageId: id },
          orderBy: { dayNumber: 'asc' },
        });

        for (let i = 0; i < remaining.length; i++) {
          if (remaining[i].dayNumber !== i + 1) {
            await tx.itineraryDay.update({
              where: { id: remaining[i].id },
              data: { dayNumber: i + 1 },
            });
          }
        }
      }
    }, {
      timeout: 30000,
      maxWait: 10000,
    });

    const updatedPackage = await prisma.package.findUnique({
      where: { id },
      include: { itineraries: { orderBy: { dayNumber: 'asc' } } },
    });

    res.json(updatedPackage);
  } catch (error: any) {
    console.error('Failed to delete itinerary day:', error?.stack || error);
    res.status(500).json({ message: error?.message || 'Failed to delete itinerary day.' });
  }
});

// Export packages to Excel (.xlsx)
router.get('/export/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const packages = await prisma.package.findMany({
      include: {
        _count: { select: { bookings: true, leads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = packages.map((pkg, idx) => ({
      'S.No.': idx + 1,
      'Package Name': pkg.packageName,
      'Destination': pkg.destination,
      'Duration': pkg.duration,
      'Price': pkg.price,
      'Package Type': pkg.packageType,
      'Status': pkg.status,
      'Total Bookings': pkg._count.bookings,
      'Total Leads': pkg._count.leads,
      'Created Date': pkg.createdAt.toISOString().split('T')[0],
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Packages');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'PACKAGE',
      details: `Exported ${packages.length} package records to Excel (.xlsx)`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-packages-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// Delete Package safely
router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        bookings: { select: { id: true } },
      },
    });

    if (!pkg) {
      res.status(404).json({ message: 'Package not found.' });
      return;
    }

    if (pkg.bookings.length > 0) {
      res.status(400).json({
        message: `Cannot delete this package because it is linked to ${pkg.bookings.length} booking(s). You can archive or set status to INACTIVE instead.`,
      });
      return;
    }

    // Safely delete itineraries and unlink leads
    await prisma.$transaction([
      prisma.lead.updateMany({ where: { packageId: id }, data: { packageId: null } }),
      prisma.itineraryDay.deleteMany({ where: { packageId: id } }),
      prisma.package.delete({ where: { id } }),
    ]);

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'DELETE',
      entity: 'PACKAGE',
      entityId: id,
      details: `Deleted tour package "${pkg.packageName}" (${pkg.destination})`,
      ipAddress: req.ip,
    });

    res.json({ message: `Package "${pkg.packageName}" deleted successfully.` });
  } catch (error) {
    next(error);
  }
});

// AI Suggest Famous Places for Itinerary
router.post('/ai-suggest', async (req: AuthRequest, res: Response, next) => {
  try {
    const state = (req.body.state as string || '').trim();
    const district = (req.body.district as string || '').trim();

    // Comprehensive verified places database for top tourist destinations
    const baseSuggestions = [
      {
        id: 'place_ooty_lake',
        name: 'Ooty Lake & Boathouse',
        category: 'Sightseeing',
        state: 'Tamil Nadu',
        district: 'The Nilgiris (Ooty)',
        famousReason: 'Iconic artificial lake formed in 1824 offering scenic eucalyptus shores and pedal/motor boating.',
        suggestedDuration: '2 - 3 Hours',
        distanceFromCenter: '1.5 km from Town Center',
        imageUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80',
        views: [
          { label: 'Front View', url: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80' },
          { label: 'Side View', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80' },
          { label: 'Panorama View', url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80' },
          { label: 'Aerial View', url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80' },
        ],
        activities: ['Speed & Pedal Boating', 'Mini Toy Train Ride', 'Lakeside Photography', 'Bicycle Riding'],
      },
      {
        id: 'place_botanical_garden',
        name: 'Government Botanical Garden',
        category: 'Nature',
        state: 'Tamil Nadu',
        district: 'The Nilgiris (Ooty)',
        famousReason: 'Sprawling 55-acre heritage garden with over 1,000 exotic floral species and fossilized tree trunks.',
        suggestedDuration: '2 Hours',
        distanceFromCenter: '2.5 km from Town Center',
        imageUrl: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&auto=format&fit=crop&q=80',
        views: [
          { label: 'Front View', url: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&auto=format&fit=crop&q=80' },
          { label: 'Side View', url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop&q=80' },
          { label: 'Wide View', url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80' },
          { label: 'Top View', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80' },
        ],
        activities: ['Guided Botanical Walk', 'Visit Toda Tribal Mund', 'Glasshouse Flower Viewing', 'Family Picnic'],
      },
      {
        id: 'place_doddabetta_peak',
        name: 'Doddabetta Peak & Telescope House',
        category: 'Viewpoint',
        state: 'Tamil Nadu',
        district: 'The Nilgiris (Ooty)',
        famousReason: 'Highest peak in the Nilgiri hills at 2,637m with sweeping 360-degree vistas across Tamil Nadu and Karnataka.',
        suggestedDuration: '1.5 - 2 Hours',
        distanceFromCenter: '9 km from Ooty Town',
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
        views: [
          { label: 'Front View', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80' },
          { label: 'Side View', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80' },
          { label: 'Panorama View', url: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&auto=format&fit=crop&q=80' },
          { label: 'Aerial View', url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&auto=format&fit=crop&q=80' },
        ],
        activities: ['Telescope House Panorama', 'Valley Cloud Watching', 'Trek along Ridge', 'Tea Stall Experience'],
      },
      {
        id: 'place_pykara_falls',
        name: 'Pykara Waterfalls & Lake',
        category: 'Nature',
        state: 'Tamil Nadu',
        district: 'The Nilgiris (Ooty)',
        famousReason: 'Sacred river plunging through stepped waterfalls and pristine lake surrounded by shola forests.',
        suggestedDuration: '2.5 - 3 Hours',
        distanceFromCenter: '21 km from Ooty Town',
        imageUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
        views: [
          { label: 'Front View', url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80' },
          { label: 'Side View', url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&auto=format&fit=crop&q=80' },
          { label: 'Panorama View', url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb325?w=800&auto=format&fit=crop&q=80' },
          { label: 'Top View', url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80' },
        ],
        activities: ['High-speed Motor Boating', 'Waterfall Viewpoint Trek', 'Shola Forest Stroll', 'Nature Photography'],
      },
      {
        id: 'place_sims_park',
        name: "Sim's Park & Botanical Haven",
        category: 'Nature',
        state: 'Tamil Nadu',
        district: 'The Nilgiris (Ooty)',
        famousReason: 'Unique natural ravine garden in Coonoor with over 1,200 species of rare sub-tropical and temperate plants.',
        suggestedDuration: '1.5 Hours',
        distanceFromCenter: '18 km from Ooty (Coonoor)',
        imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
        views: [
          { label: 'Front View', url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80' },
          { label: 'Side View', url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop&q=80' },
          { label: 'Wide View', url: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&auto=format&fit=crop&q=80' },
          { label: 'Top View', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80' },
        ],
        activities: ['Rare Flora Exploration', 'Pedal Boating in Pond', 'Rose Garden Walk', 'Tree Canopy Stroll'],
      },
      {
        id: 'place_dolphin_nose',
        name: "Dolphin's Nose Viewpoint & Catherine Falls View",
        category: 'Viewpoint',
        state: 'Tamil Nadu',
        district: 'The Nilgiris (Ooty)',
        famousReason: 'Enormous cliff rock resembling a dolphin nose with dramatic views of Catherine Falls plunging 250ft.',
        suggestedDuration: '1 - 2 Hours',
        distanceFromCenter: '28 km from Ooty (Coonoor)',
        imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
        views: [
          { label: 'Front View', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80' },
          { label: 'Side View', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80' },
          { label: 'Wide View', url: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&auto=format&fit=crop&q=80' },
          { label: 'Top View', url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&auto=format&fit=crop&q=80' },
        ],
        activities: ['Panoramic Gorge Viewing', 'Catherine Falls Distant View', 'Tea Estate Drive', 'Bird Watching'],
      },
    ];

    // Read any custom saved places from DB
    let customPlaces: any[] = [];
    try {
      const setting = await prisma.companySetting.findUnique({
        where: { key: 'custom_destination_places' },
      });
      if (setting?.value) {
        customPlaces = JSON.parse(setting.value);
      }
    } catch {
      // quiet error
    }

    // Filter by requested state/district or return rich curated catalog
    let matched = [...baseSuggestions, ...customPlaces];
    if (district) {
      matched = matched.filter(
        p => p.district.toLowerCase().includes(district.toLowerCase()) ||
             p.state.toLowerCase().includes(state.toLowerCase())
      );
    }

    if (matched.length === 0) {
      // Fallback generic intelligent suggestions for other districts
      matched = [
        {
          id: `ai_${district}_center`,
          name: `${district} Heritage & Cultural Center`,
          category: 'Heritage',
          state: state || 'India',
          district: district || 'Tourist Destination',
          famousReason: `Renowned historic center celebrating the architecture and traditions of ${district}.`,
          suggestedDuration: '2 Hours',
          distanceFromCenter: 'Central Town',
          imageUrl: 'https://images.unsplash.com/photo-1566552881560-0be86c53957f?w=800&auto=format&fit=crop&q=80',
          views: [
            { label: 'Front View', url: 'https://images.unsplash.com/photo-1566552881560-0be86c53957f?w=800&auto=format&fit=crop&q=80' },
            { label: 'Side View', url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&auto=format&fit=crop&q=80' },
            { label: 'Panorama View', url: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800&auto=format&fit=crop&q=80' },
            { label: 'Top View', url: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&auto=format&fit=crop&q=80' },
          ],
          activities: ['Cultural Walk', 'Monument Exploration', 'Local Handicrafts', 'Photography'],
        },
        {
          id: `ai_${district}_viewpoint`,
          name: `${district} Scenic Viewpoint & Hills`,
          category: 'Viewpoint',
          state: state || 'India',
          district: district || 'Tourist Destination',
          famousReason: `Breathtaking high-altitude lookout offering magnificent sunrise and sunset panoramas.`,
          suggestedDuration: '2 - 3 Hours',
          distanceFromCenter: '8 km from Main Junction',
          imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
          views: [
            { label: 'Front View', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80' },
            { label: 'Side View', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80' },
            { label: 'Wide View', url: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&auto=format&fit=crop&q=80' },
            { label: 'Top View', url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&auto=format&fit=crop&q=80' },
          ],
          activities: ['Sunset Watching', 'Valley Photography', 'Nature Trek', 'Tea Tasting'],
        },
      ];
    }

    res.json({ places: matched });
  } catch (error) {
    next(error);
  }
});

// Get Custom / Master Saved Places
router.get('/destinations/places', async (req: AuthRequest, res: Response, next) => {
  try {
    const state = (req.query.state as string || '').trim();
    const district = (req.query.district as string || '').trim();

    const where: any = { isDeleted: false };
    if (state) where.state = { equals: state };
    if (district) where.district = { equals: district };

    const dbPlaces = await prisma.place.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const setting = await prisma.companySetting.findUnique({
      where: { key: 'custom_destination_places' },
    });

    let legacyPlaces: any[] = [];
    if (setting?.value) {
      try {
        legacyPlaces = JSON.parse(setting.value);
      } catch {}
    }

    if (state) legacyPlaces = legacyPlaces.filter(p => p.state?.toLowerCase() === state.toLowerCase());
    if (district) legacyPlaces = legacyPlaces.filter(p => p.district?.toLowerCase() === district.toLowerCase());

    const map = new Map<string, any>();
    dbPlaces.forEach((p) => {
      map.set(p.name.toLowerCase(), {
        id: p.id,
        name: p.name,
        state: p.state,
        district: p.district,
        category: p.category,
        famousReason: p.description || p.famousReason || '',
        suggestedDuration: p.suggestedDuration || '2 Hours',
        distanceFromCenter: p.distanceFromCenter || '',
        imageUrl: p.imageUrl,
        views: [
          { label: 'Front View', url: p.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80' },
          { label: 'Side View', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80' },
        ],
        activities: p.activities ? p.activities.split(',').map((a) => a.trim()).filter(Boolean) : ['Sightseeing', 'Photography'],
        notes: p.notes,
      });
    });

    legacyPlaces.forEach((p) => {
      if (!map.has(p.name.toLowerCase())) {
        map.set(p.name.toLowerCase(), p);
      }
    });

    res.json({ places: Array.from(map.values()) });
  } catch (error) {
    next(error);
  }
});

// Save Custom Place to DB (both Place table and company setting for backward compatibility)
router.post('/destinations/places', async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, state, district, description, imageUrl, views, category, suggestedDuration, distanceFromCenter, activities, notes } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Place name is required.' });
      return;
    }

    const cleanName = name.trim();
    const cleanState = (state || 'Tamil Nadu').trim();
    const cleanDistrict = (district || 'The Nilgiris (Ooty)').trim();

    // Check duplicate in DB
    let place = await prisma.place.findFirst({
      where: { name: cleanName, district: cleanDistrict, state: cleanState, isDeleted: false },
    });

    if (!place) {
      place = await prisma.place.create({
        data: {
          name: cleanName,
          state: cleanState,
          district: cleanDistrict,
          category: category || 'Sightseeing',
          description: description?.trim() || `${cleanName} - sightseeing destination in ${cleanDistrict}.`,
          famousReason: description?.trim() || `${cleanName} - curated destination.`,
          suggestedDuration: suggestedDuration || '2 Hours',
          distanceFromCenter: distanceFromCenter || 'Nearby',
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
          activities: Array.isArray(activities) ? activities.join(', ') : (activities || 'Sightseeing, Photography'),
          notes: notes || null,
          createdById: req.user?.id || null,
        },
      });
    }

    res.status(201).json({
      place: {
        id: place.id,
        name: place.name,
        state: place.state,
        district: place.district,
        category: place.category,
        famousReason: place.description || place.famousReason,
        suggestedDuration: place.suggestedDuration,
        distanceFromCenter: place.distanceFromCenter,
        imageUrl: place.imageUrl,
        views: views || [
          { label: 'Front View', url: place.imageUrl },
        ],
        activities: place.activities ? place.activities.split(',').map((a) => a.trim()).filter(Boolean) : ['Sightseeing', 'Photography'],
      },
      message: 'Custom place saved successfully.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
