import { Router, Response } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);

const ALLOWED_SORT_FIELDS = ['name', 'supplierType', 'contactPerson', 'city', 'district', 'state', 'tier', 'status', 'createdAt', 'updatedAt'];

// List B2B Suppliers with pagination, search, status, and type filters
router.get('/', requirePermission('suppliers', 'view'), async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '10', 10));
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const supplierType = (req.query.supplierType as string || '').trim();
    const serviceCategory = (req.query.serviceCategory as string || '').trim();
    const tier = (req.query.tier as string || '').trim();
    const city = (req.query.city as string || '').trim();
    const district = (req.query.district as string || '').trim();
    const state = (req.query.state as string || '').trim();
    const sortByParam = (req.query.sortBy as string || 'createdAt').trim();
    const sortOrderParam = (req.query.sortOrder as string || 'desc').toLowerCase();

    const sortBy = ALLOWED_SORT_FIELDS.includes(sortByParam) ? sortByParam : 'createdAt';
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { city: { contains: search } },
        { district: { contains: search } },
        { state: { contains: search } },
        { servicesProvided: { contains: search } },
        { destinationsCovered: { contains: search } },
        { serviceCategories: { contains: search } },
      ];
    }

    if (status) where.status = status;
    if (supplierType) where.supplierType = supplierType;
    if (tier) where.tier = tier;
    if (city) where.city = { contains: city };
    if (district) where.district = { contains: district };
    if (state) where.state = { contains: state };
    if (serviceCategory) {
      where.OR = [
        ...(where.OR || []),
        { serviceCategories: { contains: serviceCategory } },
        { supplierType: { contains: serviceCategory } },
      ];
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        include: {
          assignedUser: { select: { id: true, name: true, email: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    res.json({
      data: suppliers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
});

// Export Suppliers to Excel (.xlsx)
router.get('/export/excel', requirePermission('suppliers', 'export'), async (req: AuthRequest, res: Response, next) => {
  try {
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();
    const supplierType = (req.query.supplierType as string || '').trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { city: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (supplierType) where.supplierType = supplierType;

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        assignedUser: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const exportRows = suppliers.map(s => ({
      'Supplier / Company Name': s.name,
      'Supplier Type': s.supplierType,
      'Contact Person': s.contactPerson || '-',
      'Phone': s.phone,
      'WhatsApp': s.whatsapp || '-',
      'Email': s.email || '-',
      'Alternate Contact': s.alternateContact || '-',
      'City': s.city || '-',
      'State': s.state || '-',
      'Country': s.country || 'India',
      'GST Number': s.gstNumber || '-',
      'Category / Star Rating': s.category || '-',
      'Services Provided': s.servicesProvided || '-',
      'Destinations Covered': s.destinationsCovered || '-',
      'Payment Terms': s.paymentTerms || '-',
      'Credit Limit (INR)': s.creditLimit || 0,
      'Bank Details': s.bankDetails || '-',
      'Status': s.status,
      'Assigned Staff': s.assignedUser?.name || 'Unassigned',
      'Notes': s.notes || '-',
      'Created Date': s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'B2B Suppliers');

    const maxCols = Object.keys(exportRows[0] || {}).map(k => ({ wch: Math.max(k.length, 14) }));
    worksheet['!cols'] = maxCols;

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Ooting_Suppliers_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// Supplier statistics
router.get('/stats', requirePermission('suppliers', 'view'), async (req: AuthRequest, res: Response, next) => {
  try {
    const [total, hotels, cabs, transport, active, suppliers] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.count({ where: { supplierType: 'HOTEL' } }),
      prisma.supplier.count({ where: { supplierType: 'CAB_VENDOR' } }),
      prisma.supplier.count({ where: { supplierType: 'TRANSPORT' } }),
      prisma.supplier.count({ where: { status: 'ACTIVE' } }),
      prisma.supplier.findMany({ select: { creditLimit: true } }),
    ]);

    const totalCreditLimit = suppliers.reduce((sum, s) => sum + Number(s.creditLimit || 0), 0);

    res.json({
      total,
      hotels,
      cabs,
      transport,
      active,
      totalCreditLimit,
    });
  } catch (error) {
    next(error);
  }
});

// Retrieve single supplier
router.get('/:id', requirePermission('suppliers', 'view'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        assignedUser: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!supplier) {
      res.status(404).json({ message: 'Supplier not found.' });
      return;
    }

    res.json(supplier);
  } catch (error) {
    next(error);
  }
});

// Create Supplier
router.post('/', requirePermission('suppliers', 'create'), async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      name,
      supplierType,
      contactPerson,
      phone,
      whatsapp,
      email,
      alternateContact,
      website,
      address,
      city,
      district,
      state,
      country,
      pincode,
      gstNumber,
      panNumber,
      tier,
      serviceCategories,
      categoryDetails,
      category,
      servicesProvided,
      destinationsCovered,
      contractDetails,
      paymentTerms,
      creditLimit,
      commissionDetails,
      bankDetails,
      status,
      assignedToId,
      tags,
      notes,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Supplier / Company Name is required.' });
      return;
    }
    if (!supplierType) {
      res.status(400).json({ message: 'Supplier Type is required.' });
      return;
    }
    if (!phone || !phone.trim()) {
      res.status(400).json({ message: 'Phone Number is required.' });
      return;
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        supplierType: supplierType.trim().toUpperCase(),
        contactPerson: contactPerson ? contactPerson.trim() : null,
        phone: phone.trim(),
        whatsapp: whatsapp ? whatsapp.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        alternateContact: alternateContact ? alternateContact.trim() : null,
        website: website ? website.trim() : null,
        address: address ? address.trim() : null,
        city: city ? city.trim() : null,
        district: district ? district.trim() : null,
        state: state ? state.trim() : null,
        country: country ? country.trim() : 'India',
        pincode: pincode ? pincode.trim() : null,
        gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : null,
        panNumber: panNumber ? panNumber.trim().toUpperCase() : null,
        tier: tier ? String(tier).trim() : 'Silver',
        serviceCategories: serviceCategories ? (typeof serviceCategories === 'string' ? serviceCategories : JSON.stringify(serviceCategories)) : null,
        categoryDetails: categoryDetails ? (typeof categoryDetails === 'string' ? categoryDetails : JSON.stringify(categoryDetails)) : null,
        category: category ? category.trim() : null,
        servicesProvided: servicesProvided ? servicesProvided.trim() : null,
        destinationsCovered: destinationsCovered ? destinationsCovered.trim() : null,
        contractDetails: contractDetails ? contractDetails.trim() : null,
        paymentTerms: paymentTerms ? paymentTerms.trim() : null,
        creditLimit: creditLimit !== undefined && creditLimit !== null ? parseFloat(creditLimit) || 0 : 0,
        commissionDetails: commissionDetails ? commissionDetails.trim() : null,
        bankDetails: bankDetails ? bankDetails.trim() : null,
        status: status ? status.trim().toUpperCase() : 'ACTIVE',
        assignedToId: assignedToId || null,
        tags: tags ? tags.trim() : null,
        notes: notes ? notes.trim() : null,
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      entity: 'SUPPLIER',
      entityId: supplier.id,
      details: `Created supplier ${supplier.name} (${supplier.supplierType})`,
      ipAddress: req.ip,
    });

    res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
});

// Update Supplier
router.put('/:id', requirePermission('suppliers', 'edit'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Supplier not found.' });
      return;
    }

    const {
      name,
      supplierType,
      contactPerson,
      phone,
      whatsapp,
      email,
      alternateContact,
      website,
      address,
      city,
      district,
      state,
      country,
      pincode,
      gstNumber,
      panNumber,
      tier,
      serviceCategories,
      categoryDetails,
      category,
      servicesProvided,
      destinationsCovered,
      contractDetails,
      paymentTerms,
      creditLimit,
      commissionDetails,
      bankDetails,
      status,
      assignedToId,
      tags,
      notes,
    } = req.body;

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        supplierType: supplierType !== undefined ? supplierType.trim().toUpperCase() : existing.supplierType,
        contactPerson: contactPerson !== undefined ? (contactPerson ? contactPerson.trim() : null) : existing.contactPerson,
        phone: phone !== undefined ? phone.trim() : existing.phone,
        whatsapp: whatsapp !== undefined ? (whatsapp ? whatsapp.trim() : null) : existing.whatsapp,
        email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : existing.email,
        alternateContact: alternateContact !== undefined ? (alternateContact ? alternateContact.trim() : null) : existing.alternateContact,
        website: website !== undefined ? (website ? website.trim() : null) : existing.website,
        address: address !== undefined ? (address ? address.trim() : null) : existing.address,
        city: city !== undefined ? (city ? city.trim() : null) : existing.city,
        district: district !== undefined ? (district ? district.trim() : null) : (existing as any).district,
        state: state !== undefined ? (state ? state.trim() : null) : existing.state,
        country: country !== undefined ? (country ? country.trim() : 'India') : existing.country,
        pincode: pincode !== undefined ? (pincode ? pincode.trim() : null) : (existing as any).pincode,
        gstNumber: gstNumber !== undefined ? (gstNumber ? gstNumber.trim().toUpperCase() : null) : existing.gstNumber,
        panNumber: panNumber !== undefined ? (panNumber ? panNumber.trim().toUpperCase() : null) : (existing as any).panNumber,
        tier: tier !== undefined ? (tier ? String(tier).trim() : 'Silver') : (existing as any).tier,
        serviceCategories: serviceCategories !== undefined ? (typeof serviceCategories === 'string' ? serviceCategories : JSON.stringify(serviceCategories)) : (existing as any).serviceCategories,
        categoryDetails: categoryDetails !== undefined ? (typeof categoryDetails === 'string' ? categoryDetails : JSON.stringify(categoryDetails)) : (existing as any).categoryDetails,
        category: category !== undefined ? (category ? category.trim() : null) : existing.category,
        servicesProvided: servicesProvided !== undefined ? (servicesProvided ? servicesProvided.trim() : null) : existing.servicesProvided,
        destinationsCovered: destinationsCovered !== undefined ? (destinationsCovered ? destinationsCovered.trim() : null) : existing.destinationsCovered,
        contractDetails: contractDetails !== undefined ? (contractDetails ? contractDetails.trim() : null) : existing.contractDetails,
        paymentTerms: paymentTerms !== undefined ? (paymentTerms ? paymentTerms.trim() : null) : existing.paymentTerms,
        creditLimit: creditLimit !== undefined ? (creditLimit !== null ? parseFloat(creditLimit) || 0 : 0) : existing.creditLimit,
        commissionDetails: commissionDetails !== undefined ? (commissionDetails ? commissionDetails.trim() : null) : existing.commissionDetails,
        bankDetails: bankDetails !== undefined ? (bankDetails ? bankDetails.trim() : null) : existing.bankDetails,
        status: status !== undefined ? status.trim().toUpperCase() : existing.status,
        assignedToId: assignedToId !== undefined ? assignedToId || null : existing.assignedToId,
        tags: tags !== undefined ? (tags ? tags.trim() : null) : existing.tags,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'UPDATE',
      entity: 'SUPPLIER',
      entityId: updated.id,
      details: `Updated supplier ${updated.name}`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Bulk Import Suppliers from Excel / JSON
router.post('/import', requirePermission('suppliers', 'create'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { items, duplicateAction = 'skip' } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'No supplier records provided for import.' });
      return;
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const name = String(item.name || item['Supplier / Company Name'] || item.companyName || '').trim();
      const rawPhone = String(item.phone || item['Phone'] || item.contact || '').trim();
      const rawSupplierType = String(item.supplierType || item['Supplier Type'] || item.category || 'OTHER').trim().toUpperCase();

      if (!name || !rawPhone) {
        skipped++;
        errors.push(`Row ${i + 1}: Supplier company name and phone are required.`);
        continue;
      }

      const phone = rawPhone.replace(/[^\d+]/g, '');
      const validTypes = ['HOTEL', 'CAB', 'BUS', 'GUIDE', 'ADVENTURE', 'ENTRY_TICKET', 'FOOD', 'CLUB', 'OTHER'];
      const supplierType = validTypes.includes(rawSupplierType) ? rawSupplierType : 'OTHER';
      const email = item.email || item['Email'] ? String(item.email || item['Email']).trim().toLowerCase() : null;

      const existing = await prisma.supplier.findFirst({
        where: {
          OR: [
            { phone },
            { name: { equals: name } },
            ...(email ? [{ email: { equals: email } }] : []),
          ],
        },
      });

      if (existing) {
        if (duplicateAction === 'update') {
          await prisma.supplier.update({
            where: { id: existing.id },
            data: {
              contactPerson: item.contactPerson || item['Contact Person'] ? String(item.contactPerson || item['Contact Person']).trim() : existing.contactPerson,
              email: email || existing.email,
              city: item.city || item['City'] ? String(item.city || item['City']).trim() : existing.city,
              state: item.state || item['State'] ? String(item.state || item['State']).trim() : existing.state,
              district: item.district || item['District'] ? String(item.district || item['District']).trim() : existing.district,
              tier: item.tier || item['Tier'] ? String(item.tier || item['Tier']).trim() : existing.tier,
              status: item.status || item['Status'] ? String(item.status || item['Status']).trim().toUpperCase() : existing.status,
              notes: item.notes || item['Notes'] ? String(item.notes || item['Notes']).trim() : existing.notes,
            },
          });
          imported++;
          continue;
        } else if (duplicateAction !== 'new') {
          skipped++;
          errors.push(`Row ${i + 1}: Supplier "${name}" or phone ${phone} already exists.`);
          continue;
        }
      }

      await prisma.supplier.create({
        data: {
          name: duplicateAction === 'new' && existing ? `${name} (Copy)` : name,
          supplierType,
          contactPerson: item.contactPerson || item['Contact Person'] ? String(item.contactPerson || item['Contact Person']).trim() : null,
          phone,
          email,
          city: item.city || item['City'] ? String(item.city || item['City']).trim() : null,
          state: item.state || item['State'] ? String(item.state || item['State']).trim() : null,
          district: item.district || item['District'] ? String(item.district || item['District']).trim() : null,
          pincode: item.pincode || item['Pincode'] ? String(item.pincode || item['Pincode']).trim() : null,
          panNumber: item.panNumber || item['PAN Number'] ? String(item.panNumber || item['PAN Number']).trim() : null,
          tier: item.tier || item['Tier'] ? String(item.tier || item['Tier']).trim() : 'Silver',
          status: item.status && ['ACTIVE', 'INACTIVE', 'BLACKLISTED'].includes(String(item.status).toUpperCase()) ? String(item.status).toUpperCase() : 'ACTIVE',
          notes: item.notes || item['Notes'] ? String(item.notes || item['Notes']).trim() : null,
          assignedToId: req.user?.id || null,
        },
      });

      imported++;
    }

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'IMPORT',
      entity: 'SUPPLIER',
      details: `Imported ${imported} suppliers, skipped ${skipped} (Duplicate Action: ${duplicateAction})`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Successfully processed suppliers. Imported/Updated: ${imported}, Skipped: ${skipped}`,
      imported,
      skipped,
      errors,
    });
  } catch (error) {
    next(error);
  }
});

// Delete Supplier
router.delete('/:id', requirePermission('suppliers', 'delete'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Supplier not found.' });
      return;
    }

    await prisma.supplier.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'DELETE',
      entity: 'SUPPLIER',
      entityId: id,
      details: `Deleted supplier ${existing.name}`,
      ipAddress: req.ip,
    });

    res.json({ message: `Supplier "${existing.name}" deleted successfully.` });
  } catch (error) {
    next(error);
  }
});

export default router;

