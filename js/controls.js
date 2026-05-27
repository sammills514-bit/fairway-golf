// Touch / mouse drag controls — no Three.js dependency
class Controls {
  constructor(canvas) {
    this.canvas  = canvas;
    this.enabled = true;
    this._active = false;
    this._start  = null;
    this._cur    = null;

    this.aimAngle = 0;  // radians
    this.power    = 0;  // 0–1

    // Callbacks set by main.js
    this.onUpdate = null; // (aimAngle, power, dragging) => void
    this.onSwing  = null; // (aimAngle, power) => void

    this._bind();
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener('mousedown',  e => this._start_(e.clientX, e.clientY));
    c.addEventListener('mousemove',  e => this._move_(e.clientX, e.clientY));
    c.addEventListener('mouseup',    () => this._end_());
    c.addEventListener('mouseleave', () => this._cancel_());

    c.addEventListener('touchstart', e => {
      e.preventDefault();
      this._start_(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    c.addEventListener('touchmove', e => {
      e.preventDefault();
      this._move_(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    c.addEventListener('touchend',   e => { e.preventDefault(); this._end_();    }, { passive: false });
    c.addEventListener('touchcancel',e => { e.preventDefault(); this._cancel_(); }, { passive: false });
  }

  _start_(x, y) {
    if (!this.enabled) return;
    this._active = true;
    this._start  = { x, y };
    this._cur    = { x, y };
    this.aimAngle = 0;
    this.power    = 0;
  }

  _move_(x, y) {
    if (!this._active || !this.enabled) return;
    this._cur = { x, y };
    this._compute();
    if (this.onUpdate) this.onUpdate(this.aimAngle, this.power, true);
  }

  _end_() {
    if (!this._active || !this.enabled) return;
    this._active = false;
    if (this.power > 0.04 && this.onSwing) {
      this.onSwing(this.aimAngle, this.power);
    } else {
      if (this.onUpdate) this.onUpdate(0, 0, false);
    }
    this.power    = 0;
    this.aimAngle = 0;
  }

  _cancel_() {
    if (!this._active) return;
    this._active = false;
    this.power    = 0;
    this.aimAngle = 0;
    if (this.onUpdate) this.onUpdate(0, 0, false);
  }

  _compute() {
    const dx = this._cur.x - this._start.x;
    const dy = this._cur.y - this._start.y;

    // Drag downward (dy > 0) = pulling back = power
    const maxPowerPx = Math.min(window.innerHeight * 0.38, 220);
    this.power = Math.max(0, Math.min(1, dy / maxPowerPx));

    // Horizontal drag = aim angle, max ±45°
    const maxAimPx = window.innerWidth * 0.22;
    const fraction = Math.max(-1, Math.min(1, dx / maxAimPx));
    this.aimAngle  = fraction * (Math.PI / 4);
  }

  enable()  { this.enabled = true;  }
  disable() { this.enabled = false; this._cancel_(); }
}
