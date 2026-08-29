import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { Partials } from "discord.js";
import cron from "node-cron";

import { env } from "$env";
import { executeBdays } from "$lib/cron";
import { connectDB } from "$lib/db";

import clientReady from "./event-handlers/client-ready";
import guildMemberAdd from "./event-handlers/guild-member-add";
import interactionCreate from "./event-handlers/interaction-create";
import messageCreateInDM from "./event-handlers/message-create-in-dm";

await connectDB();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".ts"));

console.log(commandsPath);
console.log(commandFiles);

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = (await import(filePath)).default;

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);

    console.log({ command });
  } else {
    console.log(`[WARNING] ${filePath} is missing "data" or "execute".`);
  }
}

client.once(Events.ClientReady, clientReady);

// The lock variable to prevent Hidencloud from spamming missed crons
let lastRunDate: string | null = null;

cron.schedule("1 0 * * *", executeBdays(lastRunDate, client), { timezone: "Asia/Kolkata" });

client.on(Events.InteractionCreate, interactionCreate);

// Trigger 1: When a user joins the server
client.on(Events.GuildMemberAdd, guildMemberAdd);

// Trigger 2: When a user replies in DMs
client.on(Events.MessageCreate, messageCreateInDM(client));

client.login(env.DISCORD_TOKEN);
