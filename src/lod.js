/* Neon Coast - LOD: los edificios se reconstruyen por trozos espaciales (supermalla) para
   poder descartarlos por distancia, en vez de un par de mallas gigantes que siempre se dibujan. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;
  const NEAR = 330, FAR = 430;          // dentro de NEAR se dibujan, entre NEAR y FAR se atenua
  const SUP = 3;                         // celdas por supertrozo

  // ---------- localizar y apagar las mallas originales ----------
  const orig = [];
  try { bmats.forEach(m => { scene.traverse(o => { if (o.isMesh && o.material === m) orig.push(o); }); }); } catch (e) { }
  orig.forEach(o => o.visible = false);

  // ---------- reconstruir por supertrozo ----------
  const chunks = new Map();
  const put = (cell, mat, g) => {
    const k = cell + '|' + mat;
    if (!chunks.has(k)) chunks.set(k, { mat, list: [] });
    chunks.get(k).list.push(g);
  };
  try {
    for (const b of BLD) {
      const zn = b.zn;
      const mi = pick(ZPAL[zn]);
      const mat = bmats[mi];
      const cell = (Math.floor(b.x / CELL / SUP)) + '_' + (Math.floor(b.z / CELL / SUP));
      const win = (zn === 0 || zn === 5) ? 0 : 1;
      const parts = [];
      parts.push(bg(b.w, b.h, b.d, b.x, b.h / 2 + .35, b.z, win, b.rot));
      if (zn !== 5) parts.push(bg(b.w + 1.2, .9, b.d + 1.2, b.x, b.h + .8, b.z, 1, b.rot));
      parts.push(bg(b.w + .8, 1.4, b.d + .8, b.x, 1.05, b.z, 1, b.rot));
      const aw = rnd(3, 6), ad = rnd(3, 6);
      parts.push(bg(aw, 2, ad, b.x + rnd(-b.w / 3, b.w / 3), b.h + 2.3, b.z + rnd(-b.d / 3, b.d / 3), 1, b.rot));
      if (b.h > 25) parts.push(bg(b.w + .6, .4, b.d + .6, b.x, b.h * .55, b.z, 1, b.rot));
      parts.forEach(g => put(cell, mat, g));
    }
  } catch (e) { NC.log('lod: reconstrucción', e); }

  const meshes = [];
  for (const [k, c] of chunks) {
    if (!c.list.length) continue;
    c.list.forEach(g => { if (!g.index) { const n = g.attributes.position.count, a = new Uint32Array(n); for (let i = 0; i < n; i++) a[i] = i; g.setIndex(new T.BufferAttribute(a, 1)); } });
    const m = new T.Mesh(merge(c.list), c.mat);
    m.castShadow = true; m.receiveShadow = true;
    m.userData.cell = k.split('|')[0];
    scene.add(m); meshes.push(m);
  }

  // ---------- ocultar por distancia (con histeresis para que no parpadee) ----------
  let tick = 0;
  NC.hooks.post.push(() => {
    if ((tick++ % 12) !== 0) return;
    try {
      const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
      for (const m of meshes) {
        const c = m.userData.cell.split('_');
        const cx = (+c[0] + .5) * CELL * SUP, cz = (+c[1] + .5) * CELL * SUP;
        const d = Math.hypot(cx - px, cz - pz);
        const vis = d < FAR;
        if (m.visible !== vis) m.visible = vis;
        // el material se atenua con la distancia para que no aparezcan de golpe
        m.material.opacity = 1;
      }
    } catch (e) { }
  });

  NC.log('lod: edificios en ' + meshes.length + ' trozos con descarte por distancia');
})();
