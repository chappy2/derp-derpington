
export interface ISteamService {
  resolveSteamId(input: string): Promise<SteamResolveResult>;
  getOwnedGames(steamId64: string, opts?: { includeAppInfo?: boolean; includeFree?: boolean }): Promise<SteamOwnedGamesResponse>;
  getPlayerSummary(steamId64: string): Promise<SteamPlayerSummary>;
  getAppDetails(appId: number, opts?: { cc?: string; lang?: string }): Promise<SteamAppDetails>;

}

export type SteamResolveResult = {
  steamId64: string;
  vanity?: string | null;
  personaName?: string | null;
};

export type SteamOwnedGame = {
  appid: number;
  name?: string;
  playtime_forever?: number; // minutes
  rtime_last_played: number;
  img_icon_url?: string;
  img_logo_url?: string;
};

export type SteamOwnedGamesResponse = {
  game_count: number;
  games: SteamOwnedGame[];
};

export type SteamAppDetails = {
  app_id: number;
  name: string;
  is_free: boolean;
  type: string | null,
  price_cents_final: number | null;
  price_cents_initial: number | null;
  discount_percent: number | null;
  currency: string | null;    // e.g. "EUR"
  genres?: string[] | null;   // names from "genres"
  categories?: string[] | null; // names from "categories"
}

export type SteamPlayerSummary = {
  steamid: string;
  personaname: string;
  avatar?: string;
  profileurl?: string;
  realname?: string;
  timecreated?: number;  // unix ts
  personastate?: number; // 0..5
  loccountrycode?: string;
};