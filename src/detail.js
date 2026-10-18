/* Neon Coast - detalle urbano: bordillos de acera (solo visuales), contenedores e hidrantes en las
   esquinas de la acera, sombrillas y toallas en la playa. NADA sobre la calzada. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  NC.log('detail: bordillos, banca urbana y playa');

  const D = new THREE.Object3D();

  // ---------- lavado de luz uniforme: aclara por igual asfalto y aceras (las intersecciones ya no van a negro) ----------
  try {
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(2 * EXT - 16, 2 * EXT - 16), new THREE.MeshBasicMaterial({ color: 0x9fb0c8, transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false }));
    wash.rotation.x = -PI / 2; wash.position.set(0, .052, 0); scene.add(wash);
    const _ps = window.paintSky;
    if (typeof _ps === 'function') window.paintSky = function () {
      const r = _ps.apply(this, arguments);
      try { const nite = (WX.t > .8 || WX.t < .18) ? 1 : (WX.t > .68 && WX.t < .8) ? .6 : 0; wash.material.opacity = .05 + nite * .09; } catch (e) { }
      return r;
    };
    try { paintSky(); } catch (e) { }
  } catch (e) { NC.log('detail: lavado de luz', e); }

  // ---------- bordillos (sin colision: el paso lo resuelve gh()) ----------
  try {
    const C = [];
    for (const [cx, cz] of slabL) {
      C.push(cg(new THREE.BoxGeometry(59.4, .34, .5).translate(cx, .2, cz - 29.7), 0xb6bdc9));
      C.push(cg(new THREE.BoxGeometry(59.4, .34, .5).translate(cx, .2, cz + 29.7), 0xb6bdc9));
      C.push(cg(new THREE.BoxGeometry(.5, .34, 58.4).translate(cx - 29.7, .2, cz), 0xb6bdc9));
      C.push(cg(new THREE.BoxGeometry(.5, .34, 58.4).translate(cx + 29.7, .2, cz), 0xb6bdc9));
    }
    const curb = new THREE.Mesh(merge(C), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }));
    curb.receiveShadow = true; scene.add(curb);
  } catch (e) { NC.log('detail: bordillos', e); }

  // ---------- contenedores e hidrantes en las esquinas de la acera ----------
  try {
    const bins = [], hyds = [];
    for (const [cx, cz] of slabL) {
      if (Math.abs(cx - park.x) < 31 && Math.abs(cz - park.z) < 31) continue;   // parque sin basura
      // contenedor en dos esquinas que quedan lejos de farolas y conos
      bins.push([cx - 27, cz + 27], [cx + 27, cz - 27]);
      if (Math.random() < .55) bins.push([cx + 27, cz]);
      if (Math.random() < .4) hyds.push([cx - 27, cz]);
    }
    const binG = merge([
      cg(new THREE.CylinderGeometry(.44, .38, 1.15, 10).translate(0, .58, 0), 0x2f6a4a),
      cg(new THREE.CylinderGeometry(.36, .36, .1, 10).translate(0, .88, 0), 0x25473a),
      cg(new THREE.BoxGeometry(.8, .07, .14).translate(0, 1.52, 0), 0x9aa2ac),
      cg(new THREE.CylinderGeometry(.47, .47, .09, 10).translate(0, 1.16, 0), 0x25473a)
    ]);
    const binM = new THREE.InstancedMesh(binG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75 }), bins.length);
    bins.forEach((q, k) => { D.position.set(q[0], .35, q[1]); D.rotation.set(0, rnd(0, 6.3), 0); D.scale.setScalar(1); D.updateMatrix(); binM.setMatrixAt(k, D.matrix); boxes.push({ x: q[0], z: q[1], hw: .46, hd: .46 }); });
    binM.frustumCulled = false; binM.castShadow = true; scene.add(binM);

    const hydG = merge([
      cg(new THREE.CylinderGeometry(.15, .19, .62, 8).translate(0, .31, 0), 0xd03030),
      cg(new THREE.SphereGeometry(.16, 8, 6).translate(0, .66, 0), 0xd03030),
      cg(new THREE.BoxGeometry(.48, .08, .08).translate(0, .44, 0), 0xb02020),
      cg(new THREE.CylinderGeometry(.26, .3, .07, 10).translate(0, .04, 0), 0x7a1a1a)
    ]);
    const hydM = new THREE.InstancedMesh(hydG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55, metalness: .3 }), hyds.length);
    hyds.forEach((q, k) => { D.position.set(q[0], .35, q[1]); D.rotation.set(0, 0, 0); D.updateMatrix(); hydM.setMatrixAt(k, D.matrix); boxes.push({ x: q[0], z: q[1], hw: .2, hd: .2 }); });
    hydM.frustumCulled = false; hydM.castShadow = true; scene.add(hydM);
    NC.log('detail: ' + bins.length + ' contenedores y ' + hyds.length + ' hidrantes');
  } catch (e) { NC.log('detail: banca', e); }

  // ---------- sombrillas y toallas en la playa ----------
  try {
    // posiciones vacian: evitan bar, clinica, objetivos de futbol y las salas de la playa
    function freeSpot(z) {
      if (Math.abs(z) < 11) return false;          // campo y porterias
      if (Math.abs(z + 20) < 9) return false;      // BAR
      if (Math.abs(z - 44) < 9) return false;      // clinica
      if (Math.abs(z - 150) < 10) return false;    // apartamento
      if (Math.abs(z + 150) < 10) return false;    // club neon
      return true;
    }
    const UB = [];
    for (let k = 0; k < 14; k++) {
      const z = -EXT + 28 + k * 60 + rnd(-12, 12);
      if (!freeSpot(z)) continue;
      const x = EXT + 10 + rnd(4, 30);
      const col = pick([0xff5a7a, 0x27e6ff, 0xffd24a, 0x8a5cff, 0x2ee08a]);
      UB.push(cg(new THREE.CylinderGeometry(.06, .09, 2.75, 6).translate(x, 1.4, z), 0xefe8d8));
      UB.push(cg(new THREE.CylinderGeometry(.05, 2.05, .75, 10).translate(x, 2.95, z), col));
      UB.push(cg(new THREE.CylinderGeometry(2.06, 2.06, .05, 10).translate(x, 2.95, z), 0xf5f0e6));
    }
    const umb = new THREE.Mesh(merge(UB), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 }));
    umb.castShadow = true; scene.add(umb);

    const TW = [];
    for (let k = 0; k < 22; k++) {
      const z = -EXT + 18 + rnd(0, 2 * EXT - 60);
      if (!freeSpot(z)) continue;
      const x = EXT + 7 + rnd(0, 38);
      TW.push(cg(new THREE.BoxGeometry(1.7, .05, .95).rotateY(rnd(-.45, .45)).translate(x, .06, z),
        pick([0xff8a3a, 0x27b6e8, 0xffd24a, 0xff5a7a, 0x3dff9a, 0xf5f0e6])));
    }
    const towels = new THREE.Mesh(merge(TW), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    towels.receiveShadow = true; scene.add(towels);

    // +(completa la playa) pelotas: un par apretados al lado de las toallas
    const BB = [];
    for (let k = 0; k < 6; k++) {
      const z = -EXT + 30 + rnd(0, 2 * EXT - 90);
      if (!freeSpot(z)) continue;
      const x = EXT + 9 + rnd(0, 30);
      BB.push(cg(new THREE.SphereGeometry(.3, 8, 6).translate(x, .3, z), pick([0x27e6ff, 0xffd24a, 0xff5a7a])));
    }
    const balls = new THREE.Mesh(merge(BB), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5 }));
    scene.add(balls);
    NC.log('detail: playa vestida · ' + (UB.length / 3 | 0) + ' sombrillas · ' + TW.length + ' toallas');
  } catch (e) { NC.log('detail: playa', e); }

  // ---------- lunetas de neun del suelo en el barrio (reflejo de la estetica) ----------
  try {
    const PZ = [];
    for (let k = 0; k < 26; k++) {
      const ii = Math.floor(rnd(-H, H)), jj = Math.floor(rnd(-H, H));
      const x = (ii + .5) * CELL + pick([-1, 1]) * rnd(21, 26.5) + rnd(-2, 2);
      const z = (jj + .5) * CELL + rnd(-25, 25);
      const g = new THREE.PlaneGeometry(rnd(1.4, 3.2), rnd(.8, 1.6)).rotateX(-PI / 2).rotateY(paramRand(x, z));
      g.translate(x, .075, z);
      PZ.push(cg(g, pick([0x27e6ff, 0xff5a7a, 0xffd24a])));
    }
    const neons = new THREE.Mesh(merge(PZ), new THREE.MeshBasicMaterial({ transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true }));
    scene.add(neons);
  } catch (e) { NC.log('detail: lunetas', e); }

  function paramRand(x, z) { const s = Math.sin(x * 12.99 + z * 78.23) * 43758.55; return (s - Math.floor(s)) * 1.5; }

  NC.log('detail: listo');
})();
