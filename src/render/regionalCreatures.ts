import { monsterPose } from "./monsterMotion.ts";
import { drawBasaltGolem } from "./creatures/west/golems/basaltGolem.ts";
import { drawDraconid } from "./creatures/west/draconids/cliffDraconid.ts";
import { drawHydra } from "./creatures/south/hydras/mireHydra.ts";
import { drawScorpion } from "./creatures/south/scorpions/duneScorpion.ts";
import { drawScarab } from "./creatures/south/beetles/solarScarab.ts";
import { drawYeti } from "./creatures/north/yetis/borealYeti.ts";
import { drawWolf } from "./creatures/north/wolves/glacialWolf.ts";
import { drawSpirit } from "./creatures/north/spirits/frostSpirit.ts";
import { drawCrab } from "./creatures/east/crabs/coralCrab.ts";
import { drawSerpent } from "./creatures/east/serpents/stormSerpent.ts";
import { renderSandBeetle } from "./creatures/south/beetles/sandBeetle.ts";
import { renderWave3Creature } from "./regionalWave3.ts";
import { renderWave2Creature } from "./regionalWave2.ts";
import { CREATURE_CATALOG, SECOND_WAVE_KINDS, SOUTH_COMMON_KINDS, type SouthCommonKind, type SecondWaveKind, type RegionalCreatureKind } from "../actors/CreatureCatalog.ts";
import { clamp01, ellipse, hashString, mix, pill, rgba, softShadow, TAU } from "./draw.ts";

export interface RegionalCreatureVisual {
  readonly kind: RegionalCreatureKind;
  readonly hp: number;
  readonly id?: string;
  readonly hurtTime?: number;
  readonly casting?: number;
  readonly motionPhase?: number;
  readonly moving?: number;
}
import type { ColorRamp } from "./creatures/shared/regionalGeometry.ts";
import { OUTLINE, GLINT } from "./creatures/shared/regionalGeometry.ts";
const PALETTE: Readonly<Partial<Record<RegionalCreatureKind, ColorRamp>>> = {
  "basalt-golem": { base: "#716f6b", light: "#b4a79a", dark: "#343944", accent: "#729267", eye: "#ffbf59" },
  "cliff-draconid": { base: "#66646a", light: "#b0a499", dark: "#292d3b", accent: "#e38b4f", eye: "#f7bb4d" },
  "mire-hydra": { base: "#4bba66", light: "#a0e375", dark: "#376a56", accent: "#ad54b1", eye: "#b6f6ef" },
  "dune-scorpion": { base: "#b88842", light: "#f2d184", dark: "#504636", accent: "#f4a345", eye: "#ffd46c" },
  "solar-scarab": { base: "#ab713d", light: "#eec37d", dark: "#443442", accent: "#f0a859", eye: "#ffe09a" },
  "boreal-yeti": { base: "#8dbed4", light: "#e5f5f0", dark: "#376184", accent: "#9edcf1", eye: "#293750" },
  "glacial-wolf": { base: "#368cc4", light: "#a0f0fd", dark: "#24436e", accent: "#5bccf9", eye: "#e9fcfc" },
  "frost-spirit": { base: "#519bcc", light: "#dcf7ff", dark: "#205c8e", accent: "#83e4ff", eye: "#cffaff" },
  "coral-crab": { base: "#af6745", light: "#f3a36d", dark: "#5a3d43", accent: "#7ab79a", eye: "#fff1b6" },
  "storm-serpent": { base: "#4653ac", light: "#79d1de", dark: "#302656", accent: "#d37ad8", eye: "#fce46f" },
};

/** Desenha o bestiário regional por renderizadores procedurais, sem PNGs. */
export function renderRegionalCreature(ctx: CanvasRenderingContext2D,
  creature: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  if (creature.kind === "sand-beetle") {
    renderSandBeetle(ctx, creature, sx, sy, time);
    return;
  }
  if(SOUTH_COMMON_KINDS.some(kind=>kind===creature.kind)) {
    renderWave3Creature(ctx,{...creature,kind:creature.kind as SouthCommonKind},sx,sy,time);
    return;
  }
  if (SECOND_WAVE_KINDS.some(kind => kind === creature.kind)) {
    renderWave2Creature(ctx, {...creature,kind:creature.kind as SecondWaveKind},sx,sy,time);
    return;
  }
  const c=PALETTE[creature.kind]!, seed=hashString(creature.id ?? creature.kind);
  const max=CREATURE_CATALOG[creature.kind].maxHp;
  const flash=clamp01((creature.hurtTime ?? 0)/.24);
  ctx.save();ctx.translate(sx,sy);
  softShadow(ctx,0,3,25,7,.34);
  const pose=monsterPose(creature,time);
  ctx.translate(pose.sway,pose.lift);
  ctx.rotate(pose.tilt);
  ctx.scale(pose.stretchX,pose.stretchY);
  if(flash>.01)ctx.globalAlpha=1;
  switch(creature.kind) {
    case "basalt-golem": drawBasaltGolem(ctx,c);break;
    case "cliff-draconid": drawDraconid(ctx,c,time);break;
    case "mire-hydra": drawHydra(ctx,c,time);break;
    case "dune-scorpion": drawScorpion(ctx,c);break;
    case "solar-scarab": drawScarab(ctx,c,time);break;
    case "boreal-yeti": drawYeti(ctx,c);break;
    case "glacial-wolf": drawWolf(ctx,c,time);break;
    case "frost-spirit": drawSpirit(ctx,c,time);break;
    case "coral-crab": drawCrab(ctx,c,time);break;
    case "storm-serpent": drawSerpent(ctx,c,time);break;
  }
  // Micro-reflexos e grãos da matéria completam o volume sem textura externa.
  for(let i=0;i<7;i++){
    const px=Math.sin(i*23.1+seed*17)*14,py=-9-Math.abs(Math.cos(i*11.7+seed))*23;
    ellipse(ctx,px,py,1.1+i%3*.5,.55+i%2*.25,i%2?rgba(c.accent,.6):rgba(c.light,.6));
    ellipse(ctx,px-.4,py-.7,.5,.3,rgba(GLINT,.55));
  }
  if(flash>.02){
    ellipse(ctx,0,-28,26,29,rgba(GLINT,flash*.29));
  }
  if((creature.casting??0)>0){
    ctx.strokeStyle=rgba(c.accent,.38+clamp01(creature.casting??0)*.55);
    ctx.lineWidth=2.2;
    ctx.beginPath();ctx.arc(0,-18,26,0,TAU);ctx.stroke();
  }
  ctx.restore();
  // Barra de vida só aparece quando sofreu dano.
  if(creature.hp<max){
    const value=clamp01(creature.hp/max);
    ctx.save();ctx.translate(sx,sy);
    ctx.fillStyle=rgba(OUTLINE,.85);pill(ctx,-17,-73,34,6);ctx.fill();
    ctx.fillStyle=mix("#d85f45","#a6e08f",value);pill(ctx,-15,-71.7,30*value,3);ctx.fill();
    ctx.fillStyle=rgba(GLINT,.6);ctx.fillRect(-15,-71.7,30*value,1);
    ctx.restore();
  }
}
