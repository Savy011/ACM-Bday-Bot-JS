import { SlashCommandBuilder } from "discord.js";
import { Bday } from "../models/bday.model.js";
import { Info } from "luxon";

export default({
    data: new SlashCommandBuilder()
    .setName("upcoming")
    .setDescription('See upcoming birthdays!')
    .addIntegerOption(option => 
        option.setName('day')
                .setDescription('How many months ahead you want to see? (1-12)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(12)
    ),

    async execute(interaction){
        let user='';
        let isAuthor=true;
        if(interaction.options.getUser('user')){
            user=interaction.options.getUser('user');
            isAuthor=false;
        }
        else user = interaction.user;
        const serverId = interaction.guild.id;
        console.log(interaction.options.getUser('user'));
        const checkIfExists = await Bday.findOne({
            userId: user.id
        })

        if(checkIfExists){
            const monthName = Info.months('long')[(checkIfExists.month - '0') - 1];
            if(isAuthor){
                await interaction.reply(`Your birthday is on ${checkIfExists.day} ${monthName}`);
            }
            else await interaction.reply(`${user.username}'s birthday is on ${checkIfExists.day} ${monthName}`);
        }
        else{
            if(isAuthor) await interaction.reply(`Your birthday does not exist in the database, please use /setbday to save it.`); 
            else await interaction.reply(`${user.username}'s birthday does not exist in the database.`);
        }
    }
    
})