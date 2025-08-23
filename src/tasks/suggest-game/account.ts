// src/handlers/account.ts (only using steam client; keeping logic elsewhere)
import { ChatInputCommandInteraction } from 'discord.js';
import { getSteamService } from '../../integrations/steam/index.js';
import * as db from '../../model/suggest-game/index.js';
import * as formatters from '../../formatters/suggest-game/index.js';
 

export const  handleAccount=async(inter: ChatInputCommandInteraction) =>{
    const sub = inter.options.getSubcommand(true);
    const steam = getSteamService(); 

    if (sub === 'link') {
        const input = inter.options.getString('steam_id', true);
        await inter.deferReply({ ephemeral: true });

        const resolved = await steam.resolveSteamId(input);
        await db.linkSteam(inter.user.id, resolved.steamId64, resolved.vanity ?? null);

        return inter.reply({ephemeral:true, content: formatters.formatLinkAccount(resolved) });
    }

    if (sub === 'status') {
        const steamUser=await db.getSteamAccount(inter.user.id)
        const owned = await steam.getOwnedGames(steamUser.steam_id64);
        return inter.reply({ ephemeral: true, content:  formatters.formatStatusAccount(owned) });
    }

    if (sub === 'unlink') {
        // TODO do an unlink here!
        return inter.reply({ ephemeral: true, content: formatters.unlinkAccount() });
    }

    return inter.reply({ ephemeral: true, content: formatters.unknownSubcommand(sub) });
}
