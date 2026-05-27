// Camera state machine: setup → flight → reposition → setup
// Yaw = 0: camera behind ball at +Z, looking toward hole at -Z
class GameCamera {
  constructor(threeCamera, ball) {
    this.cam  = threeCamera;
    this.ball = ball;
    this.mode = 'setup';
    this.yaw  = 0;

    this._pos  = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._repositionT = 0;
    this._flightYaw   = 0;
    this._snapYaw     = 0;

    this._snap();
  }

  // ── Public API ─────────────────────────────────────────────
  startFlight(yaw) {
    this._flightYaw = yaw;
    this.mode = 'flight';
  }

  ballLanded(landPos, holePos) {
    this.mode = 'reposition';
    this._repositionT = 1.4;
    // Compute yaw that aims from land position toward hole
    const dx = holePos.x - landPos.x;
    const dz = holePos.z - landPos.z;
    this._snapYaw = Math.atan2(dx, -dz);
  }

  // ── Per-frame update ───────────────────────────────────────
  update(dt) {
    switch (this.mode) {

      case 'setup': {
        const bp  = this.ball.position;
        this._pos.lerp(this._idealPos(bp),  dt * 2.5);
        this._look.lerp(this._idealLook(bp), dt * 2.5);
        this._apply();
        break;
      }

      case 'flight': {
        const mp  = this.ball.mesh.position;
        const fy  = this._flightYaw;
        const tgt = new THREE.Vector3(
          mp.x - Math.sin(fy) * 9,
          mp.y + 3.5,
          mp.z + Math.cos(fy) * 9,
        );
        const lk = new THREE.Vector3(
          mp.x + Math.sin(fy) * 2,
          mp.y + 0.5,
          mp.z - Math.cos(fy) * 2,
        );
        this._pos.lerp(tgt, dt * 4.5);
        this._look.lerp(lk,  dt * 6);
        this._apply();
        break;
      }

      case 'reposition': {
        this._repositionT -= dt;
        // Lerp yaw toward snap angle via shortest arc
        const diff = ((this._snapYaw - this.yaw + Math.PI) % (2 * Math.PI)) - Math.PI;
        this.yaw += diff * Math.min(dt * 2.2, 1);

        const bp  = this.ball.position;
        this._pos.lerp(this._idealPos(bp),  dt * 1.8);
        this._look.lerp(this._idealLook(bp), dt * 2.2);
        this._apply();

        if (this._repositionT <= 0) {
          this.yaw  = this._snapYaw;
          this.mode = 'setup';
        }
        break;
      }
    }
  }

  // ── Position helpers ───────────────────────────────────────
  _idealPos(bp) {
    return new THREE.Vector3(
      bp.x - Math.sin(this.yaw) * 7,
      bp.y + 2.6,
      bp.z + Math.cos(this.yaw) * 7,
    );
  }

  _idealLook(bp) {
    return new THREE.Vector3(
      bp.x + Math.sin(this.yaw) * 60,
      bp.y + 0.6,
      bp.z - Math.cos(this.yaw) * 60,
    );
  }

  _snap() {
    const bp = this.ball.position;
    this._pos.copy(this._idealPos(bp));
    this._look.copy(this._idealLook(bp));
    this._apply();
  }

  _apply() {
    this.cam.position.copy(this._pos);
    this.cam.lookAt(this._look);
  }
}
