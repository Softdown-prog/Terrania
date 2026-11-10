/**
 * Dez loots raros do Sul. Ordem da imagem de referência autoral 5×2.
 * Probabilidades baixas e determinísticas via rollCreatureLoot(kind, monsterId).
 * O catálogo online não representa posse nem habilita comércio.
 */
export const SOUTH_RARE_LOOT = {
  "dune-rat": {
    id: "rare-gilded-fang", name: "Dente Dourado de Roedor",
    chance: .035, description: "Presa dourada do Rato das Dunas.",
  },
  "sand-beetle": {
    id: "rare-prismatic-elytron", name: "Élitro Prismático",
    chance: .035, description: "Asa iridescente do Besouro da Areia.",
  },
  "sand-goblin": {
    id: "rare-torn-treasure-map", name: "Mapa Rasgado do Tesouro Perdido",
    chance: .025, description: "Mapa antigo do Goblin Saqueador da Areia.",
  },
  "horned-viper": {
    id: "rare-polished-viper-horn", name: "Chifre de Víbora Polido",
    chance: .035, description: "Chifre de marfim da Víbora-de-Chifre Comum.",
  },
  "dune-scorpion": {
    id: "rare-ruby-stinger", name: "Ferrão de Cristal Rubro",
    chance: .03, description: "Aguilhão de rubi do Escorpião das Dunas.",
  },
  "desert-orc": {
    id: "rare-cracked-clan-club", name: "Tacape Rachado do Chefe de Clã",
    chance: .025, description: "Clava tribal do Orc Nômade do Deserto.",
  },
  "mirage-imp": {
    id: "rare-mirage-tear", name: "Lágrima de Miragem",
    chance: .025, description: "Essência dourada do Diabrete de Miragem.",
  },
  "oasis-elf": {
    id: "rare-silver-oasis-arrow", name: "Flecha de Prata do Oásis",
    chance: .025, description: "Flecha do Elfo Patrulheiro do Oásis.",
  },
  "clay-troll": {
    id: "rare-cracked-clay-heart", name: "Coração de Argila Rachada",
    chance: .018, description: "Núcleo ancestral do Troll de Barro Seco.",
  },
  "carrion-sandworm": {
    id: "rare-sandworm-pearl", name: "Pérola do Ventre do Verme",
    chance: .012, description: "Pérola opalescente do Verme da Areia Carniceiro.",
  },
} as const;
export type SouthRareMonster = keyof typeof SOUTH_RARE_LOOT;
export type SouthRareLootId = (typeof SOUTH_RARE_LOOT)[SouthRareMonster]["id"];
export function southRareDrop(kind: SouthRareMonster): { readonly item: string; readonly chance: number } {
  const {name,chance}=SOUTH_RARE_LOOT[kind];
  return {item:name,chance};
}
export function southRareLootByName(name:string) {
  return Object.values(SOUTH_RARE_LOOT).find(item=>item.name===name)??null;
}
export function southRareLootById(id:string) {
  return Object.values(SOUTH_RARE_LOOT).find(item=>item.id===id)??null;
}
