/* Neon Coast - interiors.js
   Completa los interiores que ya existen en el mapa: tiendas, concesionarios (taller)
   y la nave industrial. Muebles, iluminacion y elementos propios de cada local.   */
(function () {
  'use strict';
  const NC = window.NC;
  if (!NC || !window.THREE) return;
  const T = THREE;
  const sh = (typeof shops !== 'undefined') ? shops : [];
  const cs = (typeof carShops !== 'undefined') ? carShops : [];
  const fac = (typeof FACTORY !== 'undefined') ? FACTORY : null;

  function mkc(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  function mkt(c, rx, ry) {
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  const floorC = mkc(128, 128, (x) => {
    x.fillStyle = '#6e6a72'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) { const v = 90 + Math.random() * 50 | 0; x.fillStyle = `rgba(${v},${v - 4},${v - 2},${.05 + Math.random() * .18})`; x.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 4, 2 + Math.random() * 3); }
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 128); x.moveTo(0, i * 32); x.lineTo(128, i * 32); x.stroke(); }
    for (let i = 0; i < 10; i++) { x.fillStyle = `rgba(20,18,22,${.05 + Math.random() * .12})`; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, 6 + Math.random() * 18, 0, 7); x.fill(); }
  });
  const MAT = {
    floor: new T.MeshStandardMaterial({ map: mkt(floorC, 3, 3), roughness: .9 }),
    metal: new T.MeshStandardMaterial({ color: 0x555b66, roughness: .42, metalness: .7 }),
    dark: new T.MeshStandardMaterial({ color: 0x2c3038, roughness: .7, metalness: .3 }),
    rubber: new T.MeshStandardMaterial({ color: 0x1b1b1f, roughness: .95 }),
    wood: new T.MeshStandardMaterial({ color: 0x8a6742, roughness: .85 }),
    card: new T.MeshStandardMaterial({ color: 0xa8834f, roughness: .95 }),
    red: new T.MeshStandardMaterial({ color: 0xa8402f, roughness: .6 }),
    glass: new T.MeshStandardMaterial({ color: 0x9fd8e8, roughness: .08, metalness: .5, transparent: true, opacity: .32 }),
    lamp: new T.MeshBasicMaterial({ color: 0xfff2d0 }),
    cold: new T.MeshBasicMaterial({ color: 0x9fe8ff })
  };
  const G = { floor: [], metal: [], dark: [], rubber: [], wood: [], card: [], red: [], glass: [], lamp: [], cold: [], paint: [] };
  const box = (w, h, d, x, y, z) => new T.BoxGeometry(w, h, d).translate(x, y, z);
  const cyl = (rt, rb, h, x, y, z, s) => new T.CylinderGeometry(rt, rb, h, s || 12).translate(x, y, z);
  const add = (k, g) => G[k].push(g);
  const pc = (g, c) => G.paint.push({ g: g, c: c });
  const R = (a, b) => a + Math.random() * (b - a);
  const CARCOL = [0x2f4f8f, 0x8f2f2f, 0x2f6f3f, 0xd8d2c0, 0x3a3a44, 0x7a6a2f, 0x8f6f2f];

  /* ---------------- tiendas ---------------- */
  sh.forEach(s => {
    const x = s.x, z = s.z - 7.6, w = 16, d = 12;   // s.z es el punto de interaccion (fuera)
    // estanterias laterales con producto
    for (let side = -1; side <= 1; side += 2) {
      for (let lvl = 0; lvl < 3; lvl++) {
        const y = 1.1 + lvl * .78;
        add('dark', box(.7, .1, 8.4, x + side * 7.2, y, z - .6));
        for (let k = 0; k < 10; k++) {
          const col = CARCOL[(Math.random() * CARCOL.length) | 0];
          pc(box(.5, .42, .5 + Math.random() * .3, x + side * 7.2, y + .27, z - 4.3 + k * .84), col);
        }
      }
      add('dark', box(.8, 3.2, .8, x + side * 7.2, 1.6, z - 4.6));
    }
    // Exposure de producto en el mostrador y caja registradora
    for (let k = 0; k < 6; k++) pc(box(.35, .3, .35, x - 3.2 + k * 1.3, 1.6, z - 1), CARCOL[(Math.random() * CARCOL.length) | 0]);
    add('dark', box(1.1, .6, .8, x + 2.6, 1.75, z - 1.2));
    add('lamp', box(.7, .06, .5, x + 2.6, 2.08, z - 1.2));
    // frigorifico con luz fria
    add('metal', box(1.6, 2.3, 1.1, x - 6.2, 1.15, z - 4.6));
    add('cold', box(1.3, 1.6, .06, x - 6.2, 1.3, z - 4.02));
    // techo con tubos fluorescentes
    add('lamp', box(9, .12, .5, x, 4.55, z - 2.2));
    add('lamp', box(9, .12, .5, x, 4.55, z + 2.4));
    // cartel de promo en la pared del fondo
    pc(box(3.4, 1.5, .08, x + 2.2, 2.9, z - 5.65), 0xff8a3a);
    // puerta de vidrio con marco
    add('metal', box(.18, 3.2, .2, x - 2.1, 1.6, z + 5.85));
    add('metal', box(.18, 3.2, .2, x + 2.1, 1.6, z + 5.85));
    add('metal', box(4.4, .18, .2, x, 3.2, z + 5.85));
  });

  /* ---------------- concesionarios (taller) ---------------- */
  cs.forEach(s => {
    const cx = s.x - 5, cz = s.z - 9;               // centro del taller (la fachada mira a +z)
    // suelo de hormigon con marcado de plaza
    add('floor', box(21, .12, 13, cx, .38, cz));
    for (let i = -1; i <= 1; i += 2) pc(box(.12, .02, 9, cx + i * 3.4, .45, cz), 0xd8d4c8);
    // elevador de dos columnas con coche encima
    add('metal', box(.5, 3.6, .5, cx - 2.4, 1.9, cz - 2.6));
    add('metal', box(.5, 3.6, .5, cx + 2.4, 1.9, cz - 2.6));
    add('metal', box(5.4, .35, 1.2, cx, 3.7, cz - 2.6));
    add('dark', box(1.9, .55, 4.2, cx, 1.05, cz - 2.6));
    pc(box(1.55, .5, 2, cx, 1.55, cz - 2.85), CARCOL[(Math.random() * CARCOL.length) | 0]);
    add('glass', box(1.5, .45, 1.9, cx, 1.5, cz - 2.6));
    // segunda plaza: coche en el suelo
    pc(box(1.9, .6, 4.3, cx + 3.6, .78, cz + 2.2), CARCOL[(Math.random() * CARCOL.length) | 0]);
    add('glass', box(1.6, .5, 2, cx + 3.6, 1.32, cz + 2.0));
    // panel de herramientas en la pared del fondo
    add('dark', box(7, 2.2, .12, cx - 3, 2.2, cz - 6.4));
    for (let i = 0; i < 12; i++) pc(box(.12, .5 + Math.random() * .4, .1, cx - 6 + i * .55, 2.3, cz - 6.3), 0xb0b6c0);
    add('metal', box(6.4, .12, .5, cx - 3, 1.15, cz - 6.2));
    // pilas de neumaticos
    for (let i = 0; i < 3; i++) {
      const tx = cx + 6.4, tz = cz - 4.5 + i * 1.6;
      for (let k = 0; k < 3; k++) add('rubber', cyl(.52, .52, .3, tx, .6 + k * .32, tz, 14));
    }
    // banco de trabajo con tornillo de banco
    add('wood', box(3.4, .12, .9, cx - 6.4, 1.05, cz + 3.4));
    add('metal', box(.14, 1, .8, cx - 7.9, .5, cz + 3.4));
    add('metal', box(.14, 1, .8, cx - 4.9, .5, cz + 3.4));
    add('red', box(.4, .3, .3, cx - 5.6, 1.28, cz + 3.4));
    //bidones y carro de herramientas
    add('red', cyl(.42, .42, 1.1, cx + 7.6, .95, cz + 4.2, 14));
    add('dark', cyl(.42, .42, 1.1, cx + 7.6, .95, cz + 2.6, 14));
    add('metal', box(1.2, .9, .7, cx - 2.6, .85, cz + 5.4));
    add('metal', box(1.3, .1, .8, cx - 2.6, 1.35, cz + 5.4));
    // lamparas de techo
    for (let i = -1; i <= 1; i += 2) add('lamp', box(3.4, .12, .5, cx + i * 4.5, 5.3, cz));
    // porton enrollable medio abierto
    add('metal', box(21, 1.6, .3, cx, 5.1, cz + 6.5));
  });

  /* ---------------- nave industrial ---------------- */
  if (fac) {
    const x = fac.x, z = fac.z;
    add('floor', box(29, .12, 23, x, .36, z));
    // estanterias con cajas
    for (let i = 0; i < 4; i++) {
      const sx = x - 9 + i * 6;
      add('metal', box(4.2, .16, 1.2, sx, 1.1, z - 7));
      add('metal', box(4.2, .16, 1.2, sx, 2.6, z - 7));
      for (let k = 0; k < 4; k++) {
        add('card', box(.9, .8, .95, sx - 1.5 + k * 1.05, 1.6, z - 7));
        if (Math.random() < .7) add('card', box(.9, .8, .95, sx - 1.5 + k * 1.05, 3.1, z - 7));
      }
      add('metal', box(.16, 3.2, .16, sx - 2, 1.6, z - 7.5));
      add('metal', box(.16, 3.2, .16, sx + 2, 1.6, z - 7.5));
    }
    // oficina esquinera con mesa y silla
    add('dark', box(7, 3, .2, x + 8, 1.5, z - 3));
    add('dark', box(.2, 3, 6, x + 11, 1.5, z - 6));
    add('wood', box(2.6, .12, 1.1, x + 9, .95, z - 7.6));
    add('metal', box(.2, .9, .2, x + 9, .45, z - 7.6));
    add('dark', box(.7, .12, .7, x + 8, .8, z - 5.6));
    add('dark', box(.7, .7, .12, x + 8, 1.15, z - 5.2));
    // carretilla elevadora
    add('red', box(1.5, 1.1, 2.2, x - 8, .9, z + 4));
    add('metal', box(.3, 3.4, .3, x - 8.9, 1.7, z + 3.2));
    add('metal', box(.3, 3.4, .3, x - 8.9, 1.7, z + 4.8));
    add('metal', box(1.6, .18, .12, x - 8.5, 3.3, z + 4));
    for (const ox of [-.75, .75]) add('rubber', cyl(.4, .4, .3, x - 8 + ox, .45, z + 4.6, 12));
    // bidones
    for (let i = 0; i < 5; i++) add('red', cyl(.45, .45, 1.1, x + 4 + (i % 3) * 1.1, .95, z + 5 + (i > 2 ? 1.2 : 0), 14));
    // luz cenital
    for (let i = -1; i <= 1; i++) add('lamp', box(4, .14, .5, x + i * 9, 8, z));
  }

  /* ---------------- montaje ---------------- */
  const MM = { floor: MAT.floor, metal: MAT.metal, dark: MAT.dark, rubber: MAT.rubber, wood: MAT.wood, card: MAT.card, red: MAT.red, glass: MAT.glass, lamp: MAT.lamp, cold: MAT.cold };
  Object.keys(MM).forEach(k => {
    if (!G[k].length) return;
    const m = new T.Mesh(merge(G[k]), MM[k]);
    m.castShadow = k !== 'lamp' && k !== 'cold'; m.receiveShadow = true; scene.add(m);
  });
  if (G.paint.length) {
    const m = new T.Mesh(merge(G.paint.map(o => cg(o.g, o.c))), new T.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .12 }));
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
  }
  NC.log('interiors: tiendas, taller y nave completados');
})();
