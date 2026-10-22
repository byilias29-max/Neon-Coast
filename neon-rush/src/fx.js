/* NEON RUSH - fx: paleta, particulas, texto flotante, camara y post-proceso */
(function () {
  'use strict';
  const NR = window.NR || {};
  const M = NR.M;
  const TAU = NR.TAU;

  /* ---------------- paleta viva ---------------- */
  const Pal = (NR.Pal = {
    hue: 190, hue2: 320, hue3: 60, wave: 1, heat: 0,
    bg1: '#04050c', bg2: '#080b18',
    update(wave) {
      this.wave = wave;
      this.hue = (190 + wave * 23) % 360;
      this.hue2 = (this.hue + 145) % 360;
      this.hue3 = (this.hue + 280) % 360;
    },
    c(h, s, l, a) { return M.hsl(h, s, l, a); },
    main(a) { return M.hsl(this.hue, 95, 62, a); },
    mainDim(a) { return M.hsl(this.hue, 80, 42, a); },
    alt(a) { return M.hsl(this.hue2, 95, 62, a); },
    warn(a) { return M.hsl(this.hue3, 100, 62, a); },
    white(a) { return 'rgba(255,255,255,' + (a === undefined ? 1 : a) + ')' },
    enemy(a) { return M.hsl(330, 92, 62, a); },
    ether(a) { return M.hsl(145, 95, 62, a); }
  });

  /* ---------------- camara ---------------- */
  const Cam = (NR.Cam = {
    x: 0, y: 0, zoom: 1, tx: 0, ty: 0, trauma: 0, sx: 0, sy: 0, rot: 0,
    shake(a) { this.trauma = Math.min(1, this.trauma + a); },
    kick(x, y) { this.sx += x; this.sy += y; },
    update(dt, w, h, world) {
      this.x = M.damp(this.x, this.tx, 7, dt);
      this.y = M.damp(this.y, this.ty, 7, dt);
      const s = this.trauma * this.trauma;
      this.sx = (Math.random() * 2 - 1) * 34 * s;
      this.sy = (Math.random() * 2 - 1) * 34 * s;
      this.rot = (Math.random() * 2 - 1) * 0.022 * s;
      this.trauma = Math.max(0, this.trauma - dt * 1.9);
    }
  });

  /* ---------------- particulas / efectos ---------------- */
  const FX = (NR.FX = {
    parts: [], texts: [], rings: [], flashes: [], beams: [],
    pool: [], hitstop: 0, flashA: 0, flashCol: '#fff', aberr: 0, zoomPunch: 0,
    maxParts: 1600,

    init() {
      this.pool = [];
      for (let i = 0; i < 900; i++) this.pool.push({});
    },

    clear() {
      this.parts.length = 0; this.texts.length = 0; this.rings.length = 0;
      this.beams.length = 0; this.flashes.length = 0;
      this.hitstop = 0; this.flashA = 0; this.trauma = 0;
    },

    get() {
      let p = this.pool.pop();
      if (!p) p = {};
      return p;
    },

    put(p) { if (this.pool.length < 1200) this.pool.push(p); },

    spawn(x, y, vx, vy, life, size, col, type, opts) {
      if (this.parts.length >= this.maxParts) return null;
      const p = this.get();
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.max = life; p.size = size; p.col = col;
      p.type = type || 'dot';
      p.drag = (opts && opts.drag !== undefined) ? opts.drag : 2.4;
      p.grav = (opts && opts.grav) || 0;
      p.rot = (opts && opts.rot) || Math.random() * TAU;
      p.spin = (opts && opts.spin !== undefined) ? opts.spin : (Math.random() * 2 - 1) * 9;
      p.fade = (opts && opts.fade) || 'linear';
      p.grow = (opts && opts.grow) || 0;
      p.wob = Math.random() * TAU;
      this.parts.push(p);
      return p;
    },

    burst(x, y, n, opts) {
      const o = opts || {};
      const spd = o.speed || 260;
      const col = o.col || Pal.main();
      for (let i = 0; i < n; i++) {
        const a = o.angle !== undefined ? o.angle + M.rand(-o.spread || -0.6, o.spread || 0.6) : Math.random() * TAU;
        const s = spd * M.rand(0.35, 1);
        this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s,
          M.rand(o.lifeMin || 0.3, o.lifeMax || 0.7), M.rand(o.sizeMin || 2, o.sizeMax || 4.5),
          Array.isArray(col) ? M.pick(col) : col, o.type || 'dot',
          { drag: o.drag, grav: o.grav, spin: M.rand(-12, 12) });
      }
    },

    sparks(x, y, ang, n, col, speed) {
      for (let i = 0; i < n; i++) {
        const a = ang + M.rand(-0.9, 0.9);
        const s = (speed || 420) * M.rand(0.4, 1.2);
        this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, M.rand(0.12, 0.3), M.rand(1.5, 3),
          col, 'spark', { drag: 5 });
      }
    },

    shards(x, y, n, col, speed) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const s = (speed || 300) * M.rand(0.3, 1);
        this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, M.rand(0.5, 1.1), M.rand(4, 9),
          col, 'shard', { drag: 2.2, spin: M.rand(-16, 16) });
      }
    },

    smoke(x, y, n, col) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const s = M.rand(10, 70);
        this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, M.rand(0.6, 1.3), M.rand(8, 20),
          col || 'rgba(120,140,180,0.25)', 'smoke', { drag: 1.2, grow: 24 });
      }
    },

    ring(x, y, col, r0, r1, dur, width) {
      this.rings.push({ x, y, col, r0, r1, life: dur, max: dur, w: width || 3 });
    },

    text(x, y, str, col, size, crit) {
      this.texts.push({
        x: x + M.rand(-8, 8), y, str: str, col: col || '#fff', size: size || 15,
        life: crit ? 0.85 : 0.6, max: crit ? 0.85 : 0.6,
        vy: crit ? -95 : -70, vx: M.rand(-22, 22), crit: !!crit
      });
      if (this.texts.length > 90) this.texts.shift();
    },

    beam(x1, y1, x2, y2, col, dur, width) {
      this.beams.push({ x1, y1, x2, y2, col, life: dur, max: dur, w: width || 4 });
    },

    flash(col, a) {
      this.flashes.push({ col, a, life: 0.22, max: 0.22 });
    },

    freeze(sec) { this.hitstop = Math.max(this.hitstop, sec); },

    punch(z) { this.zoomPunch = Math.max(this.zoomPunch, z); },

    update(dt) {
      /* particulas */
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life -= dt;
        if (p.life <= 0) { this.put(p); this.parts.splice(i, 1); continue; }
        const d = Math.exp(-p.drag * dt);
        p.vx *= d; p.vy *= d;
        p.vy += p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.spin * dt;
        p.wob += dt * 6;
        if (p.grow) p.size += p.grow * dt;
      }
      /* textos */
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.life -= dt;
        if (t.life <= 0) { this.texts.splice(i, 1); continue; }
        t.y += t.vy * dt; t.x += t.vx * dt;
        t.vy += 240 * dt;
      }
      /* anillos */
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.life -= dt;
        if (r.life <= 0) this.rings.splice(i, 1);
      }
      /* rayos */
      for (let i = this.beams.length - 1; i >= 0; i--) {
        const b = this.beams[i];
        b.life -= dt;
        if (b.life <= 0) this.beams.splice(i, 1);
      }
      /* flashes */
      for (let i = this.flashes.length - 1; i >= 0; i--) {
        const f = this.flashes[i];
        f.life -= dt;
        if (f.life <= 0) this.flashes.splice(i, 1);
      }
      this.zoomPunch = Math.max(0, this.zoomPunch - dt * 2.2);
    },

    draw(ctx) {
      /* anillos */
      ctx.lineCap = 'round';
      for (const r of this.rings) {
        const t = 1 - r.life / r.max;
        const rad = M.lerp(r.r0, r.r1, M.easeOut(t));
        const a = 1 - t;
        ctx.globalAlpha = a * a;
        ctx.strokeStyle = r.col;
        ctx.lineWidth = r.w * (1 - t * 0.6);
        ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, TAU); ctx.stroke();
      }
      /* rayos */
      for (const b of this.beams) {
        const t = 1 - b.life / b.max;
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.strokeStyle = b.col;
        ctx.lineWidth = b.w * (1 - t);
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      }
      /* particulas */
      for (const p of this.parts) {
        const t = p.life / p.max;
        ctx.globalAlpha = p.fade === 'out' ? t * t : Math.min(1, t * 1.6);
        if (p.type === 'dot') {
          ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.35 + t * 0.65), 0, TAU); ctx.fill();
        } else if (p.type === 'spark') {
          const l = Math.hypot(p.vx, p.vy) * 0.02;
          const a = Math.atan2(p.vy, p.vx);
          ctx.strokeStyle = p.col;
          ctx.lineWidth = p.size * t;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - Math.cos(a) * l, p.y - Math.sin(a) * l);
          ctx.stroke();
        } else if (p.type === 'shard') {
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.col;
          const s = p.size * t;
          ctx.beginPath();
          ctx.moveTo(0, -s); ctx.lineTo(s * 0.62, s * 0.7); ctx.lineTo(-s * 0.62, s * 0.7);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        } else if (p.type === 'smoke') {
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(p.x + Math.sin(p.wob) * 3, p.y, p.size, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },

    drawText(ctx) {
      ctx.textAlign = 'center';
      for (const t of this.texts) {
        const k = t.life / t.max;
        const sc = t.crit ? (1 + (1 - k) * 0.6) : (0.8 + k * 0.25);
        ctx.globalAlpha = Math.min(1, k * 1.8);
        ctx.font = '900 ' + (t.size * sc).toFixed(0) + 'px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(t.str, t.x + 1.5, t.y + 1.5);
        ctx.fillStyle = t.col;
        ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    },

    /* ---------- post-proceso: bloom + aberracion + vignette ---------- */
    post: {
      glow: null, gctx: null, gw: 0, gh: 0,
      vignette: null, scan: null,
      ensure(w, h) {
        if (!this.glow) {
          this.glow = document.createElement('canvas');
          this.gctx = this.glow.getContext('2d');
          this.gA = document.createElement('canvas');
          this.aA = this.gA.getContext('2d');
          this.gB = document.createElement('canvas');
          this.aB = this.gB.getContext('2d');
        }
        const gw = Math.max(120, Math.floor(w / 4)), gh = Math.max(80, Math.floor(h / 4));
        if (this.gw !== gw || this.gh !== gh) {
          this.gw = gw; this.gh = gh;
          this.glow.width = gw; this.glow.height = gh;
          this.gA.width = gw; this.gA.height = gh;
          this.gB.width = gw; this.gB.height = gh;
        }
      },
      buildVignette(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d');
        const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.72);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.62, 'rgba(0,0,0,0.22)');
        g.addColorStop(1, 'rgba(2,2,8,0.86)');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
        this.vignette = c;
        this.vw = w; this.vh = h;
      },
      buildScan(w, h) {
        const c = document.createElement('canvas');
        c.width = 4; c.height = 4;
        const x = c.getContext('2d');
        x.fillStyle = 'rgba(255,255,255,0.028)';
        x.fillRect(0, 0, 4, 1);
        x.fillStyle = 'rgba(0,0,0,0.10)';
        x.fillRect(0, 2, 4, 2);
        this.scan = c;
      }
    },

    apply(ctx, canvas, w, h, opts) {
      const o = opts || {};
      const P = this.post;
      P.ensure(w, h);
      if (!P.vignette || P.vw !== w || P.vh !== h) P.buildVignette(w, h);
      if (!P.scan) P.buildScan(w, h);

      const glowOn = NR.Save.data.settings.glow > 0;
      if (glowOn) {
        /* bloom: se copia el frame a baja resolucion y se difumina */
        const g = P.gctx;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, P.gw, P.gh);
        g.filter = 'blur(2.5px) brightness(1.18) contrast(1.35) saturate(1.35)';
        g.drawImage(canvas, 0, 0, P.gw, P.gh);
        g.filter = 'none';

        /* dos copias tintadas para la aberracion cromatica */
        const ab = this.aberr;
        const draw = (src, ctx2, col, ox, oy) => {
          ctx2.setTransform(1, 0, 0, 1, 0, 0);
          ctx2.globalCompositeOperation = 'source-over';
          ctx2.clearRect(0, 0, P.gw, P.gh);
          ctx2.drawImage(src, 0, 0);
          ctx2.globalCompositeOperation = 'source-in';
          ctx2.fillStyle = col;
          ctx2.fillRect(0, 0, P.gw, P.gh);
          ctx2.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.55;
          ctx.drawImage(ctx2.canvas, ox, oy, w, h);
        };
        ctx.globalCompositeOperation = 'lighter';
        if (ab > 0.4) {
          draw(P.glow, P.aA, 'rgba(255,40,90,0.85)', -ab, -ab * 0.5);
          draw(P.glow, P.aB, 'rgba(40,220,255,0.85)', ab, ab * 0.5);
        } else {
          ctx.globalAlpha = 0.5;
          ctx.drawImage(P.glow, 0, 0, w, h);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      /* scanlines */
      ctx.globalAlpha = 0.5;
      const pat = ctx.createPattern(P.scan, 'repeat');
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      /* vignette */
      ctx.globalAlpha = 0.95;
      ctx.drawImage(P.vignette, 0, 0, w, h);
      ctx.globalAlpha = 1;

      /* flashes de pantalla completa */
      for (const f of this.flashes) {
        ctx.globalAlpha = (f.life / f.max) * f.a;
        ctx.fillStyle = f.col;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = 1;

      /* aberracion extra en modo hiper */
      if (o.hyper > 0) {
        const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
        const hue = (t * 170) % 360;
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, M.hsl(hue, 100, 60, 0.17));
        grad.addColorStop(0.5, M.hsl((hue + 120) % 360, 100, 60, 0.09));
        grad.addColorStop(1, M.hsl((hue + 240) % 360, 100, 60, 0.17));
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        /* barras cinematograficas */
        const bh = h * 0.055;
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(0, 0, w, bh);
        ctx.fillRect(0, h - bh, w, bh);
        ctx.fillStyle = M.hsl(hue, 100, 65, 0.9);
        ctx.fillRect(0, bh - 2, w, 2);
        ctx.fillRect(0, h - bh, w, 2);
      }
    }
  });

  NR.FX = FX;
})();
