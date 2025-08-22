import { SteamHttpService } from "./service.js";
import { ISteamService } from "./types.js";


export function getSteamService(): ISteamService {
  return new SteamHttpService(); // requires STEAM_API_KEY
}