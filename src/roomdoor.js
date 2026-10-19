/* Neon Coast - puertas giratorias de interiores + interactuables (DJ, consulta, hoteles) */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const NC = window.NC;

  const mats = {};
  NC.css(`
    #walk{position:absolute;left:50%;bottom:130px;transform:translateX(-50%);z-index:6;
      background:rgba(8,5,20,.78);border:1px solid #ffd24a55;color:#fff7ea;padding:6px 14px;
      border-radius:20px;font-size:13px;display:none;pointer-events:none;letter-spacing:.4px}
    #walk b{color:#ffd24a}
  `);
  const wl = document.createElement('div');
  wl.id = 'walk';
  document.body.appendChild(wl);
  NC.walkE = wl; // expuesto para que otras capas (carjack) escriban pistas coexistiendo

  // ---- material comun para hojas de puerta
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: .65, metalness: .05 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a1a3a, roughness: .8 });

  // coleccion de puertas automaticas
  const AUTOS = [];
  function mkHinge(cx, cz, frontZ, doorW, minAngle, maxAngle, id) {
    const pivot = new THREE.Group();
    pivot.position.set(cx - doorW / 2, 0, frontZ);
    scene.add(pivot);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(doorW, 3.1, .18), leafMat);
    leaf.position.set(doorW / 2, 1.85, 0);
    leaf.castShadow = true;
    pivot.add(leaf);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 8), new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: .9, roughness: .3 }));
    knob.position.set(doorW - .25, 1.45, .16);
    pivot.add(knob);
    // marco del hueco
    const pilJ = new THREE.Mesh(new THREE.BoxGeometry(.28, 3.3, .5), frameMat);
    pilJ.position.set(cx - doorW / 2 - .14, 1.65, frontZ);
    scene.add(pilJ);
    const pilR = pilJ.clone();
    pilR.position.x = cx + doorW / 2 + .14;
    scene.add(pilR);
    const header = new THREE.Mesh(new THREE.BoxGeometry(doorW + .6, .5, .5), frameMat);
    header.position.set(cx, 3.2, frontZ);
    scene.add(header);
    return { pivot, id, cur: 0, tgt: 0, minAngle: minAngle, maxAngle: maxAngle };
  }
  function frontWallX(cx, cz, w, h, gapX, gapW) {
    const segs = [[cx - w / 2, gapX - gapW / 2], [gapX + gapW / 2, cx + w / 2]];
    for (const s of segs) {
      const sw = s[1] - s[0];
      if (sw <= .05) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(sw, h, .35), frameMat);
      m.position.set((s[0] + s[1]) / 2, h / 2 + .3, cz);
      m.castShadow = true;
      scene.add(m);
      boxes.push({ x: (s[0] + s[1]) / 2, z: cz, hw: sw / 2, hd: .35 });
    }
    // dintel sobre el hueco
    const hdr = new THREE.Mesh(new THREE.BoxGeometry(gapW + .3, Math.max(.3, h - 3.1), .35), frameMat);
    hdr.position.set(gapX, 3.1 + Math.max(.15, (h - 3.1) / 2), cz);
    if (h > 3.4) scene.add(hdr);
  }

  // ---- construidos: apartamento (EXT+30,150,16x12, frontal z=156), club (EXT+30,-150, frontal z=-144) ----
  const HX = EXT + 30;
  // apartamento
  frontWallX(HX, 156, 16, 4.5, HX, 2.6);
  AUTOS.push(mkHinge(HX, 156, 156.25, 2.6, 0, 1.85, 'apart'));
  // club
  frontWallX(HX, -144, 16, 4.5, HX, 2.6);
  AUTOS.push(mkHinge(HX, -144, -143.75, 2.6, 0, 1.85, 'club'));
  // clinica: cerrar paredes laterales + frontal con puerta automatica
  {
    const w = 12, d = 8, h = 3.4, cx = CLINIC.x, cz = CLINIC.z, C = 0xe8e8e8;
    const wm = new THREE.MeshStandardMaterial({ color: C, roughness: .85 });
    const side1 = new THREE.Mesh(new THREE.BoxGeometry(.35, h, d), wm); side1.position.set(cx - w / 2, h / 2 + .15, cz); scene.add(side1);
    const side2 = side1.clone(); side2.position.x = cx + w / 2; scene.add(side2);
    boxes.push({ x: cx - w / 2, z: cz, hw: .18, hd: d / 2 }, { x: cx + w / 2, z: cz, hw: .18, hd: d / 2 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + .8, .3, d + .8), new THREE.MeshStandardMaterial({ color: 0x9aa7b8, roughness: .9 }));
    roof.position.set(cx, h + .6, cz); scene.add(roof);
    frontWallX(cx, cz + d / 2 + .25, w, h, cx, 2.6);
    AUTOS.push(mkHinge(cx, cz + d / 2 + .25, cz + d / 2 + .5, 2.6, 0, 1.85, 'clinic'));
    // camillas
    const bm = new THREE.MeshStandardMaterial({ color: 0xcfe4ee, roughness: .6 });
    for (let i = 0; i < 2; i++) {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(4, .8, 1.6), bm);
      bed.position.set(cx - 3.4, .75, cz - 2.2 + i * 1.9);
      scene.add(bed);
      boxes.push({ x: cxx(cx - 3.4), z: cz - 2.2 + i * 1.9, hw: 2, hd: .8 });
    }
    function cxx(v) { return v; }
  }

  // ---- consola DJ clickable + consulta clinica ----
  let djDeck = null, mixT = 0, mixCd = 0;
  {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, .35, 1.2), new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: .4 }));
    base.position.set(HX - 2.4, 1.37, -152);
    scene.add(base);
    for (let i = 0; i < 2; i++) {
      const dis = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .06, 18), new THREE.MeshStandardMaterial({ color: 0x27e6ff, emissive: 0x27e6ff, emissiveIntensity: .35, roughness: .35 }));
      dis.rotation.x = PI / 2;
      dis.position.set(HX - 3.05 + i * 1.3, 1.58, -152);
      scene.add(dis); djDeck = djDeck || []; djDeck.push(dis);
    }
    const mixer = new THREE.Mesh(new THREE.BoxGeometry(2, .16, .5), new THREE.MeshStandardMaterial({ color: 0xff5aef, emissive: 0xff5aef, emissiveIntensity: .25, roughness: .4 }));
    mixer.position.set(HX - 2.4, 1.63, -151.6);
    scene.add(mixer); djDeck.push(mixer);
  }
  const djPos = { x: HX - 2.4, z: -152 };
  const recPos = { x: CLINIC.x, z: CLINIC.z + 1 };

  // ---- hoteles: dormir ----
  function hotelSleep(h) {
    if (P.wanted > .5) { toast('La policía te sigue: el hotel no te alquila'); return; }
    if (money < 30) { toast('Madrugada en hotel: $30 y los tienes justos'); return; }
    money -= 30;
    WX.t = .27; WX.wt = rnd(300, 500);
    P.hp = Math.max(P.hp, 75); P.drunk = 0; P.copT = 0;
    try { window.__ncLive && window.__ncLive(); } catch (err) { }
    try { paintSky(); } catch (err) { }
    toast('Habitación alquilada $30 · amanece en la costa');
    pop('DESCANSO');
    try { beep(520, .12); setTimeout(() => beep(660, .16), 130); } catch (err) { }
    if (NC.sto && NC.sto.note) NC.sto.note('Dormiste en ' + (h && h.n ? h.n : 'un hotel de la costa'));
  }

  // ---------- cadena de interact() ----------
  const _it = window.interact;
  window.interact = function () {
    try {
      if (P.wanted > 1.2) return _it();
      // DJ
      if (dist2(P.fx, P.fz, djPos.x, djPos.z) < 2.6) {
        if (mixCd > 0 || mixT > 0) { toast('Los platos aún calieciendo…'); return; }
        mixT = 7; mixCd = 14;
        const tip = 15 + Math.floor(rnd(0, 25)) * (WX.snowMul > 1 ? 2 : 1);
        money += tip;
        try { acts.mixes = (acts.mixes || 0) + 1 } catch (err) { }
        toast('¡Pinchando! El público te lanza una propina (+$' + tip + ')');
        try { beep(880, .1, 'sawtooth', .03); setTimeout(() => beep(660, .12, 'sawtooth', .03), 140) } catch (err) { }
        return;
      }
      // consulta clinica
      if (P.foot && dist2(P.fx, P.fz, recPos.x, recPos.z) < 9) {
        if (P.hp <= 86 && money >= 40) { money -= 40; P.hp = 100; P.drunk = 0; toast('Sin heridas: +$40 · te han dejado nuevo'); pop('SALUD LISTA'); try { beep(720, .1) } catch (err) { } }
        else if (P.hp > 86) toast('Estás sano: la consulta es para heridos');
        else toast('$40 por el médico · no te llega');
        return;
      }
      // hoteles: dormir
      if (P.foot) {
        let best = null, bd = 1e9;
        for (const h of hotels) {
          const d = dist2(P.fx, P.fz, h.x, h.z);
          if (d < bd && d < 49) { bd = d; best = h; }
        }
        // solo si NO estas pegado a otro tipo de interaccion (puertas, mostradores)
        if (best && bd < 42) { hotelSleep(best); return; }
      }
    } catch (err) { NC.log('roomdoor interact', err); }
    return _it();
  };
  function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz }

  // pistas flotantes
  NC.hooks.pre.push(function (dt) {
    let hint = '';
    if (running && !paused && !mapBig && P.foot && !P.dying) {
      if (dist2(P.fx, P.fz, djPos.x, djPos.z) < 2.6) hint = mixT > 0 ? '<b>DJ</b> · pincha… la pista arde' : '<b>E</b> · pinchar sesión en los platos';
      else if (dist2(P.fx, P.fz, recPos.x, recPos.z) < 9) hint = P.hp <= 86 ? '<b>E</b> · consulta médica $40' : '<b>·</b> consulta médica (sano)';
      else {
        for (const h of hotels) {
          const d = dist2(P.fx, P.fz, h.x, h.z);
          if (d < 42) { hint = '<b>E</b> · dormir en el hotel $30'; break; }
        }
      }
    }
    wl.innerHTML = hint;
    wl.style.display = hint ? 'block' : 'none';
    if (hint) wl.dataset.src = 'roomdoor'; // marca de propiedad de la pista (carjack no la sobreescribe)
    // puertas automaticas
    for (const a of AUTOS) {
      const gp = a.pivot.position, midX = gp.x + 1.3, midZ = gp.z;
      const dInside = P.foot ? Math.hypot(P.fx - gp.x - 1.3, P.fz - gp.z + 4.9) : 99;
      // abierto si el jugador esta cerca del vano o dentro del cuarto (fondo hacia el mismo lado)
      const near = P.foot
        ? Math.hypot(P.fx - midX, P.fz - midZ) < 4.2
        : Math.hypot(P.x - midX, P.z - midZ) < 5.2;
      a.tgt = near ? a.maxAngle : 0;
      a.cur += (a.tgt - a.cur) * Math.min(1, 4.2 * dt);
      a.pivot.rotation.y = a.cur;
    }
    if (mixT > 0) {
      mixT -= dt;
      if (djDeck) {
        for (let i = 0; i < djDeck.length; i++) {
          djDeck[i].material.emissiveIntensity = .2 + .4 * Math.abs(Math.sin(performance.now() / 90 + i));
        }
      }
      if (mixT <= 0 && djDeck) for (const dj2 of djDeck) { dj2.material.emissiveIntensity = .3 }
    }
    if (mixCd > 0) mixCd -= dt;
  });

  window.__ncLive = null; // story.js puede rellenarlo
  NC.log('puertas de interiores listas');
})();
