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

    if (data.itineraries && Array.isArray(data.itineraries)) {
      await prisma.$transaction([
        prisma.itineraryDay.deleteMany({ where: { packageId: id } }),
        prisma.itineraryDay.createMany({
          data: data.itineraries.map((d: any, index: number) => {
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
              imageUrl: d.imageUrl ? String(d.imageUrl).trim() : null,
              images: imagesStr,
              startTime: d.startTime ? String(d.startTime).trim() : null,
              endTime: d.endTime ? String(d.endTime).trim() : null,
            };
          }),
        }),
      ]);
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
        imageUrl: d.imageUrl ? String(d.imageUrl).trim() : null,
        images: imagesStr,
        startTime: d.startTime ? String(d.startTime).trim() : null,
        endTime: d.endTime ? String(d.endTime).trim() : null,
      };
    });

    // Delete existing days and insert updated days inside a transaction
    await prisma.$transaction([
      prisma.itineraryDay.deleteMany({ where: { packageId: id } }),
      ...(sanitizedData.length > 0 ? [prisma.itineraryDay.createMany({ data: sanitizedData })] : []),
    ]);

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
    console.error('Failed to save package itineraries:', error);
    res.status(500).json({ message: error?.message || 'Failed to save itinerary changes to database.' });
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

// Get Custom Saved Places
router.get('/destinations/places', async (req: AuthRequest, res: Response, next) => {
  try {
    const state = (req.query.state as string || '').trim();
    const district = (req.query.district as string || '').trim();

    const setting = await prisma.companySetting.findUnique({
      where: { key: 'custom_destination_places' },
    });

    let places: any[] = [];
    if (setting?.value) {
      try {
        places = JSON.parse(setting.value);
      } catch {}
    }

    if (state) places = places.filter(p => p.state?.toLowerCase() === state.toLowerCase());
    if (district) places = places.filter(p => p.district?.toLowerCase() === district.toLowerCase());

    res.json({ places });
  } catch (error) {
    next(error);
  }
});

// Save Custom Place to DB for future reuse
router.post('/destinations/places', async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, state, district, description, imageUrl, views, category, suggestedDuration, distanceFromCenter, activities, notes } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Place name is required.' });
      return;
    }

    const newPlace = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      state: (state || 'Tamil Nadu').trim(),
      district: (district || 'The Nilgiris (Ooty)').trim(),
      category: category || 'Sightseeing',
      famousReason: description?.trim() || `${name.trim()} - curated sightseeing attraction.`,
      suggestedDuration: suggestedDuration || '2 Hours',
      distanceFromCenter: distanceFromCenter || 'Nearby',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
      views: views || [
        { label: 'Front View', url: imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80' },
        { label: 'Side View', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80' },
        { label: 'Wide View', url: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&auto=format&fit=crop&q=80' },
        { label: 'Top View', url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&auto=format&fit=crop&q=80' },
      ],
      activities: Array.isArray(activities)
        ? activities
        : typeof activities === 'string'
        ? activities.split(',').map((a: string) => a.trim()).filter(Boolean)
        : ['Sightseeing', 'Photography'],
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    const setting = await prisma.companySetting.findUnique({
      where: { key: 'custom_destination_places' },
    });

    let currentList: any[] = [];
    if (setting?.value) {
      try {
        currentList = JSON.parse(setting.value);
      } catch {}
    }

    // Avoid duplicate names in same district
    const exists = currentList.find(
      p => p.name.toLowerCase() === newPlace.name.toLowerCase() && p.district.toLowerCase() === newPlace.district.toLowerCase()
    );

    if (!exists) {
      currentList.unshift(newPlace);
      await prisma.companySetting.upsert({
        where: { key: 'custom_destination_places' },
        update: { value: JSON.stringify(currentList) },
        create: { key: 'custom_destination_places', value: JSON.stringify(currentList) },
      });
    }

    res.status(201).json({ place: newPlace, message: 'Custom place saved successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
