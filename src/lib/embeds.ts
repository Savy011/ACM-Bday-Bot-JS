import { EmbedBuilder } from "discord.js";

import { COLORS } from "./constants";

type EmbedConfig = {
  title: string;
  description: string;
  color: keyof typeof COLORS;
};

export function buildEmbed({ title, description, color = "INFO" }: EmbedConfig) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(COLORS[color])
    .setFooter({ text: "Verification System" })
    .setTimestamp();
}
