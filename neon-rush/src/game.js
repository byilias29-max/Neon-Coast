/* NEON RUSH - juego: bucle, partida, simulacion y render */
(function () {
  'use strict';
  const NR = window.NR || {};
  const M = NR.M, TAU = NR.TAU;
  const E = NR.E;

  const G = (NR.Game = {
    canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
    scene: 'title',
    world: { w: 2700, h: 1750 },
    run: null, player: null, boss: null,
    time: 0, last: 0, frames: 0, fps: 60,
    cardQueue: 0,

    /* ---------------- arranque ---------------- */
    init() {
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      NR.Save.load();
      NR.Contracts.refresh();
      NR.Input.init(this.canvas);
      NR.FX.init();
      addEventListener('resize', () => this.resize());
      this.resize();
      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
      NR.UI.boot();
    },

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      this.w = Math.max(320, window.innerWidth);
      this.h = Math.max(320, window.innerHeight);
      this.canvas.width = Math.floor(this.w * dpr);
      this.canvas.height = Math.floor(this.h * dpr);
      this.canvas.style.width = this.w + 'px';
      this.canvas.style.height = this.h + 'px';
      this.dpr = dpr;
    },

    loop(t) {
      requestAnimationFrame((tt) => this.loop(tt));
      let dt = (t - this.last) / 1000;
      this.last = t;
      if (dt > 0.05) dt = 0.05;
      this.time += dt;
      this.frames++;
      if (this.frames % 30 === 0) this.fps = Math.round(1 / Math.max(dt, 0.0001));

      NR.Input.pollPad();
      this.update(dt);
      this.draw();
      NR.Input.endFrame();
    },

    /* ---------------- partida ---------------- */
    startRun() {
      const meta = NR.Meta.stats();
      const av = NR.Avatars.get(NR.Save.data.avatar);
      const s = meta;
      s.maxHp = Math.round(s.maxHp * av.hp);
      s.dmg *= av.dmg;
      s.speed *= av.speed;
      s.fireRate *= av.rate;
      s.crit += av.crit;
      s.shield += av.shield;
      s.dashCharges += av.dash;

      const run = {
        avatar: av.id,
        stats: s,
        weapons: ['pulse'],
        wlv: {},
        cardLvls: {},
        wave: 0, score: 0, kills: 0, eliteKills: 0, cores: 0,
        combo: 0, comboT: 0, maxCombo: 0,
        hyperUses: 0, revives: 0, noDamage: true, damageTaken: 0,
        ether: 0, level: 1, nextLevel: 220,
        echoQueue: [], toasts: [],
        mods: {}, modNames: [], event: null,
        start: performance.now(),
        cardsTaken: 0,
        addWeapon(id) {
          if (this.weapons.indexOf(id) < 0) this.weapons.push(id);
        },
        notify(msg) {
          this.toasts.push({ msg, life: 3.2, max: 3.2 });
          if (this.toasts.length > 5) this.toasts.shift();
        },
        multiplier() {
          return Math.min(8, 1 + Math.floor(this.combo / 8) * 0.5);
        },
        elapsed() { return (performance.now() - this.start) / 1000; }
      };
      this.run = run;

      /* limpieza */
      E.reset();
      NR.FX.clear();
      NR.Director.reset();
      this.boss = null;
      this.cardQueue = 0;

      /* arena */
      this.buildArena();

      this.player = NR.Player.create(run);
      NR.Cam.x = this.player.x; NR.Cam.y = this.player.y;
      NR.Cam.tx = this.player.x; NR.Cam.ty = this.player.y;

      NR.Director.phase = 'intermission';
      NR.Director.timer = 1.4;
      NR.Director.wave = 0;

      NR.Audio.init();
      NR.Audio.setMusic(1, 0.2);

      this.scene = 'run';
      NR.UI.show('run');
    },

    buildArena() {
      const W = this.world;
      /* pilares fijos */
      const pillars = 9;
      for (let i = 0; i < pillars; i++) {
        const x = M.rand(W.w * 0.12, W.w * 0.88);
        const y = M.rand(W.h * 0.12, W.h * 0.88);
        E.spawnObstacle(x, y, 54, 54, 'pillar');
      }
      /* cajas destructibles */
      for (let i = 0; i < 16; i++) {
        const x = M.rand(120, W.w - 120);
        const y = M.rand(120, W.h - 120);
        E.spawnObstacle(x, y, 42, 42, 'crate');
      }
    },

    /* ---------------- hiper ---------------- */
    startHyper() {
      const p = this.player, run = this.run;
      if (!p || run.hyperActive) return;
      run.hyperActive = true;
      run.hyperUses++;
      p.hyperActive = true;
      p.hyperT = 8 * run.stats.hyperDur;
      p.flow = 0;
      NR.Audio.hyper();
      NR.FX.flash('rgba(255,255,255,0.55)', 0.9);
      NR.FX.ring(p.x, p.y, NR.Pal.hue3, 20, 900, 0.9, 12);
      NR.FX.ring(p.x, p.y, NR.Pal.main(), 10, 600, 0.7, 8);
      NR.Cam.shake(0.7);
      NR.FX.punch(0.16);
      NR.FX.text(p.x, p.y - 40, 'SOBRECARGA', '#ffe66d', 26, true);
      /* empuja enemigos */
      for (const e of E.enemies) {
        const a = M.angTo(p.x, p.y, e.x, e.y);
        e.vx += Math.cos(a) * 700; e.vy += Math.sin(a) * 700;
      }
      /* daño alrededor */
      for (const e of E.enemies) {
        if (M.dist(e.x, e.y, p.x, p.y) < 260) NR.Enemies.damage(e, 60, false, this, 'silent');
      }
    },

    endHyper() {
      this.run.hyperActive = false;
      this.player.hyperActive = false;
      this.player.hyperT = 0;
      NR.Pal.update(this.run.wave);
      NR.FX.flash('rgba(120,0,200,0.18)', 0.5);
    },

    /* ---------------- eventos de oleada ---------------- */
    onWaveCleared(n) {
      const run = this.run;
      run.score += 200 * n;
      run.notify('OLEADA ' + n + ' SUPERADA');
      /* curacion entre oleadas */
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 12);
      /* racha sin daño: recompensa el juego limpio */
      if (run.waveDamage === 0) {
        run.cleanStreak = (run.cleanStreak || 0) + 1;
        run.score += 300 * run.cleanStreak;
        this.player.shield = Math.min(this.player.maxShield + 10, this.player.shield + 30);
        run.notify('RACHA x' + run.cleanStreak + ' SIN DANO');
        NR.FX.text(this.player.x, this.player.y - 44, 'LIMPIO x' + run.cleanStreak, '#8affc1', 20, true);
      } else {
        run.cleanStreak = 0;
      }
      /* carta cada 3 oleadas */
      if (n % 3 === 0) this.queueCard();
      /* carta extra por evento */
      if (run.event && run.event.kind === 'promesa') {
        this.queueCard();
        NR.FX.text(this.player.x, this.player.y - 40, 'CARTA EXTRA', '#8affc1', 20, true);
      }
      NR.FX.punch(0.05);
    },

    queueCard() { this.cardQueue++; this.maybeShowCards(); },

    maybeShowCards() {
      if (!this.cardQueue || this.scene !== 'run') return;
      const run = this.run;
      const n = run.stats.cardChoices;
      const cards = NR.Cards.draw(run, n);
      if (!cards.length) { this.cardQueue = 0; return; }
      this.cardQueue--;
      this.scene = 'cards';
      NR.UI.showCards(cards, (card) => {
        NR.Cards.apply(card, run);
        run.cardsTaken++;
        NR.Player.refreshDmg(this.player);
        NR.Audio.card();
        NR.FX.flash(NR.Pal.main(0.18), 0.6);
        this.scene = 'run';
        NR.UI.show('run');
        this.maybeShowCards();
      });
    },

    onBossDead() {
      const run = this.run;
      run.score += 8000;
      this.boss = null;
      this.queueCard();
      this.queueCard();
    },

    /* ---------------- fin de partida ---------------- */
    gameOver() {
      if (this.scene === 'over') return;
      const run = this.run;
      run.damageTaken = run.damageTaken || 0;
      this.scene = 'over';

      const earned = Math.floor(run.score / 900) + run.wave * 4 + run.cores * 3 +
        Math.floor(run.ether / 260);
      run.earned = earned;

      const S = NR.Save.data;
      S.stats.runs++;
      S.seen.intro = true;
      S.stats.kills += run.kills;
      S.stats.time += run.elapsed();
      S.stats.deaths++;
      S.best.score = Math.max(S.best.score, Math.round(run.score));
      S.best.wave = Math.max(S.best.wave, run.wave);
      S.best.kills = Math.max(S.best.kills, run.kills);
      S.best.time = Math.max(S.best.time, run.elapsed());
      NR.Save.addNucleos(earned);
      NR.Contracts.report(run);
      const unlocked = NR.Avatars.unlockCheck();
      NR.Save.save();

      NR.Audio.duck(0.3, 1.2);
      NR.UI.showOver(run, unlocked);
    },

    /* ---------------- update ---------------- */
    update(dt) {
      const run = this.run;
      if (!run || (this.scene !== 'run')) {
        NR.Cam.update(dt, this.w, this.h, this.world);
        NR.FX.update(dt * 0.2);
        return;
      }

      /* congelacion de impacto */
      if (NR.FX.hitstop > 0) {
        NR.FX.hitstop -= dt;
        NR.Cam.update(dt * 0.25, this.w, this.h, this.world);
        return;
      }

      const t = this.time;
      run.comboT -= dt;
      if (run.comboT <= 0 && run.combo > 0) {
        run.combo = 0;
        NR.FX.text(this.player.x, this.player.y - 46, 'COMBO PERDIDO', '#8a93b0', 15);
      }
      run.combo = Math.max(0, run.combo);
      if (run.combo > run.maxCombo) run.maxCombo = run.combo;

      /* toasts */
      for (let i = run.toasts.length - 1; i >= 0; i--) {
        run.toasts[i].life -= dt;
        if (run.toasts[i].life <= 0) run.toasts.splice(i, 1);
      }

      /* eco (disparos retardados) */
      for (let i = run.echoQueue.length - 1; i >= 0; i--) {
        const e = run.echoQueue[i];
        e.t -= dt;
        if (e.t <= 0) {
          run.echoQueue.splice(i, 1);
          const w = NR.Weapons[e.wid];
          if (w) {
            this.player.curMult = this.player.dmg * NR.Weapons.multOf(w, this.player);
            w.fire(this.player, this);
          }
        }
      }

      /* campana */
      if (run.stats.bell > 0) {
        run.bellT = (run.bellT || 0) - dt;
        if (run.bellT <= 0) {
          run.bellT = 18;
          const p = this.player;
          p.hp = Math.min(p.maxHp, p.hp + 22);
          p.shield = Math.min(p.maxShield, p.shield + 30);
          NR.FX.ring(p.x, p.y, '#8affc1', 20, 420, 0.7, 8);
          for (const e of E.enemies) {
            const d = M.dist(e.x, e.y, p.x, p.y);
            if (d < 320) {
              const a = M.angTo(p.x, p.y, e.x, e.y);
              e.vx += Math.cos(a) * 620; e.vy += Math.sin(a) * 620;
              NR.Enemies.damage(e, 45, false, this, 'silent');
            }
          }
          NR.Audio.waveUp();
          run.notify('CAMPANA: escudo y empuje');
        }
      }

      /* director */
      NR.Director.update(dt, this);

      /* jugador */
      NR.Player.update(dt, this);

      /* enemigos */
      NR.Enemies.update(dt, this);

      /* obstaculos (cajas rompibles) */
      for (let i = E.obstacles.length - 1; i >= 0; i--) {
        const o = E.obstacles[i];
        o.flash = Math.max(0, o.flash - dt * 4);
        if (o.dead) { E.obstacles.splice(i, 1); continue; }
      }

      this.updateBullets(dt);
      this.updatePickups(dt);

      /* camara */
      const p = this.player;
      const lookX = (NR.Input.mouse.x / this.w - 0.5) * 160;
      const lookY = (NR.Input.mouse.y / this.h - 0.5) * 120;
      NR.Cam.tx = p.x + lookX;
      NR.Cam.ty = p.y + lookY;
      NR.Cam.update(dt, this.w, this.h, this.world);

      /* fx */
      NR.FX.update(dt);
      NR.FX.aberr = Math.max(0, NR.FX.aberr - dt * 34);

      /* musica */
      const intensity = M.clamp(0.18 + E.enemies.length * 0.014 + run.combo * 0.002 +
        (run.hyperActive ? 0.4 : 0), 0, 1);
      NR.Audio.setMusic(run.wave, intensity);

      /* paleta que se vuelve psicodelica en sobrecarga */
      if (run.hyperActive) {
        NR.Pal.hue = (190 + run.wave * 23 + this.time * 150) % 360;
        NR.Pal.hue2 = (NR.Pal.hue + 145) % 360;
        NR.Pal.hue3 = (NR.Pal.hue + 280) % 360;
      }

      /* nivel por eter */
      if (run.ether >= run.nextLevel) {
        run.nextLevel = Math.round(run.nextLevel * 1.22);
        run.level++;
        run.score += 250 * run.level;
        this.queueCard();
        NR.FX.text(p.x, p.y - 50, 'NIVEL ' + run.level, '#8affc1', 22, true);
        NR.FX.ring(p.x, p.y, '#8affc1', 12, 260, 0.5, 5);
      }
    },

    updateBullets(dt) {
      const p = this.player, run = this.run;
      const W = this.world;

      /* --- balas del jugador --- */
      for (let i = E.pbul.length - 1; i >= 0; i--) {
        const b = E.pbul[i];
        b.life -= dt;
        if (b.life <= 0) { E.pbul.splice(i, 1); continue; }

        if (b.ring) {
          b.size = (b.size || b.r) + 620 * dt;
          b.r = b.size;
          b.x += b.vx * dt; b.y += b.vy * dt;
        } else {
          if (b.homing > 0) {
            if (!b.target || b.target.dead) b.target = NR.Enemies.nearest(b.x, b.y, 420);
            if (b.target) {
              const want = M.angTo(b.x, b.y, b.target.x, b.target.y);
              const cur = Math.atan2(b.vy, b.vx);
              const na = cur + M.angDiff(cur, want) * Math.min(1, b.homing * dt);
              const sp = Math.hypot(b.vx, b.vy);
              b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
            }
          }
          b.x += b.vx * dt; b.y += b.vy * dt;
        }

        /* obstaculos */
        let blocked = false;
        for (const o of E.obstacles) {
          if (o.type === 'pillar') {
            if (E.hitRect(b.x, b.y, b.r, o)) { blocked = true; break; }
          } else {
            if (E.hitRect(b.x, b.y, b.r, o)) {
              o.hp -= b.dmg; o.flash = 1;
              NR.FX.sparks(b.x, b.y, Math.atan2(-b.vy, -b.vx), 4, '#ffcf7a', 220);
              if (o.hp <= 0) {
                o.dead = true;
                NR.FX.shards(o.x, o.y, 12, '#ffcf7a', 320);
                NR.FX.burst(o.x, o.y, 10, { col: '#ffcf7a', speed: 240 });
                NR.Audio.hit(true);
                run.score += 15;
              }
              blocked = true; break;
            }
          }
        }
        if (blocked) {
          if (b.prisma) this.explodeBullet(b);
          E.pbul.splice(i, 1); continue;
        }

        /* enemigos */
        for (const e of E.enemies) {
          if (e.dead) continue;
          if (b.hitSet && b.hitSet.indexOf(e) >= 0) continue;
          const rr = e.r + b.r;
          if (M.dist2(b.x, b.y, e.x, e.y) <= rr * rr) {
            if (!b.hitSet) b.hitSet = [];
            b.hitSet.push(e);
            const crit = Math.random() < run.stats.crit;
            const dmg = b.dmg * (crit ? run.stats.critDmg : 1);
            NR.Enemies.damage(e, dmg, crit, this);
            if (run.stats.lifesteal > 0 && !e.boss) {
              p.hp = Math.min(p.maxHp, p.hp + dmg * run.stats.lifesteal * 0.1);
            }
            if (b.prisma) this.explodeBullet(b);
            if (b.pierce > 0) { b.pierce--; }
            else { E.pbul.splice(i, 1); break; }
          }
        }
        if (E.pbul[i] !== b) continue;

        /* fuera del mundo */
        if (b.x < -60 || b.x > W.w + 60 || b.y < -60 || b.y > W.h + 60) {
          E.pbul.splice(i, 1); continue;
        }
      }

      /* --- balas enemigas --- */
      for (let i = E.ebul.length - 1; i >= 0; i--) {
        const b = E.ebul[i];
        b.life -= dt;
        b.born += dt;
        if (b.life <= 0) { E.ebul.splice(i, 1); continue; }

        if (b.curve) {
          const sp = Math.hypot(b.vx, b.vy);
          const a = Math.atan2(b.vy, b.vx) + b.curve * dt;
          b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
        }
        b.x += b.vx * dt; b.y += b.vy * dt;

        if (b.x < -40 || b.x > W.w + 40 || b.y < -40 || b.y > W.h + 40) { E.ebul.splice(i, 1); continue; }

        /* obstaculos */
        let blocked = false;
        for (const o of E.obstacles) {
          if (E.hitRect(b.x, b.y, b.r, o)) { blocked = true; break; }
        }
        if (blocked) {
          NR.FX.sparks(b.x, b.y, Math.random() * TAU, 3, b.col, 180);
          E.ebul.splice(i, 1); continue;
        }

        /* el dash destruye balas enemigas */
        if (p.dashT > 0) {
          const rr = p.r + b.r + 12;
          if (M.dist2(b.x, b.y, p.x, p.y) < rr * rr) {
            NR.FX.sparks(b.x, b.y, Math.random() * TAU, 5, '#9fe8ff', 280);
            E.ebul.splice(i, 1); continue;
          }
        }

        /* impacto en el jugador */
        const rr = p.r + b.r;
        if (M.dist2(b.x, b.y, p.x, p.y) <= rr * rr) {
          NR.Player.hurt(this, b.dmg);
          E.ebul.splice(i, 1); continue;
        }
        /* rozamiento: recompensa al jugador por jugar al limite */
        const near = 30 + b.r + p.r;
        if (b.born > 0.08 && M.dist2(b.x, b.y, p.x, p.y) < near * near && !b.near) {
          b.near = true;
          p.flow = Math.min(100, p.flow + 3.5);
          if (Math.random() < 0.12) {
            NR.FX.text(p.x + M.rand(-14, 14), p.y - 26, 'ROCE', '#ffe66d', 13);
            run.score += 40;
          }
        }
      }
    },

    explodeBullet(b) {
      NR.FX.ring(b.x, b.y, NR.Pal.main(0.9), 8, 96, 0.3, 4);
      NR.FX.burst(b.x, b.y, 12, { col: NR.Pal.main(), speed: 300, sizeMin: 2, sizeMax: 5 });
      for (const e of E.enemies) {
        if (e.dead) continue;
        const d = M.dist(b.x, b.y, e.x, e.y);
        if (d < 96) NR.Enemies.damage(e, b.dmg * 0.6, false, this, 'silent');
      }
      NR.Cam.shake(0.05);
    },

    updatePickups(dt) {
      const p = this.player, run = this.run;
      const magnet = 130 * run.stats.magnet;
      for (let i = E.pickups.length - 1; i >= 0; i--) {
        const k = E.pickups[i];
        k.life -= dt;
        k.t += dt * 4;
        k.born += dt;
        if (k.life <= 0) { E.pickups.splice(i, 1); continue; }
        k.vx = M.damp(k.vx, 0, 4, dt);
        k.vy = M.damp(k.vy, 0, 4, dt);
        k.x += k.vx * dt; k.y += k.vy * dt;

        const d = M.dist(k.x, k.y, p.x, p.y);
        /* tras un momento el eter viene solo a por ti: nunca se pierde */
        const auto = k.born > 1.0 && k.type !== 'bomb' && k.type !== 'chest';
        if ((d < magnet || auto) && k.type !== 'bomb' && k.type !== 'magnet') {
          const a = M.angTo(k.x, k.y, p.x, p.y);
          const pull = auto ? 2600 : 900 * (1 - d / magnet);
          k.vx += Math.cos(a) * pull * dt * 6;
          k.vy += Math.sin(a) * pull * dt * 6;
        }
        if (d < p.r + k.r) {
          this.collect(k);
          E.pickups.splice(i, 1); continue;
        }
      }
    },

    collect(k) {
      const run = this.run, p = this.player;
      switch (k.type) {
        case 'ether': {
          const mult = run.event && run.event.kind === 'oro' ? 3 : 1;
          const v = k.value * run.stats.xpGain * mult * 2.5;
          run.ether += v;
          run.score += v * 8 * run.stats.score;
          p.flow = Math.min(100, p.flow + 0.5);
          NR.Audio.pickup(v);
          break;
        }
        case 'core': {
          run.cores++;
          NR.Save.addNucleos(1);
          run.score += 500;
          NR.FX.text(p.x, p.y - 34, '+1 NUCLEO', '#ffd166', 18, true);
          NR.Audio.pickup(30);
          NR.FX.ring(p.x, p.y, '#ffd166', 6, 60, 0.4, 3);
          break;
        }
        case 'heart': {
          p.hp = Math.min(p.maxHp, p.hp + 32);
          NR.FX.text(p.x, p.y - 30, '+VIDA', '#7bffb0', 16, true);
          NR.Audio.pickup(12);
          break;
        }
        case 'shield': {
          p.maxShield = Math.max(p.maxShield, 30);
          p.shield = p.maxShield;
          NR.FX.text(p.x, p.y - 30, 'ESCUDO', '#9fe8ff', 16, true);
          NR.Audio.pickup(16);
          break;
        }
        case 'magnet': {
          for (const o of E.pickups) {
            if (o.type === 'ether') {
              const a = M.angTo(o.x, o.y, p.x, p.y);
              o.vx += Math.cos(a) * 1400; o.vy += Math.sin(a) * 1400;
            }
          }
          NR.FX.text(p.x, p.y - 30, 'IMAN TOTAL', '#ffd166', 16, true);
          NR.Audio.pickup(20);
          break;
        }
        case 'bomb': {
          NR.FX.ring(p.x, p.y, '#fff', 20, 1400, 0.8, 12);
          NR.FX.flash('rgba(255,255,255,0.4)', 0.8);
          NR.FX.freeze(0.12);
          NR.Cam.shake(0.8);
          for (const e of E.enemies) {
            if (e.dead) continue;
            const d = M.dist(e.x, e.y, p.x, p.y);
            if (d < 900) NR.Enemies.damage(e, 500, false, this, 'silent');
          }
          NR.Audio.explode();
          break;
        }
        case 'chest': {
          /* cofre de neon: carta gratis + recompensa */
          run.score += 1200;
          p.flow = 100;
          p.shield = p.maxShield;
          NR.FX.ring(p.x, p.y, '#ffd166', 10, 520, 0.9, 12);
          NR.FX.ring(p.x, p.y, '#fff', 6, 300, 0.6, 6);
          NR.FX.flash('rgba(255,209,102,0.3)', 0.8);
          NR.FX.text(p.x, p.y - 40, 'COFRE DE NEON', '#ffd166', 22, true);
          NR.Cam.shake(0.4);
          NR.Audio.card();
          run.notify('COFRE: carta extra y sobrecarga lista');
          this.queueCard();
          break;
        }
      }
    },

    /* ---------------- render ---------------- */
    draw() {
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);

      if (!this.run || this.scene === 'title' || this.scene === 'shop') {
        this.drawAttract(ctx);
        return;
      }

      const zoom = this.zoom();
      ctx.save();
      ctx.translate(this.w / 2, this.h / 2);
      ctx.scale(zoom, zoom);
      ctx.rotate(NR.Cam.rot);
      ctx.translate(-NR.Cam.x + NR.Cam.sx, -NR.Cam.y + NR.Cam.sy);

      this.drawWorld(ctx);

      ctx.restore();

      /* post */
      NR.FX.apply(ctx, this.canvas, this.w, this.h, { hyper: this.run.hyperActive ? 1 : 0 });

      /* hud */
      NR.UI.hud(ctx, this);
    },

    zoom() {
      const base = M.clamp(this.h / 660, 0.6, 2.1);
      const byW = this.w / 980;
      return M.clamp(Math.min(base, byW), 0.5, 2.2) + NR.FX.zoomPunch;
    },

    drawWorld(ctx) {
      const W = this.world, t = this.time;
      const hue = NR.Pal.hue;

      /* fondo profundo */
      ctx.fillStyle = '#02030a';
      ctx.fillRect(-3000, -3000, 7000, 7000);

      /* retícula lejana */
      const gx = -((NR.Cam.x * 0.85) % 80);
      const gy = -((NR.Cam.y * 0.85) % 80);
      ctx.strokeStyle = M.hsl(hue, 80, 55, 0.05);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = gx; x < this.w / this.zoom() + 80; x += 80) { ctx.moveTo(x, -400); ctx.lineTo(x, 5000); }
      for (let y = gy; y < this.h / this.zoom() + 80; y += 80) { ctx.moveTo(-400, y); ctx.lineTo(6000, y); }
      ctx.stroke();

      /* suelo de la arena */
      ctx.save();
      ctx.fillStyle = M.hsl(hue, 65, 4, 0.9);
      ctx.fillRect(0, 0, W.w, W.h);

      /* losas del suelo */
      ctx.strokeStyle = M.hsl(hue, 85, 60, 0.045);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W.w; x += 160) { ctx.moveTo(x, 0); ctx.lineTo(x, W.h); }
      for (let y = 0; y <= W.h; y += 160) { ctx.moveTo(0, y); ctx.lineTo(W.w, y); }
      ctx.stroke();

      /* sellos circulares del suelo */
      for (let i = 0; i < 18; i++) {
        const rx = ((i * 331) % W.w), ry = ((i * 617) % W.h);
        const rr = 70 + (i % 4) * 45;
        ctx.strokeStyle = M.hsl(hue + i * 12, 90, 62, 0.05);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(rx, ry, rr, 0, TAU); ctx.stroke();
        ctx.strokeStyle = M.hsl(hue + i * 12, 90, 62, 0.035);
        ctx.beginPath(); ctx.arc(rx, ry, rr * 0.62, 0, TAU); ctx.stroke();
      }

      /* borde de la arena */
      ctx.strokeStyle = M.hsl(hue, 95, 58, 0.75);
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, W.w, W.h);
      ctx.strokeStyle = M.hsl(hue, 95, 62, 0.1);
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, W.w, W.h);
      ctx.restore();

      /* charco de luz del jugador */
      if (this.player) {
        const p = this.player;
        const lg = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 300);
        lg.addColorStop(0, M.hsl(hue, 95, 60, 0.11));
        lg.addColorStop(0.5, M.hsl(hue, 95, 55, 0.04));
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(p.x, p.y, 300, 0, TAU); ctx.fill();
      }

      /* obstaculos */
      for (const o of E.obstacles) {
        const c = o.flash > 0.05 ? '#fff' : M.hsl(hue + 150, 55, 17);
        const e = o.flash > 0.05 ? '#fff' : M.hsl(hue + 150, 90, 52, 0.85);
        ctx.fillStyle = c;
        ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
        ctx.strokeStyle = e;
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
        if (o.type === 'crate') {
          /* esquinas de contenedor */
          ctx.strokeStyle = M.hsl(hue + 150, 80, 48, 0.5);
          ctx.lineWidth = 1.6;
          const w = o.w / 2, hh = o.h / 2, k = 10;
          ctx.beginPath();
          ctx.moveTo(o.x - w, o.y - hh + k); ctx.lineTo(o.x - w, o.y - hh); ctx.lineTo(o.x - w + k, o.y - hh);
          ctx.moveTo(o.x + w - k, o.y - hh); ctx.lineTo(o.x + w, o.y - hh); ctx.lineTo(o.x + w, o.y - hh + k);
          ctx.moveTo(o.x + w, o.y + hh - k); ctx.lineTo(o.x + w, o.y + hh); ctx.lineTo(o.x + w - k, o.y + hh);
          ctx.moveTo(o.x - w + k, o.y + hh); ctx.lineTo(o.x - w, o.y + hh); ctx.lineTo(o.x - w, o.y + hh - k);
          ctx.stroke();
        } else {
          ctx.strokeStyle = M.hsl(hue + 150, 90, 60, 0.35);
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(o.x, o.y, o.w * 0.26, 0, TAU); ctx.stroke();
        }
      }

      /* recogibles */
      for (const k of E.pickups) {
        const bob = Math.sin(k.t) * 2.5;
        if (k.type === 'ether') {
          ctx.fillStyle = NR.Pal.ether();
          ctx.beginPath();
          ctx.moveTo(k.x, k.y - 7 + bob); ctx.lineTo(k.x + 5, k.y + bob);
          ctx.lineTo(k.x, k.y + 7 + bob); ctx.lineTo(k.x - 5, k.y + bob);
          ctx.closePath(); ctx.fill();
        } else if (k.type === 'core') {
          ctx.fillStyle = '#ffd166';
          ctx.save(); ctx.translate(k.x, k.y + bob); ctx.rotate(k.t * 0.6);
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            const x = Math.cos(a) * k.r, y = Math.sin(a) * k.r;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.closePath(); ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = k.type === 'heart' ? '#7bffb0' : k.type === 'shield' ? '#9fe8ff' :
            k.type === 'bomb' ? '#ff4d8d' : '#ffd166';
          ctx.beginPath(); ctx.arc(k.x, k.y + bob, k.r, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.font = '900 13px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(k.type === 'heart' ? '+' : k.type === 'shield' ? 'O' :
            k.type === 'bomb' ? 'X' : 'M', k.x, k.y + bob + 4.5);
          ctx.textAlign = 'left';
        }
      }

      /* cofres de neon */
      for (const k of E.pickups) {
        if (k.type !== 'chest') continue;
        const bob = Math.sin(k.t * 0.8) * 3;
        ctx.save();
        ctx.translate(k.x, k.y + bob);
        ctx.rotate(k.t * 0.5);
        ctx.globalAlpha = 0.18 + Math.sin(k.t * 3) * 0.07;
        ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(60,40,10,0.95)';
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          const x = Math.cos(a) * 14, y = Math.sin(a) * 14;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, 4 + Math.sin(k.t * 6) * 1.2, 0, TAU); ctx.fill();
        ctx.restore();
      }

      /* enemigos */
      NR.Enemies.draw(ctx, this);

      /* balas enemigas */
      for (const b of E.ebul) {
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = b.col;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.2, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = b.col;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
      }

      /* balas del jugador */
      for (const b of E.pbul) {
        if (b.ring) {
          ctx.strokeStyle = b.col;
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
          continue;
        }
        if (b.trail) {
          const l = Math.hypot(b.vx, b.vy) * 0.014;
          const a = Math.atan2(b.vy, b.vx);
          ctx.strokeStyle = b.col;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = b.r * 1.1;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - Math.cos(a) * l, b.y - Math.sin(a) * l);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = b.col;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.4, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = b.col;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
      }

      /* jugador */
      if (this.player) NR.Player.draw(ctx, this);

      /* efectos */
      NR.FX.draw(ctx);
      NR.FX.drawText(ctx);
    },

    /* fondo de atraccion para menus */
    drawAttract(ctx) {
      const t = this.time;
      const hue = (t * 12) % 360;
      ctx.fillStyle = '#05060d';
      ctx.fillRect(0, 0, this.w, this.h);
      /* rejilla en movimiento */
      const off = (t * 40) % 70;
      ctx.strokeStyle = M.hsl(hue, 90, 60, 0.08);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -off; x < this.w + 70; x += 70) { ctx.moveTo(x, 0); ctx.lineTo(x, this.h); }
      for (let y = -off; y < this.h + 70; y += 70) { ctx.moveTo(0, y); ctx.lineTo(this.w, y); }
      ctx.stroke();
      /* formas flotantes */
      for (let i = 0; i < 7; i++) {
        const x = ((i * 331 + t * (30 + i * 12)) % (this.w + 400)) - 200;
        const y = ((i * 197 + Math.sin(t * 0.6 + i) * 120) % (this.h + 300)) - 100;
        ctx.strokeStyle = M.hsl((hue + i * 40) % 360, 90, 60, 0.12);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 60 + i * 22, 0, TAU);
        ctx.stroke();
      }
    },

    screenToWorldX(sx) {
      const zoom = this.zoom();
      return NR.Cam.x + (sx - this.w / 2) / zoom - NR.Cam.sx;
    },
    screenToWorldY(sy) {
      const zoom = this.zoom();
      return NR.Cam.y + (sy - this.h / 2) / zoom - NR.Cam.sy;
    }
  });
})();
