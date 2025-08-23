import { dbInstance } from '../pool.js';
import { GameSuggestions, SortDir, SuggestFilters, SuggestOptions, SuggestSort } from './types.js';


export const getPrefsForUsers=async(userIds: string[]) =>{
  if (!userIds.length) return [];
  return dbInstance('prefs').whereIn('discord_user_id', userIds);
}


const applySuggestFilters=(qb: any, filters: SuggestFilters) =>{
   if (filters.min_players != null) qb.andWhere('g.players_min', '<=', filters.min_players);
  if (filters.max_players != null) qb.andWhere('g.players_max', '>=', filters.max_players);

  if (filters.crossplay != null) qb.andWhere('g.crossplay', filters.crossplay);

  if (filters.max_price_cents != null) {
    qb.andWhere(function () {
      this.where('g.price_cents', '<=', filters.max_price_cents!).orWhere('g.is_free', true);
    });
  }

  if (filters.genre) {
    const client = dbInstance.client.config.client;
    if (client === 'mysql2') {
      qb.andWhereRaw("JSON_SEARCH(g.tags_json, 'one', ?) IS NOT NULL", [filters.genre]);
    } else {
      qb.andWhere('g.tags_json', 'like', `%${filters.genre}%`);
    }
  }

  return qb;
}


const makeOwnershipBase=(userIds: string[])=> {
  const isTest = process.env.NODE_ENV === 'test'; // SQLite in tests

  const ownerCsvExpr = isTest
    ? "GROUP_CONCAT(o.discord_user_id) AS owner_ids_csv" // SQLite: no DISTINCT/ORDER/SEPARATOR
    : "GROUP_CONCAT(DISTINCT o.discord_user_id ORDER BY o.discord_user_id SEPARATOR ',') AS owner_ids_csv";

  return dbInstance('ownership as o')
    .whereIn('o.discord_user_id', userIds)
    .groupBy('o.app_id')
    .select('o.app_id')
    .countDistinct({ owners: 'o.discord_user_id' })
    .select(dbInstance.raw('COALESCE(SUM(o.playtime_forever), 0) AS total_playtime'))
    .select(dbInstance.raw(ownerCsvExpr));
}

/** Games owned by ALL users (intersection) *//** Games owned by ALL users (intersection) */
export const getCommonGamesForAll = async (
  userIds: string[],
  filters: SuggestFilters = {},
  limit = 10,
  opts: SuggestOptions = {}
): Promise<GameSuggestions[]> => {
  if (!userIds.length) return [];

  const sortBy: SuggestSort = opts.sortBy ?? 'playtime';
  const sortDir: SortDir = opts.sortDir ?? 'desc';

  const base = makeOwnershipBase(userIds)
    .havingRaw('COUNT(DISTINCT o.discord_user_id) = ?', [userIds.length]);

  const qb = dbInstance.from(base.as('x')).join('games as g', 'g.app_id', 'x.app_id');
  applySuggestFilters(qb, filters);


  return qb
    .select(
      'g.app_id',
      'g.name',
      'g.is_free',
      'g.players_min',
      'g.players_max',
      'g.price_cents',
      'g.currency',
      'g.rating',
      'x.owners',           // <- use x.*, not o.*
      'x.total_playtime',   // <- summed in subquery
      'x.owner_ids_csv'     // <- CSV of discord ids
    )
    .orderBy(getOrdering(sortBy, sortDir))
    .limit(limit);
}

export const getOrdering = (sortBy: SuggestSort, sortDir: SortDir) => {
  let orderBy: any[] = [];
  switch (sortBy) {
    case 'owners':
      orderBy = [{ column: 'x.owners', order: sortDir }, { column: 'x.total_playtime', order: 'desc' }];
      break;
    case 'playtime':
      orderBy = [{ column: 'x.total_playtime', order: sortDir }, { column: 'x.owners', order: 'desc' }];
      break;
    case 'rating':
      orderBy = [{ column: 'g.rating', order: sortDir }, { column: 'x.total_playtime', order: 'desc' }];
      break;
    case 'name':
      orderBy = [{ column: 'g.name', order: sortDir }, { column: 'x.total_playtime', order: 'desc' }];
      break;
    default:
      orderBy = [{ column: 'x.owners', order: sortDir }, { column: 'x.total_playtime', order: 'desc' }];
  }
  return orderBy;
}

/** Games owned by ANY of the users (ranked) */
export const getRankedGamesForAny = async (
  userIds: string[],
  filters: SuggestFilters = {},
  limit = 10,
  opts: SuggestOptions = {}
): Promise<GameSuggestions[]> => {
  if (!userIds.length) return [];

  const sortBy: SuggestSort = opts.sortBy ?? 'rating';
  const sortDir: SortDir = opts.sortDir ?? 'desc';

  const base = makeOwnershipBase(userIds);

  const qb = dbInstance.from(base.as('x')).join('games as g', 'g.app_id', 'x.app_id');
  applySuggestFilters(qb, filters);

  return qb
    .select(
      'g.app_id',
      'g.name',
      'g.is_free',
      'g.players_min',
      'g.players_max',
      'g.price_cents',
      'g.currency',
      'g.rating',
      'x.owners',
      'x.total_playtime',
      'x.owner_ids_csv'
    )
    .orderBy(getOrdering(sortBy, sortDir))
    .limit(limit);
}
