/* Neon Coast - limpieza: pase de sanitation que deja el mundo "montado".
   1) retira o aparta las piezas de madera sueltas que quedaron clavadas en la calzada
   2) apoya en el suelo lo que flota por encima de la acera
   3) comprueba que ninguna construccion atraviese el asfalto                        */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;
  const MADERA = ['6b4a32', '6a4a32', '5a4232', '7a5c3a', '8a6a3a', '7c5230', '5a4034'];

  const box = new T.Box3();
  const enCalzada = (x, z) => {
    for (let k = -H; k <= H; k++) {
      if (Math.abs(x - k * CELL) < R / 2 + 1.2) return true;
      if (Math.abs(z - k * CELL) < R / 2 + 1.2) return true;
    }
    return false;
  };
  // empuja un punto hasta la acera mas cercana (perpendicular a la calzada)
  function aAcera(x, z, half) {
    let best = null, bd = 1e9;
    for (let k = -H; k <= H; k++) {
      const dx = Math.abs(x - k * CELL), dz = Math.abs(z - k * CELL);
      if (dx < bd) { bd = dx; best = { axis: 'x', p: k * CELL, d: x - k * CELL }; }
      if (dz < bd) { bd = dz; best = { axis: 'z', p: k * CELL, d: z - k * CELL }; }
    }
    if (!best) return { x, z };
    const off = R / 2 + 2.6 + (half || 0);
    if (best.axis === 'x') return { x: best.p + (best.d >= 0 ? off : -off), z };
    return { x, z: best.p + (best.d >= 0 ? off : -off) };
  }

  let movidos = 0, apoyados = 0;
  try { scene.updateMatrixWorld(true); } catch (e) { }   // las matrices del mundo aun estan sin actualizar al cargar
  scene.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.material || !o.material.color) return;
    const hex = o.material.color.getHexString();
    if (!MADERA.includes(hex)) return;
    if (o.isInstancedMesh) return;                 // las instanciadas se colocaron bien
    try { box.setFromObject(o); } catch (e) { return; }
    const sx = box.max.x - box.min.x, sy = box.max.y - box.min.y, sz = box.max.z - box.min.z;
    if (Math.max(sx, sy, sz) > 40) return;        // nave, muelle o cosa mayor
    const c = box.getCenter(new T.Vector3());
    // 1) madera que pisa la calzada (se comprueba vertex a vertex, no solo el centro)
    let pisa = enCalzada(c.x, c.z);
    if (!pisa) {
      const pp = o.geometry.attributes.position, m = o.matrixWorld.elements;
      for (let i = 0; i < pp.count && !pisa; i++) {
        const vx = m[0] * pp.getX(i) + m[4] * pp.getY(i) + m[8] * pp.getZ(i) + m[12];
        const vz = m[2] * pp.getX(i) + m[6] * pp.getY(i) + m[10] * pp.getZ(i) + m[14];
        for (let k = -H; k <= H; k++) {
          if ((Math.abs(vx - k * CELL) < R / 2 - .2 && Math.abs(vz - k * CELL) > R / 2 + 2) ||
              (Math.abs(vz - k * CELL) < R / 2 - .2 && Math.abs(vx - k * CELL) > R / 2 + 2)) { pisa = true; break; }
        }
      }
    }
    if (pisa) {
      const half = Math.max(sx, sz) / 2;
      const dest = aAcera(c.x, c.z, half);
      o.position.x += dest.x - c.x;
      o.position.z += dest.z - c.z;
      o.position.y = .35 + (box.max.y - box.min.y) / 2;   // apoyado en la acera
      movidos++;
    } else if (box.min.y > .45 && sy < 2.2) {
      // 2) flotando sin apoyo -> se apoya
      o.position.y -= (box.min.y - .35);
      apoyados++;
    }
  });
  NC.log('limpieza: ' + movidos + ' piezas de madera apartadas de la calzada, ' + apoyados + ' apoyadas en el suelo');

})();
