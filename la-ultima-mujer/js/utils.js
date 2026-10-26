'use strict';
/* ============================================================
   Utilidades matemáticas, de dibujo y DOM
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = {};
  LM.U = U;

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => (v - a) / (b - a || 1);
  U.smoothstep = (a, b, v) => {
    const t = U.clamp((v - a) / (b - a || 1), 0, 1);
    return t * t * (3 - 2 * t);
  };
  U.damp = (a, b, lambda, dt) => U.lerp(a, b, 1 - Math.exp(-lambda * dt));
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.dist2 = (x1, y1, x2, y2) => (x2 - x1) ** 2 + (y2 - y1) ** 2;
  U.angle = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
  U.angleDiff = (a, b) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  U.angleLerp = (a, b, t) => a + U.angleDiff(a, b) * t;
  U.norm = (x, y) => {
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  };
  U.easeOut = t => 1 - (1 - t) ** 3;
  U.easeInOut = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  U.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = arr => arr[(Math.random() * arr.length) | 0];
  U.chance = p => Math.random() < p;

  U.hashString = str => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  U.rng = seed => {
    let a = (typeof seed === 'string' ? U.hashString(seed) : seed) >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  U.rect = (x, y, w, h) => ({ x, y, w, h });
  U.rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  U.pointInRect = (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  U.circleRect = (cx, cy, cr, r) => {
    const nx = U.clamp(cx, r.x, r.x + r.w);
    const ny = U.clamp(cy, r.y, r.y + r.h);
    return U.dist2(cx, cy, nx, ny) < cr * cr;
  };
  U.pointSegmentDistance = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy || 1;
    const t = U.clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
    return U.dist(px, py, x1 + t * dx, y1 + t * dy);
  };
  U.segmentsIntersect = (a, b, c, d) => {
    const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
    const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), t, u };
    }
    return null;
  };
  U.raySegment = (ox, oy, dx, dy, s) => {
    const x3 = s.x1, y3 = s.y1, x4 = s.x2, y4 = s.y2;
    const den = dx * (y4 - y3) - dy * (x4 - x3);
    if (Math.abs(den) < 1e-9) return null;
    const t = ((x3 - ox) * (y4 - y3) - (y3 - oy) * (x4 - x3)) / den;
    const u = ((x3 - ox) * dy - (y3 - oy) * dx) / den;
    if (t > 0.0001 && u >= -0.0001 && u <= 1.0001) {
      return { x: ox + dx * t, y: oy + dy * t, t };
    }
    return null;
  };
  U.rectSegments = (r, out = []) => {
    const x1 = r.x, y1 = r.y, x2 = r.x + r.w, y2 = r.y + r.h;
    out.push({ x1, y1, x2: x2, y2: y1 });
    out.push({ x1: x2, y1, x2: x2, y2 });
    out.push({ x1: x2, y1: y2, x2: x1, y2 });
    out.push({ x1, y1: y2, x2: x1, y2: y1 });
    return out;
  };

  U.createCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  U.roundRect = (ctx, x, y, w, h, r) => {
    if (typeof r === 'number') r = [r, r, r, r];
    const [tl, tr, br, bl] = r;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  };

  U.poly = (ctx, pts, close = true) => {
    if (!pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (close) ctx.closePath();
  };

  U.ellipse = (ctx, x, y, rx, ry, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rot, 0, Math.PI * 2);
  };

  U.gradient = (ctx, x0, y0, x1, y1, stops) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [t, c] of stops) g.addColorStop(t, c);
    return g;
  };

  U.radial = (ctx, x, y, r0, r1, stops, x1 = x, y1 = y) => {
    const g = ctx.createRadialGradient(x, y, r0, x1, y1, r1);
    for (const [t, c] of stops) g.addColorStop(t, c);
    return g;
  };

  U.hexToRgba = (hex, a) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  U.formatTime = seconds => {
    seconds = Math.max(0, Math.floor(seconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  };

  U.escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.wrapLines = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  };

  U.tod = '#3d4b4a';
  U.deepFreeze = o => {
    Object.freeze(o);
    for (const k of Object.keys(o)) if (o[k] && typeof o[k] === 'object') U.deepFreeze(o[k]);
    return o;
  };

  /* simple deterministic 2D value noise for texture work */
  U.noise2 = (x, y, seed = 1) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const h = (a, b) => {
      let n = a * 374761393 + b * 668265263 + seed * 144665;
      n = (n ^ (n >> 13)) * 1274126177;
      return ((n ^ (n >> 16)) >>> 0) / 4294967296;
    };
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return U.lerp(U.lerp(h(xi, yi), h(xi + 1, yi), u), U.lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
  };
  U.fbm = (x, y, seed = 1, oct = 4) => {
    let v = 0, amp = .5, f = 1;
    for (let i = 0; i < oct; i++) {
      v += U.noise2(x * f, y * f, seed + i * 19) * amp;
      f *= 2; amp *= .5;
    }
    return v;
  };

  U.setEl = (el, text) => { if (el) el.textContent = text == null ? '' : String(text); };
  U.show = (el, cls = 'active') => el && el.classList.add(cls);
  U.hide = (el, cls = 'active') => el && el.classList.remove(cls);
  U.wait = ms => new Promise(r => setTimeout(r, ms));

  U.loading = {
    el: null,
    timer: 0,
    show(text) {
      this.el = this.el || U.$('#loading-note');
      if (text && this.el) this.el.lastChild.textContent = ' ' + text;
      if (this.el) this.el.classList.add('show');
      clearTimeout(this.timer);
    },
    hide(delay = 0) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { if (this.el) this.el.classList.remove('show'); }, delay);
    }
  };
})();
