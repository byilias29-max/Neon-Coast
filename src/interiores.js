/* Neon Coast - interiores: lobby de hotel, consulta medica y detalles de taller.
   Mobiliario con volumen, iluminacion y materiales propios para que los locales
   importantes se.iehen habitados y no sean cajas vacias. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;
  const R2 = (a, b) => a + Math.random() * (b - a);

  // ---------- materiales ----------
  const MAT = {
    madera: new T.MeshStandardMaterial({ color: 0x6a4a32, roughness: .72, metalness: .04 }),
    maderaOsc: new T.MeshStandardMaterial({ color: 0x4a3322, roughness: .8, metalness: .03 }),
    tela: new T.MeshStandardMaterial({ color: 0x2f4a6a, roughness: .95, metalness: 0 }),
    tela2: new T.MeshStandardMaterial({ color: 0x6a3a4a, roughness: .95, metalness: 0 }),
    metal: new T.MeshStandardMaterial({ color: 0xa8adb6, roughness: .4, metalness: .8 }),
    metalOsc: new T.MeshStandardMaterial({ color: 0x555b66, roughness: .55, metalness: .6 }),
    blanco: new T.MeshStandardMaterial({ color: 0xeef1f5, roughness: .5, metalness: .05 }),
    verde: new T.MeshStandardMaterial({ color: 0x3f7a3a, roughness: .85, metalness: 0 }),
    glass: new T.MeshStandardMaterial({ color: 0x9fd8e8, roughness: .08, metalness: .4, transparent: true, opacity: .45 }),
    luz: new T.MeshBasicMaterial({ color: 0xfff2d8 }),
    pared: new T.MeshStandardMaterial({ color: 0xcfc6b4, roughness: .9, metalness: .02 }),
    suelo: new T.MeshStandardMaterial({ color: 0x6a5f52, roughness: .45, metalness: .12 })
  };
  const box = (w, h, d, x, y, z, m, ry) => {
    const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); if (ry) o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true;
    scene.add(o); return o;
  };
  const cyl = (rt, rb, h, x, y, z, m, seg) => {
    const o = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 14), m);
    o.position.set(x, y, z); o.castShadow = true; scene.add(o); return o;
  };

  // ---------- 1) lobby de hotel ----------
  try {
    for (const h of hotels) {
      const x = h.x, z = h.z - 7.6;         // dentro delComprehensive
      // suelo y alfombra
      box(24, .12, 13, x, .42, z, MAT.suelo);
      box(9, .02, 6, x, .5, z + 1, new T.MeshStandardMaterial({ color: 0x3a2a4a, roughness: .95 }));
      // mostrador de recepcion
      box(7, 1.1, .9, x, .95, z - 3.4, MAT.madera);
      box(7.3, .12, 1.1, x, 1.55, z - 3.4, MADERA_TOP());
      const camp = box(2.2, .7, .5, x + 1.4, 1.9, z - 3.5, MAT.metalOsc);
      // lampara de mostrador
      box(2.6, .12, .5, x + 1.4, 2.35, z - 3.5, MAT.luz);
      // sofás y mesas
      for (const sx of [-1, 1]) {
        const bx = x + sx * 6.5;
        box(3.4, .45, 1.1, bx, .75, z + 1.5, sx > 0 ? MAT.tela : MAT.tela2);
        box(3.4, .9, .35, bx, 1.15, z + 2, sx > 0 ? MAT.tela : MAT.tela2);
        for (const s2 of [-1, 1]) box(.3, .35, 1.1, bx + s2 * 1.5, 1.0, z + 1.5, sx > 0 ? MAT.tela : MAT.tela2);
        cyl(.75, .6, .08, bx, .68, z - .3, MADERA_TOP(), 16);
        cyl(.1, .1, .5, bx, .45, z - .3, MAT.metal);
      }
      // planta
      const pot = cyl(.42, .32, .55, x - 10, .7, z + 2.5, MAT.maderaOsc, 12);
      const leaf = new T.Mesh(new T.IcosahedronGeometry(.75, 1), MAT.verde);
      leaf.position.set(x - 10, 1.55, z + 2.5); leaf.castShadow = true; scene.add(leaf);
      // cuadro / espejo de pared
      box(3.2, 1.6, .12, x, 2.4, z - 6.2, MAT.metalOsc);
      // techo con focos
      for (let i = -1; i <= 1; i++) {
        box(5, .12, .8, x + i * 7, 4.1, z - 1, MAT.luz);
        const pool = new T.Mesh(new T.PlaneGeometry(7, 6), new T.MeshBasicMaterial({
          map: glowT, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .16
        }));
        pool.rotation.x = -PI / 2; pool.position.set(x + i * 7, .5, z - 1); scene.add(pool);
      }
      // barra del bar del hotel
      box(4, 1.1, .8, x + 8.5, .95, z - 4.6, MAT.maderaOsc);
      for (let k = 0; k < 4; k++) cyl(.09, .09, .5, x + 6.9 + k * .4, 1.5, z - 4.6, MAT.metal, 8);
    }
  } catch (e) { NC.log('interiores: hotel', e); }
  function MADERA_TOP() { return new T.MeshStandardMaterial({ color: 0x8a6440, roughness: .45, metalness: .1 }); }

  // ---------- 2) consulta medica ----------
  try {
    if (typeof CLINIC !== 'undefined' && CLINIC) {
      const x = CLINIC.x, z = CLINIC.z;
      box(9, .1, 8, x, .42, z, MAT.suelo);
      box(8, .1, 7, x, .48, z, new T.MeshStandardMaterial({ color: 0xdfe6ea, roughness: .5 }));
      // mesa de consulta
      box(2.2, .12, .9, x + 1.2, 1.35, z - 1.4, MAT.blanco);
      box(1.8, .8, .6, x + 1.2, .85, z - 1.6, MAT.blanco);
      box(.6, .5, .1, x + 1.6, 1.6, z - 1.3, MAT.metalOsc);
      // camilla
      const bed = box(1.1, .3, 2.2, x - 2.4, 1.05, z + .6, MAT.blanco);
      box(1.05, .22, 2.1, x - 2.4, 1.28, z + .6, new T.MeshStandardMaterial({ color: 0x5a8a9a, roughness: .85 }));
      box(.9, .18, .6, x - 2.4, 1.45, z - .35, MAT.blanco);
      cyl(.08, .08, .8, x - 2.9, .7, z + 1.6, MAT.metal, 8);
      cyl(.08, .08, .8, x - 1.9, .7, z + 1.6, MAT.metal, 8);
      // armario de instrumental
      box(1.6, 2.1, .5, x - 1.2, 1.45, z - 3.4, MAT.blanco);
      for (let k = 0; k < 4; k++) box(1.4, .05, .1, x - 1.2, 1.1 + k * .45, z - 3.1, MAT.metalOsc);
      // posters y bombilla
      box(1.1, .8, .06, x + 3.6, 2.1, z - 3.4, new T.MeshBasicMaterial({ color: 0xdfe6ea }));
      box(1.6, .1, 1.6, x, 4.0, z, MAT.luz);
    }
  } catch (e) { NC.log('interiores: clinica', e); }

  // ---------- 3) detalles de taller (concesionarios) ----------
  try {
    for (const cs of carShops) {
      const cx = cs.x - 5, cz = cs.z - 9;
      // armario de herramientas
      box(2.2, 1.1, .7, cx - 7, .95, cz + 4, MAT.metalOsc);
      for (let k = 0; k < 4; k++) box(2.3, .06, .12, cx - 7, .6 + k * .22, cz + 4.35, MAT.metal);
      // pilas de pneumaticos
      for (let k = 0; k < 3; k++) {
        const t = new T.Mesh(new T.TorusGeometry(.42, .18, 8, 14), new T.MeshStandardMaterial({ color: 0x1b1b20, roughness: .95 }));
        t.position.set(cx + 7.5, .22 + k * .38, cz + 3.4); t.rotation.x = PI / 2; t.castShadow = true; scene.add(t);
      }
      // elevador de dos columnas
      for (const sx of [-1, 1]) box(.28, 3.4, .28, cx + 1.2 + sx * 1.5, 1.7, cz + 1, MAT.metal);
      box(3.6, .22, .5, cx + 1.2, 3.45, cz + 1, MAT.metalOsc);
      // maniquies de repuesto (colgado)
      const hm = new T.Mesh(new T.CylinderGeometry(.2, .24, 1.0, 10), new T.MeshStandardMaterial({ color: 0x3a3f4a, roughness: .8 }));
      hm.position.set(cx - 2.5, 2.6, cz + 4.2); hm.castShadow = true; scene.add(hm);
      const hmb = new T.Mesh(new T.SphereGeometry(.2, 10, 8), new T.MeshStandardMaterial({ color: 0x3a3f4a, roughness: .8 }));
      hmb.position.set(cx - 2.5, 3.2, cz + 4.2); scene.add(hmb);
    }
  } catch (e) { NC.log('interiores: taller', e); }

  NC.log('interiores: lobbies de hotel, consulta y taller completados');
})();
