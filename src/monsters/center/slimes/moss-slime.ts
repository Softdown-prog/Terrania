import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/**
 * moss-slime: ficha do Centro (Gruta das Raízes). Parente úmido do slime: mais vida, mais lento, e o contato deixa o herói lento por um instante. Números de
 * docs/BESTIARIO_CENTRO.md (vida 30, dano 5, 10 de experiência). A poça que reduz a velocidade do chão fica para quando o terreno aceitar efeito de criatura.
 */
export const mossSlime = {
  name: "Slime de Musgo", maxHp: 30, contactDamage: 5, experience: 10,
  nature: "physical", special: "none", speed: 46, range: 22, interval: .9,
  status: "slow", statusSeconds: 2, region: "center", caveThemes: ["verdant"],
  biomes: ["woodland", "trail"],
  loot: [{ item: "Gel Esverdeado", chance: .6 }, { item: "Musgo Úmido", chance: .3 }],
} satisfies CreatureDefinition;

/** Rasteja de frente, sem rodeio e sem pressa: mais lento que o rato e a cobra. */
export const mossSlimeBehavior = { gait: "crawl", pursuit: "direct", cadence: 1.02, weave: .08 } satisfies SpeciesBehavior;
