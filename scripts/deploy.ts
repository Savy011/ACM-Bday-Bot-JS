import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { REST, Routes } from "discord.js";

import { env } from "../src/lib/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, "../src/commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".ts"));

let commands = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = (await import(filePath)).default;

  if ("data" in command && "execute" in command) {
    console.log({ command });
    commands.push(command.data.toJSON());
    console.log({ commands });
  } else {
    console.log(`[WARNING] ${filePath} is missing "data" or "execute".`);
  }
}

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

const deploy = async () => {
  try {
    console.log("Deploying slash commands...");
    await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: commands });
    console.log("Successfully deployed commands!");
  } catch (error) {
    console.error(error);
  }
};

deploy();
