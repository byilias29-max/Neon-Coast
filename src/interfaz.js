/* Neon Coast - interfaz: sistema visual comun para HUD, menus y paneles.
   Tipografia jerarquizada, vidrios consistentes, estados de control y cursor coherente. */
(function () {
  'use strict';
  if (!window.NC) return;

  NC.css(`
  :root{
    --ink:#e9f0ff; --muted:#93a3c4; --dim:#6c7a9c;
    --cyan:#27e6ff; --hot:#ff5a7a; --gold:#ffd24a; --ok:#3dff9a;
    --pane:rgba(11,9,26,.62); --pane2:rgba(16,13,34,.78);
    --line:rgba(140,200,255,.16); --line2:rgba(140,200,255,.30);
    --sh:0 10px 34px rgba(0,0,0,.42);
    --r:12px; --r2:9px;
    --fs:12.5px; --fss:11px;
  }
  /* ---------- HUD superior ---------- */
  #top{
    position:absolute;top:14px;left:16px;display:flex;gap:10px;align-items:center;max-width:calc(100% - 200px);overflow:hidden;
    padding:9px 14px;border-radius:var(--r);background:var(--pane);border:1px solid var(--line);
    box-shadow:var(--sh);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);
    font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:var(--ink);font-size:var(--fs);
    letter-spacing:.01em;pointer-events:none}
  #top>*{display:flex;align-items:center;gap:7px}
  #top b{font-weight:700;font-variant-numeric:tabular-nums}
  #top .sep{width:1px;height:16px;background:var(--line);margin:0 3px}
  #dist{color:var(--cyan);font-weight:600;letter-spacing:.04em;text-transform:uppercase;font-size:11.5px}
  #wx{color:var(--muted)}
  #money{color:var(--gold);font-weight:700}
  #st{color:var(--gold);letter-spacing:.12em}
  #hpb,#armb{width:92px;height:5px;border-radius:3px;background:rgba(255,255,255,.10);overflow:hidden;display:block}
  #hp,#arm{height:100%;border-radius:3px;transition:width .18s ease}
  #hp{background:linear-gradient(90deg,#ff5a7a,#ff9a6a)}
  #arm{background:linear-gradient(90deg,#27e6ff,#3dff9a)}
  #top span{color:var(--muted);font-size:var(--fss);text-transform:uppercase;letter-spacing:.14em;font-weight:600}

  /* ---------- bloque de compues y objetivo ---------- */
  #comp{
    position:absolute;top:14px;left:50%;transform:translateX(-50%);width:340px;pointer-events:none;
    display:flex;flex-direction:column;align-items:center;gap:6px;
    font-family:'Segoe UI',system-ui,sans-serif;color:var(--ink)}
  #cmp{width:260px;height:34px;opacity:.92;filter:drop-shadow(0 2px 8px rgba(0,0,0,.5))}
  #obj{
    font-size:var(--fss);color:var(--muted);letter-spacing:.14em;text-transform:uppercase;font-weight:600;
    background:var(--pane);border:1px solid var(--line);border-radius:20px;padding:4px 13px;backdrop-filter:blur(8px)}
  #mis{
    font-size:12.5px;color:var(--ink);text-align:center;max-width:300px;line-height:1.5;
    background:var(--pane2);border:1px solid var(--line);border-left:2px solid var(--cyan);border-radius:var(--r2);
    padding:8px 13px;box-shadow:var(--sh);backdrop-filter:blur(9px)}
  #mis b{color:var(--cyan);font-weight:700}

  /* ---------- minimapa ---------- */
  #mmw{
    position:absolute;top:64px;right:18px;width:150px;height:150px;border-radius:50%;overflow:hidden;
    border:1px solid var(--line2);box-shadow:var(--sh),0 0 0 4px rgba(8,6,20,.35);background:#120e26;
    transition:width .25s cubic-bezier(.2,.8,.2,1),height .25s cubic-bezier(.2,.8,.2,1)}
  #mm{display:block}
  #mmw canvas{width:100%!important;height:100%!important;transition:width .25s cubic-bezier(.2,.8,.2,1),height .25s cubic-bezier(.2,.8,.2,1)}
  #wp{
    position:absolute;right:18px;top:302px;max-width:190px;text-align:right;font-size:var(--fss);color:var(--muted);
    background:var(--pane);border:1px solid var(--line);border-radius:var(--r2);padding:5px 10px;pointer-events:none;
    display:none;font-weight:600}

  /* ---------- velocimetro ---------- */
  #spd{
    position:absolute;right:18px;bottom:22px;text-align:right;font-family:'Segoe UI',system-ui,sans-serif;
    color:var(--ink);pointer-events:none;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
  #kmh{font-size:34px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1;
    text-shadow:0 3px 16px rgba(0,0,0,.6)}
  #kmh small{font-size:12px;font-weight:600;color:var(--muted);margin-left:3px}
  #drm{font-size:12px;color:var(--gold);font-weight:700;min-height:16px}
  #mode{font-size:10.5px;color:var(--dim);letter-spacing:.2em;text-transform:uppercase}

  /* ---------- pistas, avisos ---------- */
  #hint{
    position:absolute;left:50%;bottom:110px;transform:translateX(-50%);font-size:12.5px;color:var(--ink);
    background:var(--pane);border:1px solid var(--line);border-radius:20px;padding:6px 15px;pointer-events:none;
    backdrop-filter:blur(8px);box-shadow:var(--sh);white-space:nowrap}
  #toast{
    position:absolute;left:50%;bottom:170px;transform:translateX(-50%);font-size:13.5px;font-weight:600;color:var(--ink);
    background:linear-gradient(180deg,rgba(24,18,48,.92),rgba(12,9,28,.94));border:1px solid var(--line2);
    border-radius:10px;padding:9px 18px;box-shadow:var(--sh);pointer-events:none;transition:opacity .25s}
  #pop{
    position:absolute;left:50%;top:26%;transform:translateX(-50%);font-size:24px;font-weight:800;color:var(--gold);
    text-shadow:0 3px 18px rgba(0,0,0,.7);pointer-events:none;letter-spacing:.02em}
  #zone{
    position:absolute;left:50%;top:12%;transform:translateX(-50%);font-size:19px;font-weight:700;letter-spacing:.3em;
    color:#fff;text-shadow:0 3px 22px rgba(0,0,0,.8);pointer-events:none;opacity:0;transition:opacity .5s}
  #cross{position:absolute;left:50%;top:50%;width:16px;height:16px;transform:translate(-50%,-50%);opacity:.85;pointer-events:none}
  #dmg{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .25s;
    background:radial-gradient(ellipse at center,rgba(255,0,40,0) 45%,rgba(180,0,25,.55) 100%)}
  #help{
    position:absolute;left:18px;bottom:18px;font-size:11.5px;color:var(--muted);line-height:1.7;max-width:290px;
    background:var(--pane);border:1px solid var(--line);border-radius:var(--r2);padding:10px 13px;pointer-events:none;
    backdrop-filter:blur(8px);opacity:.28;transition:opacity .3s}
  #help b{color:var(--ink);font-weight:700}
  #copT{
    position:absolute;left:50%;top:78px;transform:translateX(-50%);color:#fff;font-size:13px;font-weight:800;
    letter-spacing:.16em;background:rgba(160,20,40,.55);border:1px solid rgba(255,120,140,.5);border-radius:20px;
    padding:6px 18px;pointer-events:none;box-shadow:0 0 26px rgba(255,60,90,.35)}

  /* ---------- inventario ---------- */
  #inv{
    position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,92vw);max-height:78vh;
    background:linear-gradient(165deg,rgba(19,15,40,.96),rgba(10,8,24,.98));border:1px solid var(--line2);
    border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.6);display:none;flex-direction:column;overflow:hidden;
    font-family:'Segoe UI',system-ui,sans-serif;color:var(--ink)}
  #inv.on{display:flex}
  #inv .row{
    display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 13px;margin:3px 0;border-radius:var(--r2);
    background:rgba(255,255,255,.035);border:1px solid transparent;cursor:pointer;transition:background .14s,border-color .14s}
  #inv .row:hover{background:rgba(60,170,255,.13);border-color:rgba(120,200,255,.3)}
  #inv .row i{color:var(--gold);font-style:normal;font-weight:700;font-variant-numeric:tabular-nums}
  #inv .row b{color:var(--cyan)}
  #inv h3,#inv h2{margin:0 0 6px;font-size:16px;font-weight:700}
  #inv .tab,.shpRow{cursor:pointer}

  /* ---------- menus y pantallas ---------- */
  #pause,#busted,#wasted,#secret,#bigMap{
    font-family:'Segoe UI',system-ui,sans-serif;color:var(--ink)}
  #pause .side button,#busted button,#secret button,.shpFoot button{
    background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--ink);border-radius:var(--r2);
    padding:9px 14px;cursor:pointer;font-size:12.5px;transition:.14s}
  #pause .side button:hover,#busted button:hover,.secret button:hover{
    background:rgba(60,170,255,.16);border-color:var(--line2);box-shadow:0 0 18px rgba(60,180,255,.18)}
  #pause .side button.on{background:rgba(60,170,255,.2);border-color:var(--cyan);color:#fff}
  button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
  input,select{
    background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:7px 10px;font-size:12.5px}
  #start h1{letter-spacing:.02em}
  #start .card{background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:var(--r);transition:.16s}
  #start .card:hover{background:rgba(60,170,255,.1);border-color:var(--line2);transform:translateY(-2px)}
  #start button#play{
    background:linear-gradient(180deg,rgba(45,190,255,.28),rgba(45,190,255,.1));border:1px solid rgba(120,200,255,.45);
    color:#f0fbff;border-radius:12px;padding:12px 34px;font-size:15px;font-weight:800;letter-spacing:.18em;cursor:pointer;
    text-transform:uppercase;transition:.16s;box-shadow:0 8px 26px rgba(45,160,255,.22)}
  #start button#play:hover{background:linear-gradient(180deg,rgba(45,190,255,.42),rgba(45,190,255,.18));
    box-shadow:0 10px 34px rgba(45,180,255,.34);transform:translateY(-1px)}

  /* ---------- barra inferior (hud.js) ---------- */
  #ncbar{
    font-family:'Segoe UI',system-ui,sans-serif;color:var(--ink);background:var(--pane);
    border:1px solid var(--line);border-radius:var(--r2);box-shadow:var(--sh);backdrop-filter:blur(8px)}
  #ncbar .slot{transition:background .14s,border-color .14s;border-radius:6px}
  #ncbar .slot:hover{background:rgba(60,170,255,.14)}
  `);

  // ---------- cursor personalizado en los paneles nuevos ----------
  try {
    if (window.NC && NC.ui) ['mDlg', 'mKey', 'mNote', 'gDlg'].forEach(id => {
      const el = document.getElementById(id); if (el) NC.ui.register(el);
    });
  } catch (e) { }

  // ---------- teclado: cerrar paneles con Esc ----------
  addEventListener('keydown', e => {
    if (e.code !== 'Escape') return;
    ['mKey', 'mNote', 'gDlg'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('on'); });
  });

  // ---------- accesibilidad de los botones dinamicos ----------
  try {
    const mo = new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        n.querySelectorAll && n.querySelectorAll('button,.row,.opt,.card,.tab,.chip').forEach(b => {
          if (!b.hasAttribute('tabindex') && b.tagName !== 'BUTTON') b.setAttribute('tabindex', '0');
        });
      }));
    });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch (e) { }

  NC.log('interfaz: sistema visual unificado aplicado');
})();
