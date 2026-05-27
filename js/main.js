// Entry point — wires all systems together
(function () {
  'use strict';

  const S = { IDLE: 'idle', AIMING: 'aiming', FLYING: 'flying', DONE: 'done' };
  let state = S.IDLE;

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

    ball = new Ball(scene);
    ball.teleport(course.teePosition);

    controls   = new Controls(renderer.domElement);
    gameCamera = new GameCamera(camera, ball);
    hud        = new HUD();

    hud.updateStrokes(strokes);
    hud.updateDistance(course.distanceToHole(ball.position));
    hud.setClubActive(currentClubId);

    // Show initial aim line pointing toward hole (yaw = 0)
    ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);

    // ── Controls callbacks ─────────────────────────────────

    // Horizontal swipe → orbit camera around ball
    controls.onOrbit = (deltaYaw) => {
      if (state === S.FLYING || state === S.DONE) return;
      gameCamera.yaw += deltaYaw;
      // Update aim preview direction as camera rotates
      ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);
    };

    // Vertical drag → power charging
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

    // Release after vertical drag → shoot
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

    // ── Ball landed ────────────────────────────────────────
    ball.onLanded = (landPos) => {
      // Camera auto-rotates toward hole from new position
      gameCamera.ballLanded(landPos, course.holePosition);

      const dist = course.distanceToHole(landPos);
      hud.updateDistance(dist);

      if (dist <= course.holeRadius + 0.4) {
        state = S.DONE;
        setTimeout(() => {
          hud.showMessage('Hole Out! ' + strokes + ' — ' + _scoreLabel(strokes), 6000);
        }, 600);
        return;
      }

      if      (dist < 2)                   hud.showMessage('Tap-in!',       2000);
      else if (dist < 5)                   hud.showMessage('Gimme!',        2000);
      else if (dist < 12)                  hud.showMessage('Close!',        2000);
      else if (dist < course.greenRadius)  hud.showMessage('On the Green',  1600);

      setTimeout(() => {
        state = S.IDLE;
        controls.enable();
        // Show aim line in new direction once camera has settled
        ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);
      }, 600);
    };

    // ── Club buttons ───────────────────────────────────────
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

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    requestAnimationFrame(loop);
  }

  // ── Game loop ──────────────────────────────────────────────
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    ball.update(dt);
    gameCamera.update(dt);
    course.animateFlag();

    // Keep aim line in sync with camera yaw during idle/setup
    if (state === S.IDLE && gameCamera.mode === 'setup') {
      ball.setAim(gameCamera.yaw, 0, CLUBS[currentClubId]);
    }

    renderer.render(scene, camera);
  }

  // ── Helpers ────────────────────────────────────────────────
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
