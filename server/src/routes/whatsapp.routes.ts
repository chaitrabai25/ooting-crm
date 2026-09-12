import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import {
  sendWhatsAppMessage,
  getWhatsAppConfigStatus,
  sanitizePhoneNumber,
} from '../services/whatsapp.service.js';

const router = Router();

const sendSchema = z.object({
  phone: z.string().min(8, 'Phone number is required'),
  message: z.string().min(1, 'Message text is required'),
  customerId: z.string().optional().nullable(),
  templateName: z.string().optional().nullable(),
});

// Check integration configuration status
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  const status = getWhatsAppConfigStatus();
  res.json(status);
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
