/* Neon Coast - cielo: paletas realistas (el cénit ya no es un vacío negro),
   banda de bruma en el horizonte, estrellas, luna y nubes con volumen. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;

  // ---------- 1) paletas corregidas: cenit profundo pero legible ----------
  const NEW = {
    0: { top: '#050818', mid: '#0d1636', bot: '#232c52' },
    1: { top: '#1b3a72', mid: '#e08a72', bot: '#ffc79a' },
    2: { top: '#1a6fc4', mid: '#8ecbe9', bot: '#dbeef6' },
    3: { top: '#1a6fc4', mid: '#8ecbe9', bot: '#dbeef6' },
    4: { top: '#1e3568', mid: '#6d4a9c', bot: '#ffab86' },
    5: { top: '#050818', mid: '#0d1636', bot: '#232c52' },
    6: { top: '#050818', mid: '#0d1636', bot: '#232c52' }
  };
  try {
    SKY.forEach((k, i) => { const n = NEW[i] || NEW[0]; k.top = n.top; k.mid = n.mid; k.bot = n.bot; });
    // bruma y resplandor de horizonte mas calidos
    SKY.forEach(k => { k.haz = k.sun; });
  } catch (e) { NC.log('cielo: paleta', e); }

  // ---------- 2) gradiente del domo con horizonte correcto ----------
  function repaint() {
    try {
      const k = skyAt(WX.t);
      const c = skyG.children[0].material.map.image, x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, c.height);
      const mix = (a, b, t) => '#' + new T.Color(a).lerp(new T.Color(b), t).getHexString();
      g.addColorStop(0, k.top);                       // cenit
      g.addColorStop(.26, k.mid);
      g.addColorStop(.42, mix(k.mid, k.bot, .45));
      g.addColorStop(.48, mix(k.bot, k.sun, .35));    // bruma calida
      g.addColorStop(.5, mix(k.bot, '#ffffff', .18)); // banda de horizonte
      g.addColorStop(.54, mix(k.bot, k.sun, .3));
      g.addColorStop(.62, k.bot);
      g.addColorStop(1, mix(k.bot, '#0a0a14', .55));  // bajo el horizonte
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      skyG.children[0].material.map.needsUpdate = true;
    } catch (e) { }
  }

  // ---------- 3) estrellas + luna ----------
  let stars = null, moon = null;
  try {
    const N = 700, pos = new Float32Array(N * 3), sz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 415;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(a); pos[i * 3 + 1] = Math.abs(u) * r * .9 + 15; pos[i * 3 + 2] = r * s * Math.sin(a);
      sz[i] = .6 + Math.random() * 1.8;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    stars = new T.Points(g, new T.PointsMaterial({ color: 0xfff3d6, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    stars.renderOrder = -2; skyG.add(stars);

    // luna: disco con craterizado suave
    const mc = document.createElement('canvas'); mc.width = mc.height = 128;
    const mx = mc.getContext('2d');
    const mg = mx.createRadialGradient(64, 56, 8, 64, 64, 62);
    mg.addColorStop(0, '#fdfaf0'); mg.addColorStop(.72, '#e6e0d0'); mg.addColorStop(1, '#b9b3a4');
    mx.fillStyle = mg; mx.beginPath(); mx.arc(64, 64, 60, 0, 7); mx.fill();
    for (let i = 0; i < 16; i++) {
      mx.fillStyle = 'rgba(140,134,120,.35)';
      mx.beginPath(); mx.arc(20 + Math.random() * 88, 20 + Math.random() * 88, 3 + Math.random() * 9, 0, 7); mx.fill();
    }
    const mt = new T.CanvasTexture(mc); mt.encoding = T.sRGBEncoding;
    moon = new T.Mesh(new T.CircleGeometry(22, 28), new T.MeshBasicMaterial({ map: mt, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    moon.renderOrder = -1; skyG.add(moon);
  } catch (e) { NC.log('cielo: estrellas', e); }

  // ---------- 4) envolvente de paintSky ----------
  const _paint = window.paintSky;
  window.paintSky = function () {
    try { _paint && _paint(); } catch (e) { }
    repaint();
    try {
      const k = skyAt(WX.t);
      const night = Math.max(0, Math.min(1, (0.42 - k.sunI) / .42));
      if (stars) { stars.material.opacity = night * .95; }
      if (moon) {
        const ang = WX.t * PI * 2 - PI / 2;
        moon.position.set(-Math.cos(ang) * 400, Math.max(.08, Math.sin(ang)) * 400, 400);
        moon.lookAt(0, 0, 0);
        moon.material.opacity = night * .95;
      }
      // el sol desaparece bajo el horizonte (de noche no debe verse el disco)
      if (typeof sun !== 'undefined') { try { sun.visible = sunDir.y > .05; } catch (e) { } }
      // nubes: de noche apenas se intuyen, de dia con volumen
      if (skyG.children[2]) {
        const cl = skyG.children[2];
        const day = Math.max(0, Math.min(1, (k.sunI - .3) / 1.7));
        cl.material.opacity = .07 + .48 * day;
        cl.material.color.setHex(k.sunI > 1.4 ? 0xffffff : (k.sunI > .2 ? 0xc9d6ec : 0x3a4767));
      }
    } catch (e) { }
  };
  try { window.paintSky(); } catch (e) { }
  NC.log('cielo: paletas, horizonte, estrellas y luna listos');
})();
