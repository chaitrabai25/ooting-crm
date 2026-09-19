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
          permissions: true,
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
  permissions: z.string().optional().nullable(),
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
        permissions: data.permissions || null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        permissions: true,
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
  permissions: z.string().optional().nullable(),
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
        permissions: true,
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

// Delete user safely with full protection safeguards (ADMIN or SUPER_ADMIN)
router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);

    // Rule 1: Prevent user from deleting their own account
    if (req.user!.id === id) {
      res.status(400).json({ message: 'You cannot delete your own account.' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    // Rule 2: Only SUPER_ADMIN can delete another SUPER_ADMIN
    if (targetUser.role === 'SUPER_ADMIN') {
      if (req.user!.role !== 'SUPER_ADMIN') {
        res.status(403).json({ message: 'Only a Super Admin can delete another Super Admin.' });
        return;
      }

      // Rule 3: Cannot delete the last remaining active Super Admin
      const superAdminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
      });
      if (superAdminCount <= 1) {
        res.status(400).json({ message: 'Cannot delete the only remaining active Super Admin.' });
        return;
      }
    }

    // Unlink or safely reassign dependent relations before deletion
    await prisma.$transaction([
      prisma.supplier.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
      prisma.cabBooking.updateMany({ where: { assignedStaffId: id }, data: { assignedStaffId: null } }),
      prisma.customer.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
      prisma.booking.updateMany({ where: { assignedUserId: id }, data: { assignedUserId: req.user!.id } }),
      prisma.lead.updateMany({ where: { assignedUserId: id }, data: { assignedUserId: req.user!.id } }),
      prisma.followUp.updateMany({ where: { assignedUserId: id }, data: { assignedUserId: req.user!.id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'DELETE',
      entity: 'USER',
      entityId: id,
      details: `Deleted user ${targetUser.name} (${targetUser.role}, ${targetUser.email})`,
      ipAddress: req.ip,
    });

    res.json({ message: `Staff member "${targetUser.name}" has been deleted successfully.` });
  } catch (error) {
    next(error);
  }
});

export default router;
