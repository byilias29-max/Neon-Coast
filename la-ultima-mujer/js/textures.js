'use strict';
/* ============================================================
   Biblioteca de materiales procedurales.
   Cada superficie tiene estructura, desgaste y memoria propia.
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U;
  const Tex = {};
  LM.Tex = Tex;
  const cache = new Map();

  function C(w, h) { return U.createCanvas(w, h); }

  function grain(ctx, w, h, alpha = .08, blend = 'overlay', color = null) {
    if (!Tex._noise) {
      const n = C(220, 220);
      const nx = n.getContext('2d');
      const id = nx.createImageData(220, 220);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = 70 + Math.random() * 140;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
        id.data[i + 3] = 255;
      }
      nx.putImageData(id, 0, 0);
      Tex._noise = n;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = blend;
    const pat = ctx.createPattern(Tex._noise, 'repeat');
    if (color) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  function softStain(ctx, x, y, rx, ry, color, alpha = .2, rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(1, ry / Math.max(1, rx));
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, U.hexToRgba(color, alpha));
    g.addColorStop(.55, U.hexToRgba(color, alpha * .45));
    g.addColorStop(1, U.hexToRgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function crack(ctx, x, y, len, angle, width, color = 'rgba(15,16,15,.45)', rng = Math.random) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    let cx = x, cy = y, a = angle;
    const steps = 5 + (rng() * 6 | 0);
    for (let i = 0; i < steps; i++) {
      a += (rng() - .5) * .6;
      cx += Math.cos(a) * len / steps;
      cy += Math.sin(a) * len / steps;
      ctx.lineTo(cx, cy);
      if (rng() > .55) {
        ctx.save();
        ctx.lineWidth = Math.max(.35, width * .45);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        let bx = cx, by = cy, ba = a + (rng() > .5 ? 1 : -1) * (.45 + rng() * .6);
        for (let j = 0; j < 2; j++) {
          bx += Math.cos(ba) * len * .08;
          by += Math.sin(ba) * len * .08;
          ctx.lineTo(bx, by);
          ba += (rng() - .5) * .5;
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function edgeWear(ctx, w, h, rng, color = 'rgba(20,18,15,.35)', count = 30) {
    ctx.save();
    for (let i = 0; i < count; i++) {
      const side = (rng() * 4) | 0;
      let x, y;
      if (side === 0) { x = rng() * w; y = rng() * 6; }
      else if (side === 1) { x = w - rng() * 6; y = rng() * h; }
      else if (side === 2) { x = rng() * w; y = h - rng() * 6; }
      else { x = rng() * 6; y = rng() * h; }
      ctx.fillStyle = color;
      ctx.globalAlpha = .25 + rng() * .5;
      ctx.beginPath();
      ctx.ellipse(x, y, 1 + rng() * 4, .7 + rng() * 2, rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  Tex.noise = grain;
  Tex.softStain = softStain;
  Tex.crack = crack;
  Tex.edgeWear = edgeWear;

  /* ---------------- wood floors ---------------- */
  Tex.woodFloorCanvas = function (w, h, opts = {}) {
    const variant = opts.variant || 'house';
    const rng = U.rng('wood-' + variant + '-' + (opts.seed || 0));
    const c = C(w, h), ctx = c.getContext('2d');
    const base = {
      house: ['#4a3324', '#38251b', '#63452f'],
      dark: ['#2d2119', '#1d1611', '#443025'],
      attic: ['#59402b', '#3c2b1e', '#715640'],
      clinic: ['#3b2e23', '#2a2019', '#554132']
    }[variant] || ['#4a3324', '#38251b', '#63452f'];

    ctx.fillStyle = base[0];
    ctx.fillRect(0, 0, w, h);
    const boardH = opts.boardH || (variant === 'attic' ? 42 : 38);
    let y = -2;
    while (y < h) {
      const bh = boardH + (rng() * 8 - 4);
      let x = -40 - rng() * 80;
      while (x < w) {
        const bw = 130 + rng() * 220;
        const tone = rng();
        const col = rng() > .5 ? base[1] : base[2];
        const g = ctx.createLinearGradient(x, y, x + bw, y + bh);
        g.addColorStop(0, col);
        g.addColorStop(.35 + tone * .3, base[0]);
        g.addColorStop(1, col);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, bw, bh);
        // grain
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, bw, bh);
        ctx.clip();
        for (let gline = 0; gline < 6 + (rng() * 8 | 0); gline++) {
          const gy = y + 3 + rng() * (bh - 6);
          ctx.strokeStyle = `rgba(${18 + rng() * 30 | 0},${12 + rng() * 18 | 0},${8 + rng() * 10 | 0},${.08 + rng() * .17})`;
          ctx.lineWidth = .4 + rng() * 1.1;
          ctx.beginPath();
          ctx.moveTo(x, gy);
          const seg = 4 + (rng() * 4 | 0);
          for (let s = 1; s <= seg; s++) {
            const px = x + bw * s / seg;
            const py = gy + Math.sin(s * 1.6 + rng()) * (1 + rng() * 2.8);
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        if (rng() > .55) {
          const kx = x + 20 + rng() * (bw - 40);
          const ky = y + 8 + rng() * (bh - 16);
          for (let k = 0; k < 3; k++) {
            ctx.strokeStyle = `rgba(30,18,11,${.16 + rng() * .2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(kx, ky, 2 + k * 2.4, 1 + k * .8, .2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        // board end shadow
        ctx.strokeStyle = 'rgba(10,7,5,.55)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + .5, y + .5, bw, bh);
        // nails
        if (rng() > .25) {
          ctx.fillStyle = 'rgba(15,12,9,.42)';
          ctx.beginPath(); ctx.arc(x + 7 + rng() * 6, y + 6 + rng() * (bh - 12), 1.1, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(x + bw - 8 - rng() * 6, y + 6 + rng() * (bh - 12), 1.1, 0, 7); ctx.fill();
        }
        // scratches & damage
        if (rng() > .72) {
          ctx.strokeStyle = 'rgba(214,196,165,.09)';
          ctx.lineWidth = .6;
          ctx.beginPath();
          ctx.moveTo(x + rng() * bw, y + 3);
          ctx.lineTo(x + rng() * bw, y + bh - 3);
          ctx.stroke();
        }
        x += bw;
      }
      y += bh;
    }
    // dust & damp
    for (let i = 0; i < 18; i++) {
      softStain(ctx, rng() * w, rng() * h, 30 + rng() * 120, 10 + rng() * 45, rng() > .5 ? '#1b2120' : '#2a1b12', .05 + rng() * .06, rng() * 3);
    }
    crack(ctx, w * .25, h * .3, 80, .4, 1.2, 'rgba(15,12,8,.3)', rng);
    grain(ctx, w, h, .11, 'overlay');
    return c;
  };

  /* ---------------- tile floors ---------------- */
  Tex.tileFloorCanvas = function (w, h, opts = {}) {
    const variant = opts.variant || 'clinic';
    const rng = U.rng('tile-' + variant + '-' + (opts.seed || 0));
    const c = C(w, h), ctx = c.getContext('2d');
    const palettes = {
      clinic: { a: '#9a9a83', b: '#838875', grout: '#4a4d40', stain: '#3a3a2b', size: 46 },
      white: { a: '#bcb9aa', b: '#9f9d90', grout: '#5a584e', stain: '#534d40', size: 38 },
      bath: { a: '#a3aeaa', b: '#85938e', grout: '#43504c', stain: '#33403b', size: 34 },
      basement: { a: '#6a6f64', b: '#565d55', grout: '#383d36', stain: '#242a25', size: 52 },
      kitchen: { a: '#8a7b63', b: '#a19377', grout: '#484033', stain: '#3b3024', size: 50 }
    };
    const p = palettes[variant] || palettes.clinic;
    const size = opts.size || p.size;
    ctx.fillStyle = p.grout;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h + size; y += size) {
      const offset = (Math.floor(y / size) % 2) * (size / 2);
      for (let x = -size; x < w + size; x += size) {
        const px = x + offset, py = y;
        const dark = rng() > .5;
        ctx.fillStyle = dark ? p.a : p.b;
        ctx.globalAlpha = .87 + rng() * .13;
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
        ctx.globalAlpha = 1;
        // subtle mottling
        ctx.save();
        ctx.beginPath(); ctx.rect(px + 2, py + 2, size - 4, size - 4); ctx.clip();
        const g = ctx.createLinearGradient(px, py, px + size, py + size);
        g.addColorStop(0, 'rgba(255,255,255,.06)');
        g.addColorStop(.5, 'rgba(0,0,0,.01)');
        g.addColorStop(1, 'rgba(0,0,0,.12)');
        ctx.fillStyle = g; ctx.fillRect(px, py, size, size);
        for (let d = 0; d < 4; d++) {
          softStain(ctx, px + rng() * size, py + rng() * size, 8 + rng() * 25, 5 + rng() * 16, rng() > .5 ? '#353b32' : '#c9c3ae', .04 + rng() * .06);
        }
        if (rng() > .92) {
          crack(ctx, px + size * .3, py + size * .2, size * .6, rng() * 3, .7, 'rgba(30,32,28,.4)', rng);
        }
        if (rng() > .965) {
          // chipped corner
          ctx.fillStyle = 'rgba(44,47,40,.8)';
          ctx.beginPath();
          ctx.moveTo(px + size - 2, py + 2); ctx.lineTo(px + size - 8 - rng() * 10, py + 2);
          ctx.lineTo(px + size - 2, py + 8 + rng() * 9); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }
    for (let i = 0; i < 9; i++) {
      softStain(ctx, rng() * w, rng() * h, 40 + rng() * 110, 20 + rng() * 50, p.stain, .05 + rng() * .12, rng() * 3);
    }
    // scuff marks
    ctx.strokeStyle = 'rgba(22,25,22,.16)';
    for (let i = 0; i < 18; i++) {
      ctx.lineWidth = .5 + rng() * 1.4;
      ctx.beginPath();
      const sx = rng() * w, sy = rng() * h;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + rng() * 40 - 20, sy + 10 + rng() * 30, sx + rng() * 60 - 30, sy + 20 + rng() * 50);
      ctx.stroke();
    }
    grain(ctx, w, h, .08, 'overlay');
    return c;
  };

  /* ---------------- concrete / asphalt ---------------- */
  Tex.concreteFloorCanvas = function (w, h, opts = {}) {
    const rng = U.rng('conc-' + (opts.seed || 0));
    const c = C(w, h), ctx = c.getContext('2d');
    const dark = opts.dark;
    const base = dark ? '#30302c' : '#565750';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // aggregate
    for (let i = 0; i < Math.floor(w * h / 650); i++) {
      const x = rng() * w, y = rng() * h, s = .5 + rng() * 2.2;
      ctx.fillStyle = rng() > .55 ? 'rgba(190,184,164,.11)' : 'rgba(12,13,12,.18)';
      ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
    }
    // large patches
    for (let i = 0; i < 8; i++) {
      softStain(ctx, rng() * w, rng() * h, 70 + rng() * 180, 40 + rng() * 100, rng() > .5 ? '#1b201d' : '#777266', .05 + rng() * .07, rng() * 3);
    }
    for (let i = 0; i < 5; i++) {
      crack(ctx, rng() * w, rng() * h, 60 + rng() * 190, rng() * 6, .6 + rng() * 1.3, 'rgba(13,15,14,.38)', rng);
    }
    // expansion joints
    ctx.strokeStyle = 'rgba(15,16,15,.32)';
    ctx.lineWidth = 2;
    if (opts.joints !== false) {
      ctx.beginPath(); ctx.moveTo(0, h * .62); ctx.lineTo(w, h * .62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * .4, 0); ctx.lineTo(w * .4, h); ctx.stroke();
    }
    grain(ctx, w, h, .16, 'overlay');
    return c;
  };

  Tex.asphaltCanvas = function (w, h, opts = {}) {
    const rng = U.rng('asphalt-' + (opts.seed || 0));
    const c = C(w, h), ctx = c.getContext('2d');
    ctx.fillStyle = '#202522';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < Math.floor(w * h / 90); i++) {
      const x = rng() * w, y = rng() * h, s = .4 + rng() * 1.6;
      const v = rng();
      ctx.fillStyle = v > .8 ? 'rgba(179,179,164,.16)' : v > .45 ? 'rgba(77,82,77,.24)' : 'rgba(10,12,11,.3)';
      ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 12; i++) {
      softStain(ctx, rng() * w, rng() * h, 50 + rng() * 160, 25 + rng() * 90, rng() > .5 ? '#0d1111' : '#3f4b48', .06 + rng() * .1, rng() * 3);
    }
    for (let i = 0; i < 6; i++) {
      crack(ctx, rng() * w, rng() * h, 90 + rng() * 240, rng() * 6, 1 + rng() * 1.6, 'rgba(7,9,9,.55)', rng);
    }
    grain(ctx, w, h, .18, 'overlay');
    return c;
  };

  /* ---------------- walls ---------------- */
  Tex.wallpaperCanvas = function (w, h, opts = {}) {
    const rng = U.rng('paper-wall-' + (opts.seed || 0));
    const c = C(w, h), ctx = c.getContext('2d');
    const tones = opts.tones || ['#6f6b50', '#645e45', '#7b7355'];
    ctx.fillStyle = tones[0];
    ctx.fillRect(0, 0, w, h);
    const stripe = 36;
    for (let x = 0; x < w; x += stripe) {
      ctx.fillStyle = tones[1];
      ctx.globalAlpha = .35;
      ctx.fillRect(x, 0, stripe * .46, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(43,40,29,.25)';
      ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); ctx.stroke();
    }
    // damask/faded botanical motif
    for (let y = 28; y < h; y += 84) {
      for (let x = 18; x < w; x += 72) {
        const ox = x + (Math.floor(y / 84) % 2) * 36;
        ctx.save();
        ctx.translate(ox, y);
        ctx.strokeStyle = 'rgba(174,158,118,.2)';
        ctx.fillStyle = 'rgba(174,158,118,.08)';
        ctx.lineWidth = .8;
        for (let p = 0; p < 4; p++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.ellipse(0, -14, 3, 10, 0, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
    // damp, peeling, stains
    for (let i = 0; i < 10; i++) {
      softStain(ctx, rng() * w, h * (.15 + rng() * .9), 30 + rng() * 100, 20 + rng() * 65, rng() > .5 ? '#2b2a22' : '#8c8263', .06 + rng() * .12, rng() * 3);
    }
    if (opts.peeling !== false) {
      for (let i = 0; i < 8; i++) {
        const x = rng() * w, y = rng() * h, sw = 10 + rng() * 42, sh = 18 + rng() * 90;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + sw * .3, y - 4, x + sw * .8, y + sh * .12, x + sw, y + sh * .2);
        ctx.bezierCurveTo(x + sw * .7, y + sh * .65, x + sw * .4, y + sh, x, y + sh);
        ctx.closePath();
        ctx.fillStyle = 'rgba(49,45,35,.65)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(29,27,21,.5)';
        ctx.lineWidth = .8;
        ctx.stroke();
        ctx.restore();
      }
    }
    grain(ctx, w, h, .11, 'overlay');
    return c;
  };

  Tex.plasterCanvas = function (w, h, opts = {}) {
    const rng = U.rng('plaster-' + (opts.seed || 0));
    const c = C(w, h), ctx = c.getContext('2d');
    const base = opts.color || '#9b9684';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      softStain(ctx, rng() * w, rng() * h, 12 + rng() * 90, 8 + rng() * 55, rng() > .5 ? '#6e6a5c' : '#c0b9a4', .035 + rng() * .06, rng() * 3);
    }
    for (let i = 0; i < 5; i++) {
      crack(ctx, rng() * w, rng() * h, 40 + rng() * 160, rng() * 6, .5 + rng() * 1, 'rgba(53,50,43,.3)', rng);
    }
    // peeling patches
    for (let i = 0; i < 5; i++) {
      const x = rng() * w, y = rng() * h;
      ctx.fillStyle = 'rgba(79,75,65,.4)';
      ctx.beginPath();
      for (let p = 0; p < 7; p++) {
        const a = p / 7 * Math.PI * 2, r = 8 + rng() * 24;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * .65;
        p ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(45,43,37,.35)'; ctx.stroke();
    }
    grain(ctx, w, h, .12, 'overlay');
    return c;
  };

  Tex.brickCanvas = function (w, h, opts = {}) {
    const rng = U.rng('brick-' + (opts.seed || 0));
    const c = C(w, h), ctx = c.getContext('2d');
    ctx.fillStyle = '#4b4338';
    ctx.fillRect(0, 0, w, h);
    const bw = 54, bh = 24;
    for (let y = 0; y < h + bh; y += bh) {
      const off = (Math.floor(y / bh) % 2) * bw / 2;
      for (let x = -bw; x < w + bw; x += bw) {
        const px = x + off + 2, py = y + 2;
        const tones = ['#674b3a', '#735743', '#594437', '#7b6049', '#4d3a2e'];
        ctx.fillStyle = tones[(rng() * tones.length) | 0];
        ctx.globalAlpha = .7 + rng() * .3;
        ctx.fillRect(px, py, bw - 4, bh - 4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,.035)';
        ctx.fillRect(px, py, bw - 4, 2);
        if (rng() > .8) {
          ctx.fillStyle = 'rgba(18,16,14,.4)';
          ctx.fillRect(px + rng() * (bw - 10), py + rng() * (bh - 8), 3 + rng() * 8, 2 + rng() * 4);
        }
      }
    }
    for (let i = 0; i < 12; i++) {
      softStain(ctx, rng() * w, rng() * h, 20 + rng() * 80, 12 + rng() * 60, rng() > .5 ? '#252a21' : '#a69374', .06 + rng() * .1);
    }
    grain(ctx, w, h, .15, 'overlay');
    return c;
  };

  /* ---------------- fabric / carpet / paper / metal ---------------- */
  Tex.fabricCanvas = function (w, h, opts = {}) {
    const rng = U.rng('fabric-' + (opts.seed || 0) + (opts.color || ''));
    const c = C(w, h), ctx = c.getContext('2d');
    ctx.fillStyle = opts.color || '#4f4a40';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .13;
    for (let x = 0; x < w; x += 3) {
      ctx.strokeStyle = x % 6 ? '#d6cdb9' : '#161b19';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 3) {
      ctx.strokeStyle = y % 6 ? '#101412' : '#bdb5a2';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) {
      softStain(ctx, rng() * w, rng() * h, 10 + rng() * 50, 6 + rng() * 30, rng() > .5 ? '#0e1210' : '#6b6252', .04 + rng() * .05);
    }
    grain(ctx, w, h, .08, 'overlay');
    return c;
  };

  Tex.carpetCanvas = function (w, h, opts = {}) {
    const rng = U.rng('carpet-' + (opts.seed || 0));
    const c = C(w, h), ctx = c.getContext('2d');
    const base = opts.color || '#4b2c2a';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // aged ornamental border
    const inset = 14;
    ctx.strokeStyle = 'rgba(171,148,106,.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    ctx.lineWidth = .7;
    ctx.strokeRect(inset + 7, inset + 7, w - inset * 2 - 14, h - inset * 2 - 14);
    // central motif
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = 'rgba(181,161,123,.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.ellipse(0, -h * .19, 10, h * .21, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 18; i++) {
      softStain(ctx, rng() * w, rng() * h, 10 + rng() * 50, 8 + rng() * 40, rng() > .5 ? '#1e1210' : '#806b4e', .03 + rng() * .07);
    }
    grain(ctx, w, h, .14, 'overlay');
    return c;
  };

  Tex.paperCanvas = function (w, h, opts = {}) {
    const rng = U.rng('paper-' + (opts.seed || 0));
    const c = C(w, h), ctx = c.getContext('2d');
    ctx.fillStyle = opts.color || '#c9c0a9';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < Math.floor(w * h / 900); i++) {
      const x = rng() * w, y = rng() * h;
      ctx.strokeStyle = `rgba(${70 + rng() * 40 | 0},${60 + rng() * 30 | 0},${40 + rng() * 25 | 0},${.03 + rng() * .06})`;
      ctx.lineWidth = .5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng() * 8 - 4, y + rng() * 3 - 1.5); ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      softStain(ctx, rng() * w, rng() * h, 8 + rng() * 50, 5 + rng() * 30, '#6b583d', .03 + rng() * .05);
    }
    ctx.strokeStyle = 'rgba(90,75,54,.12)';
    ctx.lineWidth = .8;
    const fold = rng() > .5 ? w / 2 : h / 2;
    ctx.beginPath();
    if (fold === w / 2) { ctx.moveTo(fold, 0); ctx.lineTo(fold + 2, h); }
    else { ctx.moveTo(0, fold); ctx.lineTo(w, fold + 2); }
    ctx.stroke();
    grain(ctx, w, h, .07, 'overlay');
    return c;
  };

  Tex.metalCanvas = function (w, h, opts = {}) {
    const rng = U.rng('metal-' + (opts.seed || 0));
    const c = C(w, h), ctx = c.getContext('2d');
    ctx.fillStyle = opts.color || '#4a4f4c';
    ctx.fillRect(0, 0, w, h);
    // cold-rolled scratches
    for (let i = 0; i < 24; i++) {
      ctx.strokeStyle = `rgba(210,214,204,${.015 + rng() * .04})`;
      ctx.lineWidth = .4;
      const y = rng() * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + rng() * 4 - 2); ctx.stroke();
    }
    // rust blooms
    for (let i = 0; i < (opts.rust === false ? 0 : 9); i++) {
      const x = rng() * w, y = rng() * h;
      softStain(ctx, x, y, 8 + rng() * 38, 5 + rng() * 25, rng() > .5 ? '#7c472e' : '#a26a3f', .14 + rng() * .25, rng() * 3);
      if (rng() > .5) {
        ctx.strokeStyle = 'rgba(94,52,34,.22)';
        ctx.lineWidth = 1;
        for (let s = 0; s < 3; s++) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + rng() * 12 - 6, y + 20, x + rng() * 8 - 4, y + 40 + rng() * 50);
          ctx.stroke();
        }
      }
    }
    // dents
    for (let i = 0; i < 8; i++) {
      const x = rng() * w, y = rng() * h;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 5 + rng() * 10);
      g.addColorStop(0, 'rgba(15,17,16,.2)');
      g.addColorStop(.7, 'rgba(220,220,205,.035)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
    }
    grain(ctx, w, h, .09, 'overlay');
    return c;
  };

  /* ---------------- mini texture helpers ---------------- */
  Tex.getWoodCanvas = function (variant = 'furniture', seed = 1) {
    const key = 'wood-' + variant + '-' + seed;
    if (cache.has(key)) return cache.get(key);
    const rng = U.rng(key);
    const c = C(260, 260), ctx = c.getContext('2d');
    const cols = {
      furniture: ['#3f2b1d', '#513823', '#2e1f16'],
      light: ['#705138', '#8c6a4b', '#523a28'],
      dark: ['#241a14', '#35241a', '#1b130f'],
      door: ['#3b281d', '#4d3525', '#2a1c14']
    }[variant] || ['#3f2b1d', '#513823', '#2e1f16'];
    ctx.fillStyle = cols[0]; ctx.fillRect(0, 0, 260, 260);
    const g = ctx.createLinearGradient(0, 0, 260, 260);
    g.addColorStop(0, cols[1]); g.addColorStop(.55, cols[0]); g.addColorStop(1, cols[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 260, 260);
    for (let i = 0; i < 38; i++) {
      const y = rng() * 260;
      ctx.strokeStyle = `rgba(${20 + rng() * 20 | 0},${14 + rng() * 12 | 0},${9 + rng() * 8 | 0},${.08 + rng() * .2})`;
      ctx.lineWidth = .4 + rng() * 1.2;
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x < 260; x += 30) ctx.quadraticCurveTo(x + 15, y + Math.sin(x + i) * 2, x + 30, y + rng() * 2 - 1);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const x = rng() * 260, y = rng() * 260;
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = 'rgba(23,14,9,.28)';
        ctx.lineWidth = .8;
        ctx.beginPath(); ctx.ellipse(x, y, 3 + k * 4, 1.5 + k * 1.7, .25, 0, 7); ctx.stroke();
      }
    }
    grain(ctx, 260, 260, .1, 'overlay');
    cache.set(key, c);
    return c;
  };

  Tex.getWallFill = function (material, seed = 1) {
    const key = 'wallfill-' + material + '-' + seed;
    if (cache.has(key)) return cache.get(key);
    let c;
    switch (material) {
      case 'wallpaper': c = Tex.wallpaperCanvas(300, 220, { seed }); break;
      case 'tile': c = Tex.tileFloorCanvas(300, 220, { variant: 'white', seed, size: 30 }); break;
      case 'clinic': c = Tex.tileFloorCanvas(300, 220, { variant: 'clinic', seed, size: 26 }); break;
      case 'concrete': c = Tex.concreteFloorCanvas(300, 220, { seed, joints: false }); break;
      case 'brick': c = Tex.brickCanvas(300, 220, { seed }); break;
      default: c = Tex.plasterCanvas(300, 220, { seed }); break;
    }
    cache.set(key, c);
    return c;
  };

  Tex.getSwatch = function (name, seed = 1) {
    const key = 'swatch-' + name + '-' + seed;
    if (cache.has(key)) return cache.get(key);
    let c;
    switch (name) {
      case 'rust': c = Tex.metalCanvas(200, 200, { seed }); break;
      case 'metal': c = Tex.metalCanvas(200, 200, { seed, rust: false }); break;
      case 'fabric': c = Tex.fabricCanvas(200, 200, { seed }); break;
      case 'carpet': c = Tex.carpetCanvas(200, 200, { seed }); break;
      case 'paper': c = Tex.paperCanvas(200, 200, { seed }); break;
      case 'wood': c = Tex.getWoodCanvas('furniture', seed); break;
      case 'wood-light': c = Tex.getWoodCanvas('light', seed); break;
      case 'wood-dark': c = Tex.getWoodCanvas('dark', seed); break;
      default: c = Tex.paperCanvas(200, 200, { seed }); break;
    }
    cache.set(key, c);
    return c;
  };

  Tex.clearCache = function () { cache.clear(); };
})();
