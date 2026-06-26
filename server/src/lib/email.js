import nodemailer from 'nodemailer';

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in environment.');
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendPasswordResetOtp(to, otp) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Wavelength" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Your Wavelength password reset code',
    text: `Your reset code is: ${otp}\n\nThis code expires in 15 minutes.\nIf you didn't request this, ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:32px">
        <h2 style="color:#1a1a2e;margin-bottom:8px">Reset your password</h2>
        <p style="color:#555;margin-bottom:24px">Enter this code in the Wavelength app:</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center;
                    font-size:36px;letter-spacing:12px;font-weight:700;color:#1a1a2e">
          ${otp}
        </div>
        <p style="color:#888;font-size:13px;margin-top:20px">Expires in 15 minutes.</p>
      </div>`,
  });
}