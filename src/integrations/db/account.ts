// src/store.ts
import { dbInstance } from './pool';



export const ensureUser = async (discordUserId: string) => {
  await dbInstance('users')
    .insert({ discord_user_id: discordUserId })
    .onConflict('discord_user_id')
    .ignore();
}

export const linkSteam = async (discordUserId: string, steamId64: string, vanity?: string | null) => {
  await ensureUser(discordUserId);
  await dbInstance('steam_accounts')
    .insert({
      discord_user_id: discordUserId,
      steam_id64: steamId64,
      vanity: vanity ?? null,
      privacy_ok: true,
    })
    .onConflict('discord_user_id')
    .merge({
      steam_id64: steamId64,
      vanity: vanity ?? null,
      privacy_ok: true,
    });
}

export const unlinkSteam = async (discordUserId: string) => {
  await dbInstance('steam_accounts').where({ discord_user_id: discordUserId }).del();
}

export const getSteamAccount = async (discordUserId: string) => {
  return dbInstance('steam_accounts').where({ discord_user_id: discordUserId }).first();
}
