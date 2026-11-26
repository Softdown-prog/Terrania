import type { HeroDrawContext } from "./context.ts";

/** Três tons de uma cor, do claro ao escuro (a rampa do contrato de arte). */
export interface ToneRamp { readonly light: string; readonly mid: string; readonly dark: string }

/**
 * A aparência de uma vocação (ADR 0067): as cores da túnica e das mangas e as peças que o Cavaleiro não tem. O corpo, o andar, o
 * rosto e a respiração são os mesmos de todos os heróis; a aparência troca só o que se veste. Sem aparência, é o Cavaleiro.
 */
export interface HeroLook {
  readonly tunic: ToneRamp;
  readonly sleeve: string;
  readonly cuff: string;
  /** Barra da túnica por cima das pernas. */
  readonly robe: (ctx: CanvasRenderingContext2D, c: HeroDrawContext) => void;
  /** Manto atrás do corpo (de frente) ou por cima dele (de costas). */
  readonly cloak: (ctx: CanvasRenderingContext2D, c: HeroDrawContext) => void;
  /** Detalhes do tronco, no mesmo referencial inclinado da túnica. */
  readonly torso: (ctx: CanvasRenderingContext2D, c: HeroDrawContext) => void;
  /** O que vai na cabeça, por cima do cabelo. */
  readonly hat: (ctx: CanvasRenderingContext2D, c: HeroDrawContext) => void;
  /** A cabeça do personagem (cabelo, rosto): se a vocação tem a sua, ela substitui a do Cavaleiro (o rosto, o cabelo e o rabo de cavalo). */
  readonly head?: (ctx: CanvasRenderingContext2D, c: HeroDrawContext) => void;
}
