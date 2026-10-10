import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { config } from '../config/index.js';
import { getCompanySettings } from './setting.routes.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { sendOtpNotification, verifySmtpConfiguration } from '../services/otp.service.js';

const router = Router();

// Validation Schemas
const loginSchema = z.object({
  identifier: z.string().min(3, 'Email address or employee ID is required'),
  password: z.string().min(1, 'Password is required'),
});

const verifyOtpSchema = z.object({
  identifier: z.string().min(3, 'Email address or employee ID is required'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

const resendOtpSchema = z.object({
  identifier: z.string().min(3, 'Email address or employee ID is required'),
  purpose: z.enum(['LOGIN', 'PASSWORD_RESET']).optional().default('LOGIN'),
});

const forgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'Email address or employee ID is required'),
});

const verifyResetOtpSchema = z.object({
  identifier: z.string().min(3, 'Email address or employee ID is required'),
  otp: z.string().length(6, 'Reset code must be exactly 6 digits'),
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(10, 'Reset authorization token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Helper: Locate employee account by email, phone, or exact user/employee ID
async function findUserByIdentifier(identifier: string) {
  const clean = identifier.trim();

  // 1. Direct email lookup
  if (clean.includes('@')) {
    return prisma.user.findUnique({
      where: { email: clean.toLowerCase() },
    });
  }

  // 2. Exact UUID / Employee ID lookup
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    const userById = await prisma.user.findUnique({ where: { id: clean } });
    if (userById) return userById;
  }

  // 3. Phone number lookup (supporting country code or trailing 10 digits)
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

// Helper: Mask email for privacy (e.g. ch***@ooting.in)
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  return `${localPart.slice(0, 2)}${'*'.repeat(Math.max(2, localPart.length - 2))}@${domain}`;
}

// Helper: Get company branding for notifications
async function getBranding(companyId?: string | null) {
  if (!companyId) return null;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return null;
  return {
    name: company.name,
    tagline: company.tagline || undefined,
    primaryColor: company.primaryColor || undefined,
    isOoting: company.isOoting,
  };
}

// -----------------------------------------------------------------------------
// 1. Public Endpoint: Company Branding for Login Page
// -----------------------------------------------------------------------------
router.get('/company-branding', async (req, res, next) => {
  try {
    const slug = req.query.slug as string | undefined;
    const identifier = req.query.identifier as string | undefined;

    let company = null;

    if (slug && slug.trim()) {
      company = await prisma.company.findUnique({
        where: { slug: slug.trim().toLowerCase() },
      });
    } else if (identifier && identifier.trim()) {
      const user = await findUserByIdentifier(identifier.trim());
      if (user?.companyId) {
        company = await prisma.company.findUnique({
          where: { id: user.companyId },
        });
      }
    }

    if (company) {
      res.json({
        name: company.name,
        slug: company.slug,
        tagline: company.tagline || '',
        logoUrl: company.logoUrl || '',
        faviconUrl: company.faviconUrl || '',
        primaryColor: company.primaryColor || '#2563eb',
        secondaryColor: company.secondaryColor || '#1e40af',
        isOoting: company.isOoting,
      });
      return;
    }

    // Default to Ooting master branding
    res.json({
      name: config.company.name,
      slug: 'ooting',
      tagline: config.company.tagline,
      logoUrl: '/assets/ooting-logo.jpg',
      faviconUrl: '/favicon.ico',
      primaryColor: '#C91F28',
      secondaryColor: '#1E3A8A',
      isOoting: true,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 2. Step 1: Secure Login Credential Verification & Email OTP Challenge
// -----------------------------------------------------------------------------
router.post('/login', async (req, res, next) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.email || '';
    const { identifier, password } = loginSchema.parse({
      identifier: rawIdentifier,
      password: req.body.password,
    });

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      res.status(401).json({ message: 'Invalid email/employee ID or password.' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ message: 'Your account is deactivated. Please contact your administrator.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid email/employee ID or password.' });
      return;
    }

    if (!user.email || !user.email.includes('@')) {
      res.status(400).json({ message: 'No registered email address found for this account. Please contact an administrator.' });
      return;
    }

    // Enforce 30-second cooldown between OTP generation requests
    if (user.lastOtpRequestedAt) {
      const elapsed = Date.now() - new Date(user.lastOtpRequestedAt).getTime();
      if (elapsed < 30000) {
        const waitSec = Math.ceil((30000 - elapsed) / 1000);
        res.status(429).json({ message: `Please wait ${waitSec}s before requesting a new code.` });
        return;
      }
    }

    // Generate cryptographically secure random 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(`LOGIN:${rawOtp}`, 10);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // Strict 5-minute expiry

    // Save challenge bound to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        lastOtpRequestedAt: new Date(),
      },
    });

    // Send verification email via Hostinger SMTP
    const branding = await getBranding(user.companyId);
    const delivery = await sendOtpNotification(user, rawOtp, 'LOGIN', branding);

    if (!delivery.success) {
      // Invalidate the unsent challenge to prevent brute force or deadlocks
      await prisma.user.update({
        where: { id: user.id },
        data: { otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
      });

      res.status(503).json({
        message: 'Unable to deliver verification code email via SMTP. Please contact your system administrator.',
      });
      return;
    }

    res.json({
      requireOtp: true,
      identifier: user.email,
      maskedEmail: maskEmail(user.email),
      message: `A 6-digit verification code has been dispatched to ${maskEmail(user.email)}. Valid for 5 minutes.`,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 3. Step 2: Verify Login OTP & Issue Authenticated Session Token
// -----------------------------------------------------------------------------
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
      res.status(400).json({ message: 'No active login challenge found. Please sign in with your credentials first.' });
      return;
    }

    if (new Date() > user.otpExpiresAt) {
      res.status(400).json({ message: 'Verification code has expired. Please sign in again to receive a fresh code.' });
      return;
    }

    if (user.otpAttempts >= 5) {
      res.status(429).json({ message: 'Too many incorrect attempts. Please sign in again to request a new verification code.' });
      return;
    }

    // Verify OTP bound to LOGIN purpose
    const isMatch = await bcrypt.compare(`LOGIN:${otp.trim()}`, user.otpHash);

    if (!isMatch) {
      const updatedAttempts = user.otpAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: updatedAttempts },
      });

      const remaining = Math.max(0, 5 - updatedAttempts);
      res.status(400).json({
        message: remaining > 0
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new verification code.',
      });
      return;
    }

    // Success: Invalidate OTP (single-use) and finalize session
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

    const companyId = updatedUser.companyId || 'c0000000-0000-0000-0000-000000000001';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, companyId },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    await logAudit({
      userId: user.id,
      userName: user.name,
      companyId,
      action: 'LOGIN',
      entity: 'USER',
      entityId: user.id,
      details: `User completed secure email OTP authentication from IP ${req.ip}`,
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
        companyId,
        permissions: updatedUser.permissions,
        lastLoginAt: updatedUser.lastLoginAt,
      },
      company: await getCompanySettings(companyId),
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 4. Resend OTP (for Login or Password Reset)
// -----------------------------------------------------------------------------
router.post('/resend-otp', async (req, res, next) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.email || '';
    const { identifier, purpose } = resendOtpSchema.parse({
      identifier: rawIdentifier,
      purpose: req.body.purpose,
    });

    const user = await findUserByIdentifier(identifier);

    if (!user || user.status !== 'ACTIVE' || !user.email) {
      res.json({
        message: 'A fresh verification code has been dispatched if an active account exists.',
      });
      return;
    }

    // Enforce 30-second cooldown
    if (user.lastOtpRequestedAt) {
      const elapsed = Date.now() - new Date(user.lastOtpRequestedAt).getTime();
      if (elapsed < 30000) {
        const waitSec = Math.ceil((30000 - elapsed) / 1000);
        res.status(429).json({ message: `Please wait ${waitSec}s before requesting a new code.` });
        return;
      }
    }

    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const prefix = purpose === 'PASSWORD_RESET' ? 'RESET:' : 'LOGIN:';
    const otpHash = await bcrypt.hash(`${prefix}${rawOtp}`, 10);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        lastOtpRequestedAt: new Date(),
      },
    });

    const branding = await getBranding(user.companyId);
    const delivery = await sendOtpNotification(user, rawOtp, purpose, branding);

    if (!delivery.success) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
      });

      res.status(503).json({
        message: 'Unable to deliver verification code email via SMTP. Please contact your system administrator.',
      });
      return;
    }

    res.json({
      message: `A fresh verification code has been dispatched to ${maskEmail(user.email)}. Valid for 5 minutes.`,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 5. Forgot Password: Initiate Password Reset Challenge
// -----------------------------------------------------------------------------
router.post('/forgot-password', async (req, res, next) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.email || '';
    const { identifier } = forgotPasswordSchema.parse({ identifier: rawIdentifier });

    const user = await findUserByIdentifier(identifier);

    // Generic response to reduce account enumeration if user does not exist or has no email
    if (!user || user.status !== 'ACTIVE' || !user.email) {
      res.json({
        success: true,
        message: 'If an active account is registered with this identifier, a password reset code has been sent to the associated email address.',
      });
      return;
    }

    // 30-second cooldown
    if (user.lastOtpRequestedAt) {
      const elapsed = Date.now() - new Date(user.lastOtpRequestedAt).getTime();
      if (elapsed < 30000) {
        const waitSec = Math.ceil((30000 - elapsed) / 1000);
        res.status(429).json({ message: `Please wait ${waitSec}s before requesting another reset code.` });
        return;
      }
    }

    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(`RESET:${rawOtp}`, 10);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute expiry

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        lastOtpRequestedAt: new Date(),
      },
    });

    const branding = await getBranding(user.companyId);
    const delivery = await sendOtpNotification(user, rawOtp, 'PASSWORD_RESET', branding);

    if (!delivery.success) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
      });

      res.status(503).json({
        message: 'Unable to deliver password reset email via SMTP. Please contact your administrator.',
      });
      return;
    }

    res.json({
      success: true,
      identifier: user.email,
      maskedEmail: maskEmail(user.email),
      message: `If an active account is registered with this identifier, a password reset code has been sent to ${maskEmail(user.email)}.`,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 6. Forgot Password: Verify Reset OTP & Issue Temporary Reset Token
// -----------------------------------------------------------------------------
router.post('/verify-reset-otp', async (req, res, next) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.email || '';
    const { identifier, otp } = verifyResetOtpSchema.parse({
      identifier: rawIdentifier,
      otp: req.body.otp,
    });

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired password reset session.' });
      return;
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      res.status(400).json({ message: 'No active password reset session found. Please request a new reset code.' });
      return;
    }

    if (new Date() > user.otpExpiresAt) {
      res.status(400).json({ message: 'The reset code has expired. Please request a new code.' });
      return;
    }

    if (user.otpAttempts >= 5) {
      res.status(429).json({ message: 'Too many incorrect attempts. Please request a new reset code.' });
      return;
    }

    // Verify OTP bound strictly to PASSWORD_RESET purpose
    const isMatch = await bcrypt.compare(`RESET:${otp.trim()}`, user.otpHash);

    if (!isMatch) {
      const updatedAttempts = user.otpAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: updatedAttempts },
      });

      const remaining = Math.max(0, 5 - updatedAttempts);
      res.status(400).json({
        message: remaining > 0
          ? `Invalid reset code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new reset code.',
      });
      return;
    }

    // Success: Immediately invalidate the OTP so it cannot be reused
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    // Issue a single-use short-lived reset authorization token (valid for 15 minutes)
    // Binding with a fragment of current passwordHash ensures this token is invalidated immediately once password is changed.
    const resetToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        purpose: 'PASSWORD_RESET',
        pwSig: user.passwordHash.slice(-10),
      },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      resetToken,
      message: 'Reset code verified successfully. Please choose a new password.',
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 7. Forgot Password: Submit New Password & Invalidate Sessions
// -----------------------------------------------------------------------------
router.post('/reset-password', async (req, res, next) => {
  try {
    const { resetToken, newPassword } = resetPasswordSchema.parse(req.body);

    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, config.jwtSecret);
    } catch {
      res.status(400).json({ message: 'Password reset link or authorization token has expired. Please start over.' });
      return;
    }

    if (decoded.purpose !== 'PASSWORD_RESET' || !decoded.userId) {
      res.status(400).json({ message: 'Invalid reset authorization token.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(400).json({ message: 'User account not found.' });
      return;
    }

    // Ensure the token has not already been used by verifying the password signature matches
    if (decoded.pwSig !== user.passwordHash.slice(-10)) {
      res.status(400).json({ message: 'This password reset token has already been used. Please start over if needed.' });
      return;
    }

    // Securely hash the new password using bcrypt
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear any pending OTP state
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      companyId: user.companyId || 'c0000000-0000-0000-0000-000000000001',
      action: 'UPDATE',
      entity: 'USER',
      entityId: user.id,
      details: 'Password was securely reset via email OTP verification',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Your password has been reset successfully. Please sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 8. Authenticated Current User Profile
// -----------------------------------------------------------------------------
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
        companyId: true,
        permissions: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    const companyId = req.user!.companyId || 'c0000000-0000-0000-0000-000000000001';
    const company = await getCompanySettings(companyId);
    res.json({ user, company });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 9. Authenticated Password Change
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 10. Authenticated Logout
// -----------------------------------------------------------------------------
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (req.user) {
      await logAudit({
        userId: req.user.id,
        userName: req.user.name,
        action: 'LOGOUT',
        entity: 'USER',
        entityId: req.user.id,
        details: `User logged out successfully from IP ${req.ip}`,
        ipAddress: req.ip,
      });
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 11. Super Admin SMTP Diagnostics Endpoint (safe - no secrets exposed)
// -----------------------------------------------------------------------------
router.get('/smtp-status', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({ message: 'Access denied: SUPER_ADMIN required.' });
      return;
    }

    const status = await verifySmtpConfiguration();
    res.json({
      configured: Boolean(process.env.SMTP_PASS && process.env.SMTP_PASS.trim()),
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: process.env.SMTP_PORT || '465',
      user: process.env.SMTP_USER || 'noreply@ooting.in',
      secure: process.env.SMTP_SECURE || 'true',
      fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@ooting.in',
      fromName: process.env.SMTP_FROM_NAME || 'noreply-ooting',
      verification: status,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
