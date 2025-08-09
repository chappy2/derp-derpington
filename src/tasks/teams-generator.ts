import { ChatInputCommandInteraction } from "discord.js";


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



