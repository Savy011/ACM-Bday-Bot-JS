import mongoose from "mongoose";
import "dotenv/config";
import { Client, Events, GatewayIntentBits, EmbedBuilder } from "discord.js"; // CHANGED: added EmbedBuilder
import crypto from "crypto"; // NEW: for hashing OTPs
import setbday from "./commands/setbday.js";
import updatebday from "./commands/updatebday.js";
import checkbday from "./commands/checkbday.js";
import deletebday from "./commands/deletebday.js";
import ping from "./commands/ping.js";
import { Bday } from "./models/bday.model.js";
import cron from "node-cron";
import upcoming from "./commands/upcoming.js";
import help from "./commands/help.js";
import { Partials, ChannelType } from "discord.js"; // Updated to include Partials & ChannelType
import nodemailer from "nodemailer";
import { Verify } from "./models/verify.model.js";
import verify from "./commands/verify.js";
const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}`);
    console.log("DB Connected Successfully");
  } catch (error) {
    console.error("CRITICAL ERROR: Failed to connect to DB", error.message);
    // If DB fails, the bot shouldn't even try to start, otherwise commands will crash
    process.exit(1);
  }
};

connectDB();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages, // NEW: Needed to send DMs
    GatewayIntentBits.MessageContent, // NEW: Needed to read OTP replies in DMs
  ],
  partials: [Partials.Channel, Partials.Message], // NEW: Needed to receive DMs from users not cached
});

client.once(Events.ClientReady, (c) => {
  console.log(`Bot is logged in as ${c.user.tag}`);
});

// The lock variable to prevent Hidencloud from spamming missed crons
let lastRunDate = null;

cron.schedule(
  "1 0 * * *",
  async () => {
    try {
      const rawServerTime = new Date();
      const istTimeString = rawServerTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const today = new Date(istTimeString);

      const currentMonthNum = today.getMonth() + 1;
      const currentDayNum = today.getDate();

      // BULLETPROOF DATE STRING: Manually format to "YYYY-MM-DD"
      // This prevents server locale changes from breaking your lock
      const currentDateString = `${today.getFullYear()}-${currentMonthNum}-${currentDayNum}`;

      if (lastRunDate === currentDateString) {
        console.log(`Cron prevented from duplicate run for date: ${currentDateString}. Skipping.`);
        return;
      }

      // Lock the cron for today
      lastRunDate = currentDateString;

      console.log(`\n=== CRON TRIGGERED ===`);
      console.log(`Locked for Date: ${currentDateString}`);
      console.log(`Translated IST Time: ${today.toString()}`);
      console.log(`======================\n`);

      const currentMonthPadded = String(currentMonthNum).padStart(2, "0");
      const currentMonthPlain = String(currentMonthNum);

      const daysToSearch = [
        currentDayNum,
        String(currentDayNum).padStart(2, "0"),
        String(currentDayNum),
      ];

      // Leap year logic for Feb 28th
      const isLeapYear =
        (today.getFullYear() % 4 === 0 && today.getFullYear() % 100 !== 0) ||
        today.getFullYear() % 400 === 0;
      if (!isLeapYear && currentMonthNum === 2 && currentDayNum === 28) {
        daysToSearch.push(29, "29");
      }

      const todayBdays = await Bday.find({
        month: { $in: [currentMonthNum, currentMonthPadded, currentMonthPlain] },
        day: { $in: daysToSearch },
      });

      if (todayBdays.length > 0) {
        try {
          const channel = await client.channels.fetch("1032522552804909114");
          if (channel) {
            // Extract unique user IDs using a Set to prevent duplicates if DB has multiple entries for one user
            const uniqueUserIds = [...new Set(todayBdays.map((user) => user.userId))];
            const wishArray = uniqueUserIds.map((id) => `<@${id}>`);

            let wishString = `🎂🎉 **Happy Birthday** ${wishArray.join(", ")}!`;

            if (wishString.length > 2000) {
              wishString = `🎂🎉 **Happy Birthday** to all our wonderful members celebrating today!`;
            }

            await channel.send(wishString);
            console.log(`Successfully wished ${uniqueUserIds.length} users.`);
          }
        } catch (discordError) {
          console.error("Discord Channel Fetch/Send Error:", discordError);
        }
      } else {
        console.log("No birthdays today.");
      }
    } catch (dbError) {
      console.error("Database Cron Error:", dbError);
    }
  },
  { timezone: "Asia/Kolkata" },
);

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // Command Router
  try {
    if (interaction.commandName === "setbday") {
      await setbday.execute(interaction);
    } else if (interaction.commandName === "updatebday") {
      await updatebday.execute(interaction);
    } else if (interaction.commandName === "checkbday") {
      await checkbday.execute(interaction);
    } else if (interaction.commandName === "deletebday") {
      await deletebday.execute(interaction);
    } else if (interaction.commandName === "ping") {
      await ping.execute(interaction);
    } else if (interaction.commandName === "upcoming") {
      await upcoming.execute(interaction);
    } else if (interaction.commandName === "help") {
      await help.execute(interaction);
    } else if (interaction.commandName === "verify") {
      await verify.execute(interaction);
    }
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);

    // Ensure we reply to the interaction even if the command crashes, so it doesn't show "Application did not respond"
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error executing this command!",
        ephemeral: true,
      });
    }
  }
});

// ==========================================
// EMAIL VERIFICATION SYSTEM
// ==========================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── config ──────────────────────────────────────────────
const OTP_EXPIRY_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@pec\.edu\.in$/; // stricter than endsWith: blocks "@pec.edu.in" with no name part

const COLORS = {
  ERROR: 0xed4245,
  SUCCESS: 0x57f287,
  INFO: 0x5865f2,
  WARNING: 0xfee75c,
};

// Friendlier text for common Discord API error codes
const DISCORD_ERROR_HINTS = {
  50013: "I don't have permission to manage roles — check my role's position and permissions.",
  50001: "I'm missing access to perform that action in this server.",
};

function buildEmbed({ title, description, color = COLORS.INFO }) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setFooter({ text: "Verification System" })
    .setTimestamp();
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

// ms left in a cooldown window; <= 0 means the cooldown has passed
function msRemaining(from, seconds) {
  return seconds * 1000 - (Date.now() - from.getTime());
}

async function sendOtpEmail(to, otp) {
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

// Trigger 1: When a user joins the server
client.on(Events.GuildMemberAdd, async (member) => {
  // 🛑 Ignore users joining other servers
  if (member.guild.id !== process.env.VERIFY_GUILD_ID) return;

  try {
    // Clear any old attempts and start fresh in the DB
    await Verify.findOneAndDelete({ userId: member.id });

    await Verify.create({
      userId: member.id,
      guildId: member.guild.id,
      step: "AWAITING_EMAIL",
    });

    // NEW: Restrict access immediately by giving them the unverified role
    if (process.env.UNVERIFIED_ROLE_ID) {
      await member.roles.add(process.env.UNVERIFIED_ROLE_ID).catch((err) => {
        console.error("Could not add unverified role:", err);
      });
    }

    await member.send({
      embeds: [
        buildEmbed({
          title: `Welcome to ${member.guild.name}!`,
          description:
            "To gain full access to the server, please verify your identity.\n\n**Reply to this message with your college email address** (e.g. `student@pec.edu.in`).",
          color: COLORS.INFO,
        }),
      ],
    });
  } catch (error) {
    console.error(`Failed to DM new member ${member.user.tag}. DMs might be disabled.`, error);
  }
});

// Trigger 2: When a user replies in DMs
client.on(Events.MessageCreate, async (message) => {
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
            color: COLORS.WARNING,
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
              color: COLORS.ERROR,
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
              color: COLORS.WARNING,
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
              color: COLORS.SUCCESS,
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
              color: COLORS.ERROR,
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
              color: COLORS.WARNING,
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
                color: COLORS.WARNING,
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
                color: COLORS.SUCCESS,
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
                color: COLORS.ERROR,
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
              color: COLORS.ERROR,
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
                color: COLORS.ERROR,
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
              color: COLORS.ERROR,
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
              description: "Verification role isn't configured yet. Please contact a server admin.",
              color: COLORS.ERROR,
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
          await member.roles.remove(process.env.UNVERIFIED_ROLE_ID).catch((err) => {
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
              color: COLORS.SUCCESS,
            }),
          ],
        });
      } catch (err) {
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
                color: COLORS.ERROR,
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
              color: COLORS.ERROR,
            }),
          ],
        });
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
            color: COLORS.ERROR,
          }),
        ],
      })
      .catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
