/* Neon Coast - robo de coches (mecanica de mundo abierto)
   - E junto a un coche aparcado (lado de la calle) -> el jugador se apropia de el
   - el coche robado pasa a SER el coche jugable: misma pintura, misma posicion
   - interruptores coherentes con lo que ya existe: enter/salir (toggleCar), colisiones (boxes),
     policias/okupas (crime/scare), pintura (paintTo) y guardados (la casa usa el estado del coche)
   - capa de interaccion: historia > roomdoor > carjack > resto (se carga entre ambos) */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const NC = window.NC;
  NC.log('carjack: robo de vehiculos listo');

  const REACH = 2.5; // radio para poder robar

  // candidato: aparcado no robado, cerca, y el jugador en la cara de la calle (mas lejos del edificio que el coche)
  function target() {
    if (!P.foot || !window.NC.PARKED) return null;
    let best = null, bd = REACH;
    for (const q of NC.PARKED) {
      if (q.stolen) continue;
      const d = Math.hypot(q.x - P.fx, q.z - P.fz);
      if (d >= bd) continue;
      // el jugador debe estar pegado al coche desde la calle, no desde la fachada del local
      const duroA = Math.hypot(q.x - (q.bx !== undefined ? q.bx : q.x), q.z - (q.bz !== undefined ? q.bz : q.z));
      const duorem = Math.hypot(P.fx - (q.bx !== undefined ? q.bx : q.x), P.fz - (q.bz !== undefined ? q.bz : q.z));
      if (duorem <= duroA + .4) continue; // si esta entre el coche y la fachada, no roba
      bd = d; best = q;
    }
    return best;
  }

  function doJack(q) {
    const prevPaint = P.paintCol || 0xff3d8b;
    const col = q.col || 0xd0d3d8;
    // identidad visual: el coche del jugador adopta el color del robado
    try { paintTo(col); P.paintCol = col; } catch (e) { }
    // desaparece el aparcado (su grupo es el que se convierte en tu coche) y su colision
    try { q.g.visible = false; } catch (e) { }
    q.stolen = true;
    if (q.box) {
      const bi = boxes.indexOf(q.box);
      if (bi >= 0) boxes.splice(bi, 1);
    }
    // entrada al coche en su sitio, sin teletransportes raros: mismo pivot y altura que el bucle
    P.x = q.x; P.z = q.z; P.th = q.rot;
    P.vx = P.vz = 0; P.cgy = gh(P.x, P.z);
    car.position.set(P.x, P.cgy, P.z);
    car.rotation.y = P.th; car.rotation.z = 0;
    P.foot = false; P.h.g.visible = false;
    try { cam.yaw = P.th; } catch (e) { }
    applyW();
    P.steals = (P.steals || 0) + 1;
    // consecuencias mundanas: testigos y policias
    let seen = 0;
    for (const n of npcs) if (!n.dead && !n.gone && n.down <= 0 && Math.hypot(n.x - q.x, n.z - q.z) < 14) seen++;
    if (seen > 0) {
      crime(.55); scare(16);
      pop('¡TE VIERON ROBAR!');
      toast(seen + ' testigo' + (seen > 1 ? 's' : '') + ' del robo');
      try { beep(180, .25, 'sawtooth', .05); } catch (e) { }
    } else {
      pop('ROBO LIMPIO');
      toast('Coche robado sin testigos');
      try { crime(.15); beep(320, .09); } catch (e) { }
    }
    // estela del color anterior: el color que deja hace huella en el registro de la casa
    try { P.lastStolen = prevPaint; } catch (e) { }
  }

  // pista flotante propia (coexiste con la de roomdoor: gana la de roomdoor si hay doble)
  NC.hooks = NC.hooks || { pre: [], post: [] };
  NC.hooks.pre.push(function () {
    const wl = NC.walkE;
    if (!wl || !running || paused || !P.foot || inv.open || (window.mapBig && mapBig)) {
      if (wl && wl.dataset.src === 'carjack') { wl.dataset.src = ''; wl.style.display = 'none'; wl.innerHTML = ''; }
      return;
    }
    const t = target();
    if (t && (!wl.dataset.src || wl.dataset.src === 'carjack' || wl.style.display === 'none')) {
      wl.dataset.src = 'carjack';
      wl.innerHTML = '<b>E</b> · robar el coche';
      wl.style.display = 'block';
      return;
    }
    if (wl.dataset.src === 'carjack') { wl.dataset.src = ''; wl.style.display = 'none'; wl.innerHTML = ''; }
  });

  // capa de interaccion: robar con E si hay candidato (por debajo de roomdoor y de la historia)
  const _it = window.interact;
  window.interact = function () {
    if (P.foot && running && !inv.open && !(window.mapBig && mapBig) && !(NC.dlg && NC.dlg.open) && !(NC.wheel && NC.wheel.open) && !paused) {
      const t = target();
      if (t) { doJack(t); return; }
    }
    return _it();
  };

  // sonda de depuracion (pruebas y soporte)
  NC.carjack = {
    target: target,
    list: function () { return NC.PARKED || []; },
    steal: function (k) {
      const q = ((NC.PARKED || []).filter(p => !p.stolen))[k || 0];
      if (q) doJack(q);
      return q ? { x: q.x, z: q.z, col: q.col, steals: P.steals, foot: P.foot, car: { x: +car.position.x.toFixed(1), z: +car.position.z.toFixed(1) } } : null;
    }
  };
})();
