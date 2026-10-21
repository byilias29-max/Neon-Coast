/* Neon Coast - navegación compartida: convenciones del mundo, destino, ruta y puntos de interés.
   Es la ÚNICA fuente de datos del minimapa y del mapa grande (map.js). No dibuja nada.

   CONVENCIONES DEL MUNDO (las que ya usan la brújula, los barrios y las misiones):
     x  : + = ESTE      (la playa y el mar están en x > EXT)
     z  : + = SUR       (norte = -z; "Puerto Viejo" está en z<0 y "Fleming Sur" en z>0)
     th : rumbo, delante = (sin th, cos th). th = 0 mira al sur (la brújula marca "S").
   Una proyección es una matriz afín [a,b,c,d,e,f] con el mismo orden que ctx.setTransform:
     sx = a·x + c·z + e      sy = b·x + d·z + f
   Dibujar y convertir clics usan SIEMPRE la misma matriz (y su inversa calculada, no a mano),
   así que no pueden desincronizarse. */
(function () {
  'use strict';
  if (!window.NC || window.NC.Nav) return;
  const NC = window.NC;

  // ---------------------------------------------------------------- 1. proyecciones
  const Proj = {
    // mapa grande: NORTE ARRIBA, este a la derecha, sin espejo (vista desde arriba).
    north(cx, cz, k, w, h) { return [k, 0, 0, k, w / 2 - k * cx, h / 2 - k * cz]; },
    // minimapa: RUMBO ARRIBA (lo que tienes delante queda arriba), sin espejo.
    heading(px, pz, th, k, w, h) {
      const c = Math.cos(th), s = Math.sin(th);
      const a = -c * k, b = -s * k, cc = s * k, d = -c * k;
      return [a, b, cc, d, w / 2 - (a * px + cc * pz), h / 2 - (b * px + d * pz)];
    },
    apply(m, x, z) { return [m[0] * x + m[2] * z + m[4], m[1] * x + m[3] * z + m[5]]; },
    invert(m) {
      const a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], det = a * d - b * c;
      return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
    }
  };

  // ---------------------------------------------------------------- 2. posición del jugador
  const playerPos = () => (P.foot ? { x: P.fx, z: P.fz } : { x: P.x, z: P.z });
  const playerHeading = () => (P.foot ? cam.yaw : P.th);       // hacia donde mira la cámara
  const zoneName = (x, z) => { try { return NC.sto && NC.sto.zone ? NC.sto.zone(x, z) : ''; } catch (e) { return ''; } };

  // ---------------------------------------------------------------- 3. ruta (sobre la retícula de calles)
  const lat = v => Math.max(-H, Math.min(H, Math.round(v / CELL)));
  const clampE = v => Math.max(-EXT, Math.min(EXT, v));
  function snap(x, z) {
    const ix = lat(x), jz = lat(z), a = Math.abs(x - ix * CELL), b = Math.abs(z - jz * CELL);
    return a < b ? { x: ix * CELL, z: clampE(z) } : { x: clampE(x), z: jz * CELL };
  }
  // misma lógica que rebuildRoute() de las misiones, pero para cualquier par de puntos
  function routePts(px, pz, tx, tz) {
    const s1 = snap(px, pz), t1 = snap(tx, tz), si = lat(s1.x), sj = lat(s1.z), ti = lat(t1.x), tj = lat(t1.z);
    return [[px, pz], [s1.x, s1.z], [si * CELL, sj * CELL], [ti * CELL, sj * CELL], [ti * CELL, tj * CELL], [t1.x, t1.z], [tx, tz]];
  }
  const routeLen = pts => { let L = 0; for (let i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return L; };

  // ---------------------------------------------------------------- 4. categorías de lugares
  // shape: círculo, cuadrado, rombo, casa, cruz, estrella, triángulo, hexágono, anillo
  const CATS = [
    { id: 'home',     n: 'Casa del jugador',        col: '#ffd24a', shape: 'house',    g: '' },
    { id: 'shop',     n: 'Tiendas y kioscos',       col: '#3dff9a', shape: 'circle',   g: '$' },
    { id: 'arms',     n: 'Armería',                 col: '#ff4a4a', shape: 'diamond',  g: '' },
    { id: 'garage',   n: 'Talleres y recambios',    col: '#cfd6e2', shape: 'hex',      g: 'T' },
    { id: 'carshop',  n: 'Concesionarios',          col: '#ff8a3a', shape: 'square',   g: 'C' },
    { id: 'health',   n: 'Clínica y farmacias',     col: '#ff3b58', shape: 'cross',    g: '' },
    { id: 'hotel',    n: 'Hoteles',                 col: '#27e6ff', shape: 'square',   g: 'H' },
    { id: 'bar',      n: 'Bares',                   col: '#f5a524', shape: 'tri',      g: '' },
    { id: 'night',    n: 'Club y ocio nocturno',    col: '#ff5aef', shape: 'star',     g: '' },
    { id: 'landmark', n: 'Parques y lugares',       col: '#9fe0ff', shape: 'ring',     g: '' },
    { id: 'contact',  n: 'Personajes',              col: '#c8a2ff', shape: 'circle',   g: '!' },
    { id: 'story',    n: 'Historia',                col: '#ffd24a', shape: 'star',     g: '' },
    { id: 'event',    n: 'Eventos del barrio',      col: '#ff5a7a', shape: 'diamond',  g: '' },
    { id: 'mission',  n: 'Objetivo de misión',      col: '#27e6ff', shape: 'star',     g: '' }
  ];
  const catById = {}; CATS.forEach(c => catById[c.id] = c);

  // ---------------------------------------------------------------- 5. lugares descubiertos (exploración)
  // Los lugares con discover:true no salen en el mapa hasta que el jugador pasa cerca (o la historia los revela).
  const SEEN_KEY = 'ncMapSeen', DISCOVER_R = 90;
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch (e) { seen = {}; }
  const saveSeen = () => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) { } };

  const extra = [];          // lugares registrados por otros módulos: NC.Nav.addPOI({...})
  function addPOI(p) { if (p && p.id && p.cat && isFinite(p.x) && isFinite(p.z)) { const i = extra.findIndex(q => q.id === p.id); if (i >= 0) extra[i] = p; else extra.push(p); } }

  const shopCat = s => {
    const t = (s.type || '');
    if (t === 'Armeria') return 'arms';
    if (t === 'Taller' || t === 'Recambios') return 'garage';
    if (t === 'Farmacia') return 'health';
    return 'shop';
  };

  // posición inicial del campo de fútbol (el balón se mueve; el campo no)
  const FIELD = (typeof ball !== 'undefined') ? { x: ball.x, z: ball.z } : null;

  // ---------------------------------------------------------------- 6. registro de puntos de interés (datos REALES del mundo)
  let poiCache = [], poiT = -1e9;     // -1e9: la primera consulta SIEMPRE construye la lista
  function buildPOIs() {
    const out = [];
    const add = (id, cat, name, x, z, sub, extraProps) => { if (isFinite(x) && isFinite(z)) out.push(Object.assign({ id, cat, name, x, z, sub: sub || '' }, extraProps || {})); };

    try { if (window.NCH) add('home', 'home', P.apt ? 'Tu casa' : 'Apartamento en venta', NCH.x, NCH.z, P.apt ? 'Dormir · armario · guardar' : '$3000 · se compra en la puerta'); } catch (e) { }
    try { shops.forEach((s, i) => add('shop' + i, shopCat(s), s.name || 'Tienda', s.x, s.z, s.type || '')); } catch (e) { }
    try { carShops.forEach((s, i) => add('car' + i, 'carshop', s.name || 'Concesionario', s.x, s.z, 'Pintura · blindaje · motor · turbo')); } catch (e) { }
    try { hotels.forEach((h, i) => add('hotel' + i, 'hotel', h.name || 'Hotel', h.x, h.z, 'Dormir $30')); } catch (e) { }
    try { bars.forEach((b, i) => add('bar' + i, 'bar', 'Bar de noche', b.x, b.z, '')); } catch (e) { }
    try { add('clinic', 'health', 'Clínica David', CLINIC.x, CLINIC.z, 'Consulta médica $40'); } catch (e) { }
    try { doors.forEach((d, i) => { if (d.label === 'Club Neón') add('door' + i, 'night', 'Club Neón', d.x, d.z, 'Entrada · DJ'); }); } catch (e) { }
    try { add('park', 'landmark', 'Parque central', park.x, park.z, ''); } catch (e) { }
    try { add('pier', 'landmark', 'Muelle del este', 445, 204, 'Pasarela sobre el mar'); } catch (e) { }
    try { if (window.VILLAS) VILLAS.slice(0, 6).forEach((v, i) => add('villa' + i, 'landmark', 'Villa de Colina Mar', v[0], v[1], 'Chalet de la zona este')); } catch (e) { }
    try { if (window.FACTORY) add('factory', 'landmark', 'Nave abandonada', FACTORY.x, FACTORY.z, 'Nave en ruinas de Chatarra Vieja'); } catch (e) { }
    try { if (FIELD) add('field', 'landmark', 'Campo de fútbol', FIELD.x, FIELD.z, 'Chuta el balón (E)'); } catch (e) { }

    // historia: personajes y lugares que el propio story.js considera visibles / descubribles
    try {
      if (NC.sto && NC.sto.actors) NC.sto.actors().forEach(a => add('actor_' + a.id, 'contact', a.n, a.x, a.z, a.job));
      if (NC.sto && NC.sto.places) NC.sto.places().forEach(a => add('place_' + a.id, 'landmark', a.n, a.x, a.z, a.sub, { discover: !!a.discover }));
      if (NC.sto && NC.sto.pins) NC.sto.pins.forEach((p, i) => { if (!p.hide) add('pin' + i, p.name && /mercad|apag|evento/i.test(p.name) ? 'event' : 'story', p.name || 'Historia', p.x, p.z, p.name ? '' : 'Objetivo de la historia', { pulse: !!p.pulse }); });
    } catch (e) { }

    // misión activa (solo el paso actual: no se destripan los siguientes)
    try {
      if (typeof tgt !== 'undefined' && tgt.on) {
        let st = ''; try { st = curM().s[mis.s].t; } catch (e) { }
        add('mission', 'mission', 'Misión: ' + (curM().n || ''), tgt.x, tgt.z, st, { pulse: true });
      }
    } catch (e) { }

    extra.forEach(p => out.push(p));

    // descubrimiento por cercanía
    const pp = playerPos();
    for (const p of out) {
      if (!p.discover) continue;
      if (!seen[p.id] && Math.hypot(p.x - pp.x, p.z - pp.z) < DISCOVER_R) { seen[p.id] = 1; saveSeen(); }
      p.hide = !seen[p.id];
    }
    return out.filter(p => !p.hide);
  }
  function pois(force) {
    const now = performance.now();
    if (force || now - poiT > 450) { poiCache = buildPOIs(); poiT = now; }
    return poiCache;
  }

  // ---------------------------------------------------------------- 7. destino (marca) compartido
  function dest() { try { return typeof wp !== 'undefined' ? wp : null; } catch (e) { return null; } }
  function setDest(x, z, meta) {
    meta = meta || {};
    const d = { x, z, label: meta.label || 'Marca', kind: meta.kind || 'pin', poiId: meta.id || null };
    wp = d;                                              // `wp` lo lee el bucle principal (HUD, baliza y llegada)
    try { wpBeacon.position.set(d.x, 30, d.z); wpBeacon.visible = true; } catch (e) { }
    try { $('wp').style.display = 'block'; } catch (e) { }
    try { beep(700, .08); } catch (e) { }
    refreshRoute(true);
    return d;
  }
  function clearDest() {
    if (!dest()) return;
    wp = null;
    try { wpBeacon.visible = false; $('wp').style.display = 'none'; } catch (e) { }
    route.pts = []; route.len = 0;
  }

  // ruta del destino (cacheada: se recalcula al moverse, no cada cuadro)
  const route = { pts: [], len: 0, t: 0, key: '' };
  function refreshRoute(force) {
    const d = dest();
    if (!d) { route.pts = []; route.len = 0; route.key = ''; return route; }
    const pp = playerPos(), key = Math.round(pp.x / 4) + ',' + Math.round(pp.z / 4) + '|' + d.x.toFixed(1) + ',' + d.z.toFixed(1);
    if (!force && key === route.key) return route;
    route.key = key;
    route.pts = routePts(pp.x, pp.z, d.x, d.z);
    route.len = routeLen(route.pts);
    return route;
  }
  function info() {
    const d = dest(); if (!d) return null;
    const pp = playerPos(), r = refreshRoute(), straight = Math.hypot(d.x - pp.x, d.z - pp.z);
    const v = P.foot ? 5 : 14;                            // m/s típicos a pie / en coche
    return { dest: d, straight, route: r.len, eta: r.len / v, zone: zoneName(d.x, d.z) };
  }

  // texto del HUD de la marca (el bucle principal escribe uno básico; aquí lo completamos)
  NC.hooks.post.push(function () {
    try {
      if (!running || frame % 6) return;
      const i = info(); if (!i) return;
      const el = $('wp');
      el.textContent = (i.dest.label && i.dest.label !== 'Marca' ? i.dest.label + ' · ' : 'Marca · ') + Math.round(i.route) + ' m por ruta · ~' + Math.max(1, Math.round(i.eta)) + ' s · X quitar';
    } catch (e) { }
  });

  NC.Nav = { version: 1, Proj, CATS, catById, routePts, routeLen, snap, pois, addPOI, dest, setDest, clearDest, route: refreshRoute, info, playerPos, playerHeading, zoneName };
  NC.log('nav listo · norte=-z, este=+x · ' + CATS.length + ' categorias de lugares');
})();
