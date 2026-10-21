/* Neon Coast - SISTEMA DE CINEMATICAS (src/cine.js)
   Motor de cinematica en tiempo real: ni video ni imagenes, solo la propia escena 3D.
   - NC.cine.play(secuencia, alTerminar)
       secuencia = [{tipo:'shot'|'dialogo'|'accion', dur, cam:[x,y,z], look:[x,y,z],
                     fov, actor, texto, accion}]
   - Camara propia (PerspectiveCamera) y render parcheado SOLO durante la cinematica
     (misma tecnica que src/intro.js: se envuelve rd.render, no se toca el bucle).
   - Transiciones suaves entre planos (ease-in-out) con fundido a negro corto.
   - Durante la escena: tiempo del juego congelado (timeScale=0), HUD oculto,
     jugador sin control y camara del juego intacta.
   - Al terminar (o al saltar con Esc): se restaura todo y la mision sigue igual:
     ningun acontecimiento de la mision depende de que se vea la escena.
   - Los actores se colocan en poses FIJAS (no dependen del jugador) y se animan con
     la funcion anim() del juego; si no existen se crean con mkHuman y se retiran al final. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const NC = window.NC, T = THREE;

  /* ================================================================ estilos */
  NC.css(`
  #ncCineFade{position:fixed;inset:0;background:#04020a;opacity:0;z-index:70;pointer-events:none;display:none}
  #ncCineTxt{position:fixed;left:50%;bottom:13%;transform:translateX(-50%);z-index:72;pointer-events:none;
    max-width:min(760px,86vw);text-align:center;opacity:0;transition:opacity .45s ease;
    font:400 clamp(14px,1.9vw,21px)/1.5 "Trebuchet MS","Segoe UI",system-ui,sans-serif;color:#fff7ea;
    text-shadow:0 2px 14px #000d,0 0 34px #0009}
  #ncCineUI{position:fixed;right:14px;bottom:14px;z-index:73;display:none}
  #ncCineSkip{background:rgba(8,5,20,.55);border:1px solid #ffffff30;color:#ffffffb0;border-radius:9px;
    padding:7px 13px;font:600 12px/1 "Trebuchet MS",system-ui,sans-serif;cursor:pointer;letter-spacing:.05em}
  #ncCineSkip:hover{color:#fff;border-color:#ffffff70;background:rgba(8,5,20,.82)}
  #ncCineOn #top,#ncCineOn #comp,#ncCineOn #obj,#ncCineOn #mis,#ncCineOn #mmw,#ncCineOn #spd,
  #ncCineOn #ncbar,#ncCineOn #hint,#ncCineOn #help,#ncCineOn #cross,#ncCineOn #stoZone,#ncCineOn #stoObj,
  #ncCineOn #mPanel,#ncCineOn #mDlg,#ncCineOn #mKey,#ncCineOn #mNote,#ncCineOn #ncE,#ncCineOn #wp,
  #ncCineOn #zone,#ncCineOn #toast,#ncCineOn #pop,#ncCineOn #dmg,#ncCineOn #inv,#ncCineOn #dlg,
  #ncCineOn #copT,#ncCineOn #wasted,#ncCineOn #busted,#ncCineOn #ncH,#ncCineOn #nchov,#ncCineOn #nccut,
  #ncCineOn #ncPuerta,#ncCineOn #ncFade,#ncCineOn #bigMap,#ncCineOn #gDlg{display:none !important}
  `);

  /* ==================================================================== DOM */
  const fadeEl = document.createElement('div'); fadeEl.id = 'ncCineFade';
  const txtEl = document.createElement('div'); txtEl.id = 'ncCineTxt';
  const uiEl = document.createElement('div'); uiEl.id = 'ncCineUI';
  uiEl.innerHTML = '<button id="ncCineSkip" type="button">Saltar (Esc)</button>';
  document.body.appendChild(fadeEl);
  document.body.appendChild(txtEl);
  document.body.appendChild(uiEl);
  const skipBtn = uiEl.firstChild;

  /* ================================================================= estado */
  const CINE_ = {
    on: false, seq: null, si: 0, lt: 0, last: 0, f: 0, txtT: 0,
    cam: new T.PerspectiveCamera(50, 1, .3, 1400), look: new T.Vector3(),
    ts0: 1, cb: null, made: [], p: null, plock: false, tag: ''
  };
  window.CINE_ = CINE_;                       // solo para depuracion

  /* ============================================================== utilidades */
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // ease-in-out cubic

  function setTxt(t) { txtEl.textContent = t || ''; txtEl.style.opacity = t ? 1 : 0; }
  function setFade(v) { if (v > 0) fadeEl.style.display = 'block'; fadeEl.style.opacity = v; }

  /* ================================================================= actores */
  /* descriptor: {h, p:[x,y,z], ry, sp, aim, up, mk:[camisa,pantalon,pelo,gorro]} */
  function actor(h, p, ry, sp, aim, up) {
    return { h: h || null, p: p, ry: ry || 0, sp: sp || 0, aim: aim ? 1 : 0, up: up ? 1 : 0 };
  }
  function ensureActor(a) {
    if (!a) return null;
    if (!a.h && a.mk) {
      try {
        a.h = mkHuman(a.mk[0], a.mk[1], a.mk[2], a.mk[3], 0);
        a.made = true; CINE_.made.push(a);      // mkHuman ya lo mete en la escena
      } catch (e) { a.h = null; }
    }
    return a.h;
  }
  function remember(a) {
    if (!a || a._mem || !a.h || !a.h.g) return;
    a._mem = { x: a.h.g.position.x, y: a.h.g.position.y, z: a.h.g.position.z, ry: a.h.g.rotation.y, vis: a.h.g.visible };
  }
  function placeActor(a, dt) {
    const h = a && a.h;
    if (!h || !h.g) return;
    const p = a.p;
    h.g.position.set(p[0], p[1], p[2]);
    h.g.rotation.y = a.ry || 0;
    try { if (typeof anim === 'function') anim(h, a.sp || 0, dt, a.aim || 0, a.up || 0, p[1]); } catch (e) { }
  }
  function restoreActor(a) {
    const h = a && a.h;
    if (!h || !h.g) return;
    if (a._mem) {
      h.g.position.set(a._mem.x, a._mem.y, a._mem.z);
      h.g.rotation.y = a._mem.ry;
      h.g.visible = a._mem.vis;
    }
    if (a.made) { try { scene.remove(h.g); } catch (e) { } }
  }

  /* ========================================================== normalizacion */
  function norm(s) {
    const o = {
      tipo: s.tipo || 'shot',
      dur: Math.max(.25, +s.dur || 2),
      cam: s.cam ? [+s.cam[0], +s.cam[1], +s.cam[2]] : null,
      cam2: s.cam2 ? [+s.cam2[0], +s.cam2[1], +s.cam2[2]] : null,
      look: s.look ? [+s.look[0], +s.look[1], +s.look[2]] : null,
      look2: s.look2 ? [+s.look2[0], +s.look2[1], +s.look2[2]] : null,
      fov: s.fov == null ? null : +s.fov,
      fov2: s.fov2 == null ? null : +s.fov2,
      texto: s.texto || '',
      t0: s.t0 == null ? .5 : +s.t0,
      td: s.td == null ? 3.6 : +s.td,
      say: s.say || null,
      accion: typeof s.accion === 'function' ? s.accion : null,
      limpiar: typeof s.limpiar === 'function' ? s.limpiar : null,
      fadeIn: s.fadeIn == null ? .24 : +s.fadeIn,
      fadeOut: s.fadeOut == null ? .24 : +s.fadeOut,
      actores: [], _said: 0
    };
    const list = [];
    if (s.actor) { if (Array.isArray(s.actor)) list.push(...s.actor); else list.push(s.actor); }
    if (s.actores) list.push(...s.actores);
    for (const a of list) if (a) o.actores.push(a);
    return o;
  }

  /* ================================================================ arranque */
  function play(seq, alTerminar) {
    try {
      if (!Array.isArray(seq) || !seq.length) { if (alTerminar) alTerminar(false); return false; }
      if (CINE_.on) { NC.log('cine: ya hay una escena en curso'); return false; }
      try {
        if (window.INTRO_ && window.INTRO_.on) {          // la intro tiene prioridad
          NC.log('cine: la intro esta en marcha; la escena se omite');
          if (alTerminar) alTerminar(false);
          return false;
        }
      } catch (e) { }
      try {
        const cut = document.getElementById('nccut');
        if (cut && cut.classList.contains('on')) {          // el corte de las misiones sueltas
          NC.log('cine: hay otro corte en marcha; la escena se omite');
          if (alTerminar) alTerminar(false);
          return false;
        }
      } catch (e) { }

      const S = [];
      for (const s of seq) S.push(norm(s));
      for (let i = 1; i < S.length; i++) {                // hereda camara del plano anterior
        const p = S[i - 1], s = S[i];
        if (!s.cam) { s.cam = p.cam; s.cam2 = p.cam2; }
        if (!s.look) { s.look = p.look; s.look2 = p.look2; }
        if (s.fov == null) s.fov = p.fov;
        if (s.fov2 == null) s.fov2 = p.fov2;
      }
      if (!S[0].cam) S[0].cam = [0, 3, 0];
      if (!S[0].look) S[0].look = [0, 1, 0];
      if (S[0].fov == null) S[0].fov = 50;

      CINE_.seq = S; CINE_.si = 0; CINE_.lt = 0; CINE_.f = 0; CINE_.txtT = 0;
  CINE_.on = true;                 // la escena queda activa (flag interno)
      CINE_.cb = typeof alTerminar === 'function' ? alTerminar : null;
      CINE_.made = []; CINE_.last = performance.now();

      CINE_.ts0 = (typeof timeScale === 'number') ? timeScale : 1;
      try {
        CINE_.p = {
          foot: !!P.foot, x: P.x, z: P.z, th: P.th, fx: P.fx, fz: P.fz, fth: P.fth,
          vis: (P.h && P.h.g) ? P.h.g.visible : true
        };
      } catch (e) { CINE_.p = null; }
      try { CINE_.plock = (document.pointerLockElement === cn); } catch (e) { CINE_.plock = false; }

      for (const s of S) for (const a of s.actores) { ensureActor(a); remember(a); }

      /* ---- congelar el juego ---- */
      try { timeScale = 0; } catch (e) { }
      try { for (const k in keys) keys[k] = 0; } catch (e) { }
      try { if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock(); } catch (e) { }
      try { if (P.foot && P.h && P.h.g) P.h.g.visible = false; } catch (e) { }

      document.body.classList.add('ncCineOn');
      fadeEl.style.display = 'block'; fadeEl.style.opacity = 1;
      txtEl.textContent = ''; txtEl.style.opacity = 0;
      uiEl.style.display = 'block';

      const tot = S.reduce((a, s) => a + s.dur, 0);
      NC.log('cine: comienza (' + tot.toFixed(1) + ' s, ' + S.length + ' planos)');
      return true;
    } catch (e) {
      NC.log('cine: fallo al arrancar', e);
      try { restore(); } catch (e2) { }
      return false;
    }
  }

  /* =================================================================== bucle */
  function tick() {
    const now = performance.now();
    let dt = (now - CINE_.last) / 1000; CINE_.last = now;
    if (!(dt > 0)) dt = .016;
    if (dt > .12) dt = .12;
    CINE_.f++;
    try { timeScale = 0; } catch (e) { }                 // el juego sigue congelado
    if (CINE_.txtT > 0) { CINE_.txtT -= dt; if (CINE_.txtT <= 0) setTxt(''); }

    CINE_.lt += dt;
    let guard = 0;
    while (guard++ < 90) {
      const sh = CINE_.seq[CINE_.si];
      if (!sh) { finish(false); return; }
      if (CINE_.lt < sh.dur) break;
      CINE_.lt -= sh.dur; CINE_.si++;
      const prev = CINE_.seq[CINE_.si - 1];
      if (prev && prev.limpiar) { try { prev.limpiar(); } catch (e) { } }
      const nx = CINE_.seq[CINE_.si];
      if (!nx) { finish(false); return; }
      setTxt(''); CINE_.txtT = 0;
    }
    const sh = CINE_.seq[CINE_.si];
    if (!sh) { finish(false); return; }

    const u = clamp(CINE_.lt / Math.max(.05, sh.dur), 0, 1), e = easeIO(u);
    /* ---- camara ---- */
    const c0 = sh.cam, c1 = sh.cam2 || sh.cam, l0 = sh.look, l1 = sh.look2 || sh.look;
    CINE_.cam.position.set(lerp(c0[0], c1[0], e), lerp(c0[1], c1[1], e), lerp(c0[2], c1[2], e));
    CINE_.look.set(lerp(l0[0], l1[0], e), lerp(l0[1], l1[1], e), lerp(l0[2], l1[2], e));
    CINE_.cam.lookAt(CINE_.look);
    const f0 = sh.fov == null ? 50 : sh.fov, f1 = sh.fov2 == null ? f0 : sh.fov2;
    const fv = lerp(f0, f1, e);
    if (Math.abs(CINE_.cam.fov - fv) > .01) { CINE_.cam.fov = fv; CINE_.cam.updateProjectionMatrix(); }
    /* ---- fundido a negro ---- */
    let fv2 = 0;
    if (sh.fadeIn > 0 && CINE_.lt < sh.fadeIn) fv2 = 1 - CINE_.lt / sh.fadeIn;
    else if (sh.fadeOut > 0 && CINE_.lt > sh.dur - sh.fadeOut) fv2 = (CINE_.lt - (sh.dur - sh.fadeOut)) / sh.fadeOut;
    setFade(clamp(fv2, 0, 1));
    /* ---- accion del plano (puede mover a los actores) ---- */
    if (sh.accion) { try { sh.accion(CINE_.lt, dt, sh); } catch (e) { NC.log('cine: accion', e); } }
    /* ---- actores ---- */
    for (const a of sh.actores) placeActor(a, dt);
    /* ---- subtitulos ---- */
    if (sh.say) {
      for (let i = 0; i < sh.say.length; i++) {
        const L = sh.say[i];
        if (sh._said <= i && CINE_.lt >= (L.at == null ? .5 : L.at)) {
          sh._said = i + 1; setTxt(L.t); CINE_.txtT = (L.d == null ? 3.4 : L.d);
        }
      }
    } else if (sh.texto && !sh._said && CINE_.lt >= sh.t0) {
      sh._said = 1; setTxt(sh.texto); CINE_.txtT = sh.td;
    }
    /* ---- proporcion ---- */
    const asp = innerWidth / Math.max(1, innerHeight);
    if (Math.abs(CINE_.cam.aspect - asp) > .002) { CINE_.cam.aspect = asp; CINE_.cam.updateProjectionMatrix(); }
    /* ---- cielo y sol pegados a la camara de la escena ---- */
    try { skyG.position.copy(CINE_.cam.position); } catch (e) { }
    try {
      sunL.position.set(CINE_.cam.position.x + sunDir.x * 160, sunDir.y * 160, CINE_.cam.position.z + sunDir.z * 160);
      sunL.target.position.set(CINE_.cam.position.x, 0, CINE_.cam.position.z);
    } catch (e) { }
  }

  /* ============================================================== restauracion */
  function restore() {
    try { if (window.NC && NC.letterbox) NC.letterbox(false); } catch (e) { }
    try {
      const S = CINE_.seq || [];
      for (const s of S) {
        for (const a of s.actores) restoreActor(a);
        if (s.limpiar) { try { s.limpiar(); } catch (e) { } }
      }
      for (const a of CINE_.made) { try { if (a.h && a.h.g) scene.remove(a.h.g); } catch (e) { } }
      CINE_.made = [];
    } catch (e) { }
    try {
      const p = CINE_.p;
      if (p) {
        P.foot = p.foot;                                  // si estaba en el coche, vuelve al coche
        P.x = p.x; P.z = p.z; P.th = p.th;
        P.fx = p.fx; P.fz = p.fz; P.fth = p.fth;
        if (P.h && P.h.g) P.h.g.visible = p.vis;
      }
    } catch (e) { }
    try { timeScale = (CINE_.ts0 == null || CINE_.ts0 <= 0) ? 1 : CINE_.ts0; } catch (e) { }
    try { document.body.classList.remove('ncCineOn'); } catch (e) { }
    try { fadeEl.style.opacity = 0; fadeEl.style.display = 'none'; } catch (e) { }
    try { setTxt(''); CINE_.txtT = 0; } catch (e) { }
    try { uiEl.style.display = 'none'; } catch (e) { }
    try {
      if (CINE_.plock && cn && cn.requestPointerLock) {
        const q = cn.requestPointerLock(); if (q && q.catch) q.catch(() => { });
      }
    } catch (e) { }
    CINE_.seq = null; CINE_.p = null;
  }

  function finish(saltada) {
    if (!CINE_.on) return;
    CINE_.on = false;
    try { restore(); } catch (e) { NC.log('cine: restore', e); }
    const cb = CINE_.cb; CINE_.cb = null;
    if (cb) { try { cb(!!saltada); } catch (e) { NC.log('cine: callback', e); } }
    NC.log('cine: terminada' + (saltada ? ' (saltada)' : ''));
  }
  function skip() {
    if (!CINE_.on) return;
    NC.log('cine: saltada por el jugador');
    finish(true);
  }

  /* ================================================================ eventos */
  function onKey(e) {
    if (!CINE_.on) return;
    if (e.code === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation();
      skip();
    }
  }
  addEventListener('keydown', onKey, true);
  try {
    uiEl.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    skipBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); skip(); });
  } catch (e) { }
  try {                                     // durante la escena no se dispara ni se mira con el raton
    cn.addEventListener('mousedown', e => { if (CINE_.on) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  } catch (e) { }

  /* ------------------------------------------- la cinematica usa su propia camara */
  try {
    const _render = rd.render;
    rd.render = function (sc, cm) {
      if (CINE_.on) {
        try { tick(); } catch (e) { NC.log('cine: tick', e); finish(false); }
        if (!CINE_.on) return _render.call(rd, sc, cm);
        try { skyG.position.copy(CINE_.cam.position); } catch (e) { }
        return _render.call(rd, sc, CINE_.cam);
      }
      return _render.call(rd, sc, cm);
    };
  } catch (e) { NC.log('cine: render', e); }

  /* ================================================== secuencias de la mision */
  /* Lugares reales: muelle de Colina (EXT+22=440, z 196, tabla 432..458 x 200..208 a y .38),
     nave abandonada FACTORY (342,-342) con la puerta en z=-330, oficina en (336,-336). */

  /* --- FASE 1: Rita en el muelle mira al puerto --- */
  function seqRita() {
    const mm = NC.mision;
    const rita = (mm && mm.rita) ? mm.rita.h : null;
    const A = actor(rita, [447, .46, 204], -2.03, .45);      // sobre la tabla del muelle, mirando al noroeste (el puerto)
    const sway = t => { A.ry = -2.03 + Math.sin(t * .7) * .06; };
    return [
      {
        tipo: 'shot', dur: 3.4,
        cam: [472, 19, 236], cam2: [461, 11.5, 221],
        look: [447, 1.6, 204], look2: [447, 1.95, 204],
        fov: 58, fov2: 50, actor: [A], accion: sway,
        t0: .9, td: 2.5,
        texto: '— El paquete sale de la nave doce. Aparca fuera: dentro hay dos matones.'
      },
      {
        tipo: 'shot', dur: 3.0,
        cam: [450.6, 2.72, 205.9], cam2: [449.3, 2.56, 205.2],
        look: [447, 2.06, 204.1], look2: [447, 2.0, 204],
        fov: 40, fov2: 34, actor: [A], accion: sway
      },
      {
        tipo: 'dialogo', dur: 2.8,
        cam: [445.7, 2.3, 203.36], cam2: [446.05, 2.25, 203.27],
        look: [447, 2.13, 204], look2: [447, 2.1, 204],
        fov: 30, fov2: 26, actor: [A], accion: sway,
        t0: .4, td: 2.4,
        texto: '— Vuelve al muelle con el paquete. Solo tu y yo.'
      }
    ];
  }

  /* --- FASE 3: los dos matones aparecen por la puerta de la nave --- */
  function seqHostiles() {
    const mm = NC.mision;
    const hs = (mm && mm.hostiles) ? mm.hostiles : [];
    const A1 = actor(hs[0] ? hs[0].h : null, [340.2, .42, -323.5], Math.PI, 1.7);
    const A2 = actor(hs[1] ? hs[1].h : null, [343.4, .42, -322.6], Math.PI, 1.7);
    const walk = (a, z0, z1, t, dur) => { a.p[2] = lerp(z0, z1, clamp(t / dur, 0, 1)); };
    return [
      {
        tipo: 'shot', dur: 2.9,                    // reaccion del jugador: su punto de vista
        cam: [344.4, 1.7, -339.8], cam2: [343.7, 1.68, -338.5],
        look: [341.3, 1.5, -330.4], look2: [341.2, 1.45, -330.9],
        fov: 66, fov2: 58, actor: [A1, A2],
        accion: t => { walk(A1, -323.5, -327.6, t, 2.9); walk(A2, -322.6, -326.8, t, 2.9); },
        t0: 1.0, td: 1.9,
        texto: '— Dos. Ya estaban dentro.'
      },
      {
        tipo: 'shot', dur: 3.1,                    // los dos matones en la puerta
        cam: [337.2, 1.25, -333.2], cam2: [338.0, 1.45, -332.2],
        look: [341.8, 1.9, -329.2], look2: [341.8, 1.85, -330.0],
        fov: 48, fov2: 42, actor: [A1, A2],
        accion: t => { walk(A1, -327.6, -330.2, t, 3.1); walk(A2, -326.8, -329.4, t, 3.1); },
        t0: 1.2, td: 1.9,
        texto: '— Si entras, no sales. Asi que entra bien.'
      },
      {
        tipo: 'dialogo', dur: 2.8,                // primer plano del que manda
        cam: [340.2, 2.27, -332.0], cam2: [340.3, 2.23, -331.8],
        look: [340.2, 2.14, -330.5], look2: [340.2, 2.11, -330.5],
        fov: 32, fov2: 28, actor: [A1, A2],
        accion: () => { A1.p[2] = -330.5; A2.p[2] = -329.5; A1.sp = .3; A2.sp = .3; },
        t0: .5, td: 2.3,
        texto: '— Y ahora saben que estoy aqui.'
      }
    ];
  }

  /* --- FASE 6: la caja fuerte y el paquete --- */
  function seqCaja() {
    const mm = NC.mision;
    const S = (mm && mm.safe) ? mm.safe : null;
    const door = S ? S.door : null;
    const glow = S ? S.glow : null;
    const rot0 = door ? door.rotation.y : 0;
    const op0 = (glow && glow.material) ? glow.material.opacity : .55;
    const swing = t => { if (door) door.rotation.y = lerp(-1.12, -1.5, easeIO(clamp(t / 1.35, 0, 1))); };
    const limpiar = () => { if (door) door.rotation.y = rot0; if (glow && glow.material) glow.material.opacity = op0; };
    return [
      {
        tipo: 'shot', dur: 3.2,                    // la caja abriéndose
        cam: [335.8, 1.45, -339.4], cam2: [336.4, 1.3, -338.6],
        look: [338.2, 0.85, -336.9], look2: [338.15, 0.7, -337.0],
        fov: 44, fov2: 38, accion: swing, limpiar: limpiar,
        t0: .9, td: 2.3,
        texto: '— En la caja hay un paquete que vale mas que este muelle.'
      },
      {
        tipo: 'shot', dur: 3.0,                    // primer plano del paquete
        cam: [336.35, 0.72, -338.45], cam2: [336.7, 0.6, -338.05],
        look: [337.4, 0.3, -337.1], look2: [337.35, 0.27, -337.15],
        fov: 34, fov2: 30, limpiar: limpiar,
        accion: t => { if (glow && glow.material) glow.material.opacity = op0 + .3 * Math.abs(Math.sin(t * 2.2)); },
        t0: .6, td: 2.4,
        texto: '— Abrela. Y sal corriendo: ya saben que estas aqui.'
      },
      {
        tipo: 'dialogo', dur: 2.6,                 // la caja abierta, plano general corto
        cam: [334.9, 1.95, -340.3], cam2: [335.3, 2.05, -339.7],
        look: [338.4, 0.8, -337.0], look2: [338.4, 0.78, -337.05],
        fov: 48, fov2: 42, limpiar: limpiar
      }
    ];
  }

  /* ==================================================================== API */
  /* OJO: src/missions.js ya usa NC.cine como la cinematica de llegada de las
     misiones sueltas (NC.cine(fn, dur)). Ese contrato NO se pisa: NC.cine sigue
     siendo una funcion llamable y el motor nuevo se cuelga de ella
     (NC.cine.play(secuencia, alTerminar) · NC.cine.seqs · NC.cine.on). */
  const LEGACY = (typeof NC.cine === 'function') ? NC.cine : null;
  const API = function (a, b) {
    if (Array.isArray(a)) return play(a, b);              // NC.cine([...], cb) tambien vale
    if (LEGACY) return LEGACY.apply(this, arguments);
  };
  API.play = play;
  API.skip = skip;
  API.seqs = { rita: seqRita, hostiles: seqHostiles, caja: seqCaja };
  try { Object.defineProperty(API, 'on', { get() { return CINE_.on; }, configurable: true }); }
  catch (e) { API.on = false; }
  try { Object.defineProperty(API, 'state', { get() { return CINE_; }, configurable: true }); }
  catch (e) { API.state = CINE_; }
  NC.cine = API;
  NC.log('cine: motor listo (3 secuencias de la mision, salto con Esc)');
})();
