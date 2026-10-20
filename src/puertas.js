/* Neon Coast - puertas: sistema unificado de accesos. Los comercios, hoteles y Talleres
   tienen una hoja real que se abre con E (y su colision se actualiza); los locales con
   habitacion propia (apartamento, club) usan un umbral con fundido para que no sea un
   teletransporte visible. Ademas la camara se adapta a los espacios cerrados. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;

  // ---------- materiales ----------
  const M_marco = new T.MeshStandardMaterial({ color: 0x3a3038, roughness: .7, metalness: .15 });
  const M_hoja = new T.MeshStandardMaterial({ color: 0x6b4630, roughness: .62, metalness: .06 });
  const M_cristal = new T.MeshStandardMaterial({ color: 0x9fd8e8, roughness: .07, metalness: .35, transparent: true, opacity: .35 });
  const M_metal = new T.MeshStandardMaterial({ color: 0xc9a13b, roughness: .3, metalness: .9 });

  // ---------- fade de transicion + aviso contextual ----------
  NC.css([
    '#ncFade{position:absolute;inset:0;background:#04030b;opacity:0;pointer-events:none;z-index:10;transition:opacity .38s ease}',
    '#ncPuerta{position:absolute;left:50%;bottom:14%;transform:translateX(-50%);z-index:6;display:none;align-items:center;gap:9px;',
    '  padding:8px 16px;border-radius:22px;background:rgba(12,9,28,.82);border:1px solid rgba(120,200,255,.4);',
    '  font-family:"Segoe UI",system-ui,sans-serif;font-size:13px;color:#eaf3ff;pointer-events:none;box-shadow:0 8px 26px rgba(0,0,0,.5)}',
    '#ncPuerta b{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;',
    '  background:rgba(39,230,255,.16);border:1px solid rgba(39,230,255,.5);color:#27e6ff;font-size:12px;font-weight:800}',
    '#ncPuerta span{opacity:.85}'
  ].join('\n'));
  document.body.insertAdjacentHTML('beforeend',
    '<div id="ncFade"></div><div id="ncPuerta"><b>E</b><span id="ncPuertaTxt">Abrir puerta</span></div>');

  // ---------- volumetricos interiores (para la camara) ----------
  const HAB = [];
  try { HAB.push({ x: EXT + 30, z: 150, w: 16, d: 12, h: 4.5 }); } catch (e) { }
  try { HAB.push({ x: EXT + 30, z: -150, w: 16, d: 12, h: 4.5 }); } catch (e) { }
  try { if (typeof CLINIC !== 'undefined') HAB.push({ x: CLINIC.x, z: CLINIC.z, w: 12, d: 8, h: 3.4 }); } catch (e) { }
  try { shops.forEach(s => HAB.push({ x: s.x, z: s.z - 7.6, w: 15, d: 11, h: 4.6 })); } catch (e) { }
  try { carShops.forEach(s => HAB.push({ x: s.x - 5, z: s.z - 9, w: 20, d: 12, h: 5.6 })); } catch (e) { }
  try { hotels.forEach(s => HAB.push({ x: s.x, z: s.z - 8, w: 24, d: 14, h: 7 })); } catch (e) { }

  // ---------- hoja batible ----------
  function hoja(x, z, ang, w, h) {
    const g = new T.Group();
    const marco = new T.Mesh(new T.BoxGeometry(w + .3, h + .25, .22), M_marco);
    marco.position.set(0, (h + .25) / 2, 0); g.add(marco);
    const hueco = new T.Mesh(new T.BoxGeometry(w, h, .1), M_cristal);
    hueco.position.set(0, h / 2, .02); g.add(hueco);
    const piv = new T.Group();
    piv.position.set(-w / 2, 0, .09);
    const leaf = new T.Mesh(new T.BoxGeometry(w, h, .09), M_hoja);
    leaf.position.set(w / 2, h / 2, 0); piv.add(leaf);
    const barra = new T.Mesh(new T.CylinderGeometry(.035, .035, .3, 8).rotateZ(PI / 2), M_metal);
    barra.position.set(w - .22, h * .45, .09); piv.add(barra);
    g.add(piv);
    g.position.set(x, 0, z); g.rotation.y = ang;
    scene.add(g);
    return { g, piv, w, h, ang, open: 0, target: 0 };
  }

  // ---------- catalogo de puertas ----------
  const PUERTAS = [];
  try {
    shops.forEach((s, i) => {
      const fz = s.z - 7.6 + 6;
      const h = hoja(s.x, fz, 0, 1.5, 2.5);
      h.kind = 'swing'; h.id = 'shop' + i; h.rec = s;
      h.colBox = { x: s.x, z: fz, hw: .75, hd: .12 };
      PUERTAS.push(h);
    });
  } catch (e) { NC.log('puertas: comercios', e); }
  try {
    hotels.forEach((s, i) => {
      const fz = s.z - 10 + 8;
      const h = hoja(s.x, fz, 0, 1.7, 2.9);
      h.kind = 'swing'; h.id = 'hotel' + i; h.rec = s;
      h.colBox = { x: s.x, z: fz, hw: .85, hd: .12 };
      PUERTAS.push(h);
    });
  } catch (e) { NC.log('puertas: hoteles', e); }
  try {
    carShops.forEach((s, i) => {
      const fz = s.z - 9 + 7;
      const h = hoja(s.x - 5, fz, 0, 1.8, 2.9);
      h.kind = 'swing'; h.id = 'car' + i; h.rec = s;
      h.colBox = { x: s.x - 5, z: fz, hw: .9, hd: .12 };
      PUERTAS.push(h);
    });
  } catch (e) { NC.log('puertas: concesionarios', e); }
  try {
    if (typeof doors !== 'undefined') {
      doors.forEach((d, i) => {
        if (/Salir/i.test(d.label || '')) return;
        const h = hoja(d.x, d.z, 0, 1.6, 2.6);
        h.kind = 'portal'; h.id = 'portal' + i; h.rec = d;
        h.to = { x: d.tx, z: d.tz };
        PUERTAS.push(h);
      });
    }
  } catch (e) { NC.log('puertas: portales', e); }

  // colision de la hoja cerrada
  for (const h of PUERTAS) {
    if (h.kind !== 'swing') continue;
    h.collide = true;
    try { boxes.push(h.colBox); } catch (e) { }
  }
  function setCollide(h, on) {
    if (h.kind !== 'swing' || h.collide === on) return;
    h.collide = on;
    const i = boxes.indexOf(h.colBox);
    if (on && i < 0) boxes.push(h.colBox);
    if (!on && i >= 0) boxes.splice(i, 1);
  }

  // ---------- fundido ----------
  function fundido(fn) {
    const el = document.getElementById('ncFade');
    if (!el) { try { fn(); } catch (e) { } return; }
    el.style.opacity = '1';
    setTimeout(() => { try { fn(); } catch (e) { } el.style.opacity = '0'; }, 380);
  }

  // ---------- interaccion ----------
  function nearPuerta() {
    if (!P.foot) return null;
    let best = null, bd = 3.4;
    for (const h of PUERTAS) {
      const d = Math.hypot(h.g.position.x - P.fx, h.g.position.z - P.fz);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }
  const _int = window.interact;
  window.interact = function () {
    try {
      const h = nearPuerta();
      if (h) {
        if (h.kind === 'portal') {
          h.target = h.target ? 0 : 1;
          fundido(() => { P.fx = h.to.x; P.fz = h.to.z; P.fvx = P.fvz = 0; });
          try { beep(320, .12, 'sine', .04); } catch (e) { }
          return;
        }
        const enUmbral = Math.abs(P.fx - h.g.position.x) < 1.4 && Math.abs(P.fz - h.g.position.z) < 2.2;
        if (h.target > .5 && enUmbral) { toast('Apartate del umbral para cerrar'); return; }
        h.target = h.target > .5 ? 0 : 1;
        setCollide(h, h.target < .5);
        try { beep(h.target ? 240 : 320, .1, 'sine', .035); } catch (e) { }
        return;
      }
    } catch (e) { }
    return _int && _int.apply(this, arguments);
  };

  // ---------- animacion + aviso ----------
  NC.hooks.post.push(dt => {
    try {
      const el = document.getElementById('ncPuerta'), txt = document.getElementById('ncPuertaTxt');
      const h = nearPuerta();
      for (const p of PUERTAS) {
        if (Math.abs(p.open - p.target) > .001) {
          p.open += (p.target - p.open) * Math.min(1, dt * 6);
          p.piv.rotation.y = -p.open * 1.55;
        }
      }
      if (h && el) {
        el.style.display = 'flex';
        const abierta = h.target > .5;
        const lab = (h.rec && h.rec.label) ? h.rec.label : '';
        if (h.kind === 'portal') {
          txt.textContent = abierta ? 'Entrar' : (lab ? 'Abrir · ' + lab : 'Abrir puerta');
        } else {
          txt.textContent = abierta ? 'Cerrar puerta' : 'Abrir puerta';
        }
      } else if (el) el.style.display = 'none';
    } catch (e) { }
  });

  // ---------- camara en interiores ----------
  function habitacion(x, z) {
    for (const r of HAB) {
      if (Math.abs(x - r.x) < r.w / 2 - .4 && Math.abs(z - r.z) < r.d / 2 - .4) return r;
    }
    return null;
  }
  NC.hooks.post.push(() => {
    try {
      if (!P.foot) return;
      const r = habitacion(P.fx, P.fz);
      if (!r) return;
      const cp = camera.position;
      const lim = { x: r.w / 2 - .8, z: r.d / 2 - .8 };
      const dx = cp.x - P.fx, dz = cp.z - P.fz, dist = Math.hypot(dx, dz);
      const maxD = 3.1;
      if (dist > maxD) { cp.x = P.fx + dx / dist * maxD; cp.z = P.fz + dz / dist * maxD; }
      cp.x = Math.max(r.x - lim.x, Math.min(r.x + lim.x, cp.x));
      cp.z = Math.max(r.z - lim.z, Math.min(r.z + lim.z, cp.z));
      cp.y = Math.max(1.1, Math.min(r.h - .2, cp.y));
    } catch (e) { }
  });

  NC.puertas = PUERTAS;
  NC.log('puertas: ' + PUERTAS.length + ' accesos con hoja real y camara de interior');
})();
