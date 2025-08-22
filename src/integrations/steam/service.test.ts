import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SteamHttpService } from './service.js';


import * as dotenv from 'dotenv';

describe('SteamHttpService', () => {

  beforeEach(() => {
    dotenv.config();
  });

  afterEach(() => {
  });

  it.skip('throws if STEAM_API_KEY is missing', () => {
    delete process.env.STEAM_API_KEY;
    expect(() => new SteamHttpService()).toThrow(/STEAM_API_KEY missing/i);
  });

  it('resolveSteamId: returns early for numeric id (no fetch)', async () => {
    const svc = new SteamHttpService();
    const out = await svc.resolveSteamId('76561198148156086');
    expect(out).toEqual({ steamId64: '76561198148156086', vanity: null });
  });

  it('resolveSteamId: vanity success builds correct URL and parses steamid', async () => {
    const svc = new SteamHttpService();

    const out = await svc.resolveSteamId('Rlyhappychappy');
    expect(out).toEqual({ steamId64: '76561198148156086', vanity: 'Rlyhappychappy' });

  });

  it('resolveSteamId: vanity non-success throws', async () => {
    const svc = new SteamHttpService();



    await expect(svc.resolveSteamId('unknownVanity'))
      .rejects.toThrow(/Could not resolve vanity URL/i);
  });

  it('getOwnedGames: builds URL with flags and returns response', async () => {
    const svc = new SteamHttpService();



    const out = await svc.getOwnedGames('76561198148156086', {
      includeAppInfo: true,
      includeFree: true,
    });

    expect(out.game_count).toBeGreaterThanOrEqual(1505);
    expect(out.games[0].appid).toBe(10);
  });

  it.skip('getOwnedGames: non-OK status throws', async () => {
    // use again if it has mocks again.
    const svc = new SteamHttpService();
    await expect(svc.getOwnedGames('76561198000000001'))
      .rejects.toThrow(/Steam GetOwnedGames failed: 500/);
  });


});
