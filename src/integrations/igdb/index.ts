export * from './service.js';
export * from './types.js';


import { TwitchHttpService } from "./service.js";
import { ITwitchService } from "./types.js";


export function getTwitchService(): ITwitchService {
  return new TwitchHttpService(); // requires STEAM_API_KEY
}


/*

(async () => {
  const igdb = new IGDBHttpService();
  const { game, rating, source } = await igdb.getBestRatingFor("Enshrouded");

  if (!game) {
    console.log("Game not found");
    return;
  }

  console.log(`Matched: ${game.name} (id=${game.id}, slug=${game.slug})`);
  if (rating != null) {
    console.log(`Rating (${source}): ${Math.round(rating)} / 100`);
  } else {
    console.log("No rating available yet.");
  }
})();

*/