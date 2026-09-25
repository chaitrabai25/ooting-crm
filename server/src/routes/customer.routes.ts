import { Router, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

const ALLOWED_CUSTOMER_SORT_FIELDS = ['fullName', 'phone', 'city', 'state', 'source', 'status', 'createdAt'];

// List customers with search, filtering, and pagination
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '10', 10));
    const search = (req.query.search as string || '').trim();
    const source = (req.query.source as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const assignedToId = (req.query.assignedToId as string || '').trim();
    const packageId = (req.query.packageId as string || '').trim();
    const sortByParam = (req.query.sortBy as string || 'createdAt').trim();
    const sortOrderParam = (req.query.sortOrder as string || 'desc').toLowerCase();

    const sortBy = ALLOWED_CUSTOMER_SORT_FIELDS.includes(sortByParam) ? sortByParam : 'createdAt';
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

    const where: any = { isDeleted: false };
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { city: { contains: search } },
      ];
    }
    if (source) where.source = source;
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (packageId) {
      where.bookings = { some: { packageId } };
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          createdByUser: { select: { id: true, name: true, email: true } },
          updatedByUser: { select: { id: true, name: true, email: true } },
          _count: {
            select: { leads: true, bookings: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    res.json({
      data: customers,
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

// 360-degree customer profile
router.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        leads: {
          include: {
            package: { select: { id: true, packageName: true, destination: true } },
            followUps: { orderBy: { scheduledAt: 'desc' }, take: 5 },
          },
          orderBy: { createdAt: 'desc' },
        },
        bookings: {
          include: {
            package: { select: { id: true, packageName: true, destination: true } },
            payments: { orderBy: { paymentDate: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ message: 'Customer not found.' });
      return;
    }

    // Calculate lifetime metrics
    let lifetimeValue = 0;
    let totalPaid = 0;
    for (const b of customer.bookings) {
      if (b.bookingStatus !== 'CANCELLED') {
        lifetimeValue += Number(b.finalAmount);
        for (const p of b.payments) {
          if (p.paymentStatus === 'SUCCESS') {
            totalPaid += Number(p.amount);
          }
        }
      }
    }

    res.json({
      ...customer,
      metrics: {
        totalBookings: customer.bookings.length,
        lifetimeValue,
        totalPaid,
        outstandingBalance: Math.max(0, lifetimeValue - totalPaid),
      },
    });
  } catch (error) {
    next(error);
  }
});

const customerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(8, 'Valid phone number is required'),
  alternatePhone: z.string().optional().nullable(),
  email: z.string().email('Valid email is required').optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().default('India'),
  source: z.string().optional().default('DIRECT'),
  notes: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  status: z.string().optional().default('ACTIVE'),
});

// Create Customer
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = customerSchema.parse(req.body);

    // Duplicate check by phone
    const existing = await prisma.customer.findFirst({
      where: { phone: data.phone.trim() },
    });

    if (existing) {
      res.status(400).json({
        message: `A customer with phone number "${data.phone}" already exists (${existing.fullName}).`,
      });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        alternatePhone: data.alternatePhone?.trim() || null,
        email: data.email?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        country: data.country?.trim() || 'India',
        source: data.source || 'DIRECT',
        notes: data.notes?.trim() || null,
        assignedToId: data.assignedToId || req.user!.id,
        createdById: req.user!.id,
        updatedById: req.user!.id,
        status: data.status || 'ACTIVE',
        isDeleted: false,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
        updatedByUser: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'CUSTOMER',
      entityId: customer.id,
      details: `Created customer ${customer.fullName} (${customer.phone})`,
      newValue: customer,
      ipAddress: req.ip,
    });

    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});

// Update Customer
router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const data = customerSchema.partial().parse(req.body);

    const previous = await prisma.customer.findUnique({ where: { id } });
    if (!previous || previous.isDeleted) {
      res.status(404).json({ message: 'Customer not found.' });
      return;
    }

    const updatePayload: any = {
      updatedById: req.user!.id,
    };
    if (data.fullName !== undefined) updatePayload.fullName = data.fullName.trim();
    if (data.phone !== undefined) updatePayload.phone = data.phone.trim();
    if (data.alternatePhone !== undefined) updatePayload.alternatePhone = data.alternatePhone?.trim() || null;
    if (data.email !== undefined) updatePayload.email = data.email?.trim() || null;
    if (data.city !== undefined) updatePayload.city = data.city?.trim() || null;
    if (data.state !== undefined) updatePayload.state = data.state?.trim() || null;
    if (data.country !== undefined) updatePayload.country = data.country?.trim() || 'India';
    if (data.source !== undefined) updatePayload.source = data.source;
    if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null;
    if (data.assignedToId !== undefined) updatePayload.assignedToId = data.assignedToId || null;
    if (data.status !== undefined) updatePayload.status = data.status;

    const customer = await prisma.customer.update({
      where: { id },
      data: updatePayload,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
        updatedByUser: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'CUSTOMER',
      entityId: customer.id,
      details: `Updated details for customer ${customer.fullName}`,
      oldValue: previous,
      newValue: customer,
      ipAddress: req.ip,
    });

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// Delete / Soft-Delete Customer (Restricted to SUPER_ADMIN & ADMIN)
router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const userRole = req.user?.role;
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Access denied. Admin privileges required to delete a customer.' });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true, leads: true, quotations: true },
        },
      },
    });

    if (!customer || customer.isDeleted) {
      res.status(404).json({ message: 'Customer not found.' });
      return;
    }

    // Soft-delete to preserve all related bookings, leads, invoices, and accounting history
    const updated = await prisma.customer.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'INACTIVE',
        deletedAt: new Date(),
        deletedById: req.user!.id,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'DELETE',
      entity: 'CUSTOMER',
      entityId: customer.id,
      details: `Soft-deleted customer ${customer.fullName} (${customer.phone})`,
      oldValue: customer,
      ipAddress: req.ip,
    });

    res.json({
      message: `Customer ${customer.fullName} successfully removed.`,
      action: 'DELETED',
      customer: updated,
    });
  } catch (error) {
    next(error);
  }
});

// Forward / Reassign selected customers to a user
router.post('/forward', async (req: AuthRequest, res: Response, next) => {
  try {
    const { customerIds, targetUserId } = req.body;
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      res.status(400).json({ message: 'Please select at least one customer to forward.' });
      return;
    }
    if (!targetUserId) {
      res.status(400).json({ message: 'Target user ID is required.' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      res.status(404).json({ message: 'Target user not found.' });
      return;
    }

    const result = await prisma.customer.updateMany({
      where: { id: { in: customerIds } },
      data: { assignedToId: targetUserId },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'CUSTOMER',
      details: `Reassigned ${result.count} customer(s) to user ${targetUser.name} (${targetUser.email})`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Successfully forwarded ${result.count} customer(s) to ${targetUser.name}.`,
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
});

// Export customers to Excel (.xlsx)
router.get('/export/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = customers.map((c, idx) => ({
      'S.No.': idx + 1,
      'Full Name': c.fullName,
      'Phone': c.phone,
      'Alternate Phone': c.alternatePhone || '',
      'Email': c.email || '',
      'City': c.city || '',
      'State': c.state || '',
      'Country': c.country || 'India',
      'Source': c.source || '',
      'Assigned Staff': c.assignedTo?.name || 'Unassigned',
      'Status': c.status,
      'Created Date': c.createdAt.toISOString().split('T')[0],
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'CUSTOMER',
      details: `Exported ${customers.length} customer records to Excel (.xlsx)`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-customers-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// Export customers to CSV (retained for backward compatibility)
router.get('/export/csv', async (req: AuthRequest, res: Response, next) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', 'Full Name', 'Phone', 'Alternate Phone', 'Email', 'City', 'State', 'Source', 'Assigned Staff', 'Status', 'Created Date'];
    const rows = customers.map(c => [
      c.id,
      `"${c.fullName.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.alternatePhone || ''}"`,
      `"${c.email || ''}"`,
      `"${c.city || ''}"`,
      `"${c.state || ''}"`,
      c.source || '',
      `"${c.assignedTo?.name || ''}"`,
      c.status,
      c.createdAt.toISOString().split('T')[0],
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'CUSTOMER',
      details: `Exported ${customers.length} customer records to CSV`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-customers-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// Import customers from JSON array (parsed from CSV)
router.post('/import', async (req: AuthRequest, res: Response, next) => {
  try {
    const { items, duplicateAction = 'skip' } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'No customer data provided for import.' });
      return;
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const fullName = (
        item.fullName ||
        item['Full Name'] ||
        item.customerName ||
        item['Customer Name'] ||
        item.name ||
        item['Name'] ||
        item.touristName ||
        item['Tourist Name'] ||
        ''
      ).toString().trim();

      let rawPhone = (
        item.phone ||
        item['Phone'] ||
        item.mobile ||
        item['Mobile'] ||
        item.customerPhone ||
        item['Customer Phone'] ||
        item.contact ||
        item['Contact'] ||
        item['Contact Number'] ||
        ''
      ).toString().trim();
      rawPhone = rawPhone.replace(/\.0$/, '').replace(/[^0-9+]/g, '');

      if (!fullName) {
        skipped++;
        errors.push(`Row ${i + 1}: Customer / Tourist Name is missing.`);
        continue;
      }

      if (!rawPhone || rawPhone.length < 7) {
        skipped++;
        errors.push(`Row ${i + 1} (${fullName}): Valid phone number is required.`);
        continue;
      }

      const existing = await prisma.customer.findFirst({
        where: { phone: rawPhone },
      });

      if (existing) {
        if (duplicateAction === 'update') {
          await prisma.customer.update({
            where: { id: existing.id },
            data: {
              fullName: fullName || existing.fullName,
              alternatePhone: item.alternatePhone || item['Alternate Phone'] ? String(item.alternatePhone || item['Alternate Phone']).trim() : existing.alternatePhone,
              email: item.email || item['Email'] ? String(item.email || item['Email']).trim().toLowerCase() : existing.email,
              city: item.city || item['City'] ? String(item.city || item['City']).trim() : existing.city,
              state: item.state || item['State'] ? String(item.state || item['State']).trim() : existing.state,
              notes: item.notes || item['Notes'] ? String(item.notes || item['Notes']).trim() : existing.notes,
            },
          });
          imported++;
          continue;
        } else if (duplicateAction !== 'new') {
          skipped++;
          errors.push(`Row ${i + 1} (${fullName}): Phone ${rawPhone} is already registered to "${existing.fullName}".`);
          continue;
        }
      }

      await prisma.customer.create({
        data: {
          fullName,
          phone: rawPhone,
          alternatePhone: item.alternatePhone || item['Alternate Phone'] ? String(item.alternatePhone || item['Alternate Phone']).trim() : null,
          email: item.email || item['Email'] ? String(item.email || item['Email']).trim().toLowerCase() : null,
          city: item.city || item['City'] ? String(item.city || item['City']).trim() : null,
          state: item.state || item['State'] ? String(item.state || item['State']).trim() : null,
          country: item.country || item['Country'] ? String(item.country || item['Country']).trim() : 'India',
          source: item.source || item['Source'] ? String(item.source || item['Source']).trim() : 'DIRECT',
          notes: item.notes || item['Notes'] ? String(item.notes || item['Notes']).trim() : null,
          assignedToId: req.user!.id,
          status: 'ACTIVE',
        },
      });
      imported++;
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'IMPORT',
      entity: 'CUSTOMER',
      details: `Imported ${imported} customers, skipped ${skipped}`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Successfully imported ${imported} customers. Skipped ${skipped} records.`,
      imported,
      skipped,
      errors,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
