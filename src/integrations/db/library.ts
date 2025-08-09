import { dbInstance } from './pool';

/**
 * Ensure a game exists in the catalog
 */
export  const ensureGame=async(appId: number, name: string, extras?: Partial< {
  type: string;
  is_free: boolean;
  tags_json: any;
  players_min: number;
  players_max: number;
  crossplay: boolean;
  price_cents: number;
  currency: string;
}>) =>{
  await dbInstance('games')
    .insert({
      app_id: appId,
      name,
      ...extras,
    })
    .onConflict('app_id')
    .merge({
      name,
      ...extras,
    });
}

/**
 * Link a game to a user with optional playtime metadata
 */
export const  linkGameToUser=async(
  discordUserId: string,
  appId: number,
  playtimeForever?: number,
  lastPlayed?: Date
) =>{
  await dbInstance('ownership')
    .insert({
      discord_user_id: discordUserId,
      app_id: appId,
      playtime_forever: playtimeForever ?? null,
      last_played: lastPlayed ?? null,
    })
    .onConflict(['discord_user_id', 'app_id'])
    .merge({
      playtime_forever: playtimeForever ?? null,
      last_played: lastPlayed ?? null,
    });
}

/**
 * Remove a game from a user's library
 */
export  const unlinkGameFromUser=async(discordUserId: string, appId: number) =>{
  await dbInstance('ownership')
    .where({ discord_user_id: discordUserId, app_id: appId })
    .del();
}

/**
 * Get all games owned by a user
 */
export const  getGamesForUser=async(discordUserId: string) =>{
  return dbInstance('ownership')
    .join('games', 'ownership.app_id', '=', 'games.app_id')
    .where('ownership.discord_user_id', discordUserId)
    .select(
      'games.app_id',
      'games.name',
      'games.type',
      'games.is_free',
      'games.tags_json',
      'games.players_min',
      'games.players_max',
      'games.crossplay',
      'games.price_cents',
      'games.currency',
      'ownership.playtime_forever',
      'ownership.last_played'
    );
}

/**
 * Find common games between multiple users
 */
export const  getCommonGames=async(userIds: string[]) =>{
  if (userIds.length === 0) return [];

  // Query games owned by all given users
  return dbInstance('ownership as o')
    .join('games as g', 'o.app_id', '=', 'g.app_id')
    .whereIn('o.discord_user_id', userIds)
    .groupBy(
      'g.app_id',
      'g.name',
      'g.type',
      'g.is_free',
      'g.tags_json',
      'g.players_min',
      'g.players_max',
      'g.crossplay',
      'g.price_cents',
      'g.currency'
    )
    .havingRaw('COUNT(DISTINCT o.discord_user_id) = ?', [userIds.length])
    .select(
      'g.app_id',
      'g.name',
      'g.type',
      'g.is_free',
      'g.tags_json',
      'g.players_min',
      'g.players_max',
      'g.crossplay',
      'g.price_cents',
      'g.currency'
    );
}


// Insert/update multiple games
export  const upsertGames=async(rows: Array<{
  app_id: number;
  name: string;
  type?: string | null;
  is_free?: boolean;
  tags_json?: any;
  players_min?: number | null;
  players_max?: number | null;
  crossplay?: boolean | null;
  price_cents?: number | null;
  currency?: string | null;
}>) =>{
  for (const g of rows) {
    await dbInstance('games')
      .insert({
        app_id: g.app_id,
        name: g.name,
        type: g.type ?? null,
        is_free: g.is_free ?? false,
        tags_json: g.tags_json ?? null,
        players_min: g.players_min ?? null,
        players_max: g.players_max ?? null,
        crossplay: g.crossplay ?? null,
        price_cents: g.price_cents ?? null,
        currency: g.currency ?? null,
      })
      .onConflict('app_id')
      .merge({
        name: g.name,
        type: g.type ?? null,
        is_free: g.is_free ?? false,
        tags_json: g.tags_json ?? null,
        players_min: g.players_min ?? null,
        players_max: g.players_max ?? null,
        crossplay: g.crossplay ?? null,
        price_cents: g.price_cents ?? null,
        currency: g.currency ?? null,
      });
  }
}

// Link ownership entries for a user (upsert)
export const  upsertOwnership=async(
  discordUserId: string,
  items: Array<{ app_id: number; playtime_forever?: number | null; last_played?: Date | null }>
) => {
  for (const it of items) {
    await dbInstance('ownership')
      .insert({
        discord_user_id: discordUserId,
        app_id: it.app_id,
        playtime_forever: it.playtime_forever ?? null,
        last_played: it.last_played ?? null,
      })
      .onConflict(['discord_user_id', 'app_id'])
      .merge({
        playtime_forever: it.playtime_forever ?? null,
        last_played: it.last_played ?? null,
      });
  }
}
