export type WeaponId = "starter" | "forge";

export interface WeaponLoadout {
  readonly forged: boolean;
  readonly equipped: WeaponId;
}

export const WEAPONS = {
  starter: { name: "Espada de viagem", damage: 1, interval: 1.6 },
  forge: { name: "Espada da Travessia", damage: 2, interval: 2 },
} as const;

export const FORGE_SWORD_PRICE = 5;
