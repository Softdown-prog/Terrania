/**
 * O conjunto da Brisa (ADR 0080, lote B1 das roupas do Mago; lista em `docs/MAGO_ROUPAS.md`): o do cajado da Brisa, do vento, liberado no nível 10.
 * Defesa total 2 (túnica 1 e calça 1), mana máxima +2% no chapéu, recarga +2% no colar e dano +1% no anel. Números propostos (o dono ajusta aqui).
 * As peças são só do Mago (`heroClass`).
 */
const BREEZE = { heroClass: "mage", level: 10, set: "Brisa" } as const;

export const BREEZE_GEAR = {
  "breeze-hat": { slot: "head", name: "Chapéu de Penas", defense: 0, bonus: { mana: 2 }, ...BREEZE },
  "breeze-robe": { slot: "chest", name: "Túnica da Brisa", defense: 1, ...BREEZE },
  "breeze-trousers": { slot: "legs", name: "Calça do Vento Leve", defense: 1, ...BREEZE },
  "breeze-boots": { slot: "feet", name: "Botas de Sopro", defense: 0, ...BREEZE },
  "breeze-tome": { slot: "shield", name: "Compêndio das Brisas", defense: 0, ...BREEZE },
  "breeze-ring": { slot: "ring", name: "Anel do Sopro", defense: 0, bonus: { damage: 1 }, ...BREEZE },
  "breeze-necklace": { slot: "neck", name: "Colar de Pena e Vidro", defense: 0, bonus: { regen: 2 }, ...BREEZE },
} as const;
