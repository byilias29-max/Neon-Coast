/* Neon Coast - tienda: escaparate con previsualizacion 3D real (modelos del juego),
   lista con vista previa al pasar el raton, precio, estado y compra verificada. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const T = THREE;

  // ---------- estilos ----------
  NC.css(`
  #shopUI{position:absolute;inset:0;z-index:9;display:none;align-items:center;justify-content:center;
    background:radial-gradient(900px 620px at 50% 40%,rgba(10,7,26,.88),rgba(4,3,12,.95));backdrop-filter:blur(6px);font-family:'Segoe UI',system-ui,sans-serif}
  #shopUI.on{display:flex}
  .shp{width:min(1020px,92vw);height:min(640px,86vh);display:grid;grid-template-columns:1.25fr .95fr;gap:0;
    background:linear-gradient(160deg,rgba(20,16,42,.96),rgba(10,8,24,.98));border:1px solid rgba(120,200,255,.22);
    border-radius:18px;box-shadow:0 30px 90px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.04) inset;overflow:hidden}
  .shpL{position:relative;display:flex;align-items:center;justify-content:center;padding:22px;
    background:radial-gradient(circle at 50% 46%,rgba(90,150,210,.20),rgba(10,8,22,0) 62%),repeating-linear-gradient(45deg,rgba(255,255,255,.015) 0 12px,rgba(255,255,255,0) 12px 24px)}
  .shpL canvas{width:100%;height:auto;border-radius:14px;box-shadow:0 18px 46px rgba(0,0,0,.55)}
  .shpL .tag{position:absolute;top:16px;left:18px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8fd8ff;opacity:.75}
  .shpL .spin{position:absolute;bottom:14px;right:18px;font-size:11px;color:#9aa6c8;opacity:.7}
  .shpR{display:flex;flex-direction:column;padding:22px 22px 18px;border-left:1px solid rgba(120,200,255,.14);background:rgba(8,6,20,.55)}
  .shpR h2{margin:0 0 2px;font-size:21px;font-weight:700;color:#f2f6ff;letter-spacing:.01em}
  .shpR .sub{font-size:12px;color:#9aa6c8;margin-bottom:14px}
  .shpPrice{font-size:26px;font-weight:800;color:#ffd24a;letter-spacing:.02em;margin:0 0 4px}
  .shpState{font-size:12px;margin-bottom:14px;color:#c8d2ea}
  .shpState.bad{color:#ff8a9a}.shpState.ok{color:#6effc0}
  .shpList{flex:1;overflow:auto;margin:0 -8px;padding:0 8px}
  .shpList::-webkit-scrollbar{width:8px}.shpList::-webkit-scrollbar-thumb{background:rgba(140,190,255,.22);border-radius:8px}
  .shpRow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;margin-bottom:5px;
    border-radius:10px;background:rgba(255,255,255,.035);border:1px solid transparent;cursor:pointer;transition:background .14s,border-color .14s,transform .14s}
  .shpRow:hover,.shpRow.sel{background:rgba(60,170,255,.14);border-color:rgba(120,200,255,.4);transform:translateX(2px)}
  .shpRow .n{font-size:13.5px;color:#e8eeff}.shpRow .p{font-size:13px;color:#ffd24a;font-weight:700;white-space:nowrap}
  .shpRow.no{opacity:.42}.shpRow.no .p{color:#ff8a9a}
  .shpBuy{margin-top:12px;padding:12px;border-radius:12px;background:linear-gradient(180deg,rgba(45,190,255,.18),rgba(45,190,255,.06));border:1px solid rgba(120,200,255,.35);
    color:#eaf6ff;font-weight:700;font-size:14px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:.15s;text-align:center}
  .shpBuy:hover{background:linear-gradient(180deg,rgba(45,190,255,.32),rgba(45,190,255,.12));box-shadow:0 0 22px rgba(60,180,255,.3)}
  .shpBuy.dis{opacity:.45;cursor:not-allowed}
  .shpFoot{margin-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#8894b4}
  .shpFoot button{background:none;border:1px solid rgba(160,200,255,.28);color:#cfe0ff;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:11.5px}
  .shpFoot button:hover{background:rgba(120,200,255,.14)}
  .shpInfo{margin-top:10px;font-size:12px;line-height:1.5;color:#aab6d4;background:rgba(255,255,255,.04);border-left:2px solid rgba(120,200,255,.35);padding:8px 10px;border-radius:0 8px 8px 0}
  `);
  document.body.insertAdjacentHTML('beforeend', `
    <div id="shopUI"><div class="shp">
      <div class="shpL"><span class="tag" id="shpTag">Vitrina</span><canvas id="shpCv" width="440" height="440"></canvas><span class="spin">gira con el raton · clic para comprar</span></div>
      <div class="shpR">
        <h2 id="shpName">—</h2><div class="sub" id="shpSub">—</div>
        <div class="shpPrice" id="shpPrice">—</div><div class="shpState" id="shpState"></div>
        <div class="shpList" id="shpList"></div>
        <div class="shpBuy" id="shpBuy">Comprar</div>
        <div class="shpInfo" id="shpInfo"></div>
        <div class="shpFoot"><span id="shpHint">Esc para salir · B para cerrar</span><button id="shpClose">Salir</button></div>
      </div>
    </div></div>`);
  const $s = id => document.getElementById(id);
  const UI = $s('shopUI');

  // ---------- renderizador de la vitrina ----------
  let rd2 = null, sc2 = null, cam2 = null, root2 = null, spin = true, cur = null;
  function preview() {
    if (rd2) return;
    const cv = $s('shpCv');
    try {
      rd2 = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      rd2.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      rd2.setSize(440, 440, false);
      rd2.outputEncoding = T.sRGBEncoding;
      rd2.toneMapping = T.ACESFilmicToneMapping; rd2.toneMappingExposure = 1.05;
      sc2 = new T.Scene();
      sc2.background = new T.Color(0x0a0a16);
      cam2 = new T.PerspectiveCamera(34, 1, .1, 60);
      cam2.position.set(0, 1.05, 3.5);
      const key = new T.DirectionalLight(0xfff0d8, 2.1); key.position.set(3, 5, 4);
      const fill = new T.DirectionalLight(0x88bbff, 1.0); fill.position.set(-4, 2, -3);
      const rim = new T.DirectionalLight(0xff7ab0, 1.2); rim.position.set(-2, 3, -5);
      const amb = new T.AmbientLight(0x5a6a90, .7);
      sc2.add(key, fill, rim, amb);
      // peana
      const base = new T.Mesh(new T.CylinderGeometry(1.5, 1.7, .18, 32), new T.MeshStandardMaterial({ color: 0x1b2030, roughness: .35, metalness: .6 }));
      base.position.y = -.12; sc2.add(base);
      const ring = new T.Mesh(new T.RingGeometry(1.6, 2.1, 40).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: 0x27e6ff, transparent: true, opacity: .35 }));
      ring.position.y = -.02; sc2.add(ring);
      root2 = new T.Group(); sc2.add(root2);
    } catch (e) { NC.log('tienda: preview', e); }
  }
  function fitModel(g, target) {
    // encuadra el objeto: escala para que su tamano mayor sea 'target' y lo centra sobre la peana
    const b = new T.Box3().setFromObject(g);
    const sz = b.getSize(new T.Vector3()), c = b.getCenter(new T.Vector3());
    const mx = Math.max(sz.x, sz.y, sz.z) || 1;
    const s = (target || 1.9) / mx;
    g.scale.setScalar(s);
    g.position.set(-c.x * s, -b.min.y * s, -c.z * s);
    return g;
  }
  function clearPreview() { if (root2) { while (root2.children.length) root2.remove(root2.children[0]); } }

  // ---------- modelos de los articulos ----------
  const M = {
    metal: new T.MeshStandardMaterial({ color: 0xb9c0cc, roughness: .3, metalness: .85 }),
    dark: new T.MeshStandardMaterial({ color: 0x2a2f3c, roughness: .45, metalness: .5 }),
    wood: new T.MeshStandardMaterial({ color: 0x7a5230, roughness: .7, metalness: .05 }),
    plastic: new T.MeshStandardMaterial({ color: 0xd8452f, roughness: .4, metalness: .1 }),
    white: new T.MeshStandardMaterial({ color: 0xf2f4f8, roughness: .35, metalness: .05 }),
    glass: new T.MeshStandardMaterial({ color: 0x9fe8ff, roughness: .05, metalness: .2, transparent: true, opacity: .6 }),
    brass: new T.MeshStandardMaterial({ color: 0xd9a441, roughness: .25, metalness: .9 }),
    green: new T.MeshStandardMaterial({ color: 0x2ee08a, roughness: .35, metalness: .2 })
  };
  const B = (w, h, d, x, y, z, m, rx, ry, rz) => {
    const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); if (rx) o.rotation.x = rx; if (ry) o.rotation.y = ry; if (rz) o.rotation.z = rz;
    return o;
  };
  const CY = (rt, rb, h, x, y, z, m, rx, rz) => {
    const o = new T.Mesh(new T.CylinderGeometry(rt, rb, h, 20), m);
    o.position.set(x, y, z); if (rx) o.rotation.x = rx; if (rz) o.rotation.z = rz; return o;
  };
  function itemModel(gi) {
    const g = new T.Group();
    switch (gi) {
      case 0: { const bat = CY(.045, .06, 1.05, 0, .55, 0, M.wood); bat.rotation.z = .35; g.add(bat, CY(.055, .055, .25, .18, 1.0, 0, M.wood)); break; }
      case 1: g.add(B(.34, .1, .06, 0, .95, 0, M.dark), B(.1, .2, .05, -.02, .83, 0, M.dark, 0, 0, -.2), CY(.02, .02, .18, .16, .95, 0, M.metal, 0, 0, PI / 2)); break;
      case 2: g.add(CY(.028, .028, .85, .18, .98, 0, M.metal, 0, 0, PI / 2), B(.4, .12, .07, -.12, .96, 0, M.dark), B(.22, .18, .08, -.3, .87, 0, M.wood, 0, 0, .25)); break;
      case 3: case 4: case 5: for (let i = 0; i < 3; i++) g.add(B(.2, .12, .12, -.22 + i * .22, .1, 0, M.green), CY(.02, .02, .1, -.22 + i * .22, .2, 0, M.brass)); break;
      case 6: case 7: g.add(B(.6, .34, .34, 0, .2, 0, M.white), B(.36, .06, .04, 0, .2, .18, M.plastic), B(.06, .3, .04, 0, .2, .18, M.plastic), B(.12, .04, .04, 0, .34, 0, M.dark)); break;
      case 8: { const v = B(.5, .62, .28, 0, .36, 0, M.dark); g.add(v, B(.46, .1, .3, 0, .52, 0, M.metal)); break; }
      case 9: g.add(CY(.14, .16, .34, 0, .2, 0, M.metal), B(.34, .1, .1, 0, .42, 0, M.metal), CY(.05, .05, .3, 0, .6, 0, M.metal)); break;
      case 10: g.add(CY(.09, .11, .34, 0, .2, 0, M.plastic), B(.14, .06, .05, 0, .4, 0, M.white)); break;
      case 11: g.add(CY(.12, .12, .26, 0, .15, 0, M.white), CY(.12, .12, .03, 0, .29, 0, M.plastic), CY(.12, .12, .03, 0, .02, 0, M.plastic)); break;
      case 12: g.add(CY(.07, .07, .18, 0, .1, 0, M.white), CY(.075, .075, .01, 0, .2, 0, M.brass)); break;
      case 13: g.add(CY(.05, .05, .22, 0, .12, 0, M.brass), B(.16, .04, .02, .1, .2, 0, M.brass), B(.05, .05, .02, .04, .12, 0, M.brass)); break;
      case 14: { const car = mkCar(0x27e6ff); car.scale.setScalar(1.5); g.add(car); g.userData.car = true; break; }
      default: g.add(B(.4, .4, .4, 0, .2, 0, M.white));
    }
    return g;
  }
  function carItemModel(gi) {
    const g = new T.Group();
    switch (gi) {
      case 0: case 1: case 2: case 3: { const col = [0xe03030, 0x27e6ff, 0x111111, 0xffd24a][gi];
        const c = mkCar(col); c.scale.setScalar(1.5); g.add(c); g.userData.car = true; break; }
      case 4: g.add(B(.5, .6, .3, 0, .35, 0, M.metal), B(.1, .62, .32, 0, .35, 0, M.dark)); break;
      case 5: { const e = new T.Group(); e.add(B(.7, .5, .6, 0, .3, 0, M.metal));
        for (let i = 0; i < 4; i++) e.add(CY(.09, .09, .5, -.3 + (i % 2) * .6, .3, -.3 + ((i / 2) | 0) * .6, M.dark, 0, PI / 2));
        g.add(e); break; }
      case 6: { const t = new T.Group(); t.add(CY(.22, .26, .3, 0, .3, 0, M.metal));
        for (let i = 0; i < 8; i++) { const bl = B(.04, .3, .12, 0, .3, 0, M.metal); bl.rotation.y = i * PI / 4; bl.position.set(Math.cos(i * PI / 4) * .18, .48, Math.sin(i * PI / 4) * .18); t.add(bl); }
        g.add(t); break; }
      case 7: g.add(CY(.16, .2, .3, 0, .2, 0, M.metal), CY(.12, .12, .5, 0, .45, 0, M.brass)); break;
    }
    return g;
  }

  // ---------- estado de la tienda ----------
  const ST = { kind: null, shop: null, list: [], sel: 0, items: [] };
  function priceOf(it) { return it.p ? it.p() : it.b; }
  function descOf(it, gi) {
    const D = [
      'Bate de aluminio ligero:ago leta una vez y el atracón se acaba.',
      'Pistola 9mm fiable. 12 balas de regalo.',
      'Escopeta recortada: corta la distancia de un vistazo.',
      'Munición de pistola: 12 cartuchos.',
      'Pack de 36 cartuchos para resistir una noche larga.',
      'Cartuchos de escopeta: 6 Pieces.',
      'Botiquín: cura 40 de salud al instante.',
      'Pack de tres botiquines para la casa y el coche.',
      'Chaleco antibalas: 100 de protección.',
      'Reparación completa del motor y la carrocería.',
      'Mejora de motor: +1 nivel de potencia (3 niveles).',
      'Pintura nueva para el coche: color a elegir.',
      'Café cubano: +25 de salud y un empujón de energía.',
      'Spray de grafiti: marca paredes y containeres.',
      'Cigarro suelto: +15 de salud (y tos).',
      'Apartamento frente al mar: tu casa en la costa.'
    ];
    return D[gi] || 'Articulo de la tienda.';
  }
  function openShop(kind) {
    const shop = kind === 'car' ? nearCarShop() : nearShop();
    if (!shop) return false;
    ST.kind = kind; ST.shop = shop; ST.sel = 0;
    ST.list = kind === 'car' ? CARSHOP.map((it, i) => ({ i, it, gi: -1 })) : shop.stock.map((gi, i) => ({ i, it: SHOP[gi], gi }));
    ST.items = ST.list.map(x => x.it);
    $s('shpTag').textContent = kind === 'car' ? (shop.name || 'Concesionario') : (shop.name || 'Tienda');
    $s('shpSub').textContent = kind === 'car' ? 'Concesionario de la costa' : (shop.type ? 'Comercio ' + shop.type : 'Comercio');
    UI.classList.add('on');
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) { }
    buildList();
    select(0);
    return true;
  }
  function buildList() {
    const l = $s('shpList');
    l.innerHTML = ST.list.map((x, k) => {
      const pr = kindPrice(x);
      const afford = money >= pr;
      return `<div class="shpRow ${afford ? '' : 'no'}" data-k="${k}"><span class="n">${x.it.n}</span><span class="p">$${pr}</span></div>`;
    }).join('');
    l.querySelectorAll('.shpRow').forEach(r => {
      const k = +r.dataset.k;
      r.addEventListener('mouseenter', () => select(k));
      r.addEventListener('click', () => { select(k); buy(); });
    });
  }
  function kindPrice(x) {
    const pr = priceOf(x.it);
    return ST.kind === 'car' ? pr : Math.round(pr * (ST.shop ? ST.shop.mult : 1));
  }
  function select(k) {
    ST.sel = k;
    const x = ST.list[k]; if (!x) return;
    const pr = kindPrice(x);
    $s('shpName').textContent = x.it.n;
    $s('shpPrice').textContent = '$' + pr;
    const st = $s('shpState');
    const owns = !x.it.f ? true : (typeof x.it.f === 'function' && x.it.f.toString().indexOf('P.own') >= 0);
    if (money < pr) { st.textContent = 'Dinero insuficiente · te faltan $' + (pr - money); st.className = 'shpState bad'; }
    else { st.textContent = 'Disponible · compra inmediata'; st.className = 'shpState ok'; }
    $s('shpInfo').textContent = descOf(x.it, x.gi);
    $s('shpBuy').textContent = money < pr ? 'Sin fondos' : 'Comprar · $' + pr;
    $s('shpBuy').classList.toggle('dis', money < pr);
    document.querySelectorAll('.shpRow').forEach(r => r.classList.toggle('sel', +r.dataset.k === k));
    // modelo 3D
    preview();
    if (rd2) {
      clearPreview();
      const m = (ST.kind === 'car') ? carItemModel(x.i) : itemModel(x.gi);
      fitModel(m, m.userData.car ? 2.6 : 1.9);
      m.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
      root2.add(m);
      root2.userData.rot = ST.kind === 'car' ? 0 : (x.gi === 14 ? 0 : 1);
    }
  }
  function buy() {
    const x = ST.list[ST.sel]; if (!x) return;
    const before = money;
    if (ST.kind === 'car') buyCarItem(x.i); else buyItem(x.i);
    if (money !== before) { buildList(); select(ST.sel); }
  }
  function closeShop() { UI.classList.remove('on'); ST.kind = null; }

  // ---------- interaccion ----------
  $s('shpClose').addEventListener('click', closeShop);
  $s('shpBuy').addEventListener('click', buy);
  UI.addEventListener('mousemove', e => {
    if (!rd2 || !root2) return;
    const r = UI.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - .5;
    root2.rotation.y += nx * .06;
    root2.rotation.x = Math.max(-.35, Math.min(.35, -ny * .25));
  });
  addEventListener('keydown', e => {
    if (!UI.classList.contains('on')) return;
    if (e.code === 'Escape' || e.code === 'KeyB') { e.preventDefault(); e.stopPropagation(); closeShop(); }
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      e.preventDefault();
      const d = e.code === 'ArrowDown' ? 1 : -1;
      select((ST.sel + d + ST.list.length) % ST.list.length);
    }
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); buy(); }
  }, true);
  // abrir con B (interceptando la tecla del juego)
  addEventListener('keydown', e => {
    if (e.code !== 'KeyB' || e.repeat) return;
    if (UI.classList.contains('on')) return;
    if (nearCarShop()) { if (openShop('car')) { e.preventDefault(); e.stopImmediatePropagation(); } }
    else if (nearShop()) { if (openShop('shop')) { e.preventDefault(); e.stopImmediatePropagation(); } }
  }, true);

  // ---------- render de la vitrina ----------
  NC.hooks.post.push(() => {
    if (!rd2 || !UI.classList.contains('on')) return;
    try {
      if (root2 && root2.userData.rot) root2.rotation.y += .0045;
      rd2.render(sc2, cam2);
    } catch (e) { }
  });
  // reubicar la camara segun el tamano del modelo
  NC.hooks.post.push(() => {
    if (!rd2 || !UI.classList.contains('on')) return;
    const m = root2 && root2.children[0];
    if (!m) return;
    m.traverse(o => { if (o.isMesh) o.geometry.computeBoundingSphere && o.geometry.computeBoundingSphere(); });
  });

  NC.tienda = { open: openShop, close: closeShop, state: ST, snap: function () {
    try { if (rd2) rd2.render(sc2, cam2); return $s('shpCv').toDataURL('image/png'); } catch (e) { return null; }
  } };
  NC.log('tienda: escaparate con previsualizacion 3D listo');
})();
