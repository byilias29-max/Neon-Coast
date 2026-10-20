/* Neon Coast - arquitectura.js
   ---------------------------------------------------------------------------
   SISTEMA DE ARQUITECTURA Y CARTERIA.

   Dos cosas:
     A) FACHADAS CON PROFUNDIDAD REAL: generadores reutilizables que anaden
        elementos SOLIDOS con volumen sobre la cara correcta del edificio
        (zocalo de piedra, cornisa, antepechos, marcos y dinteles, balcones con
        forjado y barandilla, marquesinas con postes, canalones y bajantes,
        aleros, petos de azotea, cajas de escalera, ventanas con hueco y
        cristal retranqueado...).
     B) CARTERIA CON IDENTIDAD: cada negocio tiene marca propia; el rotulo se
        construye con LETRAS 3D (una caja por pixel de letra, con grosor) sobre
        una placa con marco, mas un logo vectorial dibujado en canvas 2D y
        usado como textura con alpha.

   INTEGRACION:
     - Consume los globals del juego: BLD, shops, carShops, hotels, bars,
       FACTORY, CLINIC, SHOPTYPES, CELL, R, B, H, EXT, scene, merge(), cv(),
       tex(), cg(), boxes.
     - Se ejecuta al final de la carga (hook NC.hooks.post con un frame de
       margen) y es IDEMPOTENTE: dos llamadas no duplican nada.
     - NO registra las piezas de fachada en `boxes` salvo las voluminosas que
       estorban (macetas grandes, pilonas, bidones).
     - No toca la calzada: los elementos que sobresalen se comprueban antes de
       colocarse (|x-k*CELL| < R/2 y |z-k*CELL| < R/2 prohibidos).

   CARGA: poner DESPUES de src/edificios.js y de src/calzada.js (asi las
   posiciones ya son definitivas y se puede desactivar la decoracion previa).

   API:
     NC.arq.fachada(b, opts)   -> fachada completa de un edificio
     NC.arq.rotulo(b, opts)    -> solo el cartel (letras 3D + logo)
     NC.arq.aplicar(opts)      -> recorre BLD/shops/carShops/hotels/bars y aplica
     NC.arq.limpiar()          -> borra todo lo creado por este modulo
     NC.arq.familias / marcas   -> catalogos (paletas, logos, nombres)
   --------------------------------------------------------------------------- */
(function () {
  'use strict';
  const NC = window.NC;
  if (!NC || !window.THREE) return;
  const T = THREE;
  const PI = Math.PI;

  /* ===================== 0. utilidades ===================== */
  const R2 = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.random() * a.length | 0];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const CELLv = (typeof CELL !== 'undefined') ? CELL : 76;
  const Rv = (typeof R !== 'undefined') ? R : 16;
  const SCN = window.scene || (typeof scene !== 'undefined' ? scene : null);
  if (!SCN) return;

  function cvH(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function texH(c, rx, ry) {
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  // color por vertice (sRGB -> lineal) equivalente al cg() global del juego
  function vcol(g, c) {
    const k = new T.Color(c).convertSRGBToLinear();
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = k.r; a[i * 3 + 1] = k.g; a[i * 3 + 2] = k.b; }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    return g;
  }
  // merge() del juego exige geometria indexada
  function idx(g) {
    if (!g.index) {
      const n = g.attributes.position.count, a = new Uint32Array(n);
      for (let i = 0; i < n; i++) a[i] = i;
      g.setIndex(new T.BufferAttribute(a, 1));
    }
    return g;
  }
  function mergeG(L) {
    const p = [], nn = [], u = [], c = [], ix = []; let o = 0;
    for (const g of L) {
      const a = g.attributes;
      for (let i = 0; i < a.position.array.length; i++) p.push(a.position.array[i]);
      for (let i = 0; i < a.normal.array.length; i++) nn.push(a.normal.array[i]);
      for (let i = 0; i < a.uv.array.length; i++) u.push(a.uv.array[i]);
      if (a.color) for (let i = 0; i < a.color.array.length; i++) c.push(a.color.array[i]);
      g.index.array.forEach(i => ix.push(i + o));
      o += a.position.count;
    }
    const m = new T.BufferGeometry(), F = T.Float32BufferAttribute;
    m.setAttribute('position', new F(p, 3));
    m.setAttribute('normal', new F(nn, 3));
    m.setAttribute('uv', new F(u, 2));
    if (c.length) m.setAttribute('color', new F(c, 3));
    m.setIndex(ix); return m;
  }
  const MERGE = (typeof merge === 'function') ? merge : mergeG;
  // el suelo real: las aceras estan a 0.35 y la calzada a 0
  function enCalzada(x, z, margen) {
    const m = (margen || 0) + Rv / 2;
    const kx = Math.round(x / CELLv) * CELLv, kz = Math.round(z / CELLv) * CELLv;
    if (Math.abs(x - kx) < m) return true;
    if (Math.abs(z - kz) < m) return true;
    return false;
  }
  function distCalle(x, z) {   // distancia al eje de calzada mas cercano
    const kx = Math.round(x / CELLv) * CELLv, kz = Math.round(z / CELLv) * CELLv;
    return Math.min(Math.abs(x - kx), Math.abs(z - kz));
  }

  /* ===================== 1. texturas y materiales ===================== */
  function tPiedra() {
    const c = cvH(128, 128), x = c.getContext('2d');
    x.fillStyle = '#8f887c'; x.fillRect(0, 0, 128, 128);
    for (let j = 0; j < 8; j++) for (let i = -1; i < 5; i++) {
      const off = (j % 2) ? 16 : 0, v = 150 + (Math.random() * 34 | 0);
      x.fillStyle = `rgb(${v},${v - 5},${v - 14})`;
      x.fillRect(i * 32 + off + 1, j * 16 + 1, 30, 14);
    }
    for (let i = 0; i < 900; i++) {
      const v = Math.random() * 90 | 0;
      x.fillStyle = `rgba(${v},${v - 3},${v - 8},${.05 + Math.random() * .22})`;
      x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    x.strokeStyle = 'rgba(40,36,30,.35)'; x.lineWidth = 1;
    for (let j = 0; j <= 8; j++) { x.beginPath(); x.moveTo(0, j * 16); x.lineTo(128, j * 16); x.stroke(); }
    return c;
  }
  function tLadrillo() {
    const c = cvH(128, 128), x = c.getContext('2d');
    x.fillStyle = '#6b5a4c'; x.fillRect(0, 0, 128, 128);
    for (let j = 0; j < 16; j++) for (let i = -1; i < 6; i++) {
      const off = (j % 2) ? 16 : 0, v = 150 + (Math.random() * 40 | 0);
      x.fillStyle = `rgb(${v + 30},${v},${v - 18})`;
      x.fillRect(i * 32 + off + 1, j * 8 + 1, 30, 6);
    }
    for (let i = 0; i < 700; i++) {
      const v = Math.random() * 60 | 0;
      x.fillStyle = `rgba(${v},${v - 4},${v - 8},.05 + Math.random() * .2)`;
      x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    return c;
  }
  function tHormigon() {
    const c = cvH(128, 128), x = c.getContext('2d');
    x.fillStyle = '#9a958c'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1100; i++) {
      const v = 120 + (Math.random() * 70 | 0);
      x.fillStyle = `rgba(${v},${v - 4},${v - 12},${.06 + Math.random() * .25})`;
      x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    for (let i = 0; i < 16; i++) {
      x.fillStyle = `rgba(60,55,48,${.03 + Math.random() * .08})`;
      x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, 8 + Math.random() * 26, 0, 7); x.fill();
    }
    return c;
  }
  function tMadera() {
    const c = cvH(64, 128), x = c.getContext('2d');
    x.fillStyle = '#6b4d34'; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 220; i++) {
      const v = Math.random() * 60 | 0;
      x.fillStyle = `rgba(${60 + v},${40 + v * .7},${24 + v * .5},${.2 + Math.random() * .4})`;
      x.fillRect(Math.random() * 64, 0, 1 + Math.random() * 3, 10 + Math.random() * 40);
    }
    for (let i = 0; i < 40; i++) {
      x.fillStyle = 'rgba(30,22,16,.15)';
      x.fillRect(Math.random() * 64, Math.random() * 128, 1 + Math.random() * 2, 6 + Math.random() * 22);
    }
    return c;
  }
  function tMetal() {
    const c = cvH(64, 64), x = c.getContext('2d');
    x.fillStyle = '#6d6a63'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 300; i++) {
      const r = Math.random() * 60 | 0;
      x.fillStyle = `rgba(${120 + r},${70 + r * .6},${38 + r * .3},${.06 + Math.random() * .28})`;
      x.fillRect(Math.random() * 64, Math.random() * 64, 1 + Math.random() * 5, 1 + Math.random() * 3);
    }
    return c;
  }
  function tTeja() {
    const c = cvH(128, 128), x = c.getContext('2d');
    x.fillStyle = '#7a3f30'; x.fillRect(0, 0, 128, 128);
    for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
      const v = 110 + (Math.random() * 46 | 0);
      x.fillStyle = `rgb(${v + 30},${v - 20},${v - 40})`;
      x.beginPath();
      x.moveTo(i * 13, j * 13); x.lineTo(i * 13 + 12, j * 13);
      x.lineTo(i * 13 + 12, j * 13 + 11); x.quadraticCurveTo(i * 13 + 6, j * 13 + 14, i * 13, j * 13 + 11);
      x.closePath(); x.fill();
    }
    for (let i = 0; i < 500; i++) {
      x.fillStyle = `rgba(0,0,0,${.03 + Math.random() * .1})`;
      x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 2);
    }
    return c;
  }
  function tPintura() {
    const c = cvH(128, 128), x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2200; i++) {
      const v = Math.random() < .5 ? 0 : 255;
      x.fillStyle = `rgba(${v},${v},${v},${Math.random() * .045})`;
      x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    for (let i = 0; i < 14; i++) {
      x.fillStyle = `rgba(90,84,76,${.02 + Math.random() * .05})`;
      x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, 10 + Math.random() * 34, 0, 7); x.fill();
    }
    return c;
  }
  function tTela() {
    const c = cvH(64, 64), x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 4) {
      x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(i, 0, 2, 64);
      x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(0, i, 64, 2);
    }
    for (let i = 0; i < 600; i++) {
      x.fillStyle = `rgba(0,0,0,${Math.random() * .06})`;
      x.fillRect(Math.random() * 64, Math.random() * 64, 1, 1);
    }
    return c;
  }
  function tHalo() {
    const c = cvH(64, 64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(.45, 'rgba(255,255,255,.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return c;
  }

  const MAT = {};
  function mkMat(canvas, rx, ry, extra) {
    const m = new T.MeshStandardMaterial(Object.assign({
      map: texH(canvas, rx, ry), vertexColors: true, roughness: .86, metalness: .04
    }, extra || {}));
    m.userData.arq = 1; return m;
  }
  MAT.piedra = mkMat(tPiedra(), 3, 1, { roughness: .92, metalness: .02 });
  MAT.ladrillo = mkMat(tLadrillo(), 3, 3, { roughness: .9, metalness: .02 });
  MAT.hormigon = mkMat(tHormigon(), 2, 2, { roughness: .92, metalness: .02 });
  MAT.madera = mkMat(tMadera(), 1, 2, { roughness: .78, metalness: .02 });
  MAT.metal = mkMat(tMetal(), 2, 2, { roughness: .46, metalness: .68 });
  MAT.teja = mkMat(tTeja(), 4, 2, { roughness: .95, metalness: .02 });
  MAT.pintura = mkMat(tPintura(), 2, 2, { roughness: .88, metalness: .03 });
  MAT.tela = mkMat(tTela(), 2, 2, { roughness: .95, metalness: 0 });
  MAT.cristal = (() => {
    const m = new T.MeshStandardMaterial({
      color: 0x9fd4e8, roughness: .07, metalness: .35, transparent: true, opacity: .45,
      vertexColors: true, envMapIntensity: 1.5
    });
    m.userData.arq = 1; return m;
  })();
  MAT.neon = (() => {
    const m = new T.MeshBasicMaterial({ vertexColors: true });
    m.userData.arq = 1; return m;
  })();

  const HALO_MAT = (() => {
    const m = new T.MeshBasicMaterial({
      map: texH(tHalo()), transparent: true, blending: T.AdditiveBlending,
      depthWrite: false, vertexColors: true, opacity: .55, fog: false
    });
    m.userData.arq = 1; return m;
  })();

  /* ===================== 2. fuente 5x7 (letras 3D) ===================== */
  const FONT = {
    'A': '01110/10001/10001/11111/10001/10001/10001',
    'B': '11110/10001/10001/11110/10001/10001/11110',
    'C': '01110/10001/10000/10000/10000/10001/01110',
    'D': '11110/10001/10001/10001/10001/10001/11110',
    'E': '11111/10000/10000/11110/10000/10000/11111',
    'F': '11111/10000/10000/11110/10000/10000/10000',
    'G': '01110/10001/10000/10111/10001/10001/01111',
    'H': '10001/10001/10001/11111/10001/10001/10001',
    'I': '11111/00100/00100/00100/00100/00100/11111',
    'J': '00111/00010/00010/00010/00010/10010/01100',
    'K': '10001/10010/10100/11000/10100/10010/10001',
    'L': '10000/10000/10000/10000/10000/10000/11111',
    'M': '10001/11011/10101/10101/10001/10001/10001',
    'N': '10001/11001/10101/10011/10001/10001/10001',
    'O': '01110/10001/10001/10001/10001/10001/01110',
    'P': '11110/10001/10001/11110/10000/10000/10000',
    'Q': '01110/10001/10001/10001/10101/10010/01101',
    'R': '11110/10001/10001/11110/10100/10010/10001',
    'S': '01111/10000/10000/01110/00001/00001/11110',
    'T': '11111/00100/00100/00100/00100/00100/00100',
    'U': '10001/10001/10001/10001/10001/10001/01110',
    'V': '10001/10001/10001/10001/10001/01010/00100',
    'W': '10001/10001/10001/10101/10101/11011/10001',
    'X': '10001/10001/01010/00100/01010/10001/10001',
    'Y': '10001/10001/01010/00100/00100/00100/00100',
    'Z': '11111/00001/00010/00100/01000/10000/11111',
    '0': '01110/10001/10011/10101/11001/10001/01110',
    '1': '00100/01100/00100/00100/00100/00100/01110',
    '2': '01110/10001/00001/00010/00100/01000/11111',
    '3': '11111/00010/00100/00010/00001/10001/01110',
    '4': '00010/00110/01010/10010/11111/00010/00010',
    '5': '11111/10000/11110/00001/00001/10001/01110',
    '6': '00110/01000/10000/11110/10001/10001/01110',
    '7': '11111/00001/00010/00100/01000/01000/01000',
    '8': '01110/10001/10001/01110/10001/10001/01110',
    '9': '01110/10001/10001/01111/00001/00010/01100',
    ' ': '00000/00000/00000/00000/00000/00000/00000',
    '-': '00000/00000/00000/11111/00000/00000/00000',
    '.': '00000/00000/00000/00000/00000/01100/01100',
    '&': '01100/10010/10100/01000/10101/10010/01101',
    "'": '00100/00100/00000/00000/00000/00000/00000',
    '!': '00100/00100/00100/00100/00100/00000/00100',
    '/': '00001/00010/00010/00100/01000/01000/10000',
    '*': '00000/00100/01110/11111/01110/00100/00000',
    '+': '00000/00100/00100/11111/00100/00100/00000',
    ':': '00000/01100/01100/00000/01100/01100/00000',
    ',': '00000/01100/01100/00000/01100/00100/01000'
  };
  function anchoTexto(txt, alt) {
    const p = alt / 7;
    return Math.max(0, txt.length * 6 - 1) * p;
  }

  /* ===================== 3. logos vectoriales en canvas ===================== */
  const LOGO_FN = {
    rayo(x, c, a) {
      x.save(); x.translate(64, 64);
      x.beginPath();
      x.moveTo(8, -54); x.lineTo(-26, 8); x.lineTo(-4, 8); x.lineTo(-14, 54);
      x.lineTo(28, -10); x.lineTo(4, -10); x.closePath();
      x.fillStyle = c; x.fill(); x.lineWidth = 7; x.strokeStyle = a; x.stroke(); x.restore();
    },
    cruz(x, c, a) {
      x.save(); x.translate(64, 64);
      x.fillStyle = c;
      x.fillRect(-15, -44, 30, 88);
      x.fillRect(-44, -15, 88, 30);
      x.lineWidth = 7; x.strokeStyle = a;
      x.strokeRect(-15, -44, 30, 88); x.strokeRect(-44, -15, 88, 30);
      x.restore();
    },
    piston(x, c, a) {
      x.save(); x.translate(64, 64);
      x.fillStyle = c;
      x.fillRect(-9, -46, 18, 46);              // vastago
      x.beginPath(); x.arc(0, -50, 26, 0, 7); x.fill();   // cabeza
      x.beginPath(); x.ellipse(0, 14, 34, 15, 0, 0, 7); x.fill();  // bulon
      x.lineWidth = 6; x.strokeStyle = a;
      x.beginPath(); x.arc(0, -50, 26, 0, 7); x.stroke();
      x.beginPath(); x.ellipse(0, 14, 34, 15, 0, 0, 7); x.stroke();
      x.restore();
    },
    cesta(x, c, a) {
      x.save(); x.translate(64, 62);
      x.strokeStyle = a; x.lineWidth = 8; x.lineCap = 'round';
      x.beginPath(); x.arc(0, -30, 26, Math.PI, 0); x.stroke();   // asa
      x.fillStyle = c;
      x.beginPath(); x.moveTo(-38, -18); x.lineTo(38, -18); x.lineTo(26, 30); x.lineTo(-26, 30); x.closePath(); x.fill();
      x.lineWidth = 6; x.strokeStyle = a; x.stroke();
      x.strokeStyle = a; x.lineWidth = 5;
      for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(i * 18, -16); x.lineTo(i * 12, 28); x.stroke(); }
      x.restore();
    },
    bolsa(x, c, a) {
      x.save(); x.translate(64, 64);
      x.strokeStyle = a; x.lineWidth = 8; x.lineCap = 'round';
      x.beginPath(); x.arc(0, -20, 20, Math.PI, 0); x.stroke();
      x.fillStyle = c; x.fillRect(-32, -20, 64, 60);
      x.lineWidth = 7; x.strokeStyle = a; x.strokeRect(-32, -20, 64, 60);
      x.strokeStyle = a; x.lineWidth = 5;
      x.beginPath(); x.moveTo(-32, 10); x.quadraticCurveTo(0, 26, 32, 10); x.stroke();
      x.restore();
    },
    estrella(x, c, a) {
      x.save(); x.translate(64, 56);
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 17 : 42, an = -PI / 2 + i * PI / 5;
        const px = Math.cos(an) * r, py = Math.sin(an) * r;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.closePath(); x.fillStyle = c; x.fill(); x.lineWidth = 6; x.strokeStyle = a; x.stroke();
      x.strokeStyle = a; x.lineWidth = 7; x.lineCap = 'round';
      x.beginPath(); x.moveTo(-44, 34); x.quadraticCurveTo(-22, 22, 0, 34); x.quadraticCurveTo(22, 46, 44, 34); x.stroke();
      x.restore();
    },
    micro(x, c, a) {
      x.save(); x.translate(64, 60);
      x.fillStyle = c;
      x.beginPath(); x.roundRect ? x.roundRect(-20, -52, 40, 62, 20) : x.rect(-20, -52, 40, 62); x.fill();
      x.lineWidth = 6; x.strokeStyle = a; x.stroke();
      x.strokeStyle = a; x.lineWidth = 8; x.lineCap = 'round';
      x.beginPath(); x.moveTo(-34, -18); x.quadraticCurveTo(0, 16, 34, -18); x.stroke();
      x.beginPath(); x.moveTo(0, 10); x.lineTo(0, 36); x.stroke();
      x.beginPath(); x.moveTo(-22, 38); x.lineTo(22, 38); x.stroke();
      x.beginPath(); x.moveTo(-42, -44); x.quadraticCurveTo(-58, -30, -52, -12); x.stroke();
      x.beginPath(); x.moveTo(42, -44); x.quadraticCurveTo(58, -30, 52, -12); x.stroke();
      x.restore();
    },
    jarra(x, c, a) {
      x.save(); x.translate(58, 62);
      x.fillStyle = c;
      x.beginPath(); x.roundRect ? x.roundRect(-30, -44, 58, 74, 6) : x.rect(-30, -44, 58, 74); x.fill();
      x.lineWidth = 6; x.strokeStyle = a; x.stroke();
      x.strokeStyle = a; x.lineWidth = 8; x.lineCap = 'round';
      x.beginPath(); x.arc(34, -4, 20, -PI / 2, PI / 2); x.stroke();
      x.fillStyle = a;
      x.beginPath(); x.arc(-16, -40, 14, 0, 7); x.fill();
      x.beginPath(); x.arc(6, -40, 12, 0, 7); x.fill();
      x.beginPath(); x.arc(-2, -48, 10, 0, 7); x.fill();
      x.restore();
    },
    coche(x, c, a) {
      x.save(); x.translate(64, 66);
      x.fillStyle = c;
      x.beginPath();
      x.moveTo(-46, 6); x.lineTo(-40, -10); x.lineTo(-18, -12); x.lineTo(-6, -32);
      x.lineTo(20, -32); x.lineTo(32, -12); x.lineTo(44, -6); x.lineTo(48, 12);
      x.lineTo(-48, 12); x.closePath(); x.fill();
      x.lineWidth = 6; x.strokeStyle = a; x.stroke();
      x.fillStyle = a;
      x.beginPath(); x.arc(-28, 16, 13, 0, 7); x.fill();
      x.beginPath(); x.arc(30, 16, 13, 0, 7); x.fill();
      x.fillStyle = 'rgba(0,0,0,.35)';
      x.beginPath(); x.moveTo(-6, -30); x.lineTo(0, -12); x.lineTo(-24, -12); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(4, -30); x.lineTo(4, -12); x.lineTo(26, -12); x.lineTo(18, -30); x.closePath(); x.fill();
      x.restore();
    },
    engranaje(x, c, a) {
      x.save(); x.translate(64, 64);
      x.fillStyle = c;
      for (let i = 0; i < 8; i++) {
        x.save(); x.rotate(i * PI / 4); x.fillRect(-9, -48, 18, 20); x.restore();
      }
      x.beginPath(); x.arc(0, 0, 36, 0, 7); x.fill();
      x.globalCompositeOperation = 'destination-out';
      x.beginPath(); x.arc(0, 0, 15, 0, 7); x.fill();
      x.globalCompositeOperation = 'source-over';
      x.lineWidth = 6; x.strokeStyle = a;
      x.beginPath(); x.arc(0, 0, 36, 0, 7); x.stroke();
      x.beginPath(); x.arc(0, 0, 15, 0, 7); x.stroke();
      x.restore();
    }
  };
  const LOGO_CACHE = {};
  function texturaLogo(k, color, acento) {
    const key = k + '_' + color + '_' + acento;
    if (LOGO_CACHE[key]) return LOGO_CACHE[key];
    const c = cvH(128, 128), x = c.getContext('2d');
    x.clearRect(0, 0, 128, 128);
    const fn = LOGO_FN[k];
    if (fn) fn(x, '#' + new T.Color(color).getHexString(), '#' + new T.Color(acento || 0xffffff).getHexString());
    const t = texH(c, 1, 1);
    t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
    LOGO_CACHE[key] = t;
    return t;
  }

  /* ===================== 4. marcas de negocio ===================== */
  const MARCAS = {
    armeria: { n: 'ARMERIA EL TRUENO', logo: 'rayo', c: 0xff3b30, f: 0x17100e, a: 0xffd24a, fam: 'tienda' },
    farmacia: { n: 'FARMACIA VIDA', logo: 'cruz', c: 0x3dff9a, f: 0x0d1a14, a: 0xffffff, fam: 'tienda' },
    taller: { n: 'TALLER NITRO', logo: 'piston', c: 0xffd24a, f: 0x191a1f, a: 0xff6a3a, fam: 'tienda' },
    super: { n: 'SUPER COSTA', logo: 'cesta', c: 0x27e6ff, f: 0x0b1a24, a: 0xffffff, fam: 'tienda' },
    general: { n: 'TODO COSTA', logo: 'bolsa', c: 0xffe8b0, f: 0x2b2118, a: 0xff8a3a, fam: 'tienda' },
    auto: { n: 'AUTOCOSTA', logo: 'coche', c: 0xff8a3a, f: 0x0f1a2a, a: 0x27e6ff, fam: 'concesionario' },
    hotel: { n: 'HOTEL MIRAMAR', logo: 'estrella', c: 0x27e6ff, f: 0x101a2a, a: 0xffd24a, fam: 'hotel' },
    hotel2: { n: 'HOTEL BRISA', logo: 'estrella', c: 0x8ad8ff, f: 0x14202c, a: 0xffd24a, fam: 'hotel' },
    bar: { n: 'BAR MARISMO', logo: 'jarra', c: 0xffd24a, f: 0x2a1a10, a: 0xff8a3a, fam: 'bar' },
    club: { n: 'CLUB NEON', logo: 'micro', c: 0xff5aef, f: 0x1a0f22, a: 0x27e6ff, fam: 'bar' },
    clinica: { n: 'CLINICA MARISOL', logo: 'cruz', c: 0xff4a4a, f: 0xf0f4f6, a: 0x2f9a5f, fam: 'clinica' },
    nave: { n: 'DEPOSITO COSTA', logo: 'engranaje', c: 0xff8a3a, f: 0x1b1f25, a: 0xffd24a, fam: 'nave' }
  };
  const MARCA_POR_TIPO = {
    Armeria: 'armeria', Farmacia: 'farmacia', Taller: 'taller', Super: 'super', General: 'general'
  };

  /* ===================== 5. paletas por familia ===================== */
  const FAM = {
    vivienda: { muro: 0xd6c6ae, zocalo: 0x8d8377, marco: 0x5c3f2a, cristal: 0x22313f, metal: 0x9aa0a8, tejado: 0x8f4a38, acento: 0x2f6f8a, luz: 0xffe0a8, hormigon: 0x8a857c },
    villa: { muro: 0xf0e6d2, zocalo: 0xb0a48c, marco: 0x2f6f8a, cristal: 0x2a3a48, metal: 0xb0b6bc, tejado: 0xb05a34, acento: 0x2f6f8a, luz: 0xffe8c0, hormigon: 0x9a958c },
    oficina: { muro: 0xa8adb5, zocalo: 0x6f6a62, marco: 0x4a5058, cristal: 0x1d2a36, metal: 0x8a9098, tejado: 0x5a6068, acento: 0x27e6ff, luz: 0xcfe4ff, hormigon: 0x8a8f96 },
    tienda: { muro: 0xd8cbb4, zocalo: 0x7d7568, marco: 0x8a3a2a, cristal: 0x2b3a48, metal: 0xa0a6ae, tejado: 0x6a5a4a, acento: 0xff5a7a, luz: 0xffe0a8, hormigon: 0x8a857c },
    concesionario: { muro: 0xcfc6b4, zocalo: 0x6a6660, marco: 0xff8a3a, cristal: 0x2a3c4a, metal: 0xb0b6bd, tejado: 0x4a5058, acento: 0x27e6ff, luz: 0xdff0ff, hormigon: 0x8a8f96 },
    hotel: { muro: 0xcfc3a8, zocalo: 0x8a7f6c, marco: 0x3a2f22, cristal: 0x24303c, metal: 0xc0a050, tejado: 0x4a4038, acento: 0x27e6ff, luz: 0xffd9a0, hormigon: 0x9a958c },
    bar: { muro: 0x8a4a3a, zocalo: 0x5a4038, marco: 0x3a2418, cristal: 0xffd08a, metal: 0xb08040, tejado: 0x4a3020, acento: 0xffd24a, luz: 0xffb04a, hormigon: 0x7a6a5a },
    clinica: { muro: 0xeef2f4, zocalo: 0xa8b4bc, marco: 0x2f7a4a, cristal: 0xcfe8f0, metal: 0xc8ccd2, tejado: 0x8a9298, acento: 0x2f9a5f, luz: 0xdff6e8, hormigon: 0xb0b8be },
    taller: { muro: 0x6a6f76, zocalo: 0x4a4e54, marco: 0xffd24a, cristal: 0x2a3a4a, metal: 0x9aa0a8, tejado: 0x5a6068, acento: 0xffd24a, luz: 0xfff0c0, hormigon: 0x7a8086 },
    nave: { muro: 0x8a9096, zocalo: 0x5a6066, marco: 0x3a4048, cristal: 0x30404c, metal: 0x8a929a, tejado: 0x6a7076, acento: 0xff8a3a, luz: 0xffd0a0, hormigon: 0x82888e },
    abandonada: { muro: 0x6a625a, zocalo: 0x4a463e, marco: 0x4a3a28, cristal: 0x1c2228, metal: 0x6a6a62, tejado: 0x5a4a3a, acento: 0x8a7a5a, luz: 0x201c18, hormigon: 0x5a564e }
  };

  /* ===================== 6. acumulador ===================== */
  const B = { geo: {}, logo: {}, halo: [], meshes: [], sombras: true };

  function put(mat, g, color) {
    vcol(g, color);
    idx(g);
    (B.geo[mat] || (B.geo[mat] = [])).push(g);
    return g;
  }
  function logoEn(F, k, a, y, n, size, extraYaw, color, acento) {
    const g = new T.PlaneGeometry(size, size);
    g.rotateY(F.yaw + (extraYaw || 0));
    const w = F.toWorld(a, y, n);
    g.translate(w[0], w[1], w[2]);
    const key = k + '|' + color + '|' + acento;
    (B.logo[key] || (B.logo[key] = { k, color, acento, list: [] })).list.push(g);
  }
  function haloEn(F, a, y, n, w, h, color) {
    const g = new T.PlaneGeometry(w, h);
    g.rotateY(F.yaw);
    const p = F.toWorld(a, y, n);
    g.translate(p[0], p[1], p[2]);
    vcol(g, color);
    B.halo.push(g);
  }

  /* ===================== 7. marco de fachada ===================== */
  function frameDe(b, opts) {
    opts = opts || {};
    const rot = b.rot || 0;
    let nx = 0, nz = 1, fw = b.d;
    const cara = opts.cara;
    if (cara === '+z') { nx = 0; nz = 1; fw = b.d; }
    else if (cara === '-z') { nx = 0; nz = -1; fw = b.d; }
    else if (cara === '+x') { nx = 1; nz = 0; fw = b.w; }
    else if (cara === '-x') { nx = -1; nz = 0; fw = b.w; }
    else {
      const cx = Math.round(b.x / CELLv) * CELLv, cz = Math.round(b.z / CELLv) * CELLv;
      const dx = cx - b.x, dz = cz - b.z;
      if (Math.abs(dx) < Math.abs(dz)) { nx = dx < 0 ? -1 : 1; nz = 0; fw = b.w; }
      else { nx = 0; nz = dz < 0 ? -1 : 1; fw = b.d; }
    }
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const n2x = nx * cr + nz * sr, n2z = -nx * sr + nz * cr;
    const lx = Math.abs(nx) > .5 ? nx * b.w / 2 : 0;
    const lz = Math.abs(nz) > .5 ? nz * b.d / 2 : 0;
    const ox = b.x + lx * cr + lz * sr, oz = b.z - lx * sr + lz * cr;
    const yaw = Math.atan2(n2x, n2z);
    const sol = (b.sol !== undefined) ? b.sol : 0.35;
    const h = (b.h !== undefined) ? b.h : 8;
    const perfil = b.perfil || 'bloque';

    const F = {
      b, yaw, nx: n2x, nz: n2z, ox, oz, fw, sol, h,
      perfil,
      // altura de la cubierta y vuelo del tejado (para petos, casetas y equipos)
      cub: (b.cubierta !== undefined) ? b.cubierta : (perfil === 'plano' ? h + .5 : h + 1.43),
      vuelo: (perfil === 'plano') ? .3 : .6,
      ruina: !!(b.ruina || (opts && opts.ruina)),
      c: Math.cos(yaw), s: Math.sin(yaw),
      toWorld(a, y, n) { return [F.ox + F.c * a + F.nx * n, y, F.oz - F.s * a + F.nz * n]; },
      // altura de la pared en ese punto (el faldon de planta baja y la banda de coronacion sobresalen)
      wall(y) {
        if (F.perfil === 'bloque') {
          if (y < F.sol + 1.4) return .4;
          if (y > F.h + .35) return .6;
        }
        return 0;
      },
      box(mat, color, len, hh, thk, a, y, n, tilt) {
        const g = new T.BoxGeometry(len, hh, thk);
        if (tilt) g.rotateX(tilt);
        g.rotateY(yaw);
        const p = F.toWorld(a, y, n);
        g.translate(p[0], p[1], p[2]);
        put(mat, g, color);
        return g;
      },
      cyl(mat, color, r, hh, a, y, n, seg, axis) {
        const g = new T.CylinderGeometry(r, r, hh, seg || 8);
        if (axis === 'along') g.rotateZ(PI / 2);
        else if (axis === 'out') g.rotateX(PI / 2);
        g.rotateY(yaw);
        const p = F.toWorld(a, y, n);
        g.translate(p[0], p[1], p[2]);
        put(mat, g, color);
        return g;
      },
      // panel fino (carteles, placas)
      panel(mat, color, w2, hh, a, y, n) { return F.box(mat, color, w2, hh, .07, a, y, n); }
    };
    return F;
  }

  /* ===================== 8. piezas de fachada ===================== */
  // ventana con hueco: marco de 4 piezas, antepecho, dintel y cristal retranqueado
  function ventana(F, o) {
    const f = o.fam;
    const mj = o.mj || .13, t = o.thk || .2;
    const w = o.w, hh = o.h, a = o.a, y = o.y;
    const w0 = F.wall(y);
    const cm = o.colorMarco !== undefined ? o.colorMarco : f.marco;
    const cc = o.colorCristal !== undefined ? o.colorCristal : f.cristal;
    const mat = o.matMarco || 'madera';
    // jambas
    F.box(mat, cm, mj, hh + mj * 2, t, a - w / 2 - mj / 2, y + hh / 2, w0 + t / 2);
    F.box(mat, cm, mj, hh + mj * 2, t, a + w / 2 + mj / 2, y + hh / 2, w0 + t / 2);
    // dintel
    F.box(mat, cm, w + mj * 2, mj, t, a, y + hh + mj / 2, w0 + t / 2);
    // antepecho (sobresale)
    F.box(o.matSill || 'piedra', o.colorSill !== undefined ? o.colorSill : f.zocalo,
      w + mj * 2 + .22, mj * 1.15, t + .14, a, y - mj * .55, w0 + (t + .14) / 2);
    // cristal retranqueado
    F.box('cristal', cc, w, hh, .05, a, y + hh / 2, w0 + .05);
    // travesano central
    F.box(mat, cm, .06, hh, .08, a, y + hh / 2, w0 + .09);
    // persiana enrollada
    if (o.persiana) F.box('metal', o.persiana, w + mj * 1.4, .16, .14, a, y + hh + mj * 1.3, w0 + .12);
    // contraventana
    if (o.contra) {
      F.box('madera', o.contra, w * .42, hh * .96, .06, a - w / 2 - mj - w * .21, y + hh / 2, w0 + .1);
      F.box('madera', o.contra, w * .42, hh * .96, .06, a + w / 2 + mj + w * .21, y + hh / 2, w0 + .1);
    }
  }
  // balcon: forjado de verdad + barandilla de metal
  function balcon(F, o) {
    const f = o.fam, a = o.a, y = o.y, w = o.w, d = o.depth || 1.1;
    const w0 = F.wall(y);
    const hc = o.color || f.hormigon;
    // forjado + viga
    F.box('hormigon', hc, w, .18, d, a, y - .09, w0 + d / 2);
    F.box('hormigon', hc, w + .12, .14, .14, a, y - .24, w0 + d - .07);
    // barandilla
    const alt = o.alt || 1.0, cm = f.metal;
    F.box('metal', cm, w, .07, .07, a, y + alt, w0 + d - .07);
    F.box('metal', cm, w, .05, .05, a, y + alt * .55, w0 + d - .07);
    F.box('metal', cm, w, .05, .05, a, y + alt * .22, w0 + d - .07);
    const n = Math.max(2, Math.round(w / .3));
    for (let i = 0; i <= n; i++) F.box('metal', cm, .05, alt, .05, a - w / 2 + (w * i / n), y + alt / 2, w0 + d - .07);
    // laterales
    F.box('metal', cm, .05, alt, d, a - w / 2, y + alt / 2, w0 + d / 2);
    F.box('metal', cm, .05, alt, d, a + w / 2, y + alt / 2, w0 + d / 2);
  }
  // marquesina: losa + vigas + postes
  function marquesina(F, o) {
    const a = o.a, y = o.y, w = o.w, d = o.depth || 1.8;
    const w0 = F.wall(y);
    const col = o.color || 0x8a857c;
    F.box('hormigon', col, w, .22, d, a, y, w0 + d / 2);
    F.box('metal', 0x4a4a52, w, .12, .16, a, y - .17, w0 + d - .1);
    const np = (o.posts === undefined) ? 2 : o.posts;
    const ph = y - .22 - F.sol;
    if (ph > .4 && np > 0) {
      for (let i = 0; i < np; i++) {
        const px = a - w / 2 + (np === 1 ? 0 : w * (i / (np - 1)));
        F.cyl('metal', 0x3a3a44, .1, ph, px, F.sol + ph / 2, w0 + d - .18, 10);
        F.cyl('metal', 0x4a4a52, .16, .12, px, F.sol + .06, w0 + d - .18, 10);
      }
    }
    // plafoneras bajo la marquesina
    if (o.luz) {
      const nl = Math.max(1, Math.round(w / 2.4));
      for (let i = 0; i < nl; i++) {
        const px = a - w / 2 + (w * (i + .5) / nl);
        F.box('metal', 0x2f3440, .42, .16, .3, px, y - .2, w0 + d * .55);
        F.box('neon', o.luz, .3, .05, .1, px, y - .29, w0 + d * .55);
      }
    }
  }
  // puerta con marco, dintel y escalones
  function entrada(F, o) {
    const f = o.fam, a = o.a, w = o.w || 1.25, hh = o.h || 2.35;
    const y0 = F.sol;
    const w0 = F.wall(y0);
    const cm = o.colorMarco !== undefined ? o.colorMarco : f.marco;
    // jambas + dintel
    F.box('piedra', cm, .18, hh + .2, .34, a - w / 2 - .09, y0 + (hh + .2) / 2, w0 + .12);
    F.box('piedra', cm, .18, hh + .2, .34, a + w / 2 + .09, y0 + (hh + .2) / 2, w0 + .12);
    F.box('piedra', cm, w + .54, .26, .38, a, y0 + hh + .13, w0 + .14);
    // hoja de puerta retranqueada
    F.box('madera', o.colorHoja || 0x4a3524, w, hh, .1, a, y0 + hh / 2, w0 + .04);
    F.box('metal', 0xc9b070, .08, .08, .12, a + w * .3, y0 + 1.05, w0 + .1);
    // escalones
    const np = o.pasos || 2;
    for (let i = 0; i < np; i++) {
      const sw = w + .5 + i * .3, sh = .16, sd = .34 + i * .16;
      F.box('hormigon', f.hormigon, sw, sh, sd, a, y0 - .08 - i * sh, w0 + sd / 2);
    }
    // rampa (accesibilidad)
    if (o.rampa) {
      const g = new T.BoxGeometry(w + .4, .12, 1.5);
      g.rotateX(.12); g.rotateY(F.yaw);
      const p = F.toWorld(a, y0 - .02, w0 + .75);
      g.translate(p[0], p[1], p[2]);
      put('hormigon', g, f.hormigon);
      F.cyl('metal', f.metal, .05, 1.0, a - w / 2 - .1, y0 + .5, w0 + 1.3, 8);
      F.cyl('metal', f.metal, .05, 1.0, a + w / 2 + .1, y0 + .5, w0 + 1.3, 8);
    }
  }
  // cornisa + canalon + bajante
  function remates(F, o) {
    const f = o.fam, W = F.fw, h = F.h;
    if (F.ruina) {                       // en ruinas solo queda media cornisa rota
      F.box('hormigon', f.hormigon, W, .22, .26, 0, h + .2, .5);
      F.cyl('metal', 0x5a564e, .07, h - F.sol, W / 2 - .4, (F.sol + h) / 2, .5, 8);
      return;
    }
    if (F.perfil === 'bloque') {
      // cornisa sobre la banda superior
      F.box('hormigon', f.hormigon, W, .34, .34, 0, h + .5, .74);
      F.box('hormigon', f.hormigon, W, .16, .22, 0, h + .28, .66);
      // canalon colgado del alero
      F.box('metal', 0x6a6f76, W, .16, .2, 0, h + .3, .66);
      // bajante en el extremo (pegado a la pared; sale por detras del zocalo)
      F.cyl('metal', 0x767b82, .08, h - F.sol + .1, W / 2 - .35, (F.sol + h) / 2, .18, 8);
      F.cyl('metal', 0x767b82, .1, .18, W / 2 - .35, h + .1, .18, 8);
    } else {
      F.box('hormigon', f.hormigon, W, .3, .36, 0, h - .12, .3);
      F.box('metal', 0x6a6f76, W, .14, .18, 0, h - .34, .24);
      F.cyl('metal', 0x767b82, .07, h - F.sol, W / 2 - .3, (F.sol + h) / 2, .16, 8);
    }
  }
  // peto de azotea + caja de escalera + antenas + chimeneas + aire acondicionado
  function azotea(F, o) {
    const f = o.fam, W = F.fw;
    const yR = F.cub;                    // cara superior de la cubierta
    const v = F.vuelo;                   // vuelo del tejado
    if (F.perfil === 'bloque') {
      // el peto ya lo pone city.js: aqui solo el perfilera de coronacion
      F.box('hormigon', f.hormigon, W + 1.2, .12, .36, 0, yR + .67, v - .15);
    } else {
      // peto de azotea propio con coronacion
      F.box('hormigon', f.hormigon, W, .62, .12, 0, yR + .31, v - .06);
      F.box('hormigon', f.hormigon, W + .16, .1, v + .1, 0, yR + .66, v / 2);
    }
    // caja de escalera con su puerta
    const d = F.b.d || 10;
    if (W > 8 && d > 6) {
      const cw = 2.6, cd = 2.4, ch = 2.3;
      const ca = clamp(-W * .3 + R2(-1, 1), -W / 2 + cw, W / 2 - cw);
      F.box('hormigon', f.hormigon, cw, ch, cd, ca, yR + ch / 2, -cd / 2 + .1);
      F.box('metal', 0x4a4a52, .9, 1.9, .08, ca, yR + .95, .22);
      F.box('metal', 0x6a6f76, cw + .3, .12, cd + .3, ca, yR + ch + .06, -cd / 2 + .1);
      // antena
      if (o.antena !== false) {
        F.cyl('metal', 0x8a8a92, .05, 2.2, ca + cw * .4, yR + 1.1, -.6, 6);
        F.box('metal', 0x8a8a92, 1.3, .05, .05, ca + cw * .4, yR + 1.9, -.6);
      }
      // chimenea
      if (o.chimenea && Math.random() < .55) {
        const mx = clamp(ca + cw * .8, -W / 2 + .6, W / 2 - .6);
        F.box('ladrillo', 0x8a5a44, .9, 1.6, .9, mx, yR + .8, -.8);
        F.box('hormigon', f.hormigon, 1.1, .14, 1.1, mx, yR + 1.62, -.8);
      }
    }
    // aire acondicionado en cubierta
    const nAC = 1 + (Math.random() * 2 | 0);
    for (let i = 0; i < nAC; i++) {
      const ax = R2(-W * .35, W * .35), s = .5 + Math.random() * .3;
      F.box('metal', 0xa8adb6, s * 1.7, s, s, ax, yR + s / 2, -1.1);
      F.box('metal', 0x6a6f76, s * 1.8, .07, s * 1.2, ax, yR + .04, -1.1);
    }
  }
  // maceta grande con planta (registra colision: estorba)
  function maceta(F, o) {
    const a = o.a, y = o.y, s = o.s || .55;
    const w0 = F.wall(y);
    const p0 = F.toWorld(a, y, w0 + s * .6);
    // nunca sobre la calzada ni sobre el paso de la acera
    if (distCalle(p0[0], p0[2]) < Rv / 2 + s * 1.1) return;
    F.cyl('hormigon', o.color || 0x8a6a4a, s, s * .9, a, y + s * .45, w0 + s * .6, 12);
    F.cyl('hormigon', 0x6a4f38, s * 1.08, s * .12, a, y + s * .92, w0 + s * .6, 12);
    const leaf = new T.IcosahedronGeometry(s * .95, 0);
    leaf.scale(1, .85, 1);
    leaf.rotateY(R2(0, 3)); leaf.rotateX(R2(-.3, .3));
    const p = F.toWorld(a, y + s * 1.25, w0 + s * .6);
    leaf.translate(p[0], p[1], p[2]);
    put('pintura', leaf, o.colorHoja || 0x3f7a3a);
    if (o.colision) {
      if (!enCalzada(p0[0], p0[2], 1.2) && typeof boxes !== 'undefined') {
        boxes.push({ x: p0[0], z: p0[2], hw: s * .55, hd: s * .55 });
      }
    }
  }
  // pilona (bolardo): choca, se registra
  function pilona(F, a, y, n) {
    const p = F.toWorld(a, y, n);
    if (distCalle(p[0], p[2]) < Rv / 2 + .6) return;   // nunca en la calzada
    F.cyl('metal', 0x3a3a44, .13, .95, a, y + .48, n, 10);
    F.cyl('metal', 0x8a8f98, .14, .07, a, y + .96, n, 10);
    if (!enCalzada(p[0], p[2], 1.4) && typeof boxes !== 'undefined') {
      boxes.push({ x: p[0], z: p[2], hw: .16, hd: .16 });
    }
  }
  // toldo inclinado de tela con puntales
  function toldo(F, o) {
    const a = o.a, y = o.y, w = o.w, d = o.depth || 1.4;
    const w0 = F.wall(y);
    const g = new T.BoxGeometry(w, .1, d);
    g.rotateX(.2); g.rotateY(F.yaw);
    const p = F.toWorld(a, y + d * .1, w0 + d / 2);
    g.translate(p[0], p[1], p[2]);
    put('tela', g, o.color);
    // faldon
    F.box('tela', o.color, w, .28, .06, a, y - d * .1 - .12, w0 + d - .04);
    // puntales
    F.box('metal', 0x4a4a52, .07, .07, d, a - w / 2 + .1, y - d * .1 - .1, w0 + d / 2, .2);
    F.box('metal', 0x4a4a52, .07, .07, d, a + w / 2 - .1, y - d * .1 - .1, w0 + d / 2, .2);
  }
  // toldo enrollado (cilindro + caja)
  function toldoEnrollado(F, o) {
    const a = o.a, y = o.y, w = o.w;
    const w0 = F.wall(y);
    F.cyl('tela', o.color, .19, w, a, y, w0 + .26, 10, 'along');
    F.box('metal', 0x4a4a52, w + .1, .1, .1, a, y, w0 + .1);
    F.box('tela', o.color, w, .3, .05, a, y - .26, w0 + .44);
    F.box('metal', 0x4a4a52, .07, .07, .5, a - w / 2 + .08, y, w0 + .24);
    F.box('metal', 0x4a4a52, .07, .07, .5, a + w / 2 - .08, y, w0 + .24);
  }
  // barlovento / banderola con asta
  function barlovento(F, o) {
    const a = o.a, y = o.y, len = o.len || 1.8;
    const w0 = F.wall(y);
    F.cyl('metal', 0x8a8f98, .05, 2.6, a, y + 1.3, w0 + .35, 8);
    const g = new T.BoxGeometry(.05, .8, len);
    g.rotateX(.12);                 // la bandera cae hacia delante
    g.rotateY(F.yaw + .5);
    const p = F.toWorld(a, y + 2.15, w0 + .35);
    g.translate(p[0], p[1], p[2]);
    put('tela', g, o.color);
  }
  // escalera de incendio (barandilla y peldanos)
  function escaleraIncendio(F, o) {
    const a = o.a, y0 = o.y, h = o.h, cm = 0x4a4a50;
    const w0 = F.wall(y0);
    for (let f = 1; f * 3.4 < h; f++) {
      const y = f * 3.4;
      F.box('metal', cm, 2.2, .1, .9, a, y, w0 + .45);
      F.box('metal', cm, 2.2, .8, .06, a, y + .4, w0 + .88);
      F.box('metal', cm, .06, .8, .06, a - 1.08, y + .4, w0 + .88);
      F.box('metal', cm, .06, .8, .06, a + 1.08, y + .4, w0 + .88);
      F.cyl('metal', cm, .05, 3.4, a - 1.15, y - 1.7, w0 + .9, 6);
    }
  }
  // tuberia de bajante exterior (pegada a la pared alta)
  function tuberia(F, o) {
    const a = o.a, y0 = o.y, h = o.h;
    F.cyl('metal', o.color || 0x7a756c, .09, h, a, y0 + h / 2, .16, 8);
    for (let i = 1; i < 3; i++) F.box('metal', 0x5a564e, .3, .07, .12, a, y0 + h * i / 3, .1);
  }
  // valla metalica
  function valla(F, o) {
    const a = o.a, y = o.y, w = o.w;
    const w0 = F.wall(y);
    const n = Math.max(2, Math.round(w / 1.6));
    for (let i = 0; i <= n; i++) {
      const px = a - w / 2 + w * i / n;
      F.cyl('metal', 0x6a6f76, .06, 1.7, px, y + .85, w0 + .12, 8);
    }
    F.box('metal', 0x6a6f76, w, .06, .06, a, y + 1.6, w0 + .12);
    F.box('metal', 0x6a6f76, w, .06, .06, a, y + .9, w0 + .12);
    F.box('metal', 0x6a6f76, w, .06, .06, a, y + .3, w0 + .12);
  }
  // aire acondicionado de pared
  function aireAcond(F, o) {
    const a = o.a, y = o.y;
    const w0 = F.wall(y);
    F.box('metal', 0x9aa0a8, 1.1, .7, .55, a, y, w0 + .28);
    F.box('metal', 0x6a6f76, 1.2, .08, .6, a, y - .38, w0 + .26);
    F.box('metal', 0x4a4a52, .5, .5, .04, a, y, w0 + .56);
  }
  // plafonera de pared
  function plafon(F, o) {
    const a = o.a, y = o.y;
    const w0 = F.wall(y);
    F.box('metal', 0x2f3440, .46, .18, .34, a, y, w0 + .2);
    F.box('neon', o.color || 0xffe0a8, .32, .07, .12, a, y - .08, w0 + .3);
    haloEn(F, a, y - .1, w0 + .34, 1.6, 1.2, o.color || 0xffe0a8);
  }
  // macetas/plantas de ventana
  function jardinera(F, o) {
    const a = o.a, y = o.y, w = o.w || .8;
    const w0 = F.wall(y);
    F.box('madera', 0x6a4a32, w, .28, .3, a, y + .14, w0 + .16);
    const leaf = new T.IcosahedronGeometry(w * .42, 0);
    leaf.scale(1.2, .8, 1); leaf.translate(0, 0, 0);
    const p = F.toWorld(a, y + .36, w0 + .16);
    leaf.translate(p[0], p[1], p[2]);
    put('pintura', leaf, o.colorHoja || 0x3f7a3a);
  }

  /* ===================== 9. letras 3D y rotulo ===================== */
  function letras3D(F, texto, alt, a0, y0, n, color) {
    const p = alt / 7;
    let x = a0;
    const txt = String(texto).toUpperCase();
    for (const ch of txt) {
      const gl = FONT[ch] || FONT[' '];
      const filas = gl.split('/');
      for (let r = 0; r < 7; r++) {
        const fila = filas[r] || '00000';
        for (let c = 0; c < 5; c++) {
          if (fila[c] !== '1') continue;
          const cx = x + c * p + p / 2;
          const cy = y0 + alt / 2 - r * p - p / 2;
          F.box('neon', color, p * .93, p * .93, .13, cx, cy, n);
        }
      }
      x += 6 * p;
    }
    return x;
  }

  function rotulo(b, opts) {
    opts = opts || {};
    const F = frameDe(b, opts);
    const texto = (opts.texto || '').toUpperCase();
    if (!texto) return null;
    let alt = opts.letra || .62;
    let wTxt = anchoTexto(texto, alt);
    const logo = opts.logo;
    const lsize = logo ? alt * 1.05 : 0;
    let ancho = wTxt + lsize + (logo ? alt * .45 : 0) + alt * .7;
    if (opts.anchoMax && ancho > opts.anchoMax) {          // ajustar para que no salga de la fachada
      const k = opts.anchoMax / ancho;
      alt *= k; wTxt = anchoTexto(texto, alt);
      const nl = logo ? alt * 1.05 : 0;
      ancho = wTxt + nl + (logo ? alt * .45 : 0) + alt * .7;
    }
    const y = opts.y !== undefined ? opts.y : 4.6;
    const n0 = opts.n !== undefined ? opts.n : .1;
    const fondo = opts.fondo !== undefined ? opts.fondo : 0x10131f;
    const color = opts.color !== undefined ? opts.color : 0x27e6ff;
    const acento = opts.acento !== undefined ? opts.acento : 0xffd24a;
    const w0 = F.wall(y);

    // placa con marco
    const hPlaca = alt * 1.55, tPlaca = .18;
    F.box('pintura', fondo, ancho, hPlaca, tPlaca, 0, y, w0 + n0 + tPlaca / 2);
    const fm = opts.marco !== undefined ? opts.marco : 0x8a8f98;
    F.box('metal', fm, ancho + .16, .09, tPlaca + .08, 0, y + hPlaca / 2, w0 + n0 + tPlaca / 2);
    F.box('metal', fm, ancho + .16, .09, tPlaca + .08, 0, y - hPlaca / 2, w0 + n0 + tPlaca / 2);
    F.box('metal', fm, .09, hPlaca, tPlaca + .08, -ancho / 2, y, w0 + n0 + tPlaca / 2);
    F.box('metal', fm, .09, hPlaca, tPlaca + .08, ancho / 2, y, w0 + n0 + tPlaca / 2);
    // tubo de neon perimetral
    F.box('neon', color, ancho - .1, .05, .05, 0, y + hPlaca / 2 - .13, w0 + n0 + tPlaca + .04);
    F.box('neon', color, ancho - .1, .05, .05, 0, y - hPlaca / 2 + .13, w0 + n0 + tPlaca + .04);
    F.box('neon', color, .05, hPlaca - .3, .05, -ancho / 2 + .13, y, w0 + n0 + tPlaca + .04);
    F.box('neon', color, .05, hPlaca - .3, .05, ancho / 2 - .13, y, w0 + n0 + tPlaca + .04);
    // letras 3D
    const nLetra = w0 + n0 + tPlaca + .07;
    let a0 = -ancho / 2 + alt * .35;
    if (logo) a0 += lsize + alt * .3;
    letras3D(F, texto, alt, a0, y, nLetra, color);
    // logo con textura de canvas (alpha)
    if (logo && LOGO_FN[logo]) {
      const la = -ancho / 2 + alt * .35 + lsize / 2;
      logoEn(F, logo, la, y, w0 + n0 + tPlaca + .03, lsize, 0, color, acento);
    }
    // halo
    haloEn(F, 0, y, w0 + n0 + tPlaca + .01, ancho * 1.5, hPlaca * 2.1, color);
    // soporte
    F.box('metal', fm, .1, .1, .5, -ancho / 2 + .5, y, w0 + n0 - .2);
    F.box('metal', fm, .1, .1, .5, ancho / 2 - .5, y, w0 + n0 - .2);
    return { F, texto, ancho, alto: alt, y, color, fondo };
  }

  // banderín perpendicular al frente (logo + color de marca)
  function banderin(F, o) {
    const a = o.a, y = o.y, h = o.largo || 1.5, w = o.ancho || .8;
    const w0 = F.wall(y);
    F.box('pintura', o.fondo !== undefined ? o.fondo : 0x10131f, .14, h, w, a, y, w0 + w / 2 + .1);
    F.box('neon', o.color, .05, h - .16, .05, a, y, w0 + w + .12);
    F.box('neon', o.color, .05, h - .16, .05, a, y, w0 + .12);
    F.box('metal', 0x4a4a52, .12, .12, w + .3, a, y + h / 2, w0 + w / 2 + .1);
    if (o.logo && LOGO_FN[o.logo]) {
      logoEn(F, o.logo, a, y, w0 + w + .16, Math.min(w * .8, h * .7), PI / 2, o.color, o.acento);
    }
  }

  /* ===================== 10. familias de edificio ===================== */
  function familiaDe(b) {
    if (b.zn === 5) return 'abandonada';
    if (b.zn === 0) return 'taller';
    if (b.zn === 1) return b.h > 13 ? 'oficina' : 'vivienda';
    if (b.zn === 3) return 'villa';
    return 'vivienda';
  }

  function bVivienda(b, F, o) {
    const f = o.fam, W = F.fw, h = F.h, sol = F.sol;
    // zocalo de piedra
    F.box('piedra', f.zocalo, W, 1.3, .34, 0, sol + .65, .45);
    F.box('piedra', f.zocalo, W, .12, .42, 0, sol + 1.32, .48);
    // planta baja: entrada en el centro
    const nCols = Math.max(2, Math.round(W / 3.3));
    const paso = W / nCols;
    let planta = 0;
    const yIni = sol + 1.75;
    for (let y = yIni; y + 2.4 < h + .35; y += 2.95, planta++) {
      for (let i = 0; i < nCols; i++) {
        const a = -W / 2 + paso * (i + .5);
        if (planta === 0 && Math.abs(a) < 1.7) continue;
        const alto = 1.85;
        ventana(F, {
          a, y: y + .55, w: 1.05, h: alto, fam: f,
          contra: (i + planta) % 3 === 0 ? f.marco : null,
          persiana: (i * 3 + planta) % 5 === 0 ? 0xd8d2c0 : null
        });
        if (planta > 0 && (i + planta) % 3 === 1) {
          balcon(F, { a, y: y + .42, w: 1.9, depth: 1.05, fam: f });
        }
      }
      // banda de forjado entre plantas
      F.box('pintura', f.muro, W, .14, .12, 0, y + 2.75, .07);
    }
    // entrada
    entrada(F, { a: 0, w: 1.3, h: 2.4, fam: f, colorHoja: 0x5a3a22 });
    toldo(F, { a: 0, y: sol + 2.9, w: 2.1, depth: .9, color: f.acento });
    plafon(F, { a: 0, y: sol + 2.75, color: f.luz });
    // buzones y macetas
    for (let i = 0; i < 3; i++) F.box('metal', 0x3a5a6a, .32, .26, .16, 1.15 + i * .36, sol + 1.3, .55);
    maceta(F, { a: -1.5, y: sol, s: .5, colision: true });
    maceta(F, { a: 1.5, y: sol, s: .45, colision: true });
    // tuberias y aire acondicionado
    tuberia(F, { a: W / 2 - .5, y: sol, h: h - sol, color: 0x7a756c });
    aireAcond(F, { a: -W / 2 + 1.4, y: sol + 2.4 });
    if (h > 9 && Math.random() < .5) escaleraIncendio(F, { a: W / 2 - 2.2, y: sol, h: h });
    remates(F, { fam: f });
    azotea(F, { fam: f, chimenea: true });
  }

  function bVilla(b, F, o) {
    const f = o.fam, W = F.fw, h = F.h, sol = F.sol;
    F.box('piedra', f.zocalo, W, 1.1, .3, 0, sol + .55, .42);
    const nCols = Math.max(2, Math.round(W / 3.6));
    const paso = W / nCols;
    for (let y = sol + 1.8; y + 2.2 < h + .35; y += 3.0) {
      for (let i = 0; i < nCols; i++) {
        const a = -W / 2 + paso * (i + .5);
        if (y < sol + 2.4 && Math.abs(a) < 1.8) continue;
        ventana(F, {
          a, y: y + .5, w: 1.15, h: 1.95, fam: f,
          contra: 0x2f6f8a, persiana: 0xf0ece0
        });
        if ((i + Math.round(y)) % 2 === 0) balcon(F, { a, y: y + .4, w: 1.7, depth: .95, fam: f });
        else jardinera(F, { a, y: y + .48, w: .9, colorHoja: 0x4f8a3a });
      }
    }
    entrada(F, { a: 0, w: 1.4, h: 2.5, fam: f, colorHoja: 0x2f6f8a, pasos: 3 });
    marquesina(F, { a: 0, y: sol + 3.1, w: 3.2, depth: 1.3, posts: 2, luz: f.luz });
    maceta(F, { a: -1.7, y: sol, s: .55, colision: true, colorHoja: 0x4a8a3a });
    maceta(F, { a: 1.7, y: sol, s: .5, colision: true, colorHoja: 0x4a8a3a });
    aireAcond(F, { a: W / 2 - 1.2, y: sol + 2.6 });
    remates(F, { fam: f });
    // alero inclinado de teja por encima de la cornisa
    F.box('teja', f.tejado, W + .8, .18, 1.5, 0, h + 1.02, .72, .13);
    F.box('teja', f.tejado, W + .8, .1, .1, 0, h + .78, 1.42);
    azotea(F, { fam: f, chimenea: true });
  }

  function bOficina(b, F, o) {
    const f = o.fam, W = F.fw, h = F.h, sol = F.sol;
    // zocalo de piedra de 2 plantas
    F.box('piedra', f.zocalo, W, 3.2, .32, 0, sol + 1.6, .38);
    // cuerpo: bandas horizontales de cristal con montantes
    let y = sol + 3.4;
    let banda = 0;
    while (y + 1.9 < h + .35) {
      const w0 = F.wall(y);
      // antepecho de la banda
      F.box('pintura', f.muro, W, .55, .16, 0, y + .27, w0 + .08);
      // cristal continuo
      F.box('cristal', f.cristal, W - .4, 1.15, .06, 0, y + 1.1, w0 + .06);
      // montantes verticales
      const n = Math.max(3, Math.round(W / 2.6));
      for (let i = 0; i <= n; i++) {
        const a = -W / 2 + .2 + (W - .4) * i / n;
        F.box('metal', f.marco, .16, 1.3, .22, a, y + 1.1, w0 + .11);
      }
      // dintel de la banda
      F.box('pintura', f.muro, W, .3, .18, 0, y + 1.85, w0 + .09);
      y += 2.35; banda++;
    }
    // entrada: marquesina de oficinas con pilonas
    entrada(F, { a: 0, w: 2.2, h: 2.9, fam: f, colorMarco: f.marco, colorHoja: 0x2a3440, pasos: 1 });
    marquesina(F, { a: 0, y: sol + 3.4, w: 4.2, depth: 1.7, posts: 2, luz: f.luz, color: 0x8a9098 });
    for (let i = 0; i < 3; i++) pilona(F, -2.6 + i * 2.6, sol, .95);
    maceta(F, { a: -3.2, y: sol, s: .6, colision: true });
    maceta(F, { a: 3.2, y: sol, s: .6, colision: true });
    tuberia(F, { a: W / 2 - .4, y: sol, h: h - sol, color: 0x6a6f76 });
    remates(F, { fam: f });
    azotea(F, { fam: f, antena: true, chimenea: false });
  }

  function bTienda(b, F, o) {
    const f = o.fam, W = F.fw, h = F.h, sol = F.sol;
    const m = o.marca || MARCAS.general;
    // pilastras laterales (junto a las del local, sin solaparlas)
    F.box('piedra', f.zocalo, .28, h - sol, .3, -W / 2 + .75, (h + sol) / 2, .12);
    F.box('piedra', f.zocalo, .28, h - sol, .3, W / 2 - .75, (h + sol) / 2, .12);
    // zocalo de piedra (umbral bajo de la fachada)
    F.box('piedra', f.zocalo, W - 1.2, .45, .22, 0, sol + .22, .14);
    // toldo enrollado bajo el toldo del local
    toldoEnrollado(F, { a: 0, y: sol + 3.05, w: Math.min(W - 2.4, 9), color: m.c });
    // jambas de las puertas de cristal laterales (el escaparate real ya existe: se remata)
    for (const sx of [-1, 1]) {
      const a = sx * (W / 2 - 2.4);
      F.box('metal', f.marco, .1, 2.4, .16, a - .9, sol + 1.2, .12);
      F.box('metal', f.marco, .1, 2.4, .16, a + .9, sol + 1.2, .12);
    }
    // acentos de negocio
    acentoNegocio(o.opts.tipoNegocio || o.tipo, F, f, m, W, h, sol);
    // macetas, luz, tuberia
    maceta(F, { a: -W / 2 + 1.1, y: sol, s: .55, colision: true, color: 0x4a6a3a });
    maceta(F, { a: W / 2 - 1.1, y: sol, s: .55, colision: true, color: 0x4a6a3a });
    plafon(F, { a: 0, y: sol + 2.6, color: m.a });
    tuberia(F, { a: W / 2 - .35, y: sol, h: h - sol, color: 0x7a756c });
    remates(F, { fam: f });
    azotea(F, { fam: f, antena: false, chimenea: false });
  }

  // acentos propios de cada tipo de comercio
  function acentoNegocio(tipo, F, f, m, W, h, sol) {
    if (!tipo) return;
    if (tipo === 'Armeria') {
      // vitrina blindada con marco de metal
      F.box('metal', 0x4a4a52, 1.6, 1.5, .8, -W / 2 + 1.6, sol + .75, .5);
      F.box('cristal', 0x9fd0e8, 1.4, 1.2, .5, -W / 2 + 1.6, sol + .8, .5);
      F.box('neon', m.c, 1.5, .06, .06, -W / 2 + 1.6, sol + 1.5, .92);
      pilona(F, W / 2 - 1.2, sol, .8);
    } else if (tipo === 'Farmacia') {
      // cruz de farmacia en 3D sobre el escaparate
      F.box('neon', 0x3dff9a, .7, .2, .16, 0, sol + 2.45, .18);
      F.box('neon', 0x3dff9a, .2, .7, .16, 0, sol + 2.45, .18);
      haloEn(F, 0, sol + 2.45, .3, 2.6, 2.6, 0x3dff9a);
      F.box('pintura', 0xe8f0ec, 1.5, 1.1, .06, W / 2 - 2.4, sol + 1.9, .12);
    } else if (tipo === 'Taller') {
      // montacargas, pila de neumaticos y rampa
      for (const sx of [-1, 1]) F.box('metal', 0x8a9098, .3, 3.2, .3, W / 2 - 2.2 + sx * 1.5, sol + 1.6, .3);
      F.box('metal', 0x6a6f76, 3.6, .24, .6, W / 2 - 2.2, sol + 3.3, .3);
      for (let k = 0; k < 3; k++) {
        const g = new T.TorusGeometry(.42, .18, 6, 12);
        g.rotateX(PI / 2);
        const p = F.toWorld(-W / 2 + 1.4, sol + .2 + k * .38, .5);
        g.translate(p[0], p[1], p[2]);
        put('pintura', g, 0x1b1b20);
      }
      F.box('hormigon', 0x8a857c, 2.2, .14, 1.4, -W / 2 + 2.6, sol + .07, .7, 0);
    } else if (tipo === 'Super') {
      // hueco de carritos y cajas apiladas
      for (let k = 0; k < 4; k++) F.box('metal', 0x9aa0a8, .08, .1, 1.0, W / 2 - 1.6 - k * .12, sol + .5, .6);
      F.box('metal', 0x9aa0a8, .08, 1.0, .08, W / 2 - 1.6, sol + .5, .35);
      F.box('metal', 0x9aa0a8, .08, 1.0, .08, W / 2 - 1.6, sol + .5, .85);
      for (let k = 0; k < 3; k++) F.box('madera', 0x8a6a45, .8, .5, .6, -W / 2 + 1.3, sol + .25 + k * .5, .5);
      F.box('neon', m.c, 1.2, .1, .06, 0, sol + 2.6, .2);
    } else if (tipo === 'General') {
      // prensa exterior y cajas
      F.box('metal', 0x8a9098, .7, 1.1, .4, W / 2 - 1.4, sol + .55, .45);
      F.box('cristal', 0x9fd0e8, .6, .8, .3, W / 2 - 1.4, sol + .6, .45);
      for (let k = 0; k < 2; k++) F.box('madera', 0x8a6a45, .7, .45, .6, -W / 2 + 1.2, sol + .22 + k * .45, .5);
    }
  }

  function bConcesionario(b, F, o) {
    const f = o.fam, W = F.fw, h = F.h, sol = F.sol;
    const m = o.marca || MARCAS.auto;
    // zocalo de piedra
    F.box('piedra', f.zocalo, W, .9, .3, 0, sol + .45, .2);
    // marquesina de exposicion con postes
    marquesina(F, { a: 0, y: sol + 3.9, w: W - 3, depth: 2.2, posts: 3, luz: m.c, color: 0x9aa0a8 });
    // pilones
    for (let i = 0; i < 4; i++) pilona(F, -W / 2 + 3 + i * ((W - 6) / 3), sol, 1.1);
    // pylon vertical con el logo
    const pa = W / 2 - 1.6;
    F.box('metal', 0x3a4048, .5, 5.2, .5, pa, sol + 2.6, .9);
    F.box('pintura', m.f, 1.9, 2.6, .16, pa, sol + 4.4, 1.1);
    F.box('neon', m.c, 1.9, .07, .07, pa, sol + 5.62, 1.18);
    if (LOGO_FN[m.logo]) logoEn(F, m.logo, pa, sol + 4.7, 1.2, 1.5, 0, m.c, m.a);
    // banderola y rueda de exposicion
    barlovento(F, { a: -W / 2 + 1.2, y: sol + 4.4, len: 2, color: m.c });
    F.cyl('metal', 0x2a2a30, .55, .3, -W / 2 + 1.6, sol + .5, .8, 16, 'out');
    F.cyl('metal', 0xb0b6bd, .5, .08, -W / 2 + 1.6, sol + .66, .8, 16, 'out');
    maceta(F, { a: -W / 2 + 1.2, y: sol, s: .6, colision: true });
    maceta(F, { a: W / 2 - 3.4, y: sol, s: .55, colision: true });
    remates(F, { fam: f });
    azotea(F, { fam: f, antena: false, chimenea: false });
  }

  function bHotel(b, F, o) {
    const f = o.fam, W = F.fw, h = F.h, sol = F.sol;
    const m = o.marca || MARCAS.hotel;
    // zocalo de piedra alto
    F.box('piedra', f.zocalo, W, 2.6, .3, 0, sol + 1.3, .22);
    F.box('piedra', f.zocalo, W, .16, .4, 0, sol + 2.66, .26);
    // pilastras
    const np = Math.max(2, Math.round(W / 6));
    for (let i = 0; i <= np; i++) {
      const a = -W / 2 + W * i / np;
      F.box('piedra', f.muro, .55, h - sol, .22, a, (h + sol) / 2, .12);
      F.box('piedra', f.zocalo, .7, .25, .3, a, h - .35, .18);
    }
    // ventanas con balcon pequeño
    const nCols = Math.max(3, Math.round(W / 3.4));
    const paso = W / nCols;
    let planta = 0;
    for (let y = sol + 3.0; y + 2.5 < h; y += 2.9, planta++) {
      for (let i = 0; i < nCols; i++) {
        const a = -W / 2 + paso * (i + .5);
        if (planta === 0 && Math.abs(a) < 3.4) continue;   // hueco de la marquesina
        ventana(F, { a, y: y + .3, w: 1.15, h: 1.7, fam: f, colorMarco: f.marco, contra: f.acento });
        if ((i + planta) % 2 === 0) balcon(F, { a, y: y + .18, w: 1.5, depth: .8, fam: f, alt: .9 });
      }
      F.box('pintura', f.muro, W, .18, .14, 0, y + 2.55, .09);
    }
    // marquesina de entrada con 4 postes
    entrada(F, { a: 0, w: 2.4, h: 3, fam: f, colorMarco: f.marco, colorHoja: 0x4a3524, pasos: 2 });
    marquesina(F, { a: 0, y: sol + 3.7, w: 6.4, depth: 2.4, posts: 4, luz: m.a, color: 0x9a8f78 });
    toldo(F, { a: 0, y: sol + 4.5, w: 6, depth: 1.4, color: 0x8a1f3a });
    maceta(F, { a: -3.6, y: sol, s: .65, colision: true, colorHoja: 0x3f7a4a });
    maceta(F, { a: 3.6, y: sol, s: .65, colision: true, colorHoja: 0x3f7a4a });
    for (let i = 0; i < 2; i++) pilona(F, -4.6 + i * 9.2, sol, 1.4);
    plafon(F, { a: -1.6, y: sol + 3.1, color: m.a });
    plafon(F, { a: 1.6, y: sol + 3.1, color: m.a });
    tuberia(F, { a: W / 2 - .3, y: sol, h: h - sol, color: 0x6a5f52 });
    remates(F, { fam: f });
    azotea(F, { fam: f, antena: true, chimenea: true });
  }

  function bBar(b, F, o) {
    const f = o.fam, W = F.fw, h = F.h, sol = F.sol;
    const m = o.marca || MARCAS.bar;
    // zocalo de ladrillo
    F.box('ladrillo', f.zocalo, W, .9, .26, 0, sol + .45, .16);
    F.box('madera', f.marco, W - .4, .18, .2, 0, sol + .98, .12);
    // ventanal con marco
    F.box('cristal', f.cristal, W - 1.6, 1.4, .06, 0, sol + 1.0, .1);
    F.box('madera', f.marco, .12, 1.7, .18, -W / 2 + .8, sol + 1.5, .14);
    F.box('madera', f.marco, .12, 1.7, .18, W / 2 - .8, sol + 1.5, .14);
    F.box('madera', f.marco, W - 1.4, .14, .2, 0, sol + 2.4, .14);
    // toldo enrollado y banderín
    toldoEnrollado(F, { a: 0, y: sol + 2.5, w: W - .6, color: m.c });
    banderin(F, { a: W / 2 - .5, y: sol + 2.1, largo: 1.5, ancho: .8, color: m.c, fondo: m.f, logo: m.logo, acento: m.a });
    // terraza: mesas y taburetes
    for (let i = 0; i < 2; i++) {
      const a = -W / 2 + 1.2 + i * (W - 2.4);
      const p = F.toWorld(a, sol, 1.1);
      if (enCalzada(p[0], p[2], 1.6)) continue;
      F.cyl('madera', 0x6b4a32, .45, .08, a, sol + .78, 1.1, 14);
      F.cyl('metal', 0x3a3a44, .06, .78, a, sol + .39, 1.1, 8);
      F.cyl('metal', 0x3a3a44, .3, .05, a, sol + .03, 1.1, 10);
      for (let k = 0; k < 2; k++) {
        F.cyl('madera', 0x8a3a2a, .22, .08, a + (k ? .85 : -.85), sol + .46, 1.3, 10);
        F.cyl('metal', 0x3a3a44, .05, .46, a + (k ? .85 : -.85), sol + .23, 1.3, 8);
      }
    }
    // guirnalda de bombillas bajo el faldon del toldo
    for (let i = 0; i < 5; i++) {
      F.box('neon', m.a, .12, .12, .12, -W / 2 + .8 + i * ((W - 1.6) / 4), sol + 1.95, .52);
    }
    maceta(F, { a: W / 2 - 1, y: sol, s: .45, colision: true });
    tuberia(F, { a: -W / 2 + .25, y: sol, h: h - sol, color: 0x6a5f52 });
    remates(F, { fam: f });
    azotea(F, { fam: f, antena: false, chimenea: false });
  }

  function bClinica(b, F, o) {
    const f = o.fam, W = F.fw, h = F.h, sol = F.sol;
    const m = o.marca || MARCAS.clinica;
    // zocalo y franja verde
    F.box('hormigon', f.zocalo, W, .8, .24, 0, sol + .4, .14);
    F.box('pintura', 0x2f9a5f, W, .22, .1, 0, sol + 2.05, .06);
    // cruz 3D iluminada projecting sobre la pared
    const ca = W / 2 - 1.6;
    F.box('neon', 0xff4a4a, .9, .26, .18, ca, sol + 1.7, .16);
    F.box('neon', 0xff4a4a, .26, .9, .18, ca, sol + 1.7, .16);
    haloEn(F, ca, sol + 1.7, .3, 3, 3, 0xff4a4a);
    F.box('metal', 0x4a4a52, .1, .1, .5, ca, sol + 1.7, -.1);
    // entrada con rampa accesible
    entrada(F, { a: 0, w: 1.5, h: 2.4, fam: f, colorMarco: 0x2f7a4a, colorHoja: 0xdfe8ea, rampa: true, pasos: 0 });
    // bancos, macetas y aire acondicionado
    F.box('madera', 0x6b4a32, 1.8, .12, .45, -W / 2 + 1.3, sol + .48, .8);
    F.box('metal', 0x4a4a52, .1, .45, .4, -W / 2 + .6, sol + .23, .8);
    F.box('metal', 0x4a4a52, .1, .45, .4, -W / 2 + 2.0, sol + .23, .8);
    maceta(F, { a: W / 2 - 1.1, y: sol, s: .5, colision: true, colorHoja: 0x3f8a5a });
    aireAcond(F, { a: -W / 2 + 1.2, y: sol + 2.2 });
    remates(F, { fam: f });
    azotea(F, { fam: f, antena: false, chimenea: false });
  }

  function bTaller(b, F, o) {
    const f = o.fam, W = F.fw, h = F.h, sol = F.sol;
    // chapado grecado: nervios verticales
    const nRib = Math.max(4, Math.round(W / .9));
    for (let i = 0; i <= nRib; i++) {
      const a = -W / 2 + W * i / nRib;
      F.box('metal', f.muro, .16, h - sol, .1, a, (h + sol) / 2, .07);
    }
    // zocalo de hormigon
    F.box('hormigon', f.zocalo, W, 1.0, .26, 0, sol + .5, .16);
    // porton enrollable
    const pw = Math.min(W * .45, 5.2);
    F.box('metal', 0x5a6068, pw, 3.4, .12, 0, sol + 1.7, .1);
    for (let i = 0; i < 12; i++) F.box('metal', 0x767c84, pw - .1, .06, .16, 0, sol + .25 + i * .28, .14);
    F.box('metal', 0x3a4048, pw + .3, .3, .3, 0, sol + 3.55, .12);
    // ventanales industriales a los lados del porton
    const gw = Math.max(1, (W - pw - 1.6) / 2);
    for (const sx of [-1, 1]) {
      const a = sx * (pw / 2 + .8 + gw / 2);
      F.box('cristal', 0x9fc0d0, gw, 1.4, .06, a, sol + 1.9, .08);
      for (let i = 0; i < 3; i++) F.box('metal', f.marco, .1, 1.5, .12, a - gw / 2 + gw * i / 2, sol + 1.9, .12);
    }
    // marquesina de acero y focos
    marquesina(F, { a: 0, y: sol + 3.9, w: W - 2, depth: 1.8, posts: 2, luz: 0xfff0c0, color: 0x6a6f76 });
    for (let i = 0; i < 2; i++) {
      F.box('metal', 0x4a4a52, .22, .22, .5, -W / 4 + i * (W / 2), sol + 3.5, .45);
      F.box('neon', 0xfff0c0, .18, .18, .1, -W / 4 + i * (W / 2), sol + 3.4, .7);
    }
    // tuberias, ventilador y bidon
    tuberia(F, { a: -W / 2 + .3, y: sol, h: h - sol, color: 0x7a756c });
    F.cyl('metal', 0x8a9098, .5, .3, W / 2 - 1.2, F.cub + .55, -.6, 14, 'out');
    F.cyl('metal', 0x4a4a52, .1, .5, W / 2 - 1.2, F.cub + .28, -.6, 8);
    const p = F.toWorld(-W / 2 + 1.4, sol, .8);
    if (!enCalzada(p[0], p[2], 1.2) && typeof boxes !== 'undefined') {
      F.cyl('metal', 0x2f6a4a, .42, 1.0, -W / 2 + 1.4, sol + .5, .8, 12);
      boxes.push({ x: p[0], z: p[2], hw: .45, hd: .45 });
    }
    remates(F, { fam: f });
    azotea(F, { fam: f, antena: false, chimenea: false });
  }

  function bNave(b, F, o) {
    const f = o.fam, W = F.fw, h = F.h, sol = F.sol;
    const m = o.marca || MARCAS.nave;
    // chapado grecado
    const nRib = Math.max(6, Math.round(W / 1.1));
    for (let i = 0; i <= nRib; i++) {
      const a = -W / 2 + W * i / nRib;
      F.box('metal', f.muro, .2, h - sol, .1, a, (h + sol) / 2, .07);
    }
    // zocalo
    F.box('hormigon', f.zocalo, W, 1.2, .3, 0, sol + .6, .2);
    // porton grande con lamas
    F.box('metal', 0x4a5058, 10.4, 5.4, .14, 0, sol + 2.7, .12);
    for (let i = 0; i < 18; i++) F.box('metal', 0x6a7076, 10.2, .08, .18, 0, sol + .3 + i * .3, .16);
    F.box('metal', 0x2f343c, 10.8, .4, .36, 0, sol + 5.5, .14);
    // muelle de carga
    F.box('hormigon', 0x6a6660, 9, .5, 1.4, 0, sol - .1, .85);
    for (const sx of [-1, 1]) F.box('pintura', 0x1b1b20, .4, .6, .3, sx * 4.2, sol + .3, 1.4);
    // APM y focos
    marquesina(F, { a: 0, y: sol + 6.2, w: 9, depth: 1.6, posts: 2, luz: 0xffd0a0, color: 0x5a6068 });
    for (let i = 0; i < 3; i++) {
      F.box('metal', 0x3a4048, 1.4, .5, .7, -W / 2 + 3 + i * 4, sol + 5.4, .5);
      F.cyl('metal', 0x8a9098, .45, .25, -W / 2 + 3 + i * 4, sol + 5.9, .5, 12, 'out');
    }
    // tuberias y valla
    tuberia(F, { a: W / 2 - .4, y: sol, h: h - sol, color: 0x6a6f76 });
    valla(F, { a: 0, y: sol, w: W - 2 });
    remates(F, { fam: f });
    azotea(F, { fam: f, antena: false, chimenea: false });
  }

  function bAbandonada(b, F, o) {
    const f = o.fam, W = F.fw, h = F.h, sol = F.sol;
    // zocalo descascarado
    F.box('piedra', f.zocalo, W, 1.1, .26, 0, sol + .55, .3);
    const nCols = Math.max(2, Math.round(W / 3.2));
    const paso = W / nCols;
    for (let y = sol + 1.7; y + 2.2 < h + .35; y += 3.0) {
      for (let i = 0; i < nCols; i++) {
        const a = -W / 2 + paso * (i + .5);
        const w0 = F.wall(y);
        // hueco tapiado con tablones cruzados
        F.box('cristal', 0x151a1e, 1.1, 1.7, .05, a, y + 1.1, w0 + .05);
        F.box('madera', 0x6a5236, 1.5, .26, .1, a, y + .8, w0 + .12, .12);
        F.box('madera', 0x5c4630, 1.5, .26, .1, a, y + 1.35, w0 + .12, -.1);
        F.box('madera', 0x7a5f3e, .18, 1.9, .1, a - .4, y + 1.1, w0 + .14, .06);
        // marco roto
        F.box('madera', 0x4a3a28, .12, 1.9, .16, a - .62, y + 1.1, w0 + .1);
        F.box('madera', 0x4a3a28, .12, 1.9, .16, a + .62, y + 1.1, w0 + .1);
      }
    }
    // puerta tapiada
    F.box('madera', 0x5c4630, 1.3, 2.3, .1, 0, sol + 1.15, .3);
    F.box('madera', 0x6a5236, 1.7, .24, .12, 0, sol + 1.3, .38, .1);
    F.box('madera', 0x6a5236, 1.7, .24, .12, 0, sol + .7, .38, -.08);
    // chatarra y maleza
    for (let i = 0; i < 4; i++) {
      const a = R2(-W / 2, W / 2);
      F.box('metal', 0x6a6a62, R2(.4, 1.2), R2(.2, .5), R2(.3, .8), a, sol + .2, .5);
    }
    for (let i = 0; i < 5; i++) {
      const a = R2(-W / 2, W / 2);
      const g = new T.IcosahedronGeometry(R2(.18, .32), 0);
      g.scale(1, 1.4, 1);
      const p = F.toWorld(a, sol + .3, .45);
      g.translate(p[0], p[1], p[2]);
      put('pintura', g, 0x4a5a32);
    }
    // escalera oxidada
    F.box('metal', 0x5a5a52, .06, h - sol, .06, W / 2 - 1.2, (h + sol) / 2, .35);
    for (let i = 0; i < 5; i++) F.box('metal', 0x5a5a52, .5, .05, .05, W / 2 - 1.2, sol + .8 + i * (h - sol) / 5, .35);
    remates(F, { fam: f });
  }

  const BUILDER = {
    vivienda: bVivienda, villa: bVilla, oficina: bOficina, tienda: bTienda,
    concesionario: bConcesionario, hotel: bHotel, bar: bBar, clinica: bClinica,
    taller: bTaller, nave: bNave, abandonada: bAbandonada
  };

  /* ===================== 11. API publica ===================== */
  let aplicado = false;
  const ENC = { meshes: [], prev: [] };

  function fachada(b, opts) {
    opts = opts || {};
    const tipo = opts.tipo || 'vivienda';
    const fam = FAM[tipo] || FAM.vivienda;
    const F = frameDe(b, opts);
    const m = opts.marca ? MARCAS[opts.marca] : null;
    const o = { fam, tipo, opts, marca: m, b };
    (BUILDER[tipo] || BUILDER.vivienda)(b, F, o);
    if (opts.rotulo !== false && m) {
      const r = opts.rotuloOpts || {};
      rotulo(b, {
        cara: opts.cara, y: r.y !== undefined ? r.y : 4.6, letra: r.letra,
        anchoMax: r.anchoMax, n: r.n, texto: r.texto || m.n, logo: m.logo,
        color: m.c, fondo: m.f, acento: m.a
      });
    }
    return { b, tipo, F, marca: m };
  }

  function aplicar(opts) {
    opts = opts || {};
    if (aplicado) { NC.log('arq: ya aplicado (idempotente)'); return { ya: true }; }
    try {
      if (opts.reemplazarDecorPrevio !== false) desactivarDecorPrevio();
    } catch (e) { NC.log('arq: decor previa', e); }
    aplicado = true;
    let n = 0;
    // 1) edificios de manzana
    try {
      if (typeof BLD !== 'undefined' && BLD.length) {
        BLD.forEach(b => {
          const tipo = opts.familia || familiaDe(b);
          fachada(b, { tipo, ruina: b.zn === 5 });
          n++;
        });
      }
    } catch (e) { NC.log('arq: BLD', e); }
    // 2) comercios (SHOPTYPES: Armeria, Farmacia, Taller, Super, General)
    try {
      if (typeof shops !== 'undefined' && shops.length) {
        shops.forEach(s => {
          const marca = MARCA_POR_TIPO[s.type] || 'general';
          const mm = MARCAS[marca];
          const b = { x: s.x, z: s.z - 7.6, w: 16, d: 12, h: 5.35, sol: .35, perfil: 'plano', cubierta: 5.85 };
          fachada(b, {
            tipo: 'tienda', cara: '+z', tipoNegocio: s.type, marca,
            rotuloOpts: { y: 4.95, letra: .58, anchoMax: 13.5, n: .36, texto: nombreNegocio(s.name, mm.n) }
          });
          n++;
        });
      }
    } catch (e) { NC.log('arq: comercios', e); }
    // 3) concesionarios
    try {
      if (typeof carShops !== 'undefined' && carShops.length) {
        carShops.forEach(cs => {
          const b = { x: cs.x - 5, z: cs.z - 9, w: 22, d: 14, h: 6.3, sol: .3, perfil: 'plano', cubierta: 6.8 };
          fachada(b, {
            tipo: 'concesionario', cara: '+z', marca: 'auto',
            rotuloOpts: { y: 5.6, letra: .9, anchoMax: 17, n: .46, texto: 'AUTOCOSTA' }
          });
          n++;
        });
      }
    } catch (e) { NC.log('arq: concesionarios', e); }
    // 4) hoteles
    try {
      if (typeof hotels !== 'undefined' && hotels.length) {
        hotels.forEach((ht, i) => {
          const b = { x: ht.x, z: ht.z - 10, w: 26, d: 16, h: 8.3, sol: .3, perfil: 'plano', cubierta: 8.9 };
          const mk = (i % 2) ? 'hotel2' : 'hotel';
          const mm = MARCAS[mk];
          fachada(b, {
            tipo: 'hotel', cara: '+z', marca: mk,
            rotuloOpts: { y: 6.4, letra: .8, anchoMax: 20, n: .42, texto: (ht.name || mm.n).toUpperCase() }
          });
          n++;
        });
      }
    } catch (e) { NC.log('arq: hoteles', e); }
    // 5) bares (el primero es el Club Neon)
    try {
      if (typeof bars !== 'undefined' && bars.length) {
        bars.forEach((br, i) => {
          const mk = (i === 0) ? 'club' : 'bar';
          const mm = MARCAS[mk];
          const b = { x: br.x, z: br.z - 3.4, w: 7, d: 5, h: 3.4, sol: .3, perfil: 'plano', cubierta: 4.1 };
          fachada(b, {
            tipo: 'bar', cara: '+z', marca: mk,
            rotuloOpts: { y: 3.05, letra: .42, anchoMax: 6.2, n: .36, texto: mm.n }
          });
          n++;
        });
      }
    } catch (e) { NC.log('arq: bares', e); }
    // 6) nave industrial
    try {
      if (typeof FACTORY !== 'undefined' && FACTORY) {
        const b = { x: FACTORY.x, z: FACTORY.z, w: 30, d: 24, h: 9, sol: .35, perfil: 'plano', cubierta: 9.85 };
        fachada(b, {
          tipo: 'nave', cara: '+z', marca: 'nave',
          rotuloOpts: { y: 7.4, letra: .8, anchoMax: 22, n: .3, texto: MARCAS.nave.n }
        });
        n++;
      }
    } catch (e) { NC.log('arq: nave', e); }
    // 7) clinica (la fachada real esta en cz + d/2 + .25)
    try {
      if (typeof CLINIC !== 'undefined' && CLINIC) {
        const b = { x: CLINIC.x, z: CLINIC.z + .25, w: 12, d: 8, h: 3.4, sol: .15, perfil: 'plano', cubierta: 4.15 };
        fachada(b, {
          tipo: 'clinica', cara: '+z', marca: 'clinica',
          rotuloOpts: { y: 2.9, letra: .42, anchoMax: 10.5, n: .12, texto: MARCAS.clinica.n }
        });
        n++;
      }
    } catch (e) { NC.log('arq: clinica', e); }
    // 8) club nocturno (la sala de la playa; su frente esta en cz + d/2 + .25)
    try {
      if (typeof EXT !== 'undefined') {
        const b = { x: EXT + 30, z: -149.75, w: 16, d: 12, h: 4.5, sol: .3, perfil: 'plano', cubierta: 4.8 };
        // no es un local de planta baja: solo remates, neones y un letrero
        const F = frameDe(b, { cara: '+z' });
        const mm = MARCAS.club;
        F.box('pintura', mm.f, 16, 4.5, .1, 0, 2.4, .06);
        F.box('neon', mm.c, 15.6, .07, .07, 0, .7, .16);
        F.box('neon', mm.c, 15.6, .07, .07, 0, 4.1, .16);
        F.box('neon', 0x27e6ff, .07, 3.3, .07, -7.6, 2.4, .16);
        F.box('neon', 0x27e6ff, .07, 3.3, .07, 7.6, 2.4, .16);
        rotulo(b, { cara: '+z', y: 3.9, letra: .5, anchoMax: 11, n: .12, texto: mm.n, logo: mm.logo, color: mm.c, fondo: mm.f, acento: mm.a });
        // cordones de terciopelo
        for (let i = 0; i < 3; i++) {
          pilona(F, -2.4 + i * 2.4, .3, 1.2);
          F.box('pintura', mm.c, 2.3, .1, .1, -1.2 + i * 2.4, 1.05, 1.2);
        }
        F.box('neon', mm.c, .9, .18, .18, 4.2, 2.6, .12);
        n++;
      }
    } catch (e) { NC.log('arq: club', e); }
    montar();
    NC.log('arq: ' + n + ' edificios con fachada, cornisa, carpinteria y cartelas');
    return { n };
  }

  function nombreNegocio(sn, def) {
    if (!sn) return def;
    const t = String(sn).replace(/\s*\d+\s*$/, '').trim();
    return (t || def).toUpperCase();
  }

  /* ===================== 12. decoracion previa (edificios.js) ===================== */
  function desactivarDecorPrevio() {
    if (!SCN) return 0;
    let n = 0;
    const hide = (o) => { o.visible = false; ENC.prev.push(o); n++; };
    SCN.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const m = o.material;
      if (m.userData && m.userData.arq) return;          // es nuestro
      if (m.type === 'MeshBasicMaterial') {
        // banda de rotulos planos de todo el barrio (M_LIGHT de edificios.js)
        if (m.vertexColors && !m.map && !m.transparent) {
          try {
            const bb = new T.Box3().setFromObject(o);
            if ((bb.max.x - bb.min.x) > 200 || (bb.max.z - bb.min.z) > 200) hide(o);
          } catch (e) { }
        }
        return;
      }
      if (!m.vertexColors) return;
      const im = m.map && m.map.image;
      // los 4 materiales de src/edificios.js (texturas y parametros propios)
      if (im && im.width === 256 && im.height === 256 && Math.abs(m.roughness - .88) < .01 && Math.abs(m.metalness - .03) < .01) { hide(o); return; }
      if (!m.map && Math.abs(m.roughness - .45) < .01 && Math.abs(m.metalness - .72) < .01) { hide(o); return; }
      if (!m.map && m.transparent && Math.abs(m.roughness - .06) < .01 && Math.abs(m.opacity - .62) < .02) { hide(o); return; }
      if (!m.map && Math.abs(m.roughness - .82) < .01 && Math.abs(m.metalness - .02) < .01) { hide(o); return; }
    });
    // los rotulos planos de los negocios (canvas 256x44, 256x48, 512x96, 128x40)
    SCN.traverse(o => {
      if (!o.isMesh || !o.material || !o.material.map) return;
      if (o.material.userData && o.material.userData.arq) return;
      const im = o.material.map.image;
      if (!im) return;
      const k = im.width + 'x' + im.height;
      if ((k === '256x44' || k === '256x48' || k === '512x96' || k === '128x40') && o.material.type === 'MeshBasicMaterial') hide(o);
    });
    if (n) NC.log('arq: ' + n + ' mallas de decoracion previa sustituidas por la nueva fachada');
    else NC.log('arq: no se encontro decoracion previa (edificios.js no cargado o ya limpio)');
    return n;
  }

  /* ===================== 13. montaje ===================== */
  function crearMalla(mat, list) {
    const m = new T.Mesh(MERGE(list), MAT[mat]);
    m.castShadow = (mat !== 'cristal' && mat !== 'neon');
    m.receiveShadow = true;
    m.name = 'arq_' + mat;
    m.userData.arq = 1;
    return m;
  }
  function crearLogo(o) {
    const tex = texturaLogo(o.k, o.color, o.acento);
    const mat = new T.MeshStandardMaterial({
      map: tex, transparent: true, alphaTest: .12, roughness: .45, metalness: .1,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .35, side: T.DoubleSide
    });
    mat.userData.arq = 1;
    const m = new T.Mesh(MERGE(o.list.map(g => idx(g))), mat);
    m.castShadow = false; m.receiveShadow = true;
    m.name = 'arq_logo_' + o.k;
    m.userData.arq = 1;
    return m;
  }
  // foto del estado de los acumuladores (para montar por separado)
  function contar() {
    const geo = {}, logo = {};
    for (const k in B.geo) geo[k] = B.geo[k].length;
    for (const k in B.logo) logo[k] = B.logo[k].list.length;
    return { geo, logo, halo: B.halo.length };
  }
  // extrae lo acumulado desde la foto
  function extraer(prev) {
    const out = { geo: [], logo: [], halo: [] };
    for (const k in B.geo) {
      const desde = (prev.geo[k] || 0);
      if (B.geo[k].length <= desde) continue;
      const nuevo = B.geo[k].slice(desde);
      B.geo[k] = B.geo[k].slice(0, desde);
      out.geo.push([k, nuevo]);
    }
    for (const k in B.logo) {
      const desde = (prev.logo[k] || 0);
      if (B.logo[k].list.length <= desde) continue;
      const nuevo = B.logo[k].list.slice(desde);
      B.logo[k].list = B.logo[k].list.slice(0, desde);
      out.logo.push([k, B.logo[k]]);
    }
    if (B.halo.length > prev.halo) {
      out.halo = B.halo.slice(prev.halo);
      B.halo = B.halo.slice(0, prev.halo);
    }
    return out;
  }
  // monta un lote: como grupo (uso manual) o suelto en la escena (aplicacion global)
  function montarLote(lote, enGrupo) {
    const g = enGrupo ? new T.Group() : null;
    if (g) { g.name = 'arq_lote'; g.userData.arq = 1; }
    for (const par of lote.geo) {
      const mat = par[0], list = par[1];
      if (!list.length) continue;
      const CH = 2200;
      for (let i = 0; i < list.length; i += CH) {
        const m = crearMalla(mat, list.slice(i, i + CH));
        if (g) g.add(m); else { SCN.add(m); ENC.meshes.push(m); }
      }
    }
    for (const par of lote.logo) {
      const m = crearLogo(par[1]);
      if (g) g.add(m); else { SCN.add(m); ENC.meshes.push(m); }
    }
    if (lote.halo.length) {
      const m = new T.Mesh(MERGE(lote.halo.map(x => idx(x))), HALO_MAT);
      m.renderOrder = 3; m.name = 'arq_halo'; m.userData.arq = 1;
      if (g) g.add(m); else { SCN.add(m); ENC.meshes.push(m); }
    }
    if (g) { SCN.add(g); ENC.meshes.push(g); }
    return g;
  }
  function montar() {
    const lote = { geo: [], logo: [], halo: B.halo.slice() };
    for (const k in B.geo) if (B.geo[k].length) lote.geo.push([k, B.geo[k]]);
    for (const k in B.logo) if (B.logo[k].list.length) lote.logo.push([k, B.logo[k]]);
    B.geo = {}; B.logo = {}; B.halo = [];
    montarLote(lote, false);
    // sombras: el mapa de sombras no se actualiza solo
    try { if (window.rd) { rd.shadowMap.needsUpdate = true; } } catch (e) { }
  }

  function limpiar() {
    ENC.meshes.forEach(m => { try { SCN.remove(m); m.geometry && m.geometry.dispose && m.geometry.dispose(); } catch (e) { } });
    ENC.meshes = [];
    ENC.prev.forEach(m => { try { m.visible = true; } catch (e) { } });
    ENC.prev = [];
    B.geo = {}; B.logo = {}; B.halo = [];
    aplicado = false;
  }

  /* ===================== 14. hook de carga ===================== */
  function mundoListo() {
    try { return typeof BLD !== 'undefined' && !!BLD && BLD.length > 0; } catch (e) { return false; }
  }
  // hook de seguridad: si el modulo se cargo antes de tiempo, se aplica en el
  // primer frame del juego (y se vuelve a comprobar la decoracion previa).
  let frames = 0;
  NC.hooks.post.push(function () {
    frames++;
    if (frames === 2 && !aplicado && mundoListo()) aplicar();
    if (frames < 90 && frames % 15 === 0) {
      try { if (!aplicado && mundoListo()) aplicar(); else desactivarDecorPrevio(); } catch (e) { }
    }
  });
  // camino normal: el mundo ya esta montado (script cargado tras calzada.js) -> se aplica ya
  try {
    if (mundoListo() && window.NC && window.NC.road) aplicar();
    else if (mundoListo()) NC.log('arq: carga antes de calzada.js; se aplicara en el primer frame');
  } catch (e) { NC.log('arq: arranque', e); }

  /* ===================== 15. API ===================== */
  NC.arq = {
    version: 1,
    familias: FAM,
    marcas: MARCAS,
    logos: LOGO_FN,
    fuente: FONT,
    /**
     * Fachada completa de un edificio.
     * b   = {x, z, w, d, h, rot?, sol?, perfil?:'bloque'|'plano', cubierta?}
     * opts= {tipo:'vivienda'|'villa'|'oficina'|'tienda'|'concesionario'|'hotel'|'bar'|
     *              'clinica'|'taller'|'nave'|'abandonada',
     *        cara:'+z'|'-z'|'+x'|'-x'  (por defecto: la calle mas cercana),
     *        marca:'armeria'|...,      (anade el rotulo con la marca)
     *        rotuloOpts:{y, letra, anchoMax, n, texto}}
     * Devuelve un Group con las mallas de lo anadido.
     */
    fachada: function (b, opts) {
      const prev = contar();
      const r = fachada(b, opts || {});
      const g = montarLote(extraer(prev), true);
      return g || r;
    },
    /** Solo el cartel: letras 3D + logo + marco + halo. Devuelve un Group. */
    rotulo: function (b, opts) {
      const prev = contar();
      const r = rotulo(b, opts || {});
      const g = montarLote(extraer(prev), true);
      return g || r;
    },
    /** banderín perpendicular al frente (logo + color de marca) */
    banderin: function (b, opts) {
      const prev = contar();
      const F = frameDe(b, opts || {});
      banderin(F, opts || {});
      const g = montarLote(extraer(prev), true);
      return g || F;
    },
    /** aplica el sistema a todo el barrio (idempotente) */
    aplicar: aplicar,
    /** borra lo creado y restaura la decoracion previa */
    limpiar: limpiar,
    /** monta a mano lo que se haya acumulado (uso raro) */
    montar: montar,
    get aplicado() { return aplicado; }
  };
})();
