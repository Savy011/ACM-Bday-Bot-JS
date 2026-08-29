import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

import { buildEmbed } from "$lib/embeds.js";
import { createCommand } from "$lib/utils.js";
import { getSettings } from "$models/settings.model";

export default createCommand({
  data: new SlashCommandBuilder()
    .setName("togglecounter")
    .setDescription("Turn the branch verification counter on or off")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        embeds: [
          buildEmbed({
            title: "Server Only",
            description: "This command has to be used inside the server, not in DMs.",
            color: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    try {
      const settings = await getSettings();
      settings.branchCounterEnabled = !settings.branchCounterEnabled;
      await settings.save();

      const isOn = settings.branchCounterEnabled;

      return interaction.reply({
        embeds: [
          buildEmbed({
            title: "Branch Counter Updated",
            description: `The branch counter is now **${isOn ? "ON" : "OFF"}**.\n\n${
              isOn
                ? "New verifications will update the counter and #stats."
                : "New verifications won't be counted — useful while testing join/leave flows."
            }`,
            color: isOn ? "SUCCESS" : "WARNING",
          }),
        ],
        ephemeral: true,
      });
    } catch (err) {
      console.error("Failed to toggle branch counter:", err);
      return interaction.reply({
        embeds: [
          buildEmbed({
            title: "Something Went Wrong",
            description: "Couldn't update the counter setting. Please try again.",
            color: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }
  },
});
