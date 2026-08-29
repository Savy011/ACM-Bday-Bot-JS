import type { Client, Message, OmitPartialGroupDMChannel } from "discord.js";
import { ChannelType } from "discord.js";

import { env } from "$env";
import {
  EMAIL_REGEX,
  MAX_OTP_ATTEMPTS,
  OTP_EXPIRY_MINUTES,
  RESEND_COOLDOWN_SECONDS,
} from "$lib/constants";
import { sendOtpEmail } from "$lib/email";
import { buildEmbed } from "$lib/embeds";
import { generateOtp, hashOtp, msRemaining } from "$lib/utils";
import { Verify } from "$models/verify.model";

const messageCreateInDM = (client: Client<boolean>) => {
  return async (message: OmitPartialGroupDMChannel<Message<boolean>>) => {
    if (message.author.bot || message.channel.type !== ChannelType.DM) return;

    const session = await Verify.findOne({ userId: message.author.id });
    if (!session) return; // User isn't in a verification flow

    const userInput = message.content.trim();

    try {
      // NEW: Show "typing..." immediately so it doesn't look like the bot is stuck
      await message.channel.sendTyping().catch(() => {});

      // Cancel / restart works at any step
      if (["cancel", "stop", "restart"].includes(userInput.toLowerCase())) {
        await Verify.findOneAndDelete({ userId: message.author.id });
        return message.reply({
          embeds: [
            buildEmbed({
              title: "🚫 Verification Cancelled",
              description:
                "No worries — rejoin the server or contact an admin whenever you're ready to try again. Also try /verify in any channel in the server",
              color: "WARNING",
            }),
          ],
        });
      }

      // STEP A: Handle Email Entry
      if (session.step === "AWAITING_EMAIL") {
        const email = userInput.toLowerCase();

        // Strict domain + format validation
        if (!EMAIL_REGEX.test(email)) {
          return message.reply({
            embeds: [
              buildEmbed({
                title: "❌ Invalid Email",
                description:
                  "Please enter a valid college email ending with `@pec.edu.in`.\n\n*Example:* `yourname.cs21@pec.edu.in`",
                color: "ERROR",
              }),
            ],
          });
        }

        // Cooldown so a typo-prone user can't spam the mail server
        if (
          session.lastEmailSentAt &&
          msRemaining(session.lastEmailSentAt, RESEND_COOLDOWN_SECONDS) > 0
        ) {
          const wait = Math.ceil(
            msRemaining(session.lastEmailSentAt, RESEND_COOLDOWN_SECONDS) / 1000,
          );
          return message.reply({
            embeds: [
              buildEmbed({
                title: "⏳ Slow Down",
                description: `Please wait **${wait}s** before requesting another code.`,
                color: "WARNING",
              }),
            ],
          });
        }

        const otp = generateOtp();

        // NEW: Refresh the typing indicator right before the slow network call
        await message.channel.sendTyping().catch(() => {});

        try {
          await sendOtpEmail(email, otp);

          // Update DB session to wait for OTP
          session.email = email;
          session.otpHash = hashOtp(otp); // never store the raw OTP
          session.otpAttempts = 0;
          session.step = "AWAITING_OTP";
          session.lastEmailSentAt = new Date();
          session.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
          await session.save();

          return message.reply({
            embeds: [
              buildEmbed({
                title: "📩 Code Sent",
                description: `A 6-digit code was sent to \`${email}\`.\n\n**Reply here with the code** within **${OTP_EXPIRY_MINUTES} minutes**.\n\n**Try checking the spam mail if you are unable to find it**.\n\nType \`resend\` for a new code, or \`cancel\` to stop.`,
                color: "SUCCESS",
              }),
            ],
          });
        } catch (err) {
          console.error("Email send failed:", err);
          return message.reply({
            embeds: [
              buildEmbed({
                title: "⚠️ Couldn't Send Email",
                description:
                  "Something went wrong sending the verification email. Double-check the address and try again in a moment.",
                color: "ERROR",
              }),
            ],
          });
        }
      }

      // STEP B: Handle OTP Entry
      if (session.step === "AWAITING_OTP") {
        // Precise 15-min expiry check (the DB's 30m TTL is just the outer safety net)
        if (session.otpExpiresAt && session.otpExpiresAt < new Date()) {
          await Verify.findOneAndDelete({ userId: message.author.id });
          return message.reply({
            embeds: [
              buildEmbed({
                title: "⌛ Code Expired",
                description:
                  "That code has expired. Please rejoin the server or contact an admin to restart verification.",
                color: "WARNING",
              }),
            ],
          });
        }

        // Let the user request a fresh code without retyping their email
        if (userInput.toLowerCase() === "resend") {
          if (
            session.lastEmailSentAt &&
            msRemaining(session.lastEmailSentAt, RESEND_COOLDOWN_SECONDS) > 0
          ) {
            const wait = Math.ceil(
              msRemaining(session.lastEmailSentAt, RESEND_COOLDOWN_SECONDS) / 1000,
            );
            return message.reply({
              embeds: [
                buildEmbed({
                  title: "⏳ Slow Down",
                  description: `Please wait **${wait}s** before requesting another code.`,
                  color: "WARNING",
                }),
              ],
            });
          }

          const otp = generateOtp();
          // NEW: Refresh the typing indicator right before the slow network call
          await message.channel.sendTyping().catch(() => {});

          try {
            await sendOtpEmail(session.email, otp);
            session.otpHash = hashOtp(otp);
            session.otpAttempts = 0;
            session.lastEmailSentAt = new Date();
            session.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
            await session.save();
            return message.reply({
              embeds: [
                buildEmbed({
                  title: "📩 New Code Sent",
                  description: `A fresh code was sent to \`${session.email}\`.`,
                  color: "SUCCESS",
                }),
              ],
            });
          } catch (err) {
            console.error("Resend failed:", err);
            return message.reply({
              embeds: [
                buildEmbed({
                  title: "⚠️ Couldn't Resend",
                  description: "Failed to resend the code. Please try again shortly.",
                  color: "ERROR",
                }),
              ],
            });
          }
        }

        // Reject anything that isn't a clean 6-digit code before comparing
        if (!/^\d{6}$/.test(userInput)) {
          return message.reply({
            embeds: [
              buildEmbed({
                title: "❌ Invalid Format",
                description:
                  "Please enter the **6-digit numeric code** exactly as received.\nType `resend` for a new code, or `cancel` to stop.",
                color: "ERROR",
              }),
            ],
          });
        }

        if (hashOtp(userInput) !== session.otpHash) {
          session.otpAttempts += 1;

          if (session.otpAttempts >= MAX_OTP_ATTEMPTS) {
            await Verify.findOneAndDelete({ userId: message.author.id });
            return message.reply({
              embeds: [
                buildEmbed({
                  title: "🔒 Too Many Attempts",
                  description:
                    "You've hit the maximum number of tries. Please rejoin the server or contact an admin to restart verification.",
                  color: "ERROR",
                }),
              ],
            });
          }

          await session.save();
          const remaining = MAX_OTP_ATTEMPTS - session.otpAttempts;
          return message.reply({
            embeds: [
              buildEmbed({
                title: "❌ Incorrect Code",
                description: `That code doesn't match. **${remaining}** attempt(s) left.\nType \`resend\` for a new code, or \`cancel\` to stop.`,
                color: "ERROR",
              }),
            ],
          });
        }

        // OTP is correct — assign roles
        if (!process.env.VERIFIED_ROLE_ID) {
          console.error("VERIFIED_ROLE_ID is not set in environment variables.");
          return message.reply({
            embeds: [
              buildEmbed({
                title: "⚠️ Configuration Error",
                description:
                  "Verification role isn't configured yet. Please contact a server admin.",
                color: "ERROR",
              }),
            ],
          });
        }

        try {
          // NEW: Refresh the typing indicator before the guild/member fetch + role calls
          await message.channel.sendTyping().catch(() => {});

          // OTP is correct, fetch the guild and member
          const guild = await client.guilds.fetch(session.guildId);
          const member = await guild.members.fetch(message.author.id);

          // 1. Assign the verified role
          await member.roles.add(process.env.VERIFIED_ROLE_ID);

          // 2. Remove the unverified role
          if (process.env.UNVERIFIED_ROLE_ID) {
            await member.roles.remove(env.UNVERIFIED_ROLE_ID).catch((err) => {
              console.error("Could not remove unverified role:", err);
            });
          }

          // Cleanup the DB record
          await Verify.findOneAndDelete({ userId: message.author.id });

          await message.reply({
            embeds: [
              buildEmbed({
                title: "Verification Successful!",
                description: `You now have full access to **${guild.name}**.`,
                color: "SUCCESS",
              }),
            ],
          });
        } catch (err) {
          if (err instanceof Error) {
            console.error("Role Assignment Error:", err);

            // Member left the server mid-flow
            if (err.code === 10007 || err.code === 10013) {
              await Verify.findOneAndDelete({ userId: message.author.id });
              return message.reply({
                embeds: [
                  buildEmbed({
                    title: "⚠️ Not In Server",
                    description:
                      "You appear to have left the server. Please rejoin to restart verification.",
                    color: "ERROR",
                  }),
                ],
              });
            }

            const hint = DISCORD_ERROR_HINTS[err.code];
            // Deliberately NOT deleting the session here — the OTP was correct,
            // so the user can just message again once the role issue (e.g. bot
            // permissions) is fixed, instead of restarting from scratch.
            await message.reply({
              embeds: [
                buildEmbed({
                  title: "⚠️ Role Assignment Failed",
                  description: `Code verified, but I couldn't update your roles.${hint ? `\n\n${hint}` : ""}\nPlease contact a server admin.`,
                  color: "ERROR",
                }),
              ],
            });
          }
        }
      }
    } catch (outerErr) {
      console.error("Unhandled verification error:", outerErr);
      message
        .reply({
          embeds: [
            buildEmbed({
              title: "⚠️ Unexpected Error",
              description:
                "Something went wrong. Please try again, or contact a server admin if it persists.",
              color: "ERROR",
            }),
          ],
        })
        .catch(() => {});
    }
  };
};

export default messageCreateInDM;
