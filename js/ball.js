// Ball mesh, physics simulation, aim visualisation
class Ball {
  constructor(scene) {
    this.scene = scene;
    this.position = new THREE.Vector3(0, 0.05, 0);
    this.inFlight  = false;
    this.flightData = null;

    this.onLanded = null; // callback(landPos)

    this._buildBall();
    this._buildShadow();
    this._buildAimLine();
    this._buildLandingRing();
  }

  // ── Geometry ───────────────────────────────────────────────
  _buildBall() {
    const geo = new THREE.SphereGeometry(0.22, 20, 14);
    const mat = new THREE.MeshLambertMaterial({ color: 0xfafafa });
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
    // 2-point line updated each frame during aiming
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
    // Shows predicted landing zone while aiming
    const geo = new THREE.RingGeometry(0.6, 1.1, 20);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.landingRing = new THREE.Mesh(geo, mat);
    this.landingRing.rotation.x = -Math.PI / 2;
    this.landingRing.visible = false;
    this.scene.add(this.landingRing);
  }

  // ── Aim visualisation ──────────────────────────────────────
  setAim(aimAngle, power, club) {
    this.aimLine.visible   = true;
    this.landingRing.visible = true;

    const lineLen = 3 + power * 14;
    const sin = Math.sin(aimAngle);
    const cos = Math.cos(aimAngle);

    const sx = this.position.x;
    const sy = this.position.y + 0.25;
    const sz = this.position.z;
    const ex = sx + sin * lineLen;
    const ey = sy;
    const ez = sz - cos * lineLen;

    const pos = this.aimLine.geometry.attributes.position;
    pos.array[0] = sx; pos.array[1] = sy; pos.array[2] = sz;
    pos.array[3] = ex; pos.array[4] = ey; pos.array[5] = ez;
    pos.needsUpdate = true;

    // Landing ring at predicted spot (no spread applied here, just for guidance)
    const dist = power * club.maxDistance;
    this.landingRing.position.set(
      this.position.x + sin * dist,
      0.013,
      this.position.z - cos * dist,
    );
  }

  hideAim() {
    this.aimLine.visible    = false;
    this.landingRing.visible = false;
  }

  // ── Fire a shot ────────────────────────────────────────────
  shoot(aimAngle, power, club) {
    if (this.inFlight) return;

    const G       = 9.8;
    const theta   = club.launchAngle * Math.PI / 180;
    const dist    = power * club.maxDistance;

    // Random lateral spread (less accurate at low power)
    const spread    = (Math.random() - 0.5) * 2 * club.spread * dist;
    const spreadAng = aimAngle + Math.atan2(spread, dist);

    // v0 from range formula: R = v0² · sin(2θ) / g
    const sin2theta = Math.sin(2 * theta);
    const v0 = Math.sqrt((dist * G) / Math.max(sin2theta, 0.001));

    const vH = v0 * Math.cos(theta);
    const vy = v0 * Math.sin(theta);

    this.flightData = {
      startPos:  this.position.clone(),
      vx:        Math.sin(spreadAng) * vH,
      vy,
      vz:       -Math.cos(spreadAng) * vH,
      g:         G,
      totalTime: (2 * vy) / G,
      maxHeight: (vy * vy) / (2 * G),
      elapsed:   0,
    };

    this.inFlight = true;
    this.hideAim();
  }

  // ── Per-frame update ───────────────────────────────────────
  update(dt) {
    if (!this.inFlight) {
      // Keep shadow under ball while idle
      this.shadowDisc.position.x = this.position.x;
      this.shadowDisc.position.z = this.position.z;
      return;
    }

    const fd = this.flightData;
    fd.elapsed = Math.min(fd.elapsed + dt, fd.totalTime);
    const t = fd.elapsed;

    const x = fd.startPos.x + fd.vx * t;
    const y = fd.startPos.y + fd.vy * t - 0.5 * fd.g * t * t;
    const z = fd.startPos.z + fd.vz * t;

    if (fd.elapsed >= fd.totalTime) {
      // Land
      this.position.set(x, 0.05, z);
      this.mesh.position.set(x, 0.22, z);
      this.shadowDisc.position.set(x, 0.011, z);
      this.shadowDisc.material.opacity = 0.22;
      this.inFlight = false;
      this.flightData = null;
      if (this.onLanded) this.onLanded(this.position.clone());
    } else {
      this.mesh.position.set(x, Math.max(y, 0.22), z);
      this.shadowDisc.position.set(x, 0.011, z);

      // Fade shadow as ball rises
      const heightRatio = Math.max(0, y) / Math.max(fd.maxHeight, 0.1);
      this.shadowDisc.material.opacity = 0.22 * (1 - heightRatio * 0.65);

      // Spin ball during flight
      this.mesh.rotation.x -= dt * 9;
    }
  }

  teleport(pos) {
    this.position.set(pos.x, 0.05, pos.z);
    this.mesh.position.set(pos.x, 0.22, pos.z);
    this.shadowDisc.position.set(pos.x, 0.011, pos.z);
  }
}
