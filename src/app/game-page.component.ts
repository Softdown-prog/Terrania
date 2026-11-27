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
import { questGuide, type QuestGuide } from '../engine/quests/journal/index.ts';
import { atlasFrame, atlasTileAt, GROUND_NAMES, BIOME_NAMES, sectorIndex, surveySectors, type AtlasScale } from '../world/atlas.ts';
import { REGIONS, getWorldRegion } from '../world/regions.ts';
import { getRegionDifficulty } from '../world/regionDifficulty.ts';
import { getTile } from '../world/terrain.ts';

@Component({ selector: 'app-game-page', templateUrl: './game-page.html', styleUrls: ['./styles/game-core.css', './styles/dialogs-and-controls.css', './styles/responsive.css', './styles/inventory.css', './styles/game-overlays.css', './styles/battle-list.css', './styles/world-atlas.css', './styles/mounts.css', './styles/hero-select.css'],
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
  /** As três seções do diário de missões (ADR 0100), na ordem em que aparecem. */
  readonly questGroups = computed(() => [
    { id: 'active', title: 'Em andamento', entries: this.hud.journalActive() },
    { id: 'available', title: 'Para começar', entries: this.hud.journalAvailable() },
    { id: 'completed', title: 'Concluídas', entries: this.hud.journalCompleted() },
  ]);
  readonly selectedSector = signal(4);
  /** O destino da viagem escolhido com um clique no Mapa do mundo, em tiles (ADR 0099). */
  readonly atlasTarget = signal<{ x: number; y: number } | null>(null);
  readonly atlasTargetDistance = computed(() => {
    const target = this.atlasTarget(), here = this.hud.mapTile();
    return target ? Math.round(Math.hypot(target.x - here.x, target.y - here.y)) : null;
  });
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
  private readonly classDialog = viewChild<ElementRef<HTMLDialogElement>>('classDialog');
  private readonly classKnight = viewChild<ElementRef<HTMLCanvasElement>>('classKnight');
  private readonly classMage = viewChild<ElementRef<HTMLCanvasElement>>('classMage');
  private classPreviewFrame = 0;
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
        drawWorldAtlas(ctx, scale, x, y, seed, sector, this.atlasTarget());
      }
    });
    effect(() => {
      // Tela de escolha do herói (ADR 0066): abre enquanto o jogador novo não escolheu e fecha ao escolher.
      const prompt = this.hud.heroClassPrompt();
      const dialog = this.classDialog()?.nativeElement;
      if (!dialog || dialog.open === prompt) return;
      if (prompt) {
        this.open(dialog);
        cancelAnimationFrame(this.classPreviewFrame);
        this.classPreviewFrame = requestAnimationFrame(now => this.drawClassPreview(now));
      } else {
        cancelAnimationFrame(this.classPreviewFrame);
        dialog.close();
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
  /** Clicar no Mapa do mundo escolhe o destino da viagem; trocar a escala do mapa mantém o destino, que é uma posição no mundo. */
  pickAtlasTarget(event: MouseEvent): void {
    if (this.hud.cave() || !(event.currentTarget instanceof HTMLCanvasElement)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return;
    const target = atlasTileAt(this.atlasView(), (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    if (target) this.atlasTarget.set(target);
  }
  /** Começa a viagem até o destino escolhido e fecha o mapa para o herói ser visto andando. */
  travelToTarget(): void {
    const target = this.atlasTarget();
    if (!target) return;
    this.hud.startJourney(target.x, target.y);
    if (this.hud.journeyRemaining() === null) return; // não começou: o aviso diz por quê, e o mapa continua aberto
    this.atlasTarget.set(null);
    this.inventoryDialog().nativeElement.close();
  }
  /** Para onde e a que distância fica o lugar da etapa atual, a partir de onde o herói está. */
  stepGuide(place: { x: number; y: number }): QuestGuide | null { return questGuide(this.hud.mapTile(), place); }
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
  /** Os heróis da tela de escolha são os mesmos heróis procedurais do mundo, de frente: o Cavaleiro com a espada de treino e o Mago com o chapéu (a escala do Mago é menor para o chapéu caber). */
  private drawClassPreview(time: number): void {
    if (!this.hud.heroClassPrompt()) return;
    for (const [ref, heroClass, scale] of [[this.classKnight(), undefined, 2.6], [this.classMage(), 'mage', 2.3]] as const) {
      const canvas = ref?.nativeElement, ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) continue;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height * 0.84);
      ctx.scale(scale, scale);
      renderHero(ctx, { faceX: 0, faceY: 1, walkTime: 0, attackTime: 0, attackWeapon: 'starter', equippedWeapon: 'starter', vx: 0, vy: 0, id: 'class-preview', heroClass }, 0, 0, time / 1000);
      ctx.restore();
    }
    this.classPreviewFrame = requestAnimationFrame(now => this.drawClassPreview(now));
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
        // O chapéu do Mago é alto: a prévia dele é um pouco menor para caber no quadro.
        const zoom = this.hud.heroClass() === 'mage' ? 2.15 : 2.4;
        ctx.scale(zoom, zoom);
        renderHero(ctx, {
          faceX: face.x, faceY: face.y, walkTime: 0, attackTime: 0,
          attackWeapon: this.hud.loadout()?.equipped ?? 'starter',
          equippedWeapon: this.hud.loadout()?.equipped ?? 'starter',
          gear: this.hud.wearsArmor() ? this.hud.gear() ?? undefined : undefined,
          heroClass: this.hud.heroClass(), equippedStaff: this.hud.staff(),
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
    this.destroy.onDestroy(() => { cancelAnimationFrame(this.previewFrame); cancelAnimationFrame(this.classPreviewFrame); });
    // Só o contador de quem está jogando: anônimo, sem conta, e o jogo nunca depende da resposta.
    this.destroy.onDestroy(startPlayPresence({ endpoint: heartbeatEndpoint(runtimeConfig.multiplayerUrl, runtimeConfig.presenceUrl) }));
    try { this.destroy.onDestroy(mountGame(this.mount().nativeElement, this.hud)); }
    catch { this.notice.set('Não foi possível iniciar o jogo neste navegador. Recarregue a página para tentar novamente.'); }
  }
  dismissNotice(): void {
    this.notice.set('');
    this.hud.dismissTravelNotice();
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
