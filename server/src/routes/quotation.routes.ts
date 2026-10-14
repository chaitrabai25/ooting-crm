import { Router, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { config } from '../config/index.js';
import { getCompanySettings } from './setting.routes.js';
import { generateUniqueBookingNumber } from './booking.routes.js';

const router = Router();
router.use(authenticate);

// Export quotations to Excel (.xlsx)
router.get('/export/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const customerId = (req.query.customerId as string || '').trim();
    const agentId = (req.query.agentId as string || '').trim();
    const packageId = (req.query.packageId as string || '').trim();
    const createdById = (req.query.createdById as string || '').trim();
    const companyId = req.user!.companyId;

    const where: any = { isDeleted: false, companyId };
    if (search) {
      where.OR = [
        { quotationNumber: { contains: search } },
        { destination: { contains: search } },
        { customer: { fullName: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { agent: { companyName: { contains: search } } },
        { agent: { contactPerson: { contains: search } } },
        { agent: { phone: { contains: search } } },
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (agentId) where.agentId = agentId;
    if (packageId) where.packageId = packageId;
    if (createdById) where.createdById = createdById;

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: true,
        agent: true,
        package: true,
        createdByUser: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = quotations.map((q: any, idx: number) => {
      const isAgent = q.recipientType === 'AGENT' || Boolean(q.agentId);
      const recipientName = isAgent
        ? (q.agent?.companyName || 'Agent')
        : (q.customer?.fullName || 'N/A');
      const contactPerson = isAgent
        ? (q.agent?.contactPerson || 'N/A')
        : (q.customer?.fullName || 'N/A');
      const phone = isAgent ? (q.agent?.phone || 'N/A') : (q.customer?.phone || 'N/A');
      const email = isAgent ? (q.agent?.email || 'N/A') : (q.customer?.email || 'N/A');

      return {
        'S.No': idx + 1,
        'Quotation No': q.quotationNumber,
        'Recipient Type': isAgent ? 'B2B Travel Agent' : 'Individual Customer',
        'Customer / Agency': recipientName,
        'Contact Person': contactPerson,
        'Phone': phone,
        'Email': email,
        'Destination': q.destination,
        'Package': q.package?.packageName || 'Custom Itinerary',
        'Travel Start Date': q.travelStartDate ? new Date(q.travelStartDate).toLocaleDateString('en-IN') : 'N/A',
        'Travel End Date': q.travelEndDate ? new Date(q.travelEndDate).toLocaleDateString('en-IN') : 'N/A',
        'Adults': q.adults,
        'Children': q.children,
        'Infants': q.infants,
        'Cab Details': q.cabDetails || 'N/A',
        'Base Price (INR)': Number(q.basePrice),
        'Discount (INR)': Number(q.discount),
        'Tax (INR)': Number(q.tax),
        'Additional Charges (INR)': Number(q.additionalCharges),
        'Final Amount (INR)': Number(q.finalAmount),
        'Status': q.status,
        'Created By': q.createdByUser?.name || 'Admin',
        'Created Date': new Date(q.createdAt).toLocaleDateString('en-IN'),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotations');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'EXPORT',
      entity: 'QUOTATION',
      details: `Exported ${quotations.length} quotation records to Excel (.xlsx)`,
      ipAddress: req.ip,
    });

    const filePrefix = req.user?.company?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'quotations';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filePrefix}-quotations-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// List quotations (default 10 per page)
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '10', 10));
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const customerId = (req.query.customerId as string || '').trim();
    const agentId = (req.query.agentId as string || '').trim();
    const packageId = (req.query.packageId as string || '').trim();
    const createdById = (req.query.createdById as string || '').trim();
    const startDate = (req.query.startDate as string || '').trim();
    const endDate = (req.query.endDate as string || '').trim();
    const companyId = req.user!.companyId;

    const where: any = { isDeleted: false, companyId };
    if (search) {
      where.OR = [
        { quotationNumber: { contains: search } },
        { destination: { contains: search } },
        { customer: { fullName: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { agent: { companyName: { contains: search } } },
        { agent: { contactPerson: { contains: search } } },
        { agent: { phone: { contains: search } } },
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (agentId) where.agentId = agentId;
    if (packageId) where.packageId = packageId;
    if (createdById) where.createdById = createdById;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const [total, quotations] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true, email: true } },
          agent: { select: { id: true, companyName: true, contactPerson: true, phone: true, email: true, city: true, state: true } },
          package: { select: { id: true, packageName: true, duration: true } },
          lead: { select: { id: true, source: true } },
          createdByUser: { select: { id: true, name: true, email: true } },
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
    const companyId = req.user!.companyId;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        agent: true,
        lead: true,
        createdByUser: { select: { id: true, name: true, email: true, phone: true } },
        package: {
          include: {
            itineraries: { orderBy: { dayNumber: 'asc' } },
          },
        },
      },
    });

    if (!quotation || quotation.isDeleted || (quotation.companyId && quotation.companyId !== companyId)) {
      res.status(404).json({ message: 'Quotation not found.' });
      return;
    }

    const company = await getCompanySettings(companyId);

    res.json({
      quotation,
      company,
    });
  } catch (error) {
    next(error);
  }
});

const quotationSchema = z.object({
  leadId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  agentId: z.string().optional().nullable(),
  recipientType: z.enum(['CUSTOMER', 'AGENT']).default('CUSTOMER').optional(),
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
  cabDetails: z.string().optional().nullable(),
  additionalCharges: z.number().min(0).default(0),
  paymentTerms: z.string().optional().nullable(),
  cancellationTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  basePrice: z.number().min(0),
  basePackagePrice: z.number().min(0).default(0).optional(),
  adultUnitPrice: z.number().min(0).default(0).optional(),
  childUnitPrice: z.number().min(0).default(0).optional(),
  infantUnitPrice: z.number().min(0).default(0).optional(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).default('DRAFT'),
  termsAndConditions: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.recipientType === 'AGENT') {
      return Boolean(data.agentId && data.agentId.trim().length > 0);
    }
    return Boolean(data.customerId && data.customerId.trim().length > 0) || Boolean(data.agentId && data.agentId.trim().length > 0);
  },
  {
    message: 'Either an Individual Customer or a B2B Travel Agent must be selected.',
    path: ['customerId'],
  }
);

// Create Quotation
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = quotationSchema.parse(req.body);
    const companyId = req.user!.companyId;

    // Calculate final amount strictly: (basePrice - discount) + tax + additionalCharges
    const additionalCharges = data.additionalCharges || 0;
    const finalAmount = Math.max(0, (data.basePrice - data.discount) + data.tax + additionalCharges);

    // Generate unique Quotation Number with company prefix
    const tag = (req.user?.company?.name || 'CRM').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'CRM';
    const prefix = req.user?.company?.isOoting ? 'OOT' : tag;
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await prisma.quotation.count({ where: { companyId } });
    const quotationNumber = `${prefix}-QT-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const defaultTerms = `1. 50% advance payment required to confirm booking.
2. Balance payment to be cleared 7 days prior to travel date.
3. Cancellations within 48 hours of travel are non-refundable.
4. Itinerary sequence may change based on local weather and operational conditions.
5. All disputes subject to jurisdiction.`;

    const recipientType = data.recipientType || (data.agentId ? 'AGENT' : 'CUSTOMER');

    const quotation = await prisma.quotation.create({
      data: {
        companyId,
        quotationNumber,
        leadId: data.leadId || null,
        customerId: recipientType === 'AGENT' ? (data.customerId || null) : (data.customerId || null),
        agentId: data.agentId || null,
        recipientType,
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
        cabDetails: data.cabDetails || null,
        additionalCharges,
        paymentTerms: data.paymentTerms || null,
        cancellationTerms: data.cancellationTerms || null,
        notes: data.notes || null,
        basePrice: data.basePrice,
        basePackagePrice: data.basePackagePrice || data.basePrice || 0,
        adultUnitPrice: data.adultUnitPrice || 0,
        childUnitPrice: data.childUnitPrice || 0,
        infantUnitPrice: data.infantUnitPrice || 0,
        discount: data.discount,
        tax: data.tax,
        finalAmount,
        status: data.status,
        termsAndConditions: data.termsAndConditions || defaultTerms,
        createdById: req.user?.id || null,
        updatedById: req.user?.id || null,
      },
      include: {
        customer: true,
        agent: true,
        package: true,
        createdByUser: true,
      },
    });

    // If lead exists, update status to QUOTATION_SENT
    if (data.leadId) {
      await prisma.lead.update({
        where: { id: data.leadId },
        data: { enquiryStatus: 'QUOTATION_SENT', updatedById: req.user?.id || null },
      });
    }

    const recipientLogName = (quotation as any).recipientType === 'AGENT'
      ? `${(quotation as any).agent?.companyName || 'Agent'} (B2B Agent)`
      : ((quotation as any).customer?.fullName || 'Customer');

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'CREATE',
      entity: 'QUOTATION',
      entityId: quotation.id,
      details: `Generated quotation ${quotation.quotationNumber} for ${recipientLogName} (₹${finalAmount})`,
      newValue: JSON.stringify(quotation),
      ipAddress: req.ip,
    });

    res.status(201).json(quotation);
  } catch (error) {
    next(error);
  }
});

// Update Quotation (Full Edit)
router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const companyId = req.user!.companyId;
    const data = quotationSchema.parse(req.body);

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing || existing.isDeleted || (existing.companyId && existing.companyId !== companyId)) {
      res.status(404).json({ message: 'Quotation not found.' });
      return;
    }

    const additionalCharges = data.additionalCharges || 0;
    const finalAmount = Math.max(0, (data.basePrice - data.discount) + data.tax + additionalCharges);

    const recipientType = data.recipientType || (data.agentId ? 'AGENT' : 'CUSTOMER');

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        leadId: data.leadId || null,
        customerId: recipientType === 'AGENT' ? (data.customerId || null) : (data.customerId || null),
        agentId: data.agentId || null,
        recipientType,
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
        cabDetails: data.cabDetails || null,
        additionalCharges,
        paymentTerms: data.paymentTerms || null,
        cancellationTerms: data.cancellationTerms || null,
        notes: data.notes || null,
        basePrice: data.basePrice,
        basePackagePrice: data.basePackagePrice !== undefined ? data.basePackagePrice : (existing.basePackagePrice || 0),
        adultUnitPrice: data.adultUnitPrice !== undefined ? data.adultUnitPrice : (existing.adultUnitPrice || 0),
        childUnitPrice: data.childUnitPrice !== undefined ? data.childUnitPrice : (existing.childUnitPrice || 0),
        infantUnitPrice: data.infantUnitPrice !== undefined ? data.infantUnitPrice : (existing.infantUnitPrice || 0),
        discount: data.discount,
        tax: data.tax,
        finalAmount,
        status: data.status,
        termsAndConditions: data.termsAndConditions || existing.termsAndConditions,
        updatedById: req.user?.id || null,
      },
      include: {
        customer: true,
        agent: true,
        package: true,
        createdByUser: true,
      },
    });

    const recipientLogName = (updated as any).recipientType === 'AGENT'
      ? `${(updated as any).agent?.companyName || 'Agent'} (B2B Agent)`
      : ((updated as any).customer?.fullName || 'Customer');

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'UPDATE',
      entity: 'QUOTATION',
      entityId: id,
      details: `Updated quotation ${updated.quotationNumber} for ${recipientLogName} (₹${finalAmount})`,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Duplicate Quotation
router.post('/:id/duplicate', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const companyId = req.user!.companyId;
    const source = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true, agent: true },
    });

    if (!source || source.isDeleted || (source.companyId && source.companyId !== companyId)) {
      res.status(404).json({ message: 'Source quotation not found.' });
      return;
    }

    const tag = (req.user?.company?.name || 'CRM').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'CRM';
    const prefix = req.user?.company?.isOoting ? 'OOT' : tag;
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await prisma.quotation.count({ where: { companyId } });
    const quotationNumber = `${prefix}-QT-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const duplicate = await prisma.quotation.create({
      data: {
        companyId,
        quotationNumber,
        leadId: source.leadId,
        customerId: source.customerId,
        agentId: (source as any).agentId || null,
        recipientType: (source as any).recipientType || 'CUSTOMER',
        packageId: source.packageId,
        destination: source.destination,
        travelStartDate: source.travelStartDate,
        travelEndDate: source.travelEndDate,
        adults: source.adults,
        children: source.children,
        infants: source.infants,
        accommodation: source.accommodation,
        transport: source.transport,
        activities: source.activities,
        inclusions: source.inclusions,
        exclusions: source.exclusions,
        cabDetails: source.cabDetails,
        additionalCharges: source.additionalCharges,
        paymentTerms: source.paymentTerms,
        cancellationTerms: source.cancellationTerms,
        notes: source.notes ? `${source.notes} (Duplicated from ${source.quotationNumber})` : `Duplicated from ${source.quotationNumber}`,
        basePrice: source.basePrice,
        discount: source.discount,
        tax: source.tax,
        finalAmount: source.finalAmount,
        status: 'DRAFT',
        termsAndConditions: source.termsAndConditions,
        createdById: req.user?.id || null,
        updatedById: req.user?.id || null,
      },
      include: {
        customer: true,
        agent: true,
        package: true,
        createdByUser: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'CREATE',
      entity: 'QUOTATION',
      entityId: duplicate.id,
      details: `Duplicated quotation ${source.quotationNumber} into ${duplicate.quotationNumber}`,
      newValue: JSON.stringify(duplicate),
      ipAddress: req.ip,
    });

    res.status(201).json(duplicate);
  } catch (error) {
    next(error);
  }
});

// Update Quotation Status
router.patch('/:id/status', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const companyId = req.user!.companyId;
    const { status } = req.body;

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing || existing.isDeleted || (existing.companyId && existing.companyId !== companyId)) {
      res.status(404).json({ message: 'Quotation not found.' });
      return;
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status, updatedById: req.user?.id || null },
      include: { customer: true, agent: true },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'STATUS_CHANGE',
      entity: 'QUOTATION',
      entityId: id,
      details: `Quotation ${quotation.quotationNumber} marked as ${status}`,
      oldValue: JSON.stringify({ status: existing.status }),
      newValue: JSON.stringify({ status }),
      ipAddress: req.ip,
    });

    res.json(quotation);
  } catch (error) {
    next(error);
  }
});

// Delete Quotation (Soft-delete with Audit)
router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const companyId = req.user!.companyId;
    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true, agent: true },
    });

    if (!existing || existing.isDeleted || (existing.companyId && existing.companyId !== companyId)) {
      res.status(404).json({ message: 'Quotation not found.' });
      return;
    }

    await prisma.quotation.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: req.user!.id,
      },
    });

    const recipientLogName = (existing as any).recipientType === 'AGENT'
      ? `${(existing as any).agent?.companyName || 'Agent'} (B2B Agent)`
      : ((existing as any).customer?.fullName || 'Unknown');

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'DELETE',
      entity: 'QUOTATION',
      entityId: id,
      details: `Soft-deleted quotation ${existing.quotationNumber} for ${recipientLogName}`,
      oldValue: JSON.stringify({ isDeleted: false }),
      newValue: JSON.stringify({ isDeleted: true, deletedAt: new Date(), deletedById: req.user!.id }),
      ipAddress: req.ip,
    });

    res.json({ message: `Quotation ${existing.quotationNumber} deleted successfully.` });
  } catch (error) {
    next(error);
  }
});

// POST /api/quotations/:id/approve: Approve quotation and automatically generate confirmed booking in database
router.post('/:id/approve', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const companyId = req.user!.companyId;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        agent: true,
        package: true,
      },
    });

    if (!quotation || quotation.isDeleted || (quotation.companyId && quotation.companyId !== companyId)) {
      res.status(404).json({ message: 'Quotation not found.' });
      return;
    }

    // Check if a booking already exists for this quotation within tenant
    const existingBooking = await prisma.booking.findFirst({
      where: {
        OR: [
          { notes: { contains: quotation.quotationNumber } },
          ...(quotation.leadId ? [{ leadId: quotation.leadId }] : []),
        ],
        isDeleted: false,
        companyId,
      },
      include: { customer: true, package: true },
    });

    if (existingBooking) {
      await prisma.quotation.update({
        where: { id: quotation.id },
        data: { status: 'ACCEPTED', updatedById: req.user?.id || null },
      });
      res.json({
        message: `Quotation is already approved. Booking #${existingBooking.bookingNumber} confirmed.`,
        booking: existingBooking,
        quotation,
      });
      return;
    }

    // Handle B2B Agent quotation where customerId might be null
    let bookingCustomerId = quotation.customerId;
    const qAgent = (quotation as any).agent;
    if (!bookingCustomerId && (quotation as any).agentId && qAgent) {
      const existingCust = await prisma.customer.findFirst({
        where: {
          companyId,
          phone: qAgent.phone,
          isDeleted: false,
        },
      });
      if (existingCust) {
        bookingCustomerId = existingCust.id;
      } else {
        const newCust = await prisma.customer.create({
          data: {
            companyId,
            fullName: qAgent.contactPerson || qAgent.companyName,
            phone: qAgent.phone,
            email: qAgent.email || null,
            city: qAgent.city || null,
            state: qAgent.state || null,
            source: 'B2B_AGENT',
          },
        });
        bookingCustomerId = newCust.id;
      }
    }

    // Generate collision-free booking number with company prefix
    const tag = (req.user?.company?.name || 'CRM').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'CRM';
    const companyPrefix = req.user?.company?.isOoting ? 'OOT' : tag;
    const bookingNumber = await generateUniqueBookingNumber(prisma, companyPrefix);

    const travelStart = quotation.travelStartDate || new Date();
    const travelEnd = quotation.travelEndDate || new Date(Date.now() + 86400000 * 3);
    const travellers = (quotation.adults || 2) + (quotation.children || 0);

    const booking = await prisma.booking.create({
      data: {
        companyId,
        bookingNumber,
        customerId: bookingCustomerId!,
        leadId: quotation.leadId || null,
        packageId: quotation.packageId || null,
        assignedUserId: req.user!.id,
        travelStartDate: travelStart,
        travelEndDate: travelEnd,
        travellers,
        totalAmount: quotation.basePrice + (quotation.additionalCharges || 0) + quotation.tax,
        discount: quotation.discount || 0,
        finalAmount: quotation.finalAmount,
        bookingStatus: 'CONFIRMED',
        notes: `Confirmed from Quotation ${quotation.quotationNumber}.${quotation.notes ? ` ${quotation.notes}` : ''}`,
        createdById: req.user?.id || null,
        updatedById: req.user?.id || null,
        agentBooking: (quotation as any).agentId ? {
          create: {
            agentId: (quotation as any).agentId,
            commissionRate: 0,
            commissionAmount: 0,
            netAmount: quotation.finalAmount,
            payoutStatus: 'PENDING',
          },
        } : undefined,
      },
      include: {
        customer: true,
        package: true,
      },
    });

    // Mark quotation as ACCEPTED
    const updatedQuotation = await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'ACCEPTED', updatedById: req.user?.id || null },
      include: { customer: true },
    });

    // If linked to a lead, mark lead as WON
    if (quotation.leadId) {
      await prisma.lead.update({
        where: { id: quotation.leadId },
        data: { enquiryStatus: 'WON', updatedById: req.user?.id || null },
      });
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'STATUS_CHANGE',
      entity: 'QUOTATION',
      entityId: id,
      details: `Approved quotation ${quotation.quotationNumber} and generated Booking #${booking.bookingNumber}`,
      newValue: JSON.stringify({ status: 'ACCEPTED', bookingId: booking.id, bookingNumber: booking.bookingNumber }),
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: `Quotation ${quotation.quotationNumber} approved and Booking #${booking.bookingNumber} created successfully!`,
      booking,
      quotation: updatedQuotation,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
