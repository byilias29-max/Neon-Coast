'use strict';
/* ============================================================
   Mobiliario procedural — núcleo, clínica y detalles comunes
   Cada objeto se pre-renderiza una vez sobre su propio lienzo.
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U, Art = LM.Art, Tex = LM.Tex;
  const P = {};
  LM.Props = P;

  const cache = new Map();
  const FLAME = [];
  const seeded = (key) => U.rng('prop-' + key);

  /* ---------- utilidades de volumen ---------- */
  function rr(ctx, x, y, w, h, r) { U.roundRect(ctx, x, y, w, h, r); }
  function shade(ctx, x, y, w, h, c1, c2, vertical = true) {
    const g = vertical ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }
  function wood(ctx, x, y, w, h, variant = 'furniture', seed = 1, alpha = .75) {
    const tex = Tex.getWoodCanvas(variant, seed);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (h < 62) { ctx.translate(0, 0); }
    Art.fillTex(ctx, tex, x, y, w, h, alpha);
    ctx.restore();
  }
  function metal(ctx, x, y, w, h, seed = 1, tint = null) {
    const tex = Tex.metalCanvas(Math.max(8, w), Math.max(8, h), { seed, rust: false });
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(tex, x, y, w, h);
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }
  function cloth(ctx, x, y, w, h, color, seed = 1, alpha = .6) {
    const tex = Tex.fabricCanvas(Math.max(8, w), Math.max(8, h), { seed, color });
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalAlpha = alpha; ctx.drawImage(tex, x, y, w, h); ctx.globalAlpha = 1;
    ctx.restore();
  }
  function edge(ctx, x, y, w, h, alpha = .35) {
    ctx.strokeStyle = `rgba(7,9,8,${alpha})`; ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  }
  function topLight(ctx, x, y, w, h, a = .08) {
    ctx.fillStyle = `rgba(238,226,198,${a})`; ctx.fillRect(x, y, w, 1.5);
  }
  function shadowBase(ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(0, y + h - 3, 0, y + h + Math.min(18, h * .3));
    g.addColorStop(0, 'rgba(0,0,0,.36)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w * .06, y + h - 2, w * 1.12, Math.min(22, h * .34));
  }
  function glow(ctx, x, y, r, color, alpha = .5) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, U.hexToRgba(color, alpha));
    g.addColorStop(.45, U.hexToRgba(color, alpha * .38));
    g.addColorStop(1, U.hexToRgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }

  /* ---------- partes reutilizables ---------- */
  function drawer(ctx, x, y, w, h, seed, label) {
    wood(ctx, x, y, w, h, 'furniture', seed, .82);
    shade(ctx, x, y, w, h, 'rgba(255,245,220,.03)', 'rgba(0,0,0,.22)');
    edge(ctx, x, y, w, h, .5);
    const kg = ctx.createLinearGradient(0, y + h * .3, 0, y + h * .8);
    kg.addColorStop(0, '#bca77a'); kg.addColorStop(1, '#5d4a31');
    ctx.fillStyle = kg;
    rr(ctx, x + w * .34, y + h * .38, w * .32, 2.4, 1.2); ctx.fill();
    if (label) {
      ctx.fillStyle = 'rgba(214,204,179,.42)';
      ctx.fillRect(x + w * .18, y + h * .58, w * .38, 2);
    }
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 1, y + h - 2, w - 2, 2);
  }
  function legs(ctx, x, y, w, h, n, seed = 1) {
    const rng = seeded('leg' + seed + x + y);
    for (let i = 0; i < n; i++) {
      const lx = x + 4 + i * ((w - 8) / Math.max(1, n - 1));
      ctx.fillStyle = 'rgba(35,26,18,.9)';
      ctx.fillRect(lx - 1.5, y + h - 16, 3.5, 16);
      ctx.fillStyle = 'rgba(115,88,54,.26)';
      ctx.fillRect(lx - 1.5, y + h - 16, 1, 16);
      if (rng() > .6) { ctx.fillStyle = 'rgba(60,45,31,.9)'; ctx.fillRect(lx - 3, y + h - 1, 7, 2); }
    }
  }
  function lampShade(ctx, x, y, w, h, warm = true) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, warm ? '#c8a36c' : '#677972');
    g.addColorStop(.55, warm ? '#8e6840' : '#384844');
    g.addColorStop(1, warm ? '#4a3320' : '#1d2825');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + w * .22, y); ctx.lineTo(x + w * .78, y);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,16,11,.65)'; ctx.lineWidth = 1; ctx.stroke();
    if (warm) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      glow(ctx, x + w / 2, y + h + 2, h * 1.2, '#e6a35d', .26);
      ctx.restore();
    }
  }
  function chairBase(ctx, x, y, w, h, color = '#4a3829', seed = 7, office = false) {
    const rng = seeded('chair' + seed + x);
    ctx.save();
    // patas
    if (office) {
      ctx.strokeStyle = 'rgba(28,27,24,.9)'; ctx.lineWidth = 2.2;
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + .4;
        ctx.beginPath(); ctx.moveTo(x + w / 2, y + h - 11);
        ctx.lineTo(x + w / 2 + Math.cos(a) * w * .32, y + h - 3 + Math.sin(a) * 5); ctx.stroke();
      }
      ctx.fillStyle = '#22231f'; ctx.beginPath(); ctx.arc(x + w / 2, y + h - 3, 2.5, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(31,24,17,.92)';
      ctx.fillRect(x + 5, y + h - 17, 3.5, 17); ctx.fillRect(x + w - 8, y + h - 17, 3.5, 17);
      ctx.fillRect(x + 3, y + h - 19, w - 6, 3);
    }
    // asiento
    const g = ctx.createLinearGradient(0, y + h - 38, 0, y + h - 16);
    g.addColorStop(0, color); g.addColorStop(1, '#231b15');
    ctx.fillStyle = g; rr(ctx, x + 4, y + h - 38, w - 8, 22, 4); ctx.fill();
    cloth(ctx, x + 5, y + h - 37, w - 10, 19, color, seed, .32);
    ctx.strokeStyle = 'rgba(190,166,126,.12)'; ctx.lineWidth = .8;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 8 + i * (w - 16) / 3, y + h - 36); ctx.lineTo(x + 8 + i * (w - 16) / 3 + (rng() - .5) * 3, y + h - 19); ctx.stroke(); }
    // respaldo
    ctx.fillStyle = '#2a2119';
    rr(ctx, x + 8, y + 4, w - 16, h * .53, 5); ctx.fill();
    const bg = ctx.createLinearGradient(0, y + 4, 0, y + h * .6);
    bg.addColorStop(0, color); bg.addColorStop(.7, '#291f17'); bg.addColorStop(1, '#1a1410');
    ctx.fillStyle = bg; rr(ctx, x + 11, y + 7, w - 22, h * .47, 4); ctx.fill();
    cloth(ctx, x + 12, y + 8, w - 24, h * .43, color, seed + 2, .35);
    ctx.fillStyle = 'rgba(240,227,198,.07)'; ctx.fillRect(x + 12, y + 8, w - 24, 1.5);
    edge(ctx, x + 9, y + 5, w - 18, h * .55, .3);
    ctx.restore();
    shadowBase(ctx, x, y, w, h);
  }

  /* ============================================================
     DIBUJANTES DE OBJETOS
     ============================================================ */
  const D = {};
  P.Drawers = D;
  P.tools = { rr, shade, wood, metal, cloth, edge, topLight, shadowBase, glow, drawer, legs, lampShade, chairBase };
  P.register = function (map) { Object.assign(D, map); cache.clear(); };
  P.clearCache = function () { cache.clear(); };

  D.bed = function (ctx, w, h, opts) {
    // cama hospitalaria: sombra, patas, chasis, colchón, almohada, sábana
    shadowBase(ctx, 4, 4, w - 8, h + 10);
    const rng = seeded('bed' + (opts.seed || 1));
    // chasis
    ctx.fillStyle = '#1e2220';
    rr(ctx, 10, h * .38, w - 20, h * .38, 5); ctx.fill();
    metal(ctx, 12, h * .41, w - 24, h * .25, 8, 'rgba(51,58,53,.5)');
    // ruedas
    ctx.fillStyle = '#161817';
    for (const [x, y] of [[24, h - 12], [w - 24, h - 12], [38, h - 10], [w - 38, h - 10]]) {
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(163,160,139,.16)'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.stroke();
    }
    // barandillas laterales
    ctx.strokeStyle = 'rgba(147,153,137,.5)'; ctx.lineWidth = 1.4;
    for (const side of [0, 1]) {
      const x = side ? w - 20 : 8;
      ctx.beginPath(); ctx.moveTo(x, h * .22); ctx.lineTo(x, h * .62); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(x, h * .3 + i * h * .09);
        ctx.lineTo(x + (side ? -14 : 14), h * .3 + i * h * .09); ctx.stroke();
      }
    }
    // colchón
    const mg = ctx.createLinearGradient(0, h * .14, 0, h * .64);
    mg.addColorStop(0, '#b8b09c'); mg.addColorStop(.25, '#8f8877'); mg.addColorStop(.75, '#635d51'); mg.addColorStop(1, '#3b3831');
    ctx.fillStyle = mg;
    rr(ctx, 16, h * .2, w - 32, h * .44, 9); ctx.fill();
    // sábana
    ctx.fillStyle = 'rgba(202,196,177,.45)';
    ctx.beginPath();
    ctx.moveTo(24, h * .29); ctx.lineTo(w - 20, h * .32);
    ctx.lineTo(w - 18, h * .58); ctx.quadraticCurveTo(w * .56, h * .66, 20, h * .56); ctx.closePath(); ctx.fill();
    // pliegues
    ctx.strokeStyle = 'rgba(40,38,32,.22)'; ctx.lineWidth = .8;
    for (let i = 0; i < 8; i++) {
      const x = 30 + rng() * (w - 60);
      ctx.beginPath(); ctx.moveTo(x, h * .33); ctx.bezierCurveTo(x + 4, h * .41, x - 4, h * .48, x + 2, h * .58); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(237,228,204,.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(24, h * .31); ctx.lineTo(w - 22, h * .34); ctx.stroke();
    // almohada
    ctx.fillStyle = 'rgba(204,198,180,.7)';
    U.ellipse(ctx, w * .27, h * .245, w * .17, h * .095, -.04); ctx.fill();
    ctx.fillStyle = 'rgba(244,236,216,.2)';
    U.ellipse(ctx, w * .25, h * .225, w * .12, h * .045, -.04); ctx.fill();
    // cama articulada
    ctx.fillStyle = 'rgba(35,39,36,.8)';
    rr(ctx, 12, h * .78, w - 24, 9, 3); ctx.fill();
    ctx.fillStyle = 'rgba(206,202,182,.1)'; ctx.fillRect(14, h * .785, w - 28, 1);
    // barrotes cabecera
    ctx.strokeStyle = 'rgba(137,144,130,.45)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const x = w * .08 + i * w * .026;
      ctx.beginPath(); ctx.moveTo(x, h * .06); ctx.lineTo(x, h * .19); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(w * .06, h * .09); ctx.lineTo(w * .06, h * .22); ctx.stroke();
    ctx.strokeStyle = 'rgba(19,22,20,.78)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * .06, h * .06); ctx.lineTo(w * .28, h * .06); ctx.stroke();
    // placa
    ctx.fillStyle = 'rgba(199,188,158,.2)'; ctx.fillRect(w - 38, h * .76, 24, 8);
    ctx.fillStyle = 'rgba(22,26,23,.8)'; ctx.font = '5px monospace'; ctx.fillText('03', w - 32, h * .82);
  };

  D.nightstand = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w, h + 4);
    ctx.fillStyle = '#2c261e'; rr(ctx, 2, 6, w - 4, h - 8, 2); ctx.fill();
    wood(ctx, 4, 8, w - 8, h - 12, 'furniture', 4, .9);
    drawer(ctx, 5, 11, w - 10, h * .3, 3, true);
    drawer(ctx, 5, 12 + h * .3, w - 10, h * .24, 5, false);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(6, h - 7, w - 12, 3);
    legs(ctx, 5, 5, w - 10, h, 2, 4);
    topLight(ctx, 4, 7, w - 8, h, .08);
    // vaso y libreta
    ctx.fillStyle = 'rgba(165,180,167,.26)'; rr(ctx, w * .18, 2, 8, 12, 2); ctx.fill();
    ctx.fillStyle = 'rgba(217,210,190,.45)'; ctx.fillRect(w * .54, 1, 14, 7);
    ctx.fillStyle = 'rgba(80,64,43,.45)'; ctx.fillRect(w * .56, 2, 10, 1);
  };

  D.cabinet = function (ctx, w, h, opts) {
    shadowBase(ctx, 2, 2, w, h + 4);
    const seed = opts.seed || 5;
    ctx.fillStyle = '#2b302c'; rr(ctx, 2, 4, w - 4, h - 6, 2); ctx.fill();
    metal(ctx, 4, 6, w - 8, h - 10, seed, 'rgba(61,69,63,.35)');
    // puertas de cristal
    ctx.fillStyle = 'rgba(24,35,33,.82)';
    ctx.fillRect(8, 11, w * .4 - 6, h - 21);
    ctx.fillRect(w * .52, 11, w * .4 - 6, h - 21);
    ctx.strokeStyle = 'rgba(157,165,146,.28)'; ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 11.5, w * .4 - 7, h - 22);
    ctx.strokeRect(w * .52 + .5, 11.5, w * .4 - 7, h - 22);
    // reflejos
    ctx.fillStyle = 'rgba(178,193,180,.08)';
    ctx.beginPath(); ctx.moveTo(12, 16); ctx.lineTo(w * .28, 16); ctx.lineTo(12, h - 18); ctx.closePath(); ctx.fill();
    // estantes / frascos
    ctx.strokeStyle = 'rgba(171,165,139,.16)';
    ctx.beginPath(); ctx.moveTo(10, h * .46); ctx.lineTo(w * .4, h * .46); ctx.moveTo(w * .54, h * .46); ctx.lineTo(w - 10, h * .46); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const x = 12 + (i % 3) * (w * .1) + (i > 2 ? w * .5 : 0);
      const y = i > 2 ? h * .58 : h * .2;
      ctx.fillStyle = i % 2 ? 'rgba(155,140,95,.35)' : 'rgba(92,119,105,.35)';
      rr(ctx, x, y, 5, 12, 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(214,208,180,.25)'; ctx.fillRect(x + 1, y + 1, 1, 9);
    }
    ctx.fillStyle = 'rgba(173,158,123,.4)'; ctx.fillRect(w * .44, h * .5, 3, 13);
    ctx.fillStyle = 'rgba(20,24,22,.82)'; ctx.fillRect(4, h - 6, w - 8, 4);
    topLight(ctx, 4, 5, w - 8, h, .1);
    ctx.fillStyle = 'rgba(206,195,164,.24)'; ctx.fillRect(10, 5, w * .3, 2);
  };

  D.chair = function (ctx, w, h, opts) {
    chairBase(ctx, 1, 1, w - 2, h - 2, opts.color || '#4a3829', opts.seed || 1, opts.office);
  };

  D.desk = function (ctx, w, h, opts) {
    shadowBase(ctx, 4, 4, w - 8, h + 6);
    const seed = opts.seed || 6;
    // faldón
    ctx.fillStyle = '#1d1915'; rr(ctx, 8, h * .3, w - 16, h * .48, 2); ctx.fill();
    wood(ctx, 10, h * .34, w - 20, h * .4, 'furniture', seed, .82);
    // cajonera derecha
    if (w > 80) {
      drawer(ctx, w - 45, h * .35, 33, h * .17, seed + 3, false);
      drawer(ctx, w - 45, h * .53, 33, h * .17, seed + 4, false);
    }
    // tablero
    ctx.fillStyle = '#2b231b'; rr(ctx, 2, h * .2, w - 4, h * .17, 2); ctx.fill();
    wood(ctx, 4, h * .19, w - 8, h * .16, 'dark', seed + 2, .9);
    topLight(ctx, 5, h * .19, w - 10, h, .12);
    edge(ctx, 4, h * .19, w - 8, h * .16, .4);
    // objetos
    const rng = seeded('desk' + seed + w);
    if (opts.clutter !== false) {
      ctx.fillStyle = 'rgba(195,191,169,.5)'; ctx.save(); ctx.translate(w * .2, h * .18); ctx.rotate(-.06); ctx.fillRect(-16, -5, 32, 8); ctx.restore();
      ctx.fillStyle = 'rgba(49,41,31,.8)'; ctx.fillRect(w * .58, h * .11, 12, 8);
      ctx.fillStyle = 'rgba(189,172,132,.45)'; ctx.fillRect(w * .59, h * .1, 10, 1.5);
      if (rng() > .5) { Art.cup(ctx, w * .78, h * .115, 7, 8, '#a69b84'); }
      ctx.strokeStyle = 'rgba(16,17,15,.6)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(w * .35, h * .19); ctx.bezierCurveTo(w * .5, h * .1, w * .62, h * .24, w * .72, h * .13); ctx.stroke();
    }
    legs(ctx, 8, 4, w - 16, h, 2, seed);
  };

  D.table = function (ctx, w, h, opts) {
    shadowBase(ctx, 6, 6, w - 12, h + 6);
    const seed = opts.seed || 8;
    ctx.fillStyle = '#201b16';
    rr(ctx, 8, h * .3, w - 16, h * .34, 2); ctx.fill();
    wood(ctx, 10, h * .33, w - 20, h * .26, 'dark', seed, .78);
    ctx.fillStyle = '#2d241b'; rr(ctx, 1, h * .16, w - 2, h * .2, 3); ctx.fill();
    wood(ctx, 4, h * .15, w - 8, h * .18, 'furniture', seed + 2, .92);
    topLight(ctx, 4, h * .15, w - 8, h, .12);
    edge(ctx, 4, h * .15, w - 8, h * .18, .4);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = 'rgba(208,194,162,.14)'; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.moveTo(w * .1, h * (.22 + i * .032)); ctx.lineTo(w * .9, h * (.22 + i * .032)); ctx.stroke();
    }
    legs(ctx, 10, 4, w - 20, h, 4, seed);
    if (opts.cloth) {
      ctx.fillStyle = 'rgba(181,166,133,.22)';
      ctx.beginPath(); ctx.moveTo(w * .18, h * .17); ctx.lineTo(w * .7, h * .17); ctx.lineTo(w * .61, h * .31); ctx.lineTo(w * .23, h * .3); ctx.closePath(); ctx.fill();
    }
  };

  D.ivstand = function (ctx, w, h) {
    shadowBase(ctx, w * .2, 4, w * .6, h, 6);
    ctx.strokeStyle = '#777d72'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w / 2, h * .14); ctx.lineTo(w / 2, h - 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(216,218,198,.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w / 2 - 1, h * .18); ctx.lineTo(w / 2 - 1, h - 15); ctx.stroke();
    // base con ruedas
    ctx.strokeStyle = '#5c6158'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(w / 2, h - 15); ctx.lineTo(w / 2 + Math.cos(a) * 12, h - 8 + Math.sin(a) * 4); ctx.stroke();
    }
    ctx.fillStyle = '#242624';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(w / 2 + Math.cos(i * 2.4) * 12, h - 6 + Math.sin(i * 2.4) * 3, 2.2, 0, 7); ctx.fill(); }
    // bolsa
    ctx.fillStyle = 'rgba(157,184,162,.28)';
    U.roundRect(ctx, w * .34, 3, w * .42, h * .23, 4); ctx.fill();
    ctx.fillStyle = 'rgba(202,221,199,.2)'; ctx.fillRect(w * .37, 6, 2, h * .18);
    ctx.fillStyle = 'rgba(116,145,126,.5)'; ctx.fillRect(w * .36, h * .24, w * .38, 2);
    ctx.strokeStyle = 'rgba(171,184,164,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * .42, h * .22); ctx.bezierCurveTo(w * .48, h * .3, w * .44, h * .4, w * .5, h * .45); ctx.stroke();
    // gancho
    ctx.strokeStyle = '#9ca18f'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(w / 2, h * .15); ctx.lineTo(w * .62, h * .15); ctx.stroke();
  };

  D.gurney = function (ctx, w, h) {
    shadowBase(ctx, 4, 4, w - 8, h + 5);
    ctx.fillStyle = '#22251f'; rr(ctx, 8, h * .4, w - 16, h * .4, 3); ctx.fill();
    metal(ctx, 10, h * .42, w - 20, h * .24, 17, 'rgba(58,61,55,.4)');
    for (const x of [20, w - 20]) {
      ctx.strokeStyle = 'rgba(143,147,132,.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, h * .16); ctx.lineTo(x, h * .4); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(117,120,105,.55)';
    rr(ctx, 12, h * .18, w - 24, h * .15, 2); ctx.fill();
    ctx.fillStyle = 'rgba(183,180,160,.2)';
    U.ellipse(ctx, w * .3, h * .25, w * .12, h * .045); ctx.fill();
    ctx.fillStyle = 'rgba(31,34,30,.9)';
    ctx.fillRect(w - 28, h * .17, 10, 3);
    for (const [x, y] of [[22, h - 8], [w - 22, h - 8]]) {
      ctx.fillStyle = '#171917'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(180,178,155,.2)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.stroke();
    }
  };

  D.wheelchair = function (ctx, w, h) {
    shadowBase(ctx, 5, 5, w - 10, h, 4);
    ctx.strokeStyle = 'rgba(105,112,103,.75)'; ctx.lineWidth = 2;
    // rueda grande
    ctx.beginPath(); ctx.arc(w * .62, h * .64, w * .28, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(154,160,144,.22)'; ctx.lineWidth = .8;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * 7;
      ctx.beginPath(); ctx.moveTo(w * .62, h * .64); ctx.lineTo(w * .62 + Math.cos(a) * w * .26, h * .64 + Math.sin(a) * w * .26); ctx.stroke();
    }
    // rueda pequeña
    ctx.strokeStyle = 'rgba(109,116,105,.7)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(w * .24, h * .79, w * .12, 0, 7); ctx.stroke();
    // asiento
    ctx.fillStyle = '#2d2b26'; rr(ctx, w * .26, h * .38, w * .42, h * .16, 2); ctx.fill();
    cloth(ctx, w * .27, h * .39, w * .4, h * .13, '#373f38', 4, .3);
    // respaldo
    ctx.strokeStyle = '#66695e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * .3, h * .38); ctx.lineTo(w * .3, h * .1); ctx.lineTo(w * .58, h * .12); ctx.stroke();
    ctx.fillStyle = '#33362f'; ctx.fillRect(w * .32, h * .18, w * .25, h * .13);
    // reposabrazos / reposapiés
    ctx.strokeStyle = '#6e7064'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(w * .3, h * .3); ctx.lineTo(w * .7, h * .32); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * .26, h * .52); ctx.lineTo(w * .06, h * .66); ctx.stroke();
  };

  D.reception = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w, h + 8);
    // cuerpo
    ctx.fillStyle = '#1d1b17'; rr(ctx, 2, h * .25, w - 4, h * .68, 3); ctx.fill();
    wood(ctx, 5, h * .3, w - 10, h * .58, 'dark', 13, .85);
    // paneles
    for (let i = 0; i < 3; i++) {
      const px = 14 + i * ((w - 28) / 3);
      ctx.strokeStyle = 'rgba(167,151,117,.13)'; ctx.lineWidth = 1;
      ctx.strokeRect(px + .5, h * .4, (w - 36) / 3, h * .3);
    }
    // encimera
    ctx.fillStyle = '#302b22'; rr(ctx, 1, h * .17, w - 2, h * .12, 2); ctx.fill();
    wood(ctx, 4, h * .16, w - 8, h * .1, 'furniture', 12, .92);
    topLight(ctx, 5, h * .16, w - 10, h, .12);
    // mostrador de cristal
    ctx.fillStyle = 'rgba(122,144,132,.12)';
    ctx.fillRect(14, h * .03, w * .3, h * .15);
    ctx.strokeStyle = 'rgba(188,193,172,.22)'; ctx.lineWidth = 1;
    ctx.strokeRect(14.5, h * .03, w * .3, h * .15);
    // teléfono
    ctx.fillStyle = '#1c1e1b'; rr(ctx, w * .52, h * .04, 20, 13, 2); ctx.fill();
    ctx.fillStyle = '#3b3d35'; rr(ctx, w * .53, h * .045, 18, 5, 1); ctx.fill();
    // papeles
    ctx.save(); ctx.translate(w * .75, h * .1); ctx.rotate(-.08);
    ctx.fillStyle = 'rgba(214,207,184,.55)'; ctx.fillRect(-14, -5, 28, 9);
    ctx.fillStyle = 'rgba(65,53,39,.35)'; ctx.fillRect(-10, -2, 20, 1); ctx.fillRect(-10, 1, 14, 1);
    ctx.restore();
    // lámpara
    ctx.strokeStyle = '#4c4638'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(w * .9, h * .15); ctx.lineTo(w * .9, h - 4); ctx.stroke();
    lampShade(ctx, w * .9 - 11, h * .02, 22, 13, true);
  };

  D.radio = function (ctx, w, h, opts) {
    shadowBase(ctx, 2, 2, w, h + 3);
    // caja de madera
    ctx.fillStyle = '#241b14'; rr(ctx, 1, 4, w - 2, h - 6, 3); ctx.fill();
    wood(ctx, 3, 6, w - 6, h - 10, 'dark', opts.seed || 19, .92);
    // dial y altavoz
    ctx.fillStyle = '#171a17'; rr(ctx, 8, 10, w * .5, h * .55, 2); ctx.fill();
    // rejilla
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = i % 2 ? 'rgba(168,147,106,.18)' : 'rgba(8,10,9,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(10, 12 + i * (h * .5 / 9)); ctx.lineTo(8 + w * .48, 12 + i * (h * .5 / 9)); ctx.stroke();
    }
    // dial
    const dx = w * .72, dy = h * .33;
    const dg = ctx.createRadialGradient(dx - 3, dy - 3, 1, dx, dy, h * .17);
    dg.addColorStop(0, '#d9c18d'); dg.addColorStop(.6, '#8c7444'); dg.addColorStop(1, '#3d3220');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(dx, dy, h * .16, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(22,18,12,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(dx, dy, h * .1, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(42,32,18,.8)';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * 6.28;
      ctx.beginPath(); ctx.moveTo(dx + Math.cos(a) * h * .12, dy + Math.sin(a) * h * .12);
      ctx.lineTo(dx + Math.cos(a) * h * .155, dy + Math.sin(a) * h * .155); ctx.stroke();
    }
    ctx.fillStyle = '#d6bb7a'; ctx.beginPath(); ctx.arc(dx + 4, dy - 3, 1.7, 0, 7); ctx.fill();
    // botones
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#352a1d'; ctx.beginPath(); ctx.arc(w * .62 + i * 11, h * .72, 3, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(194,167,114,.3)'; ctx.beginPath(); ctx.arc(w * .62 + i * 11, h * .71, 1.4, 0, 7); ctx.fill();
    }
    // asa
    ctx.strokeStyle = '#635033'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(w / 2, 3, w * .26, 3.3, 6.1); ctx.stroke();
    // luz de encendido
    if (opts.on) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; glow(ctx, w * .52, h * .22, 18, '#d38a4b', .35); ctx.restore();
      ctx.fillStyle = 'rgba(255,176,96,.8)'; ctx.beginPath(); ctx.arc(w * .52, h * .22, 1.8, 0, 7); ctx.fill();
    }
  };

  D.lamp = function (ctx, w, h, opts) {
    shadowBase(ctx, w * .35, 4, w * .3, h, 4);
    ctx.strokeStyle = '#4b463b'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(w / 2, h * .19); ctx.lineTo(w / 2, h - 8); ctx.stroke();
    ctx.fillStyle = '#26251f'; U.ellipse(ctx, w / 2, h - 5, w * .24, 4); ctx.fill();
    lampShade(ctx, 2, h * .03, w - 4, h * .18, opts.on !== false);
    if (opts.on !== false) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      glow(ctx, w / 2, h * .27, w * .8, '#d59551', .28);
      ctx.restore();
      FLAME.push({ kind: 'lamp' });
    }
  };

  D.plant = function (ctx, w, h, opts) {
    const rng = seeded('plant' + (opts.seed || 2));
    shadowBase(ctx, w * .2, 2, w * .6, h, 5);
    ctx.fillStyle = '#2c2e27'; U.roundRect(ctx, w * .26, h * .61, w * .48, h * .35, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(174,163,125,.18)'; ctx.strokeRect(w * .28, h * .63, w * .44, h * .3);
    for (let i = 0; i < 15; i++) {
      const a = -Math.PI / 2 + (rng() - .5) * 2.3;
      const len = h * (.24 + rng() * .38);
      const bx = w * .5, by = h * .64;
      ctx.strokeStyle = `rgba(${58 + rng() * 30 | 0},${68 + rng() * 28 | 0},${47 + rng() * 20 | 0},${.45 + rng() * .4})`;
      ctx.lineWidth = 1 + rng() * 1.6;
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + Math.cos(a) * len * .5 + 5, by + Math.sin(a) * len * .65, bx + Math.cos(a) * len, by + Math.sin(a) * len);
      ctx.stroke();
      if (rng() > .35) {
        ctx.fillStyle = `rgba(${40 + rng() * 30 | 0},${55 + rng() * 30 | 0},${36 + rng() * 20 | 0},.55)`;
        U.ellipse(ctx, bx + Math.cos(a) * len * .9, by + Math.sin(a) * len * .9, 2 + rng() * 3, 1 + rng() * 2, a); ctx.fill();
      }
    }
    // hojas secas
    ctx.fillStyle = 'rgba(94,72,44,.5)';
    U.ellipse(ctx, w * .3, h * .94, 5, 1.5, .3); ctx.fill();
    U.ellipse(ctx, w * .72, h * .93, 4, 1.2, -.2); ctx.fill();
  };

  D.telephone = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h, 3);
    ctx.fillStyle = '#22241f'; rr(ctx, 3, 5, w - 6, h - 8, 4); ctx.fill();
    ctx.fillStyle = '#343630'; rr(ctx, 5, 7, w - 10, h - 12, 3); ctx.fill();
    ctx.fillStyle = '#1b1d19'; rr(ctx, 7, 9, w - 14, 9, 2); ctx.fill();
    ctx.fillStyle = '#4a4d43';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      ctx.beginPath(); ctx.arc(10 + j * 6, h * .57 + i * 4, 1.2, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#1d211d'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(w - 7, h - 6); ctx.bezierCurveTo(w + 4, h - 1, w - 2, h + 2, w - 4, h + 5); ctx.stroke();
  };

  D.files = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w, h + 3);
    ctx.fillStyle = '#2a302c'; rr(ctx, 2, 4, w - 4, h - 6, 1); ctx.fill();
    metal(ctx, 4, 6, w - 8, h - 10, 22, 'rgba(59,67,60,.3)');
    for (let i = 0; i < 4; i++) {
      const y = 9 + i * ((h - 18) / 4);
      ctx.strokeStyle = 'rgba(14,18,16,.6)'; ctx.lineWidth = 1;
      ctx.strokeRect(6.5, y + .5, w - 13, (h - 22) / 4);
      ctx.fillStyle = 'rgba(178,185,164,.28)';
      rr(ctx, w * .35, y + (h - 22) / 9, w * .3, 2, 1); ctx.fill();
      // etiqueta
      ctx.fillStyle = 'rgba(208,199,170,.22)'; ctx.fillRect(w * .2, y + (h - 22) / 4 - 5, w * .22, 3);
    }
    ctx.fillStyle = 'rgba(173,181,159,.16)'; ctx.fillRect(4, 6, 1, h - 10);
  };

  D.cooler = function (ctx, w, h) {
    shadowBase(ctx, w * .15, 2, w * .7, h, 4);
    ctx.fillStyle = '#303a35'; rr(ctx, w * .2, h * .22, w * .6, h * .74, 4); ctx.fill();
    metal(ctx, w * .22, h * .24, w * .56, h * .5, 31, 'rgba(82,95,86,.28)');
    ctx.fillStyle = 'rgba(145,176,170,.3)'; U.roundRect(ctx, w * .25, 2, w * .5, h * .23, 5); ctx.fill();
    ctx.fillStyle = 'rgba(207,230,219,.15)'; ctx.fillRect(w * .3, 5, 2, h * .16);
    ctx.fillStyle = 'rgba(18,22,19,.8)'; ctx.fillRect(w * .3, h * .58, w * .4, h * .03);
    ctx.fillStyle = '#8a9285'; ctx.fillRect(w * .4, h * .7, 2, 5); ctx.fillRect(w * .55, h * .7, 2, 5);
  };

  D.tv = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w, h + 3);
    ctx.fillStyle = '#1d1d1a'; rr(ctx, 2, 3, w - 4, h - 6, 4); ctx.fill();
    ctx.fillStyle = '#2d2c26'; rr(ctx, 5, 6, w * .68, h - 14, 4); ctx.fill();
    const g = ctx.createLinearGradient(0, 8, 0, h - 10);
    g.addColorStop(0, '#202b2b'); g.addColorStop(.6, '#111819'); g.addColorStop(1, '#080c0c');
    ctx.fillStyle = g; rr(ctx, 8, 9, w * .61, h - 21, 3); ctx.fill();
    ctx.fillStyle = 'rgba(176,192,182,.08)';
    ctx.beginPath(); ctx.moveTo(11, 12); ctx.lineTo(w * .35, 12); ctx.lineTo(11, h - 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a3830'; ctx.beginPath(); ctx.arc(w * .85, h * .37, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#22221e'; ctx.beginPath(); ctx.arc(w * .85, h * .37, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#35342d'; ctx.fillRect(w * .8, h * .6, w * .13, 3);
    ctx.fillRect(w * .8, h * .71, w * .13, 3);
    // patas
    ctx.fillStyle = '#191b18'; ctx.fillRect(8, h - 3, 4, 4); ctx.fillRect(w - 12, h - 3, 4, 4);
  };

  /* ============================================================
     API
     ============================================================ */
  function dims(p) { return { w: Math.max(8, Math.round(p.w || 60)), h: Math.max(8, Math.round(p.h || 60)) }; }

  function key(p) {
    return [p.type, Math.round(p.w), Math.round(p.h), p.variant || '', p.seed || 0, p.on ? 1 : 0, p.color || ''].join('|');
  }

  P.sprite = function (p) {
    const k = key(p);
    if (cache.has(k)) return cache.get(k);
    const { w, h } = dims(p);
    const c = U.createCanvas(w + 28, h + 28);
    const ctx = c.getContext('2d');
    ctx.translate(14, 8);
    const draw = D[p.type];
    if (draw) {
      try { draw(ctx, w, h, p); } catch (e) { /* un objeto defectuoso no debe detener la escena */ }
    } else {
      ctx.fillStyle = '#3b3428'; rr(ctx, 2, 2, w - 4, h - 4, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(198,184,152,.16)'; ctx.strokeRect(2.5, 2.5, w - 5, h - 5);
      ctx.fillStyle = 'rgba(214,203,175,.3)'; ctx.font = '7px monospace';
      ctx.fillText(p.type || 'objeto', 6, h / 2);
    }
    c._ox = 14; c._oy = 8;
    cache.set(k, c);
    return c;
  };

  P.draw = function (ctx, p, t) {
    if (!p) return;
    const s = P.sprite(p);
    const { w, h } = dims(p);
    const x = Math.round(p.x), y = Math.round(p.y);
    // sombra de contacto
    if (p.shadow !== false) {
      ctx.save();
      ctx.globalAlpha = (p.shadowAlpha || .34);
      const g = ctx.createLinearGradient(0, y + h - 8, 0, y + h + 12);
      g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 2, w * .54, Math.min(17, h * .22 + 5), 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    if (p.flip) {
      ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(s, -14, -8); ctx.restore();
    } else {
      ctx.drawImage(s, x - 14, y - 8);
    }
    // pequeñas animaciones
    if (p.type === 'tv' && p.on) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const a = .06 + Math.sin(t * 12 + x) * .025;
      ctx.fillStyle = `rgba(131,176,166,${a})`;
      ctx.fillRect(x + 10, y + 10, w * .58, h - 21);
      ctx.restore();
    }
    if (p.type === 'radio' && p.on) {
      const a = .1 + Math.sin(t * 8) * .04;
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(208,132,73,${a})`;
      ctx.beginPath(); ctx.arc(x + w * .52, y + h * .22, 4, 0, 7); ctx.fill(); ctx.restore();
    }
  };

  P.drawFloor = function (ctx, fp) {
    if (!fp) return;
    const rng = seeded('floor' + fp.type + fp.x + fp.y + (fp.seed || 1));
    const x = fp.x, y = fp.y, w = fp.w || 40, h = fp.h || 20;
    switch (fp.type) {
      case 'rug': {
        const color = fp.color || '#4d3a2e';
        ctx.save(); ctx.translate(x, y); ctx.rotate(fp.rot || 0);
        // borde deshilachado
        ctx.fillStyle = 'rgba(24,20,17,.28)';
        U.roundRect(ctx, -w / 2 - 3, -h / 2 + 2, w + 6, h + 5, 3); ctx.fill();
        ctx.fillStyle = color;
        U.roundRect(ctx, -w / 2, -h / 2, w, h, 2); ctx.fill();
        cloth(ctx, -w / 2, -h / 2, w, h, color, fp.seed || 2, .7);
        ctx.strokeStyle = 'rgba(194,168,129,.18)'; ctx.lineWidth = 1.4;
        ctx.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
        ctx.strokeStyle = 'rgba(30,23,18,.4)'; ctx.lineWidth = .8;
        ctx.strokeRect(-w / 2 + 9.5, -h / 2 + 9.5, w - 19, h - 19);
        // patrón central
        ctx.strokeStyle = 'rgba(186,152,110,.14)'; ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath(); ctx.moveTo(i * w / 8, -h / 2 + 14); ctx.lineTo(i * w / 8 + h / 6, h / 2 - 14); ctx.stroke();
        }
        // desgaste
        for (let i = 0; i < 12; i++) {
          ctx.fillStyle = `rgba(13,12,10,${.03 + rng() * .07})`;
          U.ellipse(ctx, (rng() - .5) * w, (rng() - .5) * h, 4 + rng() * 14, 2 + rng() * 6); ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'cable':
        ctx.strokeStyle = fp.color || 'rgba(17,19,17,.55)';
        ctx.lineWidth = fp.width || 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let i = 1; i < (fp.pts || 6); i++) {
          const t = i / ((fp.pts || 6) - 1);
          ctx.lineTo(x + (fp.x2 - x) * t + Math.sin(t * 9 + (fp.seed || 1)) * (fp.wobble || 14), y + (fp.y2 - y) * t + Math.cos(t * 6) * 6);
        }
        ctx.stroke(); break;
      case 'papers':
        for (let i = 0; i < (fp.n || 4); i++) {
          Art.paperSheet(ctx, x + (rng() - .5) * w, y + (rng() - .5) * h, 10 + rng() * 16, 14 + rng() * 20, (rng() - .5) * .6, { color: 'rgba(202,194,172,.55)' });
        }
        break;
      case 'photo':
        for (let i = 0; i < (fp.n || 3); i++) {
          ctx.save(); ctx.translate(x + (rng() - .5) * w, y + (rng() - .5) * h); ctx.rotate((rng() - .5) * 1.2);
          ctx.fillStyle = 'rgba(211,203,183,.55)'; ctx.fillRect(-11, -8, 22, 16);
          ctx.fillStyle = 'rgba(27,34,31,.8)'; ctx.fillRect(-8, -5, 16, 10);
          ctx.restore();
        }
        break;
      case 'books':
        for (let i = 0; i < (fp.n || 5); i++) {
          ctx.save(); ctx.translate(x + (rng() - .5) * w, y + (rng() - .5) * h); ctx.rotate((rng() - .5) * 1.4);
          Art.book(ctx, 0, 0, 11 + rng() * 6, 7 + rng() * 3, ['#4a3826', '#354238', '#3d2d29', '#5a4d37'][(rng() * 4) | 0], 0);
          ctx.restore();
        }
        break;
      case 'clothes':
        for (let i = 0; i < (fp.n || 4); i++) {
          ctx.save(); ctx.translate(x + (rng() - .5) * w, y + (rng() - .5) * h); ctx.rotate((rng() - .5) * 2);
          ctx.fillStyle = `rgba(${70 + rng() * 40 | 0},${65 + rng() * 30 | 0},${55 + rng() * 20 | 0},${.35 + rng() * .25})`;
          U.ellipse(ctx, 0, 0, 8 + rng() * 14, 5 + rng() * 9); ctx.fill();
          ctx.restore();
        }
        break;
      case 'plaster':
        for (let i = 0; i < (fp.n || 18); i++) {
          const px = x + (rng() - .5) * w, py = y + (rng() - .5) * h;
          ctx.fillStyle = `rgba(${145 + rng() * 50 | 0},${137 + rng() * 45 | 0},${115 + rng() * 35 | 0},${.12 + rng() * .3})`;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 2 + rng() * 6, py + rng() * 4); ctx.lineTo(px + rng() * 3, py + 2 + rng() * 5); ctx.closePath(); ctx.fill();
        }
        break;
      case 'glass':
        for (let i = 0; i < (fp.n || 10); i++) Art.glassShard(ctx, x + (rng() - .5) * w, y + (rng() - .5) * h, 1 + rng() * 3, rng() * 6);
        break;
      case 'stain':
        Tex.softStain(ctx, x, y, w, h, fp.color || '#241710', fp.alpha || .16, fp.rot || 0);
        break;
      case 'mud':
        for (let i = 0; i < (fp.n || 9); i++) {
          ctx.fillStyle = `rgba(51,45,33,${.1 + rng() * .18})`;
          U.ellipse(ctx, x + (rng() - .5) * w, y + (rng() - .5) * h, 3 + rng() * 12, 2 + rng() * 6, rng() * 3); ctx.fill();
        }
        break;
      case 'toys':
        for (let i = 0; i < (fp.n || 5); i++) {
          const px = x + (rng() - .5) * w, py = y + (rng() - .5) * h;
          if (rng() > .5) {
            ctx.fillStyle = ['#7b4a36', '#4c6256', '#8b7444'][(rng() * 3) | 0];
            ctx.fillRect(px, py, 4 + rng() * 3, 3 + rng() * 3);
            ctx.fillStyle = 'rgba(20,20,17,.6)'; ctx.beginPath(); ctx.arc(px + 1.5, py + 1.5, .7, 0, 7); ctx.fill();
          } else {
            ctx.strokeStyle = 'rgba(57,48,37,.7)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(px, py, 2 + rng() * 3, 0, 7); ctx.stroke();
          }
        }
        break;
      case 'wax':
        for (let i = 0; i < (fp.n || 7); i++) {
          ctx.fillStyle = `rgba(205,190,158,${.1 + rng() * .16})`;
          U.ellipse(ctx, x + (rng() - .5) * w, y + (rng() - .5) * h, 2 + rng() * 7, 1 + rng() * 3, rng() * 3); ctx.fill();
        }
        break;
      case 'leaves':
        for (let i = 0; i < (fp.n || 20); i++) {
          ctx.save(); ctx.translate(x + (rng() - .5) * w, y + (rng() - .5) * h); ctx.rotate(rng() * 6);
          ctx.fillStyle = `rgba(${46 + rng() * 30 | 0},${49 + rng() * 26 | 0},${30 + rng() * 16 | 0},${.2 + rng() * .4})`;
          U.ellipse(ctx, 0, 0, 1 + rng() * 2.4, .5 + rng() * 1.1); ctx.fill();
          ctx.restore();
        }
        break;
      default: break;
    }
  };

  // alias para compatibilidad con escenarios
  P.drawObject = P.draw;
})();
