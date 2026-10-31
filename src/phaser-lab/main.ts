import Phaser from "phaser";
import { renderHero } from "../render/actors.ts";

/**
 * Laboratório isolado: Phaser renderiza texturas geradas em Canvas 2D.
 * Não substitui o Game.ts nem altera saves, física, colisão ou multiplayer.
 */
const WORLD_WIDTH = 2048;
const WORLD_HEIGHT = 1536;
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 480;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): void {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível para gerar as texturas.");
  paint(ctx);
  // O Phaser reutiliza a textura em memória, sem depender de PNG externo.
  scene.textures.addCanvas(key, canvas);
}

class ProceduralLabScene extends Phaser.Scene {
  private hero: Phaser.GameObjects.Image | null = null;
  private destination: { x: number; y: number } | null = null;
  private fpsCounter = 0;
  private readonly status = document.getElementById("lab-status");

  constructor() {
    super({ key: "ProceduralLab" });
  }

  create(): void {
    const random = seededRandom(842136);
    createTexture(this, "lab-grass", 128, 128, (ctx) => {
      ctx.fillStyle = "#355746";
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 210; i++) {
        const x = random() * 128;
        const y = random() * 128;
        ctx.fillStyle = i % 3 === 0 ? "#52735a" : "#41664e";
        ctx.fillRect(x, y, 1 + random() * 3, 1 + random() * 2);
      }
    });
    createTexture(this, "lab-tree", 64, 88, (ctx) => {
      ctx.fillStyle = "#223c32";
      ctx.beginPath();
      ctx.ellipse(32, 77, 23, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#806044";
      ctx.fillRect(27, 42, 10, 34);
      for (const [x, y, rx, ry, color] of [
        [34, 44, 21, 23, "#254e43"],
        [24, 30, 19, 23, "#37694f"],
        [42, 28, 17, 22, "#3e7658"],
        [31, 20, 21, 22, "#4a8461"],
      ] as const) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    createTexture(this, "lab-hero", 64, 80, (ctx) => {
      // Usa o desenhista procedural REAL do personagem do Terrânia.
      renderHero(ctx, {
        faceX: 0,
        faceY: 1,
        walkTime: 0,
        attackTime: 0,
        vx: 0,
        vy: 0,
      }, 32, 69);
    });
    createTexture(this, "lab-gem", 24, 28, (ctx) => {
      ctx.fillStyle = "#83ddc2";
      ctx.strokeStyle = "#d4ffed";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, 1);
      ctx.lineTo(22, 12);
      ctx.lineTo(17, 26);
      ctx.lineTo(7, 26);
      ctx.lineTo(2, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "lab-grass").setOrigin(0, 0);
    for (let i = 0; i < 90; i++) {
      const x = 55 + random() * (WORLD_WIDTH - 110);
      const y = 55 + random() * (WORLD_HEIGHT - 110);
      if (Math.hypot(x - 1024, y - 768) < 230) continue;
      this.add.image(x, y, "lab-tree").setDepth(y);
    }
    for (let i = 0; i < 14; i++) {
      const x = 70 + random() * (WORLD_WIDTH - 140);
      const y = 70 + random() * (WORLD_HEIGHT - 140);
      this.add.image(x, y, "lab-gem").setDepth(y);
    }
    this.hero = this.add.image(1024, 768, "lab-hero").setDepth(768);
    this.hero.setOrigin(0.5, 0.87);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.destination = {
        x: Phaser.Math.Clamp(pointer.worldX, 0, WORLD_WIDTH),
        y: Phaser.Math.Clamp(pointer.worldY, 0, WORLD_HEIGHT),
      };
    });
    this.status?.replaceChildren(document.createTextNode(
      "Phaser 4 ativo · 90 árvores geradas por seed · toque no mundo para caminhar",
    ));
  }

  update(_time: number, delta: number): void {
    if (!this.hero) return;
    if (this.destination) {
      const dx = this.destination.x - this.hero.x;
      const dy = this.destination.y - this.hero.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 3) this.destination = null;
      else {
        const step = Math.min(dist, (Math.min(delta, 50) / 1000) * 160);
        this.hero.setPosition(this.hero.x + (dx / dist) * step, this.hero.y + (dy / dist) * step);
        this.hero.setDepth(this.hero.y);
      }
    }
    this.fpsCounter += delta;
    if (this.fpsCounter >= 1000) {
      this.fpsCounter = 0;
      const fps = document.getElementById("lab-fps");
      if (fps) fps.textContent = Math.round(this.game.loop.actualFps) + " FPS";
    }
  }
}

const mount = document.getElementById("phaser-root");
if (!mount) throw new Error("Elemento #phaser-root não encontrado.");

const phaserGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: mount,
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: "#211b31",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
  },
  scene: [ProceduralLabScene],
  render: { pixelArt: false },
});

window.addEventListener("pagehide", () => phaserGame.destroy(true), { once: true });
