'use strict';
/* ============================================================
   Mobiliario procedural — sótano, aparatos y objetos pequeños
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U, Art = LM.Art, Tex = LM.Tex;
  const P = LM.Props;
  if (!P) throw new Error('props.js debe cargarse antes de props3.js');
  const T = P.tools;
  const { rr, wood, metal, cloth, edge, topLight, shadowBase, glow } = T;
  const seeded = (key) => U.rng('prop3-' + key);
  const D = {};

  D.workbench = function (ctx, w, h, o) {
    shadowBase(ctx, 3, 3, w - 6, h + 4);
    const seed = o.seed || 91;
    // tablero grueso
    ctx.fillStyle = '#2b2118'; rr(ctx, 1, h * .17, w - 2, h * .22, 2); ctx.fill();
    wood(ctx, 4, h * .15, w - 8, h * .2, 'dark', seed, .92);
    ctx.fillStyle = 'rgba(192,172,135,.08)'; ctx.fillRect(5, h * .16, w - 10, 1.5);
    ctx.strokeStyle = 'rgba(15,12,9,.55)'; ctx.lineWidth = 1; ctx.strokeRect(4.5, h * .15, w - 9, h * .2);
    // cajones y estantes
    ctx.fillStyle = '#221a13'; rr(ctx, 8, h * .38, w - 16, h * .48, 2); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const x = 12 + i * (w - 24) / 4;
      ctx.strokeStyle = 'rgba(174,149,108,.14)'; ctx.strokeRect(x + .5, h * .43, (w - 30) / 4, h * .16);
      ctx.fillStyle = 'rgba(176,155,112,.25)'; ctx.fillRect(x + (w - 30) / 8 - 2, h * .49, 5, 1.8);
      ctx.fillStyle = 'rgba(110,86,53,.25)'; ctx.fillRect(x + 2, h * .66, (w - 30) / 4 - 4, h * .1);
    }
    // patas
    ctx.fillStyle = '#1d1711'; ctx.fillRect(6, h * .86, 5, h * .11); ctx.fillRect(w - 11, h * .86, 5, h * .11);
    // herramientas
    const rng = seeded('bench' + seed + w);
    // tornillo de banco
    ctx.fillStyle = '#3e423b'; rr(ctx, w * .78, h * .06, 18, 10, 2); ctx.fill();
    ctx.fillStyle = '#64685b'; ctx.fillRect(w * .8, h * .08, 12, 2);
    ctx.fillStyle = '#282d29'; ctx.fillRect(w * .86, h * .14, 3, 9);
    // destornillador
    ctx.strokeStyle = 'rgba(176,166,139,.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(w * .18, h * .12); ctx.lineTo(w * .32, h * .18); ctx.stroke();
    ctx.fillStyle = '#5e3326'; ctx.beginPath(); ctx.arc(w * .18, h * .12, 2.5, 0, 7); ctx.fill();
    // papel / plano
    ctx.save(); ctx.translate(w * .48, h * .12); ctx.rotate(-.05);
    ctx.fillStyle = 'rgba(203,196,175,.5)'; ctx.fillRect(-20, -7, 40, 15);
    ctx.strokeStyle = 'rgba(68,55,40,.4)'; ctx.lineWidth = .6;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-16, -3 + i * 3); ctx.lineTo(16, -3 + i * 3); ctx.stroke(); }
    ctx.restore();
    // cable
    ctx.strokeStyle = 'rgba(15,17,15,.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(w * .6, h * .16); ctx.bezierCurveTo(w * .52, h * .05, w * .7, h * .03, w * .82, h * .1); ctx.stroke();
  };

  D.shelf = function (ctx, w, h, o) {
    shadowBase(ctx, 3, 3, w - 6, h);
    const shelves = o.shelves || 4;
    const seed = o.seed || 7;
    ctx.fillStyle = '#221c16'; rr(ctx, 3, 3, w - 6, h - 6, 2); ctx.fill();
    wood(ctx, 5, 5, w - 10, h - 10, 'dark', seed, .8);
    const rng = seeded('bshelf' + seed + w);
    for (let s = 0; s < shelves; s++) {
      const y = 8 + s * (h - 16) / shelves;
      ctx.fillStyle = 'rgba(25,19,14,.9)'; ctx.fillRect(5, y + (h - 16) / shelves - 3, w - 10, 2.5);
      let x = 8 + rng() * 4;
      while (x < w - 16) {
        if (rng() > .66) {
          // tarro
          ctx.fillStyle = `rgba(${100 + rng() * 40 | 0},${94 + rng() * 40 | 0},${70 + rng() * 30 | 0},${.22 + rng() * .2})`;
          const ww = 5 + rng() * 7, hh = 8 + rng() * 13;
          rr(ctx, x, y + (h - 16) / shelves - 5 - hh, ww, hh, 1.5); ctx.fill();
          ctx.fillStyle = 'rgba(210,202,172,.24)'; ctx.fillRect(x + 1, y + (h - 16) / shelves - 5 - hh + 2, ww - 2, 1.2);
          x += ww + 3;
        } else {
          ctx.fillStyle = 'rgba(51,42,31,.75)';
          ctx.fillRect(x, y + (h - 16) / shelves - 6 - 8 - rng() * 6, 9 + rng() * 8, 8 + rng() * 15);
          x += 12 + rng() * 8;
        }
      }
    }
    ctx.strokeStyle = 'rgba(156,134,97,.18)'; ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, w - 12, h - 12);
  };

  D.boiler = function (ctx, w, h, o) {
    shadowBase(ctx, 3, 3, w - 6, h);
    // cuerpo cilíndrico
    const g = ctx.createLinearGradient(w * .1, 0, w * .9, 0);
    g.addColorStop(0, '#252a24'); g.addColorStop(.35, '#4e5043'); g.addColorStop(.6, '#3c3e34'); g.addColorStop(1, '#161a16');
    ctx.fillStyle = g; U.roundRect(ctx, w * .12, h * .1, w * .76, h * .78, w * .16); ctx.fill();
    metal(ctx, w * .15, h * .14, w * .7, h * .7, o.seed || 55, 'rgba(57,64,53,.3)');
    // aros
    for (let i = 0; i < 4; i++) {
      const y = h * (.2 + i * .16);
      ctx.strokeStyle = 'rgba(14,17,14,.65)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(w / 2, y, w * .37, h * .018, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(186,180,148,.1)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(w / 2, y - 1, w * .37, h * .018, 0, 0, 7); ctx.stroke();
    }
    // tuberías
    ctx.strokeStyle = '#4b4d40'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w * .2, h * .16); ctx.lineTo(w * .2, h * .02); ctx.lineTo(w * .5, h * .02); ctx.stroke();
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(w * .78, h * .72); ctx.lineTo(w * .95, h * .72); ctx.lineTo(w * .95, h * .97); ctx.stroke();
    // válvula
    ctx.fillStyle = '#7e3e2b'; ctx.beginPath(); ctx.arc(w * .2, h * .06, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(192,185,152,.24)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w * .2, h * .06, 2, 0, 7); ctx.stroke();
    // indicador
    ctx.fillStyle = 'rgba(15,18,15,.9)'; ctx.beginPath(); ctx.arc(w * .55, h * .52, w * .14, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(170,163,129,.3)'; ctx.beginPath(); ctx.arc(w * .55, h * .52, w * .1, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(190,86,55,.5)'; ctx.beginPath(); ctx.moveTo(w * .55, h * .52); ctx.lineTo(w * .62, h * .44); ctx.stroke();
    // manchas de agua
    const rng = seeded('boiler' + (o.seed || 55) + w);
    for (let i = 0; i < 8; i++) Tex.softStain(ctx, w * (.2 + rng() * .6), h * (.2 + rng() * .65), 3 + rng() * 9, 2 + rng() * 5, '#5b4630', .07 + rng() * .05);
  };

  D.furnace = function (ctx, w, h, o) {
    shadowBase(ctx, 3, 3, w - 6, h);
    ctx.fillStyle = '#2a2721'; rr(ctx, 5, h * .08, w - 10, h * .83, 4); ctx.fill();
    metal(ctx, 8, h * .12, w - 16, h * .74, 62, 'rgba(61,57,48,.35)');
    // compuerta
    ctx.fillStyle = '#12100d'; rr(ctx, w * .2, h * .38, w * .6, h * .38, 3); ctx.fill();
    const fg = ctx.createRadialGradient(w / 2, h * .62, 1, w / 2, h * .62, w * .28);
    fg.addColorStop(0, 'rgba(207,116,53,.26)'); fg.addColorStop(.5, 'rgba(123,55,26,.12)'); fg.addColorStop(1, 'rgba(20,10,5,0)');
    ctx.fillStyle = fg; ctx.fillRect(w * .2, h * .38, w * .6, h * .38);
    ctx.strokeStyle = 'rgba(140,134,106,.25)'; ctx.lineWidth = 1; ctx.strokeRect(w * .21, h * .39, w * .58, h * .36);
    // rejillas
    for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(6,8,7,.8)'; ctx.fillRect(w * .26, h * .44 + i * h * .05, w * .48, 2); }
    // tubo
    ctx.strokeStyle = '#49483d'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(w * .34, h * .08); ctx.lineTo(w * .34, h * .01); ctx.lineTo(w + 4, h * .01); ctx.stroke();
    ctx.fillStyle = 'rgba(160,150,120,.15)'; ctx.fillRect(w * .08, h * .84, w * .84, 2);
    // óxido
    const rng = seeded('furnace' + w);
    for (let i = 0; i < 15; i++) { ctx.fillStyle = `rgba(${117 + rng() * 25 | 0},${72 + rng() * 20 | 0},${41 + rng() * 14 | 0},${.05 + rng() * .1})`; U.ellipse(ctx, w * (.1 + rng() * .8), h * (.1 + rng() * .8), 2 + rng() * 8, 1 + rng() * 3); ctx.fill(); }
  };

  D.generator = function (ctx, w, h, o) {
    shadowBase(ctx, 3, 3, w - 6, h);
    // base
    ctx.fillStyle = '#1c211d'; rr(ctx, 4, h * .62, w - 8, h * .28, 3); ctx.fill();
    // motor
    const g = ctx.createLinearGradient(0, h * .2, 0, h * .7);
    g.addColorStop(0, '#4b4032'); g.addColorStop(.55, '#2e2c25'); g.addColorStop(1, '#161a16');
    ctx.fillStyle = g; U.roundRect(ctx, w * .14, h * .18, w * .7, h * .46, 6); ctx.fill();
    metal(ctx, w * .16, h * .2, w * .66, h * .42, 81, 'rgba(68,58,43,.24)');
    // cilindro
    ctx.fillStyle = '#353831'; U.roundRect(ctx, w * .2, h * .03, w * .3, h * .2, 4); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = 'rgba(13,16,14,.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(w * .22, h * .06 + i * h * .03); ctx.lineTo(w * .48, h * .06 + i * h * .03); ctx.stroke(); }
    // volante / polea
    ctx.strokeStyle = 'rgba(125,120,99,.5)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(w * .8, h * .5, w * .12, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(163,155,126,.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const a = i / 6 * 7; ctx.beginPath(); ctx.moveTo(w * .8, h * .5); ctx.lineTo(w * .8 + Math.cos(a) * w * .11, h * .5 + Math.sin(a) * w * .11); ctx.stroke(); }
    // cables
    ctx.strokeStyle = 'rgba(12,15,13,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * .16, h * .55); ctx.bezierCurveTo(w * .0, h * .72, w * .26, h * .82, w * .12, h); ctx.stroke();
    // placa
    ctx.fillStyle = 'rgba(179,167,131,.25)'; ctx.fillRect(w * .2, h * .66, 18, 7);
    ctx.fillStyle = 'rgba(12,14,12,.8)'; ctx.font = '4px monospace'; ctx.fillText('NANA-04', w * .21, h * .705);
  };

  D.barrel = function (ctx, w, h, o) {
    shadowBase(ctx, 2, 2, w - 4, h);
    const g = ctx.createLinearGradient(w * .1, 0, w * .9, 0);
    g.addColorStop(0, '#2b2e26'); g.addColorStop(.4, '#555441'); g.addColorStop(.6, '#3d3e30'); g.addColorStop(1, '#181b16');
    ctx.fillStyle = g; U.roundRect(ctx, w * .12, h * .06, w * .76, h * .9, w * .18); ctx.fill();
    metal(ctx, w * .14, h * .1, w * .72, h * .82, 91 + (o.seed || 1), 'rgba(58,60,45,.2)');
    for (let i = 0; i < 3; i++) {
      const y = h * (.2 + i * .24);
      ctx.strokeStyle = 'rgba(14,16,13,.7)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(w / 2, y, w * .36, h * .022, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(178,165,124,.18)'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.ellipse(w / 2, y - 1, w * .36, h * .022, 0, 0, 7); ctx.stroke();
    }
    // gotera
    ctx.fillStyle = 'rgba(21,20,15,.4)'; U.ellipse(ctx, w * .4, h * .94, w * .2, h * .03); ctx.fill();
    const rng = seeded('barrel' + w + (o.seed || 1));
    for (let i = 0; i < 7; i++) { ctx.fillStyle = `rgba(${117 + rng() * 25 | 0},${70 + rng() * 15 | 0},${39 + rng() * 10 | 0},${.05 + rng() * .11})`; U.ellipse(ctx, w * (.2 + rng() * .6), h * (.1 + rng() * .75), 1 + rng() * 5, 1 + rng() * 2); ctx.fill(); }
  };

  D.pipe = function (ctx, w, h, o) {
    const vertical = o.vertical !== false;
    if (vertical) {
      const g = ctx.createLinearGradient(w * .3, 0, w * .8, 0);
      g.addColorStop(0, '#2b2d27'); g.addColorStop(.4, '#5b5a49'); g.addColorStop(1, '#1c1f1b');
      ctx.fillStyle = g; ctx.fillRect(w * .35, 0, w * .3, h);
      for (let i = 0; i < Math.max(2, h / 70); i++) {
        const y = i * 70 + 20;
        ctx.fillStyle = '#474a3c'; ctx.fillRect(w * .28, y, w * .44, 8);
        ctx.fillStyle = 'rgba(186,177,143,.15)'; ctx.fillRect(w * .3, y + 1, w * .4, 1.5);
      }
    } else {
      ctx.fillStyle = '#3b3e34'; ctx.fillRect(0, h * .35, w, h * .3);
      ctx.fillStyle = 'rgba(184,176,145,.12)'; ctx.fillRect(0, h * .37, w, 1.2);
    }
    if (o.valve) {
      ctx.strokeStyle = '#7d4430'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(w * .5, h * .5, w * .2, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * .5 - w * .2, h * .5); ctx.lineTo(w * .5 + w * .2, h * .5); ctx.stroke();
    }
  };

  D.hanging = function (ctx, w, h, o) {
    // lámpara colgante con cadena y sombra
    ctx.strokeStyle = 'rgba(24,27,24,.9)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h * .35); ctx.stroke();
    const g = ctx.createLinearGradient(0, h * .35, 0, h * .62);
    g.addColorStop(0, '#332e22'); g.addColorStop(1, '#171510');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(w * .2, h * .62); ctx.lineTo(w * .3, h * .34); ctx.lineTo(w * .7, h * .34); ctx.lineTo(w * .8, h * .62); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(182,164,121,.18)'; ctx.lineWidth = .8; ctx.stroke();
    // bombilla
    ctx.fillStyle = 'rgba(255,214,145,.75)'; ctx.beginPath(); ctx.arc(w / 2, h * .62, 3, 0, 7); ctx.fill();
    if (o.on !== false) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; glow(ctx, w / 2, h * .65, w * 1.3, '#d79a51', .24); ctx.restore();
    }
  };

  D.candle = function (ctx, w, h, o) {
    shadowBase(ctx, w * .2, 2, w * .6, h, 3);
    ctx.fillStyle = 'rgba(197,187,160,.55)';
    U.roundRect(ctx, w * .34, 3, w * .32, h * .8, 2); ctx.fill();
    ctx.fillStyle = 'rgba(230,221,198,.4)'; ctx.fillRect(w * .38, 5, 2, h * .65);
    // cera derretida
    ctx.fillStyle = 'rgba(204,195,169,.3)';
    U.ellipse(ctx, w * .5, h * .76, w * .28, h * .09); ctx.fill();
    if (o.lit !== false) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; glow(ctx, w / 2, h * .12, w * .7, '#e7aa5e', .35); ctx.restore();
      const fg = ctx.createRadialGradient(w / 2, h * .12, .5, w / 2, h * .12, 5);
      fg.addColorStop(0, '#fff0c7'); fg.addColorStop(.45, '#ffb466'); fg.addColorStop(1, 'rgba(205,85,32,0)');
      ctx.fillStyle = fg; U.ellipse(ctx, w / 2, h * .13, 3, 6); ctx.fill();
    }
  };

  D.transmitter = function (ctx, w, h, o) {
    shadowBase(ctx, 4, 4, w - 8, h + 4);
    // rack
    ctx.fillStyle = '#1e211e'; rr(ctx, 3, 4, w - 6, h - 8, 3); ctx.fill();
    metal(ctx, 5, 6, w - 10, h - 12, 111, 'rgba(48,59,51,.3)');
    // paneles
    for (let i = 0; i < 3; i++) {
      const y = 10 + i * (h - 30) / 3;
      ctx.fillStyle = 'rgba(11,15,13,.8)'; rr(ctx, 9, y, w - 18, h * .2, 2); ctx.fill();
      // diales
      for (let j = 0; j < 5; j++) {
        const x = 14 + j * (w - 34) / 4;
        ctx.fillStyle = 'rgba(90,82,61,.5)'; ctx.beginPath(); ctx.arc(x + 4, y + h * .1, 3.4, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(196,185,151,.3)'; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(x + 4, y + h * .1); ctx.lineTo(x + 8, y + h * .07); ctx.stroke();
      }
      // agujas
      ctx.strokeStyle = 'rgba(136,178,160,.35)'; ctx.lineWidth = .7;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) { const xx = 12 + k * (w - 24) / 10; k ? ctx.lineTo(xx, y + h * .15 + Math.sin(k * 1.7) * 2) : ctx.moveTo(xx, y + h * .15 + Math.sin(k * 1.7) * 2); }
      ctx.stroke();
    }
    // rejilla altavoz
    ctx.fillStyle = 'rgba(12,15,13,.72)'; rr(ctx, 10, h * .78, w * .35, h * .15, 2); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = 'rgba(169,159,129,.2)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(13, h * .8 + i * h * .024); ctx.lineTo(w * .37, h * .8 + i * h * .024); ctx.stroke(); }
    // LED
    ctx.fillStyle = 'rgba(197,91,57,.7)'; ctx.beginPath(); ctx.arc(w * .78, h * .84, 1.8, 0, 7); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'screen'; glow(ctx, w * .78, h * .84, 10, '#bb5c35', .2); ctx.restore();
    // antena
    ctx.strokeStyle = '#6e6a55'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(w * .86, 4); ctx.lineTo(w * .86, h * .2); ctx.stroke();
  };

  D.mic = function (ctx, w, h) {
    shadowBase(ctx, w * .2, 2, w * .6, h);
    // base y pie
    ctx.fillStyle = '#21231f'; U.ellipse(ctx, w / 2, h - 4, w * .34, 4); ctx.fill();
    ctx.strokeStyle = '#5a5849'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(w / 2, h * .22); ctx.lineTo(w / 2, h - 7); ctx.stroke();
    // cabezal
    const g = ctx.createLinearGradient(w * .2, 0, w * .8, 0);
    g.addColorStop(0, '#596056'); g.addColorStop(.5, '#8b8b77'); g.addColorStop(1, '#3a3f38');
    ctx.fillStyle = g; U.roundRect(ctx, w * .2, 3, w * .6, h * .27, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(15,18,15,.55)';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(w * .22 + i * w * .14, 5); ctx.lineTo(w * .22 + i * w * .14, h * .26); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(216,208,181,.18)'; ctx.lineWidth = 1; ctx.strokeRect(w * .21, 4, w * .58, h * .24);
    // rejilla
    ctx.fillStyle = 'rgba(14,17,14,.7)'; rr(ctx, w * .28, h * .09, w * .44, h * .11, 3); ctx.fill();
    ctx.strokeStyle = '#5f655a'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(w * .5, h * .3); ctx.lineTo(w * .5, h * .38); ctx.stroke();
    ctx.fillStyle = '#3c413a'; ctx.beginPath(); ctx.arc(w * .5, h * .4, 3, 0, 7); ctx.fill();
  };

  D.stool = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h);
    ctx.fillStyle = '#2a2118';
    for (let i = 0; i < 3; i++) {
      const x = w * (.2 + i * .3);
      ctx.save(); ctx.translate(x, h * .5); ctx.rotate((i - 1) * .15);
      ctx.fillRect(-1.5, 0, 3, h * .45); ctx.restore();
    }
    ctx.fillStyle = '#3c3022'; U.ellipse(ctx, w / 2, h * .35, w * .35, h * .16); ctx.fill();
    wood(ctx, w * .17, h * .22, w * .66, h * .22, 'furniture', 17, .5);
    ctx.strokeStyle = 'rgba(190,169,126,.15)'; ctx.beginPath(); ctx.ellipse(w / 2, h * .35, w * .3, h * .13); ctx.stroke();
  };

  D.reelrec = function (ctx, w, h) {
    // magnetófono antiguo de dos pistas
    shadowBase(ctx, 3, 3, w - 6, h);
    ctx.fillStyle = '#25231c'; rr(ctx, 2, 4, w - 4, h - 8, 3); ctx.fill();
    wood(ctx, 4, 6, w - 8, h - 12, 'furniture', 33, .55);
    ctx.fillStyle = '#1a201c'; rr(ctx, 10, 9, w - 20, h - 20, 2); ctx.fill();
    for (const x of [w * .32, w * .68]) {
      ctx.fillStyle = '#111411'; ctx.beginPath(); ctx.arc(x, h * .36, w * .13, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(172,160,127,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, h * .36, w * .1, 0, 7); ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = i / 8 * 7; ctx.strokeStyle = 'rgba(128,115,87,.35)'; ctx.beginPath(); ctx.moveTo(x, h * .36); ctx.lineTo(x + Math.cos(a) * w * .08, h * .36 + Math.sin(a) * w * .08); ctx.stroke(); }
    }
    ctx.strokeStyle = 'rgba(90,74,50,.7)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(w * .32, h * .23); ctx.quadraticCurveTo(w / 2, h * .18, w * .68, h * .23); ctx.stroke();
    ctx.fillStyle = '#141712'; ctx.fillRect(12, h * .6, w - 24, h * .13);
    ctx.fillStyle = 'rgba(197,184,146,.3)';
    for (let i = 0; i < 4; i++) ctx.fillRect(w * .2 + i * w * .17, h * .62, 2, 5);
    ctx.fillStyle = 'rgba(199,187,152,.35)'; ctx.fillRect(w * .16, h * .79, w * .26, 1.4);
    ctx.fillStyle = 'rgba(166,82,52,.6)'; ctx.beginPath(); ctx.arc(w * .8, h * .79, 1.7, 0, 7); ctx.fill();
  };

  D.laundry = function (ctx, w, h, o) {
    shadowBase(ctx, 3, 3, w - 6, h);
    // montón de ropa
    const rng = seeded('laundry' + (o.seed || 4) + w);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(${52 + rng() * 45 | 0},${48 + rng() * 35 | 0},${43 + rng() * 25 | 0},${.3 + rng() * .35})`;
      U.ellipse(ctx, w * (.18 + rng() * .64), h * (.25 + rng() * .65), 6 + rng() * 18, 4 + rng() * 10, rng() * 3); ctx.fill();
    }
    // cuerda y pinzas
    ctx.strokeStyle = 'rgba(28,27,22,.65)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * .08, h * .2); ctx.quadraticCurveTo(w / 2, h * .43, w * .92, h * .15); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const x = w * (.2 + i * .25), y = h * (.27 + (i % 2) * .03);
      ctx.fillStyle = 'rgba(123,116,98,.5)'; ctx.fillRect(x, y, 2, 5);
      ctx.fillStyle = 'rgba(83,76,60,.55)'; ctx.fillRect(x - 1, y + 3, 4, 2);
    }
  };

  D.sink = function (ctx, w, h) {
    shadowBase(ctx, 3, 3, w - 6, h);
    ctx.fillStyle = '#2e312b'; rr(ctx, 3, h * .15, w - 6, h * .8, 3); ctx.fill();
    metal(ctx, 5, h * .18, w - 10, h * .7, 77, 'rgba(58,67,57,.3)');
    ctx.fillStyle = '#1c211d'; U.roundRect(ctx, w * .2, h * .18, w * .6, h * .18, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(166,173,151,.25)'; ctx.lineWidth = 1; ctx.strokeRect(w * .21, h * .19, w * .58, h * .16);
    ctx.strokeStyle = '#71776a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * .5, h * .17); ctx.lineTo(w * .5, h * .07); ctx.lineTo(w * .62, h * .07); ctx.stroke();
    // grifos
    ctx.fillStyle = '#60665b'; ctx.fillRect(w * .3, h * .08, 3, 8); ctx.fillRect(w * .7, h * .08, 3, 8);
    // azulejos y manchas
    ctx.strokeStyle = 'rgba(16,20,17,.6)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(5, h * (.48 + i * .1)); ctx.lineTo(w - 5, h * (.48 + i * .1)); ctx.stroke(); }
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(w * (.15 + i * .18), h * .42); ctx.lineTo(w * (.15 + i * .18), h * .92); ctx.stroke(); }
  };

  D.fusebox = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h, 2);
    ctx.fillStyle = '#3b3f37'; rr(ctx, 3, 2, w - 6, h - 4, 2); ctx.fill();
    metal(ctx, 5, 4, w - 10, h - 8, 88, 'rgba(70,73,62,.3)');
    ctx.strokeStyle = 'rgba(14,17,14,.65)'; ctx.strokeRect(8, 7, w - 16, h - 14);
    // interruptores
    for (let i = 0; i < 8; i++) {
      const x = 12 + (i % 4) * (w - 24) / 4;
      const y = 12 + ((i / 4) | 0) * (h - 24) / 2;
      ctx.fillStyle = i === 3 ? 'rgba(159,79,48,.7)' : 'rgba(35,38,32,.9)';
      ctx.fillRect(x, y, 4, 10);
    }
    ctx.fillStyle = 'rgba(185,172,135,.25)'; ctx.fillRect(w * .2, h * .72, w * .6, 1);
  };

  D.irondoor = function (ctx, w, h, o) {
    // puerta metálica vista de frente en el muro
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#1b201d'); g.addColorStop(.5, '#353b34'); g.addColorStop(1, '#151a17');
    ctx.fillStyle = g; rr(ctx, 2, 2, w - 4, h - 4, 2); ctx.fill();
    metal(ctx, 4, 4, w - 8, h - 8, 96, 'rgba(48,56,49,.2)');
    ctx.strokeStyle = 'rgba(10,13,11,.72)'; ctx.lineWidth = 2; ctx.strokeRect(7, 7, w - 14, h - 14);
    // remaches
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(157,155,129,.3)';
      for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(10 + j * (w - 20) / 2, 10 + i * (h - 20) / 3, 1.1, 0, 7); ctx.fill(); }
    }
    // mirilla y placa
    ctx.fillStyle = '#20251f'; ctx.beginPath(); ctx.arc(w * .5, h * .26, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(176,170,140,.26)'; ctx.beginPath(); ctx.arc(w * .5, h * .26, 6.5, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(173,163,129,.26)'; ctx.fillRect(w * .32, h * .45, w * .36, h * .1);
    ctx.fillStyle = 'rgba(14,17,14,.72)'; ctx.font = '5px monospace'; ctx.fillText('SÓTANO', w * .4, h * .51);
    // palanca / cerradura
    ctx.fillStyle = '#4a3e2c'; ctx.fillRect(w - 22, h * .55, 4, 12);
    ctx.fillStyle = '#8e7450'; ctx.beginPath(); ctx.arc(w - 20, h * .55, 3.5, 0, 7); ctx.fill();
    // óxido
    const rng = seeded('irondoor' + (o.seed || 1) + w);
    for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(${106 + rng() * 30 | 0},${65 + rng() * 20 | 0},${38 + rng() * 12 | 0},${.06 + rng() * .1})`; U.ellipse(ctx, w * (.1 + rng() * .8), h * (.1 + rng() * .8), 1 + rng() * 5, 1 + rng() * 2); ctx.fill(); }
  };

  /* ---------------- objetos pequeños ---------------- */
  D.oilcan = function (ctx, w, h) {
    shadowBase(ctx, w * .2, 2, w * .6, h, 3);
    ctx.fillStyle = '#3f4338'; rr(ctx, w * .22, h * .2, w * .56, h * .7, 3); ctx.fill();
    metal(ctx, w * .25, h * .23, w * .5, h * .64, 11, 'rgba(62,67,52,.2)');
    ctx.fillStyle = '#2c2e27'; ctx.fillRect(w * .36, h * .1, w * .28, h * .12);
    ctx.fillStyle = '#8b7951'; ctx.fillRect(w * .38, h * .08, w * .24, 3);
    ctx.strokeStyle = '#2f332d'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(w * .72, h * .17); ctx.lineTo(w * .88, h * .05); ctx.stroke();
    ctx.fillStyle = 'rgba(207,196,163,.45)'; ctx.fillRect(w * .32, h * .42, w * .36, 2);
    ctx.fillStyle = 'rgba(52,45,32,.5)'; ctx.font = '4px monospace'; ctx.fillText('ACEITE', w * .36, h * .55);
  };

  D.tuningfork = function (ctx, w, h) {
    shadowBase(ctx, w * .2, 2, w * .6, h, 3);
    ctx.strokeStyle = '#b6995e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w * .5, h * .9); ctx.lineTo(w * .5, h * .42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * .5, h * .42); ctx.bezierCurveTo(w * .5, h * .15, w * .26, h * .12, w * .3, h * .06); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * .5, h * .42); ctx.bezierCurveTo(w * .5, h * .15, w * .74, h * .12, w * .7, h * .06); ctx.stroke();
    ctx.fillStyle = '#5a4a2d'; ctx.font = 'italic 6px Georgia'; ctx.fillText('L.', w * .55, h * .78);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; glow(ctx, w / 2, h * .2, w * .5, '#d5b474', .15); ctx.restore();
  };

  D.cassette = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h, 3);
    ctx.fillStyle = '#373a32'; rr(ctx, 2, h * .18, w - 4, h * .66, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(181,168,133,.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(4, h * .22, w - 8, h * .56);
    ctx.fillStyle = 'rgba(207,197,171,.55)'; ctx.fillRect(w * .12, h * .27, w * .76, h * .2);
    ctx.fillStyle = 'rgba(53,45,33,.5)'; ctx.font = '3.5px monospace'; ctx.fillText('PRUEBA DE VOZ', w * .16, h * .33);
    ctx.fillText('18-N  M-07', w * .16, h * .39);
    ctx.fillStyle = '#151713';
    ctx.beginPath(); ctx.arc(w * .35, h * .61, w * .1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(w * .65, h * .61, w * .1, 0, 7); ctx.fill();
    ctx.fillStyle = '#8c8169';
    ctx.beginPath(); ctx.arc(w * .35, h * .61, w * .045, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(w * .65, h * .61, w * .045, 0, 7); ctx.fill();
    ctx.fillStyle = '#b5a678'; ctx.beginPath(); ctx.arc(w * .8, h * .26, 1.3, 0, 7); ctx.fill();
  };

  D.key = function (ctx, w, h) {
    shadowBase(ctx, w * .2, 2, w * .6, h, 3);
    ctx.strokeStyle = '#c2a56c'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(w * .42, h * .82); ctx.lineTo(w * .42, h * .27); ctx.stroke();
    ctx.beginPath(); ctx.arc(w * .42, h * .19, w * .15, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#c2a56c'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(w * .42, h * .8); ctx.lineTo(w * .65, h * .8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * .42, h * .9); ctx.lineTo(w * .58, h * .9); ctx.stroke();
    ctx.fillStyle = '#cbb47e'; ctx.font = '3.5px monospace'; ctx.fillText('91.7', w * .34, h * .38);
  };

  D.photo = function (ctx, w, h) {
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-.06);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-w * .46, -h * .4 + 2, w * .92, h * .8);
    ctx.fillStyle = '#d0c6ae'; ctx.fillRect(-w * .46, -h * .4, w * .92, h * .8);
    ctx.fillStyle = '#1c2521'; ctx.fillRect(-w * .38, -h * .32, w * .76, h * .52);
    const g = ctx.createLinearGradient(-w * .4, -h * .3, w * .3, h * .2);
    g.addColorStop(0, '#48584f'); g.addColorStop(.5, '#25312c'); g.addColorStop(1, '#131c18');
    ctx.fillStyle = g; ctx.fillRect(-w * .37, -h * .31, w * .74, h * .5);
    ctx.fillStyle = 'rgba(196,189,168,.35)'; ctx.fillRect(-w * .3, h * .08, w * .62, h * .06);
    ctx.fillStyle = 'rgba(171,165,148,.28)'; U.ellipse(ctx, -w * .04, -h * .08, w * .13, h * .17, .2); ctx.fill();
    ctx.fillStyle = 'rgba(222,213,191,.35)'; ctx.font = '3px monospace'; ctx.fillText('03:47', -w * .28, h * .24);
    ctx.restore();
  };

  D.note = function (ctx, w, h) {
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-.08);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-w * .44 + 1, -h * .4 + 2, w * .88, h * .8);
    ctx.fillStyle = 'rgba(211,203,184,.72)'; ctx.fillRect(-w * .44, -h * .4, w * .88, h * .8);
    ctx.fillStyle = 'rgba(75,64,48,.45)';
    for (let i = 0; i < 6; i++) ctx.fillRect(-w * .34, -h * .25 + i * h * .1, w * .5 - (i % 3) * w * .08, 1);
    ctx.restore();
  };

  D.lighter = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h, 3);
    ctx.fillStyle = '#78643f'; rr(ctx, w * .28, h * .25, w * .44, h * .6, 2); ctx.fill();
    ctx.fillStyle = '#2b2a24'; ctx.fillRect(w * .3, h * .18, w * .4, h * .08);
    ctx.fillStyle = '#9b854f'; ctx.fillRect(w * .33, h * .14, w * .34, 3);
    ctx.fillStyle = 'rgba(36,29,21,.75)'; ctx.font = 'italic 6px Georgia'; ctx.fillText('L', w * .45, h * .6);
    ctx.fillStyle = 'rgba(238,164,87,.7)'; ctx.beginPath(); ctx.arc(w * .68, h * .13, 1.4, 0, 7); ctx.fill();
  };

  D.plate = function (ctx, w, h) {
    ctx.fillStyle = 'rgba(182,173,148,.32)'; U.ellipse(ctx, w / 2, h / 2, w * .36, h * .2); ctx.fill();
    ctx.strokeStyle = 'rgba(213,203,174,.26)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * .3, h * .15); ctx.stroke();
    ctx.fillStyle = 'rgba(54,43,29,.35)'; U.ellipse(ctx, w * .5, h * .49, w * .15, h * .09); ctx.fill();
  };

  D.cup = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h, 3);
    ctx.fillStyle = 'rgba(151,145,123,.55)'; rr(ctx, w * .28, h * .2, w * .4, h * .55, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(151,145,123,.55)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(w * .74, h * .45, w * .12, -1.1, 1.1); ctx.stroke();
    ctx.fillStyle = 'rgba(66,49,30,.45)'; U.ellipse(ctx, w * .48, h * .28, w * .17, h * .05); ctx.fill();
  };

  D.syringe = function (ctx, w, h) {
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-.5);
    ctx.fillStyle = 'rgba(178,190,171,.35)'; ctx.fillRect(-w * .3, -1, w * .55, 2);
    ctx.fillStyle = 'rgba(99,122,111,.55)'; ctx.fillRect(-w * .3, -2, w * .2, 4);
    ctx.strokeStyle = 'rgba(187,196,176,.5)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(w * .25, 0); ctx.lineTo(w * .42, 0); ctx.stroke();
    ctx.restore();
  };

  D.bottle = function (ctx, w, h) {
    shadowBase(ctx, 2, 2, w - 4, h, 3);
    ctx.fillStyle = 'rgba(81,105,88,.4)'; U.roundRect(ctx, w * .28, h * .18, w * .44, h * .72, 3); ctx.fill();
    ctx.fillStyle = 'rgba(52,66,55,.7)'; ctx.fillRect(w * .4, h * .07, w * .2, h * .14);
    ctx.fillStyle = 'rgba(197,187,155,.25)'; ctx.fillRect(w * .34, h * .28, 1.5, h * .5);
    ctx.fillStyle = 'rgba(198,190,164,.4)'; ctx.fillRect(w * .34, h * .48, w * .32, h * .12);
  };

  P.register(D);
})();
