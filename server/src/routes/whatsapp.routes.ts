import { Router, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import {
  sendWhatsAppMessage,
  getWhatsAppConfigStatus,
  sanitizePhoneNumber,
} from '../services/whatsapp.service.js';

const router = Router();

function interpolateTemplate(template: string, item: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return item[key] !== undefined && item[key] !== null ? String(item[key]) : `{{${key}}}`;
  });
}

// Download Sample Bulk WhatsApp Excel Template (.xlsx only)
router.get('/template/excel', authenticate, async (req: AuthRequest, res: Response) => {
  const sampleRows = [
    {
      'Phone': '9876543210',
      'customerName': 'Ramesh Kumar',
      'package': 'Ooty 3D2N Royal Escape',
      'travelDate': '25/09/2026',
      'bookingNumber': 'OOT-BK-202609-001',
      'quotationAmount': '18500',
      'dueAmount': '5000',
    },
    {
      'Phone': '9123456789',
      'customerName': 'Priya Sharma',
      'package': 'Coorg 2D1N Weekend Getaway',
      'travelDate': '28/09/2026',
      'bookingNumber': 'OOT-BK-202609-002',
      'quotationAmount': '12000',
      'dueAmount': '0',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'WhatsAppRecipients');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=ooting-whatsapp-template.xlsx');
  res.send(buffer);
});

// Fetch active CRM customers formatted as recipients for WhatsApp broadcast
router.get('/crm-recipients', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const customers: any[] = await prisma.customer.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        fullName: true,
        phone: true,
        city: true,
        bookings: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            bookingNumber: true,
            travelStartDate: true,
            totalAmount: true,
            finalAmount: true,
            payments: {
              select: { amount: true, paymentStatus: true },
            },
            package: {
              select: { packageName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const validRecipients = customers
      .filter((c) => c.phone && c.phone.trim().length >= 8)
      .map((c) => {
        const bk = c.bookings && c.bookings.length > 0 ? c.bookings[0] : null;
        let formattedDate = '';
        if (bk?.travelStartDate) {
          try {
            const d = new Date(bk.travelStartDate);
            formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          } catch (_) {}
        }
        const total = bk?.finalAmount || bk?.totalAmount || 0;
        const paid = Array.isArray(bk?.payments)
          ? bk.payments.filter((p: any) => p.paymentStatus === 'SUCCESS').reduce((s: number, p: any) => s + (p.amount || 0), 0)
          : 0;
        const due = Math.max(0, total - paid);

        return {
          Phone: c.phone,
          customerName: c.fullName || 'Valued Guest',
          package: bk?.package?.packageName || 'Tour Package',
          travelDate: formattedDate,
          bookingNumber: bk?.bookingNumber || '',
          quotationAmount: total ? String(total) : '',
          dueAmount: due ? String(due) : '0',
          customerId: c.id,
        };
      });

    res.json({ recipients: validRecipients, count: validRecipients.length });
  } catch (error) {
    next(error);
  }
});

// Preview interpolated messages before bulk send
router.post('/preview', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { template, recipients, mediaType = 'NONE', mediaUrl = '', mediaFilename = '' } = req.body;
    if (!template || !Array.isArray(recipients)) {
      res.status(400).json({ message: 'Template string and recipients array are required.' });
      return;
    }

    const previews = recipients.map((r, idx) => {
      const { formatted, isValid } = sanitizePhoneNumber(String(r.phone || r.Phone || ''));
      const interpolated = interpolateTemplate(template, r);
      return {
        index: idx + 1,
        phone: formatted,
        isValidPhone: isValid,
        originalPhone: r.phone || r.Phone,
        customerName: r.customerName || r.name || 'Customer',
        message: interpolated,
        mediaType,
        mediaUrl,
        mediaFilename,
      };
    });

    res.json({ previews, count: previews.length, mediaType, mediaUrl, mediaFilename });
  } catch (error) {
    next(error);
  }
});

// Send Bulk WhatsApp Messages
router.post('/bulk-send', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { template, recipients, mediaType = 'NONE', mediaUrl, mediaFilename } = req.body;
    if (!template || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ message: 'Valid template and recipients list are required.' });
      return;
    }

    const results: Array<{
      phone: string;
      customerName?: string;
      success: boolean;
      status: string;
      provider?: string;
      webUrl?: string;
      error?: string;
    }> = [];

    let sent = 0;
    let failed = 0;
    let webDirectCount = 0;

    for (const r of recipients) {
      const phone = String(r.phone || r.Phone || '').trim();
      const customerName = r.customerName || r.name || 'Customer';
      const message = interpolateTemplate(template, r);

      const { isValid } = sanitizePhoneNumber(phone);
      if (!isValid) {
        failed++;
        results.push({
          phone,
          customerName,
          success: false,
          status: 'FAILED',
          error: 'Invalid phone number format',
        });
        continue;
      }

      try {
        const sendRes = await sendWhatsAppMessage({
          phone,
          message,
          customerId: r.customerId || r.id,
          userId: req.user!.id,
          mediaType: mediaType as any,
          mediaUrl: mediaUrl || r.mediaUrl,
          mediaFilename: mediaFilename || r.mediaFilename,
        });

        if (sendRes.status === 'SENT') {
          sent++;
        } else {
          webDirectCount++;
        }

        results.push({
          phone,
          customerName,
          success: true,
          status: sendRes.status,
          provider: sendRes.provider,
          webUrl: sendRes.directWebUrl,
        });
      } catch (err: any) {
        failed++;
        results.push({
          phone,
          customerName,
          success: false,
          status: 'FAILED',
          error: err?.message || 'Dispatch failed',
        });
      }

      // Delay between calls to avoid spam blocks and rate limits
      const sleepTime = Math.max(300, parseInt(String(req.body.delayMs || 1500), 10));
      await new Promise(resolve => setTimeout(resolve, sleepTime));
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'CUSTOMER',
      details: `Bulk WhatsApp dispatched to ${recipients.length} recipients (Sent: ${sent}, Web/Direct: ${webDirectCount}, Failed: ${failed})`,
      ipAddress: req.ip,
    });

    res.json({
      total: recipients.length,
      sent,
      webDirectCount,
      failed,
      results,
    });
  } catch (error) {
    next(error);
  }
});

const sendSchema = z.object({
  phone: z.string().min(8, 'Phone number is required'),
  message: z.string().min(1, 'Message text is required'),
  customerId: z.string().optional().nullable(),
  templateName: z.string().optional().nullable(),
});

// Check integration configuration status
router.get('/config-status', authenticate, async (req: AuthRequest, res: Response) => {
  const status = await getWhatsAppConfigStatus();
  res.json(status);
});

router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  const status = await getWhatsAppConfigStatus();
  res.json(status);
});

// Save WhatsApp Meta Cloud API or Business number settings
router.post('/config', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { token, phoneNumberId, businessNumber } = req.body;
    if (token !== undefined) {
      await prisma.companySetting.upsert({
        where: { key: 'whatsapp_cloud_api_token' },
        update: { value: String(token).trim() },
        create: { key: 'whatsapp_cloud_api_token', value: String(token).trim() },
      });
    }
    if (phoneNumberId !== undefined) {
      await prisma.companySetting.upsert({
        where: { key: 'whatsapp_phone_number_id' },
        update: { value: String(phoneNumberId).trim() },
        create: { key: 'whatsapp_phone_number_id', value: String(phoneNumberId).trim() },
      });
    }
    if (businessNumber !== undefined) {
      await prisma.companySetting.upsert({
        where: { key: 'whatsapp_business_number' },
        update: { value: String(businessNumber).trim() },
        create: { key: 'whatsapp_business_number', value: String(businessNumber).trim() },
      });
    }

    const updatedStatus = await getWhatsAppConfigStatus();
    res.json({ message: 'WhatsApp configuration updated successfully.', status: updatedStatus });
  } catch (error) {
    next(error);
  }
});

// Send WhatsApp message to customer
router.post('/send', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = sendSchema.parse(req.body);

    const result = await sendWhatsAppMessage({
      phone: data.phone,
      message: data.message,
      customerId: data.customerId,
      templateName: data.templateName,
      userId: req.user!.id,
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE',
      entity: 'CUSTOMER',
      entityId: data.customerId || undefined,
      details: `Dispatched WhatsApp message (${result.provider}) to ${data.phone}`,
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get message history for a phone number
router.get('/history/:phone', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { formatted, digitsOnly } = sanitizePhoneNumber(req.params.phone as string);

    const messages = await prisma.whatsAppMessage.findMany({
      where: {
        OR: [
          { phone: formatted },
          { phone: { contains: digitsOnly.slice(-10) } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ data: messages });
  } catch (error) {
    next(error);
  }
});

// Official Meta Cloud API Webhook Verification (Handshake)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'ooting_crm_whatsapp_verify_token_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('✅ WhatsApp Webhook verified successfully.');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Official Meta Cloud API Status Webhook Receiver
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const status = change?.statuses?.[0];

      if (status && status.id) {
        const messageStatus = status.status.toUpperCase(); // DELIVERED, READ, FAILED, SENT
        await prisma.whatsAppMessage.updateMany({
          where: { externalId: status.id },
          data: {
            status: messageStatus === 'READ' ? 'DELIVERED' : messageStatus,
          },
        });
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('WhatsApp Webhook error:', error);
    res.sendStatus(200); // Always acknowledge webhooks with 200
  }
});

export default router;
