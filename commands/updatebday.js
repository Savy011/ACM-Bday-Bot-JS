import { SlashCommandBuilder } from "discord.js";
import { Bday } from "../models/bday.model.js";
import { Info } from "luxon";

export default({
    data: new SlashCommandBuilder()
    .setName("updatebday")
    .setDescription('Update your birthday!')
    .addIntegerOption(option => 
        option.setName('day')
                .setDescription('The day you were born (1-31)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(31)
    )
    .addIntegerOption(option => 
        option.setName('month')
                .setDescription('The month you were born (1-12)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(12)
    ),

    async execute(interaction){
        const month = interaction.options.getInteger('month');
        const day = interaction.options.getInteger('day');
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;

        const checkIfExists = await Bday.findOne({
            userId
        })

        if(checkIfExists){
            checkIfExists.month = month,
            checkIfExists.day = day,
            await checkIfExists.save();
            const monthName = Info.months('long')[(checkIfExists.month - '0') - 1];
            await interaction.reply(`Birthday updated to ${day} ${monthName}.`);
        }
        else{
            const monthName = Info.months('long')[(month) - 1];
            console.log(`User ${userId} set bday to ${day} ${monthName}`);
            const bday = new Bday({
                month,
                day,
                userId,
                serverId
            });
            await bday.save();

            await interaction.reply(`Birthday set to ${day} ${monthName}.`);
        }
    }
    
})