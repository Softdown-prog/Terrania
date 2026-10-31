import type { Player } from '../actors/Player.ts';
import type { Inventory } from '../engine/Inventory.ts';
import type { Npc } from '../world/npcs.ts';

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
  update(player: Player, kills: number): void;
  setOnline(online: boolean): void;
  setStatus(status: string): void;
  setSeed(seed: number): void;
  setPlayerCount(count: number, online: boolean): void;
  setNearbyNpc(npc: Npc | null): void;
  showNpcDialogue(npc: Npc, kills: number, reward?: string): void;
  setInterior(name: string): void;
}
