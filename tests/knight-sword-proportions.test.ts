import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { WEAPON_IDS, WEAPONS } from "../src/engine/character/Weapons.ts";
import { ATTACK_DURATION } from "../src/engine/combat/combat.ts";
import { attackBody, KNIGHT_SWORD_GRIP, KNIGHT_SWORD_SCALE, swordMount, swordSwing, swingTrail } from "../src/render/heroPose.ts";
import { drawKnightSword, drawKnightTrail } from "../src/render/swords.ts";
import { renderHero } from "../src/render/actors.ts";
import { Recorder } from "./helpers/recordingContext.ts";

const directions = [
  {faceX:0,faceY:1},{faceX:0,faceY:-1},{faceX:1,faceY:0},
  {faceX:-1,faceY:0},{faceX:.7,faceY:.7},{faceX:-.7,faceY:-.7},
] as const;
const gear = { head:"trail-helm", shield:"willow-shield", chest:"quilted-vest",
  feet:"trail-boots", legs:"travel-trousers", backpack:"canvas-pack", neck:"river-pendant" } as const;

test("espada: mão do cavaleiro e cabo permanecem juntos na cintura, em todas as direções",()=>{
  for(const direction of directions)for(const attackTime of [0,ATTACK_DURATION,ATTACK_DURATION*.35]){
    const f=swordMount({...direction,attackTime,attackWeapon:"starter"});
    assert.equal(f.attacking,attackTime>0);
    assert.equal(f.scale,KNIGHT_SWORD_SCALE);
    assert.ok(f.gripY>=-17 && f.gripY<=-13,"a mão não pode cair nos pés");
    assert.ok(Math.abs(f.gripX)<=13,"a mão fica perto do tronco");
    assert.ok(Math.abs(f.ox+Math.cos(f.rot)*KNIGHT_SWORD_GRIP*f.scale-f.gripX)<1e-10);
    assert.ok(Math.abs(f.oy+Math.sin(f.rot)*KNIGHT_SWORD_GRIP*f.scale-f.gripY)<1e-10);
    const tipX=f.ox+Math.cos(f.rot)*44*f.scale;
    const tipY=f.oy+Math.sin(f.rot)*44*f.scale;
    assert.ok(Math.hypot(tipX-f.gripX,tipY-f.gripY)<22,"espada astral proporcional ao cavaleiro");
  }
});

test("arte: dez espadas renderizam dentro da escala do cavaleiro com equipamento",()=>{
  assert.ok(KNIGHT_SWORD_SCALE<=.65);
  for(const equippedWeapon of WEAPON_IDS)for(const direction of directions)
    for(const attackTime of [0,ATTACK_DURATION]){
      const r=new Recorder();
      renderHero(r.ctx,{...direction,walkTime:0,attackTime,
        equippedWeapon,attackWeapon:equippedWeapon,gear},100,100,1);
      const m=r.metrics();
      assert.equal(m.saves,m.restores,equippedWeapon);
      assert.ok(m.width<85 && m.height<80,
        `${equippedWeapon} (${direction.faceX},${direction.faceY}): ${m.width} × ${m.height}`);
      assert.ok(m.paintOps>30);
    }
});

test("rastro: acompanha a mão, não forma um arco maior que o cavaleiro",()=>{
  for(const weapon of WEAPON_IDS){
    const attackTime=ATTACK_DURATION*.6;
    const f=swordMount({faceX:0,faceY:1,attackTime,attackWeapon:weapon});
    const trail=swingTrail(attackTime,weapon);
    if(trail.alpha<=0)continue;
    const r=new Recorder();
    r.ctx.save();r.ctx.translate(f.gripX,f.gripY);r.ctx.scale(f.scale,f.scale);
    drawKnightTrail(r.ctx,weapon,Math.PI/2,trail.angles,trail.alpha);
    r.ctx.restore();
    const m=r.metrics();
    assert.equal(m.saves,m.restores,weapon);
    assert.ok(m.width<65 && m.height<65,`rastro de ${weapon} desproporcional`);
  }
});

test("animação: preparo, contato e rastro respeitam o tempo de todas as espadas",()=>{
  for(const weapon of WEAPON_IDS){
    const hitTime=ATTACK_DURATION-WEAPONS[weapon].windup;
    assert.ok(Math.abs(swordSwing(hitTime,weapon).angle)<1e-10,weapon);
    assert.ok(Math.abs(attackBody(hitTime,weapon).lunge)<1e-8,weapon);
    assert.ok(swingTrail(hitTime,weapon).angles.length>0,weapon);
    assert.equal(swingTrail(0,weapon).alpha,0);
  }
});

test("acabamento animado usa o tempo do jogo, é determinístico e não altera lâminas comuns",()=>{
  for(const weapon of ["dunes","boreal","obsidian","marsh","tempest","astral"] as const){
    const first=new Recorder(),again=new Recorder(),later=new Recorder();
    drawKnightSword(first.ctx,weapon,0,c=>c,.25);
    drawKnightSword(again.ctx,weapon,0,c=>c,.25);
    drawKnightSword(later.ctx,weapon,0,c=>c,1.1);
    assert.equal(first.metrics().signature,again.metrics().signature,weapon+" perdeu determinismo");
    assert.notEqual(first.metrics().signature,later.metrics().signature,weapon+" não anima com o tempo");
    assert.equal(first.metrics().saves,first.metrics().restores,weapon+" desbalanceia o Canvas");
    assert.equal(later.metrics().saves,later.metrics().restores,weapon+" não restaura o Canvas");
    assert.ok(later.metrics().width<100 && later.metrics().height<80,weapon+" extrapolou a silhueta");
  }
  for(const weapon of ["starter","forge","bronze","copper"] as const){
    const first=new Recorder(),later=new Recorder();
    drawKnightSword(first.ctx,weapon,0,c=>c,.25);
    drawKnightSword(later.ctx,weapon,0,c=>c,1.1);
    assert.equal(first.metrics().signature,later.metrics().signature,weapon+" ganhou efeitos mágicos indevidos");
  }
  const hero=readFileSync("src/render/actors.ts","utf8");
  assert.ok(hero.includes("drawKnightSword(ctx,weapon,impact,tone,time)"),
    "o tempo deve vir do renderHero usado no jogo e na prévia");
});

test("rastros materiais: seis geometrias distintas e determinísticas, sem desvio do cavaleiro",()=>{
  const elemental=["dunes","boreal","obsidian","marsh","tempest","astral"] as const;
  const signatures=new Set<string>();
  const angles=[-1.2,-1,-.8,-.55,-.25,0] as const;
  for(const weapon of elemental) {
    const a=new Recorder(),b=new Recorder();
    drawKnightTrail(a.ctx,weapon,Math.PI/2,angles,.8);
    drawKnightTrail(b.ctx,weapon,Math.PI/2,angles,.8);
    const first=a.metrics(),second=b.metrics();
    assert.equal(first.signature,second.signature,weapon+" não determinístico");
    assert.equal(first.saves,first.restores,weapon+" desequilibra o Canvas");
    assert.ok(first.paintOps>=10,weapon+" sem acabamento de material");
    assert.ok(first.width<100 && first.height<100,weapon+" efeito extrapola a mão");
    assert.ok(first.usesAlpha,weapon+" rastro sem dissipação");
    signatures.add(first.signature);
  }
  assert.equal(signatures.size,elemental.length,"motivos diferentes repetem o mesmo traçado");
  for(const weapon of WEAPON_IDS){
    const r=new Recorder();
    drawKnightTrail(r.ctx,weapon,0,[],0);
    assert.equal(r.metrics().paintOps,0,weapon+" desenha sem ataque");
  }
});

test("fita afilada e raios orientados ao golpe mantêm escala e determinismo",()=>{
  const angles=[-1,-.8,-.6,-.4,-.2,0] as const;
  const signatures=new Set<string>();
  for(const face of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const a=new Recorder(),b=new Recorder();
    drawKnightTrail(a.ctx,"tempest",face,angles,.8);
    drawKnightTrail(b.ctx,"tempest",face,angles,.8);
    const first=a.metrics(),second=b.metrics();
    assert.equal(first.signature,second.signature,"golpe não determinístico");
    assert.equal(first.saves,first.restores,"estado Canvas não restaurado");
    assert.ok(first.gradients>=2,"fita sem volume e esmaecimento");
    assert.ok(first.width<85 && first.height<85,"efeito extrapolou o herói");
    assert.ok(first.usesAlpha,"rastro deve ter transparência");
    signatures.add(first.signature);
  }
  assert.equal(signatures.size,4,"rastro não segue as quatro direções");
  const renderer=readFileSync("src/render/swords/shared.ts","utf8");
  assert.ok(renderer.includes("s.trailThickness"),"largura não veio da ficha");
  assert.ok(renderer.includes("Math.sin(Math.PI*t)"),"falta afilamento nas extremidades");
  assert.ok(readFileSync("src/render/swords/tempest.ts","utf8").includes("x-tx*4-nx"),"raio usa coordenada global, não a orientação do golpe");
});
