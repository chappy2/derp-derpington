import { dbInstance } from './pool.js';

/**
 * Ensure a game exists in the catalog
 */
export const ensureGame = async (appId: number, name: string, extras?: Partial<{
  type: string;
  is_free: boolean;
  tags_json: any;
  players_min: number;
  players_max: number;
  crossplay: boolean;
  price_cents: number;
  currency: string;
}>) => {
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
export const linkGameToUser = async (
  discordUserId: string,
  appId: number,
  playtimeForever?: number,
  lastPlayed?: Date
) => {
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
export const unlinkGameFromUser = async (discordUserId: string, appId: number) => {
  await dbInstance('ownership')
    .where({ discord_user_id: discordUserId, app_id: appId })
    .del();
}

/**
 * Get all games owned by a user
 */
export const getGamesForUser = async (discordUserId: string) => {
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
export const getCommonGames = async (userIds: string[]) => {
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

export const getMissing = async (limit: number = 50) => {
  return await dbInstance('games')
    .whereNull('price_cents')
    .orWhereNull('tags_json')
    .limit(limit);
}

export const updateGameDetails = async (app_id, details: any) => {
  if (!details) {
    return;
  }
  const parsed=parseGame(details)
  return await dbInstance('games')
    .where({ app_id: app_id })
    .update({
      is_free: details.is_free ?? false,
      tags_json: JSON.stringify({
        genres: details.genres,
        categories: details.categories,
      }),
      type: details.type,
      players_min: parsed.players_min, // you’d parse categories/tags for coop/multiplayer
      players_max: parsed.players_max,
      crossplay: parsed.crossplay,
      price_cents: details.price_cents_final ?? null,
      currency: details.currency ?? null,
    });
}
// Insert/update multiple games
export const upsertGames = async (rows: Array<{
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
}>) => {
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
export const upsertOwnership = async (
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

type GameMeta = {
  genres?: string[];
  categories?: string[];
};

type ParsedGame = {
  players_min: number | null;
  players_max: number | null;
  crossplay: boolean | null;
};

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, ""); // remove spaces, dashes, slashes, punctuation

const hasAny = (normSet: Set<string>, variants: string[]) =>
  variants.some(v => normSet.has(normalize(v)));

const REGEXES = {
  range: /(\d+)\s*[-–]\s*(\d+)\s*players?/i,          // 1-4 players
  upTo: /up\s*to\s*(\d+)\s*players?/i,                 // up to 8 players
  exact: /(?:^|\b)(\d+)\s*players?\b/i,                // 4 players, 2 player
};

export const parseGame = (meta: GameMeta): ParsedGame => {
  const categories = meta.categories ?? [];
  const normSet = new Set(categories.map(normalize));

  let players_min: number | null = null;
  let players_max: number | null = null;
  let crossplay: boolean | null = null;

  // ---- numeric hints from free-form tags like "1-4 Players", "Up to 8 Players", "4 Player Co-op"
  for (const raw of categories) {
    const s = raw;

    // 1-4 players
    const mRange = s.match(REGEXES.range);
    if (mRange) {
      const lo = Number(mRange[1]);
      const hi = Number(mRange[2]);
      if (!Number.isNaN(lo)) {
        players_min = players_min == null ? lo : Math.min(players_min, lo);
      }
      if (!Number.isNaN(hi)) {
        players_max = players_max == null ? hi : Math.max(players_max, hi);
      }
      continue;
    }

    // up to 8 players
    const mUpTo = s.match(REGEXES.upTo);
    if (mUpTo) {
      const hi = Number(mUpTo[1]);
      if (!Number.isNaN(hi)) {
        players_max = players_max == null ? hi : Math.max(players_max, hi);
      }
      continue;
    }

    // 4 players / 2 player
    const mExact = s.match(REGEXES.exact);
    if (mExact) {
      const n = Number(mExact[1]);
      if (!Number.isNaN(n)) {
        // treat as a max hint (common in store tags like "4 Player Co-op")
        players_max = players_max == null ? n : Math.max(players_max, n);
        // and ensure min at least 2 if n>=2 and any multiplayer-ish tag is present
      }
    }
  }

  // ---- semantic rules (normalized)
  const isSinglePlayer = hasAny(normSet, [
    "singleplayer", "single-player", "single player", "single"
  ]);

  const isMultiplayer = hasAny(normSet, [
    "multiplayer", "multi-player", "multi player",
    "pvp", "online pvp", "lanpvp",
    "coop", "co-op", "online coop", "online co-op", "localcoop", "local co-op",
    "sharedsplitscreen", "splitscreen", "sharedsplitscreenpvp",
  ]);

  const isCoop = hasAny(normSet, [
    "coop", "co-op", "online coop", "online co-op", "localcoop", "local co-op"
  ]);

  const isPvP = hasAny(normSet, ["pvp", "online pvp", "lanpvp"]);

  const isSplitScreen = hasAny(normSet, [
    "splitscreen", "sharedsplitscreen", "sharedsplitscreenpvp"
  ]);

  const isCrossplay = hasAny(normSet, [
    "crossplatformmultiplayer", "crossplatform", "cross-play", "crossplay"
  ]);

  // crossplay
  if (isCrossplay) crossplay = true;

  // min players logic:
  // - single-player present => min must be at least 1 (wins over multiplayer)
  // - multiplayer/coop/pvp imply min at least 2
  if (isSinglePlayer) {
    players_min = players_min == null ? 1 : Math.min(players_min, 1);
  }
  if (isMultiplayer || isCoop || isPvP) {
    const candidate = 2;
    // if min already 1 due to single-player, keep 1; otherwise raise to 2
    if (players_min == null) players_min = candidate;
    else players_min = Math.min(players_min, candidate); // keep the smallest feasible min
  }

  // max players heuristics when not explicitly found:
  // - split-screen often supports up to 4
  if (players_max == null && isSplitScreen) {
    players_max = 4;
  }
  // - plain multiplayer with no hint: default to 2
  if (players_max == null && (isMultiplayer || isCoop || isPvP)) {
    players_max = 2;
  }
  // - single-player only (and nothing else hinted): cap at 1 if no other max
  if (players_max == null && isSinglePlayer && !(isMultiplayer || isCoop || isPvP)) {
    players_max = 1;
  }

  // consistency: ensure max >= min if both set
  if (players_min != null && players_max != null && players_max < players_min) {
    players_max = players_min;
  }

  return { players_min, players_max, crossplay };
};
