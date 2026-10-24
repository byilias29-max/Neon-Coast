/* Neon Coast - acciones de interior: mostrador de tienda, mesa de ventas del
   concesionario, barra del Club Neon y caja fuerte del almacen.
   Todo se engancha con NC.hooks y envolviendo interact(); no toca el bucle. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const NC = window.NC, T = THREE;
  NC.hooks = NC.hooks || { pre: [], post: [] };
  NC.log('interior: acciones de mostrador, barra y caja fuerte');

  // ---------- estado ----------
  let lootAt = -1e9, safe = null, safeLed = null, barCd = 0, shopCd = 0;
  const SAFE_R = 2.4;

  // ---------- caja fuerte del almacen (oficina de la nave) ----------
  try {
    if (typeof FACTORY !== 'undefined' && FACTORY) {
      const X = FACTORY.x, Z = FACTORY.z;
      const g = new T.Group();
      const body = new T.Mesh(new T.BoxGeometry(.66, .52, .54),
        new T.MeshStandardMaterial({ color: 0x3a4049, roughness: .32, metalness: .82 }));
      body.castShadow = body.receiveShadow = true; g.add(body);
      const door = new T.Mesh(new T.BoxGeometry(.58, .44, .05),
        new T.MeshStandardMaterial({ color: 0x555d68, roughness: .22, metalness: .9 }));
      door.position.set(0, 0, .29); g.add(door);
      const dial = new T.Mesh(new T.CylinderGeometry(.115, .115, .035, 18),
        new T.MeshStandardMaterial({ color: 0xc9a13b, roughness: .25, metalness: .95 }));
      dial.rotation.x = PI / 2; dial.position.set(0, 0, .33); g.add(dial);
      const handle = new T.Mesh(new T.BoxGeometry(.05, .26, .05),
        new T.MeshStandardMaterial({ color: 0xc9a13b, roughness: .3, metalness: .95 }));
      handle.position.set(.2, 0, .34); g.add(handle);
      safeLed = new T.Mesh(new T.SphereGeometry(.038, 10, 8), new T.MeshBasicMaterial({ color: 0x3dff9a }));
      safeLed.position.set(-.21, .16, .33); g.add(safeLed);
      g.position.set(X + 12.6, 1.52, Z - 9.6);
      g.rotation.y = -.18;
      scene.add(g);
      safe = { g, x: X + 12.4, z: Z - 8.25 };
    }
  } catch (e) { NC.log('interior: caja fuerte', e); safe = null; }

  // ---------- helpers ----------
  const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  const px = () => P.foot ? P.fx : P.x;
  const pz = () => P.foot ? P.fz : P.z;

  function shopMenuOpen() {
    try {
      const el = document.getElementById('shopUI');
      return !!(el && el.classList.contains('on'));
    } catch (e) { return false; }
  }

  function abrirMenu(kind, rec) {
    if (shopMenuOpen()) return true;
    try {
      if (NC.tienda && NC.tienda.open) return NC.tienda.open(kind, rec) !== false;
    } catch (e) { NC.log('interior: menu', e); }
    return false;
  }

  // ---------- puntos de interaccion ----------
  function enMostradorTienda() {
    if (typeof shops === 'undefined' || !P.foot) return null;
    for (const s of shops) {
      // delante de la caja registradora, dentro del local
      if (d2(P.fx, P.fz, s.x + 4.9, s.z - 7.35) < 2.7) return s;
    }
    return null;
  }

  function enMesaConcesionario() {
    if (typeof carShops === 'undefined' || !P.foot) return null;
    for (const s of carShops) {
      // mostrador de ventas del pabellon: (s.x-1.4, s.z-3.8)
      if (d2(P.fx, P.fz, s.x - 1.4, s.z - 3.8) < 2.5) return s;
    }
    return null;
  }

  const BAR = { x: (typeof EXT !== 'undefined' ? EXT : 0) + 31, z: -150.7 };
  function enBarraClub() {
    if (!P.foot) return false;
    if (typeof EXT === 'undefined') return false;
    return d2(P.fx, P.fz, BAR.x, BAR.z) < 2.5;
  }

  function enCajaFuerte() {
    if (!safe || !P.foot) return false;
    return d2(P.fx, P.fz, safe.x, safe.z) < SAFE_R;
  }

  // ---------- capa de interaccion ----------
  const _it = window.interact;
  window.interact = function () {
    try {
      if (!running || paused || P.dying || P.busted || !P.foot) return _it && _it.apply(this, arguments);
      if (shopMenuOpen()) return;

      // caja fuerte del almacen
      if (enCajaFuerte()) {
        const now = performance.now();
        if (now - lootAt < 150000) {
          try { toast('La caja fuerte está vacía · vuelve más tarde'); } catch (e) { }
          return;
        }
        lootAt = now;
        const botin = 800 + Math.floor(Math.random() * 500);
        money += botin;
        P.lootWare = (P.lootWare || 0) + 1;
        if (safeLed) safeLed.material.color.setHex(0xff3a4a);
        try { crime(1.4, 'robo'); } catch (e) { }
        try { pop('BOTÍN +$' + botin); } catch (e) { }
        try { toast('Caja fuerte abierta · +$' + botin + ' · la poli ya viene'); } catch (e) { }
        try { beep(180, .12, 'square', .05); setTimeout(() => beep(280, .16, 'square', .04), 120); } catch (e) { }
        return;
      }

      // barra del club: copa de la casa
      if (enBarraClub() && barCd <= 0) {
        if (money < 15) { try { toast('La copa cuesta $15'); } catch (e) { } return; }
        barCd = 3.5;
        money -= 15;
        P.hp = Math.min(100, P.hp + 18);
        P.drunk = Math.max(P.drunk || 0, 26);
        try { toast('Neón Azul · $15 · +salud y un mareo elegante'); } catch (e) { }
        try { beep(660, .09, 'sine', .035); setTimeout(() => beep(880, .12, 'sine', .03), 90); } catch (e) { }
        return;
      }

      // mesa de ventas del concesionario: menu de coches desde dentro
      const cs = enMesaConcesionario();
      if (cs) {
        if (abrirMenu('car', cs)) return;
      }

      // mostrador de tienda: si vas desarmado, atiende el dependiente
      const st = enMostradorTienda();
      if (st && P.w == 0) {
        if (abrirMenu('shop', st)) return;
      }
    } catch (e) { NC.log('interior interact', e); }
    return _it && _it.apply(this, arguments);
  };

  // ---------- enfriamientos y LED de la caja ----------
  NC.hooks.post.push((dt) => {
    try {
      if (barCd > 0) barCd = Math.max(0, barCd - (dt || .016));
      if (shopCd > 0) shopCd = Math.max(0, shopCd - (dt || .016));
      if (safeLed) {
        const listo = (performance.now() - lootAt) >= 150000;
        safeLed.material.color.setHex(listo ? 0x3dff9a : 0xff3a4a);
      }
    } catch (e) { }
  });

  NC.interior = {
    get cajaFuerte() { return safe; },
    get botinListo() { return (performance.now() - lootAt) >= 150000; },
    get barra() { return BAR; }
  };
  NC.log('interior: listo (mostrador, concesionario, barra y caja fuerte)');
})();
