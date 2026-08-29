import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { createCommand } from "$lib/utils";

import { Bday } from "../models/bday.model.js";

export default createCommand({
  data: new SlashCommandBuilder().setName("deletebday").setDescription("Delete birthday!"),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: "This command has to be used inside the server, not in DMs.",
        flags: MessageFlags.Ephemeral,
      });
    }

    let user = interaction.user;
    const serverId = interaction.guild.id;

    const checkIfExists = await Bday.findOneAndDelete({
      userId: user.id,
      serverId,
    });

    if (checkIfExists) {
      await interaction.reply({
        content: `Your birthday is removed.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `Your birthday does not exist in the database, please use /setbday to save it.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
});
