export class Input {
  private keys = new Set<string>();
  private joyX = 0; private joyY = 0;
  private attackQueue = 0;
  constructor() {
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (!event.repeat && (event.code === 'Space' || event.code === 'KeyJ')) this.attackQueue++;
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.joyX = this.joyY = 0; });
    const stick = document.getElementById('joystick');
    const thumb = document.getElementById('stick');
    if (stick && thumb) {
      const move = (event: PointerEvent) => {
        const rect = stick.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const d = Math.hypot(dx, dy); const scale = d > 40 ? 40 / d : 1;
        const x = dx * scale, y = dy * scale;
        this.joyX = x / 40; this.joyY = y / 40;
        thumb.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      };
      stick.addEventListener('pointerdown', (event) => { stick.setPointerCapture(event.pointerId); move(event); });
      stick.addEventListener('pointermove', (event) => { if (stick.hasPointerCapture(event.pointerId)) move(event); });
      const release = () => { this.joyX = this.joyY = 0; thumb.style.transform = 'translate(0, 0)'; };
      stick.addEventListener('pointerup', release); stick.addEventListener('pointercancel', release);
    }
    document.getElementById('attack')?.addEventListener('pointerdown', (event) => { event.preventDefault(); this.attackQueue++; });
  }
  movement(): { x: number; y: number } {
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft')) + this.joyX;
    const y = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) + this.joyY;
    const d = Math.hypot(x, y); return d > 1 ? { x: x / d, y: y / d } : { x, y };
  }
  consumeAttack(): boolean { if (!this.attackQueue) return false; this.attackQueue = 0; return true; }
}
