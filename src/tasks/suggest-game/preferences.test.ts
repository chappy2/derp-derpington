

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChatInputCommandInteraction } from 'discord.js';
import * as db from '../../model/index.js';
import { handlePrefs } from './preferences.js';

function makeInteraction(
  sub: 'set' | 'get' | 'reset',
  opts?: {
    userId?: string;
    targetUserId?: string;
    genre?: string;
    min_players?: number;
    max_players?: number;
    crossplay?: boolean;
    budget?: number; // EUR
  }
) {
  const reply = vi.fn().mockResolvedValue(undefined);

  const inter: Partial<ChatInputCommandInteraction> = {
    user: { id: opts?.userId ?? '111' } as any,
    options: {
      getSubcommand: () => sub,
      getString: (name: string) => (name === 'genre' ? (opts?.genre ?? null) : null),
      getInteger: (name: string) => {
        if (name === 'min_players') return opts?.min_players ?? null;
        if (name === 'max_players') return opts?.max_players ?? null;
        if (name === 'budget') return opts?.budget ?? null;
        return null;
      },
      getBoolean: (name: string) => (name === 'crossplay' ? (opts?.crossplay ?? null) : null),
      getUser: (name: string) =>
        name === 'user' && opts?.targetUserId ? ({ id: opts.targetUserId } as any) : null,
    } as any,
    reply: reply as any,
    isRepliable: () => true,
  };

  return { inter: inter as ChatInputCommandInteraction, spies: { reply } };
}

beforeEach(async () => {
  // clean tables between tests; schema is ensured by your app on first use
  await db.dbInstance('prefs').del().catch(() => {});
  await db.dbInstance('users').del().catch(() => {});
});

describe('/prefs (integration)', () => {
  it('set stores preferences and replies summary', async () => {
    const { inter, spies } = makeInteraction('set', {
      userId: '111',
      genre: 'Co-op',
      min_players: 2,
      max_players: 4,
      crossplay: true,
      budget: 20, // EUR
    });

    await handlePrefs(inter);

    expect(spies.reply).toHaveBeenCalledTimes(1);
    const arg = spies.reply.mock.calls[0][0] as { content: string; ephemeral?: boolean };
    expect(arg.ephemeral).toBe(true);
    expect(arg.content).toMatch(/Saved preferences/);

    // verify DB
    const row = await db.dbInstance('prefs').where({ discord_user_id: '111' }).first();
    expect(row.genre).toBe('Co-op');
    expect(row.min_players).toBe(2);
    expect(row.max_players).toBe(4);
    expect(row.crossplay).toBe(1); // sqlite boolean
    expect(row.budget_cents).toBe(2000);
  });

  it('get shows saved preferences for target user', async () => {
    // seed prefs directly (set also works, but seeding is fine)
    await db.dbInstance('users').insert({ discord_user_id: '222' });
    await db.dbInstance('prefs').insert({
      discord_user_id: '222',
      genre: 'RPG',
      min_players: 1,
      max_players: 4,
      crossplay: 0,
      budget_cents: 3999,
    });

    const { inter, spies } = makeInteraction('get', { targetUserId: '222' });
    await handlePrefs(inter);

    const arg = spies.reply.mock.calls[0][0] as { content: string };
    expect(arg.content).toMatch(/RPG/);
    expect(arg.content).toMatch(/min_players: 1/);
    expect(arg.content).toMatch(/max_players: 4/);
    expect(arg.content).toMatch(/crossplay: no/);
    expect(arg.content).toMatch(/budget: €40/); // 3999/100 → 39.99, rounded in handler; if you want cents, change formatting
  });

  it('reset removes preferences', async () => {
    await db.dbInstance('users').insert({ discord_user_id: '333' });
    await db.dbInstance('prefs').insert({ discord_user_id: '333', genre: 'Action' });

    const { inter, spies } = makeInteraction('reset', { userId: '333' });
    await handlePrefs(inter);

    expect(spies.reply).toHaveBeenCalledTimes(1);
    const after = await db.dbInstance('prefs').where({ discord_user_id: '333' }).first();
    expect(after).toBeUndefined();
  });
});
