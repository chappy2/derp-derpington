import { getSteamService } from "./integrations/steam/index.js";
import * as db from './integrations/db/index.js';


// simple background enrichment
export async function enrichMissingGames(limit:number=50) {
      const steam = getSteamService(); 
      const missing=await db.getMissing(limit)
      for (const g of missing){
        const details=await steam.getAppDetails(g.app_id)
        await db.updateGameDetails(g.app_id,details)
      }  
}
