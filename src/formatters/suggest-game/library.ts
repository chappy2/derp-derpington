import { Game, OwnedGame, OwnedGameWithDetails } from "../../model/suggest-game/index.js";

export const formatSyncLibrary = (userTag: string, gamesCount?: number, error?) => {
    if (error) {
        return `Error syncing library for ${userTag}: ${error.message || error}`;
    }
    return `Synced ${gamesCount} games for ${userTag}.`;
}

export const formatLibraryStats = (userTag: string, games: Array<OwnedGameWithDetails>) => {
    if (!games || games.length === 0) {
        return `**${userTag}** has no games in their library.`;
    }

    // Simple stats: count of owned games + top 5 by playtime
    const total = games.length;
    const top = [...games]
        .sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0))
        .slice(0, 5);
    const lines = [
        `**${userTag}** — ${total} games`,
        top.length ? `Top by playtime:` : '',
        ...top.map(g =>
            `• ${g.name} — ${g.playtime_forever} min`
        ),
    ].filter(Boolean);
    return lines.join('\n');
}