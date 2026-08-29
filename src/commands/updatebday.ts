import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { Info } from "luxon";

import { createCommand } from "$lib/utils.js";
import { Bday } from "$models/bday.model.js";

export default createCommand({
  data: new SlashCommandBuilder()
    .setName("updatebday")
    .setDescription("Update your birthday!")
    .addIntegerOption((option) =>
      option
        .setName("day")
        .setDescription("The day you were born (1-31)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(31),
    )
    .addIntegerOption((option) =>
      option
        .setName("month")
        .setDescription("The month you were born (1-12)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(12),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: "This command has to be used inside the server, not in DMs.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const month = interaction.options.getInteger("month", true);
    const day = interaction.options.getInteger("day", true);

    if (month < 1 || month > 12) {
      // handle invalid value
    }

    if (day < 1 || day > 31) {
      // handle invalid value
    }

    const userId = interaction.user.id;
    const serverId = interaction.guild.id;
    const username = interaction.user.displayName || interaction.user.username;

    const checkIfExists = await Bday.findOne({
      userId,
      serverId,
    });

    if (checkIfExists) {
      checkIfExists.month = month;
      checkIfExists.day = day;
      await checkIfExists.save();
      const monthName = Info.months("long")[checkIfExists.month - 1];
      await interaction.reply({
        content: `Birthday updated to ${day} ${monthName}.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      const monthName = Info.months("long")[month - 1];
      console.log(`User ${userId} set bday to ${day} ${monthName}`);
      const bday = new Bday({
        month,
        day,
        userId,
        serverId,
        username,
      });
      await bday.save();

      await interaction.reply({
        content: `Birthday set to ${day} ${monthName}.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
});
