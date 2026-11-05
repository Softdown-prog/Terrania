import type { Player } from '../actors/Player.ts';
import type { Inventory } from '../engine/Inventory.ts';
import type { Npc } from '../world/npcs.ts';
import type { AelaQuestProgress } from '../world/aelaQuest.ts';
import type { BattleCreature } from '../engine/ClassicBattleList.ts';

export interface Preferences {
  zoom: number;
  effects: boolean;
  cameraMotion: boolean;
}

/** The simulation knows this port, never Angular components or DOM panels. */
export interface GameUi {
  readonly menuOpen: boolean;
  loadPreferences(): Preferences;
  onPreferences(callback: (preferences: Preferences) => void): void;
  onNewWorld(callback: () => void): void;
  onTalk(callback: () => void): void;
  onPotionUse(callback: () => string): void;
  updateInventory(inventory: Inventory, online: boolean): void;
  update(player: Player, quest: AelaQuestProgress): void;
  setOnline(online: boolean): void;
  setStatus(status: string): void;
  setClassicMode(enabled: boolean): void;
  setCombatTarget(label: string | null): void;
  onStopCombat(callback: () => void): void;
  onBattleSelect(callback: (id: string) => void): void;
  setBattleCreatures(creatures: readonly BattleCreature[], targetId: string | null): void;
  setSeed(seed: number): void;
  setPlayerCount(count: number, online: boolean): void;
  setNearbyNpc(npc: Npc | null): void;
  showNpcDialogue(name: string, role: string, lines: readonly string[]): void;
  setInterior(name: string): void;
}
