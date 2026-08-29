import { SlashCommandBuilder } from "discord.js";

import { env } from "$env";
import { buildEmbed } from "$lib/embeds.js";
import { createCommand } from "$lib/utils.js";

import { Verify } from "../models/verify.model.js";

export default createCommand({
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Start (or restart) email verification to gain full server access"),

  async execute(interaction) {
    // Guard: must be used inside a server, not a DM
    if (!interaction.guild) {
      return interaction.reply({
        embeds: [
          buildEmbed({
            title: "❌ Server Only",
            description: "This command has to be used inside the server, not in DMs.",
            color: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Only meant for the verification server
    if (interaction.guild.id !== env.VERIFY_GUILD_ID) {
      return interaction.reply({
        embeds: [
          buildEmbed({
            title: "❌ Not Available Here",
            description: "Verification isn't set up for this server.",
            color: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Already verified?
    if (env.VERIFIED_ROLE_ID && interaction.member.roles.cache.has(env.VERIFIED_ROLE_ID)) {
      return interaction.reply({
        embeds: [
          buildEmbed({
            title: "✅ Already Verified",
            description: "You're already verified — no action needed!",
            color: "SUCCESS",
          }),
        ],
        ephemeral: true,
      });
    }

    try {
      // Clear any old/stuck session and start fresh, same as the join trigger
      await Verify.findOneAndDelete({ userId: interaction.user.id });
      await Verify.create({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        step: "AWAITING_EMAIL",
      });

      await interaction.member.send({
        embeds: [
          buildEmbed({
            title: `👋 Verify your access to ${interaction.guild.name}`,
            description:
              "To gain full access to the server, please verify your identity.\n\n**Reply to this message with your college email address** (e.g. `student@pec.edu.in`).",
            color: "INFO",
          }),
        ],
      });

      return interaction.reply({
        embeds: [
          buildEmbed({
            title: "📬 Check Your DMs",
            description: "I've sent you a direct message to continue verification.",
            color: "SUCCESS",
          }),
        ],
        ephemeral: true,
      });
    } catch (err) {
      console.error("Failed to start /verify flow:", err);

      // Most likely cause: user has server DMs disabled
      return interaction.reply({
        embeds: [
          buildEmbed({
            title: "⚠️ Couldn't DM You",
            description:
              "I couldn't send you a direct message. Please enable DMs from server members in your Privacy Settings and try again.",
            color: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }
  },
});
