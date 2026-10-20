/* Neon Coast - mapas.
   · MINIMAPA  (#mm, HUD): rumbo-arriba, tamaño fijo, NO interactivo.
   · MAPA GRANDE (#nbm, overlay propio): norte-arriba, arrastrar/zoom, leyenda, filtros, búsqueda, destino.
   Los dos leen los mismos datos (NC.Nav: destino, ruta, puntos de interés) pero cada uno tiene su propio
   estado visual (escala, desplazamiento, controles). Mover o hacer zoom en uno nunca toca al otro.
   Convenciones del mundo y proyecciones: ver nav.js (norte = -z, este = +x). */
(function () {
  'use strict';
  if (!window.NC || !NC.Nav) return;
  const Nav = NC.Nav, Proj = Nav.Proj;

  // ================================================================ colores (los reales del mundo 3D)
  const COL = { ground: '#2a2540', sea: '#0f6f8f', sand: '#e8cfa0', slab: '#3d3560', road: '#756e98', roadLine: 'rgba(255,255,255,.18)',
    park: '#2f9a52', bld: '#5b4b8c', bldEdge: 'rgba(8,4,24,.55)', wp: '#ff5aef', mission: '#27e6ff' };
  const WORLD = { x0: -EXT - 60, x1: EXT + 130, z0: -EXT - 60, z1: EXT + 60 };
  const MINI_K = .5;                         // px por unidad de mundo en el minimapa (fijo)
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);

  // ================================================================ caché de edificios (huellas) sin interiores teletransportados
  let bldCache = [], bldN = -1;
  function buildings() {
    if (bldN === boxes.length) return bldCache;
    bldN = boxes.length;
    const inter = [];
    try { doors.forEach(d => { if ((d.label === 'Apartamento' || d.label === 'Club Neón') && isFinite(d.tx)) inter.push([d.tx, d.tz]); }); } catch (e) { }
    bldCache = boxes.filter(b => (b.hw > 4.75 || b.hd > 4.75) && Math.abs(b.x) < EXT + 45 && Math.abs(b.z) < EXT + 45 &&
      !inter.some(q => Math.abs(b.x - q[0]) < 12 && Math.abs(b.z - q[1]) < 12));
    return bldCache;
  }

  // ================================================================ iconos (los mismos en mapa, minimapa y leyenda)
  function icon(ctx, catId, x, y, s, hot) {
    const c = Nav.catById[catId]; if (!c) return;
    const r = s / 2;
    ctx.save(); ctx.translate(x, y);
    ctx.lineWidth = hot ? 2.4 : 1.5; ctx.strokeStyle = hot ? '#fff' : 'rgba(10,6,26,.92)'; ctx.fillStyle = c.col;
    ctx.beginPath();
    switch (c.shape) {
      case 'circle': ctx.arc(0, 0, r, 0, 7); break;
      case 'square': ctx.rect(-r, -r, s, s); break;
      case 'diamond': ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * 1.1, 0); ctx.lineTo(0, r * 1.2); ctx.lineTo(-r * 1.1, 0); ctx.closePath(); break;
      case 'house': ctx.moveTo(-r, r * .85); ctx.lineTo(-r, -r * .1); ctx.lineTo(0, -r * 1.15); ctx.lineTo(r, -r * .1); ctx.lineTo(r, r * .85); ctx.closePath(); break;
      case 'cross': { const t = r * .42; ctx.moveTo(-t, -r); ctx.lineTo(t, -r); ctx.lineTo(t, -t); ctx.lineTo(r, -t); ctx.lineTo(r, t); ctx.lineTo(t, t); ctx.lineTo(t, r); ctx.lineTo(-t, r); ctx.lineTo(-t, t); ctx.lineTo(-r, t); ctx.lineTo(-r, -t); ctx.lineTo(-t, -t); ctx.closePath(); break; }
      case 'star': for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .5 : r * 1.2; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); break;
      case 'tri': ctx.moveTo(0, -r * 1.15); ctx.lineTo(r * 1.1, r * .9); ctx.lineTo(-r * 1.1, r * .9); ctx.closePath(); break;
      case 'hex': for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6, px = Math.cos(a) * r * 1.1, py = Math.sin(a) * r * 1.1; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); break;
      case 'ring': ctx.arc(0, 0, r * .8, 0, 7); break;
    }
    if (c.shape === 'ring') { ctx.fillStyle = 'rgba(10,6,26,.85)'; ctx.fill(); ctx.lineWidth = Math.max(2, s * .2); ctx.strokeStyle = c.col; ctx.stroke(); if (hot) { ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff'; ctx.stroke(); } }
    else { ctx.fill(); ctx.stroke(); }
    if (c.g && s >= 11) { ctx.fillStyle = '#10131f'; ctx.font = 'bold ' + Math.round(s * .66) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.g, 0, s * .05); }
    ctx.restore();
  }

  // ================================================================ pintado común del mundo (cada mapa lo usa con su propia matriz)
  // m = matriz de proyección en px CSS; el lienzo tiene w×h px CSS y escala `dpr`.
  function setWorld(ctx, m, dpr) { ctx.setTransform(m[0] * dpr, m[1] * dpr, m[2] * dpr, m[3] * dpr, m[4] * dpr, m[5] * dpr); }
  function setScreen(ctx, dpr) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function polyline(ctx, m, pts, color, width, dash) {
    if (!pts || pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    pts.forEach((p, i) => { const s = Proj.apply(m, p[0], p[1]); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); });
    ctx.stroke(); ctx.restore();
  }

  function paintTerrain(ctx, m, w, h, dpr, k, rich) {
    setScreen(ctx, dpr); ctx.fillStyle = COL.ground; ctx.fillRect(0, 0, w, h);
    setWorld(ctx, m, dpr);
    // mar y arena: SOLO al este (así es el mundo 3D)
    ctx.fillStyle = COL.sea; ctx.fillRect(EXT + 60, -1500, 2200, 3000);
    ctx.fillStyle = COL.sand; ctx.fillRect(EXT, -EXT - 200, 60, 2 * EXT + 400);
    if (rich && NC.sto && NC.sto.zones) for (const zn of NC.sto.zones) if (zn.rect) { ctx.fillStyle = (zn.line || 'rgba(255,255,255,.4)'); ctx.globalAlpha = .12; ctx.fillRect(zn.rect[0], zn.rect[1], zn.rect[2], zn.rect[3]); ctx.globalAlpha = 1; }
    // manzanas (aceras) y parque
    ctx.fillStyle = COL.slab; for (const p of slabL) ctx.fillRect(p[0] - B / 2, p[1] - B / 2, B, B);
    ctx.fillStyle = COL.park; ctx.fillRect(park.x - 28, park.z - 28, 56, 56);
    // calzadas
    ctx.strokeStyle = COL.road; ctx.lineWidth = R; ctx.beginPath();
    for (let i = -H; i <= H; i++) { ctx.moveTo(-EXT - 40, i * CELL); ctx.lineTo(EXT + 40, i * CELL); ctx.moveTo(i * CELL, -EXT - 40); ctx.lineTo(i * CELL, EXT + 40); }
    ctx.stroke();
    if (rich && k > .7) { ctx.strokeStyle = COL.roadLine; ctx.lineWidth = 1 / k; ctx.setLineDash([6 / k, 6 / k]); ctx.beginPath(); for (let i = -H; i <= H; i++) { ctx.moveTo(-EXT - 40, i * CELL); ctx.lineTo(EXT + 40, i * CELL); ctx.moveTo(i * CELL, -EXT - 40); ctx.lineTo(i * CELL, EXT + 40); } ctx.stroke(); ctx.setLineDash([]); }
    // edificios
    ctx.fillStyle = COL.bld; const bl = buildings();
    for (const b of bl) ctx.fillRect(b.x - b.hw, b.z - b.hd, b.hw * 2, b.hd * 2);
    if (rich && k > .55) { ctx.strokeStyle = COL.bldEdge; ctx.lineWidth = 1 / k; for (const b of bl) ctx.strokeRect(b.x - b.hw, b.z - b.hd, b.hw * 2, b.hd * 2); }
    if (rich && NC.sto && NC.sto.zones) for (const zn of NC.sto.zones) if (zn.rect) {
      ctx.strokeStyle = zn.line || 'rgba(127,107,168,.6)'; ctx.lineWidth = 2.5 / k; ctx.setLineDash([12 / k, 9 / k]); ctx.strokeRect(zn.rect[0], zn.rect[1], zn.rect[2], zn.rect[3]); ctx.setLineDash([]);
    }
    setScreen(ctx, dpr);
  }

  const visibleCats = filter => (filter ? (id => filter[id] !== false) : (() => true));

  // iconos, rutas y marcas (en pantalla, tamaño constante)
  function paintOverlay(ctx, m, w, h, o) {
    const cs = o.circle ? Math.min(w, h) / 2 : 0, cx0 = w / 2, cy0 = h / 2;
    const inside = (sx, sy, pad) => o.circle ? Math.hypot(sx - cx0, sy - cy0) < cs - pad : (sx > -20 && sy > -20 && sx < w + 20 && sy < h + 20);
    const now = performance.now();

    // rutas: misión (cian) y destino marcado (magenta)
    try { if (typeof tgt !== 'undefined' && tgt.on && rtPts.length) polyline(ctx, m, rtPts, COL.mission, o.mini ? 3 : 4); } catch (e) { }
    const rt = Nav.route();
    if (rt && rt.pts.length) { polyline(ctx, m, rt.pts, 'rgba(10,6,26,.7)', o.mini ? 5 : 7); polyline(ctx, m, rt.pts, COL.wp, o.mini ? 3 : 4, [10, 7]); }

    // lugares
    const list = Nav.pois(), vis = visibleCats(o.filter), size = o.mini ? 10 : 16;
    for (const c of Nav.CATS) {
      if (!vis(c.id)) continue;
      for (const p of list) {
        if (p.cat !== c.id) continue;
        const s = Proj.apply(m, p.x, p.z);
        if (!inside(s[0], s[1], 4)) continue;
        const hot = o.sel === p.id || o.hover === p.id;
        if (p.pulse) { ctx.save(); ctx.strokeStyle = c.col; ctx.globalAlpha = .55; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s[0], s[1], size * (.9 + .25 * Math.sin(now / 320)), 0, 7); ctx.stroke(); ctx.restore(); }
        icon(ctx, p.cat, s[0], s[1], hot ? size + 4 : size, hot);
        if (o.labels || hot) {
          ctx.save(); ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,6,26,.9)'; ctx.fillStyle = '#fff7ea';
          ctx.strokeText(p.name, s[0], s[1] + size * .75 + 2); ctx.fillText(p.name, s[0], s[1] + size * .75 + 2); ctx.restore();
        }
      }
    }
    // policías activos y tráfico (tráfico solo en el minimapa)
    try { for (const c of cops) if (c.act) { const s = Proj.apply(m, c.x, c.z); if (inside(s[0], s[1], 3)) { ctx.fillStyle = (Math.floor(now / 250) % 2) ? '#ff3030' : '#3a7aff'; ctx.beginPath(); ctx.arc(s[0], s[1], o.mini ? 3 : 4, 0, 7); ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#fff'; ctx.stroke(); } } } catch (e) { }
    if (o.mini) try { ctx.fillStyle = 'rgba(255,255,255,.7)'; for (const a of ai) if (!a.off) { const s = Proj.apply(m, a.g.position.x, a.g.position.z); if (inside(s[0], s[1], 3)) ctx.fillRect(s[0] - 1.5, s[1] - 1.5, 3, 3); } } catch (e) { }

    // destino marcado: punto exacto + mástil con bandera
    const d = Nav.dest();
    if (d) {
      const s = Proj.apply(m, d.x, d.z);
      if (inside(s[0], s[1], 2)) {
        ctx.save();
        ctx.strokeStyle = COL.wp; ctx.globalAlpha = .5; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s[0], s[1], 10 + 3 * Math.sin(now / 350), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = COL.wp; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s[0], s[1], o.mini ? 4.5 : 6, 0, 7); ctx.fill(); ctx.stroke();
        if (!o.mini) {
          ctx.strokeStyle = COL.wp; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s[0], s[1] - 6); ctx.lineTo(s[0], s[1] - 26); ctx.stroke();
          ctx.fillStyle = COL.wp; ctx.beginPath(); ctx.moveTo(s[0], s[1] - 26); ctx.lineTo(s[0] + 16, s[1] - 21); ctx.lineTo(s[0], s[1] - 16); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      } else if (o.circle) edgeArrow(ctx, s[0], s[1], cx0, cy0, cs - 8, COL.wp);
    }
    try {
      if (o.mini && typeof tgt !== 'undefined' && tgt.on) {
        const s = Proj.apply(m, tgt.x, tgt.z);
        if (!inside(s[0], s[1], 2)) edgeArrow(ctx, s[0], s[1], cx0, cy0, cs - 8, COL.mission);
      }
    } catch (e) { }
  }
  function edgeArrow(ctx, sx, sy, cx, cy, rad, col) {
    const a = Math.atan2(sy - cy, sx - cx);
    ctx.save(); ctx.translate(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); ctx.rotate(a);
    ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // flecha del jugador: apunta hacia donde mira. En un mapa norte-arriba el rumbo th (delante = (sin th, cos th))
  // sale en pantalla como (sin th, cos th); la flecha base apunta a (0,-1) y ctx.rotate(a) la lleva a (sin a, -cos a)  =>  a = PI - th.
  function playerArrow(ctx, sx, sy, angle, scale) {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(angle); ctx.scale(scale, scale);
    ctx.lineWidth = 2.2; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#27c0ff';
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  // ================================================================ MINIMAPA (HUD, sin interacción)
  const mmEl = document.getElementById('mm');
  NC.css('#mmw,#mm{pointer-events:none !important;cursor:default}');
  const mmCtx = mmEl.getContext('2d'), MS = 150;
  (function fixSize() { const d = DPR(); mmEl.width = mmEl.height = Math.round(MS * d); mmEl.style.width = mmEl.style.height = MS + 'px'; })();

  function drawMini(px, pz, th) {
    const dpr = mmEl.width / MS, ctx = mmCtx, C = MS / 2;
    const m = Proj.heading(px, pz, th, MINI_K, MS, MS);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, mmEl.width, mmEl.height);
    ctx.save(); setScreen(ctx, dpr); ctx.beginPath(); ctx.arc(C, C, C - 1, 0, 7); ctx.clip();
    paintTerrain(ctx, m, MS, MS, dpr, MINI_K, false);
    paintOverlay(ctx, m, MS, MS, { mini: true, circle: true });
    // norte: sobre el borde, girando con el mapa
    const nx = -m[2], nz = -m[3], nl = Math.hypot(nx, nz) || 1, rx = C + nx / nl * (C - 11), ry = C + nz / nl * (C - 11);
    ctx.fillStyle = 'rgba(10,6,26,.85)'; ctx.beginPath(); ctx.arc(rx, ry, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff5a7a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', rx, ry + .5);
    ctx.restore();
    setScreen(ctx, dpr); playerArrow(ctx, C, C, 0, C / 75);          // delante = arriba, siempre
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  window.mini = function (px, pz, th) { if (!running) return; try { drawMini(px, pz, th); } catch (e) { NC.log('minimapa', e); } };

  // ================================================================ MAPA GRANDE
  const BM = { open: false, cx: 0, cz: 0, k: .9, w: 800, h: 600, dpr: 1, filter: {}, sel: null, hover: null, q: '', side: true, drag: null, ts: 1, raf: 0, listT: 0, listSig: '' };
  const KMIN = .3, KMAX = 6;

  NC.css(`
  #nbm{position:fixed;inset:0;z-index:8;display:none;align-items:center;justify-content:center;background:rgba(6,4,16,.78);user-select:none}
  #nbm .nb-panel{display:flex;flex-direction:column;width:min(1180px,97vw);height:min(780px,93vh);background:rgba(21,13,58,.97);border:1px solid #27e6ff44;border-radius:16px;overflow:hidden;box-shadow:0 20px 80px #000}
  #nbm .nb-head{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #ffffff1c}
  #nbm .nb-head b{color:var(--cyan);letter-spacing:2px;font-size:15px}
  #nbm .nb-zone{opacity:.8;font-size:13px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #nbm button{background:#ffffff12;border:1px solid #ffffff2a;color:var(--ink);border-radius:8px;padding:5px 10px;font:inherit;font-size:13px;cursor:pointer}
  #nbm button:hover{border-color:#27e6ff99}
  #nbm .nb-body{flex:1;display:flex;min-height:0}
  #nbm .nb-side{width:262px;min-width:210px;padding:10px;overflow:auto;border-right:1px solid #ffffff1c;display:flex;flex-direction:column;gap:6px}
  #nbm .nb-side.off{display:none}
  #nbm .nb-sec{font-size:11px;letter-spacing:2px;color:var(--cyan);margin:4px 0 0}
  #nbm .nb-chips{display:flex;flex-direction:column;gap:3px}
  #nbm .nb-chip{display:flex;align-items:center;gap:8px;text-align:left;padding:3px 8px}
  #nbm .nb-chip.off{opacity:.38}
  #nbm .nb-chip i{margin-left:auto;font-style:normal;opacity:.65;font-size:12px}
  #nbm input{background:#ffffff10;border:1px solid #ffffff2a;color:var(--ink);border-radius:8px;padding:6px 9px;font:inherit;font-size:13px;outline:none}
  #nbm input:focus{border-color:#27e6ff99}
  #nbm .nb-list{display:flex;flex-direction:column;gap:2px}
  #nbm .nb-item{display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:7px;cursor:pointer;font-size:13px}
  #nbm .nb-item:hover,#nbm .nb-item.sel{background:#27e6ff1f}
  #nbm .nb-item span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #nbm .nb-item i{font-style:normal;opacity:.6;font-size:12px}
  #nbm .nb-view{position:relative;flex:1;min-width:0;overflow:hidden;background:#0d0820}
  #nbm canvas.nbc{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
  #nbm canvas.nbc.drag{cursor:grabbing}#nbm canvas.nbc.hov{cursor:pointer}
  #nbm .nb-tip{position:absolute;display:none;pointer-events:none;background:rgba(10,6,26,.92);border:1px solid #27e6ff66;border-radius:8px;padding:4px 9px;font-size:12px;white-space:nowrap;transform:translate(12px,12px)}
  #nbm .nb-tip small{display:block;opacity:.7}
  #nbm .nb-card{position:absolute;left:12px;bottom:34px;max-width:min(380px,calc(100% - 24px));background:rgba(10,6,26,.9);border:1px solid #27e6ff55;border-radius:12px;padding:9px 12px;font-size:13px;display:none}
  #nbm .nb-card{pointer-events:none}#nbm .nb-card button{pointer-events:auto}
  #nbm .nb-card b{color:var(--cyan);font-size:14px}
  #nbm .nb-card .r{display:flex;gap:8px;margin-top:6px;align-items:center;flex-wrap:wrap}
  #nbm .nb-zoom{position:absolute;right:12px;bottom:12px;display:flex;flex-direction:column;gap:6px}
  #nbm .nb-zoom button{width:34px;height:34px;padding:0;font-size:18px}
  #nbm .nb-foot{padding:6px 12px;font-size:12px;opacity:.75;border-top:1px solid #ffffff1c}
  `);

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ROOT = document.createElement('div'); ROOT.id = 'nbm';
  ROOT.innerHTML = `<div class="nb-panel">
    <div class="nb-head"><b>MAPA</b><span class="nb-zone" id="nbZone"></span>
      <button id="nbSide" title="Mostrar u ocultar lugares">☰ Lugares</button><button id="nbCenter" title="Centrar en mi posición (C)">◎ Centrar</button><button id="nbClose" title="Cerrar (M / Esc)">✕</button></div>
    <div class="nb-body">
      <div class="nb-side" id="nbSideBox"><div class="nb-sec">LEYENDA Y FILTROS</div><div class="nb-chips" id="nbLegend"></div>
        <div class="nb-sec">LUGARES</div><input id="nbQ" type="text" placeholder="Buscar lugar…" autocomplete="off" spellcheck="false"><div class="nb-list" id="nbList"></div></div>
      <div class="nb-view" id="nbView"><canvas class="nbc" id="nbc"></canvas><div class="nb-tip" id="nbTip"></div><div class="nb-card" id="nbCard"></div>
        <div class="nb-zoom"><button id="nbIn" title="Acercar (+)">+</button><button id="nbOut" title="Alejar (−)">−</button></div></div>
    </div>
    <div class="nb-foot">Arrastra: mover · Rueda o +/−: zoom · Clic: marcar destino (lugar o punto libre) · Clic derecho o X: quitar · C: centrar · M / Esc: cerrar</div></div>`;
  document.body.appendChild(ROOT);
  const $q = id => ROOT.querySelector('#' + id);
  const cvs = $q('nbc'), ctx = cvs.getContext('2d'), tip = $q('nbTip'), card = $q('nbCard'), legend = $q('nbLegend'), list = $q('nbList'), qIn = $q('nbQ'), zoneEl = $q('nbZone'), sideBox = $q('nbSideBox');

  // la rueda y el teclado dentro del mapa no deben llegar al juego (cambio de arma, atajos…)
  ROOT.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
  ['keydown', 'keyup', 'keypress'].forEach(t => qIn.addEventListener(t, e => { if (t === 'keydown' && e.code === 'Escape') { qIn.blur(); toggle(false); } e.stopPropagation(); }));

  // ---- proyección actual del mapa grande (px CSS)
  const matrix = () => Proj.north(BM.cx, BM.cz, BM.k, BM.w, BM.h);
  const worldOf = (sx, sy) => Proj.apply(Proj.invert(matrix()), sx, sy);
  const screenOf = (x, z) => Proj.apply(matrix(), x, z);

  function resize() {
    const r = cvs.getBoundingClientRect(); if (!r.width || !r.height) return;
    BM.w = r.width; BM.h = r.height; BM.dpr = DPR();
    const W = Math.round(BM.w * BM.dpr), Hh = Math.round(BM.h * BM.dpr);
    if (cvs.width !== W || cvs.height !== Hh) { cvs.width = W; cvs.height = Hh; }      // el centro (cx,cz) no cambia: los puntos no se mueven
  }
  const clampView = () => { BM.cx = Math.max(WORLD.x0, Math.min(WORLD.x1, BM.cx)); BM.cz = Math.max(WORLD.z0, Math.min(WORLD.z1, BM.cz)); };
  function zoomAt(sx, sy, factor) {
    const w0 = worldOf(sx, sy), k2 = Math.max(KMIN, Math.min(KMAX, BM.k * factor));
    BM.k = k2; BM.cx = w0[0] - (sx - BM.w / 2) / k2; BM.cz = w0[1] - (sy - BM.h / 2) / k2; clampView();   // el punto bajo el cursor no se mueve
  }
  function centerOn(x, z, k) { BM.cx = x; BM.cz = z; if (k) BM.k = Math.max(KMIN, Math.min(KMAX, k)); clampView(); }
  const centerPlayer = () => { const p = Nav.playerPos(); centerOn(p.x, p.z); };

  // ---- filtros, leyenda, lista
  const catOn = id => BM.filter[id] !== false;
  const poiList = () => Nav.pois().filter(p => catOn(p.cat));
  function nearestPOI(sx, sy, maxPx) {
    let best = null, bd = maxPx * maxPx;
    for (const p of poiList()) { const s = screenOf(p.x, p.z), d = (s[0] - sx) ** 2 + (s[1] - sy) ** 2; if (d < bd) { bd = d; best = p; } }
    return best;
  }
  function iconCanvas(cat, s) { const c = document.createElement('canvas'), d = DPR(); c.width = c.height = Math.round((s + 6) * d); c.style.width = c.style.height = (s + 6) + 'px'; const g = c.getContext('2d'); g.scale(d, d); icon(g, cat, (s + 6) / 2, (s + 6) / 2, s, false); return c; }
  function buildLegend() {
    const all = Nav.pois(), cnt = {}; all.forEach(p => cnt[p.cat] = (cnt[p.cat] || 0) + 1);
    legend.innerHTML = '';
    for (const c of Nav.CATS) {
      if (!cnt[c.id]) continue;
      const b = document.createElement('button'); b.className = 'nb-chip' + (catOn(c.id) ? '' : ' off'); b.dataset.cat = c.id;
      b.appendChild(iconCanvas(c.id, 14)); const sp = document.createElement('span'); sp.textContent = c.n; b.appendChild(sp);
      const n = document.createElement('i'); n.textContent = cnt[c.id]; b.appendChild(n);
      b.onclick = () => { BM.filter[c.id] = !catOn(c.id); buildLegend(); buildList(true); };
      legend.appendChild(b);
    }
  }
  const dstr = m => m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m';
  function buildList(force) {
    const pp = Nav.playerPos(), q = BM.q.trim().toLowerCase();
    let items = poiList().filter(p => !q || (p.name + ' ' + p.sub + ' ' + (Nav.catById[p.cat] || {}).n).toLowerCase().includes(q));
    items.forEach(p => p._d = Math.hypot(p.x - pp.x, p.z - pp.z));
    items.sort((a, b) => a._d - b._d);
    items = items.slice(0, 80);
    const sig = items.map(p => p.id).join('|') + '#' + BM.sel;
    if (!force && sig === BM.listSig) { // solo refrescar distancias
      list.querySelectorAll('.nb-item i').forEach((el, i) => { if (items[i]) el.textContent = dstr(items[i]._d); });
      return;
    }
    BM.listSig = sig;
    const st = list.scrollTop; list.innerHTML = '';
    for (const p of items) {
      const el = document.createElement('div'); el.className = 'nb-item' + (BM.sel === p.id ? ' sel' : ''); el.dataset.id = p.id;
      el.appendChild(iconCanvas(p.cat, 14)); const sp = document.createElement('span'); sp.textContent = p.name; el.appendChild(sp);
      const d = document.createElement('i'); d.textContent = dstr(p._d); el.appendChild(d);
      el.onclick = () => { selectPOI(p, false); };
      el.ondblclick = () => { selectPOI(p, true); };
      list.appendChild(el);
    }
    list.scrollTop = st;
  }

  // ---- selección y destino
  function selectPOI(p, setDestination) {
    BM.sel = p.id; centerOn(p.x, p.z);
    if (setDestination) Nav.setDest(p.x, p.z, { label: p.name, kind: 'poi', id: p.id });
    cardKey = ''; buildList(true);
  }
  function cardHTML() {
    const d = Nav.dest(), sel = Nav.pois().find(p => p.id === BM.sel);
    const i = Nav.info();
    let h = '';
    if (sel) {
      const c = Nav.catById[sel.cat] || {}, pp = Nav.playerPos(), isDest = d && d.poiId === sel.id;
      h += `<b>${esc(sel.name)}</b> <span style="opacity:.7">· ${esc(c.n)}</span><br>${sel.sub ? esc(sel.sub) + '<br>' : ''}<span style="opacity:.75">${esc(Nav.zoneName(sel.x, sel.z))} · a ${dstr(Math.hypot(sel.x - pp.x, sel.z - pp.z))}</span>`;
      h += `<div class="r">${isDest ? '<button data-a="clear">Quitar destino</button>' : '<button data-a="go">📍 Marcar destino</button>'}</div>`;
      if (isDest && i) h += `<div style="margin-top:4px;opacity:.85">Ruta: ${dstr(i.route)} · ~${Math.max(1, Math.round(i.eta))} s</div>`;
    } else if (d && i) {
      h += `<b>${esc(d.label || 'Marca')}</b><br><span style="opacity:.75">${esc(i.zone)} · en línea recta ${dstr(i.straight)}</span>`;
      h += `<div class="r"><button data-a="clear">Quitar destino</button></div>`;
      h += `<div style="margin-top:4px;opacity:.85">Ruta: ${dstr(i.route)} · ~${Math.max(1, Math.round(i.eta))} s</div>`;
    }
    return h;
  }
  let cardKey = '';
  function updateCard() {
    const h = cardHTML();
    if (h === cardKey) return; cardKey = h;
    card.innerHTML = h; card.style.display = h ? 'block' : 'none';
    card.querySelectorAll('button').forEach(b => b.onclick = () => {
      if (b.dataset.a === 'clear') { Nav.clearDest(); BM.sel = null; }
      else { const p = Nav.pois().find(q => q.id === BM.sel); if (p) Nav.setDest(p.x, p.z, { label: p.name, kind: 'poi', id: p.id }); }
      cardKey = ''; buildList(true);
    });
  }

  // ---- dibujo
  function draw() {
    resize();
    const m = matrix(), k = BM.k;
    paintTerrain(ctx, m, BM.w, BM.h, BM.dpr, k, true);
    setScreen(ctx, BM.dpr);
    // nombres de barrio (texto derecho: no hay ejes invertidos)
    if (NC.sto && NC.sto.zones) {
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${Math.round(Math.max(11, Math.min(28, 16 * k)))}px 'Arial Black', sans-serif`;
      for (const zn of NC.sto.zones) if (zn.label && zn.rect) {
        const s = screenOf(zn.rect[0] + zn.rect[2] / 2, zn.rect[1] + zn.rect[3] / 2);
        ctx.globalAlpha = .55; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,6,26,.8)'; ctx.strokeText(zn.label, s[0], s[1]);
        ctx.fillStyle = zn.ink || '#fff7ea'; ctx.fillText(zn.label, s[0], s[1]);
      }
      ctx.restore();
    }
    // jugador (debajo de iconos y destino: el destino marcado nunca queda tapado por tu propia flecha)
    const pp = Nav.playerPos(), ps = Proj.apply(m, pp.x, pp.z);
    playerArrow(ctx, ps[0], ps[1], Math.PI - Nav.playerHeading(), 1.25);
    paintOverlay(ctx, m, BM.w, BM.h, { mini: false, labels: k >= 1.25, filter: BM.filter, sel: BM.sel, hover: BM.hover });
    // rosa del norte
    ctx.save(); ctx.translate(BM.w - 34, 34); ctx.fillStyle = 'rgba(10,6,26,.8)'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill(); ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ff5a7a'; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(5, 1); ctx.lineTo(-5, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff7ea'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', 0, 10); ctx.restore();
    // escala
    let len = 500; for (const L of [20, 50, 100, 200, 500]) if (L * k >= 70) { len = L; break; }
    ctx.save(); ctx.translate(14, BM.h - 14); ctx.strokeStyle = '#fff7ea'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 0); ctx.lineTo(len * k, 0); ctx.lineTo(len * k, -4); ctx.stroke();
    ctx.fillStyle = '#fff7ea'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,6,26,.9)'; ctx.strokeText(len + ' m', 4, -6); ctx.fillText(len + ' m', 4, -6); ctx.restore();
    // cabecera: dónde estoy
    const z = Nav.zoneName(pp.x, pp.z), inf = Nav.info();
    const zt = (z ? 'Estás en ' + z : '') + (inf ? ' · destino a ' + dstr(inf.route) + ' por ruta' : '');
    if (zoneEl.textContent !== zt) zoneEl.textContent = zt;
    updateCard();
    if (performance.now() - BM.listT > 1200) { BM.listT = performance.now(); buildList(false); }
  }
  function frameLoop() { if (!BM.open) return; try { draw(); } catch (e) { NC.log('mapa grande', e); } BM.raf = requestAnimationFrame(frameLoop); }

  // ---- interacción (SOLO en el mapa grande)
  function localXY(e) { const r = cvs.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cvs.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    BM.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
    try { cvs.setPointerCapture(e.pointerId); } catch (err) { }
    tip.style.display = 'none';
  });
  cvs.addEventListener('pointermove', e => {
    const [sx, sy] = localXY(e);
    if (BM.drag && BM.drag.id === e.pointerId) {
      const dx = e.clientX - BM.drag.x, dy = e.clientY - BM.drag.y;
      if (dx || dy) { BM.drag.moved += Math.abs(dx) + Math.abs(dy); BM.drag.x = e.clientX; BM.drag.y = e.clientY; if (BM.drag.moved > 5) { cvs.classList.add('drag'); BM.cx -= dx / BM.k; BM.cz -= dy / BM.k; clampView(); } }
      return;
    }
    const p = nearestPOI(sx, sy, 13);
    BM.hover = p ? p.id : null; cvs.classList.toggle('hov', !!p);
    if (p) { const pp = Nav.playerPos(); tip.innerHTML = `<b>${esc(p.name)}</b><small>${esc((Nav.catById[p.cat] || {}).n)}${p.sub ? ' · ' + esc(p.sub) : ''} · ${dstr(Math.hypot(p.x - pp.x, p.z - pp.z))}</small>`; tip.style.left = sx + 'px'; tip.style.top = sy + 'px'; tip.style.display = 'block'; }
    else tip.style.display = 'none';
  });
  const endDrag = e => {
    if (!BM.drag || BM.drag.id !== e.pointerId) return;
    const wasClick = BM.drag.moved <= 5; BM.drag = null; cvs.classList.remove('drag');
    try { cvs.releasePointerCapture(e.pointerId); } catch (err) { }
    if (e.type === 'pointercancel' || !wasClick) return;
    const [sx, sy] = localXY(e), p = nearestPOI(sx, sy, 13);
    if (p) { BM.sel = p.id; Nav.setDest(p.x, p.z, { label: p.name, kind: 'poi', id: p.id }); }
    else { const w = worldOf(sx, sy); BM.sel = null; Nav.setDest(w[0], w[1], { label: 'Marca', kind: 'pin' }); }
    cardKey = ''; buildList(true);
  };
  cvs.addEventListener('pointerup', endDrag); cvs.addEventListener('pointercancel', endDrag);
  cvs.addEventListener('contextmenu', e => { e.preventDefault(); Nav.clearDest(); BM.sel = null; cardKey = ''; buildList(true); });
  cvs.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); const [sx, sy] = localXY(e); zoomAt(sx, sy, e.deltaY > 0 ? 1 / 1.2 : 1.2); }, { passive: false });
  $q('nbCenter').onclick = centerPlayer;
  $q('nbClose').onclick = () => toggle(false);
  $q('nbIn').onclick = () => zoomAt(BM.w / 2, BM.h / 2, 1.3);
  $q('nbOut').onclick = () => zoomAt(BM.w / 2, BM.h / 2, 1 / 1.3);
  $q('nbSide').onclick = () => { BM.side = !BM.side; sideBox.classList.toggle('off', !BM.side); setTimeout(resize, 0); };
  qIn.addEventListener('input', () => { BM.q = qIn.value; buildList(true); });
  addEventListener('resize', () => { if (BM.open) resize(); });
  // Teclado con el mapa abierto: se captura ANTES que el juego. Solo M, Esc y X (cerrar / quitar marca) llegan al juego;
  // el resto (E interactuar, F coche, T taxi, R recargar, WASD...) no actúa mientras miras el mapa.
  addEventListener('keydown', e => {
    if (!BM.open || e.target === qIn) return;
    if (e.code === 'Equal' || e.code === 'NumpadAdd') zoomAt(BM.w / 2, BM.h / 2, 1.3);
    else if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoomAt(BM.w / 2, BM.h / 2, 1 / 1.3);
    else if (e.code === 'KeyC') centerPlayer();
    if (e.code === 'KeyM' || e.code === 'Escape' || e.code === 'KeyX') return;
    e.stopImmediatePropagation();
  }, true);

  // ---- abrir / cerrar (sustituye al toggleMap original; no toca el minimapa)
  function open() {
    if (BM.open) return;
    try { if (paused || inv.open || P.dying || P.busted) return; } catch (e) { }
    try { if ((NC.dlg && NC.dlg.open) || (NC.wheel && NC.wheel.open)) return; } catch (e) { }
    mapBig = true; BM.open = true;
    try { if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock(); } catch (e) { }
    try { BM.ts = timeScale; timeScale = .02; for (const k in keys) keys[k] = 0; } catch (e) { }     // el mundo se congela mientras miras el mapa
    ROOT.style.display = 'flex';
    resize();
    BM.k = .9; BM.sel = null; BM.hover = null; BM.q = ''; qIn.value = ''; cardKey = ''; centerPlayer();
    buildLegend(); buildList(true);
    try { beep(420, .09, 'sine', .03); } catch (e) { }
    cancelAnimationFrame(BM.raf); frameLoop();
  }
  function close() {
    if (!BM.open) return;
    BM.open = false; mapBig = false; cancelAnimationFrame(BM.raf);
    ROOT.style.display = 'none'; tip.style.display = 'none';
    try { timeScale = BM.ts || 1; } catch (e) { }
    try { if (cn && cn.requestPointerLock && !inv.open && running && !paused) cn.requestPointerLock(); } catch (e) { }
  }
  function toggle(force) {
    if (!running) return;
    const want = force !== undefined ? !!force : !BM.open;
    if (want) open(); else close();
  }
  window.toggleMap = toggle;

  // si algo cierra el juego/menú con el mapa abierto, no dejar el overlay colgado
  NC.hooks.pre.push(() => { if (BM.open && (!running || P.dying || P.busted)) close(); });

  // interfaz de depuración / pruebas
  NC.Map = {
    open, close, toggle, isOpen: () => BM.open,
    state: () => ({ cx: BM.cx, cz: BM.cz, k: BM.k, w: BM.w, h: BM.h, dpr: BM.dpr }),
    matrix, worldOf, screenOf, drawMini, canvas: cvs, mini: mmEl, legendCats: () => [...legend.querySelectorAll('.nb-chip')].map(b => b.dataset.cat)
  };
  NC.log('mapas listos · minimapa fijo sin interaccion · mapa grande norte-arriba con leyenda y filtros');
})();
