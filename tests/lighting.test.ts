import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beginLightingFrame, drawLit, lightingEnabled, setLightingEnabled } from "../src/render/lighting/litSprite.ts";
import { FRAME_CACHE_MAX, FRAME_CACHE_PIXELS, poolStats, resetPool } from "../src/render/lighting/spritePool.ts";
import { LIGHT, CREATURE_BOX, MOUNT_BOX } from "../src/render/lighting/lightRig.ts";
import { LIGHT_DOWNSCALE, relightSprite } from "../src/render/lighting/relight.ts";
import { FRAMES_PER_SECOND, PHASE_STEPS, stepTime, stepVisual, visualGroup, visualKey } from "../src/render/lighting/visualKey.ts";
import { renderRegionalCreature } from "../src/render/regionalCreatures.ts";
import { renderMount } from "../src/render/mounts.ts";

/**
 * A luz comum das criaturas e montarias (ADR 0090). Aqui a luz é conferida por um gravador de telas falsas que anota, em ordem, cada operação de cada tela: dá para
 * dizer qual camada entrou, em que ordem, de que lado, em que resolução e quantas vezes o desenho foi refeito (ou reaproveitado do cache).
 */
interface Op { readonly canvas: number; readonly name: string; readonly args: readonly unknown[] }
function harness(initialScale = 3) {
  let scale = initialScale;
  const log: Op[] = [];
  let next = 0;
  class Canvas {
    readonly id = next++; width = 0; height = 0;
    getContext(): unknown {
      const id = this.id, state: Record<string, unknown> = {};
      return new Proxy({}, {
        get: (_t, name: string) => {
          if (name in state) return state[name];
          if (name === "getTransform") return () => ({ a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 });
          return (...args: unknown[]) => { log.push({ canvas: id, name, args: args.map(a => a instanceof Canvas ? `canvas#${a.id}` : a) }); return name.startsWith("create") ? { addColorStop: (offset: number, color: string) => log.push({ canvas: id, name: "stop", args: [offset, color] }) } : undefined; };
        },
        set: (_t, name: string, value: unknown) => { state[name] = value; log.push({ canvas: id, name: "=" + name, args: [value] }); return true; },
      });
    }
  }
  const g = globalThis as Record<string, unknown>, previous = g.document;
  g.document = { createElement: () => new Canvas() };
  const main = new Canvas();
  const ctx = main.getContext() as CanvasRenderingContext2D;
  const done = (): void => { if (previous === undefined) delete g.document; else g.document = previous; };
  return { log, ctx, main, done, Canvas, setScale: (value: number): void => { scale = value; } };
}
const fresh = () => { resetPool(); setLightingEnabled(true); };

test("a luz vem do alto à esquerda, e as peças do desenho (caixa, passos de tempo) estão onde o contrato diz", () => {
  assert.deepEqual(LIGHT.from, { x: -1, y: -1 });
  assert.ok(LIGHT.rimWidth > 0 && LIGHT.edge.blur > 0 && LIGHT.ground.height > 0);
  assert.deepEqual(CREATURE_BOX, { left: -64, top: -78, right: 64, bottom: 12 }); assert.deepEqual(MOUNT_BOX, { left: -72, top: -90, right: 72, bottom: 12 });
  assert.equal(CREATURE_BOX.left, -CREATURE_BOX.right, "a caixa é simétrica");
  assert.ok(CREATURE_BOX.bottom > 0 && CREATURE_BOX.top < -60, "os pés (a origem) ficam dentro da caixa, com folga embaixo");
  assert.equal(FRAMES_PER_SECOND, 10); assert.equal(PHASE_STEPS, 8); assert.equal(LIGHT_DOWNSCALE, 2);
  assert.equal(FRAME_CACHE_MAX, 64); assert.equal(FRAME_CACHE_PIXELS, 10_000_000);
});

test("degraus do estado visual: o mesmo degrau dá a mesma chave e o mesmo grupo; degraus diferentes, chaves diferentes", () => {
  assert.equal(stepTime(0.19), 0.1); assert.equal(stepTime(0.2), 0.2); assert.equal(stepTime(Number.NaN), 0); assert.equal(stepTime(-5), -5 * 0 + stepTime(-5));
  const base = { kind: "wild-boar", id: "a", hp: 80, moving: 0.44, motionPhase: 1.1, casting: 0.26, hurtTime: 0.03 };
  const s = stepVisual(base);
  assert.equal(s.moving, 0.4); assert.equal(s.casting, 0.3); assert.equal(s.hurtTime, 0.05);
  assert.ok(Math.abs(s.motionPhase / (Math.PI * 2) * PHASE_STEPS - Math.round(s.motionPhase / (Math.PI * 2) * PHASE_STEPS)) < 1e-9, "a fase cai numa das oito posições");
  assert.equal(stepVisual(s).motionPhase, s.motionPhase, "arredondar de novo não muda nada");
  assert.equal(visualKey(s, stepTime(1.04)), visualKey(stepVisual({ ...base, moving: 0.41 }), stepTime(1.09)), "mesmo degrau, mesma chave");
  for (const other of [{ ...base, id: "b" }, { ...base, hp: 79 }, { ...base, moving: 0.8 }, { ...base, casting: 0.7 }, { ...base, hurtTime: 0.3 }, { ...base, motionPhase: 4 }, { ...base, kind: "gray-wolf" }]) assert.notEqual(visualKey(stepVisual(other), stepTime(1.04)), visualKey(s, stepTime(1.04)), JSON.stringify(other));
  assert.notEqual(visualKey(s, stepTime(1.04)), visualKey(s, stepTime(1.12)), "o tempo muda a chave a cada décimo de segundo");
  assert.equal(stepTime(1.04), stepTime(1.09), "o mesmo décimo");
  assert.equal(visualGroup(s), "wild-boar|a"); assert.equal(visualGroup({ kind: "x", hp: 1 }), "x|");
  assert.deepEqual(stepVisual({ kind: "k", hp: 1, moving: Number.NaN, motionPhase: Number.POSITIVE_INFINITY }), { kind: "k", hp: 1, moving: 0, motionPhase: 0, casting: 0, hurtTime: 0 });
});

test("sem tela de verdade, ou com a luz desligada, o desenho sai direto, sem camada nenhuma", () => {
  let calls = 0; const ctx = {} as CanvasRenderingContext2D;
  assert.equal((globalThis as Record<string, unknown>).document, undefined);
  drawLit({ key: "k" }, ctx, () => { calls++; });
  assert.equal(calls, 1, "sem navegador: desenha direto");
  const h = harness();
  try {
    setLightingEnabled(false); assert.equal(lightingEnabled(), false);
    drawLit({ key: "k" }, h.ctx, () => { calls++; });
    assert.equal(calls, 2); assert.equal(h.log.filter(op => op.canvas !== h.main.id).length, 0, "nenhuma tela de rascunho foi criada");
    setLightingEnabled(true); assert.equal(lightingEnabled(), true);
  } finally { h.done(); fresh(); }
});

test("a camada de luz: desenho inteiro, camadas em meia resolução, e UMA aplicação só dentro da silhueta; as quinas e o degradê seguem a direção da luz", () => {
  fresh(); const h = harness(3);
  try {
    let drawn = 0;
    drawLit({ key: "boar|1" }, h.ctx, c => { drawn++; (c as unknown as { fillRect: (...a: number[]) => void }).fillRect(0, 0, 4, 4); });
    assert.equal(drawn, 1);
    const w = Math.ceil((CREATURE_BOX.right - CREATURE_BOX.left) * 3), hgt = Math.ceil((CREATURE_BOX.bottom - CREATURE_BOX.top) * 3);
    // o desenho entra numa tela da caixa inteira, na escala da câmera, com a origem nos pés
    const sourceSet = h.log.find(op => op.name === "setTransform" && op.args[0] === 3)!;
    assert.deepEqual(sourceSet.args, [3, 0, 0, 3, -CREATURE_BOX.left * 3, -CREATURE_BOX.top * 3]);
    // a tela final recebe o desenho inteiro e, depois, uma única aplicação "source-atop" da luz esticada de volta ao tamanho cheio
    const frameRef = h.log.filter(op => op.canvas === h.main.id && op.name === "drawImage").at(-1)!.args[0] as string;
    const out = h.log.filter(op => op.canvas === Number(frameRef.split("#")[1]) && op.name !== "clearRect" && op.name !== "setTransform");
    const names = out.map(op => op.name + (op.name === "=globalCompositeOperation" ? ":" + op.args[0] : ""));
    assert.equal(names.filter(n => n === "=globalCompositeOperation:source-atop").length, 1, "uma só aplicação da luz");
    const atop = out.findIndex(op => op.name === "=globalCompositeOperation" && op.args[0] === "source-atop");
    const upscale = out.slice(atop).find(op => op.name === "drawImage")!;
    assert.deepEqual(upscale.args.slice(1), [0, 0, Math.ceil(w / 2), Math.ceil(hgt / 2), 0, 0, w, hgt], "a luz (meia resolução) volta ao tamanho cheio");
    assert.ok(out.findIndex(op => op.name === "drawImage") < atop, "o desenho entra antes da luz");
    // a camada de luz: o degradê grande começa quente de onde a luz vem (alto à esquerda) e termina frio no lado oposto
    const lightCanvas = out.slice(atop).find(op => op.name === "drawImage")!.args[0] as string;
    const lightId = Number(lightCanvas.split("#")[1]);
    const light = h.log.filter(op => op.canvas === lightId);
    const grad = light.find(op => op.name === "createLinearGradient")!.args as number[];
    const lw = Math.ceil(w / 2), lh = Math.ceil(hgt / 2);
    assert.ok(grad[0]! < grad[2]! && grad[1]! < grad[3]!, "o degradê vai do alto à esquerda para baixo à direita");
    assert.ok(Math.abs(grad[0]! - lw * .2) < 1e-6 && Math.abs(grad[1]! - lh * .05) < 1e-6 && Math.abs(grad[2]! - lw * .8) < 1e-6 && Math.abs(grad[3]! - lh * .95) < 1e-6);
    const stops = light.filter(op => op.name === "stop").map(op => op.args);
    assert.deepEqual(stops.slice(0, 3), [[0, LIGHT.key.light], [.45, "rgba(255,244,214,0)"], [1, LIGHT.key.shade]]);
    // as quinas: a faixa iluminada usa a silhueta deslocada para baixo e para a direita (sobra a borda do alto e da esquerda); a sombra, o oposto
    const bandSets = h.log.filter(op => op.name === "drawImage" && op.args.length === 3 && typeof op.args[0] === "string" && (op.args[1] as number) !== 0 && (op.args[2] as number) !== 0);
    assert.equal(bandSets.length, 2, "duas quinas deslocadas");
    const rim = Math.max(1, LIGHT.rimWidth * 3 / 2);
    assert.deepEqual([bandSets[0]!.args[1], bandSets[0]!.args[2]], [rim, rim], "a quina iluminada: silhueta deslocada (+, +)");
    assert.deepEqual([bandSets[1]!.args[1], bandSets[1]!.args[2]], [-rim, -rim], "a quina na sombra: deslocada (−, −)");
    const colors = h.log.filter(op => op.name === "=fillStyle").map(op => op.args[0]);
    assert.ok(colors.includes(LIGHT.rim.light) && colors.includes(LIGHT.rim.shade) && colors.includes(LIGHT.edge.color), "as cores do LightRig entram");
    // a oclusão junto ao chão termina nos pés (a origem), e o brilho de material fica no alto, do lado da luz
    const ao = light.filter(op => op.name === "createLinearGradient")[1]!.args as number[];
    assert.equal(ao[3], -CREATURE_BOX.top * 3 / 2, "a oclusão acaba nos pés");
    const sheen = light.find(op => op.name === "createRadialGradient")!.args as number[];
    assert.ok(Math.abs(sheen[0]! - lw * LIGHT.sheen.x) < 1e-6 && Math.abs(sheen[1]! - lh * LIGHT.sheen.y) < 1e-6, "o brilho fica do lado da luz");
    // o contorno interno: preenche tudo com a cor do contorno e depois FURA o miolo com a silhueta encolhida (destination-out), voltando ao normal
    const edgeOps = light.map(op => op.name === "=globalCompositeOperation" ? ":" + op.args[0] : op.name === "=fillStyle" ? "fill=" + op.args[0] : op.name);
    const fillAt = edgeOps.indexOf("fill=" + LIGHT.edge.color), cutAt = edgeOps.indexOf(":destination-out");
    assert.ok(fillAt >= 0 && cutAt > fillAt && edgeOps.indexOf("drawImage", cutAt) === cutAt + 1 && edgeOps[cutAt + 2] === ":source-over", "o miolo é furado depois de pintar o contorno: " + edgeOps.slice(0, 12).join(","));
    // por fim o quadro pronto é posto na tela principal, no tamanho da caixa
    const finalDraw = h.log.filter(op => op.canvas === h.main.id && op.name === "drawImage").at(-1)!;
    assert.deepEqual(finalDraw.args.slice(1), [CREATURE_BOX.left, CREATURE_BOX.top, 128, 90]);
  } finally { h.done(); fresh(); }
});

test("o quadro pronto volta do cache: o mesmo estado não é redesenhado, outro estado ou outra escala é; o cache respeita os tetos e recicla as telas", () => {
  fresh(); let h = harness(3);
  try {
    let drawn = 0; const draw = (): void => { drawn++; };
    drawLit({ key: "a" }, h.ctx, draw); drawLit({ key: "a" }, h.ctx, draw); drawLit({ key: "a" }, h.ctx, draw);
    assert.equal(drawn, 1, "três pedidos do mesmo estado, um desenho");
    assert.equal(h.log.filter(op => op.canvas === h.main.id && op.name === "drawImage").length, 3, "mas o quadro é posto na tela as três vezes");
    drawLit({ key: "b" }, h.ctx, draw); assert.equal(drawn, 2, "outro estado: refaz");
    h.setScale(2);
    drawLit({ key: "a" }, h.ctx, draw); assert.equal(drawn, 3, "a mesma chave em outra escala é outro quadro (a escala entra na chave)");
    // a escala entra na chave em degraus de um quarto: 3,2 e 3,3 dão o mesmo quadro (3,25), 3,4 dá outro (3,5)
    h.setScale(3.2); drawLit({ key: "q" }, h.ctx, draw); const afterQ = drawn;
    h.setScale(3.3); drawLit({ key: "q" }, h.ctx, draw); assert.equal(drawn, afterQ, "3,2 e 3,3 compartilham o quadro");
    h.setScale(3.4); drawLit({ key: "q" }, h.ctx, draw); assert.equal(drawn, afterQ + 1, "3,4 é outro quadro");
    assert.deepEqual(h.log.find(op => op.name === "drawImage" && op.canvas === h.main.id)!.args.slice(3), [128, 90], "o quadro vai na caixa em unidades do mundo, qualquer que seja a escala");
    assert.equal(h.log.find(op => op.name === "setTransform" && op.args[0] === 3.5)!.args[4], -CREATURE_BOX.left * 3.5, "o desenho usa a escala em degraus (3,5)");
    // teto de quadros: passar de 64 recicla os mais antigos e devolve as telas ao reservatório
    for (let i = 0; i < FRAME_CACHE_MAX + 10; i++) drawLit({ key: "k" + i }, h.ctx, draw);
    assert.equal(poolStats().frames, FRAME_CACHE_MAX); assert.ok(poolStats().free >= 1, "as telas dos quadros antigos voltam ao reservatório");
    const before = drawn; drawLit({ key: "k" + (FRAME_CACHE_MAX + 9) }, h.ctx, draw); assert.equal(drawn, before, "o mais novo ainda está no cache");
    drawLit({ key: "k0" }, h.ctx, draw); assert.equal(drawn, before + 1, "o mais antigo foi descartado");
    // quem é pedido de novo rejuvenesce: o k20 é tocado e sobrevive à próxima leva (12 quadros novos), enquanto o k21 (não tocado) sai
    drawLit({ key: "k20" }, h.ctx, draw); for (let i = 0; i < 12; i++) drawLit({ key: "novo-" + i }, h.ctx, draw);
    const mark = drawn; drawLit({ key: "k20" }, h.ctx, draw); assert.equal(drawn, mark, "o tocado continua no cache");
    drawLit({ key: "k21" }, h.ctx, draw); assert.equal(drawn, mark + 1, "o não tocado já saiu");
  } finally { h.done(); fresh(); }
  // teto de pixels: telas grandes enchem o teto antes dos 64 quadros
  const big = harness(4);
  try {
    let drawn = 0; const draw = (): void => { drawn++; };
    const perFrame = Math.ceil(128 * 4) * Math.ceil(90 * 4);
    // as telas falsas têm tamanho 0 até alguém dimensionar; `fit` dimensiona ao criar, então cada quadro vale a caixa inteira
    for (let i = 0; i < 70; i++) drawLit({ key: "p" + i }, big.ctx, draw);
    const stats = poolStats();
    assert.ok(stats.pixels <= FRAME_CACHE_PIXELS, "o total fica sob o teto: " + stats.pixels);
    assert.equal(stats.frames, Math.floor(FRAME_CACHE_PIXELS / perFrame), "cabem " + Math.floor(FRAME_CACHE_PIXELS / perFrame) + " quadros desse tamanho");
  } finally { big.done(); fresh(); }
});

test("o orçamento por quadro: passando dele, quem já tem quadro reaproveita o último; quem nunca foi visto é iluminado do mesmo jeito", () => {
  fresh(); const h = harness(3);
  try {
    let drawn = 0; const draw = (): void => { drawn++; };
    drawLit({ key: "boar|1", group: "boar" }, h.ctx, draw);
    beginLightingFrame(0);
    const before = drawn;
    drawLit({ key: "boar|2", group: "boar" }, h.ctx, draw);
    assert.equal(drawn, before, "sem orçamento, o quadro novo do javali reaproveita o anterior");
    assert.equal(h.log.filter(op => op.canvas === h.main.id && op.name === "drawImage").length, 2, "e ainda assim algo é desenhado na tela");
    drawLit({ key: "wolf|1", group: "wolf" }, h.ctx, draw);
    assert.equal(drawn, before + 1, "quem nunca foi visto é iluminado mesmo sem orçamento");
    drawLit({ key: "nogroup" }, h.ctx, draw);
    assert.equal(drawn, before + 2, "sem grupo, sempre refaz");
    beginLightingFrame(1);
    drawLit({ key: "boar|3", group: "boar" }, h.ctx, draw);
    assert.equal(drawn, before + 3, "com orçamento, o quadro novo é feito");
    drawLit({ key: "boar|4", group: "boar" }, h.ctx, draw);
    assert.equal(drawn, before + 3, "e acabou o orçamento: o seguinte reaproveita");
    // o quadro reaproveitado some do cache: então é refeito
    beginLightingFrame(0); resetPool();
    drawLit({ key: "boar|5", group: "boar" }, h.ctx, draw);
    assert.equal(drawn, before + 4, "grupo sem quadro no cache: refaz");
  } finally { h.done(); beginLightingFrame(Number.POSITIVE_INFINITY); fresh(); }
});

test("relightSprite: copia o desenho para a tela de saída antes de qualquer camada e usa só telas pedidas ao reservatório", () => {
  fresh(); const h = harness();
  try {
    const source = new h.Canvas(), out = new h.Canvas(); source.width = 100; source.height = 80; out.width = 100; out.height = 80;
    relightSprite(source as unknown as HTMLCanvasElement, out as unknown as HTMLCanvasElement, CREATURE_BOX, 3);
    const first = h.log.filter(op => op.canvas === out.id)[0]!;
    assert.deepEqual([first.name, first.args[0]], ["=globalCompositeOperation", "source-over"]);
    assert.equal(h.log.filter(op => op.canvas === out.id && op.name === "drawImage")[0]!.args[0], `canvas#${source.id}`, "o primeiro desenho na saída é o próprio sprite");
    assert.equal(h.log.filter(op => op.canvas === out.id && op.name === "drawImage").length, 2, "o sprite e a luz, nada mais");
  } finally { h.done(); fresh(); }
});

test("as criaturas e as montarias passam pela luz: o mesmo estado (e o mesmo décimo de segundo) volta do cache, a barra de vida e a sombra ficam de fora", () => {
  fresh(); const h = harness(3);
  try {
    const boar = { kind: "wild-boar" as const, hp: 60, id: "luz" };
    renderRegionalCreature(h.ctx, boar, 10, 20, 1.01);
    const first = h.log.length;
    renderRegionalCreature(h.ctx, boar, 10, 20, 1.04);
    const second = h.log.slice(first);
    assert.equal(second.filter(op => op.canvas !== h.main.id).length, 0, "no mesmo décimo de segundo nada é refeito nas telas de rascunho");
    assert.ok(second.some(op => op.canvas === h.main.id && op.name === "drawImage"), "o quadro iluminado é posto na tela");
    // a barra de vida (a criatura está ferida) é pintada direto na tela principal, depois do sprite
    const mainOps = h.log.filter(op => op.canvas === h.main.id).map(op => op.name);
    assert.ok(mainOps.lastIndexOf("drawImage") < mainOps.lastIndexOf("fill"), "a barra de vida vem depois do sprite iluminado");
    const sprites = h.log.filter(op => op.canvas === h.main.id && op.name === "drawImage").length;
    renderRegionalCreature(h.ctx, boar, 10, 20, 1.2);
    assert.ok(h.log.filter(op => op.canvas === h.main.id && op.name === "drawImage").length === sprites + 1);
    assert.ok(h.log.length > first * 1.3, "outro décimo de segundo é refeito");
    // montaria: mesmo critério, e a sombra no chão fica fora da luz
    const mountStart = h.log.length;
    renderMount(h.ctx, "warhorse", 0, 0, 2.01); const afterFirst = h.log.length;
    renderMount(h.ctx, "warhorse", 0, 0, 2.05);
    assert.equal(h.log.slice(afterFirst).filter(op => op.canvas !== h.main.id).length, 0, "a montaria também volta do cache");
    assert.ok(h.log.slice(mountStart, afterFirst).some(op => op.canvas === h.main.id && op.name === "drawImage" && (op.args[3] as number) === 144 && (op.args[4] as number) === 102), "o quadro da montaria usa a caixa das montarias (144 × 102)");
  } finally { h.done(); fresh(); }
});

test("a ligação: as três molduras de criatura e as montarias desenham o corpo por `drawLit`, e a barra de vida e os efeitos de golpe ficam fora", () => {
  for (const file of ["regionalFrame", "wave2Frame", "wave3Frame"]) {
    const code = readFileSync(`src/render/creatures/shared/${file}.ts`, "utf8");
    assert.match(code, /drawLit\(\{key:facingKey\(\w+,time\),group:visualGroup\(\w+\)\},ctx,lit=>\{/, file);
    assert.match(code, /paintFacing\(\w+,lit,\(\)=>draw\(lit,c,time\)\)/, file + ": o corpo é pintado pelo espelho de direção");
    const effect = { regionalFrame: "if(flash>.02)", wave2Frame: "if((actor.hurtTime??0)>.02)", wave3Frame: "if((actor.hurtTime??0)>0)" }[file]!;
    const bar = { regionalFrame: "if(creature.hp<max)", wave2Frame: "if(actor.hp<max)", wave3Frame: "if(actor.hp<max)" }[file]!;
    assert.ok(code.includes(effect) && code.includes(bar) && code.indexOf("drawLit(") < code.indexOf(effect) && code.indexOf("drawLit(") < code.indexOf(bar), file + ": o efeito de golpe e a barra de vida vêm depois");
  }
  const mounts = readFileSync("src/render/mounts.ts", "utf8");
  assert.match(mounts, /:`mount\|\$\{id\}\|\$\{Math\.round\(t\*FRAMES_PER_SECOND\)\}`;/, "a montaria a pé entra em décimos de segundo");
  assert.match(mounts, /const t=stepped\?Math\.floor\(time\*RIDE_AMBIENT_FPS\)\/RIDE_AMBIENT_FPS:stepTime\(time\);/, "a montada, nos quadros de enfeite");
  assert.match(mounts, /drawLit\(\{key,group:`mount\|\$\{id\}`,box:MOUNT_BOX\},ctx,lit=>\{/);
  assert.ok(mounts.indexOf("softShadow(ctx,0,3") < mounts.indexOf("drawLit("), "a sombra no chão fica fora da luz");
  const registry = readFileSync("src/render/regionalCreatures.ts", "utf8");
  assert.match(registry, /CREATURE_RENDERERS\[creature\.kind\]\(ctx,stepVisual\(creature\),sx,sy,stepTime\(time\)\);/);
  for (const [file, call] of [["src/ui/CanvasScene.ts", "beginLightingFrame();"], ["src/render/cave.ts", "beginLightingFrame();"]] as const) assert.ok(readFileSync(file, "utf8").includes(call), file + " abre o orçamento do quadro");
});

test("a montaria montada (ADR 0092) volta do cache na mesma posição de passada, lado e movimento, e refaz quando qualquer um muda", () => {
  fresh(); const h = harness(3);
  try {
    const scratch = (draw: () => void): number => { const before = h.log.length; draw(); return h.log.slice(before).filter(op => op.canvas !== h.main.id).length; };
    const at = (ride: { phase: number; moving: number; facing: 1 | -1 }, t = 1) => (): void => renderMount(h.ctx, "warhorse", 0, 0, t, ride);
    assert.ok(scratch(at({ phase: .01, moving: 1, facing: 1 })) > 0, "o primeiro quadro é desenhado");
    assert.equal(scratch(at({ phase: .02, moving: 1, facing: 1 }, 1.05)), 0, "mesma posição, movimento e lado, no mesmo sexto de segundo: volta do cache");
    assert.ok(scratch(at({ phase: Math.PI * 2 / 12, moving: 1, facing: 1 })) > 0, "outra posição da passada refaz");
    assert.ok(scratch(at({ phase: .01, moving: 1, facing: -1 })) > 0, "o outro lado refaz");
    assert.ok(scratch(at({ phase: .01, moving: .5, facing: 1 })) > 0, "outro movimento refaz");
    assert.ok(scratch(at({ phase: .01, moving: 1, facing: 1 }, 1.2)) > 0, "outro quadro de enfeite refaz");
    assert.equal(scratch(at({ phase: .01, moving: 1, facing: 1 }, 1.2)), 0, "e volta ao repetir");
  } finally { h.done(); fresh(); }
});
