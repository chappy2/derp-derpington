import { dbInstance } from './pool.js';
import { ensureUser } from './account.js';
import { Preferences } from './types.js';


export const setPrefs = async (
    discordUserId: string,
    prefs: Preferences
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
