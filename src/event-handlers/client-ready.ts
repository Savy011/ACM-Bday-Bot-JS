import type { Client } from "discord.js";

const clientReady = (c: Client<true>) => {
  console.log(`Bot is logged in as ${c.user.tag}`);
};

export default clientReady;
