/* Neon Coast - ambiente: polvo y ceniza de Chatarra Vieja, y sonido de pisadas.
   Se apoya en NC.hooks para no tocar el bucle principal. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const NC = window.NC, T = THREE;
  NC.log('ambiente: polvo de Chatarra Vieja + pisadas');

  // ---------- textura suave (reutiliza el glow si existe) ----------
  const dustTex = (typeof glowT !== 'undefined') ? glowT : (function () {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(220,205,180,.9)'); g.addColorStop(1, 'rgba(220,205,180,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  })();

  // ---------- polvo en suspensión ----------
  const N = 220, pa = new Float32Array(N * 3), pv = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pa[i * 3] = (Math.random() - .5) * 120;
    pa[i * 3 + 1] = Math.random() * 26 + .4;
    pa[i * 3 + 2] = (Math.random() - .5) * 120;
    pv[i * 3] = (Math.random() - .5) * .7;
    pv[i * 3 + 1] = Math.random() * .35 + .05;
    pv[i * 3 + 2] = (Math.random() - .5) * .7;
  }
  const dustG = new T.BufferGeometry();
  dustG.setAttribute('position', new T.BufferAttribute(pa, 3));
  const dustM = new T.PointsMaterial({
    map: dustTex, color: 0xd8c8a8, size: .5, transparent: true,
    opacity: .42, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true
  });
  const dust = new T.Points(dustG, dustM);
  dust.frustumCulled = false; dust.visible = false; scene.add(dust);

  // ---------- brasas lejanas (solo de noche) ----------
  const NE = 60, ea = new Float32Array(NE * 3);
  for (let i = 0; i < NE; i++) { ea[i * 3] = (Math.random() - .5) * 160; ea[i * 3 + 1] = .4 + Math.random() * 3; ea[i * 3 + 2] = (Math.random() - .5) * 160; }
  const embG = new T.BufferGeometry(); embG.setAttribute('position', new T.BufferAttribute(ea, 3));
  const emb = new T.Points(embG, new T.PointsMaterial({ map: dustTex, color: 0xff7a3a, size: .34, transparent: true, opacity: .5, depthWrite: false, blending: T.AdditiveBlending }));
  emb.frustumCulled = false; emb.visible = false; scene.add(emb);

  let inZone = false, t = 0;
  // recoloca el polvo alrededor del jugador al entrar en el barrio
  function seedDust(px, pz) {
    const arr = dustG.attributes.position.array;
    for (let i = 0; i < N; i++) {
      arr[i * 3] = px + (Math.random() - .5) * 120;
      arr[i * 3 + 1] = Math.random() * 26 + .4;
      arr[i * 3 + 2] = pz + (Math.random() - .5) * 120;
    }
    dustG.attributes.position.needsUpdate = true;
  }
  NC.hooks.post.push((dt) => {
    try {
      const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
      const z5 = (typeof zoneOf === 'function') && zoneOf(px, pz) === 5;
      if (z5 !== inZone) {
        inZone = z5; dust.visible = z5;
        if (z5) {
          seedDust(px, pz);
          if (!window._ncDustToast) {
            window._ncDustToast = 1;
            try { toast('Chatarra Vieja · polvo y óxido en el aire'); } catch (e) { }
          }
        }
      }
      if (!z5) { emb.visible = false; return; }
      dt = Math.min(.05, dt || .016);
      t += dt;
      const arr = dustG.attributes.position.array;
      for (let i = 0; i < N; i++) {
        arr[i * 3] += (pv[i * 3] + Math.sin(t * .7 + i) * .25) * dt;
        arr[i * 3 + 1] += pv[i * 3 + 1] * dt;
        arr[i * 3 + 2] += (pv[i * 3 + 2] + Math.cos(t * .6 + i * 1.3) * .25) * dt;
        // reciclar alrededor del jugador
        if (arr[i * 3] > px + 60) arr[i * 3] -= 120;
        if (arr[i * 3] < px - 60) arr[i * 3] += 120;
        if (arr[i * 3 + 2] > pz + 60) arr[i * 3 + 2] -= 120;
        if (arr[i * 3 + 2] < pz - 60) arr[i * 3 + 2] += 120;
        if (arr[i * 3 + 1] > 28) { arr[i * 3 + 1] = .4; arr[i * 3] = px + (Math.random() - .5) * 120; arr[i * 3 + 2] = pz + (Math.random() - .5) * 120; }
      }
      dustG.attributes.position.needsUpdate = true;
      // brasas: noche o lluvia
      const night = (typeof WX !== 'undefined') && (WX.t > .78 || WX.t < .2);
      emb.visible = !!night;
      if (night) {
        const e2 = embG.attributes.position.array;
        for (let i = 0; i < NE; i++) {
          e2[i * 3 + 1] += dt * (1.2 + (i % 5) * .3);
          e2[i * 3] += Math.sin(t * 1.3 + i) * dt * .8;
          if (e2[i * 3 + 1] > 16 || Math.abs(e2[i * 3] - px) > 80 || Math.abs(e2[i * 3 + 2] - pz) > 80) {
            e2[i * 3] = px + (Math.random() - .5) * 140;
            e2[i * 3 + 1] = .4;
            e2[i * 3 + 2] = pz + (Math.random() - .5) * 140;
          }
        }
        embG.attributes.position.needsUpdate = true;
      }
    } catch (e) { }
  });

  // ---------- pisadas ----------
  let lastStep = 0;
  NC.hooks.post.push(() => {
    try {
      if (!running || paused || inv.open || mapBig) return;
      if (!P.foot || P.dying || P.busted) return;
      const sp = Math.hypot(P.fvx || 0, P.fvz || 0);
      if (sp < .7) return;
      const now = performance.now();
      const gap = sp > 6 ? 300 : 430;
      if (now - lastStep < gap) return;
      lastStep = now;
      if (window.NC && NC.Audio && NC.Audio.step) NC.Audio.step(sp > 6);
    } catch (e) { }
  });

  NC.log('ambiente: listo');
})();
