// Touch / mouse drag controls — orbit vs shot gesture classification
class Controls {
  constructor(canvas) {
    this.canvas  = canvas;
    this.enabled = true;

    this._mode   = null;   // null | 'orbit' | 'shot'
    this._startX = 0;
    this._startY = 0;
    this._prevX  = 0;      // for per-frame orbit delta
    this._curX   = 0;
    this._curY   = 0;

    this.power     = 0;
    this.aimOffset = 0;

    // Callbacks assigned by main.js
    this.onOrbit  = null;  // (deltaYaw) incremental, called while orbiting
    this.onUpdate = null;  // (aimOffset, power, dragging) called while in shot mode
    this.onSwing  = null;  // (aimOffset, power) fired on release

    this._bind();
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener('mousedown',  e => this._down(e.clientX, e.clientY));
    c.addEventListener('mousemove',  e => this._move(e.clientX, e.clientY));
    c.addEventListener('mouseup',    () => this._up());
    c.addEventListener('mouseleave', () => this._cancel());

    c.addEventListener('touchstart', e => {
      e.preventDefault();
      this._down(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    c.addEventListener('touchmove', e => {
      e.preventDefault();
      this._move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    c.addEventListener('touchend',    e => { e.preventDefault(); this._up();     }, { passive: false });
    c.addEventListener('touchcancel', e => { e.preventDefault(); this._cancel(); }, { passive: false });
  }

  _down(x, y) {
    if (!this.enabled) return;
    this._mode   = null;
    this._startX = x;
    this._startY = y;
    this._prevX  = x;
    this._curX   = x;
    this._curY   = y;
    this.power     = 0;
    this.aimOffset = 0;
  }

  _move(x, y) {
    if (!this.enabled || (this._startX === 0 && this._startY === 0)) return;

    const dx  = x - this._startX;
    const dy  = y - this._startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // Classify gesture once we've moved far enough
    if (this._mode === null) {
      if (Math.sqrt(dx * dx + dy * dy) < 18) return;
      if (adx >= ady)          this._mode = 'orbit';
      else if (dy > 0)         this._mode = 'shot';
      else                     return; // upward swipe, ignore
    }

    if (this._mode === 'orbit') {
      const deltaYaw = (x - this._prevX) * (Math.PI / 350);
      this._prevX = x;
      if (this.onOrbit) this.onOrbit(deltaYaw);

    } else if (this._mode === 'shot') {
      this._curX = x;
      this._curY = y;

      const maxPowerPx = Math.min(window.innerHeight * 0.45, 300);
      this.power = Math.max(0, Math.min(1, dy / maxPowerPx));

      const maxAimPx = window.innerWidth * 0.35;
      const frac     = Math.max(-1, Math.min(1, dx / maxAimPx));
      this.aimOffset = frac * (Math.PI / 9); // max ±20°

      if (this.onUpdate) this.onUpdate(this.aimOffset, this.power, true);
    }
  }

  _up() {
    if (!this.enabled) return;
    if (this._mode === 'shot') {
      if (this.power > 0.04 && this.onSwing) {
        this.onSwing(this.aimOffset, this.power);
      } else {
        if (this.onUpdate) this.onUpdate(0, 0, false);
      }
    }
    this._reset();
  }

  _cancel() {
    if (this._mode === 'shot' && this.onUpdate) this.onUpdate(0, 0, false);
    this._reset();
  }

  _reset() {
    this._mode     = null;
    this._startX   = 0;
    this._startY   = 0;
    this.power     = 0;
    this.aimOffset = 0;
  }

  enable()  { this.enabled = true; }
  disable() { this.enabled = false; this._cancel(); }
}
