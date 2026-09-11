import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// List payments
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10));
    const search = (req.query.search as string || '').trim();
    const method = (req.query.method as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const sortBy = (req.query.sortBy as string || 'paymentDate').trim();
    const sortOrder = (req.query.sortOrder as string || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const allowedSorts = ['amount', 'paymentDate', 'paymentStatus', 'paymentMethod', 'createdAt'];
    const orderBy: any = {};
    if (allowedSorts.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.paymentDate = 'desc';
    }

    const where: any = {};
    if (search) {
      where.OR = [
        { transactionReference: { contains: search } },
        { booking: { bookingNumber: { contains: search } } },
        { booking: { customer: { fullName: { contains: search } } } },
        { booking: { customer: { phone: { contains: search } } } },
      ];
    }
    if (method) where.paymentMethod = method;
    if (status) where.paymentStatus = status;

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              customer: { select: { id: true, fullName: true, phone: true } },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
    ]);

    res.json({
      data: payments,
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

const paymentCreateSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  amount: z.number().positive('Payment amount must be greater than zero'),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER']).default('UPI'),
  transactionReference: z.string().optional().nullable(),
  paymentStatus: z.enum(['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED']).default('SUCCESS'),
  notes: z.string().optional().nullable(),
  allowOverpayment: z.boolean().optional().default(false),
});

// Record new Payment
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = paymentCreateSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        customer: true,
        payments: { where: { paymentStatus: 'SUCCESS' } },
      },
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    const totalPaidSoFar = booking.payments.reduce((acc, p) => acc + p.amount, 0);
    const balanceDue = Math.max(0, booking.finalAmount - totalPaidSoFar);

    // Rule: Do not allow payment amount to exceed booking amount unless explicit overpayment allowed
    if (!data.allowOverpayment && data.paymentStatus === 'SUCCESS' && data.amount > (balanceDue + 0.01)) {
      res.status(400).json({
        message: `Payment amount (₹${data.amount.toLocaleString()}) exceeds the outstanding balance (₹${balanceDue.toLocaleString()}).`,
        balanceDue,
      });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        bookingId: data.bookingId,
        amount: data.amount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference?.trim() || null,
        paymentStatus: data.paymentStatus,
        notes: data.notes?.trim() || null,
      },
      include: {
        booking: {
          include: { customer: true },
        },
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'PAYMENT',
      entityId: payment.id,
      details: `Recorded ₹${payment.amount} via ${payment.paymentMethod} for booking ${booking.bookingNumber} (${payment.paymentStatus})`,
      ipAddress: req.ip,
    });

    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
});

// Update Payment Status
router.patch('/:id/status', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { paymentStatus } = req.body;

    const payment = await prisma.payment.update({
      where: { id },
      data: { paymentStatus },
      include: { booking: true },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'STATUS_CHANGE',
      entity: 'PAYMENT',
      entityId: id,
      details: `Payment status updated to ${paymentStatus} for booking ${payment.booking.bookingNumber}`,
      ipAddress: req.ip,
    });

    res.json(payment);
  } catch (error) {
    next(error);
  }
});

export default router;
