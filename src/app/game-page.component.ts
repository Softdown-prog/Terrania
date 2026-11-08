import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { mountGame } from '../game/PhaserGame.ts';
import { HudService } from './hud.service.ts';
import { ItemIconComponent } from './item-icon.component.ts';
import { OnlinePlayersComponent } from './online-players.component.ts';
import { startPlayPresence } from './play-presence.ts';
import { heartbeatEndpoint } from '../net/presence.ts';
import { runtimeConfig } from './runtime-config.ts';
import { renderHero } from '../render/actors.ts';
import { drawWorldAtlas } from '../render/terrain.ts';
import { drawCaveAtlas } from '../render/cave.ts';
import { atlasFrame, GROUND_NAMES, BIOME_NAMES, sectorIndex, surveySectors, type AtlasScale } from '../world/atlas.ts';
import { REGIONS, getWorldRegion } from '../world/regions.ts';
import { getRegionDifficulty } from '../world/regionDifficulty.ts';
import { getTile } from '../world/terrain.ts';

@Component({ selector: 'app-game-page', templateUrl: './game-page.html', styleUrl: '../style.css',
  imports: [RouterLink, OnlinePlayersComponent, ItemIconComponent], providers: [HudService], changeDetection: ChangeDetectionStrategy.OnPush })
export class GamePageComponent implements AfterViewInit {
  readonly hud = inject(HudService);
  readonly notice = signal('');
  readonly fullscreenActive = signal(false);
  readonly toolsExpanded = signal(false);
  readonly battleOpen = signal(false);
  /** Optional combat hint, independent of actual target controls. */
  readonly combatHelpVisible = signal(true);
  readonly playersDialogOpen = signal(false);
  readonly inventoryOpen = signal(false);
  readonly previewDirection = signal(0);
  readonly atlasScale = signal<AtlasScale>('world');
  readonly selectedSector = signal(4);
  readonly groundNames = GROUND_NAMES;
  readonly atlasSectors = computed(() => surveySectors(this.hud.seed()));
  readonly currentAtlasSector = computed(() =>
    this.atlasSectors()[sectorIndex(this.hud.mapTile().x, this.hud.mapTile().y)]!);
  readonly currentWorldRegion = computed(() => {
    const { x, y } = this.hud.mapTile();
    return REGIONS[getWorldRegion(x, y)];
  });
  readonly currentWorldDifficulty = computed(() => {
    const { x, y } = this.hud.mapTile();
    return getRegionDifficulty(x, y).tier;
  });
  readonly currentBiomeName = computed(() => {
    const { x, y } = this.hud.mapTile();
    return BIOME_NAMES[getTile(x, y, this.hud.seed()).biome];
  });
  readonly currentAtlasGround = computed(() => {
    const { x, y } = this.hud.mapTile();
    return GROUND_NAMES[getTile(x, y, this.hud.seed()).ground];
  });
  readonly atlasView = computed(() => {
    const { x, y } = this.hud.mapTile();
    return atlasFrame(this.atlasScale(), x, y, this.selectedSector());
  });
  private previewFrame = 0;
  private previewLastDraw = 0;
  private readonly mount = viewChild.required<ElementRef<HTMLElement>>('mount');
  private readonly npcDialog = viewChild.required<ElementRef<HTMLDialogElement>>('npcDialog');
  private readonly defeatDialog = viewChild<ElementRef<HTMLDialogElement>>('defeatDialog');
  private readonly playersDialog = viewChild.required<ElementRef<HTMLDialogElement>>('playersDialog');
  private readonly inventoryDialog = viewChild.required<ElementRef<HTMLDialogElement>>('inventoryDialog');
  private readonly inventoryHero = viewChild<ElementRef<HTMLCanvasElement>>('inventoryHero');
  private readonly atlasCanvas = viewChild<ElementRef<HTMLCanvasElement>>('atlasCanvas');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  constructor() {
    effect(() => {
      if (this.hud.dialogueRequested() > 0) this.open(this.npcDialog().nativeElement);
    });
    effect(() => {
      // No map computation or Canvas work while playing or in another tab.
      if (!this.inventoryOpen() || this.hud.inventoryTab() !== 'map') return;
      const cave = this.hud.cave();
      const ctx = this.atlasCanvas()?.nativeElement.getContext('2d');
      if (!ctx) return;
      if (cave) {
        drawCaveAtlas(ctx,cave.floor,cave.tileX,cave.tileY);
      } else {
        const { x, y } = this.hud.mapTile();
        const seed = this.hud.seed();
        const scale = this.atlasScale();
        const sector = this.selectedSector();
        drawWorldAtlas(ctx, scale, x, y, seed, sector);
      }
    });
    effect(() => {
      const awaitingRespawn = this.hud.awaitingRespawn();
      const dialog = this.defeatDialog()?.nativeElement;
      if (!dialog || dialog.open === awaitingRespawn) return;
      if (awaitingRespawn) dialog.showModal();
      else dialog.close();
    });
  }
  showOwnSector(): void {
    const { x, y } = this.hud.mapTile();
    this.selectedSector.set(sectorIndex(x, y));
    this.atlasScale.set('sector');
  }
  showAtlasSector(id: number): void {
    if (!Number.isInteger(id) || id < 0 || id > 8) return;
    this.selectedSector.set(id);
    this.atlasScale.set('sector');
  }
  rotateInventoryHero(): void { this.previewDirection.update(value => (value + 1) % 4); }
  /** Usa o mesmo personagem procedural do mundo, não uma ilustração independente. */
  private drawInventoryHero(time: number): void {
    if (!this.inventoryOpen()) return;
    if (time - this.previewLastDraw >= 50) {
      this.previewLastDraw = time;
      const canvas = this.inventoryHero()?.nativeElement;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        const directions = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }] as const;
        const face = directions[this.previewDirection()] ?? directions[0];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height * 0.81);
        ctx.scale(2.4, 2.4);
        renderHero(ctx, {
          faceX: face.x, faceY: face.y, walkTime: 0, attackTime: 0,
          attackWeapon: this.hud.loadout()?.equipped ?? 'starter',
          equippedWeapon: this.hud.loadout()?.equipped ?? 'starter',
          gear: this.hud.gear() ?? undefined,
          vx: 0, vy: 0, id: 'inventory-preview',
        }, 0, 0, time / 1000);
        ctx.restore();
      }
    }
    this.previewFrame = requestAnimationFrame(now => this.drawInventoryHero(now));
  }
  ngAfterViewInit(): void {
    try {
      this.combatHelpVisible.set(localStorage.getItem('terrania-combat-help-dismissed-v1') !== '1');
    } catch { /* Private browsing can block storage; closing still works this session. */ }
    // An open sidebar fits a desktop; Android stays collapsed until requested.
    this.battleOpen.set(window.matchMedia('(pointer: fine) and (min-width: 651px)').matches);
    this.destroy.onDestroy(() => cancelAnimationFrame(this.previewFrame));
    // Só o contador de quem está jogando: anônimo, sem conta, e o jogo nunca depende da resposta.
    this.destroy.onDestroy(startPlayPresence({ endpoint: heartbeatEndpoint(runtimeConfig.multiplayerUrl, runtimeConfig.presenceUrl) }));
    try { this.destroy.onDestroy(mountGame(this.mount().nativeElement, this.hud)); }
    catch { this.notice.set('Não foi possível iniciar o jogo neste navegador. Recarregue a página para tentar novamente.'); }
  }
  dismissCombatHelp(): void {
    this.combatHelpVisible.set(false);
    try { localStorage.setItem('terrania-combat-help-dismissed-v1', '1'); }
    catch { /* Closing does not depend on localStorage. */ }
  }
  open(dialog: HTMLDialogElement): void {
    this.toolsExpanded.set(false);
    this.hud.menuOpen = true;
    if (dialog === this.playersDialog().nativeElement) this.playersDialogOpen.set(true);
    if (dialog === this.inventoryDialog().nativeElement && !this.inventoryOpen()) {
      this.inventoryOpen.set(true);
      this.previewLastDraw = 0;
      this.previewFrame = requestAnimationFrame(now => this.drawInventoryHero(now));
    }
    if (!dialog.open) dialog.showModal();
  }
  close(event: Event): void {
    if (event.target instanceof Element) event.target.closest('dialog')?.close();
  }
  closed(): void {
    if (!this.playersDialog().nativeElement.open) this.playersDialogOpen.set(false);
    if (!this.inventoryDialog().nativeElement.open) {
      this.inventoryOpen.set(false);
      // Remove the atlas Canvas from the DOM when the dialog closes, not just
      // from the hit-testing tree. Reopening starts on the normal bag page.
      this.hud.inventoryTab.set('bag');
      cancelAnimationFrame(this.previewFrame);
      this.previewFrame = 0;
    }
    // close is emitted after the native open property changes (also for Escape).
    this.hud.menuOpen = !!this.host.nativeElement.querySelector('dialog[open]');
    if (!this.hud.menuOpen) document.getElementById('game')?.focus({ preventScroll: true });
  }
  nextNpc(dialog: HTMLDialogElement): void { if (!this.hud.nextNpc()) dialog.close(); }
  newWorld(dialog: HTMLDialogElement): void { dialog.close(); this.hud.newWorld(); }
  zoom(event: Event): void {
    if (event.target instanceof HTMLInputElement)
      this.hud.changePreferences({ ...this.hud.preferences(), zoom: Number(event.target.value) });
  }
  togglePreference(key: 'effects' | 'cameraMotion', event: Event): void {
    if (event.target instanceof HTMLInputElement)
      this.hud.changePreferences({ ...this.hud.preferences(), [key]: event.target.checked });
  }
  @HostListener('document:fullscreenchange') fullscreenChanged(): void { this.fullscreenActive.set(!!document.fullscreenElement); }
  async fullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.host.nativeElement.requestFullscreen();
    } catch { this.notice.set('Não foi possível abrir a tela cheia. Você pode continuar jogando aqui.'); }
  }
}
