import type { MountId } from "../../world/mountIds.ts";

/**
 * Montarias que o Domador Rukh vende no Poço Negro (ADR 0028), com o preço em Terrania Gold. Só dados.
 * O Escaravelho de Carga (tier 1, nível 30) custa 4 Cripta Coin e 50 Terrania Gold; o Lagarto das
 * Areias (tier 2, nível 40) custa 12 Cripta Coin. A compra já inclui a sela; para montar, o herói
 * precisa do nível, do cercado e da Cavalaria da montaria (treinados com Eron), como sempre.
 */
export interface MountSale {
  readonly id: MountId;
  readonly price: number;
}
export const SOUTH_MOUNT_SALES: readonly MountSale[] = [
  { id: "cargo-beetle", price: 450 },
  { id: "sand-basilisk", price: 1_200 },
];
