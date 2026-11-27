import test from "node:test";
import assert from "node:assert/strict";
import { Journey, JOURNEY_ARRIVAL, JOURNEY_LEG, nearestWalkable, type FindPath } from "../src/engine/movement/Journey.ts";
import { TapNavigator, findWalkingPath, type Point } from "../src/engine/movement/TapNavigator.ts";
import { moveBody, type CollisionMap } from "../src/world/collision.ts";

/**
 * Viagem de longa distância (ADR 0099): trechos locais até um ponto distante, com memória dos lugares visitados para escapar de armadilhas. Os mapas aqui são de mentira
 * (retângulos de água e parede) e a caminhada é de verdade: o `TapNavigator` real conduz o herói por cada trecho e `moveBody` o move com colisão.
 */
const SPEED = 140, DT = 1 / 30;
const open: CollisionMap = { canMove: () => true };
type Box = readonly [x0: number, y0: number, x1: number, y1: number];
const world = (...boxes: Box[]): CollisionMap => ({ canMove: (x, y) => !boxes.some(([x0, y0, x1, y1]) => x > x0 - 8 && x < x1 + 8 && y > y0 - 8 && y < y1 + 8) });
interface Trip { arrived: boolean; stuck: boolean; legs: number; seconds: number; at: Point; path: Point[] }
/** Anda a viagem inteira como o jogo faz: sem trecho em andamento, planeja; o navegador conduz o herói; para ao chegar, ao ficar sem saída ou no tempo limite. */
function travel(journey: Journey, collision: CollisionMap, from: Point, limit = 2400, find?: FindPath): Trip {
  const hero = { x: from.x, y: from.y }, nav = new TapNavigator(), path: Point[] = [{ ...hero }];
  let legs = 0, seconds = 0;
  for (let t = 0; t < limit; t += DT) {
    seconds = t;
    if (!nav.target) {
      const plan = journey.plan(hero, collision, find);
      if (plan.kind === "arrived") return { arrived: true, stuck: false, legs, seconds, at: hero, path };
      if (plan.kind === "stuck") return { arrived: false, stuck: true, legs, seconds, at: hero, path };
      legs++; nav.go(hero, plan.to, collision);
    }
    const dir = nav.direction(hero, DT);
    moveBody(hero, dir.x * SPEED * DT, dir.y * SPEED * DT, collision);
    if (Math.round(t / DT) % 3 === 0) path.push({ x: hero.x, y: hero.y });
  }
  return { arrived: false, stuck: false, legs, seconds, at: hero, path };
}
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

test("constantes: o trecho cabe no A* local (650) e a chegada é de uma carinha", () => {
  assert.equal(JOURNEY_LEG, 560); assert.ok(JOURNEY_LEG < 650);
  assert.equal(JOURNEY_ARRIVAL, 40);
});

test("sem viagem não há o que planejar; start valida, e cancel apaga tudo", () => {
  const journey = new Journey();
  assert.equal(journey.active, false); assert.equal(journey.destination, null); assert.equal(journey.remaining({ x: 0, y: 0 }), 0);
  assert.deepEqual(journey.plan({ x: 0, y: 0 }, open), { kind: "arrived" });
  for (const bad of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }]) assert.equal(journey.start(bad), false, "destino inválido");
  assert.equal(journey.active, false);
  assert.equal(journey.start({ x: 3000, y: 400 }), true); assert.equal(journey.active, true);
  assert.deepEqual(journey.destination, { x: 3000, y: 400 });
  assert.equal(journey.remaining({ x: 0, y: 400 }), 3000);
  assert.equal(journey.start({ x: 10, y: 10 }), true); assert.deepEqual(journey.destination, { x: 10, y: 10 }, "uma viagem nova substitui a anterior");
  journey.cancel(); assert.equal(journey.active, false); assert.equal(journey.destination, null);
});

test("campo aberto: trechos de 560 em linha reta até chegar", () => {
  const journey = new Journey(); journey.start({ x: 3000, y: 0 });
  const first = journey.plan({ x: 0, y: 0 }, open);
  assert.deepEqual(first, { kind: "leg", to: { x: JOURNEY_LEG, y: 0 } }, "o primeiro trecho vai direto, com 560");
  const trip = travel(Object.assign(new Journey(), {}), open, { x: 0, y: 0 }); assert.equal(trip.arrived, true, "sem viagem já está chegado");
  const real = new Journey(); real.start({ x: 3000, y: 0 }); const run = travel(real, open, { x: 0, y: 0 });
  assert.equal(run.arrived, true); assert.ok(near(run.at, { x: 3000, y: 0 }) < JOURNEY_ARRIVAL + 10, "parou perto do destino");
  assert.equal(run.legs, 6, "3000 / 560 = 6 trechos (cinco de 560 e o último direto)");
  assert.ok(run.seconds < 3000 / SPEED * 1.15, "quase em linha reta: 3000 a 140 por segundo");
  assert.equal(real.active, false, "chegou: a viagem se encerra");
});

test("o último trecho vai direto ao destino, e dentro da chegada a viagem acaba sem andar", () => {
  const journey = new Journey(); journey.start({ x: 300, y: 400 });
  assert.deepEqual(journey.plan({ x: 0, y: 0 }, open), { kind: "leg", to: { x: 300, y: 400 } });
  journey.start({ x: 100, y: 0 });
  assert.deepEqual(journey.plan({ x: 100 - JOURNEY_ARRIVAL + 1, y: 0 }, open), { kind: "arrived" }); assert.equal(journey.active, false);
  journey.start({ x: 100, y: 0 });
  assert.equal(journey.plan({ x: 100 - JOURNEY_ARRIVAL - 1, y: 0 }, open).kind, "leg", "a 41 ainda anda");
});

test("uma parede com uma fresta: a viagem acha a fresta", () => {
  const collision = world([1000, -2000, 1060, -150], [1000, 150, 1060, 2000]); // fresta de 300 no meio
  const journey = new Journey(); journey.start({ x: 2200, y: 40 });
  const trip = travel(journey, collision, { x: 0, y: 40 });
  assert.equal(trip.arrived, true, "chegou do outro lado da parede"); assert.ok(near(trip.at, { x: 2200, y: 40 }) < 60);
  assert.ok(trip.path.some(p => p.x > 1000 && p.x < 1060 && Math.abs(p.y) < 150), "passou pela fresta");
});

test("um lago grande no meio do caminho: a viagem contorna", () => {
  const lake = world([800, -700, 1700, 700]);
  const journey = new Journey(); journey.start({ x: 2600, y: 0 });
  const trip = travel(journey, lake, { x: 0, y: 0 });
  assert.equal(trip.arrived, true); assert.ok(near(trip.at, { x: 2600, y: 0 }) < 60);
  assert.ok(trip.path.every(p => lake.canMove(p.x, p.y)), "nunca entrou na água");
  assert.ok(trip.path.some(p => Math.abs(p.y) > 700), "contornou por cima ou por baixo");
});

test("a armadilha em U, com a boca para o herói: a memória de visitas faz a viagem escapar e chegar", () => {
  const trap = world([900, -600, 960, 600], [900, -600, 1700, -540], [900, 540, 1700, 600]); // U aberto para o lado de onde o herói vem
  const journey = new Journey(); journey.start({ x: 2400, y: 0 });
  const trip = travel(journey, trap, { x: 0, y: 0 }, 4000);
  assert.equal(trip.arrived, true, "escapou do U e chegou"); assert.ok(near(trip.at, { x: 2400, y: 0 }) < 60);
  assert.ok(trip.legs < 60, `sem ficar rodando: ${trip.legs} trechos`);
});

test("um destino cercado (ilha): depois de tentar, a viagem desiste e para, sem andar em círculos para sempre", () => {
  const island = world([1950, -400, 2000, 400], [2600, -400, 2650, 400], [1950, -400, 2650, -350], [1950, 350, 2650, 400]); // um quarto fechado
  const journey = new Journey(); journey.start({ x: 2300, y: 0 });
  const trip = travel(journey, island, { x: 0, y: 0 }, 1500);
  assert.equal(trip.arrived, false); assert.equal(trip.stuck, true, "desistiu");
  assert.equal(journey.active, false, "e a viagem se encerrou");
});

test("sem nenhum trecho possível a viagem desiste na hora", () => {
  const journey = new Journey(); journey.start({ x: 3000, y: 0 });
  assert.deepEqual(journey.plan({ x: 0, y: 0 }, open, () => null), { kind: "stuck" });
  assert.equal(journey.active, false);
  journey.start({ x: 3000, y: 0 });
  assert.deepEqual(journey.plan({ x: NaN, y: 0 }, open), { kind: "stuck" }, "posição inválida");
});

test("trechos que não levam a lugar nenhum contam como falha: depois de quatro, desiste", () => {
  const journey = new Journey(); journey.start({ x: 3000, y: 0 });
  const stay = { x: 0, y: 0 };
  const kinds: string[] = [];
  for (let i = 0; i < 8 && journey.active; i++) kinds.push(journey.plan(stay, open).kind);
  assert.deepEqual(kinds, ["leg", "leg", "leg", "leg", "stuck"], "o herói não saiu do lugar: o quinto planejamento desiste");
  const moving = new Journey(); moving.start({ x: 20000, y: 0 });
  for (let i = 0; i < 12; i++) assert.equal(moving.plan({ x: i * 500, y: 0 }, open).kind, "leg", "andando bem nunca desiste");
});

test("a memória de visitas: um lugar já muito usado custa mais, e o trecho muda", () => {
  const fresh = new Journey(); fresh.start({ x: 1100, y: 0 });
  assert.deepEqual(fresh.plan({ x: 0, y: 0 }, open), { kind: "leg", to: { x: 560, y: 0 } }, "sem visitas, o trecho vai direto");
  const worn = new Journey(); worn.start({ x: 1100, y: 0 });
  for (let i = 0; i < 3; i++) { worn.plan({ x: 600, y: 0 }, open); (worn as unknown as { lastLegFrom: Point | null }).lastLegFrom = null; } // o herói passou três vezes por ali
  const plan = worn.plan({ x: 0, y: 0 }, open);
  assert.equal(plan.kind, "leg");
  if (plan.kind === "leg") assert.notDeepEqual(plan.to, { x: 560, y: 0 }, "o lugar gasto ficou caro: escolhe outro");
});

test("sem chegar mais perto por muitos trechos, a viagem desiste (e chegar mais perto zera a conta)", () => {
  const journey = new Journey(); journey.start({ x: 5000, y: 0 });
  const wander = [{ x: 0, y: 0 }, { x: 0, y: 400 }];
  let plans = 0;
  while (journey.active && plans < 200) { journey.plan(wander[plans % 2]!, open); (journey as unknown as { lastLegFrom: Point | null }).lastLegFrom = null; plans++; }
  assert.equal(journey.active, false, "desistiu"); assert.equal(plans, 32, "o primeiro trecho conta como ganho e mais 30 sem ganho; o seguinte desiste");
  const gaining = new Journey(); gaining.start({ x: 90000, y: 0 });
  for (let i = 0; i < 200; i++) assert.equal(gaining.plan({ x: i * 60, y: 0 }, open).kind, "leg", "ganhando 60 por trecho nunca desiste");
});

test("determinístico: o mesmo mapa e a mesma partida dão a mesma viagem", () => {
  const lake = world([800, -700, 1700, 700]);
  const run = () => { const j = new Journey(); j.start({ x: 2600, y: 0 }); return travel(j, lake, { x: 0, y: 0 }); };
  const a = run(), b = run();
  assert.deepEqual(a.path, b.path); assert.equal(a.legs, b.legs);
});

test("com a busca de caminho de verdade, o primeiro trecho de uma volta nunca passa de 650", () => {
  const lake = world([800, -700, 1700, 700]), journey = new Journey(); journey.start({ x: 2600, y: 0 });
  const calls: number[] = [];
  const spy: FindPath = (from, to, collision) => { calls.push(near(from, to)); return findWalkingPath(from, to, collision); };
  journey.plan({ x: 300, y: 0 }, lake, spy);
  assert.ok(calls.length > 0 && calls.every(d => d <= 650), "pede ao A* só trechos dentro do limite");
});

test("destino em água ou parede: nearestWalkable acha o chão mais perto, e nada se não houver", () => {
  const lake = world([0, 0, 400, 400]);
  assert.deepEqual(nearestWalkable({ x: 800, y: 800 }, lake), { x: 800, y: 800 }, "já é chão");
  const snapped = nearestWalkable({ x: 200, y: 200 }, lake)!;
  assert.ok(snapped && lake.canMove(snapped.x, snapped.y), "achou chão");
  assert.ok(near(snapped, { x: 200, y: 200 }) < 260, "o mais perto: a borda do lago");
  assert.equal(nearestWalkable({ x: 200, y: 200 }, lake, 20), null, "dentro do raio não há chão");
  assert.equal(nearestWalkable({ x: NaN, y: 0 }, open), null);
  assert.equal(nearestWalkable({ x: 5, y: 5 }, { canMove: () => false }), null, "mundo todo parede");
});

test("só ganhos de verdade contam: oscilar entre dois pontos quase iguais desiste no trigésimo segundo planejamento", () => {
  const journey = new Journey(); journey.start({ x: 20000, y: 0 });
  const spots = [{ x: 0, y: 0 }, { x: 20, y: 0 }]; let plans = 0;
  while (journey.active && plans < 200) { journey.plan(spots[plans % 2]!, open); plans++; }
  assert.equal(plans, 32, "20 de ganho não chega a 32: a conta de 'sem ganho' segue correndo");
});

test("chegar mais perto zera a conta de trechos sem ganho", () => {
  const journey = new Journey(); journey.start({ x: 20000, y: 0 });
  const shuffle = (x: number, times: number) => { for (let i = 0; i < times; i++) journey.plan({ x: x + (i % 2) * 20, y: 0 }, open); };
  shuffle(0, 20); assert.equal(journey.active, true, "vinte sem ganho ainda não desiste");
  shuffle(300, 20); assert.equal(journey.active, true, "o ganho no meio zerou a conta: mais vinte sem ganho também não desistem");
  shuffle(300, 20); assert.equal(journey.active, false, "sem novo ganho, os próximos desistem");
});

test("em campo aberto o primeiro trecho custa uma só busca de caminho (nem olha os outros candidatos)", () => {
  const journey = new Journey(); journey.start({ x: 3000, y: 0 }); let calls = 0;
  journey.plan({ x: 0, y: 0 }, open, (from, to, collision) => { calls++; return findWalkingPath(from, to, collision); });
  assert.equal(calls, 1);
});

test("se só um trecho curto cabe, a viagem usa o trecho curto", () => {
  const pocket: CollisionMap = { canMove: (x, y) => Math.hypot(x, y) < 250 };
  const journey = new Journey(); journey.start({ x: 3000, y: 0 });
  const plan = journey.plan({ x: 0, y: 0 }, pocket);
  assert.equal(plan.kind, "leg");
  if (plan.kind === "leg") assert.ok(Math.abs(Math.hypot(plan.to.x, plan.to.y) - JOURNEY_LEG * .36) < 1, "o trecho de 36 % cabe na bolsa de 250");
});

test("cancelar apaga as visitas: a viagem seguinte começa limpa", () => {
  const journey = new Journey(); journey.start({ x: 1100, y: 0 });
  for (let i = 0; i < 3; i++) { journey.plan({ x: 600, y: 0 }, open); (journey as unknown as { lastLegFrom: Point | null }).lastLegFrom = null; }
  journey.cancel(); journey.start({ x: 1100, y: 0 });
  assert.deepEqual(journey.plan({ x: 0, y: 0 }, open), { kind: "leg", to: { x: 560, y: 0 } }, "sem a memória da viagem anterior, vai direto");
});

test("nearestWalkable procura de perto para longe: acha a borda mais próxima, não uma qualquer", () => {
  const lake = world([0, 0, 400, 4000]), snapped = nearestWalkable({ x: 150, y: 200 }, lake)!; // um lago comprido: a saída mais perto é a borda de oeste
  assert.ok(near(snapped, { x: 150, y: 200 }) < 170, `a borda de oeste fica a uns 158 (achou a ${near(snapped, { x: 150, y: 200 }).toFixed(0)})`);
});
