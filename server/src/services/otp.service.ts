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
    pool: true,
    maxConnections: 3,
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 8000,
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
    <div style="background-color: #f1f5f9; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        <!-- Official Brand Header / DP -->
        <div style="background-color: #ffffff; padding: 32px 24px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
          <img src="${logoSrc}" alt="${brandName}" style="max-height: 52px; width: auto; max-width: 240px; object-fit: contain; margin: 0 auto 10px; display: block;" />
          <div style="display: inline-block; padding: 4px 12px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 20px; color: #991b1b; font-size: 10.5px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
            Ooting CRM • Security Verification
          </div>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 28px;">
          <h2 style="color: #0f172a; font-size: 16px; font-weight: 700; margin: 0 0 10px;">Hello ${recipientName || 'Team Member'},</h2>
          <p style="color: #475569; font-size: 13.5px; line-height: 1.6; margin: 0 0 24px;">
            Here is your one-time verification code to securely access the <strong>Ooting CRM</strong> workspace:
          </p>

          <!-- Non-Overflowing OTP Box (Table Layout Guaranteed to Fit Mobile & Desktop) -->
          <div style="background: linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%); border: 1.5px solid #fecaca; border-radius: 16px; padding: 24px 16px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #991b1b; margin-bottom: 12px;">
              Your One-Time Password
            </div>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: separate;">
              <tr>
                <td align="center" style="background: #ffffff; border: 1.5px solid #f87171; border-radius: 12px; padding: 12px 28px; box-shadow: 0 4px 12px rgba(201, 31, 40, 0.08);">
                  <span style="display: block; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: ${brandColor}; font-family: -apple-system, BlinkMacSystemFont, 'SFMono-Regular', Consolas, 'Segoe UI', Roboto, monospace; line-height: 1.15; text-align: center;">
                    ${rawOtp}
                  </span>
                </td>
              </tr>
            </table>
            <p style="color: #64748b; font-size: 12px; font-weight: 600; margin: 12px 0 0;">
              ⏱️ Valid for <strong>5 minutes</strong> (300 seconds)
            </p>
          </div>

          <!-- Quick Access Link Button -->
          <div style="text-align: center; margin: 24px 0 20px;">
            <a href="https://ooting-crm.vercel.app/login" style="display: inline-block; padding: 12px 28px; background-color: #C91F28; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; border-radius: 10px; box-shadow: 0 3px 10px rgba(201, 31, 40, 0.25);">
              Open Ooting CRM Portal &rarr;
            </a>
          </div>

          <!-- Security Warning Notice -->
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px;">
            <p style="color: #92400e; font-size: 11.5px; margin: 0; line-height: 1.5;">
              🔒 <strong>Security Warning:</strong> Never share this verification code with anyone. Ooting support, staff, or system administrators will never ask for your code.
            </p>
          </div>

          <p style="color: #64748b; font-size: 11.5px; line-height: 1.5; margin: 0;">
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
    <div style="background-color: #f1f5f9; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        <!-- Official Brand Header / DP -->
        <div style="background-color: #ffffff; padding: 32px 24px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
          <img src="${logoSrc}" alt="${brandName}" style="max-height: 52px; width: auto; max-width: 240px; object-fit: contain; margin: 0 auto 10px; display: block;" />
          <div style="display: inline-block; padding: 4px 12px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 20px; color: #991b1b; font-size: 10.5px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
            Ooting CRM • Password Reset
          </div>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 28px;">
          <h2 style="color: #0f172a; font-size: 16px; font-weight: 700; margin: 0 0 10px;">Hello ${recipientName || 'Team Member'},</h2>
          <p style="color: #475569; font-size: 13.5px; line-height: 1.6; margin: 0 0 24px;">
            We received a request to reset your password for <strong>Ooting CRM</strong>. Use the secure recovery code below:
          </p>

          <!-- Non-Overflowing OTP Box -->
          <div style="background: linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%); border: 1.5px solid #fecaca; border-radius: 16px; padding: 24px 16px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #991b1b; margin-bottom: 12px;">
              Password Reset Code
            </div>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: separate;">
              <tr>
                <td align="center" style="background: #ffffff; border: 1.5px solid #f87171; border-radius: 12px; padding: 12px 28px; box-shadow: 0 4px 12px rgba(201, 31, 40, 0.08);">
                  <span style="display: block; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: ${brandColor}; font-family: -apple-system, BlinkMacSystemFont, 'SFMono-Regular', Consolas, 'Segoe UI', Roboto, monospace; line-height: 1.15; text-align: center;">
                    ${rawOtp}
                  </span>
                </td>
              </tr>
            </table>
            <p style="color: #64748b; font-size: 12px; font-weight: 600; margin: 12px 0 0;">
              ⏱️ Valid for <strong>5 minutes</strong> (300 seconds)
            </p>
          </div>

          <!-- Quick Access Link Button -->
          <div style="text-align: center; margin: 24px 0 20px;">
            <a href="https://ooting-crm.vercel.app/login" style="display: inline-block; padding: 12px 28px; background-color: #C91F28; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; border-radius: 10px; box-shadow: 0 3px 10px rgba(201, 31, 40, 0.25);">
              Reset Password in Ooting CRM &rarr;
            </a>
          </div>

          <!-- Confidentiality Notice -->
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px;">
            <p style="color: #991b1b; font-size: 11.5px; margin: 0; line-height: 1.5;">
              🔒 <strong>Confidentiality Notice:</strong> Do not share this code with anyone. If you did not request a password reset, your existing password remains safe and unchanged.
            </p>
          </div>

          <p style="color: #64748b; font-size: 11.5px; line-height: 1.5; margin: 0;">
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
