import type { HeroClassId } from "../../engine/character/classes/index.ts";

/** Os textos da tela de escolha do herói (ADR 0066): uma frase e três traços por vocação. */
export interface HeroClassIntro {
  readonly tagline: string;
  readonly traits: readonly string[];
}
export const HERO_CLASS_INTRO: Readonly<Record<HeroClassId, HeroClassIntro>> = {
  knight: {
    tagline: "Guerreiro de espada e escudo, forte de perto.",
    traits: ["Combate corpo a corpo com espadas de 11 níveis", "Mais resistente, sem gastar mana", "Ideal para quem quer entrar direto na luta"],
  },
  mage: {
    tagline: "Estudioso das artes arcanas, ataca de longe com magia.",
    traits: ["Magias lançadas à distância pelo cajado", "Usa mana, que se recupera com o tempo", "Começa com o cajado de Aprendiz; outros virão"],
  },
};
export const HERO_CLASS_LOCKED = "Em breve";
export const HERO_CLASS_TITLE = "Escolha o seu herói";
export const HERO_CLASS_HINT = "Você escolhe uma vez por mundo; o herói não muda depois.";
