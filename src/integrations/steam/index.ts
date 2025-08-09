import { SteamFakeService } from "./fake-service";
import { SteamHttpService } from "./service";
import { ISteamService } from "./types";


export function getSteamService(fake=true): ISteamService {
  if (fake) {
    return new SteamFakeService();
  }
  return new SteamHttpService(); // requires STEAM_API_KEY
}