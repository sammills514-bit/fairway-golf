// Builds all course geometry — tee, fairway, rough, green, pin, trees
class Course {
  constructor(scene) {
    this.scene = scene;

    this.teePosition   = new THREE.Vector3(0, 0.05, 0);
    this.holePosition  = new THREE.Vector3(0, 0, -290);
    this.holeRadius    = 0.38;   // visual cup radius
    this.greenRadius   = 20;
    this.fairwayHalfW  = 19;
    this.fairwayLength = 320;

    this._build();
  }

  _build() {
    this._sky();
    this._baseGround();
    this._rough();
    this._fairway();
    this._teeBox();
    this._green();
    this._pin();
    this._yardageMarkers();
    this._trees();
    this._lighting();
  }

  // ── Sky & fog ──────────────────────────────────────────────
  _sky() {
    this.scene.background = new THREE.Color(0x6ab4e8);
    this.scene.fog = new THREE.Fog(0x6ab4e8, 250, 700);
  }

  // ── Ground / rough substrate ──────────────────────────────
  _baseGround() {
    const geo = new THREE.PlaneGeometry(200, 500);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2d5a1b });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -0.02, -150);
    m.receiveShadow = true;
    this.scene.add(m);
  }

  _rough() {
    const geo = new THREE.PlaneGeometry(this.fairwayHalfW * 2 + 80, this.fairwayLength + 30);
    const mat = new THREE.MeshLambertMaterial({ color: 0x3d7a24 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -0.01, -(this.fairwayLength / 2) + 15);
    m.receiveShadow = true;
    this.scene.add(m);
  }

  // ── Fairway ────────────────────────────────────────────────
  _fairway() {
    const geo = new THREE.PlaneGeometry(this.fairwayHalfW * 2, this.fairwayLength);
    const mat = new THREE.MeshLambertMaterial({ color: 0x5aab38 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.002, -(this.fairwayLength / 2) + 15);
    m.receiveShadow = true;
    this.scene.add(m);
  }

  // ── Tee box ────────────────────────────────────────────────
  _teeBox() {
    const geo = new THREE.PlaneGeometry(9, 9);
    const mat = new THREE.MeshLambertMaterial({ color: 0x72d44e });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.008, 0);
    m.receiveShadow = true;
    this.scene.add(m);

    // Tee markers
    [-2, 2].forEach(x => {
      const tg = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8);
      const tm = new THREE.MeshLambertMaterial({ color: 0xff3a3a });
      const tee = new THREE.Mesh(tg, tm);
      tee.position.set(x, 0.09, 0.8);
      this.scene.add(tee);
    });
  }

  // ── Green ──────────────────────────────────────────────────
  _green() {
    const geo = new THREE.CircleGeometry(this.greenRadius, 48);
    const mat = new THREE.MeshLambertMaterial({ color: 0x42c855 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.008, this.holePosition.z);
    m.receiveShadow = true;
    this.scene.add(m);

    // Fringe ring
    const fringe = new THREE.RingGeometry(this.greenRadius, this.greenRadius + 3, 48);
    const fringeMat = new THREE.MeshLambertMaterial({ color: 0x50ba45, side: THREE.DoubleSide });
    const fm = new THREE.Mesh(fringe, fringeMat);
    fm.rotation.x = -Math.PI / 2;
    fm.position.set(0, 0.005, this.holePosition.z);
    this.scene.add(fm);

    // Hole cup
    const hg = new THREE.CircleGeometry(this.holeRadius, 20);
    const hm = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    const hole = new THREE.Mesh(hg, hm);
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(0, 0.012, this.holePosition.z);
    this.scene.add(hole);
  }

  // ── Pin & flag ─────────────────────────────────────────────
  _pin() {
    // Pole
    const pg = new THREE.CylinderGeometry(0.05, 0.05, 4, 8);
    const pm = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.flagPole = new THREE.Mesh(pg, pm);
    this.flagPole.position.set(0, 2, this.holePosition.z);
    this.scene.add(this.flagPole);

    // Flag cloth (animated)
    const fg = new THREE.PlaneGeometry(1.6, 0.9, 4, 1);
    const fm = new THREE.MeshLambertMaterial({ color: 0xff1e1e, side: THREE.DoubleSide });
    this.flag = new THREE.Mesh(fg, fm);
    this.flag.position.set(0.8, 3.55, this.holePosition.z);
    this.scene.add(this.flag);
  }

  // ── Yardage markers (150 / 100 yard posts) ─────────────────
  _yardageMarkers() {
    const markerData = [
      { z: -140, color: 0x4488ff, label: '150' },
      { z: -190, color: 0xffcc00, label: '100' },
    ];
    markerData.forEach(({ z, color }) => {
      [-this.fairwayHalfW - 1, this.fairwayHalfW + 1].forEach(x => {
        const g = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8);
        const m = new THREE.MeshLambertMaterial({ color });
        const post = new THREE.Mesh(g, m);
        post.position.set(x, 0.7, z);
        this.scene.add(post);
      });
    });
  }

  // ── Trees along rough ──────────────────────────────────────
  _trees() {
    const cols = [-31, -27, 30, 28];
    const rows = [-30, -70, -110, -150, -190, -230, -265];
    cols.forEach((x, ci) => {
      rows.forEach((z, ri) => {
        const jx = (Math.sin(ci * 7 + ri * 13) * 3);
        const jz = (Math.cos(ci * 5 + ri * 11) * 4);
        this._addTree(x + jx, z + jz);
      });
    });
  }

  _addTree(x, z) {
    const scale = 0.8 + Math.abs(Math.sin(x + z)) * 0.5;

    const trunkG = new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 2.2 * scale, 7);
    const trunkM = new THREE.MeshLambertMaterial({ color: 0x5c3317 });
    const trunk = new THREE.Mesh(trunkG, trunkM);
    trunk.position.set(x, 1.1 * scale, z);
    this.scene.add(trunk);

    const topG = new THREE.ConeGeometry(2.8 * scale, 5.5 * scale, 7);
    const topM = new THREE.MeshLambertMaterial({ color: 0x276127 });
    const top = new THREE.Mesh(topG, topM);
    top.position.set(x, 5.5 * scale, z);
    this.scene.add(top);
  }

  // ── Lighting ───────────────────────────────────────────────
  _lighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff8e0, 1.1);
    sun.position.set(40, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 600;
    sun.shadow.camera.left   = -120;
    sun.shadow.camera.right  =  120;
    sun.shadow.camera.top    =  120;
    sun.shadow.camera.bottom = -120;
    this.scene.add(sun);

    // Soft fill from opposite side
    const fill = new THREE.DirectionalLight(0xc8e8ff, 0.3);
    fill.position.set(-20, 30, -10);
    this.scene.add(fill);
  }

  // ── Per-frame updates ──────────────────────────────────────
  animateFlag() {
    if (!this.flag) return;
    const t = Date.now() * 0.0018;
    const verts = this.flag.geometry.attributes.position;
    // Wave the right edge (x > 0 vertices)
    for (let i = 0; i < verts.count; i++) {
      const x = verts.getX(i);
      if (x > 0) {
        const origY = (i < 3) ? 0.45 : -0.45; // top / bottom row
        verts.setY(i, origY + Math.sin(t + x * 1.5) * 0.08 * x);
      }
    }
    verts.needsUpdate = true;
  }

  distanceToHole(pos) {
    const dx = pos.x - this.holePosition.x;
    const dz = pos.z - this.holePosition.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
