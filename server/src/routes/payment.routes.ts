import { Router, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// List payments
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '10', 10));
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
  customerId: z.string().optional().nullable(),
  amount: z.number().positive('Payment amount must be greater than zero'),
  paymentDate: z.string().optional(),
  paymentTime: z.string().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER']).default('UPI'),
  transactionReference: z.string().optional().nullable(),
  screenshotUrl: z.string().optional().nullable(),
  paymentStatus: z.enum(['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED']).default('SUCCESS'),
  notes: z.string().optional().nullable(),
  allowOverpayment: z.boolean().optional().default(false),
});

// Check UTR uniqueness endpoint
router.get('/check-utr', async (req: AuthRequest, res: Response, next) => {
  try {
    const utr = (req.query.utr as string || '').trim();
    if (!utr) {
      res.json({ exists: false });
      return;
    }
    const existing = await prisma.payment.findFirst({
      where: {
        transactionReference: utr,
      },
      include: {
        booking: {
          include: { customer: true },
        },
      },
    });

    res.json({
      exists: !!existing,
      message: existing ? 'This UTR number already exists for another payment. Please enter a unique UTR number.' : null,
      bookingNumber: (existing as any)?.booking?.bookingNumber,
      customerName: (existing as any)?.booking?.customer?.fullName,
    });
  } catch (error) {
    next(error);
  }
});

// Record new Payment
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = paymentCreateSchema.parse(req.body);

    // Enforce Unique UTR check
    if (data.transactionReference && data.transactionReference.trim()) {
      const cleanUtr = data.transactionReference.trim();
      const duplicate = await prisma.payment.findFirst({
        where: {
          transactionReference: cleanUtr,
        },
        include: {
          booking: {
            include: { customer: true },
          },
        },
      });

      if (duplicate) {
        res.status(409).json({
          message: 'This UTR number already exists for another payment. Please enter a unique UTR number.',
          duplicateBooking: (duplicate as any).booking?.bookingNumber,
          duplicateCustomer: (duplicate as any).booking?.customer?.fullName,
        });
        return;
      }
    }

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

    const totalPaidSoFar = booking.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const balanceDue = Math.max(0, Number(booking.finalAmount) - totalPaidSoFar);

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
        customerId: data.customerId || booking.customerId || null,
        amount: data.amount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        paymentTime: data.paymentTime?.trim() || null,
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference?.trim() || null,
        screenshotUrl: data.screenshotUrl?.trim() || null,
        recordedById: req.user!.id,
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

// Export payments to Excel (.xlsx)
router.get('/export/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        booking: {
          include: {
            customer: { select: { fullName: true, phone: true } },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const rows = payments.map((p, idx) => ({
      'S.No.': idx + 1,
      'Transaction Ref': p.transactionReference || 'N/A',
      'Booking Ref': p.booking.bookingNumber,
      'Customer Name': p.booking.customer.fullName,
      'Phone': p.booking.customer.phone,
      'Amount': Number(p.amount),
      'Payment Method': p.paymentMethod,
      'Payment Status': p.paymentStatus,
      'Payment Date': p.paymentDate.toISOString().split('T')[0],
      'Notes': p.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'PAYMENT',
      details: `Exported ${payments.length} payment records to Excel (.xlsx)`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-payments-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
