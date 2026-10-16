/* Neon Coast - HUD inferior: inventario con iconos y teclas + cambio de arma con rueda del raton */
(function () {
  'use strict';
  if (!window.NC) return;
  NC.log('hud: barra inferior');

  NC.css(`
  #ncbar{position:absolute;left:50%;bottom:calc(8px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:none;gap:5px;z-index:3;user-select:none}
  #hint{bottom:calc(66px + env(safe-area-inset-bottom,0px)) !important}
  .ncslot{width:52px;height:52px;border-radius:10px;background:var(--glass);border:1px solid #ffffff26;display:flex;align-items:center;justify-content:center;font-size:23px;position:relative;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)}
  .ncslot:hover{border-color:#ffffff55}
  .ncslot.on{outline:2px solid var(--hot);background:rgba(255,90,122,.22)}
  .ncslot.dis{opacity:.32}
  .ncslot .k{position:absolute;top:2px;left:5px;font-size:10px;opacity:.72}
  .ncslot .a{position:absolute;bottom:2px;right:5px;font-size:10px;color:#ffd24a;font-weight:700}
  #ncbar .sep{width:2px;border-radius:2px;background:#ffffff1c;margin:6px 1px}
  #toast{right:14px;left:auto;top:auto;bottom:calc(76px + env(safe-area-inset-bottom,0px));max-width:300px;font-size:12px;text-align:right}
  #mis{width:210px;font-size:12px;padding:6px 10px}
  #hint{font-size:12px;padding:5px 10px}
  .nchud-hide{display:none !important}
  `);

  function slot(inner, key, ammo, extra) {
    return `<div class="ncslot" data-i="${key || ''}" ${extra || ''}><span class="k">${key != null && key !== '' ? key : ''}</span><span class="ic">${inner}</span><span class="a">${ammo || ''}</span></div>`;
  }
  document.body.insertAdjacentHTML('beforeend', `<div id="ncbar">${slot('👊', 1)}${slot('🏏', 2)}${slot('🔫', 3)}${slot('🧨', 4)}<div class="sep"></div>${slot('🩹', 'H')}${slot('🎨', '')}</div>`);
  const bar = document.getElementById('ncbar');
  bar.addEventListener('click', e => {
    if (!running || paused || P.dying || P.busted) return;
    const el = e.target.closest('.ncslot');
    if (!el) return;
    if (el.dataset.i === 'H') { try { heal(); } catch (err) { } return; }
    if (el.dataset.i === '') return; // spray: solo indicador
    const i = +el.dataset.i - 1;
    if (P.own[i]) { P.w = i; try { applyW(); } catch (err) { } }
  });

  // rueda del raton: cambiar de arma
  addEventListener('wheel', e => {
    if (!running || paused || P.busted || P.dying || P.foot !== true) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    let i = P.w;
    for (let k = 0; k < 4; k++) {
      i = (i + dir + 4) % 4;
      if (P.own[i]) { try { selW(i); } catch (err) { } break; }
    }
  }, { passive: true });

  let lastFrame = -1;
  NC.hooks.post.push(() => {
    if (frame % 10) return;
    bar.style.display = (running && !paused && started) ? 'flex' : 'none';
    // el texto largo de estado del velocimetro se oculta a pie (ya esta en los slots) para no tapar la barra
    try { document.getElementById('mode').style.display = P.foot ? 'none' : ''; } catch (e) { }
    const st = [P.w, P.own.join(''), P.ammo.join(''), P.mag[2] | 0, P.mag[3] | 0, P.med | 0, P.spray | 0, P.foot ? 1 : 0].join('|');
    if (st === lastFrame) return;
    lastFrame = st;
    const slots = bar.querySelectorAll('.ncslot');
    slots.forEach((el, idx) => {
      if (idx <= 3) {
        const i = idx;
        const on = P.w === i && P.foot;
        el.classList.toggle('on', on);
        el.classList.toggle('dis', !P.own[i]);
        const amt = W[i].am ? (P.own[i] ? ((P.mag[i] ?? 0) + '/' + (P.ammo[i] || 0)) : 'tienda') : '';
        el.querySelector('.a').textContent = amt;
      } else if (idx === 4) {
        el.classList.toggle('dis', !(P.med));
        el.querySelector('.a').textContent = P.med ? 'x' + P.med : '';
      } else if (idx === 5) {
        el.classList.toggle('dis', !P.spray);
        el.querySelector('.a').textContent = P.spray ? 'x' + P.spray : '';
      }
    });
  });

  NC.log('hud lista');
})();
