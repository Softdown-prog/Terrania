import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/**
 * wild-boar: ficha do Centro. Primeiro bicho "médio" do jogo: mora nas matas e nos campos longe da vila e investe em linha reta. Números de
 * docs/BESTIARIO_CENTRO.md (vida 110, dano 14, 45 de experiência). Só superfície: as cavernas do Centro não têm javali.
 */
export const wildBoar = {
  name: "Javali Selvagem", maxHp: 110, contactDamage: 14, experience: 45,
  nature: "physical", special: "none", speed: 92, range: 26, interval: 1.2,
  status: null, statusSeconds: 0, region: "center", caveThemes: [],
  biomes: ["meadow", "woodland"],
  loot: [{ item: "Presa de Javali", chance: .5 }, { item: "Couro Grosso", chance: .35 }, { item: "Carne de Javali", chance: .3 }],
} satisfies CreatureDefinition;

/** Galope curto e investida direta (`rush`), quase sem desvio: o javali vem de frente. */
export const wildBoarBehavior = { gait: "gallop", pursuit: "rush", cadence: 1.1, weave: .02 } satisfies SpeciesBehavior;
