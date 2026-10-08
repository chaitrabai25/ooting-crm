import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { getCompanySettings, invalidateCompanySettingsCache } from './setting.routes.js';

const router = Router();
router.use(authenticate);

const OOTING_COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

// -----------------------------------------------------------------------------
// 1. Current Tenant Self-Service Endpoints (Any authenticated Company Admin)
// -----------------------------------------------------------------------------

router.get('/my-company', async (req: AuthRequest, res: Response, next) => {
  try {
    const companyId = req.user!.companyId || OOTING_COMPANY_ID;
    const company = await getCompanySettings(companyId);
    res.json({ company });
  } catch (error) {
    next(error);
  }
});

const updateMyCompanySchema = z.object({
  name: z.string().min(2).optional(),
  tagline: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountType: z.string().optional(),
  ifsc: z.string().optional(),
  branch: z.string().optional(),
  upiId: z.string().optional(),
  paymentNotes: z.string().optional(),
});

router.put('/my-company', authorize('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = updateMyCompanySchema.parse(req.body);
    const companyId = req.user!.companyId || OOTING_COMPANY_ID;

    const updated = await prisma.company.update({
      where: { id: companyId },
      data,
    });

    invalidateCompanySettingsCache();

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'UPDATE',
      entity: 'SETTING',
      entityId: companyId,
      details: `Updated tenant white-label branding & company details`,
      ipAddress: req.ip,
    });

    const company = await getCompanySettings(companyId);
    res.json({ message: 'Company settings updated successfully.', company });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 2. Super Admin Management Endpoints (Strictly SUPER_ADMIN)
// -----------------------------------------------------------------------------

// List all tenants with statistics
router.get('/', authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (status) where.status = status;

    const companies = await prisma.company.findMany({
      where,
      orderBy: [{ isOoting: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            leads: true,
            bookings: true,
            packages: true,
          },
        },
      },
    });

    res.json({ data: companies });
  } catch (error) {
    next(error);
  }
});

const createCompanySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  slug: z.string().min(2, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  tagline: z.string().optional(),
  email: z.string().email('Valid company email is required'),
  phone: z.string().min(6, 'Contact phone is required'),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  adminName: z.string().min(2, 'Admin full name is required'),
  adminEmail: z.string().email('Valid admin email is required'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
  adminPhone: z.string().optional(),
});

// Provision a new customer company with its Company Admin
router.post('/', authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = createCompanySchema.parse(req.body);

    // Verify slug uniqueness
    const existingSlug = await prisma.company.findUnique({
      where: { slug: data.slug.toLowerCase().trim() },
    });
    if (existingSlug) {
      res.status(400).json({ message: 'Company with this slug identifier already exists.' });
      return;
    }

    // Verify admin email uniqueness
    const existingAdminEmail = await prisma.user.findUnique({
      where: { email: data.adminEmail.toLowerCase().trim() },
    });
    if (existingAdminEmail) {
      res.status(400).json({ message: 'A user with this admin email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          name: data.name.trim(),
          slug: data.slug.toLowerCase().trim(),
          status: 'ACTIVE',
          tagline: data.tagline?.trim() || null,
          email: data.email.toLowerCase().trim(),
          phone: data.phone.trim(),
          website: data.website?.trim() || null,
          address: data.address?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null,
          pincode: data.pincode?.trim() || null,
          gstin: data.gstin?.trim() || null,
          primaryColor: data.primaryColor || '#1E3A8A',
          secondaryColor: data.secondaryColor || '#E11D48',
          isOoting: false,
        },
      });

      // 2. Create Company Admin (role: ADMIN)
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

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId: result.company.id,
      action: 'CREATE',
      entity: 'USER',
      entityId: result.company.id,
      details: `Provisioned customer tenant "${result.company.name}" (Slug: ${result.company.slug}) with admin ${result.admin.email}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: `Tenant "${result.company.name}" created successfully.`,
      company: result.company,
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

const updateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
  tagline: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

// Update company profile or toggle status (Super Admin only)
router.put('/:id', authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const data = updateCompanySchema.parse(req.body);

    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Company not found.' });
      return;
    }

    // Safety rule: Cannot suspend or deactivate primary Ooting instance
    if (existing.isOoting && data.status && data.status !== 'ACTIVE') {
      res.status(400).json({ message: 'The primary Ooting tenant cannot be suspended or deactivated.' });
      return;
    }

    const updated = await prisma.company.update({
      where: { id },
      data,
    });

    invalidateCompanySettingsCache();

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId: id,
      action: 'UPDATE',
      entity: 'SETTING',
      entityId: id,
      details: `Updated company details for "${updated.name}" (${updated.status})`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Company updated successfully.', company: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
