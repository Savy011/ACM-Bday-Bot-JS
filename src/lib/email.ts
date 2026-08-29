import { createTransport } from "nodemailer";

import { env } from "$env";
import { OTP_EXPIRY_MINUTES } from "$lib/constants";

export const transporter = createTransport({
  service: "gmail",
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  await transporter.sendMail({
    from: `"Server Verification" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Discord College Verification Code",
    text: `Your 6-digit verification code is: ${otp}\n\nThis code will expire in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
                <h2 style="color:#5865F2;">Server Verification</h2>
                <p>Your 6-digit verification code is:</p>
                <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
                <p>This code expires in <b>${OTP_EXPIRY_MINUTES} minutes</b>.</p>
                <p style="color:#888; font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `,
  });
}
