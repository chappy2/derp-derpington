import { dbInstance } from './pool.js';
import { ensureUser } from './account.js';


export const setPrefs = async (
    discordUserId: string,
    prefs: {
        genre?: string | null;
        min_players?: number | null;
        max_players?: number | null;
        crossplay?: boolean | null;
        budget_cents?: number | null;
    }
) => {
    await ensureUser(discordUserId);
    await dbInstance('prefs')
        .insert({ discord_user_id: discordUserId, ...prefs })
        .onConflict('discord_user_id')
        .merge({ ...prefs });
}

export const getPrefs = (discordUserId: string) => {
    return dbInstance('prefs').where({ discord_user_id: discordUserId }).first();
}

export const resetPrefs = async (discordUserId: string) => {
    await dbInstance('prefs').where({ discord_user_id: discordUserId }).del();
}
