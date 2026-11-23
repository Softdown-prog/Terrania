import type { WeaponId } from "../character/Weapons.ts";

/**
 * Como o herói ataca agora (ADR 0069): o que a mira por alvo e a perseguição precisam saber. O Cavaleiro bate de perto com a espada
 * equipada; o Mago lança a magia do cajado de longe e precisa de mana. Quem decide é `OfflineSimulation.combatProfile`.
 */
export interface CombatProfile {
  /** Segundos entre um golpe e o próximo. */
  readonly interval: number;
  /** A arma da espada equipada (o alcance e o arco do Cavaleiro vêm dela). */
  readonly weapon: WeaponId;
  /** Presente só para quem ataca de longe: o alcance em pixels e se há mana para a próxima magia. */
  readonly ranged?: { readonly reach: number; readonly ready: boolean };
  /** A distância em que a perseguição para: dentro do alcance, com margem para o caminho. */
  readonly followStop: number;
}
