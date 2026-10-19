/* Neon Coast - vegetacion: arboles con ramas reales (no troncos + copas cubicas),
   palmeras de fronda curvada, cipreses, arbustos, colocacion por barrio y viento sutil. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;
  const R2 = (a, b) => a + Math.random() * (b - a);
  const V3 = (x, y, z) => new T.Vector3(x, y, z);

  // ---------- texturas ----------
  function foliageTex(base, dark, veins) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      x.fillStyle = `rgba(${Math.random() < .5 ? dark : '255,255,255'},${Math.random() * .12})`;
      x.beginPath(); x.ellipse(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 7, 1 + Math.random() * 4, Math.random() * 3, 0, 7); x.fill();
    }
    if (veins) {
      x.strokeStyle = 'rgba(20,42,20,.35)'; x.lineWidth = 1.4;
      for (let i = 0; i < 26; i++) {
        const px = Math.random() * 128, py = Math.random() * 128;
        x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + R2(-16, 16), py + R2(-16, 16), px + R2(-26, 26), py + R2(-26, 26)); x.stroke();
      }
    }
    return tex(c, 1, 1);
  }
  const barkTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#6a4a33'; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 420; i++) {
      const v = R2(-18, 30) | 0;
      x.fillStyle = `rgba(${90 + v},${64 + v * .8},${44 + v * .6},${R2(.15, .5)})`;
      x.fillRect(Math.random() * 64, Math.random() * 128, R2(1, 4), R2(8, 40));
    }
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(38,26,18,${R2(.1, .35)})`; x.fillRect(Math.random() * 64, Math.random() * 128, R2(1, 3), R2(6, 22)); }
    return tex(c, 2, 3);
  })();
  const LEAF = foliageTex('#4e9b46', '20,60,24', true);
  const LEAF2 = foliageTex('#3f8a3c', '16,50,20', true);
  const PALM = foliageTex('#5aa04a', '24,64,26', true);
  const BARK = new T.MeshStandardMaterial({ map: barkTex, color: 0xffffff, roughness: .95, metalness: 0 });
  const LEAFM = new T.MeshStandardMaterial({ map: LEAF, color: 0xffffff, roughness: .88, metalness: 0, side: T.DoubleSide });
  const LEAFM2 = new T.MeshStandardMaterial({ map: LEAF2, color: 0xffffff, roughness: .9, metalness: 0, side: T.DoubleSide });
  const PALMM = new T.MeshStandardMaterial({ map: PALM, color: 0xffffff, roughness: .82, metalness: 0, side: T.DoubleSide });

  // ---------- viento en las hojas ----------
  const windMats = [];
  function addWind(mat, amp) {
    mat.userData.amp = amp == null ? 1 : amp;
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = { value: 0 };
      sh.uniforms.uAmp = { value: mat.userData.amp };
      sh.vertexShader = 'uniform float uTime;\nuniform float uAmp;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 iw = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 iw = vec3(0.0);
        #endif
        float h = max(0.0, position.y);
        float s = sin(uTime*1.15 + iw.x*0.31 + iw.z*0.23) + 0.45*sin(uTime*2.3 + iw.z*0.5);
        transformed.x += s * 0.006 * uAmp * h;
        transformed.z += s * 0.004 * uAmp * h;
      `);
      mat.userData.sh = sh;
    };
    windMats.push(mat);
  }
  addWind(LEAFM, 1.1); addWind(LEAFM2, 1.1); addWind(PALMM, 1.6);

  // ---------- geometrias ----------
  const cyl = (rt, rb, h, seg) => new T.CylinderGeometry(rt, rb, h, seg || 8);
  function idx(g) {                     // merge() del juego exige geometria indexada
    if (!g.index) {
      const n = g.attributes.position.count, a = new Uint32Array(n);
      for (let i = 0; i < n; i++) a[i] = i;
      g.setIndex(new T.BufferAttribute(a, 1));
    }
    return g;
  }
  const mg = list => merge(list.map(idx));
  function limb(a, b, r1, r2, seg) {           // segmento entre dos puntos
    const dir = b.clone().sub(a), len = dir.length();
    const g = cyl(r2, r1, len, seg || 6);
    const q = new T.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
    g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(q));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return g;
  }
  const clump = (x, y, z, r, sy, seed) => {
    const g = new T.IcosahedronGeometry(r, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + (Math.sin(i * 12.9898 + seed) * .5 % 1) * .34;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * (sy || 1), p.getZ(i) * k);
    }
    g.computeVertexNormals(); g.translate(x, y, z);
    return g;
  };

  // frondoso: tronco con ramas bifurcadas + copa de racimos
  function broadleaf(seed) {
    const wood = [], leaf = [];
    const h0 = R2(2.4, 3.4);
    wood.push(limb(V3(0, 0, 0), V3(R2(-.2, .2), h0, R2(-.2, .2)), .34, .2, 8));
    const nb = 3 + (Math.random() * 3 | 0);
    for (let i = 0; i < nb; i++) {
      const a = i / nb * Math.PI * 2 + R2(-.4, .4) + seed;
      const lean = R2(.55, 1.05), reach = R2(1.5, 2.6);
      const st = V3(0, h0 * R2(.7, 1), 0);
      const tip = V3(st.x + Math.cos(a) * reach * lean, st.y + reach * .75, st.z + Math.sin(a) * reach * lean);
      wood.push(limb(st, tip, .19, .1, 6));
      // sub-ramas
      for (let k = 0; k < 2; k++) {
        const aa = a + R2(-.9, .9);
        const t2 = V3(tip.x + Math.cos(aa) * R2(.6, 1.3), tip.y + R2(.2, .7), tip.z + Math.sin(aa) * R2(.6, 1.3));
        wood.push(limb(tip, t2, .1, .05, 5));
        leaf.push(clump(t2.x, t2.y + .2, t2.z, R2(.85, 1.35), R2(.7, 1), seed + k));
      }
      leaf.push(clump(tip.x, tip.y + .35, tip.z, R2(1.05, 1.55), R2(.75, 1), seed + i));
    }
    leaf.push(clump(0, h0 + .5, 0, R2(1.2, 1.6), .9, seed + 9));
    return { wood: mg(wood), leaf: mg(leaf) };
  }
  // cipres: tronco recto y copa conica por capas
  function cypress() {
    const wood = [], leaf = [];
    const h0 = R2(1.6, 2.4);
    wood.push(limb(V3(0, 0, 0), V3(0, h0, 0), .26, .17, 7));
    let y = h0, r = R2(1.15, 1.45), h = R2(1.7, 2.3);
    for (let i = 0; i < 4; i++) {
      const g = new T.ConeGeometry(r, h, 9, 1);
      g.translate(0, y + h / 2, 0);
      leaf.push(g);
      y += h * .62; r *= .72; h *= .84;
    }
    return { wood: mg(wood), leaf: mg(leaf) };
  }
  // palmera: tronco curvo en tramos + frondas caidas
  function palmGeo() {
    const wood = [], leaf = [];
    let px = 0, pz = 0, py = 0, r = .34;
    const segs = 6, H = R2(6.5, 9);
    const curve = R2(-.5, .5);
    for (let i = 0; i < segs; i++) {
      const nx = px + curve * (i / segs) * .8, nz = pz + R2(-.12, .12);
      const ny = py + H / segs;
      wood.push(limb(V3(px, py, pz), V3(nx, ny, nz), r, r * .82, 8));
      px = nx; pz = nz; py = ny; r *= .84;
    }
    const nf = 9;
    for (let i = 0; i < nf; i++) {
      const a = i / nf * Math.PI * 2 + R2(-.15, .15);
      const len = R2(2.6, 3.8), droop = R2(.9, 1.6);
      const g = new T.PlaneGeometry(.9, len, 2, 9);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const v = (p.getY(k) + len / 2) / len;           // 0 base -> 1 punta
        const w = Math.sin(Math.min(1, v * 1.15) * PI) * .8 + .12;
        p.setX(k, p.getX(k) * w);
        p.setZ(k, -Math.pow(v, 2.1) * droop);            // la fronda cae
        p.setY(k, p.getY(k));
      }
      g.computeVertexNormals();
      g.rotateX(-PI / 2 + R2(.1, .42));
      g.rotateY(a);
      g.translate(px, py, pz);
      leaf.push(g);
    }
    for (let i = 0; i < 3; i++) {
      const c = new T.SphereGeometry(.16, 6, 5);
      c.translate(px + R2(-.2, .2), py - .1, pz + R2(-.2, .2));
      wood.push(c);
    }
    return { wood: mg(wood), leaf: mg(leaf) };
  }
  // arbusto
  function bushGeo() {
    const g = [];
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1;
      g.push(clump(Math.cos(a) * .35, .35 + i * .1, Math.sin(a) * .35, R2(.5, .8), .8, i * 3));
    }
    return { wood: null, leaf: mg(g) };
  }

  // ---------- colocacion ----------
  const free = (x, z, pad, ignorePalms) => {
    for (const b of boxes) if (Math.abs(x - b.x) < b.hw + pad && Math.abs(z - b.z) < b.hd + pad) return false;
    if (!ignorePalms) for (const p of palms) if (Math.abs(x - p[0]) < 2.2 && Math.abs(z - p[1]) < 2.2) return false;
    for (let k = -H; k <= H; k++) {
      if (Math.abs(x - k * CELL) < R / 2 + 2.4) return false;
      if (Math.abs(z - k * CELL) < R / 2 + 2.4) return false;
    }
    return true;
  };
  const lists = { broad: [], cyp: [], palm: [], bush: [] };
  const zoneAt = (x, z) => { try { return zoneOf(x, z); } catch (e) { return 1; } };

  // 1) palmeras existentes -> las reconstruimos con mejor geometria
  const oldPalmSpots = [];
  try { palms.forEach(p => oldPalmSpots.push([p[0], p[1]])); } catch (e) { }
  // 2) avenida de palmeras: districts.js ya las anade a 'palms' (ahora si se instancian aqui)
  try { for (let z = -380; z <= 380; z += 40) if (Math.abs(z) > 62) oldPalmSpots.push([EXT + 34, z]); } catch (e) { }
  oldPalmSpots.forEach(p => { if (free(p[0], p[1], 1.5, true)) lists.palm.push(p); });

  // 3) parque central: arboles densos conPaths
  try {
    const px = park.x, pz = park.z;
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2, r = R2(6, 26);
      const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      if (!free(x, z, 3)) continue;
      (Math.random() < .72 ? lists.broad : lists.cyp).push([x, z]);
    }
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, r = R2(4, 27);
      const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      if (free(x, z, 1.4)) lists.bush.push([x, z]);
    }
  } catch (e) { }

  // 4) arbolado de calle en manzanas (bordes de acera) por zona
  try {
    for (const sl of slabL) {
      const cx = sl[0], cz = sl[1], zn = zoneAt(cx, cz);
      const isPark = (cx === park.x && cz === park.z);
      if (isPark) continue;
      const dens = [0, .18, .55, .5, .34, .62][zn] || .3;   // industrial baja, ruinas alta
      for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (Math.random() > dens) continue;
        const x = cx + ox * (B / 2 - 3.2), z = cz + oz * (B / 2 - 3.2);
        if (!free(x, z, 2.6)) continue;
        if (zn === 5) { lists.bush.push([x + R2(-3, 3), z + R2(-3, 3)]); if (Math.random() < .5) lists.broad.push([x, z]); continue; }
        if (zn === 0) { if (Math.random() < .5) lists.bush.push([x, z]); else lists.cyp.push([x, z]); continue; }
        if (zn === 3 && Math.random() < .45) lists.palm.push([x, z]);
        else if (Math.random() < .22) lists.cyp.push([x, z]);
        else lists.broad.push([x, z]);
      }
      // setos y matorral en、德国
      if (zn === 2 || zn === 4) {
        for (let i = 0; i < 3; i++) {
          const x = cx + R2(-24, 24), z = cz + R2(-24, 24);
          if (free(x, z, 1.6) && Math.random() < .5) lists.bush.push([x, z]);
        }
      }
    }
  } catch (e) { NC.log('vegetacion: arbolado urbano', e); }

  // ---------- montaje instanciado ----------
  const D = new T.Object3D();
  function build(list, geoFn, matW, matL, colFn, name) {
    if (!list.length) return;
    const variants = [geoFn(), geoFn(), geoFn()];
    const buckets = [[], [], []];
    list.forEach((p, i) => buckets[i % 3].push(p));
    buckets.forEach((b, vi) => {
      if (!b.length) return;
      const g = variants[vi];
      const wood = g.wood ? new T.InstancedMesh(g.wood, matW, b.length) : null;
      const leaf = new T.InstancedMesh(g.leaf, matL, b.length);
      b.forEach((p, i) => {
        const s = R2(.82, 1.32);
        D.position.set(p[0], 0, p[1]);
        D.rotation.set(0, Math.random() * Math.PI * 2, 0);
        D.scale.set(s * R2(.9, 1.1), s, s * R2(.9, 1.1));
        D.updateMatrix();
        if (wood) { wood.setMatrixAt(i, D.matrix); if (colFn) wood.setColorAt(i, colFn(0, s)); }
        leaf.setMatrixAt(i, D.matrix);
        if (colFn) leaf.setColorAt(i, colFn(1, s));
      });
      [wood, leaf].forEach(m => {
        if (!m) return;
        m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
        scene.add(m);
      });
      if (wood && wood.instanceColor) wood.instanceColor.needsUpdate = true;
      if (leaf.instanceColor) leaf.instanceColor.needsUpdate = true;
    });
    NC.log('vegetacion: ' + name + ' ' + list.length);
  }
  const tint = (base, v) => new T.Color(base).offsetHSL(0, R2(-.08, .08), R2(-.08, .06));
  build(lists.broad, broadleaf, BARK, LEAFM, (kind) => kind ? tint('#8fd07a', 0) : tint('#a08464', 0), 'frondosos');
  build(lists.cyp, cypress, BARK, LEAFM2, (kind) => kind ? tint('#7fc06a', 0) : tint('#9c8262', 0), 'cipreses');
  build(lists.palm, palmGeo, BARK, PALMM, (kind) => kind ? tint('#9ad878', 0) : tint('#b09070', 0), 'palmeras');
  build(lists.bush, bushGeo, BARK, LEAFM2, (kind) => kind ? tint('#79b866', 0) : null, 'arbustos');

  // ---------- apagar las palmeras antiguas (geometria pobre) ----------
  try {
    scene.traverse(o => {
      if (!o.isInstancedMesh || !o.geometry || !o.geometry.parameters) return;
      const p = o.geometry.parameters;
      // tronco viejo: cilindro .22/.44 x 8   ·  frondas: plano 1x10
      if (p.radiusTop === .22 && p.radiusBottom === .44 && p.height === 8) o.visible = false;
      if (p.widthSegments === 1 && p.heightSegments === 10 && p.width === 1) o.visible = false;
    });
  } catch (e) { }

  // ---------- viento animado ----------
  NC.hooks.post.push(dt => {
    for (const m of windMats) {
      const sh = m.userData.sh;
      if (sh && sh.uniforms && sh.uniforms.uTime) sh.uniforms.uTime.value = (sh.uniforms.uTime.value + dt * 1.1) % 1000;
    }
  });
})();
