
export interface ISteamService {
  resolveSteamId(input: string): Promise<SteamResolveResult>;
  getOwnedGames(steamId64: string, opts?: { includeAppInfo?: boolean; includeFree?: boolean }): Promise<SteamOwnedGamesResponse>;
  // optional extras you may add later:
  // getPlayerSummary(steamId64: string): Promise<any>;
  // getAppDetails(appId: number): Promise<any>;
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
  img_icon_url?: string;
  img_logo_url?: string;
};

export type SteamOwnedGamesResponse = {
  game_count: number;
  games: SteamOwnedGame[];
};
