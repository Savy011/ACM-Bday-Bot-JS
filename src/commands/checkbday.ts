import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { Info } from "luxon";

import { createCommand } from "$lib/utils";
import { Bday } from "$models/bday.model";

export default createCommand({
  data: new SlashCommandBuilder()
    .setName("checkbday")
    .setDescription("Check birthday!")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user whose birthday you want to check (leave blank for yourself)")
        .setRequired(false),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: "This command has to be used inside the server, not in DMs.",
        flags: MessageFlags.Ephemeral,
      });
    }

    let user = interaction.user;
    let isAuthor = true;

    const fetchedUser = interaction.options.getUser("user");
    if (fetchedUser) {
      user = fetchedUser;
      isAuthor = false;
    } else {
      const serverId = interaction.guild.id;
      const checkIfExists = await Bday.findOne({
        userId: user.id,
        serverId,
      });

      if (checkIfExists) {
        const monthName = Info.months("long")[checkIfExists.month - 1];
        if (isAuthor) {
          await interaction.reply({
            content: `Your birthday is on ${checkIfExists.day} ${monthName}`,
            flags: MessageFlags.Ephemeral,
          });
        } else
          await interaction.reply({
            content: `${user.username}'s birthday is on ${checkIfExists.day} ${monthName}`,
            flags: MessageFlags.Ephemeral,
          });
      } else {
        if (isAuthor)
          await interaction.reply({
            content: `Your birthday does not exist in the database, please use /setbday to save it.`,
            flags: MessageFlags.Ephemeral,
          });
        else
          await interaction.reply({
            content: `${user.username}'s birthday does not exist in the database.`,
            flags: MessageFlags.Ephemeral,
          });
      }
    }
  },
});
