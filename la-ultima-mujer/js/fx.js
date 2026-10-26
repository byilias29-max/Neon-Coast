'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — atmósfera: lluvia, polvo, brasas, relámpagos
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U;
  const F = {};
  LM.FX = F;

  let settings = null;
  let width = 1280, height = 720;
  let scene = null;
  let sceneId = '';
  let rain = [];
  let dust = [];
  let embers = [];
  let bursts = [];
  let time = 0;
  let shakeAmount = 0;
  let shakeTime = 0;
  let lightningTimer = 18 + Math.random() * 14;
  let flashTimer = 0;
  let torchOn = false;
  let torchPos = { x: 0, y: 0 };

  F.init = function (s) {
    settings = s;
    resetParticles();
  };

  F.resize = function (w, h) {
    width = w; height = h;
    resetParticles();
  };

  F.configure = function (s) {
    settings = s;
    resetParticles();
  };

  function quality() {
    return (LM.CONFIG.QUALITY[(settings && settings.quality) || 'high'] || LM.CONFIG.QUALITY.high);
  }

  function resetParticles() {
    const q = quality();
    rain = [];
    const n = q.rain;
    for (let i = 0; i < n; i++) {
      rain.push({
        x: Math.random() * (width + 200) - 100,
        y: Math.random() * height,
        len: 7 + Math.random() * 18,
        speed: 520 + Math.random() * 460,
        alpha: .045 + Math.random() * .12,
        z: .35 + Math.random() * .65
      });
    }
    dust = [];
    for (let i = 0; i < q.dust; i++) {
      dust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: .4 + Math.random() * 1.5,
        a: .02 + Math.random() * .075,
        vx: (Math.random() - .5) * 5,
        vy: -2 - Math.random() * 5,
        phase: Math.random() * Math.PI * 2
      });
    }
    embers = [];
    bursts = [];
  }

  F.setScene = function (sc) {
    scene = sc;
    sceneId = sc ? sc.id : '';
    if (sceneId === 'street') lightningTimer = 10 + Math.random() * 16;
  };

  F.setTorch = function (on, x, y) {
    torchOn = !!on;
    if (x != null) torchPos.x = x;
    if (y != null) torchPos.y = y;
  };

  F.shake = function (amount, duration) {
    if (!settings || settings.reduceMotion) return;
    shakeAmount = Math.max(shakeAmount, amount || 4);
    shakeTime = Math.max(shakeTime, duration || .35);
  };

  F.flash = function (alpha, duration) {
    const el = U.$('#fx-flash');
    if (!el) return;
    const a = (settings && settings.reduceMotion) ? Math.min(.22, alpha * .4) : alpha;
    el.style.transition = 'none';
    el.style.opacity = String(a);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      el.style.transition = `opacity ${duration || 380}ms ease-out`;
      el.style.opacity = '0';
    }, 36);
  };

  F.burstDust = function (x, y, n) {
    if (!settings || !settings.particles) return;
    for (let i = 0; i < (n || 4); i++) {
      bursts.push({
        x: x + (Math.random() - .5) * 12,
        y: y + (Math.random() - .5) * 4,
        vx: (Math.random() - .5) * 24,
        vy: -4 - Math.random() * 18,
        life: .45 + Math.random() * .4,
        max: .85,
        r: .6 + Math.random() * 1.4,
        color: 'rgba(151,145,126,'
      });
    }
  };

  F.getShake = function () {
    if (!settings || settings.reduceMotion || shakeTime <= 0) return { x: 0, y: 0 };
    const f = shakeTime > 0 ? Math.min(1, shakeTime * 3) : 0;
    return {
      x: Math.sin(time * 73.7) * shakeAmount * f * .55,
      y: Math.cos(time * 91.3) * shakeAmount * f * .42
    };
  };

  function lightning() {
    if (sceneId !== 'street') return;
    lightningTimer = 15 + Math.random() * 22;
    F.flash(.42 + Math.random() * .25, 420 + Math.random() * 600);
    if (LM.Audio && LM.Audio.thunder) LM.Audio.thunder(.65 + Math.random() * .3, .8 + Math.random() * 1.4);
    F.shake(4.5, .5);
  }

  F.update = function (dt, opts) {
    opts = opts || {};
    time += dt;
    if (opts.torch !== undefined) torchOn = !!opts.torch;
    if (opts.torchPos) {
      torchPos.x = opts.torchPos.x;
      torchPos.y = opts.torchPos.y;
    }
    if (shakeTime > 0) {
      shakeTime -= dt;
      shakeAmount *= Math.exp(-2.7 * dt);
      if (shakeTime <= 0) { shakeTime = 0; shakeAmount = 0; }
    }

    if (!settings || !settings.particles) return;

    const isStreet = sceneId === 'street';
    const wind = isStreet ? 105 : 0;
    if (isStreet) {
      for (const p of rain) {
        p.y += p.speed * dt * p.z;
        p.x += wind * dt * p.z;
        if (p.y > height + 30) {
          p.y = -20 - Math.random() * 80;
          p.x = Math.random() * (width + 260) - 130;
        }
        if (p.x > width + 80) p.x = -80;
      }
      lightningTimer -= dt;
      if (lightningTimer <= 0) lightning();
    }

    for (const m of dust) {
      m.x += (m.vx + Math.sin(time * .45 + m.phase) * 4) * dt;
      m.y += m.vy * dt;
      if (m.y < -10) { m.y = height + 10; m.x = Math.random() * width; }
      if (m.x < -10) m.x = width + 10;
      if (m.x > width + 10) m.x = -10;
    }

    if (torchOn && settings.particles) {
      if (Math.random() < dt * 11) {
        embers.push({
          x: torchPos.x + (Math.random() - .5) * 14,
          y: torchPos.y - 20 + (Math.random() - .5) * 8,
          vx: (Math.random() - .5) * 14,
          vy: -20 - Math.random() * 26,
          life: .6 + Math.random() * .7,
          max: 1.3,
          r: .5 + Math.random() * 1.2
        });
      }
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.life -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx += Math.sin(time * 4 + i) * 5 * dt;
      if (e.life <= 0) embers.splice(i, 1);
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy -= 22 * dt;
      if (b.life <= 0) bursts.splice(i, 1);
    }
    if (bursts.length > 90) bursts.splice(0, bursts.length - 90);
    if (embers.length > 80) embers.splice(0, embers.length - 80);
  };

  F.render = function (ctx, view, cam) {
    if (!settings) return;
    const isStreet = sceneId === 'street';
    if (settings.particles && isStreet) {
      ctx.save();
      ctx.lineCap = 'round';
      for (const p of rain) {
        const slant = 20 * p.z;
        ctx.strokeStyle = `rgba(180,203,198,${p.alpha})`;
        ctx.lineWidth = .55 + p.z * .8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + slant, p.y + p.len * (1.2 + p.z));
        ctx.stroke();
      }
      // Salpicaduras tenues en el suelo de la calle.
      ctx.strokeStyle = 'rgba(168,194,190,.08)';
      ctx.lineWidth = .6;
      const baseY = Math.min(view.h * .82, 760);
      for (let i = 0; i < 16; i++) {
        const t = ((time * .7 + i * .137) % 1);
        const x = ((i * 197 + 41) % view.w) + Math.sin(time + i) * 5;
        const y = baseY - (i % 5) * 34 + t * 12;
        ctx.beginPath();
        ctx.ellipse(x, y, 4 + t * 9, 1 + t * 2.2, 0, 0, Math.PI * 2);
        ctx.globalAlpha = (1 - t) * .7;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    if (settings.particles && !isStreet) {
      ctx.save();
      for (const m of dust) {
        ctx.fillStyle = `rgba(221,210,184,${m.a})`;
        ctx.beginPath();
        ctx.arc(m.x + Math.sin(time * .7 + m.phase) * 8, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (settings.particles && torchOn) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        const a = U.clamp(e.life / e.max, 0, 1);
        ctx.fillStyle = `rgba(255,${120 + a * 70 | 0},54,${a * .65})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * (1.1 - a * .35), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (settings.particles && bursts.length) {
      ctx.save();
      for (const b of bursts) {
        const a = U.clamp(b.life / b.max, 0, 1) * .35;
        ctx.fillStyle = b.color + a + ')';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  F.time = () => time;
})();
