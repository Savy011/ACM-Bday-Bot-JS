import { SlashCommandBuilder } from "discord.js";
import { Bday } from "../models/bday.model.js";
import { Info } from "luxon";

export default({
    data: new SlashCommandBuilder()
    .setName("deletebday")
    .setDescription('Delete birthday!')
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
        const checkIfExists = await Bday.findOneAndDelete({
            userId: user.id
        })

        if(checkIfExists){
            if(isAuthor){
                await interaction.reply(`Your birthday is removed.`);
            }
            else await interaction.reply(`${user.username}'s birthday is removed`);
        }
        else{
            if(isAuthor) await interaction.reply(`Your birthday does not exist in the database, please use /setbday to save it.`); 
            else await interaction.reply(`${user.username}'s birthday does not exist in the database.`);
        }
    }
    
})