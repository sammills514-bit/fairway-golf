// Builds all course geometry — tee, fairway, rough, green, pin, trees
class Course {
  constructor(scene) {
    this.scene = scene;

    this.teePosition   = new THREE.Vector3(0, 0.05, 0);
    this.holePosition  = new THREE.Vector3(0, 0, -290);
    this.holeRadius    = 0.38;
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
    const canvas = document.createElement('canvas');
    canvas.width = 2; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0,    '#1565c0');
    grad.addColorStop(0.45, '#42a5f5');
    grad.addColorStop(1,    '#b3d4e8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 256);
    this.scene.background = new THREE.CanvasTexture(canvas);
    this.scene.fog = new THREE.FogExp2(0xb3d4e8, 0.0045);
  }

  // ── Ground / rough substrate ──────────────────────────────
  _baseGround() {
    const geo = new THREE.PlaneGeometry(200, 500);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2a5218 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -0.02, -150);
    m.receiveShadow = true;
    this.scene.add(m);
  }

  _rough() {
    const geo = new THREE.PlaneGeometry(this.fairwayHalfW * 2 + 80, this.fairwayLength + 30);
    const mat = new THREE.MeshLambertMaterial({ color: 0x3a7020 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -0.01, -(this.fairwayLength / 2) + 15);
    m.receiveShadow = true;
    this.scene.add(m);
  }

  // ── Fairway with mowing stripes ────────────────────────────
  _fairway() {
    const c = document.createElement('canvas');
    c.width = 1; c.height = 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#52a030'; ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = '#478a28'; ctx.fillRect(0, 1, 1, 1);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.wrapT = THREE.RepeatWrapping;
    const stripeW = 6;
    tex.repeat.set(1, this.fairwayLength / (stripeW * 2));

    const geo = new THREE.PlaneGeometry(this.fairwayHalfW * 2, this.fairwayLength);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, metalness: 0 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.002, -(this.fairwayLength / 2) + 15);
    m.receiveShadow = true;
    this.scene.add(m);
  }

  // ── Tee box ────────────────────────────────────────────────
  _teeBox() {
    const geo = new THREE.PlaneGeometry(9, 9);
    const mat = new THREE.MeshStandardMaterial({ color: 0x72d44e, roughness: 0.82 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.008, 0);
    m.receiveShadow = true;
    this.scene.add(m);

    [-2, 2].forEach(x => {
      const tg = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8);
      const tm = new THREE.MeshStandardMaterial({ color: 0xff3a3a, roughness: 0.65 });
      const tee = new THREE.Mesh(tg, tm);
      tee.position.set(x, 0.09, 0.8);
      this.scene.add(tee);
    });
  }

  // ── Green ──────────────────────────────────────────────────
  _green() {
    const geo = new THREE.CircleGeometry(this.greenRadius, 48);
    const mat = new THREE.MeshStandardMaterial({ color: 0x38c050, roughness: 0.82 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.008, this.holePosition.z);
    m.receiveShadow = true;
    this.scene.add(m);

    const fringe = new THREE.RingGeometry(this.greenRadius, this.greenRadius + 3, 48);
    const fringeMat = new THREE.MeshStandardMaterial({ color: 0x4ab845, roughness: 0.88, side: THREE.DoubleSide });
    const fm = new THREE.Mesh(fringe, fringeMat);
    fm.rotation.x = -Math.PI / 2;
    fm.position.set(0, 0.005, this.holePosition.z);
    this.scene.add(fm);

    const hg = new THREE.CircleGeometry(this.holeRadius, 20);
    const hm = new THREE.MeshBasicMaterial({ color: 0x060606 });
    const hole = new THREE.Mesh(hg, hm);
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(0, 0.012, this.holePosition.z);
    this.scene.add(hole);
  }

  // ── Pin & flag ─────────────────────────────────────────────
  _pin() {
    const pg = new THREE.CylinderGeometry(0.05, 0.05, 4, 8);
    const pm = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.3, metalness: 0.5 });
    this.flagPole = new THREE.Mesh(pg, pm);
    this.flagPole.position.set(0, 2, this.holePosition.z);
    this.flagPole.castShadow = true;
    this.scene.add(this.flagPole);

    const fg = new THREE.PlaneGeometry(1.6, 0.9, 4, 1);
    const fm = new THREE.MeshStandardMaterial({ color: 0xff1e1e, roughness: 0.7, side: THREE.DoubleSide });
    this.flag = new THREE.Mesh(fg, fm);
    this.flag.position.set(0.8, 3.55, this.holePosition.z);
    this.scene.add(this.flag);
  }

  // ── Yardage markers (150 / 100 yard posts) ─────────────────
  _yardageMarkers() {
    const markerData = [
      { z: -140, color: 0x4488ff },
      { z: -190, color: 0xffcc00 },
    ];
    markerData.forEach(({ z, color }) => {
      [-this.fairwayHalfW - 1, this.fairwayHalfW + 1].forEach(x => {
        const g = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8);
        const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
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
        const jx = Math.sin(ci * 7 + ri * 13) * 3;
        const jz = Math.cos(ci * 5 + ri * 11) * 4;
        this._addTree(x + jx, z + jz);
      });
    });
  }

  _addTree(x, z) {
    const scale = 0.8 + Math.abs(Math.sin(x + z)) * 0.5;
    const greens = [0x246024, 0x2a6a2a, 0x1e5018, 0x2e622e];
    const col = greens[Math.abs(Math.floor(x * 3 + z)) % 4];

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 2.4 * scale, 6),
      new THREE.MeshLambertMaterial({ color: 0x4a2910 })
    );
    trunk.position.set(x, 1.2 * scale, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    // Lower canopy
    const lower = new THREE.Mesh(
      new THREE.ConeGeometry(3.0 * scale, 4.5 * scale, 7),
      new THREE.MeshLambertMaterial({ color: col })
    );
    lower.position.set(x, 4.5 * scale, z);
    lower.castShadow = true;
    this.scene.add(lower);

    // Upper spire
    const upper = new THREE.Mesh(
      new THREE.ConeGeometry(1.7 * scale, 3.2 * scale, 6),
      new THREE.MeshLambertMaterial({ color: col })
    );
    upper.position.set(x, 7.2 * scale, z);
    upper.castShadow = true;
    this.scene.add(upper);
  }

  // ── Lighting ───────────────────────────────────────────────
  _lighting() {
    // Hemisphere: warm sky-blue from above, muted green from below
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2a5218, 0.65);
    this.scene.add(hemi);

    // Main sun — warm, strong
    const sun = new THREE.DirectionalLight(0xfff4d0, 1.0);
    sun.position.set(40, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near   = 1;
    sun.shadow.camera.far    = 600;
    sun.shadow.camera.left   = -120;
    sun.shadow.camera.right  =  120;
    sun.shadow.camera.top    =  120;
    sun.shadow.camera.bottom = -120;
    this.scene.add(sun);

    // Cool fill from opposite side
    const fill = new THREE.DirectionalLight(0xb0d0ff, 0.22);
    fill.position.set(-20, 30, -10);
    this.scene.add(fill);

    // Sun disc — always clear, no fog
    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(10, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0xfffde0, fog: false })
    );
    sunDisc.position.set(80, 90, -250);
    this.scene.add(sunDisc);

    // Soft glow halo
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(18, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0xfffde0, transparent: true, opacity: 0.10, fog: false })
    );
    halo.position.copy(sunDisc.position);
    this.scene.add(halo);
  }

  // ── Per-frame updates ──────────────────────────────────────
  animateFlag() {
    if (!this.flag) return;
    const t = Date.now() * 0.0018;
    const verts = this.flag.geometry.attributes.position;
    for (let i = 0; i < verts.count; i++) {
      const x = verts.getX(i);
      if (x > 0) {
        const origY = (i < 3) ? 0.45 : -0.45;
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
