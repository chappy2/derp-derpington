import { ChatInputCommandInteraction, User } from 'discord.js';
import { getSteamService } from '../../integrations/steam/index.js';
import * as db from '../../model/index.js';

export const handleLibrary = async (inter: ChatInputCommandInteraction) => {
    const sub = inter.options.getSubcommand(true);
    const steam = getSteamService();

    if (sub === 'sync') {
        await inter.deferReply({ ephemeral: true });


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

        return inter.editReply(`✅ Synced ${owned.game_count} games for you.`);
    }

    if (sub === 'stats') {
        const user = inter.options.getUser('user') ?? inter.user;

        // Simple stats: count of owned games + top 5 by playtime
        const games = await db.getGamesForUser(user.id);

        if (!games || games.length === 0) {
            return inter.reply({ ephemeral: true, content: `${mention(user)} has no games synced yet.` });
        }

        const total = games.length;
        const top = [...games]
            .sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0))
            .slice(0, 5);

        const lines = [
            `**${mention(user)}** — ${total} games`,
            top.length ? `Top by playtime:` : '',
            ...top.map(g =>
                `• ${g.name} — ${(g.playtime_forever ?? 0)} min`
            ),
        ].filter(Boolean);

        return inter.reply({ ephemeral: true, content: lines.join('\n') });
    }

    return inter.reply({ ephemeral: true, content: 'Unknown subcommand.' });
}

function mention(u: User) {
    return `<@${u.id}>`;
}
