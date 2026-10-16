/* Neon Coast - puertas animadas, entrada/salida con secuencia y proteccion dentro del coche */
(function () {
  'use strict';
  if (!window.THREE || !window.NC) return;
  NC.log('doors: montando puertas');

  const MAXA = 1.15;   // apertura de la puerta (rad)
  const OPENR = 3.2;   // rad/s al abrir
  const CLOSR = 3.6;   // rad/s al cerrar
  const FSTR = 8.0;    // apertura rapida cuando te sacan

  const DR = { ph: 'idle', t: 0, act: null, from: null, t0: null };

  // --- geometria de puertas ---
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xff3d8b, metalness: 1, roughness: .12, envMapIntensity: 2.2 });
  const winMat = new THREE.MeshStandardMaterial({ color: 0x0a1622, roughness: .08, metalness: .85, envMapIntensity: 2.4 });
  const hkMat = new THREE.MeshStandardMaterial({ color: 0xe8eaf0, metalness: .9, roughness: .35 });

  function mkDoor(side) {
    const pv = new THREE.Group();
    pv.position.set(side * .985, .52, .62);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(.08, .62, 1.42), doorMat);
    panel.position.set(0, .24, -.8); panel.castShadow = true; pv.add(panel);
    const win = new THREE.Mesh(new THREE.BoxGeometry(.05, .3, 1.0), winMat);
    win.position.set(0, .68, -.74); pv.add(win);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, .2), hkMat);
    hd.position.set(side * .07, .46, -.12); pv.add(hd);
    car.add(pv);
    return pv;
  }
  const dL = mkDoor(-1);   // puerta del conductor (izquierda)
  const dR = mkDoor(1);    // acompanante (estetica)
  function setA(a2) { dL.rotation.y = a2; dR.rotation.y = -a2; }
  setA(0);

  // repintar puertas junto con la carroceria
  const _paintTo = window.paintTo;
  if (typeof _paintTo === 'function') {
    window.paintTo = function (c) {
      try { doorMat.color.set(c); } catch (e) { }
      return _paintTo.apply(this, arguments);
    };
  }

  // --- utilidades ---
  function errBeep() { try { beep(92, .16, 'square', .05); } catch (e) { } }
  function creak() {
    try {
      beep(150, .4, 'sawtooth', .015);
      setTimeout(() => beep(230, .28, 'sawtooth', .012), 130);
    } catch (e) { }
  }
  function thunk() { try { beep(120, .06, 'square', .055); } catch (e) { } }
  function chime() { try { [660, 880].forEach((f, i) => setTimeout(() => beep(f, .09), i * 100)); } catch (e) { } }

  const lftOf = th => [-Math.cos(th), Math.sin(th)];

  // iniciar secuencia F: abrir puerta -> entrar/salir -> cerrar
  window.toggleCar = function () {
    if (DR.ph !== 'idle' || !running || P.dying || P.busted) return;
    if (!P.foot) {
      if (speed >= 7) { errBeep(); shake = Math.max(shake, .12); return; } // en movimiento no puedes salir
      startSeq('out');
    } else if (Math.hypot(P.fx - P.x, P.fz - P.z) < 6.2) {
      startSeq('in');
    } else {
      errBeep();
    }
  };

  function startSeq(act) {
    DR.ph = 'open'; DR.t = 0; DR.act = act;
    DR.rate = act === 'eject' ? FSTR : OPENR;
    DR.from = { x: P.x, z: P.z, th: P.th, fx: P.fx, fz: P.fz };
    creak();
  }

  function eject() { startSeq('eject'); }

  function endToIdle() { DR.ph = 'idle'; DR.t = 0; DR.act = null; setA(0); }

  function tick(dt) {
    if (DR.ph === 'idle') return;
    const a = dL.rotation.y;

    if (DR.ph === 'open') {
      const na = Math.min(MAXA, a + DR.rate * dt);
      setA(na);
      if (na >= MAXA - 1e-4) {
        DR.t = 0;
        if (DR.act === 'in') {
          DR.ph = 'walkIn';
          DR.t0 = { fx: P.fx, fz: P.fz };
        } else if (DR.act === 'out' || DR.act === 'eject') {
          DR.ph = 'walkOut';
          const l = lftOf(P.th);
          P.foot = true; P.h.g.visible = true; P.h.g.rotation.x = 0;
          try { applyW(); } catch (e) { }
          P.fx = P.x + l[0] * .9; P.fz = P.z + l[1] * .9; P.fth = P.th;
          P.fvx = 0; P.fvz = 0; P.vy = 0; P.fy = 0;
          const go = DR.act === 'out' ? 2.6 : 2.35;
          DR.t0 = { fx: P.fx, fz: P.fz, gx: P.x + l[0] * go, gz: P.z + l[1] * go };
          P.fth = Math.atan2(DR.t0.gx - P.fx, DR.t0.gz - P.fz);
          if (DR.act === 'eject') {
            P.hp = Math.max(1, P.hp - 6); shake = .6;
            P.fvx = l[0] * 6; P.fvz = l[1] * 6;
            try { beep(180, .25, 'sawtooth', .05); } catch (e) { }
            chime();
            DR.act = 'out'; // el resto del ciclo es salida normal
          }
        }
      }
      return;
    }

    if (DR.ph === 'walkIn') {
      DR.t += dt / .55;
      const k = Math.min(1, DR.t);
      P.fvx = 0; P.fvz = 0;
      const l = lftOf(DR.from.th);
      P.fx = DR.t0.fx + (DR.from.x + l[0] * 2.1 - DR.t0.fx) * k;
      P.fz = DR.t0.fz + (DR.from.z + l[1] * 2.1 - DR.t0.fz) * k;
      P.fth = Math.atan2(DR.from.x - P.fx, DR.from.z - P.fz);
      if (k >= 1) {
        P.foot = false; P.h.g.visible = false;
        try { applyW(); } catch (e) { }
        P.x = DR.from.x; P.z = DR.from.z; P.th = DR.from.th;
        P.vx = P.vz = 0; speed = 0;
        thunk();
        DR.ph = 'close'; DR.t = 0;
      }
      return;
    }

    if (DR.ph === 'walkOut') {
      DR.t += dt / .55;
      const k = Math.min(1, DR.t);
      P.fvx = 0; P.fvz = 0;
      P.fx = DR.t0.fx + (DR.t0.gx - DR.t0.fx) * k;
      P.fz = DR.t0.fz + (DR.t0.gz - DR.t0.fz) * k;
      if (k >= 1) { DR.ph = 'close'; DR.t = 0; DR.act = null; }
      return;
    }

    if (DR.ph === 'close') {
      const na = Math.max(0, a - CLOSR * dt);
      setA(na);
      if (na <= 1e-3) { thunk(); endToIdle(); }
      return;
    }
  }

  // la policia tiene que sacarte del coche: 2 s agarrandote, y solo si vas parado
  function copDrag(dt) {
    let pulling = false;
    for (let i = 0; i < cops.length; i++) {
      const c = cops[i];
      c.pull = Math.max(0, c.pull || 0);
      if (!c.act || c.down > 0) { c.pull = 0; continue; }
      if (P.foot) { c.pull = 0; continue; }
      const d = Math.hypot(c.x - P.x, c.z - P.z);
      const busy = (DR.ph !== 'idle' && DR.act === 'eject');
      if (speed >= 5.2 || busy) { c.pull = Math.max(0, c.pull - dt * .9); continue; }
      if (d < 2.6) {
        c.pull += dt; pulling = true;
        try { anim(c.h, 0, dt, 0, 1, gh(c.x, c.z)); } catch (e) { }
        if (c.pull >= 2.0 && DR.ph === 'idle') { c.pull = 0; eject(); }
      } else {
        c.pull = Math.max(0, c.pull - dt);
      }
    }
    if (pulling) {
      shake = Math.max(shake, .08 + .05 * Math.abs(Math.sin(performance.now() / 70)));
      try { $('dmg').style.opacity = .25 + .2 * Math.abs(Math.sin(performance.now() / 90)); } catch (e) { }
      if (frame % 24 === 0) { try { beep(65 + Math.random() * 50, .09, 'sawtooth', .02); } catch (e) { } }
    }
  }

  // blindo el interior: nada puede heredarte mientras vas dentro
  const _hurt = window.hurt;
  let lastProt = 0;
  window.hurt = function (a, cause) {
    if (!P.foot) {
      if (performance.now() - lastProt > 900) { lastProt = performance.now(); try { beep(110, .1, 'triangle', .02); } catch (e) { } }
      return;
    }
    return _hurt.apply(this, arguments);
  };

  NC.hooks.post.push((dt) => {
    tick(dt);
    copDrag(dt);
    if (DR.ph !== 'idle' && DR.ph !== 'close') {
      if (DR.act === 'out' && !P.foot) { P.vx = 0; P.vz = 0; } // coche parado mientras sales
      if (DR.act === 'in' && P.foot) { P.fvx = 0; P.fvz = 0; }
    }
  });

  NC.log('doors listas: secuencia de puerta + proteccion + sacan en 2 s');
  NC.Doors = { get state() { return DR; }, get panelA() { return dL.rotation.y; }, debug: true };

  // red de seguridad: SOLO si una fase se queda colgada a mitad de la secuencia (nunca en reposo)
  let wdLast = '', wdAt = 0;
  setInterval(() => {
    try {
      const k = DR.ph + '/' + (DR.act || '') + '/' + dL.rotation.y.toFixed(2);
      if (k !== wdLast) { wdLast = k; wdAt = performance.now(); return; }
      if (DR.ph === 'idle') { if (Math.abs(dL.rotation.y) > .02) { setA(0); thunk(); } return; }
      if (performance.now() - wdAt < 7000) return;
      wdAt = performance.now();
      NC.log('doors: fase colgada ' + k + ', completando sola');
      if (!P.foot) { // completar salida al exterior
        const l = lftOf(P.th);
        P.foot = true; P.h.g.visible = true; P.h.g.rotation.x = 0;
        try { applyW(); } catch (e) { }
        P.fx = P.x + l[0] * 2.6; P.fz = P.z + l[1] * 2.6; P.fth = cam.yaw = P.th; P.fvx = P.fvz = 0; P.vx = P.vz = 0; speed = 0;
      } else if (DR.act === 'in') { // completar entrada
        P.foot = false; P.h.g.visible = false;
        try { applyW(); } catch (e) { }
        P.x = DR.from ? DR.from.x : P.x; P.z = DR.from ? DR.from.z : P.z; P.vx = P.vz = 0; speed = 0;
      }
      endToIdle();
    } catch (e) { }
  }, 500);
})();
