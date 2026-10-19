/* Neon Coast - clima: lluvia fina en estelas, salpicaduras, asfalto que se moja
   progresivamente (albedo mas oscuro, rugosidad baja) y reflejos de farolas y escaparates. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;
  const R2 = (a, b) => a + Math.random() * (b - a);

  // ---------- estado de humedad ----------
  const WET = { v: 0, target: 0 };

  // ---------- 1) lluvia fina: LineSegments (gotas finas, no bolas) ----------
  const N = 2200, drops = new Float32Array(N * 6);
  const rainGeo = new T.BufferGeometry();
  rainGeo.setAttribute('position', new T.BufferAttribute(drops, 3));
  const rainMat = new T.LineBasicMaterial({ color: 0xd6e8ff, transparent: true, opacity: .42, depthWrite: false, fog: true });
  const rain = new T.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  const rainLen = 1.15;                 // longitud de la estela
  function seedRain() {
    const cam = camera.position;
    for (let i = 0; i < N; i++) {
      const k = i * 6;
      const x = cam.x + R2(-42, 42), y = cam.y + R2(-6, 42), z = cam.z + R2(-42, 42);
      drops[k] = x; drops[k + 1] = y; drops[k + 2] = z;
      drops[k + 3] = x; drops[k + 4] = y - rainLen; drops[k + 5] = z;
    }
    rainGeo.attributes.position.needsUpdate = true;
  }
  seedRain();
  // el sistema viejo de puntos (nieve) lo dejamos para la nieve
  try { if (typeof precip !== 'undefined') precip.visible = false; } catch (e) { }

  // ---------- 2) salpicaduras en el suelo ----------
  const SP = 260, spGeo = new T.RingGeometry(.16, .22, 12).rotateX(-PI / 2);
  const spMesh = new T.InstancedMesh(spGeo, new T.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: .3, depthWrite: false }), SP);
  spMesh.frustumCulled = false; spMesh.visible = false; scene.add(spMesh);
  const spState = [];
  for (let i = 0; i < SP; i++) spState.push({ x: 0, z: 0, t: R2(0, 1), s: R2(.5, 1.6) });
  const D2 = new T.Object3D();

  // ---------- 3) reflejos de farolas y escaparates en el asfalto mojado ----------
  const reflG = [];
  const reflM = new T.MeshBasicMaterial({ map: glowT, color: 0xffe6b0, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
  try {
    lamps.forEach(p => {
      const m = new T.Mesh(new T.PlaneGeometry(3.2, 13), reflM);
      m.rotation.x = -PI / 2;
      m.position.set(p[0], .06, p[1]);
      m.renderOrder = 2;
      scene.add(m); reflG.push(m);
    });
  } catch (e) { }
  //faros de los coches: se actualizan en vivo
  const carRefl = [];

  // ---------- 4) charcos ----------
  const puddleM = new T.MeshStandardMaterial({ color: 0x1b1c26, roughness: .03, metalness: .85, transparent: true, opacity: 0, envMapIntensity: 2.2, depthWrite: false });
  const puddles = [];
  for (let i = 0; i < 90; i++) {
    const k = (Math.random() * 11 | 0) - 5, l = (Math.random() * 11 | 0) - 5;
    const x = k * CELL + R2(-R / 2 + 2, R / 2 - 2), z = l * CELL + R2(-R / 2 + 2, R / 2 - 2);
    if (Math.abs(x) > EXT - 4 || Math.abs(z) > EXT - 4) continue;
    const r = R2(1.1, 3.4);
    const m = new T.Mesh(new T.CircleGeometry(r, 18).rotateX(-PI / 2), puddleM);
    m.position.set(x, .035, z);
    m.scale.set(1, 1, R2(.5, 1.2));
    m.renderOrder = 1;
    scene.add(m); puddles.push(m);
  }

  // ---------- 5) materiales que se mojan ----------
  const rmat0 = (typeof rmat !== 'undefined') ? { c: rmat.color.clone(), r: rmat.roughness, m: rmat.metalness, e: rmat.envMapIntensity } : null;
  let gndMat = null, slabMat = null;
  try {
    scene.traverse(o => {
      if (o.isInstancedMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.width === B && !slabMat) slabMat = o.material;
    });
    if (typeof gndMat !== 'undefined' && gndMat) { }
  } catch (e) { }
  try { if (typeof gndMat !== 'undefined' && gndMat) { } } catch (e) { }
  // el suelo urbano en index.html se llama gndMat
  try {
    if (window.gndMat) gndMat = gndMat || window.gndMat;
  } catch (e) { }
  const g0 = gndMat ? { c: gndMat.color.clone(), r: gndMat.roughness } : null;
  const s0 = slabMat ? { c: slabMat.color.clone(), r: slabMat.roughness } : null;

  // ---------- 6) sincronizar con el clima del juego ----------
  const _setWeather = window.setWeather;
  window.setWeather = function (w) {
    try { _setWeather && _setWeather(w); } catch (e) { }
    const lluvia = (w === 'lluvia');
    rain.visible = lluvia;
    spMesh.visible = lluvia;
    if (lluvia) { try { seedRain(); } catch (e) { } }
    try { if (typeof precip !== 'undefined') precip.visible = (w === 'nieve'); } catch (e) { }
    WET.target = lluvia ? 1 : 0;
    try {
      const z = document.getElementById('zone');
      if (z && lluvia) { z.textContent = '— LLUVIA FINA EN LA COSTA —'; z.style.opacity = 1; clearTimeout(z.t); z.t = setTimeout(() => z.style.opacity = 0, 2200); }
    } catch (e) { }
  };

  // ---------- 7) actualizacion por frame ----------
  NC.hooks.pre.push(dt => {
    // transicion suave de humedad
    const sp = dt * .22;
    WET.v += Math.max(-sp, Math.min(sp, WET.target - WET.v));
    const w = WET.v;

    // lluvia: caida con viento y re-emision
    if (rain.visible) {
      const cam = camera.position, vel = 26, wind = 3.2;
      for (let i = 0; i < N; i++) {
        const k = i * 6;
        drops[k + 1] -= vel * dt; drops[k] += wind * dt;
        drops[k + 4] = drops[k + 1] - rainLen; drops[k + 3] = drops[k];
        if (drops[k + 1] < cam.y - 8) {
          const x = cam.x + R2(-40, 40), y = cam.y + R2(16, 40), z = cam.z + R2(-40, 40);
          drops[k] = x; drops[k + 1] = y; drops[k + 2] = z;
          drops[k + 3] = x; drops[k + 4] = y - rainLen; drops[k + 5] = z;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;
      rainMat.opacity = .3 + w * .12;
      // salpicaduras
      for (let i = 0; i < SP; i++) {
        const s = spState[i];
        s.t -= dt * 2.4;
        if (s.t <= 0) {
          s.t = 1; s.x = camera.position.x + R2(-26, 26); s.z = camera.position.z + R2(-26, 26);
          s.s = R2(.5, 1.7);
        }
        const k = 1 - s.t;
        D2.position.set(s.x, .05, s.z); D2.scale.set(s.s * (1 + k * 3.4), 1, s.s * (1 + k * 3.4));
        D2.updateMatrix(); spMesh.setMatrixAt(i, D2.matrix);
      }
      spMesh.instanceMatrix.needsUpdate = true;
      spMesh.material.opacity = .26 * w;
    }

    // materiales mojados
    if (rmat0) {
      rmat.color.copy(rmat0.c).multiplyScalar(1 - .34 * w);
      rmat.roughness = rmat0.r * (1 - w) + .14 * w;
      rmat.metalness = rmat0.m + .08 * w;
      rmat.envMapIntensity = (rmat0.e || .75) * (1 + .35 * w);
    }
    if (g0 && gndMat) { gndMat.color.copy(g0.c).multiplyScalar(1 - .22 * w); gndMat.roughness = g0.r * (1 - w) + .2 * w; }
    if (s0 && slabMat) { slabMat.color.copy(s0.c).multiplyScalar(1 - .2 * w); slabMat.roughness = s0.r * (1 - w) + .18 * w; }
    // reflejos de farolas
    reflM.opacity = .34 * w;
    for (const m of reflG) m.visible = w > .04;
    // charcos
    puddleM.opacity = .55 * w;
    for (const m of puddles) m.visible = w > .04;
    // niebla mas densa con lluvia
    try {
      if (scene.fog) { scene.fog.near = 70 - 34 * w; scene.fog.far = 430 - 150 * w; }
    } catch (e) { }
  });

  // reflejos de los faros del jugador y del trafico
  NC.hooks.post.push(() => {
    const w = WET.v;
    if (w < .05) { carRefl.forEach(m => m.visible = false); return; }
    try {
      const add = (obj, x, z, ang, col) => {
        let m = carRefl.find(o => o.userData.k === obj);
        if (!m) {
          m = new T.Mesh(new T.PlaneGeometry(2.6, 7), new T.MeshBasicMaterial({ map: glowT, color: col || 0xfff0c0, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }));
          m.rotation.x = -PI / 2; m.renderOrder = 2; scene.add(m); carRefl.push(m);
          m.userData.k = obj;
        }
        m.visible = true;
        m.position.set(x, .055, z);
        m.rotation.z = -ang;
        m.material.opacity = .5 * w;
      };
      if (typeof car !== 'undefined' && car) {
        const c = car.position, a = (typeof P !== 'undefined' && P.th) || 0;
        const fx = c.x + Math.sin(a) * 4.2, fz = c.z + Math.cos(a) * 4.2;
        add(car, fx, fz, a, 0xfff4d0);
      }
    } catch (e) { }
  });

  NC.log('clima: lluvia fina, salpicaduras, asfalto mojado y reflejos');
})();
