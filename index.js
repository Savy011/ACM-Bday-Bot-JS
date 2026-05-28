import mongoose from "mongoose"
import 'dotenv/config'
import { Client, Events, GatewayIntentBits } from "discord.js";
import setbday from "./commands/setbday.js";
import updatebday from "./commands/updatebday.js";
import checkbday from "./commands/checkbday.js";
import deletebday from "./commands/deletebday.js";
import ping from "./commands/ping.js";
import { Bday } from "./models/bday.model.js";
import cron from 'node-cron';
import upcoming from "./commands/upcoming.js";
import help from "./commands/help.js";


const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}`);
        console.log("DB Connected");
    } catch (error) {
        console.log("Failed DB", error.message);
    }
}

connectDB();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, (c) => {
    console.log(`Bot is logged in as ${c.user.tag}`)
});

cron.schedule('0 0 * * *', async () => {
    try {
        const today = new Date();
        const todayMonth = (today.getMonth() + 1);
        const todayDay = (today.getDate());

        // console.log(today,todayDay, todayMonth)
        const todayBdays = await Bday.find({
            month: todayMonth,
            day: todayDay
        });

        if(todayBdays.length >0){
            const channel = await client.channels.fetch('1413229328329736284');
            if(channel) {
                let wishArray=[];
                for(let i=0;i<todayBdays.length;i++){
                    wishArray.push(`<@${todayBdays[i].userId}>`);
                }
                const wishString=wishArray.join(', ');
                await channel.send(`🎂🎉 **Happy Birthday** ${wishString}!`);
            }
        }
    } catch (error) {
        console.error("Error in the cron", error);
    }

},{timezone: "Asia/Kolkata"})




client.on(Events.InteractionCreate, async interaction =>{
    if(!interaction.isChatInputCommand()) return;
    
    if(interaction.commandName == 'setbday'){
        try {
            await setbday.execute(interaction)
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    }

    if(interaction.commandName == 'updatebday'){
        try {
            await updatebday.execute(interaction)
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    }
    if(interaction.commandName == 'checkbday'){
        try {
            await checkbday.execute(interaction)
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    }
    if(interaction.commandName == 'deletebday'){
        try {
            await deletebday.execute(interaction)
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    }
    if(interaction.commandName == 'ping'){
        try {
            await ping.execute(interaction)
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    }
    if(interaction.commandName == 'upcoming'){
        try {
            await upcoming.execute(interaction)
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    }
    if(interaction.commandName == 'help'){
        try {
            await help.execute(interaction)
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    }
})
client.login(process.env.DISCORD_TOKEN);
