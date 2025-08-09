// src/handlers/account.ts (only using steam client; keeping logic elsewhere)
import { ChatInputCommandInteraction } from 'discord.js';
import { getSteamService } from '../../integrations/steam';
import * as db from '../../integrations/db';
 

export const  handleAccount=async(inter: ChatInputCommandInteraction) =>{
    const sub = inter.options.getSubcommand(true);
    const steam = getSteamService(true); // use fake service for now

    if (sub === 'link') {
        const input = inter.options.getString('steam_id', true);
        await inter.deferReply({ ephemeral: true });

        const resolved = await steam.resolveSteamId(input);
        await db.linkSteam(inter.user.id, resolved.steamId64, resolved.vanity ?? null);

        return inter.editReply(`Linked (fake): steamId64=${resolved.steamId64}${resolved.vanity ? `, vanity=${resolved.vanity}` : ''}`);
    }

    if (sub === 'status') {
        // for now, call fake owned games just to demo:
        const me = await steam.resolveSteamId(inter.user.id); // demo only; replace with your stored mapping later
        const owned = await steam.getOwnedGames(me.steamId64);
        return inter.reply({ ephemeral: true, content: `Owned games (fake): ${owned.game_count}` });
    }

    if (sub === 'unlink') {
        return inter.reply({ ephemeral: true, content: 'Unlinked (fake noop).' });
    }

    return inter.reply({ ephemeral: true, content: 'Unknown subcommand.' });
}
