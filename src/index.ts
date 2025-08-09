import { Client, GatewayIntentBits, Events, ChatInputCommandInteraction, CommandInteraction } from 'discord.js';
import * as dotenv from 'dotenv';
import { handleTeams } from './tasks/teams-generator';
import { handleDrawChallenge } from './tasks/draw-challenge';
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
    console.log("sdfsdf")
    if (!interaction.isChatInputCommand()) {
        console.log(`❌ Unbekannte Interaktion: ${interaction.type}`);
        if (interaction.isRepliable?.()) {
            return interaction.reply({
                content: 'Diese Interaktion ist kein Chat-Eingabebefehl.',
                ephemeral: true,
            });
        } else {
            console.warn('Nicht-replizierbare Interaktion:', interaction.type);
            return;
        }
    }
    console.log(`🔧 Interaktion empfangen: ${interaction.commandName} von ${interaction.user.tag}`);
    switch (interaction.commandName) {
        case 'teams':
            return await handleTeams(interaction as ChatInputCommandInteraction);
        case 'draw-challenge':
            console.log('draw-challenge interaction received');
            return await handleDrawChallenge(interaction as ChatInputCommandInteraction);
        default:
            return interaction.reply({ content: 'Es tut mir Leide diese Aufgabe ist mir nicht bekannt. Dafür bin ich nicht zuständig.', ephemeral: true });

    }
});


if (process.env.NODE_ENV !== 'test') {
    client.login(process.env.DISCORD_TOKEN);
}