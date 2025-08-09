
import {
  SteamResolveResult,
  SteamOwnedGamesResponse,
  ISteamService,
} from './types';



export class SteamHttpService implements ISteamService {
  constructor(private apiKey = process.env.STEAM_API_KEY) {
    if (!this.apiKey) {
      throw new Error('STEAM_API_KEY missing. Set it in your environment.');
    }
  }

  async resolveSteamId(input: string): Promise<SteamResolveResult> {
    // if numeric, assume SteamID64
    if (/^\d+$/.test(input)) {
      return { steamId64: input, vanity: null };
    }

    // vanity → steamId64
    const url = new URL('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/');
    url.searchParams.set('key', this.apiKey!);
    url.searchParams.set('vanityurl', input);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Steam ResolveVanityURL failed: ${res.status}`);
    const data = await res.json(); // { response: { success, steamid, message? } }

    if (data?.response?.success !== 1) {
      throw new Error(`Could not resolve vanity URL: ${input}`);
    }

    return { steamId64: data.response.steamid as string, vanity: input };
  }

  async getOwnedGames(
    steamId64: string,
    opts?: { includeAppInfo?: boolean; includeFree?: boolean }
  ): Promise<SteamOwnedGamesResponse> {
    const includeAppInfo = opts?.includeAppInfo ?? true;
    const includeFree = opts?.includeFree ?? true;

    const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
    url.searchParams.set('key', this.apiKey!);
    url.searchParams.set('steamid', steamId64);
    url.searchParams.set('include_appinfo', includeAppInfo ? '1' : '0');
    url.searchParams.set('include_played_free_games', includeFree ? '1' : '0');

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Steam GetOwnedGames failed: ${res.status}`);
    const data = await res.json(); // { response: { game_count, games } }

    return data.response as SteamOwnedGamesResponse;
  }
}
