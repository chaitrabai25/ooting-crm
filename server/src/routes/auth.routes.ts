import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { config } from '../config/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

import { sendOtpNotification } from '../services/otp.service.js';

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(3, 'Email address or phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const verifyOtpSchema = z.object({
  identifier: z.string().min(3, 'Email address or phone number is required'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

const resendOtpSchema = z.object({
  identifier: z.string().min(3, 'Email address or phone number is required'),
});

// Helper to find user by email or phone
async function findUserByIdentifier(identifier: string) {
  const clean = identifier.trim();
  if (clean.includes('@')) {
    return prisma.user.findUnique({
      where: { email: clean.toLowerCase() },
    });
  }

  const digits = clean.replace(/\D/g, '');
  return prisma.user.findFirst({
    where: {
      OR: [
        { phone: clean },
        { phone: { contains: digits.length >= 10 ? digits.slice(-10) : digits } },
      ],
    },
  });
}

// Step 1: Validate Credentials (Email or Phone) & Issue 2FA OTP
router.post('/login', async (req, res, next) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.email || '';
    const { identifier, password } = loginSchema.parse({
      identifier: rawIdentifier,
      password: req.body.password,
    });

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      res.status(401).json({ message: 'Invalid email/phone or password.' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ message: 'Your account is deactivated. Please contact an administrator.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid email/phone or password.' });
      return;
    }

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        lastOtpRequestedAt: new Date(),
      },
    });

    // Dispatch via real delivery service (SMTP email / Twilio SMS)
    await sendOtpNotification(user, rawOtp);

    // Secure response: Never expose OTP to the frontend
    res.json({
      otpRequired: true,
      email: user.email,
      phone: user.phone ? user.phone.replace(/.(?=.{4})/g, '*') : null,
      message: `A 6-digit verification code has been dispatched to ${user.email}.`,
    });
  } catch (error) {
    next(error);
  }
});

// Step 2: Verify 6-digit OTP and Issue Session
router.post('/verify-otp', async (req, res, next) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.email || '';
    const { identifier, otp } = verifyOtpSchema.parse({
      identifier: rawIdentifier,
      otp: req.body.otp,
    });

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      res.status(400).json({ message: 'User account not found or session invalid.' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ message: 'Account is deactivated.' });
      return;
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      res.status(400).json({ message: 'No active OTP session found. Please sign in with your password first.' });
      return;
    }

    if (new Date() > user.otpExpiresAt) {
      res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
      return;
    }

    if (user.otpAttempts >= 5) {
      res.status(429).json({ message: 'Too many incorrect attempts. Please request a new verification code.' });
      return;
    }

    const isMatch = await bcrypt.compare(otp.trim(), user.otpHash);

    if (!isMatch) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      });
      res.status(400).json({ message: 'Invalid verification code. Please check and try again.' });
      return;
    }

    // Success: Clear OTP credentials (single-use) and complete login
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        lastLoginAt: new Date(),
        status: 'ACTIVE',
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      entity: 'USER',
      entityId: user.id,
      details: `User completed 2FA authentication from IP ${req.ip}`,
      ipAddress: req.ip,
    });

    res.json({
      token,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        status: updatedUser.status,
        lastLoginAt: updatedUser.lastLoginAt,
      },
      company: config.company,
    });
  } catch (error) {
    next(error);
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res, next) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.email || '';
    const { identifier } = resendOtpSchema.parse({ identifier: rawIdentifier });

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      res.status(400).json({ message: 'User not found.' });
      return;
    }

    // 30-second cooldown
    if (user.lastOtpRequestedAt) {
      const elapsed = Date.now() - new Date(user.lastOtpRequestedAt).getTime();
      if (elapsed < 30000) {
        const waitSec = Math.ceil((30000 - elapsed) / 1000);
        res.status(429).json({ message: `Please wait ${waitSec}s before requesting a new code.` });
        return;
      }
    }

    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        lastOtpRequestedAt: new Date(),
      },
    });

    await sendOtpNotification(user, rawOtp);

    res.json({
      message: `A fresh verification code has been dispatched to ${user.email}.`,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    res.json({ user, company: config.company });
  } catch (error) {
    next(error);
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

router.post('/change-password', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      res.status(400).json({ message: 'Current password is incorrect.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE',
      entity: 'USER',
      entityId: user.id,
      details: 'Password changed successfully',
      ipAddress: req.ip,
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
