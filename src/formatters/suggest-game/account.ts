import { SteamOwnedGamesResponse, SteamResolveResult } from "../../integrations/steam/index.js"

export const formatLinkAccount = (resolved:SteamResolveResult):string => {
   return `Linked: steamId64=${resolved.steamId64}${resolved.vanity ? `, vanity=${resolved.vanity}` : ''} Url}`;
}

export const formatStatusAccount = (owned:SteamOwnedGamesResponse):string => {
    return `Owned games: ${owned.game_count}`;
}

export const unlinkAccount = () :string=> {
    return `Unlinked (not implemented yet, nothing happens right now XD).`;
}