'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — arranque, precarga y bucle de fotogramas
   ============================================================ */
(function () {
  let booted = false;
  let stopped = false;
  let lastTime = 0;

  function showFatal(error) {
    stopped = true;
    const box = document.getElementById('boot-error');
    const text = document.getElementById('boot-error-text');
    const note = document.getElementById('loading-note');
    if (note) note.classList.remove('show');
    if (text) {
      text.textContent = 'El archivo se ha interrumpido. Revisa la consola del navegador y vuelve a cargar la página.';
    }
    if (box) box.hidden = false;
    console.error('[La Última Mujer]', error);
  }

  function waitForPhotos() {
    if (!LM.Photos || !LM.Photos.ready) return Promise.resolve(true);
    const ready = LM.Photos.ready().catch(function (error) {
      console.warn('[La Última Mujer] El archivo fotográfico se ha cargado parcialmente.', error);
      return false;
    });
    const timeout = new Promise(function (resolve) {
      setTimeout(function () { resolve(false); }, 5200);
    });
    return Promise.race([ready, timeout]);
  }

  function loop(now) {
    if (stopped) return;
    if (!lastTime) lastTime = now;
    const dt = Math.max(0, (now - lastTime) / 1000);
    lastTime = now;
    try {
      LM.Game.frame(dt);
    } catch (error) {
      showFatal(error);
      return;
    }
    window.requestAnimationFrame(loop);
  }

  async function boot() {
    if (booted) return;
    booted = true;
    const note = document.getElementById('loading-note');
    if (note) note.classList.add('show');
    try {
      const settings = LM.Save && LM.Save.loadSettings ? LM.Save.loadSettings() : Object.assign({}, LM.Settings);
      if (LM.Settings) Object.assign(LM.Settings, settings);
      await waitForPhotos();
      if (LM.Photos && LM.Photos.warm) LM.Photos.warm();
      LM.Game.init({ settings: settings });
      if (note) note.classList.remove('show');
      window.requestAnimationFrame(loop);
    } catch (error) {
      showFatal(error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    setTimeout(boot, 0);
  }
})();
