/* Neon Coast - comercios completos: registradoras, letreros ABIERTO, interior iluminado,
   estanterias de fondo, posters, neveras y suelo de concesionarios */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  NC.log('shops: ambientando los comercios');

  // ---------- utilidades ----------
  function emj(ch) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.font = '40px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 32, 34);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    return t;
  }
  function labelTex(txt, fg, bg, fs) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = bg || '#10131f'; g.fillRect(0, 0, 256, 64);
    g.strokeStyle = fg || '#3dff9a'; g.lineWidth = 4; g.strokeRect(5, 5, 246, 54);
    g.fillStyle = fg || '#3dff9a'; g.font = 'bold ' + (fs || 30) + 'px sans-serif'; g.textAlign = 'center';
    g.fillText(txt, 128, 42);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = rd.capabilities.getMaxAnisotropy();
    return t;
  }

  // registradora de mostrador
  function cashReg(x, y, z) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(.52, .3, .5), new THREE.MeshStandardMaterial({ color: 0x3a3f4c, roughness: .35, metalness: .5 }));
    base.position.y = .15;
    const draw = new THREE.Mesh(new THREE.BoxGeometry(.5, .12, .4), new THREE.MeshStandardMaterial({ color: 0x8a8f9c, roughness: .4, metalness: .6 }));
    draw.position.set(0, .04, .1);
    const scr = new THREE.Mesh(new THREE.BoxGeometry(.34, .3, .05), new THREE.MeshBasicMaterial({ color: 0x3dff9a }));
    scr.position.set(0, .38, -.16); scr.rotation.x = -.5;
    g.add(base, draw, scr);
    g.position.set(x, y, z); g.castShadow = true;
    scene.add(g);
    return g;
  }

  // lampara de techo + charco de luz de neun
  const lampGeo = new THREE.BoxGeometry(2.4, .1, .55);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6dd });
  function lampMesh(x, z) {
    const L = new THREE.Mesh(lampGeo, lampMat);
    L.position.set(x, 4.05, z);
    // carcasa y tirantes: la luminaria cuelga del techo, no flota como una barra suelta
    const carcasa = new THREE.Mesh(new THREE.BoxGeometry(2.6, .22, .72), new THREE.MeshStandardMaterial({ color: 0x2b3040, roughness: .6, metalness: .3 }));
    carcasa.position.set(x, 4.2, z); carcasa.castShadow = true; scene.add(carcasa);
    for (const sg of [-1, 1]) {
      const tirante = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .5, 6), new THREE.MeshStandardMaterial({ color: 0x2b3040, roughness: .6 }));
      tirante.position.set(x + sg * 1.05, 4.55, z); scene.add(tirante);
    }
    scene.add(L);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 7.4), new THREE.MeshBasicMaterial({
      map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .2
    }));
    pool.rotation.x = -PI / 2; pool.position.set(x, .42, z);
    scene.add(pool);
  }

  // estanteria de fondo con la mercancia sobrante
  function backShelf(x, zc, stock, shopIdx) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a4a36, roughness: .8 });
    const rows = [1.95, 2.52];
    rows.forEach(ry => {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(9.2, .08, .55), wood);
      sh.position.set(x, ry, zc); sh.castShadow = true; scene.add(sh);
    });
    const EMO = ['🏏', '🔫', '🧨', '📦', '📦', '📦', '🩹', '🩹', '🦺', '🔧', '⚙️', '🎨', '☕', '🎨', '🚬', '🏠'];
    const rest = stock.slice(6).concat(stock.slice(0, 2));
    rest.slice(0, 6).forEach((gi, k) => {
      if (gi === undefined || !SHOP[gi] || shopIdx === undefined) return;
      const off = (k - 2.5) * 1.35;
      const ry = rows[k % 2] + .27;
      const bx = new THREE.Mesh(new THREE.BoxGeometry(.42, .38, .34), new THREE.MeshStandardMaterial({ color: pick([0xd8d3e8, 0xe8d9c2, 0xcfe8dd, 0xe8cfd9]), roughness: .6 }));
      bx.position.set(x + off, ry, zc); bx.castShadow = true; scene.add(bx);
      const ic = new THREE.Mesh(new THREE.PlaneGeometry(.32, .32), new THREE.MeshBasicMaterial({ map: emj(EMO[gi] || '🛒'), transparent: true }));
      ic.position.set(x + off, ry, zc + .2); scene.add(ic);
      const ic2 = ic.clone(); ic2.rotation.y = PI; ic2.position.z = zc - .2; scene.add(ic2);
    });
    return rows;
  }

  // poster de pared con texto de tienda
  const POSTERS = [['REBAJAS 50%', '#ff5a7a'], ['CERVEZA FRÍA', '#27e6ff'], ['ABIERTO 24H', '#3dff9a'], ['NEON SPORT', '#ffd24a'], ['PIZZA ARTESANA', '#ff8a3a'], ['SURF & SUN', '#8a5cff']];
  function poster(x, y, z, rotY, i) {
    const q = document.createElement('canvas'); q.width = 128; q.height = 88;
    const g = q.getContext('2d');
    const col = POSTERS[i % POSTERS.length][1];
    g.fillStyle = '#f2ede2'; g.fillRect(0, 0, 128, 88);
    g.fillStyle = col; g.fillRect(6, 6, 116, 34);
    g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center';
    g.fillText(POSTERS[i % POSTERS.length][0], 64, 29);
    g.fillStyle = '#222'; g.font = '11px sans-serif';
    g.fillText('NEON COAST · TEMPORADA', 64, 58);
    g.strokeStyle = '#22222a'; g.lineWidth = 3; g.strokeRect(3, 3, 122, 82);
    const t = new THREE.CanvasTexture(q); t.encoding = THREE.sRGBEncoding;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.3), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(x, y, z); m.rotation.y = rotY; scene.add(m);
  }

  // nevera de bebidas
  function fridge(x, zc) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.3, .8), new THREE.MeshStandardMaterial({ color: 0xe8e8ee, roughness: .25, metalness: .55 }));
    body.position.set(x, YS_F + 1.15, zc); body.castShadow = true;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 1.7), new THREE.MeshStandardMaterial({ color: 0x8fd1ff, roughness: .05, metalness: .4, transparent: true, opacity: .55 }));
    glass.position.set(x, YS_F + 1.25, zc + .42);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, .22, .04), new THREE.MeshBasicMaterial({ color: 0xff5a7a }));
    strip.position.set(x, YS_F + 2.15, zc + .43);
    scene.add(body, glass, strip);
    boxes.push({ x, z: zc, hw: .78, hd: .45 });
  }

  let YS_F = .39; // suelo Interior de las tiendas base (losa .35 + tarima)

  // letrero ABIERTO colgado en la entrada
  const ABT = labelTex('ABIERTO', '#3dff9a', '#10131f');
  function openSign(x, z, y) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .5), new THREE.MeshBasicMaterial({ map: ABT, transparent: false }));
    m.position.set(x, y, z); scene.add(m);
    NC.hooks.post.push(() => {
      const nit = (WX.t > .8 || WX.t < .18) ? 1 : 0;
      try { m.material.color.setHex(nit ? (frame % 400 < 340 ? 0x2d5a44 : 0x183025) : 0xffffff); } catch (e) { }
    });
    return m;
  }

  // ---------- 1) tiendas base ----------
  const L = [], PO = [], SIGS = [];
  shops.forEach((s, si) => {
    if (s.floor) {
      const zc = s.z - 7.6;
      // dependiente elevado al nivel del suelo interior
      s.h.g.position.y = .38;
      // registradora sobre el mostrador (top del mostrador ~1.45)
      cashReg(s.x + 2.9, 1.45, zc - 1);
      // lamparas y charcos de luz
      lampMesh(s.x - 2.4, zc - 2.4); lampMesh(s.x + 2.4, zc + 2.2);
      // letrero ABIERTO dentro del vano
      openSign(s.x - 4.9, zc + 5.42, 2.15);
      // estanteria trasera con articulos extra del stock
      backShelf(s.x, zc - 5.05, s.stock, si);
      // posters en las paredes laterales
      poster(s.x - 7.15, 2.2, zc + 2.6, PI / 2, si);
      poster(s.x + 7.15, 2.2, zc + .4, -PI / 2, si + 3);
      // nevera en Súper y General
      if (s.type == 'Super' || s.type == 'General') fridge(s.x - 6.3, zc - 3.4);
    } else {
      // kioscos: dependiente sobre la acera y registradora de mostrador
      s.h.g.position.y = Math.max(.35, Math.max(0, gh(s.tx || s.x, s.tz || s.z))) + .03;
      cashReg(s.x + 1.5, 1.37, s.z - 1.4);
    }
  });

  // recuperar altura del suelo para las neveras (interior de tiendas base)
  YS_F = .39;

  // ---------- 2) concesionarios ----------
  const tile = document.createElement('canvas'); tile.width = tile.height = 64;
  { const g = tile.getContext('2d');
    g.fillStyle = '#8089a0'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#6d7590'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
    for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(0,0,0,' + (Math.random() * .07) + ')'; g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 3, 2); }
  }
  const tileT = new THREE.CanvasTexture(tile); tileT.encoding = THREE.sRGBEncoding;
  tileT.wrapS = tileT.wrapT = THREE.RepeatWrapping; tileT.repeat.set(6, 4);

  carShops.forEach((cs, k) => {
    const cx = cs.x - 5, fz = cs.z - 2, cz = fz - 7;   // centro del pabellon
    // suelo de damero pulido
    const fl = new THREE.Mesh(new THREE.BoxGeometry(20.4, .22, 13.4), new THREE.MeshStandardMaterial({ map: tileT, roughness: .25, metalness: .35 }));
    fl.position.set(cx, .12, cz); fl.receiveShadow = true; scene.add(fl);
    // franjas de luz en el techo
    [-4, 0, 4].forEach(ox => {
      const st = new THREE.Mesh(new THREE.BoxGeometry(15, .12, .8), lampMat);
      st.position.set(cx, 5.9, cz + ox); scene.add(st);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(17, 14), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .16 }));
      pool.rotation.x = -PI / 2; pool.position.set(cx, .25, cz + ox); scene.add(pool);
    });
    // cartel luminoso VENTAS en la fachada
    const vs = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: labelTex('VENTAS', '#27e6ff', '#0f1a2a', 44) }));
    vs.position.set(cx, 4.6, fz - .25); vs.rotation.y = PI; scene.add(vs);
    // escritorio con registradora junto al vendedor
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, 1.0), new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: .8 }));
    desk.position.set(cs.x - 2.2, .5, cs.z + .4); desk.castShadow = true; desk.receiveShadow = true; scene.add(desk);
    cashReg(cs.x - 2.2, 1.02, cs.z + .4);
    boxes.push({ x: cs.x - 2.2, z: cs.z + .4, hw: .85, hd: .5 });
    // encargado registrado para apuntar / atropellar / saludar
    cs.tx = cs.x; cs.tz = cs.z;
    const gy = Math.max(0, gh(cs.x, cs.z));
    cs.h.g.position.y = gy + .02;
    // palmeras de las puertas? bandeira: pilastres neon en la fachada
    [-8, 8].forEach(ox => {
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, 6, 8), new THREE.MeshBasicMaterial({ color: k == 1 ? 0xff8a3a : 0x27e6ff }));
      pil.position.set(cx + ox, 3, fz - .4); scene.add(pil);
    });
  });

  // arreglo: la registradora de los kioscos necesita la referencia del contador (correccion de altura)
  shops.forEach(s => {
    if (!s.floor && s.tx !== undefined) s.h.g.position.y = Math.max(.35, Math.max(0, gh(s.tx, s.tz))) + .03;
  });

  NC.log('shops: ' + shops.length + ' comercios ambientados · ' + carShops.length + ' concesionarios');
})();
