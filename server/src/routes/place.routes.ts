import { Router, Response } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const sanitizeCell = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.startsWith('data:image/')) return '[Embedded Image Data]';
  return str.length > 32000 ? str.slice(0, 32000) + '... (truncated)' : str;
};

// GET /api/places/export/excel: Export places to Excel (.xlsx)
router.get('/export/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const places = await prisma.place.findMany({
      where: { isDeleted: false },
      orderBy: [{ state: 'asc' }, { district: 'asc' }, { name: 'asc' }],
    });

    const rows = places.map((p, idx) => ({
      'S.No': idx + 1,
      'Place Name': sanitizeCell(p.name),
      'State': sanitizeCell(p.state),
      'District': sanitizeCell(p.district),
      'Category': sanitizeCell(p.category || 'Sightseeing'),
      'Description': sanitizeCell((p as any).description || (p as any).famousReason || ''),
      'Duration': sanitizeCell(p.suggestedDuration || '2 Hours'),
      'Distance': sanitizeCell(p.distanceFromCenter || ''),
      'Activities': sanitizeCell(p.activities || ''),
      'Image URL': sanitizeCell(p.imageUrl || ''),
      'Notes': sanitizeCell((p as any).notes || ''),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Places');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const prefix = req.user?.company?.slug || 'crm';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${prefix}-places-${Date.now()}.xlsx`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
});

// GET /api/places: Search and list places directly from database
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const state = (req.query.state as string || '').trim();
    const district = (req.query.district as string || '').trim();
    const search = (req.query.search as string || '').trim();

    // Query permanent database places (zero dummy data)
    const where: any = { isDeleted: false };
    if (state && state.toLowerCase() !== 'all' && state.toLowerCase() !== 'all states') {
      where.state = { equals: state };
    }
    if (district && district.toLowerCase() !== 'all' && district.toLowerCase() !== 'all districts') {
      where.district = { equals: district };
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { district: { contains: search } },
        { state: { contains: search } },
        { activities: { contains: search } },
        { category: { contains: search } },
      ];
    }

    const places = await prisma.place.findMany({
      where,
      orderBy: [{ state: 'asc' }, { district: 'asc' }, { name: 'asc' }],
    });

    res.json({ places, total: places.length });
  } catch (error) {
    next(error);
  }
});

// POST /api/places: Create a new place permanently in the database (or reuse existing)
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      name,
      state,
      district,
      category,
      description,
      famousReason,
      highlights,
      bestTime,
      suggestedDuration,
      distanceFromCenter,
      imageUrl,
      gallery,
      activities,
      notes,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Place name is required.' });
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

    // Check for existing duplicate in DB - reuse seamlessly
    const existing = await prisma.place.findFirst({
      where: {
        name: cleanName,
        district: cleanDistrict,
        state: cleanState,
        isDeleted: false,
      },
    });

    if (existing) {
      res.status(200).json({
        message: `Place "${cleanName}" already exists in ${cleanDistrict}, ${cleanState}. Reusing library place.`,
        place: existing,
        reused: true,
      });
      return;
    }

    const place = await prisma.place.create({
      data: {
        name: cleanName,
        state: cleanState,
        district: cleanDistrict,
        category: category?.trim() || 'Sightseeing',
        description: description?.trim() || famousReason?.trim() || '',
        famousReason: famousReason?.trim() || description?.trim() || '',
        highlights: highlights?.trim() || null,
        bestTime: bestTime?.trim() || null,
        suggestedDuration: suggestedDuration?.trim() || '2 Hours',
        distanceFromCenter: distanceFromCenter?.trim() || '',
        imageUrl: imageUrl?.trim() || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
        gallery: typeof gallery === 'string' ? gallery : (gallery ? JSON.stringify(gallery) : null),
        activities: activities?.trim() || '',
        notes: notes?.trim() || '',
        createdById: req.user?.id || null,
      },
    });

    res.status(201).json({
      message: `Place "${cleanName}" permanently added to database.`,
      place,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/places/:id: Update place details
router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const {
      name,
      state,
      district,
      category,
      description,
      famousReason,
      highlights,
      bestTime,
      suggestedDuration,
      distanceFromCenter,
      imageUrl,
      gallery,
      activities,
      notes,
    } = req.body;

    const existing = await prisma.place.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      res.status(404).json({ message: 'Place not found.' });
      return;
    }

    const galleryJson = gallery !== undefined
      ? (typeof gallery === 'string' ? gallery : (gallery ? JSON.stringify(gallery) : null))
      : existing.gallery;

    const updated = await prisma.place.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(state ? { state: state.trim() } : {}),
        ...(district ? { district: district.trim() } : {}),
        ...(category !== undefined ? { category: category?.trim() || 'Sightseeing' } : {}),
        ...(description !== undefined ? { description: description?.trim() || '' } : {}),
        ...(famousReason !== undefined ? { famousReason: famousReason?.trim() || '' } : {}),
        ...(highlights !== undefined ? { highlights: highlights?.trim() || null } : {}),
        ...(bestTime !== undefined ? { bestTime: bestTime?.trim() || null } : {}),
        ...(suggestedDuration !== undefined ? { suggestedDuration: suggestedDuration?.trim() || '2 Hours' } : {}),
        ...(distanceFromCenter !== undefined ? { distanceFromCenter: distanceFromCenter?.trim() || '' } : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl?.trim() || '' } : {}),
        ...(gallery !== undefined ? { gallery: galleryJson } : {}),
        ...(activities !== undefined ? { activities: activities?.trim() || '' } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || '' } : {}),
      },
    });

    res.json({
      message: `Place "${updated.name}" updated successfully.`,
      place: updated,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/places/import: Bulk spreadsheet import with comprehensive validation and reporting
router.post('/import', async (req: AuthRequest, res: Response, next) => {
  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({
        message: 'Unable to import: No data rows found in uploaded file.',
        totalRows: 0,
        importedCount: 0,
        duplicateCount: 0,
        failedCount: 0,
        skippedCount: 0,
        errors: [{ row: 0, reason: 'Spreadsheet contains no data rows.' }],
      });
      return;
    }

    // Helper to find column value by loose header name
    const getVal = (row: Record<string, any>, ...aliases: string[]): string => {
      const keys = Object.keys(row);
      for (const alias of aliases) {
        const found = keys.find(
          (k) => k.trim().toLowerCase() === alias.trim().toLowerCase()
        );
        if (found && row[found] !== undefined && row[found] !== null) {
          return String(row[found]).trim();
        }
      }
      return '';
    };

    // Pre-fetch all existing non-deleted places to do fast in-memory duplicate checking
    const existingDbPlaces = await prisma.place.findMany({
      where: { isDeleted: false },
      select: { name: true, district: true, state: true },
    });

    const seenKeySet = new Set<string>();
    existingDbPlaces.forEach((p) => {
      seenKeySet.add(`${p.name.toLowerCase()}|${p.district.toLowerCase()}|${p.state.toLowerCase()}`);
    });

    const errors: Array<{ row: number; place?: string; reason: string }> = [];
    const duplicates: Array<{ row: number; place: string; district: string; state: string }> = [];
    const toInsert: any[] = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // 1-indexed, accounting for header row
      const name = getVal(row, 'Place', 'Place Name', 'Name', 'Destination', 'place', 'place_name');
      const state = getVal(row, 'State', 'state', 'State Name');
      const district = getVal(row, 'District', 'district', 'District Name');
      const category = getVal(row, 'Category', 'category', 'Type') || 'Sightseeing';
      const description = getVal(row, 'Description', 'description', 'Details', 'Famous Reason', 'famous_reason');
      const duration = getVal(row, 'Duration', 'suggested_duration', 'Suggested Duration', 'duration') || '2 Hours';
      const distance = getVal(row, 'Distance', 'distance_from_center', 'Distance From Center', 'distance');
      const activities = getVal(row, 'Activities', 'activities', 'Activity');
      const imageUrl = getVal(row, 'Image URL', 'imageUrl', 'image', 'Image', 'Photo');
      const notes = getVal(row, 'Notes', 'notes', 'Remarks');

      // Validation 1: Required Place Name
      if (!name) {
        errors.push({ row: rowNum, reason: `Row ${rowNum} could not be imported because Place Name is empty.` });
        return;
      }

      // Validation 2: Required State
      if (!state) {
        errors.push({ row: rowNum, place: name, reason: `Row ${rowNum} could not be imported because State is empty.` });
        return;
      }

      // Validation 3: Required District
      if (!district) {
        errors.push({ row: rowNum, place: name, reason: `Row ${rowNum} could not be imported because District is empty.` });
        return;
      }

      const key = `${name.toLowerCase()}|${district.toLowerCase()}|${state.toLowerCase()}`;
      if (seenKeySet.has(key)) {
        duplicates.push({ row: rowNum, place: name, district, state });
        return;
      }

      seenKeySet.add(key);
      toInsert.push({
        name,
        state,
        district,
        category,
        description: description || `${name} - sightseeing destination in ${district}.`,
        famousReason: description || `${name} - curated place in ${district}, ${state}.`,
        suggestedDuration: duration,
        distanceFromCenter: distance,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
        activities: activities || '',
        notes: notes || '',
        createdById: req.user?.id || null,
      });
    });

    // Perform database insertion in chunks
    let insertedCount = 0;
    if (toInsert.length > 0) {
      await prisma.$transaction(
        toInsert.map((item) => prisma.place.create({ data: item }))
      );
      insertedCount = toInsert.length;
    }

    res.json({
      message: `Import processed: ${insertedCount} imported, ${duplicates.length} duplicates skipped, ${errors.length} errors.`,
      totalRows: rows.length,
      importedCount: insertedCount,
      duplicateCount: duplicates.length,
      failedCount: errors.length,
      skippedCount: duplicates.length + errors.length,
      errors,
      duplicates,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/places/:id: Soft delete
router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    await prisma.place.update({
      where: { id },
      data: { isDeleted: true },
    });
    res.json({ message: 'Place successfully deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
