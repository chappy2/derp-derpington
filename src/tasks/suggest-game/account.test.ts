import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatInputCommandInteraction } from 'discord.js';
import { handleAccount } from './account';
// --- mock faker so SteamFakeService returns deterministic counts/strings ---
vi.mock('@faker-js/faker', () => {
  return {
    faker: {
      // control all int() calls used by your fake service
      number: {
        int: vi.fn((opts?: { min?: number; max?: number }) => {
          // first call for length n in [8..20]
          if (opts?.min === 8 && opts?.max === 20) return 10; // fixed 10 owned games
          // for appid variation [0..4000]
          if (opts?.min === 0 && opts?.max === 4000) return 0;
          // for playtime [0..20000]
          if (opts?.min === 0 && opts?.max === 20000) return 100;
          // fallbacks
          return 0;
        }),
      },
      commerce: { productName: vi.fn(() => 'Test Game') },
      string: { alphanumeric: vi.fn(() => 'x'.repeat(40)) },
      datatype: { boolean: vi.fn(() => false) },
      helpers: { arrayElements: vi.fn(() => ['Co-op']) },
      person: { firstName: vi.fn(() => 'Alice') },
      date: { recent: vi.fn(() => new Date(0)) },
      seed: vi.fn(), // called by your fake service; we ignore side effects
    },
  };
});

// if your getSteamService selector lives at ../../integrations/steam and just returns the fake when called with `true`,
// we don't need to mock it. If you *do* need to force fake, uncomment the next block and adjust path:
// vi.mock('../../integrations/steam', () => {
//   const { SteamFakeService } = require('../services/steam.fake'); // adjust if you split files
//   return { getSteamService: () => new SteamFakeService() };
// });

// helper to create a minimal mocked ChatInputCommandInteraction
function makeInteraction(sub: 'link' | 'status' | 'unlink', opts: { steam_id?: string } = {}) {
  const deferReply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  const reply = vi.fn().mockResolvedValue(undefined);

  const interaction: Partial<ChatInputCommandInteraction> = {
    // minimal "user" used by status branch
    user: { id: '123456789012345678' } as any,
    // options we actually access in the handler
    options: {
      getSubcommand: (required?: boolean) => sub,
      getString: (name: string, required?: boolean) => {
        if (name === 'steam_id') return opts.steam_id ?? 'myVanity';
        return null;
      },
    } as any,
    // methods the handler calls
    deferReply: deferReply as any,
    editReply: editReply as any,
    reply: reply as any,
    // convenience flag for error handling paths (not strictly needed here)
    isRepliable: () => true,
  };

  return { interaction: interaction as ChatInputCommandInteraction, spies: { deferReply, editReply, reply } };
}

describe('handleAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USE_FAKE_STEAM = '1'; // if your getSteamService looks at this (you also pass true explicitly)
  });

  it('handles /account link: defers and edits with linked message', async () => {
    const { interaction, spies } = makeInteraction('link', { steam_id: 'myVanity' });

    await handleAccount(interaction);

    expect(spies.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(spies.editReply).toHaveBeenCalledTimes(1);

    const arg = spies.editReply.mock.calls[0][0] as string;
    expect(arg).toMatch(/^Linked \(fake\): steamId64=\d+/);
    expect(arg).toContain(', vanity=myVanity');
  });

  it('handles /account status: replies with owned games count (deterministic 10)', async () => {
    const { interaction, spies } = makeInteraction('status');

    await handleAccount(interaction);

    expect(spies.reply).toHaveBeenCalledTimes(1);
    const arg = spies.reply.mock.calls[0][0] as { content: string; ephemeral?: boolean };
    expect(arg.ephemeral).toBe(true);
    expect(arg.content).toBe('Owned games (fake): 10'); // because we mocked faker.number.int({min:8,max:20}) → 10
  });

  it('handles /account unlink: replies ephemeral confirmation', async () => {
    const { interaction, spies } = makeInteraction('unlink');

    await handleAccount(interaction);

    expect(spies.reply).toHaveBeenCalledTimes(1);
    const arg = spies.reply.mock.calls[0][0] as { content: string; ephemeral?: boolean };
    expect(arg.ephemeral).toBe(true);
    expect(arg.content).toMatch(/Unlinked \(fake noop\)\./);
  });

  it('handles unknown subcommand: replies with "Unknown subcommand."', async () => {
    // @ts-expect-error narrow types away for test
    const { interaction, spies } = makeInteraction('nope');

    await handleAccount(interaction);

    expect(spies.reply).toHaveBeenCalledTimes(1);
    const arg = spies.reply.mock.calls[0][0] as { content: string };
    expect(arg.content).toBe('Unknown subcommand.');
  });
});
