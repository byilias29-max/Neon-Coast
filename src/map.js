/* Neon Coast - navegacion: minimapa circular NO interactivo + mapa grande del menu
   Convencion canonica del mundo (la misma del minimapa original del juego):
   - adelante del jugador = (sin th, cos th) en coordenadas (x, z)
   - lienzo: +x del mundo -> derecha, +z del mundo -> ARRIBA (el norte del juego es +z)
   - la flecha del jugador rota th (cam.yaw a pie, P.th en coche)
   Dos interfaces (mapa grande / minimapa) comparten la fuente de datos NC.geo,
   pero cada una tiene estado visual propio: zoom y paneo del grande no tocan el mini. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const NC = window.NC;

  // ==================== REGISTRO GEO COMUN (datos reales del mundo) ====================
  const geo = NC.geo = { pois: [], filters: {}, dest: null, path: null };

  const CATS = {
    casa:     { n: 'Casa del jugador',      col: '#ffd24a' },
    inmueble: { n: 'Contratos (local/casa)', col: '#b9a6e0' },
    tienda:   { n: 'Tiendas',               col: '#3dff9a' },
    taller:   { n: 'Talleres de coches',    col: '#ff8a3a' },
    hotel:    { n: 'Hoteles',               col: '#27e6ff' },
    club:     { n: 'Locales de noche',      col: '#ff5aef' },
    clinica:  { n: 'Clínica',               col: '#ff2038' },
    puerto:   { n: 'Puerto Viejo',          col: '#8fd1c9' },
    parque:   { n: 'Parque central',        col: '#2f9a52' },
    muelle:   { n: 'Muelle de la playa',    col: '#7ad0ff' },
    villa:    { n: 'Villas de Colina Mar',  col: '#e9d7b5' },
    fabrica:  { n: 'Nave abandonada',       col: '#6ba07a' },
    mision:   { n: 'Objetivo de misión',    col: '#27e6ff' },
    historia: { n: 'Objetivo de la historia', col: '#3dff9a' },
    evento:   { n: 'Eventos en marcha',     col: '#ff5a7a' }
  };
  for (const k in CATS) geo.filters[k] = true;

  geo.refresh = function () {
    const L = [];
    const put = (cat, n, x, z, r) => L.push({ cat, n, x, z, r: r || 0 });
    try { for (const q of shops) put('tienda', q.name || 'Tienda', q.x, q.z); } catch (e) { }
    try { for (const q of carShops) put('taller', q.name || 'Taller', q.x, q.z); } catch (e) { }
    try { for (const q of hotels) put('hotel', q.name || 'Hotel', q.x, q.z); } catch (e) { }
    try { for (const b of bars) put('club', 'Bar de noche', b.x, b.z); } catch (e) { }
    try { for (const d of doors) if (d.txt) put('inmueble', d.txt, d.x, d.z); } catch (e) { }
    try { put('clinica', 'Clínica David', CLINIC.x, CLINIC.z); } catch (e) { }
    try { if (window.NCH) put('casa', 'Tu casa', NCH.x, NCH.z); } catch (e) { }
    try { put('puerto', 'Puerto Viejo', PORT.pos.x, PORT.pos.z); } catch (e) { }
    try { put('parque', 'Parque central', park.x, park.z); } catch (e) { }
    try { put('muelle', 'Muelle del este', 445, 204); } catch (e) { }
    try { if (window.FACTORY) put('fabrica', 'Nave abandonada', FACTORY.x, FACTORY.z); } catch (e) { }
    try { if (window.VILLAS) for (const v of VILLAS.slice(0, 6)) put('villa', 'Villa de Colina Mar', v[0], v[1]); } catch (e) { }
    try { if (NC.sto && NC.sto.pins) for (const p of NC.sto.pins) put('historia', p.n || 'Objetivo de la historia', p.x, p.z, p.r || 0); } catch (e) { }
    try { if (tgt.on) put('mision', 'Objetivo de misión', tgt.x, tgt.z); } catch (e) { }
    try {
      if (NC.sto && NC.sto.debug) {
        const ef = NC.sto.debug.ev();
        if (ef.market) put('evento', 'Mercado de Fleming', NC.sto.debug.mkt().x, NC.sto.debug.mkt().z);
        if (ef.black) put('evento', 'Apagón', NC.sto.debug.blk().x, NC.sto.debug.blk().z);
      }
    } catch (e) { }
    geo.pois = L;
  };

  geo.zoneName = function (x, z) { try { return NC.sto.zone(x, z) || 'Neon Coast'; } catch (e) { return 'Neon Coast'; } };

  // ruta por rejilla (la misma logica L que usa el navegador de misiones)
  const lat = v => Math.max(-H, Math.min(H, Math.round(v / CELL)));
  const clp = v => Math.max(-EXT, Math.min(EXT, v));
  geo.snap = (x, z) => {
    const ix = lat(x), jz = lat(z), a = Math.abs(x - ix * CELL), b = Math.abs(z - jz * CELL);
    return a < b ? { x: ix * CELL, z: clp(z) } : { x: clp(x), z: jz * CELL };
  };
  geo.plan = function (fx, fz, tx, tz) {
    const s1 = geo.snap(fx, fz), s2 = geo.snap(tx, tz);
    return [[fx, fz], [s1.x, s1.z], [lat(s1.x) * CELL, lat(s1.z) * CELL], [lat(s2.x) * CELL, lat(s1.z) * CELL], [lat(s2.x) * CELL, lat(s2.z) * CELL], [s2.x, s2.z], [tx, tz]];
  };

  const pfx = () => P.foot ? P.fx : P.x, pfz = () => P.foot ? P.fz : P.z;

  function setDest(x, z, nombre) {
    wp = { x, z, n: nombre || 'Destino' };
    wpBeacon.position.set(x, 30, z); wpBeacon.visible = true;
    geo.dest = wp;
    geoLast.x = pfx(); geoLast.z = pfz();
    geo.path = geo.plan(geoLast.x, geoLast.z, x, z);
    const w = $('wp'); if (w) { w.style.display = 'block'; w.textContent = 'Destino: ' + wp.n; }
    try { beep(760, .07); } catch (e) { }
  }
  function clearDest() {
    wp = null; geo.dest = null; geo.path = null;
    wpBeacon.visible = false;
    const w = $('wp'); if (w) w.style.display = 'none';
  }
  geo.setDest = setDest; geo.clearDest = clearDest;

  // ==================== MAPA GRANDE (overlay con estado propio) ====================
  NC.css(`
    #bigMap{position:absolute;inset:0;z-index:8;display:none;background:radial-gradient(1100px 660px at 50% 36%,rgba(12,7,30,.92),rgba(5,3,14,.97));backdrop-filter:blur(5px)}
    #bigMap.on{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px}
    #bmTitle{color:#27e6ff;font:900 19px 'Arial Black',sans-serif;letter-spacing:3px;text-shadow:0 0 18px #27e6ff55}
    #bmWrap{position:relative}
    #bm{width:min(74vh,86vw);height:min(74vh,86vw);border:1px solid #27e6ff44;border-radius:14px;background:#241a45;cursor:grab;display:block}
    #bmHud{position:absolute;left:12px;top:10px;color:#fff7ea;font-size:12.5px;background:rgba(8,5,20,.74);padding:7px 11px;border-radius:9px;border:1px solid #27e6ff33;display:flex;flex-direction:column;gap:2px}
    #bmHud b{color:#27e6ff;font-size:13px}
    #bmLegend{position:absolute;right:10px;top:10px;background:rgba(8,5,20,.82);border:1px solid #27e6ff33;border-radius:10px;padding:9px 11px;color:#fff7ea;font-size:12px;max-height:54vh;overflow:auto;width:210px}
    #bmLegend h4{margin:2px 0 5px;color:#27e6ff;font-size:11.5px;letter-spacing:1px}
    .lrow{display:flex;align-items:center;gap:7px;margin:2px 0;cursor:pointer;user-select:none}
    .lrow .pi{width:12px;height:12px;border-radius:4px;flex:0 0 auto;background:currentColor}
    .lrow b{font-size:11px;opacity:.55;margin-left:auto}
    .lrow.off{opacity:.26}
    #bmHint{color:#a99dc9;font-size:11px}
    #bmBtns{display:flex;gap:8px}
    #bmBtns button{background:#161033;border:1px solid #27e6ff66;color:#fff7ea;border-radius:9px;padding:7px 14px;font-weight:700;cursor:pointer;font-size:13px}
    #bmBtns button:hover{background:#27e6ff22}
    #mm,#mmw{pointer-events:none !important}
    #mmw.minibig #mm{width:min(320px,66vw);height:min(320px,66vw)}
    #mmw.minibig{background:rgba(21,13,58,.82);border:1px solid #27e6ff55}
    #mmw.minibig~#wp{bottom:calc(360px + env(safe-area-inset-bottom,0px))}
  `);
  document.body.insertAdjacentHTML('beforeend', `
    <div id="bigMap">
      <div id="bmTitle">NEON COAST · MAPA DE LA CIUDAD</div>
      <div id="bmWrap">
        <canvas id="bm" width="1024" height="1024"></canvas>
        <div id="bmHud"><b id="bmZone">Neon Coast</b><span id="bmCoord">—</span><span id="bmNav">Sin destino</span><span id="bmHint">arrastrar · rueda para zoom · clic marca destino · M cierra</span></div>
        <div id="bmLegend"><h4>LEYENDA (clic: mostrar/ocultar)</h4><div id="bmLeg"></div></div>
      </div>
      <div id="bmBtns">
        <button id="bmCenter">Centrar en mí</button>
        <button id="bmClear">Borrar destino</button>
        <button id="bmClose">Cerrar (M)</button>
      </div>
    </div>`);

  const bmC = document.getElementById('bm'), bmg = bmC.getContext('2d');
  const bmZone = document.getElementById('bmZone'), bmCoord = document.getElementById('bmCoord'), bmNav = document.getElementById('bmNav');
  const legEl = document.getElementById('bmLeg');

  let bmOpen = false, bmZ = 1.1, bmPX = 0, bmPZ = 0, bmDrag = false, bmMoved = 0, bmLX = 0, bmLY = 0;

  function buildLegend() {
    legEl.innerHTML = '';
    geo.refresh();
    for (const k in CATS) {
      const c = CATS[k], cnt = geo.pois.filter(p => p.cat === k).length;
      const row = document.createElement('div');
      row.className = 'lrow' + (geo.filters[k] ? '' : ' off');
      row.innerHTML = `<span class="pi" style="color:${c.col}"></span><span>${c.n}</span>` + (cnt ? `<b>${cnt}</b>` : '');
      row.onclick = () => { geo.filters[k] = !geo.filters[k]; row.classList.toggle('off', !geo.filters[k]); drawBig(); };
      legEl.appendChild(row);
    }
  }

  // ---------- dibujo del mundo (coordenadas reales; la vista aplica la transformacion) ----------
  function drawGround(g) {
    g.fillStyle = '#0d5273'; g.fillRect(EXT + 60, -2600, 2400, 5200);          // mar del este
    g.fillStyle = '#e8cfa0'; g.fillRect(EXT, -2600, 60, 5200);                 // playa de arena
    g.fillStyle = '#3a2762'; g.fillRect(-EXT - 46, -EXT - 46, (EXT + 46) * 2, (EXT + 46) * 2); // suelo urbano
    g.fillStyle = '#2f9a52'; g.fillRect(park.x - 28, park.z - 28, 56, 56);      // parque central
  }
  function drawRoads(g) {
    g.strokeStyle = '#6b6486'; g.lineWidth = R; g.beginPath();
    for (let i = -H; i <= H; i++) { g.moveTo(-EXT - 40, i * CELL); g.lineTo(EXT + 40, i * CELL); g.moveTo(i * CELL, -EXT - 40); g.lineTo(i * CELL, EXT + 40); }
    g.stroke();
  }
  function drawBlocks(g) {
    g.fillStyle = '#4d3a7d';
    for (const b of boxes) if (Math.abs(b.x) < EXT + 46 && Math.abs(b.z) < EXT + 46) g.fillRect(b.x - b.hw, b.z - b.hd, b.hw * 2, b.hd * 2);
  }
  function drawZones(g) {
    if (NC.sto && NC.sto.zones) for (const zn of NC.sto.zones) if (zn.rect) {
      g.strokeStyle = zn.line || 'rgba(127,107,168,.55)'; g.lineWidth = 3.5; g.setLineDash([14, 10]);
      g.strokeRect(zn.rect[0], zn.rect[1], zn.rect[2], zn.rect[3]); g.setLineDash([]);
    }
  }

  // ---------- iconos de puntos de interés ----------
  function poiIcon(g, p, col) {
    const c = p.cat;
    if (c === 'casa') { g.fillStyle = col; g.fillRect(p.x - 9, p.z - 9, 18, 18); g.fillStyle = '#7a5500'; g.fillRect(p.x - 3, p.z - 2, 6, 11); g.fillStyle = '#7a5500'; g.beginPath(); g.moveTo(p.x - 11, p.z - 9); g.lineTo(p.x, p.z - 17); g.lineTo(p.x + 11, p.z - 9); g.closePath(); g.fill(); }
    else if (c === 'taller') { g.fillStyle = col; g.fillRect(p.x - 9, p.z - 8, 18, 16); g.fillStyle = '#fff'; g.fillRect(p.x - 7, p.z + 5, 14, 3); }
    else if (c === 'hotel') { g.fillStyle = col; g.beginPath(); g.moveTo(p.x, p.z - 11); g.lineTo(p.x + 10, p.z + 8); g.lineTo(p.x - 10, p.z + 8); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(p.x - 1.6, p.z - 6, 3.2, 3.2); }
    else if (c === 'club') { g.fillStyle = col; g.beginPath(); g.moveTo(p.x, p.z - 10); g.lineTo(p.x + 10, p.z); g.lineTo(p.x, p.z + 10); g.lineTo(p.x - 10, p.z); g.closePath(); g.fill(); }
    else if (c === 'clinica') { g.fillStyle = col; g.fillRect(p.x - 9, p.z - 3.4, 18, 6.8); g.fillRect(p.x - 3.4, p.z - 9, 6.8, 18); }
    else if (c === 'puerto') { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g[i ? 'lineTo' : 'moveTo'](p.x + Math.cos(a) * 10, p.z + Math.sin(a) * 10); } g.closePath(); g.fill(); }
    else if (c === 'parque') { g.fillStyle = col; g.beginPath(); g.arc(p.x, p.z, 10, 0, 7); g.fill(); g.fillStyle = '#134d28'; g.beginPath(); g.arc(p.x, p.z, 4.6, 0, 7); g.fill(); }
    else if (c === 'muelle') { g.fillStyle = col; g.fillRect(p.x - 10, p.z - 2, 20, 4); g.fillRect(p.x - 3, p.z - 8, 6, 16); }
    else if (c === 'fabrica') { g.fillStyle = col; g.fillRect(p.x - 10, p.z - 7, 20, 13); g.fillStyle = '#241a45'; g.fillRect(p.x - 7, p.z - 4, 5, 10); g.fillRect(p.x + 1, p.z - 4, 5, 10); }
    else { g.beginPath(); g.arc(p.x, p.z, 7, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 2; g.strokeStyle = '#ffffffc8'; g.stroke(); }
  }

  function drawPOIs(g, filtrar, cercaDe, radioCerca) {
    for (const p of geo.pois) {
      if (filtrar && !geo.filters[p.cat]) continue;
      if (cercaDe && Math.hypot(p.x - cercaDe.x, p.z - cercaDe.y) > radioCerca) continue;
      poiIcon(g, p, CATS[p.cat].col);
      if (p.r) { g.strokeStyle = CATS[p.cat].col + '66'; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.z, p.r, 0, 7); g.stroke(); }
    }
  }

  function drawStoryPins(g) {
    const t = performance.now() / 350;
    for (const p of NC.sto.pins) {
      const pul = p.pulse ? 4 * Math.sin(t * 2 + p.x) : 0;
      if (p.type === 'star') {
        g.fillStyle = p.color || '#ffd24a'; g.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 5 * Math.PI, rr = (i % 2 ? 7 : 15) + pul; g[i ? 'lineTo' : 'moveTo'](p.x + Math.cos(a) * rr, p.z + Math.sin(a) * rr); }
        g.closePath(); g.fill();
      } else { g.fillStyle = p.color || '#27e6ff'; g.beginPath(); g.arc(p.x, p.z, 8 + pul, 0, 7); g.fill(); }
      if (p.r) { g.strokeStyle = (p.color || '#ffd24a') + '44'; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.z, p.r, 0, 7); g.stroke(); }
    }
  }

  function drawDest(g) {
    if (!wp || !geo.path) return;
    g.strokeStyle = '#ff5aef'; g.lineWidth = 5; g.setLineDash([16, 11]); g.beginPath();
    geo.path.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ff5aef'; g.beginPath(); g.arc(wp.x, wp.z, 9, 0, 7); g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('!', wp.x, wp.z - 16);
  }

  function drawPlayerArrow(g) { // se llama con transform canonica aplicada; dibuja en la pos. del jugador
    g.save(); g.translate(pfx(), pfz()); g.rotate(P.foot ? cam.yaw : P.th);
    g.beginPath(); g.moveTo(0, -13); g.lineTo(8.6, 9); g.lineTo(-8.6, 9); g.closePath();
    g.fillStyle = '#ff5a7a'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke(); g.restore();
  }

  // ==================== VISTA MINIMAPA (NO interactiva, siempre activa) ====================
  window.miniBig = false;                       // minimapa ampliado durante la partida
  function applyMiniSize() {
    const mm = document.getElementById('mm'), w = document.getElementById('mmw');
    if (!mm || !w) return;
    const S = window.miniBig ? 320 : 150;
    mm.width = mm.height = S;
    mm.style.width = mm.style.height = '';
    w.classList.toggle('minibig', window.miniBig);
  }
  window.toggleMiniBig = function (force) {
    if (!running) return;
    if (NC.wheel && NC.wheel.open) return;
    const v = force !== undefined ? force : !window.miniBig;
    if (v === window.miniBig) return;
    window.miniBig = v;
    applyMiniSize();
    toast(v ? 'Minimapa ampliado · V para volver' : 'Minimapa normal');
    if (window.NC) NC.log('minimapa', v ? 'ampliado 320px' : 'normal 150px');
  };
  window.mini = function (px, pz, th) {
    const S = mg.canvas.width, C = S / 2, s = window.miniBig ? .78 : .5, c = Math.cos(th), n = Math.sin(th);
    mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, S, S);
    mg.save(); mg.beginPath(); mg.arc(C, C, C, 0, 7); mg.clip();
    mg.fillStyle = '#241a45'; mg.fillRect(0, 0, S, S);
    mg.setTransform(-c * s, -n * s, n * s, -c * s, C, C); mg.translate(-px, -pz);
    drawGround(mg); drawRoads(mg);
    const dot = (x, z, r, f, o) => { mg.beginPath(); mg.arc(x, z, r, 0, 7); mg.fillStyle = f; mg.fill(); if (o) { mg.lineWidth = 2.5; mg.strokeStyle = o; mg.stroke(); } };
    // edificios cercanos
    const near = window.miniBig ? 230 : 90;
    mg.fillStyle = '#4d3a7d';
    for (const b of boxes) if (Math.abs(b.x - px) < near + b.hw && Math.abs(b.z - pz) < near + b.hd) mg.fillRect(b.x - b.hw, b.z - b.hd, b.hw * 2, b.hd * 2);
    geo.refresh();
    drawPOIs(mg, false, { x: px, y: pz }, window.miniBig ? 340 : 130);
    if (NC.sto) drawStoryPins(mg);
    for (const cc of cops) if (cc.act) dot(cc.x, cc.z, 6, '#ff3030', '#fff');
    mg.fillStyle = '#fff'; for (const a of ai) if (!a.off) mg.fillRect(a.g.position.x - 2.5, a.g.position.z - 2.5, 5, 5);
    if (tgt.on) { mg.strokeStyle = '#27e6ff'; mg.lineWidth = 5; mg.beginPath(); rtPts.forEach((p, i) => i ? mg.lineTo(p[0], p[1]) : mg.moveTo(p[0], p[1])); mg.stroke(); const pr2 = 13 + 4 * Math.sin(performance.now() / 350); mg.fillStyle = '#27e6ff'; mg.beginPath(); mg.arc(tgt.x, tgt.z, 9, 0, 7); mg.fill(); mg.lineWidth = 3; mg.beginPath(); mg.arc(tgt.x, tgt.z, pr2, 0, 7); mg.stroke(); }
    drawDest(mg);
    mg.restore();
    mg.setTransform(1, 0, 0, 1, C, C);
    mg.lineWidth = 2.5; mg.strokeStyle = '#fff'; mg.fillStyle = '#ff5a7a'; mg.beginPath(); const ar = C / 75;
    mg.moveTo(0, -11 * ar); mg.lineTo(7 * ar, 8 * ar); mg.lineTo(-7 * ar, 8 * ar); mg.closePath(); mg.fill(); mg.stroke();
  };

  // ==================== VISTA MAPA GRANDE ====================
  function drawBig() {
    if (!bmOpen) return;
    const S = 1024, C = S / 2, k = .55 * bmZ;
    bmg.setTransform(1, 0, 0, 1, 0, 0); bmg.clearRect(0, 0, S, S);
    bmg.save(); bmg.beginPath(); bmg.rect(2, 2, S - 4, S - 4); bmg.clip();
    bmg.setTransform(k, 0, 0, -k, C - bmPX * k, C + bmPZ * k);
    drawGround(bmg); drawRoads(bmg); drawBlocks(bmg);
    drawZones(bmg);
    drawPOIs(bmg, true, null, 0);
    for (const cc of cops) if (cc.act) { bmg.fillStyle = '#ff3030'; bmg.beginPath(); bmg.arc(cc.x, cc.z, 6, 0, 7); bmg.fill(); }
    if (tgt.on) {
      bmg.strokeStyle = '#27e6ff'; bmg.lineWidth = 6; bmg.setLineDash([14, 10]); bmg.beginPath();
      rtPts.forEach((p, i) => i ? bmg.lineTo(p[0], p[1]) : bmg.moveTo(p[0], p[1])); bmg.stroke(); bmg.setLineDash([]);
      bmg.fillStyle = '#27e6ff'; bmg.beginPath(); bmg.arc(tgt.x, tgt.z, 9, 0, 7); bmg.fill(); bmg.lineWidth = 3; bmg.strokeStyle = '#fff'; bmg.beginPath(); bmg.arc(tgt.x, tgt.z, 15, 0, 7); bmg.stroke();
    }
    drawStoryPins(bmg);
    drawDest(bmg);
    drawPlayerArrow(bmg);
    bmg.restore();
    // marco y rosa de los vientos
    bmg.setTransform(1, 0, 0, 1, 0, 0);
    bmg.strokeStyle = '#27e6ff33'; bmg.lineWidth = 2; bmg.strokeRect(2, 2, S - 4, S - 4);
    bmg.fillStyle = '#27e6ff88'; bmg.font = 'bold 15px sans-serif'; bmg.textAlign = 'center';
    bmg.fillText('N', C, 26); bmg.beginPath(); bmg.moveTo(C, 34); bmg.lineTo(C - 5, 48); bmg.lineTo(C + 5, 48); bmg.closePath(); bmg.fill();
    updateHud();
  }

  function updateHud() {
    bmZone.textContent = geo.zoneName(pfx(), pfz());
    bmCoord.textContent = (pfx() | 0) + ' , ' + (pfz() | 0);
    if (geo.dest) {
      const d = Math.hypot(geo.dest.x - pfx(), geo.dest.z - pfz()) | 0;
      bmNav.textContent = 'Destino: ' + geo.dest.n + ' · ' + d + ' m';
    } else bmNav.textContent = 'Sin destino · clic en el mapa para marcar';
  }

  // ---------- interaccion del mapa grande (pantalla <-> mundo con la MISMA convencion) ----------
  // el canvas va escalado por CSS (attr 1024): se trabaja en pixeles logicos del canvas
  function logXY(e) {
    const r = bmC.getBoundingClientRect(), f = 1024 / r.width;
    return { x: (e.clientX - r.left) * f - 512, y: (e.clientY - r.top) * f - 512 };
  }

  bmC.addEventListener('pointerdown', e => {
    if (!bmOpen) return;
    const p = logXY(e);
    bmDrag = true; bmMoved = 0; bmLX = p.x; bmLY = p.y;
    try { bmC.setPointerCapture(e.pointerId); } catch (err) { }
    bmC.style.cursor = 'grabbing';
  });
  bmC.addEventListener('pointermove', e => {
    if (!bmDrag) return;
    const p = logXY(e), dx = p.x - bmLX, dy = p.y - bmLY, k = .55 * bmZ;
    bmMoved += Math.abs(dx) + Math.abs(dy);
    bmPX -= dx / k;                                  // arrastre a la derecha => se ve mundo mas al oeste
    bmPZ += dy / k;                                  // arrastre abajo => se revela contenido con z menor (sur)
    bmLX = p.x; bmLY = p.y;
    const lim = 1300; bmPX = Math.max(-lim, Math.min(lim, bmPX)); bmPZ = Math.max(-lim, Math.min(lim, bmPZ));
    drawBig();
  });
  bmC.addEventListener('pointerup', e => {
    const wasDrag = bmDrag; bmDrag = false; bmC.style.cursor = 'grab';
    if (!wasDrag || bmMoved > 7) return;
    // clic: primero un icono cercano (destino con nombre), si no un punto libre
    const p = logXY(e), mx = p.x, my2 = p.y, k = .55 * bmZ;
    const cx = bmPX + mx / k, cz = bmPZ - my2 / k;
    let best = null, bd = 24 / k;
    for (const q of geo.pois) {
      if (!geo.filters[q.cat]) continue;
      const d = Math.hypot(q.x - cx, q.z - cz);
      if (d < bd) { bd = d; best = q; }
    }
    if (best) setDest(best.x, best.z, best.n);
    else setDest(clp(cx), clp(cz), 'Destino marcado');
    drawBig();
  });
  bmC.addEventListener('wheel', e => {
    e.preventDefault();
    if (!bmOpen) return;
    const p = logXY(e), mxe = p.x, mye = p.y;
    const wx0 = bmPX + mxe / (.55 * bmZ), wz0 = bmPZ - mye / (.55 * bmZ); // punto del mundo bajo el cursor (se conserva)
    bmZ = Math.max(.42, Math.min(4.4, bmZ * (e.deltaY < 0 ? 1.16 : 1 / 1.16)));
    bmPX = wx0 - mxe / (.55 * bmZ);
    bmPZ = wz0 + mye / (.55 * bmZ);
    const lim = 1300; bmPX = Math.max(-lim, Math.min(lim, bmPX)); bmPZ = Math.max(-lim, Math.min(lim, bmPZ));
    drawBig();
  }, { passive: false });

  document.getElementById('bmCenter').onclick = () => { bmPX = pfx(); bmPZ = pfz(); drawBig(); };
  document.getElementById('bmClear').onclick = () => { clearDest(); drawBig(); };
  document.getElementById('bmClose').onclick = () => { window.toggleMap(false); };

  // ==================== APERTURA / CIERRE (no toca el minimapa) ====================
  window.toggleMap = function (force) {
    if (!running) return;
    if ((NC.wheel && NC.wheel.open) || inv.open || (NC.dlg && NC.dlg.open)) return;
    const want = force !== undefined ? force : !bmOpen;
    if (want === bmOpen) return;
    bmOpen = want;
    window.mapBig = bmOpen;
    $('bigMap').classList.toggle('on', bmOpen);
    $('mmw').style.display = bmOpen ? 'none' : '';
    if (bmOpen) {
      geo.refresh();
      bmPX = pfx(); bmPZ = pfz(); bmZ = 1.1;
      buildLegend();
      if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
      drawBig();
      toast('Clic marca destino · arrastrar · rueda zoom · M cierra');
    } else if (running && !inv.open && !(NC.dlg && NC.dlg.open) && cn && cn.requestPointerLock) cn.requestPointerLock();
  };

  addEventListener('keydown', e => {
    // OJO: la tecla M ya la gestiona el juego (toggleMap) -> aqui solo Escape, o se abriria y cerraria
    if (bmOpen && e.code === 'Escape') { e.preventDefault(); window.toggleMap(false); return; }
    if (e.code === 'KeyX' && running) clearDest(); // sincroniza el estado interno del mapa al borrar la marca
  });

  // refresco del mapa grande al trote (el minimapa lo pinta el bucle del juego cada 4 frames)
  NC.hooks = NC.hooks || { pre: [], post: [] };
  let bmFrame = 0, geoLast = { x: 0, z: 0 };
  NC.hooks.post.push(() => {
    if (!bmOpen) return;
    if (++bmFrame % 6 === 0) drawBig();
  });
  // recalcula el tramo de ruta si el jugador se aleja del ultimo origen computado
  NC.hooks.pre.push(() => {
    if (!geo.dest) return;
    if (Math.hypot(pfx() - geoLast.x, pfz() - geoLast.z) > 15) {
      geoLast = { x: pfx(), z: pfz() };
      geo.path = geo.plan(geoLast.x, geoLast.z, geo.dest.x, geo.dest.z);
    }
  });
  NC.log('mapa: dos vistas listas (mini no interactiva + grande con leyenda)');
})();
