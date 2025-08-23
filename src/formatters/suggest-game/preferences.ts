import { User } from "discord.js";
import { Preferences } from "../../model/suggest-game/index.js";
import { mention } from "./generic.js";


export const formatSetPrefs = (prefs: Partial<Preferences>) => {
    const lines = [
        `Saved preferences:`,
        prefs.genre ? `• genre: ${prefs.genre}` : null,
        prefs.min_players != null ? `• min_players: ${prefs.min_players}` : null,
        prefs.max_players != null ? `• max_players: ${prefs.max_players}` : null,
        prefs.crossplay != null ? `• crossplay: ${prefs.crossplay ? 'yes' : 'no'}` : null,
        prefs.budget_cents != null ? `• budget: €${(prefs.budget_cents / 100).toFixed(0)}` : null,
    ].filter(Boolean);
    return lines.join('\n') || 'Saved (empty) preferences.';
}


export const formatGetPrefs = (userTag: User, prefs: Preferences) => {
    if (!prefs) {
        return `${mention(userTag)} has no saved preferences.`
    }
    const lines = [
        `**${mention(userTag)}** preferences:`,
        prefs.genre ? `• genre: ${prefs.genre}` : null,
        prefs.min_players != null ? `• min_players: ${prefs.min_players}` : null,
        prefs.max_players != null ? `• max_players: ${prefs.max_players}` : null,
        prefs.crossplay != null ? `• crossplay: ${prefs.crossplay ? 'yes' : 'no'}` : null,
        prefs.budget_cents != null ? `• budget: €${(prefs.budget_cents / 100).toFixed(0)}` : null,
    ].filter(Boolean);
    return lines.join('\n') || `${mention(userTag)} has no saved preferences.`;
}

export const formatResetPrefs = (userTag: User) => {
    return `Preferences reset for ${mention(userTag)}.`;
}