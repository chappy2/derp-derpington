import { describe, it, expect, vi } from 'vitest';
import type { ChatInputCommandInteraction } from 'discord.js';
import { handleTeams } from '../src/bot';

// Small helper to build a minimal mocked interaction
function makeTeamsInteraction(anzahl: number, spielerCsv: string) {
  const reply = vi.fn(); // spy
  const interaction: Partial<ChatInputCommandInteraction> = {
    commandName: 'teams',
    isChatInputCommand: () => true,
    options: {
      getInteger: (name: string, required?: boolean) => {
        if (name !== 'anzahl') throw new Error('unexpected option name');
        return anzahl;
      },
      getString: (name: string, required?: boolean) => {
        if (name !== 'spieler') throw new Error('unexpected option name');
        return spielerCsv;
      },
      // The rest of the OptionResolver API isn't needed for these tests
    } as any,
    reply: reply as any,
  };

  return { interaction: interaction as ChatInputCommandInteraction, reply };
}

describe('handleTeams', () => {
  it('replies ephemeral error if too few players', async () => {
    const { interaction, reply } = makeTeamsInteraction(3, 'Alice, Bob, Charlie, Dave'); // need >= 6

    await handleTeams(interaction);

    expect(reply).toHaveBeenCalledTimes(1);
    const arg = reply.mock.calls[0][0];
    // For ephemeral error we pass an object { content, ephemeral: true }
    expect(typeof arg).toBe('object');
    expect(arg).toMatchObject({ ephemeral: true });
    // content contains error message
    // @ts-expect-error narrowing for test
    expect(arg.content).toMatch(/Zu wenige Spieler/i);
  });

  it('replies with team listing for valid input', async () => {
    const { interaction, reply } = makeTeamsInteraction(
      2,
      'Alice, Bob, Charlie, Dave, Eve, Frank'
    );

    await handleTeams(interaction);

    expect(reply).toHaveBeenCalledTimes(1);
    const firstArg = reply.mock.calls[0][0];

    // In the success path, your code replies with a string
    expect(typeof firstArg).toBe('string');
    const text = String(firstArg);

    expect(text).toMatch(/\*\*Team 1:\*\*/);
    expect(text).toMatch(/\*\*Team 2:\*\*/);

    // each player appears exactly once
    for (const p of ['Alice','Bob','Charlie','Dave','Eve','Frank']) {
      const matches = text.match(new RegExp(`\\b${p}\\b`, 'g')) || [];
      expect(matches.length).toBe(1);
    }
  });
});
