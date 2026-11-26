import { BREEZE_HAT } from "./breeze-hat.ts";
import { BREEZE_ROBE } from "./breeze-robe.ts";
import { BREEZE_TROUSERS } from "./breeze-trousers.ts";
import { BREEZE_BOOTS } from "./breeze-boots.ts";
import { BREEZE_TOME } from "./breeze-tome.ts";
import { BREEZE_RING } from "./breeze-ring.ts";
import { BREEZE_NECKLACE } from "./breeze-necklace.ts";

/**
 * O conjunto da Brisa (ADR 0080, lote B1 das roupas do Mago; lista em `docs/MAGO_ROUPAS.md`): o do cajado da Brisa, do vento, liberado no nível 10. Defesa total
 * 2 (túnica 1 e calça 1), mana máxima +2% no chapéu, recarga +2% no colar e dano +1% no anel. Uma peça por arquivo (regra do dono); este arquivo só as reúne.
 */
export const BREEZE_GEAR = {
  "breeze-hat": BREEZE_HAT,
  "breeze-robe": BREEZE_ROBE,
  "breeze-trousers": BREEZE_TROUSERS,
  "breeze-boots": BREEZE_BOOTS,
  "breeze-tome": BREEZE_TOME,
  "breeze-ring": BREEZE_RING,
  "breeze-necklace": BREEZE_NECKLACE,
} as const;
