import { Game, GameSuggestions } from "../model/index.js";
import { mentionById } from "./generic.js";
import { OwnerLike } from "./types.js";


// helper: join only truthy parts with an em dash
const withDashes = (...parts: (string | undefined | null | false)[]) =>
    parts.filter(Boolean).join(" — ");

export const formatPrice = (g: Game): string => {
    if (g.is_free) return "free";
    if (g.price_cents != null) {
        const curr = g.currency ?? "EUR";
        return `${(g.price_cents / 100).toFixed(2)} ${curr}`;
    }
    return undefined;
}

export const formatPlayers = (min?: number | null, max?: number | null): string => {
    if (!min && !max) return undefined;

    // Normalize
    const lo = min ?? max ?? 1;
    const hi = max ?? min ?? lo;

    if (hi <= 1) return "Singleplayer";

    // 1..N -> supports solo & multi
    if (lo <= 1) {
        return `Singleplayer — Multiplayer (up to ${hi} players)`;
    }

    // e.g., 2..4 -> multiplayer only, give range
    return `Multiplayer (${lo}-${hi} players)`;
}

export const formatOwners = (owners: string): string => {
    const ownersArr = owners.split(",").map(o => o.trim());
    if (ownersArr.length === 0) return undefined;
    const names = ownersArr.map(o => mentionById(o)).join(", ");
    return names; 
}

export const formatPlaytime = (playtime: number | null): string => {
    if (playtime == null) return undefined;
    const hours = Math.floor(playtime / 60);
    const minutes = playtime % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

export const formatRating = (rating: number | null): string => {
    if (rating == null) return "No rating";
    if (rating < 0) return "No rating";
    return `Rating: ${rating.toFixed(0)}%`;
}

export const formatGameLines = (rows: GameSuggestions[]): string[] => {
    
    return rows.map(g => {
        const price = formatPrice(g);
        const players = formatPlayers(g.players_min, g.players_max);
        const ownerLabel = g.owner_ids_csv ? formatOwners(g.owner_ids_csv) : undefined;
        const playtime = formatPlaytime(g.total_playtime);
        const rating = formatRating(g.rating);

        const tail = withDashes(price, players, ownerLabel,playtime,rating); // joins only what exists
        return tail
            ? `• **${g.name}** — ${tail}`
            : `• **${g.name}**`;
    });
}

