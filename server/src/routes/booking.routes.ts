import { Router, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// Whitelisted sorting fields for Bookings
const ALLOWED_SORT_FIELDS = [
  'bookingNumber',
  'bookingDate',
  'travelStartDate',
  'travelEndDate',
  'bookingStatus',
  'finalAmount',
  'travellers',
  'createdAt',
];

// List bookings with calculated balances, package filter, and sorting
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '10', 10));
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const packageId = (req.query.packageId as string || '').trim();
    const assignedUserId = (req.query.assignedUserId as string || '').trim();
    const sortByParam = (req.query.sortBy as string || 'createdAt').trim();
    const sortOrderParam = (req.query.sortOrder as string || 'desc').toLowerCase();

    const sortBy = ALLOWED_SORT_FIELDS.includes(sortByParam) ? sortByParam : 'createdAt';
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (search) {
      where.OR = [
        { bookingNumber: { contains: search } },
        { customer: { fullName: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { package: { packageName: { contains: search } } },
      ];
    }
    if (status) where.bookingStatus = status;
    if (packageId) where.packageId = packageId;
    if (assignedUserId) where.assignedUserId = assignedUserId;

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true, email: true } },
          package: { select: { id: true, packageName: true, destination: true } },
          assignedUser: { select: { id: true, name: true } },
          travellersList: {
            select: { id: true, name: true, age: true, gender: true, phone: true, isPrimary: true },
            orderBy: { isPrimary: 'desc' },
          },
          payments: {
            where: { paymentStatus: 'SUCCESS' },
            select: { amount: true },
          },
          agentBooking: {
            include: { agent: { select: { companyName: true } } },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    // Format with accurate financial summaries
    const data = bookings.map(b => {
      const amountPaid = b.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const balanceDue = Math.max(0, Number(b.finalAmount) - amountPaid);
      return {
        ...b,
        amountPaid,
        balanceDue,
      };
    });

    res.json({
      data,
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

// Dedicated Booking Passenger List — Package-Wise Customer Details
router.get('/passengers', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '10', 10));
    const search = (req.query.search as string || '').trim();
    const packageId = (req.query.packageId as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const sortByParam = (req.query.sortBy as string || 'travelStartDate').trim();
    const sortOrderParam = (req.query.sortOrder as string || 'desc').toLowerCase();

    const sortBy = ALLOWED_SORT_FIELDS.includes(sortByParam) ? sortByParam : 'travelStartDate';
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (packageId) where.packageId = packageId;
    if (status) where.bookingStatus = status;
    if (search) {
      where.OR = [
        { bookingNumber: { contains: search } },
        { customer: { fullName: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { package: { packageName: { contains: search } } },
        { travellersList: { some: { name: { contains: search } } } },
      ];
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true, email: true, city: true } },
          package: { select: { id: true, packageName: true, destination: true, duration: true } },
          travellersList: {
            orderBy: { isPrimary: 'desc' },
          },
          payments: {
            where: { paymentStatus: 'SUCCESS' },
            select: { amount: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    const passengersData = bookings.map(b => {
      const amountPaid = b.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const balanceDue = Math.max(0, Number(b.finalAmount) - amountPaid);
      let paymentStatus = 'UNPAID';
      if (Number(b.finalAmount) > 0 && balanceDue === 0) paymentStatus = 'PAID';
      else if (amountPaid > 0) paymentStatus = 'PARTIAL';

      // Guarantee at least the primary customer if no separate traveller was stored
      let travellers = b.travellersList;
      if (!travellers || travellers.length === 0) {
        travellers = [{
          id: `primary-${b.id}`,
          bookingId: b.id,
          name: b.customer?.fullName || 'Primary Traveller',
          age: null,
          gender: null,
          phone: b.customer?.phone || null,
          email: b.customer?.email || null,
          idNumber: null,
          address: null,
          isPrimary: true,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        }];
      }

      return {
        bookingId: b.id,
        bookingNumber: b.bookingNumber,
        bookingDate: b.bookingDate,
        travelStartDate: b.travelStartDate,
        travelEndDate: b.travelEndDate,
        bookingStatus: b.bookingStatus,
        packageId: b.packageId,
        packageName: b.package?.packageName || 'Custom Itinerary',
        destination: b.package?.destination || 'Custom Destination',
        customerId: b.customer?.id,
        customerName: b.customer?.fullName,
        customerPhone: b.customer?.phone,
        customerEmail: b.customer?.email,
        customerCity: b.customer?.city,
        travellersCount: b.travellers,
        travellersList: travellers,
        totalAmount: b.totalAmount,
        finalAmount: b.finalAmount,
        amountPaid,
        balanceDue,
        paymentStatus,
      };
    });

    res.json({
      data: passengersData,
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

// Single Booking
router.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        package: {
          include: {
            itineraries: { orderBy: { dayNumber: 'asc' } },
          },
        },
        lead: true,
        assignedUser: { select: { id: true, name: true, email: true, phone: true } },
        travellersList: {
          orderBy: { isPrimary: 'desc' },
        },
        payments: { orderBy: { paymentDate: 'desc' } },
        expenses: { orderBy: { expenseDate: 'desc' } },
        agentBooking: { include: { agent: true } },
      },
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    const amountPaid = booking.payments
      .filter(p => p.paymentStatus === 'SUCCESS')
      .reduce((acc, p) => acc + Number(p.amount), 0);
    const balanceDue = Math.max(0, Number(booking.finalAmount) - amountPaid);

    const totalExpenses = booking.expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const grossProfit = Number(booking.finalAmount) - totalExpenses;

    res.json({
      ...booking,
      financials: {
        totalAmount: booking.totalAmount,
        discount: booking.discount,
        finalAmount: booking.finalAmount,
        amountPaid,
        balanceDue,
        totalExpenses,
        grossProfit,
      },
    });
  } catch (error) {
    next(error);
  }
});

const travellerInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Traveller name is required'),
  age: z.number().int().min(0).max(120).optional().nullable(),
  gender: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  idNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
});

const bookingCreateSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  customerCity: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  packageId: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
  travelStartDate: z.string().min(1, 'Start date is required'),
  travelEndDate: z.string().min(1, 'End date is required'),
  durationDays: z.number().int().min(1).optional().nullable(),
  durationNights: z.number().int().min(0).optional().nullable(),
  tripType: z.string().optional().nullable(),
  travellers: z.number().int().min(1).default(1),
  travellersList: z.array(travellerInputSchema).optional(),
  totalAmount: z.number().min(0),
  discount: z.number().min(0).default(0),
  bookingStatus: z.enum(['ENQUIRY', 'HOLD', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).default('CONFIRMED'),
  notes: z.string().optional().nullable(),
  serviceProviders: z.union([z.string(), z.array(z.any())]).optional().nullable(),
  // Optional B2B Agent connection
  agentId: z.string().optional().nullable(),
  commissionRate: z.number().min(0).max(100).optional(),
});

// Create Booking
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = bookingCreateSchema.parse(req.body);

    // Resolve Customer ID (find existing, create on-the-fly, or use provided)
    let finalCustomerId = data.customerId;
    if (!finalCustomerId) {
      if (data.customerName && data.customerPhone) {
        let customer = await prisma.customer.findFirst({
          where: { phone: data.customerPhone.trim() },
        });
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              fullName: data.customerName.trim(),
              phone: data.customerPhone.trim(),
              email: data.customerEmail?.trim() || null,
              city: data.customerCity?.trim() || null,
            },
          });
        }
        finalCustomerId = customer.id;
      } else {
        res.status(400).json({ message: 'Customer or Customer Details (Name & Phone) are required.' });
        return;
      }
    }

    const finalAmount = Math.max(0, data.totalAmount - data.discount);

    // Generate unique Booking Number: OOT-BK-YYYYMM-XXXX
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await prisma.booking.count();
    const bookingNumber = `OOT-BK-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Prepare traveller records
    let travellersToCreate = data.travellersList || [];
    if (travellersToCreate.length === 0) {
      // Auto-create Primary Traveller from Customer record
      const customer = await prisma.customer.findUnique({
        where: { id: finalCustomerId },
      });
      if (customer) {
        travellersToCreate = [
          {
            name: customer.fullName,
            phone: customer.phone,
            email: customer.email,
            isPrimary: true,
          },
        ];
      }
    }

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId: finalCustomerId,
        leadId: data.leadId || null,
        packageId: data.packageId || null,
        assignedUserId: data.assignedUserId || req.user!.id,
        travelStartDate: new Date(data.travelStartDate),
        travelEndDate: new Date(data.travelEndDate),
        durationDays: data.durationDays ?? null,
        durationNights: data.durationNights ?? null,
        tripType: data.tripType || (travellersToCreate.length > 1 ? 'GROUP' : 'SINGLE'),
        travellers: Math.max(data.travellers, travellersToCreate.length),
        totalAmount: data.totalAmount,
        discount: data.discount,
        finalAmount,
        bookingStatus: data.bookingStatus,
        serviceProviders: data.serviceProviders ? (typeof data.serviceProviders === 'string' ? data.serviceProviders : JSON.stringify(data.serviceProviders)) : null,
        notes: data.notes?.trim() || null,
        travellersList: travellersToCreate.length > 0 ? {
          create: travellersToCreate.map((t, idx) => ({
            name: t.name.trim(),
            age: t.age !== undefined && t.age !== null ? Number(t.age) : null,
            gender: t.gender || null,
            phone: t.phone?.trim() || null,
            email: t.email?.trim() || null,
            idNumber: t.idNumber?.trim() || null,
            address: t.address?.trim() || null,
            isPrimary: t.isPrimary !== undefined ? t.isPrimary : idx === 0,
          })),
        } : undefined,
        agentBooking: data.agentId ? {
          create: {
            agentId: data.agentId,
            commissionRate: data.commissionRate || 0,
            commissionAmount: (finalAmount * (data.commissionRate || 0)) / 100,
            netAmount: finalAmount - ((finalAmount * (data.commissionRate || 0)) / 100),
            payoutStatus: 'PENDING',
          },
        } : undefined,
      },
      include: {
        customer: true,
        package: true,
        travellersList: true,
        agentBooking: { include: { agent: true } },
      },
    });

    // If converted from lead, mark lead as WON
    if (data.leadId) {
      await prisma.lead.update({
        where: { id: data.leadId },
        data: { enquiryStatus: 'WON' },
      });
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'BOOKING',
      entityId: booking.id,
      details: `Created booking ${booking.bookingNumber} for ${booking.customer.fullName} (${booking.travellers} travellers, ₹${finalAmount})`,
      ipAddress: req.ip,
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

// Update Booking
router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const data = bookingCreateSchema.partial().parse(req.body);

    const currentBooking = await prisma.booking.findUnique({ where: { id } });
    if (!currentBooking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    const totalAmount = data.totalAmount !== undefined ? data.totalAmount : Number(currentBooking.totalAmount);
    const discount = data.discount !== undefined ? data.discount : Number(currentBooking.discount);
    const finalAmount = Math.max(0, Number(totalAmount) - Number(discount));

    const updatePayload: any = {
      totalAmount,
      discount,
      finalAmount,
    };
    if (data.packageId !== undefined) updatePayload.packageId = data.packageId || null;
    if (data.assignedUserId !== undefined) updatePayload.assignedUserId = data.assignedUserId || null;
    if (data.travelStartDate) updatePayload.travelStartDate = new Date(data.travelStartDate);
    if (data.travelEndDate) updatePayload.travelEndDate = new Date(data.travelEndDate);
    if (data.durationDays !== undefined) updatePayload.durationDays = data.durationDays;
    if (data.durationNights !== undefined) updatePayload.durationNights = data.durationNights;
    if (data.tripType !== undefined) updatePayload.tripType = data.tripType;
    if (data.travellers !== undefined) updatePayload.travellers = data.travellers;
    if (data.bookingStatus) updatePayload.bookingStatus = data.bookingStatus;
    if (data.serviceProviders !== undefined) {
      updatePayload.serviceProviders = data.serviceProviders ? (typeof data.serviceProviders === 'string' ? data.serviceProviders : JSON.stringify(data.serviceProviders)) : null;
    }
    if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null;

    // Update travellers if provided
    if (data.travellersList && Array.isArray(data.travellersList)) {
      await prisma.traveller.deleteMany({ where: { bookingId: id } });
      if (data.travellersList.length > 0) {
        await prisma.traveller.createMany({
          data: data.travellersList.map((t, idx) => ({
            bookingId: id,
            name: t.name.trim(),
            age: t.age !== undefined && t.age !== null ? Number(t.age) : null,
            gender: t.gender || null,
            phone: t.phone?.trim() || null,
            email: t.email?.trim() || null,
            idNumber: t.idNumber?.trim() || null,
            address: t.address?.trim() || null,
            isPrimary: t.isPrimary !== undefined ? t.isPrimary : idx === 0,
          })),
        });
      }
      updatePayload.travellers = data.travellersList.length;
      if (!data.tripType) {
        updatePayload.tripType = data.travellersList.length > 1 ? 'GROUP' : 'SINGLE';
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updatePayload,
      include: {
        customer: true,
        package: true,
        travellersList: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'BOOKING',
      entityId: id,
      details: `Updated booking ${updated.bookingNumber}`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Import/Append Passengers directly into an existing booking
router.post('/:id/passengers/import', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { passengers, replaceExisting = false } = req.body;

    if (!Array.isArray(passengers) || passengers.length === 0) {
      res.status(400).json({ message: 'No passenger records provided for import.' });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { travellersList: true },
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    if (replaceExisting) {
      await prisma.traveller.deleteMany({ where: { bookingId: id } });
    }

    const currentCount = replaceExisting ? 0 : booking.travellersList.length;

    await prisma.traveller.createMany({
      data: passengers.map((p: any, idx: number) => ({
        bookingId: id,
        name: String(p.name || '').trim(),
        gender: p.gender ? String(p.gender).toUpperCase() : null,
        phone: p.phone ? String(p.phone).trim() : null,
        age: p.age !== undefined && p.age !== null && p.age !== '' ? Number(p.age) : null,
        email: p.email ? String(p.email).trim().toLowerCase() : null,
        idNumber: p.idNumber ? String(p.idNumber).trim() : null,
        address: p.address ? String(p.address).trim() : null,
        isPrimary: currentCount === 0 && idx === 0,
      })),
    });

    const totalTravellers = await prisma.traveller.count({ where: { bookingId: id } });
    await prisma.booking.update({
      where: { id },
      data: {
        travellers: totalTravellers,
        tripType: totalTravellers > 1 ? 'GROUP' : booking.tripType,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'IMPORT',
      entity: 'BOOKING',
      entityId: id,
      details: `Imported ${passengers.length} passengers for booking ${booking.bookingNumber}`,
      ipAddress: req.ip,
    });

    const refreshedBooking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        package: true,
        travellersList: { orderBy: { isPrimary: 'desc' } },
        payments: true,
      },
    });

    res.json({
      message: `Successfully imported ${passengers.length} passengers.`,
      booking: refreshedBooking,
    });
  } catch (error) {
    next(error);
  }
});

// Update Booking Status
router.patch('/:id/status', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const booking = await prisma.booking.update({
      where: { id },
      data: { bookingStatus: status },
      include: { customer: true },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'STATUS_CHANGE',
      entity: 'BOOKING',
      entityId: id,
      details: `Booking ${booking.bookingNumber} status set to ${status}`,
      ipAddress: req.ip,
    });

    res.json(booking);
  } catch (error) {
    next(error);
  }
});

// Export Bookings to Excel (.xlsx)
router.get('/export/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        customer: true,
        package: true,
        assignedUser: { select: { name: true } },
        payments: { where: { paymentStatus: 'SUCCESS' }, select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = bookings.map((b, idx) => {
      const paid = b.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const balance = Math.max(0, Number(b.finalAmount) - paid);
      return {
        'S.No.': idx + 1,
        'Booking Number': b.bookingNumber,
        'Customer': b.customer.fullName,
        'Phone': b.customer.phone,
        'Package': b.package?.packageName || 'Custom Package',
        'Start Date': b.travelStartDate.toISOString().split('T')[0],
        'End Date': b.travelEndDate.toISOString().split('T')[0],
        'Travellers': b.travellers,
        'Total Amount': b.totalAmount,
        'Discount': b.discount,
        'Final Amount': b.finalAmount,
        'Amount Paid': paid,
        'Balance Due': balance,
        'Status': b.bookingStatus,
        'Assigned To': b.assignedUser?.name || 'Unassigned',
        'Booking Date': b.bookingDate.toISOString().split('T')[0],
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'BOOKING',
      details: `Exported ${bookings.length} booking records to Excel (.xlsx)`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-bookings-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// Export Bookings to CSV
router.get('/export/csv', async (req: AuthRequest, res: Response, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        customer: true,
        package: true,
        assignedUser: { select: { name: true } },
        payments: { where: { paymentStatus: 'SUCCESS' }, select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Booking Number', 'Customer', 'Phone', 'Package', 'Start Date', 'End Date', 'Travellers', 'Total Amount', 'Discount', 'Final Amount', 'Amount Paid', 'Balance Due', 'Status', 'Assigned To', 'Booking Date'];
    const rows = bookings.map(b => {
      const paid = b.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const balance = Math.max(0, Number(b.finalAmount) - paid);
      return [
        b.bookingNumber,
        `"${b.customer.fullName.replace(/"/g, '""')}"`,
        `"${b.customer.phone}"`,
        `"${b.package?.packageName || ''}"`,
        b.travelStartDate.toISOString().split('T')[0],
        b.travelEndDate.toISOString().split('T')[0],
        b.travellers,
        b.totalAmount,
        b.discount,
        b.finalAmount,
        paid,
        balance,
        b.bookingStatus,
        `"${b.assignedUser?.name || ''}"`,
        b.bookingDate.toISOString().split('T')[0],
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'BOOKING',
      details: `Exported ${bookings.length} booking records to CSV`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-bookings-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// Export Passengers to Excel (.xlsx)
router.get('/export/passengers/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const packageId = (req.query.packageId as string || '').trim();
    const where: any = {};
    if (packageId) where.packageId = packageId;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: true,
        package: true,
        travellersList: true,
        payments: { where: { paymentStatus: 'SUCCESS' }, select: { amount: true } },
      },
      orderBy: { bookingDate: 'desc' },
    });

    const rows: any[] = [];
    let sNo = 1;

    bookings.forEach((b) => {
      const paid = b.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const balance = Math.max(0, Number(b.finalAmount) - paid);

      const travellers = (b.travellersList && b.travellersList.length > 0)
        ? b.travellersList
        : [{
            name: b.customer.fullName,
            age: null,
            gender: null,
            phone: b.customer.phone,
            email: b.customer.email,
            isPrimary: true,
          }];

      travellers.forEach((t) => {
        rows.push({
          'S.No.': sNo++,
          'Passenger Name': t.name || '',
          'Is Primary': t.isPrimary ? 'Yes' : 'No',
          'Age': t.age ?? '',
          'Gender': t.gender || '',
          'Passenger Phone': t.phone || '',
          'Passenger Email': t.email || '',
          'Booking Ref': b.bookingNumber,
          'Package Name': b.package?.packageName || 'Custom Package',
          'Travel Start': b.travelStartDate.toISOString().split('T')[0],
          'Travel End': b.travelEndDate.toISOString().split('T')[0],
          'Primary Customer': b.customer.fullName,
          'Customer Phone': b.customer.phone,
          'Booking Status': b.bookingStatus,
          'Total Amount': b.finalAmount,
          'Amount Paid': paid,
          'Balance Due': balance,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Passengers');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'BOOKING',
      details: `Exported ${rows.length} passenger records to Excel (.xlsx)`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-passengers-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// Export Passengers to CSV
router.get('/export/passengers', async (req: AuthRequest, res: Response, next) => {
  try {
    const packageId = (req.query.packageId as string || '').trim();
    const where: any = {};
    if (packageId) where.packageId = packageId;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: true,
        package: true,
        travellersList: true,
        payments: { where: { paymentStatus: 'SUCCESS' }, select: { amount: true } },
      },
      orderBy: { bookingDate: 'desc' },
    });

    const headers = [
      'Passenger Name',
      'Is Primary',
      'Age',
      'Gender',
      'Passenger Phone',
      'Passenger Email',
      'Booking Ref',
      'Package Name',
      'Travel Start',
      'Travel End',
      'Primary Customer',
      'Customer Phone',
      'Booking Status',
      'Total Amount',
      'Amount Paid',
      'Balance Due',
    ];

    const rows: string[] = [];

    bookings.forEach((b) => {
      const paid = b.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const balance = Math.max(0, Number(b.finalAmount) - paid);

      const travellers = (b.travellersList && b.travellersList.length > 0)
        ? b.travellersList
        : [{
            name: b.customer.fullName,
            age: null,
            gender: null,
            phone: b.customer.phone,
            email: b.customer.email,
            isPrimary: true,
          }];

      travellers.forEach((t) => {
        rows.push([
          `"${(t.name || '').replace(/"/g, '""')}"`,
          t.isPrimary ? 'Yes' : 'No',
          t.age ?? '',
          t.gender || '',
          `"${t.phone || ''}"`,
          `"${t.email || ''}"`,
          b.bookingNumber,
          `"${(b.package?.packageName || 'Custom Package').replace(/"/g, '""')}"`,
          b.travelStartDate.toISOString().split('T')[0],
          b.travelEndDate.toISOString().split('T')[0],
          `"${b.customer.fullName.replace(/"/g, '""')}"`,
          `"${b.customer.phone}"`,
          b.bookingStatus,
          b.finalAmount,
          paid,
          balance,
        ].join(','));
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'BOOKING',
      details: `Exported ${rows.length} passenger records to CSV`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-passengers-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// Import Bookings from Excel
router.post('/import', async (req: AuthRequest, res: Response, next) => {
  try {
    const { items, duplicateAction = 'skip' } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'No booking data provided for import.' });
      return;
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const fullName = String(item.customerName || item['Customer Name'] || item.fullName || item['Full Name'] || '').trim();
      const rawPhone = String(item.customerPhone || item['Customer Phone'] || item.phone || item['Phone'] || '').trim();

      if (!fullName || !rawPhone) {
        skipped++;
        errors.push(`Row ${i + 1}: Customer name and phone are required.`);
        continue;
      }

      const phone = rawPhone.replace(/[^\d+]/g, '');

      // Find or create customer
      let customer = await prisma.customer.findFirst({ where: { phone } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            fullName,
            phone,
            email: item.customerEmail || item['Customer Email'] || item.email || item['Email'] ? String(item.customerEmail || item['Customer Email'] || item.email || item['Email']).trim().toLowerCase() : null,
            city: item.customerCity || item['Customer City'] || item.city || item['City'] ? String(item.customerCity || item['Customer City'] || item.city || item['City']).trim() : null,
            assignedToId: req.user!.id,
            status: 'ACTIVE',
          },
        });
      }

      const totalAmount = Number(item.totalAmount || item['Total Amount'] || item.amount || 0);
      const discount = Number(item.discount || item['Discount'] || 0);
      const finalAmount = Math.max(0, totalAmount - discount);
      const travellersCount = Math.max(1, Number(item.travellers || item['Pax'] || item['Travellers'] || 1));

      const travelStartDate = item.travelStartDate || item['Start Date'] || item.startDate ? new Date(item.travelStartDate || item['Start Date'] || item.startDate) : new Date();
      const travelEndDate = item.travelEndDate || item['End Date'] || item.endDate ? new Date(item.travelEndDate || item['End Date'] || item.endDate) : new Date(Date.now() + 3 * 86400000);

      const existingBooking = await prisma.booking.findFirst({
        where: {
          customerId: customer.id,
          travelStartDate: {
            gte: new Date(travelStartDate.getTime() - 86400000),
            lte: new Date(travelStartDate.getTime() + 86400000),
          },
        },
      });

      if (existingBooking) {
        if (duplicateAction === 'update') {
          await prisma.booking.update({
            where: { id: existingBooking.id },
            data: {
              travellers: travellersCount,
              totalAmount: totalAmount > 0 ? totalAmount : existingBooking.totalAmount,
              finalAmount: finalAmount > 0 ? finalAmount : existingBooking.finalAmount,
              bookingStatus: item.bookingStatus || item['Status'] ? String(item.bookingStatus || item['Status']).toUpperCase() : existingBooking.bookingStatus,
              notes: item.notes || item['Notes'] ? String(item.notes || item['Notes']).trim() : existingBooking.notes,
            },
          });
          imported++;
          continue;
        } else if (duplicateAction !== 'new') {
          skipped++;
          errors.push(`Row ${i + 1}: Booking for ${fullName} starting around ${travelStartDate.toISOString().split('T')[0]} already exists.`);
          continue;
        }
      }

      // Generate booking number
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const count = await prisma.booking.count();
      const bookingNumber = `OOT-BK-${dateStr}-${String(count + 1 + i).padStart(4, '0')}`;

      const booking = await prisma.booking.create({
        data: {
          bookingNumber,
          customerId: customer.id,
          assignedUserId: req.user!.id,
          travelStartDate,
          travelEndDate,
          travellers: travellersCount,
          totalAmount,
          discount,
          finalAmount,
          bookingStatus: item.bookingStatus ? String(item.bookingStatus).toUpperCase() : 'CONFIRMED',
          notes: item.notes ? String(item.notes).trim() : null,
          travellersList: {
            create: [
              {
                name: fullName,
                phone,
                email: customer.email,
                isPrimary: true,
              },
            ],
          },
        },
      });

      imported++;
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'IMPORT',
      entity: 'BOOKING',
      details: `Imported ${imported} bookings, skipped ${skipped}`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Successfully imported ${imported} bookings. Skipped ${skipped} records.`,
      imported,
      skipped,
      errors,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
