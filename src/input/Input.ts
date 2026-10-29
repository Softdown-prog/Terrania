export class Input {
  private keys = new Set<string>();
  private joyX = 0;
  private joyY = 0;
  private attackQueued = false;
  private talkQueued = false;
  private attackHeld = false;
  private stickPointer: number | null = null;
  constructor() {
    window.addEventListener("keydown", (event) => {
      if (
        document.querySelector("dialog[open]") ||
        (event.target instanceof Element &&
          event.target.closest("input,select,textarea,[contenteditable]"))
      )
        return;
      if (
        ["Space", "Enter"].includes(event.code) &&
        event.target instanceof Element &&
        event.target.closest("button,a")
      )
        return;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          event.code,
        )
      )
        event.preventDefault();
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
        const rect = stick.getBoundingClientRect(),
          radius = rect.width * 0.34;
        const dx = event.clientX - (rect.left + rect.width / 2),
          dy = event.clientY - (rect.top + rect.height / 2);
        const d = Math.hypot(dx, dy),
          scale = d > radius ? radius / d : 1;
        const x = dx * scale,
          y = dy * scale;
        const amount = Math.max(0, (Math.min(1, d / radius) - 0.12) / 0.88);
        this.joyX = d ? (dx / d) * amount : 0;
        this.joyY = d ? (dy / d) * amount : 0;
        thumb.style.transform = "translate(" + x + "px, " + y + "px)";
      };
      stick.addEventListener("pointerdown", (event) => {
        if (this.stickPointer !== null) return;
        this.stickPointer = event.pointerId;
        stick.setPointerCapture(event.pointerId);
        move(event);
      });
      stick.addEventListener("pointermove", (event) => {
        if (event.pointerId === this.stickPointer) move(event);
      });
      const release = (event: PointerEvent) => {
        if (event.pointerId !== this.stickPointer) return;
        this.stickPointer = null;
        this.joyX = this.joyY = 0;
        thumb.style.transform = "translate(0,0)";
      };
      stick.addEventListener("pointerup", release);
      stick.addEventListener("pointercancel", release);
      stick.addEventListener("lostpointercapture", release);
    }
    const attack = document.getElementById("attack");
    attack?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      attack.setPointerCapture(event.pointerId);
      this.attackQueued = this.attackHeld = true;
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      attack?.addEventListener(type, () => {
        this.attackHeld = false;
      });
  }
  clear(): void {
    this.keys.clear();
    this.joyX = this.joyY = 0;
    this.attackHeld = this.attackQueued = false;
    this.talkQueued = false;
    this.stickPointer = null;
    const thumb = document.getElementById("stick");
    if (thumb) thumb.style.transform = "translate(0,0)";
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
