import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// List expenses with category and date filtering
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10));
    const category = (req.query.category as string || '').trim();
    const bookingId = (req.query.bookingId as string || '').trim();
    const startDate = (req.query.startDate as string || '').trim();
    const endDate = (req.query.endDate as string || '').trim();

    const where: any = {};
    if (category) where.category = category;
    if (bookingId) where.bookingId = bookingId;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const [total, totalAmountObj, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.expense.findMany({
        where,
        include: {
          booking: { select: { id: true, bookingNumber: true, customer: { select: { fullName: true } } } },
          createdBy: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { expenseDate: 'desc' },
      }),
    ]);

    res.json({
      data: expenses,
      summary: {
        totalExpenseAmount: totalAmountObj._sum.amount || 0,
      },
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

const expenseSchema = z.object({
  category: z.enum(['HOTEL_BOOKING', 'TRANSPORT', 'GUIDE', 'FLIGHT_TICKETS', 'ENTRY_FEES', 'MARKETING', 'OFFICE', 'MISC']),
  amount: z.number().positive('Expense amount must be greater than zero'),
  expenseDate: z.string().optional(),
  description: z.string().min(2, 'Description is required'),
  bookingId: z.string().optional().nullable(),
});

// Create Expense
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = expenseSchema.parse(req.body);

    const expense = await prisma.expense.create({
      data: {
        category: data.category,
        amount: data.amount,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        description: data.description.trim(),
        bookingId: data.bookingId || null,
        createdById: req.user!.id,
      },
      include: {
        booking: { select: { bookingNumber: true } },
        createdBy: { select: { name: true } },
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'EXPENSE',
      entityId: expense.id,
      details: `Recorded ₹${expense.amount} for ${expense.category} - ${expense.description}`,
      ipAddress: req.ip,
    });

    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

// Delete Expense
router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const expense = await prisma.expense.findUnique({ where: { id } });

    if (!expense) {
      res.status(404).json({ message: 'Expense record not found.' });
      return;
    }

    await prisma.expense.delete({ where: { id } });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'DELETE',
      entity: 'EXPENSE',
      entityId: id,
      details: `Deleted expense of ₹${expense.amount} (${expense.category})`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
