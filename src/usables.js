/* Neon Coast - construcciones utiles: kioscos/tiendas con productos visibles y vista previa al pasar el cursor */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  NC.log('usables: productos y kioscos');

  NC.css(`
  #nchov{position:absolute;display:none;z-index:4;pointer-events:none;background:var(--glass);border:1px solid #27e6ff66;border-radius:10px;padding:5px 9px;font-size:12px;color:var(--ink);white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.4);transform:translate(-50%,-115%)}
  #nchov .ic{font-size:15px;margin-right:4px}
  #nchov .pr{color:#ffd24a;font-weight:700;margin-left:4px}
  `);
  document.body.insertAdjacentHTML('beforeend', '<div id="nchov"></div>');
  const hov = document.getElementById('nchov');

  const PROD = []; // objects {mesh, shopIdx, gi}
  const EMO = ['🏏', '🔫', '🧨', '📦', '📦', '📦', '🩹', '🩹', '🦺', '🔧', '⚙️', '🎨', '☕', '🎨', '🚬', '🏠'];
  const Y0 = .35; // tope de la acera (losa)
  const BASE_SHOPS = shops.length; // las tiendas originales (los kioscos se anaden despues)

  function emojiSprite(ch) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.font = '44px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 32, 34);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    return t;
  }

  // estante con productos visibles encima de una tarima en y
  function shelf(cx, yBase, cz, shopIdx, idxs) {
    idxs.forEach((gi, k) => {
      if (gi === undefined || !SHOP[gi]) return;
      const off = (k - (idxs.length - 1) / 2) * .68;
      const box = new THREE.Mesh(new THREE.BoxGeometry(.38, .34, .3), new THREE.MeshStandardMaterial({
        color: pick([0xd8d3e8, 0xe8d9c2, 0xcfe8dd, 0xe8cfd9]), roughness: .6, emissive: 0x1a1420, emissiveIntensity: .4
      }));
      box.position.set(cx + off, yBase + .17, cz);
      box.castShadow = true;
      const icon = new THREE.Mesh(new THREE.PlaneGeometry(.3, .3), new THREE.MeshBasicMaterial({ map: emojiSprite(EMO[gi] || '🛒'), transparent: true, fog: false }));
      icon.position.set(cx + off, yBase + .42, cz);
      scene.add(box, icon);
      PROD.push({ mesh: box, shopIdx, gi });
      PROD.push({ mesh: icon, shopIdx, gi });
    });
  }

  // ================= KIOSCOS NUEVOS =================
  const KIOSKS = [
    { t: 'Kiosco Costa', c: 0x27e6ff, stock: [13, 12, 14, 6, 0] },
    { t: 'Fruteria Marina', c: 0x2ee08a, stock: [15, 12, 14, 6, 8] },
    { t: 'Bufeteria del Club', c: 0xffd24a, stock: [12, 14, 13, 5, 6] },
    { t: 'Recambios Auto', c: 0xff8a3a, stock: [9, 10, 11, 8, 4] },
    { t: 'Panaderia Neon', c: 0xc9ced6, stock: [12, 13, 6, 14, 8] },
    { t: 'Quiosque del Mar', c: 0x3a7aff, stock: [14, 12, 13, 6, 8] },
    { t: 'Mercadillo', c: 0x8a5cff, stock: [0, 13, 12, 8, 3] }
  ];
  let kdone = 0;
  slabL.forEach((p) => {
    if (kdone >= KIOSKS.length) return;
    for (const [sx, sz] of [[-15, 15], [15, 15], [-15, -15], [15, -15]]) {
      const x = p[0] + sx, z = p[1] + sz;
      if (Math.hypot(x - park.x, z - park.z) < 27) continue;
      let free = true;
      for (const b of boxes) { if (Math.hypot(b.x - x, b.z - z) < 13.5) { free = false; break; } }
      if (!free) continue;
      if (shops.some(s => Math.hypot(s.x - x, s.z - z) < 18)) continue;
      if (carShops.some(s => Math.hypot(s.x - x, s.z - z) < 24)) continue;
      if (hotels.some(s => Math.hypot(s.x - x, s.z - z) < 24)) continue;
      if (bars.some(s => Math.hypot(s.x - x, s.z - z) < 20)) continue;
      buildKiosk(x, z, KIOSKS[kdone++]);
      break;
    }
  });

  function buildKiosk(x, z, K) {
    const E = (g, m, y, zz) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(...g), m);
      o.position.set(x, y, zz); o.castShadow = true; o.receiveShadow = true;
      scene.add(o); return o;
    };
    const wm = new THREE.MeshStandardMaterial({ color: 0x4a4436, roughness: .8 });
    // caseta abierta hacia la calle (losa base .35)
    E([5.6, 2.6, .3], wm, Y0 + 1.3, z - 1.9);          // trasera
    E([.3, 2.6, 4.2], wm, Y0 + 1.3, x - 2.8);          // lateral izq
    E([.3, 2.6, 4.2], wm, Y0 + 1.3, x + 2.8);          // lateral der
    E([5.6, .35, 4.6], new THREE.MeshStandardMaterial({ color: 0x222633, roughness: .9 }), Y0 + 2.65, z - .05); // tejado
    const aw = new THREE.Mesh(new THREE.BoxGeometry(5.6, .12, 1.8), new THREE.MeshBasicMaterial({ map: awnTex(K.c) }));
    aw.position.set(x, Y0 + 2.45, z + 1.6); scene.add(aw);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .7), new THREE.MeshBasicMaterial({ map: emojiSprite('🏪'), fog: false }));
    sign.position.set(x, Y0 + 2.2, z + 2.05);
    sign.lookAt(x, Y0 + 2.2, z + 10);
    scene.add(sign);
    // mostrador y tarima de exhibicion con productos
    E([4.4, 1.0, .8], new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: .7 }), Y0 + .5, z + .9);
    E([4.6, 1.15, 1.2], new THREE.MeshStandardMaterial({ color: K.c, roughness: .5 }), Y0 + .92, z + 1.35);
    shelf(x, 1.37, z + 1.05, shops.length, K.stock.slice(0, 3));   // sobre el mostrador
    shelf(x, 1.86, z + 1.55, shops.length, K.stock.slice(3));      // sobre la tarima
    // vendedor
    const h = mkHuman(K.c, 0x333344); h.g.position.set(x - 1.6, Y0 + .03, z - 1.2);
    // cajas al fondo: sellan la cabina y la ucharan de almacenaje
    const cm2 = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: .85 });
    [[-2.1, -2.05, .62, Y0 + .31], [2.05, -1.9, .72, Y0 + .36], [-2.05, -1.15, .52, Y0 + .26]].forEach(q => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(q[2], q[2], q[2]), cm2);
      b.position.set(x + q[0], q[3], z + q[1]); b.castShadow = true; scene.add(b);
    });
    shelvesBoxes(x, z);
    // colisiones
    boxes.push({ x: x, z: z - 1.9, hw: 2.8, hd: .35 }, { x: x, z: z + .9, hw: 2.2, hd: .4 }, { x: x - 2.8, z: z, hw: .35, hd: 2.1 }, { x: x + 2.8, z: z, hw: .35, hd: 2.1 });
    boxes.push({ x: x - 2.1, z: z - 2.05, hw: .35, hd: .35 }, { x: x + 2.05, z: z - 1.9, hw: .4, hd: .4 }, { x: x - 2.05, z: z - 1.15, hw: .3, hd: .3 });
    shops.push({ h, x, z: z + 2.3, tx: x - 1.6, tz: z - 1.2, rob: 0, cool: 0, down: 0, shop: 1, name: K.t, type: K.t.split(' ')[0], stock: K.stock.slice(), mult: .95 });
  }

  // estanteria alta del fondo del kiosco con mercancia
  function shelvesBoxes(x, z) {
    const bm = new THREE.MeshStandardMaterial({ color: 0x5a4a36, roughness: .8 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(4.6, .08, .55), bm);
    b.position.set(x, Y0 + 1.62, z - 1.72); b.castShadow = true; scene.add(b);
    for (let i = 0; i < 5; i++) {
      const c = pick([0xd8d3e8, 0xe8d9c2, 0xcfe8dd, 0xe8cfd9]);
      const it = new THREE.Mesh(new THREE.BoxGeometry(.34, .3, .3), new THREE.MeshStandardMaterial({ color: c, roughness: .6 }));
      it.position.set(x - 1.8 + i * .9, Y0 + 1.82, z - 1.72); scene.add(it);
    }
  }

  // ================= PRODUCTOS DENTRO DE LAS TIENDAS EXISTENTES =================
  // mesas pegadas a las paredes laterales: dejan el centro del comercio libre para entrar
  shops.slice(0, BASE_SHOPS).forEach((s, si) => {
    const zT = s.z - 5.5;                       // frente del local, zona publica (s.z-7.6 = centro)
    const mkTable = (xx) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.0, 1.2), new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: .8 }));
      o.position.set(xx, Y0 + .5, zT); o.castShadow = true; o.receiveShadow = true; scene.add(o);
      boxes.push({ x: xx, z: zT, hw: 1.8, hd: .6 });
    };
    const stockA = s.stock.slice(0, 3), stockB = s.stock.length > 3 ? s.stock.slice(3, 6) : s.stock.slice(0, 3);
    mkTable(s.x - 5.6, Y0);
    mkTable(s.x + 5.6, Y0);
    shelf(s.x - 5.6, Y0 + 1.05, zT, si, stockA);
    shelf(s.x + 5.6, Y0 + 1.05, zT, si, stockB);
  });

  // ================= VISTA PREVIA AL PASAR EL CURSOR =================
  const ray = new THREE.Raycaster(); ray.far = 14;
  const center = new THREE.Vector2(0, 0), tv = new THREE.Vector3(), tmpA = new THREE.Vector3();
  let lastKey = '', every = 0, curHit = null;

  NC.hooks.post.push(() => {
    // solo re-proyecta cada pocos cuadros
    if ((every++ % 3)) { if (curHit) draw(curHit); else hovExe(); return; }
    let hit = null;
    try {
      if (running && P.foot && started && PROD.length) {
        ray.setFromCamera(center, camera);
        const objs = PROD.map(p => p.mesh);
        const its = ray.intersectObjects(objs, false);
        if (its.length && its[0].distance < 13) hit = PROD.find(p => p.mesh === its[0].object);
        if (!hit) {
          // permisivo: producto dentro de un cono de ~5 grados alrededor de la mira
          const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
          let best = null, bestDot = .9962;
          for (const p of PROD) {
            const wp = p.mesh.position; if (!wp) continue;
            const to = tmpA.set(wp.x - camera.position.x, wp.y - camera.position.y, wp.z - camera.position.z);
            const dist = to.length(); if (dist > 14 || dist < .4) continue;
            to.divideScalar(dist);
            const dt = to.dot(fwd);
            if (dt > bestDot) { bestDot = dt; best = p; }
          }
          hit = best;
        }
      }
    } catch (e) { }
    curHit = hit;
    if (hit) draw(hit); else hovExe();
  });

  function hovExe() { if (hov.style.display !== 'none') { hov.style.display = 'none'; lastKey = ''; } }

  function draw(hit) {
    try {
      const it = SHOP[hit.gi], s = shops[hit.shopIdx];
      if (!it || !s) { hovExe(); return; }
      const price = shopPrice(s, it);
      tv.copy(hit.mesh.position); tv.y += .45;
      const vp = tv.project(camera);
      const sx = (vp.x * .5 + .5) * innerWidth, sy = (-vp.y * .5 + .5) * innerHeight;
      if (sx < -60 || sx > innerWidth + 60 || sy < -40 || sy > innerHeight + 40) { hovExe(); return; }
      const key = s.name + '|' + hit.gi;
      if (lastKey !== key) {
        hov.innerHTML = `<span class="ic">${EMO[hit.gi] || '🛒'}</span>${it.n}<span class="pr">$${price}</span>`;
        lastKey = key;
        try { beep(430, .04, 'sine', .015); } catch (e) { }
      }
      hov.style.left = Math.round(sx) + 'px';
      hov.style.top = Math.round(sy) + 'px';
      hov.style.display = 'block';
    } catch (e) { hovExe(); }
  }

  NC.log('usables: ' + kdone + ' kioscos y ' + PROD.length + ' productos apuntables');
})();
