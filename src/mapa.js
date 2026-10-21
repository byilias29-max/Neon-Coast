/* Neon Coast - minimapa e interfaz:
   - registra el mapa grande (#nbm) para que el cursor personalizado NO desaparezca
   - la tecla V amplía/reduce el minimapa (M abre el mapa grande, que vive en src/map.js)
   - icono del coche del jugador en el minimapa y en el mapa grande
   - el contenedor del minimapa crece con el canvas (sin recortarlo)                */
(function () {
  'use strict';
  if (!window.NC) return;
  const NC = window.NC;

  // ---------- 1) el cursor personalizado vive mientras haya interfaz ----------
  try {
    if (NC.ui) {
      const ids = ['nbm', 'nbView', 'nbSideBox', 'shopUI', 'inv', 'pause', 'dlg', 'mDlg', 'mKey', 'mNote', 'gDlg', 'wheelUI', 'rwheel', 'phone', 'msgs', 'terminal'];
      ids.forEach(id => { const el = document.getElementById(id); if (el) NC.ui.register(el); });
    }
  } catch (e) { }
  // si el mapa se crea despues, lo registramos cuando aparezca
  try {
    if (NC.ui) {
      const mo = new MutationObserver(() => {
        const el = document.getElementById('nbm'); if (el) NC.ui.register(el);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  } catch (e) { }

  // ---------- 2) V amplía el minimapa; el mapa completo se abre con M ----------
  const MINI = { grande: false, sz: 150, k: .5, szB: 230, kB: .42 };
  function aplicarMini() {
    try {
      if (NC.Nav && NC.Nav.setMini) NC.Nav.setMini(MINI.grande ? MINI.szB : MINI.sz, MINI.grande ? MINI.kB : MINI.k);
      const w = document.getElementById('mmw');
      if (w) {
        // el contenedor debe seguir al lienzo (si se deja en auto crece con el tamano
        // intrinseco del canvas y acaba cubriendo la pantalla)
        const s = (MINI.grande ? MINI.szB : MINI.sz) + 'px';
        w.style.width = s; w.style.height = s;
        w.classList.toggle('mmbig', MINI.grande);
      }
    } catch (e) { }
  }
  function mapaAbierto() {
    const el = document.getElementById('nbm');
    return !!(el && el.style.display === 'flex');
  }
  function toggleMini() {
    MINI.grande = !MINI.grande;
    aplicarMini();
    try { toast(MINI.grande ? 'Minimapa ampliado' : 'Minimapa normal'); } catch (e) { }
  }
  // con el mapa grande abierto, M lo cierra (se adelanta al listener del juego).
  // si esta cerrado M deja pasar la tecla: el juego abre el mapa grande.
  document.addEventListener('keydown', e => {
    if (e.code !== 'KeyM' || e.repeat) return;
    if (!mapaAbierto()) return;
    try { window.toggleMap(false); } catch (e2) { }
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  // el minimapa ampliado no es interactivo ni mueve el mapa grande
  NC.mini = { toggle: toggleMini, get grande() { return MINI.grande; } };

  // ---------- 3) icono del coche en el minimapa ----------
  function estadoCoche() {
    try {
      const c = (P && P.car && P.car.position) ? P.car : (typeof car !== 'undefined' && car && car.position ? car : null);
      if (!c) return null;
      let th = c.rotation ? c.rotation.y : 0;
      try { if (P && !P.foot && typeof P.th === 'number') th = P.th; } catch (e) { }
      return { x: c.position.x, z: c.position.z, th };
    } catch (e) { return null; }
  }
  function dibujarCoche(ctx, m, dpr, size) {
    const c = estadoCoche(); if (!c || !m) return;
    const sx = m[0] * c.x + m[2] * c.z + m[4];
    const sy = m[1] * c.x + m[3] * c.z + m[5];
    const C = size / 2, R = Math.hypot(sx - C, sy - C);
    if (R > C - 6) return;                       // fuera de la vista
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(sx, sy);
    ctx.rotate(c.th - (typeof P !== 'undefined' && P.foot ? (cam.yaw || 0) : (P.th || 0)) + (typeof cam !== 'undefined' ? (cam.yaw || 0) : 0) * 0);
    ctx.fillStyle = 'rgba(8,8,14,.85)';
    ctx.beginPath(); ctx.arc(0, 0, size / 22, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.moveTo(0, -size / 26); ctx.lineTo(size / 30, size / 26); ctx.lineTo(0, size / 40); ctx.lineTo(-size / 30, size / 26);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const _mini = window.mini;
  if (typeof _mini === 'function') {
    window.mini = function (px, pz, th) {
      const r = _mini.apply(this, arguments);
      try {
        const m = NC.Nav && NC.Nav._lastMini, size = (NC.Nav && NC.Nav._lastMiniSize) || 150;
        if (m) {
          const el = document.getElementById('mm'), ctx = el.getContext('2d');
          const dpr = el.width / size;
          dibujarCoche(ctx, m, dpr, size);
        }
      } catch (e) { }
      return r;
    };
  }

  // ---------- 4) icono del coche en el mapa grande ----------
  NC.hooks.post.push(() => {
    try {
      const root = document.getElementById('nbm'); if (!root || root.style.display !== 'flex') return;
      const cv = document.getElementById('nbc'); if (!cv) return;
      const ctx = cv.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // el mapa grande pinta en pixeles de pantalla: recuperamos su ultima matriz
      const m = NC.Nav && NC.Nav._lastBig;
      if (!m) return;
      const c = estadoCoche(); if (!c) return;
      const sx = m[0] * c.x + m[2] * c.z + m[4], sy = m[1] * c.x + m[3] * c.z + m[5];
      ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(8,8,14,.85)';
      ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, 7); ctx.fill();
      ctx.restore();
    } catch (e) { }
  });

  NC.log('minimapa: tecla V amplia, cursor registrado e icono del coche');
})();
