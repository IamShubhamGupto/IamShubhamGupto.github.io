/**
 * Per-page 3D background animations (al-folio).
 * All pages currently use the same animation (hand_pose).
 * camera_6dof is implemented for future use.
 */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  var canvasEl = document.getElementById('bg-canvas');
  if (!canvasEl) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // All pages use the same animation for simplicity.
  // Change this key to switch the site-wide animation.
  // var SITE_ANIMATION = 'camera_6dof';
  var SITE_ANIMATION = '';

  function getAnimationKey() {
    return SITE_ANIMATION;
  }

  function getThemeColor() {
    var theme = getComputedStyle(document.documentElement).getPropertyValue('--global-theme-color').trim();
    return theme || '#6f42c1';
  }

  function isDarkMode() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark')  return true;
    if (t === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255
    };
  }

  var scene, camera, renderer, animationId;
  var objects = [];

  function clearScene() {
    objects.forEach(function (obj) { if (obj && scene) scene.remove(obj); });
    objects = [];
  }

  function initThree() {
    scene = new THREE.Scene();
    var w = canvasEl.offsetWidth || window.innerWidth;
    var h = canvasEl.offsetHeight || window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    canvasEl.appendChild(renderer.domElement);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function onResize() {
    var w = canvasEl.offsetWidth || window.innerWidth;
    var h = canvasEl.offsetHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden' && animationId) {
      cancelAnimationFrame(animationId); animationId = null;
    } else if (document.visibilityState === 'visible' && !animationId && renderer) {
      animate();
    }
  }

  // ---- hand_pose: stylized hand with palm + fingers ----
  function initHandPose() {
    var c = getThemeColor();
    var rgb = hexToRgb(c);
    var color = new THREE.Color(rgb.r, rgb.g, rgb.b);
    var mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.55 });
    var palm = [
      new THREE.Vector3(-0.3, 0.1, 0), new THREE.Vector3(0.3, 0.1, 0),
      new THREE.Vector3(0.25, -0.2, 0), new THREE.Vector3(-0.25, -0.2, 0),
      new THREE.Vector3(-0.3, 0.1, 0)
    ];
    var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(palm), mat);
    scene.add(line); objects.push(line);
    for (var i = 0; i < 4; i++) {
      var x = -0.2 + i * 0.13;
      var fl = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, -0.2, 0), new THREE.Vector3(x + 0.02, -0.45, 0)
        ]), mat);
      scene.add(fl); objects.push(fl);
    }
    return function update(t) {
      var s = 0.3 + 0.05 * Math.sin(t * 0.0008);
      objects.forEach(function (o) { o.scale.set(s, s, s); });
    };
  }

  // ---- mag_cal: uncalibrated ellipsoid + calibrated unit sphere ----
  function initMagCal() {
    var c = getThemeColor();
    var rgb = hexToRgb(c);
    var color = new THREE.Color(rgb.r, rgb.g, rgb.b);
    var wireMat = new THREE.MeshBasicMaterial({ color: color, wireframe: true, transparent: true, opacity: 0.55 });
    var ellipsoid = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), wireMat);
    ellipsoid.scale.set(1.4, 0.7, 0.9);
    ellipsoid.position.set(-0.8, 0, 0);
    scene.add(ellipsoid); objects.push(ellipsoid);
    var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), wireMat.clone());
    sphere.position.set(0.8, 0, 0);
    scene.add(sphere); objects.push(sphere);
    return function update(t) {
      ellipsoid.rotation.y = t * 0.0003;
      sphere.rotation.y = t * 0.0004;
    };
  }

  // ---- fft_waves: animated sine wave ----
  function initFftWaves() {
    var c = getThemeColor();
    var rgb = hexToRgb(c);
    var color = new THREE.Color(rgb.r, rgb.g, rgb.b);
    var mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
    var n = 40;
    var points = [];
    for (var i = 0; i <= n; i++) points.push(new THREE.Vector3((i / n) * 4 - 2, 0, 0));
    var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat);
    scene.add(line); objects.push(line);
    return function update(t) {
      var pos = line.geometry.attributes.position;
      for (var i = 0; i <= n; i++) {
        var x = (i / n) * 4 - 2;
        pos.array[i * 3 + 1] = 0.3 * Math.sin(x * 1.5 + t * 0.002) + 0.2 * Math.sin(x * 2 + t * 0.0015);
      }
      pos.needsUpdate = true;
    };
  }

  // ---- camera_6dof: true 6-DOF stereo rig driven by Perlin noise ----
  function initCamera6dof() {
    // Resolve all three material colors from the current theme at any point in time
    function resolveColors() {
      var d   = isDarkMode();
      var rgb = hexToRgb(getThemeColor());
      return {
        theme: new THREE.Color(rgb.r, rgb.g, rgb.b),
        trail: new THREE.Color('#2e7d32'),                  // forest green (both modes)
        feat:  new THREE.Color(d ? '#7c3aed' : '#d0a7ff')  // deep violet (dark) / lavender (light)
      };
    }
    var _cols      = resolveColors();
    var themeColor = _cols.theme;
    var trailColor = _cols.trail;
    var featColor  = _cols.feat;

    var TAIL     = 110; // matches average feature lifetime (80–140 frames) so trail covers the feature cloud
    var NFEAT    = 80;
    var BASELINE = 0.38;
    var FW = 0.36, FH = 0.22, FD = 0.48;
    // Hidden z: just inside far-plane (camera far=2000, camera.z=5 → far world z=-1995).
    // Using -1990 keeps bounding sphere manageable while still being GPU-clipped.
    var HIDDEN_Z = -1990;

    // Wireframe frustum: apex at origin, base rectangle opens in local -z
    function buildFrustum() {
      var A  = new THREE.Vector3(0, 0, 0);
      var bl = new THREE.Vector3(-FW/2, -FH/2, -FD), br = new THREE.Vector3( FW/2, -FH/2, -FD);
      var tr = new THREE.Vector3( FW/2,  FH/2, -FD), tl = new THREE.Vector3(-FW/2,  FH/2, -FD);
      return new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints([A,bl, A,br, A,tr, A,tl, bl,br, br,tr, tr,tl, tl,bl]),
        new THREE.LineBasicMaterial({ color: themeColor, transparent: true, opacity: 0.92 }));
    }
    var f1 = buildFrustum(), f2 = buildFrustum();
    f1.rotation.order = 'ZXY'; f2.rotation.order = 'ZXY'; // yaw first, then pitch, then roll
    scene.add(f1); objects.push(f1);
    scene.add(f2); objects.push(f2);

    // Connection line between the two base-rectangle centers (recomputed via matrixWorld each frame)
    var connBuf  = new Float32Array(6);
    var connGeom = new THREE.BufferGeometry();
    connGeom.setAttribute('position', new THREE.BufferAttribute(connBuf, 3));
    var connLine = new THREE.Line(connGeom,
      new THREE.LineBasicMaterial({ color: themeColor, transparent: true, opacity: 0.88 }));
    scene.add(connLine); objects.push(connLine);
    var _b1 = new THREE.Vector3(), _b2 = new THREE.Vector3(); // pre-allocated scratch vectors

    // Single optical flow trail on the rig center (3-D path)
    var tailBuf  = new Float32Array(TAIL * 3);
    var tailGeom = new THREE.BufferGeometry();
    tailGeom.setAttribute('position', new THREE.BufferAttribute(tailBuf, 3));
    var tailLine = new THREE.Line(tailGeom,
      new THREE.LineBasicMaterial({ color: trailColor, transparent: true, opacity: 0.60 }));
    scene.add(tailLine); objects.push(tailLine);

    var tailHist = [];

    // Feature keypoints — frustumCulled=false prevents the large bounding sphere
    // (inflated by HIDDEN_Z vertices) from killing CPU-side culling of the whole object.
    // Individual points outside the depth range are still discarded by the GPU.
    var fBuf  = new Float32Array(NFEAT * 3);
    var fLife = new Int16Array(NFEAT);
    for (var i = 0; i < NFEAT; i++) { fBuf[i*3] = 0; fBuf[i*3+1] = 0; fBuf[i*3+2] = HIDDEN_Z; }
    var fGeom = new THREE.BufferGeometry();
    fGeom.setAttribute('position', new THREE.BufferAttribute(fBuf, 3));
    var fPts = new THREE.Points(fGeom,
      new THREE.PointsMaterial({ color: featColor, size: 0.055, transparent: true, opacity: 0.45, sizeAttenuation: true }));
    fPts.frustumCulled = false;
    scene.add(fPts); objects.push(fPts);
    var fIdx = 0;

    // --- Highlight state + color management ---
    var highlighted = false;

    // Restore default colors; skips frustum colors when highlighted so they stay bright
    function syncColors() {
      var cols = resolveColors();
      fPts.material.color.copy(cols.feat);
      if (!highlighted) {
        f1.material.color.copy(cols.theme);
        f2.material.color.copy(cols.theme);
        connLine.material.color.copy(cols.theme);
        tailLine.material.color.copy(cols.trail);
      }
    }

    function applyHighlight() {
      if (highlighted) {
        var neonFrustum = isDarkMode() ? '#00ffff' : '#ff007f'; // cyan (dark) / neon pink (light)
        tailLine.material.color.set('#39ff14');
        f1.material.color.set(neonFrustum);
        f2.material.color.set(neonFrustum);
        connLine.material.color.set(neonFrustum);
      } else {
        syncColors();
      }
    }

    // Theme-toggle observer — respects current highlight state
    var _themeObserver = new MutationObserver(syncColors);
    _themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // --- Click / hover on frustum wireframes ---
    var _raycaster = new THREE.Raycaster();
    _raycaster.params.Line = { threshold: 0.12 }; // world-unit pick tolerance for LineSegments

    function _ndcFromEvent(event) {
      var rect = renderer.domElement.getBoundingClientRect();
      return {
        x:  ((event.clientX - rect.left) / rect.width)  * 2 - 1,
        y: -((event.clientY - rect.top)  / rect.height) * 2 + 1
      };
    }

    // On mousemove: enable pointer-events on the canvas only while hovering over a frustum
    // so the pointer cursor shows and clicks land on the canvas instead of passing through.
    function _onMouseMove(event) {
      _raycaster.setFromCamera(_ndcFromEvent(event), camera);
      var hit = _raycaster.intersectObjects([f1, f2]).length > 0;
      renderer.domElement.style.pointerEvents = hit ? 'auto' : '';
      renderer.domElement.style.cursor        = hit ? 'pointer' : '';
    }

    function _onClick(event) {
      _raycaster.setFromCamera(_ndcFromEvent(event), camera);
      if (_raycaster.intersectObjects([f1, f2]).length > 0) {
        highlighted = !highlighted;
        applyHighlight();
      }
    }

    document.addEventListener('mousemove', _onMouseMove);
    renderer.domElement.addEventListener('click', _onClick);

    // --- Minimal 1-D Perlin noise (self-contained) ---
    var perm = [];
    for (var pi = 0; pi < 256; pi++) perm[pi] = pi;
    for (var pi = 255; pi > 0; pi--) {
      var pj = Math.floor(Math.random() * (pi + 1));
      var ptmp = perm[pi]; perm[pi] = perm[pj]; perm[pj] = ptmp;
    }
    perm = perm.concat(perm);
    function pfade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function plerp(a, b, t) { return a + (b - a) * t; }
    function pnoise(x) {
      var xi = Math.floor(x) & 255, xf = x - Math.floor(x);
      return plerp((perm[xi] & 1) ? xf : -xf, (perm[xi+1] & 1) ? xf-1 : -(xf-1), pfade(xf));
    }
    // Perlin channels for secondary DOFs (z-depth, pitch, roll)
    var CH = [0, 73.1, 137.3, 211.7, 293.1, 367.9];
    var nt = Math.random() * 500;

    // Heading-steered motion: Perlin noise bends the heading each frame.
    // The rig always moves "forward" at constant speed — this prevents the
    // 180° reversals caused by mapping noise directly to position.
    var heading  = Math.random() * Math.PI * 2; // random initial direction
    var SPEED    = 0.013; // world units per frame
    var MAX_TURN = 0.016; // max heading bend per frame ≈ 0.9°  →  wider, lazier arcs

    // Compute the visible world-space half-extents at z=0 from the live camera.
    // This automatically accounts for every screen size, aspect ratio, and resize event.
    function visibleBounds() {
      var halfH = camera.position.z * Math.tan(camera.fov * Math.PI / 360);
      var halfW = halfH * camera.aspect;
      return { cx: 0, cy: 0, rx: halfW * 0.80, ry: halfH * 0.80 };
    }

    var rig = {
      x: 0,
      y: 0,
      z: pnoise(nt + CH[2]) * 0.60,
      pitch: pnoise(nt + CH[4]) * 0.32,
      roll:  pnoise(nt + CH[5]) * 0.18,
      vx: 0, vy: 0
    };
    var frame = 0;

    function stepRig() {
      nt += 0.003;

      // Re-read bounds every frame — responds instantly to resize or orientation change
      var vb = visibleBounds();

      var turn = pnoise(nt) * MAX_TURN;

      // Elliptical soft wall centred on the play area (not world origin).
      // Starts steering at 50% radius so the rig curves away in a wide arc.
      var nx = (rig.x - vb.cx) / vb.rx;
      var ny = (rig.y - vb.cy) / vb.ry;
      var ndist = Math.sqrt(nx * nx + ny * ny);
      if (ndist > 0.50) {
        var toCenter  = Math.atan2(vb.cy - rig.y, vb.cx - rig.x);
        var angleDiff = Math.atan2(Math.sin(toCenter - heading), Math.cos(toCenter - heading));
        var pull      = Math.min((ndist - 0.50) / 0.50, 1.0);
        turn += angleDiff * pull * 0.05;
      }

      heading += turn;

      var prevX = rig.x, prevY = rig.y;
      rig.x += Math.cos(heading) * SPEED;
      rig.y += Math.sin(heading) * SPEED;

      // Hard clamp — final safety net
      rig.x = Math.max(vb.cx - vb.rx, Math.min(vb.cx + vb.rx, rig.x));
      rig.y = Math.max(vb.cy - vb.ry, Math.min(vb.cy + vb.ry, rig.y));

      rig.z     = pnoise(nt + CH[2]) * 0.60;
      rig.pitch = pnoise(nt + CH[4]) * 0.32;
      rig.roll  = pnoise(nt + CH[5]) * 0.18;

      rig.vx = rig.x - prevX;
      rig.vy = rig.y - prevY;
    }

    function updateTail() {
      tailHist.push([rig.x, rig.y, rig.z]);
      if (tailHist.length > TAIL) tailHist.shift();
      var n = tailHist.length;
      for (var i = 0; i < TAIL; i++) {
        var p = tailHist[n - 1 - i] || tailHist[0];
        tailBuf[i*3] = p[0]; tailBuf[i*3+1] = p[1]; tailBuf[i*3+2] = p[2];
      }
      tailGeom.attributes.position.needsUpdate = true;
    }

    // Spawn keypoints at the rig's current world position, scattered within the common FOV volume
    function spawnFeats() {
      var count = 3 + Math.floor(Math.random() * 3);
      for (var i = 0; i < count; i++) {
        var idx = fIdx % NFEAT;
        fBuf[idx*3]   = rig.x + (Math.random() - 0.5) * FW * 2.0;
        fBuf[idx*3+1] = rig.y + (Math.random() - 0.5) * FH * 2.0;
        fBuf[idx*3+2] = rig.z - Math.random() * FD * 0.80;
        fLife[idx] = 80 + Math.floor(Math.random() * 60);
        fIdx++;
      }
    }

    return function update() {
      frame++;
      stepRig();

      var spd = Math.sqrt(rig.vx*rig.vx + rig.vy*rig.vy) || 0.001;
      var yaw = Math.atan2(rig.vy, rig.vx);
      var px  = -rig.vy / spd; // perpendicular (baseline axis)
      var py  =  rig.vx / spd;

      var x1 = rig.x + px * BASELINE/2, y1 = rig.y + py * BASELINE/2;
      var x2 = rig.x - px * BASELINE/2, y2 = rig.y - py * BASELINE/2;

      // True 6-DOF: XYZ translation + yaw (travel direction) + Perlin pitch + Perlin roll
      f1.position.set(x1, y1, rig.z);
      f1.rotation.z = yaw; f1.rotation.x = rig.pitch; f1.rotation.y = rig.roll;

      f2.position.set(x2, y2, rig.z);
      f2.rotation.z = yaw; f2.rotation.x = rig.pitch; f2.rotation.y = rig.roll;

      // Connection line: world-space base centers derived from the full rotation matrix
      f1.updateMatrixWorld(true);
      f2.updateMatrixWorld(true);
      _b1.set(0, 0, -FD).applyMatrix4(f1.matrixWorld);
      _b2.set(0, 0, -FD).applyMatrix4(f2.matrixWorld);
      connBuf[0] = _b1.x; connBuf[1] = _b1.y; connBuf[2] = _b1.z;
      connBuf[3] = _b2.x; connBuf[4] = _b2.y; connBuf[5] = _b2.z;
      connLine.geometry.attributes.position.needsUpdate = true;

      updateTail();

      if (frame % 4 === 0) spawnFeats();

      for (var i = 0; i < NFEAT; i++) {
        if (fLife[i] > 0) {
          fLife[i]--;
          if (fLife[i] === 0) { fBuf[i*3] = 0; fBuf[i*3+1] = 0; fBuf[i*3+2] = HIDDEN_Z; }
        }
      }
      fGeom.attributes.position.needsUpdate = true;
    };
  }

  // ---- rgb_xyz: rotating RGB coordinate axes ----
  function initRgbXyz() {
    var len = 1.2;
    [{ color: 0xff0000, to: [len, 0, 0] }, { color: 0x00ff00, to: [0, len, 0] }, { color: 0x0000ff, to: [0, 0, len] }]
      .forEach(function (ax) {
        var g = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0), new THREE.Vector3(ax.to[0], ax.to[1], ax.to[2])
        ]);
        var line = new THREE.Line(g,
          new THREE.LineBasicMaterial({ color: ax.color, transparent: true, opacity: 0.65 }));
        scene.add(line); objects.push(line);
      });
    return function update(t) {
      objects.forEach(function (o) { o.rotation.x = t * 0.0004; o.rotation.y = t * 0.0005; });
    };
  }

  // ---- point_cloud: drifting 3D points ----
  function initPointCloud() {
    var c = getThemeColor();
    var rgb = hexToRgb(c);
    var color = new THREE.Color(rgb.r, rgb.g, rgb.b);
    var n = 120;
    var positions = new Float32Array(n * 3);
    for (var i = 0; i < n * 3; i++) positions[i] = (Math.random() - 0.5) * 4;
    var geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var pts = new THREE.Points(geom,
      new THREE.PointsMaterial({ color: color, size: 0.04, transparent: true, opacity: 0.6, sizeAttenuation: true }));
    scene.add(pts); objects.push(pts);
    return function update(t) {
      var pos = geom.attributes.position.array;
      for (var i = 0; i < n; i++) {
        pos[i*3]   += Math.sin(t*0.001 + i) * 0.002;
        pos[i*3+1] += Math.cos(t*0.0012 + i*1.3) * 0.002;
        pos[i*3+2] += Math.sin(t*0.0008 + i*0.7) * 0.002;
        if (pos[i*3]   >  2) pos[i*3]   -= 4;
        if (pos[i*3]   < -2) pos[i*3]   += 4;
        if (pos[i*3+1] >  2) pos[i*3+1] -= 4;
        if (pos[i*3+1] < -2) pos[i*3+1] += 4;
      }
      geom.attributes.position.needsUpdate = true;
    };
  }

  // ---- frustum: single rotating wireframe camera pyramid ----
  function initFrustum() {
    var c = getThemeColor();
    var rgb = hexToRgb(c);
    var color = new THREE.Color(rgb.r, rgb.g, rgb.b);
    var mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.55 });
    var W = 0.8, H = 0.5, D = 1.2;
    var apex = new THREE.Vector3(0, 0, D);
    var bl = new THREE.Vector3(-W/2, -H/2, -D/2), br = new THREE.Vector3(W/2, -H/2, -D/2);
    var tr = new THREE.Vector3(W/2, H/2, -D/2),   tl = new THREE.Vector3(-W/2, H/2, -D/2);
    var line = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([apex,bl, apex,br, apex,tr, apex,tl, bl,br, br,tr, tr,tl, tl,bl]),
      mat);
    scene.add(line); objects.push(line);
    return function update(t) {
      line.rotation.y = t * 0.00035;
      line.rotation.x = Math.sin(t * 0.0002) * 0.2;
    };
  }

  var updateFn = null;

  function dispatch() {
    clearScene();
    switch (getAnimationKey()) {
      case 'hand_pose':   updateFn = initHandPose();   break;
      case 'mag_cal':     updateFn = initMagCal();     break;
      case 'fft_waves':   updateFn = initFftWaves();   break;
      case 'camera_6dof': updateFn = initCamera6dof(); break;
      case 'rgb_xyz':     updateFn = initRgbXyz();     break;
      case 'point_cloud': updateFn = initPointCloud(); break;
      case 'frustum':     updateFn = initFrustum();    break;
      default:            updateFn = initHandPose();
    }
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    if (updateFn) updateFn(Date.now());
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function run() {
    initThree();
    dispatch();
    animate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
