import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, requirePlatformMasterAdmin, AuthRequest } from '../middleware/auth.js';
import { pingTenantDatabase, provisionTenantRegistry } from '../services/tenantDb.service.js';

const router = Router();

// Strictly guard all SaaS routes: require authentication and Platform Master Admin authorization
router.use(authenticate);
router.use(requirePlatformMasterAdmin);

// Helper: Log platform administrative audit event
async function logPlatformAudit(params: {
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress?: string;
}) {
  try {
    await prisma.platformAuditLog.create({
      data: {
        adminId: params.adminId,
        adminEmail: params.adminEmail,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Failed to write platform audit log:', err);
  }
}

// -----------------------------------------------------------------------------
// 1. SaaS Dashboard Overview Metrics
// -----------------------------------------------------------------------------
router.get('/dashboard', async (req: AuthRequest, res: Response, next) => {
  try {
    const [
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalStaff,
      pendingRequests,
      tenantDatabases,
      recentAuditLogs,
      recentOrganizations,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: 'ACTIVE' } }),
      prisma.company.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      prisma.staffAccessRequest.count({ where: { status: 'PENDING' } }),
      prisma.tenantDatabase.findMany({ select: { status: true, lastPingMs: true } }),
      prisma.platformAuditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.company.findMany({
        take: 6,
        orderBy: [{ isOoting: 'desc' }, { createdAt: 'desc' }],
        include: {
          _count: {
            select: {
              users: true,
              customers: true,
              bookings: true,
              packages: true,
            },
          },
          tenantDatabase: {
            select: { status: true, lastPingMs: true },
          },
        },
      }),
    ]);

    const healthyDbs = tenantDatabases.filter((d) => d.status === 'READY').length;

    res.json({
      metrics: {
        totalOrganizations,
        activeOrganizations,
        suspendedOrganizations,
        totalStaff,
        pendingRequests,
        healthyDatabases: healthyDbs,
        totalDatabases: tenantDatabases.length,
      },
      recentAuditLogs,
      recentOrganizations,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 2. Organizations Directory (Searchable, filterable list)
// -----------------------------------------------------------------------------
router.get('/organizations', async (req: AuthRequest, res: Response, next) => {
  try {
    const search = (req.query.search as string || '').trim().toLowerCase();
    const status = (req.query.status as string || '').trim();
    const plan = (req.query.plan as string || '').trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { orgCode: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (plan && plan !== 'ALL') {
      where.subscriptionTier = plan;
    }

    const organizations = await prisma.company.findMany({
      where,
      orderBy: [{ isOoting: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            bookings: true,
            packages: true,
          },
        },
        tenantDatabase: {
          select: {
            status: true,
            dbName: true,
            lastPingMs: true,
            lastHealthCheck: true,
          },
        },
        users: {
          where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
          select: { id: true, name: true, email: true, role: true, phone: true },
          take: 1,
        },
      },
    });

    const enriched = organizations.map((org) => {
      const superAdmin = org.users[0] || null;
      return {
        ...org,
        superAdmin,
        users: undefined,
      };
    });

    res.json({ data: enriched });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 3. Organization Deep Dive
// -----------------------------------------------------------------------------
router.get('/organizations/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const org = await prisma.company.findUnique({
      where: { id },
      include: {
        tenantDatabase: true,
        users: {
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
          orderBy: { createdAt: 'asc' },
        },
        staffRequests: {
          orderBy: { createdAt: 'desc' },
          include: {
            requestingUser: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: {
            users: true,
            customers: true,
            bookings: true,
            packages: true,
            quotations: true,
          },
        },
      },
    });

    if (!org) {
      res.status(404).json({ message: 'Organization not found.' });
      return;
    }

    const auditLogs = await prisma.platformAuditLog.findMany({
      where: { targetId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ organization: org, auditLogs });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 4. Provision New Customer Organization
// -----------------------------------------------------------------------------
const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  slug: z.string().min(2, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  email: z.string().email('Valid company email is required'),
  phone: z.string().min(6, 'Contact phone is required'),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  subscriptionTier: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE', 'CUSTOM']).default('STARTER'),
  maxStaffLimit: z.number().int().min(1).default(1),
  adminName: z.string().min(2, 'Admin full name is required'),
  adminEmail: z.string().email('Valid admin email is required'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
  adminPhone: z.string().optional(),
});

router.post('/organizations', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = createOrgSchema.parse(req.body);

    // Verify slug uniqueness
    const existingSlug = await prisma.company.findUnique({
      where: { slug: data.slug.toLowerCase().trim() },
    });
    if (existingSlug) {
      res.status(400).json({ message: 'Organization with this slug identifier already exists.' });
      return;
    }

    // Verify admin email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.adminEmail.toLowerCase().trim() },
    });
    if (existingEmail) {
      res.status(400).json({ message: 'A user with this admin email already exists in the platform.' });
      return;
    }

    // Generate unique immutable Organization Code
    const orgCode = `ORG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    // Default 1-staff limit for customers
    const initialStaffLimit = data.maxStaffLimit || 1;

    // Transactional provisioning
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const company = await tx.company.create({
        data: {
          name: data.name.trim(),
          slug: data.slug.toLowerCase().trim(),
          orgCode,
          status: 'ACTIVE',
          provisioningStatus: 'READY',
          subscriptionTier: data.subscriptionTier,
          maxStaffLimit: initialStaffLimit,
          email: data.email.toLowerCase().trim(),
          phone: data.phone.trim(),
          website: data.website?.trim() || null,
          address: data.address?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null,
          pincode: data.pincode?.trim() || null,
          isOoting: false,
        },
      });

      // 2. Create Initial Company Super Admin
      const admin = await tx.user.create({
        data: {
          name: data.adminName.trim(),
          email: data.adminEmail.toLowerCase().trim(),
          phone: data.adminPhone?.trim() || data.phone.trim(),
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
          companyId: company.id,
          permissions: JSON.stringify({
            leads: { view: true, create: true, edit: true, delete: true, export: true },
            quotations: { view: true, create: true, edit: true, delete: true, export: true },
            bookings: { view: true, create: true, edit: true, delete: true, export: true },
            cabs: { view: true, create: true, edit: true, delete: true, export: true },
            customers: { view: true, create: true, edit: true, delete: true, export: true },
            packages: { view: true, create: true, edit: true, delete: true },
            suppliers: { view: true, create: true, edit: true, delete: true, export: true },
            agents: { view: true, create: true, edit: true, delete: true, export: true },
            payments: { view: true, create: true, edit: true, delete: true, export: true },
            reports: { view: true, export: true },
          }),
        },
      });

      return { company, admin };
    });

    // 3. Register Tenant Database in registry
    await provisionTenantRegistry({
      companyId: result.company.id,
      slug: result.company.slug,
    });

    await logPlatformAudit({
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'ORG_CREATED',
      targetType: 'ORGANIZATION',
      targetId: result.company.id,
      details: `Provisioned customer organization "${result.company.name}" (Code: ${result.company.orgCode}, Limit: ${result.company.maxStaffLimit}) with admin ${result.admin.email}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: `Organization "${result.company.name}" created and provisioned successfully.`,
      organization: result.company,
      admin: {
        id: result.admin.id,
        name: result.admin.name,
        email: result.admin.email,
        role: result.admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 5. Suspend Organization (Immediate Server-Side Session Invalidation)
// -----------------------------------------------------------------------------
const suspendSchema = z.object({
  reason: z.string().min(3, 'Suspension reason is required'),
});

router.post('/organizations/:id/suspend', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { reason } = suspendSchema.parse(req.body);

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      res.status(404).json({ message: 'Organization not found.' });
      return;
    }

    if (company.isOoting) {
      res.status(400).json({ message: 'The primary Ooting instance cannot be suspended.' });
      return;
    }

    // Invalidate sessions immediately & record suspension
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update company status and increment revocation version
      const updatedCompany = await tx.company.update({
        where: { id },
        data: {
          status: 'SUSPENDED',
          suspensionReason: reason.trim(),
          suspendedAt: new Date(),
          suspendedBy: req.user!.email,
          tokenRevocationVersion: { increment: 1 },
        },
      });

      // 2. Insert session revocation record for immediate token invalidation
      await tx.sessionRevocation.create({
        data: {
          companyId: id,
          reason: `Organization suspended by Master Admin: ${reason.trim()}`,
        },
      });

      return updatedCompany;
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    await logPlatformAudit({
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'ORG_SUSPENDED',
      targetType: 'ORGANIZATION',
      targetId: id,
      details: `Suspended organization "${company.name}". Reason: ${reason}`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Organization "${company.name}" has been suspended. All active sessions have been invalidated immediately.`,
      organization: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 6. Reactivate Organization
// -----------------------------------------------------------------------------
router.post('/organizations/:id/reactivate', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      res.status(404).json({ message: 'Organization not found.' });
      return;
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
      },
    });

    await logPlatformAudit({
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'ORG_REACTIVATED',
      targetType: 'ORGANIZATION',
      targetId: id,
      details: `Reactivated organization "${company.name}".`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Organization "${company.name}" has been reactivated successfully.`,
      organization: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 7. Update Staff Limit
// -----------------------------------------------------------------------------
const updateStaffLimitSchema = z.object({
  maxStaffLimit: z.number().int().min(1, 'Staff limit must be at least 1'),
});

router.put('/organizations/:id/staff-limit', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { maxStaffLimit } = updateStaffLimitSchema.parse(req.body);

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      res.status(404).json({ message: 'Organization not found.' });
      return;
    }

    const updated = await prisma.company.update({
      where: { id },
      data: { maxStaffLimit },
    });

    await logPlatformAudit({
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'STAFF_LIMIT_CHANGED',
      targetType: 'ORGANIZATION',
      targetId: id,
      details: `Adjusted staff limit for "${company.name}" from ${company.maxStaffLimit} to ${maxStaffLimit}`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Staff limit for "${company.name}" updated to ${maxStaffLimit}.`,
      organization: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 8. Update Subscription Tier & Expiry
// -----------------------------------------------------------------------------
const updateSubscriptionSchema = z.object({
  subscriptionTier: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE', 'CUSTOM']),
  maxStaffLimit: z.number().int().min(1).optional(),
  subscriptionExpiresAt: z.string().datetime().nullable().optional(),
});

router.put('/organizations/:id/subscription', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const data = updateSubscriptionSchema.parse(req.body);

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      res.status(404).json({ message: 'Organization not found.' });
      return;
    }

    const updateData: any = {
      subscriptionTier: data.subscriptionTier,
    };
    if (data.maxStaffLimit !== undefined) {
      updateData.maxStaffLimit = data.maxStaffLimit;
    }
    if (data.subscriptionExpiresAt !== undefined) {
      updateData.subscriptionExpiresAt = data.subscriptionExpiresAt ? new Date(data.subscriptionExpiresAt) : null;
    }

    const updated = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    await logPlatformAudit({
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'SUBSCRIPTION_UPDATED',
      targetType: 'ORGANIZATION',
      targetId: id,
      details: `Updated subscription for "${company.name}" to ${data.subscriptionTier}`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Subscription for "${company.name}" updated successfully.`,
      organization: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 9. Staff Access Requests Queue
// -----------------------------------------------------------------------------
router.get('/staff-requests', async (req: AuthRequest, res: Response, next) => {
  try {
    const status = (req.query.status as string || 'ALL').trim();
    const where: any = {};
    if (status !== 'ALL') {
      where.status = status;
    }

    const requests = await prisma.staffAccessRequest.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            orgCode: true,
            maxStaffLimit: true,
            subscriptionTier: true,
          },
        },
        requestingUser: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    res.json({ data: requests });
  } catch (error) {
    next(error);
  }
});

// Approve staff access request
router.post('/staff-requests/:id/approve', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const reviewNotes = (req.body.reviewNotes as string || '').trim();

    const request = await prisma.staffAccessRequest.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!request) {
      res.status(404).json({ message: 'Staff access request not found.' });
      return;
    }

    if (request.status !== 'PENDING') {
      res.status(400).json({ message: `Request is already ${request.status}.` });
      return;
    }

    // Transactionally update request and increase company seat limit
    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.staffAccessRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedByUserId: req.user!.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || 'Approved by Master Admin',
        },
      });

      const updatedCompany = await tx.company.update({
        where: { id: request.companyId },
        data: {
          maxStaffLimit: request.requestedStaffLimit,
        },
      });

      return { updatedRequest, updatedCompany };
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    await logPlatformAudit({
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'STAFF_REQUEST_APPROVED',
      targetType: 'STAFF_REQUEST',
      targetId: id,
      details: `Approved staff increase for "${request.company.name}" from ${request.company.maxStaffLimit} to ${request.requestedStaffLimit} seats.`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Staff request approved. Seat limit for "${request.company.name}" increased to ${request.requestedStaffLimit}.`,
      request: result.updatedRequest,
      company: result.updatedCompany,
    });
  } catch (error) {
    next(error);
  }
});

// Reject staff access request
router.post('/staff-requests/:id/reject', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const reviewNotes = (req.body.reviewNotes as string || req.body.rejectionReason as string || req.body.reason as string || 'Declined by Master Admin').trim();

    const request = await prisma.staffAccessRequest.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!request) {
      res.status(404).json({ message: 'Staff access request not found.' });
      return;
    }

    if (request.status !== 'PENDING') {
      res.status(400).json({ message: `Request is already ${request.status}.` });
      return;
    }

    const updated = await prisma.staffAccessRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedByUserId: req.user!.id,
        reviewedAt: new Date(),
        reviewNotes,
      },
    });

    await logPlatformAudit({
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'STAFF_REQUEST_REJECTED',
      targetType: 'STAFF_REQUEST',
      targetId: id,
      details: `Rejected staff increase for "${request.company.name}". Reason: ${reviewNotes}`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Staff request rejected.`,
      request: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 10. Tenant Database Registry & Health Checks
// -----------------------------------------------------------------------------
router.get('/databases', async (req: AuthRequest, res: Response, next) => {
  try {
    const databases = await prisma.tenantDatabase.findMany({
      include: {
        company: {
          select: { id: true, name: true, slug: true, orgCode: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Remove sensitive encrypted secret from response
    const sanitized = databases.map((db) => ({
      ...db,
      dbSecretEncrypted: undefined,
    }));

    res.json({ data: sanitized });
  } catch (error) {
    next(error);
  }
});

// Ping tenant database live
router.post('/databases/:companyId/ping', async (req: AuthRequest, res: Response, next) => {
  try {
    const companyId = req.params.companyId as string;
    const pingResult = await pingTenantDatabase(companyId);
    res.json(pingResult);
  } catch (error) {
    next(error);
  }
});

// Retry tenant database provisioning
router.post('/databases/:companyId/retry', async (req: AuthRequest, res: Response, next) => {
  try {
    const companyId = req.params.companyId as string;
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(404).json({ message: 'Organization not found.' });
      return;
    }

    const reg = await provisionTenantRegistry({
      companyId,
      slug: company.slug,
    });

    await prisma.company.update({
      where: { id: companyId },
      data: { provisioningStatus: 'READY' },
    });

    res.json({ message: 'Provisioning retried successfully.', database: reg });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 11. Platform Audit Logs
// -----------------------------------------------------------------------------
router.get('/audit-logs', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '25', 10));
    const action = (req.query.action as string || '').trim();

    const where: any = {};
    if (action && action !== 'ALL') {
      where.action = action;
    }

    const [total, logs] = await Promise.all([
      prisma.platformAuditLog.count({ where }),
      prisma.platformAuditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      data: logs,
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

// -----------------------------------------------------------------------------
// 12. SaaS Subscription Plans
// -----------------------------------------------------------------------------
router.get('/plans', async (req: AuthRequest, res: Response, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { maxStaff: 'asc' },
    });
    res.json({ data: plans });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 13. SaaS Global Settings
// -----------------------------------------------------------------------------
router.get('/settings', async (req: AuthRequest, res: Response, next) => {
  try {
    const settings = {
      defaultStaffLimit: 1,
      supportEmail: 'support@ooting.com',
      supportPhone: '+91 6362845243',
      platformName: 'Ooting Multi-Company SaaS Platform',
      version: '2.5.0-saas',
      isolationModel: 'Central Registry with Dynamic Tenant Database Routing & Strict Logical Scoping',
    };
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

export default router;
