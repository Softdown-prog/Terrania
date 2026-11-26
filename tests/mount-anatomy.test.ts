import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MOUNT_IDS, type MountId } from "../src/actors/MountCatalog.ts";
import { legPose, type LegSpec } from "../src/render/creatures/mounts/limbs.ts";
import { GAIT_RATE, quadrupedLegs } from "../src/render/creatures/mounts/quadruped.ts";
import { QUADRUPED_MOUNTS, isQuadrupedMount, mountRiderLift, LEGACY_RIDER_LIFT } from "../src/render/creatures/mounts/quadrupeds.ts";
import { riderLiftFor } from "../src/render/creatures/mounts/saddle.ts";
import { neckTop } from "../src/render/creatures/mounts/neck.ts";
import { renderMount } from "../src/render/mounts.ts";
import { PALETTES } from "../src/render/creatures/mounts/geometry.ts";
import { drawQuadruped } from "../src/render/creatures/mounts/quadruped.ts";
import { drawSaddle } from "../src/render/creatures/mounts/saddle.ts";
import { drawTidalHippocampus } from "../src/render/creatures/mounts/tidalHippocampus.ts";
import { renderSandBasiliskDetail } from "../src/render/creatures/mounts/sandBasilisk.ts";
import { renderCargoBeetleDetail } from "../src/render/creatures/mounts/cargoBeetle.ts";
import { stepTime } from "../src/render/lighting/visualKey.ts";
import { MOUNT_BOX } from "../src/render/lighting/lightRig.ts";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";

/**
 * Anatomia das dez montarias (ADR 0091): pernas de dois ossos por cinemática inversa, passada em diagonais, tronco com silhueta, sela comum e altura do cavaleiro
 * medida em cada lombo. Os testes medem a geometria (onde o joelho dobra, se o pé toca o chão), não a beleza.
 */
const QUADRUPEDS = Object.keys(QUADRUPED_MOUNTS) as Array<keyof typeof QUADRUPED_MOUNTS>;
const leg = (over: Partial<LegSpec> = {}): LegSpec => ({ hipX: 0, hipY: -30, upper: 15, lower: 15, widthTop: 8, widthKnee: 5, widthAnkle: 3, front: true, far: false, foot: "hoof", stride: 6, lift: 5, ...over });
const dist = (a: readonly [number, number], b: readonly [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Grava as chamadas de caminho (nome e números) na ordem, para conferir o que foi desenhado e em que ordem, sem depender do hash do fluxo inteiro. */
function calls(draw: (ctx: CanvasRenderingContext2D) => void): string[] {
  const out: string[] = [];
  const stub = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => { out.push(`${name}(${args.filter((a): a is number => typeof a === "number").join(",")})`); return name.startsWith("create") ? { addColorStop() {} } : undefined; }, set: () => true });
  draw(stub as unknown as CanvasRenderingContext2D);
  return out;
}
const contains = (hay: readonly string[], needle: readonly string[]): boolean => needle.length > 0 && hay.join("\n").includes(needle.join("\n"));
const render = (id: MountId, t: number) => { const r = new Recorder(); return withFakeDocument(r, () => { renderMount(r.ctx, id, 0, 0, t); return r.metrics(); }); };

test("a perna mantém o comprimento dos dois ossos em qualquer ponto da passada (sem esticar nem encolher)", () => {
  for (const front of [true, false]) for (let k = 0; k < 24; k++) {
    const s = leg({ front, upper: 12, lower: 14 }), p = legPose(s, k * Math.PI / 12);
    assert.ok(Math.abs(dist([s.hipX, s.hipY], p.knee) - 12) < 1e-6, `coxa ${front} ${k}`);
    assert.ok(Math.abs(dist(p.knee, p.foot) - 14) < 1e-6, `canela ${front} ${k}`);
  }
});

test("o joelho do membro anterior dobra para a frente e o jarrete do posterior para trás", () => {
  // pé levantado bem embaixo do quadril (fase 0): o joelho sai do eixo vertical, e só o lado depende do membro
  const front = legPose(leg({ front: true }), 0), rear = legPose(leg({ front: false }), 0);
  assert.deepEqual(front.foot, [0, -5]);
  assert.ok(Math.abs(front.knee[0] - 8.2915619758885) < 1e-6 && Math.abs(front.knee[1] - -17.5) < 1e-6, `joelho ${front.knee}`);
  assert.ok(Math.abs(rear.knee[0] + 8.2915619758885) < 1e-6 && Math.abs(rear.knee[1] - -17.5) < 1e-6, `jarrete ${rear.knee}`);
  // em apoio, com o pé à frente do quadril, o lado em que o joelho fica continua o do membro
  const standF = legPose(leg({ front: true }), Math.PI / 2), standR = legPose(leg({ front: false }), Math.PI / 2);
  assert.ok(standF.knee[0] > standR.knee[0] + 4, "no apoio o joelho da frente fica adiante do jarrete");
});

test("a pata balança para os dois lados, sobe no meio do passo e o pé nunca passa do alcance dos ossos", () => {
  const s = leg();
  const swung = legPose(s, Math.PI / 2).foot[0], back = legPose(s, -Math.PI / 2).foot[0];
  assert.ok(swung > 4 && back < -4, `balanço ${swung} ${back}`);
  assert.ok(legPose(s, Math.PI / 2).foot[1] > legPose(s, 0).foot[1] + 3, "no apoio o pé está mais baixo que no meio do passo");
  for (let k = 0; k < 48; k++) assert.ok(dist([s.hipX, s.hipY], legPose(s, k * Math.PI / 24).foot) <= s.upper + s.lower, "alcance");
  // perna curta demais para o passo pedido: o pé é grampeado ao alcance, sem NaN
  const stretched = legPose(leg({ stride: 60, upper: 5, lower: 5 }), Math.PI / 2);
  assert.ok([...stretched.knee, ...stretched.foot].every(Number.isFinite));
  assert.ok(dist([0, -30], stretched.foot) <= 10);
});

test("no apoio o pé de cada montaria toca o chão (y perto de 0), nas sete de quatro patas", () => {
  for (const id of QUADRUPEDS) for (const { spec, phase } of quadrupedLegs(QUADRUPED_MOUNTS[id].body, Math.PI / 2)) {
    const swinging = Math.cos(phase) > 0;
    if (swinging) continue;
    const y = legPose(spec, phase).foot[1];
    assert.ok(y <= .5 && y >= -3.6, `${id}: o pé de apoio está a ${y} do solo`);
  }
});

test("quatro pernas por montaria, as distantes primeiro, em diagonais (anterior próxima anda com a posterior distante)", () => {
  for (const id of QUADRUPEDS) {
    const legs = quadrupedLegs(QUADRUPED_MOUNTS[id].body, 1.1);
    assert.equal(legs.length, 4);
    assert.deepEqual(legs.map(l => l.spec.far), [true, true, false, false], `${id}: ordem de desenho`);
    const find = (front: boolean, far: boolean) => legs.find(l => l.spec.front === front && l.spec.far === far)!;
    assert.equal(find(true, false).phase, find(false, true).phase, `${id}: diagonal A`);
    assert.equal(find(true, true).phase, find(false, false).phase, `${id}: diagonal B`);
    assert.ok(Math.abs(find(true, false).phase - find(true, true).phase - Math.PI) < 1e-9 || Math.abs(find(true, true).phase - find(true, false).phase - Math.PI) < 1e-9, `${id}: diagonais em oposição`);
    // anteriores nascem à frente das posteriores; a perna distante sai um pouco para trás do mesmo membro
    assert.ok(find(true, false).spec.hipX > find(false, false).spec.hipX);
    assert.ok(find(true, true).spec.hipX < find(true, false).spec.hipX);
  }
  assert.equal(GAIT_RATE, 5, "o ritmo da passada que as montarias sempre tiveram");
});

test("cada espécie tem o pé do seu bicho: casco, casco fendido ou pata", () => {
  const foot = (id: keyof typeof QUADRUPED_MOUNTS) => [QUADRUPED_MOUNTS[id].body.frontLeg.foot, QUADRUPED_MOUNTS[id].body.rearLeg.foot];
  assert.deepEqual([foot("warhorse"), foot("silver-unicorn")], [["hoof", "hoof"], ["hoof", "hoof"]]);
  assert.deepEqual([foot("mountain-goat"), foot("imperial-elk")], [["cloven", "cloven"], ["cloven", "cloven"]]);
  assert.deepEqual([foot("fire-lion"), foot("cavern-bear"), foot("dark-griffin")], [["paw", "paw"], ["paw", "paw"], ["paw", "paw"]]);
  // proporções próprias: o alce é o de pernas mais longas e o urso o de pernas mais grossas
  const length = (id: keyof typeof QUADRUPED_MOUNTS) => QUADRUPED_MOUNTS[id].body.frontLeg.upper + QUADRUPED_MOUNTS[id].body.frontLeg.lower;
  assert.equal(QUADRUPEDS.reduce((a, b) => length(b) > length(a) ? b : a), "imperial-elk");
  const thick = (id: keyof typeof QUADRUPED_MOUNTS) => QUADRUPED_MOUNTS[id].body.frontLeg.widthAnkle;
  assert.equal(QUADRUPEDS.reduce((a, b) => thick(b) > thick(a) ? b : a), "cavern-bear");
  // nenhuma ficha de corpo é igual a outra
  assert.equal(new Set(QUADRUPEDS.map(id => JSON.stringify(QUADRUPED_MOUNTS[id].body))).size, QUADRUPEDS.length);
});

test("o tronco tem silhueta de bicho: lombo acima da barriga, virilha mais alta que o peito, cernelha pelo menos tão alta quanto o lombo", () => {
  for (const id of QUADRUPEDS) {
    const t = QUADRUPED_MOUNTS[id].body.torso;
    assert.ok(t.front > t.rear + 30, `${id}: comprimento`);
    assert.ok(t.back < t.bellyFront - 8 && t.croup < t.bellyRear - 6, `${id}: barriga abaixo do dorso`);
    assert.ok(t.withers <= t.back + 1, `${id}: cernelha`);
    assert.ok(t.bellyRear <= t.bellyFront + 6, `${id}: virilha sobe`);
  }
});

test("a linha de cima do pescoço sai da cernelha e termina na nuca, meia largura acima do eixo, e sobe e avança no caminho", () => {
  const n = { baseX: 14, baseY: -34, baseWidth: 17, topX: 28, topY: -57, topWidth: 8.5, arch: 2.5 };
  const [x, y] = neckTop(n, 1);
  assert.deepEqual([x, y], [28, -57 - 8.5 / 2], "na nuca: x do topo, y do topo menos meia largura");
  const [x0, y0] = neckTop(n, 0);
  assert.ok(Math.abs(x0 - (14 - 17 * .15)) < 1e-9 && Math.abs(y0 - (-34 - 17 / 2)) < 1e-9, "na cernelha: puxada para trás e meia largura acima");
  let lastX = x0, lastY = y0;
  for (let k = 1; k <= 10; k++) { const [px, py] = neckTop(n, k / 10); assert.ok(px > lastX && py < lastY, `passo ${k}: sobe e avança`); [lastX, lastY] = [px, py]; }
  // o arco levanta o meio: com arco maior a linha passa mais alto, e o arco some nas pontas
  const arched = neckTop({ ...n, arch: 8 }, .5), flat = neckTop({ ...n, arch: 0 }, .5);
  assert.ok(Math.abs(flat[1] - arched[1] - 8) < 1e-9);
  assert.deepEqual(neckTop({ ...n, arch: 8 }, 1), neckTop(n, 1));
});

test("o cavaleiro senta no assento de cada montaria (dois abaixo do lombo), e o besouro e o hipocampo mantêm os 19 de sempre", () => {
  const expected: Record<MountId, number> = {
    warhorse: 41, "mountain-goat": 32, "imperial-elk": 45, "silver-unicorn": 39, "fire-lion": 31, "cavern-bear": 36, "dark-griffin": 35,
    "sand-basilisk": 29, "cargo-beetle": 19, "tidal-hippocampus": 19,
  };
  assert.deepEqual(MOUNT_IDS.map(id => mountRiderLift(id)), MOUNT_IDS.map(id => expected[id]));
  for (const id of QUADRUPEDS) assert.equal(mountRiderLift(id), riderLiftFor(QUADRUPED_MOUNTS[id].body.torso), id);
  assert.equal(LEGACY_RIDER_LIFT, 19);
  assert.equal(riderLiftFor({ ...QUADRUPED_MOUNTS.warhorse.body.torso, back: -50 }), 48, "lombo mais alto levanta o cavaleiro: ele senta no assento, dois abaixo do lombo");
  assert.ok(isQuadrupedMount("warhorse") && !isQuadrupedMount("cargo-beetle") && !isQuadrupedMount("tidal-hippocampus") && !isQuadrupedMount("sand-basilisk"));
  const scene = readFileSync(new URL("../src/ui/CanvasScene.ts", import.meta.url), "utf8");
  assert.match(scene, /player\.y-top-\(mount\?mountRiderLift\(mount\):0\)/, "a cena usa a altura de cada montaria");
});

test("as dez montarias desenham dentro da caixa da luz comum, com a mesma imagem para o mesmo instante e imagens diferentes ao longo da passada", () => {
  const width = MOUNT_BOX.right - MOUNT_BOX.left, height = MOUNT_BOX.bottom - MOUNT_BOX.top;
  for (const id of MOUNT_IDS) {
    const a = render(id, .35), b = render(id, .35), later = render(id, .65);
    assert.equal(a.signature, b.signature, `${id}: determinismo`);
    assert.notEqual(a.signature, later.signature, `${id}: a passada anda`);
    assert.ok(a.width <= width + 30 && a.height <= height + 10, `${id}: ${a.width}x${a.height} cabe na caixa ${width}x${height}`);
    assert.ok(a.width > 45 && a.height > 40, `${id}: tem corpo`);
    assert.equal(a.saves, a.restores, `${id}: save/restore em par`);
  }
  assert.equal(new Set(MOUNT_IDS.map(id => render(id, .35).signature)).size, 10, "dez desenhos diferentes");
});

test("o kit de anatomia não usa sorteio nem relógio (a arte tem de ser a mesma a cada quadro)", () => {
  for (const f of ["limbs", "torso", "quadruped", "quadrupeds", "neck", "equineHead", "saddle", "warhorse", "mountainGoat", "imperialElk", "silverUnicorn", "fireLion", "cavernBear", "darkGriffin", "tidalHippocampus", "sandBasilisk", "cargoBeetle"]) {
    const source = readFileSync(new URL(`../src/render/creatures/mounts/${f}.ts`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /Math\.random|Date\.now|performance\.now/, f);
    assert.doesNotMatch(source, /\bany\b\s*[,;)>\]=]|@ts-ignore/, `${f}: sem any`);
  }
});

test("o pé que está no ar nunca afunda no chão e o pé nunca chega mais perto do quadril que a diferença dos ossos", () => {
  // perna comprida: com o alvo no chão (fase π, sem altura) o pé fica exatamente em y 0, nunca abaixo
  const long = leg({ upper: 20, lower: 20 });
  assert.ok(Math.abs(legPose(long, Math.PI).foot[1]) < 1e-9, "a fase de apoio traseiro apoia no chão, não abaixo dele");
  for (let k = 0; k < 48; k++) assert.ok(legPose(long, k * Math.PI / 24).foot[1] <= 1e-9, `fase ${k}`);
  // osso de cima muito maior que o de baixo, alvo colado no quadril: o pé não entra no osso de cima
  const folded = legPose(leg({ hipY: -1, stride: 0, lift: 0, upper: 15, lower: 5 }), 0);
  assert.ok(dist([0, -1], folded.foot) >= 10, `dobrada ${dist([0, -1], folded.foot)}`);
  assert.ok([...folded.knee, ...folded.foot].every(Number.isFinite));
});

test("cada perna usa a forma da sua posição (anterior ou posterior) e as pernas distantes e o pescoço entram na ordem certa de desenho", () => {
  for (const id of QUADRUPEDS) {
    const body = QUADRUPED_MOUNTS[id].body;
    for (const { spec } of quadrupedLegs(body, 0)) {
      const shape = spec.front ? body.frontLeg : body.rearLeg;
      assert.deepEqual([spec.upper, spec.lower, spec.widthTop, spec.widthKnee, spec.widthAnkle, spec.foot], [shape.upper, shape.lower, shape.widthTop, shape.widthKnee, shape.widthAnkle, shape.foot], `${id} ${spec.front ? "anterior" : "posterior"}`);
    }
    // ordem: pernas distantes, o que fica atrás do tronco, o tronco, as pernas próximas
    const out: string[] = [];
    const stub = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => { out.push(`${name}(${args.filter((a): a is number => typeof a === "number").join(",")})`); return name.startsWith("create") ? { addColorStop() {} } : undefined; }, set: () => true });
    drawQuadruped(stub as unknown as CanvasRenderingContext2D, PALETTES[id as MountId], body, .4, () => { out.push("MARCA"); });
    const mark = out.indexOf("MARCA"), torso = out.findIndex(c => c.startsWith("bezierCurveTo"));
    assert.ok(mark > 0 && torso > mark, `${id}: o que fica atrás vem antes do tronco`);
    const mass = (w: number) => (c: string) => c.startsWith("ellipse(") && c.split("(")[1]!.split(",")[2] === String(w * .78);
    const massCalls = (from: number, to: number) => out.slice(from, to).filter(c => mass(body.frontLeg.widthTop)(c) || mass(body.rearLeg.widthTop)(c)).length;
    assert.equal(massCalls(0, mark), 2, `${id}: as duas pernas distantes antes do tronco`);
    assert.equal(massCalls(torso, out.length), 2, `${id}: as duas pernas próximas depois do tronco`);
  }
});

test("a montaria inteira leva a sua própria anatomia, a sela e os enfeites da frente (cauda, rabo), nas dez espécies", () => {
  const t = stepTime(.35);
  for (const id of QUADRUPEDS) {
    const body = QUADRUPED_MOUNTS[id].body, all = calls(c => renderMount(c, id, 0, 0, .35));
    const mount = QUADRUPED_MOUNTS[id], p = PALETTES[id];
    assert.ok(contains(all, calls(c => drawSaddle(c, p, body.torso))), `${id}: sela`);
    assert.ok(contains(all, calls(c => mount.front(c, p, t))), `${id}: enfeites da frente`);
    assert.ok(contains(all, calls(c => drawQuadruped(c, p, body, t, () => mount.behind(c, p, t)))), `${id}: corpo`);
  }
  assert.ok(contains(calls(c => renderMount(c, "tidal-hippocampus", 0, 0, .35)), calls(c => drawTidalHippocampus(c, PALETTES["tidal-hippocampus"], t))), "hipocampo");
  assert.ok(contains(calls(c => renderMount(c, "sand-basilisk", 0, 0, .35)), calls(c => renderSandBasiliskDetail(c, t))), "basilisco");
  assert.ok(contains(calls(c => renderMount(c, "cargo-beetle", 0, 0, .35)), calls(c => renderCargoBeetleDetail(c, t))), "besouro");
});
