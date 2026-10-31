import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { mountGame } from '../game/PhaserGame.ts';
import { HudService } from './hud.service.ts';
import { OnlinePlayersComponent } from './online-players.component.ts';
import { runtimeConfig } from './runtime-config.ts';

@Component({ selector: 'app-game-page', templateUrl: './game-page.html', styleUrl: '../style.css',
  imports: [RouterLink, OnlinePlayersComponent], providers: [HudService], changeDetection: ChangeDetectionStrategy.OnPush })
export class GamePageComponent implements AfterViewInit {
  readonly hud = inject(HudService);
  readonly notice = signal('');
  readonly fullscreenActive = signal(false);
  private readonly mount = viewChild.required<ElementRef<HTMLElement>>('mount');
  private readonly npcDialog = viewChild.required<ElementRef<HTMLDialogElement>>('npcDialog');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  constructor() {
    effect(() => {
      if (this.hud.dialogueRequested() > 0) this.open(this.npcDialog().nativeElement);
    });
  }
  ngAfterViewInit(): void {
    try { this.destroy.onDestroy(mountGame(this.mount().nativeElement, this.hud, runtimeConfig.multiplayerUrl)); }
    catch { this.notice.set('Não foi possível iniciar o jogo neste navegador. Recarregue a página para tentar novamente.'); }
  }
  open(dialog: HTMLDialogElement): void {
    this.hud.menuOpen = true;
    if (!dialog.open) dialog.showModal();
  }
  close(event: Event): void {
    if (event.target instanceof Element) event.target.closest('dialog')?.close();
  }
  closed(): void {
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
