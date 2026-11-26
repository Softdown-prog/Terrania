import { APPRENTICE_HAT } from "./apprentice-hat.ts";
import { APPRENTICE_ROBE } from "./apprentice-robe.ts";
import { APPRENTICE_TROUSERS } from "./apprentice-trousers.ts";
import { APPRENTICE_BOOTS } from "./apprentice-boots.ts";
import { APPRENTICE_NOTEBOOK } from "./apprentice-notebook.ts";
import { BRASS_RING } from "./brass-ring.ts";
import { DULL_CRYSTAL_PENDANT } from "./dull-crystal-pendant.ts";

/**
 * O conjunto do Aprendiz (ADR 0078, lote A1 das roupas do Mago; lista em `docs/MAGO_ROUPAS.md`): as sete peças com que todo Mago nasce, no nível 1. Uma peça
 * por arquivo (regra do dono); este arquivo só as reúne, na ordem do desenho (chapéu, túnica, calça, botas, livro, anel e colar).
 */
export const APPRENTICE_GEAR = {
  "apprentice-hat": APPRENTICE_HAT,
  "apprentice-robe": APPRENTICE_ROBE,
  "apprentice-trousers": APPRENTICE_TROUSERS,
  "apprentice-boots": APPRENTICE_BOOTS,
  "apprentice-notebook": APPRENTICE_NOTEBOOK,
  "brass-ring": BRASS_RING,
  "dull-crystal-pendant": DULL_CRYSTAL_PENDANT,
} as const;
