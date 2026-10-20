/* Neon Coast - muros sueltos: retira las piezas grandes (caras de muro) que han quedado
   descolgadas de cualquier construccion, junto con su colision invisible, y comprueba
   que cada local con acceso tenga su puerta con marco, manilla y apertura con E. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;

  // ---------- 1) cajas de los edificios (para saber que esta "pegado" a algo) ----------
  const AABB = [];
  try { (typeof BLD !== 'undefined') && BLD.forEach(b => AABB.push({ x0: b.x - b.w / 2, x1: b.x + b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2 })); } catch (e) { }
  try { shops.forEach(s => AABB.push({ x0: s.x - 8, x1: s.x + 8, z0: s.z - 13.6, z1: s.z - 1.6 })); } catch (e) { }
  try { hotels.forEach(s => AABB.push({ x0: s.x - 13, x1: s.x + 13, z0: s.z - 18, z1: s.z - 2 })); } catch (e) { }
  try { carShops.forEach(s => AABB.push({ x0: s.x - 15, x1: s.x + 5, z0: s.z - 16, z1: s.z - 2 })); } catch (e) { }
  try { bars.forEach(s => AABB.push({ x0: s.x - 3.5, x1: s.x + 3.5, z0: s.z - 4.5, z1: s.z + 0.5 })); } catch (e) { }
  try { if (window.FACTORY) AABB.push({ x0: FACTORY.x - 15, x1: FACTORY.x + 15, z0: FACTORY.z - 12, z1: FACTORY.z + 12 }); } catch (e) { }
  const pegado = (x, z, m) => {
    for (const a of AABB) if (x > a.x0 - m && x < a.x1 + m && z > a.z0 - m && z < a.z1 + m) return true;
    return false;
  };

  // ---------- 2) retirar las caras sueltas ----------
  let quitados = 0, centros = [];
  const v = new T.Vector3(), a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  scene.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    if (o.isInstancedMesh) return;
    const geo = o.geometry, p = geo.attributes.position;
    if (!geo.index) return;                                   // solo las mallas fusionadas
    const idx = geo.index.array;
    const keep = [];
    let local = 0;
    for (let t = 0; t < idx.length; t += 3) {
      const i0 = idx[t], i1 = idx[t + 1], i2 = idx[t + 2];
      a.fromBufferAttribute(p, i0); b.fromBufferAttribute(p, i1); c.fromBufferAttribute(p, i2);
      // area aproximada en el plano XZ (caras verticales)
      const abx = b.x - a.x, abz = b.z - a.z, acx = c.x - a.x, acz = c.z - a.z;
      const area = Math.abs(abx * acz - acx * abz) / 2;
      const cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3;
      const ymin = Math.min(a.y, b.y, c.y), ymax = Math.max(a.y, b.y, c.y);
      // "muro suelto": cara grande, vertical, apoyada en el suelo, de al menos 1 m de alto
      // y a mas de 2,2 m de cualquier construccion (marquesinas, toldos, vallas y bancos se conservan)
      const suelta = area > .5 && ymin < .6 && ymax > 1.0 && (ymax - ymin) > .8 && !pegado(cx, cz, 2.2);
      if (suelta) { local++; if (centros.length < 40) centros.push([+cx.toFixed(1), +((ymin + ymax) / 2).toFixed(1), +cz.toFixed(1)]); }
      else { keep.push(i0, i1, i2); }
    }
    if (local > 4 && local < 150) {          // red de seguridad: nunca mas de 150 caras por malla
      geo.setIndex(keep);
      geo.attributes.position.needsUpdate = true;
      geo.computeBoundingSphere && geo.computeBoundingSphere();
      quitados += local;
    }
  });

  // ---------- 3) retirar la colision invisible de esos puntos ----------
  let colRetiradas = 0;
  try {
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (b.hw < .3 && b.hd < .3) continue;                    // postes y macetas: se dejan
      if (pegado(b.x, b.z, 1.2)) continue;                    // pegado a un edificio: se deja
      // suelta y cerca de donde hemos quitado geometria
      for (const c of centros) {
        if (Math.abs(b.x - c[0]) < 3.2 && Math.abs(b.z - c[2]) < 3.2) { boxes.splice(i, 1); colRetiradas++; break; }
      }
    }
  } catch (e) { }

  // ---------- 4) puertas que faltan: hoteles y bares ----------
  try {
    if (window.NC && NC.puertas) {
      const P = NC.puertas;
      const yaEsta = id => P.some(p => p.id === id);
      const marco = new T.MeshStandardMaterial({ color: 0x3a3038, roughness: .7, metalness: .15 });
      const hojaM = new T.MeshStandardMaterial({ color: 0x6b4630, roughness: .62, metalness: .06 });
      const cristal = new T.MeshStandardMaterial({ color: 0x9fd8e8, roughness: .07, metalness: .35, transparent: true, opacity: .35 });
      const laton = new T.MeshStandardMaterial({ color: 0xc9a13b, roughness: .3, metalness: .9 });
      function crearPuerta(x, z, ang, w, h) {
        const g = new T.Group();
        const m = new T.Mesh(new T.BoxGeometry(w + .3, h + .25, .22), marco); m.position.set(0, (h + .25) / 2, 0); g.add(m);
        const hc = new T.Mesh(new T.BoxGeometry(w, h, .1), cristal); hc.position.set(0, h / 2, .02); g.add(hc);
        const piv = new T.Group(); piv.position.set(-w / 2, 0, .09);
        const lf = new T.Mesh(new T.BoxGeometry(w, h, .09), hojaM); lf.position.set(w / 2, h / 2, 0); piv.add(lf);
        const barra = new T.Mesh(new T.CylinderGeometry(.035, .035, .3, 8).rotateZ(PI / 2), laton);
        barra.position.set(w - .22, h * .45, .09); piv.add(barra);
        g.add(piv);
        g.position.set(x, 0, z); g.rotation.y = ang; scene.add(g);
        return { g, piv, w, h, ang, open: 0, target: 0, kind: 'swing', rec: { label: 'Puerta' } };
      }
      hotels.forEach((s, i) => {
        if (yaEsta('hotel' + i)) return;
        const fz = s.z - 10 + 8;
        const p = crearPuerta(s.x, fz, 0, 1.7, 2.9);
        p.id = 'hotel' + i; p.colBox = { x: s.x, z: fz, hw: .85, hd: .12 }; p.collide = true;
        boxes.push(p.colBox); P.push(p);
      });
      bars.forEach((s, i) => {
        if (yaEsta('bar' + i)) return;
        const fz = s.z - 3.4 + 2.5;
        const p = crearPuerta(s.x, fz, 0, 1.4, 2.4);
        p.id = 'bar' + i; p.colBox = { x: s.x, z: fz, hw: .7, hd: .12 }; p.collide = true;
        boxes.push(p.colBox); P.push(p);
      });
    }
  } catch (e) { NC.log('muros: puertas nuevas', e); }

  NC.log('muros: ' + quitados + ' caras sueltas retiradas y ' + colRetiradas + ' colisiones invisibles eliminadas');
})();
