/* Neon Coast - INTRODUCCION cinematografica (src/intro.js)
   Se reproduce SOLO al empezar una partida nueva, antes de que el jugador
   controle al personaje, y termina conectando con la primera mision.
   4 actos: EL MUNDO (12s) · EL MISTERIO (12s) · PISTAS (11s) · TUS (8.6s) = ~45s
   Se salta con Esc o con el boton "Saltar (Esc)". Al saltar no cambia nada:
   ni la historia, ni el dinero, ni las recompensas. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const NC = window.NC, T = THREE;

  /* ================================================================ estilos */
  NC.css(`
  #ncIntroFade{position:fixed;inset:0;background:#04020a;opacity:0;z-index:60;pointer-events:none;display:none}
  #ncIntroAct{position:fixed;left:50%;top:13%;transform:translateX(-50%);z-index:61;pointer-events:none;opacity:0;
    transition:opacity .9s ease;font:600 clamp(12px,1.4vw,16px)/1 "Trebuchet MS",system-ui,sans-serif;
    letter-spacing:.62em;text-transform:uppercase;color:#f2ebff;text-shadow:0 2px 18px #000d}
  #ncIntroTxt{position:fixed;left:50%;bottom:12%;transform:translateX(-50%);z-index:62;pointer-events:none;
    max-width:min(780px,88vw);text-align:center;opacity:0;transition:opacity .5s ease;
    font:400 clamp(15px,2.05vw,23px)/1.55 "Trebuchet MS","Segoe UI",system-ui,sans-serif;color:#fff7ea;
    text-shadow:0 2px 14px #000d,0 0 34px #0009}
  #ncIntroUI{position:fixed;right:14px;bottom:14px;z-index:63;display:none}
  #ncIntroSkip{background:rgba(8,5,20,.55);border:1px solid #ffffff30;color:#ffffffb0;border-radius:9px;
    padding:7px 13px;font:600 12px/1 "Trebuchet MS",system-ui,sans-serif;cursor:pointer;letter-spacing:.05em}
  #ncIntroSkip:hover{color:#fff;border-color:#ffffff70;background:rgba(8,5,20,.82)}
  #ncIntroOn #top,#ncIntroOn #comp,#ncIntroOn #obj,#ncIntroOn #mis,#ncIntroOn #mmw,#ncIntroOn #spd,
  #ncIntroOn #ncbar,#ncIntroOn #hint,#ncIntroOn #help,#ncIntroOn #cross,#ncIntroOn #stoZone,#ncIntroOn #stoObj,
  #ncIntroOn #mPanel,#ncIntroOn #ncE,#ncIntroOn #wp,#ncIntroOn #zone,#ncIntroOn #toast,#ncIntroOn #pop{display:none !important}
  `);

  /* ==================================================================== DOM */
  const fadeEl = document.createElement('div'); fadeEl.id = 'ncIntroFade';
  /* --- bandas negras cinematograficas (arriba y abajo) --- */
  NC.css([
    '#ncBarT,#ncBarB{position:fixed;left:0;right:0;height:0;background:#04030b;z-index:59;pointer-events:none;',
    '  transition:height .55s cubic-bezier(.25,.9,.3,1),opacity .55s ease;opacity:0}',
    '#ncBarT{top:0}#ncBarB{bottom:0}',
    '#ncBarT.on,#ncBarB.on{height:9.2vh;opacity:1}',
    '@media (max-aspect-ratio:3/4){#ncBarT.on,#ncBarB.on{height:6vh}}',
    '@media (min-aspect-ratio:21/9){#ncBarT.on,#ncBarB.on{height:12vh}}'
  ].join('\n'));
  const barT = document.createElement('div'); barT.id = 'ncBarT';
  const barB = document.createElement('div'); barB.id = 'ncBarB';
  document.body.appendChild(barT); document.body.appendChild(barB);
  function bar(on) {
    try {
      barT.classList.toggle('on', !!on);
      barB.classList.toggle('on', !!on);
    } catch (e) { }
  }
  window.NC && (NC.letterbox = bar);
  const actEl = document.createElement('div'); actEl.id = 'ncIntroAct';
  const txtEl = document.createElement('div'); txtEl.id = 'ncIntroTxt';
  const uiEl = document.createElement('div'); uiEl.id = 'ncIntroUI';
  uiEl.innerHTML = '<button id="ncIntroSkip" type="button">Saltar (Esc)</button>';
  document.body.appendChild(fadeEl);
  document.body.appendChild(actEl);
  document.body.appendChild(txtEl);
  document.body.appendChild(uiEl);
  const skipBtn = uiEl.firstChild;

  /* ================================================================= estado */
  const INTRO_ = {
    on: false, done: false, pass: false,
    t: 0, lt: 0, last: 0, si: 0, f: 0,
    shots: [], wx0: .68, ts0: 1,
    cam: new T.PerspectiveCamera(52, 1, .5, 1000),
    look: new T.Vector3(),
    txtT: 0, actT: 0,
    props: [], humans: [], bulbMat: null, glowMat: null, poolMat: null,
    car: null, carGlowMat: null, box: null
  };
  window.INTRO_ = INTRO_;   // solo para depuracion

  /* ============================================================== utilidades */
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;  // ease-in-out cubic

  function setTxt(t) { txtEl.textContent = t || ''; txtEl.style.opacity = t ? 1 : 0; }
  function setFade(v) {
    if (v > 0) fadeEl.style.display = 'block';
    fadeEl.style.opacity = v;
  }
  function showAct(sh) {
    const names = { 1: 'EL MUNDO', 2: 'EL MISTERIO', 3: 'PISTAS', 4: 'TUS' };
    actEl.textContent = names[sh.act] || '';
    actEl.style.opacity = 1;
    INTRO_.actT = 3.4;
  }
  function setWx(v) {   // hora del dia (0..1) con Wrap
    try { WX.t = ((v % 1) + 1) % 1; } catch (e) { }
  }

  /* ============================================================ decorado extra */
  function radialTex(inner) {
    const c = cv(128, 128), x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner || 'rgba(255,236,190,.95)');
    g.addColorStop(.45, 'rgba(255,214,140,.35)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return tex(c);
  }

  function mkProps() {
    const F = (window.FACTORY && isFinite(window.FACTORY.x)) ? window.FACTORY : { x: 342, z: -342 };
    INTRO_.props = [];

    /* ---- farola del muelle (parpadea) ---- */
    const lampG = new T.Group();
    const post = new T.Mesh(new T.CylinderGeometry(.07, .1, 4.3, 6),
      new T.MeshStandardMaterial({ color: 0x2b2b34, roughness: .55, metalness: .45 }));
    post.position.y = 2.15; lampG.add(post);
    const bulb = new T.Mesh(new T.SphereGeometry(.17, 10, 8),
      new T.MeshStandardMaterial({ color: 0xffe8c0, emissive: 0xffd9a0, emissiveIntensity: 1.6, roughness: .35 }));
    bulb.position.y = 4.32; lampG.add(bulb);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: radialTex('rgba(255,238,196,.95)'), transparent: true, opacity: .7, depthWrite: false, blending: T.AdditiveBlending }));
    halo.scale.set(3.4, 3.4, 1); halo.position.y = 4.32; lampG.add(halo);
    const pool = new T.Mesh(new T.PlaneGeometry(5, 5).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({ map: radialTex(), transparent: true, opacity: .35, depthWrite: false, blending: T.AdditiveBlending }));
    pool.position.y = .02; lampG.add(pool);
    lampG.position.set(433.4, .38, 205.6);
    scene.add(lampG); INTRO_.props.push(lampG);
    INTRO_.bulbMat = bulb.material; INTRO_.glowMat = halo.material; INTRO_.poolMat = pool.material;

    /* ---- coche con las luces encendidas (pase por la arena) ---- */
    const carG = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(4.3, .8, 1.95),
      new T.MeshStandardMaterial({ color: 0x241c30, roughness: .45, metalness: .5 }));
    body.position.y = .62; carG.add(body);
    const cab = new T.Mesh(new T.BoxGeometry(2.1, .62, 1.7),
      new T.MeshStandardMaterial({ color: 0x0e1018, roughness: .25, metalness: .6 }));
    cab.position.set(-.2, 1.3, 0); carG.add(cab);
    const hlMat = new T.MeshBasicMaterial({ color: 0xfff0c8 });
    const tlMat = new T.MeshBasicMaterial({ color: 0xff3355 });
    for (const s of [-1, 1]) {
      const h = new T.Mesh(new T.PlaneGeometry(.44, .22), hlMat);
      h.position.set(2.16, .68, s * .66); h.rotation.y = Math.PI / 2; carG.add(h);
      const gl = new T.Sprite(new T.SpriteMaterial({ map: radialTex('rgba(255,240,205,.95)'), transparent: true, opacity: .85, depthWrite: false, blending: T.AdditiveBlending }));
      gl.scale.set(3.2, 3.2, 1); gl.position.set(2.2, .7, s * .66); carG.add(gl);
      const t2 = new T.Mesh(new T.PlaneGeometry(.4, .2), tlMat);
      t2.position.set(-2.16, .68, s * .66); t2.rotation.y = -Math.PI / 2; carG.add(t2);
    }
    carG.position.set(418, .02, 197.5);   // el frente mira a +x
    carG.visible = false;
    scene.add(carG); INTRO_.props.push(carG);
    INTRO_.car = carG;

    /* ---- caja de madera junto al contenedor del puerto ---- */
    const crate = new T.Mesh(new T.BoxGeometry(1.1, .85, .9),
      new T.MeshStandardMaterial({ color: 0x7a5a30, roughness: .9 }));
    let cy = 0; try { cy = (typeof gh === 'function') ? gh(-237, -319) : 0; } catch (e) { }
    crate.position.set(-237, cy + .43, -319); crate.rotation.y = .35;
    scene.add(crate); INTRO_.props.push(crate);

    /* ---- cartel NAVE 12 (resplandor) ---- */
    const sgn = new T.Mesh(new T.PlaneGeometry(9.5, 2.9),
      new T.MeshBasicMaterial({ map: radialTex('rgba(255,214,120,.75)'), transparent: true, opacity: .5, depthWrite: false, blending: T.AdditiveBlending }));
    sgn.position.set(F.x, 7.2, F.z + 12.6);
    scene.add(sgn); INTRO_.props.push(sgn);

    /* ---- marca de grafiti sobre el muro de la playa ---- */
    const gc = cv(256, 160), gx = gc.getContext('2d');
    gx.clearRect(0, 0, 256, 160);
    gx.strokeStyle = 'rgba(255,90,122,.92)'; gx.lineWidth = 9; gx.lineCap = 'round';
    gx.beginPath(); gx.moveTo(46, 80); gx.lineTo(196, 80); gx.lineTo(150, 34); gx.moveTo(196, 80); gx.lineTo(150, 126); gx.stroke();
    gx.strokeStyle = 'rgba(39,230,255,.85)'; gx.lineWidth = 6;
    gx.beginPath(); gx.arc(58, 80, 20, 0, 7); gx.stroke();
    const gt = tex(gc); gt.wrapS = gt.wrapT = T.ClampToEdgeWrapping;
    const graf = new T.Mesh(new T.PlaneGeometry(2.6, 1.6),
      new T.MeshStandardMaterial({ map: gt, transparent: true, roughness: .95, emissive: 0xffffff, emissiveMap: gt, emissiveIntensity: .3, depthWrite: false }));
    graf.position.set(439.5, 2.0, 150.4); graf.rotation.y = -Math.PI / 2;
    scene.add(graf); INTRO_.props.push(graf);

    /* ---- los dos personajes del muelle ---- */
    try {
      const a = mkHuman(0x2b3040, 0x1a1a22, 0x14100c, 1, 0);
      a.g.position.set(438.5, .38, 201.8); a.g.rotation.y = Math.PI / 2; a.g.visible = false;
      scene.add(a.g); INTRO_.humans.push(a);
      const b = mkHuman(0x6a5340, 0x2a2a30, 0x3a2a1a, 0, 0);
      b.g.position.set(443, .38, 201.8); b.g.rotation.y = -Math.PI / 2; b.g.visible = false;
      scene.add(b.g); INTRO_.humans.push(b);
    } catch (e) { NC.log('intro: personajes', e); }

    /* ---- la caja que se intercambian ---- */
    const bx = new T.Mesh(new T.BoxGeometry(.44, .3, .32),
      new T.MeshStandardMaterial({ color: 0x9a7440, roughness: .8, emissive: 0x3a2a10, emissiveIntensity: .4 }));
    bx.visible = false; scene.add(bx); INTRO_.props.push(bx);
    INTRO_.box = bx;
  }

  function clearProps() {
    try { for (const p of INTRO_.props) scene.remove(p); } catch (e) { }
    try { for (const h of INTRO_.humans) scene.remove(h.g); } catch (e) { }
    INTRO_.props = []; INTRO_.humans = []; INTRO_.car = null; INTRO_.box = null;
  }

  /* ================================================================= planos */
  function buildShots() {
    const F = (window.FACTORY && isFinite(window.FACTORY.x)) ? window.FACTORY : { x: 342, z: -342 };
    const S = [];
    /* --- ACTO 1 · EL MUNDO --- */
    S.push({ act: 1, dur: 3.4, wx0: .90, wx1: .99,
      p0: [492, 15, 172], p1: [468, 4.4, 214], l0: [448, 2.2, 199], l1: [440, 1.2, 203],
      say: [{ at: .9, d: 3.4, t: 'La costa no duerme. Solo cambia de color.' }] });
    S.push({ act: 1, dur: 3.3, wx0: .99, wx1: 1.12,
      p0: [-76, 26, 120], p1: [-76, 34, 62], l0: [38, 16, 40], l1: [38, 13, 34],
      say: [{ at: 1.0, d: 3.4, t: 'Distrito Neón. Aquí nadie apaga las ventanas.' }] });
    S.push({ act: 1, dur: 3.1, wx0: 1.12, wx1: 1.18,
      p0: [-186, 22, -70], p1: [-244, 13, -84], l0: [-266, 5, -110], l1: [-284, 3, -126],
      say: [{ at: .9, d: 3.4, t: 'Chatarra Vieja. Lo que se rompió aquí, se quedó.' }] });
    S.push({ act: 1, dur: 3.0, wx0: 1.18, wx1: 1.30,
      p0: [-12, 7, 178], p1: [38, 34, 158], l0: [38, 2, 114], l1: [38, 1, 114],
      say: [{ at: .9, d: 3.4, t: 'Y al amanecer, el parque finge que no ha pasado nada.' }] });
    /* --- ACTO 2 · EL MISTERIO --- */
    S.push({ act: 2, dur: 12.4, cut: 1, wx0: .90, wx1: .88,
      p0: [470, 4.2, 221], p1: [453, 2.7, 210], l0: [441, 1.7, 202], l1: [441.5, 1.4, 202],
      say: [{ at: 1.2, d: 3.8, t: '— Llevo dos noches en este muelle. Nadie baja a esta hora.' },
            { at: 4.8, d: 3.8, t: '— Por eso te llamé. Y no fue por el barco.' },
            { at: 8.0, d: 3.8, t: '— Dejé una caja en manos de otro. Me pidió que no hiciera preguntas.' },
            { at: 11.6, d: 4.0, t: '— Esta mañana ya estaban preguntando por ella.' },
            { at: 15.4, d: 4.0, t: '— Yo no sé qué hay dentro. Sé quién no quería que saliera de aquí.' }] });
    /* --- ACTO 3 · PISTAS --- */
    S.push({ act: 3, dur: 2.9, wx0: .88, wx1: .86,
      p0: [-224, 3.4, -306], p1: [-231, 1.5, -312], l0: [-237, .8, -319], l1: [-237, .55, -319],
      say: [{ at: .7, d: 3.2, t: 'La caja no pesa lo que debería.' }] });
    S.push({ act: 3, dur: 2.8, wx0: .86, wx1: .85,
      p0: [F.x, 8.8, F.z + 30], p1: [F.x, 7.4, F.z + 21], l0: [F.x, 7.2, F.z + 12.4], l1: [F.x, 7.1, F.z + 12.4],
      say: [{ at: .6, d: 3.2, t: 'El número de la nave, pintado en la puerta.' }] });
    S.push({ act: 3, dur: 2.8, wx0: .85, wx1: .84,
      p0: [427, 2.6, 155], p1: [435, 2.1, 151.5], l0: [439.7, 1.9, 150], l1: [439.7, 1.8, 150],
      say: [{ at: .6, d: 3.2, t: 'Alguien marcó la pared y no volvió a limpiarla.' }] });
    S.push({ act: 3, dur: 2.7, wx0: .84, wx1: .83,
      p0: [-14, 1.2, -60], p1: [2, .9, -34], l0: [6, 2.4, -8], l1: [4, 1.8, 2],
      say: [{ at: .5, d: 3.2, t: 'La calle mojada devuelve lo que le das.' }] });
    S.push({ act: 3, dur: 2.6, wx0: .83, wx1: .82,
      p0: [436, 2.4, 214], p1: [444, 1.9, 210], l0: [449, 1.7, 205], l1: [449, 1.6, 205],
      say: [{ at: .5, d: 3.2, t: 'Y hay dos cosas que no encajan: la llamada y el silencio.' }] });
    /* --- ACTO 4 · TUS --- */
    S.push({ act: 4, dur: 8.6, wx0: .83, wx1: INTRO_.wx0, dyn: 1, p0: [0, 0, 0], p1: [0, 0, 0], l0: [0, 0, 0], l1: [0, 0, 0],
      say: [{ at: 3.4, d: 3.6, t: 'Y tú, sin saberlo todavía, ya estabas dentro.' },
            { at: 5.4, d: 4.2, t: 'NEON COAST — Capítulo 1' }] });
    /* la hora del dia continua entre planos (salto solo en el acto 2) */
    for (let i = 1; i < S.length; i++) if (!S[i].cut) S[i].wx0 = S[i - 1].wx1;
    for (const s of S) { s.fi = .35; s.fo = .35; s._s = 0; }
    return S;
  }

  /* ======================================================= camara del acto 4 */
  function dynShot(sh) {
    const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z, gy = P.gy || 0;
    sh.p0 = [px - 18, 58, pz + 30];
    sh.l0 = [px, .6, pz];
    const y = cam.yaw, pit = cam.pitch;
    if (P.foot) {
      const sy = Math.sin(y), cy = Math.cos(y), cp = Math.cos(pit), sp = Math.sin(pit);
      sh.p1 = [px - sy * 4.6 * cp - cy * .7, 1.6 + gy + sp * 4.6, pz - cy * 4.6 * cp + sy * .7];
      sh.l1 = [px + sy * 4 - cy * .7, 1.4 + gy, pz + cy * 4 + sy * .7];
    } else {
      sh.p1 = [px - Math.sin(y) * 7.5, 3.2, pz - Math.cos(y) * 7.5];
      sh.l1 = [px + Math.sin(y) * 5, 1.3, pz + Math.cos(y) * 5];
    }
  }

  /* ==================================================== animacion del acto 2 */
  function act2(lt, dt) {
    // farola parpadeante
    try {
      const fl = .55 + .45 * Math.sin(lt * 21.7) * Math.sin(lt * 7.3);
      const dip = Math.random() < .06 ? .16 : 1;
      const k = clamp(fl * dip + .22, 0, 1.35);
      if (INTRO_.bulbMat) INTRO_.bulbMat.emissiveIntensity = .5 + 2.4 * k;
      if (INTRO_.glowMat) INTRO_.glowMat.opacity = .18 + .6 * k;
      if (INTRO_.poolMat) INTRO_.poolMat.opacity = .08 + .42 * k;
    } catch (e) { }
    // coche con los faros encendidos
    try {
      if (INTRO_.car) {
        INTRO_.car.visible = true;
        const u = clamp((lt - 1.2) / 9.6, 0, 1);
        INTRO_.car.position.x = lerp(418, 448, u);
      }
    } catch (e) { }
    // los dos personajes
    const A = INTRO_.humans[0], B = INTRO_.humans[1];
    try {
      if (A) {
        A.g.visible = true;
        A.g.position.set(438.5, .38, 201.8); A.g.rotation.y = Math.PI / 2;
        anim(A, 0, dt, false, false, .38);
      }
      if (B) {
        B.g.visible = true;
        if (lt < 8.4) {
          B.g.position.set(443, .38, 201.8); B.g.rotation.y = -Math.PI / 2;
          anim(B, 0, dt, false, false, .38);
        } else {
          const u = clamp((lt - 8.4) / 3.6, 0, 1), e = easeIO(u);
          B.g.position.set(lerp(443, 451.5, e), .38, 201.8 + u * .9);
          B.g.rotation.y = lerp(-Math.PI / 2, 0, easeIO(clamp(u * 1.7, 0, 1)));
          anim(B, 1.7 * u, dt, false, false, .38);
        }
      }
    } catch (e) { }
    // la caja pasa de una mano a otra
    try {
      const bx = INTRO_.box;
      if (bx) {
        bx.visible = true;
        if (lt < 3.4) bx.position.set(442.9, 1.26, 202.1);
        else if (lt < 5.8) {
          const u = easeIO(clamp((lt - 3.4) / 2.4, 0, 1));
          bx.position.set(lerp(442.9, 438.6, u), 1.26 + Math.sin(u * Math.PI) * .14, lerp(202.1, 202.05, u));
          bx.rotation.y += dt * 1.6;
        } else bx.position.set(438.6, 1.26, 202.05);
      }
    } catch (e) { }
  }

  /* ================================================================== bucle */
  function tick() {
    const now = performance.now();
    let dt = (now - INTRO_.last) / 1000; INTRO_.last = now;
    if (!(dt > 0)) dt = .016;
    if (dt > .12) dt = .12;
    INTRO_.f++;
    // textos
    if (INTRO_.txtT > 0) { INTRO_.txtT -= dt; if (INTRO_.txtT <= 0) setTxt(''); }
    if (INTRO_.actT > 0) { INTRO_.actT -= dt; if (INTRO_.actT <= 0) actEl.style.opacity = 0; }
    // avanzar de plano
    INTRO_.lt += dt;
    let guard = 0;
    while (guard++ < 60) {
      const sh = INTRO_.shots[INTRO_.si];
      if (!sh) { finish(); return; }
      if (INTRO_.lt < sh.dur) break;
      INTRO_.lt -= sh.dur; INTRO_.si++;
      const nx = INTRO_.shots[INTRO_.si];
      if (!nx) { finish(); return; }
      if (nx.cut) setWx(nx.wx0);
      if (nx.act !== sh.act) showAct(nx);
      if (nx.act === 4) { try { cam.yaw = P.foot ? 0 : (P.th || 0); cam.pitch = .3; } catch (e) { } }
      setTxt(''); INTRO_.txtT = 0; nx._s = 0;
    }
    const sh = INTRO_.shots[INTRO_.si];
    if (!sh) { finish(); return; }
    const fi = sh.fi, fo = sh.fo;
    const span = Math.max(.2, sh.dur - fi - fo);
    const u = clamp((INTRO_.lt - fi) / span, 0, 1), e = easeIO(u);
    // hora del dia
    if (!sh.cut) setWx(lerp(sh.wx0, sh.wx1, easeIO(clamp(INTRO_.lt / sh.dur, 0, 1))));
    // camara
    if (sh.dyn) dynShot(sh);
    INTRO_.cam.position.set(lerp(sh.p0[0], sh.p1[0], e), lerp(sh.p0[1], sh.p1[1], e), lerp(sh.p0[2], sh.p1[2], e));
    INTRO_.look.set(lerp(sh.l0[0], sh.l1[0], e), lerp(sh.l0[1], sh.l1[1], e), lerp(sh.l0[2], sh.l1[2], e));
    INTRO_.cam.lookAt(INTRO_.look);
    // fundido a negro
    let fv = 0;
    if (INTRO_.lt < fi) fv = 1 - INTRO_.lt / fi;
    else if (INTRO_.lt > sh.dur - fo) fv = (INTRO_.lt - (sh.dur - fo)) / fo;
    setFade(clamp(fv, 0, 1));
    // subtitulos
    if (sh.say) for (let i = 0; i < sh.say.length; i++) {
      const L = sh.say[i];
      if (sh._s <= i && INTRO_.lt >= L.at) { sh._s = i + 1; setTxt(L.t); INTRO_.txtT = L.d; }
    }
    // elementos de la escena
    if (sh.act === 2) act2(INTRO_.lt, dt);
    else { try { if (INTRO_.car) INTRO_.car.visible = false; } catch (e) { } }
    if (sh.act === 4 && INTRO_.lt > 5.2) document.body.classList.remove('ncIntroOn');
    // cielo coherente con la hora y el sol pegado a la camara
    if (INTRO_.f % 8 === 0) { try { paintSky(); } catch (e) { } }
    try {
      skyG.position.copy(INTRO_.cam.position);
      sunL.position.set(INTRO_.cam.position.x + sunDir.x * 160, sunDir.y * 160, INTRO_.cam.position.z + sunDir.z * 160);
      sunL.target.position.set(INTRO_.cam.position.x, 0, INTRO_.cam.position.z);
    } catch (e) { }
    // proporcion
    const asp = innerWidth / Math.max(1, innerHeight);
    if (Math.abs(INTRO_.cam.aspect - asp) > .002) { INTRO_.cam.aspect = asp; INTRO_.cam.updateProjectionMatrix(); }
  }

  /* =========================================================== arranque real */
  function playNow() {
    try { if (typeof startStep === 'function') startStep(); } catch (e) { }   // primera mision activa
    try {
      INTRO_.pass = true;
      const b = document.getElementById('play');
      if (b && b.click) b.click();
    } catch (e) { NC.log('intro: play', e); }
    finally { INTRO_.pass = false; }
    try { localStorage.setItem('ncPlayed', '1'); } catch (e) { }
  }

  function restore() {
    try { setWx(INTRO_.wx0); paintSky(); } catch (e) { }
    try { bar(false); } catch (e) { }
    try { timeScale = (INTRO_.ts0 == null ? 1 : INTRO_.ts0); } catch (e) { }
    try { document.body.classList.remove('ncIntroOn'); } catch (e) { }
    try { fadeEl.style.opacity = 0; fadeEl.style.display = 'none'; } catch (e) { }
    try { actEl.style.opacity = 0; actEl.textContent = ''; } catch (e) { }
    try { setTxt(''); } catch (e) { }
    try { uiEl.style.display = 'none'; } catch (e) { }
    clearProps();
  }

  function finish() {
    if (!INTRO_.on) return;
    INTRO_.on = false;
    try { restore(); } catch (e) { NC.log('intro: restore', e); }
    playNow();
    NC.log('intro: terminada (historia intacta)');
  }

  function skip() {
    if (!INTRO_.on) return;
    NC.log('intro: saltada');
    finish();
  }

  function abort() {
    if (!INTRO_.on) return;
    INTRO_.on = false;
    try { restore(); } catch (e) { }
    playNow();
  }

  /* =============================================================== arranque */
  function shouldPlay() {
    try {
      if (localStorage.getItem('ncPlayed')) return false;          // ya se juega
      if (localStorage.getItem('neonCoastSave')) return false;      // partida guardada
      const raw = localStorage.getItem('ncStory');
      if (raw) { try { const p = JSON.parse(raw); if (p && (p.ch | 0) > 0) return false; } catch (e) { } }
      let ch = null;
      if (NC.sto && NC.sto.state && typeof NC.sto.state.ch === 'number') ch = NC.sto.state.ch;
      if (ch === null && NC.sto && NC.sto.debug && NC.sto.debug.S) { const s = NC.sto.debug.S(); if (s) ch = s.ch; }
      if (ch === null && typeof S !== 'undefined' && S && typeof S.ch === 'number') ch = S.ch;
      if (ch === null) return true;
      return (ch | 0) === 0;
    } catch (e) { return false; }
  }

  function start() {
    if (INTRO_.on || INTRO_.done) return;
    INTRO_.done = true;
    INTRO_.on = true;
    try { bar(true); } catch (e) { }
    INTRO_.wx0 = WX.t;
    INTRO_.ts0 = timeScale;
    INTRO_.last = performance.now();
    INTRO_.si = 0; INTRO_.lt = 0; INTRO_.t = 0; INTRO_.f = 0;
    try { for (const k in keys) keys[k] = 0; } catch (e) { }
    timeScale = 0;                                   // congela la simulacion
    document.body.classList.add('ncIntroOn');        // oculta el HUD
    fadeEl.style.display = 'block'; fadeEl.style.opacity = 1;
    actEl.textContent = ''; actEl.style.opacity = 0;
    txtEl.textContent = ''; txtEl.style.opacity = 0;
    uiEl.style.display = 'block';
    INTRO_.shots = buildShots();
    mkProps();
    setWx(INTRO_.shots[0].wx0);
    try { paintSky(); } catch (e) { }
    showAct(INTRO_.shots[0]);
    const tot = INTRO_.shots.reduce((a, s) => a + s.dur, 0);
    NC.log('intro: comienza (' + tot.toFixed(1) + ' s, ' + INTRO_.shots.length + ' planos)');
  }

  /* ================================================================ eventos */
  function onClick(e) {
    if (INTRO_.pass) return;                         // click real del boton
    const t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    if (!t.closest('#play')) return;
    if (!shouldPlay()) return;                       // no es partida nueva: juego normal
  try { const s0 = document.getElementById('start'); if (s0) s0.style.display = 'none'; } catch (e) { }   // el menu se cierra al pulsar Jugar
    e.preventDefault(); e.stopImmediatePropagation();
    try { start(); } catch (err) { NC.log('intro: fallo al arrancar', err); abort(); }
  }

  function onKey(e) {
    if (!INTRO_.on) return;
    if (e.code === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation();
      skip();
    }
  }

  document.addEventListener('click', onClick, true);
  addEventListener('keydown', onKey, true);
  try {
    skipBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); skip(); });
  } catch (e) { }

  /* ------------------------------------------- la intro usa su propia camara */
  try {
    const _render = rd.render;
    rd.render = function (sc, cam) {
      if (INTRO_.on) {
        try { tick(); } catch (e) { NC.log('intro: tick', e); abort(); }
        if (!INTRO_.on) return _render.call(rd, sc, cam);
        try { skyG.position.copy(INTRO_.cam.position); } catch (e) { }
        return _render.call(rd, sc, INTRO_.cam);
      }
      return _render.call(rd, sc, cam);
    };
  } catch (e) { NC.log('intro: render', e); }

  NC.log('intro: listo (partida nueva)');
})();
