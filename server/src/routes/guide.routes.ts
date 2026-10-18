import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { sendStaffWelcomeEmail } from '../services/email.service.js';

const router = Router();

// ==============================================================================
// PUBLIC ENDPOINTS: Customer Trip Self-Registration (No Login Required)
// ==============================================================================
router.get('/public-registration/:id', async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const assignment = await prisma.tourAssignment.findFirst({
      where: {
        OR: [
          { id: rawId },
          { assignmentCode: rawId },
        ],
      },
      include: {
        primaryGuide: { select: { fullName: true, phone: true, photoUrl: true, languages: true } },
        package: { select: { packageName: true, destination: true, duration: true } },
        company: { select: { name: true, logoUrl: true, phone: true, email: true, website: true } },
        booking: { select: { bookingNumber: true, travellers: true } },
      },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found or expired registration link.' });
      return;
    }

    let passengersCount = assignment.passengerCount || 0;
    if (assignment.customPassengers) {
      try {
        const cp = JSON.parse(assignment.customPassengers);
        if (Array.isArray(cp)) passengersCount = Math.max(passengersCount, cp.length);
      } catch {}
    }

    res.json({
      id: assignment.id,
      assignmentCode: assignment.assignmentCode,
      groupName: assignment.groupName || assignment.package?.packageName || 'Tour Group',
      destination: assignment.destination || assignment.package?.destination || 'Karnataka',
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      reportingTime: assignment.reportingTime,
      reportingLocation: assignment.reportingLocation,
      route: assignment.route,
      primaryGuide: assignment.primaryGuide,
      company: assignment.company,
      passengerCount: passengersCount,
    });
  } catch (err) {
    next(err);
  }
});

const publicRegistrationSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  phone: z.string().min(8, 'Valid phone number is required'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  age: z.coerce.number().min(1, 'Please enter a valid age').max(120),
  gender: z.string().optional().default('Male'),
  roleInTrip: z.string().optional().default('Traveller'),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  dietaryPreference: z.string().optional().default('Veg'),
  medicalNotes: z.string().optional().nullable(),
  idProofType: z.string().optional().nullable(),
  idProofNumber: z.string().optional().nullable(),
  roomAllocation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post('/public-registration/:id', async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const data = publicRegistrationSchema.parse(req.body);

    const assignment = await prisma.tourAssignment.findFirst({
      where: {
        OR: [
          { id: rawId },
          { assignmentCode: rawId },
        ],
      },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found or invalid link.' });
      return;
    }

    let currentPassengers: any[] = [];
    if (assignment.customPassengers) {
      try {
        const parsed = JSON.parse(assignment.customPassengers);
        if (Array.isArray(parsed)) currentPassengers = parsed;
      } catch {}
    }

    // Check if passenger with same phone or name already registered
    const exists = currentPassengers.some(
      (p) => p.phone === data.phone.trim() || p.name.toLowerCase() === data.name.trim().toLowerCase()
    );

    if (exists) {
      res.status(400).json({ message: 'A traveller with this name or mobile number is already registered for this tour.' });
      return;
    }

    const newPassenger = {
      id: `pax-reg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      age: data.age,
      gender: data.gender || 'Male',
      roleInTrip: data.roleInTrip || 'Traveller',
      emergencyContact: data.emergencyContactPhone ? `${data.emergencyContactName || 'Emergency'}: ${data.emergencyContactPhone}` : null,
      bloodGroup: data.bloodGroup || null,
      dietaryPreference: data.dietaryPreference || 'Veg',
      medicalNotes: data.medicalNotes?.trim() || null,
      idProofType: data.idProofType || null,
      idProofNumber: data.idProofNumber?.trim() || null,
      roomAllocation: data.roomAllocation?.trim() || null,
      notes: [
        data.dietaryPreference ? `Diet: ${data.dietaryPreference}` : '',
        data.bloodGroup ? `Blood: ${data.bloodGroup}` : '',
        data.medicalNotes ? `Medical: ${data.medicalNotes}` : '',
        data.notes ? data.notes : '',
      ].filter(Boolean).join(' | ') || null,
      registeredVia: 'CUSTOMER_PUBLIC_FORM',
      registeredAt: new Date().toISOString(),
    };

    currentPassengers.push(newPassenger);

    await prisma.tourAssignment.update({
      where: { id: assignment.id },
      data: {
        customPassengers: JSON.stringify(currentPassengers),
        passengerCount: Math.max(assignment.passengerCount, currentPassengers.length),
      },
    });

    res.status(201).json({
      success: true,
      message: `Thank you, ${data.name}! Your registration has been submitted successfully.`,
      passenger: newPassenger,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ message: err.errors[0]?.message || 'Invalid form data.' });
      return;
    }
    next(err);
  }
});

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

    // Merge package if assignment.package was null but booking.package exists
    const effectivePackage = assignment.package || assignment.booking?.package || null;
    const effectiveCustomer = assignment.customer || assignment.booking?.customer || null;

    // Combine custom day-by-day itinerary if stored
    let combinedItineraries = effectivePackage?.itineraries ? [...effectivePackage.itineraries] : [];
    if (assignment.customItinerary) {
      try {
        const parsed = JSON.parse(assignment.customItinerary);
        if (Array.isArray(parsed) && parsed.length > 0) {
          combinedItineraries = parsed;
        }
      } catch (e) {
        console.warn('Failed to parse customItinerary:', e);
      }
    }

    // Combine travellers: booking travellers + custom passengers
    let combinedPassengers: any[] = assignment.booking?.travellersList ? [...assignment.booking.travellersList] : [];
    if (assignment.customPassengers) {
      try {
        const parsed = JSON.parse(assignment.customPassengers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          combinedPassengers = [...combinedPassengers, ...parsed];
        }
      } catch (e) {
        console.warn('Failed to parse customPassengers:', e);
      }
    }

    // Auto-populate passengers from CRM Passenger / Booking list if none were entered
    if (combinedPassengers.length === 0) {
      const searchPackageId = assignment.packageId || effectivePackage?.id;
      const searchBookingId = assignment.bookingId;

      try {
        const candidateBookings = await prisma.booking.findMany({
          where: {
            companyId: assignment.companyId || req.user!.companyId,
            isDeleted: false,
            OR: [
              ...(searchBookingId ? [{ id: searchBookingId }] : []),
              ...(searchPackageId ? [{ packageId: searchPackageId }] : []),
            ],
          },
          include: {
            customer: true,
            travellersList: true,
          },
          orderBy: { bookingDate: 'desc' },
        });

        const autoPassengers: any[] = [];
        const seenPax = new Set<string>();

        for (const b of candidateBookings) {
          if (b.travellersList && b.travellersList.length > 0) {
            for (const t of b.travellersList) {
              const key = (t.phone || t.name).toLowerCase().trim();
              if (!seenPax.has(key)) {
                seenPax.add(key);
                autoPassengers.push({
                  id: t.id,
                  name: t.name,
                  phone: t.phone || b.customer?.phone || null,
                  email: t.email || b.customer?.email || null,
                  age: t.age || null,
                  gender: t.gender || null,
                  roleInTrip: t.roleInTrip || (t.isPrimary ? 'Primary Guest' : 'Traveller'),
                  roomAllocation: t.roomAllocation || null,
                  emergencyContact: t.emergencyContact || null,
                  notes: t.notes ? `${t.notes} (Booking: ${b.bookingNumber})` : `Booking: ${b.bookingNumber}`,
                  isPrimary: t.isPrimary,
                  bookingId: b.id,
                  bookingNumber: b.bookingNumber,
                });
              }
            }
          } else if (b.customer) {
            const key = (b.customer.phone || b.customer.fullName).toLowerCase().trim();
            if (!seenPax.has(key)) {
              seenPax.add(key);
              autoPassengers.push({
                id: `pax-cust-${b.customer.id}`,
                name: b.customer.fullName,
                phone: b.customer.phone || null,
                email: b.customer.email || null,
                age: null,
                gender: null,
                roleInTrip: 'Primary Guest',
                roomAllocation: null,
                emergencyContact: b.customer.phone || null,
                notes: `Booking: ${b.bookingNumber}`,
                isPrimary: true,
                bookingId: b.id,
                bookingNumber: b.bookingNumber,
              });
            }
          }
        }

        if (autoPassengers.length > 0) {
          combinedPassengers = autoPassengers;
          // Persist automatically to assignment so it is stored safely and consistently
          await prisma.tourAssignment.update({
            where: { id: assignment.id },
            data: {
              customPassengers: JSON.stringify(autoPassengers),
              passengerCount: Math.max(assignment.passengerCount, autoPassengers.length),
            },
          }).catch((err) => console.warn('[Manifest] Non-blocking pax auto-save:', err));
        }
      } catch (err) {
        console.warn('[Manifest] Error auto-populating passengers:', err);
      }
    }

    // Combine cabs: booking cabBookings + assignment cab/driver if entered
    let combinedCabs: any[] = assignment.booking?.cabBookings ? [...assignment.booking.cabBookings] : [];
    if (assignment.driverName || assignment.vehicleNumber) {
      const directCab = {
        id: `direct-cab-${assignment.id}`,
        vehicleType: assignment.vehicleType || 'Dedicated Tour Vehicle',
        carNumber: assignment.vehicleNumber || 'Assigned Cab',
        driverName: assignment.driverName || 'Designated Chauffeur',
        driverPhone: assignment.driverPhone || 'N/A',
        pickupPlace: assignment.reportingLocation || assignment.destination || 'Tour Origin',
        dropPlace: assignment.destination || 'Tour Drop Point',
        pickupDate: assignment.startDate.toISOString(),
        pickupTime: assignment.reportingTime || '07:30 AM',
        bookingStatus: 'CONFIRMED',
      };
      combinedCabs = [directCab, ...combinedCabs];
    }

    // Parse staying hotel details
    let parsedHotels: any[] = [];
    if (assignment.hotelDetails) {
      try {
        const parsed = JSON.parse(assignment.hotelDetails);
        if (Array.isArray(parsed)) parsedHotels = parsed;
        else if (parsed) parsedHotels = [parsed];
      } catch (e) {
        console.warn('Failed to parse hotelDetails:', e);
      }
    }

    const payload = {
      ...assignment,
      package: effectivePackage ? {
        ...effectivePackage,
        itineraries: combinedItineraries,
      } : (combinedItineraries.length > 0 ? {
        id: 'custom-package',
        packageName: assignment.destination ? `${assignment.destination} Tour Schedule` : 'Tour Schedule',
        destination: assignment.destination || '',
        duration: `${combinedItineraries.length} Days`,
        itineraries: combinedItineraries,
      } : null),
      customer: effectiveCustomer,
      booking: assignment.booking ? {
        ...assignment.booking,
        travellersList: combinedPassengers,
        cabBookings: combinedCabs,
      } : {
        id: 'direct-tour',
        bookingNumber: assignment.assignmentCode,
        travellers: combinedPassengers.length || assignment.passengerCount,
        bookingStatus: assignment.status,
        travelStartDate: assignment.startDate.toISOString(),
        travelEndDate: assignment.endDate.toISOString(),
        travellersList: combinedPassengers,
        cabBookings: combinedCabs,
      },
      hotels: parsedHotels,
    };

    res.json(payload);
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
  pickupLocation: z.string().optional().nullable(),
  dropLocation: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  passengerCount: z.number().int().min(1).default(1),
  groupName: z.string().optional().nullable(),
  tourName: z.string().optional().nullable(),
  coordinatorName: z.string().optional().nullable(),
  coordinatorPhone: z.string().optional().nullable(),
  status: z.string().default('ASSIGNED'),
  progressNotes: z.string().optional().nullable(),
  allowOverlapOverride: z.boolean().default(false),
  canOverride: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
  operationalNotes: z.string().optional().nullable(),
  driverName: z.string().optional().nullable(),
  driverPhone: z.string().optional().nullable(),
  vehicleNumber: z.string().optional().nullable(),
  vehicleType: z.string().optional().nullable(),
  hotelDetails: z.string().optional().nullable(),
  customItinerary: z.string().optional().nullable(),
  customPassengers: z.string().optional().nullable(),
});

router.post('/assignments', requirePermission('guides', 'create'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = assignmentSchema.parse(req.body);
    const companyId = req.user!.companyId;
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const isOverrideAllowed = Boolean(data.allowOverlapOverride || data.canOverride);

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

    if (overlapping.length > 0 && !isOverrideAllowed) {
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

    // Auto-resolve packageId and customerId if bookingId was provided
    let resolvedPackageId = data.packageId || null;
    let resolvedCustomerId = data.customerId || null;
    if (data.bookingId && (!resolvedPackageId || !resolvedCustomerId)) {
      const linkedBooking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        select: { packageId: true, customerId: true },
      });
      if (linkedBooking) {
        if (!resolvedPackageId) resolvedPackageId = linkedBooking.packageId;
        if (!resolvedCustomerId) resolvedCustomerId = linkedBooking.customerId;
      }
    }

    // Auto-generate Assignment Code
    const count = await prisma.tourAssignment.count({ where: { companyId } });
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const assignmentCode = `ASN-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    const effectiveReportingLocation = data.reportingLocation?.trim() || data.pickupLocation?.trim() || null;
    const effectiveGroupName = data.groupName?.trim() || data.tourName?.trim() || null;
    const effectiveNotes = [data.notes, data.specialInstructions, data.operationalNotes].filter(Boolean).join('\n\n') || null;

    let initialCustomPassengers: string | null = data.customPassengers?.trim() || null;
    let effectivePassengerCount = data.passengerCount || 1;

    if (!initialCustomPassengers && (resolvedPackageId || data.bookingId)) {
      try {
        const candidateBookings = await prisma.booking.findMany({
          where: {
            companyId,
            isDeleted: false,
            OR: [
              ...(data.bookingId ? [{ id: data.bookingId }] : []),
              ...(resolvedPackageId ? [{ packageId: resolvedPackageId }] : []),
            ],
          },
          include: {
            customer: true,
            travellersList: true,
          },
          orderBy: { bookingDate: 'desc' },
        });

        const autoPassengers: any[] = [];
        const seenPax = new Set<string>();

        for (const b of candidateBookings) {
          if (b.travellersList && b.travellersList.length > 0) {
            for (const t of b.travellersList) {
              const key = (t.phone || t.name).toLowerCase().trim();
              if (!seenPax.has(key)) {
                seenPax.add(key);
                autoPassengers.push({
                  id: t.id,
                  name: t.name,
                  phone: t.phone || b.customer?.phone || null,
                  email: t.email || b.customer?.email || null,
                  age: t.age || null,
                  gender: t.gender || null,
                  roleInTrip: t.roleInTrip || (t.isPrimary ? 'Primary Guest' : 'Traveller'),
                  roomAllocation: t.roomAllocation || null,
                  emergencyContact: t.emergencyContact || null,
                  notes: t.notes ? `${t.notes} (Booking: ${b.bookingNumber})` : `Booking: ${b.bookingNumber}`,
                  isPrimary: t.isPrimary,
                  bookingId: b.id,
                  bookingNumber: b.bookingNumber,
                });
              }
            }
          } else if (b.customer) {
            const key = (b.customer.phone || b.customer.fullName).toLowerCase().trim();
            if (!seenPax.has(key)) {
              seenPax.add(key);
              autoPassengers.push({
                id: `pax-cust-${b.customer.id}`,
                name: b.customer.fullName,
                phone: b.customer.phone || null,
                email: b.customer.email || null,
                age: null,
                gender: null,
                roleInTrip: 'Primary Guest',
                roomAllocation: null,
                emergencyContact: b.customer.phone || null,
                notes: `Booking: ${b.bookingNumber}`,
                isPrimary: true,
                bookingId: b.id,
                bookingNumber: b.bookingNumber,
              });
            }
          }
        }

        if (autoPassengers.length > 0) {
          initialCustomPassengers = JSON.stringify(autoPassengers);
          effectivePassengerCount = Math.max(effectivePassengerCount, autoPassengers.length);
        }
      } catch (err) {
        console.warn('[AssignGuide] Error auto-populating passengers on assignment:', err);
      }
    }

    const assignment = await prisma.tourAssignment.create({
      data: {
        companyId,
        assignmentCode,
        bookingId: data.bookingId || null,
        packageId: resolvedPackageId,
        customerId: resolvedCustomerId,
        primaryGuideId: data.primaryGuideId,
        secondaryGuideId: data.secondaryGuideId || null,
        startDate: start,
        endDate: end,
        reportingTime: data.reportingTime?.trim() || null,
        reportingLocation: effectiveReportingLocation,
        route: data.route?.trim() || (data.dropLocation ? `Pickup: ${effectiveReportingLocation || ''} -> Drop: ${data.dropLocation}` : null),
        destination: data.destination?.trim() || null,
        passengerCount: effectivePassengerCount,
        groupName: effectiveGroupName,
        coordinatorName: data.coordinatorName?.trim() || null,
        coordinatorPhone: data.coordinatorPhone?.trim() || null,
        status: data.status || 'ASSIGNED',
        progressNotes: data.progressNotes?.trim() || null,
        allowOverlapOverride: isOverrideAllowed,
        assignedById: req.user!.id,
        notes: effectiveNotes,
        driverName: data.driverName?.trim() || null,
        driverPhone: data.driverPhone?.trim() || null,
        vehicleNumber: data.vehicleNumber?.trim() || null,
        vehicleType: data.vehicleType?.trim() || null,
        hotelDetails: data.hotelDetails?.trim() || null,
        customItinerary: data.customItinerary?.trim() || null,
        customPassengers: initialCustomPassengers,
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
        reportingTime: data.reportingTime !== undefined ? data.reportingTime : undefined,
        reportingLocation: data.reportingLocation !== undefined ? data.reportingLocation : undefined,
        route: data.route !== undefined ? data.route : undefined,
        destination: data.destination !== undefined ? data.destination : undefined,
        passengerCount: data.passengerCount ? Number(data.passengerCount) : undefined,
        groupName: data.groupName !== undefined ? data.groupName : undefined,
        coordinatorName: data.coordinatorName !== undefined ? data.coordinatorName : undefined,
        coordinatorPhone: data.coordinatorPhone !== undefined ? data.coordinatorPhone : undefined,
        progressNotes: data.progressNotes !== undefined ? data.progressNotes : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        driverName: data.driverName !== undefined ? data.driverName : undefined,
        driverPhone: data.driverPhone !== undefined ? data.driverPhone : undefined,
        vehicleNumber: data.vehicleNumber !== undefined ? data.vehicleNumber : undefined,
        vehicleType: data.vehicleType !== undefined ? data.vehicleType : undefined,
        hotelDetails: data.hotelDetails !== undefined ? (typeof data.hotelDetails === 'string' ? data.hotelDetails : JSON.stringify(data.hotelDetails)) : undefined,
        customItinerary: data.customItinerary !== undefined ? (typeof data.customItinerary === 'string' ? data.customItinerary : JSON.stringify(data.customItinerary)) : undefined,
        customPassengers: data.customPassengers !== undefined ? (typeof data.customPassengers === 'string' ? data.customPassengers : JSON.stringify(data.customPassengers)) : undefined,
      },
    });

    res.json(assignment);
  } catch (error) {
    next(error);
  }
});

// Update Assignment Cab, Driver & Hotel Logistics
router.post('/assignments/:id/logistics', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { driverName, driverPhone, vehicleNumber, vehicleType, hotelDetails } = req.body;

    const assignment = await prisma.tourAssignment.update({
      where: { id },
      data: {
        driverName: driverName !== undefined ? driverName?.trim() || null : undefined,
        driverPhone: driverPhone !== undefined ? driverPhone?.trim() || null : undefined,
        vehicleNumber: vehicleNumber !== undefined ? vehicleNumber?.trim() || null : undefined,
        vehicleType: vehicleType !== undefined ? vehicleType?.trim() || null : undefined,
        hotelDetails: hotelDetails !== undefined ? (typeof hotelDetails === 'string' ? hotelDetails : JSON.stringify(hotelDetails)) : undefined,
      },
    });

    res.json(assignment);
  } catch (error) {
    next(error);
  }
});

// Manage Tour Passengers directly on assignment
router.post('/assignments/:id/passengers', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { name, phone, age, gender, roleInTrip, roomAllocation, notes } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Passenger name is required.' });
      return;
    }

    const assignment = await prisma.tourAssignment.findUnique({ where: { id } });
    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found.' });
      return;
    }

    let existingPassengers: any[] = [];
    if (assignment.customPassengers) {
      try {
        const parsed = JSON.parse(assignment.customPassengers);
        if (Array.isArray(parsed)) existingPassengers = parsed;
      } catch (e) {
        console.warn('Failed to parse existing customPassengers:', e);
      }
    }

    const newPassenger = {
      id: `pax-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      phone: phone?.trim() || '',
      age: age ? Number(age) : null,
      gender: gender || 'Other',
      roleInTrip: roleInTrip?.trim() || 'Traveller',
      roomAllocation: roomAllocation?.trim() || '',
      notes: notes?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    existingPassengers.push(newPassenger);

    const updated = await prisma.tourAssignment.update({
      where: { id },
      data: {
        customPassengers: JSON.stringify(existingPassengers),
        passengerCount: Math.max(assignment.passengerCount, existingPassengers.length),
      },
    });

    res.status(201).json({
      passenger: newPassenger,
      passengers: existingPassengers,
      totalCount: updated.passengerCount,
    });
  } catch (error) {
    next(error);
  }
});

// Delete custom passenger from tour assignment
router.delete('/assignments/:id/passengers/:passengerId', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const passengerId = req.params.passengerId as string;

    const assignment = await prisma.tourAssignment.findUnique({ where: { id } });
    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found.' });
      return;
    }

    let existingPassengers: any[] = [];
    if (assignment.customPassengers) {
      try {
        const parsed = JSON.parse(assignment.customPassengers);
        if (Array.isArray(parsed)) existingPassengers = parsed;
      } catch (e) {}
    }

    const filtered = existingPassengers.filter(p => p.id !== passengerId);

    await prisma.tourAssignment.update({
      where: { id },
      data: {
        customPassengers: JSON.stringify(filtered),
      },
    });

    res.json({ message: 'Passenger removed.', passengers: filtered });
  } catch (error) {
    next(error);
  }
});

// Add / Update Day Details in Tour Itinerary
router.post('/assignments/:id/itinerary', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { dayNumber, title, description, activities, places, hotelName, hotelLocation, mealPlan, highlights } = req.body;

    const assignment = await prisma.tourAssignment.findUnique({
      where: { id },
      include: {
        package: { include: { itineraries: true } },
        booking: { include: { package: { include: { itineraries: true } } } },
      },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found.' });
      return;
    }

    let currentItineraries: any[] = [];
    if (assignment.customItinerary) {
      try {
        const parsed = JSON.parse(assignment.customItinerary);
        if (Array.isArray(parsed) && parsed.length > 0) currentItineraries = parsed;
      } catch (e) {}
    }

    if (currentItineraries.length === 0) {
      const base = assignment.package?.itineraries || assignment.booking?.package?.itineraries || [];
      currentItineraries = JSON.parse(JSON.stringify(base));
    }

    const targetDay = Number(dayNumber) || (currentItineraries.length + 1);
    const existingIndex = currentItineraries.findIndex((d: any) => Number(d.dayNumber) === targetDay);

    const dayData = {
      id: existingIndex >= 0 ? currentItineraries[existingIndex].id : `custom-day-${targetDay}-${Date.now()}`,
      dayNumber: targetDay,
      title: title?.trim() || `Day ${targetDay} Program`,
      description: description?.trim() || '',
      activities: activities?.trim() || '',
      places: places?.trim() || '',
      hotelName: hotelName?.trim() || '',
      hotelLocation: hotelLocation?.trim() || '',
      mealPlan: mealPlan?.trim() || '',
      highlights: highlights?.trim() || '',
    };

    if (existingIndex >= 0) {
      currentItineraries[existingIndex] = { ...currentItineraries[existingIndex], ...dayData };
    } else {
      currentItineraries.push(dayData);
    }

    currentItineraries.sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));

    await prisma.tourAssignment.update({
      where: { id },
      data: {
        customItinerary: JSON.stringify(currentItineraries),
      },
    });

    res.status(201).json({
      message: 'Itinerary day saved successfully.',
      day: dayData,
      itineraries: currentItineraries,
    });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// Tour Attendance & Safety Roll-Call Endpoints
// ==============================================================================
router.get('/assignments/:id/attendance', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const assignment = await prisma.tourAssignment.findUnique({
      where: { id },
      include: {
        package: { include: { itineraries: true } },
        booking: { include: { travellersList: true, package: { include: { itineraries: true } } } },
        customer: { select: { id: true, fullName: true, phone: true } },
      },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found.' });
      return;
    }

    // 1. Gather all tour passengers
    let passengers: any[] = [];
    if (assignment.customPassengers) {
      try {
        const cp = JSON.parse(assignment.customPassengers);
        if (Array.isArray(cp)) passengers = [...cp];
      } catch (e) {}
    }

    if (assignment.booking?.travellersList && assignment.booking.travellersList.length > 0) {
      assignment.booking.travellersList.forEach((t: any) => {
        if (!passengers.some((p) => p.name?.toLowerCase() === t.name?.toLowerCase())) {
          passengers.push({
            id: t.id,
            name: t.name,
            age: t.age,
            gender: t.gender,
            phone: assignment.customer?.phone || '',
            roleInTrip: 'Traveller',
            roomAllocation: '',
          });
        }
      });
    }

    if (passengers.length === 0 && assignment.customer) {
      passengers.push({
        id: `cust-${assignment.customer.id}`,
        name: assignment.customer.fullName,
        phone: assignment.customer.phone || '',
        age: 35,
        gender: 'Adult',
        roleInTrip: 'Primary Booker',
      });
    }

    // 2. Parse attendance structure
    let attendanceData: {
      checkpoints: Array<{ id: string; name: string; location?: string; time?: string; date?: string }>;
      records: Record<string, Record<string, { status: 'PRESENT' | 'ABSENT'; markedAt: string; markedBy?: string; note?: string }>>;
    } = { checkpoints: [], records: {} };

    if (assignment.attendanceRecords) {
      try {
        const parsed = JSON.parse(assignment.attendanceRecords);
        if (parsed && typeof parsed === 'object') {
          attendanceData = {
            checkpoints: Array.isArray(parsed.checkpoints) ? parsed.checkpoints : [],
            records: parsed.records && typeof parsed.records === 'object' ? parsed.records : {},
          };
        }
      } catch (e) {}
    }

    // 3. If no checkpoints defined, initialize defaults from itinerary
    if (attendanceData.checkpoints.length === 0) {
      attendanceData.checkpoints.push({
        id: 'chk-boarding',
        name: '🚌 Trip Departure & Bus Boarding',
        location: assignment.reportingLocation || 'Departure Point',
        time: assignment.reportingTime || '07:00 AM',
      });

      // Extract days from customItinerary or package
      let days: any[] = [];
      if (assignment.customItinerary) {
        try {
          days = JSON.parse(assignment.customItinerary);
        } catch (e) {}
      }
      if (days.length === 0) {
        days = assignment.package?.itineraries || assignment.booking?.package?.itineraries || [];
      }

      days.forEach((d: any) => {
        const spotName = d.places || d.title || `Day ${d.dayNumber} Sightseeing`;
        attendanceData.checkpoints.push({
          id: `chk-day-${d.dayNumber}`,
          name: `📍 Day ${d.dayNumber}: ${spotName}`,
          location: d.hotelLocation || assignment.destination || '',
        });
      });

      attendanceData.checkpoints.push({
        id: 'chk-hotel-checkin',
        name: '🏨 Hotel Check-In & Room Allocation',
        location: assignment.destination || 'Hotel',
      });
    }

    res.json({
      assignmentId: assignment.id,
      assignmentCode: assignment.assignmentCode,
      destination: assignment.destination,
      checkpoints: attendanceData.checkpoints,
      records: attendanceData.records,
      passengers,
    });
  } catch (error) {
    next(error);
  }
});

// Add a new checkpoint / sightseeing stop
router.post('/assignments/:id/attendance/checkpoint', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { name, location, time, date } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Checkpoint or stop name is required.' });
      return;
    }

    const assignment = await prisma.tourAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found.' });
      return;
    }

    let attendanceData: {
      checkpoints: Array<{ id: string; name: string; location?: string; time?: string; date?: string }>;
      records: Record<string, any>;
    } = { checkpoints: [], records: {} };

    if (assignment.attendanceRecords) {
      try {
        const parsed = JSON.parse(assignment.attendanceRecords);
        if (parsed && typeof parsed === 'object') {
          attendanceData = {
            checkpoints: Array.isArray(parsed.checkpoints) ? parsed.checkpoints : [],
            records: parsed.records || {},
          };
        }
      } catch (e) {}
    }

    const newCheckpoint = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      location: location?.trim() || '',
      time: time?.trim() || '',
      date: date?.trim() || '',
    };

    attendanceData.checkpoints.push(newCheckpoint);

    await prisma.tourAssignment.update({
      where: { id },
      data: {
        attendanceRecords: JSON.stringify(attendanceData),
      },
    });

    res.status(201).json({
      message: 'New checkpoint added successfully.',
      checkpoint: newCheckpoint,
      checkpoints: attendanceData.checkpoints,
    });
  } catch (error) {
    next(error);
  }
});

// Mark single passenger attendance (PRESENT or ABSENT)
router.post('/assignments/:id/attendance/mark', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { checkpointId, passengerId, status, note } = req.body;

    if (!checkpointId || !passengerId || !status) {
      res.status(400).json({ message: 'checkpointId, passengerId, and status (PRESENT/ABSENT) are required.' });
      return;
    }

    const assignment = await prisma.tourAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found.' });
      return;
    }

    let attendanceData: {
      checkpoints: any[];
      records: Record<string, Record<string, any>>;
    } = { checkpoints: [], records: {} };

    if (assignment.attendanceRecords) {
      try {
        const parsed = JSON.parse(assignment.attendanceRecords);
        if (parsed && typeof parsed === 'object') {
          attendanceData = {
            checkpoints: Array.isArray(parsed.checkpoints) ? parsed.checkpoints : [],
            records: parsed.records && typeof parsed.records === 'object' ? parsed.records : {},
          };
        }
      } catch (e) {}
    }

    if (!attendanceData.records[checkpointId]) {
      attendanceData.records[checkpointId] = {};
    }

    attendanceData.records[checkpointId][passengerId] = {
      status,
      markedAt: new Date().toISOString(),
      markedBy: req.user!.name,
      note: note?.trim() || null,
    };

    await prisma.tourAssignment.update({
      where: { id },
      data: {
        attendanceRecords: JSON.stringify(attendanceData),
      },
    });

    res.json({
      message: `Passenger marked as ${status}.`,
      records: attendanceData.records,
    });
  } catch (error) {
    next(error);
  }
});

// Mark all passengers at a checkpoint as PRESENT in one click
router.post('/assignments/:id/attendance/mark-all', requirePermission('guides', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { checkpointId, passengerIds } = req.body;

    if (!checkpointId || !Array.isArray(passengerIds)) {
      res.status(400).json({ message: 'checkpointId and passengerIds array are required.' });
      return;
    }

    const assignment = await prisma.tourAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Tour assignment not found.' });
      return;
    }

    let attendanceData: {
      checkpoints: any[];
      records: Record<string, Record<string, any>>;
    } = { checkpoints: [], records: {} };

    if (assignment.attendanceRecords) {
      try {
        const parsed = JSON.parse(assignment.attendanceRecords);
        if (parsed && typeof parsed === 'object') {
          attendanceData = {
            checkpoints: Array.isArray(parsed.checkpoints) ? parsed.checkpoints : [],
            records: parsed.records && typeof parsed.records === 'object' ? parsed.records : {},
          };
        }
      } catch (e) {}
    }

    if (!attendanceData.records[checkpointId]) {
      attendanceData.records[checkpointId] = {};
    }

    const now = new Date().toISOString();
    passengerIds.forEach((pid: string) => {
      attendanceData.records[checkpointId][pid] = {
        status: 'PRESENT',
        markedAt: now,
        markedBy: req.user!.name,
      };
    });

    await prisma.tourAssignment.update({
      where: { id },
      data: {
        attendanceRecords: JSON.stringify(attendanceData),
      },
    });

    res.json({
      message: `All ${passengerIds.length} passengers marked present.`,
      records: attendanceData.records,
    });
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
  enableLogin: z.boolean().optional(),
  loginEmail: z.string().email().optional().nullable(),
  loginPassword: z.string().min(6).optional().nullable(),
});

// Create Guide (with optional CRM User Login creation)
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

    // Handle optional login creation with staff seat quota enforcement
    let linkedUserId: string | null = null;
    let emailToUse = '';
    if (data.enableLogin && data.loginPassword) {
      emailToUse = (data.loginEmail || data.email || '').trim().toLowerCase();
      if (!emailToUse) {
        res.status(400).json({ message: 'A valid email address is required to enable CRM login access for this guide.' });
        return;
      }

      const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
      if (!company.isOoting) {
        const currentStaffCount = await prisma.user.count({
          where: {
            companyId,
            role: { not: 'SUPER_ADMIN' },
            status: { in: ['ACTIVE', 'INVITED'] },
          },
        });

        if (currentStaffCount >= company.maxStaffLimit) {
          res.status(403).json({
            message: `Staff account limit reached (${currentStaffCount}/${company.maxStaffLimit}). To enable login for this guide, please request additional staff access from Ooting Master Admin.`,
            code: 'STAFF_LIMIT_REACHED',
          });
          return;
        }
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email: emailToUse } });
      if (existingUser) {
        linkedUserId = existingUser.id;
      } else {
        const passwordHash = await bcrypt.hash(data.loginPassword, 10);
        const newUser = await prisma.user.create({
          data: {
            name: data.fullName.trim(),
            email: emailToUse,
            passwordHash,
            role: 'TOUR_GUIDE',
            phone: data.phone.trim(),
            companyId,
            status: 'ACTIVE',
            permissions: JSON.stringify({
              guides: { view: true, create: true, edit: true, progress: true, complete: true, expenses: true },
            }),
          },
        });
        linkedUserId = newUser.id;
      }
    }

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
        userId: linkedUserId,
      },
      include: {
        user: { select: { id: true, email: true, role: true, status: true } },
      },
    });

    await prisma.guideActivity.create({
      data: {
        companyId,
        guideId: guide.id,
        activityType: 'STATUS_CHANGE',
        description: `Guide profile created with ID ${guide.guideCode}${linkedUserId ? ' with CRM Login Access enabled' : ''}`,
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

    if (data.enableLogin && data.loginPassword && emailToUse) {
      (async () => {
        try {
          const comp = await prisma.company.findUnique({
            where: { id: companyId },
            select: { name: true },
          });
          const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
          const loginUrl = `${origin}/login`;

          await sendStaffWelcomeEmail({
            to: emailToUse,
            name: guide.fullName,
            email: emailToUse,
            temporaryPassword: data.loginPassword || undefined,
            role: 'TOUR_GUIDE',
            companyName: comp?.name || 'Ooting CRM',
            loginUrl,
          });
        } catch (emailErr: any) {
          console.warn('[GuideRoute] Non-blocking welcome email error:', emailErr?.message);
        }
      })();
    }

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
      const company = await prisma.company.findUniqueOrThrow({ where: { id: req.user!.companyId } });
      if (!company.isOoting) {
        const currentStaffCount = await prisma.user.count({
          where: {
            companyId: req.user!.companyId,
            role: { not: 'SUPER_ADMIN' },
            status: { in: ['ACTIVE', 'INVITED'] },
          },
        });
        if (currentStaffCount >= company.maxStaffLimit) {
          res.status(403).json({
            message: `Staff seat quota reached (${currentStaffCount}/${company.maxStaffLimit}). To activate login for this guide, please request additional staff access from Ooting Master Admin.`,
            code: 'STAFF_LIMIT_REACHED',
          });
          return;
        }
      }

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

    const expenseType = body.expenseType === 'GENERAL' ? 'GENERAL' : body.expenseType === 'PASSENGER' ? 'PASSENGER' : existing.expenseType;
    const splitType = expenseType === 'GENERAL' ? (body.splitType || existing.splitType || 'SPLIT_EQUALLY') : 'NO_SPLIT';

    const updated = await prisma.tourExpense.update({
      where: { id: expenseId },
      data: {
        expenseType,
        splitType,
        passengerId: expenseType === 'PASSENGER' ? (body.passengerId !== undefined ? body.passengerId : existing.passengerId) : null,
        passengerName: expenseType === 'PASSENGER' ? (body.passengerName !== undefined ? body.passengerName : existing.passengerName) : null,
        passengerRole: expenseType === 'PASSENGER' ? (body.passengerRole !== undefined ? body.passengerRole : existing.passengerRole) : null,
        roomNumber: expenseType === 'PASSENGER' ? (body.roomNumber !== undefined ? body.roomNumber : existing.roomNumber) : null,
        title: body.title !== undefined ? body.title.trim() : undefined,
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        category: body.category || undefined,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
        expenseTime: body.expenseTime !== undefined ? body.expenseTime : undefined,
        receiptNumber: body.receiptNumber !== undefined ? body.receiptNumber : undefined,
        receiptUrl: body.receiptUrl !== undefined ? body.receiptUrl : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
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
