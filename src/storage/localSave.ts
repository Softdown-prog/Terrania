import { normalizeKills, type OfflineSave } from '../engine/OfflineSimulation.ts';
import { normalizeInventory } from '../engine/Inventory.ts';
import { normalizeDrops } from '../engine/loot.ts';
import { maxHpForExperience, normalizeExperience } from '../engine/Experience.ts';
import { hasNutrition, normalizeNutrition } from '../engine/Food.ts';
import { normalizeMountSave } from '../engine/MountStable.ts';

const SAVE_KEY = 'terrania-origins-v1';
/** Adaptador de persistência do navegador. Não deve ser usado no backend. */
export function loadLocalSave(): OfflineSave | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    if (!data || typeof data !== 'object') return null;
    const save = data as Partial<OfflineSave>;
    if (typeof save.seed !== 'number' || !Number.isFinite(save.seed) ||
      typeof save.x !== 'number' || !Number.isFinite(save.x) ||
      typeof save.y !== 'number' || !Number.isFinite(save.y) ||
      typeof save.hp !== 'number' || !Number.isFinite(save.hp) ||
      !Array.isArray(save.defeated) || !save.defeated.every(id => typeof id === 'string')) return null;
    const experience = normalizeExperience(save.experience);
    const awaitingRespawn = save.awaitingRespawn === true && save.hp === 0;
    return { seed: save.seed >>> 0, x: save.x, y: save.y,
      hp: awaitingRespawn ? 0 : Math.min(maxHpForExperience(experience), Math.max(1, save.hp)),
      ...(awaitingRespawn ? { awaitingRespawn: true } : {}),
      kills: normalizeKills(save.kills),
      experience,
      defeated: save.defeated.slice(-2000),
      inventory: normalizeInventory(save.inventory),
      ...(hasNutrition(normalizeNutrition(save.nutrition)) && !awaitingRespawn ?
        { nutrition: normalizeNutrition(save.nutrition) } : {}),
      drops: normalizeDrops(save.drops),
      ...(Object.keys(normalizeMountSave(save.mounts)).length ?
        { mounts: normalizeMountSave(save.mounts) } : {}) };
  } catch { return null; }
}
export function saveLocal(save: OfflineSave): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
  catch { /* Navegador em modo restrito ou quota esgotada. */ }
}
