/** Catálogo único e imutável de monstros: regras do protótipo solo. */
export type MonsterKind = "slime" | "wolf" | "spider";
export type MaterialKind = "gel" | "fang" | "silk";
export type MonsterAi = "hop" | "rush" | "stalk";
export interface MonsterSpec {
  readonly name: string;
  readonly hp: number;
  readonly damage: number;
  readonly speed: number;
  readonly aggroRadius: number;
  readonly contactRadius: number;
  readonly attackCooldown: number;
  readonly xp: number;
  readonly drop: MaterialKind;
  readonly ai: MonsterAi;
}
export const MONSTER_SPECIES = {
  slime: {
    name: "Slime", hp: 2, damage: 9, speed: 38,
    aggroRadius: 230, contactRadius: 24, attackCooldown: 1.2,
    xp: 10, drop: "gel", ai: "hop",
  },
  wolf: {
    name: "Lobo", hp: 3, damage: 12, speed: 66,
    aggroRadius: 290, contactRadius: 27, attackCooldown: 1.1,
    xp: 20, drop: "fang", ai: "rush",
  },
  spider: {
    name: "Aranha", hp: 2, damage: 6, speed: 50,
    aggroRadius: 250, contactRadius: 23, attackCooldown: 0.85,
    xp: 15, drop: "silk", ai: "stalk",
  },
} as const satisfies Record<MonsterKind, MonsterSpec>;
