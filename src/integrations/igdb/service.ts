import { HelixClip, HelixGame, HelixPaginated, HelixStream, HelixUser, HelixVideo, IgdbGame, ITwitchService } from "./types.js";


/**
 * Twitch Helix base + OAuth
 */
const HELIX_BASE = "https://api.twitch.tv/helix";
const OAUTH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE = "https://api.igdb.com/v4";


type AppToken = {
    access_token: string;
    expires_in: number; // seconds
    token_type: "bearer";
    obtained_at: number; // epoch ms (our own field)
};

export class TwitchHttpService implements ITwitchService {
    private clientId: string;
    private clientSecret: string;
    private appToken: AppToken | null;

    constructor(
        clientId = process.env.TWITCH_CLIENT_ID,
        clientSecret = process.env.TWITCH_CLIENT_SECRET,
        /** If you already have a bearer token, you can pass it to start. */
        initialBearer?: string
    ) {
        if (!clientId || !clientSecret) {
            throw new Error("TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET missing. Set them in your environment.");
        }
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.appToken = initialBearer
            ? { access_token: initialBearer, expires_in: 0, token_type: "bearer", obtained_at: Date.now() }
            : null;
    }

    /**
     * Ensure we have a valid app access token.
     * Uses Client Credentials flow: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth#oauth-client-credentials-flow
     */
    async ensureToken(): Promise<void> {
        if (this.appToken && !this.isExpired(this.appToken)) return;

        const url = new URL(OAUTH_TOKEN_URL);
        url.searchParams.set("client_id", this.clientId);
        url.searchParams.set("client_secret", this.clientSecret);
        url.searchParams.set("grant_type", "client_credentials");

        const res = await fetch(url.toString(), { method: "POST" });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Twitch token fetch failed: ${res.status} ${text}`);
        }
        const raw = (await res.json()) as Omit<AppToken, "obtained_at">;
        this.appToken = {
            ...raw,
            obtained_at: Date.now(),
        };
    }

    private isExpired(tok: AppToken): boolean {
        const margin = 60 * 1000; // refresh 1 min early
        return Date.now() >= tok.obtained_at + tok.expires_in * 1000 - margin;
    }

    private async helix<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
        await this.ensureToken();
        const url = new URL(`${HELIX_BASE}/${path.replace(/^\/+/, "")}`);
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                if (v == null) continue;
                url.searchParams.append(k, String(v));
            }
        }
        const res = await fetch(url.toString(), {
            headers: {
                "Client-ID": this.clientId,
                Authorization: `Bearer ${this.appToken!.access_token}`,
            },
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Twitch Helix ${path} failed: ${res.status} ${text}`);
        }
        return (await res.json()) as T;
    }

    // Generic IGDB POST (IGDB uses an SQL-like query language in the body)
  private async igdb<T = unknown>(path: string, body: string): Promise<T> {
    await this.ensureToken();
    const res = await fetch(`${IGDB_BASE}/${path.replace(/^\/+/, "")}`, {
      method: "POST",
      headers: {
        "Client-ID": this.clientId,
        "Authorization": `Bearer ${this.appToken!.access_token}`,
        "Accept": "application/json",
        "Content-Type": "text/plain", // IGDB expects plain text query
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`IGDB ${path} failed: ${res.status} ${text}`);
    }
    return (await res.json()) as T;
  }

    // ---------- Users ----------

    async resolveUser(input: string): Promise<{ userId: string; login?: string }> {
        // numeric-ish? Twitch IDs are numeric strings; logins are lowercase names
        if (/^\d+$/.test(input)) {
            // Treat as user_id
            const u = await this.getUserById(input);
            return { userId: u.id, login: u.login };
        } else {
            const u = await this.getUserByLogin(input);
            return { userId: u.id, login: u.login };
        }
    }

    async getUserById(userId: string): Promise<HelixUser> {
        const json = await this.helix<{ data: HelixUser[] }>("users", { id: userId });
        const u = json?.data?.[0];
        if (!u) throw new Error(`No user for id=${userId}`);
        return u;
    }

    async getUserByLogin(login: string): Promise<HelixUser> {
        const json = await this.helix<{ data: HelixUser[] }>("users", { login });
        const u = json?.data?.[0];
        if (!u) throw new Error(`No user for login=${login}`);
        return u;
    }

    // ---------- Channels ----------

    async getChannelInformation(broadcasterId: string): Promise<any> {
        // https://dev.twitch.tv/docs/api/reference#get-channel-information
        const json = await this.helix<{ data: any[] }>("channels", { broadcaster_id: broadcasterId });
        const info = json?.data?.[0];
        if (!info) throw new Error(`No channel info for broadcaster_id=${broadcasterId}`);
        return info;
    }

    // ---------- Games / Categories ----------

    async getTopGames(limit = 20, cursor?: string): Promise<HelixPaginated<HelixGame>> {
        // https://dev.twitch.tv/docs/api/reference#get-top-games
        const json = await this.helix<HelixPaginated<HelixGame>>("games/top", {
            first: Math.max(1, Math.min(100, limit)),
            after: cursor,
        });
        return json;
    }

    async searchCategories(query: string, limit = 20, cursor?: string): Promise<HelixPaginated<HelixGame>> {
        // https://dev.twitch.tv/docs/api/reference#search-categories
        const json = await this.helix<HelixPaginated<HelixGame>>("search/categories", {
            query,
            first: Math.max(1, Math.min(100, limit)),
            after: cursor,
        });
        return json;
    }

    // ---------- Streams ----------

    async getStreams(params?: {
        game_id?: string;
        user_id?: string;
        user_login?: string;
        language?: string;
        first?: number;
        after?: string;
    }): Promise<HelixPaginated<HelixStream>> {
        // https://dev.twitch.tv/docs/api/reference#get-streams
        const json = await this.helix<HelixPaginated<HelixStream>>("streams", {
            game_id: params?.game_id,
            user_id: params?.user_id,
            user_login: params?.user_login,
            language: params?.language,
            first: params?.first ? Math.max(1, Math.min(100, params.first)) : undefined,
            after: params?.after,
        });
        return json;
    }

    // ---------- Videos (VODs / Highlights / Uploads) ----------

    async getVideos(params: {
        user_id: string;
        first?: number;
        after?: string;
        type?: "all" | "upload" | "archive" | "highlight";
        language?: string;
        sort?: "time" | "trending" | "views";
    }): Promise<HelixPaginated<HelixVideo>> {
        // https://dev.twitch.tv/docs/api/reference#get-videos
        const json = await this.helix<HelixPaginated<HelixVideo>>("videos", {
            user_id: params.user_id,
            first: params.first ? Math.max(1, Math.min(100, params.first)) : undefined,
            after: params.after,
            type: params.type,
            language: params.language,
            sort: params.sort,
        });
        return json;
    }

    // ---------- Clips ----------

    async getClips(params: {
        broadcaster_id?: string;
        game_id?: string;
        id?: string;
        started_at?: string; // ISO 8601
        ended_at?: string;   // ISO 8601
        first?: number;
        after?: string;
    }): Promise<HelixPaginated<HelixClip>> {
        // https://dev.twitch.tv/docs/api/reference#get-clips
        const json = await this.helix<HelixPaginated<HelixClip>>("clips", {
            broadcaster_id: params.broadcaster_id,
            game_id: params.game_id,
            id: params.id,
            started_at: params.started_at,
            ended_at: params.ended_at,
            first: params.first ? Math.max(1, Math.min(100, params.first)) : undefined,
            after: params.after,
        });
        return json;
    }
    /**
     * Search games by name and return rating fields.
     * Note: You can improve matching by also querying 'alternative_names' or using exact slug.
     */
    async searchGamesByName(name: string, limit = 5): Promise<IgdbGame[]> {
        // Escape double quotes in user input
        const safe = name.replace(/"/g, '\\"');

        const query = `
      fields id,name,slug,first_release_date,
             rating,rating_count,
             aggregated_rating,aggregated_rating_count,
             total_rating,total_rating_count,
             platforms;
      search "${safe}";
      where version_parent = null; 
      limit ${Math.max(1, Math.min(50, limit))};
    `.trim();

        return await this.igdb<IgdbGame[]>("games", query);
    }

    /**
     * Returns a single "best" rating for a game name, preferring:
     * total_rating > aggregated_rating > rating.
     */
    async getBestRatingFor(name: string): Promise<{
        game?: IgdbGame;
        rating: number | null;
        source: "total_rating" | "aggregated_rating" | "rating" | "none";
    }> {
        const results = await this.searchGamesByName(name, 10);

        // naive pick: first item whose name equals (case-insensitive); fallback to first result
        const match =
            results.find(g => g.name.toLowerCase() === name.toLowerCase()) ??
            results[0];

        if (!match) return { rating: null, source: "none" };

        const { total_rating, aggregated_rating, rating } = match;

        if (typeof total_rating === "number") {
            return { game: match, rating: total_rating, source: "total_rating" };
        }
        if (typeof aggregated_rating === "number") {
            return { game: match, rating: aggregated_rating, source: "aggregated_rating" };
        }
        if (typeof rating === "number") {
            return { game: match, rating, source: "rating" };
        }
        return { game: match, rating: null, source: "none" };
    }
}
