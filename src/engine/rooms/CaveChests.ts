import { hash2 } from "../../world/random.ts";
import { MAX_WORLD_DROPS, type LootDrop } from "../character/loot.ts";
import { MAX_COINS } from "../character/coins/wallet.ts";

/**
 * Baús das tocas da masmorra (ADR 0103): um por toca, perto do guardião. O baú só abre quando o guardião está caído e o herói chega perto; abrir deixa moedas no chão (o herói as
 * recolhe como as de qualquer criatura), anota o baú como aberto no save (a mesma lista dos derrotados) e ele volta cheio depois de um tempo, no mesmo lugar, com o herói longe.
 */
export const CHEST_OPEN_DISTANCE = 30;
/** Quanto tempo um baú aberto leva para voltar cheio, em segundos de jogo (15 minutos). */
export const CHEST_RESPAWN_SECONDS = 900;
/** Distância mínima do herói para o baú reaparecer (a mesma das criaturas). */
export const CHEST_RESPAWN_DISTANCE = 170;
const idSalt = (id: string): number => [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

/** O id do guardião da toca de um baú (`…:chest:N` → `…:den:N`). */
export const guardianOf = (chestId: string): string => chestId.replace(":chest:", ":den:");
/** Se o id é de um baú de toca. */
export const isChestId = (id: string): boolean => /:chest:\d+$/.test(id);

/** Moedas do baú, em Terrania Gold: crescem 8 por andar a partir de 18, com variação de 80 % a 120 % sorteada pelo id (o mesmo baú dá sempre a mesma quantia). */
export function chestCoins(id: string, floorIndex: number): number {
  const floor = Number.isInteger(floorIndex) && floorIndex >= 1 ? floorIndex : 1;
  return Math.min(MAX_COINS, Math.max(1, Math.round((10 + 8 * floor) * (0.8 + 0.4 * hash2(idSalt(id), 13, 4451)))));
}

type Spot = { readonly x: number; readonly y: number };
export class CaveChests {
  /** Os baús fechados agora. */
  readonly standing = new Map<string, Spot>();
  /** Onde cada baú nasce (inclusive os já abertos): é para lá que ele volta. */
  private readonly spots = new Map<string, Spot>();
  private readonly opened: string[] = [];

  place(id: string, x: number, y: number): void {
    this.spots.set(id, { x, y });
    this.standing.set(id, { x, y });
  }
  /** Tira de pé os baús que o save diz que já foram abertos. */
  settle(defeated: ReadonlySet<string>): void {
    for (const id of this.spots.keys()) if (defeated.has(id)) this.standing.delete(id);
  }
  /** Abre quem está ao alcance do herói e sem guardião vivo; deixa as moedas em `drops`. */
  update(hero: Spot, monsters: ReadonlyMap<string, unknown>, drops: Map<string, LootDrop>, floorIndex: number): void {
    for (const [id, spot] of this.standing) {
      if (Math.hypot(spot.x - hero.x, spot.y - hero.y) >= CHEST_OPEN_DISTANCE || monsters.has(guardianOf(id))) continue;
      this.standing.delete(id);
      this.opened.push(id);
      if (drops.size < MAX_WORLD_DROPS) drops.set(id + ":coin", { id: id + ":coin", item: "coin", x: spot.x, y: spot.y, amount: chestCoins(id, floorIndex) });
    }
  }
  /** Os baús abertos desde a última chamada (ids), para a simulação anotar no save. */
  drainOpened(): string[] { return this.opened.splice(0); }
  /** Devolve cheios os baús cujo prazo passou (já fora da lista de abertos) e cujo lugar está longe do herói; devolve os ids que voltaram. */
  respawn(hero: Spot, defeated: ReadonlySet<string>): string[] {
    const back: string[] = [];
    for (const [id, spot] of this.spots) {
      if (this.standing.has(id) || defeated.has(id)) continue;
      if (Math.hypot(spot.x - hero.x, spot.y - hero.y) < CHEST_RESPAWN_DISTANCE) continue;
      this.standing.set(id, spot);
      back.push(id);
    }
    return back;
  }
}
