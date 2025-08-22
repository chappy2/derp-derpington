import { Client, GatewayIntentBits, Events, ChatInputCommandInteraction, CommandInteraction } from 'discord.js';
import * as dotenv from 'dotenv';
import cron from 'node-cron';

import { handleTeams, handleDrawChallenge, handleAccount, handleLibrary, handlePrefs, handleSuggest } from './tasks/index.js';

import { enrichGameDetails, enrichGameRatings } from './workers/index.js';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });


client.once(Events.ClientReady, async () => {
    console.log(`Angemeldet als ${client.user?.tag}`);
    const cmds = await client.application?.commands.fetch();
    console.log("📋 Registrierte Befehle:");
    cmds?.forEach(cmd => {
        console.log(`- ${cmd.name}`);
    });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
        console.log(`❌ Unbekannte Interaktion: ${interaction.type}`);
        if (interaction.isRepliable?.()) {
            return interaction.reply({
                content: 'Diese Interaktion ist kein Chat-Eingabebefehl.',
                ephemeral: true,
            });
        } else {
            //console.log(interaction)
            console.warn('Nicht-replizierbare Interaktion:', interaction.type);
            return;
        }
    }
    console.log(`🔧 Interaktion empfangen: ${interaction.commandName} von ${interaction.user.tag}`);
    switch (interaction.commandName) {
        case 'teams':
            return await handleTeams(interaction as ChatInputCommandInteraction);
        case 'draw-challenge':
            return await handleDrawChallenge(interaction as ChatInputCommandInteraction);
        case 'account': await handleAccount(interaction); break;
        case 'library': await handleLibrary(interaction); break;
        case 'suggest': await handleSuggest(interaction); break;
        case 'prefs': await handlePrefs(interaction); break;
        default:
            return interaction.reply({ content: 'Es tut mir Leide diese Aufgabe ist mir nicht bekannt. Dafür bin ich nicht zuständig.', ephemeral: true });

    }
});


if (process.env.NODE_ENV !== 'test') {
    client.login(process.env.DISCORD_TOKEN);
}

cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Enriching game details...');
    await enrichGameDetails(100); // process 50 at a time
});

cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Enriching ranking details...');
    await enrichGameRatings(100); // process 50 at a time
});