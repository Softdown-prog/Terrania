import { MAX_KILLS } from "./Limits.ts";
export { MAX_KILLS } from "./Limits.ts";
import { resolveSwordStrike, swordStrikeTargets } from "./combat/SwordCombat.ts";
import { RegionalMonster, regionalSurfaceSpawns, southCommonSpawns, rollCreatureLoot } from "../actors/RegionalMonster.ts";
import { centerSurfaceSpawns } from "../actors/centerSpawns.ts";
import { southSiteSpawns } from "../actors/southSiteSpawns.ts";
import { Player } from "../actors/Player.ts";
import { MountStable, type MountSave } from "./mounts/MountStable.ts";
import { Slime, slimeSpawns } from "../actors/Slime.ts";
import { CREATURE_CATALOG } from "../actors/CreatureCatalog.ts";
import { SeedCollision, canMoveOnSeed, freeSpotNear } from "../world/collision.ts";
import { CHUNK_PIXELS, chunkOf } from "../world/terrain.ts";
import { DEFAULT_RESPAWN_POINT, RESPAWN_POINTS, normalizeRespawnPoint, type RespawnPointId } from "./character/center/shrine/index.ts";
import { MAP_VERSION } from "../world/mapSize.ts";
import { faceTarget } from "./combat/combat.ts";
import type { ClassicTileWalker, WalkDirection } from "./movement/ClassicTileWalker.ts";
import { Inventory, type InventoryState } from "./character/Inventory.ts";
import { MAX_WORLD_DROPS, collectDrops, normalizeDrops, type LootDrop } from "./character/loot.ts";
import { rollCoinDrop } from "./character/coins/index.ts";
import { LEGACY_RESPAWN_SECONDS, respawnSecondsForId } from "./combat/respawn.ts";
import type { CreatureKind } from "../actors/CreatureCatalog.ts";
import { grantExperience, levelForExperience, maxHpForExperience, normalizeExperience } from "./character/Experience.ts";
import { foodMana, hasNutrition, type FoodId, type FoodUseResult, type NutritionState } from "./character/Food.ts";
import { WellInvestigation, wellQuestStarted, type WellQuestState } from "./quests/south/well/index.ts";
import { RootsQuest, rootsQuestStarted, type RootsQuestState } from "./quests/center/roots/index.ts";
import { Bank, type BankState } from "./character/center/bank/index.ts";
import { STAVES, type StaffId } from "./character/Staves.ts";
import { BOWS, type BowId } from "./character/Bows.ts";
import { arrowStrikeTarget, resolveArrowStrike } from "./combat/ArrowCombat.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import { resolveSpellStrike, spellReach, spellStrikeTargets } from "./combat/SpellCombat.ts";
import { NO_GEAR_BONUS, gearBonus, scaledMaxMana, type GearBonus } from "./character/gearBonus.ts";
import type { CombatProfile } from "./combat/CombatProfile.ts";
import { CLASSIC_FOLLOW_STOP } from "./combat/ClassicPursuit.ts";
import { DEFAULT_HERO_CLASS, heroClassSheet, normalizeHeroClass, normalizeMana, regenerateMana, type HeroClassId } from "./character/classes/index.ts";

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
  /** Missão "A Raiz Velha" (ADR 0104); ausente enquanto não foi aceita. */
  rootsQuest?: RootsQuestState;
  /** Banco da Casa da Moeda (ADR 0063); ausente enquanto não há saldo. */
  bank?: BankState;
  /** Onde o herói renasce (ADR 0064); ausente = a Vila da Travessia. */
  respawnPoint?: RespawnPointId;
  /** Vocação do herói (ADR 0065); ausente = Cavaleiro. */
  heroClass?: HeroClassId;
  /** Mana atual do Mago; ausente = cheia (ou nenhuma, para o Cavaleiro). */
  mana?: number;
  /** Versão do tamanho do mapa em que o save foi feito (ADR 0059); sem ela, o save é do mapa antigo e a posição é migrada ao carregar. */
  mapVersion?: number;
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
  /** A segunda missão de Aela: vencer o Ent Ancião (ADR 0104). */
  readonly roots: RootsQuest;
  /** Banco da Casa da Moeda da capital (ADR 0063). */
  readonly bank: Bank;
  /** Onde o herói renasce depois de cair: a Vila, ou o Templo da capital se o consagrou (ADR 0064). */
  respawnPoint: RespawnPointId = DEFAULT_RESPAWN_POINT;
  /** A vocação deste herói: escolhida ao criar o mundo, nunca muda (ADR 0065). */
  readonly heroClass: HeroClassId;
  private manaPoints = 0;
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

  /** `startingClass`: a vocação escolhida ao criar este mundo; um save do mesmo mundo manda mais (a vocação nunca muda). */
  constructor(seed: number, saved?: OfflineSave, startingClass?: HeroClassId) {
    this.seed = seed;
    // A vocação vem antes de tudo o que depende dela (vida máxima, mana): a do save do mesmo mundo, ou a escolhida ao criá-lo.
    this.heroClass = normalizeHeroClass(saved?.seed === seed ? saved.heroClass : startingClass);
    this.player.speedScale = heroClassSheet(this.heroClass).speedPercent / 100;
    this.collision = new SeedCollision(seed);
    this.inventory = new Inventory(saved?.seed === seed ? saved.inventory : undefined,
      levelForExperience(saved?.seed === seed ? normalizeExperience(saved?.experience) : 0), this.heroClass);
    this.well = new WellInvestigation(saved?.seed === seed ? saved.wellQuest : undefined);
    this.roots = new RootsQuest(saved?.seed === seed ? saved.rootsQuest : undefined);
    this.mounts = new MountStable(saved?.seed === seed ? saved.mounts : undefined);
    if (saved && saved.seed === seed) {
      // Um save antigo pode ficar sobre um obstáculo novo. Se o terreno, os marcos e a cidade estão livres e só a
      // decoração bloqueia, o herói é tirado dela para o ponto livre mais próximo (até 64 px, ADR 0037); se o
      // bloqueio é de outra coisa, volta ao ponto inicial, como sempre.
      const spot = canMoveOnSeed(saved.x, saved.y, seed)
        ? freeSpotNear((x, y) => this.collision.canMove(x, y), saved.x, saved.y) : null;
      if (spot) {
        this.player.x = spot.x;
        this.player.y = spot.y;
      }
      this.experience = normalizeExperience(saved.experience);
      this.player.maxHp = maxHpForExperience(this.experience, this.heroClass);
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
    // O banco depende do relógio já carregado: os juros devidos contam do instante gravado, nunca de um futuro.
    this.bank = new Bank(saved?.seed === seed ? saved.bank : undefined, this.clock);
    if (saved?.seed === seed) this.respawnPoint = normalizeRespawnPoint(saved.respawnPoint);
    // Um mundo novo começa de vida cheia no máximo da vocação (o do Mago é 80% do Cavaleiro).
    if (!(saved && saved.seed === seed)) { this.player.maxHp = maxHpForExperience(this.experience, this.heroClass); this.player.hp = this.player.maxHp; }
    // Sem mana no save (mundo novo ou save antigo), o Mago começa de mana cheia.
    this.manaPoints = saved?.seed === seed && saved.mana !== undefined ? normalizeMana(saved.mana, this.maxMana) : this.maxMana;
  }

  /** Segundos de jogo desde o começo da aventura. */
  get time(): number { return this.clock; }
  /** O nível do herói, que decide a mana máxima. */
  private get level(): number { return levelForExperience(this.experience); }
  get usesMana(): boolean { return heroClassSheet(this.heroClass).usesMana; }
  /** Mana atual (0 para quem não usa mana) e o máximo do nível. */
  get mana(): number { return this.manaPoints; }
  /** Os bônus das roupas vestidas (ADR 0079); só quem usa mana os tem. */
  get gearBonus(): GearBonus { return this.usesMana ? gearBonus(this.inventory.gear) : NO_GEAR_BONUS; }
  get maxMana(): number { return scaledMaxMana(heroClassSheet(this.heroClass).maxMana(this.level), this.gearBonus); }
  /** Gasta mana, tudo ou nada: sem mana suficiente (ou sem mana nenhuma) nada muda. */
  spendMana(cost: number): boolean {
    if (!this.usesMana || !Number.isFinite(cost) || cost <= 0 || this.manaPoints < cost) return false;
    this.manaPoints -= cost;
    return true;
  }
  /** Devolve mana (a sombra da Lua Negra): só para quem usa mana, só valores positivos, e nunca passa do máximo do nível. */
  gainMana(amount: number): number {
    if (!this.usesMana || !Number.isFinite(amount) || amount <= 0) return 0;
    const before = this.manaPoints;
    this.manaPoints = Math.min(this.maxMana, this.manaPoints + amount);
    return this.manaPoints - before;
  }
  /** Come um alimento: a vida volta aos poucos (como sempre) e, para quem usa mana, a mana volta na hora (a porcentagem da ficha do alimento). Só se a refeição foi feita. */
  eatFood(id: FoodId): { readonly outcome: FoodUseResult; readonly mana: number } {
    const outcome = this.inventory.useFood(id, this.player);
    return { outcome, mana: outcome === "ate" ? this.gainMana(foodMana(id, this.maxMana)) : 0 };
  }
  /** O cajado que o Mago segura; com um só cajado, o de Aprendiz (a escolha entre vários vem com o inventário, fatia F). */
  get equippedStaff(): StaffId { return this.inventory.staves.equipped; }
  /** O arco que o Arqueiro segura (ADR 0120): o da bolsa, que começa no de Caça. */
  get equippedBow(): BowId { return this.inventory.bows.equipped; }
  /** Como o herói ataca agora: o Cavaleiro de perto com a espada; o Mago de longe com o cajado, se houver mana (ADR 0069). */
  get combatProfile(): CombatProfile {
    const weapon = this.inventory.loadout.equipped;
    // O Arqueiro atira de longe com o arco e precisa de flecha na aljava (ADR 0110); o disparo em si vem no lote A1c.
    if (this.heroClass === "archer") {
      const bow = BOWS[this.equippedBow], reach = bow.range * TILE_SIZE;
      return { interval: bow.interval, weapon, ranged: { reach, ready: this.inventory.quiver.counts[this.inventory.quiver.equipped] >= bow.arrowsPerShot, lacks: "ammo" }, followStop: reach - 4 };
    }
    if (!this.usesMana) return { interval: this.inventory.weapon.interval, weapon, followStop: CLASSIC_FOLLOW_STOP };
    const staff = STAVES[this.equippedStaff], reach = spellReach(this.equippedStaff);
    return { interval: staff.interval, weapon, ranged: { reach, ready: this.manaPoints >= staff.manaCost }, followStop: reach - 4 };
  }
  private regenerateMana(dt: number): void { this.manaPoints = regenerateMana(this.manaPoints, this.heroClass, this.level, dt, this.gearBonus); }
  /** Faz o relógio andar fora da superfície (na caverna, por exemplo); só valores positivos e finitos. */
  advanceClock(dt: number): void {
    if (Number.isFinite(dt) && dt > 0) { this.clock += Math.min(dt, 0.1); this.regenerateMana(Math.min(dt, 0.1)); }
  }
  /** Anota quando a criatura derrotada volta (ou que nunca volta). */
  noteDefeat(id: string, kind?: CreatureKind): void {
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
    this.player = new Player(maxHpForExperience(this.experience, this.heroClass));
    this.player.speedScale = heroClassSheet(this.heroClass).speedPercent / 100;
    this.player.x = RESPAWN_POINTS[this.respawnPoint].x;
    this.player.y = RESPAWN_POINTS[this.respawnPoint].y;
    this.spawnedChunk = "";
    this.manaPoints = this.maxMana;
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
          ...southCommonSpawns(cx,cy,this.seed),...southSiteSpawns(cx,cy,this.seed),...centerSurfaceSpawns(cx,cy,this.seed)]) {
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
      CREATURE_CATALOG[slime.kind].experience,this.player,this.heroClass);
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
    this.regenerateMana(dt);
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
    // O Mago lança a magia do cajado (gasta mana, só com alvo escolhido); o Cavaleiro bate com a espada.
    if (attack) {
      if (this.heroClass === "archer") this.player.startShot(this.equippedBow, arrows => typeof strikeTargetId === "string" && this.inventory.spendArrows(arrows));
      else if (this.usesMana) this.player.startCast(this.equippedStaff, cost => typeof strikeTargetId === "string" && this.spendMana(cost));
      else this.player.startAttack(this.inventory.loadout.equipped);
    }
    // Keep the swing facing the creature it was started against while walking.
    const focused = typeof strikeTargetId === "string" ? this.slimes.get(strikeTargetId) : null;
    if (focused && this.player.attackTime > 0) faceTarget(this.player, focused);
    if (this.player.consumeStrike()) {
      const staff=this.player.attackStaff, bow=this.player.attackBow;
      if (bow) {
        const target=arrowStrikeTarget(bow,this.player,this.slimes.values(),this.collision,strikeTargetId);
        resolveArrowStrike(bow,this.inventory.quiver.equipped,this.player,target,mob=>{
          this.registerDefeat(mob.id,mob,defense);
          changed=true;
        });
      } else if (staff) {
        const hit=spellStrikeTargets(staff,this.player,this.slimes.values(),this.collision,strikeTargetId);
        resolveSpellStrike(staff,this.player,hit,this.collision,mob=>{
          this.registerDefeat(mob.id,mob,defense);
          changed=true;
        },amount=>this.gainMana(amount),this.gearBonus.damage);
      } else {
      const weapon=this.player.attackWeapon;
      // The astral arc can contact three; every other blade hits one primary.
      const primary=swordStrikeTargets(weapon,this.player,this.slimes.values(),
        this.collision,strikeTargetId);
      resolveSwordStrike(weapon,this.player,primary,this.slimes,this.collision,mob=>{
        this.registerDefeat(mob.id,mob,defense);
        changed=true;
      });
      }
    }
    // O jogador recolhe automaticamente o gel e as moedas ao se aproximar (a mesma regra da caverna).
    if (collectDrops(this.drops, this.player, this.inventory)) changed = true;
    // Derrota por veneno, queimadura ou espinhos também é progresso: salvar na hora.
    return changed || this.awaitingRespawn;
  }
  snapshot(): OfflineSave {
    return {
      mapVersion: MAP_VERSION,
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
      ...(rootsQuestStarted(this.roots.view) ? { rootsQuest: this.roots.snapshot() } : {}),
      ...(this.bank.used ? { bank: this.bank.snapshot() } : {}),
      ...(this.respawnPoint !== DEFAULT_RESPAWN_POINT ? { respawnPoint: this.respawnPoint } : {}),
      ...(this.heroClass !== DEFAULT_HERO_CLASS ? { heroClass: this.heroClass, mana: Math.round(this.manaPoints * 100) / 100 } : {}),
      ...(hasNutrition(this.player.nutrition) ? { nutrition: this.player.nutrition } : {}),
      drops: [...this.drops.values()].slice(0, MAX_WORLD_DROPS),
    };
  }
}
