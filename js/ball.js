// Ball mesh, physics simulation, aim visualisation, roll-out
class Ball {
  constructor(scene) {
    this.scene     = scene;
    this.position  = new THREE.Vector3(0, 0.05, 0);
    this.inFlight  = false;
    this.isRolling = false;
    this.flightData = null;
    this.rollData   = null;

    this.onLanded = null; // callback(landPos) — fires after roll-out completes

    this._buildBall();
    this._buildShadow();
    this._buildAimLine();
    this._buildLandingRing();
  }

  // ── Geometry ───────────────────────────────────────────────
  _buildBall() {
    const geo = new THREE.SphereGeometry(0.22, 20, 14);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.28, metalness: 0.04 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  _buildShadow() {
    const geo = new THREE.CircleGeometry(0.28, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    this.shadowDisc = new THREE.Mesh(geo, mat);
    this.shadowDisc.rotation.x = -Math.PI / 2;
    this.shadowDisc.position.set(0, 0.011, 0);
    this.scene.add(this.shadowDisc);
  }

  _buildAimLine() {
    const buf = new Float32Array(6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(buf, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
    });
    this.aimLine = new THREE.Line(geo, mat);
    this.aimLine.visible = false;
    this.aimLine.frustumCulled = false;
    this.scene.add(this.aimLine);
  }

  _buildLandingRing() {
    const geo = new THREE.RingGeometry(0.7, 1.2, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.landingRing = new THREE.Mesh(geo, mat);
    this.landingRing.rotation.x = -Math.PI / 2;
    this.landingRing.visible = false;
    this.scene.add(this.landingRing);
  }

  // ── Aim visualisation ──────────────────────────────────────
  // power = 0 shows direction-only line; power > 0 also shows landing ring
  setAim(aimAngle, power, club) {
    this.aimLine.visible = true;

    const sin = Math.sin(aimAngle);
    const cos = Math.cos(aimAngle);
    const lineLen = power > 0 ? (3 + power * 14) : 7;

    const pos = this.aimLine.geometry.attributes.position;
    const sx = this.position.x, sy = this.position.y + 0.25, sz = this.position.z;
    pos.array[0] = sx;             pos.array[1] = sy; pos.array[2] = sz;
    pos.array[3] = sx + sin * lineLen; pos.array[4] = sy; pos.array[5] = sz - cos * lineLen;
    pos.needsUpdate = true;

    if (power > 0) {
      const dist = power * club.maxDistance;
      this.landingRing.visible = true;
      this.landingRing.position.set(
        this.position.x + sin * dist,
        0.013,
        this.position.z - cos * dist,
      );
    } else {
      this.landingRing.visible = false;
    }
  }

  hideAim() {
    this.aimLine.visible    = false;
    this.landingRing.visible = false;
  }

  // ── Fire a shot ────────────────────────────────────────────
  shoot(aimAngle, power, club) {
    if (this.inFlight || this.isRolling) return;

    const G       = 9.8;
    const theta   = club.launchAngle * Math.PI / 180;
    const dist    = power * club.maxDistance;

    // Random spread (inaccuracy)
    const spread    = (Math.random() - 0.5) * 2 * club.spread * dist;
    const finalAng  = aimAngle + Math.atan2(spread, Math.max(dist, 0.1));

    const sin2theta = Math.sin(2 * theta);
    const v0 = Math.sqrt((dist * G) / Math.max(sin2theta, 0.001));

    const vH = v0 * Math.cos(theta);
    const vy = v0 * Math.sin(theta);

    this.flightData = {
      startPos:  this.position.clone(),
      vx:        Math.sin(finalAng) * vH,
      vy,
      vz:       -Math.cos(finalAng) * vH,
      g:         G,
      totalTime: (2 * vy) / G,
      maxHeight: (vy * vy) / (2 * G),
      elapsed:   0,
      power,          // stored for roll calculation
      club,           // stored for rollFactor lookup
    };

    this.inFlight = true;
    this.hideAim();
  }

  // ── Per-frame update ───────────────────────────────────────
  update(dt) {
    if (this.inFlight)  { this._updateFlight(dt); return; }
    if (this.isRolling) { this._updateRoll(dt);   return; }

    // Idle: keep shadow under ball
    this.shadowDisc.position.x = this.position.x;
    this.shadowDisc.position.z = this.position.z;
  }

  _updateFlight(dt) {
    const fd = this.flightData;
    fd.elapsed = Math.min(fd.elapsed + dt, fd.totalTime);
    const t = fd.elapsed;

    const x = fd.startPos.x + fd.vx * t;
    const y = fd.startPos.y + fd.vy * t - 0.5 * fd.g * t * t;
    const z = fd.startPos.z + fd.vz * t;

    if (fd.elapsed >= fd.totalTime) {
      // Transition to roll-out
      this.inFlight = false;
      this._startRoll(x, z, fd);
      this.flightData = null;
    } else {
      this.mesh.position.set(x, Math.max(y, 0.22), z);
      this.shadowDisc.position.set(x, 0.011, z);
      const hr = Math.max(0, y) / Math.max(fd.maxHeight, 0.1);
      this.shadowDisc.material.opacity = 0.22 * (1 - hr * 0.65);
      this.mesh.rotation.x -= dt * 9;
    }
  }

  _startRoll(x, z, fd) {
    const vH = Math.sqrt(fd.vx * fd.vx + fd.vz * fd.vz);

    // Roll distance is proportional to power × club type, capped at 22 units
    const rollDist = Math.min(fd.power * fd.club.maxDistance * fd.club.rollFactor, 22);

    if (rollDist < 0.3 || vH < 0.1) {
      this._land(x, z);
      return;
    }

    const dirX = fd.vx / vH;
    const dirZ = fd.vz / vH;
    // Duration scales with distance so the deceleration rate feels consistent
    const rollTime = 0.7 + rollDist * 0.055;

    this.isRolling = true;
    this.rollData  = {
      startX: x,
      startZ: z,
      dirX,
      dirZ,
      distance: rollDist,
      duration: rollTime,
      elapsed:  0,
      // Spin axis perpendicular to travel direction in XZ plane
      spinAxis: new THREE.Vector3(-dirZ, 0, dirX).normalize(),
    };

    this.shadowDisc.material.opacity = 0.22;
  }

  _updateRoll(dt) {
    const rd = this.rollData;
    rd.elapsed += dt;
    const t = Math.min(rd.elapsed / rd.duration, 1);

    // Quadratic ease-out: fast start, smooth stop
    const progress = 1 - Math.pow(1 - t, 2);

    const cx = rd.startX + rd.dirX * rd.distance * progress;
    const cz = rd.startZ + rd.dirZ * rd.distance * progress;

    this.mesh.position.set(cx, 0.22, cz);
    this.shadowDisc.position.set(cx, 0.011, cz);

    // Linear speed = derivative of position with respect to time
    // For ease-out quadratic: progress' = 2*(1-t)/duration
    // linearSpeed = distance * 2*(1-t) / duration
    const linearSpeed = (rd.distance * 2 * (1 - t)) / rd.duration;
    // Angular velocity from rolling-without-slipping: ω = v / r
    const angularVel = linearSpeed / 0.22;
    this.mesh.rotateOnWorldAxis(rd.spinAxis, -dt * angularVel);

    if (rd.elapsed >= rd.duration) {
      this.isRolling = false;
      this.rollData  = null;
      this._land(cx, cz);
    }
  }

  _land(x, z) {
    this.position.set(x, 0.05, z);
    this.mesh.position.set(x, 0.22, z);
    this.shadowDisc.position.set(x, 0.011, z);
    this.shadowDisc.material.opacity = 0.22;
    if (this.onLanded) this.onLanded(this.position.clone());
  }

  teleport(pos) {
    this.position.set(pos.x, 0.05, pos.z);
    this.mesh.position.set(pos.x, 0.22, pos.z);
    this.shadowDisc.position.set(pos.x, 0.011, pos.z);
  }
}
