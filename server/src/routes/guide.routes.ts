import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// ==============================================================================
// 1. Guide Directory & Search
// ==============================================================================
router.get('/', requirePermission('guides', 'view'), async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '10', 10));
    const search = (req.query.search as string || '').trim();
    const guideType = (req.query.guideType as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const language = (req.query.language as string || '').trim();
    const expertise = (req.query.expertise as string || '').trim();

    const where: any = {
      companyId: req.user!.companyId,
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { guideCode: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { city: { contains: search } },
      ];
    }

    if (guideType) where.guideType = guideType;
    if (status) where.status = status;
    if (language) where.languages = { contains: language };
    if (expertise) where.expertise = { contains: expertise };

    const [total, guides] = await Promise.all([
      prisma.tourGuide.count({ where }),
      prisma.tourGuide.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, status: true, role: true } },
          _count: {
            select: {
              primaryAssignments: true,
              secondaryAssignments: true,
              documents: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      data: guides,
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

// ==============================================================================
// 2. Guide Dashboard
// ==============================================================================
router.get('/dashboard', requirePermission('guides', 'view'), async (req: AuthRequest, res: Response, next) => {
  try {
    const companyId = req.user!.companyId;
    const isGuideUser = req.user!.role === 'TOUR_GUIDE';
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let guideId: string | null = null;
    if (isGuideUser) {
      const guideProfile = await prisma.tourGuide.findFirst({
        where: { userId: req.user!.id, companyId },
      });
      if (!guideProfile) {
        res.status(404).json({ message: 'Guide profile not linked to this user account.' });
        return;
      }
      guideId = guideProfile.id;
    }

    // Common assignment filter
    const assignmentWhere: any = { companyId };
    if (guideId) {
      assignmentWhere.OR = [
        { primaryGuideId: guideId },
        { secondaryGuideId: guideId },
      ];
    }

    // Fetch Today's Tours, Upcoming Tours, Active Tours
    const [todayTours, upcomingTours, activeTours, completedCount, totalGuidesCount, onTourGuidesCount] = await Promise.all([
      prisma.tourAssignment.findMany({
        where: {
          ...assignmentWhere,
          startDate: { lte: endOfToday },
          endDate: { gte: startOfToday },
          status: { not: 'CANCELLED' },
        },
        include: {
          primaryGuide: { select: { id: true, fullName: true, phone: true } },
          package: { select: { id: true, packageName: true, destination: true } },
          booking: { select: { id: true, bookingNumber: true, travellers: true } },
          customer: { select: { id: true, fullName: true, phone: true, organizationName: true } },
        },
        orderBy: { reportingTime: 'asc' },
      }),
      prisma.tourAssignment.findMany({
        where: {
          ...assignmentWhere,
          startDate: { gt: endOfToday },
          status: { in: ['ASSIGNED', 'CONFIRMED'] },
        },
        include: {
          primaryGuide: { select: { id: true, fullName: true, phone: true } },
          package: { select: { id: true, packageName: true, destination: true } },
          booking: { select: { id: true, bookingNumber: true, travellers: true } },
          customer: { select: { id: true, fullName: true, phone: true, organizationName: true } },
        },
        take: 5,
        orderBy: { startDate: 'asc' },
      }),
      prisma.tourAssignment.findMany({
        where: {
          ...assignmentWhere,
          status: 'IN_PROGRESS',
        },
        include: {
          primaryGuide: { select: { id: true, fullName: true, phone: true } },
          package: { select: { id: true, packageName: true, destination: true } },
          booking: { select: { id: true, bookingNumber: true, travellers: true } },
        },
      }),
      prisma.tourAssignment.count({
        where: {
          ...assignmentWhere,
          status: 'COMPLETED',
        },
      }),
      prisma.tourGuide.count({ where: { companyId, status: 'ACTIVE' } }),
      prisma.tourAssignment.count({
        where: {
          companyId,
          status: 'IN_PROGRESS',
        },
      }),
    ]);

    // Total passengers under care for today
    const passengersToday = todayTours.reduce((sum, t) => sum + (t.passengerCount || 1), 0);

    res.json({
      metrics: {
        todayToursCount: todayTours.length,
        upcomingToursCount: upcomingTours.length,
        activeToursCount: activeTours.length,
        completedToursCount: completedCount,
        passengersToday,
        totalGuidesCount,
        onTourGuidesCount,
      },
      todayTours,
      upcomingTours,
      activeTours,
    });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 3. Tour Assignments Roster
// ==============================================================================
router.get('/assignments', requirePermission('guides', 'view'), async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '10', 10));
    const guideId = (req.query.guideId as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const search = (req.query.search as string || '').trim();
    const startDate = (req.query.startDate as string || '').trim();
    const endDate = (req.query.endDate as string || '').trim();

    const where: any = {
      companyId: req.user!.companyId,
    };

    // If guide user, restrict to their own assignments
    if (req.user!.role === 'TOUR_GUIDE') {
      const guideProfile = await prisma.tourGuide.findFirst({
        where: { userId: req.user!.id, companyId: req.user!.companyId },
      });
      if (guideProfile) {
        where.OR = [
          { primaryGuideId: guideProfile.id },
          { secondaryGuideId: guideProfile.id },
        ];
      } else {
        res.json({ data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
        return;
      }
    } else if (guideId) {
      where.OR = [
        { primaryGuideId: guideId },
        { secondaryGuideId: guideId },
      ];
    }

    if (status) where.status = status;
    if (startDate) where.startDate = { gte: new Date(startDate) };
    if (endDate) where.endDate = { lte: new Date(endDate) };

    if (search) {
      where.AND = [
        {
          OR: [
            { assignmentCode: { contains: search } },
            { destination: { contains: search } },
            { groupName: { contains: search } },
            { coordinatorName: { contains: search } },
            { primaryGuide: { fullName: { contains: search } } },
          ],
        },
      ];
    }

    const [total, assignments] = await Promise.all([
      prisma.tourAssignment.count({ where }),
      prisma.tourAssignment.findMany({
        where,
        include: {
          primaryGuide: { select: { id: true, guideCode: true, fullName: true, phone: true, photoUrl: true } },
          secondaryGuide: { select: { id: true, guideCode: true, fullName: true, phone: true } },
          package: { select: { id: true, packageName: true, destination: true, duration: true } },
          booking: { select: { id: true, bookingNumber: true, travellers: true, bookingStatus: true } },
          customer: { select: { id: true, fullName: true, phone: true, organizationName: true, customerType: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
    ]);

    res.json({
      data: assignments,
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

// ==============================================================================
// 4. Authorized Tour Manifest (Least-Privilege for Guides & Operations)
// ==============================================================================
router.get('/assignments/:id/manifest', requirePermission('guides', 'view'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const assignment = await prisma.tourAssignment.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
      include: {
        primaryGuide: { select: { id: true, guideCode: true, fullName: true, phone: true, photoUrl: true, languages: true } },
        secondaryGuide: { select: { id: true, guideCode: true, fullName: true, phone: true } },
        package: {
          select: {
            id: true,
            packageName: true,
            destination: true,
            duration: true,
            description: true,
            inclusions: true,
            exclusions: true,
            itineraries: {
              orderBy: { dayNumber: 'asc' },
              select: {
                id: true,
                dayNumber: true,
                title: true,
                description: true,
                activities: true,
                places: true,
                startTime: true,
                endTime: true,
                date: true,
                highlights: true,
                travelDetails: true,
                hotelName: true,
                hotelLocation: true,
                hotelStarCategory: true,
                hotelCheckIn: true,
                hotelCheckOut: true,
                mealPlan: true,
              },
            },
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            travelStartDate: true,
            travelEndDate: true,
            travellers: true,
            bookingStatus: true,
            travellersList: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                age: true,
                gender: true,
                idNumber: true,
                roleInTrip: true,
                emergencyContact: true,
                roomAllocation: true,
                notes: true,
                isPrimary: true,
              },
            },
            cabBookings: {
              select: {
                id: true,
                bookingReference: true,
                vehicleType: true,
                carNumber: true,
                driverName: true,
                driverPhone: true,
                pickupPlace: true,
                dropPlace: true,
                pickupDate: true,
                pickupTime: true,
                bookingStatus: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            organizationName: true,
            category: true,
            customerType: true,
            primaryContactName: true,
            primaryContactPhone: true,
          },
        },
      },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found.' });
      return;
    }

    // If request is from a Tour Guide, enforce IDOR least-privilege ownership check
    if (req.user!.role === 'TOUR_GUIDE') {
      const guideProfile = await prisma.tourGuide.findFirst({
        where: { userId: req.user!.id, companyId: req.user!.companyId },
      });
      if (!guideProfile || (assignment.primaryGuideId !== guideProfile.id && assignment.secondaryGuideId !== guideProfile.id)) {
        res.status(403).json({ message: 'Access denied: You are not authorized to view this tour manifest.' });
        return;
      }
    }

    res.json(assignment);
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 5. Create / Update Tour Assignment (With Overlap Warning & Override)
// ==============================================================================
const assignmentSchema = z.object({
  bookingId: z.string().optional().nullable(),
  packageId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  primaryGuideId: z.string().min(1, 'Primary guide is required'),
  secondaryGuideId: z.string().optional().nullable(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reportingTime: z.string().optional().nullable(),
  reportingLocation: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  passengerCount: z.number().int().min(1).default(1),
  groupName: z.string().optional().nullable(),
  coordinatorName: z.string().optional().nullable(),
  coordinatorPhone: z.string().optional().nullable(),
  status: z.string().default('ASSIGNED'),
  progressNotes: z.string().optional().nullable(),
  allowOverlapOverride: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

router.post('/assignments', requirePermission('guides', 'create'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = assignmentSchema.parse(req.body);
    const companyId = req.user!.companyId;
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    // Overlap check for primary guide
    const guideIds = [data.primaryGuideId];
    if (data.secondaryGuideId) guideIds.push(data.secondaryGuideId);

    const overlapping = await prisma.tourAssignment.findMany({
      where: {
        companyId,
        status: { in: ['ASSIGNED', 'CONFIRMED', 'IN_PROGRESS'] },
        OR: [
          { primaryGuideId: { in: guideIds } },
          { secondaryGuideId: { in: guideIds } },
        ],
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
      include: {
        primaryGuide: { select: { fullName: true } },
      },
    });

    if (overlapping.length > 0 && !data.allowOverlapOverride) {
      res.status(409).json({
        code: 'GUIDE_OVERLAP_DETECTED',
        message: `Date conflict: Guide has ${overlapping.length} overlapping tour(s) during these dates.`,
        conflicts: overlapping.map(c => ({
          assignmentCode: c.assignmentCode,
          dates: `${c.startDate.toISOString().split('T')[0]} to ${c.endDate.toISOString().split('T')[0]}`,
          guideName: c.primaryGuide.fullName,
          destination: c.destination,
        })),
        canOverride: true,
      });
      return;
    }

    // Auto-generate Assignment Code
    const count = await prisma.tourAssignment.count({ where: { companyId } });
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const assignmentCode = `ASN-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    const assignment = await prisma.tourAssignment.create({
      data: {
        companyId,
        assignmentCode,
        bookingId: data.bookingId || null,
        packageId: data.packageId || null,
        customerId: data.customerId || null,
        primaryGuideId: data.primaryGuideId,
        secondaryGuideId: data.secondaryGuideId || null,
        startDate: start,
        endDate: end,
        reportingTime: data.reportingTime?.trim() || null,
        reportingLocation: data.reportingLocation?.trim() || null,
        route: data.route?.trim() || null,
        destination: data.destination?.trim() || null,
        passengerCount: data.passengerCount,
        groupName: data.groupName?.trim() || null,
        coordinatorName: data.coordinatorName?.trim() || null,
        coordinatorPhone: data.coordinatorPhone?.trim() || null,
        status: data.status || 'ASSIGNED',
        progressNotes: data.progressNotes?.trim() || null,
        allowOverlapOverride: data.allowOverlapOverride,
        assignedById: req.user!.id,
        notes: data.notes?.trim() || null,
      },
      include: {
        primaryGuide: { select: { id: true, fullName: true, phone: true } },
      },
    });

    // Record Activity
    await prisma.guideActivity.create({
      data: {
        companyId,
        guideId: data.primaryGuideId,
        assignmentId: assignment.id,
        activityType: 'ASSIGNMENT',
        description: `Assigned to tour ${assignment.assignmentCode} (${assignment.destination || 'Tour'}) from ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
        performedById: req.user!.id,
        performedByName: req.user!.name,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'CREATE',
      entity: 'TOUR_ASSIGNMENT',
      entityId: assignment.id,
      details: `Created tour assignment ${assignment.assignmentCode} for guide ${assignment.primaryGuide.fullName}`,
      newValue: assignment,
      ipAddress: req.ip,
    });

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
});

// Update Assignment Details
router.put('/assignments/:id', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    const assignment = await prisma.tourAssignment.update({
      where: { id },
      data: {
        status: data.status,
        reportingTime: data.reportingTime,
        reportingLocation: data.reportingLocation,
        route: data.route,
        destination: data.destination,
        passengerCount: data.passengerCount ? Number(data.passengerCount) : undefined,
        groupName: data.groupName,
        coordinatorName: data.coordinatorName,
        coordinatorPhone: data.coordinatorPhone,
        progressNotes: data.progressNotes,
        notes: data.notes,
      },
    });

    res.json(assignment);
  } catch (error) {
    next(error);
  }
});

// Progress Update & Emergency Reporting by Guide
router.patch('/assignments/:id/progress', requirePermission('guides', 'progress'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { progressNotes, emergencyReported, emergencyNotes, status } = req.body;

    const updateData: any = {};
    if (progressNotes !== undefined) updateData.progressNotes = progressNotes;
    if (emergencyReported !== undefined) updateData.emergencyReported = Boolean(emergencyReported);
    if (emergencyNotes !== undefined) updateData.emergencyNotes = emergencyNotes;
    if (status) updateData.status = status;

    const assignment = await prisma.tourAssignment.update({
      where: { id },
      data: updateData,
      include: { primaryGuide: { select: { fullName: true } } },
    });

    if (emergencyReported) {
      await prisma.guideActivity.create({
        data: {
          companyId: req.user!.companyId,
          guideId: assignment.primaryGuideId,
          assignmentId: assignment.id,
          activityType: 'INCIDENT_REPORT',
          description: `🚨 Emergency/Issue Reported: ${emergencyNotes || 'Emergency logged by guide'}`,
          performedById: req.user!.id,
          performedByName: req.user!.name,
        },
      });
    }

    res.json(assignment);
  } catch (error) {
    next(error);
  }
});

// Complete Tour Assignment
router.post('/assignments/:id/complete', requirePermission('guides', 'complete'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { completionReport } = req.body;

    const assignment = await prisma.tourAssignment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completionReport: completionReport?.trim() || 'Tour successfully completed by guide.',
      },
    });

    await prisma.guideActivity.create({
      data: {
        companyId: req.user!.companyId,
        guideId: assignment.primaryGuideId,
        assignmentId: assignment.id,
        activityType: 'TOUR_COMPLETED',
        description: `Tour ${assignment.assignmentCode} completed. Completion report submitted.`,
        performedById: req.user!.id,
        performedByName: req.user!.name,
      },
    });

    res.json({ message: 'Tour marked as completed successfully.', assignment });
  } catch (error) {
    next(error);
  }
});



// ==============================================================================
// 5b. Guide Availability Roster (Calendar / Monthly Roster)
// ==============================================================================
router.get('/roster', requirePermission('guides', 'view'), async (req: AuthRequest, res: Response, next) => {
  try {
    const companyId = req.user!.companyId;
    const isGuideUser = req.user!.role === 'TOUR_GUIDE';

    const now = new Date();
    const year = parseInt((req.query.year as string) || String(now.getFullYear()), 10);
    const month = parseInt((req.query.month as string) || String(now.getMonth() + 1), 10); // 1-12

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const guideWhere: any = {
      companyId,
      status: 'ACTIVE',
    };

    if (isGuideUser) {
      guideWhere.userId = req.user!.id;
    }

    const guides = await prisma.tourGuide.findMany({
      where: guideWhere,
      include: {
        availabilities: {
          where: {
            OR: [
              { startDate: { lte: endDate }, endDate: { gte: startDate } },
            ],
          },
          orderBy: { startDate: 'asc' },
        },
        primaryAssignments: {
          where: {
            status: { in: ['ASSIGNED', 'CONFIRMED', 'IN_PROGRESS'] },
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
          select: {
            id: true,
            assignmentCode: true,
            destination: true,
            groupName: true,
            startDate: true,
            endDate: true,
            status: true,
            passengerCount: true,
          },
          orderBy: { startDate: 'asc' },
        },
        secondaryAssignments: {
          where: {
            status: { in: ['ASSIGNED', 'CONFIRMED', 'IN_PROGRESS'] },
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
          select: {
            id: true,
            assignmentCode: true,
            destination: true,
            groupName: true,
            startDate: true,
            endDate: true,
            status: true,
            passengerCount: true,
          },
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    res.json({
      year,
      month,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysInMonth: endDate.getDate(),
      guides,
    });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 6. Guide Profile Detail, Create & Edit
// ==============================================================================
router.get('/:id', requirePermission('guides', 'view'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const guide = await prisma.tourGuide.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: {
        user: { select: { id: true, email: true, status: true, role: true, lastLoginAt: true } },
        documents: { orderBy: { createdAt: 'desc' } },
        availabilities: { orderBy: { startDate: 'desc' }, take: 15 },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        primaryAssignments: {
          orderBy: { startDate: 'desc' },
          take: 10,
          include: {
            package: { select: { packageName: true, destination: true } },
            booking: { select: { bookingNumber: true, travellers: true } },
          },
        },
      },
    });

    if (!guide) {
      res.status(404).json({ message: 'Tour guide not found.' });
      return;
    }

    res.json(guide);
  } catch (error) {
    next(error);
  }
});

const guideSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(8, 'Valid phone number is required'),
  alternatePhone: z.string().optional().nullable(),
  email: z.string().email('Valid email is required').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().default('India'),
  pincode: z.string().optional().nullable(),
  languages: z.any().optional().nullable(), // Array or string
  expertise: z.string().optional().nullable(),
  destinations: z.string().optional().nullable(),
  experienceYears: z.number().optional().default(0),
  guideType: z.string().default('FREELANCE'),
  dailyRate: z.number().optional().default(0),
  perTripRate: z.number().optional().default(0),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyContactRelation: z.string().optional().nullable(),
  qualifications: z.string().optional().nullable(),
  badgeNumber: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  licenseExpiry: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  status: z.string().default('ACTIVE'),
  notes: z.string().optional().nullable(),
});

// Create Guide
router.post('/', requirePermission('guides', 'create'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = guideSchema.parse(req.body);
    const companyId = req.user!.companyId;

    // Check duplicate phone
    const existing = await prisma.tourGuide.findFirst({
      where: { phone: data.phone.trim(), companyId },
    });
    if (existing) {
      res.status(400).json({ message: `A guide with phone "${data.phone}" already exists (${existing.fullName}).` });
      return;
    }

    // Auto-generate Guide Code (e.g. GD-001)
    const count = await prisma.tourGuide.count({ where: { companyId } });
    const guideCode = `GD-${String(count + 1).padStart(3, '0')}`;

    const languagesStr = Array.isArray(data.languages)
      ? JSON.stringify(data.languages)
      : typeof data.languages === 'string'
      ? data.languages
      : null;

    const guide = await prisma.tourGuide.create({
      data: {
        companyId,
        guideCode,
        fullName: data.fullName.trim(),
        photoUrl: data.photoUrl || null,
        phone: data.phone.trim(),
        alternatePhone: data.alternatePhone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        country: data.country || 'India',
        pincode: data.pincode?.trim() || null,
        languages: languagesStr,
        expertise: data.expertise?.trim() || null,
        destinations: data.destinations?.trim() || null,
        experienceYears: Number(data.experienceYears) || 0,
        guideType: data.guideType || 'FREELANCE',
        dailyRate: Number(data.dailyRate) || 0,
        perTripRate: Number(data.perTripRate) || 0,
        emergencyContactName: data.emergencyContactName?.trim() || null,
        emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
        emergencyContactRelation: data.emergencyContactRelation?.trim() || null,
        qualifications: data.qualifications?.trim() || null,
        badgeNumber: data.badgeNumber?.trim() || null,
        licenseNumber: data.licenseNumber?.trim() || null,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
        status: data.status || 'ACTIVE',
        notes: data.notes?.trim() || null,
      },
    });

    await prisma.guideActivity.create({
      data: {
        companyId,
        guideId: guide.id,
        activityType: 'STATUS_CHANGE',
        description: `Guide profile created with ID ${guide.guideCode}`,
        performedById: req.user!.id,
        performedByName: req.user!.name,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'CREATE',
      entity: 'TOUR_GUIDE',
      entityId: guide.id,
      details: `Created tour guide ${guide.fullName} (${guide.guideCode})`,
      newValue: guide,
      ipAddress: req.ip,
    });

    res.status(201).json(guide);
  } catch (error) {
    next(error);
  }
});

// Update Guide Profile
router.put('/:id', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const data = guideSchema.partial().parse(req.body);

    const languagesStr = data.languages !== undefined
      ? Array.isArray(data.languages) ? JSON.stringify(data.languages) : String(data.languages)
      : undefined;

    const guide = await prisma.tourGuide.update({
      where: { id },
      data: {
        fullName: data.fullName?.trim(),
        photoUrl: data.photoUrl,
        phone: data.phone?.trim(),
        alternatePhone: data.alternatePhone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        country: data.country,
        pincode: data.pincode?.trim() || null,
        languages: languagesStr,
        expertise: data.expertise?.trim() || null,
        destinations: data.destinations?.trim() || null,
        experienceYears: data.experienceYears !== undefined ? Number(data.experienceYears) : undefined,
        guideType: data.guideType,
        dailyRate: data.dailyRate !== undefined ? Number(data.dailyRate) : undefined,
        perTripRate: data.perTripRate !== undefined ? Number(data.perTripRate) : undefined,
        emergencyContactName: data.emergencyContactName?.trim() || null,
        emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
        emergencyContactRelation: data.emergencyContactRelation?.trim() || null,
        qualifications: data.qualifications?.trim() || null,
        badgeNumber: data.badgeNumber?.trim() || null,
        licenseNumber: data.licenseNumber?.trim() || null,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : undefined,
        status: data.status,
        notes: data.notes?.trim() || null,
      },
    });

    res.json(guide);
  } catch (error) {
    next(error);
  }
});

// Soft-deactivate Guide
router.delete('/:id', requirePermission('guides', 'delete'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const guide = await prisma.tourGuide.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    // Also deactivate user account if linked
    if (guide.userId) {
      await prisma.user.update({
        where: { id: guide.userId },
        data: { status: 'INACTIVE' },
      });
    }

    res.json({ message: 'Guide profile marked as inactive successfully.' });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 7. Guide Account Activation / Suspension (Decoupled Login Activation)
// ==============================================================================
router.post('/:id/account', requirePermission('guides', 'create'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { password, email } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ message: 'A secure password of at least 6 characters is required.' });
      return;
    }

    const guide = await prisma.tourGuide.findFirst({
      where: { id, companyId: req.user!.companyId },
    });

    if (!guide) {
      res.status(404).json({ message: 'Guide profile not found.' });
      return;
    }

    const targetEmail = (email || guide.email || '').trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      res.status(400).json({ message: 'A valid email address is required to activate CRM login for this guide.' });
      return;
    }

    // Check duplicate user
    const existingUser = await prisma.user.findUnique({ where: { email: targetEmail } });
    if (existingUser && existingUser.id !== guide.userId) {
      res.status(400).json({ message: `A user account with email "${targetEmail}" is already registered.` });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    if (guide.userId) {
      user = await prisma.user.update({
        where: { id: guide.userId },
        data: {
          email: targetEmail,
          passwordHash,
          status: 'ACTIVE',
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: guide.fullName,
          email: targetEmail,
          passwordHash,
          phone: guide.phone,
          role: 'TOUR_GUIDE',
          status: 'ACTIVE',
          companyId: req.user!.companyId,
          permissions: JSON.stringify(['guides:view', 'guides:report', 'guides:progress', 'guides:complete', 'dashboard:view']),
        },
      });

      await prisma.tourGuide.update({
        where: { id: guide.id },
        data: { userId: user.id, email: targetEmail },
      });
    }

    await prisma.guideActivity.create({
      data: {
        companyId: req.user!.companyId,
        guideId: guide.id,
        activityType: 'LOGIN_ACTIVATED',
        description: `CRM portal login activated with email ${targetEmail}`,
        performedById: req.user!.id,
        performedByName: req.user!.name,
      },
    });

    res.json({ message: 'Guide login activated successfully.', user: { id: user.id, email: user.email, status: user.status } });
  } catch (error) {
    next(error);
  }
});

// Activate / Suspend Guide Account
router.patch('/:id/account-status', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body; // ACTIVE, SUSPENDED, INACTIVE

    const guide = await prisma.tourGuide.findFirst({
      where: { id, companyId: req.user!.companyId },
    });

    if (!guide || !guide.userId) {
      res.status(404).json({ message: 'Guide profile has no active login account.' });
      return;
    }

    await prisma.user.update({
      where: { id: guide.userId },
      data: { status },
    });

    await prisma.tourGuide.update({
      where: { id: guide.id },
      data: { status: status === 'ACTIVE' ? 'ACTIVE' : status === 'SUSPENDED' ? 'SUSPENDED' : 'INACTIVE' },
    });

    await prisma.guideActivity.create({
      data: {
        companyId: req.user!.companyId,
        guideId: guide.id,
        activityType: 'STATUS_CHANGE',
        description: `Account status updated to ${status}`,
        performedById: req.user!.id,
        performedByName: req.user!.name,
      },
    });

    res.json({ message: `Guide login account status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 8. Documents & Availability Sub-APIs
// ==============================================================================
router.post('/:id/documents', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const guideId = req.params.id as string;
    const { documentType, title, fileUrl, fileName, fileSize, mimeType, expiryDate } = req.body;

    const doc = await prisma.guideDocument.create({
      data: {
        companyId: req.user!.companyId,
        guideId,
        documentType: documentType || 'ID_PROOF',
        title: title || 'Document',
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        verificationStatus: 'VERIFIED',
        verifiedBy: req.user!.name,
      },
    });

    await prisma.guideActivity.create({
      data: {
        companyId: req.user!.companyId,
        guideId,
        activityType: 'DOCUMENT_UPLOAD',
        description: `Uploaded document: ${doc.title} (${doc.documentType})`,
        performedById: req.user!.id,
        performedByName: req.user!.name,
      },
    });

    res.status(201).json(doc);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/documents/:docId', requirePermission('guides', 'delete'), async (req: AuthRequest, res: Response, next) => {
  try {
    const docId = req.params.docId as string;
    await prisma.guideDocument.delete({ where: { id: docId } });
    res.json({ message: 'Document removed successfully.' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/availability', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const guideId = req.params.id as string;
    const { startDate, endDate, status, reason } = req.body;

    const slot = await prisma.guideAvailability.create({
      data: {
        companyId: req.user!.companyId,
        guideId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'AVAILABLE',
        reason: reason?.trim() || null,
      },
    });

    res.status(201).json(slot);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/availability/:availId', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const availId = req.params.availId as string;
    await prisma.guideAvailability.delete({ where: { id: availId } });
    res.json({ message: 'Availability block removed.' });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 7. Tour & Passenger Expense Management & Cost Splitting
// ==============================================================================

// Fetch all expenses and passenger settlement matrix for an assigned tour
router.get('/assignments/:id/expenses', requirePermission('guides', 'view'), async (req: AuthRequest, res: Response, next) => {
  try {
    const assignmentId = req.params.id as string;
    const companyId = req.user!.companyId;

    // Verify assignment exists and belongs to company (or user has guide assignment)
    const assignment = await prisma.tourAssignment.findFirst({
      where: {
        id: assignmentId,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            travellers: true,
            travellersList: true,
          },
        },
        primaryGuide: {
          select: {
            id: true,
            userId: true,
            fullName: true,
          },
        },
      },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found or access restricted.' });
      return;
    }

    // Role-based IDOR prevention: If logged in as TOUR_GUIDE, must be assigned to this tour
    if (req.user!.role === 'TOUR_GUIDE') {
      const guideProfile = await prisma.tourGuide.findFirst({
        where: { userId: req.user!.id },
      });
      if (!guideProfile || (assignment.primaryGuideId !== guideProfile.id && assignment.secondaryGuideId !== guideProfile.id)) {
        res.status(403).json({ message: 'Access denied: You are not assigned to manage expenses for this tour.' });
        return;
      }
    }

    // Fetch all recorded expenses for this assignment
    const expenses = await prisma.tourExpense.findMany({
      where: { assignmentId },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });

    // Extract manifest passengers from booking
    const travellers = (assignment.booking?.travellersList as any[]) || [];
    const passengerCount = assignment.passengerCount || (travellers.length > 0 ? travellers.length : 1);

    // Totals calculations
    const totalTourExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalGeneralExpenses = expenses
      .filter((e) => e.expenseType === 'GENERAL')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalSharedSplitExpenses = expenses
      .filter((e) => e.expenseType === 'GENERAL' && e.splitType === 'SPLIT_EQUALLY')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalPassengerExpenses = expenses
      .filter((e) => e.expenseType === 'PASSENGER')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const passengerExpensesCount = expenses.filter((e) => e.expenseType === 'PASSENGER').length;

    // Per passenger shared portion
    const perPassengerSharedCost = passengerCount > 0 ? Math.round((totalSharedSplitExpenses / passengerCount) * 100) / 100 : 0;

    // Build passenger breakdown matrix
    const passengerMap = new Map<string, {
      passengerId: string;
      passengerName: string;
      passengerRole?: string;
      roomNumber?: string;
      phone?: string;
      expenses: any[];
      individualTotal: number;
    }>();

    // Initialize with manifest travellers
    travellers.forEach((t: any, idx: number) => {
      const pId = t.id || `traveller-${idx + 1}`;
      passengerMap.set(pId, {
        passengerId: pId,
        passengerName: t.name || `Traveller #${idx + 1}`,
        passengerRole: t.roleInTrip || 'Traveller',
        roomNumber: t.roomAllocation || '',
        phone: t.phone || '',
        expenses: [],
        individualTotal: 0,
      });
    });

    // Map passenger expenses
    expenses.forEach((e) => {
      if (e.expenseType === 'PASSENGER') {
        const pId = e.passengerId || e.passengerName || 'unassigned';
        if (!passengerMap.has(pId)) {
          passengerMap.set(pId, {
            passengerId: pId,
            passengerName: e.passengerName || 'Traveller',
            passengerRole: e.passengerRole || 'Traveller',
            roomNumber: e.roomNumber || '',
            phone: '',
            expenses: [],
            individualTotal: 0,
          });
        }
        const pRecord = passengerMap.get(pId)!;
        pRecord.expenses.push(e);
        pRecord.individualTotal += Number(e.amount || 0);
      }
    });

    // Build finalized breakdown list
    const passengerBreakdown = Array.from(passengerMap.values()).map((p) => {
      const settledAmount = p.expenses
        .filter((e) => e.settledWithCustomer)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const totalPayable = p.individualTotal + perPassengerSharedCost;
      const pendingAmount = Math.max(0, totalPayable - settledAmount);

      let settlementStatus: 'UNSETTLED' | 'PARTIAL' | 'PAID' = 'UNSETTLED';
      if (totalPayable > 0 && settledAmount >= totalPayable) {
        settlementStatus = 'PAID';
      } else if (settledAmount > 0) {
        settlementStatus = 'PARTIAL';
      }

      return {
        passengerId: p.passengerId,
        passengerName: p.passengerName,
        passengerRole: p.passengerRole,
        roomNumber: p.roomNumber,
        phone: p.phone,
        expenses: p.expenses,
        individualExpenses: p.expenses,
        individualTotal: Math.round(p.individualTotal * 100) / 100,
        sharedPortion: perPassengerSharedCost,
        sharedSplitCost: perPassengerSharedCost,
        totalPayable: Math.round(totalPayable * 100) / 100,
        settledAmount: Math.round(settledAmount * 100) / 100,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        settlementStatus,
        isSettled: settlementStatus === 'PAID',
      };
    });

    res.json({
      totalTourExpenses: Math.round(totalTourExpenses * 100) / 100,
      totalGeneralExpenses: Math.round(totalGeneralExpenses * 100) / 100,
      totalSharedSplitExpenses: Math.round(totalSharedSplitExpenses * 100) / 100,
      totalPassengerExpenses: Math.round(totalPassengerExpenses * 100) / 100,
      passengerExpensesCount,
      passengerCount,
      perPassengerSharedCost,
      passengerBreakdown,
      expenses,
    });
  } catch (error) {
    next(error);
  }
});

// Record a new tour expense (Customer Extra or General Shared Item)
router.post('/assignments/:id/expenses', requirePermission('guides', 'expense'), async (req: AuthRequest, res: Response, next) => {
  try {
    const assignmentId = req.params.id as string;
    const companyId = req.user!.companyId;
    const body = req.body;

    const assignment = await prisma.tourAssignment.findFirst({
      where: {
        id: assignmentId,
        ...(companyId ? { companyId } : {}),
      },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found.' });
      return;
    }

    if (!body.title || !body.title.trim()) {
      res.status(400).json({ message: 'Expense title is required.' });
      return;
    }

    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ message: 'Expense amount must be a positive number.' });
      return;
    }

    const expenseType = body.expenseType === 'GENERAL' ? 'GENERAL' : 'PASSENGER';

    const expense = await prisma.tourExpense.create({
      data: {
        assignment: { connect: { id: assignmentId } },
        company: assignment.companyId ? { connect: { id: assignment.companyId } } : undefined,
        bookingId: assignment.bookingId || null,
        guide: assignment.primaryGuideId ? { connect: { id: assignment.primaryGuideId } } : undefined,
        expenseType,
        passengerId: expenseType === 'PASSENGER' ? body.passengerId || null : null,
        passengerName: expenseType === 'PASSENGER' ? body.passengerName?.trim() || null : null,
        passengerRole: expenseType === 'PASSENGER' ? body.passengerRole?.trim() || null : null,
        roomNumber: expenseType === 'PASSENGER' ? body.roomNumber?.trim() || null : null,
        splitType: expenseType === 'GENERAL' ? body.splitType || 'SPLIT_EQUALLY' : 'NO_SPLIT',
        category: body.category || (expenseType === 'GENERAL' ? 'WATER_BOTTLE' : 'MISCELLANEOUS'),
        title: body.title.trim(),
        amount,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
        expenseTime: body.expenseTime?.trim() || null,
        receiptNumber: body.receiptNumber?.trim() || null,
        receiptUrl: body.receiptUrl?.trim() || null,
        notes: body.notes?.trim() || null,
        settlementStatus: 'UNSETTLED',
        settledWithCustomer: false,
        recordedById: req.user!.id,
        recordedByName: req.user!.name,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'CREATE',
      entity: 'TOUR_EXPENSE',
      entityId: expense.id,
      details: `Logged ${expenseType} expense "${expense.title}" for ₹${expense.amount} on assignment ${assignment.assignmentCode}`,
      newValue: expense,
      ipAddress: req.ip,
    });

    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

// Update an existing tour expense
router.put('/assignments/:id/expenses/:expenseId', requirePermission('guides', 'expense'), async (req: AuthRequest, res: Response, next) => {
  try {
    const assignmentId = req.params.id as string;
    const expenseId = req.params.expenseId as string;
    const body = req.body;

    const existing = await prisma.tourExpense.findFirst({
      where: { id: expenseId, assignmentId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Tour expense record not found.' });
      return;
    }

    const updated = await prisma.tourExpense.update({
      where: { id: expenseId },
      data: {
        title: body.title !== undefined ? body.title.trim() : undefined,
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        category: body.category || undefined,
        splitType: body.splitType || undefined,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
        expenseTime: body.expenseTime !== undefined ? body.expenseTime : undefined,
        receiptNumber: body.receiptNumber !== undefined ? body.receiptNumber : undefined,
        receiptUrl: body.receiptUrl !== undefined ? body.receiptUrl : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        roomNumber: body.roomNumber !== undefined ? body.roomNumber : undefined,
        passengerName: body.passengerName !== undefined ? body.passengerName : undefined,
        passengerRole: body.passengerRole !== undefined ? body.passengerRole : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete a tour expense
router.delete('/assignments/:id/expenses/:expenseId', requirePermission('guides', 'expense'), async (req: AuthRequest, res: Response, next) => {
  try {
    const assignmentId = req.params.id as string;
    const expenseId = req.params.expenseId as string;

    const existing = await prisma.tourExpense.findFirst({
      where: { id: expenseId, assignmentId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Tour expense record not found.' });
      return;
    }

    await prisma.tourExpense.delete({
      where: { id: expenseId },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId: req.user!.companyId,
      action: 'DELETE',
      entity: 'TOUR_EXPENSE',
      entityId: expenseId,
      details: `Deleted tour expense "${existing.title}" (₹${existing.amount})`,
      oldValue: existing,
      ipAddress: req.ip,
    });

    res.json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// Toggle settlement status for a specific expense
router.patch('/assignments/:id/expenses/:expenseId/settle', requirePermission('guides', 'expense'), async (req: AuthRequest, res: Response, next) => {
  try {
    const assignmentId = req.params.id as string;
    const expenseId = req.params.expenseId as string;
    const { settledWithCustomer, settledNotes } = req.body;

    const existing = await prisma.tourExpense.findFirst({
      where: { id: expenseId, assignmentId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Tour expense record not found.' });
      return;
    }

    const isSettled = settledWithCustomer !== undefined ? Boolean(settledWithCustomer) : !existing.settledWithCustomer;

    const updated = await prisma.tourExpense.update({
      where: { id: expenseId },
      data: {
        settledWithCustomer: isSettled,
        settlementStatus: isSettled ? 'PAID' : 'UNSETTLED',
        settledAt: isSettled ? new Date() : null,
        settledAmount: isSettled ? existing.amount : 0,
        settledNotes: settledNotes !== undefined ? settledNotes : existing.settledNotes,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Settle all expenses for a specific passenger in one click
router.post('/assignments/:id/expenses/settle-passenger', requirePermission('guides', 'expense'), async (req: AuthRequest, res: Response, next) => {
  try {
    const assignmentId = req.params.id as string;
    const { passengerId, notes } = req.body;

    if (!passengerId) {
      res.status(400).json({ message: 'passengerId is required.' });
      return;
    }

    const updated = await prisma.tourExpense.updateMany({
      where: {
        assignmentId,
        passengerId,
      },
      data: {
        settledWithCustomer: true,
        settlementStatus: 'PAID',
        settledAt: new Date(),
        settledNotes: notes || `Settled in full with customer on ${new Date().toLocaleDateString()}`,
      },
    });

    res.json({
      message: `Successfully marked ${updated.count} expense(s) settled for passenger.`,
      settledCount: updated.count,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
