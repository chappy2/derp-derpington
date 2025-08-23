import { ChatInputCommandInteraction, User } from 'discord.js';
import * as db from '../../model/suggest-game/index.js';
import * as formatters from '../../formatters/suggest-game/index.js';


export const handlePrefs = async (inter: ChatInputCommandInteraction) => {
  const sub = inter.options.getSubcommand(true);

  if (sub === 'set') {
    const genre = inter.options.getString('genre') ?? null;
    const min_players = inter.options.getInteger('min_players') ?? null;
    const max_players = inter.options.getInteger('max_players') ?? null;
    const crossplay = inter.options.getBoolean('crossplay') ?? null;
    const budget = inter.options.getInteger('budget') ?? null; // EUR
    const budget_cents = budget != null ? budget * 100 : null;

    const prefs: Partial<db.Preferences> = {
      genre,
      min_players,
      max_players,
      crossplay,
      budget_cents,
    };
    await db.setPrefs(inter.user.id, prefs);
    return inter.reply({ ephemeral: true, content: formatters.formatSetPrefs(prefs) });
  }

  if (sub === 'get') {
    const user = inter.options.getUser('user') ?? inter.user;
    const p = await db.getPrefs(user.id);
    return inter.reply({ ephemeral: true, content: formatters.formatGetPrefs(user, p) });
  }

  if (sub === 'reset') {
    await db.resetPrefs(inter.user.id);
    return inter.reply({ ephemeral: true, content: formatters.formatResetPrefs(inter.user) });
  }

  return inter.reply({ ephemeral: true, content: formatters.unknownSubcommand(sub) });
}


