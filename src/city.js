/* Neon Coast - city.js
   Edificios terminados (azotea, parapeto, aire acondicionado, balcones, portales),
   tipologias de manzana (plaza / aparcamiento), mobiliario urbano con variacion,
   ruinas del barrio abandonado y vegetacion con volumen.                        */
(function () {
  'use strict';
  const NC = window.NC;
  if (!NC || !window.THREE) return;
  const T = THREE;
  const bl = BLD, pl = PLAZAS, bx = boxes, bls = slabL;
  const CELLv = CELL, Rv = R, Hv = H;

  /* ---------------- texturas propias ---------------- */
  function mkc(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  function mkt(c, rx, ry, lin) {
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    t.encoding = lin ? T.LinearEncoding : T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  const tarC = mkc(128, 128, (x) => {
    x.fillStyle = '#2f2b2c'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2600; i++) { const v = 40 + Math.random() * 70 | 0; x.fillStyle = `rgba(${v},${v - 4},${v - 8},${.25 + Math.random() * .5})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(0, i * 32); x.lineTo(128, i * 32); x.stroke(); }
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(90,80,70,${.05 + Math.random() * .12})`; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, 6 + Math.random() * 22, 0, 7); x.fill(); }
  });
  const concC = mkc(128, 128, (x) => {
    x.fillStyle = '#9a958c'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { const v = 120 + Math.random() * 70 | 0; x.fillStyle = `rgba(${v},${v - 4},${v - 12},${.1 + Math.random() * .3})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 3); }
    for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(60,55,48,${.04 + Math.random() * .1})`; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, 8 + Math.random() * 26, 0, 7); x.fill(); }
  });
  const paveC = mkc(128, 128, (x) => {
    x.fillStyle = '#5f5c6b'; x.fillRect(0, 0, 128, 128);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const v = (Math.random() - .5) * 22;
      x.fillStyle = `rgb(${99 + v | 0},${95 + v | 0},${110 + v | 0})`;
      x.fillRect(i * 32 + 1, j * 32 + 1, 30, 30);
    }
    x.strokeStyle = 'rgba(0,0,0,.42)'; x.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 128); x.moveTo(0, i * 32); x.lineTo(128, i * 32); x.stroke(); }
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(40,36,44,${.04 + Math.random() * .1})`; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 14, 0, 7); x.fill(); }
  });
  const barkC = mkc(64, 128, (x) => {
    x.fillStyle = '#6b4d34'; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 260; i++) { const v = Math.random() * 60 | 0; x.fillStyle = `rgba(${60 + v},${40 + v * .7},${24 + v * .5},${.25 + Math.random() * .4})`; x.fillRect(Math.random() * 64, 0, 1 + Math.random() * 3, 10 + Math.random() * 40); }
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(30,22,16,${.15 + Math.random() * .3})`; x.fillRect(Math.random() * 64, Math.random() * 128, 1 + Math.random() * 2, 6 + Math.random() * 26); }
  });
  const rustC = mkc(128, 128, (x) => {
    x.fillStyle = '#6d6a63'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i++) { const r = Math.random() * 60 | 0; x.fillStyle = `rgba(${120 + r},${70 + r * .6},${38 + r * .3},${.06 + Math.random() * .28})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 6, 1 + Math.random() * 4); }
    for (let i = 0; i < 24; i++) { x.fillStyle = `rgba(0,0,0,${.05 + Math.random() * .16})`; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 16, 0, 7); x.fill(); }
  });

  const MAT = {
    tar: new T.MeshStandardMaterial({ map: mkt(tarC, 4, 4), roughness: .95, metalness: .02 }),
    conc: new T.MeshStandardMaterial({ map: mkt(concC, 2, 2), roughness: .92, metalness: .02 }),
    pave: new T.MeshStandardMaterial({ map: mkt(paveC, 5, 5), roughness: .9, metalness: .02 }),
    rust: new T.MeshStandardMaterial({ map: mkt(rustC, 2, 2), roughness: .88, metalness: .12 }),
    metal: new T.MeshStandardMaterial({ color: 0x4d525c, roughness: .45, metalness: .72 }),
    alu: new T.MeshStandardMaterial({ color: 0xa8adb6, roughness: .52, metalness: .45 }),
    glass: new T.MeshStandardMaterial({ color: 0x16222e, roughness: .08, metalness: .25, transparent: true, opacity: .72 })
  };

  /* ---------------- acumuladores ---------------- */
  const G = { tar: [], conc: [], pave: [], rust: [], metal: [], alu: [], glass: [], paint: [] };
  const box = (w, h, d, x, y, z) => new T.BoxGeometry(w, h, d).translate(x, y, z);
  const cyl = (rt, rb, h, x, y, z, s) => new T.CylinderGeometry(rt, rb, h, s || 10).translate(x, y, z);
  const add = (k, g) => G[k].push(g);
  const pc = (g, c) => G.paint.push({ g: g, c: c });
  const rnum = (a, b) => a + Math.random() * (b - a);
  const GREY = 0x7d7a74, WOOD = 0x6b4a32, LEAF = 0x2f7a3a, RED = 0xb03a2e, BLUE = 0x2f5f9a, SAND = 0xb9a97f;

  /* ---------------- edificios terminados ---------------- */
  bl.forEach(b => {
    const roofY = b.h + 1.25;
    const ruined = b.zn === 5;
    if (!ruined) {
      add('tar', box(b.w + 1.2, .18, b.d + 1.2, b.x, roofY + .09, b.z));
      const t = .3, hh = .8;
      add('conc', box(b.w + 1.2, hh, t, b.x, roofY + .45, b.z + (b.d + 1.2) / 2 - t / 2));
      add('conc', box(b.w + 1.2, hh, t, b.x, roofY + .45, b.z - (b.d + 1.2) / 2 + t / 2));
      add('conc', box(t, hh, b.d + 1.2, b.x - (b.w + 1.2) / 2 + t / 2, roofY + .45, b.z));
      add('conc', box(t, hh, b.d + 1.2, b.x + (b.w + 1.2) / 2 - t / 2, roofY + .45, b.z));
    }
    const nAC = ruined ? 0 : 1 + (Math.random() * 3 | 0);
    for (let i = 0; i < nAC; i++) {
      const y = 2.8 + Math.random() * Math.max(1, b.h - 4.5);
      const off = (Math.random() - .5) * b.w * .6, s = .5 + Math.random() * .3;
      add('alu', box(s * 1.7, s, s, b.x + off, y, b.z + b.d / 2 + .32));
      add('metal', box(s * 1.8, .07, s * 1.2, b.x + off, y - s / 2 - .05, b.z + b.d / 2 + .26));
    }
    if (!ruined && Math.random() < .28) {
      const tx = b.x + (Math.random() - .5) * b.w * .5, tz = b.z + (Math.random() - .5) * b.d * .5;
      add('rust', cyl(.85, .85, 1.3, tx, roofY + 1.35, tz, 12));
      add('metal', cyl(.9, .9, .1, tx, roofY + .7, tz, 12));
      for (const ox of [-.55, .55]) for (const oz of [-.55, .55]) add('metal', box(.09, .8, .09, tx + ox, roofY + .4, tz + oz));
    }
    if ((b.zn === 2 || b.zn === 3) && b.h < 18 && !ruined && Math.random() < .4) {
      const floors = Math.min(3, Math.floor((b.h - 2) / 4));
      for (let f = 1; f <= floors; f++) {
        const y = 1.75 + f * 4, fw = b.w * .55, fz = b.z + b.d / 2;
        add('conc', box(fw, .16, 1.3, b.x, y, fz + .65));
        for (let k = 0; k < 3; k++) add('metal', box(fw, .05, .05, b.x, y + .35 + k * .28, fz + 1.26));
        for (const sx of [-1, 1]) add('metal', box(.06, .95, .06, b.x + sx * fw / 2, y + .5, fz + 1.26));
      }
    }
    if (!ruined) {
      const ex = b.x + (Math.random() - .5) * b.w * .45, fz = b.z + b.d / 2, base = 1.75;
      add('conc', box(.5, 3.2, .5, ex - 1.6, base + 1.6, fz + .35));
      add('conc', box(.5, 3.2, .5, ex + 1.6, base + 1.6, fz + .35));
      add('conc', box(4.2, .4, .8, ex, base + 3.4, fz + .4));
      add('conc', box(4.6, .2, 1.6, ex, base + 3.7, fz + .8));
      add('glass', box(2.5, 2.6, .1, ex, base + 1.3, fz + .1));
      add('metal', box(2.7, .1, .16, ex, base + 2.6, fz + .1));
      add('conc', box(3.2, .14, 1.1, ex, .42, fz + .55));
    }
    if (ruined) {
      for (let i = 0; i < 5; i++) {
        const rx = b.x + (Math.random() - .5) * b.w, rz = b.z + (Math.random() - .5) * b.d;
        const g = new T.BoxGeometry(rnum(.4, 1.3), rnum(.25, .8), rnum(.4, 1.3));
        g.rotateY(Math.random() * 3); g.rotateX(rnum(-.3, .3)); g.translate(rx, rnum(.2, .5), rz);
        add('rust', g);
      }
      for (let i = 0; i < 3; i++) {
        const rx = b.x + (Math.random() - .5) * b.w, rz = b.z + b.d / 2 + rnum(.6, 1.6);
        add('rust', box(rnum(1.2, 3.4), rnum(.5, 1.6), .35, rx, rnum(.4, .9), rz));
      }
    }
  });

  /* ---------------- plazas y aparcamientos ---------------- */
  pl.forEach(p => {
    const cx = p[0], cz = p[1], tipo = p[2];
    if (tipo === 'plaza') {
      add('pave', box(26, .12, 26, cx, .41, cz));
      add('conc', cyl(3.3, 3.5, .8, cx, .8, cz, 20));
      add('glass', cyl(2.9, 2.9, .08, cx, 1.18, cz, 20));
      add('conc', cyl(.45, .6, 1.7, cx, 1.9, cz, 12));
      add('conc', cyl(1.2, .5, .28, cx, 2.8, cz, 16));
      for (let i = 0; i < 4; i++) {
        const a = i * PI / 2 + .4, bx2 = cx + Math.cos(a) * 7.4, bz = cz + Math.sin(a) * 7.4;
        pc(box(1.8, .12, .55, bx2, .58, bz), WOOD);
        pc(box(1.8, .5, .1, bx2, .85, bz + .25), WOOD);
        add('metal', box(.1, .5, .5, bx2 - .75, .3, bz));
        add('metal', box(.1, .5, .5, bx2 + .75, .3, bz));
        add('conc', box(1.3, .45, 1.3, cx + Math.cos(a + .5) * 10.5, .6, cz + Math.sin(a + .5) * 10.5));
        pc(new T.SphereGeometry(.8, 8, 6).scale(1, .8, 1).translate(cx + Math.cos(a + .5) * 10.5, 1.2, cz + Math.sin(a + .5) * 10.5), LEAF);
      }
    } else if (tipo === 'aparcamiento') {
      add('tar', box(26, .1, 26, cx, .39, cz));
      for (let i = -3; i <= 3; i++) {
        pc(box(.14, .02, 5, cx + i * 3.4, .45, cz - 7), 0xd8d4c8);
        pc(box(.14, .02, 5, cx + i * 3.4, .45, cz + 7), 0xd8d4c8);
      }
      for (let i = 0; i < 6; i++) {
        const cx2 = cx + (Math.random() - .5) * 20, cz2 = cz + (Math.random() < .5 ? -7 : 7);
        const col = [0x2f4f8f, 0x8f2f2f, 0x2f6f3f, 0xd8d2c0, 0x3a3a44, 0x7a6a2f][(Math.random() * 6) | 0];
        pc(box(1.9, .6, 4.3, cx2, .75, cz2), col);
        add('glass', box(1.6, .5, 2, cx2, 1.28, cz2));
      }
      for (let i = 0; i < 4; i++) add('rust', box(2.4, .6, 1.2, cx - 10 + i * 7, .72, cz + 11));
    }
  });

  /* ---------------- mobiliario urbano con variacion ---------------- */
  const collides = (x, z, pad) => {
    for (const b of bx) if (Math.abs(x - b.x) < b.hw + (pad || 1) && Math.abs(z - b.z) < b.hd + (pad || 1)) return true;
    return false;
  };
  bls.forEach(bc => {
    const cx = bc[0], cz = bc[1];
    const zn = (typeof zoneOf === 'function') ? zoneOf(cx, cz) : 1;
    if (zn === 5) {
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * PI * 2, r = rnum(6, 13);
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (collides(x, z, 1.5)) continue;
        add('rust', cyl(.22, .3, rnum(2.5, 4.5), x, 2, z, 6));
        for (let k = 0; k < 3; k++) {
          const g = cyl(.08, .13, rnum(1, 2), x, rnum(2.6, 4), z, 5);
          g.rotateZ(rnum(.5, 1.3)); g.rotateY(Math.random() * 3); add('rust', g);
        }
        pc(new T.SphereGeometry(rnum(.7, 1.2), 7, 5).scale(1.3, .7, 1.3).translate(x + rnum(-1.5, 1.5), .5, z + rnum(-1.5, 1.5)), 0x4a6b32);
      }
      return;
    }
    const n = 3 + (Math.random() * 3 | 0);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * PI * 2, r = rnum(10.5, 14);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (collides(x, z, 1.2)) continue;
      const kind = (Math.random() * 10) | 0;
      if (kind < 2) {
        pc(box(1.8, .12, .55, x, .58, z), WOOD);
        pc(box(1.8, .5, .1, x, .85, z + .25), WOOD);
        add('metal', box(.1, .5, .5, x - .75, .3, z));
        add('metal', box(.1, .5, .5, x + .75, .3, z));
      } else if (kind < 3) {
        add('metal', cyl(.28, .26, .85, x, .78, z, 10));
        add('metal', cyl(.32, .32, .07, x, 1.24, z, 10));
      } else if (kind < 4) {
        pc(cyl(.16, .19, .62, x, .66, z, 8), RED);
        const hn = new T.CylinderGeometry(.1, .1, .16, 6); hn.rotateX(PI / 2); hn.translate(x, .82, z + .18); pc(hn, RED);
        add('metal', cyl(.2, .2, .08, x, 1, z, 8));
      } else if (kind < 5) {
        add('conc', box(1.4, .5, 1.4, x, .6, z));
        pc(new T.SphereGeometry(.78, 8, 6).scale(1.15, .85, 1.15).translate(x, 1.15, z), LEAF);
      } else if (kind < 6) {
        add('rust', cyl(.16, .24, rnum(2.6, 3.6), x, 1.6, z, 7));
        pc(new T.SphereGeometry(1.5, 8, 6).scale(1, .85, 1).translate(x, 3.4, z), LEAF);
        pc(new T.SphereGeometry(1.05, 7, 5).scale(1, .8, 1).translate(x + .7, 2.9, z - .5), LEAF);
      } else if (kind < 7) {
        add('metal', cyl(.1, .13, 3.4, x, 1.7, z, 8));
        add('alu', box(1.5, 2.1, .16, x, 3.4, z));
      } else if (kind < 8) {
        add('metal', box(.45, 1.25, .35, x, .95, z));
        pc(box(.5, .3, .4, x, 1.7, z), BLUE);
      } else if (kind < 9) {
        add('rust', box(1.5, 1.1, 1, x, .9, z));
        add('metal', box(1.6, .1, 1.1, x, 1.5, z));
      } else {
        add('rust', box(2.6, 1.6, .12, x, 1.1, z));
        add('rust', box(.12, 1.8, .12, x - 1.3, .9, z));
        add('rust', box(.12, 1.8, .12, x + 1.3, .9, z));
      }
    }
  });

  /* ---------------- semaforos en cruces ---------------- */
  for (let i = -Hv; i < Hv; i++) for (let j = -Hv; j < Hv; j++) {
    if (((i + j) & 1) !== 0) continue;
    for (const sx of [-1, 1]) {
      const x = i * CELLv + sx * (Rv + 1.4), z = j * CELLv + sx * (Rv + 1.4);
      add('metal', cyl(.1, .13, 5.4, x, 2.7, z, 8));
      add('metal', box(.34, 1.15, .3, x, 5.2, z));
      pc(new T.SphereGeometry(.12, 6, 5).translate(x, 5.55, z + .16), 0xd03028);
      pc(new T.SphereGeometry(.12, 6, 5).translate(x, 5.2, z + .16), 0xd8a828);
      pc(new T.SphereGeometry(.12, 6, 5).translate(x, 4.85, z + .16), 0x30c060);
    }
  }

  /* ---------------- montaje ---------------- */
  const MESH = { tar: MAT.tar, conc: MAT.conc, pave: MAT.pave, rust: MAT.rust, metal: MAT.metal, alu: MAT.alu, glass: MAT.glass };
  Object.keys(MESH).forEach(k => {
    if (!G[k].length) return;
    const m = new T.Mesh(merge(G[k]), MESH[k]);
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
  });
  if (G.paint.length) {
    const list = G.paint.map(o => cg(o.g, o.c));
    const m = new T.Mesh(merge(list), new T.MeshStandardMaterial({ vertexColors: true, roughness: .78 }));
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
  }
  NC.log('city: edificios completados, mobiliario urbano y ruinas');
})();
