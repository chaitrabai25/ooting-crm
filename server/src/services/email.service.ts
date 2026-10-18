import nodemailer from 'nodemailer';

let transporter: any = null;

function getTransporter(): any {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || 'noreply@ooting.in';
  const pass = process.env.SMTP_PASS || 'Noreply@ooting123';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!user || !pass) {
    console.warn('[EmailService] SMTP credentials not fully configured; skipping email dispatch.');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    return transporter;
  } catch (err: any) {
    console.error('[EmailService] Failed to create SMTP transporter:', err?.message);
    return null;
  }
}

export interface StaffWelcomeEmailParams {
  to: string;
  name: string;
  email: string;
  temporaryPassword?: string;
  role: string;
  companyName?: string;
  loginUrl?: string;
}

export async function sendStaffWelcomeEmail(params: StaffWelcomeEmailParams): Promise<boolean> {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[EmailService] Mailer unavailable; skipping welcome email to:', params.to);
    return false;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Ooting CRM';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@ooting.in';
  const company = params.companyName || 'Ooting Holidays';
  const loginLink = params.loginUrl || 'https://crm.ooting.in/login';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Welcome to ${company}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 32px 28px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 28px; font-size: 14px; line-height: 1.6; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        .cred-box { background: #f1f5f9; border-radius: 8px; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; }
        .cred-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .cred-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; }
        .cred-val { font-size: 13px; font-weight: 700; color: #0f172a; word-break: break-all; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>${company}</h1>
          <p>Ooting CRM Staff Workspace Access</p>
        </div>
        <div class="content">
          <p class="greeting">Hello ${params.name},</p>
          <p>Your staff account for <strong>${company}</strong> has been provisioned on the Ooting CRM platform. You can now log in and access your workspace.</p>
          
          <div class="cred-box">
            <div class="cred-row">
              <span class="cred-label">Login Email</span>
              <span class="cred-val">${params.email}</span>
            </div>
            ${
              params.temporaryPassword
                ? `
            <div class="cred-row">
              <span class="cred-label">Password</span>
              <span class="cred-val">${params.temporaryPassword}</span>
            </div>
            `
                : ''
            }
            <div class="cred-row" style="margin-bottom: 0;">
              <span class="cred-label">Assigned Role</span>
              <span class="cred-val">${params.role.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <div class="btn-container">
            <a href="${loginLink}" class="btn" target="_blank">Sign In to Ooting CRM &rarr;</a>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
            🔒 <em>Security Tip: For your account safety, please change your password after logging in for the first time. Do not share your login credentials with anyone.</em>
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${company} &bull; Powered by Ooting Holidays CRM
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await mailer.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.to,
      subject: `Welcome to ${company} - Your CRM Login Credentials`,
      html: htmlContent,
      text: `Hello ${params.name},\n\nYour staff account for ${company} has been created.\n\nLogin Email: ${params.email}\nPassword: ${params.temporaryPassword || '(Provided separately)'}\nRole: ${params.role}\nLogin URL: ${loginLink}\n\nPlease sign in and change your password.\n\nRegards,\n${company}`,
    });

    console.log('[EmailService] Staff welcome email sent successfully:', info.messageId, 'to:', params.to);
    return true;
  } catch (err: any) {
    console.error('[EmailService] Failed to send welcome email:', err?.message);
    return false;
  }
}
