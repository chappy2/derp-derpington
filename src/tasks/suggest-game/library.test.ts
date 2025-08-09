
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatInputCommandInteraction } from 'discord.js';

// ---- deterministic steam only (DB is REAL) ----
vi.mock('../../integrations/steam/index', () => {
  return {
    getSteamService: (_useFake?: boolean) => ({
      resolveSteamId: async (_input: string) => ({
        steamId64: '76561198000000001',
        vanity: 'myVanity',
      }),
      getOwnedGames: async (_steamId64: string) => ({
        game_count: 3,
        games: [
          { appid: 10001, name: 'Alpha',   playtime_forever: 120 },
          { appid: 10002, name: 'Bravo',   playtime_forever: 45  },
          { appid: 10003, name: 'Charlie', playtime_forever: 0   },
        ],
      }),
    }),
  };
});

// import REAL db + handler (no db mocks)
import * as db from '../../integrations/db';
import { handleLibrary } from './library';

// minimal discord interaction mock
function makeInteraction(
  sub: 'sync' | 'stats',
  opts?: { userId?: string; statsUserId?: string }
) {
  const deferReply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  const reply = vi.fn().mockResolvedValue(undefined);

  const inter: Partial<ChatInputCommandInteraction> = {
    user: { id: opts?.userId ?? '123456789012345678' } as any,
    options: {
      getSubcommand: () => sub,
      getUser: (name: string) => {
        if (name === 'user' && opts?.statsUserId) return ({ id: opts.statsUserId } as any);
        return null;
      },
    } as any,
    deferReply: deferReply as any,
    editReply: editReply as any,
    reply: reply as any,
    isRepliable: () => true,
  };

  return { inter: inter as ChatInputCommandInteraction, spies: { deferReply, editReply, reply } };
}

beforeEach(async () => {
  // clean ALL tables between tests; schema creation is handled by your prod code on first use
  await db.dbInstance('ownership').del().catch(() => {});
  await db.dbInstance('games').del().catch(() => {});
  await db.dbInstance('steam_accounts').del().catch(() => {});
  await db.dbInstance('users').del().catch(() => {});
});

describe('/library (integration, real DB)', () => {
  it('sync writes to real DB and edits reply', async () => {
    const userId = '123456789012345678';
    // seed user so FK on ownership passes — if your code ensures user automatically, remove this line
    await db.dbInstance('users').insert({ discord_user_id: userId });

    const { inter, spies } = makeInteraction('sync', { userId });
    await handleLibrary(inter);

    // reply flow
    expect(spies.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(spies.editReply).toHaveBeenCalledTimes(1);
    expect(spies.editReply.mock.calls[0][0]).toMatch(/Synced 3 games/i);

    // real DB assertions
    const games = await db.dbInstance('games').orderBy('app_id', 'asc');
    const owns  = await db.dbInstance('ownership').where({ discord_user_id: userId }).orderBy('app_id', 'asc');

    expect(games.map((g:any)=>g.app_id)).toEqual([10001,10002,10003]);
    expect(owns.map((o:any)=>o.app_id)).toEqual([10001,10002,10003]);
  });

  it('stats returns no-games message before sync', async () => {
    const userId = '123456789012345678';
    await db.dbInstance('users').insert({ discord_user_id: userId });

    const { inter, spies } = makeInteraction('stats', { userId });
    await handleLibrary(inter);

    expect(spies.reply).toHaveBeenCalledTimes(1);
    const arg = spies.reply.mock.calls[0][0] as { content: string; ephemeral?: boolean };
    expect(arg.ephemeral).toBe(true);
    expect(arg.content).toMatch(/has no games synced/i);
  });

  it('stats shows totals after sync', async () => {
    const userId = '123456789012345678';
    await db.dbInstance('users').insert({ discord_user_id: userId });

    // run sync first
    await handleLibrary(makeInteraction('sync', { userId }).inter);

    // then stats
    const { inter, spies } = makeInteraction('stats', { userId });
    await handleLibrary(inter);

    expect(spies.reply).toHaveBeenCalledTimes(1);
    const arg = spies.reply.mock.calls[0][0] as { content: string; ephemeral?: boolean };
    expect(arg.ephemeral).toBe(true);
    expect(arg.content).toMatch(/3 games/);
    expect(arg.content).toMatch(/Alpha — 120 min/); // top playtime line
  });
});
