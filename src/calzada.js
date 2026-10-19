/* Neon Coast - calzada: auditoria de ocupaciones, reubicacion lateral de estructuras
   que invaden la calzada (a solar libre con frente a la calle) y bordillos/badenes.
   Se ejecuta DESPUES de construir la ciudad, asi que conoce BLD, boxes, palms, shops... */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;

  // ---------- 1) catalogo de estructuras con su huella real ----------
  const ST = [];
  const push = (o, hw, hd, rec, kind, sel) => { if (o && isFinite(o.x) && isFinite(o.z)) ST.push({ o, hw, hd, rec, kind, sel: sel || 0 }); };
  try { carShops.forEach(s => push({ x: s.x - 5, z: s.z - 9 }, 11, 7, s, 'concesionario', 12)); } catch (e) { }
  try { shops.forEach(s => push({ x: s.x, z: s.z - 7.6 }, 8, 6, s, 'comercio', 8)); } catch (e) { }
  try { bars.forEach(s => push({ x: s.x, z: s.z - 3.4 }, 3.5, 2.5, s, 'bar', 5)); } catch (e) { }
  try { hotels.forEach(s => push({ x: s.x, z: s.z - 10 }, 13, 8, s, 'hotel', 10)); } catch (e) { }
  try { if (window.FACTORY) push({ x: FACTORY.x, z: FACTORY.z }, 15, 12, FACTORY, 'nave', 14); } catch (e) { }

  // ---------- 2) lineas de calzada ----------
  const lines = [];
  for (let k = -H; k <= H; k++) { lines.push({ v: true, p: k * CELL }); lines.push({ v: false, p: k * CELL }); }
  const ROAD = R / 2;            // 8 m de calzada util
  const MARGIN = 0;             // solo cuenta el solape real con la calzada
  // ¿la estructura pisa la calzada? (no basta con acercarse)
  function pisaCalle(o, hw, hd) {
    for (const L of lines) {
      const lim = ROAD + MARGIN;
      if (L.v) { if (Math.abs(o.x - L.p) < lim + hw) return true; }
      else { if (Math.abs(o.z - L.p) < lim + hd) return true; }
    }
    return false;
  }
  function cercaDeCalle(x, z) {   // distancia al eje de calzada mas cercano
    let d = 1e9;
    for (const L of lines) d = Math.min(d, L.v ? Math.abs(x - L.p) : Math.abs(z - L.p));
    return d;
  }
  // ---------- 3) busca un solar libre con frente a la calle ----------
  const CELLS = [];
  for (let i = -H; i < H; i++) for (let j = -H; j < H; j++) CELLS.push({ i, j, cx: (i + .5) * CELL, cz: (j + .5) * CELL });
  function libresCerca(cx, cz, hw, hd, selfBoxes) {
    const out = [];
    for (const c of CELLS) {
      const d = Math.hypot(c.cx - cx, c.cz - cz);
      if (d > 260) continue;
      const near = [];
      for (const b of boxes) {
        if (selfBoxes && selfBoxes.indexOf(b) >= 0) continue;
        if (Math.abs(b.x - c.cx) < 40 && Math.abs(b.z - c.cz) < 40) near.push(b);
      }
      for (let ox = -26; ox <= 26; ox += 2) for (let oz = -26; oz <= 26; oz += 2) {
        const x = c.cx + ox, z = c.cz + oz;
        if (Math.abs(x - c.cx) + hw > B / 2 - 1 || Math.abs(z - c.cz) + hd > B / 2 - 1) continue;  // dentro de la manzana
        if (pisaCalle({ x, z }, hw, hd)) continue;
        let hit = false;
        for (const b of near) {
          if (Math.abs(x - b.x) < b.hw + hw + .4 && Math.abs(z - b.z) < b.hd + hd + .4) { hit = true; break; }
        }
        if (hit) continue;
        // frente: la fachada (+z) mirando a la calzada mas cercana
        const frente = Math.abs(cercaDeCalle(x, z + hd) - 8) < Math.abs(cercaDeCalle(x, z - hd) - 8);
        out.push({ x, z, d, frente, cell: c });
      }
    }
    return out;
  }
  const movidos = [];
  for (const s of ST) {
    if (!pisaCalle(s.o, s.hw, s.hd)) continue;
    const own = boxes.filter(b => Math.abs(b.x - s.o.x) < s.hw + s.sel && Math.abs(b.z - s.o.z) < s.hd + s.sel);
    const cands = libresCerca(s.o.x, s.o.z, s.hw, s.hd, own);
    if (!cands.length) { NC.log('calzada: sin solar libre para ' + s.kind); continue; }
    cands.sort((a, b) => (a.frente === b.frente ? a.d - b.d : (a.frente ? -1 : 1)));
    const best = cands[0];
    const dx = best.x - s.o.x, dz = best.z - s.o.z;
    // mover mallas
    scene.traverse(o => {
      if (!o.position) return;
      const p = o.position;
      if (Math.abs(p.x - s.o.x) < s.hw + s.sel && Math.abs(p.z - s.o.z) < s.hd + s.sel) { p.x += dx; p.z += dz; }
    });
    // mover colisiones propias
    own.forEach(b => { b.x += dx; b.z += dz; });
    // los palmeras que quedarian dentro del edificio se talan
    for (let i = palms.length - 1; i >= 0; i--) {
      const p = palms[i];
      if (Math.abs(p[0] - best.x) < s.hw + 1.5 && Math.abs(p[1] - best.z) < s.hd + 1.5) palms.splice(i, 1);
    }
    if (s.rec) { if (s.rec.x !== undefined) s.rec.x += dx; if (s.rec.z !== undefined) s.rec.z += dz; }
    s.o.x = best.x; s.o.z = best.z;
    movidos.push({ kind: s.kind, from: [s.o.x - dx, s.o.z - dz], to: [best.x, best.z], frente: best.frente });
  }
  if (movidos.length) NC.log('calzada: ' + movidos.length + ' estructuras reubicadas a solares libres', movidos);

  // ---------- 4) bordillo de acera (los visuales ya los pone detail.js: aqui solo badenes) ----------
  try {
    const bumps = [];
    const bx = (w, h, d, x, y, z) => new T.BoxGeometry(w, h, d).translate(x, y, z);
    for (let k = -H; k <= H; k++) for (let j = -H; j <= H; j++) {
      if (((k + j) & 1) !== 0) continue;
      for (const sx of [-1, 1]) bumps.push(bx(2.4, .1, 5.4, k * CELL + sx * (R / 2 + 1.4), .06, j * CELL));
    }
    if (bumps.length) {
      const bm = new T.Mesh(merge(bumps), new T.MeshStandardMaterial({ color: 0x3a3740, roughness: .8, metalness: .05 }));
      bm.receiveShadow = true; scene.add(bm);
    }
  } catch (e) { NC.log('calzada: badenes', e); }

  NC.road = { movidos, structs: ST };
})();
