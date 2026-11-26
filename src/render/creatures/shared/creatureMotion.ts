import type { RegionalCreatureVisual } from "../../regionalCreatures.ts";
import { clamp01, hashString } from "../../draw.ts";

/** O que o desenho de uma criatura lê do mundo, já em 0..1: nada aqui decide acerto, dano ou saque. */
export interface CreatureMotion {
  /** Semente do indivíduo (do id): pequenas variações que não mudam de um quadro para outro. */
  readonly seed: number;
  /** Fase da passada, em radianos, avançada pela distância realmente andada. */
  readonly phase: number;
  /** 0 parado, 1 andando a toda. */
  readonly moving: number;
  /** 0 a 1: preparo do golpe (a boca ou as presas abrem). */
  readonly bite: number;
  /** 0 intacto, 1 quase morto: a vida que falta. */
  readonly wound: number;
}

/** Lê o estado visual da criatura, com a vida máxima da ficha; valores fora de faixa ou inválidos viram o neutro. */
export function creatureMotion(actor: RegionalCreatureVisual, fallbackId: string, maxHp: number): CreatureMotion {
  const finite = (value: number | undefined): number => typeof value === "number" && Number.isFinite(value) ? value : 0;
  return { seed: hashString(actor.id ?? fallbackId), phase: finite(actor.motionPhase), moving: clamp01(finite(actor.moving)), bite: clamp01(finite(actor.casting)),
    wound: 1 - clamp01(finite(actor.hp) / maxHp) };
}
