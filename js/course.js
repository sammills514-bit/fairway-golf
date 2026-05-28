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
    this._clouds();
    this._lighting();
  }

  // ── Sky & fog ──────────────────────────────────────────────
  _sky() {
    const canvas = document.createElement('canvas');
    canvas.width = 2; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0,    '#1a6ec8');
    grad.addColorStop(0.4,  '#52b8f8');
    grad.addColorStop(1,    '#c8e8f8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 256);
    this.scene.background = new THREE.CanvasTexture(canvas);
    this.scene.fog = new THREE.FogExp2(0xc8e8f8, 0.004);
  }

  // ── Ground / rough substrate ──────────────────────────────
  _baseGround() {
    const geo = new THREE.PlaneGeometry(200, 500);
    const mat = new THREE.MeshLambertMaterial({ color: 0x285018 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -0.02, -150);
    m.receiveShadow = true;
    this.scene.add(m);
  }

  _rough() {
    const geo = new THREE.PlaneGeometry(this.fairwayHalfW * 2 + 80, this.fairwayLength + 30);
    const mat = new THREE.MeshLambertMaterial({ color: 0x3a7018 });
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
    ctx.fillStyle = '#56ae32'; ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = '#489226'; ctx.fillRect(0, 1, 1, 1);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, this.fairwayLength / 12);

    const geo = new THREE.PlaneGeometry(this.fairwayHalfW * 2, this.fairwayLength);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.86, metalness: 0 });
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
    const mat = new THREE.MeshStandardMaterial({ color: 0x3dc850, roughness: 0.80 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.008, this.holePosition.z);
    m.receiveShadow = true;
    this.scene.add(m);

    const fringe = new THREE.RingGeometry(this.greenRadius, this.greenRadius + 3, 48);
    const fringeMat = new THREE.MeshStandardMaterial({ color: 0x4aba46, roughness: 0.88, side: THREE.DoubleSide });
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

  // ── Yardage markers ────────────────────────────────────────
  _yardageMarkers() {
    [{ z: -140, color: 0x4488ff }, { z: -190, color: 0xffcc00 }].forEach(({ z, color }) => {
      [-this.fairwayHalfW - 1, this.fairwayHalfW + 1].forEach(x => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8),
          new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
        );
        post.position.set(x, 0.7, z);
        this.scene.add(post);
      });
    });
  }

  // ── Trees — dense corridor of deciduous canopies ───────────
  _trees() {
    const leftCols  = [-38, -32, -26];
    const rightCols = [ 26,  32,  38];
    const rows = [-15, -52, -90, -128, -165, -200, -235, -265, -288];

    [...leftCols, ...rightCols].forEach((x, ci) => {
      rows.forEach((z, ri) => {
        const jx = Math.sin(ci * 7 + ri * 13) * 2.5;
        const jz = Math.cos(ci * 5 + ri * 11) * 3.5;
        this._addTree(x + jx, z + jz);
      });
    });
  }

  _addTree(x, z) {
    const scale = 0.85 + Math.abs(Math.sin(x * 0.7 + z * 0.4)) * 0.6;
    const palette = [0x58c235, 0x4db82a, 0x62cc3a, 0x46a828, 0x52c030, 0x3ea020];
    const col = palette[Math.abs(Math.floor(x * 2.3 + z * 0.7)) % palette.length];

    // Trunk
    const trunkH = 3.8 * scale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * scale, 0.38 * scale, trunkH, 6),
      new THREE.MeshLambertMaterial({ color: 0x5c3d1e })
    );
    trunk.position.set(x, trunkH * 0.5, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    // Clustered sphere canopy — 4 overlapping blobs for leafy silhouette
    const baseY = trunkH + 2.6 * scale;
    const clusters = [
      { ox: 0,             oy: 0,             oz: 0,             r: 4.0 * scale },
      { ox: -2.0 * scale,  oy: -0.9 * scale,  oz:  0.7 * scale,  r: 3.2 * scale },
      { ox:  1.8 * scale,  oy: -0.7 * scale,  oz: -0.6 * scale,  r: 2.9 * scale },
      { ox:  0.3 * scale,  oy:  2.0 * scale,  oz:  0.2 * scale,  r: 2.4 * scale },
    ];
    clusters.forEach(({ ox, oy, oz, r }) => {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(r, 8, 6),
        new THREE.MeshLambertMaterial({ color: col })
      );
      s.position.set(x + ox, baseY + oy, z + oz);
      this.scene.add(s);
    });
  }

  // ── Clouds ─────────────────────────────────────────────────
  _clouds() {
    // Build a soft puff cloud on canvas
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    const puff = (cx, cy, r) => {
      const g = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
      g.addColorStop(0,   'rgba(255,255,255,0.95)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.80)');
      g.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    };
    puff( 85,  72, 55);
    puff(138,  55, 68);
    puff(188,  68, 52);
    puff(115,  90, 44);
    puff(160,  88, 40);
    puff( 55,  82, 38);
    const tex = new THREE.CanvasTexture(c);

    const cloudData = [
      //   x     y     z     w    h
      [ -80,  135, -280,  210,  75],
      [ 120,  150, -420,  250,  88],
      [-200,  125, -360,  185,  65],
      [  55,  115, -520,  230,  80],
      [ 310,  140, -310,  200,  70],
      [-110,  145, -620,  170,  60],
      [ 190,  130, -190,  175,  62],
      [-240,  120, -500,  195,  68],
    ];
    cloudData.forEach(([cx, cy, cz, w, h]) => {
      const mat = new THREE.SpriteMaterial({
        map: tex, fog: false, transparent: true,
        opacity: 0.88, depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(w, h, 1);
      sprite.position.set(cx, cy, cz);
      this.scene.add(sprite);
    });
  }

  // ── Lighting ───────────────────────────────────────────────
  _lighting() {
    const hemi = new THREE.HemisphereLight(0x90cef0, 0x2a5218, 0.70);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4d0, 1.15);
    sun.position.set(40, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near   = 1;
    sun.shadow.camera.far    = 600;
    sun.shadow.camera.left   = -130;
    sun.shadow.camera.right  =  130;
    sun.shadow.camera.top    =  130;
    sun.shadow.camera.bottom = -130;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xb0d0ff, 0.20);
    fill.position.set(-20, 30, -10);
    this.scene.add(fill);

    // Sun disc in sky
    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(10, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0xfffde0, fog: false })
    );
    sunDisc.position.set(80, 90, -250);
    this.scene.add(sunDisc);

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
