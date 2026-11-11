import { getTile, TILE_SIZE } from "../../terrain.ts";
import { southCityGround } from "../../southCity.ts";
import { southRuinBlocks } from "../../southRuins.ts";
import { southTowerBlocks } from "../../towers/placement.ts";
import { decorFor, mayHaveDecor } from "./placement.ts";
import type { DecorPlacement } from "./types.ts";

/** Folga (px) que a decoração mantém das ruínas e das torres, para não nascer em cima delas. */
const MARGIN = 14;

/**
 * A peça de decoração do tile (tx, ty), ou nada (ADR 0037): a colocação por bioma e posição, mais as regras de chão
 * livre (areia, sem pedra, sem árvore, fora da cidade do Poço Negro e longe de ruínas e torres). É a mesma resposta
 * para o desenho e para a colisão. Barata para quase todo tile: um hash descarta cerca de 91 % antes de consultar o terreno.
 */
export function southDecorAt(tx: number, ty: number, seed: number): DecorPlacement | null {
  if (!Number.isSafeInteger(tx) || !Number.isSafeInteger(ty) || !mayHaveDecor(tx, ty, seed)) return null;
  const tile = getTile(tx, ty, seed);
  if (tile.ground !== "sand" || tile.rock || tile.tree || southCityGround(tx, ty) !== null) return null;
  const placement = decorFor(tile.biome, tx, ty, seed);
  if (!placement) return null;
  const x = tx * TILE_SIZE + placement.x, y = ty * TILE_SIZE + placement.y;
  if (southRuinBlocks(x, y, MARGIN, seed) || southTowerBlocks(x, y, MARGIN, seed)) return null;
  return placement;
}
