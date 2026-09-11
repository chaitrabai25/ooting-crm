import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { config } from '../config/index.js';

const router = Router();
router.use(authenticate);

// List quotations
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10));
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { quotationNumber: { contains: search } },
        { destination: { contains: search } },
        { customer: { fullName: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }
    if (status) where.status = status;

    const [total, quotations] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true, email: true } },
          package: { select: { id: true, packageName: true, duration: true } },
          lead: { select: { id: true, source: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      data: quotations,
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

// Single Quotation with full details & company profile for PDF/Print view
router.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        lead: true,
        package: {
          include: {
            itineraries: { orderBy: { dayNumber: 'asc' } },
          },
        },
      },
    });

    if (!quotation) {
      res.status(404).json({ message: 'Quotation not found.' });
      return;
    }

    res.json({
      quotation,
      company: config.company,
    });
  } catch (error) {
    next(error);
  }
});

const quotationSchema = z.object({
  leadId: z.string().optional().nullable(),
  customerId: z.string().min(1, 'Customer ID is required'),
  packageId: z.string().optional().nullable(),
  destination: z.string().min(2, 'Destination is required'),
  travelStartDate: z.string().optional().nullable(),
  travelEndDate: z.string().optional().nullable(),
  adults: z.number().int().min(1).default(2),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  accommodation: z.string().optional().nullable(),
  transport: z.string().optional().nullable(),
  activities: z.string().optional().nullable(),
  inclusions: z.string().optional().nullable(),
  exclusions: z.string().optional().nullable(),
  basePrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).default('DRAFT'),
  termsAndConditions: z.string().optional().nullable(),
});

// Create Quotation
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = quotationSchema.parse(req.body);

    // Calculate final amount strictly: (basePrice - discount) + tax
    const finalAmount = Math.max(0, (data.basePrice - data.discount) + data.tax);

    // Generate unique Quotation Number: OOT-QT-YYYYMM-XXXX
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await prisma.quotation.count();
    const quotationNumber = `OOT-QT-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const defaultTerms = `1. 50% advance payment required to confirm booking.
2. Balance payment to be cleared 7 days prior to travel date.
3. Cancellations within 48 hours of travel are non-refundable.
4. Itinerary sequence may change based on local weather and operational conditions.
5. All disputes subject to Bangalore jurisdiction.`;

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        leadId: data.leadId || null,
        customerId: data.customerId,
        packageId: data.packageId || null,
        destination: data.destination.trim(),
        travelStartDate: data.travelStartDate ? new Date(data.travelStartDate) : null,
        travelEndDate: data.travelEndDate ? new Date(data.travelEndDate) : null,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        accommodation: data.accommodation || null,
        transport: data.transport || null,
        activities: data.activities || null,
        inclusions: data.inclusions || null,
        exclusions: data.exclusions || null,
        basePrice: data.basePrice,
        discount: data.discount,
        tax: data.tax,
        finalAmount,
        status: data.status,
        termsAndConditions: data.termsAndConditions || defaultTerms,
      },
      include: {
        customer: true,
        package: true,
      },
    });

    // If lead exists, update status to QUOTATION_SENT
    if (data.leadId) {
      await prisma.lead.update({
        where: { id: data.leadId },
        data: { enquiryStatus: 'QUOTATION_SENT' },
      });
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'QUOTATION',
      entityId: quotation.id,
      details: `Generated quotation ${quotation.quotationNumber} for ${quotation.customer.fullName} (₹${finalAmount})`,
      ipAddress: req.ip,
    });

    res.status(201).json(quotation);
  } catch (error) {
    next(error);
  }
});

// Update Quotation Status
router.patch('/:id/status', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status },
      include: { customer: true },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'STATUS_CHANGE',
      entity: 'QUOTATION',
      entityId: id,
      details: `Quotation ${quotation.quotationNumber} marked as ${status}`,
      ipAddress: req.ip,
    });

    res.json(quotation);
  } catch (error) {
    next(error);
  }
});

export default router;
