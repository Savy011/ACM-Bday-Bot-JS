import { REST, Routes } from 'discord.js';
import 'dotenv/config';
import setbday from './commands/setbday.js';
import updatebday from './commands/updatebday.js';
import checkbday from './commands/checkbday.js';
import deletebday from './commands/deletebday.js';
import ping from './commands/ping.js';
import upcoming from './commands/upcoming.js';
import help from './commands/help.js';

const commands = [ setbday.data.toJSON(),updatebday.data.toJSON(), checkbday.data.toJSON(), deletebday.data.toJSON(), ping.data.toJSON(), upcoming.data.toJSON(), help.data.toJSON() ];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const deploy = async () => {
    try {
        console.log('Deploying slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Successfully deployed commands!');
    } catch (error) {
        console.error(error);
    }
};

deploy();