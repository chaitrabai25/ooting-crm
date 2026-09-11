import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Lead Report
router.get('/leads', async (req: AuthRequest, res: Response, next) => {
  try {
    const { startDate, endDate, status, source, format } = req.query;

    const where: any = {};
    if (status) where.enquiryStatus = String(status);
    if (source) where.source = String(source);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        customer: { select: { fullName: true, phone: true, email: true } },
        assignedUser: { select: { name: true } },
        package: { select: { packageName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      const headers = ['Lead ID', 'Customer', 'Phone', 'Email', 'Destination', 'Status', 'Budget', 'Source', 'Assigned Staff', 'Created At'];
      const rows = leads.map(l => [
        l.id,
        `"${l.customer.fullName.replace(/"/g, '""')}"`,
        `"${l.customer.phone}"`,
        `"${l.customer.email || ''}"`,
        `"${l.destination}"`,
        l.enquiryStatus,
        l.budget || 0,
        l.source,
        `"${l.assignedUser?.name || ''}"`,
        l.createdAt.toISOString().split('T')[0],
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=leads-report-${Date.now()}.csv`);
      res.send(csv);
      return;
    }

    res.json({ data: leads });
  } catch (error) {
    next(error);
  }
});

// Booking Report
router.get('/bookings', async (req: AuthRequest, res: Response, next) => {
  try {
    const { startDate, endDate, status, format } = req.query;

    const where: any = {};
    if (status) where.bookingStatus = String(status);
    if (startDate || endDate) {
      where.bookingDate = {};
      if (startDate) where.bookingDate.gte = new Date(String(startDate));
      if (endDate) where.bookingDate.lte = new Date(String(endDate));
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: { select: { fullName: true, phone: true } },
        package: { select: { packageName: true, destination: true } },
        assignedUser: { select: { name: true } },
        payments: { where: { paymentStatus: 'SUCCESS' }, select: { amount: true } },
      },
      orderBy: { bookingDate: 'desc' },
    });

    const data = bookings.map(b => {
      const paid = b.payments.reduce((acc, p) => acc + p.amount, 0);
      const balance = Math.max(0, b.finalAmount - paid);
      return {
        id: b.id,
        bookingNumber: b.bookingNumber,
        customerName: b.customer.fullName,
        customerPhone: b.customer.phone,
        packageName: b.package?.packageName || 'Custom Package',
        destination: b.package?.destination || 'N/A',
        startDate: b.travelStartDate.toISOString().split('T')[0],
        endDate: b.travelEndDate.toISOString().split('T')[0],
        travellers: b.travellers,
        finalAmount: b.finalAmount,
        amountPaid: paid,
        balanceDue: balance,
        status: b.bookingStatus,
        assignedStaff: b.assignedUser?.name || 'Unassigned',
        bookingDate: b.bookingDate.toISOString().split('T')[0],
      };
    });

    if (format === 'csv') {
      const headers = ['Booking No', 'Customer', 'Phone', 'Package', 'Start Date', 'End Date', 'Travellers', 'Total (₹)', 'Paid (₹)', 'Balance (₹)', 'Status', 'Staff', 'Date'];
      const rows = data.map(d => [
        d.bookingNumber,
        `"${d.customerName.replace(/"/g, '""')}"`,
        `"${d.customerPhone}"`,
        `"${d.packageName}"`,
        d.startDate,
        d.endDate,
        d.travellers,
        d.finalAmount,
        d.amountPaid,
        d.balanceDue,
        d.status,
        `"${d.assignedStaff}"`,
        d.bookingDate,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=bookings-report-${Date.now()}.csv`);
      res.send(csv);
      return;
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// Payments Report
router.get('/payments', async (req: AuthRequest, res: Response, next) => {
  try {
    const { startDate, endDate, method, status, format } = req.query;

    const where: any = {};
    if (method) where.paymentMethod = String(method);
    if (status) where.paymentStatus = String(status);
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(String(startDate));
      if (endDate) where.paymentDate.lte = new Date(String(endDate));
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: { customer: { select: { fullName: true } } },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const data = payments.map(p => ({
      id: p.id,
      bookingNumber: p.booking.bookingNumber,
      customerName: p.booking.customer.fullName,
      amount: p.amount,
      method: p.paymentMethod,
      reference: p.transactionReference || 'N/A',
      status: p.paymentStatus,
      paymentDate: p.paymentDate.toISOString().split('T')[0],
    }));

    if (format === 'csv') {
      const headers = ['Booking No', 'Customer', 'Amount (₹)', 'Method', 'Reference', 'Status', 'Date'];
      const rows = data.map(d => [
        d.bookingNumber,
        `"${d.customerName}"`,
        d.amount,
        d.method,
        `"${d.reference}"`,
        d.status,
        d.paymentDate,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payments-report-${Date.now()}.csv`);
      res.send(csv);
      return;
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// Financial Profit & Loss / Revenue Report
router.get('/revenue', async (req: AuthRequest, res: Response, next) => {
  try {
    const [confirmedBookings, payments, expenses] = await Promise.all([
      prisma.booking.findMany({
        where: { bookingStatus: { in: ['CONFIRMED', 'COMPLETED'] } },
        select: { finalAmount: true, bookingDate: true },
      }),
      prisma.payment.findMany({
        where: { paymentStatus: 'SUCCESS' },
        select: { amount: true, paymentDate: true },
      }),
      prisma.expense.findMany({
        select: { amount: true, category: true, expenseDate: true },
      }),
    ]);

    const totalBookingValue = confirmedBookings.reduce((sum, b) => sum + b.finalAmount, 0);
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const outstanding = Math.max(0, totalBookingValue - totalCollected);
    const recordedProfit = totalCollected - totalExpenses;

    res.json({
      summary: {
        totalBookingValue,
        totalCollected,
        totalExpenses,
        outstanding,
        recordedProfit,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
