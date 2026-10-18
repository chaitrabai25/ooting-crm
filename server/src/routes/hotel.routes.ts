import { Router, Response } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { cache } from '../services/cache.service.js';
import { optimizeBase64IfNeeded } from '../services/image.service.js';

const router = Router();
router.use(authenticate);

const sanitizeCell = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.startsWith('data:image/')) return '[Embedded Image Data]';
  return str.length > 32000 ? str.slice(0, 32000) + '... (truncated)' : str;
};

// GET /api/hotels/export/excel: Export hotels to Excel (.xlsx)
router.get('/export/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const companyId = req.user!.companyId;
    const hotels = await (prisma as any).hotel.findMany({
      where: {
        isDeleted: false,
        OR: [
          { companyId },
          { companyId: null },
          { company: { isOoting: true } },
        ],
      },
      orderBy: [{ state: 'asc' }, { district: 'asc' }, { name: 'asc' }],
    });

    const rows = hotels.map((h: any, idx: number) => ({
      'S.No': idx + 1,
      'Hotel Name': sanitizeCell(h.name),
      'Star Category': sanitizeCell(h.starCategory || '3 Star'),
      'State': sanitizeCell(h.state),
      'District': sanitizeCell(h.district),
      'City / Town': sanitizeCell(h.city || ''),
      'Address': sanitizeCell(h.address || ''),
      'Description': sanitizeCell(h.description || ''),
      'Phone': sanitizeCell(h.contactPhone || ''),
      'Email': sanitizeCell(h.contactEmail || ''),
      'Check-in': sanitizeCell(h.checkInTime || '12:00 PM'),
      'Check-out': sanitizeCell(h.checkOutTime || '11:00 AM'),
      'Amenities': sanitizeCell(h.amenities || ''),
      'Image URL': sanitizeCell(h.imageUrl || ''),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hotels');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const prefix = req.user?.company?.slug || 'crm';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${prefix}-hotels-${Date.now()}.xlsx`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
});

// GET /api/hotels: Search and list hotels
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const companyId = req.user!.companyId;
    const state = (req.query.state as string || '').trim();
    const district = (req.query.district as string || '').trim();
    const city = (req.query.city as string || '').trim();
    const starCategory = (req.query.starCategory as string || '').trim();
    const search = (req.query.search as string || '').trim();
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '50', 10));

    const cacheKey = `hotels:${companyId}:${state.toLowerCase()}:${district.toLowerCase()}:${city.toLowerCase()}:${starCategory.toLowerCase()}:${search.toLowerCase()}:${page}:${limit}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const where: any = {
      isDeleted: false,
      OR: [
        { companyId },
        { companyId: null },
        { company: { isOoting: true } },
      ],
    };
    if (state && state.toLowerCase() !== 'all' && state.toLowerCase() !== 'all states') {
      where.state = { equals: state };
    }
    if (district && district.toLowerCase() !== 'all' && district.toLowerCase() !== 'all districts') {
      where.district = { equals: district };
    }
    if (city) where.city = { contains: city };
    if (starCategory) where.starCategory = { equals: starCategory };

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search } },
            { city: { contains: search } },
            { district: { contains: search } },
            { state: { contains: search } },
            { description: { contains: search } },
            { address: { contains: search } },
          ],
        },
      ];
    }

    const [total, hotels] = await Promise.all([
      (prisma as any).hotel.count({ where }),
      (prisma as any).hotel.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ state: 'asc' }, { district: 'asc' }, { name: 'asc' }],
      }),
    ]);

    const result = {
      hotels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    cache.set(cacheKey, result, 900); // 15 mins cache
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/hotels/:id: Single hotel
router.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const cacheKey = `hotel:${id}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const hotel = await (prisma as any).hotel.findFirst({
      where: { id, isDeleted: false },
    });

    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found.' });
      return;
    }

    cache.set(cacheKey, hotel, 900);
    res.json(hotel);
  } catch (error) {
    next(error);
  }
});

// POST /api/hotels: Add hotel permanently to database (or reuse existing)
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      name,
      state,
      district,
      city,
      starCategory,
      address,
      description,
      imageUrl,
      gallery,
      websiteUrls,
      contactPhone,
      contactEmail,
      checkInTime,
      checkOutTime,
      amenities,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Hotel name is required.' });
      return;
    }
    if (!state || !state.trim()) {
      res.status(400).json({ message: 'State is required.' });
      return;
    }
    if (!district || !district.trim()) {
      res.status(400).json({ message: 'District is required.' });
      return;
    }

    const cleanName = name.trim();
    const cleanState = state.trim();
    const cleanDistrict = district.trim();

    // Check duplicate - reuse seamlessly
    const existing = await (prisma as any).hotel.findFirst({
      where: {
        name: cleanName,
        district: cleanDistrict,
        state: cleanState,
        isDeleted: false,
      },
    });

    if (existing) {
      res.status(200).json({
        message: `Hotel "${cleanName}" already exists in ${cleanDistrict}, ${cleanState}. Reusing library hotel.`,
        hotel: existing,
        reused: true,
      });
      return;
    }

    const galleryJson = typeof gallery === 'string' ? gallery : (gallery ? JSON.stringify(gallery) : null);
    const websiteUrlsJson = typeof websiteUrls === 'string' ? websiteUrls : (websiteUrls ? JSON.stringify(websiteUrls) : null);

    const optimizedImageUrl = imageUrl ? await optimizeBase64IfNeeded(imageUrl.trim()) : null;

    const hotel = await (prisma as any).hotel.create({
      data: {
        name: cleanName,
        state: cleanState,
        district: cleanDistrict,
        city: city?.trim() || null,
        starCategory: starCategory?.trim() || '3 Star',
        address: address?.trim() || null,
        description: description?.trim() || null,
        imageUrl: optimizedImageUrl,
        gallery: galleryJson,
        websiteUrls: websiteUrlsJson,
        contactPhone: contactPhone?.trim() || null,
        contactEmail: contactEmail?.trim() || null,
        checkInTime: checkInTime?.trim() || '12:00 PM',
        checkOutTime: checkOutTime?.trim() || '11:00 AM',
        amenities: amenities?.trim() || null,
        createdById: req.user?.id || null,
        companyId: req.user!.companyId,
      },
    });

    cache.delPrefix('hotels:');

    if (req.user?.id) {
      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        action: 'CREATE',
        entity: 'HOTEL' as any,
        entityId: hotel.id,
        details: `Created hotel "${hotel.name}" in ${hotel.district}, ${hotel.state}`,
        ipAddress: req.ip,
      });
    }

    res.status(201).json({
      message: `Hotel "${cleanName}" saved permanently.`,
      hotel,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/hotels/:id: Update hotel (scoped to company)
router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const {
      name,
      state,
      district,
      city,
      starCategory,
      address,
      description,
      imageUrl,
      gallery,
      websiteUrls,
      contactPhone,
      contactEmail,
      checkInTime,
      checkOutTime,
      amenities,
    } = req.body;

    const existing = await (prisma as any).hotel.findFirst({
      where: {
        id,
        isDeleted: false,
        OR: [
          { companyId: req.user!.companyId },
          ...(req.user!.isPlatformMasterAdmin ? [{ companyId: null }] : []),
        ],
      },
    });

    if (!existing) {
      res.status(404).json({ message: 'Hotel not found or you do not have permission to modify it.' });
      return;
    }

    const galleryJson = gallery !== undefined
      ? (typeof gallery === 'string' ? gallery : (gallery ? JSON.stringify(gallery) : null))
      : existing.gallery;

    const websiteUrlsJson = websiteUrls !== undefined
      ? (typeof websiteUrls === 'string' ? websiteUrls : (websiteUrls ? JSON.stringify(websiteUrls) : null))
      : existing.websiteUrls;

    let optimizedImageUrl = imageUrl !== undefined ? imageUrl?.trim() || null : undefined;
    if (optimizedImageUrl) {
      optimizedImageUrl = await optimizeBase64IfNeeded(optimizedImageUrl) || null;
    }

    const updated = await (prisma as any).hotel.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(state ? { state: state.trim() } : {}),
        ...(district ? { district: district.trim() } : {}),
        ...(city !== undefined ? { city: city?.trim() || null } : {}),
        ...(starCategory !== undefined ? { starCategory: starCategory?.trim() || '3 Star' } : {}),
        ...(address !== undefined ? { address: address?.trim() || null } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(optimizedImageUrl !== undefined ? { imageUrl: optimizedImageUrl } : {}),
        ...(gallery !== undefined ? { gallery: galleryJson } : {}),
        ...(websiteUrls !== undefined ? { websiteUrls: websiteUrlsJson } : {}),
        ...(contactPhone !== undefined ? { contactPhone: contactPhone?.trim() || null } : {}),
        ...(contactEmail !== undefined ? { contactEmail: contactEmail?.trim() || null } : {}),
        ...(checkInTime !== undefined ? { checkInTime: checkInTime?.trim() || '12:00 PM' } : {}),
        ...(checkOutTime !== undefined ? { checkOutTime: checkOutTime?.trim() || '11:00 AM' } : {}),
        ...(amenities !== undefined ? { amenities: amenities?.trim() || null } : {}),
      },
    });

    // Cascade updates to all itinerary days using this hotel
    try {
      const loc = `${updated.city ? `${updated.city}, ` : ''}${updated.district || ''}`;
      await prisma.itineraryDay.updateMany({
        where: { hotelId: id },
        data: {
          hotelName: updated.name,
          hotelStarCategory: updated.starCategory || '3 Star',
          hotelImageUrl: updated.imageUrl || null,
          hotelLocation: loc || null,
          hotelDetails: updated.description || updated.address || null,
          hotelCheckIn: updated.checkInTime || '12:00 PM',
          hotelCheckOut: updated.checkOutTime || '11:00 AM',
        },
      });
    } catch (itineraryCascadeErr) {
      console.warn('[HotelRoute] Itinerary cascade sync warning:', itineraryCascadeErr);
    }

    cache.delPrefix('hotels:');
    cache.del(`hotel:${id}`);
    cache.delPrefix('package:');
    cache.delPrefix('packages:');

    res.json({
      message: `Hotel "${updated.name}" updated successfully and synchronized with all itineraries.`,
      hotel: updated,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/hotels/:id: Soft delete (scoped to company)
router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const existing = await (prisma as any).hotel.findFirst({
      where: {
        id,
        isDeleted: false,
        OR: [
          { companyId: req.user!.companyId },
          ...(req.user!.isPlatformMasterAdmin ? [{ companyId: null }] : []),
        ],
      },
    });

    if (!existing) {
      res.status(404).json({ message: 'Hotel not found or you do not have permission to delete it.' });
      return;
    }

    await (prisma as any).hotel.update({
      where: { id },
      data: { isDeleted: true },
    });

    cache.delPrefix('hotels:');
    cache.del(`hotel:${id}`);

    res.json({ message: 'Hotel removed successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
