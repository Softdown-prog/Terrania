import { stickVector } from "./joystick.ts";
import { isShortTap } from "./tap.ts";
import type { Point } from "../engine/TapNavigator.ts";

/** Teclado e controles Android usam o mesmo vetor de movimento da simulação. */
export class Input {
  private keys = new Set<string>();
  private joyX = 0;
  private joyY = 0;
  private attackQueued = false;
  private talkQueued = false;
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
    });
    canvas?.addEventListener("pointermove", (event) => {
      if (!(event instanceof PointerEvent) || event.pointerId !== this.tapPointer?.id) return;
      if (Math.hypot(event.clientX - this.tapPointer.x, event.clientY - this.tapPointer.y) > 12)
        this.tapPointer = null;
    });
    canvas?.addEventListener("pointerup", (event) => {
      if (!(event instanceof PointerEvent)) return;
      const first = this.tapPointer;
      if (event.pointerId !== first?.id) return;
      this.tapPointer = null;
      if (!isShortTap(Math.hypot(event.clientX - first.x, event.clientY - first.y),
          event.timeStamp - first.time) || document.querySelector("dialog[open]")) return;
      const rect = canvas.getBoundingClientRect();
      this.queuedTap = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    });
    for (const type of ["pointercancel", "lostpointercapture"] as const)
      canvas?.addEventListener(type, (event) => {
        if (event instanceof PointerEvent && event.pointerId === this.tapPointer?.id)
          this.tapPointer = null;
      });
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
      ) return;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)
      ) event.preventDefault();
      this.keys.add(event.code);
      if (!event.repeat && event.code === "KeyE") this.talkQueued = true;
      if (!event.repeat && (event.code === "Space" || event.code === "KeyJ"))
        this.attackQueued = true;
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clear();
    });
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
        this.joyX = vector.x;
        this.joyY = vector.y;
        thumb.style.transform = `translate(${vector.thumbX}px, ${vector.thumbY}px)`;
      };
      stick.addEventListener("pointerdown", (event) => {
        if (this.stickPointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
        event.preventDefault();
        this.stickPointer = event.pointerId;
        stick.setPointerCapture(event.pointerId);
        move(event);
      });
      stick.addEventListener("pointermove", (event) => {
        if (event.pointerId !== this.stickPointer) return;
        event.preventDefault();
        move(event);
      });
      const release = (event: PointerEvent) => {
        if (event.pointerId !== this.stickPointer) return;
        this.stickPointer = null;
        this.joyX = this.joyY = 0;
        thumb.style.transform = "translate(0, 0)";
        if (stick.hasPointerCapture(event.pointerId)) stick.releasePointerCapture(event.pointerId);
      };
      stick.addEventListener("pointerup", release);
      stick.addEventListener("pointercancel", release);
      stick.addEventListener("lostpointercapture", release);
      stick.addEventListener("contextmenu", (event) => event.preventDefault());
    }
    const attack = document.getElementById("attack");
    attack?.addEventListener("pointerdown", (event) => {
      if (this.attackPointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      this.attackPointer = event.pointerId;
      attack.setPointerCapture(event.pointerId);
      this.attackQueued = this.attackHeld = true;
    });
    const releaseAttack = (event: PointerEvent) => {
      if (event.pointerId !== this.attackPointer) return;
      this.attackPointer = null;
      this.attackHeld = false;
      if (attack?.hasPointerCapture(event.pointerId)) attack.releasePointerCapture(event.pointerId);
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"] as const)
      attack?.addEventListener(type, releaseAttack);
    attack?.addEventListener("contextmenu", (event) => event.preventDefault());
    // Acessibilidade: Enter/Espaço também acionam o botão físico de ataque.
    attack?.addEventListener("click", (event) => {
      if (event.detail === 0) this.attackQueued = true;
    });
  }
  clear(): void {
    this.keys.clear();
    this.joyX = this.joyY = 0;
    this.attackHeld = this.attackQueued = false;
    this.talkQueued = false;
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
  consumeTap(): Point | null {
    const point = this.queuedTap;
    this.queuedTap = null;
    return point;
  }
  movement(): { x: number; y: number } {
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
  consumeTalk(): boolean {
    const talk = this.talkQueued;
    this.talkQueued = false;
    return talk;
  }
  consumeAttack(): boolean {
    const attack =
      this.attackQueued ||
      this.attackHeld ||
      this.keys.has("Space") ||
      this.keys.has("KeyJ");
    this.attackQueued = false;
    return attack;
  }
}
