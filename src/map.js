/* Neon Coast - mapa: minimapa circular mejorado + mapa grande con zoom/pan al estilo GTA V */
(function () {
  'use strict';
  if (!window.NC) return;
  const NC = window.NC;

  let mapZ = 1;            // zoom del mapa grande (1 = centro de ciudad a la vista)
  let panX = 0, panZ = 0;  // centro del paneo en unidades del mundo
  let dragging = false, dragMoved = 0, lastMX = 0, lastMY = 0;
  let curWP = null;

  NC.css(`
    #mmw.big{border-radius:16px;background:rgba(10,6,26,.9);border:1px solid #27e6ff44}
    #mmw.big #mm{width:min(84vw,82vh);height:min(84vw,82vh);border-radius:12px;cursor:grab}
    #mmw.big{padding:8px}
    #mapInfo{position:absolute;right:18px;top:14px;z-index:9;display:none;pointer-events:none;
      background:rgba(10,6,26,.72);border:1px solid #27e6ff55;border-radius:10px;padding:9px 13px;color:#fff7ea;
      font-size:12px;max-width:300px;backdrop-filter:blur(3px)}
    #mapInfo b{color:#27e6ff;font-size:14px}
    #mapInfo .zi{opacity:.8;display:block;margin-top:3px}
  `);

  const infoEl = document.createElement('div');
  infoEl.id = 'mapInfo';
  document.body.appendChild(infoEl);

  function zoneAt(x, z) { try { if (NC.sto && NC.sto.zone) return NC.sto.zone(x, z); } catch (e) { } return null; }
  function livelyWP() { return wp; }

  // ---------- primitivas de dibujo ----------
  const dot = (ctx, x, z, r, f, o) => { ctx.beginPath(); ctx.arc(x, z, r, 0, 7); ctx.fillStyle = f; ctx.fill(); if (o) { ctx.lineWidth = 2.5; ctx.strokeStyle = o; ctx.stroke(); } };
  const sq = (ctx, x, z, w, f, o) => { ctx.fillStyle = f; ctx.fillRect(x - w / 2, z - w / 2, w, w); if (o) { ctx.lineWidth = 2.5; ctx.strokeStyle = o; ctx.strokeRect(x - w / 2, z - w / 2, w, w); } };
  const star = (ctx, x, y, r, f, o) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; const mx = x + Math.cos(a) * rr, my = y + Math.sin(a) * rr; i ? ctx.lineTo(mx, my) : ctx.moveTo(mx, my); } ctx.closePath(); ctx.fillStyle = f; ctx.fill(); if (o) { ctx.lineWidth = 2.2; ctx.strokeStyle = o; ctx.stroke(); } };
  const houseIcon = (ctx, x, z, s, f, o) => { ctx.fillStyle = f; ctx.beginPath(); ctx.moveTo(x - s * .55, z + s * .35); ctx.lineTo(x, z - s * .45); ctx.lineTo(x + s * .55, z + s * .35); ctx.closePath(); ctx.fill(); if (o) { ctx.lineWidth = 2.2; ctx.strokeStyle = o; ctx.stroke(); } ctx.fillStyle = '#efe6d8'; ctx.fillRect(x - s * .16, z, s * .32, s * .35); };
  const cross = (ctx, x, z, s, o) => { ctx.fillStyle = o || '#ff2038'; ctx.fillRect(x - s * .38, z - s * .12, s * .76, s * .24); ctx.fillRect(x - s * .12, z - s * .38, s * .24, s * .76); };

  function drawSceneTransformed(ctx, k, mini) {
    // agua y arena alrededor (ancho completo sobre el mundo dibujado)
    ctx.fillStyle = '#14506a'; ctx.fillRect(-3000, -3000, 6000, 6000);
    ctx.fillStyle = '#e8cfa0';
    ctx.fillRect(EXT, -3000, 60, 6000);            // arena este
    ctx.fillRect(-EXT - 60, -3000, 60, 6000);      // arena oeste
    ctx.fillRect(-EXT - 60, -3000, (EXT + 60) * 2, 60);
    ctx.fillRect(-EXT - 60, 3000 - 60, (EXT + 60) * 2, 60);
    // suelo urbano
    ctx.fillStyle = '#3a2762'; ctx.fillRect(-EXT - 45, -EXT - 40, (EXT + 45) * 2, (EXT + 40) * 2);
    // parque
    ctx.fillStyle = '#2f9a52'; ctx.fillRect(park.x - 28, park.z - 28, 56, 56);
    // edificios en cajas grandes
    ctx.fillStyle = '#4d3a7d';
    for (const b of boxes) {
      if (b.hw > 4.75 || b.hd > 4.75) {
        if (Math.abs(b.z) < EXT + 30 && Math.abs(b.x) < EXT + 45) ctx.fillRect(b.x - b.hw, b.z - b.hd, b.hw * 2, b.hd * 2);
      }
    }
    // calles
    ctx.strokeStyle = '#8b83ac'; ctx.lineWidth = R;
    ctx.beginPath();
    for (let i = -H; i <= H; i++) {
      ctx.moveTo(-EXT - 40, i * CELL); ctx.lineTo(EXT + 40, i * CELL);
      ctx.moveTo(i * CELL, -EXT - 40); ctx.lineTo(i * CELL, EXT + 40);
    }
    ctx.stroke();
    // contornos de barrios
    if (NC.sto && NC.sto.zones) for (const zn of NC.sto.zones) if (zn.rect) {
      ctx.strokeStyle = zn.line || 'rgba(127,107,168,.6)'; ctx.lineWidth = 3.5; ctx.setLineDash([14, 10]);
      ctx.strokeRect(zn.rect[0], zn.rect[1], zn.rect[2], zn.rect[3]); ctx.setLineDash([]);
    }
    // instituciones
    for (const q of shops) dot(ctx, q.x, q.z, 7, '#3dff9a', '#063');
    for (const q of carShops) sq(ctx, q.x, q.z, 15, '#ff8a3a', '#fff');
    for (const q of hotels) houseIcon(ctx, q.x, q.z, 15, '#fff', '#27e6ff');
    for (const d of doors) dot(ctx, d.x, d.z, 5, '#ff5aef', '#fff');
    if (window.NCH) houseIcon(ctx, NCH.x, NCH.z, 17, '#ffd24a', '#a06a00');
    cross(ctx, CLINIC.x, CLINIC.z, 12);
    for (const b of bars) dot(ctx, b.x, b.z, 7, '#ffd24a', '#632');
    dot(ctx, ball.x, ball.z, 5, '#fff', '#333');
    for (const c of cops) if (c.act) dot(ctx, c.x, c.z, 6, '#ff3030', '#fff');
    ctx.fillStyle = '#fff';
    for (const a of ai) if (!a.off) ctx.fillRect(a.g.position.x - 2.5, a.g.position.z - 2.5, 5, 5);
    // pines de la historia
    if (NC.sto && NC.sto.pins) for (const p of NC.sto.pins) {
      if (p.hide) continue;
      const pulse = p.pulse ? 13 + 4 * Math.sin(performance.now() / 350) : 0;
      if (p.type == 'star') star(ctx, p.x, p.z, 11 + pulse, p.color || '#ffd24a', '#fff');
      else if (p.type == 'dot') dot(ctx, p.x, p.z, 8, p.color || '#27e6ff', '#fff');
      else sq(ctx, p.x, p.z, 12, p.color || '#27e6ff', '#fff');
      if (p.r) { ctx.strokeStyle = (p.color || '#27e6ff') + '66'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.z, p.r, 0, 7); ctx.stroke(); }
    }
    // ruta de mision
    if (typeof tgt !== 'undefined' && typeof rtPts !== 'undefined' && tgt && tgt.on && rtPts.length) {
      ctx.strokeStyle = '#27e6ff'; ctx.lineWidth = 5;
      ctx.beginPath(); rtPts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      strokePulse(ctx, tgt.x, tgt.z);
    }
    // marca del jugador
    const px0 = P.foot ? P.fx : P.x, pz0 = P.foot ? P.fz : P.z;
    const w2 = livelyWP();
    if (w2) {
      ctx.strokeStyle = '#ff5aef'; ctx.lineWidth = 4; ctx.setLineDash([12, 9]);
      ctx.beginPath(); ctx.moveTo(px0, pz0); ctx.lineTo(w2.x, w2.z); ctx.stroke(); ctx.setLineDash([]);
      dot(ctx, w2.x, w2.z, 9, '#ff5aef', '#fff');
      ctx.fillStyle = '#ff5aef'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', w2.x, w2.z - 16);
    }
    // etiquetas de barrio solo en el mapa grande
    if (NC.sto && NC.sto.zones && mapBig) {
      const fs = Math.round(Math.max(11, Math.min(30, 9 * mapZ + 2)));
      ctx.font = `bold ${fs}px 'Arial Black', sans-serif`; ctx.textAlign = 'center';
      for (const zn of NC.sto.zones) if (zn.label && zn.rect) {
        const mx2 = zn.rect[0] + zn.rect[2] / 2, mz2 = zn.rect[1] + zn.rect[3] / 2;
        ctx.save(); ctx.globalAlpha = .2; ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
        ctx.fillText(zn.label, mx2, mz2);
        ctx.globalAlpha = .85;
        ctx.fillStyle = zn.ink || '#fff7ea';
        ctx.fillText(zn.label, mx2, mz2);
        ctx.restore();
      }
    }
  }
  function strokePulse(ctx, x, z) {
    const pr2 = 13 + 4 * Math.sin(performance.now() / 350);
    dot(ctx, x, z, 9, '#27e6ff'); ctx.lineWidth = 3; ctx.strokeStyle = '#27e6ff';
    ctx.beginPath(); ctx.arc(x, z, pr2, 0, 7); ctx.stroke();
  }

  function drawWorld(S, C, st) {
    const k = st.k;
    mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, S, S);
    mg.fillStyle = '#241a45'; mg.fillRect(0, 0, S, S);
    mg.save();
    mg.beginPath();
    if (st.mode == 'mini') mg.arc(C, C, C - 2, 0, 7);
    else mg.rect(1, 1, S - 2, S - 2);
    mg.clip();
    if (st.mode == 'mini') {
      const c = Math.cos(st.th), n = Math.sin(st.th), px0 = P.foot ? P.fx : P.x, pz0 = P.foot ? P.fz : P.z;
      mg.setTransform(-c * k, -n * k, n * k, -c * k, C, C); mg.translate(-px0, -pz0);
    } else {
      mg.setTransform(k, 0, 0, -k, C - panX * k, C + panZ * k);
    }
    drawSceneTransformed(mg, k, st.mode == 'mini');
    mg.restore();
    // flecha del jugador
    mg.setTransform(1, 0, 0, 1, C, C);
    if (st.mode == 'big') mg.rotate((P.foot ? -cam.yaw : P.th) + Math.PI);
    else mg.rotate(Math.PI);
    const ar = st.mode == 'big' ? 1.3 : C / 75;
    mg.lineWidth = 2.5; mg.strokeStyle = '#fff'; mg.fillStyle = '#27c0ff';
    mg.beginPath(); mg.moveTo(0, -11 * ar); mg.lineTo(7 * ar, 8 * ar); mg.lineTo(-7 * ar, 8 * ar); mg.closePath(); mg.fill(); mg.stroke();
    mg.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ---------- mini() reemplazado ----------
  window.mini = function (px2, pz2, th) {
    if (!running) return;
    const S = mg.canvas.width, C = S / 2;
    if (mapBig) drawWorld(S, C, { mode: 'big', th: 0, k: .5 * mapZ });
    else drawWorld(S, C, { mode: 'mini', th: th, k: .5 });
  };

  // ---------- interacción con el mapa grande ----------
  function pxToWorld(e) {
    const mmel = $('mm'), r = mmel.getBoundingClientRect(), S = mmel.width, C = S / 2, k = .5 * mapZ;
    const mx = (e.clientX - r.left) * (S / r.width) - C, my = (e.clientY - r.top) * (S / r.height) - C;
    return { x: (mx / k) + panX, z: (my / k) + panZ };
  }
  $('mm').addEventListener('click', e => {
    if (!mapBig || !running) return;
    if (dragMoved > 6) { // era arrastre: devolver la marca
      const w3 = curWP;
      if (w3) { wp = w3; wpBeacon.position.set(wp.x, 30, wp.z); wpBeacon.visible = true; }
      dragMoved = 0; return;
    }
    const w2 = pxToWorld(e);
    curWP = { x: w2.x, z: w2.z };
    wp = curWP; wpBeacon.position.set(wp.x, 30, wp.z); wpBeacon.visible = true;
    try { beep(700, .08); } catch (err) { }
    $('wp').style.display = 'block';
    const zn = zoneAt(wp.x, wp.z);
    infoEl.style.display = 'block';
    infoEl.innerHTML = `<b>Marca puesta${zn ? ' · ' + zn : ''}</b><span class="zi">${wp.x.toFixed(0)}, ${wp.z.toFixed(0)}</span><span class="zi">M cerrar · X borrarla</span>`;
  });
  $('mm').addEventListener('mousedown', e => {
    if (mapBig && running) { dragging = true; dragMoved = 0; lastMX = e.clientX; lastMY = e.clientY; infoEl.style.display = 'none'; e.preventDefault(); }
  });
  $('mm').addEventListener('mousemove', e => {
    if (dragging && mapBig && running) {
      const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
      if (dx || dy) {
        lastMX = e.clientX; lastMY = e.clientY; dragMoved += Math.abs(dx) + Math.abs(dy);
        const k = .5 * mapZ; panX -= dx / k; panZ += dy / k;
        panX = Math.max(-2600, Math.min(2600, panX)); panZ = Math.max(-2600, Math.min(2600, panZ));
      }
    }
  });
  addEventListener('mouseup', () => { dragging = false; });
  $('mm').addEventListener('wheel', e => {
    if (!mapBig || !running) return;
    e.preventDefault();
    const bef = pxToWorld(e);
    mapZ = Math.max(.4, Math.min(4.2, mapZ * (e.deltaY > 0 ? .82 : 1.22)));
    const mmel = $('mm'), r = mmel.getBoundingClientRect(), S = mmel.width;
    const mk = (e.clientX - r.left) * (S / r.width) - S / 2;
    const myc = (e.clientY - r.top) * (S / r.height) - S / 2;
    panX = bef.x - mk / (.5 * mapZ);
    panZ = bef.z + myc / (.5 * mapZ);
    dragMoved = 0;
  }, { passive: false });

  // ---------- toggleMap en versiión de módulo ----------
  function syncInfo() {
    if (!mapBig) { infoEl.style.display = 'none'; return; }
    const px2 = P.foot ? P.fx : P.x, pz2 = P.foot ? P.fz : P.z;
    let zn = null; try { zn = zoneAt(px2, pz2); } catch (err) { }
    infoEl.style.display = 'block';
    infoEl.innerHTML = `<b>${zn || 'Neon Coast'}</b><span class="zi">Rueda: zoom ${mapZ.toFixed(1)}x · Arrastrar: mover</span><span class="zi">Clic: marcar · M/Esc: cerrar · X borrar marca</span>`;
  }

  const oldTg = window.toggleMap;
  window.toggleMap = function (force) {
    if (!running) return;
    try { if (NC.dlg && NC.dlg.open) return; } catch (err) { }
    mapBig = force !== undefined ? force : !mapBig;
    const mmel = $('mm');
    mmel.width = mmel.height = mapBig ? 720 : 150;
    $('mmw').classList.toggle('big', mapBig);
    if (mapBig) {
      mapZ = 1.6;
      panX = P.foot ? P.fx : P.x; panZ = P.foot ? P.fz : P.z;
      if (document.exitPointerLock) document.exitPointerLock();
      try { beep(420, .09, 'sine', .03); } catch (err) { }
      syncInfo();
    } else {
      if (cn && cn.requestPointerLock && !inv.open) { try { cn.requestPointerLock(); } catch (err) { } }
      syncInfo();
    }
  };

  try {
    NC.hooks.post.push(() => { if (mapBig && (typeof frame !== 'undefined') && frame % 20 == 0) syncInfo(); });
  } catch (err) { }

  NC.log('mapa listo · mapa grande con zoom/pan');
})();
