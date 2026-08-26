import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

import { createCommand } from "$lib/utils";

export default createCommand({
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Displays a list of all available commands."),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("ACM Birthday Bot Commands")
      .setColor("#0072FC")
      .setDescription("Below is the complete list of commands available.")
      .addFields(
        { name: "/setbday", value: "Register your birthday in the database." },
        { name: "/updatebday", value: "Update your existing birthday record." },
        { name: "/checkbday", value: "View the currently saved birthday for specified user" },
        { name: "/deletebday", value: "Remove your birthday from the database." },
        {
          name: "/upcoming",
          value: "View a list of upcoming birthdays for a specified number of months (1-11).",
        },
        { name: "/ping", value: "Check the bot's current latency and connection status." },
      )
      .setFooter({ text: "ACM Birthdays", iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },
});
