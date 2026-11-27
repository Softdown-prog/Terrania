import { hash2 } from "./random.ts";

/**
 * Câmaras laterais e atalhos da Masmorra das Raízes (ADR 0102). A planta de sempre é uma fila de cinco salas ligadas uma à próxima; aqui entram, só nas grutas verdes
 * do Centro, **tocas** (salas pequenas fora do caminho, cada uma ligada à sala mais próxima por um corredor de 3 tiles, com um guardião dentro) e **atalhos** (um segundo corredor
 * entre duas salas, que dá mais de um jeito de ir de um canto ao outro). Quanto mais fundo o andar, mais tocas e mais atalhos. É só geometria determinística; quem escava é
 * `CaveFloor` e quem põe o guardião é `CaveRoom`.
 */
export interface SideChamber {
  /** Posição fixa no pool (0 a 3); entra no id do guardião. */
  readonly index: number;
  readonly name: string;
  /** Centro e raios da sala oval, em tiles. */
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  /** Índice (na fila das cinco salas principais) da sala a que o corredor se liga. */
  readonly joinsRoom: number;
}
export interface Shortcut { readonly fromRoom: number; readonly toRoom: number }

/** Posições das quatro tocas: longe das salas principais e da saída. */
const POOL: readonly SideChamber[] = [
  { index: 0, name: "Toca Leste", x: 36, y: 22, rx: 4, ry: 3, joinsRoom: 0 },
  { index: 1, name: "Toca Noroeste", x: 5, y: 15, rx: 3, ry: 3, joinsRoom: 4 },
  { index: 2, name: "Toca do Telhado", x: 37, y: 5, rx: 3, ry: 3, joinsRoom: 2 },
  { index: 3, name: "Toca Sudoeste", x: 6, y: 24, rx: 3, ry: 3, joinsRoom: 0 },
];
const ATALHOS: readonly (readonly Shortcut[])[] = [
  [],
  [{ fromRoom: 0, toRoom: 2 }],
  [{ fromRoom: 0, toRoom: 2 }, { fromRoom: 1, toRoom: 3 }],
  [{ fromRoom: 0, toRoom: 2 }, { fromRoom: 1, toRoom: 3 }, { fromRoom: 1, toRoom: 4 }],
];

/** Quantas tocas há no andar `floorIndex` (1 em diante): o andar 1 tem 2, o 2 tem 3 e do 3 em diante as 4. */
export function sideChamberCount(floorIndex: number): number {
  if (!Number.isInteger(floorIndex) || floorIndex < 1) return 0;
  return Math.min(POOL.length, floorIndex + 1);
}

/** As tocas do andar, com pequeno desvio por sorteio para a planta não ser idêntica em toda gruta (a posição nunca sai da faixa segura). */
export function sideChambersFor(floorIndex: number, salt: number): readonly SideChamber[] {
  return POOL.slice(0, sideChamberCount(floorIndex)).map((base, i) => {
    return { ...base, x: base.x + Math.floor(hash2(i, 41, salt) * 3) - 1, y: base.y + Math.floor(hash2(i, 43, salt) * 3) - 1 };
  });
}

/** Os atalhos do andar: nenhum no 1, mais um a cada andar até três. */
export function shortcutsFor(floorIndex: number): readonly Shortcut[] {
  if (!Number.isInteger(floorIndex) || floorIndex < 1) return [];
  return ATALHOS[Math.min(ATALHOS.length - 1, floorIndex - 1)]!;
}
