import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TwitchHttpService } from './service.js';

import * as dotenv from 'dotenv';

const OAUTH_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_GAMES = 'https://api.igdb.com/v4/games';

describe('TwitchHttpService', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dotenv.config();
    originalEnv = { ...process.env };
    process.env.TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || 'test_client_id';
    process.env.TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || 'test_client_secret';

    // fresh mock for each test
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      // OAuth token exchange
      if (url.startsWith(OAUTH_URL)) {
        return new Response(
          JSON.stringify({
            access_token: 'app_access_token_xyz',
            expires_in: 3600,
            token_type: 'bearer',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // IGDB /games search
      if (url.startsWith(IGDB_GAMES)) {
        const body = (init?.body ?? '').toString();
        // Very small router based on request body contents
        if (body.includes('search "Enshrouded"')) {
          return new Response(
            JSON.stringify([
              {
                id: 197347,
                name: 'Enshrouded',
                slug: 'enshrouded',
                rating: 78.2,
                rating_count: 420,
                aggregated_rating: 82.4,
                aggregated_rating_count: 35,
                total_rating: 81.1,
                total_rating_count: 455,
              },
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (body.includes('search "NoSuchGame"')) {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (body.includes('search "TieBreaker"')) {
          // No total_rating; prefer aggregated_rating over rating
          return new Response(
            JSON.stringify([
              {
                id: 999001,
                name: 'TieBreaker',
                slug: 'tiebreaker',
                aggregated_rating: 70.5,
                rating: 68.3,
              },
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        // Fallback
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it('throws if TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is missing', () => {
    delete process.env.TWITCH_CLIENT_ID;
    delete process.env.TWITCH_CLIENT_SECRET;
    expect(() => new TwitchHttpService()).toThrow(/TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET missing/i);
  });

  it('searchGamesByName: builds IGDB POST with Twitch headers and body (Enshrouded)', async () => {
    const svc = new TwitchHttpService();

    const results = await svc.searchGamesByName('Enshrouded', 5);

    // OAuth was called once
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/id\.twitch\.tv\/oauth2\/token/),
      expect.objectContaining({ method: 'POST' })
    );

    // IGDB was called with proper headers and body
    const igdbCall = fetchMock.mock.calls.find(([url]) =>
      String(url).startsWith(IGDB_GAMES)
    );
    expect(igdbCall).toBeTruthy();

    const [, igdbInit] = igdbCall!;
    expect(igdbInit?.method).toBe('POST');
    expect(igdbInit?.headers).toMatchObject({
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: expect.stringMatching(/^Bearer /),
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    });

    const body = (igdbInit?.body ?? '').toString();
    expect(body).toMatch(/\brating\b/i);
    expect(body).toMatch(/\baggregated_rating\b/i);
    expect(body).toMatch(/\btotal_rating\b/i); expect(body).toMatch(/search "Enshrouded"/);
    expect(body).toMatch(/where version_parent = null/);

    // Parsed data
    expect(results[0].name).toBe('Enshrouded');
    expect(typeof results[0].total_rating).toBe('number');
  });

  it('getBestRatingFor: prefers total_rating, then aggregated_rating, then rating', async () => {
    const svc = new TwitchHttpService();

    // total_rating present
    const a = await svc.getBestRatingFor('Enshrouded');
    expect(a.game?.name).toBe('Enshrouded');
    expect(a.source).toBe('total_rating');
    expect(typeof a.rating).toBe('number');

    // No total_rating -> aggregated_rating
    const b = await svc.getBestRatingFor('TieBreaker');
    expect(b.game?.name).toBe('TieBreaker');
    expect(b.source).toBe('aggregated_rating');
    expect(b.rating).toBeCloseTo(70.5, 1);
  });

  it('getBestRatingFor: returns null when no results', async () => {
    const svc = new TwitchHttpService();

    const out = await svc.getBestRatingFor('NoSuchGame');
    expect(out.game).toBeUndefined();
    expect(out.source).toBe('none');
    expect(out.rating).toBeNull();
  });

  it('ensureToken: reuses token and avoids extra OAuth calls until near expiry', async () => {
    const svc = new TwitchHttpService();

    // First call should trigger OAuth + IGDB
    await svc.searchGamesByName('Enshrouded', 1);

    // Second call should NOT hit OAuth again (still valid)
    await svc.searchGamesByName('Enshrouded', 1);

    const oauthCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).startsWith(OAUTH_URL)
    );
    expect(oauthCalls.length).toBe(1);
  });
});
