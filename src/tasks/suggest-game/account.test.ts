// src/handlers/account.rest.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatInputCommandInteraction } from 'discord.js';

// 1) Mock the steam integration to behave like REST responses (deterministic)
vi.mock('../../integrations/steam', () => {
  return {
    getSteamService: (_useFake?: boolean) => ({
      resolveSteamId: async (input: string) => ({
        steamId64: '76561198000000001',
        vanity: /^\d+$/.test(input) ? null : input,
      }),
      getOwnedGames: async (_steamId64: string) => ({
        game_count: 10,
        games: Array.from({ length: 10 }).map((_, i) => ({
          appid: 10000 + i,
          name: `Game ${i + 1}`,
          playtime_forever: i * 10,
        })),
      }),
    }),
  };
});

// 2) Import the SUT *after* the mock
import { handleAccount } from './account.js';

// 3) Minimal Discord interaction mock
function makeInteraction(
  sub: 'link' | 'status' | 'unlink' | 'nope',
  opts: { steam_id?: string } = {},
) {
  const deferReply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  const reply = vi.fn().mockResolvedValue(undefined);

  const interaction: Partial<ChatInputCommandInteraction> = {
    user: { id: '123456789012345678' } as any,
    options: {
      getSubcommand: () => sub,
      getString: (name: string) => (name === 'steam_id' ? opts.steam_id ?? 'myVanity' : null),
    } as any,
    deferReply: deferReply as any,
    editReply: editReply as any,
    reply: reply as any,
    isRepliable: () => true,
  };

  return {
    interaction: interaction as ChatInputCommandInteraction,
    spies: { deferReply, editReply, reply },
  };
}

describe('handleAccount (REST-style steam mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No USE_FAKE_STEAM env needed anymore
  });

  it('handles /account link: defers and edits with linked message', async () => {
    const { interaction, spies } = makeInteraction('link', { steam_id: 'myVanity' });

    await handleAccount(interaction);

    expect(spies.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(spies.editReply).toHaveBeenCalledTimes(1);

    const arg = spies.editReply.mock.calls[0][0] as string;
    expect(arg).toMatch(/^Linked: steamId64=76561198000000001/);
    expect(arg).toContain(', vanity=myVanity');
  });

  it('handles /account status: replies with owned games count (from REST mock)', async () => {
    const { interaction, spies } = makeInteraction('status');

    await handleAccount(interaction);

    expect(spies.reply).toHaveBeenCalledTimes(1);
    const arg = spies.reply.mock.calls[0][0] as { content: string; ephemeral?: boolean };
    expect(arg.ephemeral).toBe(true);
    expect(arg.content).toBe('Owned games: 10');
  });

  it('handles /account unlink: replies ephemeral confirmation', async () => {
    const { interaction, spies } = makeInteraction('unlink');

    await handleAccount(interaction);

    expect(spies.reply).toHaveBeenCalledTimes(1);
    const arg = spies.reply.mock.calls[0][0] as { content: string; ephemeral?: boolean };
    expect(arg.ephemeral).toBe(true);
    expect(arg.content).toMatch("Unlinked (fake, nothing happens right now XD).");
  });

  it('handles unknown subcommand: replies with "Unknown subcommand."', async () => {
    const { interaction, spies } = makeInteraction('nope');

    await handleAccount(interaction);

    expect(spies.reply).toHaveBeenCalledTimes(1);
    const arg = spies.reply.mock.calls[0][0] as { content: string };
    expect(arg.content).toBe('Unknown subcommand.');
  });
});
