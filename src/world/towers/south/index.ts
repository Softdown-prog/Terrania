import type { TowerDefinition } from "../types.ts";
import { torreDoVigiaCaida } from "./vigia-caida.ts";
import { torreDaMiragem } from "./miragem.ts";
import { torreDoSolNegro } from "./sol-negro.ts";

/** Região Sul: só reúne as torres; cada uma vive no seu arquivo. */
export const SOUTH_TOWERS: readonly TowerDefinition[] = [torreDoVigiaCaida, torreDaMiragem, torreDoSolNegro];
