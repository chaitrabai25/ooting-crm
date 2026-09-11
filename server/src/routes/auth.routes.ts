import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { config } from '../config/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Valid email address is required'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

const resendOtpSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

// Step 1: Validate Credentials & Issue 2FA OTP
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ message: 'Your account is deactivated. Please contact an administrator.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid email or password.' });
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

    console.log(`\n======================================================`);
    console.log(`🔐 [OOTING CRM 2FA OTP] For User: ${user.email}`);
    console.log(`👉 VERIFICATION CODE: ${rawOtp} (Valid for 10 minutes)`);
    console.log(`======================================================\n`);

    res.json({
      otpRequired: true,
      email: user.email,
      message: 'A 6-digit verification code has been generated and sent.',
      devOtp: process.env.NODE_ENV !== 'production' ? rawOtp : undefined,
    });
  } catch (error) {
    next(error);
  }
});

// Step 2: Verify 6-digit OTP and Issue Session
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      res.status(400).json({ message: 'User not found or session invalid.' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ message: 'Account is deactivated.' });
      return;
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      res.status(400).json({ message: 'No active OTP verification session found. Please log in again.' });
      return;
    }

    if (new Date() > user.otpExpiresAt) {
      res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
      return;
    }

    if (user.otpAttempts >= 5) {
      res.status(429).json({ message: 'Too many failed attempts. Please request a new OTP.' });
      return;
    }

    const isMatch = await bcrypt.compare(otp.trim(), user.otpHash);
    if (!isMatch) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      });
      res.status(400).json({ message: 'Invalid OTP code. Please check and try again.' });
      return;
    }

    // Success: Clear OTP credentials and complete login
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        lastLoginAt: new Date(),
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
      details: `User completed 2FA login from IP ${req.ip}`,
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
    const { email } = resendOtpSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      res.status(400).json({ message: 'User not found.' });
      return;
    }

    // Check rate limit: 30-second cooldown
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

    console.log(`\n======================================================`);
    console.log(`🔁 [OOTING CRM 2FA OTP RESENT] For User: ${user.email}`);
    console.log(`👉 NEW VERIFICATION CODE: ${rawOtp} (Valid for 10 minutes)`);
    console.log(`======================================================\n`);

    res.json({
      message: 'New verification code sent.',
      devOtp: process.env.NODE_ENV !== 'production' ? rawOtp : undefined,
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
