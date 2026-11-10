/** Vocabulário das montarias. Mora em `world` para que as histórias (`mountQuests.ts`)
 * não dependam de `actors`; `actors/MountCatalog.ts` reexporta estes nomes para quem já os importa de lá.
 */
export const MOUNT_IDS = [
  "warhorse", "mountain-goat", "imperial-elk", "fire-lion", "sand-basilisk",
  "cavern-bear", "silver-unicorn", "dark-griffin", "cargo-beetle", "tidal-hippocampus",
] as const;
export type MountId = typeof MOUNT_IDS[number];
