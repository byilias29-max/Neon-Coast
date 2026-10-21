/* Neon Coast - nucleo de modulos */
(function () {
  'use strict';
  const NC = window.NC = {
    version: 2,
    hooks: { pre: [], post: [] },
    log(...a) { try { console.log('%cNC%c', 'background:#27e6ff;color:#150d3a;font-weight:700', 'color:#27e6ff', ...a); } catch (e) { } },
    css(s) { const e = document.createElement('style'); e.textContent = s; document.head.appendChild(e); return e; },
    run(ns, dt) {
      const h = NC.hooks[ns];
      for (let i = 0; i < h.length; i++) {
        try { h[i](dt); } catch (err) { NC.log(ns + ' hook', err); }
      }
    }
  };
  try {
    // el envoltorio del paso principal lo hace boot.js al final (ultima declaracion gana)
    NC.__wrapped = true;
  } catch (e) { }
  NC.log('core listo, build', NC.version);
})();
