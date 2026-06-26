import { Resend } from 'resend';

export async function sendPasswordResetOtp(to, otp) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Email not configured. Set RESEND_API_KEY in environment.');

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM || 'Wavelength <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from,
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

  if (error) throw new Error(error.message);
}