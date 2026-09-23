import { Router, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { config } from '../config/index.js';
import { getCompanySettings } from './setting.routes.js';

const router = Router();
router.use(authenticate);

// Export Cab Bookings to Excel (.xlsx)
router.get('/export/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const search = (req.query.search as string || '').trim();
    const bookingStatus = (req.query.bookingStatus as string || '').trim();
    const paymentStatus = (req.query.paymentStatus as string || '').trim();
    const vehicleType = (req.query.vehicleType as string || '').trim();
    const tripType = (req.query.tripType as string || '').trim();
    const assignedStaffId = (req.query.assignedStaffId as string || '').trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { bookingReference: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { carNumber: { contains: search } },
        { driverName: { contains: search } },
        { pickupPlace: { contains: search } },
        { dropPlace: { contains: search } },
      ];
    }
    if (bookingStatus) where.bookingStatus = bookingStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (vehicleType) where.vehicleType = vehicleType;
    if (tripType) where.tripType = tripType;
    if (assignedStaffId) where.assignedStaffId = assignedStaffId;

    const cabs = await prisma.cabBooking.findMany({
      where,
      include: {
        assignedStaff: { select: { name: true } },
        customer: { select: { fullName: true, phone: true } },
      },
      orderBy: { pickupDate: 'desc' },
    });

    const rows = cabs.map((c, idx) => ({
      'S.No': idx + 1,
      'Booking Ref': c.bookingReference,
      'Customer Name': c.customerName,
      'Customer Phone': c.customerPhone,
      'Customer Email': c.customerEmail || 'N/A',
      'Pickup Date': new Date(c.pickupDate).toLocaleDateString('en-IN'),
      'Pickup Time': c.pickupTime,
      'Pickup Place': c.pickupPlace,
      'Drop Place': c.dropPlace,
      'Route': c.travelRoute || 'N/A',
      'Car Number': c.carNumber || 'Not Assigned',
      'Vehicle Type': c.vehicleType,
      'Cab Type': c.requiredCabType || 'AC',
      'Passengers': c.passengerCount,
      'Driver Name': c.driverName || 'Not Assigned',
      'Driver Phone': c.driverPhone || 'N/A',
      'Cab Provider': c.cabProvider || 'N/A',
      'Trip Type': c.tripType,
      'Est. Distance': c.estimatedDistance || 'N/A',
      'Est. Duration': c.estimatedDuration || 'N/A',
      'Cab Amount (INR)': Number(c.cabAmount),
      'Advance (INR)': Number(c.advanceAmount),
      'Balance (INR)': Number(c.balanceAmount),
      'Payment Status': c.paymentStatus,
      'Booking Status': c.bookingStatus,
      'Assigned Staff': c.assignedStaff?.name || 'Unassigned',
      'Special Instructions': c.specialInstructions || '',
      'Notes': c.internalNotes || '',
      'Created Date': new Date(c.createdAt).toLocaleDateString('en-IN'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CabBookings');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'EXPORT',
      entity: 'CAB_BOOKING',
      details: `Exported ${cabs.length} cab booking records to Excel (.xlsx)`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-cabs-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// Summary Stats for Cabs
router.get('/stats', async (req: AuthRequest, res: Response, next) => {
  try {
    const [total, confirmed, onTrip, completed, cancelled, allBookings] = await Promise.all([
      prisma.cabBooking.count(),
      prisma.cabBooking.count({ where: { bookingStatus: 'CONFIRMED' } }),
      prisma.cabBooking.count({ where: { bookingStatus: 'ON_TRIP' } }),
      prisma.cabBooking.count({ where: { bookingStatus: 'COMPLETED' } }),
      prisma.cabBooking.count({ where: { bookingStatus: 'CANCELLED' } }),
      prisma.cabBooking.findMany({
        select: { cabAmount: true, balanceAmount: true, advanceAmount: true },
      }),
    ]);

    const totalRevenue = allBookings.reduce((sum, b) => sum + Number(b.cabAmount || 0), 0);
    const balanceDue = allBookings.reduce((sum, b) => sum + Number(b.balanceAmount || 0), 0);
    const advanceCollected = allBookings.reduce((sum, b) => sum + Number(b.advanceAmount || 0), 0);

    res.json({
      total,
      confirmed,
      onTrip,
      completed,
      cancelled,
      totalRevenue,
      balanceDue,
      advanceCollected,
    });
  } catch (error) {
    next(error);
  }
});

// List Cab Bookings (default 10 per page)
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '10', 10));
    const search = (req.query.search as string || '').trim();
    const bookingStatus = (req.query.bookingStatus as string || '').trim();
    const paymentStatus = (req.query.paymentStatus as string || '').trim();
    const vehicleType = (req.query.vehicleType as string || '').trim();
    const tripType = (req.query.tripType as string || '').trim();
    const assignedStaffId = (req.query.assignedStaffId as string || '').trim();
    const startDate = (req.query.startDate as string || '').trim();
    const endDate = (req.query.endDate as string || '').trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { bookingReference: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { carNumber: { contains: search } },
        { driverName: { contains: search } },
        { pickupPlace: { contains: search } },
        { dropPlace: { contains: search } },
      ];
    }
    if (bookingStatus) where.bookingStatus = bookingStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (vehicleType) where.vehicleType = vehicleType;
    if (tripType) where.tripType = tripType;
    if (assignedStaffId) where.assignedStaffId = assignedStaffId;

    if (startDate || endDate) {
      where.pickupDate = {};
      if (startDate) where.pickupDate.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.pickupDate.lte = d;
      }
    }

    const [total, cabs] = await Promise.all([
      prisma.cabBooking.count({ where }),
      prisma.cabBooking.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true, email: true } },
          package: { select: { id: true, packageName: true } },
          booking: { select: { id: true, bookingNumber: true } },
          assignedStaff: { select: { id: true, name: true, phone: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { pickupDate: 'desc' },
      }),
    ]);

    res.json({
      data: cabs,
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

// Single Cab Booking
router.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const cab = await prisma.cabBooking.findUnique({
      where: { id },
      include: {
        customer: true,
        package: true,
        booking: true,
        assignedStaff: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!cab) {
      res.status(404).json({ message: 'Cab booking not found.' });
      return;
    }

    res.json(cab);
  } catch (error) {
    next(error);
  }
});

// Voucher / Duty Slip View
router.get('/:id/voucher', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const cab = await prisma.cabBooking.findUnique({
      where: { id },
      include: {
        customer: true,
        package: true,
        booking: true,
        assignedStaff: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!cab) {
      res.status(404).json({ message: 'Cab booking not found.' });
      return;
    }

    const company = await getCompanySettings();

    res.json({
      cab,
      company,
    });
  } catch (error) {
    next(error);
  }
});

const cabBookingSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(7, 'Customer phone is required'),
  customerEmail: z.string().email().optional().nullable().or(z.literal('')),
  leadId: z.string().optional().nullable(),
  bookingId: z.string().optional().nullable(),
  packageId: z.string().optional().nullable(),
  assignedStaffId: z.string().optional().nullable(),
  pickupDate: z.string().min(1, 'Pickup date is required'),
  pickupTime: z.string().min(1, 'Pickup time is required'),
  pickupPlace: z.string().min(1, 'Pickup place is required'),
  dropPlace: z.string().min(1, 'Drop place is required'),
  travelRoute: z.string().optional().nullable(),
  enquiryDate: z.string().optional().nullable(),
  carNumber: z.string().optional().nullable(),
  vehicleType: z.string().default('SEDAN'),
  passengerCount: z.number().int().min(1).default(1),
  driverName: z.string().optional().nullable(),
  driverPhone: z.string().optional().nullable(),
  cabProvider: z.string().optional().nullable(),
  requiredCabType: z.string().default('AC'),
  tripType: z.string().default('OUTSTATION'),
  estimatedDistance: z.string().optional().nullable(),
  estimatedDuration: z.string().optional().nullable(),
  cabAmount: z.number().min(0).default(0),
  advanceAmount: z.number().min(0).default(0),
  paymentStatus: z.string().default('PENDING'),
  bookingStatus: z.string().default('CONFIRMED'),
  specialInstructions: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  driverAllowanceType: z.string().optional().nullable(),
  driverAllowanceRate: z.coerce.number().optional().nullable(),
  driverAllowanceDays: z.coerce.number().int().optional().nullable(),
  driverAllowanceTotal: z.coerce.number().optional().nullable(),
  dutyRange: z.string().optional().nullable(),
  customTableRows: z.string().optional().nullable(),
});

// Create Cab Booking
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = cabBookingSchema.parse(req.body);

    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await prisma.cabBooking.count();
    const bookingReference = `OOT-CAB-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const cabAmount = data.cabAmount || 0;
    const advanceAmount = data.advanceAmount || 0;
    const balanceAmount = Math.max(0, cabAmount - advanceAmount);

    // Auto-derive payment status if not provided or pending
    let paymentStatus = data.paymentStatus;
    if (advanceAmount >= cabAmount && cabAmount > 0) {
      paymentStatus = 'PAID';
    } else if (advanceAmount > 0 && advanceAmount < cabAmount) {
      paymentStatus = 'PARTIAL';
    }

    const driverAllowanceTotal = (data.driverAllowanceRate && data.driverAllowanceDays)
      ? Number(data.driverAllowanceRate) * Number(data.driverAllowanceDays)
      : (data.driverAllowanceTotal ? Number(data.driverAllowanceTotal) : null);

    let specialInstructions = data.specialInstructions?.trim() || '';
    if (driverAllowanceTotal && driverAllowanceTotal > 0) {
      const typeLabel = data.driverAllowanceType === 'NIGHT_WISE' ? 'Night-wise' : (data.driverAllowanceType === 'CUSTOM' ? 'Custom' : 'Day-wise');
      const allowanceStr = `[Driver Allowance: ${typeLabel} @ ₹${data.driverAllowanceRate} × ${data.driverAllowanceDays || 1} = ₹${driverAllowanceTotal}]`;
      if (!specialInstructions.includes('Driver Allowance:')) {
        specialInstructions = specialInstructions ? `${specialInstructions} | ${allowanceStr}` : allowanceStr;
      }
    }
    if (data.dutyRange?.trim()) {
      const rangeStr = `[Duty Range: ${data.dutyRange.trim()}]`;
      if (!specialInstructions.includes('Duty Range:')) {
        specialInstructions = specialInstructions ? `${specialInstructions} | ${rangeStr}` : rangeStr;
      }
    }

    const createPayload: any = {
      bookingReference,
      customerId: data.customerId || null,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      customerEmail: data.customerEmail ? data.customerEmail.trim() : null,
      leadId: data.leadId || null,
      bookingId: data.bookingId || null,
      packageId: data.packageId || null,
      assignedStaffId: data.assignedStaffId || req.user?.id || null,
      pickupDate: new Date(data.pickupDate),
      pickupTime: data.pickupTime.trim(),
      pickupPlace: data.pickupPlace.trim(),
      dropPlace: data.dropPlace.trim(),
      travelRoute: data.travelRoute ? data.travelRoute.trim() : null,
      enquiryDate: data.enquiryDate ? new Date(data.enquiryDate) : new Date(),
      carNumber: data.carNumber ? data.carNumber.trim().toUpperCase() : null,
      vehicleType: data.vehicleType,
      passengerCount: data.passengerCount,
      driverName: data.driverName ? data.driverName.trim() : null,
      driverPhone: data.driverPhone ? data.driverPhone.trim() : null,
      cabProvider: data.cabProvider ? data.cabProvider.trim() : null,
      requiredCabType: data.requiredCabType,
      tripType: data.tripType,
      estimatedDistance: data.estimatedDistance ? data.estimatedDistance.trim() : null,
      estimatedDuration: data.estimatedDuration ? data.estimatedDuration.trim() : null,
      cabAmount,
      advanceAmount,
      balanceAmount,
      paymentStatus,
      bookingStatus: data.bookingStatus,
      specialInstructions: specialInstructions || null,
      internalNotes: data.internalNotes || null,
    };

    try {
      createPayload.driverAllowanceType = data.driverAllowanceType || null;
      createPayload.driverAllowanceRate = data.driverAllowanceRate ? Number(data.driverAllowanceRate) : null;
      createPayload.driverAllowanceDays = data.driverAllowanceDays ? Number(data.driverAllowanceDays) : null;
      createPayload.driverAllowanceTotal = driverAllowanceTotal;
      createPayload.dutyRange = data.dutyRange?.trim() || null;
      createPayload.customTableRows = data.customTableRows || null;
    } catch {}

    const cab = await prisma.cabBooking.create({
      data: createPayload,
      include: {
        customer: true,
        assignedStaff: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'CAB_BOOKING',
      entityId: cab.id,
      details: `Created cab booking ${cab.bookingReference} for ${cab.customerName} (${cab.pickupPlace} to ${cab.dropPlace})`,
      ipAddress: req.ip,
    });

    res.status(201).json(cab);
  } catch (error) {
    next(error);
  }
});

// Update Cab Booking (Full Edit)
router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const data = cabBookingSchema.parse(req.body);

    const existing = await prisma.cabBooking.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Cab booking not found.' });
      return;
    }

    const cabAmount = data.cabAmount || 0;
    const advanceAmount = data.advanceAmount || 0;
    const balanceAmount = Math.max(0, cabAmount - advanceAmount);

    let paymentStatus = data.paymentStatus;
    if (advanceAmount >= cabAmount && cabAmount > 0) {
      paymentStatus = 'PAID';
    } else if (advanceAmount > 0 && advanceAmount < cabAmount) {
      paymentStatus = 'PARTIAL';
    }

    const driverAllowanceTotal = (data.driverAllowanceRate && data.driverAllowanceDays)
      ? Number(data.driverAllowanceRate) * Number(data.driverAllowanceDays)
      : (data.driverAllowanceTotal ? Number(data.driverAllowanceTotal) : null);

    let specialInstructions = data.specialInstructions?.trim() || '';
    if (driverAllowanceTotal && driverAllowanceTotal > 0) {
      const typeLabel = data.driverAllowanceType === 'NIGHT_WISE' ? 'Night-wise' : (data.driverAllowanceType === 'CUSTOM' ? 'Custom' : 'Day-wise');
      const allowanceStr = `[Driver Allowance: ${typeLabel} @ ₹${data.driverAllowanceRate} × ${data.driverAllowanceDays || 1} = ₹${driverAllowanceTotal}]`;
      if (!specialInstructions.includes('Driver Allowance:')) {
        specialInstructions = specialInstructions ? `${specialInstructions} | ${allowanceStr}` : allowanceStr;
      }
    }
    if (data.dutyRange?.trim()) {
      const rangeStr = `[Duty Range: ${data.dutyRange.trim()}]`;
      if (!specialInstructions.includes('Duty Range:')) {
        specialInstructions = specialInstructions ? `${specialInstructions} | ${rangeStr}` : rangeStr;
      }
    }

    const updatePayload: any = {
      customerId: data.customerId || null,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      customerEmail: data.customerEmail ? data.customerEmail.trim() : null,
      leadId: data.leadId || null,
      bookingId: data.bookingId || null,
      packageId: data.packageId || null,
      assignedStaffId: data.assignedStaffId || existing.assignedStaffId,
      pickupDate: new Date(data.pickupDate),
      pickupTime: data.pickupTime.trim(),
      pickupPlace: data.pickupPlace.trim(),
      dropPlace: data.dropPlace.trim(),
      travelRoute: data.travelRoute ? data.travelRoute.trim() : null,
      enquiryDate: data.enquiryDate ? new Date(data.enquiryDate) : existing.enquiryDate,
      carNumber: data.carNumber ? data.carNumber.trim().toUpperCase() : null,
      vehicleType: data.vehicleType,
      passengerCount: data.passengerCount,
      driverName: data.driverName ? data.driverName.trim() : null,
      driverPhone: data.driverPhone ? data.driverPhone.trim() : null,
      cabProvider: data.cabProvider ? data.cabProvider.trim() : null,
      requiredCabType: data.requiredCabType,
      tripType: data.tripType,
      estimatedDistance: data.estimatedDistance ? data.estimatedDistance.trim() : null,
      estimatedDuration: data.estimatedDuration ? data.estimatedDuration.trim() : null,
      cabAmount,
      advanceAmount,
      balanceAmount,
      paymentStatus,
      bookingStatus: data.bookingStatus,
      specialInstructions: specialInstructions || null,
      internalNotes: data.internalNotes || null,
    };

    try {
      updatePayload.driverAllowanceType = data.driverAllowanceType || null;
      updatePayload.driverAllowanceRate = data.driverAllowanceRate ? Number(data.driverAllowanceRate) : null;
      updatePayload.driverAllowanceDays = data.driverAllowanceDays ? Number(data.driverAllowanceDays) : null;
      updatePayload.driverAllowanceTotal = driverAllowanceTotal;
      updatePayload.dutyRange = data.dutyRange?.trim() || null;
      updatePayload.customTableRows = data.customTableRows || null;
    } catch {}

    const updated = await prisma.cabBooking.update({
      where: { id },
      data: updatePayload,
      include: {
        customer: true,
        assignedStaff: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'CAB_BOOKING',
      entityId: id,
      details: `Updated cab booking ${updated.bookingReference} for ${updated.customerName}`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Update Status (Quick Status Toggle)
router.patch('/:id/status', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { bookingStatus, paymentStatus } = req.body;

    const dataToUpdate: any = {};
    if (bookingStatus) dataToUpdate.bookingStatus = bookingStatus;
    if (paymentStatus) dataToUpdate.paymentStatus = paymentStatus;

    const updated = await prisma.cabBooking.update({
      where: { id },
      data: dataToUpdate,
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'STATUS_CHANGE',
      entity: 'CAB_BOOKING',
      entityId: id,
      details: `Cab booking ${updated.bookingReference} updated: ${JSON.stringify(dataToUpdate)}`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete Cab Booking
router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.cabBooking.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ message: 'Cab booking not found.' });
      return;
    }

    await prisma.cabBooking.delete({ where: { id } });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'DELETE',
      entity: 'CAB_BOOKING',
      entityId: id,
      details: `Deleted cab booking ${existing.bookingReference} for ${existing.customerName}`,
      ipAddress: req.ip,
    });

    res.json({ message: `Cab booking ${existing.bookingReference} deleted successfully.` });
  } catch (error) {
    next(error);
  }
});

// Import Cab Bookings from parsed Excel array
router.post('/import', async (req: AuthRequest, res: Response, next) => {
  try {
    const { items, duplicateAction = 'skip' } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'No cab booking records provided for import.' });
      return;
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Normalize Customer Name
      const customerName = (
        item.customerName ||
        item['Customer Name'] ||
        item.guestName ||
        item['Guest Name'] ||
        item.name ||
        item['Name'] ||
        item.passenger ||
        item['Passenger'] ||
        ''
      ).toString().trim();

      // Normalize Phone
      let rawPhone = (
        item.customerPhone ||
        item['Customer Phone'] ||
        item.phone ||
        item['Phone'] ||
        item.mobile ||
        item['Mobile'] ||
        item.contact ||
        item['Contact'] ||
        item['Contact Number'] ||
        ''
      ).toString().trim();
      // Clean scientific notation or float artifacts like 9876543210.0
      rawPhone = rawPhone.replace(/\.0$/, '').replace(/[^0-9+]/g, '');

      if (!customerName) {
        skipped++;
        errors.push(`Row ${i + 1}: Passenger / Customer Name is missing.`);
        continue;
      }

      if (!rawPhone || rawPhone.length < 7) {
        skipped++;
        errors.push(`Row ${i + 1} (${customerName}): Valid contact phone number is required.`);
        continue;
      }

      // Pickup & Drop fallbacks
      const pickupPlace = (
        item.pickupPlace ||
        item['Pickup Place'] ||
        item.pickupLocation ||
        item['Pickup Location'] ||
        item.from ||
        item['From'] ||
        'Bangalore'
      ).toString().trim();

      const dropPlace = (
        item.dropPlace ||
        item['Drop Place'] ||
        item.dropLocation ||
        item['Drop Location'] ||
        item.to ||
        item['To'] ||
        item.destination ||
        item['Destination'] ||
        'Outstation'
      ).toString().trim();

      // Parse dates cleanly (handles Excel numbers, DD-MM-YYYY, YYYY-MM-DD, etc.)
      let pickupDate = new Date();
      const rawDate = item.pickupDate || item['Pickup Date'] || item.date || item['Date'];
      if (rawDate) {
        if (typeof rawDate === 'number') {
          // Excel serial date number
          pickupDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        } else {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            pickupDate = parsed;
          }
        }
      }

      const cabAmount = Math.max(0, Number(item.cabAmount || item['Cab Amount (INR)'] || item['Cab Amount'] || item['Amount'] || 0));
      const advanceAmount = Math.max(0, Number(item.advanceAmount || item['Advance (INR)'] || item['Advance'] || item['Paid'] || 0));
      const balanceAmount = Math.max(0, cabAmount - advanceAmount);

      // Duplicate cab booking check
      const existingCab = await prisma.cabBooking.findFirst({
        where: {
          customerPhone: rawPhone,
          pickupPlace,
          dropPlace,
        },
      });

      if (existingCab) {
        if (duplicateAction === 'update') {
          await prisma.cabBooking.update({
            where: { id: existingCab.id },
            data: {
              customerName,
              vehicleType: item.vehicleType || item['Vehicle Type'] ? String(item.vehicleType || item['Vehicle Type']).trim() : existingCab.vehicleType,
              driverName: item.driverName || item['Driver Name'] ? String(item.driverName || item['Driver Name']).trim() : existingCab.driverName,
              driverPhone: item.driverPhone || item['Driver Phone'] ? String(item.driverPhone || item['Driver Phone']).trim() : existingCab.driverPhone,
              carNumber: item.carNumber || item['Vehicle Number'] || item['Car Number'] ? String(item.carNumber || item['Vehicle Number'] || item['Car Number']).trim() : existingCab.carNumber,
              cabAmount: cabAmount > 0 ? cabAmount : existingCab.cabAmount,
              balanceAmount: cabAmount > 0 ? Math.max(0, cabAmount - existingCab.advanceAmount) : existingCab.balanceAmount,
              internalNotes: item.notes || item['Notes'] ? String(item.notes || item['Notes']).trim() : existingCab.internalNotes,
            },
          });
          imported++;
          continue;
        } else if (duplicateAction !== 'new') {
          skipped++;
          errors.push(`Row ${i + 1}: Cab booking for ${customerName} (${pickupPlace} → ${dropPlace}) already exists.`);
          continue;
        }
      }

      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const count = (await prisma.cabBooking.count()) + imported;
      const bookingReference = `OOT-CAB-${dateStr}-${String(count + 1).padStart(4, '0')}`;

      await prisma.cabBooking.create({
        data: {
          bookingReference,
          customerName,
          customerPhone: rawPhone,
          customerEmail: item.customerEmail || item['Customer Email'] || item.email || item['Email'] ? String(item.customerEmail || item['Customer Email'] || item.email || item['Email']).trim().toLowerCase() : null,
          pickupDate,
          pickupTime: String(item.pickupTime || item['Pickup Time'] || item.time || item['Time'] || '08:00 AM').trim(),
          pickupPlace,
          dropPlace,
          travelRoute: item.travelRoute || item['Route'] || item['Travel Route'] ? String(item.travelRoute || item['Route'] || item['Travel Route']).trim() : `${pickupPlace} - ${dropPlace}`,
          carNumber: item.carNumber || item['Car Number'] || item['Vehicle No'] ? String(item.carNumber || item['Car Number'] || item['Vehicle No']).trim().toUpperCase() : null,
          vehicleType: (item.vehicleType || item['Vehicle Type'] || 'SEDAN').toString().trim().toUpperCase(),
          passengerCount: Math.max(1, Number(item.passengerCount || item['Passengers'] || item['Persons'] || 1)),
          driverName: item.driverName || item['Driver Name'] ? String(item.driverName || item['Driver Name']).trim() : null,
          driverPhone: item.driverPhone || item['Driver Phone'] ? String(item.driverPhone || item['Driver Phone']).replace(/[^0-9+]/g, '').trim() : null,
          cabProvider: item.cabProvider || item['Cab Provider'] || item['Vendor'] ? String(item.cabProvider || item['Cab Provider'] || item['Vendor']).trim() : null,
          tripType: (item.tripType || item['Trip Type'] || 'OUTSTATION').toString().trim().toUpperCase(),
          cabAmount,
          advanceAmount,
          balanceAmount,
          paymentStatus: item.paymentStatus || (advanceAmount >= cabAmount && cabAmount > 0 ? 'PAID' : (advanceAmount > 0 ? 'PARTIAL' : 'PENDING')),
          bookingStatus: (item.bookingStatus || item['Booking Status'] || 'CONFIRMED').toString().trim().toUpperCase(),
          assignedStaffId: req.user!.id,
          specialInstructions: item.specialInstructions || item['Special Instructions'] ? String(item.specialInstructions || item['Special Instructions']).trim() : null,
          internalNotes: item.internalNotes || item['Notes'] ? String(item.internalNotes || item['Notes']).trim() : null,
        },
      });
      imported++;
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'IMPORT',
      entity: 'CAB_BOOKING',
      details: `Imported ${imported} cab bookings, skipped ${skipped}`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Successfully imported ${imported} cab bookings. Skipped ${skipped} records.`,
      imported,
      skipped,
      errors,
    });
  } catch (error) {
    next(error);
  }
});

export default router;