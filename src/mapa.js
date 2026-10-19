/* Neon Coast - mapa: icono real del coche del jugador y flechas de destino fuera de
   pantalla (direccion correcta, dentro de los limites) en minimapa y mapa grande. */
(function () {
  'use strict';
  if (!window.NC) return;

  // ---------- capturar la transformacion del mapa grande ----------
  let bigT = null;
  try {
    const bmc = document.getElementById('bm').getContext('2d');
    const orig = bmc.setTransform.bind(bmc);
    bmc.setTransform = function (a, b, c, d, e, f) { bigT = [a, b, c, d, e, f]; return orig(a, b, c, d, e, f); };
  } catch (e) { }

  // ---------- coche del jugador ----------
  function playerCar() {
    try {
      if (typeof P !== 'undefined' && P && P.car && P.car.position) return P.car;
      if (typeof car !== 'undefined' && car && car.position) return car;
    } catch (e) { }
    return null;
  }
  function carState() {
    const c = playerCar(); if (!c) return null;
    let th = c.rotation ? c.rotation.y : 0;
    try { if (typeof P !== 'undefined' && P && !P.foot && typeof P.th === 'number') th = P.th; } catch (e) { }
    return { x: c.position.x, z: c.position.z, th };
  }

  // ---------- dibujo del icono de coche ----------
  function drawCarIcon(g, x, y, ang, s, col) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = 'rgba(8,8,14,.85)';
    g.beginPath(); g.roundRect ? g.roundRect(-4.5 * s, -7 * s, 9 * s, 14 * s, 2.4 * s) : g.rect(-4.5 * s, -7 * s, 9 * s, 14 * s); g.fill();
    g.fillStyle = col || '#ffd24a';
    g.beginPath(); g.roundRect ? g.roundRect(-3.4 * s, -6 * s, 6.8 * s, 12 * s, 2 * s) : g.rect(-3.4 * s, -6 * s, 6.8 * s, 12 * s); g.fill();
    g.fillStyle = '#12141c';
    g.beginPath(); g.roundRect ? g.roundRect(-2.4 * s, -3.4 * s, 4.8 * s, 3.4 * s, 1.2 * s) : g.rect(-2.4 * s, -3.4 * s, 4.8 * s, 3.4 * s); g.fill();
    g.fillStyle = '#fff3c4';
    g.fillRect(-2.6 * s, -6.2 * s, 5.2 * s, 1.5 * s);
    g.restore();
  }

  // ---------- flecha de borde ----------
  function edgeArrow(g, cx, cy, radius, tx, ty, color, label) {
    const dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy);
    if (d <= radius) return false;
    const a = Math.atan2(dy, dx);
    const px = cx + Math.cos(a) * (radius - 12), py = cy + Math.sin(a) * (radius - 12);
    g.save(); g.translate(px, py); g.rotate(a);
    g.fillStyle = 'rgba(10,10,20,.8)';
    g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fill();
    g.fillStyle = color;
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-4, 5.5); g.lineTo(-1.6, 0); g.lineTo(-4, -5.5); g.closePath(); g.fill();
    g.restore();
    if (label) {
      g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff';
      g.fillText(label, px, py + 3.5);
    }
    return true;
  }

  // ---------- MINI MAPA ----------
  const _mini = window.mini;
  if (typeof _mini === 'function') {
    window.mini = function (px, pz, th) {
      _mini.apply(this, arguments);
      try {
        const g = document.getElementById('mm').getContext('2d');
        const S = g.canvas.width, C = S / 2, s = window.miniBig ? .78 : .5, c = Math.cos(th), n = Math.sin(th);
        const W2S = (x, z) => ({ X: -c * s * (x - px) + n * s * (z - pz) + C, Y: n * s * (x - px) - c * s * (z - pz) + C });
        // coche
        const cs = carState();
        if (cs) {
          const p = W2S(cs.x, cs.z);
          const dx = -c * Math.sin(cs.th) + n * Math.cos(cs.th);
          const dy = n * Math.sin(cs.th) - c * Math.cos(cs.th);
          g.save(); g.beginPath(); g.arc(C, C, C - 2, 0, 7); g.clip();
          drawCarIcon(g, p.X, p.Y, Math.atan2(dy, dx), window.miniBig ? 1.5 : 1, '#ffd24a');
          g.restore();
          // flecha en el borde si el coche queda fuera
          const dist = Math.hypot(p.X - C, p.Y - C);
          if (dist > C - 14) {
            const a = Math.atan2(p.Y - C, p.X - C);
            const px2 = C + Math.cos(a) * (C - 13), py2 = C + Math.sin(a) * (C - 13);
            g.save(); g.translate(px2, py2); g.rotate(a);
            g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(8, 0); g.lineTo(-5, 6); g.lineTo(-2, 0); g.lineTo(-5, -6); g.closePath(); g.fill();
            g.restore();
          }
        }
        // destinos fuera de pantalla: objetivo de la mision y waypoint
        g.save(); g.beginPath(); g.arc(C, C, C - 2, 0, 7); g.clip();
        const R = C - 13;
        try {
          if (tgt && tgt.on) { const p = W2S(tgt.x, tgt.z); edgeArrow(g, C, C, R, p.X, p.Y, '#27e6ff'); }
          if (typeof geo !== 'undefined' && geo.dest && geo.dest.on) { const p = W2S(geo.dest.x, geo.dest.z); edgeArrow(g, C, C, R, p.X, p.Y, '#3dff9a', 'D'); }
        } catch (e) { }
        g.restore();
      } catch (e) { }
    };
  }

  // ---------- MAPA GRANDE ----------
  NC.hooks.post.push(() => {
    try {
      const bm = document.getElementById('bigMap');
      if (!bm || !bm.classList.contains('on') || !bigT) return;
      const g = document.getElementById('bm').getContext('2d');
      const S = 1024, C = S / 2;
      const W2S = (x, z) => ({ X: bigT[0] * x + bigT[2] * z + bigT[4], Y: bigT[1] * x + bigT[3] * z + bigT[5] });
      g.setTransform(1, 0, 0, 1, 0, 0);
      // coche
      const cs = carState();
      if (cs) {
        const p = W2S(cs.x, cs.z);
        drawCarIcon(g, p.X, p.Y, cs.th - PI / 2, 1.5, '#ffd24a');
      }
      // flechas de destino fuera del lienzo
      const m = 22;
      try {
        if (tgt && tgt.on) {
          const p = W2S(tgt.x, tgt.z);
          if (p.X < m || p.X > S - m || p.Y < m || p.Y > S - m) {
            const a = Math.atan2(p.Y - C, p.X - C);
            const x = Math.max(m, Math.min(S - m, C + Math.cos(a) * (S / 2 - m)));
            const y = Math.max(m, Math.min(S - m, C + Math.sin(a) * (S / 2 - m)));
            g.save(); g.translate(x, y); g.rotate(a);
            g.fillStyle = 'rgba(10,10,20,.8)'; g.beginPath(); g.arc(0, 0, 15, 0, 7); g.fill();
            g.fillStyle = '#27e6ff'; g.beginPath(); g.moveTo(11, 0); g.lineTo(-7, 8); g.lineTo(-3, 0); g.lineTo(-7, -8); g.closePath(); g.fill();
            g.restore();
          }
        }
      } catch (e) { }
    } catch (e) { }
  });

  NC.log('mapa: icono de coche y flechas de destino fuera de pantalla');
})();
