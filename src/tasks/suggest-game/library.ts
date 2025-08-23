import { ChatInputCommandInteraction, User } from 'discord.js';
import { getSteamService } from '../../integrations/steam/index.js';
import * as db from '../../model/suggest-game/index.js';
import * as formatters from '../../formatters/suggest-game/index.js';


export const handleLibrary = async (inter: ChatInputCommandInteraction) => {
    const sub = inter.options.getSubcommand(true);
    const steam = getSteamService();
    let error;
    let gamesCount = 0;
    if (sub === 'sync') {
        await inter.deferReply({ ephemeral: true });

        try {
            const steamUser = await db.getSteamAccount(inter.user.id)
            const owned = await steam.getOwnedGames(steamUser.steam_id64);
            // Upsert game catalog rows
            await db.upsertGames(
                owned.games.map(g => ({
                    app_id: g.appid,
                    name: g.name ?? `App ${g.appid}`,
                    is_free: false,                 // fake service doesn't include this; set defaults
                    tags_json: null,
                    players_min: null,
                    players_max: null,
                    crossplay: null,
                    price_cents: null,
                    currency: null,
                } as db.Game))
            );

            // Link ownership for the caller
            // playtime can be updated
            await db.upsertOwnership(
                inter.user.id,
                owned.games.map(g => ({
                    app_id: g.appid,
                    playtime_forever: g.playtime_forever ?? 0,
                    // todo parse to date
                    //last_played: g.rtime_last_played ?? 0,
                }))
            );
            gamesCount = owned.games.length;

        } catch (e) {
            error = e;
            console.error('Error syncing library:', e);
        }
        return inter.editReply({ content: formatters.formatSyncLibrary(inter.user.tag, gamesCount) });

    }

    if (sub === 'stats') {
        const user = inter.options.getUser('user') ?? inter.user;
        const games = await db.getGamesForUser(user.id);
        return inter.reply({ ephemeral: true, content: formatters.formatLibraryStats(user.tag, games) });
    }

    return inter.reply({ ephemeral: true, content: formatters.unknownSubcommand(sub) });
}


