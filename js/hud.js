// DOM-based HUD — no Three.js dependency
class HUD {
  constructor() {
    this._strokes = document.getElementById('hud-strokes');
    this._dist    = document.getElementById('hud-dist');
    this._club    = document.getElementById('hud-club');
    this._powerC  = document.getElementById('power-container');
    this._powerF  = document.getElementById('power-fill');
    this._msg     = document.getElementById('shot-message');
    this._hint    = document.getElementById('hint');
    this._msgTimer = null;
  }

  updateStrokes(n) {
    this._strokes.textContent = n;
  }

  updateDistance(yards) {
    this._dist.textContent = Math.round(yards) + 'y';
  }

  updateClub(name) {
    this._club.textContent = name;
  }

  setPower(fraction) {
    if (fraction > 0) {
      this._powerC.style.display = 'flex';
      this._hint.style.opacity   = '0';
      this._powerF.style.width   = (fraction * 100) + '%';
    } else {
      this._powerC.style.display = 'none';
      this._hint.style.opacity   = '1';
    }
  }

  showMessage(text, durationMs = 2000) {
    if (this._msgTimer) clearTimeout(this._msgTimer);
    this._msg.textContent = text;
    this._msg.style.opacity = '1';
    this._msgTimer = setTimeout(() => {
      this._msg.style.opacity = '0';
    }, durationMs);
  }

  setClubActive(clubId) {
    document.querySelectorAll('.club-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.club === clubId);
    });
  }
}
