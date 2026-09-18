import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Main Dashboard KPIs & Today's Tasks
router.get('/dashboard', async (req: AuthRequest, res: Response, next) => {
  try {
    const startDateQuery = (req.query.startDate as string || '').trim();
    const endDateQuery = (req.query.endDate as string || '').trim();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const dateFilter: any = {};
    if (startDateQuery || endDateQuery) {
      if (startDateQuery) dateFilter.gte = new Date(startDateQuery);
      if (endDateQuery) {
        const d = new Date(endDateQuery);
        d.setHours(23, 59, 59, 999);
        dateFilter.lte = d;
      }
    }

    const leadDateWhere = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};
    const bookingDateWhere = Object.keys(dateFilter).length ? { bookingDate: dateFilter } : {};
    const quotationDateWhere = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};
    const cabDateWhere = Object.keys(dateFilter).length ? { pickupDate: dateFilter } : {};

    const [
      totalLeads,
      newLeads,
      inProgressLeads,
      wonLeads,
      qualifiedPoolCount,
      totalQuotations,
      draftQuotations,
      acceptedQuotations,
      totalBookings,
      confirmedBookingsCount,
      confirmedBookings,
      totalCabs,
      activeCabs,
      allCabs,
      totalCustomers,
      successfulPayments,
      b2bBookingsCount,
      todayFollowUpsList,
      overdueFollowUpsList,
      todayDeparturesList,
      todayCabsList,
      expiringQuotationsList,
      recentEnquiries,
      recentBookings,
    ] = await Promise.all([
      // Leads
      prisma.lead.count({ where: leadDateWhere }),
      prisma.lead.count({ where: { ...leadDateWhere, enquiryStatus: 'NEW' } }),
      prisma.lead.count({ where: { ...leadDateWhere, enquiryStatus: { in: ['CONTACTED', 'QUALIFIED', 'QUOTATION_SENT', 'FOLLOW_UP'] } } }),
      prisma.lead.count({ where: { ...leadDateWhere, enquiryStatus: 'WON' } }),
      prisma.lead.count({ where: { ...leadDateWhere, enquiryStatus: { in: ['QUALIFIED', 'QUOTATION_SENT', 'FOLLOW_UP', 'WON', 'LOST'] } } }),

      // Quotations
      prisma.quotation.count({ where: quotationDateWhere }),
      prisma.quotation.count({ where: { ...quotationDateWhere, status: { in: ['DRAFT', 'SENT'] } } }),
      prisma.quotation.count({ where: { ...quotationDateWhere, status: { in: ['ACCEPTED', 'CONVERTED'] } } }),

      // Bookings
      prisma.booking.count({ where: bookingDateWhere }),
      prisma.booking.count({ where: { ...bookingDateWhere, bookingStatus: { in: ['CONFIRMED', 'COMPLETED'] } } }),
      prisma.booking.findMany({
        where: { ...bookingDateWhere, bookingStatus: { in: ['CONFIRMED', 'COMPLETED'] } },
        select: { id: true, finalAmount: true },
      }),

      // Cabs
      prisma.cabBooking.count({ where: cabDateWhere }),
      prisma.cabBooking.count({ where: { ...cabDateWhere, bookingStatus: { in: ['CONFIRMED', 'ON_TRIP'] } } }),
      prisma.cabBooking.findMany({
        where: cabDateWhere,
        select: { cabAmount: true, advanceAmount: true, balanceAmount: true },
      }),

      // Customers
      prisma.customer.count(),

      // Payments
      prisma.payment.findMany({
        where: { paymentStatus: 'SUCCESS' },
        select: { amount: true },
      }),

      // B2B
      prisma.agentBooking.count(),

      // TODAY'S TASKS
      // 1. Follow-ups Today
      prisma.followUp.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { gte: startOfToday, lte: endOfToday },
        },
        include: {
          lead: { include: { customer: { select: { fullName: true, phone: true } } } },
          assignedUser: { select: { name: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 15,
      }),

      // 2. Overdue Follow-ups
      prisma.followUp.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lt: startOfToday },
        },
        include: {
          lead: { include: { customer: { select: { fullName: true, phone: true } } } },
          assignedUser: { select: { name: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 15,
      }),

      // 3. Departures Today
      prisma.booking.findMany({
        where: {
          travelStartDate: { gte: startOfToday, lte: endOfToday },
          bookingStatus: { not: 'CANCELLED' },
        },
        include: {
          customer: { select: { fullName: true, phone: true } },
          package: { select: { packageName: true, destination: true } },
          assignedUser: { select: { name: true } },
        },
        take: 15,
      }),

      // 4. Cab Pickups Today
      prisma.cabBooking.findMany({
        where: {
          pickupDate: { gte: startOfToday, lte: endOfToday },
          bookingStatus: { not: 'CANCELLED' },
        },
        include: {
          assignedStaff: { select: { name: true } },
        },
        orderBy: { pickupTime: 'asc' },
        take: 15,
      }),

      // 5. Expiring / Open Quotations
      prisma.quotation.findMany({
        where: {
          status: { in: ['SENT', 'DRAFT'] },
          createdAt: { lt: new Date(Date.now() - 5 * 86400000) },
        },
        include: {
          customer: { select: { fullName: true, phone: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),

      // Recent Activity
      prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { fullName: true, phone: true } },
          package: { select: { packageName: true } },
        },
      }),
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { fullName: true, phone: true } },
          package: { select: { packageName: true } },
        },
      }),
    ]);

    // Financial calculations
    const tourRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.finalAmount || 0), 0);
    const cabRevenue = allCabs.reduce((sum, c) => sum + Number(c.cabAmount || 0), 0);
    const totalRevenue = tourRevenue + cabRevenue;

    const tourCollected = successfulPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const cabAdvance = allCabs.reduce((sum, c) => sum + Number(c.advanceAmount || 0), 0);
    const totalCollected = tourCollected + cabAdvance;

    const cabBalance = allCabs.reduce((sum, c) => sum + Number(c.balanceAmount || 0), 0);
    const pendingPayments = Math.max(0, tourRevenue - tourCollected) + cabBalance;

    const conversionRate = qualifiedPoolCount > 0
      ? Number(((wonLeads / qualifiedPoolCount) * 100).toFixed(1))
      : 0;

    res.json({
      cards: {
        // 16 Critical Metrics
        totalLeads,
        newLeads,
        inProgressLeads,
        wonLeads,
        totalQuotations,
        draftQuotations,
        acceptedQuotations,
        totalBookings,
        confirmedBookings: confirmedBookingsCount,
        departuresToday: todayDeparturesList.length,
        totalCabs,
        activeCabs,
        totalCustomers,
        totalRevenue,
        totalCollected,
        pendingPayments,
        // Extras
        b2bBookings: b2bBookingsCount,
        conversionRate,
        followUpsToday: todayFollowUpsList.length,
      },
      todaysTasks: {
        todayFollowUps: todayFollowUpsList,
        overdueFollowUps: overdueFollowUpsList,
        todayDepartures: todayDeparturesList,
        todayCabs: todayCabsList,
        expiringQuotations: expiringQuotationsList,
      },
      recentEnquiries,
      recentBookings,
    });
  } catch (error) {
    next(error);
  }
});

// Detailed Analytics: Trends, Funnel, Destinations, Staff Rankings, Quotations, Cabs
router.get('/charts', async (req: AuthRequest, res: Response, next) => {
  try {
    const [allLeads, allBookings, allPayments, allExpenses, allStaff, allQuotations, allCabs] = await Promise.all([
      prisma.lead.findMany({
        select: {
          id: true,
          enquiryStatus: true,
          destination: true,
          source: true,
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
      prisma.quotation.findMany({
        select: { id: true, status: true, finalAmount: true, createdAt: true },
      }),
      prisma.cabBooking.findMany({
        select: { id: true, bookingStatus: true, vehicleType: true, tripType: true, cabAmount: true, pickupDate: true },
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
        destinationMap[dest].revenue += Number(b.finalAmount);
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
          monthlyMap[key].bookingValue += Number(b.finalAmount);
        }
      }
    });

    allPayments.forEach(p => {
      const key = p.paymentDate.toISOString().slice(0, 7);
      if (monthlyMap[key]) {
        monthlyMap[key].collected += Number(p.amount);
      }
    });

    allExpenses.forEach(e => {
      const key = e.expenseDate.toISOString().slice(0, 7);
      if (monthlyMap[key]) {
        monthlyMap[key].expenses += Number(e.amount);
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
      const revenue = staffBookings.reduce((sum, b) => sum + Number(b.finalAmount), 0);
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
      expenseCategoryMap[e.category] = (expenseCategoryMap[e.category] || 0) + Number(e.amount);
    });
    const expenseBreakdown = Object.keys(expenseCategoryMap).map(cat => ({
      category: cat.replace('_', ' '),
      amount: expenseCategoryMap[cat],
    }));

    // 7. Quotation Status Breakdown
    const quotationStatusMap: Record<string, number> = {
      DRAFT: 0,
      SENT: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      EXPIRED: 0,
    };
    allQuotations.forEach(q => {
      if (quotationStatusMap[q.status] !== undefined) {
        quotationStatusMap[q.status]++;
      } else {
        quotationStatusMap[q.status] = 1;
      }
    });
    const quotationAnalytics = Object.keys(quotationStatusMap).map(status => ({
      status,
      count: quotationStatusMap[status],
    }));

    // 8. Cab Booking Status Breakdown
    const cabStatusMap: Record<string, number> = {
      CONFIRMED: 0,
      ON_TRIP: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      PENDING: 0,
    };
    allCabs.forEach(c => {
      if (cabStatusMap[c.bookingStatus] !== undefined) {
        cabStatusMap[c.bookingStatus]++;
      } else {
        cabStatusMap[c.bookingStatus] = 1;
      }
    });
    const cabAnalytics = Object.keys(cabStatusMap).map(status => ({
      status,
      count: cabStatusMap[status],
    }));

    // 9. Lead Sources Breakdown
    const leadSourceMap: Record<string, number> = {};
    allLeads.forEach(l => {
      const src = l.source || 'DIRECT';
      leadSourceMap[src] = (leadSourceMap[src] || 0) + 1;
    });
    const leadSourceAnalytics = Object.keys(leadSourceMap).map(source => ({
      source,
      count: leadSourceMap[source],
    })).sort((a, b) => b.count - a.count);

    res.json({
      salesTrend,
      leadFunnel,
      bookingAnalytics,
      quotationAnalytics,
      cabAnalytics,
      leadSourceAnalytics,
      destinationAnalytics,
      staffPerformance,
      expenseBreakdown,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
