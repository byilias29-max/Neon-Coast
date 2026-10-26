'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — iluminación dinámica y oclusión
   La antorcha proyecta un cono de luz recortado por muros y
   mobiliario. Las lámparas fijas calculan su polígono de
   visibilidad una sola vez por escena.
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U;
  const L = {};
  LM.Lighting = L;

  const TAU = Math.PI * 2;
  let overlay = null;
  let octx = null;
  let scene = null;
  let segments = [];
  let staticLights = [];
  let quality = 'high';
  let ambientLevel = 0.085;
  let dprCache = 1;

  L.torchRadius = 0;

  L.setQuality = function (q) {
    quality = ['low', 'medium', 'high'].indexOf(q) >= 0 ? q : 'high';
    if (scene) L.reset(scene);
  };

  function raySegments() {
    return segments;
  }

  function buildSegments(sc) {
    const list = [];
    const add = (r, owner) => {
      const x1 = r.x, y1 = r.y, x2 = r.x + r.w, y2 = r.y + r.h;
      const edges = [
        { x1, y1, x2, y2: y1 },
        { x1: x2, y1, x2, y2 },
        { x1: x2, y1: y2, x2: x1, y2 },
        { x1, y1: y2, x2: x1, y2: y1 }
      ];
      for (const e of edges) {
        e.owner = owner;
        list.push(e);
      }
    };
    for (const w of sc.walls || []) add(w, null);
    for (const r of sc.colliders || []) add(r, r);
    return list;
  }

  function insideRect(x, y, r) {
    return x >= r.x - .01 && x <= r.x + r.w + .01 && y >= r.y - .01 && y <= r.y + r.h + .01;
  }

  function castPolygon(x, y, radius, a0, a1, segs, cone) {
    const span = a1 - a0;
    const q = LM.CONFIG.QUALITY[quality] || LM.CONFIG.QUALITY.high;
    const density = cone ? 1.35 : .72;
    const steps = Math.max(26, Math.round(q.rays * density * (Math.abs(span) / TAU)));
    const angles = [];
    for (let i = 0; i <= steps; i++) angles.push(a0 + span * (i / steps));

    // Los vértices de los muros producen sombras duras y limpias.
    const margin = .00035;
    for (const s of segs) {
      const ax = Math.atan2(s.y1 - y, s.x1 - x);
      const bx = Math.atan2(s.y2 - y, s.x2 - x);
      for (const base of [ax, bx]) {
        for (const off of [-margin, margin]) {
          let a = base + off;
          if (span > 0) {
            while (a < a0) a += TAU;
            while (a > a1) a -= TAU;
            if (a >= a0 && a <= a1) angles.push(a);
          } else {
            while (a > a0) a -= TAU;
            while (a < a1) a += TAU;
            if (a <= a0 && a >= a1) angles.push(a);
          }
        }
      }
    }
    angles.sort((a, b) => span > 0 ? a - b : b - a);

    const pts = [];
    if (cone) pts.push({ x, y });
    for (let i = 0; i < angles.length; i++) {
      const a = angles[i];
      if (i && Math.abs(a - angles[i - 1]) < 1e-6) continue;
      const dx = Math.cos(a), dy = Math.sin(a);
      let best = radius;
      for (const s of segs) {
        const hit = U.raySegment(x, y, dx, dy, s);
        if (hit && hit.t > 1.2 && hit.t < best) best = hit.t;
      }
      pts.push({ x: x + dx * best, y: y + dy * best });
    }
    return pts;
  }

  L.reset = function (sc) {
    scene = sc;
    segments = buildSegments(sc);
    staticLights = [];
    const q = LM.CONFIG.QUALITY[quality] || LM.CONFIG.QUALITY.high;
    for (const light of sc.lights || []) {
      // Si la lámpara nace dentro de un mueble (su propia base), ese
      // mueble no debe bloquearla. El resto de la escena sí.
      const segs = segments.filter(s => !(s.owner && insideRect(light.x, light.y, s.owner)));
      const poly = castPolygon(light.x, light.y, light.r, 0, TAU, segs, false);
      staticLights.push({ light, poly, seed: (light.x * 3 + light.y * 7) % 100 });
    }
    if (overlay) {
      overlay.width = 0;
      overlay.height = 0;
    }
  };

  function ensureOverlay(w, h, dpr) {
    if (!overlay) {
      overlay = document.createElement('canvas');
      octx = overlay.getContext('2d');
    }
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    if (overlay.width !== pw || overlay.height !== ph || dprCache !== dpr) {
      overlay.width = pw;
      overlay.height = ph;
      dprCache = dpr;
    }
  }

  function flickerValue(item, t) {
    const l = item.light;
    const f = l.flicker || 0;
    if (!f) return 1;
    const s = item.seed || 1;
    const wave = Math.sin(t * (l.speed || 2) + s) * .6 +
      Math.sin(t * (l.speed || 2) * 2.31 + s * .7) * .3 +
      Math.sin(t * 17 + s * 1.7) * .1;
    return U.clamp(1 - f * .5 - f * .5 * wave, .35, 1);
  }

  function toScreen(p, cam, view) {
    return {
      x: (p.x - cam.x) * cam.zoom + view.w / 2,
      y: (p.y - cam.y) * cam.zoom + view.h / 2
    };
  }

  function pathPoly(ctx, pts, cam, view) {
    if (!pts || pts.length < 2) return false;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = toScreen(pts[i], cam, view);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    return true;
  }

  function cullPoly(poly, cam, view, radius) {
    const r = radius * cam.zoom + 24;
    const p = toScreen({ x: poly._x || 0, y: poly._y || 0 }, cam, view);
    // Basta con que el centro ampliado toque la pantalla.
    return p.x + r > -40 && p.x - r < view.w + 40 && p.y + r > -40 && p.y - r < view.h + 40;
  }

  function drawCutout(ctx, poly, x, y, radius, alpha, cam, view) {
    if (!pathPoly(ctx, poly, cam, view)) return;
    ctx.save();
    ctx.clip();
    const p = toScreen({ x, y }, cam, view);
    const r = radius * cam.zoom;
    const g = ctx.createRadialGradient(p.x, p.y, r * .04, p.x, p.y, r);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(.38, `rgba(255,255,255,${alpha * .82})`);
    g.addColorStop(.72, `rgba(255,255,255,${alpha * .35})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }

  function drawColor(ctx, poly, x, y, radius, color, strength, cam, view) {
    if (!pathPoly(ctx, poly, cam, view)) return;
    ctx.save();
    ctx.clip();
    const p = toScreen({ x, y }, cam, view);
    const r = radius * cam.zoom;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, color);
    g.addColorStop(.5, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = strength;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }

  L.render = function (ctx, view, cam, sc, torch, time) {
    if (!sc) return;
    if (sc !== scene) L.reset(sc);
    ensureOverlay(view.w, view.h, view.dpr || 1);
    const t = time || 0;
    const darkness = U.clamp(sc.darkness == null ? .92 : sc.darkness, 0, .985);
    const blackout = view.blackout == null ? 1 : view.blackout;

    octx.setTransform(view.dpr || 1, 0, 0, view.dpr || 1, 0, 0);
    octx.clearRect(0, 0, view.w, view.h);
    octx.globalCompositeOperation = 'source-over';
    octx.fillStyle = `rgba(2,5,7,${darkness * blackout})`;
    octx.fillRect(0, 0, view.w, view.h);

    octx.globalCompositeOperation = 'destination-out';
    for (const item of staticLights) {
      const l = item.light;
      const flick = flickerValue(item, t);
      const rad = l.r * (.94 + flick * .06);
      const alpha = (.72 + (l.color ? .1 : 0)) * flick * blackout;
      drawCutout(octx, item.poly, l.x, l.y, rad, alpha, cam, view);
    }

    let torchPoly = null;
    if (torch && torch.active) {
      const fuel = U.clamp(torch.fuel == null ? 100 : torch.fuel, 0, 100);
      const fuelScale = .52 + .48 * Math.sqrt(fuel / 100);
      const radius = LM.CONFIG.PLAYER.torchRange * fuelScale;
      L.torchRadius = radius;
      const half = LM.CONFIG.PLAYER.torchAngle;
      const flick = .9 + Math.sin(t * 13.7) * .035 + Math.sin(t * 24.3 + 1.7) * .025 + Math.sin(t * 7.1) * .02;
      const fullRadius = radius * flick;
      torchPoly = castPolygon(torch.x, torch.y, fullRadius, torch.aim - half, torch.aim + half, segments, true);
      drawCutout(octx, torchPoly, torch.x, torch.y, fullRadius, .97 * blackout, cam, view);
      // Halo inmediato: permite leer el suelo junto a los pies.
      const nearPoly = castPolygon(torch.x, torch.y, 92 + fuelScale * 26, 0, TAU, segments, false);
      drawCutout(octx, nearPoly, torch.x, torch.y, 115 + fuelScale * 24, .62 * blackout, cam, view);
    }

    octx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.drawImage(overlay, 0, 0, overlay.width, overlay.height, 0, 0, view.w, view.h);
    ctx.restore();

    // Luz cálida sobre la escena, siempre recortada por los mismos muros.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const item of staticLights) {
      const l = item.light;
      const flick = flickerValue(item, t);
      drawColor(ctx, item.poly, l.x, l.y, l.r * 1.06, l.color || 'rgba(220,180,120,.2)', .42 * flick, cam, view);
    }
    if (torchPoly) {
      drawColor(ctx, torchPoly, torch.x, torch.y, (L.torchRadius || 300) * 1.02, 'rgba(255,183,102,.34)', .66, cam, view);
      const p = toScreen({ x: torch.x, y: torch.y }, cam, view);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 38 * cam.zoom);
      g.addColorStop(0, 'rgba(255,232,188,.35)');
      g.addColorStop(.45, 'rgba(255,164,84,.13)');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 80, p.y - 80, 160, 160);
    }
    ctx.restore();
  };

  L.staticCount = () => staticLights.length;
})();
