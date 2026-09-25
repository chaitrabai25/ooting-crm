import { Router, Response } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Curated verified catalog for popular travel destinations in India
const CURATED_SEED_PLACES = [
  // THE NILGIRIS (OOTY / COONOOR)
  {
    name: 'Ooty Lake & Boathouse',
    state: 'Tamil Nadu',
    district: 'The Nilgiris (Ooty)',
    category: 'Sightseeing',
    famousReason: 'Iconic artificial lake built in 1824 with scenic eucalyptus tree surroundings and pedal/motor boating.',
    suggestedDuration: '2 - 3 Hours',
    distanceFromCenter: '1.5 km from Ooty Town',
    imageUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80',
    activities: 'Speed & Pedal Boating, Mini Toy Train Ride, Lakeside Photography',
  },
  {
    name: 'Government Botanical Garden',
    state: 'Tamil Nadu',
    district: 'The Nilgiris (Ooty)',
    category: 'Nature',
    famousReason: 'Sprawling 55-acre garden established in 1848 with over 1,000 species of exotic flora and a 20-million-year-old fossilized tree.',
    suggestedDuration: '2 Hours',
    distanceFromCenter: '2.5 km from Town Center',
    imageUrl: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&auto=format&fit=crop&q=80',
    activities: 'Guided Botanical Walk, Fossil Tree Viewing, Glasshouse Tour',
  },
  {
    name: 'Doddabetta Peak',
    state: 'Tamil Nadu',
    district: 'The Nilgiris (Ooty)',
    category: 'Viewpoint',
    famousReason: 'Highest peak in the Nilgiri hills at 2,637m with sweeping 360-degree vistas across Tamil Nadu and Karnataka.',
    suggestedDuration: '1.5 - 2 Hours',
    distanceFromCenter: '9 km from Ooty Town',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    activities: 'Telescope House Panorama, Mountain Ridge Walk, Tea Tasting',
  },
  {
    name: 'Pykara Waterfalls & Lake',
    state: 'Tamil Nadu',
    district: 'The Nilgiris (Ooty)',
    category: 'Nature',
    famousReason: 'Sacred river plunging through stepped waterfalls and pristine lake surrounded by shola forests.',
    suggestedDuration: '2.5 - 3 Hours',
    distanceFromCenter: '21 km from Ooty Town',
    imageUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
    activities: 'Speed Boating, Stepped Waterfalls Walk, Shola Forest Trail',
  },
  {
    name: "Sim's Park & Botanical Haven",
    state: 'Tamil Nadu',
    district: 'The Nilgiris (Ooty)',
    category: 'Nature',
    famousReason: 'Unique natural ravine garden in Coonoor with over 1,200 species of rare sub-tropical and temperate plants.',
    suggestedDuration: '1.5 Hours',
    distanceFromCenter: '18 km from Ooty (Coonoor)',
    imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
    activities: 'Rare Flora Exploration, Rose Garden Stroll, Boating in Pond',
  },
  {
    name: "Dolphin's Nose Viewpoint",
    state: 'Tamil Nadu',
    district: 'The Nilgiris (Ooty)',
    category: 'Viewpoint',
    famousReason: 'Enormous cliff rock resembling a dolphin nose with dramatic views of Catherine Falls plunging 250ft.',
    suggestedDuration: '1 - 2 Hours',
    distanceFromCenter: '28 km from Ooty (Coonoor)',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
    activities: 'Panoramic Gorge Viewing, Catherine Falls Vista, Tea Estate Drive',
  },

  // KARNATAKA - MYSURU (MYSORE)
  {
    name: 'Mysore Palace (Amba Vilas)',
    state: 'Karnataka',
    district: 'Mysuru (Mysore)',
    category: 'Heritage',
    famousReason: 'World-famous Indo-Saracenic royal residence with 100,000 bulbs weekend illumination and golden throne.',
    suggestedDuration: '2 - 3 Hours',
    distanceFromCenter: 'Central Mysuru',
    imageUrl: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800&auto=format&fit=crop&q=80',
    activities: 'Royal Durbar Hall Tour, Sound & Light Show, Photography',
  },
  {
    name: 'Chamundi Hills & Sri Chamundeshwari Temple',
    state: 'Karnataka',
    district: 'Mysuru (Mysore)',
    category: 'Temple',
    famousReason: 'Ancient hilltop temple perched at 1,000m featuring panoramic views of Mysuru city and giant monolithic Nandi statue.',
    suggestedDuration: '2 Hours',
    distanceFromCenter: '13 km from City Center',
    imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80',
    activities: 'Temple Darshan, Monolithic Nandi Visit, City Viewpoint',
  },
  {
    name: 'Brindavan Gardens & Musical Fountain',
    state: 'Karnataka',
    district: 'Mysuru (Mysore)',
    category: 'Sightseeing',
    famousReason: 'Terraced Mughal-style garden laid out adjacent to the Krishnarajasagara (KRS) dam with synchronised dancing fountains.',
    suggestedDuration: '2 - 3 Hours (Evening)',
    distanceFromCenter: '18 km from Mysuru',
    imageUrl: 'https://images.unsplash.com/photo-1584810359583-96fc3448beaa?w=800&auto=format&fit=crop&q=80',
    activities: 'Musical Fountain Show, Illuminated Terraced Walk, KRS Dam View',
  },

  // KARNATAKA - KODAGU (COORG)
  {
    name: 'Abbey Falls',
    state: 'Karnataka',
    district: 'Kodagu (Coorg)',
    category: 'Nature',
    famousReason: 'Spectacular cascade roaring between private coffee plantations and spice estates, viewed from hanging suspension bridge.',
    suggestedDuration: '1.5 Hours',
    distanceFromCenter: '8 km from Madikeri',
    imageUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
    activities: 'Hanging Bridge Viewing, Spice Plantation Walk, Nature Photography',
  },
  {
    name: 'Raja’s Seat',
    state: 'Karnataka',
    district: 'Kodagu (Coorg)',
    category: 'Viewpoint',
    famousReason: 'Historic seasonal garden pavilion where the Kings of Kodagu watched breathtaking sunset over misty mountain valleys.',
    suggestedDuration: '1.5 Hours (Sunset)',
    distanceFromCenter: '1 km from Madikeri Bus Station',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    activities: 'Sunset Viewing, Toy Train Ride for Children, Musical Fountain',
  },
  {
    name: 'Dubare Elephant Camp & Kaveri River',
    state: 'Karnataka',
    district: 'Kodagu (Coorg)',
    category: 'Wildlife',
    famousReason: 'Historic ecotourism camp on Kaveri riverbanks where visitors interact with elephants through river bathing and feeding.',
    suggestedDuration: '3 Hours',
    distanceFromCenter: '28 km from Madikeri',
    imageUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800&auto=format&fit=crop&q=80',
    activities: 'Elephant River Bathing, Stillwater Kaveri Rafting, Nature Trail',
  },

  // KARNATAKA - SHIVAMOGGA (SHIMOGA)
  {
    name: 'Jog Falls (Gerosoppa Falls)',
    state: 'Karnataka',
    district: 'Shivamogga (Shimoga)',
    category: 'Nature',
    famousReason: 'Second-highest plunge waterfall in India where the Sharavathi River drops 253m across four cascades: Raja, Roarer, Rocket, and Rani.',
    suggestedDuration: '3 - 4 Hours',
    distanceFromCenter: '100 km from Shivamogga Town',
    imageUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
    activities: 'Valley Viewpoint, 1400 Steps Bottom Trek, Laser Light Show',
  },
  {
    name: 'Sakrebyle Elephant Camp',
    state: 'Karnataka',
    district: 'Shivamogga (Shimoga)',
    category: 'Wildlife',
    famousReason: 'Eco-camp along River Tunga where wild and rescued elephants are bathed and fed every morning by trained Mahouts.',
    suggestedDuration: '2 Hours (Morning)',
    distanceFromCenter: '14 km from Shivamogga',
    imageUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800&auto=format&fit=crop&q=80',
    activities: 'Tunga River Elephant Bathing, Feeding Interaction, Photography',
  },

  // KERALA - IDUKKI (MUNNAR)
  {
    name: 'Eravikulam National Park (Rajamalai)',
    state: 'Kerala',
    district: 'Idukki (Munnar)',
    category: 'Wildlife',
    famousReason: 'Sanctuary of the endangered Nilgiri Tahr and home to the highest peak in South India, Anamudi (2,695m).',
    suggestedDuration: '3 Hours',
    distanceFromCenter: '12 km from Munnar Town',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    activities: 'Nilgiri Tahr Spotting, Forest Safari Bus Ride, Mountain Trek',
  },
  {
    name: 'Mattupetty Dam & Eco Point',
    state: 'Kerala',
    district: 'Idukki (Munnar)',
    category: 'Sightseeing',
    famousReason: 'Concrete gravity dam nestled among undulating tea plantations offering speedboating and natural acoustic echo phenomenon.',
    suggestedDuration: '2 Hours',
    distanceFromCenter: '13 km from Munnar',
    imageUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80',
    activities: 'Speedboat Cruise, Voice Echo Calling, Horse Riding by Lake',
  },
];

// GET /api/places/export/excel: Export places to Excel (.xlsx)
router.get('/export/excel', async (req: AuthRequest, res: Response, next) => {
  try {
    const places = await prisma.place.findMany({
      where: { isDeleted: false },
      orderBy: [{ state: 'asc' }, { district: 'asc' }, { name: 'asc' }],
    });

    const rows = (places.length > 0 ? places : CURATED_SEED_PLACES).map((p, idx) => ({
      'S.No': idx + 1,
      'Place Name': p.name,
      'State': p.state,
      'District': p.district,
      'Category': p.category || 'Sightseeing',
      'Description': (p as any).description || (p as any).famousReason || '',
      'Duration': p.suggestedDuration || '2 Hours',
      'Distance': p.distanceFromCenter || '',
      'Activities': p.activities || '',
      'Image URL': p.imageUrl || '',
      'Notes': (p as any).notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Places');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ooting-places-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// GET /api/places: Search and list places
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const state = (req.query.state as string || '').trim();
    const district = (req.query.district as string || '').trim();
    const search = (req.query.search as string || '').trim();

    // Query permanent database places
    const where: any = { isDeleted: false };
    if (state) {
      where.state = { equals: state };
    }
    if (district) {
      where.district = { equals: district };
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { district: { contains: search } },
        { state: { contains: search } },
        { activities: { contains: search } },
      ];
    }

    const dbPlaces = await prisma.place.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Check if we should merge curated catalog items for the district
    const map = new Map<string, any>();
    // First add DB places
    dbPlaces.forEach((p) => {
      map.set(p.name.trim().toLowerCase(), p);
    });

    // Then fill in curated seed places if they match filter and aren't in DB yet
    CURATED_SEED_PLACES.forEach((p) => {
      const key = p.name.trim().toLowerCase();
      if (!map.has(key)) {
        let matches = true;
        if (state && p.state.toLowerCase() !== state.toLowerCase()) matches = false;
        if (district && !p.district.toLowerCase().includes(district.toLowerCase())) matches = false;
        if (search) {
          const s = search.toLowerCase();
          const matchSearch =
            p.name.toLowerCase().includes(s) ||
            p.district.toLowerCase().includes(s) ||
            p.state.toLowerCase().includes(s) ||
            p.famousReason.toLowerCase().includes(s);
          if (!matchSearch) matches = false;
        }
        if (matches) {
          map.set(key, {
            id: `curated_${p.name.replace(/\s+/g, '_').toLowerCase()}`,
            ...p,
            isCurated: true,
          });
        }
      }
    });

    const places = Array.from(map.values());
    res.json({ places, total: places.length });
  } catch (error) {
    next(error);
  }
});

// POST /api/places: Create a new place permanently in the database
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      name,
      state,
      district,
      category,
      description,
      famousReason,
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

    // Check for existing duplicate in DB
    const existing = await prisma.place.findFirst({
      where: {
        name: cleanName,
        district: cleanDistrict,
        state: cleanState,
        isDeleted: false,
      },
    });

    if (existing) {
      res.status(409).json({
        message: `Place "${cleanName}" already exists in ${cleanDistrict}, ${cleanState}.`,
        place: existing,
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
