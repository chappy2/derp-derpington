

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChatInputCommandInteraction } from 'discord.js';
import { dbInstance } from '../../integrations/db/pool.js';
import { handleSuggest } from './suggestions.js';

// minimal interaction
function makeInteraction(opts: {
  player1: string; player2?: string;
  owned_by?: 'all' | 'any';
  min_players?: number; max_players?: number;
  genre?: string; max_price?: number; crossplay?: boolean;
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
      getString: (n: string) => (n === 'genre' ? (opts.genre ?? null) : n === 'owned_by' ? (opts.owned_by ?? null) : null),
      getInteger: (n: string) => n === 'min_players' ? (opts.min_players ?? null)
                         : n === 'max_players' ? (opts.max_players ?? null)
                         : n === 'max_price' ? (opts.max_price ?? null) : null,
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

  // prefs: both want Co-op, 2–4 players, crossplay true, budgets 15€ and 20€
  await dbInstance('prefs').insert([
    { discord_user_id: U1, genre: 'Co-op', min_players: 2, max_players: 4, crossplay: 1, budget_cents: 1500 },
    { discord_user_id: U2, genre: 'Co-op', min_players: 2, max_players: 4, crossplay: 1, budget_cents: 2000 },
  ]);

  // games: only Alpha matches genre+players+crossplay and price
  await dbInstance('games').insert([
    { app_id: 1, name: 'Alpha',   players_min: 2, players_max: 4, crossplay: 1, is_free: 0, price_cents: 999,  currency: 'EUR', tags_json: '["Co-op"]' },
    { app_id: 2, name: 'Bravo',   players_min: 1, players_max: 2, crossplay: 0, is_free: 1,                    tags_json: '["Action"]' },
    { app_id: 3, name: 'Charlie', players_min: 3, players_max: 5, crossplay: 1, is_free: 0, price_cents: 2999, currency: 'EUR', tags_json: '["Co-op"]' },
  ]);

  // ownership: U1 owns Alpha+Bravo, U2 owns Alpha+Charlie
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
  it('uses prefs as defaults when options are not provided', async () => {
    const { U1, U2 } = await seed();

    const { inter, spies } = makeInteraction({ player1: U1, player2: U2, owned_by: 'all' });
    await handleSuggest(inter);

    expect(spies.deferReply).toHaveBeenCalled();
    const msg = spies.editReply.mock.calls[0][0] as string;

    // Should pick Alpha (fits Co-op, 2-4, crossplay true, <= 15€) and is intersection of both users
    expect(msg).toContain('Alpha');
    expect(msg).not.toContain('Bravo');
    expect(msg).not.toContain('Charlie');
  });

  it('explicit options override prefs (e.g., min_players=3 allows Charlie with owned_by=any)', async () => {
    const { U1, U2 } = await seed();

    const { inter, spies } = makeInteraction({
      player1: U1,
      player2: U2,
      owned_by: 'any',
      min_players: 3, // overrides pref 2
      max_players: 5, 
      max_price: 30, // <-- allow Charlie (€29.99)
    });
    await handleSuggest(inter);

    const msg = spies.editReply.mock.calls[0][0] as string;
    expect(msg).toContain('Charlie'); // 3–5 players
  });
});
