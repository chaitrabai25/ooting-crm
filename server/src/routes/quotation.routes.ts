import { Router, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { config } from '../config/index.js';
import { getCompanySettings } from './setting.routes.js';

const router = Router();
router.use(authenticate);

// Export quotations to Excel (.xlsx)
router.get('/export/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const customerId = (req.query.customerId as string || '').trim();
    const packageId = (req.query.packageId as string || '').trim();
    const createdById = (req.query.createdById as string || '').trim();

    const where: any = { isDeleted: false };
    if (search) {
      where.OR = [
        { quotationNumber: { contains: search } },
        { destination: { contains: search } },
        { customer: { fullName: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (packageId) where.packageId = packageId;
    if (createdById) where.createdById = createdById;

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: true,
        package: true,
        createdByUser: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = quotations.map((q, idx) => ({
      'S.No': idx + 1,
      'Quotation No': q.quotationNumber,
      'Customer Name': q.customer?.fullName || 'N/A',
      'Phone': q.customer?.phone || 'N/A',
      'Email': q.customer?.email || 'N/A',
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
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotations');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'QUOTATION',
      details: `Exported ${quotations.length} quotation records to Excel (.xlsx)`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-quotations-${Date.now()}.xlsx`);
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
    const packageId = (req.query.packageId as string || '').trim();
    const createdById = (req.query.createdById as string || '').trim();
    const startDate = (req.query.startDate as string || '').trim();
    const endDate = (req.query.endDate as string || '').trim();

    const where: any = { isDeleted: false };
    if (search) {
      where.OR = [
        { quotationNumber: { contains: search } },
        { destination: { contains: search } },
        { customer: { fullName: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
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
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        lead: true,
        createdByUser: { select: { id: true, name: true, email: true, phone: true } },
        package: {
          include: {
            itineraries: { orderBy: { dayNumber: 'asc' } },
          },
        },
      },
    });

    if (!quotation || quotation.isDeleted) {
      res.status(404).json({ message: 'Quotation not found.' });
      return;
    }

    const company = await getCompanySettings();

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
});

// Create Quotation
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = quotationSchema.parse(req.body);

    // Calculate final amount strictly: (basePrice - discount) + tax + additionalCharges
    const additionalCharges = data.additionalCharges || 0;
    const finalAmount = Math.max(0, (data.basePrice - data.discount) + data.tax + additionalCharges);

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

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'QUOTATION',
      entityId: quotation.id,
      details: `Generated quotation ${quotation.quotationNumber} for ${quotation.customer.fullName} (₹${finalAmount})`,
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
    const data = quotationSchema.parse(req.body);

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      res.status(404).json({ message: 'Quotation not found.' });
      return;
    }

    const additionalCharges = data.additionalCharges || 0;
    const finalAmount = Math.max(0, (data.basePrice - data.discount) + data.tax + additionalCharges);

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
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
        package: true,
        createdByUser: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'QUOTATION',
      entityId: id,
      details: `Updated quotation ${updated.quotationNumber} for ${updated.customer.fullName} (₹${finalAmount})`,
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
    const source = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!source || source.isDeleted) {
      res.status(404).json({ message: 'Source quotation not found.' });
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await prisma.quotation.count();
    const quotationNumber = `OOT-QT-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const duplicate = await prisma.quotation.create({
      data: {
        quotationNumber,
        leadId: source.leadId,
        customerId: source.customerId,
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
        package: true,
        createdByUser: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
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
    const { status } = req.body;

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      res.status(404).json({ message: 'Quotation not found.' });
      return;
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status, updatedById: req.user?.id || null },
      include: { customer: true },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
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
    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!existing || existing.isDeleted) {
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

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'DELETE',
      entity: 'QUOTATION',
      entityId: id,
      details: `Soft-deleted quotation ${existing.quotationNumber} for ${existing.customer?.fullName || 'Unknown'}`,
      oldValue: JSON.stringify({ isDeleted: false }),
      newValue: JSON.stringify({ isDeleted: true, deletedAt: new Date(), deletedById: req.user!.id }),
      ipAddress: req.ip,
    });

    res.json({ message: `Quotation ${existing.quotationNumber} deleted successfully.` });
  } catch (error) {
    next(error);
  }
});

export default router;
