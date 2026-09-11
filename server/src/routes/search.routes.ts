import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Global Search endpoint
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      res.json({
        customers: [],
        leads: [],
        bookings: [],
        packages: [],
        agents: [],
      });
      return;
    }

    const [customers, leads, bookings, packages, agents] = await Promise.all([
      // Customers
      prisma.customer.findMany({
        where: {
          OR: [
            { fullName: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
          ],
        },
        take: 5,
        select: { id: true, fullName: true, phone: true, email: true, city: true },
      }),
      // Leads
      prisma.lead.findMany({
        where: {
          OR: [
            { destination: { contains: q } },
            { customer: { fullName: { contains: q } } },
          ],
        },
        take: 5,
        include: {
          customer: { select: { fullName: true } },
        },
      }),
      // Bookings
      prisma.booking.findMany({
        where: {
          OR: [
            { bookingNumber: { contains: q } },
            { customer: { fullName: { contains: q } } },
          ],
        },
        take: 5,
        include: {
          customer: { select: { fullName: true } },
        },
      }),
      // Packages
      prisma.package.findMany({
        where: {
          OR: [
            { packageName: { contains: q } },
            { destination: { contains: q } },
          ],
        },
        take: 5,
        select: { id: true, packageName: true, destination: true, price: true },
      }),
      // Agents
      prisma.agent.findMany({
        where: {
          OR: [
            { companyName: { contains: q } },
            { contactPerson: { contains: q } },
            { phone: { contains: q } },
          ],
        },
        take: 5,
        select: { id: true, companyName: true, contactPerson: true, phone: true },
      }),
    ]);

    res.json({
      customers,
      leads: leads.map(l => ({ id: l.id, customerName: l.customer.fullName, destination: l.destination, status: l.enquiryStatus })),
      bookings: bookings.map(b => ({ id: b.id, bookingNumber: b.bookingNumber, customerName: b.customer.fullName, status: b.bookingStatus })),
      packages,
      agents,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
