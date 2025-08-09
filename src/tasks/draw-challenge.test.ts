import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { ORTE, RUBRIKEN } from './draw-challenge'; 
import { CommandInteraction } from 'discord.js';
import { handleDrawChallenge } from './draw-challenge';

vi.mock('../utils', () => ({
  randomItem: vi.fn(),
}));

import { randomItem } from '../utils';

describe('handleDrawChallenge', () => {
  let mockReply: ReturnType<typeof vi.fn>;
  let interaction: Partial<CommandInteraction>;

  beforeEach(() => {
    mockReply = vi.fn();
    interaction = {
      options: {
        get: vi.fn(),
      },
      reply: mockReply,
    } as unknown as CommandInteraction;
  });

  it('generates tierwesen challenge with default count', async () => {
    // mock options
    ((interaction as any).options.get as any).mockImplementation((name: string) => {
      if (name === 'rubrik') return { value: 'tierwesen' };
      if (name === 'anzahl') return undefined;
    });

    // mock faker
    vi.spyOn(faker.animal, 'type').mockImplementationOnce(() => 'Katze').mockImplementationOnce(() => 'Hund');

    await handleDrawChallenge(interaction as CommandInteraction);

    expect(mockReply).toHaveBeenCalledWith(
      expect.stringMatching(/^Male mir dieses Tierwesen: Katze, Hund/)
    );
  });

  it('generates ort challenge with fixed item', async () => {
    ((interaction as any).options.get as any).mockImplementation((name: string) => {
      if (name === 'rubrik') return { value: 'ort' };
    });

    // mock randomItem to always return 'Dschungel'
    (randomItem as any).mockReturnValue('Dschungel');

    await handleDrawChallenge(interaction as CommandInteraction);

    expect(mockReply).toHaveBeenCalledWith(
      'Male mir diesen Ort: Dschungel'
    );
  });

  it('uses random rubrik if none provided', async () => {
    ((interaction as any).options.get as any).mockReturnValue(undefined);
    (randomItem as any).mockReturnValue('TIERWESEN');
    vi.spyOn(faker.animal, 'type').mockReturnValue('Wolf');

    await handleDrawChallenge(interaction as CommandInteraction);

    expect(mockReply).toHaveBeenCalledWith(
      expect.stringMatching(/Male mir dieses Tierwesen: /)
    );
  });

  it('falls back to default message on unknown rubrik', async () => {
    ((interaction as any).options.get as any).mockImplementation((name: string) => {
      if (name === 'rubrik') return { value: 'xyz' };
    });

    await handleDrawChallenge(interaction as CommandInteraction);

    expect(mockReply).toHaveBeenCalledWith(
      expect.stringContaining('Aus irgendeinem Grund')
    );
  });
});
