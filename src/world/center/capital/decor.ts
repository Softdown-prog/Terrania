import { hash2 } from "../../random.ts";
import { CAPITAL_BUILT } from "./buildings.ts";
import { CAPITAL, CAPITAL_TILE } from "./layout.ts";
import { CAPITAL_PLOTS } from "./plots.ts";
import type { CapitalProp } from "./props.ts";

/**
 * Vida na capital (ADR 0106): postes de lampião ao longo das duas avenidas, bancos em volta da Praça dos Povos e árvores nos terrenos que ainda não têm edifício. Tudo sai da planta,
 * sem sorteio de verdade (só `hash2` por posição), então é igual em toda semente e em toda tela. Quando um terreno ganha edifício (`CAPITAL_BUILT`), as árvores dele somem sozinhas.
 */
const tile = (lx: number): number => (CAPITAL.centerX + lx) * CAPITAL_TILE;
const row = (ly: number): number => (CAPITAL.centerY + ly) * CAPITAL_TILE;

/** Raio do tronco de uma árvore, em px: só o pé bloqueia, a copa não. */
export const TREE_TRUNK_RADIUS = 9;
/** Quanto o pé fica acima da borda de baixo do tile, em px (a base do sprite fica um pouco dentro do tile). */
const FOOT = 6;

function lamps(): CapitalProp[] {
  const out: CapitalProp[] = [];
  const add = (x: number, y: number): void => { out.push({ kind: "lamp", x: Math.round(x), y: Math.round(y), variant: 0, id: `poste-${out.length}` }); };
  // Grande Avenida (|lx| ≤ 4): dois postes por altura, nas bordas da pista, fora da praça e dos cruzamentos.
  for (const ly of [-26, -21, -13, 13, 20, 25]) { add(tile(-4) + 5, row(ly + 1) - FOOT); add(tile(5) - 5, row(ly + 1) - FOOT); }
  // Avenida dos Povos (-2 ≤ ly ≤ 2): um poste em cada borda da pista, fora da praça e da Grande Avenida.
  for (const lx of [-34, -28, -19, -14, 14, 19, 28, 34]) { add(tile(lx) + CAPITAL_TILE / 2, row(-2) + 10); add(tile(lx) + CAPITAL_TILE / 2, row(3) - FOOT); }
  return out;
}

function benches(): CapitalProp[] {
  const out: CapitalProp[] = [];
  const add = (lx: number, ly: number, variant: number): void => { out.push({ kind: "bench", x: Math.round(tile(lx) + CAPITAL_TILE / 2), y: Math.round(row(ly + 1) - FOOT), variant, id: `banco-${out.length}` }); };
  // Em volta da praça (|lx| e |ly| ≤ 11), de frente para o monumento: leste e oeste de lado, norte e sul de frente.
  for (const lx of [-9, 9]) for (const ly of [-6, 6]) add(lx, ly, lx < 0 ? 0 : 1);
  for (const lx of [-6, 6]) for (const ly of [-9, 9]) add(lx, ly, 0);
  return out;
}

function trees(): CapitalProp[] {
  const out: CapitalProp[] = [];
  const built = new Set<string>(CAPITAL_BUILT);
  for (const plot of CAPITAL_PLOTS) {
    if (built.has(plot.id)) continue;
    // Uma grade a cada 3 tiles, a 2 tiles das bordas do terreno, com o pé deslocado até 0,3 tile por posição.
    for (let ly = plot.y + 2; ly < plot.y + plot.h - 1; ly += 3) for (let lx = plot.x + 2; lx < plot.x + plot.w - 1; lx += 3) {
      const jx = (hash2(lx, ly, 6101) - .5) * .6 * CAPITAL_TILE, jy = (hash2(lx, ly, 6103) - .5) * .6 * CAPITAL_TILE;
      out.push({ kind: "tree", x: Math.round(tile(lx) + CAPITAL_TILE / 2 + jx), y: Math.round(row(ly + 1) - FOOT + jy), variant: Math.floor(hash2(lx, ly, 6107) * 3), id: `arvore-${plot.id}-${out.length}` });
    }
  }
  return out;
}

const TREES = trees();
/** Tudo o que enfeita a capital: lampiões, bancos e árvores, nesta ordem. */
export const CAPITAL_DECOR: readonly CapitalProp[] = [...lamps(), ...benches(), ...TREES];
/** As árvores (só elas bloqueiam). */
export const CAPITAL_TREES: readonly CapitalProp[] = TREES;

/** O tronco de uma árvore bloqueia quem anda: um círculo de `TREE_TRUNK_RADIUS` no pé de cada uma. Ligado à colisão do jogo (ADR 0106). */
export function capitalDecorBlocks(x: number, y: number, r: number): boolean {
  if (![x, y, r].every(Number.isFinite)) return true;
  if (x < tile(CAPITAL.minX) - 64 || x > tile(CAPITAL.maxX + 1) + 64 || y < row(CAPITAL.minY) - 64 || y > row(CAPITAL.maxY + 1) + 64) return false;
  for (const t of TREES) if (Math.abs(x - t.x) < TREE_TRUNK_RADIUS + r && Math.abs(y - t.y) < TREE_TRUNK_RADIUS + r && Math.hypot(x - t.x, y - t.y) < TREE_TRUNK_RADIUS + r) return true;
  return false;
}
