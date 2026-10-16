/* Neon Coast - nucleo de modulos (F:\neoncoast) */
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
    // envoltorio del paso principal: conecta los hooks de los modulos
    if (!NC.__wrapped) {
      NC.__wrapped = true;
      const _step = window.step;
      window.step = function (dt) { NC.run('pre', dt); _step(dt); NC.run('post', dt); };
    }
  } catch (e) { }
  try {
    // paso rasterizado de nitidez maxima para texturas canvas (calles/edificios)
    NC.css('#help{display:none !important}');
  } catch (e) { }
  NC.log('core listo, build', NC.version);
})();
