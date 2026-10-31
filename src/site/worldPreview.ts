import { WorldRenderer } from "../render/WorldRenderer.ts";
import { drawWorldView } from "../ui/CanvasScene.ts";
import { renderHero, renderSlime } from "../render/actors.ts";
import { getTile } from "../world/terrain.ts";

/** Static previews use actual game rendering, without starting simulation or input. */
export function preparePreviews(root: ParentNode = document): () => void {
  const world = new WorldRenderer(842136);
  const draw = (canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.dataset.characterView) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const scale = Math.min(rect.width / 180, rect.height / 160);
      ctx.translate(rect.width / 2, rect.height * 0.6);
      ctx.scale(scale, scale);
      ctx.fillStyle = "#b4a76c10";
      ctx.beginPath();
      ctx.ellipse(0, 0, 70, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      renderHero(
        ctx,
        {
          faceX: 0.85,
          faceY: 0.52,
          walkTime: 1.4,
          attackTime: 0.12,
          vx: 70,
          vy: 0,
        },
        -25,
        -4,
      );
      renderSlime(ctx, { hp: 2, bounce: 0.8 }, 38, 9);
      return;
    }
    let x = -25,
      y = -40,
      zoom = 1.65;
    if (canvas.dataset.worldView === "floresta") {
      let found = false;
      for (let ty = -20; ty < 8 && !found; ty++)
        for (let tx = 8; tx < 35; tx++) {
          if (
            getTile(tx, ty, world.seed).ground === "forest" &&
            getTile(tx, ty, world.seed).tree
          ) {
            x = tx * 32;
            y = ty * 32;
            found = true;
            break;
          }
        }
      zoom = 1.55;
    } else if (canvas.dataset.worldView === "rio") {
      x = 150;
      y = 500;
      for (let ty = 8; ty < 30; ty++)
        if (getTile(5, ty, world.seed).ground === "water") {
          y = ty * 32 + 40;
          break;
        }
      zoom = 1.4;
    }
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
    const player = {
      x: 16,
      y: 16,
      faceX: 0.7,
      faceY: 0.7,
      walkTime: 0.7,
      attackTime: 0,
      vx: 0,
      vy: 0,
    };
    drawWorldView(
      ctx,
      world,
      x,
      y,
      rect.width / zoom,
      rect.height / zoom,
      player,
      [],
    );
    const wash = ctx.createLinearGradient(
      0,
      0,
      rect.width / zoom,
      rect.height / zoom,
    );
    wash.addColorStop(0, "#d2bf780a");
    wash.addColorStop(1, "#102e2720");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, rect.width / zoom, rect.height / zoom);
  };
  const visible = new Set<HTMLCanvasElement>();
  const canvases = root.querySelectorAll<HTMLCanvasElement>(
    "canvas[data-world-view],canvas[data-character-view]",
  );
  if (!("IntersectionObserver" in window)) {
    for (const canvas of canvases) draw(canvas);
    return () => world.clear();
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          const canvas = entry.target as HTMLCanvasElement;
          visible.add(canvas);
          draw(canvas);
          observer.unobserve(canvas);
        }
    },
    { rootMargin: "200px" },
  );
  for (const canvas of canvases) observer.observe(canvas);
  let resizeFrame = 0;
  const resize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      for (const canvas of visible) draw(canvas);
    });
  };
  window.addEventListener("resize", resize);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(resizeFrame);
    window.removeEventListener("resize", resize);
    visible.clear();
    world.clear();
  };
}
