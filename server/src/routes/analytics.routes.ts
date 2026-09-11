import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Main Dashboard KPIs
router.get('/dashboard', async (req: AuthRequest, res: Response, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [
      totalLeads,
      newLeads,
      followUpsToday,
      confirmedBookingsCount,
      confirmedBookings,
      successfulPayments,
      b2bBookingsCount,
      wonLeadsCount,
      qualifiedPoolCount,
      recentEnquiries,
      recentBookings,
      upcomingFollowUps,
    ] = await Promise.all([
      // 1. Total Leads
      prisma.lead.count(),
      // 2. New Leads
      prisma.lead.count({ where: { enquiryStatus: 'NEW' } }),
      // 3. Follow-ups Today
      prisma.followUp.count({
        where: {
          status: 'PENDING',
          scheduledAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
      // 4. Confirmed Bookings Count
      prisma.booking.count({
        where: { bookingStatus: { in: ['CONFIRMED', 'COMPLETED'] } },
      }),
      // Confirmed & Completed Bookings for Total Revenue calculation
      prisma.booking.findMany({
        where: { bookingStatus: { in: ['CONFIRMED', 'COMPLETED'] } },
        select: { id: true, finalAmount: true },
      }),
      // Successful Payments
      prisma.payment.findMany({
        where: { paymentStatus: 'SUCCESS' },
        select: { amount: true },
      }),
      // B2B Bookings Count
      prisma.agentBooking.count(),
      // Won Leads Count
      prisma.lead.count({ where: { enquiryStatus: 'WON' } }),
      // Qualified pool (leads that reached at least QUALIFIED, QUOTATION_SENT, FOLLOW_UP, WON, or LOST)
      prisma.lead.count({
        where: { enquiryStatus: { in: ['QUALIFIED', 'QUOTATION_SENT', 'FOLLOW_UP', 'WON', 'LOST'] } },
      }),
      // Recent 5 enquiries
      prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { fullName: true, phone: true } },
          package: { select: { packageName: true } },
        },
      }),
      // Recent 5 bookings
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { fullName: true, phone: true } },
          package: { select: { packageName: true } },
        },
      }),
      // Upcoming 5 followups
      prisma.followUp.findMany({
        where: { status: 'PENDING' },
        take: 5,
        orderBy: { scheduledAt: 'asc' },
        include: {
          lead: { include: { customer: { select: { fullName: true, phone: true } } } },
          assignedUser: { select: { name: true } },
        },
      }),
    ]);

    // Financial formulas
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.finalAmount, 0);
    const totalCollected = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = Math.max(0, totalRevenue - totalCollected);

    // Conversion rate formula: Won Leads / Qualified Pool * 100
    const conversionRate = qualifiedPoolCount > 0
      ? Number(((wonLeadsCount / qualifiedPoolCount) * 100).toFixed(1))
      : 0;

    res.json({
      cards: {
        totalLeads,
        newLeads,
        followUpsToday,
        confirmedBookings: confirmedBookingsCount,
        totalRevenue,
        totalCollected,
        pendingPayments,
        b2bBookings: b2bBookingsCount,
        conversionRate,
      },
      recentEnquiries,
      recentBookings,
      upcomingFollowUps,
    });
  } catch (error) {
    next(error);
  }
});

// Detailed Analytics: Trends, Funnel, Destinations, Staff Rankings
router.get('/charts', async (req: AuthRequest, res: Response, next) => {
  try {
    const [allLeads, allBookings, allPayments, allExpenses, allStaff] = await Promise.all([
      prisma.lead.findMany({
        select: {
          id: true,
          enquiryStatus: true,
          destination: true,
          assignedUserId: true,
          createdAt: true,
        },
      }),
      prisma.booking.findMany({
        select: {
          id: true,
          bookingNumber: true,
          finalAmount: true,
          bookingStatus: true,
          bookingDate: true,
          assignedUserId: true,
          package: { select: { destination: true } },
          payments: { where: { paymentStatus: 'SUCCESS' }, select: { amount: true } },
        },
      }),
      prisma.payment.findMany({
        where: { paymentStatus: 'SUCCESS' },
        select: { amount: true, paymentDate: true },
      }),
      prisma.expense.findMany({
        select: { amount: true, category: true, expenseDate: true },
      }),
      prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, role: true },
      }),
    ]);

    // 1. Lead Funnel distribution
    const leadFunnelCounts: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      QUOTATION_SENT: 0,
      FOLLOW_UP: 0,
      WON: 0,
      LOST: 0,
      CANCELLED: 0,
    };
    allLeads.forEach(l => {
      if (leadFunnelCounts[l.enquiryStatus] !== undefined) {
        leadFunnelCounts[l.enquiryStatus]++;
      }
    });
    const leadFunnel = Object.keys(leadFunnelCounts).map(status => ({
      status,
      count: leadFunnelCounts[status],
    }));

    // 2. Booking Status distribution
    const bookingStatusCounts: Record<string, number> = {
      ENQUIRY: 0,
      HOLD: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    allBookings.forEach(b => {
      if (bookingStatusCounts[b.bookingStatus] !== undefined) {
        bookingStatusCounts[b.bookingStatus]++;
      }
    });
    const bookingAnalytics = Object.keys(bookingStatusCounts).map(status => ({
      status,
      count: bookingStatusCounts[status],
    }));

    // 3. Destination distribution (from actual bookings & leads)
    const destinationMap: Record<string, { bookings: number; revenue: number; leads: number }> = {};
    allLeads.forEach(l => {
      const dest = l.destination?.trim() || 'Unspecified';
      if (!destinationMap[dest]) destinationMap[dest] = { bookings: 0, revenue: 0, leads: 0 };
      destinationMap[dest].leads++;
    });
    allBookings.forEach(b => {
      const dest = b.package?.destination?.trim() || 'Custom Trip';
      if (!destinationMap[dest]) destinationMap[dest] = { bookings: 0, revenue: 0, leads: 0 };
      if (b.bookingStatus !== 'CANCELLED') {
        destinationMap[dest].bookings++;
        destinationMap[dest].revenue += b.finalAmount;
      }
    });
    const destinationAnalytics = Object.keys(destinationMap)
      .map(dest => ({
        destination: dest,
        leads: destinationMap[dest].leads,
        bookings: destinationMap[dest].bookings,
        revenue: destinationMap[dest].revenue,
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 8);

    // 4. Monthly Sales & Revenue Trend (Last 6 months)
    const monthlyMap: Record<string, { month: string; bookingValue: number; collected: number; expenses: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Seed last 6 months so chart has consistent timeline
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyMap[key] = { month: label, bookingValue: 0, collected: 0, expenses: 0 };
    }

    allBookings.forEach(b => {
      if (b.bookingStatus !== 'CANCELLED') {
        const key = b.bookingDate.toISOString().slice(0, 7);
        if (monthlyMap[key]) {
          monthlyMap[key].bookingValue += b.finalAmount;
        }
      }
    });

    allPayments.forEach(p => {
      const key = p.paymentDate.toISOString().slice(0, 7);
      if (monthlyMap[key]) {
        monthlyMap[key].collected += p.amount;
      }
    });

    allExpenses.forEach(e => {
      const key = e.expenseDate.toISOString().slice(0, 7);
      if (monthlyMap[key]) {
        monthlyMap[key].expenses += e.amount;
      }
    });

    const salesTrend = Object.values(monthlyMap);

    // 5. Sales Staff Performance
    const followUps = await prisma.followUp.findMany({
      select: { assignedUserId: true, status: true },
    });

    const staffPerformance = allStaff.map(staff => {
      const assignedLeads = allLeads.filter(l => l.assignedUserId === staff.id).length;
      const wonLeads = allLeads.filter(l => l.assignedUserId === staff.id && l.enquiryStatus === 'WON').length;
      const staffBookings = allBookings.filter(b => b.assignedUserId === staff.id && b.bookingStatus !== 'CANCELLED');
      const revenue = staffBookings.reduce((sum, b) => sum + b.finalAmount, 0);
      const completedFollowUps = followUps.filter(f => f.assignedUserId === staff.id && f.status === 'COMPLETED').length;

      return {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        leadsAssigned: assignedLeads,
        leadsConverted: wonLeads,
        conversionRate: assignedLeads > 0 ? Number(((wonLeads / assignedLeads) * 100).toFixed(1)) : 0,
        bookingsCount: staffBookings.length,
        revenue,
        followUpsCompleted: completedFollowUps,
      };
    });

    // 6. Expense Breakdown by Category
    const expenseCategoryMap: Record<string, number> = {};
    allExpenses.forEach(e => {
      expenseCategoryMap[e.category] = (expenseCategoryMap[e.category] || 0) + e.amount;
    });
    const expenseBreakdown = Object.keys(expenseCategoryMap).map(cat => ({
      category: cat.replace('_', ' '),
      amount: expenseCategoryMap[cat],
    }));

    res.json({
      salesTrend,
      leadFunnel,
      bookingAnalytics,
      destinationAnalytics,
      staffPerformance,
      expenseBreakdown,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
