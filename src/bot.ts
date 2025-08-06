import { Client, GatewayIntentBits, Events, ChatInputCommandInteraction } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
    console.log(`Angemeldet als ${client.user?.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'teams') return;

    await handleTeams(interaction);
});

export const handleTeams = async (interaction: ChatInputCommandInteraction) => {
    const nTeams = interaction.options.getInteger('anzahl', true);
    const csv = interaction.options.getString('spieler', true);

    const players = csv.split(',')
        .map(s => s.trim())
        .filter(Boolean);

    if (players.length < nTeams * 2) {
        return interaction.reply({ ephemeral: true, content: `Zu wenige Spieler für ${nTeams} Teams.` });
    }

    // Shuffle (Fisher–Yates)
    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        //let iPlayer = players[i];
        //let jPlayer = players[j];
        const a = players[i];
        const b = players[j];
        if (a === undefined || b === undefined) continue; // or throw
        players[i] = b;
        players[j] = a;
    }
    const teams: string[][] = Array.from({ length: nTeams }, () => []);

    players.forEach((p, idx) => {
        let index = idx % nTeams || 0; // Ensure index is within bounds
        if (teams[index]) {
            return teams[index].push(p);
        }
    });

    const lines = teams.map((t, i) => `**Team ${i + 1}:** ${t.join(', ')}`);
    await interaction.reply(lines.join('\n'));
}
if (process.env.NODE_ENV !== 'test') {
  client.login(process.env.DISCORD_TOKEN);
}


