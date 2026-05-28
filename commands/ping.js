import { SlashCommandBuilder } from "discord.js";
import { Bday } from "../models/bday.model.js";
import { Info } from "luxon";

export default({
    data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription('latency test'),

    async execute(interaction){
        const sent = await interaction.reply({ content: 'Pinging...' });
        const reply = await interaction.fetchReply();
        const roundTripLatency = reply.createdTimestamp - interaction.createdTimestamp;
        const wsPing = interaction.client.ws.ping;

        await interaction.editReply(
            `Pong! \n**Round-trip latency:** ${roundTripLatency}ms \n**WebSocket:** ${wsPing}ms`
        );
    }
    
})