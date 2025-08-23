
export type IgdbToken = {
    access_token: string;
    expires_in: number;
    token_type: "bearer";
    obtained_at: number; // local field
};

export type IgdbGame = {
    id: number;
    name: string;
    first_release_date?: number;
    rating?: number;                  // user score (0-100)
    rating_count?: number;
    aggregated_rating?: number;       // critic/partner score (0-100)
    aggregated_rating_count?: number;
    total_rating?: number;            // combined (0-100) when present
    total_rating_count?: number;
    slug?: string;
    platforms?: number[];
};

// Basic Twitch/Helix types and an interface your service will implement.

export type HelixPaginated<T> = {
    data: T[];
    pagination?: { cursor?: string };
};

export type HelixUser = {
    id: string;
    login: string;
    display_name: string;
    type: string;
    broadcaster_type: string;
    description: string;
    profile_image_url: string;
    offline_image_url: string;
    view_count: number;
    email?: string;
    created_at: string;
};

export type HelixGame = {
    id: string;
    name: string;
    box_art_url: string; // template like https://.../{width}x{height}.jpg
    igdb_id?: string;     // only present in some responses
};

export type HelixStream = {
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: "live" | "";
    title: string;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string; // template {width}x{height}.jpg
    tags: string[];
    is_mature: boolean;
};

export type HelixVideo = {
    id: string;
    stream_id?: string;
    user_id: string;
    user_login: string;
    user_name: string;
    title: string;
    description: string;
    created_at: string;
    published_at: string;
    url: string;
    thumbnail_url: string;
    viewable: "public" | "private";
    view_count: number;
    language: string;
    type: "archive" | "highlight" | "upload";
    duration: string; // e.g. "3h12m5s"
};

export type HelixClip = {
    id: string;
    url: string;
    embed_url: string;
    broadcaster_id: string;
    broadcaster_name: string;
    creator_id: string;
    creator_name: string;
    video_id: string;
    game_id: string;
    language: string;
    title: string;
    view_count: number;
    created_at: string;
    thumbnail_url: string;
    duration: number;
    vod_offset?: number;
    is_featured: boolean;
};

export interface ITwitchService {
    ensureToken(): Promise<void>;
    resolveUser(input: string): Promise<{ userId: string; login?: string }>;
    getUserById(userId: string): Promise<HelixUser>;
    getUserByLogin(login: string): Promise<HelixUser>;
    getChannelInformation(broadcasterId: string): Promise<any>;
    getTopGames(limit?: number, cursor?: string): Promise<HelixPaginated<HelixGame>>;
    searchCategories(query: string, limit?: number, cursor?: string): Promise<HelixPaginated<HelixGame>>;
    getStreams(params?: {
        game_id?: string;
        user_id?: string;
        user_login?: string;
        language?: string;
        first?: number;
        after?: string;
    }): Promise<HelixPaginated<HelixStream>>;
    getVideos(params: {
        user_id: string;
        first?: number;
        after?: string;
        type?: "all" | "upload" | "archive" | "highlight";
        language?: string;
        sort?: "time" | "trending" | "views";
    }): Promise<HelixPaginated<HelixVideo>>;
    getClips(params: {
        broadcaster_id?: string;
        game_id?: string;
        id?: string;
        started_at?: string; // ISO
        ended_at?: string;   // ISO
        first?: number;
        after?: string;
    }): Promise<HelixPaginated<HelixClip>>;
    searchGamesByName(name: string, limit?: number): Promise<IgdbGame[]>;
    getBestRatingFor(name: string): Promise<{
        game?: IgdbGame;
        rating: number | null;
        source: "total_rating" | "aggregated_rating" | "rating" | "none";
    }>;
}
