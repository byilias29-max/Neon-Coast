/* NEON RUSH - enemigos, IA y jefes */
(function () {
  'use strict';
  const NR = window.NR || {};
  const M = NR.M, TAU = NR.TAU;
  const E = NR.E;

  const defs = {
    runner: { hp: 16, spd: 168, r: 11, xp: 3, cost: 3, wave: 1, dmg: 7, hue: 340 },
    mine: { hp: 10, spd: 195, r: 10, xp: 4, cost: 5, wave: 3, dmg: 14, hue: 25 },
    shooter: { hp: 24, spd: 95, r: 12, xp: 6, cost: 6, wave: 4, dmg: 7, hue: 300 },
    charger: { hp: 32, spd: 88, r: 13, xp: 7, cost: 7, wave: 5, dmg: 10, hue: 15 },
    weaver: { hp: 26, spd: 145, r: 11, xp: 8, cost: 8, wave: 6, dmg: 9, hue: 275 },
    splitter: { hp: 48, spd: 105, r: 16, xp: 9, cost: 10, wave: 7, dmg: 10, hue: 350 },
    orbiter: { hp: 34, spd: 132, r: 13, xp: 9, cost: 11, wave: 8, dmg: 8, hue: 312 },
    shield: { hp: 64, spd: 84, r: 15, xp: 12, cost: 13, wave: 9, dmg: 11, hue: 330 },
    turret: { hp: 78, spd: 0, r: 19, xp: 15, cost: 16, wave: 11, dmg: 9, hue: 288 },
    brute: { hp: 135, spd: 64, r: 24, xp: 20, cost: 22, wave: 13, dmg: 15, hue: 5 }
  };

  const Enemies = (NR.Enemies = {
    list: E.enemies,
    defs,

    spawn(type, x, y, mods) {
      const d = defs[type];
      if (!d) return null;
      const m = mods || {};
      const elite = !!m.elite;
      const hpMult = (m.hp || 1) * (elite ? 2.4 : 1);
      const sizeMult = (m.size || 1) * (elite ? 1.22 : 1);
      const e = {
        type, def: d,
        x, y, vx: 0, vy: 0,
        r: d.r * 1.15 * sizeMult,
        hp: d.hp * hpMult, maxHp: d.hp * hpMult,
        spd: d.spd * (m.speed || 1) * (elite ? 1.12 : 1),
        dmg: d.dmg * (elite ? 1.25 : 1),
        xp: d.xp * (m.xp || 1) * (elite ? 2 : 1),
        elite, mods: m,
        flash: 0, dead: false, t: Math.random() * 10,
        state: 0, timer: M.rand(0.4, 1.6), atkCd: M.rand(0.5, 2),
        hitCd: 0, spin: Math.random() * TAU, wob: Math.random() * TAU,
        born: 0.32, face: Math.random() * TAU
      };
      E.enemies.push(e);
      /* efecto de aparicion */
      NR.FX.ring(x, y, NR.Pal.enemy(0.9), 4, e.r * 3.4, 0.35, 3);
      NR.FX.burst(x, y, 6, { col: NR.Pal.enemy(), speed: 160, sizeMin: 1.5, sizeMax: 3 });
      return e;
    },

    nearest(x, y, max) {
      let best = null, bd = max * max;
      for (const e of E.enemies) {
        if (e.dead) continue;
        const d = M.dist2(x, y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    },

    damage(e, dmg, crit, g, src) {
      if (e.dead) return;
      e.hp -= dmg;
      e.flash = 1;
      const col = crit ? '#fff2a8' : NR.Pal.white(0.95);
      NR.FX.text(e.x + M.rand(-6, 6), e.y - e.r - 4, String(Math.round(dmg)), col, crit ? 21 : 14, crit);
      NR.FX.sparks(e.x, e.y, Math.random() * TAU, crit ? 9 : 5, crit ? '#fff0a0' : '#dff', crit ? 420 : 300);
      if (src !== 'silent') NR.Audio.hit(crit);
      if (e.hp <= 0) this.kill(e, g);
    },

    kill(e, g) {
      if (e.dead) return;
      e.dead = true;
      const big = e.r > 20 || e.boss;
      const run = g.run;

      /* combo */
      run.combo++;
      run.comboT = 2.6;
      run.kills++;
      if (e.elite) run.eliteKills++;
      const mult = run.multiplier();
      run.score += Math.round((e.boss ? 4000 : 12 + e.r * 2) * mult);

      /* flujo (motor del hiper) */
      const gain = big ? 14 : 5;
      g.player.flow = Math.min(100, g.player.flow + gain);

      /* efectos */
      const col = NR.Pal.enemy();
      NR.FX.burst(e.x, e.y, big ? 30 : 12, {
        col: [col, NR.Pal.main(), '#fff'], speed: big ? 480 : 330,
        sizeMin: 2, sizeMax: big ? 7 : 4.5, type: 'dot'
      });
      NR.FX.shards(e.x, e.y, big ? 14 : 6, col, big ? 420 : 280);
      NR.FX.ring(e.x, e.y, NR.Pal.white(0.85), e.r * 0.6, e.r * (big ? 5 : 3.2), big ? 0.45 : 0.28, big ? 5 : 3);
      NR.Cam.shake(big ? 0.34 : 0.09);
      NR.Audio.kill(run.combo, big);
      if (run.combo > 0 && run.combo % 10 === 0) {
        NR.FX.text(e.x, e.y - 30, 'COMBO x' + run.combo, '#ffe66d', 20, true);
        NR.FX.flash('rgba(255,220,120,0.18)', 0.6);
        NR.FX.punch(0.05);
        g.player.comboFlash = 1;
      }

      /* ether */
      const drops = big ? 4 : 1;
      for (let i = 0; i < drops; i++) {
        E.spawnPickup('ether', e.x + M.rand(-8, 8), e.y + M.rand(-8, 8), { value: e.xp / drops + 0.5 });
      }
      /* botin raro */
      const luck = run.stats.luck;
      if (Math.random() < 0.02 + luck * 0.02 + (e.elite ? 0.05 : 0)) E.spawnPickup('core', e.x, e.y, { value: 1 });
      if (Math.random() < 0.045 + luck * 0.02) E.spawnPickup('heart', e.x, e.y);
      if (Math.random() < 0.018 + luck * 0.02) E.spawnPickup('magnet', e.x, e.y);
      if (Math.random() < 0.016 + luck * 0.02) E.spawnPickup('bomb', e.x, e.y);
      if (Math.random() < 0.03 + luck * 0.02) E.spawnPickup('shield', e.x, e.y);

      /* al morir, algunos se parten */
      if (e.mods.split && !e.elite && e.r > 8) {
        for (let i = 0; i < 2; i++) {
          const c = this.spawn('runner', e.x + M.rand(-10, 10), e.y + M.rand(-10, 10), e.mods);
          if (c) { c.r *= 0.7; c.hp = c.maxHp = 9; c.xp = 1; }
        }
      }
      if (e.boss) {
        NR.Audio.explode();
        NR.FX.freeze(0.28);
        NR.FX.flash('rgba(255,255,255,0.6)', 1);
        NR.Cam.shake(0.9);
        g.onBossDead();
      }
    },

    /* ---------------- jefes ---------------- */
    bossKinds: ['nucleo', 'enjambre', 'centro'],

    spawnBoss(wave, g) {
      const kind = this.bossKinds[Math.floor(wave / 10 - 1) % this.bossKinds.length];
      const hp = 720 + wave * 150;
      /* aparece cerca del jugador para que se vea el combate */
      const a = Math.random() * TAU;
      let bx = g.player.x + Math.cos(a) * 420;
      let by = g.player.y + Math.sin(a) * 420;
      bx = M.clamp(bx, 120, g.world.w - 120);
      by = M.clamp(by, 120, g.world.h - 120);
      const b = {
        type: 'boss', boss: true, kind,
        def: { hue: 340 },
        x: bx, y: by, vx: 0, vy: 0,
        r: kind === 'enjambre' ? 52 : 46,
        hp, maxHp: hp, spd: kind === 'centro' ? 95 : 70,
        dmg: 26, xp: 220, elite: true, mods: { speed: 1, hp: 1 },
        flash: 0, dead: false, t: 0, state: 0, timer: 1.2, atkCd: 1,
        hitCd: 0, spin: 0, wob: 0, born: 1, face: Math.PI / 2,
        phase: 0, ring: 0, summonCd: 3
      };
      E.enemies.push(b);
      NR.FX.ring(b.x, b.y, '#ff4d8d', 10, 320, 0.9, 8);
      NR.Audio.boss();
      return b;
    },

    /* ---------------- IA ---------------- */
    update(dt, g) {
      const p = g.player;
      const ts = g.run.hyperActive ? 0.34 : 1;   /* tiempo ralentizado en hiper */

      for (let i = E.enemies.length - 1; i >= 0; i--) {
        const e = E.enemies[i];
        if (e.dead) { E.enemies.splice(i, 1); continue; }
        e.t += dt;
        e.flash = Math.max(0, e.flash - dt * 4);
        e.born = Math.max(0, e.born - dt);
        e.hitCd = Math.max(0, e.hitCd - dt);
        if (e.boss) { this.updateBoss(e, dt * ts, g); continue; }

        const d = M.dist(e.x, e.y, p.x, p.y);
        const toP = M.angTo(e.x, e.y, p.x, p.y);
        let ax = 0, ay = 0;

        switch (e.type) {
          case 'runner': {
            ax = Math.cos(toP); ay = Math.sin(toP);
            break;
          }
          case 'mine': {
            ax = Math.cos(toP); ay = Math.sin(toP);
            e.atkCd -= dt;
            if (e.atkCd <= 0 && d < 190) {
              e.atkCd = 2.4;
              e.state = 1;
            }
            if (e.state === 1) {
              e.vx = M.damp(e.vx, 0, 8, dt); e.vy = M.damp(e.vy, 0, 8, dt);
              if (e.t % 0.2 < dt) NR.FX.sparks(e.x, e.y, Math.random() * TAU, 2, '#ffd05a', 180);
              if (e.atkCd < 1.9) {
                /* explode */
                e.dead = true;
                NR.FX.ring(e.x, e.y, '#ffca3a', 10, 150, 0.35, 6);
                NR.FX.burst(e.x, e.y, 26, { col: ['#ffca3a', '#ff7a3a'], speed: 420, sizeMin: 2, sizeMax: 6 });
                NR.Cam.shake(0.26);
                NR.Audio.explode();
                if (d < 120) NR.Player.hurt(g, e.dmg);
                for (const o of E.enemies) {
                  if (o.dead || o === e) continue;
                  if (M.dist(e.x, e.y, o.x, o.y) < 120) this.damage(o, 20, false, g, 'silent');
                }
                continue;
              }
            }
            break;
          }
          case 'shooter': {
            const want = 230;
            const err = d - want;
            ax = Math.cos(toP) * (err > 0 ? 1 : -0.6);
            ay = Math.sin(toP) * (err > 0 ? 1 : -0.6);
            e.atkCd -= dt;
            if (e.atkCd <= 0 && d < 620) {
              e.atkCd = M.rand(1.1, 1.9);
              const sp = 250 * (e.mods.bulletSpeed || 1);
              E.spawnEB(e.x + Math.cos(toP) * (e.r + 6), e.y + Math.sin(toP) * (e.r + 6), toP,
                sp, e.dmg, 6, { life: 4, curve: e.mods.curve ? 0.6 : 0 });
              NR.FX.sparks(e.x + Math.cos(toP) * (e.r + 6), e.y + Math.sin(toP) * (e.r + 6), toP, 3, NR.Pal.enemy(), 150);
            }
            break;
          }
          case 'charger': {
            e.state = e.state || 0;
            if (e.state === 0) {
              ax = Math.cos(toP) * 0.4; ay = Math.sin(toP) * 0.4;
              e.atkCd -= dt;
              if (e.atkCd <= 0 && d < 460) {
                e.state = 1; e.timer = 0.55;
                e.face = toP;
              }
            } else if (e.state === 1) {
              e.timer -= dt;
              ax = 0; ay = 0;
              if (e.timer <= 0) {
                e.state = 2; e.timer = 0.42;
                e.vx = Math.cos(e.face) * 760; e.vy = Math.sin(e.face) * 760;
                NR.FX.sparks(e.x, e.y, e.face + Math.PI, 8, '#ff9d4d', 260);
              }
            } else {
              e.timer -= dt;
              if (e.timer <= 0) { e.state = 0; e.atkCd = M.rand(1.2, 2); }
            }
            break;
          }
          case 'weaver': {
            e.atkCd -= dt;
            if (e.atkCd <= 0) {
              e.atkCd = M.rand(1.4, 2.4);
              e.state = 0.22;
              NR.FX.burst(e.x, e.y, 10, { col: NR.Pal.enemy(), speed: 200 });
            }
            if (e.state > 0) {
              e.state -= dt;
              e.x += M.rand(-1, 1) * 520 * dt;
              e.y += M.rand(-1, 1) * 520 * dt;
              ax = 0; ay = 0;
            } else {
              ax = Math.cos(toP); ay = Math.sin(toP);
            }
            break;
          }
          case 'splitter': {
            ax = Math.cos(toP); ay = Math.sin(toP);
            break;
          }
          case 'orbiter': {
            const want = 170;
            const tang = toP + Math.PI / 2 * (e.face > 0 ? 1 : -1);
            ax = Math.cos(tang) * 1.1 + Math.cos(toP) * (d - want) * 0.006;
            ay = Math.sin(tang) * 1.1 + Math.sin(toP) * (d - want) * 0.006;
            e.atkCd -= dt;
            if (e.atkCd <= 0) {
              e.atkCd = M.rand(1.5, 2.3);
              const sp = 235 * (e.mods.bulletSpeed || 1);
              for (let k = -1; k <= 1; k++) {
                E.spawnEB(e.x, e.y, toP + k * 0.28, sp, e.dmg, 6, { life: 4, curve: e.mods.curve ? 0.8 : 0 });
              }
            }
            break;
          }
          case 'shield': {
            ax = Math.cos(toP); ay = Math.sin(toP);
            e.spin += dt * 1.8;
            e.atkCd -= dt;
            if (e.atkCd <= 0 && d < 500) {
              e.atkCd = M.rand(1.8, 2.6);
              E.spawnEB(e.x, e.y, toP, 210 * (e.mods.bulletSpeed || 1), e.dmg, 7, { life: 4 });
            }
            break;
          }
          case 'turret': {
            e.atkCd -= dt;
            if (e.atkCd <= 0) {
              e.atkCd = M.rand(1.2, 1.8);
              const sp = 275 * (e.mods.bulletSpeed || 1);
              for (let k = 0; k < 3; k++) {
                E.spawnEB(e.x, e.y, toP + (k - 1) * 0.22, sp, e.dmg, 6, { life: 4, curve: e.mods.curve ? 0.7 : 0 });
              }
              if (Math.random() < 0.45) {
                const a = Math.random() * TAU;
                const s = this.spawn('runner', e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, e.mods);
                if (s) NR.FX.ring(s.x, s.y, NR.Pal.enemy(), 4, 30, 0.3, 2);
              }
            }
            break;
          }
          case 'brute': {
            ax = Math.cos(toP); ay = Math.sin(toP);
            e.atkCd -= dt;
            if (e.atkCd <= 0 && d < 420) {
              e.atkCd = M.rand(2.2, 3.2);
              e.state = 0.6;
              NR.FX.ring(e.x, e.y, '#ff5a7a', e.r, e.r + 40, 0.5, 4);
            }
            if (e.state > 0) {
              e.state -= dt;
              ax = 0; ay = 0;
              if (e.state <= 0) {
                NR.Cam.shake(0.3);
                NR.FX.ring(e.x, e.y, '#ff5a7a', 20, 190, 0.4, 6);
                NR.Audio.explode();
                if (d < 180) NR.Player.hurt(g, e.dmg);
              }
            }
            break;
          }
        }

        /* --- fisica comun --- */
        const acc = 900;
        e.vx += ax * acc * dt * (e.state === 2 ? 0 : 1);
        e.vy += ay * acc * dt * (e.state === 2 ? 0 : 1);
        if (e.state !== 2) {
          e.vx = M.damp(e.vx, 0, 3.4, dt);
          e.vy = M.damp(e.vy, 0, 3.4, dt);
        }
        if (e.type === 'orbiter' || e.type === 'shield' || e.type === 'turret' || e.type === 'brute') {
          e.vx = M.damp(e.vx, ax * e.spd, 5, dt);
          e.vy = M.damp(e.vy, ay * e.spd, 5, dt);
        } else {
          e.vx = M.damp(e.vx, ax * e.spd, 6, dt);
          e.vy = M.damp(e.vy, ay * e.spd, 6, dt);
        }
        e.x += e.vx * dt; e.y += e.vy * dt;

        /* limites y obstaculos */
        const W = g.world;
        if (e.x < e.r) { e.x = e.r; e.vx = Math.abs(e.vx) * 0.5; }
        if (e.x > W.w - e.r) { e.x = W.w - e.r; e.vx = -Math.abs(e.vx) * 0.5; }
        if (e.y < e.r) { e.y = e.r; e.vy = Math.abs(e.vy) * 0.5; }
        if (e.y > W.h - e.r) { e.y = W.h - e.r; e.vy = -Math.abs(e.vy) * 0.5; }
        for (const o of E.obstacles) {
          const res = E.resolveRect(e.x, e.y, e.r, o);
          if (res) { e.x = res.x; e.y = res.y; }
        }

        /* --- contacto con el jugador --- */
        if (e.born <= 0 && e.hitCd <= 0) {
          const dd = M.dist(e.x, e.y, p.x, p.y);
          if (dd < e.r + p.r) {
            NR.Player.hurt(g, e.dmg);
            e.hitCd = 0.6;
            /* rebote */
            const a = M.angTo(p.x, p.y, e.x, e.y);
            e.vx += Math.cos(a) * 220; e.vy += Math.sin(a) * 220;
          }
        }
      }
    },

    updateBoss(b, dt, g) {
      const p = g.player;
      b.t += dt;
      b.flash = Math.max(0, b.flash - dt * 4);
      b.atkCd -= dt;
      const toP = M.angTo(b.x, b.y, p.x, p.y);
      const d = M.dist(b.x, b.y, p.x, p.y);

      /* patrones por fase de vida */
      const hpFrac = b.hp / b.maxHp;
      b.phase = hpFrac > 0.6 ? 0 : hpFrac > 0.3 ? 1 : 2;

      let ax = 0, ay = 0;
      if (b.kind === 'nucleo') {
        /* se mueve en circulos y dispara anillos */
        ax = Math.cos(b.t * 0.7) * 0.7 + Math.cos(toP) * (d > 340 ? 0.5 : -0.2);
        ay = Math.sin(b.t * 0.9) * 0.7 + Math.sin(toP) * (d > 340 ? 0.5 : -0.2);
        if (b.atkCd <= 0) {
          b.atkCd = 1.5 - b.phase * 0.35;
          const n = 12 + b.phase * 4;
          const off = b.t * 1.3;
          for (let i = 0; i < n; i++) {
            const a = off + (i / n) * TAU;
            E.spawnEB(b.x + Math.cos(a) * 40, b.y + Math.sin(a) * 40, a, 230, b.dmg, 7,
              { life: 4.2, curve: 0.25 });
          }
          NR.FX.ring(b.x, b.y, '#ff4d8d', 30, 90, 0.3, 4);
        }
      } else if (b.kind === 'enjambre') {
        ax = Math.cos(toP) * 0.9; ay = Math.sin(toP) * 0.9;
        b.summonCd -= dt;
        if (b.summonCd <= 0) {
          b.summonCd = 1.5 - b.phase * 0.35;
          const n = 2 + b.phase;
          for (let i = 0; i < n; i++) {
            const a = Math.random() * TAU;
            const s = Enemies.spawn('runner', b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60, { speed: 1.15 });
            if (s) s.hp = s.maxHp = 26;
          }
        }
        if (b.atkCd <= 0) {
          b.atkCd = 1.1 - b.phase * 0.2;
          const n = 8 + b.phase * 3;
          const off = b.t * 2.1;
          for (let i = 0; i < n; i++) {
            E.spawnEB(b.x, b.y, off + (i / n) * TAU, 245, b.dmg, 6, { life: 4, curve: 0.5 });
          }
        }
      } else { /* centro */
        ax = Math.cos(toP) * (d > 300 ? 1 : -0.3);
        ay = Math.sin(toP) * (d > 300 ? 1 : -0.3);
        b.spin += dt * 1.4;
        /* balas orbitando */
        b.ring += dt * 1.7;
        if (b.ring > 0.42) {
          b.ring = 0;
          for (let i = 0; i < 4; i++) {
            const a = b.spin + (i / 4) * TAU;
            E.spawnEB(b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60, a, 260, b.dmg, 6, { life: 3.4 });
          }
        }
        if (b.atkCd <= 0) {
          b.atkCd = 2.1 - b.phase * 0.45;
          const sp = 300;
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU + b.t;
            E.spawnEB(b.x, b.y, a, sp, b.dmg, 7, { life: 3.6 });
          }
        }
      }

      b.vx = M.damp(b.vx, ax * b.spd, 4, dt);
      b.vy = M.damp(b.vy, ay * b.spd, 4, dt);
      b.x += b.vx * dt; b.y += b.vy * dt;
      const W = g.world;
      b.x = M.clamp(b.x, b.r, W.w - b.r);
      b.y = M.clamp(b.y, b.r, W.h - b.r);

      if (b.hitCd <= 0 && d < b.r + p.r) {
        NR.Player.hurt(g, b.dmg);
        b.hitCd = 0.8;
      }
    },

    /* ---------------- dibujo ---------------- */
    draw(ctx, g) {
      for (const e of E.enemies) {
        if (e.boss) { this.drawBoss(ctx, e, g); continue; }
        const d = e.def;
        const hue = d.hue;
        const col = M.hsl(hue, 92, 66);
        const col2 = M.hsl(hue, 90, 32);
        const sc = e.born > 0 ? 1 - e.born / 0.32 : 1;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(sc, sc);
        ctx.rotate(e.type === 'shield' ? e.spin : 0);

        /* halo */
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(0, 0, e.r * 2.1, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = col2;
        ctx.strokeStyle = e.flash > 0.05 ? '#fff' : col;
        ctx.lineWidth = 2.6;

        const r = e.r;
        if (e.type === 'runner') {
          ctx.beginPath();
          ctx.moveTo(r * 1.2, 0); ctx.lineTo(-r * 0.7, r * 0.85); ctx.lineTo(-r * 0.7, -r * 0.85);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (e.type === 'brute') {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + e.wob * 0.3;
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (e.type === 'shooter' || e.type === 'turret') {
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * TAU + Math.PI / 4;
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.rotate(e.type === 'turret' ? Math.atan2(g.player.y - e.y, g.player.x - e.x) : e.face);
          ctx.fillStyle = col;
          ctx.fillRect(r * 0.4, -3, r * 0.9, 6);
          ctx.rotate(e.type === 'turret' ? -Math.atan2(g.player.y - e.y, g.player.x - e.x) : -e.face);
        } else if (e.type === 'charger') {
          ctx.rotate(Math.atan2(g.player.y - e.y, g.player.x - e.x));
          ctx.beginPath();
          ctx.moveTo(r * 1.5, 0); ctx.lineTo(-r * 0.8, r * 0.8); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(-r * 0.8, -r * 0.8);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
        }

        /* detalles por tipo */
        if (e.type === 'mine') {
          ctx.strokeStyle = '#ffd05a';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, r * (1.5 + Math.sin(e.t * 12) * 0.15), 0, TAU); ctx.stroke();
        }
        if (e.type === 'shield') {
          ctx.strokeStyle = 'rgba(160,220,255,0.85)';
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(0, 0, r * 1.35, -0.9, 0.9); ctx.stroke();
        }
        if (e.type === 'splitter') {
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.arc(0, 0, r * (0.35 + i * 0.28), 0, TAU); ctx.stroke();
          }
        }
        if (e.type === 'orbiter') {
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, TAU); ctx.stroke();
        }
        if (e.type === 'weaver') {
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = col;
          ctx.fillRect(-r * 0.5, -r * 0.5, r, r);
          ctx.globalAlpha = 1;
        }

        /* ojos */
        if (e.type !== 'weaver' && e.type !== 'mine') {
          const ex = e.type === 'charger' ? r * 0.25 : 0;
          const ey = e.type === 'charger' ? 0 : -r * 0.1;
          const ang = Math.atan2(g.player.y - e.y, g.player.x - e.x);
          const ox = Math.cos(ang) * r * 0.32, oy = Math.sin(ang) * r * 0.32;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(ex + ox, ey + oy, r * 0.24, 0, TAU); ctx.fill();
          ctx.fillStyle = '#10121f';
          ctx.beginPath(); ctx.arc(ex + ox * 1.5, ey + oy * 1.5, r * 0.11, 0, TAU); ctx.fill();
        }

        /* corona de élite */
        if (e.elite) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.arc(0, 0, r * 1.45 + Math.sin(e.t * 4) * 2, 0, TAU); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
    },

    drawBoss(ctx, b, g) {
      const p = g.player;
      ctx.save();
      ctx.translate(b.x, b.y);
      const sc = b.born > 0 ? 1 - b.born : 1;
      ctx.scale(sc, sc);

      const pulse = 1 + Math.sin(b.t * 4) * 0.04;
      ctx.rotate(b.t * 0.6);

      ctx.fillStyle = b.flash > 0.05 ? '#fff' : 'rgba(60,12,44,0.95)';
      ctx.strokeStyle = '#ff4d8d';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      const n = b.kind === 'enjambre' ? 12 : 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const x = Math.cos(a) * b.r * pulse, y = Math.sin(a) * b.r * pulse;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.rotate(-b.t * 0.6);
      /* nucleo interior */
      ctx.fillStyle = '#ff4d8d';
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.34 * pulse, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.62, b.t * 2, b.t * 2 + 2.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.82, -b.t * 1.5, -b.t * 1.5 + 1.6); ctx.stroke();
      ctx.restore();

      /* anillo de aviso */
      if (b.state === 1) {
        ctx.strokeStyle = 'rgba(255,90,120,0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.4, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  });
})();
