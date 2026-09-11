import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// Quick counts for dashboard and navigation badges
router.get('/counts', async (req: AuthRequest, res: Response, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [todayCount, overdueCount, upcomingCount] = await Promise.all([
      prisma.followUp.count({
        where: {
          status: 'PENDING',
          scheduledAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
      prisma.followUp.count({
        where: {
          status: 'PENDING',
          scheduledAt: { lt: startOfToday },
        },
      }),
      prisma.followUp.count({
        where: {
          status: 'PENDING',
          scheduledAt: { gt: endOfToday },
        },
      }),
    ]);

    res.json({
      today: todayCount,
      overdue: overdueCount,
      upcoming: upcomingCount,
    });
  } catch (error) {
    next(error);
  }
});

// List follow-ups with type/time filter
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10));
    const filter = (req.query.filter as string || 'all').toLowerCase(); // 'today', 'overdue', 'upcoming', 'all'
    const status = (req.query.status as string || '').trim();
    const assignedUserId = (req.query.assignedUserId as string || '').trim();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const where: any = {};
    if (status) {
      where.status = status;
    } else if (filter !== 'all') {
      where.status = 'PENDING';
    }

    if (assignedUserId) where.assignedUserId = assignedUserId;

    if (filter === 'today') {
      where.scheduledAt = { gte: startOfToday, lte: endOfToday };
    } else if (filter === 'overdue') {
      where.scheduledAt = { lt: startOfToday };
    } else if (filter === 'upcoming') {
      where.scheduledAt = { gt: endOfToday };
    }

    const [total, followUps] = await Promise.all([
      prisma.followUp.count({ where }),
      prisma.followUp.findMany({
        where,
        include: {
          lead: {
            include: {
              customer: { select: { id: true, fullName: true, phone: true, email: true } },
            },
          },
          assignedUser: { select: { id: true, name: true, email: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: filter === 'overdue' ? { scheduledAt: 'asc' } : { scheduledAt: 'asc' },
      }),
    ]);

    res.json({
      data: followUps,
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

const followUpCreateSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  scheduledAt: z.string().min(1, 'Scheduled date/time is required'),
  type: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'OTHER']).default('CALL'),
  notes: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
});

// Create Follow-up
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = followUpCreateSchema.parse(req.body);

    const followUp = await prisma.followUp.create({
      data: {
        leadId: data.leadId,
        scheduledAt: new Date(data.scheduledAt),
        type: data.type,
        notes: data.notes?.trim() || null,
        assignedUserId: data.assignedUserId || req.user!.id,
        status: 'PENDING',
      },
      include: {
        lead: { include: { customer: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    });

    // Update nextFollowUpAt on the Lead
    await prisma.lead.update({
      where: { id: data.leadId },
      data: { nextFollowUpAt: new Date(data.scheduledAt) },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'LEAD',
      entityId: data.leadId,
      details: `Scheduled ${data.type} follow-up for ${followUp.lead.customer.fullName} at ${new Date(data.scheduledAt).toLocaleString()}`,
      ipAddress: req.ip,
    });

    res.status(201).json(followUp);
  } catch (error) {
    next(error);
  }
});

// Mark Complete
router.patch('/:id/complete', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { notes } = req.body;

    const followUp = await prisma.followUp.findUnique({
      where: { id },
      include: { lead: { include: { customer: true } } },
    });

    if (!followUp) {
      res.status(404).json({ message: 'Follow-up not found.' });
      return;
    }

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes: notes ? `${followUp.notes ? followUp.notes + '\n' : ''}[Completed]: ${notes}` : followUp.notes,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'STATUS_CHANGE',
      entity: 'LEAD',
      entityId: followUp.leadId,
      details: `Completed ${followUp.type} follow-up with ${followUp.lead.customer.fullName}`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Reschedule
router.patch('/:id/reschedule', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { scheduledAt, notes } = req.body;

    if (!scheduledAt) {
      res.status(400).json({ message: 'New scheduled date/time is required.' });
      return;
    }

    const followUp = await prisma.followUp.findUnique({
      where: { id },
      include: { lead: { include: { customer: true } } },
    });

    if (!followUp) {
      res.status(404).json({ message: 'Follow-up not found.' });
      return;
    }

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: 'PENDING',
        notes: notes ? `${followUp.notes ? followUp.notes + '\n' : ''}[Rescheduled]: ${notes}` : followUp.notes,
      },
    });

    // Update lead's nextFollowUpAt
    await prisma.lead.update({
      where: { id: followUp.leadId },
      data: { nextFollowUpAt: new Date(scheduledAt) },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'LEAD',
      entityId: followUp.leadId,
      details: `Rescheduled follow-up to ${new Date(scheduledAt).toLocaleString()}`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
