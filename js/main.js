// Entry point — wires all systems together
(function () {
  'use strict';

  // ── Game state ─────────────────────────────────────────────
  const S = { IDLE: 'idle', AIMING: 'aiming', FLYING: 'flying', DONE: 'done' };
  let state = S.IDLE;

  let renderer, scene, camera;
  let course, ball, controls, gameCamera, hud;
  let currentClubId = 'driver';
  let strokes = 0;
  let lastTime = 0;

  // ── Initialise ─────────────────────────────────────────────
  function init() {
    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('game-canvas'),
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene & camera
    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1200);

    // Build course (also adds lights)
    course = new Course(scene);

    // Ball — start at tee
    ball = new Ball(scene);
    ball.teleport(course.teePosition);

    // Controls listen on the canvas
    controls   = new Controls(renderer.domElement);
    gameCamera = new GameCamera(camera, ball);
    hud        = new HUD();

    // Initial HUD values
    hud.updateStrokes(strokes);
    hud.updateDistance(course.distanceToHole(ball.position));
    hud.setClubActive(currentClubId);

    // ── Controls callbacks ─────────────────────────────────
    controls.onUpdate = (aimAngle, power, dragging) => {
      if (state === S.FLYING || state === S.DONE) return;
      if (dragging) {
        state = S.AIMING;
        ball.setAim(aimAngle, power, CLUBS[currentClubId]);
        hud.setPower(power);
      } else {
        ball.hideAim();
        hud.setPower(0);
        if (state === S.AIMING) state = S.IDLE;
      }
    };

    controls.onSwing = (aimAngle, power) => {
      if (state === S.FLYING || state === S.DONE) return;
      strokes++;
      hud.updateStrokes(strokes);
      state = S.FLYING;
      controls.disable();

      ball.shoot(aimAngle, power, CLUBS[currentClubId]);
      gameCamera.startFlight();

      const pct = Math.round(power * 100);
      hud.showMessage(pct + '% Power', 1000);
    };

    // ── Ball landed callback ───────────────────────────────
    ball.onLanded = (landPos) => {
      gameCamera.ballLanded();

      const dist = course.distanceToHole(landPos);
      hud.updateDistance(dist);

      // Check hole-out
      if (dist <= course.holeRadius + 0.4) {
        state = S.DONE;
        setTimeout(() => {
          const scoreText = _scoreLabel(strokes);
          hud.showMessage('Hole Out! ' + strokes + ' Strokes — ' + scoreText, 6000);
        }, 600);
        return;
      }

      // Proximity messages
      if (dist < 2)       hud.showMessage('Tap-in!',       2000);
      else if (dist < 5)  hud.showMessage('Gimme!',        2000);
      else if (dist < 12) hud.showMessage('Close!',        2000);
      else if (dist < course.greenRadius) hud.showMessage('On the Green', 1600);

      // Re-enable after a short pause so camera can settle
      setTimeout(() => {
        state = S.IDLE;
        controls.enable();
      }, 400);
    };

    // ── Club selector buttons ──────────────────────────────
    document.querySelectorAll('.club-btn').forEach(btn => {
      // Both click (desktop) and touchstart (mobile)
      ['click', 'touchstart'].forEach(evt => {
        btn.addEventListener(evt, e => {
          if (evt === 'touchstart') e.stopPropagation();
          if (state === S.FLYING) return;
          currentClubId = btn.dataset.club;
          hud.updateClub(CLUBS[currentClubId].name);
          hud.setClubActive(currentClubId);
        });
      });
    });

    // ── Resize ─────────────────────────────────────────────
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

    renderer.render(scene, camera);
  }

  // ── Helpers ────────────────────────────────────────────────
  function _scoreLabel(n) {
    const par = 4;
    const d = n - par;
    if (d <= -3) return 'Albatross!';
    if (d === -2) return 'Eagle!';
    if (d === -1) return 'Birdie!';
    if (d ===  0) return 'Par';
    if (d ===  1) return 'Bogey';
    if (d ===  2) return 'Double Bogey';
    return '+' + d;
  }

  // ── Boot ───────────────────────────────────────────────────
  window.addEventListener('load', init);
}());
