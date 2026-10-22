/* NEON RUSH - nucleo: matematicas, RNG, input y guardado */
(function () {
  'use strict';
  const NR = (window.NR = window.NR || {});
  const TAU = Math.PI * 2;
  NR.TAU = TAU;

  /* ---------------- matematicas ---------------- */
  const M = (NR.M = {
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    damp(a, b, l, dt) { return a + (b - a) * (1 - Math.exp(-l * dt)); },
    rand(a, b) {
      if (b === undefined) { b = a === undefined ? 1 : a; a = 0; }
      return a + Math.random() * (b - a);
    },
    randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    chance(p) { return Math.random() < p; },
    pick(arr) { return arr[(Math.random() * arr.length) | 0]; },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },
    sign(v) { return v < 0 ? -1 : 1; },
    dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },
    dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
    angDiff(a, b) { let d = (b - a + Math.PI) % TAU; if (d < 0) d += TAU; return d - Math.PI; },
    angLerp(a, b, t) { return a + M.angDiff(a, b) * t; },
    angTo(x, y, tx, ty) { return Math.atan2(ty - y, tx - x); },
    easeOut(t) { return 1 - Math.pow(1 - t, 3); },
    easeIn(t) { return t * t * t; },
    easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    easeOutBack(t) { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    smooth(t) { return t * t * (3 - 2 * t); },
    hsl(h, s, l, a) {
      return 'hsla(' + (((h % 360) + 360) % 360).toFixed(1) + ',' + s + '%,' + l + '%,' +
        (a === undefined ? 1 : a).toFixed(3) + ')';
    },
    /* numeros legibles: 1200 -> 1.2K */
    fmt(n) {
      n = Math.floor(n);
      if (Math.abs(n) < 1000) return '' + n;
      if (Math.abs(n) < 1e6) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K';
      if (Math.abs(n) < 1e9) return (n / 1e6).toFixed(n < 1e7 ? 1 : 0) + 'M';
      return (n / 1e9).toFixed(1) + 'B';
    },
    time(sec) {
      sec = Math.max(0, Math.floor(sec));
      const m = Math.floor(sec / 60), s = sec % 60;
      return m + ':' + (s < 10 ? '0' : '') + s;
    }
  });

  /* ---------------- RNG con semilla ---------------- */
  NR.RNG = function (seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  NR.dailySeed = function () {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  };

  /* ---------------- input ---------------- */
  const Input = (NR.Input = {
    keys: Object.create(null),
    hit: Object.create(null),
    mouse: { x: 0, y: 0, wx: 0, wy: 0, down: false, rdown: false, hitDown: false, hitUp: false, moved: false },
    pad: { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, dash: false, hyper: false, any: false },
    lastInput: 'kb',

    init(canvas) {
      addEventListener('keydown', (e) => {
        const c = e.code;
        if (!this.keys[c]) this.hit[c] = true;
        this.keys[c] = true;
        this.lastInput = 'kb';
        if (c === 'Space' || c.indexOf('Arrow') === 0 || c === 'Tab') e.preventDefault();
      }, { passive: false });
      addEventListener('keyup', (e) => { this.keys[e.code] = false; }, { passive: true });
      addEventListener('blur', () => { this.keys = Object.create(null); this.mouse.down = false; });

      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - r.left);
        this.mouse.y = (e.clientY - r.top);
        this.mouse.moved = true;
        this.lastInput = 'mb';
      };
      canvas.addEventListener('mousemove', pos, { passive: true });
      canvas.addEventListener('mousedown', (e) => {
        pos(e);
        if (e.button === 0) { this.mouse.down = true; this.mouse.hitDown = true; }
        if (e.button === 2) this.mouse.rdown = true;
        this.lastInput = 'mb';
      });
      addEventListener('mouseup', (e) => {
        if (e.button === 0) { this.mouse.down = false; this.mouse.hitUp = true; }
        if (e.button === 2) this.mouse.rdown = false;
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      /* touch: joystick virtual izquierdo, disparo auto a la derecha */
      this.touch = { id: null, ox: 0, oy: 0, x: 0, y: 0, active: false };
      canvas.addEventListener('touchstart', (e) => {
        for (const t of e.changedTouches) {
          const r = canvas.getBoundingClientRect();
          this.touch.id = t.identifier;
          this.touch.ox = t.clientX - r.left; this.touch.oy = t.clientY - r.top;
          this.touch.x = this.touch.ox; this.touch.y = this.touch.oy;
          this.touch.active = true;
          this.lastInput = 'tp';
        }
        e.preventDefault();
      }, { passive: false });
      canvas.addEventListener('touchmove', (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier !== this.touch.id) continue;
          const r = canvas.getBoundingClientRect();
          this.touch.x = t.clientX - r.left; this.touch.y = t.clientY - r.top;
        }
        e.preventDefault();
      }, { passive: false });
      const tend = (e) => {
        for (const t of e.changedTouches) if (t.identifier === this.touch.id) this.touch.active = false;
      };
      canvas.addEventListener('touchend', tend, { passive: true });
      canvas.addEventListener('touchcancel', tend, { passive: true });
    },

    key(c) { return !!this.keys[c]; },
    pressed(c) { return !!this.hit[c]; },
    down(c) { return !!this.keys[c]; },

    axis() {
      let x = 0, y = 0;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) y -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) y += 1;
      if (this.touch.active) {
        const dx = this.touch.x - this.touch.ox, dy = this.touch.y - this.touch.oy;
        const d = Math.hypot(dx, dy);
        if (d > 6) { x = dx / d; y = dy / d; }
      }
      const p = this.pad;
      if (Math.hypot(p.moveX, p.moveY) > 0.18) { x = p.moveX; y = p.moveY; }
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x, y };
    },

    firing() {
      if (this.mouse.down || this.keys['KeyJ']) return true;
      if (this.pad.fire) return true;
      if (this.touch.active && this.lastInput === 'tp') {
        const dx = this.touch.x - this.touch.ox, dy = this.touch.y - this.touch.oy;
        if (Math.hypot(dx, dy) > 34) return true;
      }
      return false;
    },

    dashHit() {
      return this.pressed('Space') || this.pressed('ShiftLeft') || this.pressed('ShiftRight') ||
        this.mouse.rdown && this.mouse.hitDown || this.pad.dash;
    },

    pollPad() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const p = this.pad;
      p.moveX = p.moveY = p.aimX = p.aimY = 0; p.fire = p.dash = p.hyper = false; p.any = false;
      for (const g of pads) {
        if (!g) continue;
        p.moveX = g.axes[0] || 0; p.moveY = g.axes[1] || 0;
        p.aimX = g.axes[2] || 0; p.aimY = g.axes[3] || 0;
        p.fire = !!(g.buttons[7] && g.buttons[7].value > 0.35) || !!(g.buttons[2] && g.buttons[2].pressed);
        p.dash = !!(g.buttons[0] && g.buttons[0].pressed) || !!(g.buttons[5] && g.buttons[5].pressed);
        p.hyper = !!(g.buttons[3] && g.buttons[3].pressed) || !!(g.buttons[1] && g.buttons[1].pressed);
        p.any = p.any || g.buttons.some((b) => b.pressed);
        if (p.any) this.lastInput = 'pad';
        break;
      }
    },

    endFrame() {
      this.hit = Object.create(null);
      this.mouse.hitDown = false; this.mouse.hitUp = false;
    }
  });

  /* ---------------- guardado ---------------- */
  const KEY = 'neonrush.save.v1';
  const Save = (NR.Save = {
    data: null,

    defaults() {
      return {
        nucleos: 0,
        totalNucleos: 0,
        meta: {},
        avatar: 'nova',
        unlocked: { nova: true },
        best: { score: 0, wave: 0, kills: 0, time: 0 },
        stats: { runs: 0, kills: 0, wave: 0, time: 0, deaths: 0 },
        contracts: { date: '', list: [] },
        settings: { mute: false, shake: 1, glow: 1 },
        seen: { intro: false }
      };
    },

    load() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
      this.data = Object.assign(this.defaults(), d || {});
      this.data.meta = Object.assign({}, d && d.meta);
      this.data.settings = Object.assign({ mute: false, shake: 1, glow: 1 }, d && d.settings);
      this.data.unlocked = Object.assign({ nova: true }, d && d.unlocked);
      this.data.best = Object.assign({ score: 0, wave: 0, kills: 0, time: 0 }, d && d.best);
      this.data.stats = Object.assign({ runs: 0, kills: 0, wave: 0, time: 0, deaths: 0 }, d && d.stats);
      return this.data;
    },

    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { }
    },

    addNucleos(n) {
      this.data.nucleos += n;
      this.data.totalNucleos += n;
      this.save();
    },

    reset() {
      this.data = this.defaults();
      this.save();
    }
  });

  NR.Core = { M, Input, Save };
})();
