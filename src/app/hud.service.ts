import { Injectable, signal } from '@angular/core';
import type { Player } from '../actors/Player.ts';
import type { Inventory } from '../engine/Inventory.ts';
import type { GameUi, Preferences } from '../ui/GameUi.ts';
import { npcDialogue, type Npc } from '../world/npcs.ts';

@Injectable()
export class HudService implements GameUi {
  readonly status = signal('Preparando aventura…');
  readonly online = signal(false);
  readonly nearby = signal(0);
  readonly hp = signal(100);
  readonly maxHp = signal(100);
  readonly quest = signal('Proteja a clareira');
  readonly questProgress = signal('0 / 5 slimes');
  readonly questPercent = signal(0);
  readonly coords = signal('X 0 · Y 0');
  readonly seed = signal(842136);
  readonly gel = signal(0);
  readonly potions = signal(0);
  readonly inventoryFeedback = signal('');
  readonly talkVisible = signal(false);
  readonly talkLabel = signal('Conversar (E)');
  readonly npcName = signal('');
  readonly npcRole = signal('');
  readonly npcSpeech = signal('');
  readonly npcStep = signal('');
  readonly npcLast = signal(false);
  readonly dialogueRequested = signal(0);
  readonly preferences = signal<Preferences>({ zoom: 1.65, effects: true, cameraMotion: true });
  menuOpen = false;
  private npcLines: readonly string[] = [];
  private npcPage = 0;
  private preferencesCallback: (value: Preferences) => void = () => {};
  private newWorldCallback: () => void = () => {};
  private talkCallback: () => void = () => {};
  private potionCallback: () => string = () => '';

  loadPreferences(): Preferences {
    let saved: Partial<Preferences> = {};
    try {
      const raw: unknown = JSON.parse(localStorage.getItem('terrania-preferences-v1') ?? '{}');
      if (raw && typeof raw === 'object') saved = raw;
    } catch { /* Storage is optional. */ }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const p = {
      zoom: typeof saved.zoom === 'number' && Number.isFinite(saved.zoom) ? Math.min(2.5, Math.max(1, saved.zoom)) : innerWidth < 600 ? 1.5 : 1.65,
      effects: typeof saved.effects === 'boolean' ? saved.effects : !reduce,
      cameraMotion: typeof saved.cameraMotion === 'boolean' ? saved.cameraMotion : !reduce,
    };
    this.preferences.set(p);
    return p;
  }
  changePreferences(value: Preferences): void {
    this.preferences.set(value);
    try { localStorage.setItem('terrania-preferences-v1', JSON.stringify(value)); } catch { /* Optional. */ }
    this.preferencesCallback(value);
  }
  onPreferences(callback: (p: Preferences) => void): void { this.preferencesCallback = callback; }
  onNewWorld(callback: () => void): void { this.newWorldCallback = callback; }
  onTalk(callback: () => void): void { this.talkCallback = callback; }
  onPotionUse(callback: () => string): void { this.potionCallback = callback; }
  newWorld(): void { this.newWorldCallback(); }
  talk(): void { this.talkCallback(); }
  usePotion(): void { this.inventoryFeedback.set(this.potionCallback()); }
  updateInventory(inventory: Inventory, online: boolean): void {
    this.gel.set(inventory.gel); this.potions.set(inventory.potion); this.online.set(online);
  }
  setStatus(status: string): void { this.status.set(status); }
  setOnline(online: boolean): void { this.online.set(online); }
  setSeed(seed: number): void { this.seed.set(seed); }
  setPlayerCount(count: number, _online: boolean): void { this.nearby.set(count); }
  setNearbyNpc(npc: Npc | null): void {
    this.talkVisible.set(npc !== null);
    if (npc) this.talkLabel.set((npc.kind === 'door' ? 'Entrar' : npc.kind === 'sign' ? 'Ler' : 'Conversar') + ' (E)');
  }
  showNpcDialogue(npc: Npc, kills: number, reward?: string): void {
    this.npcLines = reward ? [...npcDialogue(npc, kills), reward] : npcDialogue(npc, kills);
    this.npcPage = 0;
    this.npcName.set(npc.name); this.npcRole.set(npc.role); this.updateNpcPage();
    // Pause synchronously; the component opens the native dialog on the next render.
    this.menuOpen = true;
    this.dialogueRequested.update(value => value + 1);
  }
  private updateNpcPage(): void {
    this.npcSpeech.set(this.npcLines[this.npcPage] ?? '');
    this.npcStep.set(`Mensagem ${this.npcPage + 1} de ${this.npcLines.length}`);
    this.npcLast.set(this.npcPage === this.npcLines.length - 1);
  }
  nextNpc(): boolean {
    if (++this.npcPage >= this.npcLines.length) return false;
    this.updateNpcPage(); return true;
  }
  setInterior(name: string): void {
    this.talkVisible.set(true); this.talkLabel.set('Sair (E)');
    this.quest.set(name); this.questProgress.set('E ou porta: sair');
    this.coords.set('Interior · Vila da Travessia');
  }
  update(player: Player, kills: number): void {
    this.hp.set(player.hp); this.maxHp.set(player.maxHp);
    this.quest.set(kills >= 5 ? 'Clareira protegida' : 'Proteja a clareira');
    this.questProgress.set(kills >= 5 ? 'Missão concluída ✓' : Math.min(kills, 5) + ' / 5 slimes');
    this.questPercent.set(Math.min(100, kills / 5 * 100));
    this.coords.set(`X ${Math.floor(player.x / 32)} · Y ${Math.floor(player.y / 32)}`);
  }
}
