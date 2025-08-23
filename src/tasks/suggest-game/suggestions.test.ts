import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChatInputCommandInteraction } from 'discord.js';
import { dbInstance } from '../../model/index.js';
import { handleSuggest } from './suggestions.js';
import * as formatters from '../../formatters/suggest-game/index.js';

const isGame = (lines: string[], name: string) =>
  lines.some(l => l.includes(`**${name}**`));

const indexOfGame = (lines: string[], name: string) =>
  lines.findIndex(l => l.includes(`**${name}**`));

const countMentions = (line: string) =>
  (line.match(/<@/g) || []).length;


// ---- Mock: formatters.formatGameLines -> gibt einfache Zeilen mit den Rohfeldern zurück
vi.spyOn(formatters, 'formatGameLines').mockImplementation((rows: any[]) => {
  return rows.map(r =>
    `${r.name}|owners=${r.owners}|play=${r.total_playtime}|csv=${r.owner_ids_csv ?? ''}|rating=${r.rating ?? ''}`
  );
});

// minimal interaction
function makeInteraction(opts: {
  player1: string; player2?: string;
  owned_by?: 'all' | 'any';
  min_players?: number; max_players?: number;
  genre?: string; max_price?: number; crossplay?: boolean;
  order_by?: 'rating' | 'owners' | 'playtime' | 'name';
  order_dir?: 'asc' | 'desc';
}) {
  const deferReply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  const reply = vi.fn().mockResolvedValue(undefined);

  const inter: Partial<ChatInputCommandInteraction> = {
    options: {
      getUser: (name: string, required?: boolean) => {
        const map: Record<string, string | undefined> = {
          player1: opts.player1, player2: opts.player2
        };
        const id = map[name];
        if (!id && required) throw new Error(`${name} required`);
        return id ? ({ id } as any) : null;
      },
      getString: (n: string) =>
        n === 'genre'     ? (opts.genre ?? null)     :
        n === 'owned_by'  ? (opts.owned_by ?? null)  :
        n === 'order_by'  ? (opts.order_by ?? null)  :
        n === 'order_dir' ? (opts.order_dir ?? null) : null,
      getInteger: (n: string) =>
        n === 'min_players' ? (opts.min_players ?? null)
      : n === 'max_players' ? (opts.max_players ?? null)
      : n === 'max_price'   ? (opts.max_price ?? null)
      : null,
      getBoolean: (n: string) => n === 'crossplay' ? (opts.crossplay ?? null) : null,
    } as any,
    deferReply: deferReply as any,
    editReply: editReply as any,
    reply: reply as any,
    isRepliable: () => true,
  };

  return { inter: inter as ChatInputCommandInteraction, spies: { deferReply, editReply, reply } };
}

async function seed() {
  await dbInstance('ownership').del().catch(()=>{});
  await dbInstance('games').del().catch(()=>{});
  await dbInstance('prefs').del().catch(()=>{});
  await dbInstance('users').del().catch(()=>{});

  const U1 = '111', U2 = '222';
  await dbInstance('users').insert([{ discord_user_id: U1 }, { discord_user_id: U2 }]);

  // prefs: beide Co-op, 2–4 Spieler, crossplay true, Budgets 15€ / 20€
  await dbInstance('prefs').insert([
    { discord_user_id: U1, genre: 'Co-op', min_players: 2, max_players: 4, crossplay: 1, budget_cents: 1500 },
    { discord_user_id: U2, genre: 'Co-op', min_players: 2, max_players: 4, crossplay: 1, budget_cents: 2000 },
  ]);

  // ⚠️ WICHTIG: rating mitgeben, da in SELECT 'g.rating' vorkommt
  await dbInstance('games').insert([
    { app_id: 1, name: 'Alpha',   players_min: 2, players_max: 4, crossplay: 1, is_free: 0, price_cents:  999, currency: 'EUR', tags_json: '["Co-op"]',  rating: 80 },
    { app_id: 2, name: 'Bravo',   players_min: 1, players_max: 2, crossplay: 0, is_free: 1,               currency: 'EUR', tags_json: '["Action"]',      rating: 40 },
    { app_id: 3, name: 'Charlie', players_min: 3, players_max: 5, crossplay: 1, is_free: 0, price_cents: 2999, currency: 'EUR', tags_json: '["Co-op"]',  rating: 70 },
  ]);

  // Besitz: U1 -> Alpha+Bravo, U2 -> Alpha+Charlie
  await dbInstance('ownership').insert([
    { discord_user_id: U1, app_id: 1, playtime_forever: 120 },
    { discord_user_id: U1, app_id: 2, playtime_forever: 20 },
    { discord_user_id: U2, app_id: 1, playtime_forever: 60 },
    { discord_user_id: U2, app_id: 3, playtime_forever: 15 },
  ]);

  return { U1, U2 };
}

beforeEach(async () => {
  await seed();
});

describe('/suggest with prefs (integration)', () => {
  it('ALL: nutzt Prefs als Defaults und liefert Schnittmenge inkl. owners/total_playtime/csv', async () => {
    const { U1, U2 } = await seed();

    const { inter, spies } = makeInteraction({
      player1: U1, player2: U2, owned_by: 'all',
      // explizit nach Playtime sortieren, damit deterministisch
      order_by: 'playtime', order_dir: 'desc'
    });
    await handleSuggest(inter);

    expect(spies.deferReply).toHaveBeenCalled();
    const msg = spies.editReply.mock.calls[0][0] as string;
    expect(msg).not.toBe("No matching games found. Try relaxing filters or set owned_by=any."); // Antwort da
    // eine Zeile pro Game (hier nur Alpha erwartet)
    const lines = msg.split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    // Alpha muss drin sein, Bravo/Charlie nicht (ALL + Prefs)
    expect(lines.some(l => l.startsWith('Alpha|'))).toBe(true);
    expect(lines.some(l => l.startsWith('Bravo|'))).toBe(false);
    expect(lines.some(l => l.startsWith('Charlie|'))).toBe(false);

    // Prüfe Aggregat-Werte von Alpha:
    const alpha = lines.find(l => l.startsWith('Alpha|'))!;
    // Owner CSV enthält beide IDs (Reihenfolge egal)
    expect(alpha).toMatch(/csv=.*111.*222|csv=.*222.*111/);
    // total_playtime = 120 + 60 = 180
    expect(alpha).toContain('play=180');
    // owners = 2
    expect(alpha).toContain('owners=2');
  });

  it('ANY: explizite Optionen überschreiben Prefs (min_players=3 lässt Charlie zu) & sort by rating', async () => {
    const { U1, U2 } = await seed();

    const { inter, spies } = makeInteraction({
      player1: U1,
      player2: U2,
      owned_by: 'any',
      min_players: 3,
      max_players: 5,
      max_price: 30, // 29.99€ zulassen
      order_by: 'rating',
      order_dir: 'desc'
    });
    await handleSuggest(inter);

    const msg = spies.editReply.mock.calls[0][0] as string;
    expect(msg).not.toBe("No matching games found. Try relaxing filters or set owned_by=any."); // Antwort da

    const lines = msg.split('\n').filter(Boolean);
    // Charlie sollte erscheinen
    expect(lines.some(l => l.startsWith('Charlie|'))).toBe(true);
    // Alpha kann ebenfalls erscheinen, aber Bravo (1–2 Spieler) nicht
    expect(lines.some(l => l.startsWith('Bravo|'))).toBe(false);

    expect(lines.some(l => l.startsWith('Alpha|'))).toBe(true);
    // Bei rating desc: Alpha(80) vor Charlie(70)
    const alphaIdx = lines.findIndex(l => l.startsWith('Alpha|'));
    const charlieIdx = lines.findIndex(l => l.startsWith('Charlie|'));
    if (alphaIdx !== -1 && charlieIdx !== -1) {
      expect(alphaIdx).toBeLessThan(charlieIdx);
    }
  });

  it('Sortierung: owners-first ordnet nach Besitzerzahl, dann Playtime', async () => {
    const { U1, U2 } = await seed();

    const { inter, spies } = makeInteraction({
      player1: U1, player2: U2, owned_by: 'any',
      order_by: 'owners', order_dir: 'desc'
    });
    await handleSuggest(inter);

    const msg = spies.editReply.mock.calls[0][0] as string;
    expect(msg).not.toBe("No matching games found. Try relaxing filters or set owned_by=any."); // Antwort da

    const lines = msg.split('\n').filter(Boolean);

    // Alpha hat 2 Owner; Bravo/Charlie jeweils 1 -> Alpha sollte vor den anderen stehen
    const alphaIdx = lines.findIndex(l => l.startsWith('Alpha|'));
    const others = lines.filter(l => !l.startsWith('Alpha|'));
    expect(alphaIdx).toBe(0);
    expect(others.every(l => /owners=1/.test(l))).toBe(true);
  });
});
