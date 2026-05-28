import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Bday } from "../models/bday.model.js";
import { Info } from "luxon";

export default({
    data: new SlashCommandBuilder()
    .setName("upcoming")
    .setDescription('See upcoming birthdays!')
    .addIntegerOption(option => 
        option.setName('n')
        .setDescription('How many months ahead you want to see? (1-3)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(11)
    ),

    async execute(interaction) {
       
        await interaction.deferReply(); //needs time to fetch the usernames

        const n = interaction.options.getInteger('n');
        const today = new Date();
        const currMonth = today.getMonth() + 1;
        const currDate = today.getDate();

        const validMonths = [];
        
        for (let i = 0; i <= n; i++) {
            let monthNum = ((currMonth + i - 1) % 12) + 1;
            validMonths.push(String(monthNum).padStart(2, '0')); 
        }

        let allUsers = [];
        for (let i = 0; i < validMonths.length; i++) {
            const month = validMonths[i];
            const userIds = await Bday.find({ month });
            allUsers.push(userIds);
        }

        const embed = new EmbedBuilder()
            .setTitle('Upcoming Birthdays')
            .setColor('#0072FC')

        for (let i = 0; i < validMonths.length; i++) {
            let usersInThisMonth = allUsers[i];

            if (i === 0 && usersInThisMonth) {
                usersInThisMonth = usersInThisMonth.filter(u => u.day >= currDate);
            }

            if (usersInThisMonth && usersInThisMonth.length > 0) {
                usersInThisMonth.sort((a, b) => a.day - b.day); //chronological ordering

               
                const monthNumber = parseInt(validMonths[i], 10); //05 to 5
                const monthName = Info.months('long')[monthNumber - 1];
                
                const formattedUsers = [];

                for (const u of usersInThisMonth) {
                    try {
                        const discordUser = await interaction.client.users.fetch(u.userId); //fetching names
                        const nameToDisplay = discordUser.displayName || discordUser.username;
                        formattedUsers.push(`**${String(u.day).padStart(2, '0')}** - ${nameToDisplay}`);
                    } catch (error) {
                        formattedUsers.push(`**${String(u.day).padStart(2, '0')}** - <@${u.userId}>`);
                    }
                }

                const birthdayList = formattedUsers.join('\n');
                embed.addFields({ name: monthName, value: birthdayList });
            }
        }

        if (!embed.data.fields || embed.data.fields.length === 0) {
            embed.setDescription(`No upcoming birthdays found in the next ${n} month(s).`);
        }

        await interaction.editReply({ embeds: [embed] });
    }
    
})