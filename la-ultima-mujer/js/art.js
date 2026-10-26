'use strict';
/* ============================================================
   Núcleo gráfico: helpers de dibujo, materiales e iconos.
   Todo lo visible está pintado con Canvas 2D en timepo de ejecución.
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U;
  const Art = {};
  LM.Art = Art;

  Art.canvas = (w, h) => U.createCanvas(w, h);
  Art.ctx = c => c.getContext('2d');

  Art.pattern = (ctx, canvas, repeat = 'repeat') => {
    const p = ctx.createPattern(canvas, repeat);
    return p;
  };

  Art.fillTex = function (ctx, canvas, x, y, w, h, alpha = 1) {
    const p = ctx.createPattern(canvas, 'repeat');
    if (!p) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p;
    // El patrón se ancla a la superficie que se está pintando.
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };

  Art.rect = function (ctx, x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  };

  Art.panel = function (ctx, x, y, w, h, opts = {}) {
    const r = opts.radius || 0;
    ctx.save();
    U.roundRect(ctx, x, y, w, h, r);
    if (opts.fill) {
      ctx.fillStyle = opts.fill;
      ctx.fill();
    }
    if (opts.stroke) {
      ctx.strokeStyle = opts.stroke;
      ctx.lineWidth = opts.lineWidth || 1;
      ctx.stroke();
    }
    ctx.restore();
  };

  Art.shadow = function (ctx, x, y, w, h, blur = 16, alpha = .5, offY = 5) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y + offY, w, h);
    ctx.restore();
  };

  Art.softShadowEllipse = function (ctx, x, y, rx, ry, alpha = .42) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(.55, `rgba(0,0,0,${alpha * .45})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  Art.highlight = function (ctx, x, y, w, h, color, alpha = .12) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, U.hexToRgba(color, alpha * 1.7));
    g.addColorStop(.35, U.hexToRgba(color, alpha));
    g.addColorStop(1, U.hexToRgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };

  Art.inset = function (ctx, x, y, w, h, color = 'rgba(0,0,0,.35)', d = 3) {
    const gs = [
      [x, y, w, d, 0], [x, y + h - d, w, d, 180],
      [x, y, d, h, 90], [x + w - d, y, d, h, 270]
    ];
    for (const [gx, gy, gw, gh, deg] of gs) {
      const rad = deg * Math.PI / 180;
      const g = ctx.createLinearGradient(
        gx + gw / 2 - Math.cos(rad) * d, gy + gh / 2 - Math.sin(rad) * d,
        gx + gw / 2 + Math.cos(rad) * d, gy + gh / 2 + Math.sin(rad) * d
      );
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(gx, gy, gw, gh);
    }
  };

  Art.screw = function (ctx, x, y, r = 1.6, angle = .3) {
    ctx.save();
    ctx.fillStyle = 'rgba(12,13,12,.55)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(205,196,170,.22)';
    ctx.lineWidth = .5;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle) * r, y - Math.sin(angle) * r);
    ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    ctx.stroke();
    ctx.restore();
  };

  Art.hinge = function (ctx, x, y, horizontal = true, size = 8) {
    ctx.save();
    ctx.fillStyle = 'rgba(83,65,42,.75)';
    if (horizontal) {
      U.roundRect(ctx, x, y - 1.5, size, 3.5, 1);
      ctx.fill();
      Art.screw(ctx, x + 2, y + .2, 1);
      Art.screw(ctx, x + size - 2, y + .2, 1);
    } else {
      U.roundRect(ctx, x - 1.5, y, 3.5, size, 1);
      ctx.fill();
      Art.screw(ctx, x + .2, y + 2, 1);
      Art.screw(ctx, x + .2, y + size - 2, 1);
    }
    ctx.restore();
  };

  Art.handle = function (ctx, x, y, size = 8, orientation = 'h', metal = '#967b50') {
    ctx.save();
    ctx.strokeStyle = 'rgba(20,16,12,.5)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    if (orientation === 'h') {
      ctx.beginPath(); ctx.moveTo(x - size / 2, y + 1); ctx.lineTo(x + size / 2, y + 1); ctx.stroke();
      ctx.strokeStyle = metal;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - size / 2, y); ctx.lineTo(x + size / 2, y); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x + 1, y - size / 2); ctx.lineTo(x + 1, y + size / 2); ctx.stroke();
      ctx.strokeStyle = metal;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, y - size / 2); ctx.lineTo(x, y + size / 2); ctx.stroke();
    }
    Art.screw(ctx, x - size / 2, y + (orientation === 'h' ? 0 : 0), 1.1);
    Art.screw(ctx, x + size / 2, y + (orientation === 'h' ? 0 : 0), 1.1);
    ctx.restore();
  };

  Art.paperSheet = function (ctx, x, y, w, h, rot = 0, opts = {}) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot);
    ctx.translate(-w / 2, -h / 2);
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = opts.color || '#cfc6af';
    ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = 'transparent';
    if (opts.lines !== false) {
      ctx.strokeStyle = 'rgba(63,57,44,.22)';
      ctx.lineWidth = .6;
      const step = opts.step || 5;
      for (let ly = 4; ly < h - 2; ly += step) {
        ctx.beginPath(); ctx.moveTo(3, ly); ctx.lineTo(w - 3, ly); ctx.stroke();
      }
    }
    if (opts.text) {
      ctx.fillStyle = 'rgba(35,34,28,.55)';
      const lines = opts.text;
      ctx.font = `${opts.fontSize || 4}px monospace`;
      lines.forEach((line, i) => {
        ctx.fillRect(5, 5 + i * (opts.step || 5), Math.min(w - 10, line * .8), 1.2);
      });
    }
    ctx.restore();
  };

  Art.book = function (ctx, x, y, w, h, color = '#4c3b2b', angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(1, 2, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(0, 0, w, 1.5);
    ctx.fillStyle = '#c7b896';
    ctx.fillRect(w - 2.5, 1, 2, h - 2);
    ctx.strokeStyle = 'rgba(20,14,10,.35)';
    ctx.lineWidth = .5;
    ctx.strokeRect(.5, .5, w - 1, h - 1);
    ctx.restore();
  };

  Art.bottle = function (ctx, x, y, w, h, color = 'rgba(97,123,103,.55)', cap = '#6f6b56') {
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(255,255,255,.18)');
    g.addColorStop(.3, color);
    g.addColorStop(1, 'rgba(15,22,18,.65)');
    ctx.fillStyle = g;
    U.roundRect(ctx, x, y + h * .24, w, h * .76, Math.min(2.5, w * .3));
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(x + w * .3, y, w * .4, h * .28);
    ctx.fillStyle = cap;
    ctx.fillRect(x + w * .28, y - 1.5, w * .44, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.fillRect(x + 1.5, y + h * .32, 1, h * .5);
    ctx.restore();
  };

  Art.cup = function (ctx, x, y, w = 9, h = 8, color = '#b9af98') {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(x + w / 2 + 1, y + h + 1, w * .55, 2, 0, 0, 7); ctx.fill();
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, '#8d8472'); g.addColorStop(.4, color); g.addColorStop(1, '#6f695b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 2, w / 2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x, y + 2, w, h - 3);
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 1, w / 2, 2.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a806c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + 2, w / 2 - 2, 1.3, 0, 0, 7); ctx.stroke();
    ctx.restore();
  };

  Art.glassShard = function (ctx, x, y, s, rot = 0) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s, -s * .3); ctx.lineTo(s * .7, s * .6); ctx.closePath();
    ctx.fillStyle = 'rgba(183,210,204,.26)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(206,233,225,.35)'; ctx.lineWidth = .5; ctx.stroke();
    ctx.restore();
  };

  Art.cobweb = function (ctx, x, y, r, angle = 0) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    ctx.strokeStyle = 'rgba(188,195,183,.11)';
    ctx.lineWidth = .5;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke();
    }
    for (let k = .2; k < 1; k += .22) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(0) * r * k, Math.sin(0) * r * k);
      ctx.arc(0, 0, r * k, 0, Math.PI / 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  Art.moss = function (ctx, x, y, w, h, alpha = .3, seed = 5) {
    const rng = U.rng(seed);
    ctx.save();
    for (let i = 0; i < w * h / 220; i++) {
      const px = x + rng() * w, py = y + rng() * h;
      ctx.fillStyle = `rgba(${42 + rng() * 30 | 0},${60 + rng() * 30 | 0},${40 + rng() * 20 | 0},${alpha * (.25 + rng() * .75)})`;
      ctx.beginPath(); ctx.arc(px, py, .5 + rng() * 2.4, 0, 7); ctx.fill();
    }
    ctx.restore();
  };

  Art.dust = function (ctx, x, y, w, h, alpha = .1, seed = 1) {
    const rng = U.rng(seed);
    for (let i = 0; i < w * h / 500; i++) {
      ctx.fillStyle = `rgba(208,195,168,${alpha * rng()})`;
      ctx.fillRect(x + rng() * w, y + rng() * h, .6, .6);
    }
  };

  Art.scratch = function (ctx, x, y, len, angle, color = 'rgba(200,190,168,.12)', width = .5) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
    ctx.restore();
  };

  Art.wetStreak = function (ctx, x, y, len, angle, width = 1.2, alpha = .1) {
    ctx.save();
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const g = ctx.createLinearGradient(x, y, x + dx * len, y + dy * len);
    g.addColorStop(0, `rgba(169,198,194,0)`);
    g.addColorStop(.35, `rgba(169,198,194,${alpha})`);
    g.addColorStop(1, `rgba(169,198,194,0)`);
    ctx.strokeStyle = g; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * len, y + dy * len); ctx.stroke();
    ctx.restore();
  };

  Art.grimeEdge = function (ctx, x, y, w, h, side, depth = 18, color = 'rgba(12,15,13,.4)', seed = 1) {
    const rng = U.rng(seed);
    ctx.save();
    let g;
    if (side === 'top') g = ctx.createLinearGradient(0, y, 0, y + depth);
    else if (side === 'bottom') g = ctx.createLinearGradient(0, y + h, 0, y + h - depth);
    else if (side === 'left') g = ctx.createLinearGradient(x, 0, x + depth, 0);
    else g = ctx.createLinearGradient(x + w, 0, x + w - depth, 0);
    g.addColorStop(0, color);
    g.addColorStop(.45, color.replace(/[\d.]+\)$/, '0.13)'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 26; i++) {
      const px = side === 'left' || side === 'right' ? (side === 'left' ? x : x + w) : x + rng() * w;
      const py = side === 'top' || side === 'bottom' ? (side === 'top' ? y : y + h) : y + rng() * h;
      ctx.fillStyle = `rgba(10,14,12,${.025 + rng() * .07})`;
      ctx.beginPath(); ctx.ellipse(px + (rng() - .5) * depth, py + (rng() - .5) * depth, 5 + rng() * 20, 3 + rng() * 9, rng() * 3, 0, 7); ctx.fill();
    }
    ctx.restore();
  };

  Art.warmRim = function (ctx, x, y, w, h, alpha = .18) {
    const g = ctx.createLinearGradient(x, y, x + w * .3, y + h);
    g.addColorStop(0, `rgba(238,185,120,${alpha})`);
    g.addColorStop(1, 'rgba(238,185,120,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };

  /* ============================================================
     ICONOS DE INVENTARIO (data URLs, dibujados una sola vez)
     ============================================================ */
  const iconCache = {};

  function iconCanvas(draw) {
    const c = U.createCanvas(128, 128);
    const ctx = c.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.translate(64, 64);
    draw(ctx);
    ctx.restore();
    // viñeta suave para integrarlo en la interfaz
    const g = ctx.createRadialGradient(64, 58, 20, 64, 64, 70);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(2,4,5,.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return c;
  }

  const ICONS = {
    torch(ctx) {
      ctx.rotate(-.16);
      ctx.shadowColor = 'rgba(255,150,65,.55)'; ctx.shadowBlur = 18;
      const g = ctx.createLinearGradient(-8, -40, 10, 38);
      g.addColorStop(0, '#b98a4b'); g.addColorStop(.45, '#6f4c2d'); g.addColorStop(1, '#34241a');
      ctx.fillStyle = g;
      U.roundRect(ctx, -6, -12, 12, 50, 3); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#8e6b3e';
      ctx.fillRect(-9, -16, 18, 7);
      ctx.fillStyle = '#c2a36a';
      ctx.fillRect(-8, -16, 16, 1.5);
      // paño embreado
      ctx.save();
      ctx.translate(0, -24);
      for (let i = 0; i < 7; i++) {
        ctx.rotate(.7);
        ctx.fillStyle = i % 2 ? '#5a3a22' : '#7b4e2b';
        ctx.beginPath(); ctx.ellipse(0, -8 - i * 1.1, 6.5, 12 - i * .8, 0, 0, 7); ctx.fill();
      }
      ctx.restore();
      // llama
      ctx.shadowColor = '#ff8b3d'; ctx.shadowBlur = 28;
      const f = ctx.createRadialGradient(0, -50, 1, 0, -46, 24);
      f.addColorStop(0, '#fff2c8'); f.addColorStop(.3, '#ffd28d'); f.addColorStop(.6, '#ff8d39'); f.addColorStop(1, 'rgba(193,66,24,0)');
      ctx.fillStyle = f;
      ctx.beginPath();
      ctx.moveTo(0, -69);
      ctx.bezierCurveTo(16, -55, 13, -38, 0, -33);
      ctx.bezierCurveTo(-13, -39, -15, -54, 0, -69);
      ctx.fill();
      ctx.shadowBlur = 0;
      // asas metálicas
      ctx.strokeStyle = 'rgba(57,42,28,.8)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(0, -9 + i * 4, 8, .2, Math.PI - .2); ctx.stroke();
      }
    },
    oil(ctx) {
      ctx.rotate(.12);
      const g = ctx.createLinearGradient(-24, -30, 24, 42);
      g.addColorStop(0, '#6e6f58'); g.addColorStop(.5, '#44483c'); g.addColorStop(1, '#1b1f1b');
      ctx.fillStyle = g;
      U.roundRect(ctx, -22, -18, 44, 62, 6); ctx.fill();
      ctx.fillStyle = '#2b2e26';
      ctx.fillRect(-12, -34, 24, 20);
      ctx.fillStyle = '#81724f';
      ctx.fillRect(-14, -38, 28, 7);
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.fillRect(-17, -12, 3, 50);
      ctx.fillStyle = '#c7b78e';
      U.roundRect(ctx, -15, 3, 30, 22, 2); ctx.fill();
      ctx.fillStyle = 'rgba(50,44,31,.75)';
      ctx.font = '9px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('ACEITE', 0, 12);
      ctx.font = '6px monospace';
      ctx.fillText('91.7', 0, 20);
      ctx.fillStyle = 'rgba(19,24,20,.4)';
      ctx.fillRect(-22, 38, 44, 7);
    },
    lighter(ctx) {
      ctx.rotate(-.32);
      const g = ctx.createLinearGradient(-20, -32, 18, 34);
      g.addColorStop(0, '#bca571'); g.addColorStop(.4, '#7d6743'); g.addColorStop(1, '#3c3224');
      ctx.fillStyle = g;
      U.roundRect(ctx, -18, -24, 36, 56, 5); ctx.fill();
      ctx.fillStyle = '#2e2d29';
      ctx.fillRect(-16, -31, 32, 9);
      ctx.fillStyle = '#8f7a56';
      ctx.fillRect(-13, -34, 26, 4);
      ctx.strokeStyle = 'rgba(39,32,23,.6)'; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo(-18, -17 + i * 7); ctx.lineTo(18, -17 + i * 7); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(38,31,23,.8)';
      ctx.font = 'italic 22px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('L', 0, 13);
      ctx.strokeStyle = 'rgba(186,164,118,.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(-10, 25, 20, 1);
      // chispa
      ctx.fillStyle = 'rgba(255,168,80,.7)'; ctx.shadowColor = '#ff9b45'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(14, -45, 2.6, 0, 7); ctx.fill();
    },
    tuning(ctx) {
      ctx.rotate(.15);
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
      const g = ctx.createLinearGradient(-18, -50, 20, 50);
      g.addColorStop(0, '#e3c98d'); g.addColorStop(.35, '#b08e54'); g.addColorStop(1, '#634b2c');
      ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-11, 44); ctx.lineTo(-11, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11, 12);
      ctx.bezierCurveTo(-11, -20, -26, -39, -10, -48);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11, 12);
      ctx.bezierCurveTo(-11, -20, 4, -39, 12, -48);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#d7bd83';
      ctx.beginPath(); ctx.arc(-10, -48, 4.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(12, -48, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#272018';
      ctx.beginPath(); ctx.ellipse(-11, 44, 6, 3.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2c251b';
      ctx.font = 'italic 11px Georgia'; ctx.textAlign = 'center';
      ctx.fillText('L.', -1, 36);
      ctx.strokeStyle = 'rgba(255,245,214,.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-14, 35); ctx.lineTo(-14, -13); ctx.stroke();
    },
    cassette(ctx) {
      ctx.rotate(-.06);
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      U.roundRect(ctx, -39, -28, 80, 60, 5); ctx.fill();
      const g = ctx.createLinearGradient(-38, -28, 38, 32);
      g.addColorStop(0, '#6f6b5d'); g.addColorStop(.35, '#41443d'); g.addColorStop(1, '#22241f');
      ctx.fillStyle = g;
      U.roundRect(ctx, -40, -30, 80, 60, 5); ctx.fill();
      ctx.strokeStyle = '#8d846c'; ctx.lineWidth = 1.4;
      U.roundRect(ctx, -40, -30, 80, 60, 5); ctx.stroke();
      ctx.fillStyle = '#c9bfa5';
      U.roundRect(ctx, -30, -21, 60, 22, 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(52,45,35,.72)';
      ctx.font = '7px monospace';
      ctx.fillText('PRUEBA DE VOZ', -25, -12);
      ctx.font = '6px monospace';
      ctx.fillText('18-N  /  M-07', -25, -5);
      ctx.fillStyle = '#1b1c18';
      ctx.beginPath(); ctx.arc(-14, 15, 10, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(14, 15, 10, 0, 7); ctx.fill();
      ctx.fillStyle = '#7f7866';
      ctx.beginPath(); ctx.arc(-14, 15, 5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(14, 15, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#35372e';
      ctx.fillRect(-5, 9, 10, 12);
      ctx.strokeStyle = 'rgba(200,188,157,.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(-40, 22, 80, 8);
    },
    photo(ctx) {
      ctx.rotate(-.04);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(-40, -46, 82, 94);
      ctx.fillStyle = '#d1c6ae';
      ctx.fillRect(-42, -48, 82, 94);
      ctx.fillStyle = '#1e2622';
      ctx.fillRect(-34, -40, 66, 58);
      const g = ctx.createLinearGradient(-34, -40, 32, 18);
      g.addColorStop(0, '#57665e'); g.addColorStop(.5, '#26332e'); g.addColorStop(1, '#131c19');
      ctx.fillStyle = g; ctx.fillRect(-33, -39, 64, 56);
      ctx.fillStyle = 'rgba(199,193,172,.45)';
      ctx.fillRect(-29, 6, 56, 7); // cama
      ctx.fillStyle = 'rgba(184,178,160,.35)';
      ctx.beginPath(); ctx.ellipse(-5, -5, 13, 16, .2, 0, 7); ctx.fill(); // figura
      ctx.fillStyle = 'rgba(151,103,70,.5)';
      ctx.beginPath(); ctx.arc(-7, -15, 6.5, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(230,91,65,.85)';
      ctx.font = '8px monospace'; ctx.fillText('03:47', -29, 10);
      ctx.fillStyle = 'rgba(225,216,194,.7)';
      ctx.font = '6px monospace'; ctx.fillText('M-07 / NO DESPERTAR', -30, 37);
      ctx.strokeStyle = 'rgba(48,42,32,.3)'; ctx.lineWidth = 1;
      ctx.strokeRect(-34, -40, 66, 58);
    },
    key(ctx) {
      ctx.rotate(.42);
      const g = ctx.createLinearGradient(-30, -40, 30, 40);
      g.addColorStop(0, '#d9c18c'); g.addColorStop(.4, '#a4854f'); g.addColorStop(1, '#5d4729');
      ctx.strokeStyle = g; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(0, -22); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -33, 13, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(13,10,7,.65)';
      ctx.beginPath(); ctx.arc(0, -33, 7, 0, 7); ctx.fill();
      ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.lineCap = 'square';
      ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(14, 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(9, 32); ctx.stroke();
      ctx.fillStyle = '#c7b080';
      ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('91.7', 0, 6);
      ctx.strokeStyle = 'rgba(255,246,220,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-8, -30); ctx.arc(0, -33, 8, 2.3, 3.7); ctx.stroke();
    },
    note(ctx) {
      ctx.rotate(-.1);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-32, -40, 68, 88);
      const g = ctx.createLinearGradient(-34, -42, 34, 46);
      g.addColorStop(0, '#d8cfba'); g.addColorStop(1, '#a99f89');
      ctx.fillStyle = g; ctx.fillRect(-34, -42, 68, 88);
      ctx.fillStyle = 'rgba(74,64,48,.55)';
      for (let i = 0; i < 8; i++) ctx.fillRect(-24, -26 + i * 7, 30 + Math.sin(i) * 12, 1.4);
      ctx.fillStyle = 'rgba(81,47,37,.5)';
      ctx.font = 'italic 24px Georgia'; ctx.textAlign = 'right';
      ctx.fillText('L.', 26, 36);
      ctx.strokeStyle = 'rgba(94,76,52,.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-22, 10); ctx.lineTo(16, 34); ctx.stroke();
    },
    journal(ctx) {
      ctx.rotate(-.18);
      const g = ctx.createLinearGradient(-36, -44, 36, 44);
      g.addColorStop(0, '#6b4a30'); g.addColorStop(.5, '#3a2a20'); g.addColorStop(1, '#1f1712');
      ctx.fillStyle = g; U.roundRect(ctx, -36, -44, 72, 88, 3); ctx.fill();
      ctx.fillStyle = '#8e7350'; ctx.fillRect(-29, -44, 3, 88);
      ctx.strokeStyle = 'rgba(204,181,139,.25)'; ctx.lineWidth = 1;
      ctx.strokeRect(-26, -35, 54, 62);
      ctx.fillStyle = 'rgba(213,193,155,.5)';
      ctx.font = 'italic 10px Georgia'; ctx.textAlign = 'center';
      ctx.fillText('M. ORIBE', 1, -20);
      ctx.fillText('Puerto Niebla', 1, -8);
      ctx.strokeStyle = 'rgba(211,188,146,.2)';
      ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(16, 4); ctx.stroke();
      ctx.fillStyle = 'rgba(80,53,31,.8)';
      ctx.fillRect(30, -5, 5, 24);
    }
  };

  Art.icon = function (name) {
    if (iconCache[name]) return iconCache[name];
    const c = iconCanvas(ICONS[name] || ICONS.note);
    iconCache[name] = c.toDataURL('image/png');
    return iconCache[name];
  };

  Art.panelTexture = function (ctx, x, y, w, h, fill) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    Art.inset(ctx, x, y, w, h, 'rgba(0,0,0,.28)', 2);
    Art.highlight(ctx, x, y, w, Math.min(3, h), '#fff', .04);
    ctx.restore();
  };
})();
