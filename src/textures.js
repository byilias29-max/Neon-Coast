/* Neon Coast - texturas procedurales (F:\neoncoast) */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const cv = window.cv || (n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; });
  const tex = window.tex || null;
  let _tex = tex;
  if (!_tex) {
    // reproducimos el tex del nucleo si no existe todavia (esto carga despues del <script src src> principal)
    _tex = (c, rx, ry) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry || rx); t.anisotropy = 4; return t; };
  }
  const T = window.NCT = {};
  const noisyBase = (w, h, base, vary) => {
    const c = cv(w); c.width = w; c.height = 2; // plantilla vertical 2px replicable
    const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, w, 2);
    return { c, x };
  };

  // ---------- CEMENTO: speckle + manchas + juntas ----------
  T.cement = (function () {
    const c = cv(128); c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#b9b4ac'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2600; i++) {
      const g = 150 + Math.round(Math.random() * 70);
      x.fillStyle = `rgba(${g},${g},${g - 6},${rnd(.06, .3)})`;
      x.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5);
    }
    for (let i = 0; i < 26; i++) { // manchas
      const rx = Math.random() * 128, ry = Math.random() * 128, rr = rnd(6, 22);
      const g2 = x.createRadialGradient(rx, ry, 0, rx, ry, rr);
      g2.addColorStop(0, `rgba(80,76,70,${rnd(.04, .16)})`); g2.addColorStop(1, 'rgba(80,76,70,0)');
      x.fillStyle = g2; x.beginPath(); x.arc(rx, ry, rr, 0, 7); x.fill();
    }
    // juntas cada 64 px (placas de 2x2 m)
    x.fillStyle = 'rgba(60,58,54,.55)'; x.fillRect(62, 0, 4, 128); x.fillRect(0, 62, 128, 4);
    x.fillStyle = 'rgba(255,255,255,.10)'; x.fillRect(66, 0, 2, 128); x.fillRect(0, 66, 128, 2);
    return _tex(c, 24, 24);
  })();

  // ---------- MADERA: veta + nudos ----------
  T.wood = (function () {
    const c = cv(128); c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#a37c4e'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 60; i++) {
      x.strokeStyle = `rgba(${90 + Math.random() * 60},${60 + Math.random() * 45},${30 + Math.random() * 25},${rnd(.25, .6)})`;
      x.lineWidth = rnd(.6, 2.2); x.beginPath();
      const y = Math.random() * 128; x.moveTo(0, y);
      for (let k = 8; k <= 128; k += 16) x.lineTo(k, y + rnd(-2.5, 2.5));
      x.stroke();
    }
    for (let k = 0; k < 5; k++) { // nudos
      const kx = Math.random() * 128, ky = Math.random() * 128;
      x.strokeStyle = 'rgba(70,48,28,.5)'; x.lineWidth = 1.4;
      x.beginPath(); x.arc(kx, ky, rnd(2.5, 5), 0, 7); x.stroke();
    }
    x.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 3; i++) x.fillRect(0, i * 42 + rnd(0, 4), 128, 2);
    return _tex(c, 4, 4);
  })();

  // ---------- TEJIDO ROPA: trama fina ----------
  T.weave = (function () {
    const c = cv(64); c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i++) {
      x.fillStyle = i % 2 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)';
      x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1);
    }
    for (let i = 0; i < 500; i++) {
      x.fillStyle = `rgba(${Math.random() < .5 ? 0 : 255},0,0,${Math.random() * .05})`;
      x.fillRect(Math.random() * 64, Math.random() * 64, 1, 1);
    }
    for (let i = 0; i < 220; i++) { // pelusa
      x.fillStyle = `rgba(0,0,0,${Math.random() * .07})`;
      x.fillRect(Math.random() * 64, Math.random() * 64, 2, 1);
    }
    return _tex(c, 3, 3);
  })();

  // ---------- PELO: mechones ----------
  T.strands = (function () {
    const c = cv(64); c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 1.6) {
      x.strokeStyle = `rgba(${Math.random() < .5 ? 0 : 255},${Math.random() < .4 ? 0 : 255},255,${rnd(.07, .2)})`;
      x.lineWidth = rnd(.6, 1.4); x.beginPath(); x.moveTo(i, 0);
      for (let s = 8; s <= 64; s += 8) x.lineTo(i + rnd(-1, 1), s);
      x.stroke();
    }
    return _tex(c, 2, 2);
  })();

  // ---------- METAL ARMA: cepillado + roces ----------
  T.gunmetal = (function () {
    const c = cv(64); c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#cfcfd4'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 70; i++) { //cepillado horizontal
      x.strokeStyle = `rgba(${Math.random() < .5 ? 0 : 255},${Math.random() < .5 ? 0 : 255},255,${rnd(.05, .18)})`;
      x.lineWidth = rnd(.5, 1.2); const y = Math.random() * 64;
      x.beginPath(); x.moveTo(0, y); x.lineTo(64, y + rnd(-2, 2)); x.stroke();
    }
    for (let i = 0; i < 9; i++) { // roces de uso
      x.fillStyle = `rgba(60,60,66,${rnd(.1, .3)})`;
      x.fillRect(Math.random() * 64, Math.random() * 64, rnd(2, 9), 1.5);
    }
    for (let i = 0; i < 3; i++) { // destellos duros
      x.fillStyle = 'rgba(255,255,255,.5)';
      x.fillRect(Math.random() * 60, Math.random() * 60, 2, 1);
    }
    return _tex(c, 2, 2);
  })();

  // ---------- MADERA ARMA (culata) ----------
  T.gunwood = (function () {
    const c = cv(64); c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#7c5230'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 44; i++) {
      x.strokeStyle = `rgba(${60 + Math.random() * 50},${38 + Math.random() * 30},${18 + Math.random() * 18},${rnd(.3, .7)})`;
      x.lineWidth = rnd(.7, 2); const y = Math.random() * 64; x.beginPath(); x.moveTo(0, y);
      for (let k = 8; k <= 64; k += 12) x.lineTo(k, y + rnd(-1.5, 1.5));
      x.stroke();
    }
    x.fillStyle = 'rgba(20,12,6,.35)'; x.fillRect(0, 30, 64, 5); // relieve empuñadura
    return _tex(c, 2, 2);
  })();

  // ---------- TEJAS TECHO ----------
  T.roof = (function () {
    const c = cv(64); c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#9a4038'; x.fillRect(0, 0, 64, 64);
    for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) {
      x.strokeStyle = 'rgba(40,10,8,.4)'; x.strokeRect(k * 8 + (r % 2 ? 4 : 0), r * 8, 8, 8);
    }
    for (let i = 0; i < 300; i++) {
      x.fillStyle = `rgba(${Math.random() < .5 ? 0 : 255},60,40,${Math.random() * .07})`;
      x.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
    }
    return _tex(c, 6, 6);
  })();

  // ---------- ALFOMBRA (casa) ----------
  T.rug = (function () {
    const c = cv(64); c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#8a2a4a'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? '#c95a7a' : '#5a1a3a';
      x.fillRect(0, i * 8, 64, 4);
    }
    for (let i = 0; i < 500; i++) {
      x.fillStyle = `rgba(${Math.random() < .5 ? 0 : 255},255,255,${Math.random() * .06})`;
      x.fillRect(Math.random() * 64, Math.random() * 64, 1, 1);
    }
    return _tex(c, 1, 1);
  })();

  NC.log('texturas listas:', Object.keys(T).length);
})();
