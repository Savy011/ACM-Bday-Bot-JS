import { Schema, model } from "mongoose";

const verifySchema = new Schema({
  userId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  email: { type: String, default: null },

  // CHANGED: raw `otp` -> `otpHash`. We never store the real code, only its hash.
  otpHash: { type: String, default: null },

  // NEW: lets us lock the account out after too many wrong guesses
  otpAttempts: { type: Number, default: 0 },

  // NEW: powers the 60s "please wait before resending" cooldown
  lastEmailSentAt: { type: Date, default: null },

  // NEW: the *real* 15-minute OTP expiry, measured from when the code was sent
  // (createdAt below is just an outer safety net, not the OTP's actual clock)
  otpExpiresAt: { type: Date, default: null },

  step: { type: String, enum: ["AWAITING_EMAIL", "AWAITING_OTP"], default: "AWAITING_EMAIL" },

  // CHANGED: 15m -> 30m. This is now just a backstop so a slow email-typer
  // isn't cut off mid-flow; the real OTP expiry is otpExpiresAt above.
  createdAt: { type: Date, expires: "30m", default: Date.now },
});

export const Verify = model("Verify", verifySchema);
