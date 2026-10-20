/* Neon Coast - mundo vivo: barrios con identidad, conversaciones, historia por capitulos, eventos y guardado */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const NC = window.NC;

  // ============================================================
  // 1. BARRIOS (identidad por manzanas)
  // ============================================================
  function cellOf(v) { return Math.floor(v / CELL); }
  const isNight = () => WX.t > .8 || WX.t < .18;
  function zoneCode(x, z) {
    const i = cellOf(x), j = cellOf(z);
    if (j <= -3) return 0;
    if (j >= 3) return 4;
    const ring = Math.max(Math.abs(i), Math.abs(j));
    if (ring <= 2) return 1;
    if (i <= -2) return 2;
    return 3;
  }
  const ZN = [
    { n: 'Puerto Viejo', col: '#9a6bff', ink: '#cdbcff', line: 'rgba(154,107,255,.5)' },
    { n: 'Distrito Neón', col: '#27e6ff', ink: '#bafdff', line: 'rgba(39,230,255,.4)' },
    { n: 'Betica', col: '#ff5a7a', ink: '#ffc8d6', line: 'rgba(255,90,122,.45)' },
    { n: 'Colina Mar', col: '#ffd24a', ink: '#ffefb0', line: 'rgba(255,210,74,.45)' },
    { n: 'Fleming Sur', col: '#3dff9a', ink: '#c4ffdf', line: 'rgba(61,255,154,.5)' }
  ];
  // rect = [x, z, ancho, alto] en coordenadas del mundo; DEBE coincidir con zoneCode() (celdas -3..2 / 3..)
  //   Puerto Viejo: z < -2C   Fleming Sur: z >= 3C   Neon: x,z en [-2C, 3C)   Betica: x < -2C   Colina Mar: x >= 3C
  ZN[0].rect = [-EXT - 40, -EXT - 40, (EXT + 40) * 2, (-2 * CELL) + EXT + 40];
  ZN[4].rect = [-EXT - 40, 3 * CELL, (EXT + 40) * 2, EXT + 40 - 3 * CELL];
  ZN[1].rect = [-2 * CELL, -2 * CELL, 5 * CELL, 5 * CELL];
  ZN[2].rect = [-EXT - 40, -2 * CELL, (EXT + 40) - 2 * CELL, 5 * CELL];
  ZN[3].rect = [3 * CELL, -2 * CELL, (EXT + 40) - 3 * CELL, 5 * CELL];
  NC.sto = {
    zones: [],
    pins: [],
    note: function () { },
    zone: function (x, z) { return ZN[zoneCode(x, z)].n; },
    at: function (x, z) { return ZN[zoneCode(x, z)]; }
  };
  for (const z of ZN) NC.sto.zones.push({ label: z.n.toUpperCase(), line: z.line, ink: z.ink, rect: z.rect });

  NC.css(`#stoZone{position:absolute;left:50%;top:0;transform:translateX(-50%);z-index:6;display:none;
    background:linear-gradient(90deg,rgba(21,13,58,.92),rgba(21,13,58,.55));border:1px solid #27e6ff22;color:#fff7ea;
    padding:5px 18px;border-radius:0 0 12px 12px;font-size:13px;letter-spacing:2px;pointer-events:none;font-weight:700}`);
  const zoneEl = document.createElement('div'); zoneEl.id = 'stoZone'; document.body.appendChild(zoneEl);
  let zElT = 0, zKey = '';
  NC.hooks.pre.push(function () {
    if (!running || paused) return;
    if (frame % 30 !== 0) return;
    const zn = NC.sto.at(P.foot ? P.fx : P.x, P.foot ? P.fz : P.z);
    const key = zn.n + '|' + phaseName() + '|' + WX.wx;
    if (key === zKey) return;
    zKey = key;
    zoneEl.innerHTML = '<span style="color:' + zn.col + '">#</span> ' + zn.n.toUpperCase() +
      ' <i style="opacity:.6;font-style:normal">' + phaseName() + (WX.wx && WX.wx !== 'sol' ? ' · ' + WX.wx : '') + '</i>';
    zoneEl.style.display = 'block'; zoneEl.style.opacity = 1;
    clearTimeout(zElT); zElT = setTimeout(() => zoneEl.style.opacity = 0, 2400);
  });

  // ============================================================
  // 2. ESTADO + GUARDADO DE LA HISTORIA
  // ============================================================
  const SK = 'ncStory';
  let S = { v: 1, ch: 0, side: null, flags: {}, rel: {}, done: false };
  try { const r = localStorage.getItem(SK); if (r) { const p = JSON.parse(r); if (p && p.v) S = p; } } catch (e) { }
  if (!S.rel) S.rel = {};
  if (!S.flags) S.flags = {};
  function saveStory(silent) { try { localStorage.setItem(SK, JSON.stringify(S)); if (!silent) NC.log('historia guardada'); } catch (e) { } }
  addEventListener('beforeunload', () => { try { saveStory(true) } catch (e) { } });

  // ============================================================
  // 3. ACTORES FIJOS
  // ============================================================
  const HX = EXT + 30;
  function clubDoor() { try { const d = doors.find(q => q.label == 'Club Neón'); if (d) return { x: d.x, z: d.z }; } catch (e) { } return { x: HX, z: -146 }; }
  function kioskSouth() {
    try {
      let best = null, bd = 1e9;
      for (const s2 of shops) { const d = Math.hypot(s2.x, s2.z - 266); if (s2.z > 200 && d < bd) { bd = d; best = s2; } }
      if (best) {
        // junto a la entrada pero SIN taparla: la puerta del kiosco esta en (best.x, best.z - 1.6)
        // y su hoja abre hacia dentro, asi que Marcos se queda a un lado, sobre la acera
        return { x: best.x + 2.3, z: best.z - 0.5 };
      }
    } catch (e) { }
    return { x: 38, z: 267 };
  }
  const PORT = { pos: { x: -228, z: -306 }, pos2: { x: -202, z: -306 }, boxPos: { x: -228, z: -314 } };
  const PIER = { x0: 432, x1: 458, z0: 200, z1: 208, y: .38 };
  PIER.cx = (PIER.x0 + PIER.x1) / 2; PIER.cz = (PIER.z0 + PIER.z1) / 2;

  const CAST = [
    { id: 'aurora', n: 'Aurora', job: 'tu hermana', sh: 0xffd24a, pa: 0x6a3a22, ha: 0x6b4a32, hat: 2, look: { hairStyle: 'pony', fem: true, w: .93, skin: 0xe3b18a, sleeve: 0 }, at: () => ({ x: (window.NCH ? NCH.x : HX) + 2.4, z: (window.NCH ? NCH.z : 150) + 2.6 }), vis: () => true },
    { id: 'marcos', n: 'Marcos', job: 'dueño del kiosco', sh: 0xd9a441, pa: 0x4a3322, ha: 0x3c2b1e, hat: 0, look: { hairStyle: 'short', w: 1.08, skin: 0xc98e66, sleeve: 0 }, at: kioskSouth, vis: () => true },
    { id: 'elena', n: 'Elena', job: 'dueña del Club Neón', sh: 0xff5a7a, pa: 0x2a1a3a, ha: 0x1a1a24, hat: 0, look: { hairStyle: 'long', fem: true, w: .93, skin: 0xc98e66, sleeve: 0 }, at: clubDoor, vis: () => true },
    { id: 'vera', n: 'Vera', job: 'médica en la clinica', sh: 0xd8e6ee, pa: 0x9aa7b8, ha: 0x8a4a1a, hat: 0, look: { hairStyle: 'pony', fem: true, w: .94, skin: 0xf1c9a5, sleeve: 1 }, at: () => ({ x: CLINIC.x, z: CLINIC.z + 2.6 }), vis: () => true },
    { id: 'alcaide', n: 'Sgto. Alcaide', job: 'sargento del puerto', sh: 0x1e3a8a, pa: 0x172554, ha: 0x555555, hat: 1, look: { hairStyle: 'buzz', w: 1.08, skin: 0xe3b18a, sleeve: 1 }, at: () => PORT.pos, vis: () => S.ch >= 5 || S.done },
    { id: 'ficha', n: 'Ficha', job: 'cobra deudas del puerto', sh: 0x2e2e2e, pa: 0x14141e, ha: 0x140d0b, hat: 0, look: { hairStyle: 'bald', w: 1.1, skin: 0xa06c4a, sleeve: 1 }, at: () => PORT.pos2, vis: () => S.ch >= 5 && S.ch <= 8 && !S.fichaOut }
  ];
  try { if (window.NC && NC.sto) NC.sto.cast = CAST; } catch (e) { }
  function unstick(p) { // saca un punto de cajas solidas (edificios, mobiliario)
    try {
      for (const b of boxes) {
        const dx = p.x - b.x, dz = p.z - b.z, ox = b.hw + .9 - Math.abs(dx), oz = b.hd + .9 - Math.abs(dz);
        if (ox > 0 && oz > 0) {
          if (ox < oz) p.x += dx > 0 ? ox : -ox;
          else p.z += dz > 0 ? oz : -oz;
        }
      }
    } catch (e) { }
    return p;
  }
  function spawnCast() {
    for (const c of CAST) {
      if (c.h) continue;
      if (!c.vis()) continue;
      const h = mkHuman(c.sh, c.pa, c.ha, c.hat, c.look);
      const pos = unstick(c.at());
      h.g.position.set(pos.x, gh(pos.x, pos.z), pos.z);
      scene.add(h.g);
      c.h = h;
    }
  }
  spawnCast();
  NC.hooks.pre.push(function (dt) {
    if (!running) return;
    spawnCast();
    for (const c of CAST) if (c.h) {
      const vis = c.vis();
      c.h.g.visible = vis;
      if (!vis) continue;
      c.t = (c.t || 0) + dt;
      c.h.g.position.y = gh(c.h.g.position.x, c.h.g.position.z) + Math.sin(c.t * 1.9) * .015;
      if (NC.dlg.open && NC.dlg.cast === c) {
        const px2 = P.foot ? P.fx : P.x, pz2 = P.foot ? P.fz : P.z;
        c.h.g.rotation.y = Math.atan2(px2 - c.h.g.position.x, pz2 - c.h.g.position.z);
      }
    }
  });

  // ============================================================
  // 4. ESCENARIO: puerto, muelle de Colina, dossier
  // ============================================================
  function mkBox(w, h, d, col, x, y, z, ry, rough, metal) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col, roughness: rough == null ? .8 : rough, metalness: metal || 0 }));
    m.position.set(x, y, z); if (ry) m.rotation.y = ry;
    m.castShadow = true; scene.add(m);
    return m;
  }
  {
    const CON = [0x9a4a2a, 0x2a6a9a, 0x6b8a3a, 0x8a8a8a];
    for (let k = 0; k < 6; k++) {
      const x = PORT.boxPos.x - 14 + (k % 3) * 12, z = PORT.boxPos.z - 10 - Math.floor(k / 3) * 7;
      mkBox(10, 5, 4.6, CON[k % 4], x, 2.6, z, k % 3 == 0 ? .03 : 0, .6, .35);
      boxes.push({ x, z, hw: 5, hd: 2.3 });
    }
    for (let k = 0; k < 2; k++) {
      const x = PORT.pos.x + 30 + k * 20, z = PORT.pos.z - 2;
      mkBox(1.2, 16, 1.2, 0xff8a3a, x, 8, z, 0, .5, .7);
      mkBox(17, 1.2, 2, 0xff8a3a, x + 7, 15, z, 0, .5, .7);
      boxes.push({ x, z, hw: .8, hd: .8 });
    }
    for (let k = 0; k < 4; k++) mkBox(3.4, .6, 2.6, 0x9a7a3a, PORT.pos.x + 14 + k * 4.6, .4, PORT.pos.z + 4, k, .9);
  }
  const WHITEBOX = { x: PORT.pos.x - 30, z: PORT.pos.z - 22 };
  mkBox(10, 5, 4.6, 0xd8d8d8, WHITEBOX.x, 2.6, WHITEBOX.z, .06, .55, .3);
  boxes.push({ x: WHITEBOX.x, z: WHITEBOX.z, hw: 5.2, hd: 2.4 });
  const dossier = new THREE.Mesh(new THREE.BoxGeometry(1.4, .35, 1), new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd24a, emissiveIntensity: .55, roughness: .4 }));
  dossier.position.set(CLINIC.x - 3.4, 1.5, CLINIC.z - 2.2);
  scene.add(dossier);
  dossier.visible = false;

  // muelle sobre la arena de Colina (dentro de los limites jugables)
  {
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: .85 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(PIER.x1 - PIER.x0, .2, PIER.z1 - PIER.z0), wood);
    deck.position.set(PIER.cx, PIER.y, PIER.cz);
    scene.add(deck);
    const rail = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: .7 });
    for (const s2 of [-1, 1]) {
      const rb = new THREE.Mesh(new THREE.BoxGeometry(PIER.x1 - PIER.x0, .1, .09), rail);
      rb.position.set(PIER.cx, PIER.y + .95, PIER.cz + s2 * (PIER.z1 - PIER.z0) / 2);
      scene.add(rb);
      for (let i = 0; i <= 5; i++) {
        const x = PIER.x0 + i * (PIER.x1 - PIER.x0) / 5;
        const pp = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 1, 6), rail);
        pp.position.set(x, PIER.y + .45, PIER.cz + s2 * (PIER.z1 - PIER.z0) / 2);
        scene.add(pp);
      }
      for (let i = 0; i <= 4; i++) {
        const x = PIER.x0 + i * (PIER.x1 - PIER.x0) / 4;
        const pil = new THREE.Mesh(new THREE.CylinderGeometry(.18, .22, 1.2, 8), rail);
        pil.position.set(x, PIER.y - .7, PIER.cz + s2 * (PIER.z1 - PIER.z0) / 2);
        scene.add(pil);
      }
    }
    // rampa de acceso por el oeste
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(4, .16, PIER.z1 - PIER.z0), wood);
    ramp.position.set(PIER.x0 - 1.9, .16, PIER.cz);
    ramp.rotation.z = .09;
    scene.add(ramp);
    // tablero con el nombre
    const bg = cv(256, 64), g2 = bg.getContext('2d');
    g2.fillStyle = '#2a1a3a'; g2.fillRect(0, 0, 256, 64);
    g2.font = 'bold 26px Georgia'; g2.fillStyle = '#ffd24a'; g2.fillText('MUELLE DE COLINA', 20, 40);
    const signM = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.6), new THREE.MeshBasicMaterial({ map: tex(bg), side: THREE.DoubleSide }));
    signM.position.set(PIER.cx, 4.4, PIER.cz);
    scene.add(signM);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 4.4, 6), rail);
    post.position.set(PIER.cx - 3.4, 2.2, PIER.cz);
    scene.add(post);

    // subir la altura del suelo en el tablon y la rampa
    const oldGh = window.gh || gh;
    window.gh = function (x, z) {
      if (x > PIER.x0 && x < PIER.x1 && z > PIER.z0 && z < PIER.z1) return PIER.y;
      if (x > PIER.x0 - 5 && x <= PIER.x0 && Math.abs(z - PIER.cz) < (PIER.z1 - PIER.z0) / 2) return PIER.y * Math.max(0, (x - (PIER.x0 - 4)) / (PIER.x0 - (PIER.x0 - 4)));
      return oldGh(x, z);
    };
  }

  // ============================================================
  // 5. INTERFAZ DE DIALOGO
  // ============================================================
  NC.css(`
    #dlg{position:absolute;left:50%;bottom:110px;transform:translateX(-50%);z-index:12;display:none;width:min(560px,92vw);
      background:linear-gradient(180deg,rgba(16,10,38,.95),rgba(10,7,26,.98));border:1px solid #27e6ff44;border-radius:14px;
      padding:14px 18px;color:#f4ecff;box-shadow:0 8px 40px #000b}
    #dlg h3{margin:0;font-size:15px;letter-spacing:.6px;color:#ffd24a}
    #dlg .who{display:flex;align-items:center;gap:9px;margin-bottom:8px}
    #dlg .toke{width:9px;height:9px;border-radius:50%;background:#ffd24a;box-shadow:0 0 10px #ffd24a}
    #dlg .sub{font-size:11px;opacity:.55;margin-left:auto}
    #dlg .tx{font-size:15px;line-height:1.45;min-height:42px}
    #dlg .ops{margin-top:10px;display:flex;flex-direction:column;gap:6px}
    #dlg .op{background:rgba(39,230,255,.08);border:1px solid #27e6ff2b;border-radius:9px;padding:7px 11px;font-size:13.5px;cursor:pointer;transition:background .12s,border-color .12s}
    #dlg .op:hover{background:rgba(39,230,255,.2);border-color:#27e6ff88}
    #dlg .op b{color:#27e6ff;margin-right:8px}
  `);
  const dlgEl = document.createElement('div'); dlgEl.id = 'dlg'; document.body.appendChild(dlgEl);
  NC.dlg = { open: false, cast: null, node: null, sub: '' };

  function dlgShow(c, node, sub) {
    dlgEl.style.display = 'block';
    NC.dlg.open = true; NC.dlg.cast = c; NC.dlg.node = node; NC.dlg.sub = sub || (c ? c.job : '');
    node.who = c ? c.n : 'Neon Coast';
    node.sub = NC.dlg.sub;
    renderDlg();
    try { if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock() } catch (e) { }
    try { timeScale = .35 } catch (e) { }
    try { for (const k in keys) keys[k] = 0 } catch (e) { }
    try { beep(540, .05, 'triangle', .02) } catch (e) { }
  }
  function dlgHide() {
    dlgEl.style.display = 'none';
    NC.dlg.open = false; NC.dlg.cast = null; NC.dlg.node = null;
    try { timeScale = 1 } catch (e) { }
  }
  function renderDlg() {
    const nd = NC.dlg.node; if (!nd) return;
    dlgEl.innerHTML = '<div class="who"><div class="toke"></div><h3>' + nd.who + '</h3><span class="sub">' + (nd.sub || '') + '</span></div>' +
      '<div class="tx">' + nd.t + '</div>' +
      '<div class="ops">' + (nd.ops || []).map((o, i) => '<div class="op" data-i="' + i + '"><b>' + (i + 1) + '</b>' + o.n + '</div>').join('') + '</div>';
  }
  function dlgChoice(i) {
    const nd = NC.dlg.node; if (!nd) { dlgHide(); return; }
    const op = (nd.ops || [])[i];
    if (!op) { dlgHide(); return; }
    dlgEl.style.display = 'none';
    if (op.go) { try { op.go() } catch (e) { NC.log('dlg go', e) } }
    if (op.to) { NC.dlg.node = op.to; op.to.who = nd.who; op.to.sub = nd.sub; dlgEl.style.display = 'block'; renderDlg(); }
    else dlgHide();
  }
  document.addEventListener('keydown', e => {
    if (!NC.dlg.open) return;
    const c = e.code;
    if (c === 'Escape') { e.preventDefault(); e.stopPropagation(); dlgHide(); return; }
    if (c === 'KeyE' || c === 'Enter') { e.preventDefault(); e.stopPropagation(); dlgChoice(0); return; }
    if (/^Digit[1-9]$/.test(c)) { e.preventDefault(); e.stopPropagation(); dlgChoice(+c[5] - 1); }
  }, true);
  dlgEl.addEventListener('click', e => {
    const b = e.target.closest('.op'); if (!b) return;
    e.stopPropagation();
    dlgChoice(+b.dataset.i);
  });

  // ============================================================
  // 6. HUD DEL MODULO
  // ============================================================
  NC.css(`
    #stoObj{position:absolute;right:14px;top:14px;z-index:6;display:none;pointer-events:none;
      background:rgba(16,10,38,.8);border:1px solid #ffd24a55;border-radius:12px;padding:9px 14px;color:#fff7ea;max-width:330px;font-size:12.5px}
    #stoObj b{color:#ffd24a;display:block;font-size:13px;letter-spacing:.4px}
    #stoObj span{opacity:.85;display:block;margin-top:2px}`);
  const objEl = document.createElement('div'); objEl.id = 'stoObj'; document.body.appendChild(objEl);
  const objLines = [
    null,
    { t: 'Habla con Marcos en el kiosco de Fleming Sur', h: 'Sigue la estrella dorada en el mapa (M)' },
    { t: 'Recorrido de encargos: 3 puntos en la costa', h: 'Taller del este · bar Neón · hotel de Colina' },
    { t: 'Vuelve con Marcos al terminar el recorrido', h: 'Cobra el pago del kiosco' },
    { t: 'De noche: busca a Elena en la puerta del Club Neón', h: 'Duerme en un hotel o en casa si la hora no llega' },
    { t: 'Ve a la clinica: Vera te encarga el dossier', h: 'Dossier dorado junto al mostrador' },
    { t: 'Investiga el contenedor blanco del Puerto Viejo', h: 'Aguanta la mirada · actúa con calma' },
    { t: 'Lleva los papeles a Alcaide o a Elena', h: 'Tu decisión cambia el desenlace' },
    { t: 'El muelle de Colina, de madrugada', h: 'El número desconocido te espera de noche' },
    { t: 'Historia completa', h: 'Quedan acontecimientos y barrios por conocer' }
  ];
  function chip() {
    const l = S.ch === 0 ? { t: 'Aurora y el contestador te esperan cerca de tu casa', h: 'La historia comienza al hablar con tu hermana' } : (objLines[S.ch] || objLines[9]);
    if (chip.k === l.t) return; chip.k = l.t;
    objEl.style.display = 'block';
    objEl.innerHTML = '<b>HISTORIA · ' + l.t + '</b><span>' + l.h + '</span>';
  }

  // ============================================================
  // 7. CAPITULOS
  // ============================================================
  const pins = NC.sto.pins;
  function setPin(x, z, color, pulse, r, name) {
    pins.length = 0;
    if (x !== undefined) pins.push({ x, z, color: color || '#ffd24a', type: 'star', pulse: !!pulse, r, name });
  }
  function addPin(x, z, color, type, name) { pins.push({ x, z, color: color || '#27e6ff', type: type || 'dot', r: 12, name }); }
  function chapterPin() {
    pins.length = 0;
    const cc = S.ch;
    if (cc == 1 || cc == 3) { const q = CAST[1].at(); setPin(q.x, q.z, '#ffd24a', true, 22, 'Kiosco de Marcos'); }
    else if (cc == 2) { setPin(); for (const er of ERS) if (!er.done) addPin(er.x, er.z, '#ffd24a', 'dot', er.n); }
    else if (cc == 4) { const q = CAST[2].at(); setPin(q.x, q.z, '#ff5aef', true, 22, 'Club Neón · Elena'); }
    else if (cc == 5) {
      if (!S.flags.hasDossier) setPin(dossier.position.x, dossier.position.z, '#ffd24a', true, 14, 'Dossier');
      else { const q = CAST[3].at(); setPin(q.x, q.z, '#3dff9a', true, 20, 'Clínica · Vera') }
    }
    else if (cc == 6) { setPin(WHITEBOX.x, WHITEBOX.z, '#3dff9a', true, 18, 'El contenedor'); }
    else if (cc == 7) {
      const qA = CAST[4].at(), qE = CAST[2].at();
      if (S.side == 'elena') setPin(qE.x, qE.z, '#ff5aef', true, 22, 'Club Neón · Elena');
      else if (S.side == 'alcaide') setPin(qA.x, qA.z, '#9a6bff', true, 22, 'Sgto. Alcaide');
      else { setPin(); addPin(qA.x, qA.z, '#9a6bff', 'sq', 'Sgto. Alcaide'); addPin(qE.x, qE.z, '#ff5aef', 'sq', 'Club Neón · Elena'); }
    }
    else if (cc == 8) { setPin(PIER.cx, PIER.cz, '#27e6ff', true, 24, 'Muelle de Colina'); }
    else setPin();
    if (EV.market.on) addPin(EV.market.x, EV.market.z, '#ff5a7a', 'dot', 'Mercadillo ambulante');
    if (EV.black.active) addPin(EV.black.x, EV.black.z, '#9a6bff', 'sq', 'Apagón del barrio');
  }

  function near(list, x, z, fb) {
    let best = null, bd = 1e9;
    try { for (const q of list) { const d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; best = q; } } } catch (e) { }
    return best || fb;
  }
  const ERS = [
    { n: 'Taller del este', x: near(carShops, 400, 0, { x: 300, z: 0 }).x, z: near(carShops, 400, 0, { x: 300, z: 0 }).z, r: 9, done: false },
    { n: 'Bar Neón del norte', x: near(bars, 0, -400, { x: 0, z: -300 }).x, z: near(bars, 0, -400, { x: 0, z: -300 }).z, r: 9, done: false },
    { n: 'Hotel de Colina', x: near(hotels, 380, 160, { x: 220, z: 60 }).x, z: near(hotels, 380, 160, { x: 220, z: 60 }).z, r: 10, done: false }
  ];

  function advance(to) {
    S.ch = to; saveStory(true);
    NC.log('historia: capitulo -> ' + to);
    chip(); chapterPin();
    const fr = ['EMPIEZA LA HISTORIA', 'ENCARGO ACEPTADO', 'TRES PARADAS EN LA COSTA', 'EL KIOSCO PAGA',
      'ALGO HIERVE DE NOCHE', 'INSTRUCCIONES DE VERA', 'EL CONTENEDOR', 'DECISIÓN', 'CITA EN EL MUELLE', 'HISTORIA COMPLETA'][to];
    if (fr) pop(fr);
  }

  let introShown = false;
  window.__stoIntro = () => { introShown = true; };

  // ============================================================
  // 8. EVENTOS DE BARRIO
  // ============================================================
  const EV = {
    t: 60,
    market: { on: false, x: 0, z: 0, group: null, boxes: [], spots: [], ttl: 0 },
    black: { active: false, x: 0, z: 0, ttl: 0 }
  };
  function marketSet(on) {
    const M = EV.market;
    if (on && !M.on) {
      M.on = true; M.spots = []; M.boxes = []; M.group = [];
      const cols = [0xff5a7a, 0x27e6ff, 0xffd24a];
      for (let k = 0; k < 3; k++) {
        const g = new THREE.Group();
        const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, .22, 3), new THREE.MeshStandardMaterial({ color: cols[k], roughness: .5 }));
        top.position.set(0, 2.4, 0); g.add(top);
        for (const s2 of [-1, 1]) {
          const st = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 2.5, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a22, metalness: .5, roughness: .4 }));
          st.position.set(s2 * 2.15, 1.15, 0); g.add(st);
        }
        const tb = new THREE.Mesh(new THREE.BoxGeometry(4, .9, 1.1), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: .8 })); tb.position.set(0, .85, .45); g.add(tb);
        const c1 = new THREE.Mesh(new THREE.BoxGeometry(.8, .6, .8), new THREE.MeshStandardMaterial({ color: 0x8a5a2a })); c1.position.set(-1.2, 1.45, .45); g.add(c1);
        const c2 = c1.clone(); c2.position.x = 1.05; c2.position.z = .1; g.add(c2);
        const pos = unstick({ x: -34 + k * 22, z: 252 + (k % 2) * 8 });
        g.position.set(pos.x, gh(pos.x, pos.z), pos.z); g.rotation.y = -.3 + k * .3;
        scene.add(g);
        M.group.push(g);
        M.spots.push(pos);
        const b = { x: pos.x, z: pos.z, hw: 2.4, hd: 1.4 };
        boxes.push(b); M.boxes.push(b);
      }
      M.x = M.spots[1].x; M.z = M.spots[1].z;
      M.ttl = 200;
      pop('MERCADO AMBULANTE EN FLEMING SUR');
      toast('Puestos de comida · E para bocadillos $6');
      try { beep(880, .09); setTimeout(() => beep(660, .09), 120) } catch (e) { }
    } else if (!on && M.on) {
      M.on = false;
      for (const g of M.group) scene.remove(g);
      for (const b of M.boxes) { const i = boxes.indexOf(b); if (i >= 0) boxes.splice(i, 1) }
      M.group = M.spots = M.boxes = [];
    }
  }
  function marketBuy() {
    if (money < 6) { toast('Bocadillo $6 · no te alcanza hoy'); return; }
    money -= 6; P.hp = Math.min(100, P.hp + 16);
    toast('Bocadillo del mercado: +16 salud');
    try { beep(620, .07) } catch (e) { }
  }
  function blackSet(on) {
    const B = EV.black;
    if (on && !B.active) {
      const opts = [CAST[2].at(), kioskSouth(), near(hotels, 200, 300, { x: 100, z: 100 }), PORT.pos];
      const q = opts[Math.floor(rnd(0, opts.length))];
      B.active = true; B.x = q.x; B.z = q.z; B.ttl = 70;
      try { for (const m2 of bmats) if (m2) m2.emissiveIntensity = 0 } catch (e) { }
      pop('¡APAGÓN EN ' + NC.sto.zone(q.x, q.z).toUpperCase() + '!');
      try { beep(70, .55, 'sawtooth', .05) } catch (e) { }
    } else if (!on && B.active) {
      B.active = false;
      try { paintSky() } catch (e) { }
      toast('Las farolas vuelven a brillar');
    }
  }
  NC.hooks.pre.push(function (dt) {
    if (!running || paused || P.dying) return;
    EV.t -= dt;
    if (EV.market.on) { EV.market.ttl -= dt; if (EV.market.ttl <= 0) marketSet(false) }
    if (EV.black.active) { EV.black.ttl -= dt; if (EV.black.ttl <= 0) blackSet(false) }
    if (EV.t <= 0) {
      EV.t = rnd(240, 380);
      if (!EV.market.on && !EV.black.active) {
        const r2 = Math.random();
        if (r2 < .5) marketSet(true);
        else if (r2 < .85) blackSet(true);
        else {
          toast('Piratas del asfalto aceleran por ' + NC.sto.zone(P.x || 0, P.z || 0).toLowerCase());
          try { beep(180, .3, 'sawtooth', .028) } catch (e) { }
        }
      }
    }
  });
  addEventListener('blur', () => { try { if (EV.black.active) blackSet(false) } catch (e) { } });

  // balizas continuas
  NC.hooks.pre.push(function (dt) {
    if (!running || paused || P.dying) return;
    chip();
    if (frame % 120 === 0) chapterPin();
    if (!introShown && S.ch === 0 && started) {
      introShown = true;
      setTimeout(introCall, 1600);
    }
    if (S.ch == 2) {
      const px2 = P.foot ? P.fx : P.x, pz2 = P.foot ? P.fz : P.z;
      for (const er of ERS) if (!er.done && Math.hypot(px2 - er.x, pz2 - er.z) < er.r) {
        er.done = true; money += 120;
        toast('Recado listo: ' + er.n + ' +$120');
        try { beep(660, .08) } catch (e) { }
        if (ERS.every(q => q.done)) toast('Todos los encargos hechos: vuelve con Marcos');
        chapterPin();
      }
    }
  });

  // ============================================================
  // 9. CONVERSACIONES
  // ============================================================
  function addMoney(m) { money += m; try { pop('+$' + m) } catch (e2) { } }
  const RUMORES = [
    'Dicen que Alcaide volvió al buen camino cuando quiso cerrar la caja del puerto.',
    'Por el muelle de Colina se ve el amanecer mejor de toda la costa.',
    'Aurora intenta pagar el seguro de mamá... con Ficha acechando no duerme.',
    'El club Neón paga bien de noche, y el DJ pincha hasta el alba.',
    'Un mercado ambulante campa a veces en Fleming: fritas y bocadillos baratos.',
    'Los muros de Betica se pintan solos: dicciones de la vieja ciudad.'
  ];
  function rumor() { return RUMORES[Math.floor(Math.random() * RUMORES.length)] }
  function dAmb(mid) {
    const zn = NC.sto.zone(P.foot ? P.fx : (P.x || 0), P.foot ? P.fz : (P.z || 0));
    let line;
    if (mid === 'marcos') line = 'El kiosco huele a caramelo y tinta. Bienvenido a Fleming.';
    else if (mid === 'elena') line = 'La puerta del clubLate con luces. De noche hago magia con la marea.';
    else if (mid === 'vera') line = 'La clinica David firma la terapia del barrio. Eclesial.';
    else if (mid === 'alcaide') line = 'El puerto calla y pesa: al mal año, dormir temprano.';
    else if (mid === 'ficha') line = 'No me gusta la gente curiosa. Cada cosa pesa su propio oro...';
    else if (mid === 'aurora') line = 'La casa está como siempre, caliente y un poco ruidosa. Bienvenid*';
    else line = 'El barrio de ' + zn + ' huele a sal, neón y mañanas largas.';
    return { t: line + ' ' + rumor(), ops: [{ n: 'Gracias', go: () => { } }, { n: 'Adiós', go: () => { } }] };
  }
  function inCura() {
    if (P.hp <= 85 && money >= 40) { money -= 40; P.hp = 100; P.drunk = 0; toast('Consulta $40 · salud al máximo'); try { beep(720, .1) } catch (e2) { } }
    else if (P.hp > 85) toast('Estás sano: consulta para heridos');
    else toast('El médico cuesta $40 · no te alcanza');
  }
  function introCall() {
    dlgShow({ n: 'Contestador' },
      { t: '"Buenas... soy Marcos, del kiosco sur de Fleming. Te dejo un recado con tu nombre. Si te va la paga, pasea por aquí."', ops: [{ n: 'Ir con Marcos', go: () => { advance(1); toast('Mapa grande: pulsa M o Tab para la rueda de armas'); } }] }, 'llamada perdida');
  }
  function dMarcos() {
    if (S.ch == 1) return {
      t: 'Ah, llegó el que responde marcas. Tengo tres recados por la costa: taller del este, el bar Neón y el hotel de Colina. ¿Los cargas?',
      ops: [
        { n: 'Acepto el encargo', go: () => { advance(2); toast('3 paradas: +$120 cada una · mapa M para seguirlas') } },
        { n: '¿Cuánto pagan?', to: { t: 'Ciento veinte por parada y una paga final de 400. La marea te paga rápido, yo más rápido.', ops: [{ n: 'Trato hecho', go: () => advance(2) }] } }
      ]
    };
    if (S.ch == 2) {
      const n2 = ERS.filter(q => q.done).length;
      if (n2 == 3) return {
        t: 'Recorrido limpio: además, la paga del kiosco. Bienvenido a la marea de la costa.',
        ops: [{ n: 'Cobrar $400', go: () => { addMoney(400); advance(4); toast('Elena, dueña del club, te busca de noche') } }]
      };
      return { t: 'Te faltan ' + (3 - n2) + ' parada(s). El taller está al este: engine-grills del asfalto.', ops: [{ n: 'En camino', go: () => { } }] };
    }
    if (S.ch == 4) return { t: 'Esto del puerto te va a pasar factura... De noche se destapan las cosas. Busca a Elena si te interesa el agua turbia.', ops: [{ n: 'De acuerdo', go: () => { } }] };
    if (S.done) return { t: 'La costa respira: los papiros callan. Hste aquí te deseo, menda.', ops: [{ n: 'Gracias por todo', go: () => { } }] };
    return dAmb('marcos');
  }
  function dElena() {
    if (S.ch == 4) return {
      t: 'Sabía de ti antes de verte. Hay historias del puerto que la noche paga: copas y papeles.',
      ops: [
        { n: '¿Qué historia?', to: { t: 'Una deuda de dos años, un seguro del puerto y un sargento mohando. Si quieres saber del dolor, habla con Vera en la clinica. Aquí acabo la copa.', ops: [{ n: 'A la clinica', go: () => advance(5) }] } },
        { n: '¿Un trabajo?', to: { t: 'Con la copa y con la caña. Vuelve cuando la historia del puerto esté despejada.', ops: [{ n: 'Aquí estaré', go: () => { } }] } }
      ]
    };
    if (S.ch == 7 && !S.side) return {
      t: 'Los papeles del puerto, en mis manos: el seguro se cierra y la marea respira. ¿Vamos de la mano en esto?',
      ops: [
        { n: 'Contamos conmigo (Elena)', go: () => { S.side = 'elena'; saveStory(true); advance(8); toast('Elena mueve su peso para cerrar el puerto'); } },
        { n: 'Prefiero hablar con Alcaide', to: { t: 'Está entre los contenedores, al norte. Si es tu decisión, que sea tuya: no la bruma.', ops: [{ n: 'Entiendo', go: () => { } }] } }
      ]
    };
    if (S.ch == 7 && S.side == 'elena') return {
      t: 'Los papeles del puerto me interesan... el seguro, la bruma. Con claves las cosas van más suaves.',
      ops: [{ n: 'Sigo el plan', go: () => { advance(8); toast('El muelle de Colina, de madrugada: duérmete y vayas') } }]
    };
    if (S.done) return { t: 'La mesa del club siempre tiene una copa si vuelves: la marea no te olvida.', ops: [{ n: 'Un placer', go: () => { } }] };
    return dAmb('elena');
  }
  function dVera() {
    if (S.ch == 5 && !S.flags.hasDossier) return { t: 'El dossier del seguro duerme en mi mostrador, brilla junto a la lámpara. Si lo lees, entenderás por qué mamá ya no recibe la carta', ops: [{ n: 'Voy por el dossier', go: () => { dossier.visible = (S.ch == 5 && !S.flags.hasDossier); } }, { n: '¿De qué trata?', to: { t: 'Un año de pagos y ninguna respuesta: el seguro del puerto cierra las puertas por fins. Alguien tapa más que la tormenta.', ops: [{ n: 'Lo trae para mi', go: () => { dossier.visible = true; } }] } }] };
    if (S.ch == 5 && S.flags.hasDossier) return {
      t: 'El dossier: cuenta de pagos del seguro, cierre arrastrado... y el nombre del barco que cargó hace dos años. Investiga el contenedor blanco del puerto.',
      ops: [{ n: 'Investigar el puerto', go: () => { advance(6); dossier.visible = false; } }]
    };
    if (S.ch >= 6) return { t: 'Si vuelves rojo o mareado del puerto, te dejo sana por $40. El seguro ya hay... pero el puerto es una herida abierta.', ops: [{ n: 'Curame ($40)', go: () => { inCura(); } }, { n: 'Gracias', go: () => { } }] };
    return dAmb('vera');
  }
  function dAlcaide() {
    if (S.ch == 7 && !S.side) return {
      t: 'Un civil suelto con papeles del puerto. ¿Los tratas por conciencia, o por el dinero de la bruma?',
      ops: [
        { n: 'Te los doy (a favor de la ley)', go: () => { S.side = 'alcaide'; saveStory(true); advance(8); toast('Alcaide archiva el informe del puerto'); } },
        { n: 'Quiero cambiar por más', to: { t: 'Este puerto no se compra lunes con dinero: cuando lo decidas soy por debajo de la grua', ops: [{ n: 'Entiendo', go: () => { } }] } }
      ]
    };
    if (S.done) return { t: 'El puerto respira mejor con las papeles en el registro... una firma cierra la boca de todos.', ops: [{ n: 'Ahora entiendo', go: () => { } }] };
    return dAmb('alcaide');
  }
  function dFicha() {
    if (S.ch >= 5 && S.ch <= 8 && !S.fichaOut) return {
      t: 'Yo cobro la deuda del puerto: las mamás no devuelven. Después de gastar la marea de la copa, quiero hablarle del seguro.',
      ops: [
        { n: 'Dejarle la mitad (–$600)', go: () => { const m2 = Math.min(600, money); money -= m2; S.fichaOut = true; saveStory(true); toast('Ficha cobra la mitad y se pierde en la bruma') } },
        { n: 'La deuda es mentira: pelea', go: () => { S.fichaOut = true; saveStory(true); crime(.6); scare(24); P.hp = Math.max(8, P.hp - 18); try { hurt(6) } catch (e2) { } try { beep(140, .3, 'sawtooth', .05) } catch (e2) { } pop('FICHA, DERRIBADO'); toast('Pelea sucia · la bruma se lo lleva'); } }
      ]
    };
    return dAmb('ficha');
  }
  function dAurora() {
    if (S.ch >= 1 && S.ch <= 3) return { t: '¿Vas con el recado del kiosco? Marcos presume pero es honesto. Y cuídate del seguro: congela todo lo que puedas.', ops: [{ n: 'Gracias, Aurora', go: () => { } }, { n: '¿Sabes algo del puerto?', to: { t: 'El seguro de mamá dejó de pagar hace dos años. Alguien tapó la caja de una grúa del puerto. Alcaide dice que no sabe nada... pero su huella está en el registro', ops: [{ n: 'Interesante', go: () => { } }] } }] };
    if (S.ch >= 4 && S.ch <= 8) return { t: 'Deja que hable con la coast. El seguro de mamá... Ficha arriba al puerto trasbra siempre. Cuando cierres esto, ven a cenar.', ops: [{ n: 'Prometido', go: () => { } }] };
    if (S.done) return { t: 'La casa es tuya y la marea también. Hemos vuelto a tener la voz de mamá en el ventanal... gracias a ti.', ops: [{ n: 'Abrazar (mejora la casa)', go: () => epilogo() }, { n: 'Yo cuido de ti', go: () => { } }] };
    return dAmb('aurora');
  }
  function epilogo() {
    try { P.apt = 1 } catch (e2) { }
    money += S.side == 'alcaide' ? 600 : 1500;
    pop(S.side == 'alcaide' ? 'EL PUERTO LIMPIO' : 'LA MAREA CALLA');
    toast(P.apt ? 'Casa con renta · +$600 del seguro que vuelve' : 'Casa con renta y la deuda cancelada');
    S.done = true; saveStory(true);
    chip(); chapterPin();
  }
  function finalePier() {
    const side = S.side == 'alcaide' ? 'alcaide' : 'elena';
    const who = side == 'alcaide' ? 'Sgto. Alcaide' : 'La delegada del puerto';
    dlgShow({ n: who }, {
      t: side == 'alcaide'
        ? 'El puerto cerró con tu informe. Firmó sin testigos: la caja del seguro vuelve a la ciudad.'
        : 'Baja un coche negro. "Tengo el seguro en la bruma... y tu nombre donde callar no hace daño." Firma, y esta historia se acaba.',
      ops: [
        { n: 'Firmar y cerrar', go: () => {
          S.done = true; S.fichaOut = true;
          addMoney(side == 'alcaide' ? 900 : 1500);
          saveStory(true); advance(9); chip(); chapterPin();
          pop(side == 'alcaide' ? 'EL PUERTO LIMPIO' : 'LA MAREA CALLA');
          dlgShow({ n: 'Neon Coast' }, { t: 'El muelle respira. La casa espera: Aurora cocina. Sigue la marea: hoteles, mercados, apagones... y el club Neón siempre abierto.', ops: [{ n: 'Aquí empezamos', go: () => { } }] }, 'epilogo');
        } }
      ]
    }, 'Muelle de Colina · madrugada');
  }

  // ============================================================
  // 10. ENGANCHE DE INTERACT
  // ============================================================
  const _it = window.interact;
  window.interact = function () {
    try {
      if (NC.dlg.open) { dlgChoice(0); return; }
      if (P.wanted > 1.4) return _it();
      const px2 = P.foot ? P.fx : P.x, pz2 = P.foot ? P.fz : P.z;
      // dossier de la clinica (prioritario sobre la conversacion con Vera)
      if (S.ch == 5 && !S.flags.hasDossier && Math.hypot(px2 - dossier.position.x, pz2 - dossier.position.z) < 3.4) {
        S.flags.hasDossier = true; dossier.visible = false; saveStory(true);
        pop('DOSSIER COGIDO');
        chip(); chapterPin();
        toast('El dossier revela las cuentas del seguro del puerto');
        try { beep(700, .12) } catch (e2) { }
        return;
      }
      // actores de la historia
      let nc3 = null, bd = 1e9;
      for (const c of CAST) {
        if (!c.h || !c.h.g.visible) continue;
        const q = c.h.g.position;
        const d = Math.hypot(px2 - q.x, pz2 - q.z);
        if (d < bd) { bd = d; nc3 = c; }
      }
      if (nc3 && bd < 3.2) {
        const fnMap = { marcos: dMarcos, elena: dElena, vera: dVera, alcaide: dAlcaide, ficha: dFicha, aurora: dAurora };
        const nd = (fnMap[nc3.id] || (() => dAmb(nc3.id)))();
        S.rel[nc3.n] = (S.rel[nc3.n] || 0) + 1;
        NC.log('dialogo con ' + nc3.id + ' (cap ' + S.ch + ')');
        dlgShow(nc3, nd);
        return;
      }
      if (P.foot && frame % 60 == 0) NC.log('story: sin actor cerca (' + Math.round(px2) + ',' + Math.round(pz2) + ')');
      // contenedor blanco del puerto
      if (S.ch == 6 && !S.flags.hasPapeles && Math.hypot(px2 - WHITEBOX.x, pz2 - WHITEBOX.z) < 6.5) {
        S.flags.hasPapeles = true; saveStory(true); advance(7);
        crime(.5);
        chip(); chapterPin();
        toast('Papeles en mano · el puerto te ha visto');
        try { beep(300, .2, 'sawtooth', .04) } catch (e2) { }
        return;
      }
      // encuentro final en el muelle
      if (S.ch == 8 && Math.hypot(px2 - PIER.cx, pz2 - PIER.cz) < 12) {
        if (!isNight()) {
          toast('El muelle está vacío de día · ven de madrugada (duerme en un hotel o en casa)');
          dlgShow({ n: 'El muelle' }, { t: 'Faroles y sal. Nada por ahora... el teléfono reservado llega con la noche.', ops: [{ n: 'Volver de noche', go: () => { } }] }, 'muelle');
          return;
        }
        finalePier();
        return;
      }
      // mercado ambulante
      if (EV.market.on && P.foot) for (const s2 of EV.market.spots) {
        if (Math.hypot(px2 - s2.x, pz2 - s2.z) < 3.6) { marketBuy(); return; }
      }
    } catch (err) { NC.log('story interact', err); }
    return _it();
  };

  if (S.ch === 0) chip();
  // sonda de depuracion (pruebas y soporte)
  // datos para el mapa: solo lo que la historia ya considera visible o descubrible
  NC.sto.actors = function () {
    return CAST.filter(c => { try { return c.vis(); } catch (e) { return false; } })
      .map(c => { const p = c.at(); return { id: c.id, n: c.n, job: c.job, x: p.x, z: p.z }; });
  };
  NC.sto.places = function () {
    // el puerto y el muelle no salen en el mapa hasta que el jugador pasa cerca (descubrimiento) o la historia los toca
    return [
      { id: 'port', n: 'Puerto Viejo · muelle de carga', sub: 'Dársena del puerto', x: PORT.pos.x, z: PORT.pos.z, discover: !(S.ch >= 5 || S.done) },
      { id: 'pier', n: 'Muelle de Colina', sub: 'Pasarela sobre el mar', x: PIER.cx, z: PIER.cz, discover: !(S.ch >= 8 || S.done) }
    ];
  };
  NC.sto.debug = {
    S: function () { return S; },
    reset: function () {
      S = { v: 1, ch: 0, side: null, flags: {}, rel: {}, done: false };
      saveStory(true); chip(); chapterPin();
      NC.log('historia reiniciada (debug)');
    },
    cast: function () { return CAST.map(c => ({ id: c.id, at: c.at(), vis: c.vis(), have: !!c.h, ok: c.h ? c.h.g.visible : null, x: c.h ? Math.round(c.h.g.position.x) : null, z: c.h ? Math.round(c.h.g.position.z) : null })); },
    ev: function () { return { market: EV.market.on, black: EV.black.active }; }
  };
  NC.log('historia lista · capitulo ' + S.ch + ' / 8 · barrios y eventos activos');
})();
