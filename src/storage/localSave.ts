import { normalizeKills, type OfflineSave } from '../engine/OfflineSimulation.ts';
import { normalizeInventory } from '../engine/character/Inventory.ts';
import { normalizeDrops } from '../engine/character/loot.ts';
import { maxHpForExperience, normalizeExperience } from '../engine/character/Experience.ts';
import { hasNutrition, normalizeNutrition } from '../engine/character/Food.ts';
import { normalizeWellQuest, wellQuestStarted } from '../engine/quests/south/well/index.ts';
import { normalizeMountSave } from '../engine/mounts/MountStable.ts';
import { normalizeBank } from '../engine/character/center/bank/index.ts';
import { DEFAULT_RESPAWN_POINT, normalizeRespawnPoint } from '../engine/character/center/shrine/index.ts';
import { DEFAULT_HERO_CLASS, heroClassSheet, normalizeHeroClass, normalizeMana } from '../engine/character/classes/index.ts';
import { levelForExperience } from '../engine/character/Experience.ts';
import { MAP_VERSION } from '../world/mapSize.ts';
import { migrateMapPoint, needsMapMigration } from '../world/mapMigration.ts';

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
    const clock = typeof save.time === 'number' && Number.isFinite(save.time) && save.time > 0 ? save.time : 0;
    const bank = normalizeBank(save.bank, clock);
    const respawnPoint = normalizeRespawnPoint(save.respawnPoint);
    const heroClass = normalizeHeroClass(save.heroClass);
    const maxMana = heroClassSheet(heroClass).maxMana(levelForExperience(experience));
    const awaitingRespawn = save.awaitingRespawn === true && save.hp === 0;
    // Save do mapa antigo (ADR 0059): a posição do herói e a dos itens no chão seguem o Poço Negro para o lugar novo.
    const old = needsMapMigration(save.mapVersion), at = old ? migrateMapPoint(save.x, save.y) : { x: save.x, y: save.y };
    return { mapVersion: MAP_VERSION, seed: save.seed >>> 0, x: at.x, y: at.y,
      hp: awaitingRespawn ? 0 : Math.min(maxHpForExperience(experience), Math.max(1, save.hp)),
      ...(awaitingRespawn ? { awaitingRespawn: true } : {}),
      kills: normalizeKills(save.kills),
      // A missão da gruta usa contador separado; sem ele os saves carregados
      // voltavam sempre para 0/5 e liberavam recompensas inconsistentes.
      trainingKills: Math.min(5, normalizeKills(save.trainingKills)),
      experience,
      defeated: save.defeated.slice(-2000),
      inventory: normalizeInventory(save.inventory),
      ...(hasNutrition(normalizeNutrition(save.nutrition)) && !awaitingRespawn ?
        { nutrition: normalizeNutrition(save.nutrition) } : {}),
      drops: normalizeDrops(old ? migrateDrops(save.drops) : save.drops),
      ...(Object.keys(normalizeMountSave(save.mounts)).length ?
        { mounts: normalizeMountSave(save.mounts) } : {}),
      ...(wellQuestStarted(normalizeWellQuest(save.wellQuest)) ? { wellQuest: normalizeWellQuest(save.wellQuest) } : {}),
      // O relógio da aventura volta com o save: os juros do banco contam por ele (ADR 0063).
      ...(clock > 0 ? { time: clock } : {}),
      ...(bank.balance > 0 ? { bank } : {}),
      // O lugar onde o herói renasce (ADR 0064); só o que não é a Vila ocupa espaço.
      ...(respawnPoint !== DEFAULT_RESPAWN_POINT ? { respawnPoint } : {}),
      // Vocação do herói e a mana do Mago (ADR 0065); o Cavaleiro não ganha campo novo no save.
      ...(heroClass !== DEFAULT_HERO_CLASS ? { heroClass, ...(save.mana !== undefined ? { mana: normalizeMana(save.mana, maxMana) } : {}) } : {}) };
  } catch { return null; }
}
/** Leva os itens no chão de um save do mapa antigo para o novo; o que não é um item com posição segue como está (e `normalizeDrops` descarta). */
function migrateDrops(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((drop: unknown) => {
    if (!drop || typeof drop !== 'object') return drop;
    const d = drop as { x?: unknown; y?: unknown };
    return typeof d.x === 'number' && typeof d.y === 'number' ? { ...drop, ...migrateMapPoint(d.x, d.y) } : drop;
  });
}
export function saveLocal(save: OfflineSave): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
  catch { /* Navegador em modo restrito ou quota esgotada. */ }
}
