/* Neon Coast - spray: dibujo libre de graffiti sobre superficies reales del mundo.
   Tecnica: cinta de triangulos construida en el punto de impacto (offset sobre la normal),
   en una unica malla con color por vertice -> sin z-fighting, escala libre y persistible.
   Raycast desde la mira (o desde el raton si el puntero esta libre) contra las superficies
   pintables: fachadas, muros, Persianas, puertas, aceras y exteriores.                    */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;
  const NC = window.NC;
  const R2 = (a, b) => a + Math.random() * (b - a);

  // ---------- estado ----------
  const SP = {
    equipado: false, pintando: false, cap: 100, max: 100,
    color: 0x27e6ff, ancho: 1, puntos: [], buffer: null,
    mesh: null, geo: null, col: null, pos: null, nverts: 0, maxVerts: 24000,
    最后Trazo: null, Trazos: [], contador: 0, colorPreferido: 0
  };
  const ANCHOS = { 1: 0.055, 2: 0.12, 3: 0.26 };
  const KEY = 'ncGraffiti';

  // ---------- materiales que NO admiten pintura ----------
  const noPintar = new Set();
  try { NC.noPintar = NC.noPintar || []; } catch (e) { }
  function registrarNoPintar(m) { if (m) { noPintar.add(m); try { NC.noPintar.push(m); } catch (e) { } } }
  try { if (typeof HMAT !== 'undefined') registrarNoPintar(HMAT); } catch (e) { }
  try { if (typeof HMAT3 !== 'undefined') registrarNoPintar(HMAT3); } catch (e) { }
  try { if (typeof MB !== 'undefined') registrarNoPintar(MB); } catch (e) { }

  // ---------- superficies pintables (proxies ligeros: el raycast contra la ciudad fusionada
  // seria lentisimo; estas cajas coinciden con las fachadas reales) ----------
  let pintables = [];
  const proxyMat = new T.MeshBasicMaterial({ visible: false });
  function proxy(x, y, z, w, h, d, rot) {
    const g = new T.BoxGeometry(w, h, d);
    if (rot) g.rotateY(rot);
    const m = new T.Mesh(g, proxyMat);
    m.position.set(x, y, z); m.updateMatrixWorld(true);
    pintables.push(m); return m;
  }
  function scoopPintables() {
    pintables = [];
    proxy(0, -.5, 0, 2400, 1, 2400);
    try { (typeof BLD !== 'undefined') && BLD.forEach(b => proxy(b.x, b.h / 2 + .35, b.z, b.w, b.h, b.d, b.rot)); } catch (e) { }
    try { shops.forEach(s => proxy(s.x, 2.6, s.z - 7.6, 16, 5.2, 12)); } catch (e) { }
    try { hotels.forEach(s => proxy(s.x, 3.5, s.z - 8, 26, 7, 16)); } catch (e) { }
    try { bars.forEach(s => proxy(s.x, 1.7, s.z - 2, 7, 3.4, 5)); } catch (e) { }
    try { carShops.forEach(s => proxy(s.x - 5, 2.6, s.z - 9, 20, 5.2, 12)); } catch (e) { }
    try { if (window.FACTORY) proxy(FACTORY.x, 4.5, FACTORY.z, 30, 9, 24); } catch (e) { }
    try { proxy(EXT + 30, 2.25, -150, 16, 4.5, 12); } catch (e) { }
    try { proxy(EXT + 30, 2.25, 150, 16, 4.5, 12); } catch (e) { }
    try { if (typeof CLINIC !== 'undefined') proxy(CLINIC.x, 1.7, CLINIC.z, 12, 3.4, 8); } catch (e) { }
    try { (typeof boxes !== 'undefined') && boxes.forEach(b => { if (b.hw > 1.2 && b.hd > 1.2 && b.hw < 12) proxy(b.x, 1, b.z, b.hw * 2, 2, b.hd * 2); }); } catch (e) { }
  }

  // ---------- la malla donde vive toda la pintura ----------
  function crearMalla() {
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(SP.maxVerts * 3);
    const col = new Float32Array(SP.maxVerts * 3);
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setDrawRange(0, 0);
    const mat = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, transparent: true, opacity: .96, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const mesh = new T.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    scene.add(mesh);
    SP.mesh = mesh; SP.geo = geo; SP.pos = pos; SP.col = col;
  }

  // ---------- adding a quad of the ribbon ----------
  function anadirSegmento(a, b, ancho, colorHex) {
    if (SP.nverts + 6 > SP.maxVerts) return false;
    const dir = new T.Vector3().subVectors(b.p, a.p);
    const len = dir.length();
    if (len < 0.004) return false;
    dir.normalize();
    const n = a.n.clone();
    // lateral: perpendicular a la direccion del trazo dentro de la superficie
    let side = new T.Vector3().crossVectors(n, dir);
    if (side.lengthSq() < 1e-6) side = new T.Vector3().crossVectors(dir, new T.Vector3(0, 1, 0));
    if (side.lengthSq() < 1e-6) side = new T.Vector3(1, 0, 0);
    side.normalize().multiplyScalar(ancho * .5);
    const up = new T.Vector3().crossVectors(side, dir).normalize();
    const c = new T.Color(colorHex);
    const verts = [
      a.p.clone().add(side), b.p.clone().add(side),
      a.p.clone().sub(side), b.p.clone().sub(side)
    ];
    const base = SP.nverts;
    const set = (i, v) => { SP.pos[(base + i) * 3] = v.x; SP.pos[(base + i) * 3 + 1] = v.y; SP.pos[(base + i) * 3 + 2] = v.z; SP.col[(base + i) * 3] = c.r; SP.col[(base + i) * 3 + 1] = c.g; SP.col[(base + i) * 3 + 2] = c.b; };
    set(0, verts[0]); set(1, verts[1]); set(2, verts[2]);
    set(3, verts[2]); set(4, verts[1]); set(5, verts[3]);
    SP.nverts += 6;
    SP.geo.setDrawRange(0, SP.nverts);
    SP.geo.attributes.position.needsUpdate = true;
    SP.geo.attributes.color.needsUpdate = true;
    SP.geo.computeBoundingSphere && SP.geo.computeBoundingSphere();
    return true;
  }

  // ---------- raycast ----------
  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  let hitPoint = null, hitNormal = null, hitObj = null;
  function apuntar() {
    try {
      if (!pintables.length) return false;
      if (document.pointerLockElement) {
        ndc.set(0, 0);                                   // con raton capturado: la mira
      } else {
        const m = document.getElementById('mouse');
        ndc.set((m ? m.x / window.innerWidth : .5) * 2 - 1, -(m ? m.y / window.innerHeight : .5) * 2 + 1);
      }
      ray.setFromCamera(ndc, camera);
      ray.far = 60;
      const hits = ray.intersectObjects(pintables, false);
      if (!hits.length) { hitPoint = null; return false; }
      const h = hits[0];
      if (!h.face) { hitPoint = null; return false; }
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
      hitPoint = h.point.clone().add(n.clone().multiplyScalar(0.022));   // pegado a la superficie
      hitNormal = n; hitObj = h.object;
      return true;
    } catch (e) { hitPoint = null; return false; }
  }

  // ---------- consumo de pintura ----------
  function consumir(dist, ancho) {
    const uso = dist * (0.9 + ancho * 6) * 2.2 + 0.012;   // distancia + grosor
    SP.cap = Math.max(0, SP.cap - uso);
    actualizarBarra();
    if (SP.cap <= 0 && SP.pintando) { soltar(); toast('Bote vacío: compra una recarga'); beep(120, .15, 'square', .04); }
  }

  // ---------- bote en la mano ----------
  let bote = null;
  function crearBote() {
    const g = new T.Group();
    const cuerpo = new T.Mesh(new T.CylinderGeometry(.045, .045, .16, 12), new T.MeshStandardMaterial({ color: 0xc9c9d2, roughness: .4, metalness: .5 }));
    cuerpo.position.y = .08; g.add(cuerpo);
    const tapa = new T.Mesh(new T.CylinderGeometry(.05, .05, .03, 12), new T.MeshStandardMaterial({ color: 0x2a2a32, roughness: .6 }));
    tapa.position.y = .17; g.add(tapa);
    const color = new T.Mesh(new T.CylinderGeometry(.046, .046, .04, 12), new T.MeshBasicMaterial({ color: SP.color }));
    color.position.y = .04; g.add(color);
    g.userData.color = color;
    g.visible = false;
    scene.add(g);
    bote = g;
    return g;
  }
  function colorBote() { try { if (bote && bote.userData.color) bote.userData.color.material.color.setHex(SP.color); } catch (e) { } }

  // ---------- particulas de aerosol ----------
  let sprayPts = null, sprayState = [];
  function crearAerosol() {
    const N = 120;
    const arr = new Float32Array(N * 3);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(arr, 3));
    const m = new T.PointsMaterial({ color: 0xdfe6ff, size: .06, transparent: true, opacity: .5, depthWrite: false });
    sprayPts = new T.Points(geo, m);
    sprayPts.frustumCulled = false; sprayPts.visible = false;
    scene.add(sprayPts);
    for (let i = 0; i < N; i++) sprayState.push({ t: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
  }

  // ---------- sonido de pulverizacion ----------
  let hiss = null, hissGain = null;
  function iniciarHiss() {
    try {
      const ac = NC.audio && NC.audio.context;
      if (!ac || ac.state !== 'running') return;
      if (hiss) return;
      const len = Math.floor(ac.sampleRate * 1.2);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * .5;
      hiss = ac.createBufferSource(); hiss.buffer = buf; hiss.loop = true;
      hissGain = ac.createGain(); hissGain.gain.value = 0;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = .8;
      hiss.connect(f); f.connect(hissGain); hissGain.connect(ac.destination);
      hiss.start();
    } catch (e) { }
  }
  function pararHiss() { try { if (hissGain) hissGain.gain.value = 0; } catch (e) { } }

  // ---------- interfaz ----------
  NC.css(`
  #spUI{position:absolute;right:18px;bottom:22px;width:236px;z-index:7;display:none;
    background:linear-gradient(165deg,rgba(20,17,38,.94),rgba(11,9,24,.96));border:1px solid rgba(120,200,255,.24);
    border-radius:14px;padding:13px 14px;box-shadow:0 16px 44px rgba(0,0,0,.55);
    font-family:'Segoe UI',system-ui,sans-serif;color:#e9f0ff}
  #spUI.on{display:block}
  #spUI .r{display:flex;align-items:center;gap:9px;margin-bottom:9px}
  #spUI .sw{width:26px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.28);cursor:pointer;flex:none}
  #spUI .lbl{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#8fa2c4;flex:1}
  #spUI .val{font-size:12px;color:#dfe9ff;font-variant-numeric:tabular-nums}
  #spUI .bar{height:6px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:3px}
  #spUI .bar i{display:block;height:100%;background:linear-gradient(90deg,#27e6ff,#8affd0);transition:width .1s linear}
  #spUI .bar.baja i{background:linear-gradient(90deg,#ff5a7a,#ffd24a)}
  #spUI .seg{display:flex;gap:5px}
  #spUI .seg button{flex:1;padding:6px 0;border-radius:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
    color:#dbe6ff;font-size:11.5px;cursor:pointer}
  #spUI .seg button.on{background:rgba(39,230,255,.2);border-color:rgba(39,230,255,.5)}
  #spUI .hint{font-size:10.5px;color:#8a97b4;line-height:1.55;margin-top:9px;border-top:1px solid rgba(255,255,255,.08);padding-top:8px}
  #spUI .hint b{color:#cfe0ff}
  #spPal{position:absolute;right:18px;bottom:190px;width:236px;z-index:8;display:none;
    background:linear-gradient(165deg,rgba(22,18,42,.97),rgba(12,10,26,.98));border:1px solid rgba(120,200,255,.28);
    border-radius:14px;padding:13px 14px;box-shadow:0 16px 44px rgba(0,0,0,.6);font-family:'Segoe UI',system-ui,sans-serif;color:#e9f0ff}
  #spPal.on{display:block}
  #spPal .cols{display:grid;grid-template-columns:repeat(8,1fr);gap:5px;margin:8px 0 10px}
  #spPal .cols i{height:19px;border-radius:5px;cursor:pointer;border:1px solid rgba(255,255,255,.14);display:block}
  #spPal .cols i.on{outline:2px solid #fff;outline-offset:1px}
  #spPal input[type=range]{width:100%;accent-color:#27e6ff;margin:3px 0}
  #spPal .hex{display:flex;gap:6px;align-items:center;margin-top:8px}
  #spPal .hex input[type=text]{flex:1;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.14);color:#e9f0ff;
    border-radius:6px;padding:5px 7px;font-size:11.5px;font-family:ui-monospace,Consolas,monospace}
  #spPal .prev{width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.3)}
  #spPal .cerrar{position:absolute;top:8px;right:10px;cursor:pointer;color:#9fb0d0;font-size:15px;line-height:1}
  `);
  document.body.insertAdjacentHTML('beforeend',
    '<div id="spUI"><div class="r"><span class="sw" id="spSw"></span><span class="lbl">Spray</span><span class="val" id="spPct">100%</span></div>' +
    '<div class="bar" id="spBar"><i id="spFill" style="width:100%"></i></div>' +
    '<div class="r" style="margin-top:10px"><span class="lbl">Grosor</span><span class="seg" style="flex:2">' +
    '<button data-a="1">Fino</button><button data-a="2" class="on">Medio</button><button data-a="3">Grueso</button></span></div>' +
    '<div class="hint"><b>Click izq.</b> pintar · <b>raton</b> trazo · <b>C</b> color · <b>[ ]</b> grosor · <b>G</b> guardar y salir</div></div>' +
    '<div id="spPal"><span class="cerrar" id="spCerrar">×</span><div style="font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#8fa2c4">Color</div>' +
    '<div class="cols" id="spCols"></div>' +
    '<div style="font-size:10.5px;color:#8fa2c4">Tono</div><input type="range" id="spHue" min="0" max="360" value="190">' +
    '<div style="font-size:10.5px;color:#8fa2c4">Intensidad</div><input type="range" id="spSat" min="0" max="100" value="90">' +
    '<div class="hex"><div class="prev" id="spPrev"></div><input type="text" id="spHex" value="#27e6ff" maxlength="7"></div></div>');
  const $ = id => document.getElementById(id);
  const PALETA = [0x27e6ff, 0xff5a7a, 0xffd24a, 0x3dff9a, 0x8a5cff, 0xff8a3a, 0xffffff, 0x2a2a2a,
                  0x00b3ff, 0xff2a6a, 0xffe066, 0x7dff5a, 0xc08bff, 0xff9d4a, 0xd8d8d8, 0x1a1a22,
                  0x00e5a0, 0xff4d4d, 0x7a5cff, 0x2f6f3a, 0x8a3a2a, 0x2a4a8a, 0x6f3a6f, 0xa08040];
  function pintarColores() {
    $('spCols').innerHTML = PALETA.map(c => `<i data-c="${c}" style="background:#${c.toString(16).padStart(6, '0')}"></i>`).join('');
    $('spCols').querySelectorAll('i').forEach(el => el.addEventListener('click', () => { setColor(+el.dataset.c); }));
  }
  function setColor(c) {
    SP.color = c; colorBote(); actualizarUI();
    const h = (c >> 16 & 255) / 255 * 360;
    $('spHue').value = Math.round(h);
    $('spHex').value = '#' + c.toString(16).padStart(6, '0');
  }
  function actualizarUI() {
    $('spSw').style.background = '#' + SP.color.toString(16).padStart(6, '0');
    $('spPrev').style.background = '#' + SP.color.toString(16).padStart(6, '0');
    const p = Math.round(SP.cap / SP.max * 100);
    $('spPct').textContent = p + '%';
    $('spFill').style.width = p + '%';
    $('spBar').classList.toggle('baja', p < 25);
  }
  function actualizarBarra() { actualizarUI(); }
  $('spSw').addEventListener('click', () => { $('spPal').classList.toggle('on'); NC.ui && NC.ui.register($('spPal')); });
  $('spCerrar').addEventListener('click', () => { $('spPal').classList.remove('on'); });
  $('spHex').addEventListener('change', e => {
    const v = e.target.value.replace('#', '');
    if (/^[0-9a-fA-F]{6}$/.test(v)) setColor(parseInt(v, 16));
  });
  $('spHue').addEventListener('input', e => {
    const c = new T.Color(SP.color); const hsl = {};
    c.getHSL(hsl);
    c.setHSL(+e.target.value / 360, hsl.s, hsl.l);
    setColor(c.getHex());
  });
  $('spSat').addEventListener('input', e => {
    const c = new T.Color(SP.color); const hsl = {};
    c.getHSL(hsl);
    c.setHSL(hsl.h, +e.target.value / 100, hsl.l);
    setColor(c.getHex());
  });
  document.querySelectorAll('#spUI .seg button').forEach(b => b.addEventListener('click', () => {
    SP.ancho = +b.dataset.a;
    document.querySelectorAll('#spUI .seg button').forEach(x => x.classList.toggle('on', x === b));
  }));
  try { if (NC.ui) { NC.ui.register($('spUI')); NC.ui.register($('spPal')); } } catch (e) { }

  // ---------- pintar ----------
  function soltar() {
    SP.pintando = false;
    SP.ultimo = null;
    pararHiss();
    if (sprayPts) sprayPts.visible = false;
  }
  function empezar() {
    if (SP.cap <= 0) { toast('Bote vacío: compra una recarga'); return; }
    if (!apuntar()) return;
    SP.pintando = true;
    SP.ultimo = { p: hitPoint.clone(), n: hitNormal.clone(), o: hitObj };
    SP.Trazos.push({ c: SP.color, w: SP.ancho, pts: [[hitPoint.x, hitPoint.y, hitPoint.z, hitNormal.x, hitNormal.y, hitNormal.z]] });
    iniciarHiss();
  }
  function continuar() {
    if (!SP.pintando) return;
    if (!apuntar()) { soltar(); return; }
    const prev = SP.ultimo;
    // si cambia de superficie, corta el trazo (no pintar a traves de paredes)
    if (prev.o !== hitObj) { soltar(); empezar(); return; }
    const d = hitPoint.distanceTo(prev.p);
    if (d < 0.02) return;
    const ancho = ANCHOS[SP.ancho] * (1 + d * 0.06);
    anadirSegmento(prev, { p: hitPoint, n: hitNormal }, ancho, SP.color);
    consumir(d, ancho);
    const tr = SP.Trazos[SP.Trazos.length - 1];
    if (tr) { tr.pts.push([hitPoint.x, hitPoint.y, hitPoint.z, hitNormal.x, hitNormal.y, hitNormal.z]); }
    SP.ultimo = { p: hitPoint.clone(), n: hitNormal.clone(), o: hitObj };
    // aerosol en la boquilla
    if (sprayPts) {
      sprayPts.visible = true;
      const pos = sprayPts.geometry.attributes.position.array;
      for (let i = 0; i < sprayState.length; i++) {
        const s = sprayState[i];
        s.t -= 0.05;
        if (s.t <= 0) {
          s.t = R2(.12, .3);
          s.x = hitPoint.x; s.y = hitPoint.y; s.z = hitPoint.z;
          s.vx = R2(-.25, .25); s.vy = R2(.05, .4); s.vz = R2(-.25, .25);
        }
        s.x += s.vx * 0.016; s.y += s.vy * 0.016; s.z += s.vz * 0.016;
        pos[i * 3] = s.x; pos[i * 3 + 1] = s.y; pos[i * 3 + 2] = s.z;
      }
      sprayPts.geometry.attributes.position.needsUpdate = true;
    }
  }

  // ---------- entrada ----------
  // captura: con el spray equipado el click izquierdo no dispara el arma
  addEventListener('mousedown', e => {
    if (!SP.equipado || e.button !== 0) return;
    if ($('spPal').classList.contains('on')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    empezar();
  }, true);
  addEventListener('mouseup', e => { if (SP.pintando && e.button === 0) soltar(); }, true);
  addEventListener('keydown', e => {
    if (e.code === 'KeyG' && !e.repeat) {
      if (SP.equipado) { soltar(); guardar(); SP.equipado = false; $('spUI').classList.remove('on'); $('spPal').classList.remove('on'); try { beep(420, .1, 'sine', .04); } catch (e) { } }
      else {
        SP.equipado = true; $('spUI').classList.add('on'); actualizarUI();
        try { toast('Spray equipado: mantén el click y dibuja'); } catch (e) { }
      }
      return;
    }
    if (!SP.equipado) return;
    if (e.code === 'KeyC' && !e.repeat) { $('spPal').classList.toggle('on'); try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) { } }
    if (e.code === 'BracketLeft') { SP.ancho = Math.max(1, SP.ancho - 1); }
    if (e.code === 'BracketRight') { SP.ancho = Math.min(3, SP.ancho + 1); }
  });

  // ---------- el bote en la mano ----------
  function colocarBote() {
    try {
      if (!bote) crearBote();
      const h = P && P.h;
      if (!h || !h.aR) { bote.visible = false; return; }
      if (!bote.parent) h.aR.add(bote);
      bote.position.set(.02, -.52, .12);
      bote.rotation.set(-.5, 0, .15);
      bote.visible = SP.equipado;
      if (SP.equipado && hitPoint) {
        // orienta la boquilla hacia el punto apuntado
        const dir = new T.Vector3().subVectors(hitPoint, bote.getWorldPosition(new T.Vector3()));
        const local = h.aR.worldToLocal(dir.clone().normalize());
        bote.rotation.y = Math.atan2(local.x, local.z);
        bote.rotation.x = -.5 - Math.atan2(local.y, 1);
      }
    } catch (e) { }
  }

  // ---------- guardado / carga ----------
  function guardar() {
    try {
      const simple = SP.Trazos.map(t => ({ c: t.c, w: t.w, p: t.pts.map(p => p.map(v => +v.toFixed(3))) }));
      localStorage.setItem(KEY, JSON.stringify(simple));
    } catch (e) { }
  }
  function cargar() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return;
      const data = JSON.parse(raw); if (!Array.isArray(data)) return;
      SP.Trazos = data;
      for (const t of data) {
        for (let i = 1; i < t.p.length; i++) {
          const a = { p: new T.Vector3(t.p[i - 1][0], t.p[i - 1][1], t.p[i - 1][2]), n: new T.Vector3(t.p[i - 1][3], t.p[i - 1][4], t.p[i - 1][5]) };
          const b = { p: new T.Vector3(t.p[i][0], t.p[i][1], t.p[i][2]), n: new T.Vector3(t.p[i][3], t.p[i][4], t.p[i][5]) };
          anadirSegmento(a, b, ANCHOS[t.w] || .12, t.c);
        }
      }
    } catch (e) { }
  }

  // ---------- recarga en la tienda ----------
  try {
    // el item "Spray de grafiti" de SHOP recarga el bote
    const _bi = window.buyItem;
    window.buyItem = function (i) {
      const s = curShop(); const gi = s ? s.stock[i] : undefined;
      if (gi === 13) {                       // spray de grafiti
        const antes = money;
        _bi && _bi.apply(this, arguments);
        if (money < antes) { SP.cap = SP.max; actualizarUI(); toast('Bote recargado'); }
        return;
      }
      return _bi && _bi.apply(this, arguments);
    };
  } catch (e) { }

  // ---------- bucle ----------
  NC.hooks.pre.push(dt => {
    try {
      if (!SP.mesh) crearMalla();
      if (!pintables.length) scoopPintables();
      if (SP.equipado) {
        apuntar();
        if (SP.pintando) continuar();
        colocarBote();
        if (hissGain) hissGain.gain.value = SP.pintando ? .045 : 0;
      } else if (bote) bote.visible = false;
    } catch (e) { }
  });

  // al arrancar la partida
  NC.hooks.post.push(() => {
    try {
      if (!SP.mesh) { crearMalla(); scoopPintables(); cargar(); crearBote(); pintarColores(); setColor(SP.color); }
    } catch (e) { }
  });

  NC.spray = SP;
  NC.log('spray: dibujo libre sobre superficies, color libre, grosor y pintura limitada');
})();
