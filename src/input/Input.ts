import { stickVector } from "./joystick.ts";
import { isShortTap } from "./tap.ts";
import { tileDirection } from "../engine/movement/ClassicTileWalker.ts";
import type { Point } from "../engine/movement/TapNavigator.ts";

/** Teclado e controles Android usam o mesmo vetor de movimento da simulação. */
export class Input {
  private readonly lifetime = new AbortController();
  private keys = new Set<string>();
  private joyX = 0;
  private joyY = 0;
  private movementPulse: Point | null = null;
  private attackQueued = false;
  private talkQueued = false;
  private cancelTargetQueued = false;
  private attackHeld = false;
  private stickPointer: number | null = null;
  private attackPointer: number | null = null;
  private tapPointer: { id: number; x: number; y: number; time: number } | null = null;
  private queuedTap: Point | null = null;
  constructor() {
    const canvas = document.getElementById("game");
    canvas?.addEventListener("pointerdown", (event) => {
      if (!(event instanceof PointerEvent) ||
          (event.pointerType === "mouse" && event.button !== 0)) return;
      // Dois toques simultâneos no mundo não devem produzir uma rota falsa.
      if (this.tapPointer !== null) { this.tapPointer = null; return; }
      this.tapPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
      canvas.setPointerCapture(event.pointerId);
    }, { signal: this.lifetime.signal });
    canvas?.addEventListener("pointermove", (event) => {
      if (!(event instanceof PointerEvent) || event.pointerId !== this.tapPointer?.id) return;
      if (Math.hypot(event.clientX - this.tapPointer.x, event.clientY - this.tapPointer.y) > 12)
        this.tapPointer = null;
    }, { signal: this.lifetime.signal });
    canvas?.addEventListener("pointerup", (event) => {
      if (!(event instanceof PointerEvent)) return;
      const first = this.tapPointer;
      if (event.pointerId !== first?.id) return;
      this.tapPointer = null;
      if (!isShortTap(Math.hypot(event.clientX - first.x, event.clientY - first.y),
          event.timeStamp - first.time) || document.querySelector("dialog[open]")) return;
      const rect = canvas.getBoundingClientRect();
      this.queuedTap = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }, { signal: this.lifetime.signal });
    for (const type of ["pointercancel", "lostpointercapture"] as const)
      canvas?.addEventListener(type, (event) => {
        if (event instanceof PointerEvent && event.pointerId === this.tapPointer?.id)
          this.tapPointer = null;
      }, { signal: this.lifetime.signal });
    window.addEventListener("keydown", (event) => {
      if (
        document.querySelector("dialog[open]") ||
        (event.target instanceof Element &&
          event.target.closest("input,select,textarea,[contenteditable]"))
      ) return;
      if (
        ["Space", "Enter"].includes(event.code) &&
        event.target instanceof Element &&
        event.target.closest("button,a")
      ) {
        // A focused attack button can otherwise emit a click on every Enter repeat.
        if (event.repeat && event.target.closest("#attack")) event.preventDefault();
        return;
      }
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)
      ) event.preventDefault();
      this.keys.add(event.code);
      if (!event.repeat && /^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(event.code))
        this.rememberMovement();
      if (!event.repeat && event.code === "KeyE") this.talkQueued = true;
      if (!event.repeat && event.code === "Escape") this.cancelTargetQueued = true;
      if (!event.repeat && (event.code === "Space" || event.code === "KeyJ"))
        this.attackQueued = true;
    }, { signal: this.lifetime.signal });
    window.addEventListener("keyup", (event) => this.keys.delete(event.code), { signal: this.lifetime.signal });
    window.addEventListener("blur", () => this.clear(), { signal: this.lifetime.signal });
    window.addEventListener("resize", () => this.clear(), { signal: this.lifetime.signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clear();
    }, { signal: this.lifetime.signal });
    const stick = document.getElementById("joystick"),
      thumb = document.getElementById("stick");
    if (stick && thumb) {
      const move = (event: PointerEvent) => {
        const rect = stick.getBoundingClientRect();
        const radius = Math.min(rect.width, rect.height) * 0.34;
        const vector = stickVector(
          event.clientX - (rect.left + rect.width / 2),
          event.clientY - (rect.top + rect.height / 2),
          radius,
        );
        const previous = tileDirection(this.heldMovement());
        this.joyX = vector.x;
        this.joyY = vector.y;
        const current = this.heldMovement();
        const next = tileDirection(current);
        // Thumb drift during a hold must not queue another step on release.
        if (this.movementPulse || event.type === "pointerdown" || next.x !== previous.x || next.y !== previous.y)
          this.rememberMovement(current);
        thumb.style.transform = `translate(${vector.thumbX}px, ${vector.thumbY}px)`;
      };
      stick.addEventListener("pointerdown", (event) => {
        if (this.stickPointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
        event.preventDefault();
        this.stickPointer = event.pointerId;
        stick.setPointerCapture(event.pointerId);
        move(event);
      }, { signal: this.lifetime.signal });
      stick.addEventListener("pointermove", (event) => {
        if (event.pointerId !== this.stickPointer) return;
        event.preventDefault();
        move(event);
      }, { signal: this.lifetime.signal });
      const release = (event: PointerEvent) => {
        if (event.pointerId !== this.stickPointer) return;
        this.stickPointer = null;
        if (event.type !== "pointerup") this.movementPulse = null;
        this.joyX = this.joyY = 0;
        thumb.style.transform = "translate(0, 0)";
        if (stick.hasPointerCapture(event.pointerId)) stick.releasePointerCapture(event.pointerId);
      };
      stick.addEventListener("pointerup", release, { signal: this.lifetime.signal });
      stick.addEventListener("pointercancel", release, { signal: this.lifetime.signal });
      stick.addEventListener("lostpointercapture", release, { signal: this.lifetime.signal });
      stick.addEventListener("contextmenu", (event) => event.preventDefault(), { signal: this.lifetime.signal });
    }
    const attack = document.getElementById("attack");
    attack?.addEventListener("pointerdown", (event) => {
      if (this.attackPointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      this.attackPointer = event.pointerId;
      attack.setPointerCapture(event.pointerId);
      this.attackQueued = this.attackHeld = true;
    }, { signal: this.lifetime.signal });
    const releaseAttack = (event: PointerEvent) => {
      if (event.pointerId !== this.attackPointer) return;
      this.attackPointer = null;
      if (event.type !== "pointerup") this.attackQueued = false;
      this.attackHeld = false;
      if (attack?.hasPointerCapture(event.pointerId)) attack.releasePointerCapture(event.pointerId);
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"] as const)
      attack?.addEventListener(type, releaseAttack, { signal: this.lifetime.signal });
    attack?.addEventListener("contextmenu", (event) => event.preventDefault(), { signal: this.lifetime.signal });
    // Acessibilidade: Enter/Espaço também acionam o botão físico de ataque.
    attack?.addEventListener("click", (event) => {
      // Chromium can report detail=0 for a touch click after a long press.
      // Pointer attacks are already queued on pointerdown.
      const fromPointer = event instanceof PointerEvent && event.pointerType !== "";
      if (event.detail === 0 && !fromPointer) this.attackQueued = true;
    }, { signal: this.lifetime.signal });
  }
  clear(): void {
    this.keys.clear();
    this.joyX = this.joyY = 0;
    this.movementPulse = null;
    this.attackHeld = this.attackQueued = false;
    this.talkQueued = false;
    this.cancelTargetQueued = false;
    this.queuedTap = null;
    const canvas = document.getElementById("game");
    const canvasPointer = this.tapPointer?.id;
    this.tapPointer = null;
    if (canvasPointer !== undefined && canvas?.hasPointerCapture(canvasPointer))
      canvas.releasePointerCapture(canvasPointer);
    const stick = document.getElementById("joystick");
    const attack = document.getElementById("attack");
    const stickId = this.stickPointer, attackId = this.attackPointer;
    this.stickPointer = this.attackPointer = null;
    if (stickId !== null && stick?.hasPointerCapture(stickId))
      stick.releasePointerCapture(stickId);
    if (attackId !== null && attack?.hasPointerCapture(attackId))
      attack.releasePointerCapture(attackId);
    const thumb = document.getElementById("stick");
    if (thumb) thumb.style.transform = "translate(0, 0)";
  }
  destroy(): void {
    this.clear();
    this.lifetime.abort();
  }
  consumeTap(): Point | null {
    const point = this.queuedTap;
    this.queuedTap = null;
    return point;
  }
  /** A press released between frames survives until simulation/network consumes it. */
  movement(): Point {
    const current = this.heldMovement();
    return Math.hypot(current.x, current.y) >= 0.08 ? current : this.movementPulse ?? current;
  }
  acknowledgeMovement(): void { this.movementPulse = null; }
  private rememberMovement(current = this.heldMovement()): void {
    this.movementPulse = Math.hypot(current.x, current.y) >= 0.08 ? current : null;
  }
  private heldMovement(): Point {
    const x =
      Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
      Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft")) +
      this.joyX;
    const y =
      Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")) -
      Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) +
      this.joyY;
    const d = Math.hypot(x, y);
    return d > 1 ? { x: x / d, y: y / d } : { x, y };
  }
  consumeCancelTarget(): boolean {
    const requested = this.cancelTargetQueued;
    this.cancelTargetQueued = false;
    return requested;
  }
  consumeTalk(): boolean {
    const talk = this.talkQueued;
    this.talkQueued = false;
    return talk;
  }
  consumeAttack(repeatHeld: boolean): boolean {
    const attack = this.attackQueued || (repeatHeld &&
      (this.attackHeld || this.keys.has("Space") || this.keys.has("KeyJ")));
    this.attackQueued = false;
    return attack;
  }
}
