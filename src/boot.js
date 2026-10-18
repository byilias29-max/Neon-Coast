/* Neon Coast - arranque final: conecta los hooks de todos los modulos al paso principal */
(function () {
  'use strict';
  const NC = window.NC;
  if (!NC || NC.__booted) return;
  NC.__booted = true;
  const _step = window.step;
  if (typeof _step === 'function') {
    window.step = function (dt) {
      NC.run('pre', dt);
      _step(dt);
      NC.run('post', dt);
    };
  }
  NC.log('hooks conectados al paso principal');
})();
