import nodemailer from 'nodemailer';

export interface EmailRecipient {
  name: string;
  email: string;
  phone?: string | null;
  companyId?: string | null;
}

export interface BrandingInfo {
  name?: string;
  tagline?: string;
  primaryColor?: string;
  isOoting?: boolean;
}

/**
 * Creates Nodemailer Transporter strictly configured for Hostinger SMTP
 * Port 465 uses implicit SSL/TLS with secure certificate verification.
 */
export function getMailTransporter() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER || 'noreply@ooting.in';
  const smtpPass = process.env.SMTP_PASS || '';
  const isSecure = process.env.SMTP_SECURE === 'false' ? false : (smtpPort === 465 || process.env.SMTP_SECURE === 'true');

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: isSecure, // Port 465 implicit SSL/TLS
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: true, // Strict SSL/TLS certificate verification
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Validates SMTP configuration with Hostinger server without exposing any credentials.
 */
export async function verifySmtpConfiguration(): Promise<{ verified: boolean; message: string }> {
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpPass || !smtpPass.trim()) {
    return {
      verified: false,
      message: 'SMTP_PASS environment variable is not configured. Email dispatch will fail until set.',
    };
  }

  try {
    const transporter = getMailTransporter();
    await transporter.verify();
    return {
      verified: true,
      message: `Hostinger SMTP connection (${process.env.SMTP_HOST || 'smtp.hostinger.com'}:${process.env.SMTP_PORT || '465'}) verified successfully.`,
    };
  } catch (error: any) {
    return {
      verified: false,
      message: `Hostinger SMTP verification failed: ${error?.message || 'Connection or authentication error'}`,
    };
  }
}

function getLoginOtpHtml(brandName: string, brandTagline: string, brandColor: string, recipientName: string, rawOtp: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: ${brandColor}; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">${brandName.toUpperCase()}</h1>
        ${brandTagline ? `<p style="color: #64748b; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px;">${brandTagline}</p>` : ''}
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="color: #1e293b; font-size: 15px; font-weight: 600; margin: 0 0 8px;">Hello ${recipientName || 'Team Member'},</p>
        <p style="color: #475569; font-size: 13px; line-height: 1.5; margin: 0 0 20px;">Use the following One-Time Password (OTP) to securely complete your sign-in to Ooting CRM:</p>
        <div style="display: inline-block; padding: 14px 32px; background-color: #ffffff; border: 2px solid ${brandColor}; border-radius: 12px; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: ${brandColor}; font-family: 'Courier New', monospace; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          ${rawOtp}
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 18px; margin-bottom: 0;">
          ⏱️ This verification code expires in <strong>5 minutes</strong>.
        </p>
      </div>
      <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
        <p style="color: #9a3412; font-size: 12px; margin: 0; line-height: 1.5;">
          🔒 <strong>Security Warning:</strong> Never share this code with anyone. Ooting staff and administrators will never ask for your verification code.
        </p>
      </div>
      <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; text-align: center; margin: 0;">
        If you did not initiate this login request, please ignore this email or notify your system administrator immediately.
      </p>
    </div>
  `;
}

function getPasswordResetOtpHtml(brandName: string, brandTagline: string, brandColor: string, recipientName: string, rawOtp: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: ${brandColor}; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">${brandName.toUpperCase()}</h1>
        ${brandTagline ? `<p style="color: #64748b; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px;">${brandTagline}</p>` : ''}
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="color: #1e293b; font-size: 15px; font-weight: 600; margin: 0 0 8px;">Hello ${recipientName || 'Team Member'},</p>
        <p style="color: #475569; font-size: 13px; line-height: 1.5; margin: 0 0 20px;">We received a request to reset your password for Ooting CRM. Use this verification code to proceed:</p>
        <div style="display: inline-block; padding: 14px 32px; background-color: #ffffff; border: 2px solid ${brandColor}; border-radius: 12px; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: ${brandColor}; font-family: 'Courier New', monospace; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          ${rawOtp}
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 18px; margin-bottom: 0;">
          ⏱️ This reset code is valid for <strong>5 minutes</strong> only.
        </p>
      </div>
      <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
        <p style="color: #991b1b; font-size: 12px; margin: 0; line-height: 1.5;">
          🔒 <strong>Confidentiality Notice:</strong> Do not share this code with anyone. If you did not request a password reset, please ignore this email. Your existing password remains unchanged.
        </p>
      </div>
      <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; text-align: center; margin: 0;">
        For security, this password reset challenge will expire automatically.
      </p>
    </div>
  `;
}

/**
 * Dispatches a 6-digit OTP code through Hostinger SMTP with strict security and zero credential exposure.
 */
export async function sendOtpNotification(
  user: EmailRecipient,
  rawOtp: string,
  purpose: 'LOGIN' | 'PASSWORD_RESET' = 'LOGIN',
  companyBranding?: BrandingInfo | null
): Promise<{ success: boolean; channel: 'EMAIL'; error?: string }> {
  const isOoting = companyBranding?.isOoting ?? true;
  const brandName = companyBranding?.name || (isOoting ? 'Ooting CRM' : 'CRM Platform');
  const brandTagline = companyBranding?.tagline || (isOoting ? 'Journeys Beyond Ordinary' : '');
  const brandColor = companyBranding?.primaryColor || (isOoting ? '#C91F28' : '#1E3A8A');

  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@ooting.in';
  const fromName = process.env.SMTP_FROM_NAME || 'noreply-ooting';
  const emailSender = `"${fromName}" <${fromEmail}>`;

  const smtpPass = process.env.SMTP_PASS;
  if (!smtpPass || !smtpPass.trim()) {
    console.warn(`[OTP Service] SMTP_PASS is missing or empty. Cannot dispatch email to ${user.email.replace(/(?<=.{2}).(?=.*@)/g, '*')}.`);
    return {
      success: false,
      channel: 'EMAIL',
      error: 'SMTP server credentials not configured in environment.',
    };
  }

  const subject = purpose === 'PASSWORD_RESET'
    ? `${brandName} — Password Reset Code`
    : `${brandName} — Login Verification Code`;

  const html = purpose === 'PASSWORD_RESET'
    ? getPasswordResetOtpHtml(brandName, brandTagline, brandColor, user.name, rawOtp)
    : getLoginOtpHtml(brandName, brandTagline, brandColor, user.name, rawOtp);

  try {
    const transporter = getMailTransporter();
    await transporter.sendMail({
      from: emailSender,
      to: user.email,
      subject,
      html,
    });

    const maskedEmail = user.email.replace(/(?<=.{2}).(?=.*@)/g, '*');
    console.log(`✉️ [OTP Service] ${purpose} verification code sent to ${maskedEmail} via Hostinger SMTP`);
    return { success: true, channel: 'EMAIL' };
  } catch (err: any) {
    const maskedEmail = user.email.replace(/(?<=.{2}).(?=.*@)/g, '*');
    console.error(`⚠️ [OTP Service] Hostinger SMTP dispatch failed for ${maskedEmail}:`, err?.message || err);
    return {
      success: false,
      channel: 'EMAIL',
      error: 'Email delivery failed. Please check Hostinger SMTP settings.',
    };
  }
}
