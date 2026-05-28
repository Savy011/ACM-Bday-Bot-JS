import { SlashCommandBuilder } from "discord.js";

export default({
    data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription('latency test'),

    async execute(interaction) {
        try {
            const wsPing = Math.round(interaction.client.ws.ping);

            await interaction.reply(`Pong! \nAPI Latency: ${wsPing}ms`);
            
        } catch (error) {
            console.error("PING COMMAND CRASHED:", error);
        }
    } 
})