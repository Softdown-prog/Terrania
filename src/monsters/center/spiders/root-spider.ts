import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/**
 * root-spider: ficha do Centro (Gruta das Raízes). A mordida carrega veneno fraco e a teia deixa o herói lento por um instante (ver `special: "web"`
 * em `RegionalMonster`). Números de docs/BESTIARIO_CENTRO.md (vida 38, dano 7, 15 de experiência).
 */
export const rootSpider = {
  name: "Aranha das Raízes", maxHp: 38, contactDamage: 7, experience: 15,
  nature: "physical", special: "web", speed: 70, range: 26, interval: .95,
  status: "weak-venom", statusSeconds: 3, region: "center", caveThemes: ["verdant"],
  biomes: ["woodland", "trail"],
  loot: [{ item: "Fio de Teia", chance: .5 }, { item: "Presa de Aranha", chance: .25 }],
} satisfies CreatureDefinition;

/** Anda de lado, com cuidado, e cerca o herói (a aranha não corre: ela fecha o caminho). */
export const rootSpiderBehavior = { gait: "scuttle", pursuit: "cautious", cadence: 1.5, weave: .3 } satisfies SpeciesBehavior;
