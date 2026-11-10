import type { CreatureDefinition } from "../types.ts";
import { southRareDrop } from "./rareLoot.ts";

/** dune-scorpion: ficha da região Sul. */
export const duneScorpion = {
    name: "Escorpião das Dunas", maxHp: 150, contactDamage: 26, experience: 120,
    nature: "physical", special: "venom", speed: 92, range: 27, interval: .83,
    status: "poison", statusSeconds: 6, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Ferrão Quitinoso", chance: .55 }, { item: "Veneno Destilado", chance: .25 }, { item: "Carapaça Seca", chance: .5 }, southRareDrop("dune-scorpion")],
} satisfies CreatureDefinition;
