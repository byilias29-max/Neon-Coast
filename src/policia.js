/* Neon Coast - policia: busqueda de 0 a 5 estrellas con registro de incidentes,
   persecuciones con coche desde 3 estrellas, perdida de contacto y busqueda de la
   ultima posicion conocida. Reglas:
     0  libre
     1  segunda victima peatón reincidente / infracciones repetidas
     2  atraco a tienda / escapaste de una persecución: te siguen buscando en la zona
     3  has matado a un agente -> entran los coches patrulla
     4  cinco agentes abatidos en el mismo incidente
     5  caos sostenido: mas bajas, persecucion larga, muchos incidentes graves

   NIVEL DE BÚSQUEDA: este módulo es el ÚNICO dueño del nivel.
   El motor (index.html) solo lo baja por su cuenta con su temporizador de decaimiento
   (P.wt); aquí ese cambio se refleja en POL.nivel. Para forzar un nivel desde fuera:
     NC.Pol.setLevel(n)   -> n estrellas (BRINGITON)
     NC.Pol.clear()       -> sin búsqueda (LEAVEMEALONE)
   crime() recibe un canal tipado: 'robo' | 'policia' | 'peaton' | 'disparo' |
   'infraccion'. Cada tipo tiene su regla; ya no se deduce del número. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;
  const NC = window.NC;
  const r2 = (a, b) => a + Math.random() * (b - a);

  // ---------- estado ----------
  const POL = {
    inc: [], idc: 0, victimas: 0, infacciones: 0, copsMuertos: 0,
    estado: 'libre',          // libre | persecucion | busqueda
    pers: null,               // {id, t0, ultimo:{x,z}, tUltimo, perdidoT, kills, nivel}
    busquedaT: 0, ocultoT: 0, nivel: 0, cooldown: 0
  };
  const CARS = [];
  const vistos = new WeakSet();      // NPCs ya contabilizados (no contar dos veces)
  const REG = new Map();             // incidentes ya applying por clave
  const KEY = 'ncWanted';

  // ---------- registro de incidentes ----------
  function incidente(tipo, x, z, victima, grave) {
    // clave unica: el mismo hecho no se contabiliza dos veces
    const clave = tipo + ':' + (victima ? victima.id || (victima.x + ',' + victima.z) : (Math.round(x) + ',' + Math.round(z) + ',' + (frame | 0)));
    if (REG.has(clave)) return REG.get(clave);
    const inc = { id: ++POL.idc, tipo, x, z, t: performance.now(), grave: !!grave, visto: false, testigo: false, nivel: POL.nivel };
    REG.set(clave, inc);
    POL.inc.push(inc);
    if (POL.inc.length > 80) { POL.inc.shift(); REG.clear(); }
    inc.testigo = hayTestigo(x, z);
    inc.visto = inc.testigo;
    return inc;
  }
  function hayTestigo(x, z) {
    try {
      for (const c of cops) if (c.act && c.down <= 0 && Math.hypot(c.x - x, c.z - z) < 70) return true;
    } catch (e) { }
    return false;
  }

  // ---------- nivel de busqueda: un único dueño ----------
  // el motor puede BAJAR el nivel por su cuenta (decaimiento): eso se refleja aquí
  function nivelDeMotor() {
    try { return Math.max(0, Math.min(5, Math.round(P.wanted || 0))); } catch (e) { return 0; }
  }
  // escritura silenciosa (sin aviso): para estados internos
  function escribirNivel(n) {
    n = Math.max(0, Math.min(5, Math.round(n)));
    POL.nivel = n;
    try { P.wanted = n; } catch (e) { }
    return n;
  }
  function setNivel(n, motivo) {
    n = Math.max(0, Math.min(5, Math.round(n)));
    const antes = POL.nivel;
    if (n === antes) return;
    POL.nivel = n;
    try {
      P.wanted = n;
      P.wt = 25;                                  // el motor baja una estrella cada 15 s desde aquí
      if (P.life) P.life.maxW = Math.max(P.life.maxW, n);
    } catch (e) { }
    try { localStorage.setItem(KEY, JSON.stringify({ n, t: Date.now() })); } catch (e) { }
    if (n > antes) {
      toast(n + (n === 1 ? ' estrella' : ' estrellas') + (motivo ? ' · ' + motivo : ''));
      pop('★'.repeat(n));
      try { beep(220 + n * 90, .18, 'square', .05); } catch (e) { }
    } else if (n < antes) {
      try { beep(660, .1, 'sine', .04); } catch (e) { }
    }
    hud();
  }
  // quitar la búsqueda entera (LEAVEMEALONE, ficha, hospital...)
  function limpiarBusqueda() {
    POL.estado = 'libre';
    POL.pers = null;
    POL.busquedaT = 0;
    POL.victimas = 0;
    POL.infracciones = 0;
    CARS.splice(0).forEach(u => { try { scene.remove(u.g); } catch (e) { } });
    escribirNivel(0);
    try { P.wt = 0; } catch (e) { }
    try { localStorage.setItem(KEY, JSON.stringify({ n: 0, t: Date.now() })); } catch (e) { }
    hud();
  }

  // ---------- victimas: se cuentan por victima (el mismo NPC nunca suma dos veces) ----------
  // solo lleva la cuenta: el nivel lo decide crime() según el tipo de delito
  function registrarVictima(victima, esPolicia) {
    try {
      if (!victima) return;
      try { if (P.noWanted) return; } catch (e) { }
      if (vistos.has(victima)) return;      // ya contabilizada
      vistos.add(victima);
      const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
      if (esPolicia) {
        incidente('policia', px, pz, victima, true);
        POL.copsMuertos++;
        return;                              // el nivel lo pone crime('policia')
      }
      incidente('peaton', px, pz, victima, false);
      POL.victimas++;
    } catch (e) { }
  }
  try {
    const _knock = window.knock;
    window.knock = function (e, cop) {
      // primero la victima (para que crime() vea las cuentas ya actualizadas)
      try { registrarVictima(e, cop === true || cop === 1); } catch (err) { }
      return _knock && _knock.apply(this, arguments);
    };
  } catch (e) { }

  // ---------- crime(): canal tipado ----------
  // a: magnitud antigua (se conserva por compatibilidad) · kind: tipo de delito
  const _crime = window.crime;
  window.crime = function (a, kind) {
    try {
      if (typeof P !== 'undefined' && P && P.noWanted) return;
      const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
      const k = kind || (a >= 1.4 ? 'policia' : a >= 0.6 ? 'peaton' : 'infraccion');
      if (k === 'policia') {
        // agente abatido -> 3 estrellas y persecucion (no cuenta como atraco ni como victima)
        incidente('policia', px, pz, null, true);
        if (POL.pers) POL.pers.kills++;
        else POL.pers = { id: POL.idc, t0: performance.now(), ultimo: { x: px, z: pz }, tUltimo: performance.now(), perdidoT: 0, kills: 1, nivel: 3 };
        setNivel(Math.max(POL.nivel, 3), 'agente abatido');
        POL.estado = 'persecucion';
        POL.cooldown = 0;
        return;
      }
      if (k === 'robo') {
        // atraco a tienda -> 2 estrellas y persecucion (nunca "agente abatido")
        incidente('robo', px, pz, null, true);
        setNivel(Math.max(POL.nivel, 2), 'atraco a tienda');
        POL.estado = 'persecucion';
        if (!POL.pers) POL.pers = { id: POL.idc, t0: performance.now(), ultimo: { x: px, z: pz }, tUltimo: performance.now(), perdidoT: 0, kills: 0, nivel: 2 };
        POL.cooldown = 0;
        return;
      }
      if (k === 'peaton') {
        // victima sin identidad (no pasa por knock): cuenta como reincidencia
        POL.victimas++;
        if (POL.victimas >= 2) {
          setNivel(Math.max(POL.nivel, 1), 'reincidencia');
          POL.estado = 'persecucion';
          if (!POL.pers) POL.pers = { id: POL.idc, t0: performance.now(), ultimo: { x: px, z: pz }, tUltimo: performance.now(), perdidoT: 0, kills: 0, nivel: 1 };
        }
        return;
      }
      // disparo / infraccion: cuenta, pero solo sube si se repite y hay testigo
      POL.infracciones++;
      if (POL.infracciones >= 3 && hayTestigo(px, pz)) setNivel(Math.max(POL.nivel, 1), 'infracciones repetidas');
      try { _crime && _crime(0); } catch (e) { }
    } catch (e) { }
  };

  // ---------- HUD de estrellas ----------
  NC.css(`
  #st{display:inline-flex;align-items:center;gap:1px;font-size:15px;letter-spacing:1px;line-height:1}
  #st i{font-style:normal;color:#3a3f55;transition:color .25s,transform .25s;text-shadow:0 0 0 transparent}
  #st i.on{color:#ffd24a;text-shadow:0 0 8px rgba(255,210,74,.6)}
  #st i.pop{animation:stPop .5s cubic-bezier(.2,1.6,.4,1)}
  #st .srch{font-size:10.5px;letter-spacing:.14em;color:#ff8a9a;margin-left:6px;font-style:normal;animation:stBlink 1.4s infinite}
  #st .sec{font-size:10.5px;letter-spacing:.06em;color:#ffd24a;margin-left:5px;font-style:normal;opacity:.85}
  @keyframes stPop{0%{transform:scale(.2)}60%{transform:scale(1.5)}100%{transform:scale(1)}}
  @keyframes stBlink{0%,100%{opacity:.45}50%{opacity:1}}
  `);
  let hudN = -1;
  function hud() {
    const el = document.getElementById('st'); if (!el) return;
    const n = POL.nivel;
    const buscando = POL.estado === 'busqueda';
    let h = '';
    for (let i = 0; i < 5; i++) h += '<i class="' + (i < n ? 'on' : '') + (n > hudN && i < n ? ' pop' : '') + '">★</i>';
    if (buscando) h += '<span class="srch">BUSCANDO</span>';
    else if (n > 0) { let s = 0; try { s = Math.max(0, Math.ceil(P.wt || 0)); } catch (e) { } h += '<span class="sec">' + s + 's</span>'; }
    el.innerHTML = h;
    if (n !== hudN) { hudN = n; }
  }

  // ---------- coches patrulla ----------
  function crearPatrulla() {
    const g = new T.Group();
    const body = mkCar(0x14161f);
    if (body) { g.add(body); }
    const sirena = new T.Mesh(new T.BoxGeometry(1.1, .18, .28), new T.MeshBasicMaterial({ color: 0xff2a4a }));
    sirena.position.set(0, 1.62, 0); g.add(sirena);
    const sirena2 = sirena.clone(); sirena2.material = new T.MeshBasicMaterial({ color: 0x2a6aff });
    sirena2.position.set(0, 1.62, .3); g.add(sirena2);
    const pool = new T.Mesh(new T.PlaneGeometry(7, 7), new T.MeshBasicMaterial({ map: glowT, color: 0x4a7aff, transparent: true, opacity: .35, depthWrite: false, blending: T.AdditiveBlending }));
    pool.rotation.x = -PI / 2; pool.position.y = .06; g.add(pool);
    scene.add(g);
    return { g, sirena, sirena2, x: 0, z: 0, dir: 0, spd: 0, base: 15, stun: 0, ruta: [], ri: 0, rt: 0, off: false, obj: null };
  }
  function objetivoUnidad(u, px, pz, th, nivel) {
    // 4 estrellas: interceptan por delante; 5: maniobras mas agresivas
    if (nivel >= 4 && typeof th === 'number') {
      const lead = nivel >= 5 ? 34 : 22;
      return { x: px + Math.sin(th) * lead, z: pz + Math.cos(th) * lead };
    }
    return { x: px, z: pz };
  }
  function actualizarPatrullas(dt, px, pz, th, enCoche) {
    const nivel = POL.nivel;
    const queridas = nivel >= 5 ? 6 : nivel >= 4 ? 4 : nivel >= 3 ? 2 : 0;
    while (CARS.length < queridas) {
      const u = crearPatrulla();
      // aparecen en una calle cercana, nunca encima del jugador
      const a = r2(0, Math.PI * 2), rr = r2(90, 150);
      u.x = Math.round((px + Math.cos(a) * rr) / CELL) * CELL;
      u.z = Math.round((pz + Math.sin(a) * rr) / CELL) * CELL;
      u.g.position.set(u.x, 0, u.z);
      CARS.push(u);
    }
    while (CARS.length > queridas) { const u = CARS.pop(); if (u) scene.remove(u.g); }
    if (!queridas) return;

    for (const u of CARS) {
      u.stun = Math.max(0, u.stun - dt);
      const tgt = objetivoUnidad(u, px, pz, th, nivel);
      // ruta por las calles: la fuente de verdad es NC.Nav
      u.rt -= dt;
      if (u.rt <= 0 || !u.ruta.length) {
        u.rt = 1.2 + r2(0, .5);
        try {
          const r = (NC.Nav && NC.Nav.routePts) ? NC.Nav.routePts(u.x, u.z, tgt.x, tgt.z) : [];
          u.ruta = (r && r.length) ? r.map(p => ({ x: p[0], z: p[1] })) : [];
          u.ri = 0;
        } catch (e) { u.ruta = []; }
      }
      // punto objetivo inmediato
      let wx = tgt.x, wz = tgt.z;
      if (u.ruta.length) {
        const p = u.ruta[Math.min(u.ri, u.ruta.length - 1)];
        wx = p.x; wz = p.z;
        if (Math.hypot(u.x - p.x, u.z - p.z) < 12) { u.ri++; if (u.ri >= u.ruta.length) u.ruta = []; }
      }
      // conduccion: aceleracion, giro suave, frenada si hay obstaculo delante
      const dx = wx - u.x, dz = wz - u.z, d = Math.hypot(dx, dz);
      let des = u.dir;
      if (d > 2) {
        const objetivo = Math.atan2(dx, dz);
        let diff = objetivo - des;
        while (diff > PI) diff -= Math.PI * 2; while (diff < -PI) diff += Math.PI * 2;
        des += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
      }
      u.dir = des;
      const alineado = Math.abs(((des - (Math.atan2(dx, dz) + Math.PI * 3) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < 0.5;
      let ts = (u.stun > 0) ? 0 : (alineado ? u.base : u.base * .45);
      // los coches de la policía chocan con el trafico: si hay un coche cerca delante, frenan
      try {
        for (const c of ai) {
          if (c.off) continue;
          const ox = c.g.position.x - u.x, oz = c.g.position.z - u.z;
          const rel = ox * Math.sin(u.dir) + oz * Math.cos(u.dir);
          const lat = Math.abs(ox * Math.cos(u.dir) - oz * Math.sin(u.dir));
          if (rel > 0 && rel < 11 && lat < 2.6) { ts = 0; u.stun = .35; }
        }
      } catch (e) { }
      u.spd += (ts - u.spd) * Math.min(1, 3.2 * dt);
      const vx = Math.sin(u.dir) * u.spd * dt, vz = Math.cos(u.dir) * u.spd * dt;
      u.x += vx; u.z += vz;
      // colisiones con el mundo
      try { const o = { x: u.x, z: u.z }; collide(o, 1.3); u.x = o.x; u.z = o.z; } catch (e) { }
      // no atraviesan al jugador: chocan
      const dpx = u.x - px, dpz = u.z - pz, dp = Math.hypot(dpx, dpz);
      if (dp < 3.1 && dp > 0.01 && enCoche) { u.x -= dpx / dp * (3.1 - dp) * .5; u.z -= dpz / dp * (3.1 - dp) * .5; }
      u.g.position.set(u.x, gh(u.x, u.z), u.z);
      u.g.rotation.y = u.dir;
      // sirenas
      const f = (frame % 24) < 12;
      u.sirena.material.color.setHex(f ? 0xff2a4a : 0x2a1030);
      u.sirena2.material.color.setHex(f ? 0x2a1030 : 0x2a6aff);
      if (POL.estado === 'persecucion' && frame % 22 === 0) { try { beep(f ? 880 : 660, .12, 'sawtooth', .022); } catch (e) { } }
    }
  }

  // ---------- maquina de estados de la persecucion ----------
  function actualizarEstado(dt, px, pz) {
    const copsCerca = cops.some(c => c.act && c.down <= 0 && Math.hypot(c.x - px, c.z - pz) < 90);
    const cochesCerca = CARS.some(u => Math.hypot(u.x - px, u.z - pz) < 110);
    // durante la busqueda los agentes a pie rondan la zona: solo los coches "
    // ver" al jugador, o la busqueda se cerraria sola
    const visto = POL.estado === 'busqueda' ? cochesCerca : (copsCerca || cochesCerca);

    if (POL.nivel > 0) {
      if (POL.estado === 'busqueda') {
        POL.busquedaT += dt;
        if (visto) {
          // te han vuelto a localizar: la persecucion vuelve
          POL.estado = 'persecucion';
          POL.busquedaT = 0;
          if (!POL.pers) POL.pers = { id: POL.idc, t0: performance.now(), ultimo: { x: px, z: pz }, tUltimo: performance.now(), perdidoT: 0, kills: 0, nivel: POL.nivel };
          toast('Te han visto: vuelve la persecucion');
        }
        return;                              // el nivel lo baja el motor (decaimiento)
      }
      // persecucion activa
      if (!POL.pers) POL.pers = { id: POL.idc, t0: performance.now(), ultimo: { x: px, z: pz }, tUltimo: performance.now(), perdidoT: 0, kills: 0, nivel: POL.nivel };
      if (visto) { POL.pers.ultimo.x = px; POL.pers.ultimo.z = pz; POL.pers.tUltimo = performance.now(); POL.pers.perdidoT = 0; }
      else {
        POL.pers.perdidoT += dt;
        if (POL.pers.perdidoT > 12) {
          // te han perdido de vista: buscan tu ultima posicion conocida
          POL.estado = 'busqueda';
          POL.busquedaT = 0;
          escribirNivel(Math.max(POL.nivel, 2));     // nivel pendiente de busqueda
          toast('Has escapado, pero te buscan (2 estrellas)');
          try { pop('BUSCANDO'); } catch (e) { }
        }
      }
      // 4 estrellas: cinco agentes abatidos en el mismo incidente
      if (POL.pers && POL.pers.kills >= 5) setNivel(Math.max(POL.nivel, 4), 'cinco agentes abatidos');
      // 5 estrellas: caos sostenido
      if (POL.nivel >= 4) {
        const dur = POL.pers ? (performance.now() - POL.pers.t0) / 1000 : 0;
        if (POL.copsMuertos >= 9 || dur > 150) setNivel(5, 'caos prolongado');
      }
    } else {
      POL.estado = 'libre';
      POL.pers = null;
    }
  }

  // ---------- integracion con el juego ----------
  NC.hooks.pre.push(dt => {
    try {
      if (typeof P === 'undefined' || !P) return;
      const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
      const th = P.foot ? (typeof cam !== 'undefined' ? cam.yaw : 0) : P.th;

      // ---------- nivel de busqueda: aquí manda la policía ----------
      if (P.noWanted) {
        // AEZAKMI (poli ciego): no hay búsqueda y no se acumula nada
        if (POL.nivel !== 0) { escribirNivel(0); POL.estado = 'libre'; POL.pers = null; POL.victimas = 0; POL.infracciones = 0; }
        try { P.wanted = 0; P.wt = 0; } catch (e) { }
      } else {
        const lv = nivelDeMotor();
        if (lv !== POL.nivel) {
          // el motor ha bajado el nivel por su cuenta (decaimiento): se refleja aquí
          POL.nivel = lv;
          try { P.wanted = lv; } catch (e) { }
          if (lv === 0) {
            POL.estado = 'libre'; POL.pers = null; POL.victimas = 0; POL.infracciones = 0;
            try { toast('Te han perdido el rastro'); } catch (e) { }
          }
          hud();
        }
      }
      actualizarEstado(dt, px, pz);
      actualizarPatrullas(dt, px, pz, th, !P.foot);
      // durante una busqueda los agentes a pie rondan la ultima posicion conocida
      if (POL.estado === 'busqueda' && POL.pers) {
        const L = POL.pers.ultimo;
        for (const c of cops) {
          if (!c.act) continue;
          const dx = L.x - c.x, dz = L.z - c.z, d = Math.hypot(dx, dz);
          if (d > 6) { c.x += dx / d * 4.6 * dt; c.z += dz / d * 4.6 * dt; try { collide(c, .5); } catch (e) { } c.h.g.position.set(c.x, gh(c.x, c.z), c.z); c.h.g.rotation.y = Math.atan2(dx, dz); }
        }
      }
    } catch (e) { }
  });
  // el HUD de estrellas se repinta cada frame (es el único que escribe en #st)
  NC.hooks.post.push(() => {
    try { hud(); } catch (e) { }
    // durante la busqueda los agentes a pie se quedan roncando la ultima posicion
    try {
      if (POL.estado === 'busqueda' && POL.pers) {
        const L = POL.pers.ultimo;
        let i = 0;
        for (const c of cops) {
          if (!c.act) continue;
          const a = (i++ * 1.9), rr = 7 + (i % 3) * 4;
          c.x = L.x + Math.cos(a) * rr; c.z = L.z + Math.sin(a) * rr;
          c.h.g.position.set(c.x, gh(c.x, c.z), c.z);
          c.h.g.rotation.y = a + PI;
        }
      }
    } catch (e) { }
  });

  // ---------- limpiar al ser detenido ----------
  try {
    const _busted = window.openBusted;
    window.openBusted = function (c) { try { limpiarBusqueda(); } catch (e) { } return _busted && _busted.apply(this, arguments); };
  } catch (e) { }

  // ---------- API pública ----------
  NC.Pol = {
    get nivel() { return POL.nivel; },
    get estado() { return POL.estado; },
    get victimas() { return POL.victimas; },
    get copsMuertos() { return POL.copsMuertos; },
    setLevel(n, motivo) { try { setNivel(n, motivo || 'nivel manual'); } catch (e) { } },
    clear() { try { limpiarBusqueda(); } catch (e) { } },
    POL
  };
  NC.policia = POL;
  POL.cars = CARS;
  NC.log('policia: busqueda de 0 a 5 estrellas (unico dueño del nivel), incidentes unicos y persecuciones con coche desde 3 estrellas');
})();
