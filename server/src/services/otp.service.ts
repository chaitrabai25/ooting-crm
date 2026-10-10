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

  const subject = purpose === 'PASSWORD_RESET'
    ? `${brandName} — Password Reset Code`
    : `${brandName} — Login Verification Code`;

  const html = purpose === 'PASSWORD_RESET'
    ? getPasswordResetOtpHtml(brandName, brandTagline, brandColor, user.name, rawOtp)
    : getLoginOtpHtml(brandName, brandTagline, brandColor, user.name, rawOtp);

  // Attempt 1: Port 465 SSL/TLS
  try {
    const transporter465 = getMailTransporter(465, true);
    await transporter465.sendMail({
      from: emailSender,
      to: user.email,
      subject,
      html,
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
