// src/handlers/account.ts (only using steam client; keeping logic elsewhere)
import { ChatInputCommandInteraction } from 'discord.js';
import { getSteamService } from '../../integrations/steam/index.js';
import * as db from '../../integrations/db/index.js';
 

export const  handleAccount=async(inter: ChatInputCommandInteraction) =>{
    const sub = inter.options.getSubcommand(true);
    const steam = getSteamService(); 

    if (sub === 'link') {
        const input = inter.options.getString('steam_id', true);
        await inter.deferReply({ ephemeral: true });

        const resolved = await steam.resolveSteamId(input);
        await db.linkSteam(inter.user.id, resolved.steamId64, resolved.vanity ?? null);

        return inter.editReply(`Linked: steamId64=${resolved.steamId64}${resolved.vanity ? `, vanity=${resolved.vanity}` : ''}`);
    }

    if (sub === 'status') {
        console.log(inter.user)
        const steamUser=await db.getSteamAccount(inter.user.id)
        const owned = await steam.getOwnedGames(steamUser.steam_id64);
        return inter.reply({ ephemeral: true, content: `Owned games: ${owned.game_count}` });
    }

    if (sub === 'unlink') {

        return inter.reply({ ephemeral: true, content: 'Unlinked (fake, nothing happens right now XD).' });
    }

    return inter.reply({ ephemeral: true, content: 'Unknown subcommand.' });
}
