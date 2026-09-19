import { Router, Response } from 'express';
import * as XLSX from 'xlsx';
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
      if (endDate) {
        const d = new Date(String(endDate));
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
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

    if (format === 'xlsx' || format === 'excel') {
      const rows = leads.map(l => ({
        'Lead ID': l.id,
        'Customer Name': l.customer?.fullName || '-',
        'Phone': l.customer?.phone || '-',
        'Email': l.customer?.email || '-',
        'Destination': l.destination,
        'Package': l.package?.packageName || '-',
        'Enquiry Status': l.enquiryStatus,
        'Priority': l.priority,
        'Budget (INR)': l.budget || 0,
        'Source': l.source,
        'Assigned Staff': l.assignedUser?.name || 'Unassigned',
        'Created Date': l.createdAt ? l.createdAt.toISOString().split('T')[0] : '-',
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Report');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=leads-report-${Date.now()}.xlsx`);
      res.send(buffer);
      return;
    }

    if (format === 'csv') {
      const headers = ['Lead ID', 'Customer', 'Phone', 'Email', 'Destination', 'Status', 'Budget', 'Source', 'Assigned Staff', 'Created At'];
      const rows = leads.map(l => [
        l.id,
        `"${(l.customer?.fullName || '').replace(/"/g, '""')}"`,
        `"${l.customer?.phone || ''}"`,
        `"${l.customer?.email || ''}"`,
        `"${(l.destination || '').replace(/"/g, '""')}"`,
        l.enquiryStatus,
        l.budget || 0,
        l.source,
        `"${(l.assignedUser?.name || '').replace(/"/g, '""')}"`,
        l.createdAt ? l.createdAt.toISOString().split('T')[0] : '',
      ]);
      const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
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
// Booking Report
router.get('/bookings', async (req: AuthRequest, res: Response, next) => {
  try {
    const { startDate, endDate, status, format } = req.query;

    const where: any = {};
    if (status) where.bookingStatus = String(status);
    if (startDate || endDate) {
      where.bookingDate = {};
      if (startDate) where.bookingDate.gte = new Date(String(startDate));
      if (endDate) {
        const d = new Date(String(endDate));
        d.setHours(23, 59, 59, 999);
        where.bookingDate.lte = d;
      }
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
      const paid = b.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const balance = Math.max(0, Number(b.finalAmount) - paid);
      return {
        id: b.id,
        bookingNumber: b.bookingNumber,
        customerName: b.customer.fullName,
        customerPhone: b.customer.phone,
        packageName: b.package?.packageName || 'Custom Package',
        destination: b.package?.destination || 'N/A',
        startDate: b.travelStartDate ? b.travelStartDate.toISOString().split('T')[0] : '-',
        endDate: b.travelEndDate ? b.travelEndDate.toISOString().split('T')[0] : '-',
        travellers: b.travellers,
        finalAmount: Number(b.finalAmount),
        amountPaid: paid,
        balanceDue: balance,
        status: b.bookingStatus,
        assignedStaff: b.assignedUser?.name || 'Unassigned',
        bookingDate: b.bookingDate ? b.bookingDate.toISOString().split('T')[0] : '-',
      };
    });

    if (format === 'xlsx' || format === 'excel') {
      const rows = data.map(d => ({
        'Booking No': d.bookingNumber,
        'Customer Name': d.customerName,
        'Phone': d.customerPhone,
        'Package': d.packageName,
        'Destination': d.destination,
        'Start Date': d.startDate,
        'End Date': d.endDate,
        'Travellers': d.travellers,
        'Total (INR)': d.finalAmount,
        'Paid (INR)': d.amountPaid,
        'Balance (INR)': d.balanceDue,
        'Status': d.status,
        'Assigned Staff': d.assignedStaff,
        'Booking Date': d.bookingDate,
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings Report');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=bookings-report-${Date.now()}.xlsx`);
      res.send(buffer);
      return;
    }

    if (format === 'csv') {
      const headers = ['Booking No', 'Customer', 'Phone', 'Package', 'Start Date', 'End Date', 'Travellers', 'Total (INR)', 'Paid (INR)', 'Balance (INR)', 'Status', 'Staff', 'Date'];
      const rows = data.map(d => [
        d.bookingNumber,
        `"${(d.customerName || '').replace(/"/g, '""')}"`,
        `"${d.customerPhone}"`,
        `"${(d.packageName || '').replace(/"/g, '""')}"`,
        d.startDate,
        d.endDate,
        d.travellers,
        d.finalAmount,
        d.amountPaid,
        d.balanceDue,
        d.status,
        `"${(d.assignedStaff || '').replace(/"/g, '""')}"`,
        d.bookingDate,
      ]);
      const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
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
      if (endDate) {
        const d = new Date(String(endDate));
        d.setHours(23, 59, 59, 999);
        where.paymentDate.lte = d;
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: { customer: { select: { fullName: true, phone: true } } },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const data = payments.map(p => ({
      id: p.id,
      bookingNumber: p.booking?.bookingNumber || 'N/A',
      customerName: p.booking?.customer?.fullName || 'N/A',
      amount: Number(p.amount),
      method: p.paymentMethod,
      reference: p.transactionReference || 'N/A',
      status: p.paymentStatus,
      paymentDate: p.paymentDate ? p.paymentDate.toISOString().split('T')[0] : '-',
    }));

    if (format === 'xlsx' || format === 'excel') {
      const rows = data.map(d => ({
        'Booking No': d.bookingNumber,
        'Customer Name': d.customerName,
        'Amount (INR)': d.amount,
        'Payment Method': d.method,
        'Reference ID': d.reference,
        'Status': d.status,
        'Payment Date': d.paymentDate,
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments Report');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=payments-report-${Date.now()}.xlsx`);
      res.send(buffer);
      return;
    }

    if (format === 'csv') {
      const headers = ['Booking No', 'Customer', 'Amount (INR)', 'Method', 'Reference', 'Status', 'Date'];
      const rows = data.map(d => [
        d.bookingNumber,
        `"${(d.customerName || '').replace(/"/g, '""')}"`,
        d.amount,
        d.method,
        `"${(d.reference || '').replace(/"/g, '""')}"`,
        d.status,
        d.paymentDate,
      ]);
      const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
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
    const { startDate, endDate, format } = req.query;

    const bookingDateWhere: any = { bookingStatus: { in: ['CONFIRMED', 'COMPLETED'] } };
    const paymentDateWhere: any = { paymentStatus: 'SUCCESS' };
    const expenseDateWhere: any = {};

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(String(startDate));
      if (endDate) {
        const d = new Date(String(endDate));
        d.setHours(23, 59, 59, 999);
        dateFilter.lte = d;
      }
      bookingDateWhere.bookingDate = dateFilter;
      paymentDateWhere.paymentDate = dateFilter;
      expenseDateWhere.expenseDate = dateFilter;
    }

    const [confirmedBookings, payments, expenses] = await Promise.all([
      prisma.booking.findMany({
        where: bookingDateWhere,
        select: { finalAmount: true, bookingDate: true },
      }),
      prisma.payment.findMany({
        where: paymentDateWhere,
        select: { amount: true, paymentDate: true },
      }),
      prisma.expense.findMany({
        where: expenseDateWhere,
        select: { amount: true, category: true, expenseDate: true },
      }),
    ]);

    const totalBookingValue = confirmedBookings.reduce((sum, b) => sum + Number(b.finalAmount), 0);
    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const outstanding = Math.max(0, totalBookingValue - totalCollected);
    const recordedProfit = totalCollected - totalExpenses;

    if (format === 'xlsx' || format === 'excel') {
      const summaryRows = [
        { 'Metric': 'Total Confirmed Bookings Value', 'Amount (INR)': totalBookingValue },
        { 'Metric': 'Total Payments Collected', 'Amount (INR)': totalCollected },
        { 'Metric': 'Total Operational Expenses', 'Amount (INR)': totalExpenses },
        { 'Metric': 'Outstanding Payments Balance', 'Amount (INR)': outstanding },
        { 'Metric': 'Net Recorded Profit', 'Amount (INR)': recordedProfit },
      ];
      const worksheet = XLSX.utils.json_to_sheet(summaryRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Revenue & PnL');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=revenue-report-${Date.now()}.xlsx`);
      res.send(buffer);
      return;
    }

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
