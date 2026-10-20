/* Neon Coast - src/interior2.js
   ---------------------------------------------------------------------------
   INTERIORES COMPLETOS POR TIPO DE ESTABLECIMIENTO.

   Club · Hotel · Vivienda · Tienda/Super · Concesionario · Oficina · Clinica ·
   Taller/Nave · Zona abandonada.

   Reglas del modulo:
     · Nada flotando: cada mueble apoya en su superficie (suelo, encimera,
       estante, mesa) a la altura correcta respecto al jugador (1.8 m).
     · No se tapa el paso: entrada, salida y un pasillo de 1.2 m min. quedan
       siempre libres.
     · `boxes` solo recibe volumenes solidos que estorban (mostradores, mesas
       grandes, armarios, particiones). Ni una silla.
     · Todo se fusiona por material con merge() (geometria indexada) para no
       disparar draw calls.
     · Nada de cajas de una sola tinta: cada local tiene su paleta y sus
       texturas procedurales.
     · Si algo falla el juego sigue arrancando: todo va en try/catch.

   CARGA (desde index.html, despues del resto de src/*.js):
       <script src="src/interior2.js?v=9x"></script>
   --------------------------------------------------------------------------- */
(function () {
  'use strict';
  const NC = window.NC;
  if (!NC || !window.THREE) return;
  const T = THREE;
  const PI = Math.PI;

  /* ---- globals del juego (acceso seguro) ---- */
  const EXTv = (typeof EXT !== 'undefined') ? EXT : 418;
  const SC = (typeof scene !== 'undefined') ? scene : null;
  if (!SC) return;
  const BOXS = (typeof boxes !== 'undefined') ? boxes : null;
  const MERGE = (typeof merge === 'function') ? merge : null;
  const SHOPS = (typeof shops !== 'undefined') ? shops : [];
  const CARS = (typeof carShops !== 'undefined') ? carShops : [];
  const HOTS = (typeof hotels !== 'undefined') ? hotels : [];
  const FAC = (typeof FACTORY !== 'undefined') ? FACTORY : null;
  const CLI = (typeof CLINIC !== 'undefined') ? CLINIC : null;
  const BLDs = (typeof BLD !== 'undefined') ? BLD : [];
  const MKH = (typeof mkHuman === 'function') ? mkHuman : null;

  const R = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.random() * a.length | 0];

  /* ===================== 0. UTILIDADES ===================== */
  function cv2(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function texC(c, rx, ry) {
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(rx || 1, ry || 1);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  function std(o) { return new T.MeshStandardMaterial(o); }
  function basic(o) { return new T.MeshBasicMaterial(o); }

  /* ---------- pintores de textura procedural ---------- */
  function txWood(base, dark, planks) {
    const c = cv2(256, 256), x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    if (planks) {
      for (let i = 0; i < 8; i++) {
        x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(0, i * 32, 256, 2);
        x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(0, i * 32 + 2, 256, 2);
        x.fillStyle = 'rgba(0,0,0,.10)'; x.fillRect((i % 2) * 120 + 20, i * 32, 2, 32);
      }
    }
    for (let i = 0; i < 170; i++) {
      x.strokeStyle = 'rgba(' + dark + ',' + (0.12 + Math.random() * 0.3).toFixed(2) + ')';
      x.lineWidth = 0.6 + Math.random() * 2.2;
      const y = Math.random() * 256;
      x.beginPath(); x.moveTo(0, y);
      for (let k = 8; k <= 256; k += 16) x.lineTo(k, y + (Math.random() - 0.5) * 5);
      x.stroke();
    }
    for (let k = 0; k < 6; k++) {
      const kx = Math.random() * 256, ky = Math.random() * 256;
      x.strokeStyle = 'rgba(' + dark + ',.35)'; x.lineWidth = 1.4;
      x.beginPath(); x.ellipse(kx, ky, 3 + Math.random() * 5, 2 + Math.random() * 3, Math.random() * 3, 0, 7); x.stroke();
    }
    return c;
  }
  function txTile(base, grout, n) {
    const c = cv2(256, 256), x = c.getContext('2d'), s = 256 / n;
    x.fillStyle = grout; x.fillRect(0, 0, 256, 256);
    const r = parseInt(base.substr(1, 2), 10), g = parseInt(base.substr(3, 2), 10), b = parseInt(base.substr(5, 2), 10);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = (Math.random() - 0.5) * 16;
      x.fillStyle = 'rgb(' + (r + v | 0) + ',' + (g + v | 0) + ',' + (b + v | 0) + ')';
      x.fillRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
    }
    for (let i = 0; i < 900; i++) {
      x.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.06).toFixed(2) + ')';
      x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    return c;
  }
  function txCarpet(a, b) {
    const c = cv2(256, 256), x = c.getContext('2d');
    x.fillStyle = a; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = b; x.lineWidth = 3; x.strokeRect(14, 14, 228, 228);
    x.lineWidth = 1; x.strokeRect(24, 24, 208, 208);
    for (let i = 0; i < 5200; i++) {
      x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * 0.09).toFixed(2) + ')';
      x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    return c;
  }
  function txParquet() {
    const c = cv2(256, 256), x = c.getContext('2d');
    x.fillStyle = '#6b4526'; x.fillRect(0, 0, 256, 256);
    const bw = 64, bh = 32;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) {
      const ox = (j % 2) * 32, px = i * bw + ox, py = j * bh;
      const v = (Math.random() - 0.5) * 26;
      x.fillStyle = 'rgb(' + (122 + v | 0) + ',' + (84 + v | 0) + ',' + (46 + v | 0) + ')';
      x.fillRect(px + 1, py + 1, bw - 2, bh - 2);
      x.strokeStyle = 'rgba(30,18,8,.55)'; x.lineWidth = 1;
      for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(px + 2, py + 4 + k * 8); x.lineTo(px + bw - 2, py + 3 + k * 8); x.stroke(); }
      x.strokeStyle = 'rgba(0,0,0,.4)'; x.strokeRect(px + 1, py + 1, bw - 2, bh - 2);
    }
    return c;
  }
  function txPlaster(base) {
    const c = cv2(256, 256), x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 200; i++) {
      x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '0,0,0' : '255,255,255') + ',' + (Math.random() * 0.05).toFixed(2) + ')';
      x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 34, 0, 7); x.fill();
    }
    for (let i = 0; i < 14; i++) {
      x.fillStyle = 'rgba(120,110,95,' + (Math.random() * 0.08).toFixed(2) + ')';
      x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 9, 0, 7); x.fill();
    }
    return c;
  }
  function txPeel(base) {
    const c = cv2(256, 256), x = c.getContext('2d');
    x.fillStyle = '#6b5340'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      x.fillStyle = 'rgba(107,83,64,' + (0.25 + Math.random() * 0.6).toFixed(2) + ')';
      x.beginPath();
      const px = Math.random() * 256, py = Math.random() * 256, r = 3 + Math.random() * 16;
      x.moveTo(px, py);
      for (let k = 0; k < 7; k++) x.lineTo(px + Math.cos(k / 7 * 6.28) * r * R(.5, 1.2), py + Math.sin(k / 7 * 6.28) * r * R(.5, 1.2));
      x.closePath(); x.fill();
    }
    for (let i = 0; i < 30; i++) {
      x.strokeStyle = 'rgba(40,30,20,.35)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(Math.random() * 256, 0); x.lineTo(Math.random() * 256, 256); x.stroke();
    }
    return c;
  }
  function txConcrete() {
    const c = cv2(256, 256), x = c.getContext('2d');
    x.fillStyle = '#6e6a64'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4200; i++) {
      const v = 90 + Math.random() * 90 | 0;
      x.fillStyle = 'rgba(' + v + ',' + (v - 3) + ',' + (v - 8) + ',' + (0.05 + Math.random() * 0.22).toFixed(2) + ')';
      x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    for (let i = 0; i < 18; i++) {
      x.strokeStyle = 'rgba(30,28,25,.35)'; x.lineWidth = 1 + Math.random();
      x.beginPath(); let px = Math.random() * 256, py = Math.random() * 256; x.moveTo(px, py);
      for (let k = 0; k < 5; k++) { px += R(-30, 30); py += R(-30, 30); x.lineTo(px, py); }
      x.stroke();
    }
    return c;
  }
  function txCarton() {
    const c = cv2(128, 128), x = c.getContext('2d');
    x.fillStyle = '#c8a878'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 0, 128, 26);
    x.fillStyle = 'rgba(90,60,30,.55)'; x.fillRect(6, 40, 116, 2); x.fillRect(6, 44, 116, 1);
    x.fillStyle = 'rgba(60,40,20,.7)';
    for (let i = 0; i < 14; i++) x.fillRect(10 + i * 8, 60 + (i % 3) * 3, 2 + Math.random() * 4, 22);
    x.fillStyle = 'rgba(40,28,14,.55)'; x.fillRect(8, 104, 46, 14);
    x.strokeStyle = 'rgba(120,90,50,.6)'; x.lineWidth = 2; x.strokeRect(2, 2, 124, 124);
    return c;
  }
  function txBrush(base) {
    const c = cv2(128, 128), x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) {
      x.strokeStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * 0.12).toFixed(2) + ')';
      x.lineWidth = 0.5 + Math.random();
      const y = Math.random() * 128;
      x.beginPath(); x.moveTo(0, y); x.lineTo(128, y + (Math.random() - 0.5) * 3); x.stroke();
    }
    return c;
  }
  function txWeave(base) {
    const c = cv2(128, 128), x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 128; i += 2) {
      x.fillStyle = 'rgba(0,0,0,.07)'; x.fillRect(i, 0, 1, 128);
      x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(0, i, 128, 1);
    }
    for (let i = 0; i < 2600; i++) {
      x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * 0.07).toFixed(2) + ')';
      x.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
    }
    return c;
  }
  function txVinyl(base) {
    const c = cv2(128, 128), x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2600; i++) {
      const v = Math.random() < 0.5 ? 255 : 0;
      x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (Math.random() * 0.06).toFixed(2) + ')';
      x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    x.strokeStyle = 'rgba(0,0,0,.10)'; x.lineWidth = 1; x.strokeRect(.5, .5, 127, 127);
    return c;
  }
  // grano fino blanco: sirve de mapa base para los objetos con color por vertice
  function txGrain() {
    const c = cv2(128, 128), x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 3600; i++) {
      const v = Math.random() < 0.5 ? 255 : 0;
      x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (Math.random() * 0.10).toFixed(2) + ')';
      x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    for (let i = 0; i < 60; i++) {
      x.strokeStyle = 'rgba(120,120,120,.10)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(Math.random() * 128, 0); x.lineTo(Math.random() * 128, 128); x.stroke();
    }
    return c;
  }

  /* ===================== 1. MATERIALES ===================== */
  const MAT = {
    sueloTienda: std({ map: texC(txTile('#7f8798', '#464c5b', 4), 4, 3), roughness: .74, metalness: .06 }),
    sueloMadera: std({ map: texC(txWood('#8a6039', '#5a3c22', true), 3, 3), roughness: .6, metalness: .04 }),
    sueloParquet: std({ map: texC(txParquet(), 4, 3), roughness: .34, metalness: .14 }),
    sueloMoqueta: std({ map: texC(txCarpet('#3d2038', '#7a2f5e'), 3, 3), roughness: .98 }),
    sueloMoquetaOsc: std({ map: texC(txCarpet('#241f2e', '#4a3a5a'), 3, 3), roughness: .98 }),
    sueloVinilo: std({ map: texC(txVinyl('#e2ece8'), 4, 3), roughness: .42, metalness: .03 }),
    sueloHormigon: std({ map: texC(txConcrete(), 4, 4), roughness: .95 }),
    sueloHotel: std({ map: texC(txTile('#c9bda6', '#8b8170', 6), 6, 4), roughness: .3, metalness: .1 }),
    sueloOficina: std({ map: texC(txCarpet('#4c515a', '#343941'), 4, 3), roughness: .98 }),
    paredClara: std({ map: texC(txPlaster('#d9d0be'), 3, 2), roughness: .93 }),
    paredBlanca: std({ map: texC(txPlaster('#eef2f3'), 2, 2), roughness: .72 }),
    paredClub: std({ map: texC(txPlaster('#2c1c3e'), 3, 2), roughness: .78 }),
    paredMadera: std({ map: texC(txWood('#4c3525', '#2a1a12', true), 3, 2), roughness: .68 }),
    paredOficina: std({ map: texC(txPlaster('#9aa2ad'), 3, 2), roughness: .86 }),
    paredDesguace: std({ map: texC(txPeel('#8a7050'), 2, 2), roughness: .97 }),
    madera: std({ map: texC(txWood('#6d4c33', '#3d2718'), 2, 2), roughness: .72 }),
    maderaOsc: std({ map: texC(txWood('#4a3322', '#2a1a10'), 2, 2), roughness: .8 }),
    maderaClara: std({ map: texC(txWood('#a87b4c', '#6b4a2a'), 2, 2), roughness: .66 }),
    maderaVieja: std({ map: texC(txWood('#6d5842', '#3a2c1e'), 2, 2), roughness: .95 }),
    metal: std({ map: texC(txBrush('#9aa0a8'), 2, 2), roughness: .38, metalness: .72 }),
    metalOsc: std({ map: texC(txBrush('#4b515a'), 2, 2), roughness: .5, metalness: .58 }),
    metalBlanco: std({ map: texC(txBrush('#c9ced4'), 2, 2), roughness: .44, metalness: .3 }),
    metalOro: std({ color: 0xc8a24a, roughness: .34, metalness: .85 }),
    telaAzul: std({ map: texC(txWeave('#3c5c8c'), 2, 2), roughness: .97 }),
    telaRoja: std({ map: texC(txWeave('#8c3c4c'), 2, 2), roughness: .97 }),
    telaGris: std({ map: texC(txWeave('#6c6c74'), 2, 2), roughness: .97 }),
    telaBeige: std({ map: texC(txWeave('#bcae90'), 2, 2), roughness: .97 }),
    telaVerde: std({ map: texC(txWeave('#40795a'), 2, 2), roughness: .97 }),
    ropa: std({ map: texC(txWeave('#eae6de'), 2, 2), roughness: .98 }),
    cristal: std({ color: 0xa8d8e8, roughness: .07, metalness: .35, transparent: true, opacity: .26 }),
    cristalOsc: std({ color: 0x18303c, roughness: .1, metalness: .5, transparent: true, opacity: .5 }),
    caucho: std({ color: 0x1c1c20, roughness: .96 }),
    follaje: std({ color: 0x3f8a4a, roughness: .9 }),
    follajeSeco: std({ color: 0x6a7038, roughness: .95 }),
    ceramica: std({ map: texC(txTile('#eaf0f2', '#b6c2c8', 8), 4, 4), roughness: .26, metalness: .06 }),
    papel: std({ color: 0xf2ece0, roughness: .92 }),
    producto: std({ map: texC(txCarton()), vertexColors: true, roughness: .78 }),
    color: std({ map: texC(txGrain(), 3, 3), vertexColors: true, roughness: .72, metalness: .08 }),
    emiteCalido: basic({ color: 0xfff0cc }),
    emiteFrio: basic({ color: 0xd8f0ff }),
    emiteMagenta: basic({ color: 0xff5ac8 }),
    emiteCian: basic({ color: 0x27e6ff }),
    emiteVerde: basic({ color: 0x9affc8 }),
    emiteAmbar: basic({ color: 0xffb45a }),
    emiteRojo: basic({ color: 0xff5a5a })
  };

  /* ===================== 2. CONSTRUCTOR (merge por material) ===================== */
  const G = {};
  const POOL = {};
  function idx(g) {
    if (!g.index) {
      const n = g.attributes.position.count, a = new Uint32Array(n);
      for (let i = 0; i < n; i++) a[i] = i;
      g.setIndex(new T.BufferAttribute(a, 1));
    }
    return g;
  }
  function vcol(g, c) {
    const k = new T.Color(c).convertSRGBToLinear();
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = k.r; a[i * 3 + 1] = k.g; a[i * 3 + 2] = k.b; }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    return g;
  }
  function add(k, g) {
    if (!g) return null;
    idx(g);
    if ((k === 'color' || k === 'producto') && !g.attributes.color) vcol(g, 0xcccccc);
    (G[k] = G[k] || []).push(g);
    return g;
  }
  function box(k, w, h, d, x, y, z, ry) {
    const g = new T.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    return add(k, g);
  }
  function cyl(k, rt, rb, h, x, y, z, seg, rot) {
    const g = new T.CylinderGeometry(rt, rb, h, seg || 12);
    if (rot) { if (rot[0]) g.rotateX(rot[0]); if (rot[1]) g.rotateY(rot[1]); if (rot[2]) g.rotateZ(rot[2]); }
    g.translate(x, y, z);
    return add(k, g);
  }
  function sph(k, r, x, y, z, seg) {
    const g = new T.SphereGeometry(r, seg || 10, Math.max(4, (seg || 10) - 2));
    g.translate(x, y, z);
    return add(k, g);
  }
  function torus(k, r, t, x, y, z, rot) {
    const g = new T.TorusGeometry(r, t, 8, 16);
    if (rot) { if (rot[0]) g.rotateX(rot[0]); if (rot[2]) g.rotateZ(rot[2]); }
    g.translate(x, y, z);
    return add(k, g);
  }
  function pcol(c, w, h, d, x, y, z, ry) {
    const g = new T.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    return add('color', vcol(g, c));
  }
  function pcyl(c, rt, rb, h, x, y, z, seg) {
    const g = new T.CylinderGeometry(rt, rb, h, seg || 12);
    g.translate(x, y, z);
    return add('color', vcol(g, c));
  }
  // producto de estanteria: carton con textura + color por vertice
  function pprod(c, w, h, d, x, y, z, ry) {
    const g = new T.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    return add('producto', vcol(g, c));
  }
  function pool(x, y, z, w, d, key) {
    const g = new T.PlaneGeometry(w, d);
    g.rotateX(-PI / 2);
    g.translate(x, y, z);
    (POOL[key] = POOL[key] || []).push(g);
  }
  function solid(x, z, hw, hd) {
    if (!BOXS) return;
    try { BOXS.push({ x: x, z: z, hw: hw, hd: hd }); } catch (e) { }
  }
  function sign(txt, w, h, x, y, z, ry, fg, bg) {
    const c = cv2(512, Math.max(48, Math.round(512 * h / w)));
    const g = c.getContext('2d');
    g.fillStyle = bg || '#10131f'; g.fillRect(0, 0, c.width, c.height);
    if (fg) { g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(4, 4, c.width - 8, c.height - 8); }
    g.fillStyle = fg || '#ffffff';
    g.font = 'bold ' + Math.round(c.height * (txt.length > 9 ? 0.42 : 0.56)) + 'px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, c.width / 2, c.height / 2 + 2, c.width - 22);
    const m = new T.Mesh(new T.PlaneGeometry(w, h),
      new T.MeshBasicMaterial({ map: texC(c, 1, 1), side: T.DoubleSide }));
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    SC.add(m);
    return m;
  }
  function gente(x, y, z, sh, pa, ha, hat, ry) {
    if (!MKH) return null;
    try {
      const h = MKH(sh, pa, ha === undefined ? 0x2a1d14 : ha, hat || 0);
      h.g.position.set(x, y, z);
      if (ry) h.g.rotation.y = ry;
      h.g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      return h;
    } catch (e) { return null; }
  }
  const COLH = [0x27e6ff, 0xffd24a, 0xffffff, 0x8a5cff, 0x2ee08a, 0xff8a3a, 0xff5a7a, 0x4a8ad8];
  const PANT = [0x222233, 0x445566, 0x663344, 0x2d4a35, 0x4a3a52, 0x5a4a3a];
  const PELOS = [0x14100c, 0x2a1d14, 0x6b4a2a, 0x9a9a9a, 0x3a2010, 0x1a1a1a];

  /* ---------- mobiliario de apoyo ---------- */
  function silla(k, x, y, z, ry) {
    const s = Math.sin(ry || 0), c = Math.cos(ry || 0);
    const off = [[-.21, -.21], [.21, -.21], [.21, .21], [-.21, .21]];
    for (const o of off) box(k, .05, .45, .05, x + o[0] * c - o[1] * s, y + .225, z + o[0] * s + o[1] * c, ry);
    box(k, .5, .06, .5, x, y + .47, z, ry);
    box(k, .5, .5, .06, x - s * .22, y + .74, z + c * .22, ry);
  }
  function taburete(x, y, z, col) {
    cyl('metalOsc', .05, .05, .62, x, y + .31, z, 8);
    if (col !== undefined) pcyl(col, .19, .19, .07, x, y + .65, z, 12);
    else cyl('metalOsc', .19, .19, .07, x, y + .65, z, 12);
    cyl('metal', .17, .17, .035, x, y + .70, z, 12);
    torus('metal', .17, .022, x, y + .22, z, [PI / 2, 0, 0]);
  }
  function ronda(x, y, z, r, h, k) {
    cyl(k === undefined ? 'madera' : k, r, r * .96, .07, x, y + h - .035, z, 16);
    cyl('metalOsc', .06, .09, h - .07, x, y + (h - .07) / 2, z, 10);
    cyl('metalOsc', r * .55, r * .6, .05, x, y + .025, z, 12);
  }
  function planta(x, y, z, s) {
    cyl('metalOsc', .26 * s, .2 * s, .34 * s, x, y + .17 * s, z, 10);
    cyl('follaje', .02 * s, .03 * s, .5 * s, x, y + .58 * s, z, 6);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.25;
      sph('follaje', R(.16, .24) * s, x + Math.cos(a) * .14 * s, y + (.62 + i * .07) * s, z + Math.sin(a) * .14 * s, 8);
    }
  }
  function boton(x, y, z, h, col) {          // botella apoyada en una superficie
    pcyl(col, .045, .05, h * .72, x, y + h * .36, z, 8);
    pcyl(col, .018, .018, h * .2, x, y + h * .8, z, 6);
    pcyl(col, .026, .026, h * .08, x, y + h * .72, z, 6);
  }
  function vaso(x, y, z) { cyl('cristal', .035, .028, .11, x, y + .055, z, 8); }
  function libro(x, y, z, w, h, d, col, ry) { pcol(col, w, h, d, x, y + h / 2, z, ry); }
  function lamparaMesa(x, y, z) {
    cyl('metalOsc', .09, .11, .03, x, y + .015, z, 10);
    cyl('metalOsc', .022, .022, .3, x, y + .17, z, 8);
    cyl('metalBlanco', .13, .09, .17, x, y + .37, z, 12);
    sph('emiteCalido', .05, x, y + .3, z, 8);
  }
  function pantalla(x, y, z, w, ry) {
    const s = Math.sin(ry || 0), c = Math.cos(ry || 0), h = w * .62;
    box('metalOsc', .3, .04, .2, x, y + .02, z, ry);
    box('metalOsc', .07, .22, .05, x, y + .13, z, ry);
    box('metalOsc', w, h, .05, x - s * .02, y + .28 + h / 2, z + c * .02, ry);
    box('emiteFrio', w - .05, h - .05, .01, x - s * .055, y + .28 + h / 2, z + c * .055, ry);
  }
  function portatil(x, y, z, ry) {
    const s = Math.sin(ry || 0), c = Math.cos(ry || 0);
    box('metalOsc', .36, .02, .26, x, y + .01, z, ry);
    box('metalOsc', .36, .24, .02, x - s * .12, y + .12, z + c * .12, ry);
    box('emiteFrio', .32, .2, .01, x - s * .135, y + .12, z + c * .135, ry);
  }
  function tablero(x, y, z, w, h) {
    box('metalBlanco', w, h, .04, x, y, z);
    box('papel', w - .08, h - .08, .02, x, y, z + .03);
  }
  // pared con huecos (puertas) sobre el eje X o Z
  function wallGap(k, axis, fixed, from, to, gaps, y0, h, thick) {
    let seg = from;
    const gs = gaps.slice().sort(function (a, b) { return a[0] - b[0]; });
    for (const g of gs) {
      if (g[0] > seg) wallSeg(k, axis, fixed, seg, g[0], y0, h, thick);
      if (g[1] > seg) seg = g[1];
    }
    if (to > seg) wallSeg(k, axis, fixed, seg, to, y0, h, thick);
  }
  function wallSeg(k, axis, fixed, a, b, y0, h, thick) {
    if (b - a < .02) return;
    if (axis === 'x') box(k, b - a, h, thick, (a + b) / 2, y0 + h / 2, fixed);
    else box(k, thick, h, b - a, fixed, y0 + h / 2, (a + b) / 2);
  }
  // colision de un muro con huecos (solo los tramos macizos)
  function wallSolid(axis, fixed, from, to, gaps, thick) {
    let seg = from;
    const gs = gaps.slice().sort(function (a, b) { return a[0] - b[0]; });
    for (const g of gs) {
      if (g[0] > seg) {
        if (axis === 'z') solid(fixed, (seg + g[0]) / 2, thick / 2, (g[0] - seg) / 2);
        else solid((seg + g[0]) / 2, fixed, (g[0] - seg) / 2, thick / 2);
      }
      if (g[1] > seg) seg = g[1];
    }
    if (to > seg) {
      if (axis === 'z') solid(fixed, (seg + to) / 2, thick / 2, (to - seg) / 2);
      else solid((seg + to) / 2, fixed, (to - seg) / 2, thick / 2);
    }
  }

  /* ===================== 3. CLUB NEON ===================== */
  /*  roomWalls(EXT+30,-150,16,12,4.5) -> centro (448,-150)
      ancho 16 (x 440..456) fondo 12 (z -156..-144)
      entrada (448,-144.3)  salida (448,-155.6)                          */
  function club() {
    try {
      const X = EXTv + 30, Z = -150, FY = 0.30;
      const xw = X - 8, xe = X + 8, zn = Z - 6, zs = Z + 6;

      /* --- pista de baile: suelo propio + luz propia --- */
      const px0 = X - 5.3, px1 = X + 4.5, pz0 = Z + 0.6, pz1 = Z + 3.8;
      box('sueloParquet', px1 - px0, .05, pz1 - pz0, (px0 + px1) / 2, FY + .025, (pz0 + pz1) / 2);
      box('emiteMagenta', px1 - px0, .04, .06, (px0 + px1) / 2, FY + .05, pz0 + .03);
      box('emiteCian', px1 - px0, .04, .06, (px0 + px1) / 2, FY + .05, pz1 - .03);
      box('emiteCian', .06, .04, pz1 - pz0, px0 + .03, FY + .05, (pz0 + pz1) / 2);
      box('emiteMagenta', .06, .04, pz1 - pz0, px1 - .03, FY + .05, (pz0 + pz1) / 2);
      pool((px0 + px1) / 2, FY + .06, (pz0 + pz1) / 2, px1 - px0 + 1.4, pz1 - pz0 + 1.4, 'magenta');

      /* --- vestibulo: fieltro + mostrador de acceso --- */
      box('sueloMoqueta', 6.6, .04, 1.9, X, FY + .02, zs - 1.15);
      box('sueloMoquetaOsc', 6.2, .02, 1.5, X, FY + .05, zs - 1.15);
      const acx = X - 5.6, acz = zs - 1.6;
      box('maderaOsc', 2.4, 1.05, .8, acx, FY + .525, acz);
      box('maderaClara', 2.6, .1, .95, acx, FY + 1.1, acz);
      box('metalOsc', .68, .44, .05, acx + .55, FY + 1.38, acz - .18, -.18);
      box('emiteCian', .6, .36, .02, acx + .55, FY + 1.38, acz - .205, -.18);
      cyl('metalOro', .07, .08, .13, acx - .85, FY + 1.165, acz + .1, 8);
      box('papel', .3, .02, .22, acx - .3, FY + 1.16, acz + .2, .3);
      sign('ACCESO', 1.9, .42, acx, FY + 2.35, acz + .45, 0, '#27e6ff', '#10131f');
      solid(acx, acz, 1.3, .5);
      cyl('metalOsc', .12, .16, .95, acx + 1.9, FY + .475, acz + .8, 10);
      cyl('metalOro', .14, .14, .04, acx + 1.9, FY + .95, acz + .8, 10);

      /* --- BAR (el mostrador largo ya existe: z=-152, x 444..452, top 1.55) --- */
      box('maderaClara', 8.6, .12, 1.7, X, 1.61, Z - 2);          // superficie
      box('maderaOsc', 8.4, .85, .1, X, 1.12, Z - 1.2);           // frontal
      box('metalOro', 8.4, .05, .12, X, .52, Z - 1.22);           // rodapie
      const barTop = 1.67;
      const BCOL = [0x2ee08a, 0xff5a7a, 0xffd24a, 0x27e6ff, 0xd8d2c0, 0x8a5cff];
      for (let i = 0; i < 9; i++) boton(X - 3.4 + i * .78, barTop, Z - 2.45, .34, BCOL[i % 6]);
      for (let i = 0; i < 5; i++) vaso(X - 1.6 + i * .42, barTop, Z - 1.7);
      // taburetes (3 ya existen en z=-149.5) + 2 nuevos
      taburete(X - 5.1, FY, Z + .5, 0x8a3a5a);
      taburete(X + 5.4, FY, Z + .5, 0x8a3a5a);
      // estanteria de botellas en la pared del fondo (la salida queda libre)
      const sx0 = xw + .35, sx1 = X - 2.2;
      box('maderaOsc', .06, 1.35, .5, sx0 + .02, FY + .68, zn + .35);
      box('maderaOsc', .06, 1.35, .5, sx1 - .02, FY + .68, zn + .35);
      box('cristalOsc', sx1 - sx0, 1.35, .04, (sx0 + sx1) / 2, FY + .68, zn + .12);
      const levels = [.85, 1.3, 1.75];
      for (const lv of levels) {
        box('madera', sx1 - sx0, .06, .5, (sx0 + sx1) / 2, FY + lv, zn + .35);
        const top = FY + lv + .03;
        let i = 0;
        for (let bx2 = sx0 + .35; bx2 < sx1 - .3; bx2 += .34) {
          const h = .26 + (i % 3) * .05;
          boton(bx2, top, zn + .3, h, BCOL[i % 6]);
          i++;
        }
      }
      box('emiteMagenta', .05, 2.2, .05, sx1 - .1, FY + 1.9, zn + .2);

      /* --- mesas altas --- */
      ronda(X - 6.7, FY, Z - 1.4, .42, 1.02, 'maderaClara');
      taburete(X - 6.7, FY, Z - 2.15, 0x2a4a6a);
      ronda(X - 6.7, FY, Z + .3, .42, 1.02, 'maderaClara');
      taburete(X - 6.7, FY, Z - .45, 0x2a4a6a);

      /* --- altavoces colgados + subwoofers --- */
      box('metalOsc', px1 - px0 + .6, .12, .12, (px0 + px1) / 2, 4.25, (pz0 + pz1) / 2);
      for (const sx of [px0 + .3, px1 - .3]) box('metalOsc', .1, .1, 3.2, sx, 4.25, (pz0 + pz1) / 2);
      for (let i = 0; i < 2; i++) {
        const sx = i ? px1 - .9 : px0 + .9;
        box('metalOsc', .1, .5, .1, sx, 4.0, (pz0 + pz1) / 2);
        box('metalOsc', .62, 1.15, .5, sx, 3.1, (pz0 + pz1) / 2);
        cyl('cristalOsc', .17, .17, .06, sx, 3.35, (pz0 + pz1) / 2 + .27, 12, [PI / 2, 0, 0]);
        cyl('cristalOsc', .12, .12, .06, sx, 2.95, (pz0 + pz1) / 2 + .27, 12, [PI / 2, 0, 0]);
      }
      for (const sxx of [X - 5.6, X + 4.0]) {
        box('metalOsc', .7, .85, .7, sxx, FY + .425, Z - .4);
        cyl('cristalOsc', .22, .22, .06, sxx, FY + .42, Z - .03, 14, [PI / 2, 0, 0]);
        solid(sxx, Z - .4, .36, .36);
      }
      for (let i = 0; i < 4; i++) {
        const lx = px0 + 1.4 + i * 3.1;
        cyl('metalOsc', .11, .16, .3, lx, 4.05, (pz0 + pz1) / 2, 10);
        cyl('emiteMagenta', .09, .13, .04, lx, 3.89, (pz0 + pz1) / 2, 10);
      }

      /* --- ambientacion con color propio --- */
      box('emiteMagenta', .05, .05, 11.4, xw + .3, 3.5, Z);
      box('emiteCian', .05, .05, 11.4, xe - .3, 3.5, Z);
      box('emiteCian', 15.4, .05, .05, X, 4.6, zn + .35);
      sign('CLUB NEON', 3.6, .8, X - 4.6, 3.05, zn + .42, 0, '#ff5ac8', '#10131f');
      sign('DJ', 1.2, .5, X - 2.4, 3.15, Z - 2.5, 0, '#27e6ff', '#10131f');
      box('metalOsc', 3.4, .1, .1, X - 2.4, 3.55, Z - 2.5);
      box('metalOsc', .1, .8, .1, X - 4.0, 3.9, Z - 2.5);
      box('metalOsc', .1, .8, .1, X - .8, 3.9, Z - 2.5);
      pool(X - 2.4, FY + .06, Z - 2, 3.2, 3.2, 'cian');
      planta(xw + .7, FY, Z + 4.2, 1.3);
      planta(xe - .7, FY, Z + 4.4, 1.1);
      for (const lx of [X - 4, X + 2]) {
        box('metalOsc', 2.4, .16, .5, lx, 4.62, Z + 3.6);
        box('emiteCalido', 2.2, .06, .4, lx, 4.52, Z + 3.6);
        pool(lx, FY + .05, Z + 3.6, 6, 5, 'calido');
      }

      /* --- clientes y personal --- */
      gente(acx + .2, FY, acz - 1.0, 0x27e6ff, 0x222233, 0x14100c, 0, PI);
      gente(X - 3.4, FY, Z - 3.4, 0xff8a3a, 0x222233, 0x2a1d14, 0, PI);
      gente(X + 1.4, FY, Z - 3.6, 0xffd24a, 0x333344, 0x1a1a1a, 0, PI);
      gente(X - 3.0, FY, Z + .4, 0xffffff, 0x445566, 0x3a2010, 0, 0);
      gente(X + .2, FY, Z + .9, 0x8a5cff, 0x2d4a35, 0x14100c, 0, PI * .5);
      gente(X - 1.6, FY, Z + 2.4, 0x2ee08a, 0x663344, 0x6b4a2a, 1, 2.1);
      gente(X - 6.7, FY, Z - .9, 0xff5a7a, 0x222233, 0x14100c, 0, 1.6);
    } catch (e) { NC.log && NC.log('interior2: club', e); }
  }

  /* ===================== 4. HOTEL ===================== */
  /*  hotels[i] = {x, z} con z = frente+10 -> centro del edificio (h.x, h.z-10)
      interior 26 x 16 -> x h.x+-12.65, z h.z-17.65 .. h.z-2.35          */
  const ZONAS = [];
  function hotel() {
    HOTS.forEach(function (h) {
      try {
        const X = h.x, Zf = h.z, FY = .48;
        const xi0 = X - 12.65, xi1 = X + 12.65, zi0 = Zf - 17.65, zi1 = Zf - 2.35;

        /* suelo de la zona de habitaciones (el vestibulo viejo ya tiene el suyo) */
        box('sueloHotel', 25.2, .12, 4.2, X, FY - .06, Zf - 15.5);
        box('sueloMoqueta', 25.2, .02, 4.2, X, FY + .01, Zf - 15.5);

        /* --- pasillo de habitaciones (tira izquierda, 2.8 m) --- */
        const cx0 = X - 12.4, cx1 = X - 9.6;
        box('sueloMoqueta', cx1 - cx0, .02, 10.2, (cx0 + cx1) / 2, FY + .015, Zf - 12.9);
        const wallX = X - 9.6, zA = Zf - 16.4, zB = Zf - 8.6;
        const doors = [[Zf - 15.9, Zf - 14.7], [Zf - 13.1, Zf - 11.9], [Zf - 10.5, Zf - 9.3]];
        // pared del pasillo con huecos de puerta (los huecos quedan transitables)
        let seg = zA;
        for (let i = 0; i < doors.length; i++) {
          const d = doors[i];
          if (d[0] > seg) {
            box('paredMadera', .18, 2.6, d[0] - seg, wallX, FY + 1.3, (seg + d[0]) / 2);
            solid(wallX, (seg + d[0]) / 2, .13, (d[0] - seg) / 2);
          }
          box('maderaOsc', .24, 2.25, .1, wallX, FY + 1.125, d[0] - .05);
          box('maderaOsc', .24, 2.25, .1, wallX, FY + 1.125, d[1] + .05);
          box('maderaOsc', .24, .12, d[1] - d[0] + .2, wallX, FY + 2.22, (d[0] + d[1]) / 2);
          box('madera', .06, 2.1, d[1] - d[0] - .12, wallX + .17, FY + 1.05, (d[0] + d[1]) / 2 + .12, .4);
          sign(String(101 + i), .42, .26, wallX - .17, FY + 1.75, d[1] + .45, -PI / 2, '#ffd24a', '#2a1a3a');
          seg = d[1];
        }
        if (seg < zB) {
          box('paredMadera', .18, 2.6, zB - seg, wallX, FY + 1.3, (seg + zB) / 2);
          solid(wallX, (seg + zB) / 2, .13, (zB - seg) / 2);
        }
        // pared que separa las habitaciones del vestibulo
        box('paredMadera', .18, 2.6, zB - zA, X - 4.7, FY + 1.3, (zA + zB) / 2);
        solid(X - 4.7, (zA + zB) / 2, .13, (zB - zA) / 2);
        // tabiques entre habitaciones
        for (const zz of [Zf - 13.8, Zf - 11.2]) {
          box('paredMadera', 4.7, 2.6, .16, X - 7.05, FY + 1.3, zz);
          solid(X - 7.05, zz, 2.35, .1);
        }
        sign('HABITACIONES', 2.1, .42, wallX - .2, FY + 2.3, Zf - 12.6, -PI / 2, '#ffd24a', '#2a1a3a');
        for (let i = 0; i < 4; i++) {
          const zz = Zf - 15.2 + i * 2.4;
          box('metalOro', .16, .1, .3, cx0 + .18, FY + 2.05, zz);
          box('emiteCalido', .12, .16, .22, cx0 + .2, FY + 1.96, zz);
          pool(cx0 + 1.1, FY + .03, zz, 2.4, 2.4, 'calido');
        }

        /* --- HABITACION 101 completa (con baño) --- */
        const bx0 = X - 9.4, bx1 = bx0 + 1.6, bz0 = Zf - 16.4, bz1 = bz0 + 2.0;
        box('ceramica', bx1 - bx0, .02, bz1 - bz0, (bx0 + bx1) / 2, FY + .02, (bz0 + bz1) / 2);
        box('paredBlanca', .14, 2.4, bz1 - bz0 - .14, bx1, FY + 1.2, (bz0 + bz1) / 2);
        box('paredBlanca', bx1 - bx0, 2.4, .14, (bx0 + bx1) / 2, FY + 1.2, bz1);
        sign('BAÑO', .9, .3, bx1 + .08, FY + 2.05, bz0 + 1.0, PI / 2, '#27e6ff', '#10131f');
        box('ceramica', .7, .12, .48, bx0 + .45, FY + .82, bz1 - .4);
        cyl('ceramica', .07, .07, .26, bx0 + .45, FY + .68, bz1 - .4, 8);
        cyl('metal', .025, .025, .22, bx0 + .45, FY + .99, bz1 - .55, 6);
        box('cristal', .6, .7, .04, bx0 + .45, FY + 1.55, bz1 - .12);
        box('ceramica', 1.0, .04, 1.0, bx1 - .55, FY + .03, bz0 + .55);
        box('cristal', .04, 1.95, 1.0, bx1 - 1.02, FY + 1.0, bz0 + .55);
        cyl('metal', .02, .02, .9, bx1 - .5, FY + 1.85, bz0 + .3, 6);
        cyl('metal', .1, .1, .05, bx1 - .5, FY + 1.75, bz0 + .45, 10);
        box('ceramica', .42, .4, .55, bx0 + .35, FY + .2, bz0 + .45);
        box('ceramica', .38, .45, .2, bx0 + .35, FY + .62, bz0 + .25);
        cyl('metal', .02, .02, .5, bx1 - .18, FY + 1.1, bz0 + 1.4, 6, [0, 0, PI / 2]);
        // cama
        const bedX = X - 6.2, bedZ = Zf - 15.0;
        box('maderaOsc', 1.7, .32, 2.1, bedX, FY + .22, bedZ);
        box('telaBeige', 1.62, .26, 2.0, bedX, FY + .51, bedZ);
        box('telaAzul', 1.64, .1, 1.3, bedX, FY + .68, bedZ + .3);
        box('ropa', 1.3, .16, .5, bedX, FY + .74, bedZ - .75);
        box('papel', .7, .16, .42, bedX, FY + .7, bedZ - .82);
        box('maderaOsc', 1.8, 1.1, .1, bedX, FY + .55, bedZ - 1.1);
        solid(bedX, bedZ, .9, 1.1);
        for (const sx of [-1, 1]) {
          const nx = bedX + sx * 1.05, nz = bedZ - .78;
          box('madera', .46, .55, .44, nx, FY + .275, nz);
          box('maderaOsc', .5, .06, .48, nx, FY + .58, nz);
          lamparaMesa(nx, FY + .61, nz);
          solid(nx, nz, .25, .24);
        }
        // escritorio y silla
        box('madera', 1.3, .07, .6, X - 5.6, FY + .75, Zf - 14.1);
        box('metalOsc', .08, .75, .08, X - 6.1, FY + .375, Zf - 14.1);
        box('metalOsc', .08, .75, .08, X - 5.1, FY + .375, Zf - 14.1);
        box('metalOsc', .4, .04, .06, X - 5.3, FY + .8, Zf - 14.35);
        lamparaMesa(X - 6.0, FY + .79, Zf - 14.0);
        silla('metalOsc', X - 5.6, FY, Zf - 13.4, PI);
        // armario
        box('maderaOsc', 1.1, 2.1, .58, X - 5.3, FY + 1.05, Zf - 16.1);
        box('metalOro', .04, .3, .04, X - 5.3, FY + 1.2, Zf - 15.8);
        solid(X - 5.3, Zf - 16.1, .55, .3);
        box('papel', .3, .12, .2, X - 5.9, FY + .07, Zf - 15.2, .4);
        box('ropa', .28, .1, .2, X - 5.4, FY + .06, Zf - 15.1, -.3);
        // habitacion 102 y 103 (simplificadas, puertas cerradas)
        box('maderaOsc', 1.6, .3, 2.0, X - 7.0, FY + .21, Zf - 12.6);
        box('telaRoja', 1.5, .24, 1.9, X - 7.0, FY + .48, Zf - 12.6);
        box('papel', .6, .14, .4, X - 7.0, FY + .66, Zf - 13.3);
        solid(X - 7.0, Zf - 12.6, .85, 1.05);
        box('maderaOsc', 1.6, .3, 2.0, X - 7.0, FY + .21, Zf - 10.2);
        box('telaGris', 1.5, .24, 1.9, X - 7.0, FY + .48, Zf - 10.2);
        box('papel', .6, .14, .4, X - 7.0, FY + .66, Zf - 10.9);
        solid(X - 7.0, Zf - 10.2, .85, 1.05);

        /* --- VESTIBULO: recepcion --- */
        const rcZ = Zf - 10.5;
        box('maderaOsc', 7.4, .2, 1.2, X, FY + .05, rcZ);
        box('madera', 7.4, 1.05, 1.05, X, FY + .58, rcZ);
        box('maderaClara', 7.6, .1, 1.2, X, FY + 1.15, rcZ);
        box('metalOsc', .3, .04, .2, X + 1.2, FY + 1.25, rcZ);
        box('metalOsc', .07, .3, .05, X + 1.2, FY + 1.4, rcZ - .05);
        box('metalOsc', .5, .3, .04, X + 1.2, FY + 1.4, rcZ + .02, -.2);
        box('emiteFrio', .44, .25, .02, X + 1.2, FY + 1.4, rcZ + .05, -.2);
        box('metalOsc', .45, .02, .16, X + 1.2, FY + 1.21, rcZ + .3);
        box('papel', .3, .02, .22, X - 1.6, FY + 1.21, rcZ + .25, .2);
        lamparaMesa(X + 2.6, FY + 1.2, rcZ);
        box('maderaOsc', 2.2, 1.1, .35, X + 3.6, FY + .55, rcZ - .3);
        solid(X, rcZ, 3.8, .6);
        box('maderaOsc', 1.8, .9, .08, X - 3.2, FY + 1.9, Zf - 12.5);
        for (let i = 0; i < 8; i++) box('metalOro', .05, .12, .04, X - 3.9 + i * .2, FY + 1.85, Zf - 12.44);
        sign('RECEPCIÓN', 2.6, .5, X - 3.2, FY + 2.65, Zf - 12.5, 0, '#ffd24a', '#10131f');

        /* --- zona de espera (los sofanes ya existen a los lados) --- */
        for (const sx of [-1, 1]) {
          const wx = X + sx * 6.5;
          cyl('maderaClara', .5, .48, .06, wx, FY + .42, Zf - 5.6, 14);
          cyl('metalOro', .05, .07, .4, wx, FY + .2, Zf - 5.6, 8);
          cyl('metalOsc', .14, .18, .03, wx + sx * 1.9, FY + .015, Zf - 4.6, 10);
          cyl('metalOsc', .025, .025, 1.55, wx + sx * 1.9, FY + .78, Zf - 4.6, 8);
          cyl('metalBlanco', .22, .13, .26, wx + sx * 1.9, FY + 1.62, Zf - 4.6, 12);
          sph('emiteCalido', .06, wx + sx * 1.9, FY + 1.5, Zf - 4.6, 8);
          pcol(0x2a2a34, .3, .04, .42, wx, FY + .46, Zf - 5.6, .3);
          vaso(wx + .25, FY + .46, Zf - 5.5);
        }
        box('sueloMoqueta', 9, .02, 4.4, X, FY + .02, Zf - 5.6);
        box('maderaOsc', 3.4, .9, .5, X + 10.5, FY + .45, Zf - 4.2);
        solid(X + 10.5, Zf - 4.2, 1.7, .3);
        planta(X - 11.4, FY, Zf - 3.6, 1.5);
        planta(X + 11.6, FY, Zf - 12.4, 1.3);
        // carro de equipaje
        box('metal', 1.0, .06, .6, X - 9.8, FY + .28, Zf - 8.2);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl('metalOsc', .05, .05, .26, X - 9.8 + sx * .4, FY + .13, Zf - 8.2 + sz * .22, 8, [PI / 2, 0, 0]);
        box('metal', .06, 1.3, .06, X - 10.25, FY + .95, Zf - 8.2);
        box('metal', .06, 1.3, .06, X - 9.35, FY + .95, Zf - 8.2);
        box('metal', 1.0, .06, .06, X - 9.8, FY + 1.6, Zf - 8.2);
        solid(X - 9.8, Zf - 8.2, .5, .35);
        for (const lx of [X - 5, X, X + 5]) {
          box('metalOro', .9, .06, .9, lx, FY + 3.55, Zf - 6.2);
          box('emiteCalido', .8, .05, .8, lx, FY + 3.5, Zf - 6.2);
          pool(lx, FY + .03, Zf - 6.2, 6, 6, 'calido');
        }
        taburete(X + 7.4, FY, Zf - 11.4, 0x6a4a2a);
        taburete(X + 9.6, FY, Zf - 11.4, 0x6a4a2a);
        gente(X + .9, FY, rcZ - .8, 0x1e3a8a, 0x222233, 0x2a1d14, 0, 0);
        gente(X - 3.4, FY, Zf - 6.2, 0xffe8b0, 0x445566, 0x3a2010, 0, .8);
        gente(X + 8.6, FY, Zf - 8.4, 0x8a5cff, 0x2d4a35, 0x14100c, 1, 2.4);

        ZONAS.push({ x0: xi0, x1: xi1, z0: zi0, z1: zi1, y: FY });
      } catch (e) { NC.log && NC.log('interior2: hotel', e); }
    });
  }

  /* ===================== 5. VIVIENDA (apartamento) ===================== */
  /*  roomWalls(EXT+30,150,16,12,4.5) -> centro (448,150)
      cama (445,148) · sofa (450,153) · tv (448,155.6) · armario (453.3,146.8)
      escritorio (442.2,152.2) · planta (453.1,153.8) · alfombra (449.2,151.6) */
  function casa() {
    try {
      const X = EXTv + 30, Z = 150, FY = 0.30;
      const xw = X - 8, xe = X + 8, zn = Z - 6, zs = Z + 6;

      /* --- COCINA: coluna izquierda + peninsula --- */
      const kx = xw + .35, kz0 = Z - 4.0, kz1 = Z + .6;
      box('madera', .7, .88, kz1 - kz0, kx + .35, FY + .44, (kz0 + kz1) / 2);
      box('maderaClara', .78, .06, kz1 - kz0 + .06, kx + .35, FY + .91, (kz0 + kz1) / 2);
      // fregadero
      box('metal', .48, .05, .68, kx + .35, FY + .9, Z - 2.6);
      box('metalOsc', .42, .16, .62, kx + .35, FY + .84, Z - 2.6);
      cyl('metal', .022, .022, .3, kx + .2, FY + 1.06, Z - 2.9, 6);
      cyl('metal', .02, .02, .14, kx + .2, FY + 1.2, Z - 2.83, 6, [PI / 2, 0, 0]);
      // placa de cocion
      box('metalOsc', .58, .04, .5, kx + .35, FY + .96, Z - .8);
      for (let i = 0; i < 4; i++) cyl('metalOsc', .07, .07, .02, kx + .2 + (i % 2) * .3, FY + .99, Z - .95 + ((i / 2) | 0) * .3, 10);
      // armarios altos
      box('madera', .38, .75, 2.4, xw + .19, FY + 1.95, Z - 1.6);
      for (let i = 0; i < 3; i++) box('metalOro', .04, .16, .04, xw + .39, FY + 1.75, Z - 2.5 + i * .9);
      // nevera
      box('metalBlanco', .78, 1.85, .95, kx + .35, FY + .925, Z - 4.5);
      box('metalOsc', .8, .04, .97, kx + .35, FY + 1.3, Z - 4.5);
      box('metal', .05, .5, .05, kx + .72, FY + 1.1, Z - 4.15);
      for (let i = 0; i < 4; i++) pcol([0xff5a7a, 0x27e6ff, 0xffd24a, 0x8a5cff][i], .12, .12, .02, kx + .18 + (i % 2) * .18, FY + 1.5 - ((i / 2) | 0) * .2, Z - 4.02, 0);
      solid(kx + .35, Z - 4.5, .45, .55);
      // peninsula
      box('madera', 1.1, .88, .7, xw + .95, FY + .44, Z - 1.4);
      box('maderaClara', 1.2, .06, .78, xw + .95, FY + .91, Z - 1.4);
      solid(xw + .95, Z - 1.4, .62, .4);
      taburete(xw + 1.25, FY, Z - 2.6, 0x6a4a32);
      // detalle de uso
      pcol(0xc8a878, .34, .05, .26, kx + .35, FY + .96, Z - 3.6, .2);
      pcyl(0xd84a4a, .07, .07, .12, kx + .3, FY + 1.0, Z - 3.85, 8);
      pcyl(0x3f8a4a, .07, .07, .12, kx + .5, FY + 1.0, Z - 3.8, 8);
      for (let i = 0; i < 3; i++) pcyl([0xd8c878, 0xc86a4a, 0xe8e4dc][i], .05, .05, .17, xw + .25 + i * .16, FY + 1.03, Z + .35, 8);
      vaso(xw + 1.2, FY + .94, Z - 1.2);
      // marco de puerta que conecta la cocina con el salon
      box('maderaOsc', .12, 2.1, .18, xw + 1.05, FY + 1.05, Z + 1.0);
      box('maderaOsc', .12, 2.1, .18, xw + 2.45, FY + 1.05, Z + 1.0);
      box('maderaOsc', 1.52, .16, .18, xw + 1.75, FY + 2.18, Z + 1.0);
      box('madera', .06, 2.0, 1.0, xw + 2.45, FY + 1.0, Z + 1.5, -.5);

      /* --- DORMITORIO --- */
      for (const sx of [-1, 1]) {
        const nx = X - 3 + sx * 2.5, nz = Z - 3.8;
        box('madera', .48, .52, .44, nx, FY + .26, nz);
        box('maderaOsc', .52, .06, .48, nx, FY + .55, nz);
        lamparaMesa(nx, FY + .58, nz);
        solid(nx, nz, .26, .24);
      }
      box('maderaOsc', 4.6, 1.3, .12, X - 3, FY + .95, zn + .1);
      box('sueloMoquetaOsc', 3.4, .02, 4.2, X - 1.6, FY + .03, Z - 2.2);
      box('madera', 1.7, .85, .5, X + 1.4, FY + .425, zn + .3);
      box('maderaClara', 1.8, .06, .58, X + 1.4, FY + .88, zn + .3);
      solid(X + 1.4, zn + .3, .9, .3);
      // mesa de comedor con sillas
      const dX = X + 2.2, dZ = Z - 2.6;
      cyl('maderaClara', .62, .6, .07, dX, FY + .74, dZ, 18);
      cyl('maderaOsc', .08, .12, .74, dX, FY + .37, dZ, 10);
      cyl('maderaOsc', .38, .4, .05, dX, FY + .025, dZ, 12);
      for (let i = 0; i < 4; i++) {
        const a = i * PI / 2 + .4;
        const sx = dX + Math.cos(a) * 1.0, sz = dZ + Math.sin(a) * 1.0;
        box('madera', .44, .06, .44, sx, FY + .45, sz, -a);
        for (const o of [[-.16, -.16], [.16, -.16], [.16, .16], [-.16, .16]]) box('maderaOsc', .05, .45, .05, sx + o[0], FY + .225, sz + o[1], -a);
        box('madera', .44, .42, .05, sx - Math.sin(a) * .2, FY + .66, sz + Math.cos(a) * .2, -a);
      }
      solid(dX, dZ, .65, .65);
      // jars y fruitero sobre la mesa
      pcyl(0xd8c878, .06, .06, .2, dX - .22, FY + .88, dZ + .1, 8);
      pcyl(0xc86a4a, .06, .06, .2, dX - .1, FY + .88, dZ + .16, 8);
      pcyl(0xe8e4dc, .1, .09, .16, dX + .2, FY + .86, dZ - .12, 10);
      pcyl(0x3f8a4a, .07, .07, .07, dX + .2, FY + .95, dZ - .12, 8);
      for (let i = 0; i < 5; i++) libro(X + .7 + i * .09, FY + .91, zn + .25, .07, .26, .2, [0x8a3a4a, 0x2a4a6a, 0x3a6a4a, 0x6a5a2a, 0x4a3a5a][i], 0);
      pcyl(0x2a6a4a, .08, .1, .18, X + 2.1, FY + 1.0, zn + .3, 10);
      box('metalOro', .7, 1.7, .06, X + 5.0, FY + 1.35, zn + .08);
      box('cristal', .62, 1.6, .02, X + 5.0, FY + 1.35, zn + .12);

      /* --- SALON --- */
      box('maderaClara', 1.3, .07, .66, X + 1.4, FY + .4, Z + 1.2);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box('metalOsc', .06, .36, .06, X + 1.4 + sx * .55, FY + .18, Z + 1.2 + sz * .25);
      libro(X + 1.0, FY + .44, Z + 1.1, .26, .04, .2, 0x8a2a4a, .3);
      libro(X + 1.05, FY + .48, Z + 1.1, .24, .04, .19, 0x2a4a8a, .1);
      vaso(X + 1.8, FY + .44, Z + 1.05);
      vaso(X + 1.95, FY + .44, Z + 1.2);
      pcyl(0xe8e4dc, .07, .06, .11, X + .9, FY + .5, Z + 1.3, 8);
      // libreria
      const bkX = xe - .46, bkZ = Z + .5;
      box('maderaOsc', .42, 1.9, 2.0, bkX, FY + .95, bkZ);
      for (let lv = 0; lv < 4; lv++) {
        const y = FY + .25 + lv * .45;
        box('madera', .4, .04, 1.9, bkX, y, bkZ);
        for (let i = 0; i < 9; i++) {
          if (Math.random() < .22) continue;
          const col = pick([0x8a3a4a, 0x2a4a6a, 0x3a6a4a, 0x6a5a2a, 0x4a3a5a, 0x8a7a3a]);
          libro(bkX, y + .02, bkZ - .85 + i * .21, .3, .26 + Math.random() * .08, .17, col, 0);
        }
      }
      solid(bkX, bkZ, .25, 1.05);
      // lampara de pie
      cyl('metalOsc', .16, .2, .04, X + 6.2, FY + .02, Z + 4.6, 10);
      cyl('metalOsc', .03, .03, 1.5, X + 6.2, FY + .77, Z + 4.6, 8);
      cyl('metalBlanco', .26, .15, .3, X + 6.2, FY + 1.62, Z + 4.6, 12);
      sph('emiteCalido', .07, X + 6.2, FY + 1.48, Z + 4.6, 8);
      pool(X + 6.2, FY + .04, Z + 4.6, 3, 3, 'calido');
      // mesa auxiliar y cuadro
      cyl('maderaClara', .32, .3, .05, X - 1.2, FY + .52, Z + 4.6, 12);
      cyl('metalOsc', .05, .07, .5, X - 1.2, FY + .25, Z + 4.6, 8);
      box('maderaOsc', 1.3, .9, .06, X - 1.2, FY + 2.2, zs - .12);
      pcol(0x2a6a8a, 1.2, .8, .02, X - 1.2, FY + 2.2, zs - .19, 0);
      // escritorio (ya existe): portatil, taza, papeles
      portatil(X - 5.6, FY + .86, Z + 2.0, .3);
      pcyl(0xe8e4dc, .06, .05, .1, X - 4.9, FY + .86, Z + 2.5, 8);
      box('papel', .34, .01, .26, X - 4.6, FY + .87, Z + 1.9, .4);
      planta(X + 4.6, FY, Z + 4.6, 1.2);
      planta(xw + .5, FY, Z - 5.2, 1.0);
      box('maderaOsc', .5, .6, .04, X - 6.8, FY + 2.0, zn + .1);

      /* --- iluminacion calida --- */
      const luces = [[X - 3, Z - 3.4], [X + 1.4, Z - 4.4], [X + 1.5, Z + 1.6], [X - 5.6, Z + 2.1], [X + 5.6, Z + 3.2]];
      for (const l of luces) {
        box('metalOsc', .9, .1, .5, l[0], FY + 3.9, l[1]);
        box('emiteCalido', .82, .06, .42, l[0], FY + 3.83, l[1]);
        pool(l[0], FY + .04, l[1], 4.2, 4.2, 'calido');
      }
      cyl('metalOsc', .02, .02, .8, xw + 1.0, FY + 3.6, Z - 1.4, 6);
      cyl('metalOsc', .34, .18, .3, xw + 1.0, FY + 3.05, Z - 1.4, 12);
      sph('emiteCalido', .08, xw + 1.0, FY + 2.95, Z - 1.4, 8);
      pool(xw + 1.0, FY + .04, Z - 1.4, 3.4, 3.4, 'calido');

      gente(X + 4.2, FY, Z - 1.6, 0x8a5cff, 0x445566, 0x2a1d14, 0, 2.2);
    } catch (e) { NC.log && NC.log('interior2: casa', e); }
  }

  /* ===================== 6. TIENDA / SUPER ===================== */
  /*  shops[i] con s.floor: interior en (s.x, s.z-7.6), 16x12, suelo 0.39
      mostrador existente en z = zi-1 (x +-7.2) · nevera en (xi-6.3, zi-3.4) */
  function tienda() {
    SHOPS.forEach(function (s) {
      if (!s.floor) return;
      try {
        const X = s.x, Z = s.z - 7.6, FY = 0.39;
        const tipo = s.type || 'General';
        const secciones = {
          'Armeria': ['ARMAS', 'MUNICION', 'ACCESORIOS'],
          'Farmacia': ['SALUD', 'CUIDADO', 'VITAMINAS'],
          'Taller': ['HERRAMIENTAS', 'RECAMBIOS', 'LUBRICANTES'],
          'Super': ['ABASTO', 'BEBIDAS', 'FRESCO'],
          'General': ['CASA', 'JUGUETES', 'VARIOS']
        }[tipo] || ['GENERAL', 'OFERTAS', 'NOVEDADES'];

        box('sueloTienda', 14.4, .04, 6.2, X, FY + .02, Z + 3.0);
        box('sueloMoquetaOsc', 3.4, .03, 1.6, X, FY + .05, Z + 5.0);

        /* --- gondolas con producto ordenado y apoyado --- */
        const gx = [X - 3.6, X + 3.6];
        for (let g = 0; g < gx.length; g++) {
          const gxx = gx[g], z0 = Z + .8, z1 = Z + 4.6, len = z1 - z0, cz = (z0 + z1) / 2;
          box('metalOsc', .1, .35, len, gxx, FY + .175, cz);
          box('metalOsc', .07, 1.85, len, gxx, FY + 1.0, cz);
          for (const sz of [z0, z1]) box('metalOsc', .94, 1.85, .07, gxx, FY + 1.0, sz);
          const lv = [.38, .78, 1.18, 1.58];
          for (const y of lv) {
            for (const sgn of [-1, 1]) {
              box('metalBlanco', .44, .05, len - .1, gxx + sgn * .27, FY + y, cz);
              const top = FY + y + .025;
              let i = 0;
              for (let zz = z0 + .22; zz < z1 - .22; zz += .34) {
                if (Math.random() < .12) { i++; continue; }
                const col = pick([0xd8d2e8, 0xe8d9c2, 0xcfe8dd, 0xe8cfd9, 0xf0d8a8, 0xbcd8f0]);
                const hh = .22 + (i % 3) * .06, ww = .2 + (i % 2) * .05;
                pprod(col, ww, hh, .26, gxx + sgn * .27, top + hh / 2, zz, 0);
                if (i % 3 === 0) pcol(pick([0xff5a7a, 0x27e6ff, 0xffd24a, 0x2ee08a]), ww * .8, hh * .25, .02,
                  gxx + sgn * .27, top + hh * .75, zz + .13, 0);
                i++;
              }
            }
          }
          box('metalOsc', .05, .5, .05, gxx - .4, 3.3, cz);
          box('metalOsc', .05, .5, .05, gxx + .4, 3.3, cz);
          sign(secciones[g], 1.9, .5, gxx, 3.02, cz, 0, '#ffd24a', '#10131f');
          solid(gxx, cz, .5, len / 2);
        }

        /* --- estanterias contra las paredes --- */
        for (const sgn of [-1, 1]) {
          const wx = X + sgn * 7.35, z0 = Z + .6, z1 = Z + 5.0;
          const len = z1 - z0, cz = (z0 + z1) / 2;
          box('metalOsc', .5, 1.9, len, wx, FY + .95, cz);
          for (const y of [.45, .9, 1.35]) {
            box('metalBlanco', .48, .05, len - .06, wx, FY + y, cz);
            const top = FY + y + .025;
            let i = 0;
            for (let zz = z0 + .25; zz < z1 - .25; zz += .4) {
              if (Math.random() < .18) { i++; continue; }
              const hh = .26 + (i % 2) * .08;
              pprod(pick([0xe8d9c2, 0xd8d2e8, 0xcfe8dd, 0xe8cfd9]), .3, hh, .3, wx, top + hh / 2, zz, 0);
              i++;
            }
          }
          solid(wx, cz, .28, len / 2);
        }

        /* --- mostrador con exposicion y caja (el mostrador ya existe) --- */
        const cz2 = Z - 1, CT = 1.51;
        box('maderaClara', 14.4, .06, 1.24, X, 1.48, cz2);
        for (let i = 0; i < 7; i++) {
          pprod(pick([0xff5a7a, 0x27e6ff, 0xffd24a, 0x2ee08a, 0xe8d9c2]), .3, .34, .3, X - 4.2 + i * 1.4, CT + .17, cz2, 0);
        }
        for (let i = 0; i < 4; i++) box('metalOsc', .42, .3, .3, X - 5.6, CT + .15 + i * .06, cz2 + .45, .2);
        box('metalBlanco', 1.2, .1, .5, X + 5.4, CT + .05, cz2 + .3);
        cyl('metalOsc', .12, .16, .95, X - 2.8, FY + .475, Z + 1.4, 10);
        cyl('metalOsc', .12, .16, .95, X + 2.8, FY + .475, Z + 1.4, 10);
        box('metalBlanco', .8, 1.1, .5, X - 3.6, 2.03, cz2 - .3);
        for (let lv = 0; lv < 3; lv++) {
          box('metalBlanco', .82, .04, .52, X - 3.6, 1.62 + lv * .35, cz2 - .3);
          for (let i = 0; i < 3; i++) pcol(pick([0xff5a7a, 0x27e6ff, 0xffd24a, 0x2ee08a]), .18, .24, .18,
            X - 3.9 + i * .3, 1.78 + lv * .35, cz2 - .3, 0);
        }
        solid(X - 3.6, cz2 - .3, .45, .3);

        /* --- iluminacion comercial --- */
        for (let i = 0; i < 3; i++) {
          const lz = Z + 1.0 + i * 2.0;
          box('metalBlanco', 3.2, .12, .38, X, 4.42, lz);
          box('emiteFrio', 3.1, .05, .3, X, 4.34, lz);
          pool(X, FY + .04, lz, 6, 5, 'frio');
        }
        sign(tipo.toUpperCase(), 3.4, .7, X, 3.5, Z - 5.5, 0, '#27e6ff', '#10131f');
        planta(X - 6.4, FY, Z + 4.9, 1.1);
        gente(X - 1.8, FY, Z + 3.2, pick(COLH), pick(PANT), pick(PELOS), 0, R(0, 6));
      } catch (e) { NC.log && NC.log('interior2: tienda', e); }
    });
  }

  /* ===================== 7. CONCESIONARIO ===================== */
  /*  carShops[i]: pabellon en (cs.x-5, cs.z-9), 20x12                       */
  function carro(x, y, z, col, ry) {
    const put = function (k, g) {
      if (ry) g.rotateY(ry);
      g.translate(x, y, z);
      add(k, g);
    };
    const B = function (w, h, d, px, py, pz) { const g = new T.BoxGeometry(w, h, d); g.translate(px, py, pz); return g; };
    const C = function (rt, rb, h, px, py, pz, sg, rot) {
      const g = new T.CylinderGeometry(rt, rb, h, sg || 10);
      if (rot) { if (rot[0]) g.rotateX(rot[0]); if (rot[2]) g.rotateZ(rot[2]); }
      g.translate(px, py, pz); return g;
    };
    put('color', vcol(B(1.82, .58, 4.1, 0, .62, 0), col));
    put('color', vcol(B(1.58, .58, 1.95, 0, 1.18, -.2), col));
    put('cristal', B(1.62, .48, 2.0, 0, 1.22, -.2));
    put('color', vcol(B(1.5, .08, 1.6, 0, 1.5, -.3), col));
    put('metalOsc', B(1.7, .14, .16, 0, .38, 2.02));
    put('metalOsc', B(1.7, .14, .16, 0, .38, -2.02));
    put('emiteCalido', B(.42, .16, .06, -.55, .68, 2.06));
    put('emiteCalido', B(.42, .16, .06, .55, .68, 2.06));
    put('emiteRojo', B(.38, .14, .06, -.58, .68, -2.06));
    put('emiteRojo', B(.38, .14, .06, .58, .68, -2.06));
    put('metal', B(.5, .12, .04, 0, .5, 2.08));
    for (const sx of [-1, 1]) for (const sz of [-1.3, 1.3]) {
      put('caucho', C(.33, .33, .22, sx * .86, .33, sz, 12, [0, 0, PI / 2]));
      put('metal', C(.17, .17, .23, sx * .86, .33, sz, 10, [0, 0, PI / 2]));
    }
    solid(x, z, .95, 2.1);          // el coche estorba: no se atraviesa
  }
  function concesion() {
    CARS.forEach(function (cs) {
      try {
        const X = cs.x - 5, Z = cs.z - 9, FY = 0.44;   // suelo visible del pabellon
        const xi1 = X + 10, zi0 = Z - 6;

        /* --- exposicion: 1 coche en el pedestal + 4 en el suelo --- */
        carro(X, .575, Z, 0xff8a3a, 0);
        carro(X - 7.0, FY, Z - 3.4, 0x2f4f8f, 0);
        carro(X - 7.0, FY, Z + 1.4, 0xd8d2c0, 0);
        carro(X + 7.0, FY, Z - 3.4, 0x2f6f3f, 0);
        carro(X + 7.0, FY, Z + 1.4, 0x3a3a44, 0);

        /* --- marca en la pared --- */
        box('metalOsc', 7.6, 1.7, .12, X, 3.3, zi0 + .28);
        sign('SUZUKI NEON', 7.2, 1.3, X, 3.3, zi0 + .35, 0, '#ff8a3a', '#10131f');
        box('metalOsc', .12, 3.4, 9.4, xi1 - .3, 2.6, Z - .4);
        sign('NEON', 4.4, 1.1, xi1 - .38, 3.0, Z - .4, -PI / 2, '#27e6ff', '#10131f');
        box('emiteCian', .05, .05, 8.6, xi1 - .42, 2.1, Z - .4);
        // expositor de folletos (junto a la entrada, sin tapar los pasillos)
        box('metalBlanco', .9, 1.1, .5, X - 2.2, FY + .55, Z + 4.8);
        for (let i = 0; i < 3; i++) pcol([0xff8a3a, 0x27e6ff, 0xffd24a][i], .26, .3, .04, X - 2.2, FY + .4 + i * .32, Z + 4.55, 0);
        solid(X - 2.2, Z + 4.8, .45, .3);

        /* --- mostrador de ventas --- */
        const dX = X + 3.6, dZ = Z + 4.4;
        box('madera', 3.2, 1.05, .9, dX, FY + .525, dZ);
        box('maderaClara', 3.4, .1, 1.05, dX, FY + 1.1, dZ);
        box('metalOsc', .35, .05, .25, dX - .8, FY + 1.15, dZ);
        box('metalOsc', .07, .32, .06, dX - .8, FY + 1.32, dZ);
        box('metalOsc', .62, .4, .05, dX - .8, FY + 1.4, dZ - .02, -.15);
        box('emiteFrio', .56, .34, .02, dX - .8, FY + 1.4, dZ + .02, -.15);
        box('maderaOsc', .5, .1, .35, dX + .6, FY + 1.15, dZ);
        pcyl(0xd8d2c0, .05, .05, .16, dX + .6, FY + 1.28, dZ, 8);
        box('papel', .32, .02, .24, dX + .1, FY + 1.16, dZ + .25, .2);
        solid(dX, dZ, 1.7, .55);
        sign('VENTAS', 2.4, .55, dX, 2.9, dZ - .55, 0, '#ffd24a', '#10131f');
        silla('metalOsc', dX, FY, dZ - .9, 0);

        /* --- despacho acristalado al fondo (con puerta central) --- */
        const ox0 = X - 2.6, ox1 = X + 2.6, oz0 = Z - 6.0, oz1 = Z - 3.4;
        const doorW = 1.1, dL = (ox0 + ox1) / 2 - doorW / 2, dR = (ox0 + ox1) / 2 + doorW / 2;
        box('cristal', dL - ox0, 2.4, .06, (ox0 + dL) / 2, FY + 1.2, oz1);
        box('cristal', ox1 - dR, 2.4, .06, (dR + ox1) / 2, FY + 1.2, oz1);
        box('cristal', .06, 2.4, oz1 - oz0, ox0, FY + 1.2, (oz0 + oz1) / 2);
        box('cristal', .06, 2.4, oz1 - oz0, ox1, FY + 1.2, (oz0 + oz1) / 2);
        box('metalOsc', ox1 - ox0 + .1, .12, .12, (ox0 + ox1) / 2, FY + 2.45, oz1);
        box('metalOsc', .12, 2.45, .12, ox0, FY + 1.22, oz1);
        box('metalOsc', .12, 2.45, .12, ox1, FY + 1.22, oz1);
        box('metalOsc', .1, 2.4, .12, dL, FY + 1.2, oz1);
        box('metalOsc', .1, 2.4, .12, dR, FY + 1.2, oz1);
        solid((ox0 + dL) / 2, oz1, (dL - ox0) / 2, .1);
        solid((dR + ox1) / 2, oz1, (ox1 - dR) / 2, .1);
        solid(ox0, (oz0 + oz1) / 2, .1, (oz1 - oz0) / 2);
        solid(ox1, (oz0 + oz1) / 2, .1, (oz1 - oz0) / 2);
        box('madera', 2.6, .08, .9, X + .6, FY + .75, oz0 + .8);
        box('metalOsc', .08, .75, .08, X - .4, FY + .375, oz0 + .8);
        box('metalOsc', .08, .75, .08, X + 1.6, FY + .375, oz0 + .8);
        pantalla(X + .6, FY + .79, oz0 + .55, .6, 0);
        box('metalOsc', .45, .03, .18, X + .6, FY + .81, oz0 + 1.05);
        silla('metalOsc', X + .6, FY, oz0 + 1.5, PI);
        box('madera', 2.0, .08, .8, X - 1.4, FY + .75, oz0 + 1.6);
        box('metalOsc', .08, .75, .08, X - 2.2, FY + .375, oz0 + 1.6);
        box('metalOsc', .08, .75, .08, X - .6, FY + .375, oz0 + 1.6);
        pantalla(X - 1.4, FY + .79, oz0 + 1.35, .5, 0);
        silla('metalOsc', X - 1.4, FY, oz0 + 2.4, 0);
        box('metalOsc', 1.0, 1.6, .5, X + 2.1, FY + .8, oz0 + .4);
        for (let i = 0; i < 3; i++) box('metalBlanco', .9, .04, .03, X + 2.1, FY + .5 + i * .5, oz0 + .16);
        solid(X + 2.1, oz0 + .4, .5, .25);

        /* --- zona de espera (sin tapar los pasillos laterales) --- */
        for (const s of [[-5.2, 4.6], [6.2, 4.6]]) {
          const sx = X + s[0], sz = Z + s[1];
          box('telaGris', 1.0, .42, .9, sx, FY + .35, sz);
          box('telaGris', 1.0, .75, .18, sx, FY + .8, sz + .42);
          for (const o of [[-.42, -.36], [.42, -.36], [.42, .36], [-.42, .36]]) box('metalOsc', .05, .18, .05, sx + o[0], FY + .09, sz + o[1]);
          solid(sx, sz, .5, .45);
        }
        box('maderaClara', 1.1, .06, .6, X - 5.2, FY + .42, Z + 3.3);
        box('metalOsc', .08, .42, .08, X - 5.65, FY + .21, Z + 3.3);
        box('metalOsc', .08, .42, .08, X - 4.75, FY + .21, Z + 3.3);
        planta(X + 8.8, FY, Z + 4.8, 1.2);

        /* --- iluminacion de sala --- */
        box('metalOsc', 18.4, .14, .14, X, 5.3, Z);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          const lx = X + sx * 7.0, lz = Z + sz * 3.4;
          box('metalOsc', .06, .35, .06, lx, 5.05, lz);
          cyl('metalOsc', .16, .13, .3, lx, 4.75, lz, 12);
          cyl('emiteCalido', .12, .12, .03, lx, 4.59, lz, 12);
          pool(lx, FY + .03, lz, 5, 5, 'calido');
        }
        box('emiteAmbar', 8.4, .05, .05, X, 4.2, Z + 5.4);
        gente(X - 3.2, FY, Z + 2.2, 0x2f4f8f, 0x222233, 0x2a1d14, 0, 1.2);
        gente(X + 5.4, FY, Z + 1.4, 0xffe8b0, 0x445566, 0x1a1a1a, 1, 2.6);
      } catch (e) { NC.log && NC.log('interior2: concesionario', e); }
    });
  }

  /* ===================== 8. OFICINA / CASA DE EMPRESAS ===================== */
  /*  Reutilizable: oficina(cx, cz, w, d, conCasco)                         */
  function oficina(cx, cz, w, d, conCasco) {
    try {
      const FY = 0.16, H = 2.9;
      const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
      const cw = 2.2;                       // semiancho del pasillo

      if (conCasco !== false) {
        box('sueloOficina', w, .12, d, cx, FY - .06, cz);
        const gapW = 2.4, gapX = cx - w * .22;
        for (const s of [[x0, gapX - gapW / 2], [gapX + gapW / 2, x1]]) {
          if (s[1] - s[0] < .05) continue;
          box('paredOficina', s[1] - s[0], 3.6, .3, (s[0] + s[1]) / 2, 1.8, z1 - .15);
          solid((s[0] + s[1]) / 2, z1 - .15, (s[1] - s[0]) / 2, .15);
        }
        box('paredOficina', w, 3.6, .3, cx, 1.8, z0 + .15);
        box('paredOficina', .3, 3.6, d, x0 + .15, 1.8, cz);
        box('paredOficina', .3, 3.6, d, x1 - .15, 1.8, cz);
        solid(cx, z0 + .15, w / 2, .15); solid(x0 + .15, cz, .15, d / 2); solid(x1 - .15, cz, .15, d / 2);
        box('metalOsc', w + .8, .4, d + .8, cx, 3.8, cz);
        box('metalOsc', 4.4, .18, 2.2, gapX, 3.05, z1 + 1.0);
        for (const s of [-1, 1]) box('metalOsc', .16, 2.9, .16, gapX + s * 2.0, 1.45, z1 + 1.9);
        box('metalOsc', 6.2, 1.3, .16, cx + 1.5, 2.7, z1 - .12);
        sign('COSTA DIGITAL', 5.4, .9, cx + 1.5, 2.7, z1 - .02, 0, '#27e6ff', '#10131f');
      }

      /* --- pasillo central --- */
      box('sueloMoquetaOsc', cw * 2 - .5, .02, d - .8, cx, FY + .03, cz);

      /* --- muros interiores con huecos de puerta --- */
      const rX = cx - w * .27, rZ = z1 - 2.3;
      const desp = [[z0 + .3, z0 + 7.0], [z0 + 7.4, z1 - 4.6]];
      const despZ = [(desp[0][0] + desp[0][1]) / 2, (desp[1][0] + desp[1][1]) / 2];
      const mX = x1 - 3.8, mZ = z0 + 4.0;
      const dRecep = [rZ - .8, rZ + .8];       // recepcion (izq)
      const dDespA = [despZ[0] - .7, despZ[0] + .7];
      const dDespB = [despZ[1] - .7, despZ[1] + .7];
      const dReun = [mZ - .7, mZ + .7];         // sala de reuniones (der)
      const dOpen = [z1 - 3.9, z1 - 2.3];       // despacho abierto (der)
      wallGap('paredOficina', 'z', cx - cw, z0 + .2, z1 - .4, [dRecep, dDespA, dDespB], FY, H, .16);
      wallGap('paredOficina', 'z', cx + cw, z0 + .2, z1 - .4, [dReun, dOpen], FY, H, .16);
      wallSolid('z', cx - cw, z0 + .2, z1 - .4, [dRecep, dDespA, dDespB], .16);
      wallSolid('z', cx + cw, z0 + .2, z1 - .4, [dReun, dOpen], .16);

      /* --- recepcion (izquierda, frente) --- */
      box('maderaOsc', 3.6, 1.05, .9, rX, FY + .525, rZ);
      box('maderaClara', 3.8, .1, 1.05, rX, FY + 1.1, rZ);
      box('metalOsc', .32, .05, .22, rX - .9, FY + 1.15, rZ);
      box('metalOsc', .07, .3, .05, rX - .9, FY + 1.3, rZ - .05);
      box('metalOsc', .56, .38, .05, rX - .9, FY + 1.28, rZ - .02, -.12);
      box('emiteFrio', .5, .32, .02, rX - .9, FY + 1.28, rZ + .03, -.12);
      box('papel', .3, .02, .22, rX + .7, FY + 1.16, rZ + .2, .3);
      pcyl(0x3a8a5a, .09, .11, .2, rX + 1.3, FY + 1.25, rZ, 10);
      solid(rX, rZ, 1.9, .5);
      sign('RECEPCIÓN', 2.2, .45, rX, 2.55, rZ - .55, 0, '#27e6ff', '#10131f');
      box('telaAzul', 2.0, .42, .85, rX, FY + .35, rZ + 1.9);
      box('telaAzul', 2.0, .7, .16, rX, FY + .78, rZ + 2.28);
      for (const o of [[-.9, -.34], [.9, -.34], [.9, .34], [-.9, .34]]) box('metalOsc', .05, .14, .05, rX + o[0], FY + .07, rZ + 1.9 + o[1]);
      planta(rX + 2.4, FY, rZ + 1.6, 1.3);
      tablero(cx - w * .27 + 2.6, 1.8, z0 + .4, 1.6, 1.1);

      /* --- dos despachos a la izquierda --- */
      for (let i = 0; i < desp.length; i++) {
        const dz = despZ[i];
        const dx = cx - cw - 2.4;
        box('madera', 1.8, .08, .8, dx, FY + .75, dz);
        box('metalOsc', .08, .75, .08, dx - .7, FY + .375, dz);
        box('metalOsc', .08, .75, .08, dx + .7, FY + .375, dz);
        pantalla(dx, FY + .79, dz - .25, .62, 0);
        box('metalOsc', .45, .03, .17, dx, FY + .81, dz + .25);
        silla('metalOsc', dx, FY, dz - .9, 0);
        box('maderaOsc', .5, .6, .7, dx + 1.5, FY + .3, dz + 1.2);
        box('papel', .4, .04, .3, dx + 1.5, FY + .62, dz + 1.2, .3);
        box('metalBlanco', .9, 1.4, .5, x0 + .55, FY + .7, dz);
        for (let k = 0; k < 3; k++) box('metalOsc', .8, .04, .03, x0 + .55, FY + .4 + k * .45, dz + .26);
        solid(dx, dz, .95, .45);
        solid(x0 + .55, dz, .45, .25);
        sign('DESPACHO ' + (i + 1), 1.1, .26, cx - cw - .12, FY + 2.3, (i ? dDespB : dDespA)[0] + .6, -PI / 2, '#ffd24a', '#2a1a3a');
      }

      /* --- zona de descanso --- */
      const kX = x0 + 2.4, kZ = z1 - 6.4;
      box('madera', 2.4, .9, .7, kX, FY + .45, kZ);
      box('maderaClara', 2.5, .06, .8, kX, FY + .93, kZ);
      box('metalBlanco', .8, 1.9, .75, kX + 1.7, FY + .95, kZ);
      cyl('metalOsc', .05, .05, .5, kX + 1.4, FY + 1.2, kZ);
      pcyl(0x2a2a32, .07, .07, .16, kX - .5, FY + 1.05, kZ, 8);
      pcyl(0x2a2a32, .07, .07, .16, kX + .2, FY + 1.05, kZ, 8);
      solid(kX, kZ, 1.25, .4);
      box('maderaClara', 1.1, .06, .8, kX + .1, FY + .74, kZ + 1.6);
      box('metalOsc', .07, .74, .07, kX - .35, FY + .37, kZ + 1.6);
      box('metalOsc', .07, .74, .07, kX + .55, FY + .37, kZ + 1.6);
      taburete(kX - .3, FY, kZ + 2.6, 0x2a2a32);
      taburete(kX + .5, FY, kZ + 2.6, 0x2a2a32);

      /* --- despacho abierto a la derecha --- */
      for (let i = 0; i < 3; i++) {
        const dx = x1 - 2.6 - i * 3.1, dz = z1 - 4.8;
        box('madera', 1.6, .08, .8, dx, FY + .75, dz);
        for (const o of [[-.6, -.3], [.6, -.3], [.6, .3], [-.6, .3]]) box('metalOsc', .06, .75, .06, dx + o[0], FY + .375, dz + o[1]);
        pantalla(dx, FY + .79, dz - .22, .6, 0);
        box('metalOsc', .45, .03, .18, dx, FY + .81, dz + .28);
        box('metalOsc', .42, .05, .16, dx, FY + .81, dz + .32, .2);
        silla('metalOsc', dx, FY, dz + .9, PI);
        solid(dx, dz, .85, .45);
        box('telaGris', .05, .45, 1.6, dx + 1.35, FY + 1.0, dz);
      }

      /* --- sala de reuniones (derecha, fondo) --- */
      box('paredOficina', 7.6, H, .16, cx + cw + 3.8, FY + H / 2, z0 + 6.0);
      box('cristal', 7.2, 1.2, .06, cx + cw + 3.8, FY + 1.9, z0 + 6.0);
      box('metalOsc', 7.6, .1, .1, cx + cw + 3.8, FY + 2.5, z0 + 6.0);
      box('maderaClara', 2.8, .09, 1.3, mX, FY + .76, mZ);
      box('metalOsc', .1, .76, .1, mX - 1.0, FY + .38, mZ);
      box('metalOsc', .1, .76, .1, mX + 1.0, FY + .38, mZ);
      box('metalOsc', .1, .76, .1, mX, FY + .38, mZ);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        silla('metalOsc', mX + Math.cos(a) * 1.75, FY, mZ + Math.sin(a) * 1.05, -a + Math.PI / 2);
      }
      solid(mX, mZ, 1.5, .8);
      box('metalOsc', 2.0, 1.2, .08, mX, FY + 1.9, z0 + .35);
      box('emiteFrio', 1.86, 1.06, .02, mX, FY + 1.9, z0 + .42);
      tablero(x1 - .4, 1.8, mZ, 2.2, 1.2);
      box('papel', .4, .02, .3, mX + .4, FY + .82, mZ + .1, .3);

      /* --- iluminacion de oficina --- */
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const lx = x0 + 3.0 + i * (w - 6) / 2, lz = z0 + 3.4 + j * (d - 6.8);
        box('metalBlanco', 2.6, .1, .4, lx, 3.55, lz);
        box('emiteCalido', 2.5, .05, .34, lx, 3.48, lz);
        pool(lx, FY + .04, lz, 5, 5, 'calido');
      }
      // personal
      gente(mX, FY, mZ + 2.0, 0x4a8ad8, 0x222233, 0x2a1d14, 0, PI);
      gente(x1 - 4.2, FY, z1 - 2.6, 0xffe8b0, 0x445566, 0x1a1a1a, 0, 1.6);
      gente(rX - 1.2, FY, rZ - 1.2, 0xff8a3a, 0x222233, 0x3a2010, 0, 0);

      if (conCasco !== false) ZONAS.push({ x0: x0 + .3, x1: x1 - .3, z0: z0 + .3, z1: z1 - .3, y: FY });
    } catch (e) { NC.log && NC.log('interior2: oficina', e); }
  }

  /* ===================== 9. CLINICA ===================== */
  /*  CLINIC = {x:EXT+20, z:44}, 12x8, suelo visible 0.47                  */
  function clinica() {
    if (!CLI) return;
    try {
      const X = CLI.x, Z = CLI.z, FY = 0.47;

      /* --- zona de espera (columna derecha delantera) --- */
      for (let i = 0; i < 3; i++) {
        const cz2 = Z + .9 + i * .85;                 // 44.9, 45.75, 46.6
        box('telaAzul', .9, .1, .55, X + 4.3, FY + .45, cz2);
        box('telaAzul', .12, .5, .55, X + 3.95, FY + .72, cz2);
        for (const o of [[-.35, -.2], [.35, -.2], [.35, .2], [-.35, .2]]) box('metal', .04, .4, .04, X + 4.3 + o[0], FY + .2, cz2 + o[1]);
      }
      // mesa de revistas (al fondo, no en el paso)
      cyl('maderaClara', .3, .28, .05, X + 3.9, FY + .48, Z + 2.9, 12);
      cyl('metalOsc', .05, .07, .46, X + 3.9, FY + .24, Z + 2.9, 8);
      for (let i = 0; i < 3; i++) pcol([0xff5a7a, 0x27e6ff, 0xffd24a][i], .24, .03, .18, X + 3.8 + i * .08, FY + .52, Z + 2.85, .2);
      // dispensador de agua
      cyl('metalBlanco', .16, .16, .45, X + 3.4, FY + .72, Z + .4, 12);
      cyl('cristal', .13, .11, .2, X + 3.4, FY + 1.04, Z + .4, 12);
      // pantalla de cristal: marca el limite pero deja la entrada de la sala libre
      box('cristal', .06, 2.0, 1.8, X + 2.3, FY + 1.2, Z + 1.5);
      box('metalOsc', .1, 2.1, .1, X + 2.3, FY + 1.05, Z + .65);
      box('metalOsc', .1, 2.1, .1, X + 2.3, FY + 1.05, Z + 2.35);
      box('metalOsc', .12, .12, 1.85, X + 2.3, FY + 2.25, Z + 1.5);
      solid(X + 2.3, Z + 1.5, .1, .9);
      sign('SALA DE ESPERA', 1.9, .36, X + 2.3, FY + 2.05, Z + 2.4, 0, '#27e6ff', '#10131f');
      planta(X + 4.3, FY, Z + 3.5, 1.2);

      /* --- consulta (columna derecha trasera) --- */
      // tabique con hueco de puerta (z 42.4..43.6)
      box('paredBlanca', .16, 2.6, 1.35, X + 2.3, FY + 1.3, Z - 2.275);
      box('paredBlanca', .16, 2.6, 1.35, X + 2.3, FY + 1.3, Z + .275);
      solid(X + 2.3, Z - 2.275, .1, .68);
      solid(X + 2.3, Z + .275, .1, .68);
      box('metalOsc', .1, 2.6, .1, X + 2.3, FY + 1.3, Z - 2.95);
      box('metalOsc', .1, 2.6, .1, X + 2.3, FY + 1.3, Z + .95);
      const bX = X + 3.7, bZ = Z - 1.7;
      box('metalBlanco', .85, .12, 2.0, bX, FY + .78, bZ);
      box('telaBeige', .8, .1, 1.9, bX, FY + .88, bZ);
      box('metalBlanco', .82, .1, .6, bX, FY + .92, bZ - .72);
      box('metalOsc', .07, .78, .07, bX - .3, FY + .39, bZ + .7);
      box('metalOsc', .07, .78, .07, bX + .3, FY + .39, bZ + .7);
      box('metalOsc', .07, .78, .07, bX - .3, FY + .39, bZ - .7);
      box('metalOsc', .07, .78, .07, bX + .3, FY + .39, bZ - .7);
      solid(bX, bZ, .45, 1.0);
      box('madera', 1.5, .08, .7, X + 4.0, FY + .76, Z - 3.2);
      box('metalOsc', .07, .76, .07, X + 3.4, FY + .38, Z - 3.2);
      box('metalOsc', .07, .76, .07, X + 4.6, FY + .38, Z - 3.2);
      pantalla(X + 4.0, FY + .8, Z - 3.4, .5, 0);
      silla('metalBlanco', X + 4.0, FY, Z - 2.6, PI);
      // armario de instrumental con cristal
      box('metalBlanco', 1.2, 2.0, .45, X + 2.9, FY + 1.0, Z - 3.6);
      box('cristal', 1.1, 1.3, .04, X + 2.9, FY + 1.25, Z - 3.37);
      for (let i = 0; i < 3; i++) {
        box('metalBlanco', 1.1, .04, .4, X + 2.9, FY + .45 + i * .45, Z - 3.6);
        for (let k = 0; k < 3; k++) pcol([0xc8d8e8, 0xe8e4dc, 0xd8e8c8][k], .2, .12, .12, X + 2.5 + k * .35, FY + .53 + i * .45, Z - 3.5, 0);
      }
      solid(X + 2.9, Z - 3.6, .6, .25);
      // lavabo
      box('ceramica', .5, .12, .42, X + 2.7, FY + .82, Z - 2.5);
      cyl('metal', .02, .02, .22, X + 2.7, FY + .99, Z - 2.65, 6);
      box('metalBlanco', .55, .6, .18, X + 2.7, FY + 1.35, Z - 2.85);
      sign('CONSULTA 2', 1.2, .3, X + 2.3, FY + 2.15, Z - .15, 0, '#27e6ff', '#10131f');

      /* --- sala de curas (izquierda, ya hay 2 camillas) --- */
      for (let i = 0; i < 2; i++) {
        const cz3 = Z - 2.2 + i * 1.9;
        box('metalOsc', .05, .05, 2.0, X - 5.6, FY + 2.1, cz3);
        box('metalOsc', .05, .05, 2.0, X - 1.5, FY + 2.1, cz3);
        box('metalOsc', 4.2, .05, .05, X - 3.5, FY + 2.1, cz3 + .95);
        box('ropa', 1.6, 1.7, .04, X - 3.0, FY + 1.2, cz3 + .95);
        box('metalBlanco', .5, .8, .45, X - 5.1, FY + .4, cz3 - .7);
        box('metalOsc', .42, .3, .05, X - 5.1, FY + .95, cz3 - .9);
        box('emiteFrio', .38, .26, .02, X - 5.1, FY + .95, cz3 - .93);
      }
      // armario de farmacos y carro de limpieza
      box('metalBlanco', 1.4, 1.9, .4, X - 5.4, FY + .95, Z + 1.6);
      for (let i = 0; i < 3; i++) box('metalOsc', 1.3, .04, .36, X - 5.4, FY + .5 + i * .5, Z + 1.6);
      solid(X - 5.4, Z + 1.6, .7, .22);
      box('metalBlanco', .55, .85, .45, X - 5.3, FY + .45, Z + 3.2);
      box('metalOsc', .5, .06, .4, X - 5.3, FY + .9, Z + 3.2);
      cyl('metalOsc', .05, .05, .95, X - 5.3, FY + .95, Z + 3.2, 6);
      pcyl(0x4a8ad8, .08, .1, .28, X - 5.3, FY + 1.1, Z + 3.2, 8);
      box('ceramica', .55, .14, .45, X - 4.6, FY + .86, Z + 3.3);
      cyl('metal', .02, .02, .2, X - 4.6, FY + 1.02, Z + 3.45, 6);

      /* --- recepcion (centro): el mostrador viejo ya existe, se remata --- */
      const rZ = Z + 1;
      box('madera', 4.0, .32, .07, X, FY + .16, Z + .43);        // faldon que tapa el hueco
      box('maderaClara', 4.3, .08, 1.3, X, 1.29, rZ);            // encimera
      box('metalOsc', .35, .05, .24, X - .8, 1.33, rZ - .1);
      box('metalOsc', .07, .3, .06, X - .8, 1.48, rZ - .15);
      box('metalOsc', .56, .38, .05, X - .8, 1.56, rZ - .18, -.12);
      box('emiteFrio', .5, .32, .02, X - .8, 1.56, rZ - .15, -.12);
      box('papel', .3, .02, .22, X + .7, 1.34, rZ + .1, .3);
      pcyl(0x3a8a5a, .09, .11, .2, X + 1.4, 1.44, rZ - .2, 10);
      sign('RECEPCIÓN', 2.2, .45, X, 2.5, rZ - .7, 0, '#3dff9a', '#10131f');
      box('metalBlanco', .8, .04, .5, X + 1.5, 1.34, rZ);
      box('metalBlanco', .7, .5, .5, X - 1.6, FY + .3, rZ - .9);
      box('cristal', .66, .4, .44, X - 1.6, FY + .32, rZ - .9);
      solid(X, rZ, 2.2, .55);

      /* --- iluminacion limpia --- */
      for (const l of [[X, Z + 2.6], [X, Z - 2.2], [X + 3.6, Z]]) {
        box('metalBlanco', 2.0, .1, .4, l[0], FY + 3.05, l[1]);
        box('emiteFrio', 1.9, .05, .34, l[0], FY + 2.98, l[1]);
        pool(l[0], FY + .04, l[1], 4, 4, 'frio');
      }
      gente(X + 1.4, FY, rZ - .9, 0xe8e8ee, 0x445566, 0x3a2010, 0, 0);
      gente(X - .4, FY, Z + 2.4, 0x8a5cff, 0x222233, 0x2a1d14, 0, 1.4);
      gente(X + 3.6, FY, Z - 2.4, 0xffe8b0, 0x2d4a35, 0x14100c, 0, 2.8);
    } catch (e) { NC.log && NC.log('interior2: clinica', e); }
  }

  /* ===================== 10. TALLER / NAVE ===================== */
  /*  FACTORY = {x,z}, 30x24, porton central ancho en z+12                    */
  function taller() {
    if (!FAC) return;
    try {
      const X = FAC.x, Z = FAC.z, FY = 0.42;
      const zn = Z - 12, zs = Z + 12;

      /* --- porton ancho enrollado --- */
      cyl('metalOsc', .45, .45, 10.4, X, 6.9, zs - .18, 14, [0, 0, PI / 2]);
      for (const sx of [-1, 1]) box('metalOsc', .3, 6.6, .4, X + sx * 5.2, 3.3, zs - .18);
      box('metalOsc', 10.8, .25, .5, X, 6.5, zs - .18);
      for (let i = 0; i < 8; i++) pcol(i % 2 ? 0xffd24a : 0x22262e, .5, .04, .5, X - 4.2 + i * 1.2, FY + .02, zs - 3.2, 0);
      box('metalOsc', 3.2, 3.4, .18, X - 10.2, FY + 1.7, zs + .12);
      box('metalOsc', 3.2, 3.4, .18, X + 10.2, FY + 1.7, zs + .12);
      box('cristalOsc', 1.0, 1.0, .06, X - 10.2, FY + 2.3, zs + .23);

      /* --- bancadas de trabajo --- */
      for (let i = 0; i < 2; i++) {
        const bz = Z - 7.5 + i * 6.0;
        box('madera', 1.1, .1, 5.2, X - 13.4, FY + .95, bz);
        box('metalOsc', .12, .95, .12, X - 13.4, FY + .475, bz - 2.4);
        box('metalOsc', .12, .95, .12, X - 13.4, FY + .475, bz + 2.4);
        box('metalOsc', 1.0, .7, .5, X - 13.4, FY + .35, bz);
        box('metalOsc', .22, .3, .22, X - 13.4, FY + 1.15, bz - 1.4);
        pcol(0x8a3a3a, .3, .18, .2, X - 13.4, FY + 1.09, bz + .6, .3);
        pcol(0x4a4a52, .22, .12, .16, X - 13.4, FY + 1.06, bz + 1.1, -.2);
        pcyl(0xc8a24a, .06, .06, .3, X - 13.4, FY + 1.15, bz - .3, 8);
        pcyl(0x555b66, .1, .1, .18, X - 13.4, FY + 1.09, bz + 1.7, 10);
        box('metalOsc', .08, 1.6, 5.0, X - 14.6, FY + 1.9, bz);
        for (let k = 0; k < 8; k++) pcol(0xb0b6c0, .05, .35 + Math.random() * .25, .06, X - 14.54, FY + 2.1, bz - 2.2 + k * .62, 0);
        solid(X - 13.4, bz, .6, 2.7);
      }

      /* --- estanterias con recambios (columna derecha, sin chocar con la oficina) --- */
      for (let i = 0; i < 2; i++) {
        const sx = X + 12.6, sz = Z + 1.0 + i * 5.0;
        for (let lv = 0; lv < 4; lv++) {
          const y = FY + .5 + lv * .75;
          box('metalOsc', 3.6, .07, 1.1, sx, y, sz);
          for (let k = 0; k < 3; k++) {
            if (Math.random() < .18) continue;
            pcol(pick([0x8a6a4a, 0x5a5a62, 0x3a6a8a, 0x8a3a3a]), .8, .5, .8, sx - 1.1 + k * 1.1, y + .285, sz, 0);
          }
        }
        for (const o of [[-1.7, -.5], [1.7, -.5], [1.7, .5], [-1.7, .5]]) box('metalOsc', .1, 3.2, .1, sx + o[0], FY + 1.6, sz + o[1]);
        solid(sx, sz, 1.85, .6);
      }

      /* --- neumaticos y piezas --- */
      for (let k = 0; k < 3; k++) torus('caucho', .52, .2, X - 6.0, FY + .22 + k * .36, Z + 8.5, [PI / 2, 0, 0]);
      solid(X - 6.0, Z + 8.5, .55, .55);
      for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) torus('caucho', .46, .18, X - 8.0 + i * 1.3, FY + .2 + k * .34, Z + 6.0, [PI / 2, 0, 0]);
      for (let i = 0; i < 5; i++) cyl('metal', .06, .06, 2.6, X - 2.5 + i * .12, FY + .06, Z + 9.0, 8, [0, 0, PI / 2]);
      pcyl(0xff8a3a, .42, .42, 1.1, X + 12.5, FY + .55, Z + 7.0, 14);
      cyl('metalOsc', .42, .42, 1.1, X + 12.5, FY + .55, Z + 8.1, 14);
      cyl('metalOsc', .42, .42, 1.1, X + 12.5, FY + .55, Z + 9.2, 14);

      /* --- oficina de la nave --- */
      box('madera', 2.4, .1, 1.2, X + 12.0, FY + .78, Z - 9.5);
      box('metalOsc', .1, .78, .1, X + 11.0, FY + .39, Z - 9.5);
      box('metalOsc', .1, .78, .1, X + 13.0, FY + .39, Z - 9.5);
      pantalla(X + 12.0, FY + .83, Z - 9.8, .55, 0);
      box('papel', .4, .02, .3, X + 11.4, FY + .84, Z - 9.2, .4);
      box('maderaOsc', 1.4, 2.1, .6, X + 13.6, FY + 1.05, Z - 9.6);
      solid(X + 12.0, Z - 9.5, 1.25, .65);
      tablero(X + 13.9, FY + 1.9, Z - 6.0, 2.0, 1.2);

      /* --- señalizacion --- */
      sign('TALLER', 3.4, .8, X, 5.2, zn + .4, 0, '#ffd24a', '#10131f');
      sign('ALMACÉN', 2.6, .6, X + 9.0, 3.9, Z - 3.2, 0, '#27e6ff', '#10131f');
      sign('REPUESTOS', 2.6, .6, X - 13.0, 3.9, Z + 2.4, -PI / 2, '#ff8a3a', '#10131f');
      sign('PROHIBIDO EL PASO', 2.4, .5, X + 5.4, 2.2, zs - .1, PI, '#ff5a5a', '#10131f');

      /* --- iluminacion de trabajo --- */
      for (let i = -1; i <= 1; i++) for (let j = 0; j < 2; j++) {
        const lx = X + i * 7.5, lz = Z - 5.0 + j * 9.0;
        cyl('metalOsc', .04, .04, 1.1, lx, 7.3, lz, 6);
        cyl('metalOsc', .75, .28, .5, lx, 6.7, lz, 14);
        cyl('emiteCalido', .68, .26, .06, lx, 6.42, lz, 14);
        pool(lx, FY + .03, lz, 8, 8, 'calido');
      }

      gente(X - 11.2, FY, Z - 7.5, 0xff8a3a, 0x222233, 0x2a1d14, 1, 1.6);
      gente(X + 10.0, FY, Z - 5.0, 0x4a8ad8, 0x445566, 0x1a1a1a, 0, 2.2);
      gente(X - 3.0, FY, Z + 4.0, 0xffe8b0, 0x2d4a35, 0x3a2010, 0, 0);
    } catch (e) { NC.log && NC.log('interior2: taller', e); }
  }

  /* ===================== 11. ZONA ABANDONADA ===================== */
  /*  Edificios de la zona 5 (Chatarra Vieja): fachadas deterioradas, ventanas
      tapiadas, escombros coherentes (fuera del paso) y vegetacion invadiendo. */
  function ruinas() {
    let n = 0;
    BLDs.forEach(function (b) {
      if (!b || b.zn !== 5) return;
      try {
        const rot = b.rot || 0, c = Math.cos(rot), s = Math.sin(rot);
        const L = function (lx, lz) { return [b.x + lx * c + lz * s, b.z - lx * s + lz * c]; };
        const fz = b.d / 2, FY = 0.35;

        // zocalo descascarado
        const p1 = L(0, fz + .08);
        box('paredDesguace', b.w * .92, 1.1, .16, p1[0], FY + .55, p1[1], rot);
        // cartel caido
        const p2 = L(b.w * .18, fz + .12);
        box('maderaVieja', 3.2, 1.0, .12, p2[0], FY + 3.1, p2[1], rot + .08);
        box('maderaVieja', 2.6, .7, .1, p2[0] + .4, FY + 2.1, p2[1] + .3, rot - .35);
        // ventanas tapiadas
        for (let i = 0; i < 3; i++) {
          const wp = L(-b.w * .3 + i * b.w * .3, fz + .1);
          box('maderaVieja', 1.3, 1.5, .1, wp[0], FY + 2.2, wp[1], rot);
          for (let k = 0; k < 3; k++) {
            const bp = L(-b.w * .3 + i * b.w * .3, fz + .16);
            box('maderaVieja', 1.5, .18, .07, bp[0], FY + 1.65 + k * .5, bp[1], rot + (k % 2 ? .05 : -.04));
          }
        }
        // escombros junto a las esquinas (nunca en el paso central)
        for (const sx of [-1, 1]) {
          for (let i = 0; i < 5; i++) {
            const rp = L(sx * (b.w * .42 + R(-.6, .8)), fz - R(.4, 2.2));
            const w = R(.25, .7), h = R(.2, .5), d = R(.25, .6);
            pcol(pick([0x7a6a58, 0x6a6258, 0x8a7a64]), w, h, d, rp[0], FY + h / 2, rp[1], R(0, 3));
          }
        }
        for (let i = 0; i < 7; i++) {
          const rp = L(R(-b.w * .45, b.w * .45), fz - R(.3, 1.8));
          pcol(0x8a4a38, .3, .16, .18, rp[0], FY + .08, rp[1], R(0, 3));
        }
        for (let i = 0; i < 8; i++) {
          const rp = L(R(-b.w * .45, b.w * .45), fz - R(.2, 1.4));
          pcol(0xa8d8e8, R(.12, .3), .02, R(.12, .3), rp[0], FY + .02, rp[1], R(0, 3));
        }
        // vegetacion invadiendo
        for (let i = 0; i < 6; i++) {
          const vp = L(R(-b.w * .45, b.w * .45), fz + .12);
          const hh = R(1.2, 3.2);
          box('follajeSeco', .22, hh, .1, vp[0], FY + hh / 2, vp[1], rot);
          sph('follajeSeco', R(.3, .55), vp[0], FY + hh * R(.6, .95), vp[1], 7);
        }
        for (let i = 0; i < 8; i++) {
          const vp = L(R(-b.w * .48, b.w * .48), fz - R(.2, 2.0));
          for (let k = 0; k < 3; k++) pcyl(0x4a6a2a, .01, .03, R(.3, .7), vp[0] + R(-.3, .3), FY + .3, vp[1] + R(-.3, .3), 5);
        }
        n++;
      } catch (e) { NC.log && NC.log('interior2: ruinas', e); }
    });
    if (n) NC.log && NC.log('interior2: ' + n + ' fachadas deterioradas');
  }

  /* ===================== 12. MONTAJE ===================== */
  function buildAll() {
    try { club(); } catch (e) { NC.log && NC.log('interior2: club', e); }
    try { hotel(); } catch (e) { NC.log && NC.log('interior2: hotel', e); }
    try { casa(); } catch (e) { NC.log && NC.log('interior2: casa', e); }
    try { tienda(); } catch (e) { NC.log && NC.log('interior2: tienda', e); }
    try { concesion(); } catch (e) { NC.log && NC.log('interior2: concesionario', e); }
    try { clinica(); } catch (e) { NC.log && NC.log('interior2: clinica', e); }
    try { taller(); } catch (e) { NC.log && NC.log('interior2: taller', e); }
    try { ruinas(); } catch (e) { NC.log && NC.log('interior2: ruinas', e); }
    try { oficina(EXTv + 30, -262, 24, 16, true); } catch (e) { NC.log && NC.log('interior2: oficina', e); }
    flush();
  }

  function flush() {
    const NO_SHADOW = { emiteCalido: 1, emiteFrio: 1, emiteMagenta: 1, emiteCian: 1, emiteVerde: 1, emiteAmbar: 1, emiteRojo: 1, cristal: 1, papel: 1 };
    for (const k in G) {
      const list = G[k];
      if (!list || !list.length) continue;
      try {
        const geo = MERGE ? MERGE(list) : mergeLocal(list);
        const m = new T.Mesh(geo, MAT[k] || MAT.color);
        m.castShadow = !NO_SHADOW[k];
        m.receiveShadow = true;
        m.frustumCulled = false;
        SC.add(m);
      } catch (e) { NC.log && NC.log('interior2: merge ' + k, e); }
    }
    const POOLMAT = {
      calido: [0xffd8a0, .26], frio: [0xbfe8ff, .24], magenta: [0xff5ac8, .3],
      cian: [0x27e6ff, .26], verde: [0x8affc0, .2], ambar: [0xffb45a, .26]
    };
    for (const k in POOL) {
      const list = POOL[k];
      if (!list || !list.length) continue;
      try {
        const cfg = POOLMAT[k] || [0xffffff, .22];
        const geo = MERGE ? MERGE(list) : mergeLocal(list);
        const m = new T.Mesh(geo, new T.MeshBasicMaterial({
          map: glowTexture(), transparent: true, depthWrite: false,
          blending: T.AdditiveBlending, color: cfg[0], opacity: cfg[1]
        }));
        m.frustumCulled = false;
        SC.add(m);
      } catch (e) { }
    }
  }
  function mergeLocal(L) {
    const p = [], n = [], u = [], c = [], ix = []; let o = 0;
    for (const g of L) {
      const a = g.attributes;
      p.push.apply(p, a.position.array); n.push.apply(n, a.normal.array); u.push.apply(u, a.uv.array);
      if (a.color) c.push.apply(c, a.color.array);
      g.index.array.forEach(function (i) { ix.push(i + o); });
      o += a.position.count;
    }
    const m = new T.BufferGeometry(), F = T.Float32BufferAttribute;
    m.setAttribute('position', new F(p, 3));
    m.setAttribute('normal', new F(n, 3));
    m.setAttribute('uv', new F(u, 2));
    if (c.length) m.setAttribute('color', new F(c, 3));
    m.setIndex(ix);
    return m;
  }
  let GLOW = null;
  function glowTexture() {
    if (GLOW) return GLOW;
    const c = cv2(64, 64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
    g.addColorStop(.45, 'rgba(255,255,255,.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    GLOW = texC(c);
    return GLOW;
  }

  /* --- el jugador debe pisar el suelo del hotel y de la oficina --- */
  try {
    NC.hooks.post.push(function () {
      try {
        if (typeof P === 'undefined' || !P || !P.foot) return;
        for (let i = 0; i < ZONAS.length; i++) {
          const s = ZONAS[i];
          if (P.fx > s.x0 && P.fx < s.x1 && P.fz > s.z0 && P.fz < s.z1) { P.gy = s.y; return; }
        }
      } catch (e) { }
    });
  } catch (e) { }

  /* ===================== 13. API ===================== */
  NC.Interior2 = {
    club: club, hotel: hotel, casa: casa, tienda: tienda, concesion: concesion,
    clinica: clinica, taller: taller, oficina: oficina, ruinas: ruinas,
    build: buildAll, materiales: MAT,
    /* utilidades para enganchar locales nuevos */
    box: box, cyl: cyl, sph: sph, pcol: pcol, pcyl: pcyl, pool: pool,
    sign: sign, solid: solid, gente: gente, carro: carro, planta: planta,
    ronda: ronda, silla: silla, taburete: taburete, boton: boton, vaso: vaso,
    libro: libro, lamparaMesa: lamparaMesa, pantalla: pantalla, portatil: portatil,
    tablero: tablero, flush: flush, add: add
  };

  buildAll();
  NC.log && NC.log('interior2: interiores completos montados');
})();
