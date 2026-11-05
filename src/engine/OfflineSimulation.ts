import { Player } from "../actors/Player.ts";
import { Slime, slimeSpawns } from "../actors/Slime.ts";
import { CREATURE_CATALOG } from "../actors/CreatureCatalog.ts";
import { SeedCollision } from "../world/collision.ts";
import { CHUNK_PIXELS, chunkOf } from "../world/terrain.ts";
import { canStrike } from "./combat.ts";
import type { ClassicTileWalker } from "./ClassicTileWalker.ts";
import { Inventory, type InventoryState } from "./Inventory.ts";
import { MAX_WORLD_DROPS, PICKUP_DISTANCE, normalizeDrops, type LootDrop } from "./loot.ts";
import { grantExperience, maxHpForExperience, normalizeExperience } from "./Experience.ts";

/** Dados de gameplay serializáveis, independentes do navegador. */
export interface OfflineSave {
  seed: number;
  x: number;
  y: number;
  hp: number;
  kills: number;
  defeated: string[];
  /** Campos opcionais mantêm compatibilidade com saves antigos. */
  inventory?: InventoryState;
  drops?: LootDrop[];
  experience?: number;
}

/** Motor puro: nenhuma dependência de Canvas, DOM, UI, rede ou localStorage. */
export class OfflineSimulation {
  player = new Player();
  readonly slimes = new Map<string, Slime>();
  readonly defeated = new Set<string>();
  readonly inventory: Inventory;
  readonly drops = new Map<string, LootDrop>();
  readonly collision: SeedCollision;
  readonly seed: number;
  kills = 0;
  experience = 0;
  private spawnedChunk = "";

  constructor(seed: number, saved?: OfflineSave) {
    this.seed = seed;
    this.collision = new SeedCollision(seed);
    this.inventory = new Inventory(saved?.seed === seed ? saved.inventory : undefined);
    if (saved && saved.seed === seed) {
      // A previous save may now overlap a newly introduced solid landmark.
      if (this.collision.canMove(saved.x, saved.y)) {
        this.player.x = saved.x;
        this.player.y = saved.y;
      }
      this.experience = normalizeExperience(saved.experience);
      this.player.maxHp = maxHpForExperience(this.experience);
      this.player.hp = Math.min(this.player.maxHp, Math.max(1, saved.hp));
      this.kills = saved.kills;
      for (const id of saved.defeated) this.defeated.add(id);
      for (const drop of normalizeDrops(saved.drops)) {
        // Não carregar itens incompatíveis com a lista de monstros derrotados.
        if (this.defeated.has(drop.id)) this.drops.set(drop.id, drop);
      }
    }
  }

  private spawnNearby(): void {
    const x0 = chunkOf(this.player.x),
      y0 = chunkOf(this.player.y);
    const key = x0 + "," + y0;
    if (key === this.spawnedChunk) return;
    this.spawnedChunk = key;
    for (let cy = y0 - 2; cy <= y0 + 2; cy++)
      for (let cx = x0 - 2; cx <= x0 + 2; cx++) {
        for (const slime of slimeSpawns(cx, cy, this.seed)) {
          if (!this.defeated.has(slime.id) && !this.slimes.has(slime.id))
            this.slimes.set(slime.id, slime);
        }
      }
  }
  /** Retorna true se o progresso mudou e merece salvar imediatamente. */
  update(
    dt: number,
    direction: { x: number; y: number },
    attack: boolean,
    /** Undefined: legacy manual arc. String: target committed for this classic swing.
     * Null: no committed classic target, so the swing cannot deal damage.
     */
    strikeTargetId?: string | null,
    /** Opt-in, local-only classic tile movement; defaults to legacy movement. */
    tileWalker?: ClassicTileWalker,
  ): boolean {
    if (tileWalker) tileWalker.advance(dt, direction, this.player, this.collision);
    else this.player.update(dt, direction, this.collision);
    this.spawnNearby();
    for (const [id, slime] of this.slimes) {
      const distance = Math.hypot(
        slime.x - this.player.x,
        slime.y - this.player.y,
      );
      if (distance > CHUNK_PIXELS * 3) {
        this.slimes.delete(id);
        continue;
      }
      if (distance < CHUNK_PIXELS * 2)
        slime.update(dt, this.player, this.collision);
    }
    let changed = false;
    if (attack) this.player.startAttack();
    // Keep the swing facing the creature it was started against while walking.
    const focused = typeof strikeTargetId === "string" ? this.slimes.get(strikeTargetId) : null;
    if (focused && this.player.attackTime > 0) {
      const dx = focused.x - this.player.x, dy = focused.y - this.player.y;
      const d = Math.hypot(dx,dy);
      if (d > 0.01) { this.player.faceX = dx/d; this.player.faceY = dy/d; }
    }
    if (this.player.consumeStrike()) {
      for (const [id, slime] of this.slimes) {
        if ((strikeTargetId === undefined || id === strikeTargetId) &&
            canStrike(this.player, slime, this.collision)) {
          slime.takeHit(this.player.x, this.player.y);
          if (slime.hp <= 0) {
            this.slimes.delete(id);
            this.defeated.add(id);
            this.kills++;
            this.experience = grantExperience(this.experience, CREATURE_CATALOG[slime.kind].experience, this.player);
            if (this.drops.size < MAX_WORLD_DROPS) {
              this.drops.set(slime.id, {
                id: slime.id,
                item: "gel",
                x: slime.x,
                y: slime.y,
              });
            }
            changed = true;
          }
        }
      }
    }
    // O jogador recolhe automaticamente o gel ao se aproximar. Se a bolsa
    // estiver cheia, o item permanece visível no chão até haver espaço.
    for (const [id, drop] of this.drops) {
      if (Math.hypot(this.player.x - drop.x, this.player.y - drop.y) <= PICKUP_DISTANCE &&
          this.inventory.addGel()) {
        this.drops.delete(id);
        changed = true;
      }
    }
    if (this.player.hp <= 0) {
      this.player = new Player(maxHpForExperience(this.experience));
      this.spawnedChunk = "";
      changed = true;
    }
    return changed;
  }
  snapshot(): OfflineSave {
    return {
      seed: this.seed,
      x: this.player.x,
      y: this.player.y,
      hp: this.player.hp,
      kills: this.kills,
      experience: this.experience,
      defeated: [...this.defeated].slice(-2000),
      inventory: this.inventory.snapshot(),
      drops: [...this.drops.values()].slice(0, MAX_WORLD_DROPS),
    };
  }
}
