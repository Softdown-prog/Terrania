export const BASE_MAX_HP = 100;
export const MAX_LEVEL = 70;

export function experienceForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL)
    throw new RangeError("Nível fora do limite");
  return 15 * level * (level - 1);
}

export const MAX_EXPERIENCE = experienceForLevel(MAX_LEVEL);

export function normalizeExperience(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? Math.min(MAX_EXPERIENCE, value) : 0;
}

export function levelForExperience(experience: number): number {
  let level = 1;
  while (level < MAX_LEVEL && experience >= experienceForLevel(level + 1)) level++;
  return level;
}

export function maxHpForExperience(experience: number): number {
  return BASE_MAX_HP + (levelForExperience(experience) - 1) * 10;
}

export interface ExperienceProgress {
  readonly level: number;
  readonly earned: number;
  readonly needed: number;
}

export function experienceProgress(experience: number): ExperienceProgress {
  const level = levelForExperience(experience);
  const minimum = experienceForLevel(level);
  return {
    level,
    earned: experience - minimum,
    needed: level === MAX_LEVEL ? 0 : experienceForLevel(level + 1) - minimum,
  };
}

/** Called only after the simulation has credited a kill. */
export function grantExperience(current: number, reward: number,
  hero: { hp: number; maxHp: number }): number {
  const next = Math.min(MAX_EXPERIENCE, current + reward);
  const maxHp = maxHpForExperience(next);
  if (maxHp > hero.maxHp) {
    hero.hp = Math.min(maxHp, hero.hp + (maxHp - hero.maxHp));
    hero.maxHp = maxHp;
  }
  return next;
}
