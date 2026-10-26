'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — teclado, ratón y entrada unificada
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const I = {};
  LM.Input = I;

  I.keys = Object.create(null);
  I.pressed = Object.create(null);
  I.mouse = { x: 0, y: 0, active: false, down: false, moved: false };
  I.enabled = true;
  I.canvas = null;
  I._lastMove = 0;

  const BLOCK_DEFAULT = {
    ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1,
    Space: 1, Tab: 1, KeyE: 1, KeyF: 1, KeyJ: 1, KeyI: 1,
    KeyR: 1, ControlLeft: 1, ControlRight: 1
  };

  function typingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  function down(code) {
    return !!(I.keys[code] || I.keys['Key' + code] || I.keys[code.replace(/^Key/, '')]);
  }

  I.down = down;
  I.wasPressed = code => !!I.pressed[code];
  I.consume = code => { if (code) delete I.pressed[code]; else I.pressed = Object.create(null); };
  I.endFrame = function () { I.pressed = Object.create(null); I.mouse.moved = false; };

  I.init = function (canvas) {
    I.canvas = canvas;

    document.addEventListener('keydown', function (e) {
      if (typingTarget(e.target)) return;
      if (BLOCK_DEFAULT[e.code]) e.preventDefault();
      if (!I.keys[e.code]) I.pressed[e.code] = true;
      I.keys[e.code] = true;
    }, { passive: false });

    document.addEventListener('keyup', function (e) {
      I.keys[e.code] = false;
    });

    window.addEventListener('blur', function () {
      I.clear();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) I.clear();
    });

    if (!canvas) return;
    canvas.addEventListener('pointermove', function (e) {
      const r = canvas.getBoundingClientRect();
      I.mouse.x = e.clientX - r.left;
      I.mouse.y = e.clientY - r.top;
      I.mouse.active = true;
      I.mouse.moved = true;
      I._lastMove = performance.now();
    }, { passive: true });

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button === 0 || e.pointerType !== 'mouse') {
        const r = canvas.getBoundingClientRect();
        I.mouse.x = e.clientX - r.left;
        I.mouse.y = e.clientY - r.top;
        I.mouse.active = true;
        I.mouse.down = true;
      }
    });

    window.addEventListener('pointerup', function () {
      I.mouse.down = false;
    });

    canvas.addEventListener('pointerleave', function () {
      I.mouse.active = false;
    });

    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  I.axis = function () {
    let x = 0, y = 0;
    if (I.keys.KeyA || I.keys.ArrowLeft) x -= 1;
    if (I.keys.KeyD || I.keys.ArrowRight) x += 1;
    if (I.keys.KeyW || I.keys.ArrowUp) y -= 1;
    if (I.keys.KeyS || I.keys.ArrowDown) y += 1;
    if (x && y) {
      const inv = Math.SQRT1_2;
      x *= inv; y *= inv;
    }
    return { x, y };
  };

  I.isRunning = () => !!(I.keys.ShiftLeft || I.keys.ShiftRight);
  I.isCrouching = () => !!(I.keys.ControlLeft || I.keys.ControlRight);

  I.clear = function () {
    I.keys = Object.create(null);
    I.pressed = Object.create(null);
    I.mouse.down = false;
  };

  I.setEnabled = function (on) {
    I.enabled = !!on;
    if (!on) {
      I.keys = Object.create(null);
      I.pressed = Object.create(null);
    }
  };

  // El cursor del juego se actualiza desde el bucle principal.
  I.cursor = function (x, y) {
    I.mouse.x = x;
    I.mouse.y = y;
    I.mouse.active = true;
  };
})();
