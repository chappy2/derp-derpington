import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('teams')
    .setDescription('Spieler in Teams aufteilen')
    .addIntegerOption(o =>
      o.setName('anzahl')
       .setDescription('Anzahl Teams (min 2)')
       .setRequired(true)
       .setMinValue(2))
    .addStringOption(o =>
      o.setName('spieler')
       .setDescription('Spieler, durch Komma getrennt')
       .setRequired(true))
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID),
        { body: commands },
      );
      console.log('Guild-Commands deployed.');
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID!),
        { body: commands },
      );
      console.log('Global-Commands deployed (können ~1h cachen).');
    }
  } catch (err) {
    console.error(err);
  }
})();
