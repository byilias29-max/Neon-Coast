/* Neon Coast - rueda de armas y objetos al estilo GTA V (Tab) */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const NC = window.NC;

  const WHEEL = { open: false, sel: 0, prevWeapon: 0, sectorEls: [], labs: [] };

  // categorias de la rueda: armas alrededor + objetos
  const SLOTS = [
    { id: 'punos',    n: 'Puños',    ico: '✊', type: 'arm', arm: 0 },
    { id: 'bate',     n: 'Bate',     ico: '🏏', type: 'arm', arm: 1 },
    { id: 'pistola',  n: 'Pistola',  ico: '🔫', type: 'arm', arm: 2 },
    { id: 'escopeta', n: 'Escopeta', ico: '💥', type: 'arm', arm: 3 },
    { id: 'med',      n: 'Botiquín', ico: '🩹', type: 'act', act: 'heal' },
    { id: 'spray',    n: 'Spray',    ico: '🎨', type: 'act', act: 'spray' },
  ];

  NC.css(`
    #rwheel{position:absolute;inset:0;z-index:7;display:none;background:rgba(6,4,16,.42)}
    #rwk{position:absolute;left:50%;top:50%;width:min(500px,86vw);height:min(500px,86vw);transform:translate(-50%,-50%)}
    #rwk svg{position:absolute;inset:0;width:100%;height:100%}
    #rwk .ico{position:absolute;font-size:30px;pointer-events:none;text-shadow:0 2px 8px #000}
    #rwk .lab{position:absolute;font-size:12px;font-weight:700;color:#fff7ea;pointer-events:none;text-shadow:0 1px 4px #000;white-space:nowrap;text-align:center}
    #rwk .lab i{display:block;font-size:11px;color:#ffd24a;font-style:normal;opacity:.85}
    #rwc{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;color:#fff7ea;pointer-events:none;text-shadow:0 2px 10px #000}
    #rwc b{display:block;font-size:22px;letter-spacing:1px}
    #rwc span{font-size:13px;color:#27e6ff}
  `);

  const ROOT = document.createElement('div');
  ROOT.id = 'rwheel';
  ROOT.innerHTML = `<div id="rwk"><svg viewBox="0 0 100 100" preserveAspectRatio="none"></svg><div id="rwc"></div></div>`;
  document.body.appendChild(ROOT);
  const svg = ROOT.querySelector('svg');
  const WK = ROOT.querySelector('#rwk');
  const CTR = ROOT.querySelector('#rwc');
  WHEEL.ctr = CTR;
  SLOTS.forEach((s, i) => {
    const a0 = (i / SLOTS.length) * Math.PI * 2, a1 = ((i + 1) / SLOTS.length) * Math.PI * 2;
    const pt = (r, a) => `${50 + Math.sin(a) * r},${50 - Math.cos(a) * r}`;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M50,50 L${pt(47, a0)} A47,47 0 0 1 ${pt(47, a1)} Z`);
    path.dataset.i = i;
    svg.appendChild(path);
    WHEEL.sectorEls.push(path);
    const am = (a0 + a1) / 2;
    const ico = document.createElement('div'); ico.className = 'ico'; ico.textContent = s.ico;
    ico.style.left = (50 + Math.sin(am) * 33) + '%'; ico.style.top = (50 - Math.cos(am) * 33) + '%';
    ico.style.transform = 'translate(-50%,-50%)'; WK.appendChild(ico);
    const lab = document.createElement('div'); lab.className = 'lab';
    lab.style.left = (50 + Math.sin(am) * 41) + '%'; lab.style.top = (50 - Math.cos(am) * 41) + '%';
    lab.style.transform = 'translate(-50%,-50%)'; WK.appendChild(lab);
    WHEEL.labs.push(lab);
  });

  function ammoTxt(w) {
    try {
      const mag = (P.mag && P.mag[w] != null) ? P.mag[w] : 0, res = (P.ammo && P.ammo[w] != null) ? P.ammo[w] : 0;
      return mag + ' / ' + res;
    } catch (e) { return ''; }
  }
  function slotInfo(i) {
    const s = SLOTS[i];
    let extra = '', sub = '';
    try {
      if (s.type == 'arm') {
        if (P.own[s.arm]) { extra = s.arm == 0 ? '' : ammoTxt(s.arm); sub = P.w == s.arm ? 'seleccionada' : 'escoger'; }
        else { extra = 'sin arma'; sub = 'se compra en tienda'; }
      } else if (s.act == 'heal') { extra = 'botiquines: ' + (P.med || 0); sub = 'restaura salud'; }
      else if (s.act == 'spray') { extra = 'latas: ' + (P.spray || 0); sub = 'para grafitis'; }
    } catch (e) { }
    return { extra, sub };
  }
  function draw() {
    SLOTS.forEach((s, i) => {
      const on = i == WHEEL.sel, el = WHEEL.sectorEls[i], { extra, sub } = slotInfo(i);
      const own = s.type == 'arm' ? !!P.own[s.arm] : true;
      el.setAttribute('fill', on ? 'rgba(39,230,255,.22)' : 'rgba(21,13,58,.74)');
      el.setAttribute('stroke', on ? '#27e6ff' : (own ? 'rgba(255,247,234,.22)' : 'rgba(255,247,234,.09)'));
      el.setAttribute('stroke-width', on ? '1.2' : '.5');
      const lab = WHEEL.labs[i];
      lab.innerHTML = `${s.n}${extra ? `<i>${extra}</i>` : ''}`;
      lab.style.opacity = on ? 1 : (own ? .72 : .38);
      lab.style.color = on ? '#fff' : (own ? '#fff7eacc' : '#9b93b5cc');
    });
    const s = SLOTS[WHEEL.sel];
    WHEEL.ctr.innerHTML = `<b>${s.n}</b><span>${slotInfo(WHEEL.sel).sub}</span>`;
  }
  const angleOf = (x, y) => {
    const r = WK.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    let a = Math.atan2(dx, -dy);
    if (a < 0) a += Math.PI * 2;
    return Math.min(SLOTS.length - 1, Math.floor(a / (Math.PI * 2 / SLOTS.length)));
  };
  document.addEventListener('mousemove', e => {
    if (!WHEEL.open) return;
    const s = angleOf(e.clientX, e.clientY);
    if (s != WHEEL.sel) { WHEEL.sel = s; draw(); try { beep(480 + s * 45, .035, 'triangle', .02); } catch (e2) { } }
  });
  document.addEventListener('click', e => { if (WHEEL.open) { e.stopPropagation(); pick(); } }, true);

  function pick() {
    const s = SLOTS[WHEEL.sel];
    try {
      if (s.type == 'arm') {
        if (P.own[s.arm]) { if (P.w != s.arm) selW(s.arm); toast('Equipada: ' + s.n); }
        else toast(s.n + ': sin arma — cómprala en una tienda');
      } else if (s.act == 'heal') { if ((P.med || 0) > 0) heal(); else toast('Sin botiquines'); }
      else if (s.act == 'spray') { if ((P.spray || 0) > 0) toast('Spray listo · E junto a muros verdes'); else toast('Sin spray — cómpralo en la tienda'); }
    } catch (e) { }
    close();
  }
  function close() {
    WHEEL.open = false; ROOT.style.display = 'none';
    try { timeScale = 1; } catch (e) { }
    if (running && !paused && !inv.open && !mapBig && cn && cn.requestPointerLock) { try { cn.requestPointerLock(); } catch (e) { } }
  }
  function open() {
    if (!running || paused || inv.open || mapBig || WHEEL.open) return;
    try { if (NC.dlg && NC.dlg.open) return; } catch (e) { }
    if (P.dying || P.busted) return;
    WHEEL.open = true;
    try { WHEEL.prev = P.w; } catch (e) { }
    try {
      const at = SLOTS.findIndex(s => s.type == 'arm' && s.arm == P.w);
      WHEEL.sel = at >= 0 ? at : 0;
    } catch (e) { WHEEL.sel = 0; }
    ROOT.style.display = 'block'; draw();
    try { if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock(); } catch (e) { }
    try { for (const k in keys) keys[k] = 0; } catch (e) { }
    try { timeScale = .35; } catch (e) { }   // cámara lenta estilo GTA V
    try { beep(660, .07, 'triangle', .03); } catch (e) { }
  }

  // Tab mantiene la rueda; al soltar se aplica la selección
  addEventListener('keydown', e => { if (e.code == 'Tab') { e.preventDefault(); open(); } });
  addEventListener('keyup', e => { if (e.code == 'Tab' && WHEEL.open) { e.preventDefault(); pick(); } });
  addEventListener('blur', () => { if (WHEEL.open) close(); });

  NC.wheel = WHEEL; // el nucleo puede consultarlo al perder pointer lock
  NC.log('rueda de armas lista (Tab)');
})();
