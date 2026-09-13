import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

// Aggregated CRM Events for Calendar
router.get('/events', async (req: AuthRequest, res: Response, next) => {
  try {
    const startDateQuery = (req.query.startDate as string || '').trim();
    const endDateQuery = (req.query.endDate as string || '').trim();
    const eventType = (req.query.eventType as string || '').trim(); // optional filter
    const userId = (req.query.userId as string || '').trim(); // optional filter

    // Default to current month +/- 15 days if not specified
    const now = new Date();
    const start = startDateQuery ? new Date(startDateQuery) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDateQuery ? new Date(endDateQuery) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const allEvents: Array<{
      id: string;
      title: string;
      description?: string | null;
      eventType: string;
      startDate: string;
      endDate?: string | null;
      allDay: boolean;
      status: string;
      priority: string;
      color?: string | null;
      source: string;
      refId?: string;
      meta?: any;
    }> = [];

    // 1. Custom Calendar Events
    const calEventWhere: any = {
      startDate: { gte: start, lte: end },
    };
    if (userId) calEventWhere.userId = userId;
    if (eventType && !['FOLLOW_UP', 'DEPARTURE', 'CAB_TRIP', 'QUOTATION'].includes(eventType)) {
      calEventWhere.eventType = eventType;
    }

    const customEvents = await prisma.calendarEvent.findMany({
      where: calEventWhere,
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    customEvents.forEach(e => {
      allEvents.push({
        id: `cal-${e.id}`,
        title: e.title,
        description: e.description,
        eventType: e.eventType,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate ? e.endDate.toISOString() : null,
        allDay: e.allDay,
        status: e.status,
        priority: e.priority,
        color: e.color || '#3b82f6',
        source: 'CALENDAR_EVENT',
        refId: e.id,
        meta: { assignedTo: e.user?.name },
      });
    });

    // 2. Follow-Ups (Scheduled calls, visits, emails)
    if (!eventType || eventType === 'FOLLOW_UP') {
      const followUpWhere: any = {
        scheduledAt: { gte: start, lte: end },
      };
      if (userId) followUpWhere.assignedUserId = userId;

      const followUps = await prisma.followUp.findMany({
        where: followUpWhere,
        include: {
          lead: {
            include: {
              customer: { select: { fullName: true, phone: true } },
            },
          },
          assignedUser: { select: { id: true, name: true } },
        },
      });

      followUps.forEach(f => {
        allEvents.push({
          id: `fu-${f.id}`,
          title: `Follow-up: ${f.lead.customer.fullName} (${f.type})`,
          description: f.notes || `Follow-up with ${f.lead.customer.fullName} regarding ${f.lead.destination}`,
          eventType: 'FOLLOW_UP',
          startDate: f.scheduledAt.toISOString(),
          endDate: null,
          allDay: false,
          status: f.status,
          priority: 'HIGH',
          color: f.status === 'COMPLETED' ? '#10b981' : '#f59e0b',
          source: 'FOLLOW_UP',
          refId: f.leadId,
          meta: {
            customerName: f.lead.customer.fullName,
            customerPhone: f.lead.customer.phone,
            assignedTo: f.assignedUser?.name,
            leadId: f.leadId,
          },
        });
      });
    }

    // 3. Tour Package Departures
    if (!eventType || eventType === 'DEPARTURE') {
      const bookingWhere: any = {
        travelStartDate: { gte: start, lte: end },
        bookingStatus: { not: 'CANCELLED' },
      };
      if (userId) bookingWhere.assignedUserId = userId;

      const departures = await prisma.booking.findMany({
        where: bookingWhere,
        include: {
          customer: { select: { fullName: true, phone: true } },
          package: { select: { packageName: true, destination: true } },
          assignedUser: { select: { id: true, name: true } },
        },
      });

      departures.forEach(b => {
        allEvents.push({
          id: `dep-${b.id}`,
          title: `Departure: ${b.customer.fullName} - ${b.package?.packageName || 'Tour'}`,
          description: `Booking ${b.bookingNumber} departs for ${b.package?.destination || 'Destination'}. Travellers: ${b.travellers}`,
          eventType: 'DEPARTURE',
          startDate: b.travelStartDate.toISOString(),
          endDate: b.travelEndDate.toISOString(),
          allDay: true,
          status: b.bookingStatus,
          priority: 'URGENT',
          color: '#8b5cf6',
          source: 'BOOKING',
          refId: b.id,
          meta: {
            bookingNumber: b.bookingNumber,
            customerName: b.customer.fullName,
            customerPhone: b.customer.phone,
            travellers: b.travellers,
            assignedTo: b.assignedUser?.name,
          },
        });
      });
    }

    // 4. Cab Trips
    if (!eventType || eventType === 'CAB_TRIP') {
      const cabWhere: any = {
        pickupDate: { gte: start, lte: end },
        bookingStatus: { not: 'CANCELLED' },
      };
      if (userId) cabWhere.assignedStaffId = userId;

      const cabTrips = await prisma.cabBooking.findMany({
        where: cabWhere,
        include: {
          assignedStaff: { select: { id: true, name: true } },
        },
      });

      cabTrips.forEach(c => {
        allEvents.push({
          id: `cab-${c.id}`,
          title: `Cab: ${c.customerName} (${c.pickupPlace} ➔ ${c.dropPlace})`,
          description: `Ref: ${c.bookingReference}. Vehicle: ${c.vehicleType} (${c.carNumber || 'Unassigned'}). Pickup at ${c.pickupTime}`,
          eventType: 'CAB_TRIP',
          startDate: c.pickupDate.toISOString(),
          endDate: null,
          allDay: false,
          status: c.bookingStatus,
          priority: 'MEDIUM',
          color: '#06b6d4',
          source: 'CAB_BOOKING',
          refId: c.id,
          meta: {
            bookingReference: c.bookingReference,
            customerName: c.customerName,
            customerPhone: c.customerPhone,
            pickupTime: c.pickupTime,
            carNumber: c.carNumber,
            driverName: c.driverName,
            driverPhone: c.driverPhone,
            assignedTo: c.assignedStaff?.name,
          },
        });
      });
    }

    // Sort chronologically
    allEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    res.json(allEvents);
  } catch (error) {
    next(error);
  }
});

// Staff Workload & Availability
router.get('/staff-availability', async (req: AuthRequest, res: Response, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const staffMembers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
    });

    const staffWorkload = await Promise.all(
      staffMembers.map(async staff => {
        const [activeLeads, todayFollowUps, activeBookings, upcomingCabs, todayEvents] = await Promise.all([
          prisma.lead.count({
            where: { assignedUserId: staff.id, enquiryStatus: { in: ['NEW', 'CONTACTED', 'QUOTATION_SENT'] } },
          }),
          prisma.followUp.count({
            where: {
              assignedUserId: staff.id,
              scheduledAt: { gte: today, lt: tomorrow },
              status: 'PENDING',
            },
          }),
          prisma.booking.count({
            where: { assignedUserId: staff.id, bookingStatus: { in: ['CONFIRMED', 'HOLD'] } },
          }),
          prisma.cabBooking.count({
            where: { assignedStaffId: staff.id, pickupDate: { gte: today }, bookingStatus: { in: ['CONFIRMED', 'ON_TRIP'] } },
          }),
          prisma.calendarEvent.count({
            where: { userId: staff.id, startDate: { gte: today, lt: tomorrow }, status: { not: 'COMPLETED' } },
          }),
        ]);

        const totalActiveTasks = activeLeads + todayFollowUps + activeBookings + upcomingCabs + todayEvents;

        let availability: 'AVAILABLE' | 'BUSY' | 'OVERLOADED' = 'AVAILABLE';
        if (totalActiveTasks >= 8) {
          availability = 'OVERLOADED';
        } else if (totalActiveTasks >= 4) {
          availability = 'BUSY';
        }

        return {
          ...staff,
          metrics: {
            activeLeads,
            todayFollowUps,
            activeBookings,
            upcomingCabs,
            todayEvents,
            totalActiveTasks,
          },
          availability,
        };
      })
    );

    res.json(staffWorkload);
  } catch (error) {
    next(error);
  }
});

const calendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  eventType: z.enum(['MEETING', 'TASK', 'REMINDER', 'FOLLOW_UP', 'CAB_TRIP', 'DEPARTURE', 'PAYMENT_DUE', 'LEAVE']).default('TASK'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable(),
  allDay: z.boolean().default(false),
  userId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  bookingId: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  color: z.string().optional().nullable(),
});

// Create Calendar Event
router.post('/events', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = calendarEventSchema.parse(req.body);

    const event = await prisma.calendarEvent.create({
      data: {
        title: data.title.trim(),
        description: data.description ? data.description.trim() : null,
        eventType: data.eventType,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        allDay: data.allDay,
        userId: data.userId || req.user?.id || null,
        customerId: data.customerId || null,
        leadId: data.leadId || null,
        bookingId: data.bookingId || null,
        status: data.status,
        priority: data.priority,
        color: data.color || null,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'CALENDAR_EVENT',
      entityId: event.id,
      details: `Created calendar event: ${event.title}`,
      ipAddress: req.ip,
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

// Update Calendar Event
router.put('/events/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const data = calendarEventSchema.parse(req.body);

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Event not found.' });
      return;
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title: data.title.trim(),
        description: data.description ? data.description.trim() : null,
        eventType: data.eventType,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        allDay: data.allDay,
        userId: data.userId || existing.userId,
        customerId: data.customerId || null,
        leadId: data.leadId || null,
        bookingId: data.bookingId || null,
        status: data.status,
        priority: data.priority,
        color: data.color || null,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'CALENDAR_EVENT',
      entityId: id,
      details: `Updated calendar event: ${updated.title}`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete Calendar Event
router.delete('/events/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.calendarEvent.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ message: 'Event not found.' });
      return;
    }

    await prisma.calendarEvent.delete({ where: { id } });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'DELETE',
      entity: 'CALENDAR_EVENT',
      entityId: id,
      details: `Deleted calendar event: ${existing.title}`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Event deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;