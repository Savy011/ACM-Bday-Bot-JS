import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { Bday } from "../models/bday.model.js";
import { Info } from "luxon";

export default {
  data: new SlashCommandBuilder().setName("deletebday").setDescription("Delete birthday!"),

  async execute(interaction) {
    let user = "";
    let isAuthor = true;
    user = interaction.user;
    const serverId = interaction.guild.id;
    const checkIfExists = await Bday.findOneAndDelete({
      userId: user.id,
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
};
