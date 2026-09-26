import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { config } from '../config/index.js';

const router = Router();
router.use(authenticate);

export async function getCompanySettings() {
  try {
    const settings = await prisma.companySetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return {
      name: settingsMap['company_name'] || config.company.name,
      tagline: settingsMap['company_tagline'] || config.company.tagline,
      email: settingsMap['company_email'] || config.company.email,
      phone: settingsMap['company_phone'] || config.company.phone,
      address: settingsMap['company_address'] || config.company.address,
      website: settingsMap['company_website'] || (config.company as any).website || 'https://ooting.in',
      gstin: settingsMap['company_gstin'] || config.company.gstin,
      logoUrl: settingsMap['company_logo_url'] || '/assets/ooting-logo.jpg',
      bankName: settingsMap['bank_name'] || '',
      accountHolderName: settingsMap['account_holder_name'] || '',
      accountNumber: settingsMap['account_number'] || '',
      accountType: settingsMap['account_type'] || 'Current Account',
      ifsc: settingsMap['ifsc'] || '',
      branch: settingsMap['branch'] || '',
      upiId: settingsMap['upi_id'] || '',
      paymentNotes: settingsMap['payment_notes'] || '',
    };
  } catch (error) {
    return {
      name: config.company.name,
      tagline: config.company.tagline,
      email: config.company.email,
      phone: config.company.phone,
      address: config.company.address,
      website: (config.company as any).website || 'https://ooting.in',
      gstin: config.company.gstin,
      logoUrl: '/assets/ooting-logo.jpg',
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      accountType: 'Current Account',
      ifsc: '',
      branch: '',
      upiId: '',
      paymentNotes: '',
    };
  }
}

// Get Public / Authenticated Company Settings
router.get('/company', async (_req: AuthRequest, res: Response, next) => {
  try {
    const company = await getCompanySettings();
    res.json({ company });
  } catch (error) {
    next(error);
  }
});

// Get All Settings
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const company = await getCompanySettings();

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
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  gstin: z.string().optional(),
  logoUrl: z.string().optional(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountType: z.string().optional(),
  ifsc: z.string().optional(),
  branch: z.string().optional(),
  upiId: z.string().optional(),
  paymentNotes: z.string().optional(),
});

// Update Company Settings (Admin only)
router.put('/', authorize('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = updateSettingsSchema.parse(req.body);

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
        create: { key: item.key, value: item.value! },
      });
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'SETTING',
      details: 'Updated company profile settings',
      ipAddress: req.ip,
    });

    res.json({ message: 'Settings saved successfully.' });
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

    const where: any = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;

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
