import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/**
 * gray-wolf: ficha do Centro. Caça em matilha (nasce em grupos de dois ou três, ver `centerSurfaceSpawns`) e cerca o herói. Números de
 * docs/BESTIARIO_CENTRO.md (vida 90, dano 13, 42 de experiência). Só superfície.
 */
export const grayWolf = {
  name: "Lobo Cinzento", maxHp: 90, contactDamage: 13, experience: 42,
  nature: "physical", special: "none", speed: 98, range: 26, interval: .9,
  status: null, statusSeconds: 0, region: "center", caveThemes: [],
  biomes: ["woodland"],
  loot: [{ item: "Pele de Lobo", chance: .5 }, { item: "Presa de Lobo", chance: .3 }],
} satisfies CreatureDefinition;

/** Galopa em arco (o maior `weave` de galope do bestiário): cada lobo da matilha vai por um lado e fecha o cerco. */
export const grayWolfBehavior = { gait: "gallop", pursuit: "flank", cadence: 1.6, weave: .33 } satisfies SpeciesBehavior;
