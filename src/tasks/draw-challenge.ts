import { ChatInputCommandInteraction } from "discord.js";
import { faker } from '@faker-js/faker';
import { randomItem } from "../utils";

export const DEFAULT_COUNT = 2;
export const RUBRIKEN = ["TIERWESEN", "ORT"];

export const ORTE = [
  "Wald",
  "Stadt",
  "Dorf",
  "Höhle",
  "Wüste",
  "Gebirge",
  "Vulkan",
  "Insel",
  "Raumschiff",
  "Unterwasserwelt",
  "Geisterwald",
  "Fabrik",
  "Burg",
  "Bibliothek",
  "Schloss",
  "Tempel",
  "Labor",
  "Arena",
  "Sumpf",
  "Dschungel",
  "Himmel",
  "Parallelwelt",
  "Verlassene Mine",
];


export const handleDrawChallenge = async (interaction: ChatInputCommandInteraction) => {
  console.log("🔥 draw-challenge command received");

  let rubrikInput = (interaction as any).options.get("rubrik")?.value as string | undefined;
  let anzahlInput = ((interaction as any).options.get("anzahl")?.value as number) | DEFAULT_COUNT;

  if (!rubrikInput) {
    // can be empty
    rubrikInput = randomItem(RUBRIKEN)
  }
  let answer = ""
  switch (rubrikInput.toLocaleUpperCase()) {
    case RUBRIKEN[0]:
      const animals = []
      for (let i = 0; i < anzahlInput; i++) {
        const animal = faker.animal.type();    // z. B. "dog"
        animals.push(animal);
      }
      answer = "Male mir dieses Tierwesen: " + animals.join(", ");
      break
    case RUBRIKEN[1]:
      answer = `Male mir diesen Ort: ${randomItem(ORTE)}`;
      break
    default:
      answer = `Aus irgendeinem Grund kann ich mir keine Mal- oder Zeichen-Challenge vorstellen.`;
      break

  }


  await interaction.reply(answer);
}

