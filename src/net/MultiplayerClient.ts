import { SnapshotTimeline } from "./SnapshotTimeline.ts";
import { FOOD_IDS } from "../engine/Food.ts";
import type {
  ClientMessage,
  CombatFocus,
  HeroState,
  InventoryAction,
  InventoryMessage,
  InventoryOrder,
  InventoryReceipt,
  MobState,
  RoomInventoryState,
  ServerMessage,
  WalkTarget,
} from "../shared/protocol.ts";
import { normalizeGear, type GearId, type GearSlot } from "../engine/Equipment.ts";
import { isWalkTarget, PROTOCOL_VERSION, validRoom } from "../shared/protocol.ts";

export class MultiplayerClient {
  private closed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private socket: WebSocket | null = null;
  private backoff = 1500;
  id: string | null = null;
  connected = false;
  tileMovement = false;
  targetCombat = false;
  roomInventory = false;
  inventory: RoomInventoryState | null = null;
  private inventoryRequestId = 0;
  private pendingInventoryRequest: InventoryMessage | null = null;
  combatFocus: CombatFocus | null = null;
  private targetingRequested = false;
  walkTarget: WalkTarget | null = null;
  private walkRequested = false;
  players: HeroState[] = [];
  mobs: MobState[] = [];
  private targetPlayers: HeroState[] = [];
  private targetMobs: MobState[] = [];
  private incompatible = false;
  private readonly timeline = new SnapshotTimeline();
  get self(): HeroState | undefined { return this.players.find(hero => hero.id === this.id); }
  get inventoryPending(): boolean { return this.pendingInventoryRequest !== null; }
  constructor(
    private readonly endpoint: string,
    public readonly room: string,
    private readonly onWelcome: (seed: number) => void,
    private readonly onSnapshot: (self: HeroState) => void,
    private readonly onStatus: (label: string) => void,
    private readonly onInventoryReceipt: (receipt: InventoryReceipt) => void,
  ) {
    this.connect();
  }
  private connect(): void {
    if (this.closed) return;
    try {
      const url = new URL(this.endpoint);
      const local =
        url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (
        !["wss:", ...(local ? ["ws:"] : [])].includes(url.protocol) ||
        !validRoom(this.room)
      ) {
        this.onStatus("Multiplayer não configurado");
        return;
      }
      url.searchParams.set("room", this.room);
      url.searchParams.set("movement", "tiles");
      url.searchParams.set("combat", "target");
      url.searchParams.set("progression", "xp");
      url.searchParams.set("inventory", "loot");
      url.searchParams.set("equipment", "forge");
      url.searchParams.set("gear", "slots");
      this.onStatus("Conectando à VPS…");
      const socket = new WebSocket(url);
      this.socket = socket;
      socket.onopen = () => {
        this.backoff = 1500;
      };
      socket.onmessage = (event) => {
        if (typeof event.data !== "string" || event.data.length > 80_000)
          return;
        let msg: ServerMessage;
        try {
          msg = JSON.parse(event.data) as ServerMessage;
        } catch {
          return;
        }
        if (msg.type === "welcome" && msg.version !== PROTOCOL_VERSION) {
          this.incompatible = true;
          socket.close(1000, "Version mismatch");
          return;
        }
        if (
          msg.type === "welcome" &&
          msg.version === PROTOCOL_VERSION &&
          typeof msg.seed === "number" &&
          typeof msg.id === "string"
        ) {
          this.id = msg.id;
          this.connected = true;
          this.tileMovement = msg.movement === "tiles";
          this.targetCombat = this.tileMovement && msg.combat === "target";
          this.roomInventory = msg.inventory === "loot";
          this.incompatible = false;
          this.onWelcome(msg.seed);
          this.onStatus("Online · sala " + msg.room);
        }
        if (
          msg.type === "state" &&
          this.connected &&
          Array.isArray(msg.players) &&
          Array.isArray(msg.mobs)
        ) {
          // Estados recebidos são apenas dados visuais; o servidor mantém a autoridade.
          if (this.tileMovement && typeof msg.time === "number" &&
              !this.timeline.push(msg.time, msg.players, msg.mobs)) return;
          const heroes = this.players,
            mobs = this.mobs;
          this.targetPlayers = msg.players;
          this.targetMobs = msg.mobs;
          this.walkTarget = this.tileMovement && isWalkTarget(msg.walkTarget) ? msg.walkTarget : null;
          this.combatFocus = this.targetCombat && this.targetingRequested &&
            typeof msg.focus?.id === "string" && typeof msg.focus.following === "boolean"
            ? msg.focus : null;
          if (!this.timeline.active) {
            this.players = msg.players.map((p) => {
              const old = heroes.find((h) => h.id === p.id);
              return old
                ? { ...p, x: old.x, y: old.y, walkTime: old.walkTime }
                : { ...p };
            });
            this.mobs = msg.mobs.map((p) => {
              const old = mobs.find((m) => m.id === p.id);
              return old
                ? { ...p, x: old.x, y: old.y, bounce: old.bounce }
                : { ...p };
            });
          }
          const self = msg.players.find((p) => p.id === this.id);
          if (self && Number.isFinite(self.x) && Number.isFinite(self.y)) {
            this.onSnapshot(self);
            if (this.roomInventory && msg.inventory) this.applyInventory(msg.inventory);
          }
        }
        if (msg.type === "error") this.onStatus("Erro na sala multiplayer");
      };
      socket.onclose = () => {
        if (this.socket !== socket) return;
        this.connected = false;
        this.tileMovement = false;
        this.targetCombat = false;
        this.resetInventory();
        this.combatFocus = null;
        this.targetingRequested = false;
        this.walkTarget = null;
        this.walkRequested = false;
        this.id = null;
        this.players = [];
        this.mobs = [];
        this.timeline.reset();
        this.targetPlayers = [];
        this.targetMobs = [];
        this.onStatus(
          this.incompatible
            ? "Offline · servidor precisa ser atualizado"
            : "Offline · tentando reconectar",
        );
        const delay = this.backoff;
        this.backoff = Math.min(30_000, this.backoff * 2);
        this.reconnectTimer = setTimeout(() => {
          if (this.socket === socket) this.connect();
        }, delay);
      };
      socket.onerror = () => {
        /* onclose informa a desconexão */
      };
    } catch {
      this.onStatus("Multiplayer não configurado");
    }
  }
  disconnect(): void {
    this.closed = true;
    clearTimeout(this.reconnectTimer);
    const socket = this.socket;
    this.socket = null;
    this.connected = false;
    this.tileMovement = false;
    this.targetCombat = false;
    this.resetInventory();
    this.combatFocus = null;
    this.targetingRequested = false;
    this.walkTarget = null;
    this.walkRequested = false;
    this.id = null;
    this.players = []; this.mobs = [];
    this.timeline.reset();
    this.targetPlayers = []; this.targetMobs = [];
    if (socket) {
      socket.onmessage = socket.onclose = socket.onopen = socket.onerror = null;
      socket.close(1000, "Saindo da aventura");
    }
  }
  sendInput(x: number, y: number, attack: boolean): void {
    if (this.send({ type: "input", x, y, attack }) && attack && this.targetCombat)
      this.targetingRequested = true;
  }
  requestInventory(action: InventoryAction): boolean {
    return this.submitInventory({ action });
  }
  requestGear(slot: GearSlot, item: GearId | null): boolean {
    if (!this.inventory?.gear) return false;
    return this.submitInventory({ action: "set-gear", slot, item });
  }
  private submitInventory(order: InventoryOrder): boolean {
    if (!this.roomInventory || !this.inventory || this.pendingInventoryRequest) return false;
    const { action } = order;
    if (action !== "use-potion" && action !== "trade-potion" &&
      !FOOD_IDS.some(id => action === `eat-${id}` || action === `buy-${id}`) && !this.inventory.loadout) return false;
    const request: InventoryMessage = { ...order, type: "inventory", requestId: ++this.inventoryRequestId };
    if (!this.send(request)) return false;
    this.pendingInventoryRequest = request;
    return true;
  }
  private applyInventory(inventory: RoomInventoryState): void {
    this.inventory = inventory.gear ? { ...inventory, gear: normalizeGear(inventory.gear) } : inventory;
    const { receipt } = inventory;
    if (receipt && this.pendingInventoryRequest?.requestId === receipt.requestId &&
        this.pendingInventoryRequest.action === receipt.action) {
      this.pendingInventoryRequest = null;
      this.onInventoryReceipt(receipt);
    }
  }
  private resetInventory(): void {
    this.roomInventory = false;
    this.inventory = null;
    this.inventoryRequestId = 0;
    this.pendingInventoryRequest = null;
  }
  selectTarget(id: string): void {
    if (this.targetCombat && this.send({ type: "target", id })) this.targetingRequested = true;
  }
  cancelTarget(): void {
    if (!this.targetingRequested) return;
    this.targetingRequested = false;
    this.combatFocus = null;
    this.send({ type: "target", id: null });
  }
  walkTo(target: WalkTarget): void {
    if (!this.tileMovement) return;
    this.walkRequested = this.send({ type: "walk", target });
  }
  cancelWalk(): void {
    if (!this.walkRequested) return;
    this.walkRequested = false;
    this.walkTarget = null;
    this.send({ type: "walk", target: null });
  }
  private send(message: ClientMessage): boolean {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }
  /** Smooth visual positions between 10 Hz snapshots; never feeds simulation. */
  interpolate(dt: number): void {
    const frame = this.timeline.advance(dt);
    if (frame) {
      this.players = frame.players;
      this.mobs = frame.mobs;
      return;
    }
    if (!Number.isFinite(dt) || dt < 0) return;
    const factor = 1 - Math.exp(-16 * dt);
    const blend = (
      a: { x: number; y: number },
      b: { x: number; y: number },
    ) => {
      const f = Math.hypot(a.x - b.x, a.y - b.y) > 180 ? 1 : factor;
      a.x += (b.x - a.x) * f;
      a.y += (b.y - a.y) * f;
    };
    for (const hero of this.players) {
      const target = this.targetPlayers.find((p) => p.id === hero.id);
      if (target) {
        blend(hero, target);
        hero.walkTime += (target.walkTime - hero.walkTime) * factor;
      }
      hero.attackTime = Math.max(0, hero.attackTime - dt);
      hero.hurtTime = Math.max(0, (hero.hurtTime ?? 0) - dt);
    }
    for (const mob of this.mobs) {
      const target = this.targetMobs.find((p) => p.id === mob.id);
      if (target) {
        blend(mob, target);
        mob.bounce += (target.bounce - mob.bounce) * factor;
      }
      mob.hurtTime = Math.max(0, (mob.hurtTime ?? 0) - dt);
    }
  }
}
