/* Neon Coast - personaje humano.
   Sustituye el muñeco de cilindros por una malla suave: torso con hombros y cintura, cuello, cabeza con ojos,
   cejas, nariz, orejas y boca, peinados, brazos con codo y manos con dedos, piernas con rodilla y pantalón,
   calzado, cinturón, cuello de camisa, bolsillos y costuras. Hay variación real de piel, peinado, complexión,
   mangas y calzado (derivadas del atuendo, o fijadas con el 5.º parámetro de mkHuman: {skin,hairStyle,w,fem,sleeve}).

   COMPATIBILIDAD: devuelve el mismo rig que el modelo antiguo {g, aL, aR, lL, lR, ph}; las animaciones (anim),
   las armas (GUN cuelga de aR), las puertas y la policía no cambian. Si algo fallase al construir la malla,
   se usa el modelo antiguo (nunca se rompe el juego).
   Una sola malla fusionada por parte (cuerpo, 2 brazos, 2 piernas): 5 draw calls por persona, igual que antes. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE || typeof mkHuman !== 'function' || window.NC.Char) return;
  const NC = window.NC, T = THREE, OLD = window.mkHuman;

  // ------------------------------------------------------------ utilidades de color
  const ch = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  const pack = a => (Math.max(0, Math.min(255, a[0] | 0)) << 16) | (Math.max(0, Math.min(255, a[1] | 0)) << 8) | Math.max(0, Math.min(255, a[2] | 0));
  const shade = (c, f) => { const a = ch(c); return pack([a[0] * f, a[1] * f, a[2] * f]); };
  const mix = (c1, c2, t) => { const a = ch(c1), b = ch(c2); return pack([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); };
  const hash = (a, b, c, d) => { let h = Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(c | 0, 83492791) ^ Math.imul(d | 0, 2654435761); h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return h >>> 0; };

  // ------------------------------------------------------------ primitivas (todas devuelven geometría con color de vértice)
  const V2 = (r, y) => new T.Vector2(r, y);
  // superficie de revolución: pts = [[radio, y], ...]; sx/sz aplastan la sección (el torso es más ancho que hondo)
  function lathe(pts, color, seg, sx, sz, x, y, z) {
    const g = new T.LatheGeometry(pts.map(p => V2(p[0], p[1])), seg || 12); if (sx !== 1 || sz !== 1) g.scale(sx || 1, 1, sz || 1); g.translate(x || 0, y || 0, z || 0); return cg(g, color);
  }
  function ell(rx, ry, rz, x, y, z, color, ws, hs, rotX) { const g = new T.SphereGeometry(1, ws || 8, hs || 6); g.scale(rx, ry, rz); if (rotX) g.rotateX(rotX); g.translate(x, y, z); return cg(g, color); }
  function box(w, h, d, x, y, z, color, rx, ry, rz) { const g = new T.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz); g.translate(x, y, z); return cg(g, color); }
  function cyl(rt, rb, h, x, y, z, color, seg, rx, rz) { const g = new T.CylinderGeometry(rt, rb, h, seg || 10); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x, y, z); return cg(g, color); }
  // casquete de esfera (pelo/gorros): theta 0..tl desde arriba, inclinado hacia atrás para dejar la frente libre
  function cap(rx, ry, rz, x, y, z, color, tl, tilt) { const g = new T.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, tl); g.scale(rx, ry, rz); g.rotateX(-(tilt || 0)); g.translate(x, y, z); return cg(g, color); }
  // ruido sutil de color por vértice (tela/piel menos plana, sin repetir patrón)
  function speckle(g, amp) {
    const p = g.attributes.position.array, c = g.attributes.color.array;
    for (let i = 0; i < p.length; i += 3) {
      const n = Math.sin(p[i] * 91.7 + p[i + 1] * 47.3 + p[i + 2] * 63.1) * 43758.5453, f = 1 + ((n - Math.floor(n)) - .5) * amp;
      c[i] = Math.min(1, c[i] * f); c[i + 1] = Math.min(1, c[i + 1] * f); c[i + 2] = Math.min(1, c[i + 2] * f);
    }
    return g;
  }

  // ------------------------------------------------------------ paletas y variación
  const SKINS = [0xf1c9a5, 0xe3b18a, 0xc98e66, 0xa06c4a, 0x6f4731];
  const EYES = [0x3a2a1e, 0x4a3a2a, 0x3d6a8a, 0x4a7a52, 0x2a2a2a];
  const SHOES = [0x1b1b20, 0x2b3350, 0xf0ece2, 0x6b3a22, 0x23232b];
  const STYLES = ['short', 'short', 'long', 'pony', 'buzz', 'short', 'long'];
  // rig (mismas articulaciones que el modelo antiguo: la animación solo gira estos pivotes)
  const SH_X = .224, SH_Y = 1.43, HIP_X = .115, HIP_Y = .82;

  function look(sh, pa, ha, hat, opts) {
    opts = opts || {};
    const h = hash(sh, pa, ha, hat);
    const o = {
      sh, pa, ha, hat,
      skin: opts.skin != null ? opts.skin : SKINS[h % 5],
      eye: EYES[(h >>> 4) % 5],
      hairStyle: opts.hairStyle || (hat === 1 ? (h & 1 ? 'buzz' : 'short') : STYLES[(h >>> 7) % STYLES.length]),
      w: opts.w != null ? opts.w : [.94, 1, 1.07][(h >>> 11) % 3],
      fem: !!opts.fem,
      sleeve: opts.sleeve != null ? opts.sleeve : (hat === 1 ? 1 : ((h >>> 13) % 3 === 0 ? 1 : 0)),
      shoe: hat === 1 ? 0x15151a : SHOES[(h >>> 17) % 5]
    };
    o.key = [sh, pa, ha, hat, o.skin, o.hairStyle, o.w, o.fem ? 1 : 0, o.sleeve, o.shoe, o.eye].join('_');
    return o;
  }

  // ------------------------------------------------------------ cuerpo: pelvis, torso, cuello, cabeza, pelo, ropa
  function buildBody(o, lod) {
    const sg = n => lod ? Math.max(5, Math.round(n * .55)) : n;
    const L = [], w = o.w, fem = o.fem, skin = o.skin, sh = o.sh, pa = o.pa;
    const darkSh = shade(sh, .78), lightSh = shade(sh, 1.14), skinD = shade(skin, .9);
    const sx = 1.28 * w * (fem ? .93 : 1);                      // anchura de hombros
    // pelvis y parte alta del pantalón
    const hipW = (fem ? 1.30 : 1.22) * w;
    L.push(lathe([[0, .74], [.130, .76], [.158, .82], [.166, .90], [.158, .955], [0, .955]], pa, sg(14), hipW, .80));
    L.push(lathe([[.166, .905], [.172, .905], [.172, .945], [.166, .945]], 0x1d1d22, sg(14), hipW, .80));                   // cinturón
    if (!lod) {
      L.push(box(.05, .036, .014, 0, .925, .137, 0xd9b44a));                                                                // hebilla
      L.push(box(.008, .11, .006, 0, .835, .133, shade(pa, .8)));                                                           // bragueta (costura)
      L.push(box(.075, .075, .01, -.075, .84, -.125, shade(pa, .88)), box(.075, .075, .01, .075, .84, -.125, shade(pa, .88))); // bolsillos traseros
    }
    // torso (camisa): cintura estrecha, pecho amplio, hombros inclinados
    L.push(lathe([[0, .90], [.134, .92], [.139, .99], [.134, 1.07], [.139, 1.16], [.157, 1.27], [.171, 1.35], [.170, 1.41], [.140, 1.462], [.090, 1.49], [0, 1.50]], sh, sg(14), sx, .80));
    if (!lod) {
      L.push(lathe([[.130, .905], [.141, .905], [.141, .945], [.136, .96], [.130, .96]], darkSh, 14, sx, .80));             // dobladillo de la camisa
      L.push(box(.014, .40, .008, 0, 1.16, .127, darkSh));                                                                   // tapeta con botones
      for (let i = 0; i < 4; i++) L.push(box(.014, .014, .008, 0, 1.28 - i * .1, .132, lightSh));
      L.push(box(.07, .062, .01, .095 * w, 1.30, .126, shade(sh, .9)));                                                       // bolsillo del pecho
      L.push(box(.30 * w, .01, .008, 0, 1.40, -.119, darkSh));                                                                // costura de la espalda (canesú)
      L.push(box(.062, .03, .02, -.036, 1.497, .078, lightSh, 0, .55), box(.062, .03, .02, .036, 1.497, .078, lightSh, 0, -.55)); // cuello de camisa
    }
    if (fem) L.push(ell(.072, .055, .04, -.072, 1.285, .106, sh, lod ? 5 : 8, lod ? 4 : 6), ell(.072, .055, .04, .072, 1.285, .106, sh, lod ? 5 : 8, lod ? 4 : 6));   // pecho
    // hombros (deltoides) y cuello
    for (const s of [-1, 1]) L.push(ell(.064 * w, .066, .062 * w, s * SH_X * (fem ? .95 : 1), SH_Y + .004, 0, sh, lod ? 5 : 8, lod ? 4 : 6));
    L.push(cyl(.05, .057, .12, 0, 1.535, 0, skinD, lod ? 5 : 8));
    // cabeza: cráneo elipsoidal + mandíbula + nariz + orejas + ojos + cejas + boca
    L.push(ell(.098, .122, .108, 0, 1.668, 0, skin, lod ? 8 : 14, lod ? 6 : 10));
    if (!lod) {
    L.push(ell(.070, .066, .082, 0, 1.600, .022, skin, 10, 7));                                                              // mandíbula y barbilla
    L.push(cyl(.005, .0175, .03, 0, 1.652, .108, shade(skin, .95), 6, Math.PI / 2 - .3));                                  // nariz
    for (const s of [-1, 1]) {
      L.push(ell(.012, .03, .02, s * .099, 1.665, -.004, skin, 6, 4));                                                    // orejas
      L.push(ell(.0185, .0115, .008, s * .037, 1.689, .099, 0xf4f0ea, 6, 4));                                                // ojo (esclerótica)
      L.push(ell(.0095, .0095, .006, s * .037, 1.689, .1062, o.eye, 6, 4));                                                  // iris
      L.push(box(.04, .008, .009, s * .037, 1.713, .101, shade(o.ha, .9), -.1, 0, -s * .12));                                // cejas
    }
    L.push(box(.048, .006, .008, 0, 1.601, .104, 0x9a4f4a), box(.034, .007, .008, 0, 1.592, .102, 0xb5645e));                 // labios
    }
    // pelo
    const ha = o.ha, hs = o.hairStyle;
    if (hs !== 'bald') {
      const thin = hs === 'buzz', hc = thin ? mix(ha, skin, .35) : ha, k = thin ? .985 : 1;
      if (o.hat !== 2) L.push(cap(.108 * k, .126 * k, .116 * k, 0, 1.672, -.01, hc, 1.58, .5));
      if (lod) { /* sin mechones en LOD */ }
      else if (hs === 'short') { L.push(box(.15, .034, .045, 0, 1.742, .078, ha, .3), box(.02, .07, .05, -.101, 1.66, .02, ha), box(.02, .07, .05, .101, 1.66, .02, ha)); }
      if (hs === 'long') { L.push(ell(.118, .175, .078, 0, 1.575, -.078, ha, lod ? 7 : 12, lod ? 5 : 8), ell(.03, .105, .052, -.098, 1.6, .012, ha, 8, 6), ell(.03, .105, .052, .098, 1.6, .012, ha, 8, 6), box(.15, .03, .04, 0, 1.745, .082, ha, .25)); }
      if (hs === 'pony' && !lod) { L.push(box(.15, .03, .04, 0, 1.745, .082, ha, .25), cyl(.03, .018, .22, 0, 1.585, -.125, ha, 8, .18), ell(.032, .02, .032, 0, 1.69, -.108, shade(ha, .7), 6, 5)); }
      if (hs === 'buzz' && !lod) L.push(box(.14, .02, .03, 0, 1.745, .088, hc, .3));
    }
    // sombreros / gorras
    if (o.hat === 1) {            // gorra de policía
      L.push(cyl(.119, .129, .07, 0, 1.775, -.004, 0x0d1530, 14), cyl(.137, .122, .02, 0, 1.816, 0, 0x0d1530, 14), cyl(.124, .127, .022, 0, 1.742, -.004, 0x24305a, 14));
      L.push(box(.15, .012, .09, 0, 1.738, .14, 0x0a0a10, .1), box(.026, .026, .01, 0, 1.775, .128, 0xd9b44a));
    } else if (o.hat === 2) {     // gorro
      const bc = mix(sh, 0x1a1a22, .4); L.push(ell(.113, .1, .119, 0, 1.752, -.004, bc, 12, 8), cyl(.115, .115, .032, 0, 1.722, -.002, shade(bc, .75), 12), ell(.03, .03, .03, 0, 1.858, 0, 0xd8d3e8, 7, 5));
    } else if (o.hat === 3) {     // sombrero de paja
      L.push(cyl(.27, .27, .012, 0, 1.742, 0, 0xd8c48a, 18), cyl(.1, .11, .08, 0, 1.783, 0, 0xd8c48a, 12), cyl(.111, .111, .02, 0, 1.755, 0, 0x7a3a2a, 12));
    }
    const geo = merge(L); return speckle(geo, .06);
  }

  // ------------------------------------------------------------ piernas (pivote en la cadera, cuelgan hacia -y)
  function buildLeg(o, lod) {
    const sg = n => lod ? Math.max(5, Math.round(n * .55)) : n;
    const pa = o.pa, w = o.w, L = [], sk = shade(pa, .82), r = .96 + .04 * w;
    if (lod) {
      L.push(lathe([[0, .03], [.105 * r, -.02], [.098 * r, -.2], [.074 * r, -.45], [.07 * r, -.55], [.05 * r, -.77], [0, -.77]], pa, 6, 1, 1));
      L.push(box(.1, .06, .26, 0, -.77, .05, o.shoe));
      return merge(L);
    }
    L.push(lathe([[0, .03], [.100 * r, .0], [.110 * r, -.06], [.101 * r, -.18], [.086 * r, -.32], [.074 * r, -.42], [.070 * r, -.46]], pa, 9, 1, 1));       // muslo
    L.push(ell(.071 * r, .066, .072 * r, 0, -.456, .018, pa, 8, 6));                                                                                           // rodilla
    L.push(lathe([[.070 * r, -.46], [.072 * r, -.51], [.073 * r, -.57], [.064 * r, -.67], [.052 * r, -.745], [.050 * r, -.775], [0, -.775]], pa, 9, 1, 1));    // pantorrilla
    L.push(lathe([[.054 * r, -.722], [.061 * r, -.722], [.06 * r, -.774], [.052 * r, -.774]], sk, 9, 1, 1));                                                  // bajo del pantalón
    L.push(box(.006, .30, .006, .088 * r, -.20, 0, sk), box(.006, .30, .006, -.088 * r, -.20, 0, sk));                                                          // costuras laterales
    // calzado: suela, empeine, puntera y talón
    const shoeUp = o.shoe, sole = shoeUp === 0xf0ece2 ? 0xd8d4c8 : 0x15151a;
    L.push(box(.102, .03, .275, 0, -.785, .048, sole));
    L.push(ell(.053, .05, .135, 0, -.756, .052, shoeUp, 10, 7), ell(.052, .04, .075, 0, -.773, .12, shade(shoeUp, 1.12), 9, 6), ell(.046, .05, .05, 0, -.762, -.045, shade(shoeUp, .9), 8, 6));
    L.push(box(.036, .006, .05, 0, -.738, .085, shade(shoeUp, 1.3)));                                                                                           // cordones
    return speckle(merge(L), .06);
  }

  // ------------------------------------------------------------ brazos (pivote en el hombro) con codo y mano con dedos
  function buildArm(o, side, lod) {
    const sh = o.sh, skin = o.skin, long = o.sleeve === 1, L = [], inner = side > 0 ? -1 : 1;
    const sleeve = sh, forearm = long ? sh : skin, hem = shade(sh, .8);
    if (lod) {
      L.push(lathe([[0, .04], [.056, .03], [.054, -.2], [.047, -.3], [.03, -.55], [0, -.56]], long ? sh : skin, 6, 1, 1));
      L.push(lathe([[0, .04], [.058, .03], [.054, -.2], [.05, -.215], [0, -.215]], sh, 6, 1, 1));
      L.push(ell(.036, .055, .02, 0, -.6, 0, skin, 5, 4));
      return merge(L);
    }
    L.push(lathe([[0, .04], [.054, .03], [.060, -.04], [.057, -.12], [.053, -.21], [.050, long ? -.30 : -.215]], sleeve, 9, 1, 1));                              // manga corta / larga (parte alta)
    if (!long) {
      L.push(lathe([[.052, -.20], [.058, -.20], [.058, -.218], [.051, -.218]], hem, 10, 1, 1));                                                                  // borde de la manga
      L.push(lathe([[.049, -.215], [.046, -.30]], skin, 10, 1, 1));
    }
    L.push(ell(.045, .045, .047, 0, -.30, 0, long ? sh : skin, 8, 6));                                                                                             // codo
    L.push(lathe([[.045, -.30], [.045, -.35], [.041, -.43], [.035, -.52], [.032, -.55]], forearm, 10, 1, 1));                                                    // antebrazo
    if (long) L.push(lathe([[.038, -.505], [.044, -.505], [.044, -.54], [.036, -.54]], hem, 10, 1, 1));                                                          // puño
    // mano: palma + 4 dedos ligeramente curvados + pulgar hacia dentro
    const hd = skin, hdD = shade(skin, .92);
    L.push(ell(.037, .052, .02, 0, -.592, 0, hd, 9, 7));
    for (let i = 0; i < 4; i++) { const x = -.0255 + i * .017, len = i === 1 || i === 2 ? .062 : .052; L.push(cyl(.0085, .0075, len, x, -.64 - len * .15, .006, hdD, 5, .22)); }
    L.push(cyl(.0105, .0085, .048, inner * .033, -.6, .01, hd, 6, .25, inner * .75));                                                                              // pulgar
    return speckle(merge(L), .05);
  }

  // ------------------------------------------------------------ caché + ensamblado del rig
  const CACHE = {};
  function geos(o, lod) { const k = o.key + (lod ? ':lo' : ''); return CACHE[k] || (CACHE[k] = { body: buildBody(o, lod), legL: buildLeg(o, lod), armL: buildArm(o, -1, lod), armR: buildArm(o, 1, lod) }); }
  // las piernas son simétricas: una sola geometría para las dos (ahorro de memoria)
  function geosShared(o, lod) { const G = geos(o, lod); G.legR = G.legL; return G; }

  function mkHumanNew(sh, pa, ha, hat, opts) {
    ha = ha === undefined ? 0x2a1d14 : ha; hat = hat || 0;
    const o = look(sh, pa, ha, hat, opts), G = geosShared(o), g = new T.Group();
    g.add(new T.Mesh(G.body, HMAT));
    const pv = (x, y, ge) => { const q = new T.Group(); q.position.set(x, y, 0); q.add(new T.Mesh(ge, HMAT)); g.add(q); return q; };
    scene.add(g);
    return { g, aL: pv(-SH_X, SH_Y, G.armL), aR: pv(SH_X, SH_Y, G.armR), lL: pv(-HIP_X, HIP_Y, G.legL), lR: pv(HIP_X, HIP_Y, G.legR), ph: 0, look: o, lod: 0 };
  }
  window.mkHuman = function (sh, pa, ha, hat, opts) {
    try { return mkHumanNew(sh, pa, ha, hat, opts); }
    catch (e) { NC.log('character: fallback al modelo antiguo', e); return OLD.apply(this, arguments); }
  };

  // ------------------------------------------------------------ renovar a las personas que el juego creó ANTES de cargar este módulo
  // (jugador, peatones, policías, dependientes, vendedores): se recupera su atuendo de la caché del modelo antiguo.
  function paramsOf(h) {
    try {
      const geo = h.g.children[0].geometry;
      for (const k in HC) if (HC[k] && HC[k].body === geo) { const p = k.split('_').map(Number); return { sh: p[0], pa: p[1], ha: p[2], hat: p[3] }; }
    } catch (e) { }
    return null;
  }
  function reskin(h, extra) {
    if (!h || !h.g || h.look) return false;
    const p = paramsOf(h); if (!p) return false;
    try {
      const o = look(p.sh, p.pa, p.ha, p.hat, extra), G = geosShared(o), swap = (parent, ge) => { const m = parent.children[0]; if (m && m.geometry) m.geometry = ge; };
      swap(h.g, G.body); swap(h.aL, G.armL); swap(h.aR, G.armR); swap(h.lL, G.legL); swap(h.lR, G.legR);
      h.aL.position.set(-SH_X, SH_Y, 0); h.aR.position.set(SH_X, SH_Y, 0); h.lL.position.set(-HIP_X, HIP_Y, 0); h.lR.position.set(HIP_X, HIP_Y, 0);
      h.look = o; h.lod = 0; return true;
    } catch (e) { NC.log('character: reskin', e); return false; }
  }
  function reskinAll() {
    let n = 0;
    try { n += reskin(P.h) ? 1 : 0; } catch (e) { }
    try { npcs.forEach(q => { n += reskin(q.h) ? 1 : 0; }); } catch (e) { }
    try { cops.forEach(q => { n += reskin(q.h) ? 1 : 0; }); } catch (e) { }
    try { copsDead.forEach(q => { n += reskin(q.h) ? 1 : 0; }); } catch (e) { }
    try { shops.forEach(q => { n += reskin(q.h) ? 1 : 0; }); } catch (e) { }
    try { carShops.forEach(q => { n += reskin(q.h) ? 1 : 0; }); } catch (e) { }
    return n;
  }
  const done = reskinAll();

  // ------------------------------------------------------------ nivel de detalle por distancia a la cámara
  // Cerca: malla completa (~4.300 triángulos). Lejos (> LOD_FAR m): versión simplificada (~1.100) con la misma silueta,
  // colores y rig. Histéresis para que no parpadee en el límite.
  const LOD_FAR = 30, LOD_NEAR = 26;
  function setLod(h, lod) {
    if (!h || !h.look || h.lod === lod) return;
    const G = geosShared(h.look, lod), swap = (parent, ge) => { const m = parent.children[0]; if (m && m.geometry !== ge) m.geometry = ge; };
    swap(h.g, G.body); swap(h.aL, G.armL); swap(h.aR, G.armR); swap(h.lL, G.legL); swap(h.lR, G.legR);
    h.lod = lod;
  }
  function lodPass() {
    let cx, cz;
    try { cx = camera.position.x; cz = camera.position.z; } catch (e) { return; }
    const one = h => { if (!h || !h.g || !h.look) return; const dx = h.g.position.x - cx, dz = h.g.position.z - cz, d = Math.sqrt(dx * dx + dz * dz); if (h.lod === 0 && d > LOD_FAR) setLod(h, 1); else if (h.lod === 1 && d < LOD_NEAR) setLod(h, 0); };
    try { npcs.forEach(q => one(q.h)); } catch (e) { }
    try { cops.forEach(q => one(q.h)); } catch (e) { }
    try { copsDead.forEach(q => one(q.h)); } catch (e) { }
    try { shops.forEach(q => one(q.h)); } catch (e) { }
    try { carShops.forEach(q => one(q.h)); } catch (e) { }
  }
  NC.hooks.post.push(() => { try { if (frame % 15 === 0) lodPass(); } catch (e) { } });

  NC.Char = { mk: mkHumanNew, look, reskin, reskinAll, setLod, lodPass, cache: CACHE, rig: { SH_X, SH_Y, HIP_X, HIP_Y } };
  NC.log('personaje listo · malla suave con rasgos/pelo/manos/calzado · ' + done + ' personas renovadas');
})();
