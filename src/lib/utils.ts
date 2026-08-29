import crypto from "node:crypto";

import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export type Command = {
  data: SlashCommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<unknown>;
};

export const createCommand = <T extends Command>(command: T): T => command;

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

// ms left in a cooldown window; <= 0 means the cooldown has passed
export function msRemaining(from: Date, seconds: number) {
  return seconds * 1000 - (Date.now() - from.getTime());
}
