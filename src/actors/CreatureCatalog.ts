/** Dados fixos da espécie. ID, posição e vida atual pertencem à instância. */
export const CREATURE_CATALOG = Object.freeze({
  slime: Object.freeze({ name: "Slime", maxHp: 2, contactDamage: 9, experience: 10 }),
});

export type CreatureKind = keyof typeof CREATURE_CATALOG;

/** Contrato de leitura usado por seleção, perseguição e projeção da Battle List. */
export interface CreatureView {
  readonly id: string;
  readonly kind: CreatureKind;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}
