export const OTP_EXPIRY_MINUTES = 15;
export const MAX_OTP_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@pec\.edu\.in$/; // stricter than endsWith: blocks "@pec.edu.in" with no name part

export const DISCORD_ERROR_HINTS = {
  50013: "I don't have permission to manage roles — check my role's position and permissions.",
  50001: "I'm missing access to perform that action in this server.",
};

export const COLORS = {
  ERROR: 0xed4245,
  SUCCESS: 0x57f287,
  INFO: 0x5865f2,
  WARNING: 0xfee75c,
} as const;
