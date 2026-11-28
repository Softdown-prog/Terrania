import { LEATHER_HOOD } from "./leather-hood.ts";
import { LEATHER_JERKIN } from "./leather-jerkin.ts";
import { LEATHER_TROUSERS } from "./leather-trousers.ts";
import { LEATHER_BOOTS } from "./leather-boots.ts";
import { LEATHER_GLOVES } from "./leather-gloves.ts";
import { HORN_RING } from "./horn-ring.ts";
import { TOOTH_NECKLACE } from "./tooth-necklace.ts";

/**
 * O conjunto Couro Cru (ADR 0123, lote A6a das roupas do Arqueiro; lista em `docs/ARQUEIRO.md`): as sete peças com que todo Arqueiro nasce, no nível 1. Uma peça
 * por arquivo (regra do dono); este arquivo só as reúne, na ordem do desenho (capuz, gibão, calça, botas, luvas, anel e colar).
 */
export const LEATHER_GEAR = {
  "leather-hood": LEATHER_HOOD,
  "leather-jerkin": LEATHER_JERKIN,
  "leather-trousers": LEATHER_TROUSERS,
  "leather-boots": LEATHER_BOOTS,
  "leather-gloves": LEATHER_GLOVES,
  "horn-ring": HORN_RING,
  "tooth-necklace": TOOTH_NECKLACE,
} as const;
