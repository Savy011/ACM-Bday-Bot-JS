import { REST, Routes } from "discord.js";
import "dotenv/config";

import checkbday from "../src/commands/checkbday.js";
import deletebday from "../src/commands/deletebday.js";
import help from "../src/commands/help.js";
import ping from "../src/commands/ping.js";
import setbday from "../src/commands/setbday.js";
import upcoming from "../src/commands/upcoming.js";
import updatebday from "../src/commands/updatebday.js";
import verify from "../src/commands/verify.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!DISCORD_TOKEN) throw new Error("Discord Bot Token is missing!");
if (!CLIENT_ID) throw new Error("Client ID is missing!");

const commands = [
  setbday.data.toJSON(),
  updatebday.data.toJSON(),
  checkbday.data.toJSON(),
  deletebday.data.toJSON(),
  ping.data.toJSON(),
  upcoming.data.toJSON(),
  help.data.toJSON(),
  verify.data.toJSON(),
];

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

const deploy = async () => {
  try {
    console.log("Deploying slash commands...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("Successfully deployed commands!");
  } catch (error) {
    console.error(error);
  }
};

deploy();
