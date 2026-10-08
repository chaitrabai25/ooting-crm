import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { config } from '../config/index.js';

const router = Router();
router.use(authenticate);

export function normalizeGstin(val?: string | null): string {
  if (!val || val === 'NULL') return 'NILL';
  const clean = String(val).trim();
  if (!clean) return 'NILL';
  return clean.toUpperCase();
}

let cachedCompanySettings: { data: any; expiresAt: number } | null = null;

export function invalidateCompanySettingsCache(): void {
  cachedCompanySettings = null;
}

const OOTING_COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

export async function getCompanySettings(targetCompanyId?: string) {
  try {
    const id = targetCompanyId || OOTING_COMPANY_ID;
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (company) {
      return {
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status,
        tagline: company.tagline || (company.isOoting ? config.company.tagline : ''),
        email: company.email || (company.isOoting ? config.company.email : ''),
        phone: company.phone || (company.isOoting ? config.company.phone : ''),
        address: company.address || (company.isOoting ? config.company.address : ''),
        city: company.city || '',
        state: company.state || '',
        country: company.country || 'India',
        pincode: company.pincode || '',
        website: company.website || (company.isOoting ? (config.company as any).website || 'https://ooting.in' : ''),
        gstin: normalizeGstin(company.gstin || (company.isOoting ? config.company.gstin : '')),
        logoUrl: company.logoUrl || (company.isOoting ? '/assets/ooting-logo.jpg' : ''),
        faviconUrl: company.faviconUrl || '',
        primaryColor: company.primaryColor || '#1E3A8A',
        secondaryColor: company.secondaryColor || '#E11D48',
        bankName: company.bankName || '',
        accountHolderName: company.accountHolderName || '',
        accountNumber: company.accountNumber || '',
        accountType: company.accountType || 'Current Account',
        ifsc: company.ifsc || '',
        branch: company.branch || '',
        upiId: company.upiId || '',
        paymentNotes: company.paymentNotes || '',
        isOoting: company.isOoting,
      };
    }

    // Fallback to Ooting default configuration
    return {
      id: OOTING_COMPANY_ID,
      name: config.company.name,
      slug: 'ooting',
      status: 'ACTIVE',
      tagline: config.company.tagline,
      email: config.company.email,
      phone: config.company.phone,
      address: config.company.address,
      city: 'Shivamogga',
      state: 'Karnataka',
      country: 'India',
      pincode: '577222',
      website: (config.company as any).website || 'https://ooting.in',
      gstin: normalizeGstin(config.company.gstin),
      logoUrl: '/assets/ooting-logo.jpg',
      faviconUrl: '/favicon.ico',
      primaryColor: '#1E3A8A',
      secondaryColor: '#E11D48',
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      accountType: 'Current Account',
      ifsc: '',
      branch: '',
      upiId: '',
      paymentNotes: '',
      isOoting: true,
    };
  } catch (error) {
    return {
      id: OOTING_COMPANY_ID,
      name: config.company.name,
      slug: 'ooting',
      status: 'ACTIVE',
      tagline: config.company.tagline,
      email: config.company.email,
      phone: config.company.phone,
      address: config.company.address,
      city: 'Shivamogga',
      state: 'Karnataka',
      country: 'India',
      pincode: '577222',
      website: (config.company as any).website || 'https://ooting.in',
      gstin: normalizeGstin(config.company.gstin),
      logoUrl: '/assets/ooting-logo.jpg',
      faviconUrl: '/favicon.ico',
      primaryColor: '#1E3A8A',
      secondaryColor: '#E11D48',
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      accountType: 'Current Account',
      ifsc: '',
      branch: '',
      upiId: '',
      paymentNotes: '',
      isOoting: true,
    };
  }
}

// Get Public / Authenticated Company Settings
router.get('/company', async (req: AuthRequest, res: Response, next) => {
  try {
    const companyId = req.user?.companyId || OOTING_COMPANY_ID;
    const company = await getCompanySettings(companyId);
    res.json({ company });
  } catch (error) {
    next(error);
  }
});

// Get All Settings
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const companyId = req.user?.companyId || OOTING_COMPANY_ID;
    const company = await getCompanySettings(companyId);

    res.json({
      company,
      masterData: {
        leadStatuses: ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION_SENT', 'FOLLOW_UP', 'WON', 'LOST', 'CANCELLED'],
        bookingStatuses: ['ENQUIRY', 'HOLD', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
        paymentMethods: ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'],
        followUpTypes: ['CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'OTHER'],
        expenseCategories: ['HOTEL_BOOKING', 'TRANSPORT', 'GUIDE', 'FLIGHT_TICKETS', 'ENTRY_FEES', 'MARKETING', 'OFFICE', 'MISC'],
      },
    });
  } catch (error) {
    next(error);
  }
});

const updateSettingsSchema = z.object({
  name: z.string().optional(),
  tagline: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  website: z.string().optional(),
  gstin: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountType: z.string().optional(),
  ifsc: z.string().optional(),
  branch: z.string().optional(),
  upiId: z.string().optional(),
  paymentNotes: z.string().optional(),
});

// Update Company Settings (Admin & Super Admin)
router.put('/', authorize('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = updateSettingsSchema.parse(req.body);
    const companyId = req.user?.companyId || OOTING_COMPANY_ID;

    // Update Company record directly
    await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.tagline !== undefined && { tagline: data.tagline }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.pincode !== undefined && { pincode: data.pincode }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.gstin !== undefined && { gstin: data.gstin }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.faviconUrl !== undefined && { faviconUrl: data.faviconUrl }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.secondaryColor !== undefined && { secondaryColor: data.secondaryColor }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.accountHolderName !== undefined && { accountHolderName: data.accountHolderName }),
        ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
        ...(data.accountType !== undefined && { accountType: data.accountType }),
        ...(data.ifsc !== undefined && { ifsc: data.ifsc }),
        ...(data.branch !== undefined && { branch: data.branch }),
        ...(data.upiId !== undefined && { upiId: data.upiId }),
        ...(data.paymentNotes !== undefined && { paymentNotes: data.paymentNotes }),
      },
    });

    // Also update legacy CompanySetting rows if Ooting instance for backwards compatibility
    if (companyId === OOTING_COMPANY_ID) {
      const updates = [
        { key: 'company_name', value: data.name },
        { key: 'company_tagline', value: data.tagline },
        { key: 'company_email', value: data.email },
        { key: 'company_phone', value: data.phone },
        { key: 'company_address', value: data.address },
        { key: 'company_website', value: data.website },
        { key: 'company_gstin', value: data.gstin },
        { key: 'company_logo_url', value: data.logoUrl },
        { key: 'bank_name', value: data.bankName },
        { key: 'account_holder_name', value: data.accountHolderName },
        { key: 'account_number', value: data.accountNumber },
        { key: 'account_type', value: data.accountType },
        { key: 'ifsc', value: data.ifsc },
        { key: 'branch', value: data.branch },
        { key: 'upi_id', value: data.upiId },
        { key: 'payment_notes', value: data.paymentNotes },
      ].filter(u => u.value !== undefined);

      for (const item of updates) {
        await prisma.companySetting.upsert({
          where: { key: item.key },
          update: { value: item.value! },
          create: { key: item.key, value: item.value!, companyId: OOTING_COMPANY_ID },
        });
      }
    }

    invalidateCompanySettingsCache();

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      companyId,
      action: 'UPDATE',
      entity: 'SETTING',
      details: 'Updated company profile and white-label settings',
      ipAddress: req.ip,
    });

    const updatedCompany = await getCompanySettings(companyId);
    res.json({ message: 'Settings saved successfully.', company: updatedCompany });
  } catch (error) {
    next(error);
  }
});

// Audit Logs list (Admin only)
router.get('/audit-logs', authorize('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '30', 10));
    const entity = (req.query.entity as string || '').trim();
    const action = (req.query.action as string || '').trim();
    const dateParam = (req.query.date as string || '').trim();
    const startDateParam = (req.query.startDate as string || '').trim();
    const endDateParam = (req.query.endDate as string || '').trim();
    const search = (req.query.search as string || '').trim();

    const where: any = {
      companyId: req.user!.companyId,
    };
    if (entity) where.entity = entity;
    if (action) where.action = action;

    if (dateParam) {
      const d = new Date(dateParam);
      if (!isNaN(d.getTime())) {
        const startOfDay = new Date(d);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(d);
        endOfDay.setUTCHours(23, 59, 59, 999);
        where.createdAt = { gte: startOfDay, lte: endOfDay };
      }
    } else if (startDateParam || endDateParam) {
      where.createdAt = {};
      if (startDateParam) {
        const s = new Date(startDateParam);
        if (!isNaN(s.getTime())) {
          s.setUTCHours(0, 0, 0, 0);
          where.createdAt.gte = s;
        }
      }
      if (endDateParam) {
        const e = new Date(endDateParam);
        if (!isNaN(e.getTime())) {
          e.setUTCHours(23, 59, 59, 999);
          where.createdAt.lte = e;
        }
      }
    }

    if (search) {
      where.OR = [
        { details: { contains: search } },
        { userName: { contains: search } },
        { ipAddress: { contains: search } },
        { entityId: { contains: search } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true } } },
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

// Complete Database Dump (Admin only)
router.get('/backup/dump', authorize('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const [
      customers,
      leads,
      bookings,
      quotations,
      cabs,
      payments,
      packages,
      agents,
      expenses,
      followups,
      users,
    ] = await Promise.all([
      prisma.customer.findMany(),
      prisma.lead.findMany(),
      prisma.booking.findMany({ include: { travellersList: true, payments: true } }),
      prisma.quotation.findMany(),
      prisma.cabBooking.findMany(),
      prisma.payment.findMany(),
      prisma.package.findMany({ include: { itineraries: true } }),
      prisma.agent.findMany(),
      prisma.expense.findMany(),
      prisma.followUp.findMany(),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, phone: true, status: true, createdAt: true },
      }),
    ]);

    const backupData = {
      app: 'Ooting CRM',
      exportedAt: new Date().toISOString(),
      exportedBy: req.user?.email || 'admin',
      summary: {
        customers: customers.length,
        leads: leads.length,
        bookings: bookings.length,
        quotations: quotations.length,
        cabBookings: cabs.length,
        payments: payments.length,
        packages: packages.length,
        agents: agents.length,
        expenses: expenses.length,
        followups: followups.length,
        users: users.length,
      },
      data: {
        customers,
        leads,
        bookings,
        quotations,
        cabs,
        payments,
        packages,
        agents,
        expenses,
        followups,
        users,
      },
    };

    const filename = `ooting-crm-full-dump-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    next(error);
  }
});

export default router;
