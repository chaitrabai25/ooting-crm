import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// Quick staff list for dropdown assignments (all authenticated users can read)
router.get('/staff', async (req: AuthRequest, res: Response, next) => {
  try {
    const staff = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json(staff);
  } catch (error) {
    next(error);
  }
});

// Full users list (ADMIN or SUPER_ADMIN)
router.get('/', authorize('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10));
    const search = (req.query.search as string || '').trim();
    const role = (req.query.role as string || '').trim();
    const status = (req.query.status as string || '').trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      data: users,
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

const createUserSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'ACCOUNTANT', 'AGENT']),
  phone: z.string().optional(),
});

// Create new user (ADMIN or SUPER_ADMIN)
router.post('/', authorize('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      res.status(400).json({ message: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role,
        phone: data.phone?.trim() || null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'USER',
      entityId: user.id,
      details: `Created user ${user.name} (${user.role})`,
      ipAddress: req.ip,
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'ACCOUNTANT', 'AGENT']).optional(),
  phone: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  password: z.string().min(6).optional(),
});

// Update user (ADMIN or SUPER_ADMIN)
router.put('/:id', authorize('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const data = updateUserSchema.parse(req.body);

    const updatePayload: any = { ...data };
    if (data.email) updatePayload.email = data.email.toLowerCase().trim();
    if (data.password) {
      updatePayload.passwordHash = await bcrypt.hash(data.password, 10);
      delete updatePayload.password;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'USER',
      entityId: id,
      details: `Updated user profile for ${updatedUser.name}`,
      ipAddress: req.ip,
    });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

export default router;
