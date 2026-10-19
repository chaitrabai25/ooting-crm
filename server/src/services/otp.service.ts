import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Creates Nodemailer Transporter for Hostinger SMTP
 * Supports both Port 465 (SSL/TLS) and Port 587 (STARTTLS).
 */
export function getMailTransporter(customPort?: number, customSecure?: boolean) {
  const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const defaultPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpPort = customPort !== undefined ? customPort : defaultPort;
  const smtpUser = process.env.SMTP_USER || 'noreply@ooting.in';
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const isSecure = customSecure !== undefined
    ? customSecure
    : (process.env.SMTP_SECURE === 'false' ? false : (smtpPort === 465 || process.env.SMTP_SECURE === 'true'));

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: isSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: true, // Strict SSL/TLS certificate verification
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

/**
 * Validates SMTP configuration with Hostinger server without exposing passwords.
 */
export async function verifySmtpConfiguration(): Promise<{ verified: boolean; message: string; port?: number }> {
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const smtpUser = process.env.SMTP_USER || 'noreply@ooting.in';
  const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';

  if (!smtpPass) {
    return {
      verified: false,
      message: 'SMTP_PASS environment variable is missing or blank in deployment settings.',
    };
  }

  // Attempt Port 465
  try {
    const transporter465 = getMailTransporter(465, true);
    await transporter465.verify();
    return {
      verified: true,
      port: 465,
      message: `Hostinger SMTP (${smtpHost}:465 SSL/TLS) connected and verified successfully for ${smtpUser}.`,
    };
  } catch (err465: any) {
    // If auth failed (535), credentials are wrong
    if (err465?.responseCode === 535 || err465?.message?.includes('535') || err465?.message?.includes('authentication failed')) {
      return {
        verified: false,
        port: 465,
        message: `Hostinger Authentication Failed (535): Incorrect password for ${smtpUser}. Please verify SMTP_PASS.`,
      };
    }

    // Try Port 587 STARTTLS
    try {
      const transporter587 = getMailTransporter(587, false);
      await transporter587.verify();
      return {
        verified: true,
        port: 587,
        message: `Hostinger SMTP (${smtpHost}:587 STARTTLS) connected and verified successfully for ${smtpUser}.`,
      };
    } catch (err587: any) {
      return {
        verified: false,
        message: `Hostinger SMTP connection error: Port 465 (${err465?.message || 'failed'}) / Port 587 (${err587?.message || 'failed'})`,
      };
    }
  }
}

function getLogoInfo(): { hasAttachment: boolean; attachment: any[]; logoSrc: string } {
  try {
    const possiblePaths = [
      path.resolve(process.cwd(), 'client/public/assets/ooting-logo.png'),
      path.resolve(process.cwd(), '../client/public/assets/ooting-logo.png'),
      path.resolve(__dirname, '../../../../client/public/assets/ooting-logo.png'),
      path.resolve(__dirname, '../../../client/public/assets/ooting-logo.png'),
      path.resolve(__dirname, '../../client/public/assets/ooting-logo.png'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return {
          hasAttachment: true,
          attachment: [{
            filename: 'ooting-logo.png',
            path: p,
            cid: 'ootingLogo@crm.ooting.in',
          }],
          logoSrc: 'cid:ootingLogo@crm.ooting.in',
        };
      }
    }
  } catch (err) {
    console.warn('Could not resolve local logo attachment:', err);
  }
  return {
    hasAttachment: false,
    attachment: [],
    logoSrc: 'https://ooting-crm.vercel.app/assets/ooting-logo.png',
  };
}

function getLoginOtpHtml(brandName: string, brandTagline: string, brandColor: string, recipientName: string, rawOtp: string, logoSrc: string): string {
  return `
    <div style="background-color: #f8fafc; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
        <!-- Header Banner -->
        <div style="background-color: #ffffff; padding: 32px 24px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
          <img src="${logoSrc}" alt="${brandName}" style="height: 44px; width: auto; max-width: 190px; object-fit: contain; margin: 0 auto 12px; display: block;" />
          <h1 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em;">${brandName}</h1>
          ${brandTagline ? `<p style="color: #64748b; font-size: 11px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">${brandTagline}</p>` : ''}
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 28px;">
          <h2 style="color: #0f172a; font-size: 16px; font-weight: 700; margin: 0 0 12px;">Hello ${recipientName || 'Team Member'},</h2>
          <p style="color: #334155; font-size: 13.5px; line-height: 1.6; margin: 0 0 24px;">
            Use the following one-time verification code to securely access the <strong>${brandName}</strong> portal. This helps ensure that only authorized personnel can sign in:
          </p>

          <!-- Prominent OTP Box -->
          <div style="background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%); border: 2px dashed ${brandColor}; border-radius: 16px; padding: 24px 16px; text-align: center; margin-bottom: 24px;">
            <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #991b1b; margin-bottom: 8px;">Your One-Time Password</span>
            <div style="display: inline-block; padding: 10px 24px; background: #ffffff; border-radius: 12px; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: ${brandColor}; font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace; box-shadow: 0 2px 8px rgba(201, 31, 40, 0.12);">
              ${rawOtp}
            </div>
            <p style="color: #475569; font-size: 12px; font-weight: 600; margin: 12px 0 0;">
              ⏱️ Valid for <strong>5 minutes</strong> (300 seconds)
            </p>
          </div>

          <!-- Security Warning Notice -->
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
            <p style="color: #92400e; font-size: 12px; margin: 0; line-height: 1.5;">
              🔒 <strong>Security Warning:</strong> Never share this verification code with anyone. Ooting support, staff, or system administrators will never ask for your code.
            </p>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
            If you did not request this verification code, please ignore this email or notify your system administrator immediately to ensure your account security.
          </p>
        </div>

        <!-- Automated No-Reply Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
          <p style="color: #64748b; font-size: 11px; font-weight: 600; margin: 0 0 4px;">
            Automated Security Notification • Please do not reply to this email
          </p>
          <p style="color: #94a3b8; font-size: 10.5px; line-height: 1.5; margin: 0;">
            Sent via encrypted TLS gateway from Ooting Travel Technologies CRM.<br />
            © ${new Date().getFullYear()} Ooting Technologies Private Limited. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}

function getPasswordResetOtpHtml(brandName: string, brandTagline: string, brandColor: string, recipientName: string, rawOtp: string, logoSrc: string): string {
  return `
    <div style="background-color: #f8fafc; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
        <!-- Header Banner -->
        <div style="background-color: #ffffff; padding: 32px 24px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
          <img src="${logoSrc}" alt="${brandName}" style="height: 44px; width: auto; max-width: 190px; object-fit: contain; margin: 0 auto 12px; display: block;" />
          <h1 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em;">${brandName}</h1>
          ${brandTagline ? `<p style="color: #64748b; font-size: 11px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">${brandTagline}</p>` : ''}
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 28px;">
          <h2 style="color: #0f172a; font-size: 16px; font-weight: 700; margin: 0 0 12px;">Hello ${recipientName || 'Team Member'},</h2>
          <p style="color: #334155; font-size: 13.5px; line-height: 1.6; margin: 0 0 24px;">
            We received a request to reset your password for <strong>${brandName}</strong>. Use the secure recovery code below to proceed with setting a new password:
          </p>

          <!-- Prominent OTP Box -->
          <div style="background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%); border: 2px dashed ${brandColor}; border-radius: 16px; padding: 24px 16px; text-align: center; margin-bottom: 24px;">
            <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #991b1b; margin-bottom: 8px;">Password Reset Code</span>
            <div style="display: inline-block; padding: 10px 24px; background: #ffffff; border-radius: 12px; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: ${brandColor}; font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace; box-shadow: 0 2px 8px rgba(201, 31, 40, 0.12);">
              ${rawOtp}
            </div>
            <p style="color: #475569; font-size: 12px; font-weight: 600; margin: 12px 0 0;">
              ⏱️ Valid for <strong>5 minutes</strong> (300 seconds)
            </p>
          </div>

          <!-- Confidentiality Notice -->
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
            <p style="color: #991b1b; font-size: 12px; margin: 0; line-height: 1.5;">
              🔒 <strong>Confidentiality Notice:</strong> Do not share this code with anyone. If you did not request a password reset, your existing password remains safe and unchanged.
            </p>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
            For security, this password reset challenge will expire automatically after 5 minutes.
          </p>
        </div>

        <!-- Automated No-Reply Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
          <p style="color: #64748b; font-size: 11px; font-weight: 600; margin: 0 0 4px;">
            Automated Security Notification • Please do not reply to this email
          </p>
          <p style="color: #94a3b8; font-size: 10.5px; line-height: 1.5; margin: 0;">
            Sent via encrypted TLS gateway from Ooting Travel Technologies CRM.<br />
            © ${new Date().getFullYear()} Ooting Technologies Private Limited. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Dispatches a 6-digit OTP code through Hostinger SMTP with automatic port 465 -> 587 fallback.
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
  const smtpUser = process.env.SMTP_USER || 'noreply@ooting.in';

  const smtpPass = (process.env.SMTP_PASS || '').trim();
  if (!smtpPass) {
    const msg = 'SMTP_PASS environment variable is not configured or is empty. Please check Vercel settings.';
    console.warn(`[OTP Service] ${msg}`);
    return {
      success: false,
      channel: 'EMAIL',
      error: msg,
    };
  }

  const logoInfo = getLogoInfo();

  const subject = purpose === 'PASSWORD_RESET'
    ? `${brandName} — Password Reset Code`
    : `${brandName} — Login Verification Code`;

  const html = purpose === 'PASSWORD_RESET'
    ? getPasswordResetOtpHtml(brandName, brandTagline, brandColor, user.name, rawOtp, logoInfo.logoSrc)
    : getLoginOtpHtml(brandName, brandTagline, brandColor, user.name, rawOtp, logoInfo.logoSrc);

  // Attempt 1: Port 465 SSL/TLS
  try {
    const transporter465 = getMailTransporter(465, true);
    await transporter465.sendMail({
      from: emailSender,
      to: user.email,
      subject,
      html,
      attachments: logoInfo.attachment,
    });

    const maskedEmail = user.email.replace(/(?<=.{2}).(?=.*@)/g, '*');
    console.log(`✉️ [OTP Service] ${purpose} code sent to ${maskedEmail} via Hostinger SMTP (Port 465)`);
    return { success: true, channel: 'EMAIL' };
  } catch (err465: any) {
    console.warn(`[OTP Service] Port 465 attempt failed: ${err465?.message}. Trying Port 587 STARTTLS...`);

    // If password failed (535), return exact helpful message
    if (err465?.responseCode === 535 || err465?.message?.includes('535') || err465?.message?.includes('authentication failed')) {
      return {
        success: false,
        channel: 'EMAIL',
        error: `Hostinger authentication failed (535): Incorrect password for ${smtpUser}. Please verify SMTP_PASS in Vercel settings.`,
      };
    }

    // Attempt 2: Port 587 STARTTLS fallback
    try {
      const transporter587 = getMailTransporter(587, false);
      await transporter587.sendMail({
        from: emailSender,
        to: user.email,
        subject,
        html,
        attachments: logoInfo.attachment,
      });

      const maskedEmail = user.email.replace(/(?<=.{2}).(?=.*@)/g, '*');
      console.log(`✉️ [OTP Service] ${purpose} code sent to ${maskedEmail} via Hostinger SMTP (Port 587 fallback)`);
      return { success: true, channel: 'EMAIL' };
    } catch (err587: any) {
      const maskedEmail = user.email.replace(/(?<=.{2}).(?=.*@)/g, '*');
      console.error(`⚠️ [OTP Service] Both Port 465 & 587 failed for ${maskedEmail}:`, err587?.message || err587);
      return {
        success: false,
        channel: 'EMAIL',
        error: `Hostinger delivery failed: ${err587?.message || err465?.message || 'Connection error'}`,
      };
    }
  }
}
