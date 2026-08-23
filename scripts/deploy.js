import { REST, Routes } from "discord.js";
import "dotenv/config";
import setbday from "../src/commands/setbday.js";
import updatebday from "../src/commands/updatebday.js";
import checkbday from "../src/commands/checkbday.js";
import deletebday from "../src/commands/deletebday.js";
import ping from "../src/commands/ping.js";
import upcoming from "../src/commands/upcoming.js";
import help from "../src/commands/help.js";
import verify from "../src/commands/verify.js";

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

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

const deploy = async () => {
  try {
    console.log("Deploying slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log("Successfully deployed commands!");
  } catch (error) {
    console.error(error);
  }
};

deploy();
