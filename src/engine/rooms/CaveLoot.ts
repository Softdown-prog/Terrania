import type { CreatureKind } from "../../actors/CreatureCatalog.ts";
import { rollCoinDrop } from "../character/coins/index.ts";
import type { LootDrop } from "../character/loot.ts";

/**
 * O que uma criatura deixa no chão da caverna ao cair, na posição dela (a mesma regra da superfície, ADR 0084): gel, se é slime, e as moedas de toda criatura
 * (o chefe do último andar deixa o baú). O herói recolhe ao chegar perto, e o que sobrar é recolhido ao sair da caverna ou trocar de andar.
 */
export function caveDefeatDrops(kind: CreatureKind, id: string, x: number, y: number): LootDrop[] {
  const drops: LootDrop[] = [];
  if (kind === "slime") drops.push({ id, item: "gel", x, y });
  drops.push({ id: id + ":coin", item: "coin", x, y, amount: rollCoinDrop(kind, id, { boss: id.endsWith(":boss") }) });
  return drops;
}
