// Entry point — wires all systems together
(function () {
  'use strict';

  const S = { IDLE: 'idle', AIMING: 'aiming', FLYING: 'flying', DONE: 'done' };
  let state = S.IDLE;

  // Out-of-bounds boundaries (matches course geometry)
  const OOB = { minX: -46, maxX: 46, minZ: -315, maxZ: 18 };

  let renderer, scene, camera;
  let course, ball, controls, gameCamera, hud;
  let currentClubId = 'driver';
  let strokes   = 0;
  let lastTime  = 0;

  // ── Init ───────────────────────────────────────────────────
  function init() {
    renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('game-canvas'),
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1200);

    course = new Course(scene);
    ball   = new Ball(scene);
    ball.teleport(course.teePosition);

    controls   = new Controls(renderer.domElement);
    gameCamera = new GameCamera(camera, ball);
    hud        = new HUD();

    _refreshHUD();
    _wireBallCallbacks();
    _wireClubButtons();

    ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);

    // Controls callbacks
    controls.onOrbit = (deltaYaw) => {
      if (state === S.FLYING || state === S.DONE) return;
      gameCamera.yaw += deltaYaw;
      ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);
    };

    controls.onUpdate = (aimOffset, power, dragging) => {
      if (state === S.FLYING || state === S.DONE) return;
      if (dragging) {
        state = S.AIMING;
        ball.setAim(gameCamera.yaw + aimOffset, power, CLUBS[currentClubId]);
        hud.setPower(power);
      } else {
        ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);
        hud.setPower(0);
        if (state === S.AIMING) state = S.IDLE;
      }
    };

    controls.onSwing = (aimOffset, power) => {
      if (state === S.FLYING || state === S.DONE) return;
      const finalAngle = gameCamera.yaw + aimOffset;
      strokes++;
      hud.updateStrokes(strokes);
      state = S.FLYING;
      controls.disable();
      ball.hideAim();
      hud.setPower(0);
      ball.shoot(finalAngle, power, CLUBS[currentClubId]);
      gameCamera.startFlight(gameCamera.yaw);
      hud.showMessage(Math.round(power * 100) + '% Power', 1000);
    };

    // Play-again button
    document.getElementById('play-again-btn').addEventListener('click', _resetGame);
    document.getElementById('play-again-btn').addEventListener('touchstart', e => {
      e.stopPropagation();
      _resetGame();
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    requestAnimationFrame(loop);
  }

  // ── Ball callbacks (also called on reset) ─────────────────
  function _wireBallCallbacks() {
    ball.onLanded = (landPos) => {
      const oob = _isOOB(landPos);

      if (oob) {
        // Penalty stroke + drop at nearest safe point
        strokes++;
        hud.updateStrokes(strokes);
        hud.showMessage('Out of Bounds! +1 Penalty', 2500);

        const drop = _dropZone(landPos);
        ball.teleport(drop);
        gameCamera.ballLanded(drop, course.holePosition);
        hud.updateDistance(course.distanceToHole(drop));

        setTimeout(() => {
          state = S.IDLE;
          controls.enable();
          ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);
        }, 900);
        return;
      }

      gameCamera.ballLanded(landPos, course.holePosition);
      const dist = course.distanceToHole(landPos);
      hud.updateDistance(dist);

      // Hole-out
      if (dist <= course.holeRadius + 0.4) {
        state = S.DONE;
        setTimeout(() => {
          hud.showMessage('Hole Out! ' + strokes + ' strokes — ' + _scoreLabel(strokes), 5000);
          document.getElementById('play-again-btn').style.display = 'block';
        }, 700);
        return;
      }

      // Proximity feedback
      if      (dist < 2)                  hud.showMessage('Tap-in!',      2000);
      else if (dist < 5)                  hud.showMessage('Gimme!',       2000);
      else if (dist < 12)                 hud.showMessage('Close!',       2000);
      else if (dist < course.greenRadius) hud.showMessage('On the Green', 1600);

      setTimeout(() => {
        state = S.IDLE;
        controls.enable();
        ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);
      }, 500);
    };
  }

  // ── Club buttons ───────────────────────────────────────────
  function _wireClubButtons() {
    document.querySelectorAll('.club-btn').forEach(btn => {
      ['click', 'touchstart'].forEach(evt => {
        btn.addEventListener(evt, e => {
          if (evt === 'touchstart') e.stopPropagation();
          if (state === S.FLYING) return;
          currentClubId = btn.dataset.club;
          hud.updateClub(CLUBS[currentClubId].name);
          hud.setClubActive(currentClubId);
          if (state !== S.FLYING) {
            ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);
          }
        });
      });
    });
  }

  // ── Reset game ─────────────────────────────────────────────
  function _resetGame() {
    document.getElementById('play-again-btn').style.display = 'none';
    strokes = 0;
    currentClubId = 'driver';
    state = S.IDLE;

    ball.inFlight  = false;
    ball.isRolling = false;
    ball.flightData = null;
    ball.rollData   = null;
    ball.teleport(course.teePosition);

    gameCamera.yaw  = 0;
    gameCamera.mode = 'setup';

    controls.enable();
    _refreshHUD();
    _wireBallCallbacks(); // re-register since closures capture strokes
    ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);
  }

  // ── Game loop ──────────────────────────────────────────────
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    ball.update(dt);
    gameCamera.update(dt);
    course.animateFlag();

    if (state === S.IDLE && gameCamera.mode === 'setup') {
      ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);
    }

    renderer.render(scene, camera);
  }

  // ── Helpers ────────────────────────────────────────────────
  function _isOOB(pos) {
    return pos.x < OOB.minX || pos.x > OOB.maxX
        || pos.z < OOB.minZ || pos.z > OOB.maxZ;
  }

  function _dropZone(pos) {
    // Clamp to fairway, keep z unchanged (unless also out past green / behind tee)
    return new THREE.Vector3(
      Math.max(-17, Math.min(17, pos.x)),
      0.05,
      Math.max(-285, Math.min(-5, pos.z)),
    );
  }

  function _refreshHUD() {
    hud.updateStrokes(strokes);
    hud.updateDistance(course.distanceToHole(ball.position));
    hud.setClubActive(currentClubId);
    hud.updateClub(CLUBS[currentClubId].name);
    hud.setPower(0);
  }

  function _scoreLabel(n) {
    const d = n - 4;
    if (d <= -3) return 'Albatross!';
    if (d === -2) return 'Eagle!';
    if (d === -1) return 'Birdie!';
    if (d ===  0) return 'Par';
    if (d ===  1) return 'Bogey';
    if (d ===  2) return 'Double Bogey';
    return '+' + d;
  }

  window.addEventListener('load', init);
}());
