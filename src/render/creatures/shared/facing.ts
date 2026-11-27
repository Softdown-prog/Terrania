import type { RegionalCreatureKind } from "../../../actors/CreatureCatalog.ts";
import { visualKey, type VisualState } from "../../lighting/visualKey.ts";

/**
 * Para que lado cada espécie "de perfil" é desenhada: -1 olha para a esquerda, 1 para a direita. Quem não está aqui é desenhado de frente (ou de cima) e não
 * precisa virar. Quando a criatura anda para o lado contrário ao do desenho, o corpo é espelhado: assim ela anda de frente, não de lado nem de costas.
 */
export const NATURAL_FACING = {
  "giant-rat": -1, "root-spider": -1, "root-beetle": -1, "vine-snake": -1, "wild-boar": -1, "gray-wolf": -1, "living-root": -1, "elder-cave-ent": -1,
  "dune-rat": -1, "horned-viper": -1, "carrion-vulture": -1, "storm-serpent": -1, "magma-salamander": -1,
  "glacial-wolf": 1, "summit-griffin": 1, "tundra-mammoth": 1, "runic-polar-bear": 1,
} as const satisfies Partial<Record<RegionalCreatureKind, -1 | 1>>;

export interface FacingState extends VisualState { readonly facing?: number }

/** O desenho precisa ser espelhado? Só as espécies de perfil, quando a criatura olha para o lado contrário ao do desenho. */
export function mirrored(actor: FacingState): boolean {
  const natural = (NATURAL_FACING as Readonly<Record<string, -1 | 1>>)[actor.kind];
  return natural !== undefined && (actor.facing === -1 || actor.facing === 1) && actor.facing !== natural;
}

/** A chave do quadro iluminado: o estado de sempre mais o espelhamento (o quadro espelhado é outro quadro, e a luz continua vindo do mesmo lado). */
export const facingKey = (actor: FacingState, time: number): string => visualKey(actor, time) + (mirrored(actor) ? "|espelhado" : "");

/** Pinta o corpo espelhado quando for o caso (a sombra e a barra de vida ficam fora, como estão). */
export function paintFacing(actor: FacingState, ctx: CanvasRenderingContext2D, paint: () => void): void {
  if (!mirrored(actor)) { paint(); return; }
  ctx.save(); ctx.scale(-1, 1); paint(); ctx.restore();
}
