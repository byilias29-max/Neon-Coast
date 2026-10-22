/* NEON RUSH - entidades: jugador, armas, balas, recogibles y obstaculos */
(function () {
  'use strict';
  const NR = window.NR || {};
  const M = NR.M, TAU = NR.TAU;

  /* ---------------- arsenal ---------------- */
  const Weapons = (NR.Weapons = {
    pulse: {
      id: 'pulse', name: 'PULSO', cd: 0.115, mult: 1, hue: 0,
      desc: 'Cadencia rapida de impulsos.',
      fire(p, g) {
        const a = p.aim + M.rand(-0.045, 0.045);
        NR.E.spawnPB(p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16, a, 820, p.curMult, 4,
          { col: '#7ff0ff', life: 0.95, trail: true });
      }
    },
    twin: {
      id: 'twin', name: 'GEMELA', cd: 0.13, mult: 0.72, hue: 18,
      desc: 'Dos cañones en paralelo.',
      fire(p, g) {
        const a = p.aim, s = Math.sin(a) * 9, c = Math.cos(a) * 9;
        NR.E.spawnPB(p.x + c * 16 - s, p.y + s * 16 + c, a, 840, p.curMult, 3.6,
          { col: '#7ff0ff', life: 0.95, trail: true });
        NR.E.spawnPB(p.x + c * 16 + s, p.y + s * 16 - c, a, 840, p.curMult, 3.6,
          { col: '#bff4ff', life: 0.95, trail: true });
      }
    },
    scatter: {
      id: 'scatter', name: 'ALBA', cd: 0.42, mult: 0.55, hue: 40,
      desc: 'Abanico de metralla.',
      fire(p, g) {
        const n = 5 + p.scatterBonus;
        for (let i = 0; i < n; i++) {
          const a = p.aim + (i - (n - 1) / 2) * 0.16 + M.rand(-0.03, 0.03);
          NR.E.spawnPB(p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16, a, 720, p.curMult, 3.4,
            { col: '#9dfaff', life: 0.5, trail: true });
        }
      }
    },
    rail: {
      id: 'rail', name: 'RAIL', cd: 0.52, mult: 2.1, hue: 190,
      desc: 'Aguja perforante.',
      fire(p, g) {
        const a = p.aim;
        NR.E.spawnPB(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, a, 1700, p.curMult, 5,
          { col: NR.Pal.white(1), life: 0.75, pierce: 3, trail: true, big: true });
        NR.FX.ring(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, NR.Pal.white(0.8), 4, 26, 0.22, 3);
      }
    },
    seeker: {
      id: 'seeker', name: 'SEGUIDOR', cd: 0.62, mult: 0.85, hue: 300,
      desc: 'Misiles que persigue.',
      fire(p, g) {
        const a = p.aim + M.rand(-0.7, 0.7);
        NR.E.spawnPB(p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16, a, 430, p.curMult, 5,
          { col: '#c8f0ff', life: 2.2, homing: 5.4, trail: true });
      }
    },
    nova: {
      id: 'nova', name: 'NOVA', cd: 0.95, mult: 0.9, hue: 210,
      desc: 'Onda expansiva.',
      fire(p, g) {
        NR.E.spawnPB(p.x, p.y, 0, 0, p.curMult, 10,
          { col: '#7ff0ff', life: 0.75, ring: true, trail: true });
        NR.FX.ring(p.x, p.y, '#7ff0ff', 10, 140, 0.45, 4);
        NR.Cam.shake(0.06);
      }
    },
    arc: {
      id: 'arc', name: 'ARCO', cd: 0.38, mult: 1.25, hue: 60,
      desc: 'Rayo en cadena.',
      fire(p, g) {
        const t = NR.Enemies.nearest(p.x, p.y, 460);
        if (!t) return;
        NR.E.chain(p.x, p.y, t, p.curMult, 3);
      }
    },
    drones: {
      id: 'drones', name: 'DRONES', cd: 0, mult: 0.4, hue: 150,
      desc: 'Drones orbitales.',
      fire(p, g) {
        p.drones = p.drones || [];
        if (p.drones.length < (3 + p.droneBonus)) {
          p.drones.push({ a: Math.random() * TAU, r: 52, x: p.x, y: p.y });
        }
        for (const d of p.drones) {
          const t = NR.Enemies.nearest(d.x, d.y, 200);
          if (t) {
            const a = M.angTo(d.x, d.y, t.x, t.y);
            NR.E.spawnPB(d.x + Math.cos(a) * 8, d.y + Math.sin(a) * 8, a, 780, p.curMult, 3.4,
              { col: '#bff4ff', life: 0.7, trail: true });
          }
        }
      }
    },

    /* multiplicador y cadencia con nivel de arma */
    multOf(w, p) {
      const l = (p.run.wlv && p.run.wlv[w.id]) || 0;
      return w.mult * (1 + 0.28 * l);
    },
    cdOf(w, p) {
      const l = (p.run.wlv && p.run.wlv[w.id]) || 0;
      return w.cd * (1 - 0.12 * l);
    }
  });

  /* ---------------- mundo / entidades ---------------- */
  const E = (NR.E = {
    enemies: [], pbul: [], ebul: [], pickups: [], obstacles: [], hazards: [],

    reset() {
      this.enemies.length = 0; this.pbul.length = 0; this.ebul.length = 0;
      this.pickups.length = 0; this.obstacles.length = 0; this.hazards.length = 0;
    },

    spawnPB(x, y, a, speed, dmg, r, opts) {
      const o = opts || {};
      const run = NR.Game && NR.Game.run;
      const bs = run ? run.stats.bulletSpeed : 1;
      this.pbul.push({
        x, y,
        vx: Math.cos(a) * speed * bs, vy: Math.sin(a) * speed * bs,
        r, dmg, life: o.life || 1, max: o.life || 1,
        col: o.col || '#fff',
        pierce: o.pierce !== undefined ? o.pierce : (run ? run.stats.pierce : 0),
        hits: 0, hitSet: null,
        homing: o.homing || 0, target: null, trail: !!o.trail,
        ring: !!o.ring, big: !!o.big, spin: 0, dead: false, rot: a,
        prisma: run ? run.stats.prisma > 0 : false,
        crit: !!o.crit
      });
      if (this.pbul.length > 900) this.pbul.shift();
    },

    spawnEB(x, y, a, speed, dmg, r, opts) {
      const o = opts || {};
      this.ebul.push({
        x, y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        r, dmg, life: o.life || 5, max: o.life || 5,
        col: o.col || NR.Pal.enemy(), curve: o.curve || 0, spin: o.spin || 0,
        accel: o.accel || 0, wave: o.wave || 0, amp: o.amp || 0,
        dead: false, big: !!o.big, born: 0
      });
      if (this.ebul.length > 1200) this.ebul.shift();
    },

    /* rayo en cadena entre enemigos */
    chain(x, y, target, dmg, jumps) {
      const g = NR.Game;
      let from = { x, y };
      let cur = target;
      let hops = 0;
      const used = [];
      while (cur && hops < jumps) {
        used.push(cur);
        NR.Enemies.damage(cur, dmg, false, g, 'arc');
        NR.FX.beam(from.x, from.y, cur.x, cur.y, NR.Pal.warn(0.95), 0.18, 3);
        NR.FX.sparks(cur.x, cur.y, Math.random() * TAU, 5, NR.Pal.warn(), 260);
        from = { x: cur.x, y: cur.y };
        hops++;
        /* salta al enemigo mas cercano no usado */
        let best = null, bd = 190;
        for (const e of NR.Enemies.list) {
          if (used.indexOf(e) >= 0 || e.dead) continue;
          const d = M.dist(e.x, e.y, from.x, from.y);
          if (d < bd) { bd = d; best = e; }
        }
        cur = best;
      }
    },

    spawnPickup(type, x, y, opts) {
      const o = opts || {};
      const a = Math.random() * TAU, s = M.rand(40, 150);
      this.pickups.push({
        type, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        r: o.r || (type === 'core' ? 9 : type === 'ether' ? 5 : 11),
        life: 16, value: o.value || 1, t: Math.random() * TAU,
        born: 0
      });
      if (this.pickups.length > 500) this.pickups.shift();
    },

    spawnObstacle(x, y, w, h, type) {
      this.obstacles.push({
        x, y, w, h, type: type || 'crate',
        hp: type === 'pillar' ? Infinity : 26, maxHp: 26, flash: 0, dead: false
      });
    },

    /* circulo contra rectangulo */
    hitRect(cx, cy, r, o) {
      const nx = M.clamp(cx, o.x - o.w / 2, o.x + o.w / 2);
      const ny = M.clamp(cy, o.y - o.h / 2, o.y + o.h / 2);
      const dx = cx - nx, dy = cy - ny;
      return dx * dx + dy * dy <= r * r;
    },

    /* empuja un circulo fuera de los obstaculos */
    resolveRect(cx, cy, r, o) {
      const nx = M.clamp(cx, o.x - o.w / 2, o.x + o.w / 2);
      const ny = M.clamp(cy, o.y - o.h / 2, o.y + o.h / 2);
      let dx = cx - nx, dy = cy - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) return null;
      let d = Math.sqrt(d2);
      if (d < 0.0001) { dx = 1; dy = 0; d = 1; }
      const push = (r - d) / d;
      return { x: cx + dx * push, y: cy + dy * push, nx: dx / d, ny: dy / d };
    }
  });

  /* ---------------- jugador ---------------- */
  const Player = (NR.Player = {
    create(run) {
      const s = run.stats;
      const av = NR.Avatars.get(run.avatar);
      const p = {
        x: NR.Game.world.w / 2, y: NR.Game.world.h / 2,
        vx: 0, vy: 0, r: 14,
        hp: s.maxHp, maxHp: s.maxHp,
        shield: s.shield || 0, maxShield: s.shield || 0,
        iframe: 0, hurtFlash: 0,
        dashT: 0, dashDirX: 1, dashDirY: 0, dashCharges: s.dashCharges, dashCdT: 0,
        aim: -Math.PI / 2, fireCd: 0, aimLock: 0,
        flow: 0, hyperT: 0, hyperActive: false,
        stats: s, dmg: 12 * s.dmg * av.dmg, run: run,
        trail: [], drones: [], scatterBonus: 0, droneBonus: 0,
        fireFlash: 0, kick: 0, born: 1, avatar: av,
        comboFlash: 0, god: false
      };
      return p;
    },

    refreshDmg(p) {
      const av = NR.Avatars.get(p.run.avatar);
      p.dmg = 12 * p.stats.dmg * av.dmg;
      p.maxHp = p.stats.maxHp;
      p.dashCharges = p.stats.dashCharges;
    },

    update(dt, g) {
      const p = g.player, s = p.stats, inp = NR.Input;
      p.born = Math.max(0, p.born - dt);
      p.iframe = Math.max(0, p.iframe - dt);
      p.hurtFlash = Math.max(0, p.hurtFlash - dt * 3);
      p.fireFlash = Math.max(0, p.fireFlash - dt * 6);
      p.kick = Math.max(0, p.kick - dt * 5);
      p.comboFlash = Math.max(0, p.comboFlash - dt * 3);

      /* --- movimiento --- */
      const ax = inp.axis();
      const moving = (ax.x !== 0 || ax.y !== 0);
      if (moving) {
        const spd = 430 * s.speed * NR.Avatars.get(p.run.avatar).speed;
        p.vx = M.damp(p.vx, ax.x * spd, 14, dt);
        p.vy = M.damp(p.vy, ax.y * spd, 14, dt);
      } else {
        p.vx = M.damp(p.vx, 0, 9, dt);
        p.vy = M.damp(p.vy, 0, 9, dt);
      }

      /* --- dash --- */
      if (p.dashCharges < s.dashCharges) {
        p.dashCdT -= dt;
        if (p.dashCdT <= 0) { p.dashCharges++; p.dashCdT = 1.15 * s.dashCd; }
      }
      const wantDash = (inp.pressed('Space') || inp.pressed('ShiftLeft') || inp.pressed('ShiftRight') ||
        (inp.mouse.rdown && inp.mouse.hitDown) || (inp.pad.dash && !p._padDash));
      p._padDash = inp.pad.dash;
      if (wantDash && p.dashCharges > 0 && p.dashT <= 0) {
        let dx = ax.x, dy = ax.y;
        if (!moving) { dx = Math.cos(p.aim); dy = Math.sin(p.aim); }
        const l = Math.hypot(dx, dy) || 1;
        p.dashDirX = dx / l; p.dashDirY = dy / l;
        p.dashT = 0.16;
        p.dashCharges--;
        if (p.dashCdT <= 0) p.dashCdT = 1.15 * s.dashCd;
        p.iframe = Math.max(p.iframe, 0.22);
        p.dashSet = [];
        NR.Audio.dash();
        NR.FX.ring(p.x, p.y, '#7ff0ff', 8, 44, 0.28, 3);
        NR.FX.sparks(p.x, p.y, Math.atan2(p.dashDirY, p.dashDirX), 10, '#7ff0ff', 320);
        NR.Cam.shake(0.08);
        p.trail.length = 0;
      }

      if (p.dashT > 0) {
        p.dashT -= dt;
        const ds = 1450 * s.speed;
        p.vx = p.dashDirX * ds;
        p.vy = p.dashDirY * ds;
        p.trail.push({ x: p.x, y: p.y, life: 0.32, max: 0.32, r: p.r });
        if (p.trail.length > 26) p.trail.shift();

        /* el dash atraviesa enemigos: golpea, empuja y destroza balas */
        if (!p.dashSet) p.dashSet = [];
        for (const e of NR.Enemies.list) {
          if (e.dead || p.dashSet.indexOf(e) >= 0) continue;
          const rr = e.r + p.r + 10;
          if (M.dist2(e.x, e.y, p.x, p.y) < rr * rr) {
            p.dashSet.push(e);
            NR.Enemies.damage(e, p.dmg * 1.4, false, g);
            const a = M.angTo(p.x, p.y, e.x, e.y);
            e.vx += Math.cos(a) * 560; e.vy += Math.sin(a) * 560;
            NR.FX.sparks(e.x, e.y, a + Math.PI, 9, '#7ff0ff', 420);
            NR.FX.ring(e.x, e.y, '#7ff0ff', 4, 46, 0.25, 3);
            NR.Cam.shake(0.13);
            NR.Audio.hit(true);
          }
        }
        if (p.dashSet.length > 24) p.dashSet.length = 0;
      } else {
        for (let i = p.trail.length - 1; i >= 0; i--) {
          p.trail[i].life -= dt;
          if (p.trail[i].life <= 0) p.trail.splice(i, 1);
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      /* limites del mundo */
      const W = g.world;
      if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx) * 0.3; }
      if (p.x > W.w - p.r) { p.x = W.w - p.r; p.vx = -Math.abs(p.vx) * 0.3; }
      if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy) * 0.3; }
      if (p.y > W.h - p.r) { p.y = W.h - p.r; p.vy = -Math.abs(p.vy) * 0.3; }

      /* obstaculos solidos */
      for (const o of E.obstacles) {
        const res = E.resolveRect(p.x, p.y, p.r, o);
        if (res) { p.x = res.x; p.y = res.y; }
      }

      /* --- apuntado --- */
      if (inp.lastInput === 'mb') {
        const wx = g.screenToWorldX(inp.mouse.x), wy = g.screenToWorldY(inp.mouse.y);
        p.aim = M.angTo(p.x, p.y, wx, wy);
      } else if (inp.lastInput === 'pad') {
        if (Math.hypot(inp.pad.aimX, inp.pad.aimY) > 0.3) {
          p.aim = Math.atan2(inp.pad.aimY, inp.pad.aimX);
        } else if (moving) p.aim = Math.atan2(ax.y, ax.x);
      } else if (inp.lastInput === 'tp') {
        const t = NR.Enemies.nearest(p.x, p.y, 900);
        if (t) p.aim = M.angTo(p.x, p.y, t.x, t.y);
        else if (moving) p.aim = Math.atan2(ax.y, ax.x);
      } else if (moving) {
        p.aim = M.angTo(p.x, p.y, p.x + ax.x, p.y + ax.y);
      }

      /* --- disparo --- */
      p.fireCd -= dt;
      if (p.hyperActive) p.fireCd = Math.min(p.fireCd, 0);
      const firing = NR.Input.firing() || p.hyperActive;
      if (firing) {
        p.wcd = p.wcd || {};
        for (const wid of p.run.weapons) {
          const w = Weapons[wid];
          if (!w) continue;
          p.wcd[wid] = (p.wcd[wid] || 0) - dt;
          const cd = w.cd > 0 ? Weapons.cdOf(w, p) / s.fireRate : 0.28;
          if (p.wcd[wid] > 0) continue;
          p.wcd[wid] = cd;
          p.curMult = p.dmg * Weapons.multOf(w, p) * (p.hyperActive ? 2.2 : 1);
          w.fire(p, g);
          if (w.cd > 0) {
            p.fireFlash = 1;
            p.kick = Math.min(1, p.kick + 0.22);
            NR.Cam.shake(0.012);
            /* eco: copia retardada del disparo */
            if (s.echo > 0) {
              g.run.echoQueue.push({ t: 0.16 / s.echo, wid: wid });
            }
          }
        }
      } else {
        p.wcd = p.wcd || {};
      }

      /* --- drones orbitales --- */
      if (p.drones.length) {
        for (const d of p.drones) {
          d.a += dt * 2.4;
          d.x = p.x + Math.cos(d.a) * d.r;
          d.y = p.y + Math.sin(d.a) * d.r;
          const t = NR.Enemies.nearest(d.x, d.y, 90);
          if (t) {
            d.a += dt * 1.2;
            d.x = M.damp(d.x, t.x, 6, dt);
            d.y = M.damp(d.y, t.y, 6, dt);
          }
        }
      }

      /* --- hiper --- */
      if (p.flow >= 100 && !p.hyperActive && (inp.pressed('KeyQ') || inp.pressed('KeyE') || inp.pad.hyper)) {
        g.startHyper();
      }
      if (p.hyperActive) {
        p.hyperT -= dt;
        p.flow = Math.max(0, p.flow - dt * 13);
        if (p.hyperT <= 0) g.endHyper();
      } else {
        p.flow = M.clamp(p.flow + dt * (1.6 + p.run.combo * 0.03) - dt * 0.8, 0, 100);
      }

      /* --- regen / vida --- */
      if (s.regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + s.regen * dt);
      if (p.shield < p.maxShield) p.shield = Math.min(p.maxShield, p.shield + 9 * dt);
    },

    hurt(g, dmg) {
      const p = g.player;
      if (p.iframe > 0 || p.god || g.run.hyperActive) return;
      const armor = p.stats.armor;
      let real = Math.max(1, dmg * (1 - armor));
      if (p.shield > 0) {
        const absorbed = Math.min(p.shield, real);
        p.shield -= absorbed;
        real -= absorbed;
        NR.FX.ring(p.x, p.y, '#9fe8ff', 16, 46, 0.25, 4);
      }
      if (real > 0) {
        p.hp -= real;
        g.run.damageTaken = (g.run.damageTaken || 0) + real;
        g.run.waveDamage = (g.run.waveDamage || 0) + real;
      }
      p.iframe = 0.95;
      p.hurtFlash = 1;
      NR.Audio.hurt();
      NR.FX.freeze(0.07);
      NR.Cam.shake(0.42);
      NR.FX.flash('rgba(255,40,70,0.35)', 0.5);
      NR.FX.aberr = 16;
      NR.FX.burst(p.x, p.y, 16, { col: ['#ff2d55', '#ff9db0'], speed: 340, type: 'shard', sizeMin: 3, sizeMax: 7 });
      NR.FX.text(p.x, p.y - 22, '-' + Math.round(dmg), '#ff5470', 17, true);
      if (p.hp <= 0) {
        /* segundo aliento */
        if (g.run.revives > 0) {
          g.run.revives--;
          p.hp = p.maxHp * 0.5;
          p.iframe = 2.2;
          p.shield = p.maxShield;
          NR.FX.ring(p.x, p.y, '#8affc1', 10, 420, 0.9, 10);
          NR.FX.flash('rgba(140,255,200,0.4)', 0.8);
          NR.FX.text(p.x, p.y - 40, 'REVIVIDA', '#8affc1', 24, true);
          NR.Audio.card();
          return;
        }
        p.hp = 0;
        g.gameOver();
      }
    },

    draw(ctx, g) {
      const p = g.player;
      const t = g.time;

      /* estela del dash */
      for (const tr of p.trail) {
        const k = tr.life / tr.max;
        ctx.globalAlpha = k * 0.5;
        ctx.fillStyle = NR.Pal.main();
        ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r * k * 0.9, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* drones */
      for (const d of p.drones) {
        ctx.fillStyle = NR.Pal.alt();
        ctx.beginPath(); ctx.arc(d.x, d.y, 6, 0, TAU); ctx.fill();
        ctx.strokeStyle = NR.Pal.alt(0.35);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(d.x, d.y, 10, 0, TAU); ctx.stroke();
      }

      /* aura de escudo */
      if (p.maxShield > 0 && p.shield > 0) {
        ctx.strokeStyle = 'rgba(140,230,255,' + (0.35 + p.shield / p.maxShield * 0.5) + ')';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 7 + Math.sin(t * 6) * 1.5, 0, TAU); ctx.stroke();
      }

      /* cuerpo: flecha apuntando al objetivo */
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.aim);
      const kick = -p.kick * 4;
      ctx.translate(kick, 0);

      const flash = p.hurtFlash;
      const body = flash > 0.05
        ? 'rgb(' + Math.floor(255 - flash * 120) + ',' + Math.floor(120 + flash * 100) + ',' + Math.floor(150 + flash * 60) + ')'
        : '#f4fbff';

      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(p.r + 4, 0);
      ctx.lineTo(-p.r * 0.8, p.r * 0.82);
      ctx.lineTo(-p.r * 0.35, 0);
      ctx.lineTo(-p.r * 0.8, -p.r * 0.82);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#3ad9ff';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      /* nucleo */
      ctx.fillStyle = '#3ad9ff';
      ctx.beginPath(); ctx.arc(-1, 0, 4.2 + Math.sin(t * 9) * 0.6, 0, TAU); ctx.fill();
      ctx.restore();

      /* iframe: parpadeo */
      if (p.iframe > 0 && p.dashT <= 0) {
        ctx.globalAlpha = 0.35 + Math.sin(t * 40) * 0.25;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.05, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }

      /* halo hiper */
      if (g.run.hyperActive) {
        ctx.strokeStyle = '#ffe66d';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 12 + Math.sin(t * 12) * 3, 0, TAU); ctx.stroke();
      }
    }
  });

  NR.E = E;
})();
