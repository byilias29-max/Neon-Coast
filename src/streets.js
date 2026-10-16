/* Neon Coast - detalle de calles: asfalto de alta resolucion, marcas viales, pasos de cebra, registros y coches aparcados */
(function () {
  'use strict';
  if (!window.THREE || !window.NC) return;
  NC.log('streets: reconstruyendo el asfalto');

  const MAXAN = rd.capabilities.getMaxAnisotropy();
  const yMark = .049;

  // ---------- textura asfalto principal 512x512 (16m x 16m por tile) ----------
  function makeRoadTex() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#302d38'; g.fillRect(0, 0, 512, 512);
    // ruido fino
    for (let i = 0; i < 5200; i++) {
      const s = Math.random() * 2.2 + .6;
      g.fillStyle = `rgba(${Math.random() < .5 ? '255,230,255' : '0,0,0'},${(Math.random() * .10 + .02).toFixed(3)})`;
      g.fillRect(Math.random() * 512, Math.random() * 512, s, s);
    }
    // parches reparados (gris distinto con borde)
    for (let i = 0; i < 5; i++) {
      const w = 40 + Math.random() * 130, h = 26 + Math.random() * 90;
      const x0 = Math.random() * (512 - w), y0 = Math.random() * (512 - h);
      g.fillStyle = `rgba(${Math.random() < .5 ? '18,16,22' : '58,55,66'},.45)`;
      g.fillRect(x0, y0, w, h);
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.strokeRect(x0, y0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.10)'; g.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4);
    }
    // grietas
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = `rgba(0,0,0,${(Math.random() * .3 + .2).toFixed(2)})`;
      g.lineWidth = Math.random() < .5 ? 1.5 : 2.8;
      g.beginPath();
      let px = Math.random() * 512, py = Math.random() * 512;
      g.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += (Math.random() - .5) * 90; py += (Math.random() - .5) * 90; g.lineTo(px, py); }
      g.stroke();
    }
    // manchas de aceite
    for (let i = 0; i < 7; i++) {
      const r = 8 + Math.random() * 26;
      const gg = g.createRadialGradient(Math.random() * 512, Math.random() * 512, 2, Math.random() * 512, Math.random() * 512, r);
      gg.addColorStop(0, 'rgba(8,8,14,.5)'); gg.addColorStop(1, 'rgba(8,8,14,0)');
      g.fillStyle = gg; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    }
    // dobles franjas de ruedas humedo (dos carriles por tile)
    for (const laneX of [150, 360]) {
      for (const dy of [-26, 26]) {
        g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 13;
        g.beginPath(); g.moveTo(laneX, 0); g.lineTo(laneX + 30 * (Math.random() - .5) * 2, 512); g.stroke();
        void dy;
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(len / 16, 1); t.anisotropy = MAXAN;
    return t;
  }
  function makeInterTex() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#2e2b35'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2400; i++) {
      const s = Math.random() * 2 + .6;
      g.fillStyle = `rgba(${Math.random() < .5 ? '255,230,255' : '0,0,0'},${(Math.random() * .08 + .02).toFixed(3)})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, s, s);
    }
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = `rgba(0,0,0,.3)`; g.lineWidth = 2;
      g.beginPath(); let x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (Math.random() - .5) * 60; y += (Math.random() - .5) * 60; g.lineTo(x, y); }
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2); t.anisotropy = MAXAN;
    return t;
  }

  try {
    if (rmat && rmat.map) { const old = rmat.map; rmat.map = makeRoadTex(); if (old.dispose) old.dispose(); }
    if (rmat) { rmat.roughness = .8; rmat.metalness = .04; rmat.envMapIntensity = .75; }
    if (typeof inter !== 'undefined' && inter.material) {
      inter.material.map = makeInterTex();
      inter.material.color.setHex(0xffffff);
      inter.material.roughness = .8; inter.material.metalness = .04; inter.material.envMapIntensity = .75;
    }
  } catch (e) { NC.log('streets: textura base', e); }

  // ---------- marcas viales ----------
  const mOff = R / 2 + 1;                       // 9: margen de interseccion
  const edgeG = [], dashG = [], cwG = [];
  const quadX = (l, w, cx, cz) => new THREE.PlaneGeometry(l, w).rotateX(-PI / 2).translate(cx, yMark, cz);
  const quadZ = (w, l, cx, cz) => new THREE.PlaneGeometry(w, l).rotateX(-PI / 2).translate(cx, yMark, cz);

  // 1) lineas de borde + raya central discontinua por tramo (carreteras E-O y N-S)
  for (let i = -H; i <= H; i++) {
    for (let s = -H; s < H; s++) {
      const x0 = s * CELL + mOff, x1 = (s + 1) * CELL - mOff, mid = (x0 + x1) / 2, L2 = x1 - x0;
      // carrettera a lo largo de X, en z = i*CELL
      edgeG.push(quadX(L2, .22, mid, i * CELL - (R / 2 - .55)));
      edgeG.push(quadX(L2, .22, mid, i * CELL + (R / 2 - .55)));
      for (let k = 0; k < 7; k++) {
        const dx = x0 + 3 + k * 7.4;
        if (dx + 3.2 <= x1) dashG.push(quadX(3.2, .26, dx, i * CELL));
      }
      // carretera a lo largo de Z, en x = i*CELL
      const z0 = s * CELL + mOff, z1 = (s + 1) * CELL - mOff, midz = (z0 + z1) / 2, L3 = z1 - z0;
      edgeG.push(quadZ(.22, L3, i * CELL - (R / 2 - .55), midz));
      edgeG.push(quadZ(.22, L3, i * CELL + (R / 2 - .55), midz));
      for (let k = 0; k < 7; k++) {
        const dz = z0 + 3 + k * 7.4;
        if (dz + 3.2 <= z1) dashG.push(quadZ(.26, 3.2, i * CELL, dz));
      }
    }
  }

  // 2) pasos de cebra junto a cada cruce
  for (let i = -H; i <= H; i++) for (let j = -H; j <= H; j++) {
    for (const sd of [-1, 1]) {
      const bx = i * CELL + sd * (R / 2 + 1.4);
      for (let st = 0; st < 8; st++) {
        const zc = j * CELL - 6.65 + st * 1.9;
        cwG.push(quadX(2.6, .9, bx, zc));      // cruces E-O
      }
      const bz = j * CELL + sd * (R / 2 + 1.4);
      for (let st = 0; st < 8; st++) {
        const xc = i * CELL - 6.65 + st * 1.9;
        cwG.push(quadZ(.9, 2.6, xc, bz));      // cruces N-S
      }
    }
  }

  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xd9d6db, roughness: .55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 });
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xc9a13b, roughness: .5, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 });
  const cwMat = new THREE.MeshStandardMaterial({ color: 0xe6e3e8, roughness: .5, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 });
  const addFlat = (arr, mat) => { if (!arr.length) return; const m = new THREE.Mesh(merge(arr), mat); m.receiveShadow = true; scene.add(m); return m };
  addFlat(edgeG, edgeMat); addFlat(dashG, dashMat); addFlat(cwG, cwMat);

  // 3) registros de alcantarilla
  const manholes = [];
  const hseed = (i, s, k) => { const x = Math.sin(i * 12.9898 + s * 78.233 + k * 43.1) * 43758.5453; return x - Math.floor(x); };
  for (let i = -H; i <= H; i++) for (let s = -H; s < H; s++) {
    const x0 = s * CELL + mOff, x1 = (s + 1) * CELL - mOff;
    if (hseed(i, s, 1) < .4) {
      manholes.push([x0 + 12 + hseed(i, s, 2) * (x1 - x0 - 24), i * CELL + (hseed(i, s, 3) - .5) * 10]);
    }
    const z0 = s * CELL + mOff, z1 = (s + 1) * CELL - mOff;
    if (hseed(s, i, 4) < .4) {
      manholes.push([i * CELL + (hseed(s, i, 5) - .5) * 10, z0 + 12 + hseed(s, i, 6) * (z1 - z0 - 24)]);
    }
  }
  try {
    const mhMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(.55, 16),
      new THREE.MeshStandardMaterial({ color: 0x1d1b22, roughness: .35, metalness: .8, polygonOffset: true, polygonOffsetFactor: -3 }), manholes.length);
    manholes.forEach((p, k) => {
      D.position.set(p[0], yMark + .002, p[1]); D.rotation.set(-PI / 2, 0, hseed(p[0] | 0, p[1] | 0, 7) * 3); D.updateMatrix();
      mhMesh.setMatrixAt(k, D.matrix);
    });
    mhMesh.frustumCulled = true; mhMesh.receiveShadow = true; scene.add(mhMesh);
  } catch (e) { NC.log('manholes', e); }

  // 4) coches aparcados junto a los edificios (NUNCA en ella caretera): se apoyan en la acera frente a las fachadas
  try {
    const palette = [0x27e6ff, 0xffd24a, 0xffffff, 0x8a5cff, 0x2ee08a, 0xff8a3a, 0x3a7aff, 0xd0d3d8, 0x1d1f26, 0x9c2a2a];
    const bldgs = boxes.filter(b => b.hw >= 7 && b.hd >= 7 && Math.abs(b.x) < EXT - 8 && Math.abs(b.z) < EXT - 8);
    const chosen = [];
    for (let tries = 0; tries < 400 && chosen.length < 12; tries++) {
      const b = bldgs[Math.floor(hseed(tries, 3, 9) * bldgs.length)];
      if (!b || !b.hw) continue;
      const key = Math.round(b.x) + ',' + Math.round(b.z);
      if (chosen.some(c => c.key === key)) continue;
      chosen.push({ key, b, side: hseed(key.length, tries, 10) < .5 ? -1 : 1, along: hseed(tries, key.length, 11) < .5 });
    }
    const parked = [];
    chosen.forEach((c, k) => {
      const b = c.b;
      // fachada que da a la calzada mas cercana; el coche queda paralelo a esa fachada
      const nearX = Math.round(b.x / CELL) * CELL, nearZ = Math.round(b.z / CELL) * CELL;
      const dX = nearX - b.x, dZ = nearZ - b.z;
      const sx = Math.sign(dX) || 1, sz = Math.sign(dZ) || 1;
      // las fachadas equidistan en las esquinas: se sortea la cara (y el lado del edificio la resuelve)
      const xSide = Math.abs(dX) < Math.abs(dZ) ? true : (Math.abs(dX) > Math.abs(dZ) ? false : hseed(0, b.x | 0, 77) < .5);
      let x, z, rot, box;
      if (xSide) {                               // fachada que corre en Z (mira a la calle N-S)
        x = b.x + sx * (b.hw + 1.4);
        z = b.z + (hseed(k, b.z | 0, 13) - .5) * b.hd * .8;
        rot = sz > 0 ? 0 : PI;
        box = { x, z, hw: 1.15, hd: 2.35 };
      } else {                                   // fachada que corre en X (mira a la calle E-W)
        z = b.z + sz * (b.hd + 1.4);
        x = b.x + (hseed(k, b.x | 0, 12) - .5) * b.hw * .8;
        rot = sx > 0 ? PI / 2 : -PI / 2;
        box = { x, z, hw: 2.35, hd: 1.15 };
      }
      const g = mkCar(palette[(k * 3) % palette.length]);
      g.position.set(x, .35, z); g.rotation.y = rot;
      boxes.push(box);                           // colision estatica para no atravesarlo
      parked.push({ g, x: +x.toFixed(1), z: +z.toFixed(1), rot: +rot.toFixed(2) });
    });
    (NC.PARKED = NC.PARKED || []).push(...parked);
  } catch (e) { NC.log('parked', e); }

  NC.log('streets: marcas, cebras y aparcados colocados');
})();
