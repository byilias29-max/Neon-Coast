/* Neon Coast - misiones: cinemática de llegada + recogida/entrega con la tecla E */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  NC.log('missions: puerta E + cinematica');

  let eAt = 0, cine = null;

  addEventListener('keydown', e => { if (e.code === 'KeyE') eAt = performance.now(); });

  NC.css(`
  #ncE{position:absolute;left:50%;top:64%;transform:translateX(-50%);width:56px;height:56px;border-radius:14px;background:var(--glass);border:2px solid var(--cyan);color:var(--cyan);font-weight:900;font-size:22px;display:none;align-items:center;justify-content:center;box-shadow:0 0 22px #27e6ff55;z-index:4;pointer-events:none}
  #ncE b{animation:ncpulse 1s infinite}
  @keyframes ncpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
  #nccut{position:absolute;inset:0;display:none;pointer-events:none;z-index:6}
  #nccut .bar{position:absolute;left:0;right:0;height:0;background:#05030f;transition:height .45s ease}
  #nccut .tb{top:0}#nccut .bb{bottom:0}
  #nccut .vig{position:absolute;inset:0;box-shadow:inset 0 0 180px rgba(4,2,10,.75);opacity:0;transition:opacity .45s}
  #nccut.on .bar{height:11vh}
  #nccut.on .vig{opacity:1}
  `);
  document.body.insertAdjacentHTML('beforeend', '<div id="ncE"><b>E</b></div><div id="nccut"><div class="bar tb"></div><div class="bar bb"></div><div class="vig"></div></div>');

  function playCine(fn, dur) {
    if (cine) { if (fn) fn(); return; }
    const el = document.getElementById('nccut');
    cine = true;
    el.style.display = 'block';
    requestAnimationFrame(() => el.classList.add('on'));
    const old = timeScale;
    timeScale = .38;
    try { beep(220, .5, 'sine', .02); } catch (e) { }
    setTimeout(() => {
      try { [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, .09), i * 90)); } catch (e) { }
    }, 250);
    setTimeout(() => {
      el.classList.remove('on');
      setTimeout(() => {
        el.style.display = 'none';
        timeScale = old;
        cine = null;
        if (fn) fn();
      }, 420);
    }, dur || 1500);
  }
  NC.cine = playCine;
  window.NCCine = playCine;

  // gate: envuelve advance()
  const _adv = window.advance;
  if (typeof _adv === 'function') {
    window.advance = function () {
      if (cine) return; // ya avanza al terminar la cinematica
      let ms = null;
      try { ms = curM().s[mis.s]; } catch (e) { }
      if (ms && ms.g) {
        const needE = /^(Recoge|Entrega)/.test(ms.t || '');
        if (needE) {
          const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
          if (Math.hypot(tgt.x - px, tgt.z - pz) > 9) { _adv(); return; }
          if (performance.now() - eAt > 330) return; // espera la E
          // E presionada: cinemática y luego avanzar
          playCine(() => { try { _adv(); } catch (e) { } }, 1500);
          eAt = 0;
          return;
        }
        playCine(() => { try { _adv(); } catch (e) { } }, 900); // llegada breve a checkpoints/visitas
        return;
      }
      return _adv();
    };
  }

  // marcador [E] cerca del objetivo
  NC.hooks.post.push(() => {
    const el = document.getElementById('ncE');
    if (!el) return;
    let show = false;
    try {
      if (running && curM().s[mis.s] && curM().s[mis.s].g && tgt.on) {
        const ms = curM().s[mis.s];
        const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z;
        show = /^(Recoge|Entrega)/.test(ms.t || '') && Math.hypot(tgt.x - px, tgt.z - pz) < 9;
      }
    } catch (e) { }
    el.style.display = show ? 'flex' : 'none';
  });

  NC.log('misiones: E para recoger/entregar + cinemática de llegada');
})();
