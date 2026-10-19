/* Neon Coast - edificios: planta baja viva (escaparates, toldos, portales, rotulos),
   remates de fachada, chimeneas, tuberias, escaleras de incendio, balcones con plantas
   y paletas de color por barrio para romper la monotonía de la retícula. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;
  const R2 = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.random() * a.length | 0];

  // ---------- materiales ----------
  function plasterTex(base) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const v = Math.random() < .5 ? 0 : 255;
      x.fillStyle = `rgba(${v},${v},${v},${Math.random() * .05})`;
      x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    for (let i = 0; i < 22; i++) {
      const g = x.createRadialGradient(Math.random() * 256, Math.random() * 256, 2, Math.random() * 256, Math.random() * 256, 14 + Math.random() * 40);
      g.addColorStop(0, 'rgba(60,55,50,.10)'); g.addColorStop(1, 'rgba(60,55,50,0)');
      x.fillStyle = g; x.beginPath(); x.arc(g.x || 0, 0, 0, 0, 0); x.fill();
    }
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4; return t;
  }
  const M_PLASTER = new T.MeshStandardMaterial({ map: plasterTex('#ffffff'), vertexColors: true, roughness: .88, metalness: .03 });
  const M_METAL = new T.MeshStandardMaterial({ vertexColors: true, roughness: .45, metalness: .72, envMapIntensity: 1.1 });
  const M_GLASS = new T.MeshStandardMaterial({ vertexColors: true, roughness: .06, metalness: .2, transparent: true, opacity: .62, envMapIntensity: 1.6 });
  const M_WOOD = new T.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: .02 });
  const M_LIGHT = new T.MeshBasicMaterial({ vertexColors: true });

  const G = { plaster: [], metal: [], glass: [], wood: [], light: [] };
  const box = (w, h, d, x, y, z) => new T.BoxGeometry(w, h, d).translate(x, y, z);
  const cyl = (rt, rb, h, x, y, z, s) => new T.CylinderGeometry(rt, rb, h, s || 8).translate(x, y, z);
  const col = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3);
    const cc = new T.Color(c); for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; }
    g.setAttribute('color', new T.BufferAttribute(a, 3)); return g; };

  // paletas de acento por barrio (rompen el gris rosa uniforme)
  const ZONE_ACC = [
    ['#c76a3a', '#e0a24a', '#8a4a3a'],   // 0 puerto viejo: óxido y ocre
    ['#2f6f8a', '#3d8f9a', '#6a4a8a'],   // 1 distrito neon: azules
    ['#6f8a4a', '#8a7a4a', '#4a6f5a'],   // 2 betica: verdes住宅
    ['#d0a44a', '#4a9a8a', '#c07a5a'],   // 3 colina mar: calidos
    ['#8a4a6f', '#4a6f8a', '#c07a3a'],   // 4 fleming sur: comercial
    ['#6b6156', '#4a4740', '#5a4a3a']    // 5 chatarra:Ocres apagados
  ];
  const SIGN = ['FOTO', 'BAR', '24H', 'CAFÉ', 'TAPAS', 'KIOSCO', 'MÚSICA', 'TALLER', 'PAN', 'MARISCOS', 'VINIL', 'HELADOS'];

  // ---------- por edificio ----------
  let nDet = 0;
  try {
    for (const b of BLD) {
      const acc = ZONE_ACC[b.zn] || ZONE_ACC[1];
      const h = b.h, w = b.w, d = b.d;
      // cara que da a la calle mas cercana
      const nearX = Math.round(b.x / CELL) * CELL, nearZ = Math.round(b.z / CELL) * CELL;
      const dx = nearX - b.x, dz = nearZ - b.z;
      const front = Math.abs(dx) < Math.abs(dz) ? (dx < 0 ? -1 : 1) : (dz < 0 ? -1 : 1);
      const alongX = Math.abs(dx) < Math.abs(dz);   // fachada corre en Z
      const fw = alongX ? d : w;                     // ancho de la fachada
      const fx = alongX ? b.x + front * (w / 2 + .12) : b.x;
      const fz = alongX ? b.z : b.z + front * (d / 2 + .12);
      const ruined = b.zn === 5;
      if (ruined) {
        // ventanas rotas y vendido en la zona abandonada
        for (let i = 0; i < 3; i++) {
          const t = (i + .5) / 3, ox = alongX ? (t - .5) * fw * .8 : 0, oz = alongX ? 0 : (t - .5) * fw * .8;
          G.glass.push(col(box(alongX ? 1.1 : .12, 1.6, alongX ? .12 : 1.1, fx + ox, 1.7 + R2(0, 1.2), fz + oz), '#20303a'));
        }
        G.plaster.push(col(box(alongX ? 2.4 : .2, .5, alongX ? .2 : 2.4, fx, 1.1, fz), '#4a443c'));
        continue;
      }
      // zócalo de planta baja (piedra) + banda de coronación
      G.plaster.push(col(box(alongX ? fw : .34, 1.0, alongX ? .34 : fw, fx, .5, fz), '#6f6a62'));
      if (h > 8) G.plaster.push(col(box(alongX ? fw + .2 : .3, .45, alongX ? .3 : fw + .2, fx, h - .6, fz), pick(acc)));
      // planta baja: escaparate con toldo y rotulo
      if (Math.random() < .78) {
        const aw = Math.min(fw * .7, 7);
        const striped = new T.BoxGeometry(alongX ? aw : 1.5, .18, alongX ? 1.5 : aw);
        const sg = col(striped, pick(acc));
        sg.translate(fx + (alongX ? 0 : front * .7), 3.5, fz + (alongX ? front * .7 : 0));
        G.wood.push(sg);
        // cartel
        const sg2 = col(box(alongX ? aw * .8 : .18, .8, alongX ? .18 : aw * .8, fx + (alongX ? 0 : front * .1), 4.35, fz + (alongX ? front * .1 : 0)), pick(['#ff5a7a', '#27e6ff', '#ffd24a', '#3dff9a', '#ff8a3a']));
        G.light.push(sg2);
        // escaparate y puerta
        G.glass.push(col(box(alongX ? aw * .75 : .1, 2.1, alongX ? .1 : aw * .75, fx + (alongX ? 0 : front * .05), 1.5, fz + (alongX ? front * .05 : 0)), '#8fd0e8'));
        G.wood.push(col(box(alongX ? 1.1 : .16, 2.2, alongX ? .16 : 1.1, fx + (alongX ? aw * .32 : front * .12), 1.1, fz + (alongX ? front * .12 : aw * .32)), '#4a3524'));
        // escalón
        G.plaster.push(col(box(alongX ? aw * .8 : .8, .12, alongX ? .8 : aw * .8, fx + (alongX ? 0 : front * .45), .07, fz + (alongX ? front * .45 : 0)), '#8a857c'));
        // luz de escaparate
        G.light.push(col(box(alongX ? aw * .6 : .3, .1, alongX ? .3 : aw * .6, fx + (alongX ? 0 : front * .35), 3.1, fz + (alongX ? front * .35 : 0)), '#ffe0a8'));
      } else {
        // residential: balcón, buzón, planta
        if (h > 6) {
          const bx = fx + (alongX ? 0 : front * .5), bz = fz + (alongX ? front * .5 : 0);
          G.metal.push(col(box(alongX ? 2.6 : 1.1, .12, alongX ? 1.1 : 2.6, bx, 3.3, bz), '#4a4a52'));
          for (let k = 0; k < 4; k++)
            G.metal.push(col(box(alongX ? .06 : .06, .95, alongX ? .06 : .06,
              bx + (alongX ? (k - 1.5) * .85 : 0), 3.8, bz + (alongX ? 0 : (k - 1.5) * .85)), '#3c3c44'));
        }
        G.metal.push(col(box(alongX ? .4 : .1, .5, alongX ? .1 : .4, fx + (alongX ? fw * .3 : front * .15), 1.3, fz + (alongX ? front * .15 : fw * .3)), '#3a5a6a'));
      }
      // detalles de fachada: tuberias, aire acondicionado, antenas, rotulos
      const dn = 1 + (Math.random() * 2 | 0);
      for (let i = 0; i < dn; i++) {
        const t = R2(.1, .9), ox = alongX ? (t - .5) * fw * .9 : 0, oz = alongX ? 0 : (t - .5) * fw * .9;
        G.metal.push(col(cyl(.07, .07, h - 1.2, fx + ox + (alongX ? 0 : front * .12), (h - 1.2) / 2, fz + oz + (alongX ? front * .12 : 0), 6), '#7a756c'));
      }
      if (Math.random() < .5) {
        const t = R2(.15, .85), ox = alongX ? (t - .5) * fw * .8 : 0, oz = alongX ? 0 : (t - .5) * fw * .8;
        G.metal.push(col(box(1.1, .7, .8, fx + ox + (alongX ? 0 : front * .3), 3.4 + R2(0, Math.max(1, h - 5)), fz + oz + (alongX ? front * .3 : 0)), '#9aa0a8'));
      }
      if (Math.random() < .34) {
        const t = R2(.2, .8), ox = alongX ? (t - .5) * fw * .7 : 0, oz = alongX ? 0 : (t - .5) * fw * .7;
        G.metal.push(col(cyl(.05, .05, 2.2, fx + ox + (alongX ? 0 : front * .2), h + 1.1, fz + oz + (alongX ? front * .2 : 0), 5), '#8a8a92'));
        G.metal.push(col(box(1.4, .05, .05, fx + ox + (alongX ? 0 : front * .2), h + 1.9, fz + oz + (alongX ? front * .2 : 0)), '#8a8a92'));
      }
      // escalera de incendio (residenciales y antiguo)
      if ((b.zn === 2 || b.zn === 3) && h > 9 && Math.random() < .5) {
        const ox = alongX ? (Math.random() - .5) * fw * .5 : 0, oz = alongX ? 0 : (Math.random() - .5) * fw * .5;
        for (let f = 1; f * 3.6 < h - 1; f++) {
          G.metal.push(col(box(alongX ? 2.2 : .9, .1, alongX ? .9 : 2.2, fx + ox + (alongX ? 0 : front * .55), f * 3.6, fz + oz + (alongX ? front * .55 : 0)), '#4a4a50'));
          G.metal.push(col(box(alongX ? 2.2 : .06, .8, alongX ? .06 : 2.2, fx + ox + (alongX ? 0 : front * .95), f * 3.6 + .4, fz + oz + (alongX ? front * .95 : 0)), '#4a4a50'));
        }
      }
      // macetas con plantas junto al portal
      if (Math.random() < .45) {
        const ox = alongX ? (Math.random() - .5) * fw * .7 : 0, oz = alongX ? 0 : (Math.random() - .5) * fw * .7;
        G.wood.push(col(box(.6, .5, .6, fx + ox + (alongX ? 0 : front * 1.1), .25, fz + oz + (alongX ? front * 1.1 : 0)), '#6a4a32'));
        G.wood.push(col(new T.IcosahedronGeometry(.55, 0).translate(fx + ox + (alongX ? 0 : front * 1.1), .75, fz + oz + (alongX ? front * 1.1 : 0)), pick(['#3f7a3a', '#4f8a3a', '#356b32'])));
      }
      nDet++;
    }
  } catch (e) { NC.log('edificios: decoracion', e); }

  // ---------- montaje ----------
  const MATS = { plaster: M_PLASTER, metal: M_METAL, glass: M_GLASS, wood: M_WOOD, light: M_LIGHT };
  for (const k in G) {
    if (!G[k].length) continue;
    const g = G[k];
    // merge() del juego necesita indice: lo generamos
    g.forEach(o => { if (!o.index) { const n = o.attributes.position.count, a = new Uint32Array(n); for (let i = 0; i < n; i++) a[i] = i; o.setIndex(new T.BufferAttribute(a, 1)); } });
    const m = new T.Mesh(merge(g), MATS[k]);
    m.castShadow = k !== 'light' && k !== 'glass'; m.receiveShadow = true;
    scene.add(m);
  }
  NC.log('edificios: ' + nDet + ' frentes con planta baja, rotulos y remates');
})();
