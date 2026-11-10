import type { DungeonDefinition } from "../types.ts";
import { criptaDasDunas } from "./cripta-das-dunas.ts";
import { masmorraDoBrejo } from "./masmorra-do-brejo.ts";

/** Região Sul: só reúne as masmorras; cada uma vive no seu arquivo. */
export const SOUTH_DUNGEONS: readonly DungeonDefinition[] = [criptaDasDunas, masmorraDoBrejo];
