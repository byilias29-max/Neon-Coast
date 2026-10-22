/* NEON RUSH - director: oleadas infinitas, mutadores y eventos */
(function () {
  'use strict';
  const NR = window.NR || {};
  const M = NR.M, TAU = NR.TAU;
  const E = NR.E;

  const mutators = {
    marea: {
      name: 'MAREJADA', col: '#3ad9ff',
      desc: '+60% de enemigos, -25% de vida enemiga',
      apply(m) { m.count = (m.count || 1) * 1.6; m.hp = (m.hp || 1) * 0.75; }
    },
    sprint: {
      name: 'SPRINT', col: '#ff7ad9',
      desc: 'Los enemigos se mueven un 30% mas rapido',
      apply(m) { m.speed = (m.speed || 1) * 1.3; }
    },
    blindado: {
      name: 'BLINDADO', col: '#c8b6ff',
      desc: '+40% de vida enemiga y escudos',
      apply(m) { m.hp = (m.hp || 1) * 1.4; m.shieldChance = 0.18; }
    },
    tormenta: {
      name: 'TORMENTA', col: '#ff5a5a',
      desc: 'Las balas enemigas vuelan un 55% mas rapido',
      apply(m) { m.bulletSpeed = (m.bulletSpeed || 1) * 1.55; }
    },
    rebote: {
      name: 'REBOTE', col: '#ffe066',
      desc: 'Los enemigos rebotan con fuerza en las paredes',
      apply(m) { m.bounce = true; }
    },
    eliseo: {
      name: 'ELISEO', col: '#7bffb0',
      desc: '+60% de eter recolectado',
      apply(m) { m.xp = (m.xp || 1) * 1.6; }
    },
    gigantes: {
      name: 'GIGANTES', col: '#ff9f45',
      desc: 'Enemigos un 30% mas grandes y duros',
      apply(m) { m.size = (m.size || 1) * 1.3; m.hp = (m.hp || 1) * 1.35; }
    },
    doble: {
      name: 'DOBLE', col: '#ff6ec7',
      desc: 'Los enemigos se parten al morir',
      apply(m) { m.split = true; }
    },
    vortice: {
      name: 'VORTICE', col: '#9d7bff',
      desc: 'Las balas enemigas se curvan',
      apply(m) { m.curve = true; }
    },
    furia: {
      name: 'FURIA', col: '#ff3b5c',
      desc: 'Los enemigos atacan un 45% mas rapido',
      apply(m) { m.attack = (m.attack || 1) * 1.45; }
    },
    elites: {
      name: 'ELITES', col: '#ffe9a8',
      desc: 'Muchos enemigos de élite',
      apply(m) { m.elite = 0.3; }
    }
  };

  const events = {
    purga: {
      name: 'PURGA', col: '#ff4d8d',
      desc: 'Lluvia de balas por todos lados (mas eter)',
      start(g) { g.run.event = { kind: 'purga', t: 16, timer: 0.9 }; }
    },
    oro: {
      name: 'ORO', col: '#ffd166',
      desc: 'Todo el eter vale x3',
      start(g) { g.run.event = { kind: 'oro', t: 18 }; }
    },
    promesa: {
      name: 'PROMESA', col: '#8affc1',
      desc: '8 segundos de calma y una carta gratis',
      start(g) { g.run.event = { kind: 'promesa', t: 8 }; }
    },
    histeria: {
      name: 'HISTERIA', col: '#ff8a3d',
      desc: 'Todo va al doble de velocidad (puntos x2)',
      start(g) {
        g.run.event = { kind: 'histeria', t: 16 };
        for (const e of NR.E.enemies) e.spd *= 1.8;
      }
    }
  };

  const Director = (NR.Director = {
    wave: 0,
    phase: 'idle',       /* idle | intermission | active */
    timer: 0,
    queue: [],
    mods: {},
    modNames: [],
    event: null,
    banner: null,
    boss: null,
    killsThisWave: 0,

    reset() {
      this.wave = 0; this.phase = 'idle'; this.timer = 0; this.queue = [];
      this.mods = {}; this.modNames = []; this.event = null; this.banner = null;
      this.boss = null;
    },

    /* --------- eleccion de mutadores --------- */
    pickMods(wave) {
      const keys = Object.keys(mutators);
      const m = { hp: 1, speed: 1, count: 1, xp: 1, size: 1, bulletSpeed: 1 };
      const names = [];
      const n = (wave % 10 === 0) ? 1 : (wave % 3 === 0 ? 2 : 1);
      const pool = keys.slice();
      for (let i = 0; i < n && pool.length; i++) {
        const k = pool.splice((Math.random() * pool.length) | 0, 1)[0];
        mutators[k].apply(m);
        names.push(k);
      }
      /* los modificadores siempre unpredictables: +1 extra a partir de la oleada 15 */
      if (wave >= 15 && Math.random() < 0.35 && pool.length) {
        const k = pool.splice((Math.random() * pool.length) | 0, 1)[0];
        mutators[k].apply(m);
        names.push(k);
      }
      this.mods = m; this.modNames = names;
      return names;
    },

    /* --------- composicion de la oleada --------- */
    buildWave(wave, g) {
      const budget = 13 + wave * 6 + Math.pow(wave, 1.42) * 0.85;
      const m = this.mods;
      const list = [];
      const types = Object.keys(NR.Enemies.defs).filter(k => NR.Enemies.defs[k].wave <= wave + 2);
      let spent = 0;
      let guard = 0;
      while (spent < budget && guard++ < 200) {
        /* prefiere enemigos caros cuando el presupuesto lo permite */
        const fit = types.filter(k => NR.Enemies.defs[k].cost <= budget - spent + 6);
        if (!fit.length) break;
        const t = fit[(Math.random() * fit.length) | 0];
        const d = NR.Enemies.defs[t];
        list.push(t);
        spent += d.cost;
      }
      /* elite */
      if (m.elite) {
        const nEl = Math.floor(list.length * m.elite);
        for (let i = 0; i < nEl; i++) list[(Math.random() * list.length) | 0] = list[(Math.random() * list.length) | 0];
      }
      return list;
    },

    spawnPos(g) {
      const p = g.player, W = g.world;
      for (let i = 0; i < 24; i++) {
        let x, y;
        if (Math.random() < 0.72) {
          const side = (Math.random() * 4) | 0;
          if (side === 0) { x = M.rand(40, W.w - 40); y = -40; }
          else if (side === 1) { x = M.rand(40, W.w - 40); y = W.h + 40; }
          else if (side === 2) { x = -40; y = M.rand(40, W.h - 40); }
          else { x = W.w + 40; y = M.rand(40, W.h - 40); }
        } else {
          x = M.rand(60, W.w - 60); y = M.rand(60, W.h - 60);
        }
        if (M.dist(x, y, p.x, p.y) > 330) return { x, y };
      }
      return { x: M.rand(40, W.w - 40), y: -40 };
    },

    startWave(n, g) {
      this.wave = n;
      g.run.wave = n;
      NR.Pal.update(n);
      this.pickMods(n);
      const run = g.run;

      run.mods = this.mods;
      run.modNames = this.modNames.slice();
      run.waveDamage = 0;
      this.killsThisWave = 0;

      if (n % 10 === 0) {
        /* ---------- OLEADA DE JEFE ---------- */
        this.phase = 'active';
        this.queue = [];
        this.boss = NR.Enemies.spawnBoss(n, g);
        g.boss = this.boss;
        this.banner = { title: 'JEFE: ' + this.boss.kind.toUpperCase(), sub: 'oleada ' + n + ' · preparate', desc: 'el jefe rompe las reglas', life: 2.8, max: 2.8, col: '#ff4d8d' };
        NR.Audio.boss();
        return;
      }

      this.phase = 'active';
      const list = this.buildWave(n, g);
      const m = this.mods;
      const spawnCount = Math.max(1, Math.round(list.length * m.count));
      this.queue = [];
      let time = 0;
      const gap = Math.max(0.12, 0.75 - n * 0.008);
      for (let i = 0; i < spawnCount; i++) {
        const type = list[i % list.length];
        time += gap * M.rand(0.4, 1.6);
        this.queue.push({ type, t: time });
      }
      const names = this.modNames.map(k => mutators[k].name);
      const descs = this.modNames.map(k => mutators[k].desc);
      this.banner = {
        title: 'OLEADA ' + n,
        sub: names.length ? names.join('  +  ') : 'sigue asi',
        desc: descs.length ? descs.join('   ·   ') : '',
        life: 2.8, max: 2.8, col: NR.Pal.main()
      };
      NR.Audio.waveUp();
      NR.FX.flash(NR.Pal.main(0.12), 0.5);

      /* cofre de neon cada 5 oleadas: un objetivo que perseguir */
      if (n % 5 === 0) {
        let cx = M.rand(200, g.world.w - 200), cy = M.rand(200, g.world.h - 200);
        let guard = 0;
        while (M.dist(cx, cy, g.player.x, g.player.y) < 320 && guard++ < 20) {
          cx = M.rand(200, g.world.w - 200); cy = M.rand(200, g.world.h - 200);
        }
        E.spawnPickup('chest', cx, cy, { r: 16 });
        NR.FX.ring(cx, cy, '#ffd166', 6, 90, 0.8, 4);
      }

      /* evento especial cada 5 oleadas */
      if (n % 5 === 0 && n > 5) {
        const keys = Object.keys(events);
        const k = keys[(Math.random() * keys.length) | 0];
        events[k].start(g);
        this.banner = { title: 'EVENTO: ' + events[k].name, sub: events[k].desc, life: 3, max: 3, col: events[k].col };
      }
    },

    update(dt, g) {
      const run = g.run;

      if (this.banner) {
        this.banner.life -= dt;
        if (this.banner.life <= 0) this.banner = null;
      }

      /* evento activo */
      if (this.event) {
        this.event.t -= dt;
        if (this.event.kind === 'purga') {
          this.event.timer -= dt;
          if (this.event.timer <= 0) {
            this.event.timer = 0.55;
            const W = g.world;
            for (let i = 0; i < 8; i++) {
              const a = Math.random() * TAU;
              const x = g.player.x + Math.cos(a) * 900;
              const y = g.player.y + Math.sin(a) * 900;
              E.spawnEB(x, y, a + Math.PI + M.rand(-0.3, 0.3), 190, 10, 6, { life: 6 });
            }
            NR.FX.flash('rgba(255,60,120,0.08)', 0.4);
          }
        }
        if (this.event.kind === 'histeria') {
          /* ya aplicado al empezar: solo cuenta el tiempo */
        }
        if (this.event.t <= 0) {
          const was = this.event.kind;
          this.event = null;
          run.event = null;
          if (was === 'promesa') g.queueCard();
        }
      }
      run.event = this.event;

      if (this.phase === 'intermission') {
        this.timer -= dt;
        if (this.timer <= 0) this.startWave(this.wave + 1, g);
        return;
      }

      if (this.phase === 'active') {
        /* la promesa congela la aparicion de enemigos */
        const freeze = this.event && this.event.kind === 'promesa';
        /* spawns programados */
        for (let i = this.queue.length - 1; i >= 0 && !freeze; i--) {
          const s = this.queue[i];
          s.t -= dt;
          if (s.t <= 0) {
            this.queue.splice(i, 1);
            const pos = this.spawnPos(g);
            const m = this.mods;
            const elite = m.elite && Math.random() < m.elite;
            const em = {
              hp: m.hp, speed: m.speed * (this.event && this.event.kind === 'histeria' ? 1.8 : 1),
              size: m.size, xp: m.xp * (this.event && this.event.kind === 'oro' ? 1 : 1),
              bulletSpeed: m.bulletSpeed, split: m.split, curve: m.curve,
              elite: elite
            };
            const e = NR.Enemies.spawn(s.type, pos.x, pos.y, em);
            if (e && elite) NR.FX.ring(e.x, e.y, '#ffe9a8', 6, 60, 0.4, 3);
          }
        }

        /* fin de oleada */
        if (!this.queue.length && E.enemies.length === 0) {
          this.phase = 'intermission';
          this.timer = 3.2;
          run.wavesCleared = this.wave;
          run.score += 120 * this.wave;
          g.onWaveCleared(this.wave);
        }
      }
    }
  });

  NR.Director = Director;
  NR.Mutators = mutators;
  NR.Events = events;
})();
