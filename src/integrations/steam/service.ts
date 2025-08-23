
import {
  SteamResolveResult,
  SteamOwnedGamesResponse,
  ISteamService,
  SteamPlayerSummary,
  SteamAppDetails,
} from './types.js';

const RESOLVE_VANITY_URL = 'https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/';
const GET_OWNED_GAMES = 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/';
const GET_PLAYER_SUMMARIES = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/';
const STORE_APP_DETAILS = 'https://store.steampowered.com/api/appdetails';


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
    const url = new URL(RESOLVE_VANITY_URL);
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

    const url = new URL(GET_OWNED_GAMES);
    url.searchParams.set('key', this.apiKey!);
    url.searchParams.set('steamid', steamId64);
    url.searchParams.set('include_appinfo', includeAppInfo ? '1' : '0');
    url.searchParams.set('include_played_free_games', includeFree ? '1' : '0');

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Steam GetOwnedGames failed: ${res.status}`);
    const data = await res.json(); // { response: { game_count, games } }

    return data.response as SteamOwnedGamesResponse;
  }

  async getPlayerSummary(steamId64: string): Promise<SteamPlayerSummary> {
    const url = new URL(GET_PLAYER_SUMMARIES);
    url.searchParams.set('key', this.apiKey!);
    url.searchParams.set('steamids', steamId64); // API nimmt Komma-Liste; wir geben 1 ID

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Steam GetPlayerSummaries failed: ${res.status}`);

    const data = await res.json() as { response?: { players?: any[] } };
    const p = data?.response?.players?.[0];
    if (!p) throw new Error(`No player found for steamid ${steamId64}`);

    const summary: SteamPlayerSummary = {
      steamid: p.steamid,
      personaname: p.personaname,
      avatar: p.avatarfull ?? p.avatarmedium ?? p.avatar,
      profileurl: p.profileurl,
      realname: p.realname,
      timecreated: p.timecreated,
      personastate: p.personastate,
      loccountrycode: p.loccountrycode,
    };
    return summary;
  }

  async getAppDetails(appId: number, opts?: { cc?: string; lang?: string }): Promise<SteamAppDetails> {
    const url = new URL(STORE_APP_DETAILS);
    url.searchParams.set('appids', String(appId));
    if (opts?.cc) url.searchParams.set('cc', opts.cc);       // country code (Preiswährung)
    if (opts?.lang) url.searchParams.set('l', opts.lang);      // Sprache

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Steam appdetails failed: ${res.status}`);

    // Struktur: { "<appId>": { success: true, data: { ... } } }
    const raw = await res.json() as Record<string, { success: boolean; data?: any }>;
    const node = raw?.[String(appId)];
    if (!node?.success || !node.data) {
      // Manche Apps sind DLC/Depot/etc. → kein data
      return {
        app_id: appId,
        name: `App ${appId}`,
        type: null, // its boring its only game.. maybe we should skip dlcs?
        is_free: null,
        currency: null,
        price_cents_final: null,
        price_cents_initial: null,
        discount_percent: null,
        genres: null,
        categories: null
      };
    }

    const d = node.data;
    const priceCentsFinal =
      d.price_overview?.final != null ? Number(d.price_overview.final) : null;
    const priceCentsInitial =
      d.price_overview?.initial != null ? Number(d.price_overview.initial) : null;
    const discountPercent =
      d.price_overview?.discount_percent != null ? Number(d.price_overview.discount_percent) : null;
    const currency =
      d.price_overview?.currency ?? null;

    const genres = Array.isArray(d.genres) ? d.genres.map((g: any) => g.description).filter(Boolean) : null;
    const categories = Array.isArray(d.categories) ? d.categories.map((c: any) => c.description).filter(Boolean) : null;

    return {
      app_id: appId,
      name: d.name ?? `App ${appId}`,
      is_free: !!d.is_free,
      currency,
      genres,
      categories,
      type: d.type, // its boring its only game.. maybe we should skip dlcs?
      price_cents_final: priceCentsFinal,
      price_cents_initial: priceCentsInitial,
      discount_percent: discountPercent,
    };
  };
}


