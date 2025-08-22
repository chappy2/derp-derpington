import { dbInstance } from './pool.js';

// already have: ensureUser, setPrefs, getPrefs, resetPrefs, upsertGames, upsertOwnership, getGamesForUser, etc.

// Bulk fetch prefs for multiple users
export async function getPrefsForUsers(userIds: string[]) {
  if (!userIds.length) return [];
  return dbInstance('prefs').whereIn('discord_user_id', userIds);
}

type SuggestFilters = {
  min_players?: number;
  max_players?: number;
  genre?: string;
  max_price_cents?: number;
  crossplay?: boolean;
};

// in ../../integrations/db.ts (or wherever applySuggestFilters lives)
function applySuggestFilters(qb: any, filters: SuggestFilters) {
  // WAS: qb.andWhere('g.players_min', '<=', filters.min_players)
  if (filters.min_players != null) qb.andWhere('g.players_min', '>=', filters.min_players);

  // WAS: qb.andWhere('g.players_max', '>=', filters.max_players)
  if (filters.max_players != null) qb.andWhere('g.players_max', '<=', filters.max_players);

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

/** Games owned by ALL users (intersection) */
export async function getCommonGamesForAll(
  userIds: string[],
  filters: SuggestFilters = {},
  limit = 10
) {
  if (!userIds.length) return [];

  const sub = dbInstance('ownership as o')
    .select('o.app_id')
    .whereIn('o.discord_user_id', userIds)
    .groupBy('o.app_id')
    .havingRaw('COUNT(DISTINCT o.discord_user_id) = ?', [userIds.length]);

  const qb = dbInstance('games as g').whereIn('g.app_id', sub);
  applySuggestFilters(qb, filters);
  return qb
    .select(
      'g.app_id',
      'g.name',
      'g.is_free',
      'g.players_min',
      'g.players_max',
      'g.price_cents',
      'g.currency'
    )
    .limit(limit);
}

/** Games owned by ANY of the users (ranked) */
export async function getRankedGamesForAny(
  userIds: string[],
  filters: SuggestFilters = {},
  limit = 10
) {
  if (!userIds.length) return [];

  const base = dbInstance('ownership as o')
    .whereIn('o.discord_user_id', userIds)
    .groupBy('o.app_id')
    .select('o.app_id')
    .countDistinct<{ owners: number }>({ owners: 'o.discord_user_id' })
    .sum<{ total_playtime: number }>({ total_playtime: 'o.playtime_forever' });

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
      'x.owners',
      'x.total_playtime'
    )
    .orderBy([{ column: 'x.owners', order: 'desc' }, { column: 'x.total_playtime', order: 'desc' }])
    .limit(limit);
}
