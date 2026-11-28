import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderHero } from "../src/render/actors.ts";
import { BOW_BELLY, BOW_FULL_DRAW, BOW_HALF, BOW_TIP_X, drawBow } from "../src/render/bows/bow.ts";
import { drawNockedArrow } from "../src/render/bows/nock.ts";
import { bowMount } from "../src/render/heroPose.ts";
import { NO_CAST, castPhase } from "../src/render/spells/castPose.ts";
import { ATTACK_DURATION } from "../src/engine/combat/combat.ts";
import { BOWS } from "../src/engine/character/Bows.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/** O arco do Arqueiro na mão e a pose de atirar (ADR 0116, lote A2b): o arco ao lado do corpo, erguido no tiro, a mão livre puxando a corda e soltando. Só apresentação. */
const BOW = BOWS.hunting, WINDUP = BOW.windup, V = BOW.visual;
const left = (elapsed: number): number => ATTACK_DURATION - elapsed;
const phase = (elapsed: number) => castPhase(left(elapsed), WINDUP);
const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;
const POSE = { faceX: 1, faceY: 0, walkTime: 0, attackTime: 0, attackWeapon: "starter", equippedWeapon: "starter", vx: 0, vy: 0, id: "arq", heroClass: "archer" };
const hero = (extra: Record<string, unknown> = {}): string => signature(c => renderHero(c, { ...POSE, ...extra } as never, 3, 4, 1.2));
const shooting = (elapsed: number, extra: Record<string, unknown> = {}): string => hero({ attackTime: left(elapsed), attackBow: "hunting", attackWindup: WINDUP, ...extra });
const usesColor = (s: ReturnType<typeof spy>, hex: string): boolean => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return s.raw.some(c => c.toLowerCase() === hex || c.replace(/\s/g, "").startsWith(`rgba(${r},${g},${b},`));
};

test("o arco em repouso: ao lado do corpo, quase em pé, sem corda puxada, do lado da mão que o segura", () => {
  const right = bowMount({ faceX: 1, faceY: 0 }), leftSide = bowMount({ faceX: -1, faceY: 0 }), front = bowMount({ faceX: 0, faceY: 1 });
  assert.deepEqual([right.hand, right.gripX, right.gripY, right.belly, right.raise, right.draw], [1, 10, -14, 1, 0, 0]);
  assert.ok(near(right.rot, 0.14)); assert.deepEqual([right.ox, right.oy], [right.gripX, right.gripY]);
  assert.deepEqual([leftSide.hand, leftSide.gripX, leftSide.belly], [-1, -10, -1]); assert.ok(near(leftSide.rot, -0.14));
  assert.deepEqual([front.hand, front.belly, front.gripX], [1, 1, 10], "de frente usa a mão de sempre");
  assert.ok(near(bowMount({ faceX: 1 }, 0.05).rot, 0.19), "balança com o passo");
  assert.deepEqual([bowMount({ faceX: 1 }, 0, NO_CAST).raise, bowMount({ faceX: 1 }).draw], [0, 0]);
});

test("no tiro o arco ergue e estica para o alvo e a corda é puxada até o fim do preparo; na saída a corda solta e o braço volta", () => {
  const start = bowMount({ faceX: 1, faceY: 0 }, 0, phase(0)), mid = bowMount({ faceX: 1, faceY: 0 }, 0, phase(WINDUP / 2)), full = bowMount({ faceX: 1, faceY: 0 }, 0, phase(WINDUP));
  assert.deepEqual([start.raise, start.draw], [0, 0], "no primeiro instante nada mudou");
  assert.ok(mid.draw > 0.2 && mid.draw < 0.8 && mid.raise > start.raise, "no meio do preparo a corda vem vindo e o braço sobe");
  assert.deepEqual([full.raise, full.draw], [1, 1], "no fim do preparo, braço esticado e corda toda puxada");
  assert.ok(near(full.gripX, 8.6) && near(full.gripY, -19.4) && near(full.rot, 0), "o braço do arco na altura do ombro, na direção do alvo, com o arco em pé");
  assert.ok(near(full.pullX, 8.6 + (BOW_TIP_X - BOW_FULL_DRAW)) && near(full.pullY, -19.4), "a mão que puxa a corda vai atrás da empunhadura, na mesma altura");
  const left = bowMount({ faceX: -1, faceY: 0 }, 0, phase(WINDUP));
  assert.ok(near(left.gripX, -8.6) && near(left.pullX, -8.6 - (BOW_TIP_X - BOW_FULL_DRAW)), "para a esquerda é o espelho");
  const front = bowMount({ faceX: 0, faceY: 1 }, 0, phase(WINDUP));
  assert.ok(near(front.gripX, 6.6) && near(front.gripY, -18.2), "de frente o arco fica à frente do peito, do lado da mão");
  const after = bowMount({ faceX: 1, faceY: 0 }, 0, phase(WINDUP + 0.04)), late = bowMount({ faceX: 1, faceY: 0 }, 0, phase(ATTACK_DURATION - 0.01));
  assert.ok(after.draw < full.draw && after.raise > 0.9, "logo depois da saída a corda já soltou e o braço segue erguido");
  assert.ok(late.raise < 0.3 && late.draw < 0.1, "no fim do golpe o braço quase voltou ao repouso, sem salto");
});

test("o arco desenhado: madeira, corda, couro, borla e pontas da ficha; a corda puxada mostra a flecha encaixada e muda o desenho", () => {
  const rest = spy(c => drawBow(c, "hunting", 0, t => t)), drawn = spy(c => drawBow(c, "hunting", 1, t => t));
  for (const tone of [V.limb.mid, V.limb.dark, V.string, V.wrap, V.wrapDark, V.tip, V.charm]) assert.ok(usesColor(rest, tone), tone);
  assert.ok(rest.calls.createLinearGradient! >= 1, "a madeira tem degradê");
  assert.notEqual(signature(c => drawBow(c, "hunting", 0, t => t)), signature(c => drawBow(c, "hunting", 1, t => t)));
  assert.ok(drawn.calls.fill! > rest.calls.fill! && drawn.calls.stroke! > rest.calls.stroke!, "só puxado há flecha encaixada");
  const fills = (d: number): number => spy(c => drawBow(c, "hunting", d, t => t)).calls.fill ?? 0;
  assert.equal(fills(0.03), fills(0), "abaixo de 4% da puxada ainda não há flecha"); assert.ok(fills(0.05) > fills(0), "a partir daí a flecha aparece encaixada");
  assert.equal(signature(c => drawBow(c, "hunting", Number.NaN, t => t)), signature(c => drawBow(c, "hunting", 0, t => t)), "puxada ruim vale 0");
  assert.equal(signature(c => drawBow(c, "hunting", 9, t => t)), signature(c => drawBow(c, "hunting", 1, t => t)), "e acima de 1 vale 1");
  assert.equal(signature(c => drawBow(c, "hunting", -3, t => t)), signature(c => drawBow(c, "hunting", 0, t => t)));
  assert.deepEqual([BOW_HALF, BOW_BELLY, BOW_TIP_X, BOW_FULL_DRAW], [13.5, 3.6, -2.6, 7.5]);
});

test("o desenho do arco passa as cores pelo tom do quadro (dano e golpe), e a ponta e o fundo da flecha encaixada seguem onde mandam", () => {
  const toned = spy(c => drawBow(c, "hunting", 1, () => "#abcdef"));
  assert.ok(usesColor(toned, "#abcdef")); for (const hex of [V.limb.mid, V.string, V.wrap, V.charm]) assert.equal(toned.raw.some(c => c.toLowerCase() === hex), false, hex + " passou sem o tom");
  const a = spy(c => drawNockedArrow(c, -8, 10, t => t)), b = signature(c => drawNockedArrow(c, -3, 10, t => t));
  assert.notEqual(signature(c => drawNockedArrow(c, -8, 10, t => t)), b, "o fundo recua com a puxada");
  assert.notEqual(signature(c => drawNockedArrow(c, -8, 10, t => t)), signature(c => drawNockedArrow(c, -8, 14, t => t)), "a ponta vai para onde mandam");
  assert.ok(a.calls.createLinearGradient! >= 1 && a.calls.quadraticCurveTo! >= 4, "haste com degradê, ponta e penas com curvas");
});

test("o herói Arqueiro com o arco: repouso, preparo, puxada cheia e soltura são desenhos diferentes, e o arco acompanha o lado e a direção", () => {
  const poses = [hero(), shooting(0.04), shooting(WINDUP), shooting(WINDUP + 0.05), shooting(0.2), shooting(0.27)];
  assert.equal(new Set(poses).size, poses.length, "cada momento do tiro é um desenho");
  assert.equal(shooting(0), hero({ attackTime: left(0), attackBow: "hunting", attackWindup: WINDUP }), "mesma conta");
  assert.notEqual(hero({ faceX: -1 }), hero(), "para a esquerda é outro desenho");
  assert.equal(new Set([[1, 0], [-1, 0], [0, 1], [0, -1]].map(([fx, fy]) => shooting(WINDUP, { faceX: fx!, faceY: fy! }))).size, 4, "nas quatro direções");
  assert.equal(shooting(WINDUP, { equippedStaff: "storm" }), shooting(WINDUP), "o cajado não aparece");
  assert.equal(hero({ equippedWeapon: "forge", attackWeapon: "forge" }), hero(), "nem a espada");
  assert.equal(hero({ attackBow: "hunting", attackTime: 0 }), hero(), "o arco só pose quando há golpe em andamento");
  assert.equal(hero({ attackTime: left(WINDUP), attackBow: null }), hero({ attackTime: left(WINDUP), attackBow: null, attackWindup: WINDUP }), "sem arco no golpe, o corpo não tem pose de tiro");
  assert.notEqual(hero({ attackTime: left(WINDUP), attackBow: "hunting" }), hero({ attackTime: left(WINDUP), attackBow: "hunting", attackWindup: 0.5 }), "o preparo da ficha do arco manda no tempo da pose");
  const withBow = spy(c => renderHero(c, { ...POSE, attackTime: left(WINDUP), attackBow: "hunting", attackWindup: WINDUP } as never, 3, 4, 1.2));
  for (const tone of [V.limb.mid, V.string, V.wrap]) assert.ok(usesColor(withBow, tone), tone);
  const knight = signature(c => renderHero(c, { ...POSE, heroClass: undefined, attackTime: left(WINDUP), attackWindup: WINDUP } as never, 3, 4, 1.2));
  assert.notEqual(knight, shooting(WINDUP));
});

test("a fiação: o desenho do herói monta o arco, ergue a mão livre até a corda e usa as fases do tiro", () => {
  const actors = readFileSync("src/render/actors.ts", "utf8"), pose = readFileSync("src/render/heroPose.ts", "utf8"), data = readFileSync("src/engine/character/weapons/bows/hunting.ts", "utf8");
  assert.match(actors, /const bow = bowman \? bowMount\(player, staffSway, cast\) : null;/);
  assert.match(actors, /const held: \{ readonly hand: number; readonly gripX: number; readonly gripY: number \} = bow \?\? \(look \? staffMount\(player, staffSway, cast\) : frame\);/);
  assert.match(actors, /if \(bow\) renderBow\(ctx, bow, player\.equippedBow \?\? DEFAULT_BOW, tone\);/);
  assert.match(actors, /return bow && s === -bow\.hand && bow\.raise > 0 && !rp \? \[x \+ \(bow\.pullX - x\) \* bow\.raise, y \+ \(bow\.pullY - y\) \* bow\.raise\] : \[x, y\];/);
  assert.match(actors, /const shooting = player\.heroClass === "archer" && player\.attackBow \? player\.attackBow : null;/);
  assert.match(actors, /ctx\.scale\(mount\.belly, 1\);/);
  assert.match(pose, /const raise = cast\.active \? Math\.min\(1, cast\.charge \* 1\.6 \+ cast\.thrust \* 1\.2\) : 0, draw = cast\.active \? cast\.charge : 0;/);
  assert.match(data, /charm: "#a8482a"/);
});
