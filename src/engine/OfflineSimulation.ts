import { MAX_KILLS } from "./Limits.ts";
export { MAX_KILLS } from "./Limits.ts";
import { resolveSwordStrike, swordStrikeTargets } from "./combat/SwordCombat.ts";
import { RegionalMonster, regionalSurfaceSpawns, southCommonSpawns, rollCreatureLoot } from "../actors/RegionalMonster.ts";
import { southSiteSpawns } from "../actors/southSiteSpawns.ts";
import { Player } from "../actors/Player.ts";
import { MountStable, type MountSave } from "./mounts/MountStable.ts";
import { Slime, slimeSpawns } from "../actors/Slime.ts";
import { CREATURE_CATALOG } from "../actors/CreatureCatalog.ts";
import { SeedCollision } from "../world/collision.ts";
import { CHUNK_PIXELS, chunkOf } from "../world/terrain.ts";
import { VILLAGE_RESPAWN } from "../world/village.ts";
import { faceTarget } from "./combat/combat.ts";
import type { ClassicTileWalker, WalkDirection } from "./movement/ClassicTileWalker.ts";
import { Inventory, type InventoryState } from "./character/Inventory.ts";
import { MAX_WORLD_DROPS, PICKUP_DISTANCE, normalizeDrops, type LootDrop } from "./character/loot.ts";
import { rollCoinDrop } from "./character/coins/index.ts";
import { LEGACY_RESPAWN_SECONDS, respawnSecondsForId } from "./combat/respawn.ts";
import type { CreatureKind } from "../actors/CreatureCatalog.ts";
import { grantExperience, levelForExperience, maxHpForExperience, normalizeExperience } from "./character/Experience.ts";
import { hasNutrition, type NutritionState } from "./character/Food.ts";
import { WellInvestigation, wellQuestStarted, type WellQuestState } from "./quests/south/well/index.ts";

/** Dados de gameplay serializáveis, independentes do navegador. */
export interface OfflineSave {
  seed: number;
  x: number;
  y: number;
  hp: number;
  kills: number;
  /** Novo contador independente dos abates externos e da missão de montaria. */
  trainingKills?: number;
  defeated: string[];
  /** Campos opcionais mantêm compatibilidade com saves antigos. */
  inventory?: InventoryState;
  nutrition?: NutritionState;
  drops?: LootDrop[];
  experience?: number;
  awaitingRespawn?: true;
  mounts?: MountSave;
  /** Missão "A Água Escura" (ADR 0031); ausente enquanto não começou. */
  wellQuest?: WellQuestState;
  /** Relógio da aventura, em segundos de jogo (ADR 0029). */
  time?: number;
  /** Quando cada criatura derrotada volta, em segundos do relógio. */
  respawnAt?: Record<string, number>;
}

/** Contagem de abates vinda de um save: inteira, não negativa e limitada (missões dependem disso). */
export function normalizeKills(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_KILLS, Math.floor(value))) : 0;
}

/** Distância mínima do herói (px) para um derrotado voltar: fora da tela, sem aparecer do nada. */
const RESPAWN_MIN_DISTANCE = 700;

/** Motor puro: nenhuma dependência de Canvas, DOM, UI, rede ou localStorage. */
export class OfflineSimulation {
  player = new Player();
  readonly slimes = new Map<string, Slime>();
  readonly defeated = new Set<string>();
  readonly inventory: Inventory;
  /** Missão "A Água Escura" (ADR 0031). */
  readonly well: WellInvestigation;
  readonly mounts: MountStable;
  readonly drops = new Map<string, LootDrop>();
  readonly collision: SeedCollision;
  readonly seed: number;
  kills = 0;
  /** Só abates na gruta introdutória avançam a missão de Aela. */
  trainingKills = 0;
  experience = 0;
  private spawnedChunk = "";
  /** Segundos de jogo desde o começo da aventura; só anda enquanto se joga (ADR 0029). */
  private clock = 0;
  /** Quando cada derrotado volta (segundos do relógio). Quem nunca volta não entra. */
  private readonly respawnAt = new Map<string, number>();
  private nextRespawnScan = 0;

  constructor(seed: number, saved?: OfflineSave) {
    this.seed = seed;
    this.collision = new SeedCollision(seed);
    this.inventory = new Inventory(saved?.seed === seed ? saved.inventory : undefined,
      levelForExperience(saved?.seed === seed ? normalizeExperience(saved?.experience) : 0));
    this.well = new WellInvestigation(saved?.seed === seed ? saved.wellQuest : undefined);
    this.mounts = new MountStable(saved?.seed === seed ? saved.mounts : undefined);
    if (saved && saved.seed === seed) {
      // A previous save may now overlap a newly introduced solid landmark.
      if (this.collision.canMove(saved.x, saved.y)) {
        this.player.x = saved.x;
        this.player.y = saved.y;
      }
      this.experience = normalizeExperience(saved.experience);
      this.player.maxHp = maxHpForExperience(this.experience);
      this.player.hp = saved.awaitingRespawn === true && saved.hp === 0
        ? 0 : Number.isFinite(saved.hp) ? Math.min(this.player.maxHp, Math.max(1, saved.hp)) : this.player.maxHp;
      if (this.player.hp > 0) this.player.restoreNutrition(saved.nutrition);
      this.kills = normalizeKills(saved.kills);
      this.trainingKills = Math.min(5, normalizeKills(saved.trainingKills));
      this.clock = typeof saved.time === "number" && Number.isFinite(saved.time) && saved.time > 0 ? saved.time : 0;
      for (const id of Array.isArray(saved.defeated) ? saved.defeated : [])
        if (typeof id === "string") this.defeated.add(id);
      // Hora de volta: a do save, quando válida; save antigo (sem ela) volta LEGACY_RESPAWN_SECONDS depois do carregamento.
      const savedAt = saved.respawnAt && typeof saved.respawnAt === "object" && !Array.isArray(saved.respawnAt) ? saved.respawnAt : {};
      for (const id of this.defeated) {
        const raw = savedAt[id];
        if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) this.respawnAt.set(id, Math.min(raw, this.clock + 7_200));
        else {
          const seconds = respawnSecondsForId(id);
          if (seconds !== null) this.respawnAt.set(id, this.clock + LEGACY_RESPAWN_SECONDS);
        }
      }
      for (const drop of normalizeDrops(saved.drops)) {
        // Não carregar itens incompatíveis com a lista de monstros derrotados (as moedas levam ":coin" no id).
        if (this.defeated.has(drop.id.replace(/:coin$/, ""))) this.drops.set(drop.id, drop);
      }
    }
  }

  /** Segundos de jogo desde o começo da aventura. */
  get time(): number { return this.clock; }
  /** Faz o relógio andar fora da superfície (na caverna, por exemplo); só valores positivos e finitos. */
  advanceClock(dt: number): void {
    if (Number.isFinite(dt) && dt > 0) this.clock += Math.min(dt, 0.1);
  }
  /** Anota quando a criatura derrotada volta (ou que nunca volta). */
  noteDefeat(id: string, kind: CreatureKind): void {
    const seconds = respawnSecondsForId(id, kind);
    if (seconds === null) this.respawnAt.delete(id);
    else this.respawnAt.set(id, this.clock + seconds);
  }
  /** Quem volta neste instante: o prazo passou. */
  private due(id: string): boolean {
    const at = this.respawnAt.get(id);
    return at !== undefined && this.clock >= at;
  }
  private release(id: string): void {
    this.defeated.delete(id);
    this.respawnAt.delete(id);
    // O que a criatura deixou no chão some junto com ela voltar.
    this.drops.delete(id);
    this.drops.delete(id + ":coin");
  }
  /** Devolve ao mundo todos os derrotados cujo prazo passou (usado ao entrar numa masmorra). Devolve quantos. */
  expireDefeats(): number {
    let count = 0;
    for (const id of [...this.respawnAt.keys()]) if (this.due(id)) { this.release(id); count++; }
    return count;
  }

  get awaitingRespawn(): boolean {
    return this.player.hp <= 0;
  }

  respawn(): boolean {
    if (!this.awaitingRespawn) return false;
    this.mounts.dismount();
    this.player = new Player(maxHpForExperience(this.experience));
    this.player.x = VILLAGE_RESPAWN.x;
    this.player.y = VILLAGE_RESPAWN.y;
    this.spawnedChunk = "";
    return true;
  }

  private spawnNearby(): void {
    const x0 = chunkOf(this.player.x),
      y0 = chunkOf(this.player.y);
    const key = x0 + "," + y0;
    if (key === this.spawnedChunk) return;
    this.spawnedChunk = key;
    for (let cy = y0 - 2; cy <= y0 + 2; cy++)
      for (let cx = x0 - 2; cx <= x0 + 2; cx++) {
        for (const slime of [...slimeSpawns(cx, cy, this.seed), ...regionalSurfaceSpawns(cx, cy, this.seed),
          ...southCommonSpawns(cx,cy,this.seed),...southSiteSpawns(cx,cy,this.seed)]) {
          // O derrotado volta quando o prazo passa e o herói está longe (não aparece na tela): ADR 0029.
          if (this.defeated.has(slime.id) && this.due(slime.id) &&
              Math.hypot(slime.x - this.player.x, slime.y - this.player.y) > RESPAWN_MIN_DISTANCE) this.release(slime.id);
          if (!this.defeated.has(slime.id) && !this.slimes.has(slime.id))
            this.slimes.set(slime.id, slime);
        }
      }
  }
  /** Shared death accounting for direct, elemental and lightning kills. */
  private registerDefeat(id:string,slime:Slime,defense:number):void {
    if(this.defeated.has(id))return;
    this.slimes.delete(id);
    this.defeated.add(id);
    this.noteDefeat(id, slime.kind);
    if(slime.kind==="slime")this.kills=Math.min(MAX_KILLS,this.kills+1);
    if(slime instanceof RegionalMonster){
      slime.deathBurst(this.player,this.collision,defense);
      for(const item of rollCreatureLoot(slime.kind,slime.id))this.inventory.addMaterial(item);
    }
    this.experience=grantExperience(this.experience,
      CREATURE_CATALOG[slime.kind].experience,this.player);
    if(slime.kind==="slime" && this.drops.size<MAX_WORLD_DROPS)
      this.drops.set(id,{id,item:"gel",x:slime.x,y:slime.y});
    // Toda criatura deixa moedas no chão, ao lado do gel (ADR 0024).
    if(this.drops.size<MAX_WORLD_DROPS)
      this.drops.set(id+":coin",{id:id+":coin",item:"coin",x:slime.x,y:slime.y,amount:rollCoinDrop(slime.kind,id)});
  }

  /** Retorna true se o progresso mudou e merece salvar imediatamente. */
  update(
    dt: number,
    direction: WalkDirection,
    attack: boolean,
    /** Undefined: legacy manual arc. String: target committed for this classic swing.
     * Null: no committed classic target, so the swing cannot deal damage.
     */
    strikeTargetId?: string | null,
    /** The normal outdoor game uses tiles; legacy callers can omit the walker. */
    tileWalker?: ClassicTileWalker,
  ): boolean {
    if (this.awaitingRespawn || !Number.isFinite(dt) || dt <= 0) return false;
    dt = Math.min(dt, 0.1);
    // Cavalaria altera somente o tempo do passo, nunca a malha de colisão.
    const beforeX=this.player.x,beforeY=this.player.y;
    const collision = {
      canMove:(x:number,y:number)=>this.collision.canMove(x,y),
      speedAt:(x:number,y:number)=>(this.collision.speedAt(x,y))*this.mounts.speedMultiplier(),
    };
    if (tileWalker) tileWalker.advance(dt, direction, this.player, collision);
    else this.player.update(dt, typeof direction === "function" ? direction() : direction, collision);
    const dx=this.player.x-beforeX,dy=this.player.y-beforeY;
    this.mounts.update(dt,{x:dx,y:dy},Math.hypot(dx,dy)>.01);
    this.clock += dt;
    // A cada 5 s, se alguém já pode voltar, o povoamento do entorno é refeito (só aí o morto reaparece).
    if (this.respawnAt.size > 0 && this.clock >= this.nextRespawnScan) {
      this.nextRespawnScan = this.clock + 5;
      for (const id of this.respawnAt.keys()) if (this.due(id)) { this.spawnedChunk = ""; break; }
    }
    this.spawnNearby();
    const defense = this.inventory.defense;
    let changed = false;
    for (const [id, slime] of this.slimes) {
      const distance = Math.hypot(
        slime.x - this.player.x,
        slime.y - this.player.y,
      );
      if (distance > CHUNK_PIXELS * 3) {
        this.slimes.delete(id);
        continue;
      }
      if (distance < CHUNK_PIXELS * 2) {
        slime.update(dt, this.player, this.collision, defense);
        if (slime.hp <= 0) {
          this.registerDefeat(id,slime,defense);
          changed=true;
        }
        if (this.awaitingRespawn) return true;
      }
    }
    if (attack) this.player.startAttack(this.inventory.loadout.equipped);
    // Keep the swing facing the creature it was started against while walking.
    const focused = typeof strikeTargetId === "string" ? this.slimes.get(strikeTargetId) : null;
    if (focused && this.player.attackTime > 0) faceTarget(this.player, focused);
    if (this.player.consumeStrike()) {
      const weapon=this.player.attackWeapon;
      // The astral arc can contact three; every other blade hits one primary.
      const primary=swordStrikeTargets(weapon,this.player,this.slimes.values(),
        this.collision,strikeTargetId);
      resolveSwordStrike(weapon,this.player,primary,this.slimes,this.collision,mob=>{
        this.registerDefeat(mob.id,mob,defense);
        changed=true;
      });
    }
    // O jogador recolhe automaticamente o gel ao se aproximar. Se a bolsa
    // estiver cheia, o item permanece visível no chão até haver espaço.
    for (const [id, drop] of this.drops) {
      if (Math.hypot(this.player.x - drop.x, this.player.y - drop.y) > PICKUP_DISTANCE) continue;
      if (drop.item === "gel") {
        if (this.inventory.addGel()) { this.drops.delete(id); changed = true; }
        continue;
      }
      // Moedas: a carteira tem teto; o que não couber fica no chão até haver espaço.
      const added = this.inventory.addCoins(drop.amount);
      if (added <= 0) continue;
      if (added >= drop.amount) this.drops.delete(id);
      else this.drops.set(id, { ...drop, amount: drop.amount - added });
      changed = true;
    }
    // Derrota por veneno, queimadura ou espinhos também é progresso: salvar na hora.
    return changed || this.awaitingRespawn;
  }
  snapshot(): OfflineSave {
    return {
      seed: this.seed,
      x: this.player.x,
      y: this.player.y,
      hp: this.player.hp,
      kills: this.kills,
      trainingKills: this.trainingKills,
      experience: this.experience,
      ...(this.awaitingRespawn ? { awaitingRespawn: true } : {}),
      time: Math.round(this.clock * 100) / 100,
      ...(this.respawnAt.size ? { respawnAt: Object.fromEntries([...this.respawnAt].slice(-2000)) } : {}),
      defeated: [...this.defeated].slice(-2000),
      inventory: this.inventory.snapshot(),
      ...(Object.keys(this.mounts.snapshot()).length ? { mounts: this.mounts.snapshot() } : {}),
      ...(wellQuestStarted(this.well.view) ? { wellQuest: this.well.snapshot() } : {}),
      ...(hasNutrition(this.player.nutrition) ? { nutrition: this.player.nutrition } : {}),
      drops: [...this.drops.values()].slice(0, MAX_WORLD_DROPS),
    };
  }
}
