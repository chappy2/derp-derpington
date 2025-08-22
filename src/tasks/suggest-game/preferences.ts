import { ChatInputCommandInteraction, User } from 'discord.js';
import * as db from '../../integrations/db/index.js';

export const  handlePrefs=async(inter: ChatInputCommandInteraction) => {
  const sub = inter.options.getSubcommand(true);

  if (sub === 'set') {
    const genre = inter.options.getString('genre') ?? null;
    const min_players = inter.options.getInteger('min_players') ?? null;
    const max_players = inter.options.getInteger('max_players') ?? null;
    const crossplay = inter.options.getBoolean('crossplay') ?? null;
    const budget = inter.options.getInteger('budget') ?? null; // EUR

    await db.setPrefs(inter.user.id, {
      genre,
      min_players,
      max_players,
      crossplay,
      budget_cents: budget != null ? budget * 100 : null,
    });

    const lines = [
      `Saved preferences:`,
      genre ? `• genre: ${genre}` : null,
      min_players != null ? `• min_players: ${min_players}` : null,
      max_players != null ? `• max_players: ${max_players}` : null,
      crossplay != null ? `• crossplay: ${crossplay ? 'yes' : 'no'}` : null,
      budget != null ? `• budget: €${budget}` : null,
    ].filter(Boolean);

    return inter.reply({ ephemeral: true, content: lines.join('\n') || 'Saved (empty) preferences.' });
  }

  if (sub === 'get') {
    const user = inter.options.getUser('user') ?? inter.user;
    const p = await db.getPrefs(user.id);
    if (!p) {
      return inter.reply({ ephemeral: true, content: `${mention(user)} has no saved preferences.` });
    }
    const lines = [
      `**${mention(user)}** preferences:`,
      p.genre ? `• genre: ${p.genre}` : null,
      p.min_players != null ? `• min_players: ${p.min_players}` : null,
      p.max_players != null ? `• max_players: ${p.max_players}` : null,
      p.crossplay != null ? `• crossplay: ${p.crossplay ? 'yes' : 'no'}` : null,
      p.budget_cents != null ? `• budget: €${(p.budget_cents / 100).toFixed(0)}` : null,
    ].filter(Boolean);

    return inter.reply({ ephemeral: true, content: lines.join('\n') });
  }

  if (sub === 'reset') {
    await db.resetPrefs(inter.user.id);
    return inter.reply({ ephemeral: true, content: 'Preferences reset.' });
  }

  return inter.reply({ ephemeral: true, content: 'Unknown subcommand.' });
}

function mention(u: User) {
  return `<@${u.id}>`;
}
