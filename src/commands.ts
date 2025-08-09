// src/commands.ts
import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

export const suggestCmd = new SlashCommandBuilder()
  .setName('suggest')
  .setDescription('Suggest games for a group')
  .addUserOption(o =>
    o.setName('player1').setDescription('First player').setRequired(true))
  .addUserOption(o =>
    o.setName('player2').setDescription('Second player').setRequired(false))
  .addUserOption(o =>
    o.setName('player3').setDescription('Third player').setRequired(false))
  .addUserOption(o =>
    o.setName('player4').setDescription('Fourth player').setRequired(false))
  .addIntegerOption(o =>
    o.setName('min_players').setDescription('Minimum players'))
  .addIntegerOption(o =>
    o.setName('max_players').setDescription('Maximum players'))
  .addStringOption(o =>
    o.setName('genre').setDescription('Genre (autocomplete)').setAutocomplete(true))
  .addStringOption(o =>
    o.setName('owned_by')
     .setDescription('Ownership rule')
     .addChoices(
       { name: 'all (intersection)', value: 'all' },
       { name: 'any (union)', value: 'any' },
     ))
  .addIntegerOption(o =>
    o.setName('max_price').setDescription('Max price (EUR)'))
  .addBooleanOption(o =>
    o.setName('crossplay').setDescription('Require crossplay?'))
  .setDMPermission(false);

export const prefsCmd = new SlashCommandBuilder()
  .setName('prefs')
  .setDescription('Set or view your game preferences')
  .addSubcommand((sc: SlashCommandSubcommandBuilder) =>
    sc.setName('set')
      .setDescription('Save your preferences')
      .addStringOption(o => o.setName('genre').setDescription('Preferred genre').setAutocomplete(true))
      .addIntegerOption(o => o.setName('min_players').setDescription('Minimum players'))
      .addIntegerOption(o => o.setName('max_players').setDescription('Maximum players'))
      .addBooleanOption(o => o.setName('crossplay').setDescription('Require crossplay?'))
      .addIntegerOption(o => o.setName('budget').setDescription('Max price (EUR)')))
  .addSubcommand(sc =>
    sc.setName('get').setDescription('Show your preferences')
      .addUserOption(o => o.setName('user').setDescription('User')))
  .addSubcommand(sc => sc.setName('reset').setDescription('Reset your preferences'))
  .setDMPermission(false);

export const libraryCmd = new SlashCommandBuilder()
  .setName('library')
  .setDescription('Steam library utilities')
  .addSubcommand(sc => sc.setName('sync').setDescription('Sync owned games from Steam'))
  .addSubcommand(sc =>
    sc.setName('stats')
      .setDescription('Show library stats')
      .addUserOption(o => o.setName('user').setDescription('User'))
  )
  .setDMPermission(false);

export const accountCmd = new SlashCommandBuilder()
  .setName('account')
  .setDescription('Link your Steam account')
  .addSubcommand(sc =>
    sc.setName('link')
      .setDescription('Link your Steam account')
      .addStringOption(o =>
        o.setName('steam_id')
         .setDescription('SteamID64 or vanity URL')
         .setRequired(true)))
  .addSubcommand(sc => sc.setName('unlink').setDescription('Unlink Steam'))
  .addSubcommand(sc => sc.setName('status').setDescription('Show link status'))
  .setDMPermission(false);

