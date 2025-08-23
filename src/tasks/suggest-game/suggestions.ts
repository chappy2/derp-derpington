import { ChatInputCommandInteraction, Formatters } from 'discord.js';
import { getPrefsForUsers, getRankedGamesForAny, getCommonGamesForAll } from '../../model/suggest-game/suggestions.js';
import * as formatters from '../../formatters/suggest-game/index.js';
import { SortDir, SuggestFilters, SuggestOptions, SuggestSort } from '../../model/suggest-game/types.js';
import { modeDefined, anyTrue, minDefined, maxDefined } from '../../utils.js';
import { group } from 'console';

export async function handleSuggest(inter: ChatInputCommandInteraction) {
  const users = [
    inter.options.getUser('player1', true)?.id,
    inter.options.getUser('player2', false)?.id,
    inter.options.getUser('player3', false)?.id,
    inter.options.getUser('player4', false)?.id,
  ].filter(Boolean) as string[];

  if (users.length < 1) {
    return inter.reply({ ephemeral: true, content: 'Pick at least one player.' });
  }

  // explicit options (override prefs)
  const opt_minPlayers = inter.options.getInteger('min_players') ?? undefined;
  const opt_maxPlayers = inter.options.getInteger('max_players') ?? undefined;
  const opt_genre = inter.options.getString('genre') ?? undefined;
  const opt_ownedBy = (inter.options.getString('owned_by') as 'all' | 'any' | null) ?? 'all';
  const opt_orderBy = inter.options.getString('order_by') ?? 'rating';
  const opt_sortDir = (inter.options.getString('order_dir') as 'asc' | 'desc' | null) ?? 'desc';
  const opt_maxPrice = inter.options.getInteger('max_price') ?? undefined;
  const opt_crossplay = inter.options.getBoolean('crossplay') ?? undefined;

  await inter.deferReply({ ephemeral: true });

  // load prefs for all players
  const prefs = await getPrefsForUsers(users);

  // derive defaults from prefs when option not provided:
  // min_players: max of user mins
  //const pref_min = maxDefined(prefs.map(p => p.min_players));
  // max_players: min of user maxes
  //const pref_max = minDefined(prefs.map(p => p.max_players));
  // genre: most common non-null
  const pref_genre = modeDefined(prefs.map(p => p.genre));
  // crossplay: true if any user explicitly requires it (OR)
  const pref_cross = anyTrue(prefs.map(p => p.crossplay));
  // budget: min budget among users
  const pref_budget_c = minDefined(prefs.map(p => p.budget_cents));

  const groupSize = users.length;

  const filters: SuggestFilters = {
   minPlayers : opt_minPlayers ?? groupSize,
   maxPlayers : opt_maxPlayers ?? groupSize,
    genre: opt_genre ?? pref_genre ?? undefined,
    max_price_cents: (opt_maxPrice != null ? opt_maxPrice * 100 : undefined) ?? pref_budget_c ?? undefined,
    crossplay: opt_crossplay ?? pref_cross ?? undefined,
  } as SuggestFilters;

  const opts: SuggestOptions = {
    sortBy: opt_orderBy as SuggestSort,
    sortDir: opt_sortDir as SortDir,
  } as SuggestOptions

  const rows =
    opt_ownedBy === 'any'
      ? await getRankedGamesForAny(users, filters, 10, opts)
      : await getCommonGamesForAll(users, filters, 10, opts);

  if (!rows.length) {
    return inter.editReply('No matching games found. Try relaxing filters or set owned_by=any.');
  }

  const lines = formatters.formatGameLines(rows);

  return inter.editReply(lines.join('\n'));
}

