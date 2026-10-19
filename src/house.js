/* Neon Coast - casa propia: compra por puerta, guardado/carga, dormir, armario y escritorio */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  NC.log('house: montando tu casa');

  const RC = { x: EXT + 30, z: 150 };           // interior del apartamento
  const COSTE = 3000, KEY = 'neonCoastSave';

  // ---------- localizar las puertas ----------
  const entrada = doors.find(d => d.tx === RC.x && d.tz === RC.z + 4);
  const salida = doors.find(d => d.label === 'Salir' && Math.hypot(d.x - RC.x, d.z - RC.z) < 9);
  if (entrada && salida) {                      // coherencia: entras y sales por el mismo hotel
    salida.tx = entrada.x; salida.tz = entrada.z + 3.2;
  }
  const NCH = window.NCH = entrada ? { x: entrada.x, z: entrada.z } : { x: RC.x, z: RC.z };

  // ---------- mobiliario nuevo: armario, escritorio, planta, lampara ----------
  const WM = new THREE.MeshStandardMaterial({ color: 0x5a4232, roughness: .8 });
  const MD = new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: .75 });
  const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(.7, 2.3, 1.7), WM);
  wardrobe.position.set(RC.x + 5.3, 1.45, RC.z - 3.2); wardrobe.castShadow = true; scene.add(wardrobe);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.04, 6, 5), new THREE.MeshStandardMaterial({ color: 0xd8c890, metalness: .8, roughness: .3 }));
  knob.position.set(RC.x + 4.9, 1.35, RC.z - 3.5); scene.add(knob);
  boxes.push({ x: RC.x + 5.3, z: RC.z - 3.2, hw: .4, hd: .9 });

  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, .86, .95), MD);
  desk.position.set(RC.x - 5.8, .73, RC.z + 2.2); desk.castShadow = true; desk.receiveShadow = true; scene.add(desk);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.02, .03, .38, 6), new THREE.MeshStandardMaterial({ color: 0x2a2a33 }));
  lamp.position.set(RC.x - 6.1, 1.32, RC.z + 2.5); scene.add(lamp);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd24a }));
  bulb.position.set(RC.x - 6.1, 1.5, RC.z + 2.5); scene.add(bulb);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(.5, .36), new THREE.MeshBasicMaterial({ color: 0xf2ede2 }));
  paper.rotation.x = -PI / 2 + .25; paper.position.set(RC.x - 5.6, 1.18, RC.z + 2.1); scene.add(paper);
  boxes.push({ x: RC.x - 5.8, z: RC.z + 2.2, hw: .8, hd: .5 });

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.3, .24, .55, 8), new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: .9 }));
  pot.position.set(RC.x + 5.1, .68, RC.z + 3.8); scene.add(pot);
  const leafs = [];
  for (let i = 0; i < 5; i++) leafs.push(cg(new THREE.SphereGeometry(rnd(.28, .45), 7, 5).translate(RC.x + 5.1, 1.35 + rnd(0, .5), RC.z + 3.8 + rnd(-.35, .35)), pick([0x2f9a52, 0x3fae5a])));
  scene.add(new THREE.Mesh(merge(leafs), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 })));
  boxes.push({ x: RC.x + 5.1, z: RC.z + 3.8, hw: .3, hd: .3 });

  const pool = new THREE.Mesh(new THREE.PlaneGeometry(13, 11), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .22 }));
  pool.rotation.x = -PI / 2; pool.position.set(RC.x, .45, RC.z - .5); scene.add(pool);
  const sc = new THREE.Mesh(new THREE.BoxGeometry(2.2, .1, .6), new THREE.MeshBasicMaterial({ color: 0xfff6dd }));
  sc.position.set(RC.x, 4.3, RC.z - .5); scene.add(sc);

  // alfombra
  const rug = new THREE.Mesh(new THREE.BoxGeometry(5, .05, 3.6), new THREE.MeshStandardMaterial({ color: 0x8a2a4a, roughness: 1 }));
  rug.position.set(RC.x + 1.2, .42, RC.z + 1.6); rug.receiveShadow = true; scene.add(rug);

  // ---------- zonas interactivas ----------
  const ZS = [
    { x: RC.x - 3, z: RC.z - .4, r: 2.4, kind: 'bed', hint: 'E: dormir · salud al maximo y amanece' },
    { x: RC.x + 5.6, z: RC.z - 3.2, r: 2.2, kind: 'outfit', hint: 'E: armario · cambiar de outfit' },
    { x: RC.x - 5.6, z: RC.z + 2.2, r: 2.0, kind: 'desk', hint: 'E: escritorio · guardar partida' }
  ];
  function zoneAt() {
    if (!P.apt || !P.foot) return null;
    for (const zc of ZS) if (Math.hypot(zc.x - P.fx, zc.z - P.fz) < zc.r) return zc;
    return null;
  }

  // ---------- aviso contextual (#ncH) ----------
  NC.css(`#ncH{position:absolute;left:50%;bottom:calc(56px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);
    background:rgba(21,13,58,.72);border:1px solid #ffd24a55;border-radius:10px;padding:4px 12px;font-size:13px;color:#ffd24a;
    display:none;z-index:4;font-weight:700;white-space:nowrap}`);
  document.body.insertAdjacentHTML('beforeend', '<div id="ncH"></div>');
  const hEl = document.getElementById('ncH');
  let hTick = 0;

  // ---------- guardar / cargar ----------
  function snapshot(silent) {
    try {
      const d = {
        v: 1, t: Date.now(), money: money, wx: WX.t,
        acts: { goles: acts.goles, botellas: acts.botellas, graf: acts.graf, taxis: acts.taxis, dineroTaxi: acts.dineroTaxi, drift: acts.drift || 0 },
        P: {
          hp: P.hp, arm: P.arm, med: P.med, own: [...P.own], ammo: [...P.ammo],
          mag: { 2: P.mag[2] || 0, 3: P.mag[3] || 0 }, w: P.w, rob: P.rob, kills: P.kills,
          life: P.life ? { ...P.life } : null, eng: P.eng, carm: P.carm, turbo: P.turbo,
          chp: P.chp, spray: P.spray || 0, apt: P.apt, inc: P.inc, playt: P.playt || 0, dist: P.dist || 0,
          known: P.known.length
        },
        pos: { x: P.foot ? P.fx : P.x, z: P.foot ? P.fz : P.z, foot: !!P.foot, th: P.foot ? P.fth : P.th, yaw: cam.yaw }
      };
      localStorage.setItem(KEY, JSON.stringify(d));
      if (!silent) toast('Partida guardada · puedes apagar sin miedo');
      beep(660, .08); setTimeout(() => beep(990, .1), 90);
    } catch (e) { NC.log('house: guardar', e); }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return false;
      const d = JSON.parse(raw); if (!d || !d.P) return false;
      money = d.money || 0;
      try { Object.assign(acts, d.acts || {}); } catch (e) { }
      const p = d.P, q = P;
      q.hp = p.hp ?? 100; q.arm = p.arm || 0; q.med = p.med ?? 2;
      if (p.own) p.own.forEach((v, i) => q.own[i] = v);
      if (p.ammo) p.ammo.forEach((v, i) => q.ammo[i] = v);
      q.mag[2] = p.mag && p.mag[2] || 0; q.mag[3] = p.mag && p.mag[3] || 0;
      if (p.w && q.own[p.w]) q.w = p.w;
      q.rob = p.rob || 0; q.kills = p.kills || 0;
      if (p.life) q.life = { ...p.life };
      q.eng = p.eng || 0; q.carm = p.carm || 0; q.turbo = p.turbo || 0;
      q.chp = p.chp ?? 100; q.spray = p.spray || 0;
      q.apt = p.apt || 0; q.inc = p.inc || 20;
      q.playt = p.playt || 0; q.dist = p.dist || 0;
      if (d.wx !== undefined) { WX.t = d.wx; WX.wt = rnd(300, 500); try { paintSky(); } catch (e) { } }
      if (d.pos) {
        P.foot = !!d.pos.foot;
        if (P.foot) {
          P.fx = d.pos.x; P.fz = d.pos.z; P.fth = d.pos.th || 0;
          P.x = entrada ? entrada.x : d.pos.x; P.z = entrada ? entrada.z + 10 : d.pos.z; P.th = d.pos.th || 0;
          P.h.g.visible = true;
        } else { P.x = d.pos.x; P.z = d.pos.z; P.th = d.pos.th || 0; P.h.g.visible = false; }
        cam.yaw = d.pos.yaw || 0;
        P.vx = P.vz = P.fvx = P.fvz = 0; speed = 0;
        car.position.set(P.x, gh(P.x, P.z), P.z); car.rotation.y = P.th;
      }
      if (P.apt && entrada) { entrada.label = 'Tu casa'; houseDoorLook(); }
      applyW();
      NC.log('house: partida cargada · $' + money);
      return true;
    } catch (e) { NC.log('house: cargar', e); return false; }
  }

  // ---------- acciones ----------
  function houseDoorLook() { try { if (entrada && entrada.m) entrada.m.material.color.setHex(0xffd24a); } catch (e) { } }
  function sleep() {
    if (P.wanted > .5) { toast('No puedes dormir con la policía pisándote los talones'); return; }
    P.hp = 100; P.arm = Math.min(100, P.arm + 40); P.drunk = 0;
    P.wanted = 0; P.wt = 0; shake = 0;
    WX.t = .27; WX.wt = rnd(300, 500);
    try { paintSky(); } catch (e) { }
    toast('Duermes hasta el amanecer · salud al máximo · guardado');
    [520, 700, 940].forEach((f, i) => setTimeout(() => beep(f, .12), i * 140));
    snapshot(true);
  }
  function outfit() {
    CFG.ch = (CFG.ch < 0 || CFG.ch + 1 >= CHARS.length) ? 0 : CFG.ch + 1;
    CFG.custom = null; saveCfg();
    const c = CHARS[CFG.ch];
    setPlayerLook(c.sh, c.pa, c.ha);
    toast('Outfit cambiado: ' + c.n); beep(440, .08); setTimeout(() => beep(620, .08), 90);
  }
  function buyHouse() {
    if (money < COSTE) { toast('Tu casa frente al mar cuesta $' + COSTE + ' · te faltan $' + (COSTE - money)); beep(120, .15, 'sawtooth', .04); return; }
    money -= COSTE; P.apt = 1; P.inc = 20;
    if (entrada) entrada.label = 'Tu casa';
    houseDoorLook();
    NCH.x = entrada ? entrada.x : RC.x; NCH.z = entrada ? entrada.z : RC.z;
    pop('¡CASA COMPRADA!'); toast('Ya tienes tu casa: E en la cama para dormir y guardar');
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, .12), i * 120));
    snapshot(true);
  }

  // ---------- envolver interact (E) ----------
  const _interact = window.interact;
  window.interact = function () {
    if (!running || P.dying || P.busted || !P.foot) return _interact ? _interact.apply(this, arguments) : undefined;
    // comprar la casa en la puerta
    if (entrada && !P.apt && Math.hypot(entrada.x - P.fx, entrada.z - P.fz) < 3) { buyHouse(); return; }
    // zonas del interior
    if (P.apt) {
      const zc = zoneAt();
      if (zc) {
        if (zc.kind === 'bed') sleep();
        else if (zc.kind === 'outfit') outfit();
        else if (zc.kind === 'desk') snapshot(false);
        return;
      }
    }
    return _interact.apply(this, arguments);
  };

  // comprarla tambien desde el catalogo de tiendas
  try {
    const ap = SHOP[15];
    if (ap && ap.f) { const _f = ap.f; ap.f = function () { const r = _f.apply(this, arguments); if (r && P.apt) { if (entrada) entrada.label = 'Tu casa'; houseDoorLook(); snapshot(true); } return r; }; }
  } catch (e) { }

  // ---------- bucle de avisos ----------
  NC.hooks.post.push(() => {
    // pisar el suelo real de las salas (gh() da 0 en la playa y el jugador se hundia)
    try {
      if (P.foot) {
        if (Math.abs(P.fx - RC.x) < 8 && Math.abs(P.fz - RC.z) < 6.2) P.gy = .3;
        else if (Math.abs(P.fx - (EXT + 30)) < 8 && Math.abs(P.fz + 150) < 6.2) P.gy = .3;
        else if (Math.abs(P.fx - (EXT + 20)) < 6 && Math.abs(P.fz - 44) < 4) P.gy = .3;
      }
    } catch (e) { }
    if ((hTick++ % 7)) return;
    try {
      let txt = '';
      if (!P.apt && P.foot && entrada && Math.hypot(entrada.x - P.fx, entrada.z - P.fz) < 5) txt = 'Tu casa frente al mar · $' + COSTE + ' · E para comprar';
      else {
        const zc = zoneAt();
        if (zc) txt = zc.hint;
        else if (P.apt && P.foot && entrada && Math.hypot(entrada.x - P.fx, entrada.z - P.fz) < 4) txt = 'Tu casa';
      }
      if (txt) { hEl.textContent = txt; hEl.style.display = 'block'; } else hEl.style.display = 'none';
    } catch (e) { }
  });

  // ---------- cargar al entrar ----------
  if (load()) setTimeout(() => toast('Partida cargada'), 1500);

  NC.log('house: lista (guardado en localStorage "' + KEY + '")');
})();
