import { getTwitchService } from "../integrations/igdb/index.js";
import * as db from '../model/index.js';



export const sanitizeGameName=(raw: string): string =>{
  const junkPatterns = [
    /\bgoty\b/gi,
    /\bgame\s*of\s*the\s*year\b/gi,
    /\benhanced\s*edition\b/gi,
    /\banniversary\s*edition\b/gi,
    /\bultimate\s*edition\b/gi,
    /\bplatinum\s*edition\b/gi,
    /\bdefinitive\s*edition\b/gi,
    /\bcomplete\s*edition\b/gi,
    /\bremastered\b/gi,
    /\bremaster\b/gi,
    /\breloaded\b/gi,
    /\bredemption\b edition/gi, // optional
    /\bhd\s*collection\b/gi,
    /\bcollection\b/gi,
    /\bedition\b/gi,
    /\bpack\b/gi,
    /\bupgrade\b/gi,
  ];

  let name = raw;
  for (const pat of junkPatterns) {
    name = name.replace(pat, "");
  }
  // remove registered
    name= name.replace(/\u00AE/g, "");



  // collapse whitespace, trim
  name = name.replace(/\s+/g, " ").trim();

  return name;
}

export async function enrichGameRatings(limit: number = 50) {
    const igdb = getTwitchService();

    const missing = await db.getMissingRating(limit)
    for (const g of missing) {
        const rating = await igdb.searchGamesByName(sanitizeGameName(g.name));
        
        if (rating.length == 0) {
            console.log(`No rating found for ${g.name}`);
            continue;
        }

        if (rating[0].name == g.name) {
            const ranking:db.Ranking= {
                rating: rating[0].total_rating ?? rating[0].aggregated_rating ?? null,
                rating_updated_at: new Date()
            };
            await db.updateGameRankings(g.app_id, ranking);
        }
    }
}