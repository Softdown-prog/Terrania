import { expect, test, type Page } from "@playwright/test";
import { caveEntranceInCell, type CaveEntrance } from "../../src/world/caves.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_STAIRS_DOWN, CAVE_WIDTH, CaveFloor } from "../../src/world/caveFloor.ts";
import { caveFloorCount } from "../../src/dungeons/index.ts";
import { CaveRoom } from "../../src/engine/rooms/CaveRoom.ts";

/**
 * Masmorra de vários andares no jogo de verdade (ADR 0018): entrar, descer pela escada, subir de volta
 * e sair. O herói anda pelo teclado, guiado pela posição que a própria tela mostra (`#coords`).
 */
const SEED = 842136;
type Tile = { x: number; y: number };

function threeFloorDesertCave(): CaveEntrance {
  for (let cx = -12; cx <= 12; cx++) {
    const entrance = caveEntranceInCell(cx, 125, SEED);
    if (entrance?.theme === "desert" && caveFloorCount(entrance) === 3) return entrance;
  }
  throw new Error("nenhuma Cripta das Dunas de 3 andares nos arredores");
}

/** Caminho por tiles "seguros" (o tile e os 8 vizinhos são chão): o herói nunca encosta na parede. */
function safePath(floor: CaveFloor, from: Tile, to: Tile): Tile[] | null {
  const safe = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (floor.at(x + dx, y + dy) !== 1) return false;
    return true;
  };
  const key = (t: Tile): number => t.y * CAVE_WIDTH + t.x;
  const parent = new Map<number, Tile | null>([[key(from), null]]);
  const queue: Tile[] = [from];
  while (queue.length) {
    const here = queue.shift()!;
    if (here.x === to.x && here.y === to.y) {
      const path: Tile[] = [];
      for (let t: Tile | null = here; t; t = parent.get(key(t)) ?? null) path.unshift(t);
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { x: here.x + dx, y: here.y + dy };
      if (next.x < 1 || next.y < 1 || next.x >= CAVE_WIDTH - 1 || next.y >= CAVE_HEIGHT - 1 ||
          parent.has(key(next)) || !safe(next.x, next.y)) continue;
      parent.set(key(next), here);
      queue.push(next);
    }
  }
  return null;
}

/** Onde o herói está e se o jogo ainda mostra a caverna ("Subsolo" no `#coords`); a leitura tem prazo, para um elemento que sumiu não prender o teste até o limite. */
async function heroTile(page: Page): Promise<Tile & { cave: boolean }> {
  const text = (await page.locator("#coords").textContent({ timeout: 10_000 })) ?? "";
  const match = /X\s+(-?\d+)\s+·\s+Y\s+(-?\d+)/.exec(text);
  if (!match) throw new Error("coordenadas ilegíveis: " + text);
  return { x: Number(match[1]), y: Number(match[2]), cave: text.includes("Subsolo") };
}

/**
 * Anda até o tile `goal` (uma escada) ou até `done()` ficar verdadeiro; refaz o caminho a cada passo.
 * Ao chegar no tile da escada, usa o botão de ação (E): a escada "pisada" só vale a menos de 13 px do
 * centro, e tentar acertar isso por teclas fazia o herói oscilar na borda do tile. O botão funciona de
 * qualquer ponto do tile (menos de 52 px) e é o caminho que o jogador também tem na tela.
 * Poucas chamadas ao navegador por passo: na CI cada ida e volta custa caro e o teste inteiro precisa
 * caber no limite de tempo.
 */
const navigations: string[] = [];
async function walk(page: Page, floor: CaveFloor, goal: Tile, act: () => Promise<void>,
  done: () => Promise<boolean>): Promise<void> {
  let last: Tile | null = null, still = 0;
  for (let step = 0; step < 300; step++) {
    const here = await heroTile(page);
    if (await done()) return; // a leitura de `here` pode já ser da superfície (saiu agora)
    // O jogo saiu da caverna sem o teste pedir (a página recarregou?): falha na hora dizendo isso, em vez de caminhar pela superfície até o limite de 5 minutos.
    if (!here.cave) throw new Error(`o jogo saiu da caverna fora do roteiro (em ${here.x},${here.y}); a página recarregou? navegações: ${navigations.join(" | ")}`);
    // Herói parado fora da escada: a tecla não está chegando ao jogo (o foco saiu da tela?). Devolve o foco e, se não adiantar, falha cedo e
    // dizendo onde parou, em vez de girar até o limite de 5 minutos do teste sem nenhuma pista (a CI não guarda o rastro).
    still = last && last.x === here.x && last.y === here.y && !(here.x === goal.x && here.y === goal.y) ? still + 1 : 0;
    last = here;
    if (still >= 2) await page.locator("canvas#game").focus();
    if (still >= 6) {
      const where = ((await page.locator("#questProgress").textContent()) ?? "?").trim();
      throw new Error(`o herói parou em ${here.x},${here.y} (destino ${goal.x},${goal.y}, ${where}) e não saiu do lugar por ${still} tentativas`);
    }
    if (here.x === goal.x && here.y === goal.y) {
      await act();
      await page.waitForTimeout(150);
      continue;
    }
    const path = safePath(floor, here, goal);
    expect(path, `existe caminho seguro de ${here.x},${here.y} até ${goal.x},${goal.y}`).not.toBeNull();
    // Segura a tecla ao longo de todo o trecho reto do caminho (e não um toque por tile): na CI, onde cada ida e volta ao navegador
    // custa caro, isso faz o herói andar de verdade e corta as idas e voltas por quatro ou mais. Depois de cada trecho o caminho é refeito
    // a partir de onde o herói parou, e como o caminho só passa por tiles com folga, uma passada a mais não o leva à parede.
    const toward = (a: Tile, b: Tile): string => b.x > a.x ? "d" : b.x < a.x ? "a" : b.y > a.y ? "s" : "w";
    const key = toward(path![0]!, path![1] ?? goal);
    let end = 1;
    while (end + 1 < path!.length && toward(path![end]!, path![end + 1]!) === key) end++;
    const target = path![end] ?? goal;
    const arrived = (at: Tile): boolean => key === "d" ? at.x >= target.x : key === "a" ? at.x <= target.x : key === "s" ? at.y >= target.y : at.y <= target.y;
    await page.keyboard.down(key);
    const deadline = Date.now() + 2500 + end * 450;
    try {
      for (;;) {
        if (arrived(await heroTile(page)) || await done() || Date.now() > deadline) break;
        await page.waitForTimeout(30);
      }
    } finally {
      await page.keyboard.up(key);
    }
  }
  throw new Error("o herói não chegou ao destino");
}

// Na CI o desktop trava de vez em quando na primeira rodada deste arquivo (execuções 732, 734 e 736) e passa na seguinte; até a causa aparecer (os registros acima e o rastro salvo
// como artefato dizem onde), uma repetição evita um CI vermelho por um travamento que não é do jogo. O Playwright mostra a repetição como "flaky" no resumo.
test.describe.configure({ retries: 1 });

test("masmorra de 3 andares: descer, subir e sair pela mesma entrada (desktop/Android)", async ({ page }, info) => {
  // Na primeira rodada da CI o desktop levou 2,5 min (execução 737) e em outras passou dos 5 (732, 734, 736); no Android e aqui o teste leva 25 s. O limite de 15 min só evita
  // que a lentidão da primeira rodada derrube o teste; um travamento de verdade cai bem antes, pelas mensagens de `walk`.
  test.setTimeout(900_000);
  const entrance = threeFloorDesertCave();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  // Anota cada navegação da página principal (uma recarga no meio do teste, vinda do servidor de desenvolvimento, explicaria o herói voltar à superfície).
  navigations.length = 0;
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations.push(new Date().toISOString().slice(11, 19) + " " + frame.url().replace(/^https?:\/\/[^/]+/, "")); });
  // O teste é de andares, não de combate: os monstros dos três andares já estão derrotados (a lista
  // vem do próprio motor) e o herói é forte (nível 100). O povoamento tem os seus testes unitários.
  const defeated = [1, 2, 3].flatMap(floorIndex =>
    [...new CaveRoom(entrance, 100, 100, new Set(), { floorIndex }).monsters.keys()]);
  expect(defeated.length).toBeGreaterThan(8);
  await page.addInitScript(({ x, y, defeated }) => {
    // Os derrotados voltam depois de um prazo de tempo de jogo (10 minutos sem a hora de volta no save, ADR 0029): numa CI lenta o teste passa disso e eles ressurgem
    // no caminho (execução 743: "Você tombou na caverna"). A hora de volta fica no máximo aceito (2 horas) para ninguém voltar durante o teste.
    const respawnAt = Object.fromEntries((defeated as string[]).map(id => [id, 7_200]));
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x, y, hp: 1090, kills: 0, defeated, respawnAt, experience: 148500,
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { x: entrance.x, y: entrance.y, defeated });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const action = page.locator("#talkButton");
  const pressAction = async (): Promise<void> => {
    // Sob carga o HUD atrasa: se o toque anterior já trocou de andar, o botão some. Toque com prazo
    // curto e sem falhar; quem decide se o herói chegou é o `done()` de `walk`.
    const options = { timeout: 1500 };
    try {
      if (info.project.name === "android") await action.tap(options); else await action.click(options);
    } catch {
      return;
    }
    await page.locator("canvas#game").focus();
  };
  await expect(action).toContainText("Entrar (E)");
  if (info.project.name === "android") await action.tap(); else await action.click();

  const progress = page.locator("#questProgress");
  await expect(progress).toContainText("Andar 1 de 3 · Galerias de Areia");
  await expect(page.locator("#gameNotice")).toContainText("Andar 1 de 3");
  await page.locator("canvas#game").focus();

  // Andar 1 → 2: a escada que desce fica na câmara do fundo.
  const floor1 = new CaveFloor(entrance, 1, 3);
  await walk(page, floor1, CAVE_STAIRS_DOWN, pressAction, async () => /Andar 2 de 3/.test((await progress.textContent()) ?? ""));
  await expect(progress).toContainText("Andar 2 de 3 · Túnel dos Contrabandistas");
  await expect(page.locator("#gameNotice")).toContainText("desceu");
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("andar-2.png") });

  // Andar 2 → 1: a escada de saída agora sobe um andar (não sai da caverna).
  const floor2 = new CaveFloor(entrance, 2, 3);
  await walk(page, floor2, CAVE_EXIT, pressAction, async () => /Andar 1 de 3/.test((await progress.textContent()) ?? ""));
  await expect(progress).toContainText("Andar 1 de 3 · Galerias de Areia");
  await expect(page.locator("#gameNotice")).toContainText("subiu");
  await expect(page.locator("#coords")).toContainText("Subsolo");

  // Andar 1 → superfície: voltou exatamente à entrada.
  await walk(page, floor1, CAVE_EXIT, pressAction, async () => !/Subsolo/.test((await page.locator("#coords").textContent()) ?? ""));
  // Se a saída ocorre no meio do toque da tecla, o herói ainda anda até um tile na superfície: a
  // checagem é "chegou na entrada (a menos de 1 tile)", não "parado exatamente nela".
  await expect.poll(async () => {
    const at = await heroTile(page);
    return Math.max(Math.abs(at.x - entrance.tileX), Math.abs(at.y - entrance.tileY));
  }).toBeLessThanOrEqual(1);
  await expect(page.locator("#gameNotice")).toContainText("retornou à superfície");
  expect(errors).toEqual([]);
});
