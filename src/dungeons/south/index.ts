import type { DungeonDefinition } from "../types.ts";
import { criptaDasDunas } from "./cripta-das-dunas.ts";
import { masmorraDoBrejo } from "./masmorra-do-brejo.ts";
import { torreMiragem } from "./torre-miragem.ts";
import { torreSolNegro } from "./torre-sol-negro.ts";
import { torreVigiaCaida } from "./torre-vigia-caida.ts";

/** Região Sul: só reúne as masmorras; cada uma vive no seu arquivo (cavernas e torres). */
export const SOUTH_DUNGEONS: readonly DungeonDefinition[] = [
  criptaDasDunas, masmorraDoBrejo, torreVigiaCaida, torreMiragem, torreSolNegro,
];
