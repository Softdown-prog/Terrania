import { expect, test } from "@playwright/test";
import { build } from "esbuild";

/**
 * Soltar da memória os sprites dos edifícios da capital, no Chromium de verdade (ADR 0061). Os testes de unidade usam canvas de
 * mentira; aqui os módulos reais pintam e soltam canvas reais: o canvas vai mesmo a zero, repintar funciona, e desenhar um canvas
 * solto dá erro no navegador, que é o motivo de o soltador só agir quando nenhuma peça da capital pode estar na tela.
 */
test("sprites reais dos edifícios: pintam, soltam (canvas a zero), repintam, e desenhar um solto dá erro (desktop/Android)", async ({ page }) => {
  const bundle = await build({
    stdin: {
      contents: `import { capitalBuildingSprite } from "./src/render/center/capital/sceneryPainter.ts";
        import { releaseCapitalSprites, warmCapitalSprites } from "./src/render/center/capital/warm.ts";
        import { hasSprite } from "./src/render/props/spriteCache.ts";
        import { capitalBuildingSpriteKey } from "./src/render/center/capital/sceneryPainter.ts";
        import { CAPITAL_BUILDINGS, capitalPoint } from "./src/world/center/capital/index.ts";
        (globalThis as any).API = { capitalBuildingSprite, releaseCapitalSprites, warmCapitalSprites, hasSprite, capitalBuildingSpriteKey, count: CAPITAL_BUILDINGS.length, center: capitalPoint(0, 0) };`,
      resolveDir: process.cwd(), loader: "ts",
    },
    bundle: true, format: "iife", write: false, logLevel: "error",
  });
  await page.setContent("<body></body>");
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  const result = await page.evaluate(() => {
    const A = (globalThis as unknown as { API: Record<string, any> }).API;
    const n: number = A.count, c = A.center as { x: number; y: number };
    const log: Record<string, unknown> = {};
    // pinta os oito, um por chamada, com a câmera perto da capital
    let calls = 0; while (A.warmCapitalSprites(c.x, c.y + 640)) calls++;
    log.paintedByWarm = calls;
    const first: HTMLCanvasElement[] = []; for (let i = 0; i < n; i++) first.push(A.capitalBuildingSprite(i).canvas);
    log.sizesBefore = first.map(k => [k.width, k.height]);
    // um pixel pintado de verdade em cada sprite
    log.opaque = first.map(k => { const d = k.getContext("2d")!.getImageData(0, 0, k.width, k.height).data; let a = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i]! > 0) a++; return a; });
    log.nearReleased = A.releaseCapitalSprites(c.x, c.y, 1280, 720);
    log.farReleased = A.releaseCapitalSprites(0, 0, 1280, 720);
    log.sizesAfter = first.map(k => [k.width, k.height]);
    log.stillCached = Array.from({ length: n }, (_, i) => A.hasSprite(A.capitalBuildingSpriteKey(i)));
    // desenhar um canvas solto dá erro no navegador
    const target = document.createElement("canvas"); target.width = target.height = 64; const ctx = target.getContext("2d")!;
    try { ctx.drawImage(first[0]!, 0, 0); log.drawReleased = "sem erro"; } catch (e) { log.drawReleased = (e as Error).name; }
    // repinta: canvas novos, do tamanho de antes, e agora desenham sem erro
    const second: HTMLCanvasElement[] = []; for (let i = 0; i < n; i++) second.push(A.capitalBuildingSprite(i).canvas);
    log.repainted = second.map((k, i) => k !== first[i] && k.width === (log.sizesBefore as number[][])[i]![0] && k.height === (log.sizesBefore as number[][])[i]![1]);
    try { ctx.drawImage(second[0]!, 0, 0, 64, 64); log.drawRepainted = "sem erro"; } catch (e) { log.drawRepainted = (e as Error).name; }
    return log;
  });
  expect(result.paintedByWarm, "o preparo pinta um por chamada, oito vezes").toBe(8);
  expect((result.sizesBefore as number[][]).every(([w, h]) => w! > 800 && h! > 800), "sprites grandes, com o dobro de resolução").toBe(true);
  expect((result.opaque as number[]).every(a => a > 200), "todos têm arte pintada").toBe(true);
  expect(result.nearReleased, "perto da capital nada é solto").toBe(0);
  expect(result.farReleased, "longe, os oito são soltos").toBe(8);
  expect(result.sizesAfter, "o navegador devolve a memória: todos os canvases vão a zero").toEqual(Array.from({ length: 8 }, () => [0, 0]));
  expect(result.stillCached).toEqual(Array.from({ length: 8 }, () => false));
  expect(result.drawReleased, "desenhar um sprite solto dá erro: por isso só se solta o que não está à vista").toBe("InvalidStateError");
  expect(result.repainted, "repintados em canvas novos, do mesmo tamanho").toEqual(Array.from({ length: 8 }, () => true));
  expect(result.drawRepainted).toBe("sem erro");
});
