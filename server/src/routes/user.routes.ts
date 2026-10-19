import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { sendStaffWelcomeEmail } from '../services/email.service.js';

const router = Router();
router.use(authenticate);

// Quick staff list for dropdown assignments (all authenticated users can read, scoped to company)
router.get('/staff', async (req: AuthRequest, res: Response, next) => {
  try {
    const staff = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        companyId: req.user!.companyId,
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json(staff);
  } catch (error) {
    next(error);
  }
});

// Full users list (ADMIN or SUPER_ADMIN scoped to company)
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10));
    const search = (req.query.search as string || '').trim();
    const role = (req.query.role as string || '').trim();
    const status = (req.query.status as string || '').trim();

    // SUPER_ADMIN can inspect other tenants if ?companyId= is explicitly supplied
    const targetCompanyId = (req.user!.role === 'SUPER_ADMIN' && req.query.companyId)
      ? String(req.query.companyId)
      : req.user!.companyId;

    const where: any = {
      companyId: targetCompanyId,
    };

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
          companyId: true,
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
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'ACCOUNTANT', 'AGENT', 'TOUR_GUIDE']),
  phone: z.string().optional(),
  permissions: z.string().optional().nullable(),
  companyId: z.string().optional(),
});

// Get staff usage and seat limit metrics for the current company
router.get('/staff-usage', async (req: AuthRequest, res: Response, next) => {
  try {
    const companyId = req.user!.companyId;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, orgCode: true, maxStaffLimit: true, isOoting: true },
    });

    if (!company) {
      res.status(404).json({ message: 'Company not found.' });
      return;
    }

    const currentStaff = await prisma.user.count({
      where: {
        companyId,
        role: { not: 'SUPER_ADMIN' },
        status: { in: ['ACTIVE', 'INVITED'] },
      },
    });

    const maxStaffLimit = company.isOoting ? 9999 : (company.maxStaffLimit || 1);
    const remainingSeats = Math.max(0, maxStaffLimit - currentStaff);
    const isLimitReached = !company.isOoting && currentStaff >= maxStaffLimit;

    // Check for pending staff request
    const pendingRequest = await prisma.staffAccessRequest.findFirst({
      where: { companyId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      companyId: company.id,
      companyName: company.name,
      orgCode: company.orgCode,
      currentStaff,
      maxStaffLimit,
      remainingSeats,
      isLimitReached,
      isOoting: company.isOoting,
      pendingRequest,
    });
  } catch (error) {
    next(error);
  }
});

const staffAccessRequestSchema = z.object({
  requestedStaffLimit: z.number().int().optional(),
  requestedSeats: z.number().int().optional(),
  reason: z.string().min(3, 'Please provide a clear business reason for additional staff access'),
  businessJustification: z.string().optional(),
});

// Customer Super Admin requests additional staff seat limit
router.post('/request-staff', authorize('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = staffAccessRequestSchema.parse(req.body);
    const companyId = req.user!.companyId;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      res.status(404).json({ message: 'Organization not found.' });
      return;
    }

    if (company.isOoting) {
      res.status(400).json({ message: 'Primary Ooting instance does not require staff seat requests.' });
      return;
    }

    // Check if an unresolved request already exists
    const existingPending = await prisma.staffAccessRequest.findFirst({
      where: { companyId, status: 'PENDING' },
    });

    if (existingPending) {
      res.status(400).json({
        message: 'A staff access request is already pending review with Ooting Master Admin.',
        request: existingPending,
      });
      return;
    }

    const currentStaffCount = await prisma.user.count({
      where: {
        companyId,
        role: { not: 'SUPER_ADMIN' },
        status: { in: ['ACTIVE', 'INVITED'] },
      },
    });

    const targetLimit = data.requestedStaffLimit ?? (company.maxStaffLimit + (data.requestedSeats || 1));

    if (targetLimit <= company.maxStaffLimit) {
      res.status(400).json({
        message: `Requested limit (${targetLimit}) must be greater than your current limit (${company.maxStaffLimit}).`,
      });
      return;
    }

    const request = await prisma.staffAccessRequest.create({
      data: {
        companyId,
        requestingUserId: req.user!.id,
        currentStaffCount,
        requestedStaffLimit: targetLimit,
        reason: data.reason.trim(),
        status: 'PENDING',
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'CREATE',
      entity: 'SETTING',
      entityId: request.id,
      details: `Submitted Staff Access Request for ${targetLimit} seats (Current: ${company.maxStaffLimit})`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Staff access request submitted successfully. Ooting Master Admin has been notified for review.',
      request,
    });
  } catch (error) {
    next(error);
  }
});

// View organization's staff request history
router.get('/my-staff-requests', authorize('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const companyId = req.user!.companyId;
    const requests = await prisma.staffAccessRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        requestingUser: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ data: requests });
  } catch (error) {
    next(error);
  }
});

// Create new user (SUPER_ADMIN or Company ADMIN) with concurrency-safe 1-staff limit
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    // Company Admin cannot create SUPER_ADMIN accounts
    if (!req.user!.isPlatformMasterAdmin && data.role === 'SUPER_ADMIN') {
      res.status(403).json({ message: 'Only Ooting Platform Master Admins can provision Super Admin accounts.' });
      return;
    }

    // Determine tenant ID - non-platform admins are strictly bound to their own company
    const targetCompanyId = (req.user!.isPlatformMasterAdmin && data.companyId)
      ? data.companyId
      : req.user!.companyId;

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Transactional creation with concurrency-safe staff limit check
    const newUser = await prisma.$transaction(async (tx) => {
      const company = await tx.company.findUniqueOrThrow({
        where: { id: targetCompanyId },
      });

      // Strict staff seat limit check for non-Ooting organizations
      if (!company.isOoting && data.role !== 'SUPER_ADMIN') {
        const currentStaffCount = await tx.user.count({
          where: {
            companyId: targetCompanyId,
            role: { not: 'SUPER_ADMIN' },
            status: { in: ['ACTIVE', 'INVITED'] },
          },
        });

        if (currentStaffCount >= company.maxStaffLimit) {
          const limitErr: any = new Error(
            `Staff account limit reached (${currentStaffCount}/${company.maxStaffLimit}). Please request additional staff access from Ooting Master Admin.`
          );
          limitErr.status = 403;
          limitErr.code = 'STAFF_LIMIT_REACHED';
          throw limitErr;
        }
      }

      const existing = await tx.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });

      if (existing) {
        const existErr: any = new Error('User with this email already exists.');
        existErr.status = 400;
        throw existErr;
      }

      const userRecord = await tx.user.create({
        data: {
          name: data.name.trim(),
          email: data.email.toLowerCase().trim(),
          passwordHash,
          role: data.role,
          companyId: targetCompanyId,
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
          companyId: true,
          permissions: true,
          createdAt: true,
        },
      });

      // If user is a Tour Guide, auto-link or create TourGuide profile
      if (userRecord.role === 'TOUR_GUIDE') {
        const existingGuide = await tx.tourGuide.findFirst({
          where: {
            companyId: targetCompanyId,
            OR: [
              { email: userRecord.email },
              ...(userRecord.phone ? [{ phone: userRecord.phone }] : []),
            ],
          },
        });

        if (existingGuide) {
          await tx.tourGuide.update({
            where: { id: existingGuide.id },
            data: { userId: userRecord.id },
          });
        } else {
          const guideCount = await tx.tourGuide.count({ where: { companyId: targetCompanyId } });
          const guideCode = `GD-${String(guideCount + 1).padStart(3, '0')}`;
          await tx.tourGuide.create({
            data: {
              companyId: targetCompanyId,
              guideCode,
              fullName: userRecord.name,
              email: userRecord.email,
              phone: userRecord.phone || 'N/A',
              userId: userRecord.id,
              status: 'ACTIVE',
              guideType: 'INTERNAL',
            },
          });
        }
      }

      return userRecord;
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId: targetCompanyId,
      action: 'CREATE',
      entity: 'USER',
      entityId: newUser.id,
      details: `Created user ${newUser.name} (${newUser.role}) for company ${targetCompanyId}`,
      ipAddress: req.ip,
    });

    // Asynchronously dispatch welcome credentials email to new staff member
    (async () => {
      try {
        const comp = await prisma.company.findUnique({
          where: { id: targetCompanyId },
          select: { name: true },
        });
        const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
        const loginUrl = `${origin}/login`;

        await sendStaffWelcomeEmail({
          to: newUser.email,
          name: newUser.name,
          email: newUser.email,
          temporaryPassword: data.password,
          role: newUser.role,
          companyName: comp?.name || 'Ooting CRM',
          loginUrl,
        });
      } catch (emailErr: any) {
        console.warn('[UserRoute] Non-blocking welcome email error:', emailErr?.message);
      }
    })();

    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ message: error.message, code: error.code });
      return;
    }
    next(error);
  }
});

const inviteUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(2, 'Name is required').optional(),
  role: z.enum(['ADMIN', 'SALES', 'OPERATIONS', 'ACCOUNTANT', 'AGENT', 'TOUR_GUIDE']).default('SALES'),
  phone: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
});

// Invite employee account with strict concurrency-safe staff seat limit
router.post('/invite', authorize('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = inviteUserSchema.parse(req.body);
    const targetCompanyId = req.user!.companyId;

    const tempPassword = data.password || `Welcome@${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const userName = data.name ? data.name.trim() : data.email.split('@')[0];

    const newUser = await prisma.$transaction(async (tx) => {
      const company = await tx.company.findUniqueOrThrow({
        where: { id: targetCompanyId },
      });

      // Strict staff seat limit check
      if (!company.isOoting) {
        const currentStaffCount = await tx.user.count({
          where: {
            companyId: targetCompanyId,
            role: { not: 'SUPER_ADMIN' },
            status: { in: ['ACTIVE', 'INVITED'] },
          },
        });

        if (currentStaffCount >= company.maxStaffLimit) {
          const limitErr: any = new Error(
            `Staff account limit reached (${currentStaffCount}/${company.maxStaffLimit}). Please request additional staff access from Ooting Master Admin.`
          );
          limitErr.status = 403;
          limitErr.code = 'STAFF_LIMIT_REACHED';
          throw limitErr;
        }
      }

      const existing = await tx.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });

      if (existing) {
        const existErr: any = new Error('User with this email already exists.');
        existErr.status = 400;
        throw existErr;
      }

      return tx.user.create({
        data: {
          name: userName,
          email: data.email.toLowerCase().trim(),
          passwordHash,
          role: data.role,
          companyId: targetCompanyId,
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
          companyId: true,
          createdAt: true,
        },
      });
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId: targetCompanyId,
      action: 'CREATE',
      entity: 'USER',
      entityId: newUser.id,
      details: `Invited employee ${newUser.name} (${newUser.email}) to tenant ${targetCompanyId}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: `Employee "${newUser.name}" successfully added to company.`,
      user: newUser,
      temporaryPassword: tempPassword,
    });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ message: error.message, code: error.code });
      return;
    }
    next(error);
  }
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'ACCOUNTANT', 'AGENT', 'TOUR_GUIDE']).optional(),
  phone: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  password: z.string().min(6).optional(),
  permissions: z.string().optional().nullable(),
});

// Update user (SUPER_ADMIN or Company ADMIN within their tenant)
router.put('/:id', authorize('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const data = updateUserSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    // Tenant isolation: Company Admin can only update users within their own company
    if (req.user!.role !== 'SUPER_ADMIN' && targetUser.companyId !== req.user!.companyId) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    // Role safety: Company Admin cannot change anyone into or out of SUPER_ADMIN
    if (req.user!.role !== 'SUPER_ADMIN') {
      if (data.role === 'SUPER_ADMIN' || targetUser.role === 'SUPER_ADMIN') {
        res.status(403).json({ message: 'Only Super Admins can manage Super Admin roles.' });
        return;
      }
    }

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
        companyId: true,
        permissions: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId: targetUser.companyId || req.user!.companyId,
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

// Update user status directly (Toggle Active/Inactive)
router.patch('/:id/status', authorize('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      res.status(400).json({ message: 'Invalid status. Must be ACTIVE or INACTIVE.' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (req.user!.role !== 'SUPER_ADMIN' && targetUser.companyId !== req.user!.companyId) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    // Prevent modifying own status
    if (targetUser.id === req.user!.id) {
      res.status(400).json({ message: 'You cannot change your own account status.' });
      return;
    }

    // Role safety: Company Admin cannot deactivate SUPER_ADMIN
    if (req.user!.role !== 'SUPER_ADMIN' && targetUser.role === 'SUPER_ADMIN') {
      res.status(403).json({ message: 'Only Super Admins can modify Super Admin accounts.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId: targetUser.companyId,
      action: 'UPDATE',
      entity: 'USER',
      entityId: id,
      details: `Changed user "${targetUser.name}" status from ${targetUser.status} to ${status}`,
      ipAddress: req.ip,
    });

    res.json({ message: `Staff user "${targetUser.name}" status updated to ${status}.`, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

// Delete user safely with full protection safeguards (SUPER_ADMIN or Company ADMIN within their tenant)
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
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

    // Tenant isolation: Company Admin can only delete users in their company
    if (req.user!.role !== 'SUPER_ADMIN' && targetUser.companyId !== req.user!.companyId) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    // Rule 2: Only SUPER_ADMIN can delete another SUPER_ADMIN
    if (targetUser.role === 'SUPER_ADMIN') {
      if (req.user!.role !== 'SUPER_ADMIN') {
        res.status(403).json({ message: 'Only a Super Admin can delete a Super Admin.' });
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
      companyId: targetUser.companyId || req.user!.companyId,
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
