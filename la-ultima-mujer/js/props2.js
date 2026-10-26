'use strict';
/* ============================================================
   Mobiliario procedural — Casa 14 y exterior de Puerto Niebla
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U, Art = LM.Art, Tex = LM.Tex;
  const P = LM.Props;
  if (!P) throw new Error('props.js debe cargarse antes de props2.js');
  const T = P.tools;
  const { rr, shade, wood, metal, cloth, edge, topLight, shadowBase, glow, drawer, legs, lampShade } = T;
  const seeded = (key) => U.rng('prop2-' + key);

  const D = {};

  /* ============================ SALÓN ============================ */
  D.sofa = function (ctx, w, h, o) {
    shadowBase(ctx, 6, 6, w - 12, h + 8);
    const seed = o.seed || 12;
    const base = o.color || '#4b4336';
    // patas
    ctx.fillStyle = 'rgba(31,24,17,.9)';
    for (const x of [12, w - 16]) { ctx.fillRect(x, h - 12, 4, 12); }
    // cuerpo
    const g = ctx.createLinearGradient(0, h * .36, 0, h * .82);
    g.addColorStop(0, base); g.addColorStop(.6, '#332e26'); g.addColorStop(1, '#1e1b16');
    ctx.fillStyle = g; rr(ctx, 5, h * .34, w - 10, h * .48, 9); ctx.fill();
    cloth(ctx, 6, h * .36, w - 12, h * .44, base, seed, .55);
    // respaldo
    const bg = ctx.createLinearGradient(0, 4, 0, h * .46);
    bg.addColorStop(0, '#5b5141'); bg.addColorStop(.6, base); bg.addColorStop(1, '#26221c');
    ctx.fillStyle = bg; rr(ctx, 7, h * .09, w - 14, h * .38, 12); ctx.fill();
    cloth(ctx, 9, h * .11, w - 18, h * .33, base, seed + 2, .6);
    // botones de capitoné
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = 'rgba(20,17,13,.55)';
      ctx.beginPath(); ctx.arc(w * .2 + i * w * .15, h * .26, 1.8, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(20,17,13,.18)'; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(w * .2 + i * w * .15, h * .26);
      ctx.lineTo(w * .2 + i * w * .15 + 15, h * .4); ctx.stroke();
    }
    // brazos
    for (const side of [0, 1]) {
      const x = side ? w - 38 : 4;
      const ag = ctx.createLinearGradient(x, h * .3, x + 34, h * .7);
      ag.addColorStop(0, '#665b49'); ag.addColorStop(.5, base); ag.addColorStop(1, '#211d18');
      ctx.fillStyle = ag; rr(ctx, x, h * .32, 34, h * .42, 9); ctx.fill();
      cloth(ctx, x + 2, h * .34, 30, h * .37, base, seed + side, .45);
      ctx.strokeStyle = 'rgba(220,208,181,.08)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 5, h * .36); ctx.lineTo(x + 5, h * .69); ctx.stroke();
    }
    // cojines
    for (let i = 0; i < 3; i++) {
      const x = 40 + i * ((w - 100) / 2.6);
      ctx.save();
      ctx.translate(x, h * .48 + (i === 1 ? 3 : 0));
      ctx.rotate((i - 1) * .025);
      ctx.fillStyle = i === 1 ? '#6b5342' : '#4e4437';
      rr(ctx, 0, 0, (w - 110) / 2.5, h * .22, 5); ctx.fill();
      cloth(ctx, 1, 1, (w - 110) / 2.5 - 2, h * .2, i === 1 ? '#6b5342' : '#4e4437', seed + i + 5, .35);
      ctx.strokeStyle = 'rgba(232,220,194,.1)'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(4, h * .04); ctx.lineTo((w - 110) / 2.5 - 4, h * .04); ctx.stroke();
      ctx.restore();
    }
    // manta doblada
    const tg = ctx.createLinearGradient(w * .68, 0, w * .75, h);
    tg.addColorStop(0, 'rgba(123,95,65,.55)'); tg.addColorStop(1, 'rgba(58,44,31,.35)');
    ctx.fillStyle = tg;
    ctx.fillRect(w * .68, h * .3, 28, h * .25);
    ctx.strokeStyle = 'rgba(218,201,165,.12)';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(w * .68 + i * 7, h * .31); ctx.lineTo(w * .68 + i * 7, h * .54); ctx.stroke(); }
    // desgaste
    const rng = seeded('sofa' + seed + w);
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = `rgba(213,201,178,${.03 + rng() * .05})`; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.moveTo(20 + rng() * (w - 40), h * .4 + rng() * h * .3);
      ctx.lineTo(22 + rng() * (w - 40), h * .4 + rng() * h * .3); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(8,9,8,.4)'; ctx.lineWidth = 1; rr(ctx, 5, h * .34, w - 10, h * .47, 8); ctx.stroke();
  };

  D.armchair = function (ctx, w, h, o) {
    shadowBase(ctx, 4, 4, w - 8, h);
    const base = o.color || '#4c4235';
    ctx.fillStyle = '#221e18';
    for (const x of [10, w - 16]) { ctx.fillRect(x, h - 10, 4, 10); }
    const g = ctx.createLinearGradient(0, h * .3, 0, h * .85);
    g.addColorStop(0, base); g.addColorStop(1, '#201c17');
    ctx.fillStyle = g; rr(ctx, w * .14, h * .34, w * .72, h * .48, 9); ctx.fill();
    cloth(ctx, w * .15, h * .36, w * .7, h * .44, base, o.seed || 4, .55);
    const bg = ctx.createLinearGradient(0, 3, 0, h * .51);
    bg.addColorStop(0, '#665947'); bg.addColorStop(1, '#2b251d');
    ctx.fillStyle = bg; rr(ctx, w * .17, h * .06, w * .66, h * .44, 16); ctx.fill();
    cloth(ctx, w * .19, h * .09, w * .62, h * .38, base, (o.seed || 4) + 2, .55);
    for (const side of [0, 1]) {
      const x = side ? w * .76 : w * .03;
      const ag = ctx.createLinearGradient(x, 0, x + w * .21, 0);
      ag.addColorStop(0, '#615545'); ag.addColorStop(1, '#27221b');
      ctx.fillStyle = ag; rr(ctx, x, h * .22, w * .21, h * .56, 9); ctx.fill();
    }
    ctx.fillStyle = '#5d4b3b';
    U.ellipse(ctx, w * .5, h * .57, w * .24, h * .13); ctx.fill();
    ctx.strokeStyle = 'rgba(222,208,179,.1)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.ellipse(w * .5, h * .54, w * .2, h * .1, 0, 3.4, 6.1); ctx.stroke();
  };

  D.sideboard = function (ctx, w, h, o) {
    shadowBase(ctx, 4, 4, w - 8, h + 4);
    ctx.fillStyle = '#1d1914'; rr(ctx, 4, h * .25, w - 8, h * .68, 2); ctx.fill();
    wood(ctx, 7, h * .29, w - 14, h * .58, 'dark', o.seed || 9, .85);
    for (let i = 0; i < 2; i++) {
      const x = 12 + i * (w - 30) / 2;
      drawer(ctx, x, h * .38, (w - 38) / 2, h * .15, (o.seed || 9) + i, false);
      drawer(ctx, x, h * .58, (w - 38) / 2, h * .15, (o.seed || 9) + i + 3, false);
    }
    ctx.fillStyle = '#33291e'; rr(ctx, 2, h * .2, w - 4, h * .13, 2); ctx.fill();
    wood(ctx, 5, h * .19, w - 10, h * .1, 'furniture', (o.seed || 9) + 5, .9);
    topLight(ctx, 6, h * .19, w - 12, h, .1);
    // centro de mesa
    ctx.fillStyle = 'rgba(143,127,89,.45)';
    U.roundRect(ctx, w * .4, h * .1, w * .2, h * .09, 2); ctx.fill();
    ctx.fillStyle = 'rgba(185,164,112,.3)'; ctx.fillRect(w * .44, h * .12, w * .12, 1.4);
    legs(ctx, 8, 4, w - 16, h, 2, o.seed || 9);
  };

  D.coffee = function (ctx, w, h) {
    shadowBase(ctx, 5, 5, w - 10, h + 3);
    wood(ctx, 4, h * .3, w - 8, h * .23, 'dark', 15, .86);
    ctx.fillStyle = 'rgba(183,163,128,.08)';
    ctx.fillRect(7, h * .34, w - 14, 2);
    ctx.fillStyle = '#2d241a'; rr(ctx, 2, h * .16, w - 4, h * .17, 3); ctx.fill();
    wood(ctx, 5, h * .15, w - 10, h * .15, 'furniture', 17, .9);
    topLight(ctx, 5, h * .15, w - 10, h, .1);
    ctx.fillStyle = '#1d1813';
    for (const x of [12, w - 16]) { ctx.fillRect(x, h * .48, 4, h * .42); }
    // objetos
    ctx.fillStyle = 'rgba(190,183,162,.45)';
    ctx.save(); ctx.translate(w * .25, h * .2); ctx.rotate(-.05); ctx.fillRect(-16, -4, 32, 7); ctx.restore();
    ctx.strokeStyle = 'rgba(20,19,15,.8)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(w * .6, h * .17); ctx.bezierCurveTo(w * .7, h * .1, w * .8, h * .22, w * .86, h * .14); ctx.stroke();
    ctx.fillStyle = 'rgba(206,193,165,.5)';
    U.ellipse(ctx, w * .72, h * .24, 8, 6); ctx.fill();
  };

  D.bookshelf = function (ctx, w, h, o) {
    shadowBase(ctx, 4, 4, w - 8, h);
    const seed = o.seed || 18;
    ctx.fillStyle = '#241d16'; rr(ctx, 3, 2, w - 6, h - 4, 2); ctx.fill();
    wood(ctx, 5, 4, w - 10, h - 8, 'dark', seed, .9);
    const shelves = o.shelves || 5;
    const rng = seeded('shelf' + seed + w + h);
    for (let s = 0; s < shelves; s++) {
      const sy = 8 + s * ((h - 16) / shelves);
      ctx.fillStyle = 'rgba(30,24,18,.95)';
      ctx.fillRect(8, sy + (h - 20) / shelves - 4, w - 16, 3);
      let bx = 10 + rng() * 3;
      while (bx < w - 15) {
        const bw = 3 + rng() * 6, bh = (h - 26) / shelves * (.55 + rng() * .4);
        const colors = ['#4a3826', '#39473d', '#4e2d2a', '#574a35', '#2c3940', '#5b4630', '#3a3128'];
        ctx.fillStyle = colors[(rng() * colors.length) | 0];
        ctx.fillRect(bx, sy + (h - 20) / shelves - 6 - bh, bw, bh);
        ctx.fillStyle = 'rgba(218,200,164,.16)'; ctx.fillRect(bx, sy + (h - 20) / shelves - 6 - bh, bw, 1);
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(bx + bw - 1, sy + (h - 20) / shelves - 6 - bh, 1, bh);
        if (rng() > .87) { ctx.save(); ctx.translate(bx + bw / 2, sy + (h - 20) / shelves - 6 - bh); ctx.rotate(.3); ctx.fillStyle = '#4c3a28'; ctx.fillRect(0, 0, bw + 5, bh * .7); ctx.restore(); }
        bx += bw + (rng() > .9 ? 5 : 1);
      }
    }
    // marco
    ctx.strokeStyle = 'rgba(147,127,91,.2)'; ctx.lineWidth = 1.3;
    ctx.strokeRect(6, 5, w - 12, h - 10);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(7, h - 7, w - 14, 3);
  };

  D.piano = function (ctx, w, h, o) {
    shadowBase(ctx, 6, 6, w - 12, h + 6);
    const g = ctx.createLinearGradient(0, h * .1, 0, h * .9);
    g.addColorStop(0, '#30251d'); g.addColorStop(.45, '#1a1410'); g.addColorStop(1, '#0d0b09');
    ctx.fillStyle = g;
    rr(ctx, 8, h * .05, w - 16, h * .68, 6); ctx.fill();
    wood(ctx, 10, h * .08, w - 20, h * .6, 'dark', o.seed || 22, .55);
    // tapa / brillo
    ctx.fillStyle = 'rgba(225,212,186,.05)';
    ctx.beginPath(); ctx.moveTo(16, h * .12); ctx.lineTo(w * .6, h * .12); ctx.lineTo(w * .32, h * .53); ctx.lineTo(16, h * .6); ctx.closePath(); ctx.fill();
    // teclado
    ctx.fillStyle = '#cdc4ae'; ctx.fillRect(16, h * .58, w - 32, h * .11);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = 'rgba(68,58,44,.22)'; ctx.fillRect(17 + i * ((w - 34) / 26), h * .58, .8, h * .11);
      if (i % 7 !== 2 && i % 7 !== 6) { ctx.fillStyle = '#15130f'; ctx.fillRect(20 + i * ((w - 34) / 26), h * .58, 2.5, h * .06); }
    }
    ctx.fillStyle = 'rgba(20,15,11,.95)'; ctx.fillRect(14, h * .69, w - 28, h * .05);
    // patas
    ctx.fillStyle = '#15100c'; ctx.fillRect(w * .15, h * .73, 6, h * .23); ctx.fillRect(w * .8, h * .73, 6, h * .23);
    // partitura
    ctx.fillStyle = 'rgba(212,204,183,.45)';
    ctx.save(); ctx.translate(w * .47, h * .37); ctx.rotate(-.03); ctx.fillRect(-22, -12, 44, 25); ctx.restore();
    ctx.strokeStyle = 'rgba(62,53,41,.4)'; ctx.lineWidth = .6;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(w * .47 - 18, h * .35 + i * 2.8); ctx.lineTo(w * .47 + 18, h * .35 + i * 2.8); ctx.stroke(); }
  };

  D.fireplace = function (ctx, w, h) {
    shadowBase(ctx, 3, 3, w - 6, h);
    // marco de piedra
    ctx.fillStyle = '#35322a'; rr(ctx, 4, h * .05, w - 8, h * .85, 3); ctx.fill();
    const rng = seeded('fire' + w);
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = `rgba(${60 + rng() * 40 | 0},${57 + rng() * 36 | 0},${48 + rng() * 28 | 0},${.25 + rng() * .3})`;
      ctx.fillRect(6 + rng() * (w - 14), h * .07 + rng() * h * .8, 4 + rng() * 13, 2 + rng() * 7);
    }
    // hornacina
    ctx.fillStyle = '#090a09';
    rr(ctx, w * .2, h * .2, w * .6, h * .62, 12); ctx.fill();
    const fg = ctx.createRadialGradient(w * .5, h * .68, 2, w * .5, h * .68, w * .3);
    fg.addColorStop(0, 'rgba(218,132,62,.4)'); fg.addColorStop(.55, 'rgba(126,55,25,.22)'); fg.addColorStop(1, 'rgba(30,14,7,0)');
    ctx.fillStyle = fg; ctx.fillRect(w * .2, h * .2, w * .6, h * .62);
    // troncos
    ctx.fillStyle = '#1b150f';
    U.ellipse(ctx, w * .45, h * .7, w * .12, h * .06, .1); ctx.fill();
    U.ellipse(ctx, w * .58, h * .68, w * .11, h * .055, -.1); ctx.fill();
    ctx.strokeStyle = 'rgba(193,109,51,.25)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(w * .38, h * .71); ctx.lineTo(w * .54, h * .65); ctx.stroke();
    // brasas
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = `rgba(226,126,62,${.25 + rng() * .4})`;
      ctx.beginPath(); ctx.arc(w * .35 + rng() * w * .3, h * .68 + rng() * h * .1, .8 + rng() * 2, 0, 7); ctx.fill();
    }
    ctx.save(); ctx.globalCompositeOperation = 'screen'; glow(ctx, w * .5, h * .68, w * .38, '#c66f35', .16); ctx.restore();
    // repisa
    ctx.fillStyle = '#40382c'; ctx.fillRect(2, h * .03, w - 4, h * .08);
    ctx.fillStyle = 'rgba(214,199,167,.1)'; ctx.fillRect(4, h * .035, w - 8, 1.5);
    // objetos de repisa
    ctx.fillStyle = 'rgba(144,123,82,.35)'; U.roundRect(ctx, w * .2, 0, 6, h * .07, 1); ctx.fill();
    ctx.fillStyle = 'rgba(183,170,137,.45)'; ctx.fillRect(w * .44, h * .015, 20, 3);
    ctx.fillStyle = 'rgba(30,31,27,.8)'; ctx.fillRect(w * .73, h * .015, 4, h * .05); ctx.fillStyle = 'rgba(198,185,149,.36)'; U.ellipse(ctx, w * .73 + 2, h * .01, 3, 5); ctx.fill();
  };

  D.stairs = function (ctx, w, h, o) {
    // escalera vista desde arriba: huella, contrahuella y barandilla
    const steps = o.steps || 12;
    const dir = o.dir || 'up';
    ctx.save();
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const y = o.vertical ? h * t : h * .08 + (h * .84) * t;
      const sh = o.vertical ? h / steps : (h * .84) / steps;
      const shadeAmt = .12 + (1 - t) * .17;
      ctx.fillStyle = `rgba(${58 + (1 - t) * 20 | 0},${49 + (1 - t) * 14 | 0},${37 + (1 - t) * 10 | 0},1)`;
      ctx.fillRect(w * .12, y, w * .76, sh + .5);
      wood(ctx, w * .12, y, w * .76, sh, 'dark', 4 + i, .6);
      ctx.fillStyle = `rgba(10,8,6,${shadeAmt})`;
      ctx.fillRect(w * .12, y + sh - 2, w * .76, 2.2);
      ctx.fillStyle = 'rgba(208,187,148,.06)'; ctx.fillRect(w * .14, y, w * .72, .8);
    }
    // barandilla izquierda
    ctx.strokeStyle = '#2a2118'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w * .07, h * .92); ctx.lineTo(w * .07, h * .08); ctx.stroke();
    ctx.fillStyle = '#3d3020'; ctx.fillRect(w * .02, h * .04, w * .1, h * .07);
    ctx.strokeStyle = 'rgba(180,155,112,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w * .07, h * .9); ctx.lineTo(w * .07, h * .1); ctx.stroke();
    // postes
    for (let i = 1; i < 7; i++) {
      const y = h * .1 + i * h * .12;
      ctx.fillStyle = 'rgba(31,25,18,.9)'; ctx.fillRect(w * .06, y, 3, h * .1);
    }
    // descansillo
    ctx.fillStyle = '#1a1713'; ctx.fillRect(w * .12, h * .9, w * .76, h * .06);
    ctx.strokeStyle = 'rgba(150,133,102,.12)'; ctx.strokeRect(w * .12, h * .9, w * .76, h * .06);
    ctx.restore();
  };

  D.floorlamp = function (ctx, w, h, o) {
    shadowBase(ctx, w * .25, 4, w * .5, h);
    ctx.fillStyle = '#27241e'; U.ellipse(ctx, w / 2, h - 5, w * .28, 4); ctx.fill();
    ctx.strokeStyle = '#4f4838'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(w / 2, h * .18); ctx.lineTo(w / 2, h - 7); ctx.stroke();
    lampShade(ctx, 3, 3, w - 6, h * .18, true);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; glow(ctx, w / 2, h * .3, w * 1.2, '#d3934b', .22); ctx.restore();
  };

  D.fridge = function (ctx, w, h) {
    shadowBase(ctx, 3, 3, w - 6, h);
    ctx.fillStyle = '#5c635b'; rr(ctx, 4, 2, w - 8, h - 4, 5); ctx.fill();
    metal(ctx, 6, 4, w - 12, h - 9, 44, 'rgba(90,101,91,.35)');
    ctx.strokeStyle = 'rgba(15,20,17,.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(7, h * .34); ctx.lineTo(w - 7, h * .34); ctx.stroke();
    ctx.fillStyle = 'rgba(196,196,174,.25)'; ctx.fillRect(w * .72, h * .1, 2.6, h * .15);
    ctx.fillRect(w * .72, h * .42, 2.6, h * .2);
    // imanes / notas
    ctx.fillStyle = 'rgba(207,197,169,.5)'; ctx.fillRect(w * .24, h * .15, 14, 17);
    ctx.fillStyle = 'rgba(76,61,42,.4)'; ctx.fillRect(w * .26, h * .18, 10, 1); ctx.fillRect(w * .26, h * .2, 8, 1);
    ctx.fillStyle = 'rgba(133,61,46,.6)'; ctx.beginPath(); ctx.arc(w * .52, h * .12, 1.7, 0, 7); ctx.fill();
    // manchas
    ctx.fillStyle = 'rgba(30,32,27,.25)'; ctx.fillRect(w * .16, h * .55, 4, 18);
    topLight(ctx, 6, 4, w - 12, h, .1);
  };

  D.stove = function (ctx, w, h) {
    shadowBase(ctx, 3, 3, w - 6, h);
    ctx.fillStyle = '#3a3d36'; rr(ctx, 3, 2, w - 6, h - 4, 2); ctx.fill();
    metal(ctx, 5, 4, w - 10, h - 8, 55, 'rgba(76,80,71,.35)');
    ctx.fillStyle = '#171918';
    for (let i = 0; i < 4; i++) {
      const x = 9 + (i % 2) * (w - 20) / 2, y = 8 + ((i / 2) | 0) * (h - 19) / 2;
      ctx.beginPath(); ctx.arc(x + 5, y + 5, 5, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(178,177,152,.22)'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.arc(x + 5, y + 5, 4, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = '#22251f'; ctx.fillRect(6, h * .66, w - 12, 4);
    ctx.fillStyle = 'rgba(192,192,167,.35)';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(10 + i * (w - 22) / 3, h * .84, 2.2, 0, 7); ctx.fill(); }
    // olla
    ctx.fillStyle = '#262a25'; U.roundRect(ctx, w * .45, h * .2, w * .22, h * .16, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(154,158,137,.28)'; ctx.lineWidth = 1; ctx.strokeRect(w * .46, h * .22, w * .2, h * .11);
  };

  D.kitchen = function (ctx, w, h, o) {
    shadowBase(ctx, 3, 3, w - 6, h + 3);
    // cuerpo de armarios
    ctx.fillStyle = '#2a2b25'; rr(ctx, 4, h * .24, w - 8, h * .7, 2); ctx.fill();
    wood(ctx, 6, h * .29, w - 12, h * .58, 'dark', o.seed || 31, .62);
    const n = Math.max(2, Math.round(w / 70));
    for (let i = 0; i < n; i++) {
      const x = 8 + i * (w - 16) / n;
      ctx.strokeStyle = 'rgba(186,174,142,.1)'; ctx.lineWidth = 1;
      ctx.strokeRect(x + 3.5, h * .36, (w - 16) / n - 7, h * .28);
      ctx.strokeRect(x + 3.5, h * .7, (w - 16) / n - 7, h * .1);
      ctx.fillStyle = 'rgba(170,151,111,.32)'; ctx.fillRect(x + (w - 16) / n - 15, h * .47, 2, 7);
    }
    // encimera
    ctx.fillStyle = '#3b3b33'; ctx.fillRect(2, h * .17, w - 4, h * .11);
    const cg = ctx.createLinearGradient(0, h * .17, 0, h * .28);
    cg.addColorStop(0, 'rgba(198,195,168,.16)'); cg.addColorStop(1, 'rgba(10,12,10,.28)');
    ctx.fillStyle = cg; ctx.fillRect(4, h * .17, w - 8, h * .11);
    topLight(ctx, 4, h * .17, w - 8, h, .14);
    // fregadero
    if (o.sink) {
      ctx.fillStyle = '#1d211e'; rr(ctx, w * .16, h * .19, w * .28, h * .08, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(173,178,155,.3)'; ctx.lineWidth = 1; ctx.strokeRect(w * .17, h * .2, w * .26, h * .06);
      ctx.strokeStyle = '#7b8073'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w * .3, h * .17); ctx.lineTo(w * .3, h * .1); ctx.lineTo(w * .34, h * .1); ctx.stroke();
    }
    // tabla, tarros
    if (o.sink) {
      ctx.fillStyle = 'rgba(184,160,112,.35)'; ctx.fillRect(w * .7, h * .13, 22, 4);
      ctx.fillStyle = 'rgba(111,132,107,.4)'; U.roundRect(ctx, w * .78, h * .09, 7, 8, 1); ctx.fill();
      ctx.fillStyle = 'rgba(139,120,83,.4)'; U.roundRect(ctx, w * .86, h * .1, 6, 7, 1); ctx.fill();
    }
  };

  D.washer = function (ctx, w, h) {
    shadowBase(ctx, 3, 3, w - 6, h);
    ctx.fillStyle = '#555d56'; rr(ctx, 3, 2, w - 6, h - 4, 4); ctx.fill();
    metal(ctx, 5, 4, w - 10, h - 8, 61, 'rgba(84,95,85,.3)');
    ctx.strokeStyle = 'rgba(151,157,137,.3)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(w / 2, h * .6, w * .26, 0, 7); ctx.stroke();
    const cg = ctx.createRadialGradient(w / 2 - 4, h * .56, 2, w / 2, h * .6, w * .24);
    cg.addColorStop(0, 'rgba(21,30,29,.9)'); cg.addColorStop(1, 'rgba(8,12,11,.95)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(w / 2, h * .6, w * .23, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(184,194,176,.1)'; ctx.beginPath(); ctx.arc(w / 2 - 4, h * .56, w * .1, 0, 7); ctx.fill();
    ctx.fillStyle = '#292d28'; ctx.fillRect(7, 7, w - 14, h * .13);
    ctx.fillStyle = 'rgba(205,205,180,.28)'; ctx.fillRect(w * .3, h * .12, w * .12, 2); ctx.fillRect(w * .51, h * .12, w * .12, 2);
  };

  D.smallbed = function (ctx, w, h, o) {
    shadowBase(ctx, 3, 2, w - 6, h);
    ctx.fillStyle = '#30261c'; rr(ctx, 4, h * .18, w - 8, h * .66, 4); ctx.fill();
    wood(ctx, 6, h * .2, w - 12, h * .58, 'furniture', o.seed || 41, .7);
    ctx.fillStyle = 'rgba(187,180,158,.55)'; rr(ctx, 10, h * .22, w - 20, h * .5, 8); ctx.fill();
    // manta
    const qg = ctx.createLinearGradient(0, h * .3, 0, h * .7);
    qg.addColorStop(0, 'rgba(107,91,70,.8)'); qg.addColorStop(1, 'rgba(54,43,33,.85)');
    ctx.fillStyle = qg;
    ctx.beginPath(); ctx.moveTo(10, h * .38); ctx.lineTo(w - 11, h * .36); ctx.lineTo(w - 12, h * .72); ctx.quadraticCurveTo(w * .5, h * .8, 10, h * .7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(213,195,157,.12)'; ctx.lineWidth = .8;
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(16 + i * (w - 32) / 6, h * .4); ctx.lineTo(16 + i * (w - 32) / 6 + 3, h * .7); ctx.stroke(); }
    ctx.fillStyle = 'rgba(204,196,175,.6)'; U.ellipse(ctx, w * .25, h * .28, w * .15, h * .1, -.05); ctx.fill();
    // peluche
    ctx.fillStyle = 'rgba(130,102,71,.65)'; U.ellipse(ctx, w * .63, h * .33, 8, 10, .3); ctx.fill();
    ctx.fillStyle = 'rgba(46,35,26,.8)'; ctx.beginPath(); ctx.arc(w * .65, h * .3, 5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(185,165,127,.55)'; ctx.beginPath(); ctx.arc(w * .64, h * .29, 2, 0, 7); ctx.fill();
    // cabecera
    ctx.strokeStyle = '#3a2c1f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w * .08, h * .24); ctx.lineTo(w * .08, h * .07); ctx.lineTo(w * .92, h * .07); ctx.lineTo(w * .92, h * .24); ctx.stroke();
  };

  D.toychest = function (ctx, w, h) {
    shadowBase(ctx, 3, 3, w - 6, h);
    ctx.fillStyle = '#3b2e21'; rr(ctx, 3, h * .18, w - 6, h * .74, 3); ctx.fill();
    wood(ctx, 5, h * .22, w - 10, h * .65, 'furniture', 48, .8);
    ctx.fillStyle = 'rgba(108,64,45,.55)'; ctx.fillRect(6, h * .3, w - 12, h * .15);
    ctx.strokeStyle = 'rgba(208,187,148,.16)'; ctx.strokeRect(8, h * .32, w - 16, h * .11);
    // pintura desgastada
    ctx.fillStyle = 'rgba(68,95,77,.3)';
    ctx.beginPath(); ctx.moveTo(w * .18, h * .55); ctx.lineTo(w * .35, h * .5); ctx.lineTo(w * .26, h * .68); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(w * .62, h * .56); ctx.rotate(-.3);
    ctx.fillStyle = 'rgba(122,58,43,.45)'; ctx.fillRect(-8, -3, 16, 6);
    ctx.restore();
    ctx.fillStyle = 'rgba(190,173,137,.28)'; ctx.fillRect(8, h * .19, w - 16, 2);
    ctx.fillStyle = 'rgba(15,12,9,.4)'; ctx.fillRect(5, h * .88, w - 10, 3);
  };

  D.recorder = function (ctx, w, h, o) {
    shadowBase(ctx, 3, 3, w - 6, h);
    ctx.fillStyle = '#25231f'; rr(ctx, 2, 4, w - 4, h - 6, 3); ctx.fill();
    metal(ctx, 4, 6, w - 8, h - 10, 71, 'rgba(55,57,51,.3)');
    // dos bobinas
    for (const x of [w * .32, w * .68]) {
      ctx.fillStyle = '#151714'; ctx.beginPath(); ctx.arc(x, h * .42, w * .13, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(170,163,137,.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, h * .42, w * .1, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(133,122,98,.25)';
      for (let i = 0; i < 6; i++) { const a = i / 6 * 7; ctx.beginPath(); ctx.moveTo(x, h * .42); ctx.lineTo(x + Math.cos(a) * w * .09, h * .42 + Math.sin(a) * w * .09); ctx.stroke(); }
    }
    // cinta
    ctx.strokeStyle = 'rgba(94,78,54,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * .32, h * .29); ctx.lineTo(w * .68, h * .29); ctx.stroke();
    // cabezal / botones
    ctx.fillStyle = '#1e201d'; ctx.fillRect(w * .2, h * .62, w * .6, h * .11);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i === 2 ? 'rgba(181,88,52,.75)' : '#4b4b40';
      ctx.beginPath(); ctx.arc(w * .26 + i * w * .12, h * .675, 2.2, 0, 7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(198,184,150,.25)'; ctx.fillRect(w * .14, h * .78, w * .32, 2);
    if (o.on) { ctx.fillStyle = 'rgba(211,140,71,.8)'; ctx.beginPath(); ctx.arc(w * .86, h * .78, 2, 0, 7); ctx.fill(); }
  };

  D.typewriter = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#35332b'); g.addColorStop(.6, '#1e1e1a'); g.addColorStop(1, '#121310');
    ctx.fillStyle = g; rr(ctx, 4, h * .23, w - 8, h * .55, 5); ctx.fill();
    ctx.fillStyle = '#191a17'; rr(ctx, 8, h * .05, w - 16, h * .28, 3); ctx.fill();
    ctx.fillStyle = 'rgba(208,200,176,.16)'; ctx.fillRect(10, h * .08, w - 20, h * .02);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 8; j++) {
      ctx.fillStyle = 'rgba(163,158,134,.35)';
      ctx.beginPath(); ctx.arc(12 + j * (w - 24) / 7, h * .44 + i * h * .09, 1.7, 0, 7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(222,214,192,.55)'; ctx.fillRect(w * .25, 1, w * .5, h * .12);
    ctx.fillStyle = 'rgba(74,63,48,.5)'; ctx.fillRect(w * .3, h * .05, w * .4, 1); ctx.fillRect(w * .3, h * .08, w * .3, 1);
  };

  D.crate = function (ctx, w, h, o) {
    shadowBase(ctx, 2, 2, w - 4, h + 2);
    const seed = o.seed || 81;
    wood(ctx, 2, 4, w - 4, h - 8, 'dark', seed, .95);
    ctx.strokeStyle = 'rgba(31,23,16,.9)'; ctx.lineWidth = 2;
    ctx.strokeRect(3, 5, w - 6, h - 10);
    ctx.fillStyle = 'rgba(138,116,78,.4)';
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-.7);
    ctx.fillRect(-w * .6, -2, w * 1.2, 2.2); ctx.restore();
    ctx.fillStyle = 'rgba(13,11,8,.3)'; ctx.fillRect(4, h - 9, w - 8, 4);
    const rng = seeded('crate' + seed + w);
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(6 + rng() * (w - 12), 7); ctx.lineTo(6 + rng() * (w - 12), h - 8); ctx.stroke(); }
  };

  D.suitcase = function (ctx, w, h, o) {
    shadowBase(ctx, 2, 2, w - 4, h);
    ctx.fillStyle = '#453325'; rr(ctx, 3, h * .16, w - 6, h * .68, 5); ctx.fill();
    wood(ctx, 4, h * .18, w - 8, h * .63, 'furniture', o.seed || 2, .55);
    ctx.strokeStyle = 'rgba(215,192,146,.22)'; ctx.lineWidth = 1;
    ctx.strokeRect(5.5, h * .2, w - 11, h * .59);
    ctx.fillStyle = 'rgba(151,123,80,.5)';
    ctx.fillRect(w * .18, h * .18, 4, h * .64); ctx.fillRect(w * .78, h * .18, 4, h * .64);
    ctx.strokeStyle = '#31281d'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(w / 2, h * .18, w * .16, 3.3, 6.1); ctx.stroke();
    ctx.fillStyle = '#b39a67'; ctx.fillRect(w * .44, h * .46, 5, 4); ctx.fillRect(w * .52, h * .46, 5, 4);
  };

  D.halltable = function (ctx, w, h) {
    shadowBase(ctx, 4, 4, w - 8, h);
    wood(ctx, 3, h * .18, w - 6, h * .17, 'furniture', 32, .9);
    ctx.fillStyle = '#231b14'; rr(ctx, w * .08, h * .34, w * .16, h * .5, 2); ctx.fill();
    ctx.fillStyle = '#1d1711'; rr(ctx, w * .76, h * .34, w * .16, h * .5, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(188,165,123,.2)'; ctx.strokeRect(w * .1, h * .38, w * .12, h * .4);
    // florero
    ctx.fillStyle = 'rgba(108,125,103,.35)'; U.roundRect(ctx, w * .4, h * .02, 9, h * .17, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(79,95,64,.6)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(w * .44, h * .04); ctx.quadraticCurveTo(w * .4 + i * 6, h * -.1, w * .38 + i * 9, h * -.03); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(143,86,65,.5)'; ctx.beginPath(); ctx.arc(w * .38, h * -.02, 2, 0, 7); ctx.fill();
  };

  D.clock = function (ctx, w, h) {
    shadowBase(ctx, 3, 2, w - 6, h);
    ctx.fillStyle = '#2a2118'; rr(ctx, 3, 2, w - 6, h - 4, 3); ctx.fill();
    wood(ctx, 5, 4, w - 10, h - 8, 'dark', 23, .9);
    // caja del reloj
    ctx.fillStyle = 'rgba(16,13,10,.75)'; rr(ctx, 8, 9, w - 16, h * .28, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(168,145,100,.35)'; ctx.lineWidth = 1.2; ctx.strokeRect(9.5, 10.5, w - 19, h * .26);
    const cx = w / 2, cy = 9 + h * .14, r = w * .27;
    const cg = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, r);
    cg.addColorStop(0, '#c6b68f'); cg.addColorStop(.7, '#877349'); cg.addColorStop(1, '#443725');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(44,33,20,.7)'; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * 6.28;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * .72, cy + Math.sin(a) * r * .72);
      ctx.lineTo(cx + Math.cos(a) * r * .86, cy + Math.sin(a) * r * .86); ctx.stroke();
    }
    ctx.strokeStyle = '#241a10'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * .4, cy - r * .3); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - r * .15, cy + r * .55); ctx.stroke();
    // péndulo
    ctx.fillStyle = 'rgba(12,10,8,.8)'; ctx.fillRect(11, h * .42, w - 22, h * .3);
    ctx.strokeStyle = 'rgba(167,140,86,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w / 2, h * .42); ctx.lineTo(w / 2 + 3, h * .65); ctx.stroke();
    ctx.fillStyle = 'rgba(181,153,94,.55)'; ctx.beginPath(); ctx.arc(w / 2 + 3, h * .67, 4, 0, 7); ctx.fill();
    // base
    ctx.fillStyle = '#352a1e'; ctx.fillRect(4, h * .78, w - 8, h * .1);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(2, h - 6, w - 4, 5);
  };

  D.hatstand = function (ctx, w, h) {
    shadowBase(ctx, w * .3, 3, w * .4, h);
    ctx.strokeStyle = '#403426'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w / 2, h * .18); ctx.lineTo(w / 2, h - 5); ctx.stroke();
    ctx.fillStyle = '#2f271d';
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * 6.28;
      ctx.save(); ctx.translate(w / 2, h - 5); ctx.rotate(a);
      ctx.fillRect(-2, -3, 4, h * .13);
      ctx.restore();
    }
    // ganchos
    for (let i = 0; i < 4; i++) {
      const y = h * .18 + i * h * .07;
      ctx.strokeStyle = 'rgba(141,119,81,.45)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(w / 2, y); ctx.quadraticCurveTo(w * (.2 + .3 * (i % 2)), y - 4, w * (.26 + .36 * (i % 2)), y + 2); ctx.stroke();
    }
    // abrigo colgado
    ctx.fillStyle = 'rgba(48,63,56,.7)';
    ctx.beginPath(); ctx.moveTo(w * .55, h * .22); ctx.quadraticCurveTo(w * .9, h * .34, w * .78, h * .6); ctx.lineTo(w * .56, h * .55); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,28,23,.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * .61, h * .26); ctx.lineTo(w * .64, h * .53); ctx.stroke();
  };

  /* ============================ EXTERIOR ============================ */
  D.car = function (ctx, w, h, o) {
    shadowBase(ctx, 6, 6, w - 12, h + 10);
    const seed = o.seed || 3;
    const body = o.color || '#374440';
    // ruedas
    ctx.fillStyle = '#0d0f0e';
    for (const x of [w * .2, w * .78]) { ctx.fillRect(x, 6, w * .08, h * .22); ctx.fillRect(x, h * .72, w * .08, h * .22); }
    // carrocería
    const g = ctx.createLinearGradient(0, h * .12, 0, h * .9);
    g.addColorStop(0, '#4d5b54'); g.addColorStop(.35, body); g.addColorStop(.75, '#1b2523'); g.addColorStop(1, '#0e1514');
    ctx.fillStyle = g;
    rr(ctx, w * .04, h * .14, w * .92, h * .72, 16); ctx.fill();
    // capó y maletero
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.beginPath(); ctx.moveTo(w * .08, h * .3); ctx.lineTo(w * .3, h * .24); ctx.lineTo(w * .32, h * .5); ctx.lineTo(w * .08, h * .56); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * .88, h * .3); ctx.lineTo(w * .7, h * .25); ctx.lineTo(w * .68, h * .5); ctx.lineTo(w * .9, h * .55); ctx.closePath(); ctx.fill();
    // techo
    const rg = ctx.createLinearGradient(w * .3, 0, w * .72, 0);
    rg.addColorStop(0, 'rgba(83,101,94,.65)'); rg.addColorStop(.5, 'rgba(42,55,50,.78)'); rg.addColorStop(1, 'rgba(20,30,27,.9)');
    ctx.fillStyle = rg;
    rr(ctx, w * .29, h * .25, w * .42, h * .49, 10); ctx.fill();
    // parabrisas delantero
    const fg = ctx.createLinearGradient(w * .25, 0, w * .75, 0);
    fg.addColorStop(0, '#283936'); fg.addColorStop(.5, '#0d1616'); fg.addColorStop(1, '#1e2b29');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(w * .31, h * .27); ctx.lineTo(w * .27, h * .38); ctx.lineTo(w * .27, h * .58); ctx.lineTo(w * .31, h * .7); ctx.lineTo(w * .36, h * .68); ctx.lineTo(w * .34, h * .3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * .69, h * .27); ctx.lineTo(w * .73, h * .38); ctx.lineTo(w * .73, h * .58); ctx.lineTo(w * .69, h * .7); ctx.lineTo(w * .64, h * .68); ctx.lineTo(w * .66, h * .3); ctx.closePath(); ctx.fill();
    // reflejos de lluvia
    ctx.strokeStyle = 'rgba(163,190,183,.16)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      const x = w * .34 + (i * 37 % (w * .34));
      ctx.beginPath(); ctx.moveTo(x, h * .3 + (i * 13 % (h * .35))); ctx.lineTo(x + 7, h * .32 + (i * 13 % (h * .35))); ctx.stroke();
    }
    // faros / pilotos
    ctx.fillStyle = 'rgba(211,197,166,.55)';
    U.roundRect(ctx, w * .015, h * .34, w * .04, h * .09, 2); ctx.fill();
    U.roundRect(ctx, w * .015, h * .57, w * .04, h * .09, 2); ctx.fill();
    ctx.fillStyle = 'rgba(134,49,38,.65)';
    U.roundRect(ctx, w * .945, h * .34, w * .04, h * .08, 2); ctx.fill();
    U.roundRect(ctx, w * .945, h * .57, w * .04, h * .08, 2); ctx.fill();
    // matrícula y óxido
    ctx.fillStyle = 'rgba(198,190,162,.4)'; ctx.fillRect(w * .44, h * .085, w * .12, h * .025);
    ctx.fillStyle = 'rgba(20,18,14,.65)'; ctx.font = '5px monospace'; ctx.fillText('PN-1427', w * .45, h * .104);
    const rng = seeded('car' + seed + w);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(${100 + rng() * 30 | 0},${71 + rng() * 20 | 0},${43 + rng() * 15 | 0},${.04 + rng() * .12})`;
      U.ellipse(ctx, w * (.15 + rng() * .7), h * (.2 + rng() * .6), 2 + rng() * 11, 1 + rng() * 4, rng() * 3); ctx.fill();
    }
    // limpiaparabrisas
    ctx.strokeStyle = 'rgba(14,18,17,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * .31, h * .62); ctx.lineTo(w * .35, h * .55); ctx.stroke();
  };

  D.dumpster = function (ctx, w, h, o) {
    shadowBase(ctx, 4, 4, w - 8, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3c4a42'); g.addColorStop(.5, '#24342e'); g.addColorStop(1, '#121d1a');
    ctx.fillStyle = g; rr(ctx, 3, h * .2, w - 6, h * .72, 4); ctx.fill();
    metal(ctx, 5, h * .23, w - 10, h * .62, 101, 'rgba(50,69,59,.24)');
    // tapas
    ctx.fillStyle = '#26332c';
    ctx.beginPath(); ctx.moveTo(4, h * .2); ctx.lineTo(w * .48, h * .12); ctx.lineTo(w * .48, h * .24); ctx.lineTo(6, h * .3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w - 4, h * .2); ctx.lineTo(w * .52, h * .12); ctx.lineTo(w * .52, h * .24); ctx.lineTo(w - 6, h * .3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(178,187,162,.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(6, h * .27); ctx.lineTo(w - 6, h * .21); ctx.stroke();
    // ruedas
    ctx.fillStyle = '#101412';
    for (const x of [12, w - 22]) { ctx.beginPath(); ctx.arc(x, h - 3, 4, 0, 7); ctx.fill(); }
    // grafiti
    ctx.strokeStyle = 'rgba(177,92,64,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * .25, h * .55); ctx.lineTo(w * .33, h * .48); ctx.lineTo(w * .38, h * .6); ctx.stroke();
    ctx.fillStyle = 'rgba(196,187,159,.25)'; ctx.font = '6px monospace'; ctx.fillText('PN-14', w * .55, h * .62);
    // bolsas asomando
    ctx.fillStyle = 'rgba(19,25,22,.95)';
    U.ellipse(ctx, w * .38, h * .16, w * .12, h * .1); ctx.fill();
    U.ellipse(ctx, w * .46, h * .14, w * .1, h * .08); ctx.fill();
  };

  D.streetlamp = function (ctx, w, h, o) {
    shadowBase(ctx, w * .25, 2, w * .5, h);
    ctx.strokeStyle = '#222a27'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w * .35, h - 6); ctx.lineTo(w * .35, h * .15); ctx.quadraticCurveTo(w * .35, h * .06, w * .62, h * .06); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,171,148,.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * .34, h - 8); ctx.lineTo(w * .34, h * .18); ctx.stroke();
    // farol
    ctx.fillStyle = '#202622'; rr(ctx, w * .52, h * .02, w * .38, h * .07, 3); ctx.fill();
    const lg = ctx.createLinearGradient(0, h * .06, 0, h * .16);
    lg.addColorStop(0, 'rgba(220,177,108,.35)'); lg.addColorStop(1, 'rgba(105,80,48,.15)');
    ctx.fillStyle = lg; U.roundRect(ctx, w * .55, h * .06, w * .32, h * .09, 2); ctx.fill();
    if (o.on !== false) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      glow(ctx, w * .7, h * .12, w * 1.5, '#e0a662', .25);
      ctx.restore();
      ctx.fillStyle = 'rgba(245,200,135,.7)'; ctx.fillRect(w * .58, h * .085, w * .26, 2);
    }
    // base
    ctx.fillStyle = '#1d2421'; U.ellipse(ctx, w * .35, h - 4, w * .22, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(194,183,151,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w * .35, h - 16, 6, 0, 7); ctx.stroke();
  };

  D.phonebooth = function (ctx, w, h, o) {
    shadowBase(ctx, 4, 3, w - 8, h);
    // base
    ctx.fillStyle = '#2b302a'; rr(ctx, 5, h * .09, w - 10, h * .85, 3); ctx.fill();
    metal(ctx, 7, h * .12, w - 14, h * .7, 111, 'rgba(62,74,65,.25)');
    // cristal
    const gg = ctx.createLinearGradient(0, h * .12, 0, h * .8);
    gg.addColorStop(0, 'rgba(74,100,96,.3)'); gg.addColorStop(.55, 'rgba(21,35,34,.4)'); gg.addColorStop(1, 'rgba(12,20,20,.55)');
    ctx.fillStyle = gg; ctx.fillRect(10, h * .17, w - 20, h * .56);
    ctx.fillStyle = 'rgba(183,205,194,.08)';
    ctx.beginPath(); ctx.moveTo(12, h * .2); ctx.lineTo(w * .6, h * .2); ctx.lineTo(12, h * .7); ctx.closePath(); ctx.fill();
    // marco
    ctx.strokeStyle = '#38443c'; ctx.lineWidth = 2; ctx.strokeRect(9, h * .16, w - 18, h * .58);
    // teléfono
    ctx.fillStyle = '#1c211e'; rr(ctx, w * .2, h * .45, w * .24, h * .18, 3); ctx.fill();
    ctx.fillStyle = '#545349'; rr(ctx, w * .21, h * .47, w * .22, h * .06, 2); ctx.fill();
    ctx.fillStyle = '#1b1f1c'; ctx.beginPath(); ctx.arc(w * .32, h * .57, 2, 0, 7); ctx.fill();
    // cartel
    ctx.fillStyle = 'rgba(200,192,166,.32)'; ctx.fillRect(w * .16, h * .2, w * .68, h * .08);
    ctx.fillStyle = 'rgba(27,31,27,.8)'; ctx.font = '5px monospace'; ctx.fillText('TELÉFONO', w * .28, h * .245);
    if (o.lit) { const g = ctx.createRadialGradient(w / 2, h * .4, 2, w / 2, h * .4, w * .5); g.addColorStop(0, 'rgba(212,174,108,.15)'); g.addColorStop(1, 'rgba(212,174,108,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    // techo
    ctx.fillStyle = '#1c211e'; ctx.fillRect(7, h * .09, w - 14, h * .08);
    ctx.fillStyle = 'rgba(194,184,151,.12)'; ctx.fillRect(10, h * .1, w - 20, 1);
  };

  D.bench = function (ctx, w, h) {
    shadowBase(ctx, 3, 3, w - 6, h);
    ctx.fillStyle = '#24241f';
    ctx.fillRect(w * .1, h * .52, 4, h * .42); ctx.fillRect(w * .86, h * .52, 4, h * .42);
    // tablones
    for (let i = 0; i < 3; i++) {
      const y = h * (.18 + i * .12);
      ctx.fillStyle = i === 1 ? '#54493a' : '#453a2d';
      ctx.fillRect(5, y, w - 10, h * .085);
      wood(ctx, 5, y, w - 10, h * .085, 'dark', 7 + i, .8);
      ctx.fillStyle = 'rgba(197,181,147,.08)'; ctx.fillRect(6, y, w - 12, .8);
    }
    // respaldo
    ctx.fillStyle = '#2d2a23'; ctx.fillRect(4, h * .03, w - 8, h * .1);
    ctx.fillStyle = 'rgba(92,79,60,.55)'; ctx.fillRect(6, h * .02, w - 12, h * .07);
    // óxido / agua
    ctx.fillStyle = 'rgba(132,92,58,.25)'; ctx.fillRect(w * .2, h * .56, 20, 2);
  };

  D.busstop = function (ctx, w, h) {
    shadowBase(ctx, 3, 3, w - 6, h);
    ctx.strokeStyle = '#2a332e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(6, h * .08); ctx.lineTo(6, h - 4); ctx.moveTo(w - 6, h * .08); ctx.lineTo(w - 6, h - 4); ctx.stroke();
    ctx.fillStyle = '#23302b'; rr(ctx, 7, h * .05, w - 14, h * .17, 3); ctx.fill();
    ctx.fillStyle = 'rgba(61,82,72,.32)'; ctx.fillRect(10, h * .08, w - 20, h * .11);
    ctx.fillStyle = 'rgba(197,188,155,.26)'; ctx.fillRect(w * .18, h * .11, w * .4, h * .05);
    ctx.fillStyle = 'rgba(22,28,24,.8)';
    ctx.fillRect(w * .64, h * .22, 3, h * .65);
    ctx.fillRect(w * .58, h * .38, w * .25, 3);
    // banco
    ctx.fillStyle = '#3e362b'; ctx.fillRect(w * .12, h * .6, w * .55, h * .07);
    ctx.fillStyle = '#26231e'; ctx.fillRect(w * .16, h * .67, 3, h * .25); ctx.fillRect(w * .6, h * .67, 3, h * .25);
  };

  D.trashbags = function (ctx, w, h, o) {
    shadowBase(ctx, 2, 2, w - 4, h);
    const rng = seeded('trash' + (o.seed || 3) + w);
    for (let i = 0; i < 4; i++) {
      const x = w * (.18 + rng() * .6), y = h * (.45 + rng() * .35);
      const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 12);
      g.addColorStop(0, 'rgba(41,48,42,.9)'); g.addColorStop(1, 'rgba(9,13,11,.95)');
      ctx.fillStyle = g; U.ellipse(ctx, x, y, 8 + rng() * 8, 5 + rng() * 6, rng() * 3); ctx.fill();
      ctx.strokeStyle = 'rgba(160,165,142,.13)'; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.ellipse(x - 2, y - 2, 4, 2.5, .4, 0, 4); ctx.stroke();
      ctx.fillStyle = 'rgba(30,35,31,.8)';
      ctx.beginPath(); ctx.moveTo(x - 2, y - 8); ctx.lineTo(x + 2, y - 10); ctx.lineTo(x + 1, y - 5); ctx.closePath(); ctx.fill();
    }
    // botella
    ctx.fillStyle = 'rgba(94,113,96,.45)'; rr(ctx, w * .08, h * .72, 4, 8, 1.5); ctx.fill();
  };

  D.bike = function (ctx, w, h) {
    shadowBase(ctx, 2, 3, w - 4, h);
    ctx.strokeStyle = 'rgba(91,103,94,.8)'; ctx.lineWidth = 1.8;
    for (const x of [w * .2, w * .78]) { ctx.beginPath(); ctx.arc(x, h * .7, h * .19, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(147,161,148,.4)'; ctx.lineWidth = .8;
    for (const x of [w * .2, w * .78]) { ctx.beginPath(); ctx.arc(x, h * .7, h * .13, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(113,82,55,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * .2, h * .7); ctx.lineTo(w * .45, h * .42); ctx.lineTo(w * .78, h * .7); ctx.lineTo(w * .52, h * .7); ctx.lineTo(w * .45, h * .42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * .52, h * .7); ctx.lineTo(w * .6, h * .36); ctx.lineTo(w * .78, h * .7); ctx.stroke();
    ctx.fillStyle = '#2b2620'; ctx.fillRect(w * .56, h * .3, 13, 3);
    ctx.fillStyle = 'rgba(180,178,156,.35)'; ctx.fillRect(w * .6, h * .34, 2, 2);
  };

  D.hydrant = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h);
    const g = ctx.createLinearGradient(w * .3, 0, w * .8, 0);
    g.addColorStop(0, '#5b2e24'); g.addColorStop(.5, '#7e4030'); g.addColorStop(1, '#3b221c');
    ctx.fillStyle = g;
    U.roundRect(ctx, w * .3, h * .2, w * .4, h * .7, 5); ctx.fill();
    ctx.fillStyle = '#6c3628';
    U.ellipse(ctx, w * .5, h * .18, w * .28, h * .1); ctx.fill();
    ctx.fillStyle = '#3f241e'; ctx.fillRect(w * .1, h * .42, w * .8, h * .1);
    ctx.fillStyle = '#7e4b33'; ctx.beginPath(); ctx.arc(w * .5, h * .05, w * .20, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(222,196,151,.15)'; ctx.fillRect(w * .42, h * .22, 2, h * .55);
  };

  D.cones = function (ctx, w, h, o) {
    const n = o.n || 1;
    for (let i = 0; i < n; i++) {
      const x = w * (.2 + i * .5), y = h * (.35 + (i % 2) * .2);
      ctx.fillStyle = 'rgba(8,9,8,.3)'; U.ellipse(ctx, x, y + h * .25, w * .3, h * .12); ctx.fill();
      ctx.fillStyle = 'rgba(139,76,48,.7)';
      ctx.beginPath(); ctx.moveTo(x, y - h * .2); ctx.lineTo(x + w * .18, y + h * .26); ctx.lineTo(x - w * .18, y + h * .26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(210,201,176,.52)'; ctx.fillRect(x - w * .12, y + h * .04, w * .24, h * .06);
      ctx.fillStyle = 'rgba(37,28,22,.8)'; ctx.fillRect(x - w * .25, y + h * .26, w * .5, h * .06);
    }
  };

  D.newsbox = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h);
    ctx.fillStyle = '#32433b'; rr(ctx, 3, h * .13, w - 6, h * .8, 2); ctx.fill();
    metal(ctx, 5, h * .16, w - 10, h * .72, 121, 'rgba(50,76,61,.3)');
    ctx.fillStyle = 'rgba(20,28,23,.8)'; rr(ctx, 8, h * .22, w - 16, h * .3, 2); ctx.fill();
    ctx.fillStyle = 'rgba(199,190,159,.35)'; ctx.fillRect(w * .18, h * .34, w * .5, h * .03);
    ctx.fillStyle = 'rgba(202,190,160,.28)'; ctx.font = '5px monospace'; ctx.fillText('PRENSA', w * .2, h * .2);
    ctx.fillStyle = '#1e2a24'; ctx.fillRect(w * .35, h * .62, w * .3, h * .12);
    ctx.fillStyle = 'rgba(161,166,140,.25)'; ctx.fillRect(w * .37, h * .63, w * .26, 1.4);
  };

  D.mailbox = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h);
    ctx.fillStyle = '#2d3530'; ctx.fillRect(w * .4, h * .35, w * .2, h * .64);
    ctx.fillStyle = '#3b4a40'; U.roundRect(ctx, w * .1, h * .05, w * .8, h * .42, 5); ctx.fill();
    metal(ctx, w * .12, h * .08, w * .76, h * .34, 131, 'rgba(59,81,69,.25)');
    ctx.fillStyle = 'rgba(14,18,16,.8)'; ctx.fillRect(w * .2, h * .16, w * .6, h * .05);
    ctx.fillStyle = 'rgba(199,190,162,.28)'; ctx.font = '5px monospace'; ctx.fillText('CORREOS', w * .3, h * .33);
    ctx.fillStyle = 'rgba(170,65,45,.5)'; ctx.fillRect(w * .78, h * .1, 2.5, h * .1);
  };

  D.barrier = function (ctx, w, h, o) {
    shadowBase(ctx, 2, 2, w - 4, h);
    ctx.fillStyle = '#2b2922'; ctx.fillRect(w * .12, h * .26, 3, h * .7); ctx.fillRect(w * .85, h * .26, 3, h * .7);
    ctx.fillStyle = o.color || '#5d4b32';
    ctx.fillRect(w * .05, h * .16, w * .9, h * .24);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(213,202,170,.45)' : 'rgba(99,56,40,.55)';
      ctx.beginPath(); ctx.moveTo(w * .03 + i * w * .13, h * .16); ctx.lineTo(w * .09 + i * w * .13, h * .16); ctx.lineTo(w * .04 + i * w * .13, h * .4); ctx.lineTo(w * -.02 + i * w * .13, h * .4); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(16,14,10,.6)'; ctx.strokeRect(w * .05, h * .16, w * .9, h * .24);
    ctx.fillStyle = 'rgba(186,177,147,.22)'; ctx.font = '5px monospace'; ctx.fillText('CERRADO', w * .4, h * .31);
  };

  D.planter = function (ctx, w, h, o) {
    shadowBase(ctx, 3, 3, w - 8, h);
    ctx.fillStyle = '#3a3931'; rr(ctx, 4, h * .35, w - 8, h * .58, 3); ctx.fill();
    ctx.fillStyle = 'rgba(76,74,61,.7)'; ctx.fillRect(6, h * .37, w - 12, h * .1);
    const rng = seeded('planter' + (o.seed || 8));
    for (let i = 0; i < 24; i++) {
      const x = 8 + rng() * (w - 16), y = h * .38 - rng() * h * .3;
      ctx.strokeStyle = `rgba(${43 + rng() * 35 | 0},${52 + rng() * 30 | 0},${32 + rng() * 20 | 0},${.35 + rng() * .3})`;
      ctx.lineWidth = .8 + rng() * 1.2;
      ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.quadraticCurveTo(x + 4, y + 4, x + (rng() - .5) * 8, y - 4); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(15,13,10,.35)'; U.ellipse(ctx, w / 2, h * .46, w * .32, 3); ctx.fill();
  };

  D.cart = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h);
    ctx.strokeStyle = 'rgba(130,140,126,.55)'; ctx.lineWidth = 1.2;
    ctx.strokeRect(w * .14, h * .2, w * .6, h * .5);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(w * .18 + i * w * .15, h * .22); ctx.lineTo(w * .18 + i * w * .15, h * .68); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(w * .74, h * .2); ctx.lineTo(w * .9, h * .12); ctx.stroke();
    ctx.fillStyle = 'rgba(17,20,18,.7)';
    for (const x of [w * .22, w * .68]) { ctx.beginPath(); ctx.arc(x, h * .76, 3, 0, 7); ctx.fill(); }
    // bolsa dentro
    ctx.fillStyle = 'rgba(41,47,40,.8)'; U.ellipse(ctx, w * .38, h * .38, w * .14, h * .12); ctx.fill();
  };

  D.wardrobe = function (ctx, w, h, o) {
    shadowBase(ctx, 3, 3, w - 6, h + 4);
    const seed = o.seed || 7;
    ctx.fillStyle = '#221a13';
    rr(ctx, 3, 4, w - 6, h - 8, 2); ctx.fill();
    const g = ctx.createLinearGradient(0, 4, 0, h - 4);
    g.addColorStop(0, '#4a3b2b'); g.addColorStop(.55, '#33291f'); g.addColorStop(1, '#191511');
    ctx.fillStyle = g; rr(ctx, 6, 7, w - 12, h - 14, 1.5); ctx.fill();
    wood(ctx, 8, 10, w - 16, h - 22, 'dark', seed, .55);
    // moldura superior e inferior
    ctx.fillStyle = 'rgba(88,70,49,.75)';
    ctx.fillRect(4, 4, w - 8, 4); ctx.fillRect(4, h - 9, w - 8, 4);
    // dos puertas
    ctx.strokeStyle = 'rgba(15,12,9,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w / 2, 12); ctx.lineTo(w / 2, h - 13); ctx.stroke();
    ctx.strokeStyle = 'rgba(182,158,116,.13)';
    ctx.strokeRect(8.5, 12.5, w / 2 - 10, h - 27);
    ctx.strokeRect(w / 2 + 1.5, 12.5, w / 2 - 10, h - 27);
    // pomos
    ctx.fillStyle = 'rgba(190,160,107,.5)';
    ctx.beginPath(); ctx.arc(w / 2 - 4, h * .53, 1.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2 + 4, h * .53, 1.6, 0, 7); ctx.fill();
    // friso y desgaste
    ctx.fillStyle = 'rgba(194,172,131,.08)'; ctx.fillRect(10, h * .14, w - 20, 1);
    for (let i = 0; i < 6; i++) {
      const rng = seeded('wardrobe' + seed + i);
      ctx.fillStyle = `rgba(10,8,6,${.03 + rng() * .06})`;
      U.ellipse(ctx, 10 + rng() * (w - 20), 16 + rng() * (h - 32), 2 + rng() * 5, 1 + rng() * 3); ctx.fill();
    }
  };

  D.coat = function (ctx, w, h, o) {
    // percha y abrigo colgado en la pared
    ctx.strokeStyle = 'rgba(152,132,97,.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(w * .18, 4); ctx.lineTo(w * .82, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * .5, 4); ctx.lineTo(w * .5, 10); ctx.stroke();
    ctx.fillStyle = 'rgba(158,143,111,.55)';
    ctx.beginPath(); ctx.arc(w * .5, 8, 1.6, 0, 7); ctx.fill();
    const seed = o.seed || 9;
    // hombros caídos y cuerpo de lana
    const g = ctx.createLinearGradient(0, 8, 0, h - 2);
    g.addColorStop(0, '#465044'); g.addColorStop(.45, '#2f3a33'); g.addColorStop(1, '#171d1a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w * .28, 11);
    ctx.quadraticCurveTo(w * .08, 22, w * .14, 38);
    ctx.lineTo(w * .18, h - 6);
    ctx.quadraticCurveTo(w * .5, h + 1, w * .82, h - 6);
    ctx.lineTo(w * .86, 38);
    ctx.quadraticCurveTo(w * .92, 22, w * .72, 11);
    ctx.quadraticCurveTo(w * .5, 17, w * .28, 11);
    ctx.closePath(); ctx.fill();
    // cuello
    ctx.fillStyle = '#1e2621';
    ctx.beginPath(); ctx.ellipse(w * .5, 12, w * .2, 4, 0, 0, 7); ctx.fill();
    // pliegues húmedos
    ctx.strokeStyle = 'rgba(137,153,135,.13)'; ctx.lineWidth = .8;
    for (let i = 0; i < 5; i++) {
      const x = w * .26 + i * w * .12;
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.quadraticCurveTo(x - 4, h * .55, x + 2, h - 10); ctx.stroke();
    }
    // botones
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = 'rgba(21,25,22,.8)';
      ctx.beginPath(); ctx.arc(w * .5, 28 + i * 13, 1.5, 0, 7); ctx.fill();
    }
    // bolsillo
    ctx.strokeStyle = 'rgba(14,18,16,.5)';
    ctx.strokeRect(w * .58, h * .55, w * .17, 1);
    for (let i = 0; i < 8; i++) {
      const rng = seeded('coat' + seed + i);
      ctx.fillStyle = `rgba(10,13,11,${.03 + rng() * .08})`;
      U.ellipse(ctx, w * .18 + rng() * w * .64, 16 + rng() * (h - 22), 1 + rng() * 3, 1 + rng() * 3); ctx.fill();
    }
  };

  P.register(D);
})();
