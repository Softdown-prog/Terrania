import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/**
 * vine-snake: ficha do Centro (Gruta das Raízes). Camuflada de cipó, avança de surpresa e morde com veneno fraco. Números de docs/BESTIARIO_CENTRO.md (vida 34,
 * dano 8, 14 de experiência).
 */
export const vineSnake = {
  name: "Cobra-Cipó", maxHp: 34, contactDamage: 8, experience: 14,
  nature: "physical", special: "weak-venom", speed: 80, range: 24, interval: 1,
  status: "weak-venom", statusSeconds: 4, region: "center", caveThemes: ["verdant"],
  biomes: ["woodland", "trail"],
  loot: [{ item: "Pele de Cipó", chance: .5 }, { item: "Presa de Cobra-Cipó", chance: .25 }],
} satisfies CreatureDefinition;

/** Ondula e se joga contra o herói de uma vez (a emboscada): investida mais rápida que a dos outros do Centro. */
export const vineSnakeBehavior = { gait: "slither", pursuit: "rush", cadence: 1.4, weave: .24 } satisfies SpeciesBehavior;
