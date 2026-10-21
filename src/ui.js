/* Neon Coast - cursor personalizado global + deteccion centralizada de interfaces
   Un solo sistema para TODAS las pantallas: si aparece una interfaz con controles,
   el cursor neon aparece; al volver al juego, desaparece.                        */
(function () {
  'use strict';
  const NC = window.NC = window.NC || {};
  NC.hooks = NC.hooks || { pre: [], post: [] };

  NC.css(`
#ncur{position:fixed;left:0;top:0;width:0;height:0;z-index:9999;pointer-events:none;opacity:1;transition:opacity .18s ease}
#ncur .ring{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border:2px solid #27e6ff;border-radius:50%;
  box-shadow:0 0 12px #27e6ff88,inset 0 0 8px #27e6ff55;transition:transform .13s cubic-bezier(.2,.8,.2,1),border-color .13s,box-shadow .13s}
#ncur .dot{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;background:#ff5a7a;box-shadow:0 0 8px #ff5a7a;transition:transform .13s}
#ncur .tick{position:absolute;left:-2px;top:-2px;width:4px;height:4px;background:#eafcff;border-radius:1px;box-shadow:0 0 6px #27e6ff;opacity:0;transition:opacity .13s}
#ncur .t0{transform:translate(0,-25px)}#ncur .t1{transform:translate(25px,0)}#ncur .t2{transform:translate(0,25px)}#ncur .t3{transform:translate(-25px,0)}
#ncur.hov .ring{transform:scale(1.34);border-color:#ffffff;box-shadow:0 0 20px #27e6ffcc,inset 0 0 10px #27e6ff77}
#ncur.hov .dot{transform:scale(1.35)}
#ncur.hov .tick{opacity:.95}
#ncur.prs .ring{transform:scale(.7)}
#ncur.prs .dot{transform:scale(1.9)}
#ncur.off{opacity:0}
body.ncui,body.ncui *{cursor:none !important}
`);

  /* ---------- elemento del cursor ---------- */
  const cur = document.createElement('div');
  cur.id = 'ncur';
  cur.innerHTML = '<div class="ring"></div><div class="dot"></div>' +
    '<div class="tick t0"></div><div class="tick t1"></div><div class="tick t2"></div><div class="tick t3"></div>';
  (document.body || document.documentElement).appendChild(cur);
  const ring = cur.querySelector('.ring');

  /* ---------- deteccion centralizada de interfaces ---------- */
  const ROOTS = ['#start', '#pause', '#secret', '#inv', '#dlg', '#bigMap', '#busted', '#wasted',
    '#rwheel', '#shopUI', '#wheelUI', '#phone', '#msgs', '#terminal'];
  const extra = [];
  const sel = ROOTS.join(',');

  function vis(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function anyUI() {
    const list = document.querySelectorAll(sel);
    for (let i = 0; i < list.length; i++) if (vis(list[i])) return true;
    for (let i = 0; i < extra.length; i++) if (vis(extra[i])) return true;
    return false;
  }
  // el juego con raton capturado = sin cursor de interfaz
  function locked() { return !!document.pointerLockElement; }

  NC.ui = {
    roots: ROOTS,
    register(el) { if (el && extra.indexOf(el) < 0) extra.push(el); },
    active() { return anyUI(); },
    shown() { return !cur.classList.contains('off'); }
  };

  /* ---------- interaccion ---------- */
  const HIT = 'button,a,input,select,textarea,label,.row,.opt,.card,.tag,.tab,.chip,[onclick],[data-act],#nbm,#nbm canvas.nbc,#mm,#mmw';
  let mx = -999, my = -999, hov = false, prs = false, shown = false;
  function setHov(v) { if (v === hov) return; hov = v; cur.classList.toggle('hov', v); }
  function hitAt(x, y) {
    let el = document.elementFromPoint(x, y);
    if (!el) return false;
    if (el.closest) { const t = el.closest(HIT); return !!t; }
    return false;
  }
  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cur.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    if (shown && !locked()) setHov(hitAt(mx, my));
  }, { passive: true });
  window.addEventListener('mousedown', () => { if (shown) cur.classList.add('prs'); });
  window.addEventListener('mouseup', () => cur.classList.remove('prs'));
  window.addEventListener('blur', () => cur.classList.remove('prs'));
  document.addEventListener('mouseleave', () => { if (shown) cur.classList.add('off'); });
  document.addEventListener('mouseenter', () => { if (shown) cur.classList.remove('off'); });

  /* ---------- API publica ---------- */
  NC.cursor = {
    el: cur,
    show() { cur.classList.remove('off'); document.body.classList.add('ncui'); shown = true; },
    hide() { cur.classList.add('off'); document.body.classList.remove('ncui'); shown = false; },
    get visible() { return shown; },
    get hovering() { return hov; }
  };

  /* ---------- bucle de estado ---------- */
  function tick() {
    const act = anyUI() && !locked();
    if (act !== shown) {
      shown = act;
      cur.classList.toggle('off', !act);
      document.body.classList.toggle('ncui', act);
      if (!act) { setHov(false); cur.classList.remove('prs'); }
    }
    if (act) setHov(hitAt(mx, my));
  }
  NC.hooks.post.push(tick);
  (function loop() { tick(); requestAnimationFrame(loop); })();
  setTimeout(tick, 60);

  NC.log('ui: cursor global listo');
})();
