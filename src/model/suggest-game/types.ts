export type SuggestSort = 'playtime' | 'owners' | 'rating' | 'name';
export type SortDir = 'asc' | 'desc';

export type SuggestOptions = {
  sortBy?: SuggestSort;   // default: 'playtime'
  sortDir?: SortDir;      // default: 'desc'
};

export type GameSuggestions = {
  owners: number;         // count of distinct owners
  total_playtime: number; // summed playtime across all owners
  owner_ids_csv: string;  // CSV of discord user IDs
} & Game; // include other game data like tags_json, crossplay, etc


export type Tags = {
  genres?: string[];
  categories?: string[];
};

export type MultiplayerData = {
  players_min: number | null;
  players_max: number | null;
  crossplay: boolean | null;
};

export type Ranking = {
  rating: number | null;
  rating_updated_at: Date | null;
}
export type GameData = MultiplayerData & Ranking & {
  type: string,
  is_free: boolean,
  tags_json: Tags | null,
  price_cents: number;
  currency: string;
  game_details_updated_at: Date | null;
}

export type Game = GameData & { app_id: number, name: string }

export type Playtimes = {
  app_id: number;
  playtime_forever?: number | null;
  last_played?: Date | null;
}

export type OwnedGame = Playtimes & {
  discordUserId: string,
}

export type OwnedGameWithDetails = OwnedGame & Game;


export type Preferences = {
    genre?: string | null;
    min_players?: number | null;
    max_players?: number | null;
    crossplay?: boolean | null;
    budget_cents?: number | null;
};


export type SuggestFilters = {
  min_players?: number;
  max_players?: number;
  genre?: string;
  max_price_cents?: number;
  crossplay?: boolean;
};