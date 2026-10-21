/* Neon Coast - gente: humanos con mas poligonos, proporciones variedas, pelo con volumen,
   ropa y calzado, LOD por distancia y personalidad propia para cada vecino de Neon Coast. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;
  const CGC = (typeof cg !== 'undefined') ? cg : function (g, c) {
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    const cc = new T.Color(c); for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; }
    g.setAttribute('color', new T.BufferAttribute(a, 3)); return g;
  };
  const hc = (a, b) => a + Math.random() * (b - a);
  const dk = c => { const k = new T.Color(c); k.multiplyScalar(.8); return k.getHex(); };
  const lt = c => { const k = new T.Color(c); k.multiplyScalar(1.12); return k.getHex(); };

  // ---------- materiales ----------
  const weave = (window.NCT && NCT.weave) ? NCT.weave : null;
  const HMAT3 = new T.MeshStandardMaterial({
    vertexColors: true, roughness: .78, metalness: .02,
    map: weave || (typeof HMTEX !== 'undefined' ? HMTEX : null)
  });
  if (weave) { HMAT3.map.repeat.set(2, 2); }

  // ---------- geometria humana mejorada ----------
  const S = T.SphereGeometry, C = T.CylinderGeometry, B = T.BoxGeometry;
  const es = (r, c, sx, sy, sz, x, y, z, w) => CGC(new S(r, w || 12, w ? Math.max(6, w - 2) : 8).scale(sx, sy, sz).translate(x, y, z), c);
  const cy = (rt, rb, h, x, y, z, c, seg) => CGC(new C(rt, rb, h, seg || 12).translate(x, y, z), c);
  const bu = (w, h, d, x, y, z, c, rz) => CGC(new B(w, h, d).translate(x, y, z).rotateZ(rz || 0), c);
  const SKIN = [0xe8b48c, 0xd9a074, 0xc08a5e, 0xa9714a, 0x8a5a3a, 0xf0c9a4];

  function hgeo3(sh, pa, ha, hat, build) {
    const B_ = build || { h: 1, w: 1, g: 1, age: 0, hair: 0 };
    const key = sh + '_' + pa + '_' + ha + '_' + hat + '_' + B_.h + '_' + B_.w + '_' + B_.g + '_' + B_.age + '_' + B_.hair;
    if (H3[key]) return H3[key];
    const skin = SKIN[(sh + pa) % SKIN.length];
    const wsc = B_.w, gsc = B_.g, hsc = B_.h;

    // ---- torso torneado con pecho, cintura y cadera ----
    const prof = [[.150, .95], [.158, 1.05], [.168, 1.16], [.186, 1.30], [.180, 1.40], [.126, 1.478], [.060, 1.512]];
    const torso = CGC(new T.LatheGeometry(prof.map(p => new T.Vector2(p[0] * wsc, p[1])), 20), sh);
    {   // ensanchar el pecho en V y marcar la cintura
      const p = torso.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        let k = 1;
        if (y > 1.24) k = 1 + (y - 1.24) * 1.5 * wsc;
        else if (y > 1.02 && y < 1.16) k = 1 - .12 * gsc;
        p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k * (.92 + .12 * gsc));
      }
      torso.computeVertexNormals();
    }
    // ---- cabeza con rasgos ----
    const hs = 1 + B_.age * .06;
    const head = merge([
      es(.118 * hs, skin, 1, 1.14, 1.04, 0, .015, -.006, 14),          // craneo
      es(.098 * hs, skin, 1, .72, .94, 0, -.066, .010, 12),             // mandibula
      es(.052 * hs, skin, 1, 1, 1, 0, -.114, .048, 10),                 // nariz
      es(.026 * hs, 0xf7f3ea, 1, 1, 1, -.054, .026, .094, 10),          // globo ocular
      es(.026 * hs, 0xf7f3ea, 1, 1, 1, .054, .026, .094, 10),
      es(.014, 0x2a2018, 1, 1, 1, -.052, .026, .113, 8),                // pupila
      es(.014, 0x2a2018, 1, 1, 1, .052, .026, .113, 8),
      es(.006, 0x0b0b10, 1, 1, 1, -.052, .026, .123, 6),                // brillo
      es(.006, 0x0b0b10, 1, 1, 1, .052, .026, .123, 6),
      bu(.070, .016, .020, -.055, .064, .108, ha, .13),                 // ceja
      bu(.070, .016, .020, .055, .064, .108, ha, -.13),
      es(.034, skin, .88, 1.1, .95, 0, -.020, .134, 8),                 // pómulo / boca alta
      bu(.064, .017, .018, 0, -.088, .108, 0x8a4a42),                   // labio superior
      bu(.054, .011, .013, 0, -.102, .105, 0xa4604f),                   // labio inferior
      es(.034, skin, 1, 1, .62, -.121, -.002, -.004, 8),               // oreja
      es(.034, skin, 1, 1, .62, .121, -.002, -.004, 8),
      es(.030, dk(skin), 1, .8, .8, 0, -.132, .086, 6)                  // menton
    ]).scale(.88, .88, .88).translate(0, 1.715, 0);
    // ---- pelo con volumen (4 estilos) ----
    let hairG = [];
    const hs2 = 1 + B_.age * .05;
    if (B_.hair === 0) {          // melena corta
      hairG.push(CGC(new S(.132 * hs2, 14, 10, 0, Math.PI * 2, 0, Math.PI * .52).scale(1.06, 1.12, 1.08).translate(0, .05, -.012), ha));
      hairG.push(CGC(new S(.126 * hs2, 12, 8, 0, Math.PI * 2, 0, Math.PI * .30).scale(1.04, 1, 1.06).translate(0, .045, .022), dk(ha)));
    } else if (B_.hair === 1) {   // coleta
      hairG.push(CGC(new S(.130 * hs2, 14, 10, 0, Math.PI * 2, 0, Math.PI * .5).scale(1.05, 1.1, 1.06).translate(0, .05, -.012), ha));
      hairG.push(CGC(new S(.045, 10, 8).scale(1, 1.9, 1).translate(0, -.02, -.115), ha));         // coleta
      hairG.push(CGC(new S(.026, 8, 6).scale(1, .6, 1).translate(0, -.11, -.115), dk(ha)));
    } else if (B_.hair === 2) {   // moño
      hairG.push(CGC(new S(.128 * hs2, 14, 10, 0, Math.PI * 2, 0, Math.PI * .48).scale(1.05, 1.08, 1.05).translate(0, .05, -.012), ha));
      hairG.push(CGC(new S(.062, 10, 8).scale(1, .9, 1).translate(0, .105, -.075), ha));
    } else {                      // rizado /的大事
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        hairG.push(CGC(new S(.062 + Math.random() * .02, 8, 6).scale(1, .85, 1)
          .translate(Math.cos(a) * .085 * hs2, .075 + Math.random() * .03, Math.sin(a) * .085 * hs2 - .01), ha));
      }
    }
    if (hat === 1) hairG.push(cy(.142, .150, .07, 0, .16, 0, 0x0d1530, 14), bu(.21, .022, .075, 0, .126, .10, 0x0d1530), es(.022, 0xffd24a, 1, 1, 1, 0, .16, .138, 8));
    if (hat === 2) hairG.push(cy(.134, .146, .08, 0, .146, 0, 0x43302a, 14), es(.046, 0xd8d3e8, 1, 1, 1, 0, .19, 0, 8));
    if (hat === 3) hairG.push(cy(.30, .30, .028, 0, .108, 0, 0xd8c48a, 16), cy(.136, .146, .072, 0, .152, 0, lt(0xd8c48a), 14));
    const hair = merge(hairG).scale(.88, .88, .88).translate(0, 1.715, 0);

    // ---- cuerpo completo ----
    const body = merge([
      es(.165 * gsc, pa, 1, .74, .86, 0, .96, 0, 12),                 // pelvis
      bu(.35 * wsc, .062, .28, 0, .99, 0, 0x26242e),                   // cinturon
      bu(.052, .042, .022, 0, .99, .146, 0xc9a13b),                    // hebilla
      torso,                                                        // torso
      bu(.31 * wsc, .09, .24, 0, 1.002, 0, dk(sh)),                     // bajo de camisa
      bu(.085, .034, .045, -.05, 1.508, .05, lt(sh), .34),              // cuello camisa izq
      bu(.085, .034, .045, .05, 1.508, .05, lt(sh), -.34),              // cuello camisa der
      cy(.068, .08, .095, 0, 1.556, 0, skin, 12),                      // cuello
      cy(.074, .08, .03, 0, 1.602, 0, dk(skin), 12),                   // nuca
      head, hair
    ]);

    // ---- brazo con volumen de manga, codo, mano y dedos ----
    const arm = merge([
      es(.084 * wsc, dk(sh), 1.30, .80, 1.10, 0, -.018, 0, 10),        // deltoides
      cy(.068, .060, .24, 0, -.138, 0, sh, 12),                        // manga
      es(.055, dk(sh), 1.12, .9, 1.12, 0, -.245, 0, 8),                // codo
      cy(.052, .044, .185, 0, -.378, 0, skin, 10),                      // antebrazo
      es(.045, skin, 1, 1, 1, 0, -.468, 0, 8),                          // muneca
      es(.052, skin, 1, .88, .84, 0, -.518, 0, 8),                      // palma
      ...[0, 1, 2, 3].map(i => es(.014, skin, 1, 1.5, 1, (i - 1.5) * .022, -.575, .006, 8)),
      es(.027, skin, 1, 1, 1, -.038, -.500, .018, 8)                    // pulgar
    ]);

    // ---- pierna con rodilla, pantorrilla y zapato ----
    const leg = merge([
      es(.104, pa, 1, 1, 1, 0, -.03, 0, 10),                            // cadera
      cy(.106, .090, .35, 0, -.225, 0, pa, 12),                         // muslo
      es(.084, dk(pa), 1, 1, 1, 0, -.435, 0, 8),                        // rodilla
      cy(.087, .060, .26, 0, -.595, 0, pa, 12),                         // pantorrilla
      es(.057, pa, 1, .85, 1, 0, -.75, 0, 8),                           // tobillo
      bu(.155, .090, .275, 0, -.818, .035, 0x1a1712),                   // zapato
      es(.064, 0x24201c, 1, 1, 1.5, 0, -.824, .108, 8),                 // puntera
      bu(.166, .042, .305, 0, -.858, .04, 0x0d0b0a)                     // suela
    ]);
    const res = { body, arm, leg };
    H3[key] = res;
    return res;
  }
  const H3 = {};

  // ---------- fabrica de humanos con reemplazo de mallas (para LOD) ----------
  function mkHuman3(sh, pa, ha, hat, build) {
    const g = new T.Group();
    const G = hgeo3(sh, pa, ha, hat, build);
    const bodyM = new T.Mesh(G.body, HMAT3);
    const pv = (x, y, ge) => { const q = new T.Group(); q.position.set(x, y, 0); q.add(new T.Mesh(ge, HMAT3)); g.add(q); return q; };
    g.add(bodyM); scene.add(g);
    const o = {
      g, aL: pv(-.19 * (build ? build.w : 1), 1.42, G.arm), aR: pv(.19 * (build ? build.w : 1), 1.42, G.arm),
      lL: pv(-.105, .88, G.leg), lR: pv(.105, .88, G.leg), ph: 0, s0: 1
    };
    o._m = [bodyM, o.aL.children[0], o.aR.children[0], o.lL.children[0], o.lR.children[0]];
    o._hi = [G.body, G.arm, G.arm, G.leg, G.leg];
    o._lo = null;
    return o;
  }
  function lowGeo(sh, pa, ha, hat) {
    try { const o = hgeo(sh, pa, ha, hat); return [o.body, o.arm, o.arm, o.leg, o.leg]; } catch (e) { return null; }
  }
  function setLod(h, hi) {
    if (!h || !h._lo) return;
    const src = hi ? h._hi : h._lo;
    for (let i = 0; i < h._m.length; i++) {
      if (h._m[i].geometry !== src[i]) { h._m[i].geometry = src[i]; h._m[i].material = HMAT3; }
    }
  }

  // ---------- personalidad ----------
  const VOZ = [
    { v: 'callejera', a: 'Eh, {n}, ¿que miras?', b: 'Aqui se curra. ¿Tu tambien vienes a por nada?' },
    { v: 'formal', a: 'Buenas, {n}.', b: 'Disculpe, estoy de {j} y no puedo parar mucho.' },
    { v: 'seria', a: '{n}.', b: 'No me sobra el tiempo, pero te escucho.' },
    { v: 'divertida', a: '¡Mira quien aparece, {n}!', b: '¿Sabes que? Hoy la costa esta imposible.' },
    { v: 'cansada', a: 'Hueles a lluvia, {n}.', b: 'Llevo horas aqui de pie.' }
  ];
  const TEMA = ['el muelle', 'la pesca', 'el precio del combustible', 'elFestival de Neon', 'los养老保险', 'la policia', 'el nuevo museo', 'las Broadband', 'la abrigo de la plaza'];
  const RASGO = ['nervioso', 'cordial', 'curioso', 'cansado', 'cínico', 'timido', 'orgulloso', 'pragmatico'];
  const CLAVES = {
    'Rita Vidal': { rol: 'informante', linea: 'El paquete sale de la nave del Puerto Viejo. Y no preguntes por que.' },
    'Cap. Soto': { rol: 'capataz', linea: 'La caja fuerte no se abre con llave, con numeros. Los numeros estan a la vista.' }
  };
  function perfil(n, i) {
    if (!n.pers) {
      const v = VOZ[(i * 7 + (n.name || '').length) % VOZ.length];
      n.pers = {
        voz: v, rasgo: RASGO[(i * 3) % RASGO.length],
        tema: TEMA[(i * 5) % TEMA.length],
        rol: (CLAVES[n.name] || {}).rol || 'vecino',
        linea: (CLAVES[n.name] || {}).linea || null,
        tono: (i * 13) % 10
      };
    }
    return n.pers;
  }

  // ---------- panel de conversacion ----------
  NC.css(`
  #gDlg{position:absolute;left:50%;bottom:11%;transform:translateX(-50%);width:min(560px,90vw);z-index:8;display:none;
    background:linear-gradient(150deg,rgba(18,14,36,.96),rgba(9,7,22,.98));border:1px solid rgba(140,200,255,.3);border-radius:14px;
    padding:16px 20px;box-shadow:0 20px 54px rgba(0,0,0,.62);font-family:'Segoe UI',system-ui,sans-serif}
  #gDlg.on{display:block}
  #gDlg .nm{font-size:12.5px;color:#8fd8ff;letter-spacing:.06em}
  #gDlg .jb{font-size:11px;color:#8894b4;margin-bottom:7px}
  #gDlg .tx{font-size:14.5px;line-height:1.55;color:#eef3ff}
  #gDlg .tx i{color:#ffd24a;font-style:normal}
  #gDlg .ac{margin-top:11px;font-size:12px;color:#9fb0d0}
  #gDlg .cl{margin-top:9px;text-align:right}
  #gDlg .cl button{background:rgba(120,200,255,.14);border:1px solid rgba(120,200,255,.35);color:#dff0ff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px}
  #gDlg .cl button:hover{background:rgba(120,200,255,.26)}
  `);
  document.body.insertAdjacentHTML('beforeend',
    '<div id="gDlg"><div class="nm" id="gNm"></div><div class="jb" id="gJb"></div><div class="tx" id="gTx"></div><div class="ac" id="gAc"></div><div class="cl"><button id="gOk">Continuar</button></div></div>');
  const g$ = id => document.getElementById(id);
  g$('gOk').addEventListener('click', () => g$('gDlg').classList.remove('on'));
  try { if (window.NC && NC.ui) NC.ui.register(document.getElementById('gDlg')); } catch (e) { }

  function hablar(n, idx) {
    const p = perfil(n, idx);
    const a = p.voz.a.replace('{n}', n.name).replace('{j}', n.job || 'curro');
    const b = p.voz.b.replace('{n}', n.name).replace('{j}', n.job || 'curro');
    const tx = p.linea || (a + ' ' + b);
    g$('gNm').textContent = n.name;
    g$('gJb').textContent = n.job + ' · ' + p.rasgo + (p.rol !== 'vecino' ? ' · ' + p.rol : '');
    g$('gTx').innerHTML = tx;
    g$('gAc').innerHTML = 'Habla de <i>' + p.tema + '</i>' + (P.wanted >= 2 ? ' · <i style="color:#ff8a9a">Te tiene miedo: la policia esta cerca</i>' : '');
    g$('gDlg').classList.add('on');
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) { }
  }

  // ---------- reemplazo de todos los humanos del mundo ----------
  let swaps = 0;
  function swapHuman(obj, sh, pa, ha, hat){
    if (!obj) return null;
    const b = { h: hc(.94, 1.06), w: hc(.92, 1.1), g: hc(.9, 1.12), age: hc(0, 1), hair: (Math.random() * 4) | 0 };
    const nh = mkHuman3(sh, pa, ha, hat, b);
    if (obj.g) { obj.g.position.copy(obj.g.position); obj.g.rotation.copy(obj.g.rotation); obj.g.scale.copy(obj.g.scale); }
    if (obj.g && obj.g.parent) obj.g.parent.remove(obj.g);
    nh.g.position.copy(obj.g.position); nh.g.rotation.copy(obj.g.rotation); nh.g.scale.copy(obj.g.scale);
    // se conserva la visibilidad original (si no, los policias en espera se quedan visibles
    // e inmoviles en el centro de la ciudad, en medio del punto de aparicion)
    nh.g.visible = obj.g.visible !== false;
    obj.g = nh.g; obj.aL = nh.aL; obj.aR = nh.aR; obj.lL = nh.lL; obj.lR = nh.lR; obj.ph = nh.ph; obj.s0 = 1;
    obj._m = nh._m; obj._hi = nh._hi; obj._lo = lowGeo(sh, pa, ha, hat); obj._lod = true;
    swaps++;
    return nh;
  }
  try {
    (typeof cops !== 'undefined') && cops.forEach(c => { if (c.h) swapHuman(c.h, 0x1e3a8a, 0x111827, 0x1a1a24, 1); });
  } catch (e) { }
  try {
    (typeof shops !== 'undefined') && shops.forEach(s => { if (s.h) swapHuman(s.h, s.type === 'Armeria' ? 0x8a2a2a : 0x2f6f8a, 0x2a2a36, 0x3a2418, 0); });
  } catch (e) { }
  try {
    (typeof carShops !== 'undefined') && carShops.forEach(s => { if (s.h) swapHuman(s.h, 0xff8a3a, 0x222222, 0x241a12, 0); });
  } catch (e) { }
  // jugador
  try {
    if (typeof setPlayerLook === 'function' && typeof curLook === 'function') {
      const L = curLook();
      setPlayerLook(L.sh, L.pa, L.ha);   // rehace al jugador con la geometria nueva
    }
  } catch (e) { NC.log('gente: jugador', e); }

  // reparto de la historia (Aurora, Marcos, Elena, Vera, Alcaide, Ficha)
  try {
    if (window.NC && NC.sto && NC.sto.cast) {
      NC.sto.cast.forEach((c, i) => {
        if (!c.h) return;
        const b = { h: 1, w: 1, g: 1, age: i * .12, hair: i % 4 };
        const old = c.h;
        const nh = mkHuman3(c.sh, c.pa, c.ha, c.hat, b);
        if (old && old.g) {
          nh.g.position.copy(old.g.position); nh.g.rotation.copy(old.g.rotation); nh.g.scale.copy(old.g.scale);
          if (old.g.parent) old.g.parent.remove(old.g);
        }
        c.h = nh; swaps++;
      });
    }
  } catch (e) { NC.log('gente: reparto', e); }

  // ---------- el motor crea los humanos con hgeo(): lo sustituimos ----------
  // asi el jugador (y cualquier NPC futuro) usan ya la geometria nueva
  try {
    if (weave) { HMAT.map = weave; HMAT.roughness = .78; HMAT.needsUpdate = true; }
    window.hgeo = function (sh, pa, ha, hat) {
      const k = sh + '_' + pa + '_' + ha + '_' + hat;
      const seed = (sh * 7 + pa * 13 + ha * 3) % 5;
      const b = { h: 1, w: 1, g: 1, age: seed / 4, hair: seed % 4 };
      return hgeo3(sh, pa, ha, hat, b);
    };
  } catch (e) { NC.log('gente: hgeo', e); }

  // ---------- reasignar colores reales a cada NPC ----------
  // los NPCs originales tenian shirt/pants/hair aleatorios: los repartimos de forma coherente
  try {
    const SHIRTS = [0x9a5f6a, 0x5f8a6a, 0xc8a86a, 0x6a7a9a, 0xa87a5a, 0x7a6a9a, 0x8a8a6a, 0x5a7a9a];
    const PANTS = [0x2a3a55, 0x3a2f28, 0x23303a, 0x4a3a2a, 0x2f2f38, 0x554433];
    const HAIRS = [0x2a1d14, 0x4a3320, 0x6b4a32, 0x141414, 0x8a6a3a, 0x5a5a5a];
    (typeof npcs !== 'undefined') && npcs.forEach((n, i) => {
      if (n._done) return;
      const sh = SHIRTS[i % SHIRTS.length], pa = PANTS[(i * 3) % PANTS.length], ha = HAIRS[(i * 5) % HAIRS.length];
      const hat = (i % 7 === 0) ? 1 : ((i % 11 === 0) ? 3 : 0);
      const b = { h: hc(.93, 1.07), w: hc(.92, 1.12), g: hc(.9, 1.14), age: (i % 5) / 4, hair: (i * 3) % 4 };
      const old = n.h;
      const nh = mkHuman3(sh, pa, ha, hat, b);
      if (old && old.g) { nh.g.position.copy(old.g.position); nh.g.rotation.copy(old.g.rotation); nh.g.scale.copy(old.g.scale); if (old.g.parent) old.g.parent.remove(old.g); }
      n.h = nh; n._done = 1; swaps++;
    });
  } catch (e) { NC.log('gente: recolor', e); }

  // ---------- LOD por distancia ----------
  let lodTick = 0;
  NC.hooks.post.push(() => {
    if ((lodTick++ % 20) !== 0) return;
    try {
      const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
      (typeof npcs !== 'undefined') && npcs.forEach(n => {
        if (!n.h || !n.h._lo) return;
        const d = Math.hypot(n.x - px, n.z - pz);
        const hi = d < 38;
        if (n.h._lodHi !== hi) { setLod(n.h, hi); n.h._lodHi = hi; }
      });
    } catch (e) { }
  });

  // ---------- interaccion con personalidad ----------
  const _int = window.interact;
  window.interact = function () {
    try {
      if (P.foot && !P.dying && !P.busted) {
        const n = (typeof nearNpc === 'function') ? nearNpc(2.8) : null;
        if (n) {
          // los actores de la historia tienen su propio dialogo: no los interceptamos
          let esActor = false;
          try {
            if (window.NC && NC.sto && NC.sto.actors) esActor = NC.sto.actors.some(a => a.n === n.name);
            if (!esActor && window.NC && NC.sto && NC.sto.cast) esActor = NC.sto.cast.some(a => a.n === n.name);
          } catch (e) { }
          if (esActor) return _int && _int.apply(this, arguments);
          const idx = npcs.indexOf(n);
          // si hay policia cerca y el jugador esta buscado, huyen
          if (P.wanted >= 2 && Math.random() < .5) {
            n.flee = 8; crime(1.1,'infraccion');
            toast('¡' + n.name + ': «¡La policia! ¡Que viene la poli!»');
            return;
          }
          if (!P.known.includes(n)) P.known.push(n);
          hablar(n, idx < 0 ? 0 : idx);
          return;
        }
      }
    } catch (e) { }
    return _int && _int.apply(this, arguments);
  };

  NC.log('gente: ' + swaps + ' humanos remozados con pelo, ropa y personalidad');
})();
