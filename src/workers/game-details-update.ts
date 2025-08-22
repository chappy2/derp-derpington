import { getSteamService } from "../integrations/steam/index.js";
import * as db from '../model/index.js';

export async function enrichGameDetails(limit:number=50) {
      const steam = getSteamService(); 
      const missing=await db.getMissingGameDetails(limit)
      for (const g of missing){
        const details=await steam.getAppDetails(g.app_id)
        await db.updateGameDetails(g.app_id,details)
      }  
}
