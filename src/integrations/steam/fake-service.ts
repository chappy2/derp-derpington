import { faker } from "@faker-js/faker";
import { SteamOwnedGame, SteamOwnedGamesResponse, SteamResolveResult, ISteamService } from "./types";

/** --------------------------------
 * Fake client (faker) for local dev
 * --------------------------------
 * No network. Returns deterministic-ish fake data per input.
 */
function seedFrom(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
  return Math.abs(h >>> 0);
}

export class SteamFakeService implements ISteamService {
  async resolveSteamId(input: string): Promise<SteamResolveResult> {
    const steamId64 = /^\d+$/.test(input)
      ? input
      : String(76561197960265728 + seedFrom(input) % 10_000_000);
    return { steamId64, vanity: /^\d+$/.test(input) ? null : input, personaName: faker.person.firstName() };
  }

  async getOwnedGames(steamId64: string): Promise<SteamOwnedGamesResponse> {
    faker.seed(seedFrom(steamId64));
    const n = faker.number.int({ min: 8, max: 20 });

    const games: SteamOwnedGame[] = Array.from({ length: n }).map((_, i) => ({
      appid: 10_000 + i + faker.number.int({ min: 0, max: 4000 }),
      name: faker.commerce.productName(),
      playtime_forever: faker.number.int({ min: 0, max: 20_000 }),
      img_icon_url: faker.string.alphanumeric(40),
      img_logo_url: faker.string.alphanumeric(40),
    }));

    return { game_count: games.length, games };
  }
}
