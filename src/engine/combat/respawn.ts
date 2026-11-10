import { CREATURE_CATALOG, type CreatureKind } from "../../actors/CreatureCatalog.ts";

/**
 * Quanto tempo uma criatura derrotada leva para voltar (ADR 0029), em segundos de jogo (o relógio da
 * aventura, que só anda enquanto se joga). Cresce com a força da espécie: um slime volta em ~75 s e
 * as criaturas mais fortes em 10 minutos. O chefe de uma masmorra volta em 30 minutos, e os slimes de
 * treino da gruta de Aela nunca voltam (a missão depende dos abates).
 */
export const MIN_RESPAWN_SECONDS = 60;
export const MAX_RESPAWN_SECONDS = 600;
export const BOSS_RESPAWN_SECONDS = 1_800;
/** Quem foi derrotado em save antigo (sem hora de volta) volta depois disto, contado do carregamento. */
export const LEGACY_RESPAWN_SECONDS = 600;
const TRAINING_SLIME = /^cave:\d+:0:0:floor:1:slime:/;

/** `null` = nunca volta. */
export function respawnSecondsForId(id: string, kind?: CreatureKind): number | null {
  if (TRAINING_SLIME.test(id)) return null;
  if (id.endsWith(":boss")) return BOSS_RESPAWN_SECONDS;
  if (!kind) return LEGACY_RESPAWN_SECONDS;
  const experience = CREATURE_CATALOG[kind].experience;
  return Math.round(Math.min(MAX_RESPAWN_SECONDS, Math.max(MIN_RESPAWN_SECONDS, MIN_RESPAWN_SECONDS + experience * 1.5)));
}
