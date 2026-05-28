import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { Bday } from "../models/bday.model.js";
import { Info } from "luxon";

export default({
    data: new SlashCommandBuilder()
    .setName("checkbday")
    .setDescription('Check birthday!')
    .addUserOption(option => 
        option.setName('user')
            .setDescription('The user whose birthday you want to check (leave blank for yourself)')
            .setRequired(false)
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
                await interaction.reply({ 
                content:`Your birthday is on ${checkIfExists.day} ${monthName}`, 
                flags: MessageFlags.Ephemeral 
            });
            }
            else  await interaction.reply({ 
                content:`${user.username}'s birthday is on ${checkIfExists.day} ${monthName}`, 
                flags: MessageFlags.Ephemeral 
            });
        }
        else{
            if(isAuthor) await interaction.reply({ 
                content:`Your birthday does not exist in the database, please use /setbday to save it.`, 
                flags: MessageFlags.Ephemeral 
            });
            else await interaction.reply({ 
                content:`${user.username}'s birthday does not exist in the database.`,
                flags: MessageFlags.Ephemeral 
            });
        }
    }
    
})