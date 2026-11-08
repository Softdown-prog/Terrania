import { MOUNTS, MOUNT_IDS, RIDING_LEVEL, STABLE_UPGRADE_GEL, isMountId,
  type MountId, type RidingTier } from "../actors/MountCatalog.ts";
import { hash2 } from "../world/random.ts";
import { STABLE_MASTER,WILD_WARHORSE,WILD_APPLES,MOUNT_INTERACT_DISTANCE } from "../world/mountLocations.ts";
export { STABLE_MASTER,WILD_WARHORSE,WILD_APPLES,MOUNT_INTERACT_DISTANCE } from "../world/mountLocations.ts";

export const HALTER_GEL_COST = 3;
export const RIDE_STAMINA_DRAIN = 9;
export const RIDE_STAMINA_RECOVERY = 12;
type Tier = 0 | RidingTier;
export type MountAction = "build" | "upgrade" | "train" | "start-warhorse" |
  "make-halter" | "forage" | "tame" | "mount-warhorse" | "dismount";
export type MountActionResult = "built" | "upgraded" | "trained" | "quest-started" |
  "halter-made" | "apple-picked" | "tamed" | "mounted" | "dismounted" |
  "no-level" | "no-gel" | "no-stable" | "no-training" | "missing-quest" |
  "quest-active" | "already-owned" | "no-apple" | "no-halter" |
  "slimes-needed" | "too-far" | "unavailable" | "stamina-low";
export interface MountQuestSave {
  readonly id: MountId;
  readonly apple?: true;
  readonly halter?: true;
  /** Slimes mortos antes da quest não contam para resgatar o animal. */
  readonly slimesBefore?: number;
}
export interface MountSave {
  readonly stableTier?: Tier;
  readonly ridingTier?: Tier;
  readonly owned?: readonly MountId[];
  readonly saddled?: readonly MountId[];
  readonly active?: MountId;
  readonly stamina?: number;
  readonly quest?: MountQuestSave;
}
export interface MountView {
  readonly stableTier: Tier;
  readonly ridingTier: Tier;
  readonly owned: readonly MountId[];
  readonly active: MountId | null;
  readonly stamina: number;
  readonly maxStamina: number;
  readonly quest: MountQuestSave | null;
  readonly questHint: string;
}
const near = (px: number, py: number, target: {readonly x: number; readonly y: number}): boolean =>
  Number.isFinite(px) && Number.isFinite(py) &&
  Math.hypot(px - target.x, py - target.y) <= MOUNT_INTERACT_DISTANCE;
const tier = (n: unknown): Tier => Number.isInteger(n) && typeof n === "number" &&
  n >= 0 && n <= 3 ? n as Tier : 0;
export function normalizeMountSave(value: unknown): MountSave {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const s = value as Partial<MountSave>;
  const stableTier = tier(s.stableTier), ridingTier = Math.min(stableTier, tier(s.ridingTier)) as Tier;
  const owned = MOUNT_IDS.filter(id => Array.isArray(s.owned) && s.owned.includes(id));
  const saddled = owned.filter(id => Array.isArray(s.saddled) && s.saddled.includes(id));
  const active = isMountId(s.active) && saddled.includes(s.active) &&
    stableTier >= MOUNTS[s.active].tier && ridingTier >= MOUNTS[s.active].tier
    ? s.active : undefined;
  const rawStamina = typeof s.stamina === "number" && Number.isFinite(s.stamina) ? s.stamina : null;
  const stamina = active ? Math.min(MOUNTS[active].stamina, Math.max(0, rawStamina ?? MOUNTS[active].stamina)) : 0;
  const quest = s.quest?.id === "warhorse" && !owned.includes("warhorse") && stableTier >= 1
    ? { id:"warhorse" as const, ...(s.quest.apple === true ? {apple:true as const}:{}),
        ...(s.quest.halter === true ? {halter:true as const}:{}),
        ...(typeof s.quest.slimesBefore==="number" && Number.isSafeInteger(s.quest.slimesBefore) &&
          s.quest.slimesBefore>=0 ? {slimesBefore:Math.min(9999999,s.quest.slimesBefore)}:{}) } : undefined;
  return {
    ...(stableTier ? {stableTier}:{}),
    ...(ridingTier ? {ridingTier}:{}),
    ...(owned.length ? {owned}:{}),
    ...(saddled.length ? {saddled}:{}),
    ...(active ? {active, stamina}:{}),
    ...(quest ? {quest}:{}),
  };
}
export function sampleMountCaptureLoot(id: MountId, seed: number): string[] {
  return MOUNTS[id].dropsOnTame.filter((drop, i) =>
    hash2(i, MOUNT_IDS.indexOf(id), seed + 217) < drop.chance).map(drop => drop.item);
}
/** Regra de domesticação e viagem pura. Não usa DOM, Angular ou armazenamento. */
export class MountStable {
  private stable: Tier = 0;
  private skill: Tier = 0;
  private ownedSet = new Set<MountId>();
  private saddles = new Set<MountId>();
  private mounted: MountId | null = null;
  private energy = 0;
  private questState: MountQuestSave | null = null;
  private straightTime = 0;
  private chargeTime = 0;
  private prevDirection = "";
  constructor(saved?: unknown) {
    const s = normalizeMountSave(saved);
    this.stable = s.stableTier ?? 0;
    this.skill = s.ridingTier ?? 0;
    this.ownedSet = new Set(s.owned ?? []);
    this.saddles = new Set(s.saddled ?? []);
    this.mounted = s.active ?? null;
    this.energy = s.stamina ?? 0;
    this.questState = s.quest ?? null;
  }
  get stableTier(): Tier { return this.stable; }
  get ridingTier(): Tier { return this.skill; }
  get active(): MountId | null { return this.mounted; }
  get stamina(): number { return this.energy; }
  get quest(): MountQuestSave | null { return this.questState; }
  has(id: MountId): boolean { return this.ownedSet.has(id); }
  private levelRequired(t: RidingTier, level: number): boolean { return level >= RIDING_LEVEL[t]; }
  upgrade(level: number, gel: number, spend: (amount:number)=>boolean, x:number, y:number): MountActionResult {
    if (!near(x,y,STABLE_MASTER)) return "too-far";
    if (this.stable >= 3) return "unavailable";
    const t = (this.stable + 1) as RidingTier;
    if (!this.levelRequired(t, level)) return "no-level";
    if (gel < STABLE_UPGRADE_GEL[t] || !spend(STABLE_UPGRADE_GEL[t])) return "no-gel";
    this.stable = t;
    return t === 1 ? "built" : "upgraded";
  }
  train(level: number,x:number,y:number): MountActionResult {
    if (!near(x,y,STABLE_MASTER)) return "too-far";
    const next = (this.skill + 1) as RidingTier;
    if (next > 3 || this.stable < next) return "no-stable";
    if (!this.levelRequired(next,level)) return "no-level";
    this.skill = next;
    return "trained";
  }
  beginWarhorse(level:number,x:number,y:number,kills=0): MountActionResult {
    if(!near(x,y,STABLE_MASTER))return "too-far";
    if(this.has("warhorse"))return "already-owned";
    if(this.stable < 1)return "no-stable";
    if(this.skill < 1 || level < MOUNTS.warhorse.level)return "no-training";
    if(this.questState)return "quest-active";
    this.questState={id:"warhorse",slimesBefore:Number.isSafeInteger(kills)&&kills>0?kills:0};
    return "quest-started";
  }
  craftHalter(gel:number,spend:(amount:number)=>boolean,x:number,y:number): MountActionResult {
    if(!near(x,y,STABLE_MASTER))return "too-far";
    if(!this.questState)return "missing-quest";
    if(this.questState.halter)return "unavailable";
    if(gel<HALTER_GEL_COST||!spend(HALTER_GEL_COST))return "no-gel";
    this.questState={...this.questState,halter:true};
    return "halter-made";
  }
  forage(x:number,y:number): MountActionResult {
    if(!near(x,y,WILD_APPLES))return "too-far";
    if(!this.questState)return "missing-quest";
    if(this.questState.apple)return "unavailable";
    this.questState={...this.questState,apple:true};
    return "apple-picked";
  }
  tame(level:number,kills:number,x:number,y:number): MountActionResult {
    if(!near(x,y,WILD_WARHORSE))return "too-far";
    if(this.has("warhorse"))return "already-owned";
    if(this.stable<1||this.skill<1||level<15)return "no-training";
    if(!this.questState)return "missing-quest";
    if(kills<(this.questState.slimesBefore??0)+5)return "slimes-needed";
    if(!this.questState.apple)return "no-apple";
    if(!this.questState.halter)return "no-halter";
    this.ownedSet.add("warhorse");
    this.saddles.add("warhorse"); // recompensa explícita da primeira quest
    this.questState=null;
    return "tamed";
  }
  mount(id:MountId,level:number,x:number,y:number): MountActionResult {
    if(!near(x,y,STABLE_MASTER))return "too-far";
    if(this.mounted)return "unavailable";
    if(!this.ownedSet.has(id))return "unavailable";
    const def=MOUNTS[id];
    if(level<def.level)return "no-level";
    if(this.skill<def.tier||this.stable<def.tier)return "no-training";
    if(!this.saddles.has(id))return "no-halter";
    this.mounted=id;this.energy=def.stamina;
    this.straightTime=0;this.chargeTime=0;this.prevDirection="";
    return "mounted";
  }
  dismount(): MountActionResult {
    if(!this.mounted)return "unavailable";
    this.mounted=null;
    this.energy=0;this.straightTime=0;this.chargeTime=0;this.prevDirection="";
    return "dismounted";
  }
  /** Multiplier for existing tile movement; never bypasses solid collision. */
  speedMultiplier(): number {
    if(!this.mounted)return 1;
    const def=MOUNTS[this.mounted];
    return 1 + def.speedBonus + (this.chargeTime>0 ? .20:0);
  }
  /** Tick once per simulation step, not per paint frame. */
  update(dt:number,dir:{x:number;y:number},moving:boolean): void {
    if(!this.mounted||!Number.isFinite(dt)||dt<=0)return;
    const step=Math.min(.1,dt),max=MOUNTS[this.mounted].stamina;
    if(moving){
      this.energy=Math.max(0,this.energy-RIDE_STAMINA_DRAIN*step);
      const key=(Math.abs(dir.x)>Math.abs(dir.y)*1.7?"x"+Math.sign(dir.x):
        Math.abs(dir.y)>Math.abs(dir.x)*1.7?"y"+Math.sign(dir.y):"diagonal");
      if(this.mounted==="warhorse"&&key!=="diagonal"&&key===this.prevDirection)
        this.straightTime+=step;
      else this.straightTime=0;
      this.prevDirection=key;
      if(this.straightTime>=2&&this.chargeTime<=0){this.chargeTime=4;this.straightTime=0;}
      this.chargeTime=Math.max(0,this.chargeTime-step);
      if(this.energy<=0)this.dismount();
    }else{
      this.energy=Math.min(max,this.energy+RIDE_STAMINA_RECOVERY*step);
      this.straightTime=0;this.chargeTime=Math.max(0,this.chargeTime-step);
      this.prevDirection="";
    }
  }
  view(kills:number):MountView {
    const quest=this.questState;
    const questHint=quest
      ? kills<(quest.slimesBefore??0)+5
        ?"Afaste cinco slimes: "+Math.min(5,Math.max(0,kills-(quest.slimesBefore??0)))+"/5":!quest.apple
        ?"Colete a Maçã Silvestre no campo a sudoeste da vila."
        : !quest.halter?"Volte ao Mestre de Estábulos e fabrique um cabresto (3 gel)."
          :"Acalme o cavalo fugitivo a sudoeste da vila usando E."
      : this.has("warhorse")?"Garrano resgatado · selecione a montaria no estábulo."
        :"Procure o Mestre de Estábulos na Vila da Travessia.";
    return {stableTier:this.stable,ridingTier:this.skill,owned:[...this.ownedSet],
      active:this.mounted,stamina:this.energy,
      maxStamina:this.mounted?MOUNTS[this.mounted].stamina:0,
      quest,questHint};
  }
  snapshot():MountSave {
    return normalizeMountSave({stableTier:this.stable,ridingTier:this.skill,
      owned:[...this.ownedSet],saddled:[...this.saddles],
      ...(this.mounted?{active:this.mounted,stamina:Math.round(this.energy*100)/100}:{}),
      ...(this.questState?{quest:this.questState}:{})});
  }
}