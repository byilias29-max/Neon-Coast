/* NEON RUSH - interfaz: menus (DOM) y HUD (canvas) */
(function () {
  'use strict';
  const NR = window.NR || {};
  const M = NR.M, TAU = NR.TAU;

  const UI = (NR.UI = {
    cardsCb: null,

    boot() {
      this.bind();
      this.refreshTitle();
      this.show('title');
    },

    bind() {
      const on = (id, ev, fn) => { const e = document.getElementById(id); if (e) e.addEventListener(ev, fn); };

      on('btn-play', 'click', () => { NR.Audio.init(); NR.Audio.ui(true); NR.Game.startRun(); });
      on('btn-shop', 'click', () => { NR.Audio.init(); NR.Audio.ui(true); this.openShop(); });
      on('btn-shop2', 'click', () => this.openShop());
      on('btn-title', 'click', () => { NR.Audio.ui(false); this.show('title'); NR.Game.scene = 'title'; });
      on('btn-resume', 'click', () => this.resume());
      on('btn-restart', 'click', () => { this.closeAll(); NR.Game.startRun(); });
      on('btn-quit', 'click', () => {
        this.closeAll();
        NR.Game.scene = 'title';
        NR.Game.run = null;
        this.refreshTitle();
        this.show('title');
      });
      on('btn-again', 'click', () => { this.closeAll(); NR.Game.startRun(); });
      on('btn-over-title', 'click', () => {
        this.closeAll(); NR.Game.scene = 'title'; NR.Game.run = null;
        this.refreshTitle(); this.show('title');
      });
      on('btn-mute', 'click', (e) => {
        const m = !NR.Save.data.settings.mute;
        NR.Save.data.settings.mute = m;
        NR.Audio.setMuted(m);
        e.currentTarget.textContent = m ? 'SONIDO: OFF' : 'SONIDO: ON';
        this.refreshTitle();
      });
      on('btn-shake', 'click', (e) => {
        const s = NR.Save.data.settings.shake > 0 ? 0 : 1;
        NR.Save.data.settings.shake = s;
        NR.Save.save();
        e.currentTarget.textContent = s ? 'VIBRACION: ON' : 'VIBRACION: OFF';
      });
      on('btn-glow', 'click', (e) => {
        const s = NR.Save.data.settings.glow > 0 ? 0 : 1;
        NR.Save.data.settings.glow = s;
        NR.Save.save();
        e.currentTarget.textContent = s ? 'GLOW: ON' : 'GLOW: OFF';
      });
      on('btn-shop-back', 'click', () => { NR.Game.scene = 'title'; this.show('title'); });

      /* pestanas de la tienda */
      document.querySelectorAll('[data-tab]').forEach((b) => {
        b.addEventListener('click', () => {
          document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          this.shopTab(b.dataset.tab);
        });
      });

      /* teclado */
      addEventListener('keydown', (e) => {
        const g = NR.Game;
        if (g.scene === 'cards') {
          const n = parseInt(e.key, 10);
          if (n >= 1 && n <= 4) {
            const b = document.querySelectorAll('#card-list .pcard')[n - 1];
            if (b) b.click();
          }
          return;
        }
        if (g.scene === 'run') {
          if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); this.pause(); }
        } else if (g.scene === 'pause') {
          if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); this.resume(); }
        } else if (g.scene === 'title' && e.code === 'Enter') {
          NR.Audio.init(); NR.Game.startRun();
        }
      });
    },

    /* ---------------- pantallas ---------------- */
    screens: ['title', 'shop', 'cards', 'pause', 'over'],

    show(name) {
      this.screens.forEach(s => {
        const el = document.getElementById('scr-' + s);
        if (el) el.classList.toggle('on', s === name);
      });
      const o = document.getElementById('overlay');
      if (o) o.classList.toggle('hidden', name === 'run');
      if (name === 'title') this.refreshTitle();
      if (name === 'shop') this.shopTab('meta');
    },

    closeAll() {
      this.screens.forEach(s => {
        const el = document.getElementById('scr-' + s);
        if (el) el.classList.remove('on');
      });
      const o = document.getElementById('overlay');
      if (o) o.classList.add('hidden');
    },

    pause() {
      if (NR.Game.scene !== 'run') return;
      NR.Game.scene = 'pause';
      NR.Audio.duck(0.25, 999);
      this.show('pause');
    },

    resume() {
      if (NR.Game.scene !== 'pause') return;
      NR.Game.scene = 'run';
      NR.Audio.duck(1, 0.2);
      this.closeAll();
    },

    /* ---------------- titulo ---------------- */
    refreshTitle() {
      const S = NR.Save.data;
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      set('st-best', M.fmt(S.best.score));
      set('st-wave', String(S.best.wave));
      set('st-kills', M.fmt(S.stats.kills));
      set('st-nuc', M.fmt(S.nucleos));
      set('st-runs', String(S.stats.runs));
      set('st-time', M.time(S.stats.time));
      const m = document.getElementById('btn-mute');
      if (m) m.textContent = S.settings.mute ? 'SONIDO: OFF' : 'SONIDO: ON';

      /* contratos */
      const list = document.getElementById('title-contracts');
      if (list) {
        NR.Contracts.refresh();
        list.innerHTML = NR.Contracts.list.map(c => {
          const p = Math.min(100, Math.floor(c.progress / c.goal * 100));
          return '<div class="ct"><div class="ct-t">' + c.text + '</div>' +
            '<div class="ct-bar"><i style="width:' + p + '%"></i></div>' +
            '<div class="ct-r">' + Math.min(c.progress, c.goal) + '/' + c.goal +
            (c.done ? (c.claimed ? ' <b class="ok">RECLAMADO</b>' : ' <b class="ok">LISTO</b>') : '') +
            '</div></div>';
        }).join('');
      }

      /* avatares rapidos */
      const av = document.getElementById('title-avatars');
      if (av) {
        av.innerHTML = NR.Avatars.list.map(a => {
          const un = NR.Avatars.unlocked(a.id);
          const cur = S.avatar === a.id;
          return '<button class="av' + (cur ? ' on' : '') + (un ? '' : ' lock') + '" data-av="' + a.id + '"' +
            (un ? '' : ' disabled') + '><b>' + a.icon + ' ' + a.name + '</b>' +
            '<span>' + (un ? a.desc : 'Bloqueado: ' + M.fmt(a.unlock) + ' nucleos totales') + '</span></button>';
        }).join('');
        av.querySelectorAll('[data-av]').forEach(b => {
          b.addEventListener('click', () => {
            if (NR.Avatars.select(b.dataset.av)) {
              NR.Audio.ui(true);
              this.refreshTitle();
            }
          });
        });
      }
    },

    /* ---------------- tienda ---------------- */
    openShop() {
      NR.Game.scene = 'shop';
      NR.Contracts.refresh();
      this.show('shop');
      this.shopTab('meta');
    },

    shopTab(which) {
      const box = document.getElementById('shop-body');
      const S = NR.Save.data;
      if (!box) return;
      const head = '<div class="shop-head"><h3>' +
        (which === 'meta' ? 'MEJORAS PERMANENTES' : which === 'av' ? 'AVATARES' : 'CONTRATOS DIARIOS') +
        '</h3><div class="nuc">NUCLEOS <b>' + M.fmt(S.nucleos) + '</b></div></div>';

      if (which === 'meta') {
        box.innerHTML = head + '<div class="grid">' + NR.Meta.list.map(m => {
          const l = NR.Meta.level(m.id);
          const maxed = l >= m.max;
          const cost = m.cost(l);
          const can = !maxed && S.nucleos >= cost;
          return '<div class="ucard' + (maxed ? ' maxed' : '') + '">' +
            '<div class="uc-i">' + m.icon + '</div>' +
            '<div class="uc-n">' + m.name + '</div>' +
            '<div class="uc-d">' + m.desc + '</div>' +
            '<div class="uc-l">Nivel ' + l + '/' + m.max + '</div>' +
            '<button class="ubtn' + (can ? '' : ' dis') + '" data-buy="' + m.id + '"' +
            (maxed ? ' disabled' : '') + '>' + (maxed ? 'MAXIMO' : M.fmt(cost) + ' NUC') + '</button>' +
            '</div>';
        }).join('') + '</div>';
        box.querySelectorAll('[data-buy]').forEach(b => {
          b.addEventListener('click', () => {
            if (NR.Meta.buy(b.dataset.buy)) {
              NR.Audio.ui(true);
              this.shopTab('meta');
            }
          });
        });
      } else if (which === 'av') {
        box.innerHTML = head + '<div class="grid">' + NR.Avatars.list.map(a => {
          const un = NR.Avatars.unlocked(a.id);
          const cur = S.avatar === a.id;
          return '<div class="ucard' + (cur ? ' sel' : '') + '">' +
            '<div class="uc-i">' + a.icon + '</div>' +
            '<div class="uc-n">' + a.name + '</div>' +
            '<div class="uc-d">' + a.desc + '</div>' +
            '<button class="ubtn' + (un && !cur ? '' : ' dis') + '" data-sel="' + a.id + '"' +
            (un && !cur ? '' : ' disabled') + '>' + (cur ? 'EQUIPADO' : un ? 'EQUIPAR' : 'BLOQUEADO (' + M.fmt(a.unlock) + ')') + '</button>' +
            '</div>';
        }).join('') + '</div>';
        box.querySelectorAll('[data-sel]').forEach(b => {
          b.addEventListener('click', () => {
            if (NR.Avatars.select(b.dataset.sel)) { NR.Audio.ui(true); this.shopTab('av'); this.refreshTitle(); }
          });
        });
      } else {
        NR.Contracts.refresh();
        box.innerHTML = head + '<div class="grid">' + NR.Contracts.list.map(c => {
          const p = Math.min(100, Math.floor(c.progress / c.goal * 100));
          const can = c.done && !c.claimed;
          return '<div class="ucard' + (c.done ? ' ok' : '') + '">' +
            '<div class="uc-n">' + c.text + '</div>' +
            '<div class="ct-bar"><i style="width:' + p + '%"></i></div>' +
            '<div class="uc-d">' + Math.min(c.progress, c.goal) + ' / ' + c.goal + ' &middot; recompensa ' + c.reward + ' nucleos</div>' +
            '<button class="ubtn' + (can ? '' : ' dis') + '" data-claim="' + c.id + '"' + (can ? '' : ' disabled') + '>' +
            (c.claimed ? 'RECLAMADO' : can ? 'RECLAMAR' : 'EN CURSO') + '</button></div>';
        }).join('') + '</div>';
        box.querySelectorAll('[data-claim]').forEach(b => {
          b.addEventListener('click', () => {
            const c = NR.Contracts.list.find(x => x.id === b.dataset.claim);
            if (c && NR.Contracts.claim(c)) { NR.Audio.ui(true); this.shopTab('ct'); this.refreshTitle(); }
          });
        });
      }
    },

    /* ---------------- cartas ---------------- */
    showCards(cards, cb) {
      this.cardsCb = cb;
      const list = document.getElementById('card-list');
      const rc = ['common', 'rare', 'epic', 'legendary'];
      list.innerHTML = cards.map((c, i) => {
        const l = (NR.Game.run.cardLvls[c.id] || 0) + 1;
        return '<button class="pcard r-' + rc[c.rarity] + '" data-i="' + i + '">' +
          '<div class="pc-key">' + (i + 1) + '</div>' +
          '<div class="pc-i">' + c.icon + '</div>' +
          '<div class="pc-n">' + c.name + '</div>' +
          '<div class="pc-d">' + c.desc(l) + '</div>' +
          '<div class="pc-r">' + rc[c.rarity].toUpperCase() + ' &middot; nivel ' + l + '</div>' +
          '</button>';
      }).join('');
      list.querySelectorAll('.pcard').forEach(b => {
        b.addEventListener('click', () => {
          const c = cards[parseInt(b.dataset.i, 10)];
          if (c && this.cardsCb) this.cardsCb(c);
        });
      });
      const t = document.getElementById('card-title');
      if (t) t.textContent = 'ELIGE UNA MEJORA';
      this.show('cards');
    },

    /* ---------------- fin de partida ---------------- */
    showOver(run, unlocked) {
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      set('ov-score', M.fmt(run.score));
      set('ov-wave', String(run.wave));
      set('ov-kills', String(run.kills));
      set('ov-combo', String(run.maxCombo));
      set('ov-ether', M.fmt(run.ether));
      set('ov-time', M.time(run.elapsed()));
      set('ov-nuc', '+' + M.fmt(run.earned));
      set('ov-cards', String(run.cardsTaken));
      const hi = document.getElementById('ov-best');
      if (hi) hi.textContent = 'Récord: ' + M.fmt(NR.Save.data.best.score);
      const unl = document.getElementById('ov-unlock');
      if (unl) {
        unl.innerHTML = unlocked ? '<b>AVATAR DESBLOQUEADO: ' + unlocked.icon + ' ' + unlocked.name + '</b>' : '';
        unl.style.display = unlocked ? 'block' : 'none';
      }
      const cts = document.getElementById('ov-contracts');
      if (cts) {
        cts.innerHTML = NR.Contracts.list.map(c => {
          const p = Math.min(100, Math.floor(c.progress / c.goal * 100));
          return '<div class="ct"><div class="ct-t">' + c.text + '</div>' +
            '<div class="ct-bar"><i style="width:' + p + '%"></i></div>' +
            '<div class="ct-r">' + Math.min(c.progress, c.goal) + '/' + c.goal + '</div></div>';
        }).join('');
      }
      this.show('over');
    },

    /* ================= HUD (canvas) ================= */
    hud(ctx, g) {
      const run = g.run, p = g.player;
      if (!run || !p) return;
      const w = g.w, h = g.h;
      const H = NR.Pal.hue;

      /* --- barra de vida --- */
      const bx = 18, by = 18, bw = Math.min(340, w * 0.34), bh = 20;
      ctx.fillStyle = 'rgba(6,8,16,0.72)';
      ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
      const hpFrac = M.clamp(p.hp / p.maxHp, 0, 1);
      const low = hpFrac < 0.3;
      const pulse = low ? 0.6 + Math.sin(g.time * 9) * 0.4 : 1;
      const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      grad.addColorStop(0, low ? '#ff2d55' : M.hsl(H, 95, 60));
      grad.addColorStop(1, low ? '#ff7a5a' : M.hsl(H + 40, 95, 62));
      ctx.globalAlpha = pulse;
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, bw * hpFrac, bh);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, bh);
      /* marcas */
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      for (let i = 1; i < 5; i++) {
        const x = bx + (bw / 5) * i;
        ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by + bh); ctx.stroke();
      }
      /* escudo */
      if (p.maxShield > 0) {
        ctx.fillStyle = 'rgba(140,230,255,0.85)';
        ctx.fillRect(bx, by - 6, bw * M.clamp(p.shield / p.maxShield, 0, 1), 4);
      }
      ctx.font = '800 13px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(Math.ceil(p.hp) + ' / ' + p.maxHp, bx + 4, by + bh + 16);
      ctx.fillStyle = M.hsl(H, 90, 70);
      ctx.fillText(run.avatar.toUpperCase(), bx + 120, by + bh + 16);
      /* dash */
      for (let i = 0; i < run.stats.dashCharges; i++) {
        const dx = bx + 4 + i * 16, dy = by + bh + 22;
        ctx.fillStyle = i < p.dashCharges ? M.hsl(H, 95, 65) : 'rgba(255,255,255,0.16)';
        ctx.beginPath();
        ctx.moveTo(dx + 7, dy); ctx.lineTo(dx, dy + 6); ctx.lineTo(dx + 4, dy + 6);
        ctx.lineTo(dx + 2, dy + 12); ctx.lineTo(dx + 11, dy + 5); ctx.lineTo(dx + 6, dy + 5);
        ctx.closePath(); ctx.fill();
      }

      /* --- barra de flujo (hiper) --- */
      const fx = w - 44, fy = 120, fh = 190, fw = 14;
      ctx.fillStyle = 'rgba(6,8,16,0.7)';
      ctx.fillRect(fx - 3, fy - 3, fw + 6, fh + 6);
      const fl = M.clamp(p.flow / 100, 0, 1);
      const fg = ctx.createLinearGradient(0, fy + fh, 0, fy);
      fg.addColorStop(0, '#3ad9ff');
      fg.addColorStop(1, run.hyperActive ? '#ff4d8d' : '#ffe66d');
      ctx.fillStyle = fg;
      ctx.fillRect(fx, fy + fh * (1 - fl), fw, fh * fl);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(fx, fy, fw, fh);
      if (p.flow >= 100 && !run.hyperActive) {
        const a = 0.5 + Math.sin(g.time * 10) * 0.5;
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#ffe66d';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(fx - 3, fy - 3, fw + 6, fh + 6);
        ctx.globalAlpha = 1;
        ctx.font = '900 12px system-ui';
        ctx.fillStyle = '#ffe66d';
        ctx.textAlign = 'right';
        ctx.fillText('Q', w - 20, fy + fh + 18);
        ctx.fillText('SOBRECARGA', w - 20, fy + fh + 32);
        ctx.textAlign = 'left';
      } else if (run.hyperActive) {
        ctx.font = '900 12px system-ui';
        ctx.fillStyle = '#ff4d8d';
        ctx.textAlign = 'center';
        ctx.fillText('SOBRE', fx + fw / 2, fy + fh + 18);
        ctx.textAlign = 'left';
      }

      /* --- oleada y reglas --- */
      ctx.textAlign = 'center';
      ctx.font = '900 26px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.fillText('OLEADA ' + run.wave, w / 2, 34);
      if (run.modNames && run.modNames.length) {
        ctx.font = '800 13px system-ui';
        const names = run.modNames.map(k => NR.Mutators[k].name).join('  +  ');
        ctx.fillStyle = M.hsl(H + 160, 95, 66);
        ctx.fillText(names, w / 2, 52);
      }
      /* evento */
      if (run.event) {
        const ev = NR.Events[run.event.kind];
        ctx.font = '900 14px system-ui';
        ctx.fillStyle = ev ? ev.col : '#fff';
        ctx.fillText('EVENTO: ' + (ev ? ev.name : '') + '  ' + Math.ceil(run.event.t) + 's', w / 2, 70);
      }
      ctx.textAlign = 'left';

      /* --- puntos --- */
      ctx.textAlign = 'right';
      ctx.font = '900 30px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(M.fmt(run.score), w - 20, 40);
      ctx.font = '800 13px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText('PUNTOS', w - 20, 55);
      ctx.fillStyle = '#ffd166';
      ctx.font = '900 16px system-ui';
      ctx.fillText('◆ ' + run.cores + '  NUCLEOS', w - 20, 74);
      ctx.textAlign = 'left';

      /* --- barra de jefe --- */
      if (g.boss && !g.boss.dead) {
        const b = g.boss;
        const bw2 = Math.min(560, w * 0.56), bx2 = (w - bw2) / 2, by2 = h - 74;
        ctx.fillStyle = 'rgba(6,8,16,0.8)';
        ctx.fillRect(bx2 - 4, by2 - 4, bw2 + 8, 26);
        const fr = M.clamp(b.hp / b.maxHp, 0, 1);
        const bg = ctx.createLinearGradient(bx2, 0, bx2 + bw2, 0);
        bg.addColorStop(0, '#ff2d55'); bg.addColorStop(1, '#ff8a3d');
        ctx.fillStyle = bg;
        ctx.fillRect(bx2, by2, bw2 * fr, 18);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx2, by2, bw2, 18);
        ctx.font = '900 13px system-ui';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('JEFE: ' + b.kind.toUpperCase(), w / 2, by2 - 10);
        ctx.textAlign = 'left';
      }

      /* --- combo --- */
      if (run.combo > 1) {
        const s = 1 + Math.min(0.9, run.combo * 0.012);
        const cx = 46, cy = h * 0.42;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s, s);
        ctx.font = '900 54px system-ui';
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillText('x' + run.combo, 3, 3);
        ctx.fillStyle = p.comboFlash > 0 ? '#fff' : M.hsl(H + 120, 100, 66);
        ctx.fillText('x' + run.combo, 0, 0);
        ctx.font = '800 15px system-ui';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('COMBO', 2, 20);
        ctx.restore();
        /* multiplicador */
        ctx.font = '900 20px system-ui';
        ctx.fillStyle = '#ffe66d';
        ctx.fillText('MULT x' + run.multiplier().toFixed(1), cx, cy + 62);
      }

      /* --- armas --- */
      let ax = 18, ay = h - 34;
      for (const wid of run.weapons) {
        const wp = NR.Weapons[wid];
        if (!wp) continue;
        const lv = run.wlv[wid] || 0;
        ctx.fillStyle = 'rgba(6,8,16,0.7)';
        ctx.fillRect(ax - 2, ay - 17, 92, 24);
        ctx.strokeStyle = M.hsl(H, 90, 60, 0.55);
        ctx.lineWidth = 1.4;
        ctx.strokeRect(ax - 2, ay - 17, 92, 24);
        ctx.font = '900 12px system-ui';
        ctx.fillStyle = '#fff';
        ctx.fillText(wp.name + (lv ? ' +' + lv : ''), ax + 6, ay - 3);
        ax += 98;
      }

      /* --- eter / nivel --- */
      const lf = M.clamp(run.ether / run.nextLevel, 0, 1);
      const lw = Math.min(220, w * 0.2), lx = w - lw - 20, ly = h - 30;
      ctx.fillStyle = 'rgba(6,8,16,0.7)';
      ctx.fillRect(lx, ly - 8, lw, 10);
      ctx.fillStyle = M.hsl(H + 40, 95, 60);
      ctx.fillRect(lx, ly - 8, lw * lf, 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx, ly - 8, lw, 10);
      ctx.font = '800 11px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.textAlign = 'right';
      ctx.fillText('NIVEL ' + run.level, w - 20, ly - 12);
      ctx.textAlign = 'left';

      /* --- tutorial de los primeros segundos --- */
      if (!NR.Save.data.seen.intro && run.elapsed() < 9) {
        const a = M.clamp((9 - run.elapsed()) / 2.2, 0, 1);
        ctx.globalAlpha = a;
        ctx.font = '900 16px system-ui';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('WASD mover  ·  RATON disparar  ·  ESPACIO dash  ·  Q sobrecarga', w / 2, h - 74);
        ctx.font = '800 13px system-ui';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillText('el dash atraviesa enemigos y destruye balas', w / 2, h - 54);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }

      /* --- avisos (toasts) --- */
      ctx.font = '800 14px system-ui';
      let ty = h - 120;
      for (const t of run.toasts) {
        const a = M.clamp(t.life / 0.6, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillText(t.msg, 20, ty);
        ctx.fillStyle = M.hsl(H, 95, 72);
        ctx.fillText(t.msg, 19, ty - 1);
        ctx.globalAlpha = 1;
        ty -= 20;
      }

      /* --- banner de oleada/evento --- */
      const bn = NR.Director.banner;
      if (bn) {
        const k = 1 - bn.life / bn.max;
        const a = k < 0.12 ? k / 0.12 : k > 0.75 ? (1 - k) / 0.25 : 1;
        const sc = k < 0.2 ? M.easeOutBack(k / 0.2) : 1;
        ctx.save();
        ctx.globalAlpha = M.clamp(a, 0, 1);
        ctx.translate(w / 2, h * 0.3);
        ctx.scale(sc, sc);
        ctx.textAlign = 'center';
        ctx.font = '900 46px system-ui';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(bn.title, 3, 4);
        ctx.fillStyle = bn.col;
        ctx.fillText(bn.title, 0, 0);
        ctx.font = '800 16px system-ui';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(bn.sub, 0, 26);
        if (bn.desc) {
          ctx.font = '700 13px system-ui';
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillText(bn.desc, 0, 46);
        }
        ctx.restore();
        ctx.textAlign = 'left';
      }

      /* ---Contracts minimap --- */
      const cts = NR.Contracts.list;
      if (cts && cts.length) {
        ctx.font = '800 11px system-ui';
        let cy2 = h - 120;
        for (const c of cts) {
          const fr = M.clamp(c.progress / c.goal, 0, 1);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillText(c.text, w - 210, cy2);
          ctx.fillStyle = c.done ? '#7bffb0' : 'rgba(255,255,255,0.18)';
          ctx.fillRect(w - 210, cy2 + 4, 190 * fr, 3);
          cy2 += 24;
        }
      }

      /* --- aviso de vida baja --- */
      if (hpFrac < 0.3 && !run.hyperActive) {
        const a = (0.18 + Math.sin(g.time * 8) * 0.1) * (1 - hpFrac / 0.3);
        const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.6);
        vg.addColorStop(0, 'rgba(255,0,60,0)');
        vg.addColorStop(1, 'rgba(255,0,60,' + a.toFixed(3) + ')');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
      }

      /* --- supercarga --- */
      if (run.hyperActive) {
        /* rayas de velocidad */
        ctx.save();
        ctx.translate(w / 2, h / 2);
        for (let i = 0; i < 54; i++) {
          const a = (i / 54) * TAU + g.time * 0.5;
          const ph = ((i * 97) % 100) / 100;
          const r0 = 90 + ((g.time * 320 + ph * 520) % 520);
          const r1 = r0 + 90 + ph * 90;
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.05 + ph * 0.13).toFixed(3) + ')';
          ctx.lineWidth = 1.5 + ph * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.stroke();
        }
        ctx.restore();
        ctx.textAlign = 'center';
        ctx.font = '900 20px system-ui';
        ctx.fillStyle = '#fff';
        ctx.fillText('SOBRECARGA ' + p.hyperT.toFixed(1) + 's', w / 2, h - 96);
        ctx.textAlign = 'left';
      }
    }
  });
})();
