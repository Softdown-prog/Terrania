import { Injectable, signal } from '@angular/core';
import type { GameUi, HeroHudState, NearbyAction, Preferences } from '../ui/GameUi.ts';
import type { BattleCreature } from '../engine/ClassicBattleList.ts';
import type { AelaQuestProgress } from '../world/aelaQuest.ts';
import type { ExperienceProgress } from '../engine/Experience.ts';

const ACTION_LABELS: Record<NearbyAction, string> = {
  talk: 'Conversar',
  read: 'Ler',
  enter: 'Entrar',
};

@Injectable()
export class HudService implements GameUi {
  readonly status = signal('Preparando aventura…');
  readonly online = signal(false);
  readonly nearby = signal(0);
  readonly targetCombat = signal(false);
  readonly combatTarget = signal<string | null>(null);
  readonly battleCreatures = signal<readonly BattleCreature[]>([]);
  readonly battleTargetId = signal<string | null>(null);
  readonly hp = signal(100);
  readonly awaitingRespawn = signal(false);
  readonly maxHp = signal(100);
  readonly progression = signal<ExperienceProgress | null>(null, {
    equal: (previous, next) => previous === next || (previous !== null && next !== null &&
      previous.level === next.level && previous.earned === next.earned && previous.needed === next.needed),
  });
  readonly quest = signal('Proteja a clareira');
  readonly questProgress = signal('');
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
  private respawnCallback: () => void = () => {};
  private stopCombatCallback: () => void = () => {};
  private battleSelectCallback: (id: string) => void = () => {};

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
  onRespawn(callback: () => void): void { this.respawnCallback = callback; }
  onStopCombat(callback: () => void): void { this.stopCombatCallback = callback; }
  onBattleSelect(callback: (id: string) => void): void { this.battleSelectCallback = callback; }
  selectBattleCreature(id: string): void { this.battleSelectCallback(id); }
  setBattleCreatures(creatures: readonly BattleCreature[], targetId: string | null): void {
    const previous = this.battleCreatures();
    const same = creatures.length === previous.length && creatures.every((row, i) => {
      const old = previous[i];
      return old !== undefined && row.id === old.id && row.name === old.name &&
        row.hp === old.hp && row.maxHp === old.maxHp && row.distanceTiles === old.distanceTiles;
    });
    if (!same) this.battleCreatures.set(creatures);
    if (this.battleTargetId() !== targetId) this.battleTargetId.set(targetId);
  }
  stopCombat(): void { this.stopCombatCallback(); }
  newWorld(): void { this.newWorldCallback(); }
  talk(): void { this.talkCallback(); }
  usePotion(): void { this.inventoryFeedback.set(this.potionCallback()); }
  respawn(): void { this.respawnCallback(); }
  updateInventory(gel: number, potions: number, online: boolean): void {
    this.gel.set(gel); this.potions.set(potions); this.online.set(online);
  }
  setStatus(status: string): void { this.status.set(status); }
  setTargetCombat(enabled: boolean): void { this.targetCombat.set(enabled); }
  setCombatTarget(label: string | null): void { this.combatTarget.set(label); }
  setOnline(online: boolean): void { this.online.set(online); }
  setSeed(seed: number): void { this.seed.set(seed); }
  setPlayerCount(count: number, _online: boolean): void { this.nearby.set(count); }
  setNearbyAction(action: NearbyAction | null): void {
    this.talkVisible.set(action !== null);
    if (action) this.talkLabel.set(`${ACTION_LABELS[action]} (E)`);
  }
  showNpcDialogue(name: string, role: string, lines: readonly string[]): void {
    this.npcLines = lines;
    this.npcPage = 0;
    this.npcName.set(name); this.npcRole.set(role); this.updateNpcPage();
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
  updateHero(hero: HeroHudState, quest: AelaQuestProgress): void {
    this.hp.set(hero.hp); this.maxHp.set(hero.maxHp);
    this.awaitingRespawn.set(hero.awaitingRespawn);
    this.progression.set(hero.progression);
    this.quest.set(quest.completed ? 'Clareira protegida' : 'Proteja a clareira');
    this.questProgress.set(quest.completed ? 'Missão concluída ✓' : `${quest.defeated} / ${quest.goal} slimes`);
    this.questPercent.set(quest.defeated / quest.goal * 100);
    this.coords.set(`X ${hero.tileX} · Y ${hero.tileY}`);
  }
}
