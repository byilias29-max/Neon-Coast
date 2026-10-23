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
    },
    /* ------- easing extra para juice ------- */
    easeOutElastic(t) { const c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
    easeOutBounce(t) { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75; else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375; return n1 * (t -= 2.625 / d1) * t + 0.984375; },
    easeInOutExpo(t) { return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; },
    easeOutCirc(t) { return Math.sqrt(1 - Math.pow(t - 1, 2)); },
    /* color utils */
    hsl2rgb(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) }; },
    rgb(h, s, l, a) { const c = this.hsl2rgb(h, s, l); return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a === undefined ? 1 : a) + ')'; },
    /* random gaussian */
    randGauss(mean, std) { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
    /* weighted random */
    weightedPick(items, weightFn) { const weights = items.map(weightFn); const total = weights.reduce((a, b) => a + b, 0); let r = Math.random() * total; for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }
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
        stats: { runs: 0, kills: 0, wave: 0, time: 0, deaths: 0, perfectWaves: 0, hyperActivations: 0, dashes: 0, grazes: 0, chestsOpened: 0, bossesKilled: 0, prestige: 0, totalScore: 0 },
        contracts: { date: '', list: [] },
        weekly: { seed: 0, completed: false, score: 0, modifiers: [] },
        daily: { seed: 0, completed: false, score: 0, modifiers: [] },
        settings: { mute: false, shake: 1, glow: 1, trails: 1, screenshake: 1, hitstop: 1, particles: 1, colorblind: false, reducedFlash: false },
        seen: { intro: false },
        prestige: { level: 0, totalScore: 0, unlockedPerks: {} },
        leaderboards: { daily: [], weekly: [], allTime: [] }
      };
    },

    load() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
      this.data = Object.assign(this.defaults(), d || {});
      this.data.meta = Object.assign({}, d && d.meta);
      this.data.settings = Object.assign({ mute: false, shake: 1, glow: 1, trails: 1, screenshake: 1, hitstop: 1, particles: 1, colorblind: false, reducedFlash: false }, d && d.settings);
      this.data.unlocked = Object.assign({ nova: true }, d && d.unlocked);
      this.data.best = Object.assign({ score: 0, wave: 0, kills: 0, time: 0 }, d && d.best);
      this.data.stats = Object.assign({ runs: 0, kills: 0, wave: 0, time: 0, deaths: 0, perfectWaves: 0, hyperActivations: 0, dashes: 0, grazes: 0, chestsOpened: 0, bossesKilled: 0, prestige: 0, totalScore: 0 }, d && d.stats);
      this.data.contracts = Object.assign({ date: '', list: [] }, d && d.contracts);
      this.data.weekly = Object.assign({ seed: 0, completed: false, score: 0, modifiers: [] }, d && d.weekly);
      this.data.daily = Object.assign({ seed: 0, completed: false, score: 0, modifiers: [] }, d && d.daily);
      this.data.prestige = Object.assign({ level: 0, totalScore: 0, unlockedPerks: {} }, d && d.prestige);
      this.data.leaderboards = Object.assign({ daily: [], weekly: [], allTime: [] }, d && d.leaderboards);
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

    addStat(key, val) {
      if (this.data.stats[key] !== undefined) this.data.stats[key] += val;
      this.save();
    },

    checkPrestige() {
      const p = this.data.prestige;
      const threshold = 100000 + p.level * 50000;
      if (this.data.stats.totalScore >= p.totalScore + threshold) {
        p.level++;
        p.totalScore = this.data.stats.totalScore;
        p.unlockedPerks['prestige_' + p.level] = true;
        NR.Save.data.nucleos += p.level * 500;
        this.save();
        return p.level;
      }
      return 0;
    },

    reset() {
      this.data = this.defaults();
      this.save();
    }
  });

  /* ---------------- prestigio: perks ---------------- */
  const PrestigePerks = {
    list: [
      { id: 'prestige_1', name: 'ECO DE GUERRA', desc: 'Empiezas cada run con +1 arma aleatoria desbloqueada', icon: '⚔' },
      { id: 'prestige_2', name: 'VITALIDAD PRIMORDIAL', desc: '+25% vida máxima base, +1 carga de dash inicial', icon: '♥' },
      { id: 'prestige_3', name: 'FLUJO ETERNO', desc: 'La barra de hiper se llena 30% más rápido', icon: '∞' },
      { id: 'prestige_4', name: 'MAESTRO DE ARMAS', desc: 'Todas las armas empiezan en nivel 1', icon: '⬆' },
      { id: 'prestige_5', name: 'SUERTE DEL CAMPEÓN', desc: '+50% suerte, los cofres aparecen el doble de seguido', icon: '☘' },
      { id: 'prestige_6', name: 'ESCUDO REACTIVO', desc: 'Ganas 15 de escudo al matar un élite', icon: '◇' },
      { id: 'prestige_7', name: 'INSTINTO DEPREDADOR', desc: 'El dash dura 50% más y hace 25% más daño', icon: '⚡' },
      { id: 'prestige_8', name: 'CADENA INFINITA', desc: 'El combo no se rompe por tiempo (solo por daño)', icon: '🔗' },
      { id: 'prestige_9', name: 'ETERNO RETORNO', desc: 'Al morir con hiper cargado, revives una vez al 30% vida', icon: '🔄' },
      { id: 'prestige_10', name: 'ASCENSIÓN', desc: 'Desbloquea avatar secreto: VOID', icon: '☐' }
    ],
    has(id) { return !!NR.Save.data.prestige.unlockedPerks[id]; },
    get(id) { return this.list.find(p => p.id === id); }
  };
  NR.Prestige = { Perks: PrestigePerks };

  NR.Core = { M, Input, Save };
})();
