/**
 * Pontos de coleta da Masmorra das Raízes (ADR 0105): tufos de cogumelo e de raiz com seiva espalhados pelos andares. O herói os colhe ao chegar perto, se tem lugar na bolsa; o material vai direto
 * para a bolsa (são os mesmos que as criaturas do Centro deixam, e vendem-se do mesmo jeito), o ponto fica anotado como colhido no save (a mesma lista dos derrotados) e brota de novo
 * depois de um tempo, no mesmo lugar, com o herói longe.
 */
export const GATHER_DISTANCE = 28;
/** Quanto tempo um ponto colhido leva para brotar de novo, em segundos de jogo (5 minutos). */
export const GATHER_RESPAWN_SECONDS = 300;
/** Distância mínima do herói para o ponto brotar de novo. */
export const GATHER_RESPAWN_DISTANCE = 140;
/** Pontos por andar e distância mínima entre dois pontos, em pixels. */
export const GATHER_PER_FLOOR = 3;
export const GATHER_MIN_SPACING = 120;

export type GatherKind = "spores" | "sap";
export interface GatherNode { readonly x: number; readonly y: number; readonly kind: GatherKind }
type Spot = { readonly x: number; readonly y: number };

/** Se o id é de um ponto de coleta (`…:herb:N`). */
export const isGatherId = (id: string): boolean => /:herb:\d+$/.test(id);
/** O tipo do ponto N do andar: o primeiro e o terceiro são de cogumelo, o do meio é de raiz. */
export const gatherKindOf = (index: number): GatherKind => index % 2 === 1 ? "sap" : "spores";
/** O que o ponto dá: os cogumelos dão Esporos de Cogumelo; a raiz dá Raiz Retorcida nos dois andares de cima e Seiva Viva dali para baixo. */
export function gatherItem(kind: GatherKind, floorIndex: number): string {
  if (kind === "spores") return "Esporos de Cogumelo";
  return Number.isInteger(floorIndex) && floorIndex <= 2 ? "Raiz Retorcida" : "Seiva Viva";
}

export class CaveGathering {
  /** Os pontos com o que colher agora. */
  readonly standing = new Map<string, GatherNode>();
  /** Onde cada ponto nasce (inclusive os colhidos): é para lá que ele volta. */
  private readonly spots = new Map<string, GatherNode>();
  private readonly taken: Array<{ readonly id: string; readonly item: string }> = [];

  place(id: string, node: GatherNode): void {
    this.spots.set(id, node);
    this.standing.set(id, node);
  }
  /** Se já há um ponto a menos de `GATHER_MIN_SPACING` de (x, y). */
  tooClose(x: number, y: number): boolean {
    for (const spot of this.spots.values()) if (Math.hypot(spot.x - x, spot.y - y) < GATHER_MIN_SPACING) return true;
    return false;
  }
  /** Tira de pé os pontos que o save diz que já foram colhidos. */
  settle(defeated: ReadonlySet<string>): void {
    for (const id of this.spots.keys()) if (defeated.has(id)) this.standing.delete(id);
  }
  /** Colhe quem está ao alcance do herói; `canTake(item)` diz se a bolsa tem lugar (sem lugar, o ponto fica como está). */
  update(hero: Spot, floorIndex: number, canTake: (item: string) => boolean): void {
    for (const [id, node] of this.standing) {
      if (Math.hypot(node.x - hero.x, node.y - hero.y) >= GATHER_DISTANCE) continue;
      const item = gatherItem(node.kind, floorIndex);
      if (!canTake(item)) continue;
      this.standing.delete(id);
      this.taken.push({ id, item });
    }
  }
  /** O que foi colhido desde a última chamada, para a simulação guardar na bolsa e anotar no save. */
  drainTaken(): Array<{ readonly id: string; readonly item: string }> { return this.taken.splice(0); }
  /** Brota de novo quem já saiu da lista dos colhidos e está longe do herói; devolve os ids. */
  respawn(hero: Spot, defeated: ReadonlySet<string>): string[] {
    const back: string[] = [];
    for (const [id, node] of this.spots) {
      if (this.standing.has(id) || defeated.has(id)) continue;
      if (Math.hypot(node.x - hero.x, node.y - hero.y) < GATHER_RESPAWN_DISTANCE) continue;
      this.standing.set(id, node);
      back.push(id);
    }
    return back;
  }
}
