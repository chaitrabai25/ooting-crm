import nodemailer from 'nodemailer';

export async function sendOtpNotification(
  user: { name: string; email: string; phone?: string | null },
  rawOtp: string
): Promise<{ success: boolean; channel: 'EMAIL' | 'SMS' | 'QUEUED'; note?: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || `Ooting CRM <${smtpUser || 'security@ooting.com'}>`;

  // 1. Email delivery via SMTP
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: emailFrom,
        to: user.email,
        subject: `Your Ooting CRM Verification Code: ${rawOtp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #C91F28; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">OOTING CRM</h2>
              <p style="color: #64748b; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px;">Journeys Beyond Ordinary</p>
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
              <p style="color: #334155; font-size: 14px; margin: 0 0 12px;">Hello <strong>${user.name}</strong>,</p>
              <p style="color: #64748b; font-size: 13px; margin: 0 0 16px;">Use the following One-Time Password (OTP) to securely complete your administrative login:</p>
              <div style="display: inline-block; padding: 12px 28px; background-color: #ffffff; border: 2px dashed #C91F28; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #C91F28; font-family: monospace;">
                ${rawOtp}
              </div>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 14px; margin-bottom: 0;">This code is strictly confidential and expires in <strong>10 minutes</strong>.</p>
            </div>
            <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; text-align: center; margin: 0;">
              If you did not attempt to sign in to Ooting CRM, please contact your Super Administrator immediately.
            </p>
          </div>
        `,
      });

      console.log(`✉️ [OTP Service] Verification code emailed to: ${user.email}`);
      return { success: true, channel: 'EMAIL' };
    } catch (err: any) {
      console.error('⚠️ [OTP Service] SMTP Email dispatch failed:', err.message);
    }
  }

  // 2. SMS delivery via Twilio (if configured and phone is present)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioToken && twilioPhone && user.phone) {
    try {
      const basicAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', user.phone);
      params.append('From', twilioPhone);
      params.append('Body', `[OOTING CRM] Your security verification code is: ${rawOtp}. Valid for 10 minutes.`);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (res.ok) {
        console.log(`📱 [OTP Service] Verification code sent via SMS to: ${user.phone}`);
        return { success: true, channel: 'SMS' };
      }
    } catch (err: any) {
      console.error('⚠️ [OTP Service] Twilio SMS dispatch failed:', err.message);
    }
  }

  // 3. Queue / Log Notice when transport provider credentials are not yet set
  console.log(`\n======================================================`);
  console.log(`🔐 [OOTING CRM 2FA OTP] Generated for: ${user.email} (${user.phone || 'No phone'})`);
  console.log(`👉 VERIFICATION CODE: ${rawOtp} (Valid for 10 minutes)`);
  console.log(`ℹ️ To receive this code in your mailbox or phone, configure SMTP or Twilio in your .env`);
  console.log(`======================================================\n`);

  return {
    success: true,
    channel: 'QUEUED',
    note: 'Verification code generated. Configure SMTP or Twilio in environment variables to enable external email/SMS transmission.',
  };
}
