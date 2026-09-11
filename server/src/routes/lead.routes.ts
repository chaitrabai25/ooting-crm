import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// List leads with filters, search, and pagination
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10));
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const priority = (req.query.priority as string || '').trim();
    const destination = (req.query.destination as string || '').trim();
    const assignedUserId = (req.query.assignedUserId as string || '').trim();
    const source = (req.query.source as string || '').trim();
    const sortBy = (req.query.sortBy as string || 'createdAt').trim();
    const sortOrder = (req.query.sortOrder as string || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const allowedSorts = ['destination', 'enquiryStatus', 'priority', 'travelStartDate', 'createdAt'];
    const orderBy: any = {};
    if (allowedSorts.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const where: any = {};
    if (search) {
      where.OR = [
        { customer: { fullName: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { customer: { email: { contains: search } } },
        { destination: { contains: search } },
        { notes: { contains: search } },
      ];
    }
    if (status) where.enquiryStatus = status;
    if (priority) where.priority = priority;
    if (destination) where.destination = { contains: destination };
    if (assignedUserId) where.assignedUserId = assignedUserId;
    if (source) where.source = source;

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true, email: true, city: true } },
          assignedUser: { select: { id: true, name: true, email: true } },
          package: { select: { id: true, packageName: true, price: true } },
          _count: {
            select: { followUps: true, quotations: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
    ]);

    res.json({
      data: leads,
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

// Single Lead with complete timeline
router.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedUser: { select: { id: true, name: true, email: true, phone: true } },
        package: true,
        followUps: {
          include: { assignedUser: { select: { id: true, name: true } } },
          orderBy: { scheduledAt: 'desc' },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
        bookings: {
          include: {
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      res.status(404).json({ message: 'Lead not found.' });
      return;
    }

    // Also fetch relevant audit logs for this lead
    const timelineLogs = await prisma.auditLog.findMany({
      where: {
        entity: 'LEAD',
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ lead, timelineLogs });
  } catch (error) {
    next(error);
  }
});

const leadCreateSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  customerCity: z.string().optional(),
  destination: z.string().min(2, 'Destination is required'),
  travelStartDate: z.string().optional().nullable(),
  travelEndDate: z.string().optional().nullable(),
  adults: z.number().int().min(1).default(2),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  budget: z.number().optional().nullable(),
  packageId: z.string().optional().nullable(),
  source: z.string().default('WEBSITE'),
  enquiryStatus: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION_SENT', 'FOLLOW_UP', 'WON', 'LOST', 'CANCELLED']).default('NEW'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  notes: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
});

// Create Lead (handles existing or new customer on the fly)
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = leadCreateSchema.parse(req.body);

    let customerId = data.customerId;

    // If customerId is not provided, check or create customer by phone
    if (!customerId) {
      if (!data.customerPhone || !data.customerName) {
        res.status(400).json({ message: 'Customer details (Name and Phone) are required.' });
        return;
      }

      let customer = await prisma.customer.findFirst({
        where: { phone: data.customerPhone.trim() },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            fullName: data.customerName.trim(),
            phone: data.customerPhone.trim(),
            email: data.customerEmail?.trim() || null,
            city: data.customerCity?.trim() || null,
            source: data.source,
            assignedToId: data.assignedUserId || req.user!.id,
            status: 'ACTIVE',
          },
        });
      }
      customerId = customer.id;
    }

    const lead = await prisma.lead.create({
      data: {
        customerId,
        destination: data.destination.trim(),
        travelStartDate: data.travelStartDate ? new Date(data.travelStartDate) : null,
        travelEndDate: data.travelEndDate ? new Date(data.travelEndDate) : null,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        budget: data.budget ? Number(data.budget) : null,
        packageId: data.packageId || null,
        source: data.source || 'WEBSITE',
        enquiryStatus: data.enquiryStatus || 'NEW',
        priority: data.priority || 'MEDIUM',
        notes: data.notes?.trim() || null,
        assignedUserId: data.assignedUserId || req.user!.id,
        nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
      },
      include: {
        customer: true,
        assignedUser: { select: { id: true, name: true } },
        package: { select: { id: true, packageName: true } },
      },
    });

    // If a next follow-up date was specified, schedule a follow-up record automatically
    if (data.nextFollowUpAt) {
      await prisma.followUp.create({
        data: {
          leadId: lead.id,
          assignedUserId: lead.assignedUserId,
          scheduledAt: new Date(data.nextFollowUpAt),
          type: 'CALL',
          notes: `Initial follow-up scheduled upon lead creation: ${data.notes || ''}`,
          status: 'PENDING',
        },
      });
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'LEAD',
      entityId: lead.id,
      details: `Created lead for ${lead.customer.fullName} to ${lead.destination} (${lead.enquiryStatus})`,
      ipAddress: req.ip,
    });

    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
});

// Update Lead
router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const body = req.body;

    const currentLead = await prisma.lead.findUnique({ where: { id } });
    if (!currentLead) {
      res.status(404).json({ message: 'Lead not found.' });
      return;
    }

    const updatePayload: any = {};
    if (body.destination !== undefined) updatePayload.destination = body.destination.trim();
    if (body.travelStartDate !== undefined) updatePayload.travelStartDate = body.travelStartDate ? new Date(body.travelStartDate) : null;
    if (body.travelEndDate !== undefined) updatePayload.travelEndDate = body.travelEndDate ? new Date(body.travelEndDate) : null;
    if (body.adults !== undefined) updatePayload.adults = Number(body.adults);
    if (body.children !== undefined) updatePayload.children = Number(body.children);
    if (body.infants !== undefined) updatePayload.infants = Number(body.infants);
    if (body.budget !== undefined) updatePayload.budget = body.budget !== null ? Number(body.budget) : null;
    if (body.packageId !== undefined) updatePayload.packageId = body.packageId || null;
    if (body.source !== undefined) updatePayload.source = body.source;
    if (body.enquiryStatus !== undefined) updatePayload.enquiryStatus = body.enquiryStatus;
    if (body.priority !== undefined) updatePayload.priority = body.priority;
    if (body.notes !== undefined) updatePayload.notes = body.notes?.trim() || null;
    if (body.assignedUserId !== undefined) updatePayload.assignedUserId = body.assignedUserId || null;
    if (body.nextFollowUpAt !== undefined) updatePayload.nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;

    const updated = await prisma.lead.update({
      where: { id },
      data: updatePayload,
      include: {
        customer: true,
        assignedUser: { select: { id: true, name: true } },
        package: { select: { id: true, packageName: true } },
      },
    });

    let detailMsg = `Updated lead for ${updated.customer.fullName}`;
    if (body.enquiryStatus && body.enquiryStatus !== currentLead.enquiryStatus) {
      detailMsg = `Status changed from ${currentLead.enquiryStatus} to ${body.enquiryStatus}`;
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: body.enquiryStatus && body.enquiryStatus !== currentLead.enquiryStatus ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'LEAD',
      entityId: id,
      details: detailMsg,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Quick status change
router.patch('/:id/status', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { status, notes } = req.body;

    const currentLead = await prisma.lead.findUnique({ where: { id }, include: { customer: true } });
    if (!currentLead) {
      res.status(404).json({ message: 'Lead not found.' });
      return;
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        enquiryStatus: status,
        notes: notes ? `${currentLead.notes ? currentLead.notes + '\n' : ''}[${new Date().toLocaleDateString()}] ${notes}` : currentLead.notes,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'STATUS_CHANGE',
      entity: 'LEAD',
      entityId: id,
      details: `Lead status changed from ${currentLead.enquiryStatus} to ${status}${notes ? ` (Note: ${notes})` : ''}`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Convert WON lead into Booking
router.post('/:id/convert-booking', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { totalAmount, discount, travelStartDate, travelEndDate, travellers, notes } = req.body;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { customer: true, package: true },
    });

    if (!lead) {
      res.status(404).json({ message: 'Lead not found.' });
      return;
    }

    // Generate unique booking number: OOT-BK-YYYYMM-XXXX
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const bookingCount = await prisma.booking.count();
    const bookingNumber = `OOT-BK-${dateStr}-${String(bookingCount + 1).padStart(4, '0')}`;

    const gross = Number(totalAmount || lead.budget || lead.package?.price || 0);
    const disc = Number(discount || 0);
    const finalAmount = Math.max(0, gross - disc);

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId: lead.customerId,
        leadId: lead.id,
        packageId: lead.packageId || null,
        assignedUserId: lead.assignedUserId || req.user!.id,
        travelStartDate: travelStartDate ? new Date(travelStartDate) : (lead.travelStartDate || new Date()),
        travelEndDate: travelEndDate ? new Date(travelEndDate) : (lead.travelEndDate || new Date(Date.now() + 86400000 * 3)),
        travellers: Number(travellers || (lead.adults + lead.children) || 1),
        totalAmount: gross,
        discount: disc,
        finalAmount,
        bookingStatus: 'CONFIRMED',
        notes: notes?.trim() || `Converted from Lead ${lead.id}`,
      },
      include: {
        customer: true,
        package: true,
      },
    });

    // Mark lead as WON
    await prisma.lead.update({
      where: { id: lead.id },
      data: { enquiryStatus: 'WON' },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'BOOKING',
      entityId: booking.id,
      details: `Converted lead to booking ${booking.bookingNumber} for ₹${finalAmount}`,
      ipAddress: req.ip,
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

// Export leads to CSV
router.get('/export/csv', async (req: AuthRequest, res: Response, next) => {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        customer: true,
        assignedUser: { select: { name: true } },
        package: { select: { packageName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Lead ID', 'Customer Name', 'Phone', 'Destination', 'Start Date', 'End Date', 'Adults', 'Children', 'Budget', 'Package', 'Status', 'Priority', 'Source', 'Assigned To', 'Next Followup', 'Created Date'];
    const rows = leads.map(l => [
      l.id,
      `"${l.customer.fullName.replace(/"/g, '""')}"`,
      `"${l.customer.phone}"`,
      `"${l.destination.replace(/"/g, '""')}"`,
      l.travelStartDate ? l.travelStartDate.toISOString().split('T')[0] : '',
      l.travelEndDate ? l.travelEndDate.toISOString().split('T')[0] : '',
      l.adults,
      l.children,
      l.budget || 0,
      `"${l.package?.packageName || ''}"`,
      l.enquiryStatus,
      l.priority,
      l.source,
      `"${l.assignedUser?.name || ''}"`,
      l.nextFollowUpAt ? l.nextFollowUpAt.toISOString().split('T')[0] : '',
      l.createdAt.toISOString().split('T')[0],
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'LEAD',
      details: `Exported ${leads.length} lead records to CSV`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-leads-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

export default router;
