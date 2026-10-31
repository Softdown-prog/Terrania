import * as Phaser from 'phaser/dist/phaser.esm.js';
import { Game } from './Game.ts';
import { CanvasScene } from '../ui/CanvasScene.ts';
import type { GameUi } from '../ui/GameUi.ts';

/** Phaser owns the clock, scene, scaling and final rendering. Existing procedural
 * art paints a CanvasTexture; authoritative TS/Go simulation stays independent. */
export function mountGame(parent: HTMLElement, ui: GameUi, multiplayerUrl: string): () => void {
  let controller: Game | undefined;
  let disposed = false;
  const size = () => ({ width: Math.max(1, parent.clientWidth), height: Math.max(1, parent.clientHeight) });
  const dpr = Math.min(devicePixelRatio || 1, 2);
  class WorldScene extends Phaser.Scene {
    private texture: Phaser.Textures.CanvasTexture | undefined;
    private view: Phaser.GameObjects.Image | undefined;
    private painter: CanvasScene | undefined;
    constructor() { super('terrania-world'); }
    create(): void {
      if (disposed) return;
      const { width, height } = size();
      const texture = this.textures.createCanvas('terrania-procedural', Math.ceil(width * dpr), Math.ceil(height * dpr));
      if (!texture) throw new Error('Não foi possível criar a textura do mundo.');
      this.texture = texture;
      this.view = this.add.image(0, 0, texture).setOrigin(0).setDisplaySize(width, height);
      this.painter = new CanvasScene(texture.canvas, width, height);
      this.game.canvas.id = 'game';
      this.game.canvas.tabIndex = 0;
      this.game.canvas.setAttribute('aria-label', 'Mundo de Terrania. Mova-se com WASD ou setas e ataque com Espaço ou J.');
      controller = new Game(this.painter, ui, multiplayerUrl);
      this.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
        controller?.destroy(); controller = undefined;
      });
      this.game.canvas.focus({ preventScroll: true });
    }
    private resize(): void {
      if (!this.texture || !this.view || !this.painter) return;
      const { width, height } = size();
      this.texture.setSize(Math.ceil(width * dpr), Math.ceil(height * dpr));
      this.view.setDisplaySize(width, height);
      this.painter.resize(width, height);
    }
    override update(_time: number, delta: number): void {
      if (disposed) return;
      controller?.update(delta / 1000);
      this.texture?.refresh();
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, ...size(), backgroundColor: '#0b0812',
    scene: [WorldScene], audio: { noAudio: true },
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    render: { antialias: true, roundPixels: false },
  });
  const resize = () => { const { width, height } = size(); game.scale.resize(width, height); };
  const observer = new ResizeObserver(resize);
  observer.observe(parent);
  window.visualViewport?.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  return () => {
    disposed = true;
    observer.disconnect();
    window.visualViewport?.removeEventListener('resize', resize);
    window.removeEventListener('orientationchange', resize);
    controller?.destroy(); controller = undefined;
    game.destroy(true);
  };
}
