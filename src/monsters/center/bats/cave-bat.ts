import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/**
 * cave-bat: ficha do Centro (Gruta das Raízes). Frágil e veloz: pouca vida, voo em zigue-zague, mordida um pouco mais forte que a do rato. Números de
 * docs/BESTIARIO_CENTRO.md (vida 24, dano 6, 11 de experiência).
 */
export const caveBat = {
  name: "Morcego de Caverna", maxHp: 24, contactDamage: 6, experience: 11,
  nature: "physical", special: "none", speed: 104, range: 22, interval: .55,
  status: null, statusSeconds: 0, region: "center", caveThemes: ["verdant"],
  biomes: ["woodland", "trail"],
  loot: [{ item: "Asa de Morcego", chance: .5 }, { item: "Guano Seco", chance: .25 }],
} satisfies CreatureDefinition;

/** Voa batendo asa e zigue-zagueia muito (o `weave` mais alto do bestiário); só some do alcance quando já está quase morto. */
export const caveBatBehavior = { gait: "flap", pursuit: "flank", cadence: 2.7, weave: .46, retreatAt: .25 } satisfies SpeciesBehavior;
