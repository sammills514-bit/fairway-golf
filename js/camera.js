// Camera state machine: setup → flight → reposition → setup
class GameCamera {
  constructor(threeCamera, ball) {
    this.cam  = threeCamera;
    this.ball = ball;
    this.mode = 'setup';

    this._pos  = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._repositionT = 0;

    this._snapBehindBall();
  }

  // ── Public API ─────────────────────────────────────────────
  startFlight() {
    this.mode = 'flight';
  }

  ballLanded() {
    this.mode = 'reposition';
    this._repositionT = 1.4;
  }

  // ── Per-frame update ───────────────────────────────────────
  update(dt) {
    switch (this.mode) {

      case 'setup': {
        const bp  = this.ball.position;
        const tgt = new THREE.Vector3(bp.x, bp.y + 2.6, bp.z + 7);
        const lk  = new THREE.Vector3(bp.x, bp.y + 0.6, bp.z - 60);
        this._pos.lerp(tgt, dt * 2.5);
        this._look.lerp(lk,  dt * 2.5);
        this._apply();
        break;
      }

      case 'flight': {
        const mp = this.ball.mesh.position;
        const tgt = new THREE.Vector3(mp.x, mp.y + 3.5, mp.z + 9);
        const lk  = new THREE.Vector3(mp.x, mp.y + 0.5, mp.z);
        this._pos.lerp(tgt, dt * 4.5);
        this._look.lerp(lk,  dt * 6);
        this._apply();
        break;
      }

      case 'reposition': {
        this._repositionT -= dt;
        // Drift camera toward a position behind the new ball location
        const bp  = this.ball.position;
        const tgt = new THREE.Vector3(bp.x, bp.y + 2.6, bp.z + 7);
        const lk  = new THREE.Vector3(bp.x, bp.y + 0.4, bp.z - 20);
        this._pos.lerp(tgt, dt * 1.8);
        this._look.lerp(lk,  dt * 2.2);
        this._apply();

        if (this._repositionT <= 0) {
          this.mode = 'setup';
        }
        break;
      }
    }
  }

  // ── Internals ──────────────────────────────────────────────
  _snapBehindBall() {
    const bp = this.ball.position;
    this._pos.set(bp.x, bp.y + 2.6, bp.z + 7);
    this._look.set(bp.x, bp.y + 0.6, bp.z - 60);
    this._apply();
  }

  _apply() {
    this.cam.position.copy(this._pos);
    this.cam.lookAt(this._look);
  }
}
