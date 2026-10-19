/* Neon Coast - mision "El paquete de Colina": cadena de fases realmente jugables.
   1 hablar con la informante  2 llegar en vehiculo y aparcar  3 entrar en la nave
   4 dos hostiles  5 leer la nota (pista)  6 caja fuerte con codigo deducible
   7 recoger el paquete  8 huir  9 entregar y asumir consecuencias. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;
  const R2 = (a, b) => a + Math.random() * (b - a);

  // ---------- estado ----------
  const M = {
    on: false, ph: 0, done: false, code: '', gotNote: false, pkg: false,
    hostiles: [], safeOpen: false, talk: 0, tried: 0, t0: 0, failed: false
  };
  const PH_TXT = [
    'Habla con Rita Vidal en el muelle de Colina.',
    'Conduce hasta la nave abandonada del Puerto Viejo y aparca.',
    'Entra en la nave (a pie) y busca la oficina.',
    'Hay dos tipos guardando el sitio: elimínalos.',
    'Lee la nota sobre la mesa de la oficina.',
    'Abre la caja fuerte con el código (número de nave + año del incendio).',
    'Recoge el paquete de la caja.',
    'Sal de la nave y vuelve al coche: te están buscando.',
    'Entrega el paquete a Rita en el muelle.'
  ];
  // lugares
  const SPOT = { x: EXT + 22, z: 196 };            // Rita en el muelle
  const F = (typeof FACTORY !== 'undefined' && FACTORY) ? FACTORY : { x: 342, z: -342 };
  const NAVE = 12, ANIO = 1958, CODE = String(NAVE) + String(ANIO);
  const OFFICE = { x: F.x - 6, z: F.z + 6 };

  // ---------- interfaz ----------
  NC.css(`
  #mPanel{position:absolute;left:50%;bottom:6.5%;transform:translateX(-50%);width:min(660px,90vw);z-index:7;
    background:linear-gradient(150deg,rgba(16,12,34,.95),rgba(8,6,20,.97));border:1px solid rgba(120,200,255,.26);
    border-radius:14px;padding:14px 18px;box-shadow:0 18px 50px rgba(0,0,0,.6);font-family:'Segoe UI',system-ui,sans-serif;display:none}
  #mPanel.on{display:block}
  #mPanel .k{font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:#7fd4ff;opacity:.8}
  #mPanel .t{font-size:15px;color:#eef3ff;margin-top:4px;line-height:1.45}
  #mPanel .s{font-size:12px;color:#9fb0d0;margin-top:6px}
  #mPanel .ph{display:flex;gap:5px;margin-top:10px}
  #mPanel .ph i{width:16px;height:4px;border-radius:3px;background:rgba(255,255,255,.14)}
  #mPanel .ph i.ok{background:#3dff9a}#mPanel .ph i.now{background:#27e6ff;box-shadow:0 0 10px #27e6ff88}
  #mDlg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(620px,92vw);z-index:9;display:none;
    background:linear-gradient(160deg,rgba(18,14,38,.97),rgba(8,6,20,.98));border:1px solid rgba(255,140,190,.3);border-radius:16px;
    padding:22px 24px;box-shadow:0 26px 70px rgba(0,0,0,.7);font-family:'Segoe UI',system-ui,sans-serif}
  #mDlg.on{display:block}
  #mDlg .who{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#ff9ec4}
  #mDlg .txt{font-size:15px;line-height:1.6;color:#eef3ff;margin:10px 0 16px}
  #mDlg .opts{display:flex;flex-direction:column;gap:8px}
  #mDlg .opt{padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
    color:#e8eeff;font-size:13.5px;cursor:pointer;transition:.14s}
  #mDlg .opt:hover{background:rgba(255,120,180,.16);border-color:rgba(255,140,190,.45)}
  #mKey{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:300px;z-index:9;display:none;
    background:linear-gradient(160deg,rgba(18,14,38,.97),rgba(8,6,20,.98));border:1px solid rgba(255,210,74,.35);border-radius:16px;
    padding:20px;box-shadow:0 26px 70px rgba(0,0,0,.7);font-family:'Segoe UI',system-ui,sans-serif}
  #mKey.on{display:block}
  #mKey .disp{font-size:30px;letter-spacing:.35em;text-align:center;color:#ffd24a;background:rgba(0,0,0,.4);
    border-radius:10px;padding:12px 6px;margin:12px 0;font-family:ui-monospace,Consolas,monospace}
  #mKey .pad{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
  #mKey .pad button{padding:11px 0;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);
    color:#eef3ff;font-size:16px;cursor:pointer}
  #mKey .pad button:hover{background:rgba(255,210,74,.2)}
  #mKey .err{color:#ff8a9a;font-size:12px;text-align:center;margin-top:10px;min-height:15px}
  #mNote{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,92vw);z-index:9;display:none;
    background:linear-gradient(160deg,rgba(34,28,18,.98),rgba(16,12,8,.98));border:1px solid rgba(255,220,150,.35);border-radius:14px;
    padding:24px;color:#f0e6d2;font-family:'Segoe UI',system-ui,sans-serif;box-shadow:0 26px 70px rgba(0,0,0,.7)}
  #mNote.on{display:block}
  #mNote h3{margin:0 0 12px;font-size:17px;color:#ffd9a0}
  #mNote p{font-size:14px;line-height:1.7;margin:0 0 12px;white-space:pre-line}
  #mNote .cl{margin-top:14px;text-align:center;font-size:12px;color:#c8b795;cursor:pointer;border:1px solid rgba(255,220,150,.3);border-radius:8px;padding:8px}
  `);
  document.body.insertAdjacentHTML('beforeend',
    '<div id="mPanel"><div class="k">Mision en curso</div><div class="t" id="mTxt"></div><div class="s" id="mSub"></div><div class="ph" id="mPh"></div></div>' +
    '<div id="mDlg"><div class="who" id="mWho"></div><div class="txt" id="mTxtD"></div><div class="opts" id="mOpts"></div></div>' +
    '<div id="mKey"><div class="k">Caja fuerte</div><div class="disp" id="mDisp">____</div><div class="pad" id="mPad"></div><div class="err" id="mErr"></div></div>' +
    '<div id="mNote"><h3>Nota de la oficina</h3><p id="mNoteTxt"></p><div class="cl" id="mNoteOk">Guardar la nota y cerrar</div></div>');
  const $ = id => document.getElementById(id);
  const show = (id, v) => $(id).classList.toggle('on', v);

  // ---------- Rita (contacto) ----------
  const rita = { h: mkHuman(0x2f6f8a, 0x2a2a36, 0x3a2418, 0), x: SPOT.x, z: SPOT.z };
  rita.h.g.position.set(rita.x, 0, rita.z);
  scene.add(rita.h.g);
  try { boxes.push({ x: rita.x, z: rita.z, hw: .4, hd: .4 }); } catch (e) { }

  // ---------- decorado: nave, nota, caja, paquete, carteles ----------
  const props = [];
  function sign3(x, y, z, w, h, txt, bg, fg, ry) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const q = c.getContext('2d');
    q.fillStyle = bg; q.fillRect(0, 0, 512, 128);
    q.strokeStyle = fg; q.lineWidth = 6; q.strokeRect(6, 6, 500, 116);
    q.fillStyle = fg; q.font = 'bold 62px sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle';
    q.fillText(txt, 256, 68);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: t }));
    m.position.set(x, y, z); m.rotation.y = ry || 0; scene.add(m); return m;
  }
  // numero de nave (pista 1)
  sign3(F.x, 7.2, F.z + 12.4, 7, 1.7, 'NAVE ' + NAVE, '#1a1f2b', '#ffd24a', 0);
  // cartel del incendio (pista 2) junto al muelle
  sign3(EXT + 26, 3.2, 60, 4.4, 1.5, 'INCENDIO ' + ANIO, '#2a1410', '#ff8a5a', -PI / 2);
  // mesa + nota
  const desk = new T.Group();
  const top = new T.Mesh(new T.BoxGeometry(2.2, .12, 1.1), new T.MeshStandardMaterial({ color: 0x6a4a32, roughness: .8 }));
  top.position.y = .85; desk.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = new T.Mesh(new T.BoxGeometry(.1, .85, .1), new T.MeshStandardMaterial({ color: 0x4a3524, roughness: .85 }));
    l.position.set(sx * .95, .42, sz * .45); desk.add(l);
  }
  desk.position.set(OFFICE.x, 0, OFFICE.z); desk.rotation.y = .4; scene.add(desk);
  const note = new T.Mesh(new T.PlaneGeometry(.5, .36).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: 0xf2ead6, side: T.DoubleSide }));
  note.position.set(OFFICE.x + .1, .92, OFFICE.z + .05); note.rotation.z = .3; scene.add(note);
  const noteGlow = new T.Mesh(new T.RingGeometry(.5, .62, 20).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: 0x27e6ff, transparent: true, opacity: .5 }));
  noteGlow.position.copy(note.position); noteGlow.position.y += .01; scene.add(noteGlow);
  // caja fuerte
  const safe = new T.Group();
  const sb = new T.Mesh(new T.BoxGeometry(1.3, 1.5, 1.1), new T.MeshStandardMaterial({ color: 0x3b4048, roughness: .35, metalness: .85 }));
  sb.position.y = .75; safe.add(sb);
  const door = new T.Mesh(new T.BoxGeometry(1.1, 1.3, .12), new T.MeshStandardMaterial({ color: 0x4d535c, roughness: .28, metalness: .9 }));
  door.position.set(0, .75, .58); safe.add(door);
  const dial = new T.Mesh(new T.CylinderGeometry(.17, .17, .08, 18).rotateX(PI / 2), new T.MeshStandardMaterial({ color: 0xd9a441, roughness: .25, metalness: .95 }));
  dial.position.set(.32, .9, .66); safe.add(dial);
  const keyp = new T.Mesh(new T.BoxGeometry(.3, .2, .05), new T.MeshBasicMaterial({ color: 0x8cff9a }));
  keyp.position.set(-.2, .9, .66); safe.add(keyp);
  safe.position.set(OFFICE.x + 2.4, 0, OFFICE.z - 1.2); safe.rotation.y = -.5; scene.add(safe);
  // paquete
  const pack = new T.Group();
  const pb = new T.Mesh(new T.BoxGeometry(.55, .38, .4), new T.MeshStandardMaterial({ color: 0xb59a6a, roughness: .85 }));
  pb.position.y = .19; pack.add(pb);
  const tape = new T.Mesh(new T.BoxGeometry(.58, .06, .1), new T.MeshStandardMaterial({ color: 0x8a6a3a, roughness: .8 }));
  tape.position.y = .38; pack.add(tape);
  pack.position.set(OFFICE.x + 1.3, 0, OFFICE.z - 1.1); pack.visible = false; scene.add(pack);
  const packGlow = new T.Mesh(new T.RingGeometry(.5, .62, 20).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: .55 }));
  packGlow.position.set(pack.position.x, .02, pack.position.z); packGlow.visible = false; scene.add(packGlow);

  // ---------- hostiles ----------
  function spawnHostiles() {
    for (let i = 0; i < 2; i++) {
      const h = mkHuman(0x9a2030, 0x1a1a22, 0x1a1a1a, 0);
      const x = OFFICE.x + R2(-7, 7), z = OFFICE.z + R2(-7, 7);
      h.g.position.set(x, 0, z);
      const n = { h, cx: x, cz: z, t: 0, dir: 1, sp: 2.4, flee: 0, down: 0, fo: 0, x, z, hx: 0, hz: 1, name: 'Matón', job: 'Guardia', hostile: true, hp: 2 };
      npcs.push(n);
      M.hostiles.push(n);
    }
    toast('¡Dos matones! Arma y listo');
  }

  // ---------- dialogo ----------
  function dlg(who, txt, opts) {
    $('mWho').textContent = who;
    $('mTxtD').innerHTML = txt;
    $('mOpts').innerHTML = opts.map((o, i) => `<div class="opt" data-i="${i}">${o.t}</div>`).join('');
    $('mOpts').querySelectorAll('.opt').forEach(el => el.addEventListener('click', () => {
      show('mDlg', false);
      const o = opts[+el.dataset.i]; if (o && o.f) o.f();
    }));
    show('mDlg', true);
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) { }
  }
  function notePanel() {
    $('mNoteTxt').innerHTML = 'Rita no miente: la caja de la nave <b>' + NAVE + '</b> no abre con llave.<br><br>' +
      'El código es <b>el número de la nave</b> seguido del <b>año del incendio</b>, sin guion.<br>' +
      'El número está pintado en la puerta de la nave. El año, en el cartel del muelle.<br><br>' +
      '<i>— Soto, capataz —</i>';
    show('mNote', true);
  }
  $('mNoteOk').addEventListener('click', () => { show('mNote', false); M.gotNote = true; setPhase(5); });

  // ---------- teclado de la caja fuerte ----------
  function keypad() {
    const disp = $('mDisp'), err = $('mErr');
    M.code = ''; disp.textContent = '____'; err.textContent = '';
    const pad = $('mPad');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Borrar', '0', 'Cerrar'];
    pad.innerHTML = keys.map(k => `<button data-k="${k}">${k}</button>`).join('');
    pad.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k;
      if (k === 'Cerrar') { show('mKey', false); return; }
      if (k === 'Borrar') { M.code = M.code.slice(0, -1); }
      else if (M.code.length < 6) M.code += k;
      disp.textContent = (M.code + '____').slice(0, 6);
      if (M.code.length === 6) {
        M.tried++;
        if (M.code === CODE) {
          err.textContent = ''; err.style.color = '#6effc0';
          show('mKey', false);
          M.safeOpen = true;
          door.rotation.y = -1.5; door.position.set(.55, .75, .58);
          pack.visible = true; packGlow.visible = true;
          beep(660, .1); setTimeout(() => beep(880, .12), 120);
          toast('Caja fuerte abierta');
          setPhase(6);
        } else {
          err.textContent = 'Código incorrecto. Repasa la nota.'; err.style.color = '#ff8a9a';
          M.code = ''; disp.textContent = '____';
          beep(120, .2, 'square', .05);
        }
      }
    }));
    show('mKey', true);
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) { }
  }

  // ---------- fases ----------
  function setPhase(p) {
    M.ph = p;
    $('mTxt').textContent = PH_TXT[p] || '';
    $('mSub').textContent = p >= 5 && !M.gotNote ? 'Pista: número de nave + año del incendio' : '';
    $('mPh').innerHTML = PH_TXT.map((_, i) => `<i class="${i < p ? 'ok' : (i === p ? 'now' : '')}"></i>`).join('');
    if (p === 3) spawnHostiles();
    if (p === 4) { }
  }
  function startMission() {
    if (M.on || M.done) return;
    M.on = true; setPhase(0);
    show('mPanel', true);
    toast('Misión nueva: El paquete de Colina');
    beep(520, .12); setTimeout(() => beep(660, .14), 140);
  }
  function finishMission(pay) {
    M.done = true; M.on = false;
    show('mPanel', false);
    money += pay;
    toast('Paquete entregado · +$' + pay);
    pop('+$' + pay);
    try { if (typeof P.known !== 'undefined') P.known.push({ name: 'Rita Vidal', job: 'Informante de Colina' }); } catch (e) { }
    try { localStorage.setItem('ncPaquete', '1'); } catch (e) { }
    dlg('Rita Vidal', pay >= 800 ? 'Eres de fiar. Toma, esto es lo de Cap. Soto. La costa te lo agradece.' : 'Vaya… con la policia cerquita, el precio cambia. aqui tienes menos de lo pactado.',
      [{ t: 'Coger el dinero y marcharme' }]);
  }

  // ---------- interaccion (E) con prioridad ----------
  const _int = window.interact;
  window.interact = function () {
    try {
      if (!M.on && !M.done) {
        const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
        if (Math.hypot(px - rita.x, pz - rita.z) < 3.2) { startMission(); }
      }
      if (M.on && !M.done) {
        const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
        // 1) hablar con Rita
        if (M.ph === 0 && Math.hypot(px - rita.x, pz - rita.z) < 3.2) {
          dlg('Rita Vidal', 'Tomas, al final te llamaron. Escucha: un paquete tiene que cruzar el puerto, pero no por la calle. Esta en la <b>nave abandonada del Puerto Viejo</b>.<br><br>La caja fuerte de la oficina no se abre con llave: la <b>llave</b> se la llevo yo. Ademas hay dos matones dentro.<br><br>Llevas coche, no? Tendras que aparcar fuera: si entras andando te limpian.',
            [
              { t: '¿Como se abre la caja?', f: () => dlg('Rita Vidal', 'Con un codigo. Soto dejo una nota en la mesa de la oficina con la formula. No te la voy a dar: buscala.<br><br>Y ojo: el numero de la nave lo tienen pintado en la puerta, y el año del incendio esta en el cartel del muelle. Con eso la abres.', () => { setPhase(1); }) },
              { t: 'Voy para alla', f: () => { setPhase(1); } }
            ]);
          return;
        }
        // 2) entrega
        if (M.ph === 8 && Math.hypot(px - rita.x, pz - rita.z) < 3.2) {
          const police = (typeof cops !== 'undefined' && cops.some(c => c.act && Math.hypot(c.x - px, c.z - pz) < 40));
          finishMission(police ? 500 : 800);
          return;
        }
        // 5) nota
        if (M.ph === 4 && Math.hypot(px - OFFICE.x, pz - OFFICE.z) < 4) { notePanel(); return; }
        // 6) caja
        if ((M.ph === 5 || M.ph === 6) && Math.hypot(px - (OFFICE.x + 2.4), pz - (OFFICE.z - 1.2)) < 2.6) { keypad(); return; }
        // 7) paquete
        if (M.ph === 6 && M.safeOpen && pack.visible && Math.hypot(px - pack.position.x, pz - pack.position.z) < 2) {
          M.pkg = true; pack.visible = false; packGlow.visible = false;
          try { P.pkg = 1; } catch (e) { }
          toast('Paquete en tus manos');
          setPhase(7);
          return;
        }
      }
    } catch (e) { }
    return _int && _int.apply(this, arguments);
  };

  // ---------- logica por frame ----------
  NC.hooks.post.push(dt => {
    if (!M.on || M.done) return;
    const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
    // hostiles: persiguen y golpean
    for (const n of M.hostiles) {
      if (n.dead || n.down > 0) continue;
      const d = Math.hypot(n.x - px, n.z - pz);
      if (d > 1.6 && d < 90) {
        const a = Math.atan2(px - n.x, pz - n.z);
        n.x += Math.sin(a) * 3.1 * dt; n.z += Math.cos(a) * 3.1 * dt;
        n.h.g.position.set(n.x, 0, n.z);
        n.h.g.rotation.y = a;
        try { anim(n.h, 3, dt, false, false, 0); } catch (e) { }
        if (d < 1.9 && P.foot && !P.dying) { try { hurt(7, 'matón'); } catch (e) { } }
      }
    }
    // fases automaticas
    if (M.ph === 1) {                       // llegar en vehiculo y aparcar
      const d = Math.hypot(px - F.x, pz - F.z);
      if (!P.foot && d < 46 && Math.abs(speed) < 3) { setPhase(2); toast('Aparca y sal del coche'); }
      else if (!P.foot && d < 46) { $('mSub').textContent = 'Deten el coche para bajar (' + Math.round(d) + ' m)'; }
      else $('mSub').textContent = 'Lleva el coche a la nave · ' + Math.round(d) + ' m';
    } else if (M.ph === 2) {                // entrar a pie
      if (P.foot && Math.hypot(px - OFFICE.x, pz - OFFICE.z) < 16) setPhase(3);
      else $('mSub').textContent = 'Sal del coche y entra en la nave';
    } else if (M.ph === 3) {                // limpiar hostiles
      const vivos = M.hostiles.filter(n => !n.dead && !(n.down > 0)).length;
      $('mSub').textContent = 'Hostiles en pie: ' + vivos;
      if (vivos === 0) setPhase(4);
    } else if (M.ph === 4) {
      $('mSub').textContent = 'Lee la nota sobre la mesa';
    } else if (M.ph === 6) {
      $('mSub').textContent = M.safeOpen ? 'Coge el paquete de la caja' : 'Abre la caja fuerte';
    } else if (M.ph === 7) {                // huir en coche
      if (!P.foot && Math.hypot(px - F.x, pz - F.z) > 90) setPhase(8);
      else $('mSub').textContent = 'Vuelve al coche y aléjate de la nave';
    }
    //rita mirando al jugador
    try { rita.h.g.rotation.y = Math.atan2(px - rita.x, pz - rita.z); } catch (e) { }
  });

  // ---------- disparo de la mision ----------
  // se ofrece al empezar el capitulo 1: el jugador la acepta hablando con Rita
  const _adv = window.advance;
  window.advance = function () {
    try {
      if (!M.on && !M.done) {
        const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
        if (Math.hypot(px - rita.x, pz - rita.z) < 3.2) { startMission(); return; }
      }
    } catch (e) { }
    return _adv && _adv.apply(this, arguments);
  };
  // pista en el mapa
  try { if (window.NC && NC.sto) { } } catch (e) { }
  NC.mision = M;
  NC.log('mision: "El paquete de Colina" montada (9 fases)');
})();
