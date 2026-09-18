import { Router, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

const ALLOWED_AGENT_SORT_FIELDS = ['companyName', 'contactPerson', 'city', 'status', 'createdAt'];

// List B2B agents with aggregated revenue & commission metrics
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '10', 10));
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const sortByParam = (req.query.sortBy as string || 'createdAt').trim();
    const sortOrderParam = (req.query.sortOrder as string || 'desc').toLowerCase();

    const sortBy = ALLOWED_AGENT_SORT_FIELDS.includes(sortByParam) ? sortByParam : 'createdAt';
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactPerson: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (status) where.status = status;

    const [total, agents] = await Promise.all([
      prisma.agent.count({ where }),
      prisma.agent.findMany({
        where,
        include: {
          agentBookings: {
            include: {
              booking: { select: { finalAmount: true, bookingStatus: true } },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    const data = agents.map(agent => {
      let totalRevenue = 0;
      let totalCommission = 0;
      let pendingCommission = 0;

      for (const ab of agent.agentBookings) {
        if (ab.booking && ab.booking.bookingStatus !== 'CANCELLED') {
          totalRevenue += Number(ab.booking.finalAmount);
          totalCommission += Number(ab.commissionAmount);
          if (ab.payoutStatus === 'PENDING') {
            pendingCommission += Number(ab.commissionAmount);
          }
        }
      }

      return {
        id: agent.id,
        companyName: agent.companyName,
        contactPerson: agent.contactPerson,
        phone: agent.phone,
        email: agent.email,
        city: agent.city,
        state: agent.state,
        gstNumber: agent.gstNumber,
        status: agent.status,
        googleReviewUrl: agent.googleReviewUrl,
        googleReviewRating: agent.googleReviewRating,
        googleReviewNotes: agent.googleReviewNotes,
        totalBookings: agent.agentBookings.length,
        totalRevenue,
        totalCommission,
        pendingCommission,
        createdAt: agent.createdAt,
      };
    });

    res.json({
      data,
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

// Single Agent profile with complete booking history
router.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        agentBookings: {
          include: {
            booking: {
              include: {
                customer: true,
                package: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agent) {
      res.status(404).json({ message: 'B2B Agent not found.' });
      return;
    }

    let totalRevenue = 0;
    let totalCommission = 0;
    let paidCommission = 0;
    let pendingCommission = 0;

    for (const ab of agent.agentBookings) {
      if (ab.booking && ab.booking.bookingStatus !== 'CANCELLED') {
        totalRevenue += Number(ab.booking.finalAmount);
        totalCommission += Number(ab.commissionAmount);
        if (ab.payoutStatus === 'PAID') {
          paidCommission += Number(ab.commissionAmount);
        } else {
          pendingCommission += Number(ab.commissionAmount);
        }
      }
    }

    res.json({
      ...agent,
      metrics: {
        totalBookings: agent.agentBookings.length,
        totalRevenue,
        totalCommission,
        paidCommission,
        pendingCommission,
      },
    });
  } catch (error) {
    next(error);
  }
});

const agentSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  phone: z.string().min(8, 'Phone number is required'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  googleReviewUrl: z.string().optional().nullable().or(z.literal('')),
  googleReviewRating: z.number().min(1).max(5).optional().nullable(),
  googleReviewNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Create Agent
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = agentSchema.parse(req.body);

    const agent = await prisma.agent.create({
      data: {
        companyName: data.companyName.trim(),
        contactPerson: data.contactPerson.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        gstNumber: data.gstNumber?.trim() || null,
        status: data.status,
        googleReviewUrl: data.googleReviewUrl?.trim() || null,
        googleReviewRating: data.googleReviewRating || null,
        googleReviewNotes: data.googleReviewNotes?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'AGENT',
      entityId: agent.id,
      details: `Registered B2B agent "${agent.companyName}" (${agent.contactPerson})`,
      ipAddress: req.ip,
    });

    res.status(201).json(agent);
  } catch (error) {
    next(error);
  }
});

// Update Agent
router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const data = agentSchema.partial().parse(req.body);

    const updatePayload: any = { ...data };
    if (data.companyName) updatePayload.companyName = data.companyName.trim();
    if (data.contactPerson) updatePayload.contactPerson = data.contactPerson.trim();
    if (data.phone) updatePayload.phone = data.phone.trim();
    if (data.email !== undefined) updatePayload.email = data.email?.trim() || null;
    if (data.city !== undefined) updatePayload.city = data.city?.trim() || null;
    if (data.state !== undefined) updatePayload.state = data.state?.trim() || null;
    if (data.gstNumber !== undefined) updatePayload.gstNumber = data.gstNumber?.trim() || null;
    if (data.googleReviewUrl !== undefined) updatePayload.googleReviewUrl = data.googleReviewUrl?.trim() || null;
    if (data.googleReviewRating !== undefined) updatePayload.googleReviewRating = data.googleReviewRating;
    if (data.googleReviewNotes !== undefined) updatePayload.googleReviewNotes = data.googleReviewNotes?.trim() || null;
    if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null;

    const updated = await prisma.agent.update({
      where: { id },
      data: updatePayload,
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'AGENT',
      entityId: id,
      details: `Updated details for B2B agent ${updated.companyName}`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Bulk Import Agents from Excel / JSON
router.post('/import', async (req: AuthRequest, res: Response, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'No agent records provided for import.' });
      return;
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.companyName || !item.contactPerson || !item.phone) {
        skipped++;
        errors.push(`Row ${i + 1}: Agency name, contact person, and phone are required.`);
        continue;
      }

      const phone = String(item.phone).trim();
      const companyName = String(item.companyName).trim();
      const email = item.email ? String(item.email).trim() : null;

      const existing = await prisma.agent.findFirst({
        where: {
          OR: [
            { phone },
            { companyName: { equals: companyName } },
            ...(email ? [{ email: { equals: email } }] : []),
          ],
        },
      });

      if (existing) {
        skipped++;
        errors.push(`Row ${i + 1}: Agent "${companyName}" or phone ${phone} already exists.`);
        continue;
      }

      await prisma.agent.create({
        data: {
          companyName,
          contactPerson: String(item.contactPerson).trim(),
          phone,
          email,
          city: item.city ? String(item.city).trim() : null,
          state: item.state ? String(item.state).trim() : null,
          gstNumber: item.gstNumber ? String(item.gstNumber).trim() : null,
          googleReviewUrl: item.googleReviewUrl ? String(item.googleReviewUrl).trim() : null,
          googleReviewRating: item.googleReviewRating ? Number(item.googleReviewRating) : null,
          googleReviewNotes: item.googleReviewNotes ? String(item.googleReviewNotes).trim() : null,
          status: item.status === 'INACTIVE' || item.status === 'SUSPENDED' ? item.status : 'ACTIVE',
          notes: item.notes ? String(item.notes).trim() : null,
        },
      });
      imported++;
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'IMPORT',
      entity: 'AGENT',
      details: `Imported ${imported} B2B agents, skipped ${skipped}`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Successfully imported ${imported} B2B agents. Skipped ${skipped} records.`,
      imported,
      skipped,
      errors,
    });
  } catch (error) {
    next(error);
  }
});

// Update Commission Payout Status
router.patch('/bookings/:agentBookingId/payout', async (req: AuthRequest, res: Response, next) => {
  try {
    const agentBookingId = req.params.agentBookingId as string;
    const { payoutStatus } = req.body;

    const updated = await prisma.agentBooking.update({
      where: { id: agentBookingId },
      data: { payoutStatus },
      include: { agent: true, booking: true },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'STATUS_CHANGE',
      entity: 'AGENT',
      entityId: updated.agentId,
      details: `Commission payout status updated to ${payoutStatus} for booking ${updated.booking.bookingNumber}`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Export agents to Excel (.xlsx)
router.get('/export/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        agentBookings: {
          include: {
            booking: { select: { finalAmount: true, bookingStatus: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = agents.map((agent, idx) => {
      let totalRevenue = 0;
      let totalCommission = 0;
      let pendingCommission = 0;

      for (const ab of agent.agentBookings) {
        if (ab.booking && ab.booking.bookingStatus !== 'CANCELLED') {
          totalRevenue += Number(ab.booking.finalAmount);
          totalCommission += Number(ab.commissionAmount);
          if (ab.payoutStatus !== 'PAID') {
            pendingCommission += Number(ab.commissionAmount);
          }
        }
      }

      return {
        'S.No.': idx + 1,
        'Company Name': agent.companyName,
        'Contact Person': agent.contactPerson,
        'Phone': agent.phone,
        'Email': agent.email || '',
        'City': agent.city || '',
        'State': agent.state || '',
        'GST Number': agent.gstNumber || '',
        'Status': agent.status,
        'Total Revenue': totalRevenue,
        'Total Commission': totalCommission,
        'Pending Commission': pendingCommission,
        'Created Date': agent.createdAt.toISOString().split('T')[0],
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agents');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'AGENT',
      details: `Exported ${agents.length} agent records to Excel (.xlsx)`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-agents-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
