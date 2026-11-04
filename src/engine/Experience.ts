/** XP total é a fonte de verdade da progressão solo. */
export const SLIME_XP = 10;
export const MAX_LEVEL = 50;
export function experienceForLevel(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1 || level > MAX_LEVEL)
    throw new RangeError("Nível fora do limite");
  return level * (level - 1) / 2 * 30;
}
export const MAX_EXPERIENCE = experienceForLevel(MAX_LEVEL);
export function normalizeExperience(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? Math.min(MAX_EXPERIENCE, value) : 0;
}
export function levelForExperience(value: unknown): number {
  const xp = normalizeExperience(value);
  let level = 1;
  while (level < MAX_LEVEL && xp >= experienceForLevel(level + 1)) level++;
  return level;
}
export function maxHpForExperience(value: unknown): number {
  return 100 + (levelForExperience(value) - 1) * 10;
}
export function nextLevelExperience(value: unknown): number {
  return experienceForLevel(Math.min(MAX_LEVEL, levelForExperience(value) + 1));
}
