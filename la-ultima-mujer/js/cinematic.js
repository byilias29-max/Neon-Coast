'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — secuencia de apertura
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const C = {};
  LM.Cinematic = C;

  let active = false;
  let skipped = false;
  let root = null;
  let waiters = [];
  let game = null;

  function ensure() {
    root = document.getElementById('cinematic');
    if (!root) return null;
    return root;
  }

  function wait(ms) {
    return new Promise(resolve => {
      const token = { done: false, timer: null, resolve };
      token.timer = setTimeout(() => {
        token.done = true;
        const i = waiters.indexOf(token);
        if (i >= 0) waiters.splice(i, 1);
        resolve(false);
      }, Math.max(0, ms));
      waiters.push(token);
    });
  }

  C.init = function (g) {
    game = g;
    const r = ensure();
    if (!r) return;
    const skip = r.querySelector('.cine-skip');
    if (skip) {
      skip.style.pointerEvents = 'auto';
      skip.style.cursor = 'pointer';
      skip.addEventListener('click', () => C.skip());
    }
  };

  C.isActive = function () { return active; };

  C.skip = function () {
    if (!active) return;
    skipped = true;
    const list = waiters.slice();
    waiters = [];
    for (const w of list) {
      if (w.done) continue;
      w.done = true;
      clearTimeout(w.timer);
      w.resolve(true);
    }
  };

  function setText(text) {
    const node = document.getElementById('cine-text');
    if (!node) return;
    node.classList.remove('show');
    setTimeout(() => {
      node.textContent = text || '';
      node.classList.add('show');
    }, 180);
  }

  C.playIntro = async function () {
    const r = ensure();
    if (!r || active) return false;
    active = true;
    skipped = false;
    waiters = [];

    const intro = LM.Story.intro;
    const kicker = document.getElementById('cine-kicker');
    const title = document.getElementById('cine-title');
    const mark = document.getElementById('cine-mark');
    const text = document.getElementById('cine-text');
    if (kicker) kicker.textContent = intro.kicker || '';
    if (title) title.textContent = intro.title || '';
    if (mark) mark.textContent = 'PUERTO NIEBLA · ARCHIVO 07 · CAPÍTULO I';
    if (text) {
      text.classList.remove('show');
      text.textContent = '';
    }

    r.classList.remove('leaving');
    r.classList.add('active');
    r.setAttribute('aria-hidden', 'false');
    document.body.classList.add('letterboxed');
    if (LM.Audio) LM.Audio.setDucked(true);
    if (LM.FX) {
      LM.FX.flash(.07, 1200);
    }

    await wait(520);
    r.classList.add('inner-visible');
    await wait(1450);
    if (skipped) {
      r.classList.add('leaving');
      await wait(500);
      finish();
      return true;
    }

    for (let i = 0; i < intro.lines.length; i++) {
      if (skipped) break;
      const line = intro.lines[i];
      setText(line);
      const reading = Math.max(2500, Math.min(7200, 900 + line.length * 62));
      const wasSkipped = await wait(reading);
      if (wasSkipped || skipped) break;
      if (text) text.classList.remove('show');
      await wait(430);
    }

    if (skipped) {
      const skip = document.getElementById('cine-text');
      if (skip) {
        skip.textContent = intro.skip || '';
        skip.classList.add('show');
      }
      await wait(520);
    }

    r.classList.add('leaving');
    await wait(1050);
    finish();
    return skipped;
  };

  function finish() {
    const r = ensure();
    if (r) {
      r.classList.remove('active', 'inner-visible', 'leaving');
      r.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('letterboxed');
    const lb = document.getElementById('letterbox');
    if (lb) lb.classList.remove('on');
    if (LM.Audio) LM.Audio.setDucked(false);
    active = false;
    if (game) game.onIntroFinished();
  }

  C.finish = finish;
})();
