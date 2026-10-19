/* Neon Coast - pausa: menu cuidado, silencio absoluto del audio y simulacion congelada.
   Al pausar se suspende el contexto de audio (todo el sonido muere de golpe, sin tocar
   los volumenes), se bloquea el audio nuevo y se detiene la simulacion. */
(function () {
  'use strict';
  if (!window.NC) return;

  // ---------- estilo del menu ----------
  NC.css(`
  #pause{
    position:absolute;inset:0;z-index:9;display:none;align-items:center;justify-content:center;
    background:radial-gradient(1200px 760px at 50% 38%,rgba(14,10,34,.86),rgba(3,2,10,.95));
    backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:'Segoe UI',system-ui,sans-serif;
    animation:ncPauseIn .22s cubic-bezier(.2,.8,.2,1)}
  @keyframes ncPauseIn{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
  #pause .box{display:flex;align-items:stretch;gap:22px;max-width:min(900px,94vw);max-height:82vh}
  #pause .side{
    width:300px;padding:26px 22px;border-radius:18px;background:linear-gradient(165deg,rgba(21,17,44,.94),rgba(10,8,22,.97));
    border:1px solid rgba(120,200,255,.2);box-shadow:0 26px 70px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:9px}
  #pause .side .t{background:linear-gradient(90deg,#fff,#8fd8ff);-webkit-background-clip:text;background-clip:text;color:transparent}
  #pause .side h2{margin:0 0 4px;font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:#7fd4ff;font-weight:700;opacity:.85}
  #pause .side .t{margin:0 0 12px;font-size:26px;font-weight:800;letter-spacing:.02em;color:#f2f6ff;line-height:1.1}
  #pause .side button{
    display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:12px 14px;border-radius:11px;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:#dbe6ff;font-size:13.5px;font-weight:600;
    cursor:pointer;transition:background .15s,border-color .15s,transform .12s;letter-spacing:.01em}
  #pause .side button:hover{background:rgba(60,170,255,.14);border-color:rgba(120,200,255,.42);transform:translateX(3px)}
  #pause .side button.on{background:linear-gradient(90deg,rgba(45,190,255,.24),rgba(45,190,255,.06));border-color:rgba(39,230,255,.55);color:#fff}
  #pause .side button i{font-style:normal;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;
    border-radius:6px;background:rgba(255,255,255,.07);font-size:12px;color:#7fd4ff}
  #pause .side .foot{margin-top:10px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);font-size:11.5px;color:#7f8dab;line-height:1.6}
  #pause .main{
    width:min(520px,42vw);margin-left:22px;padding:26px 28px;border-radius:18px;
    background:linear-gradient(165deg,rgba(21,17,44,.94),rgba(10,8,22,.97));border:1px solid rgba(120,200,255,.2);
    box-shadow:0 26px 70px rgba(0,0,0,.6);color:#e9f0ff;max-height:78vh;overflow:auto}
  #pause .main h3{margin:0 0 14px;font-size:17px;font-weight:700;color:#fff;display:flex;align-items:center;gap:9px}
  #pause .main h3:before{content:'';width:3px;height:17px;border-radius:2px;background:linear-gradient(180deg,#27e6ff,#ff5a7a)}
  #pause .main .row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 12px;margin:4px 0;
    border-radius:9px;background:rgba(255,255,255,.035);border:1px solid transparent;font-size:13px}
  #pause .main .row:hover{background:rgba(60,170,255,.1);border-color:rgba(120,200,255,.26)}
  #pause .main .row i{font-style:normal;color:#ffd24a;font-weight:700;font-variant-numeric:tabular-nums}
  #pause .main .opt{cursor:pointer}
  #pause .main .opt:hover{background:rgba(60,170,255,.16);border-color:rgba(120,200,255,.4)}
  #pause .main .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:11px 13px;margin:5px 0}
  #pause .main input[type=range]{width:150px;accent-color:#27e6ff}
  #pause .main .seg{display:flex;gap:6px;flex-wrap:wrap}
  #pause .main .seg button{padding:6px 11px;border-radius:8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
    color:#dbe6ff;font-size:12px;cursor:pointer;transition:.14s}
  #pause .main .seg button:hover{background:rgba(60,170,255,.16)}
  #pause .main .seg button.on{background:rgba(39,230,255,.22);border-color:rgba(39,230,255,.5);color:#fff}
  #pause .main .tip{font-size:11.5px;color:#8494b4;margin-top:12px;line-height:1.6}
  #pause .main .preview{display:flex;align-items:center;justify-content:center;padding:10px 0}
  #pause .main .preview canvas{border-radius:10px;background:rgba(0,0,0,.25)}
  `);

  // ---------- silencio centralizado ----------
  const state = { muted: false, pending: false };
  function resumeNow() {
    try { if (NC.audio) NC.audio.resume(); } catch (e) { }
    try { if (typeof AC !== 'undefined' && AC && AC.state === 'suspended') AC.resume(); } catch (e) { }
  }
  function silence(on) {
    if (state.muted === on) return;
    state.muted = on;
    if (on) {
      try { if (NC.audio) NC.audio.silence(); } catch (e) { }
      try { if (typeof AC !== 'undefined' && AC && AC.state === 'running') AC.suspend(); } catch (e) { }
    } else {
      // el navegador exige un gesto del usuario para reanudar un AudioContext:
      // en cuanto el jugador toca algo, el sonido vuelve con sus volumenes
      resumeNow();
      if (!state.pending) {
        state.pending = true;
        const go = () => { resumeNow(); state.pending = false; removeEventListener('pointerdown', go); removeEventListener('keydown', go); };
        addEventListener('pointerdown', go);
        addEventListener('keydown', go);
      }
    }
  }
  // beep global: no suena nada mientras esta en pausa
  try {
    const _beep = window.beep;
    window.beep = function () { if (state.muted || (typeof paused !== 'undefined' && paused)) return; return _beep && _beep.apply(this, arguments); };
  } catch (e) { }
  // la IA de trafico tampoco avanza en pausa
  try {
    const _ai = window.updAI;
    window.updAI = function () { if (typeof paused !== 'undefined' && paused) return; return _ai && _ai.apply(this, arguments); };
  } catch (e) { }

  // ---------- enganchar la pausa ----------
  const _set = window.setPause;
  window.setPause = function (v, tab) {
    const r = _set && _set.apply(this, arguments);
    try { silence(!!v); } catch (e) { }
    return r;
  };
  // si el juego se pausa por otra via (perder el raton), tambien silencia
  try {
    const _chg = document.onpointerlockchange;
    document.onpointerlockchange = function (e) {
      const was = document.pointerLockElement;
      const r = _chg && _chg.apply(this, arguments);
      try { if (!document.pointerLockElement && started && running && !paused) silence(false); } catch (e) { }
      return r;
    };
  } catch (e) { }

  // ---------- congelar el mundo al pausar ----------
  NC.hooks.post.push(() => {
    try {
      if (typeof paused !== 'undefined' && paused) {
        // el motor ya detiene step();NOSotros frenamos lo que queda vivo
        if (typeof sk !== 'undefined') { for (const k in sk) sk[k] = 0; }
      }
    } catch (e) { }
  });

  // ---------- red de seguridad anti-softlock ----------
  // si una cinematica (o cualquier otra cosa) dejara el tiempo a 0 sin que haya ninguna
  // escena activa, el jugador se quedaria sin poder moverse: lo restauramos.
  let guard = 0;
  NC.hooks.post.push(() => {
    if ((guard++ % 30) !== 0) return;
    try {
      if (typeof timeScale === 'undefined' || timeScale !== 0) return;
      if (typeof running === 'undefined' || !running) return;
      if (typeof paused !== 'undefined' && paused) return;
      if (window.INTRO_ && INTRO_.on) return;                 // la intro congela a proposito
      if (document.body.classList.contains('ncCineOn')) return;   // una escena esta en curso
      if (window.NC && NC.cine && NC.cine.on) return;         // por si el motor expone el flag
      timeScale = 1;
    } catch (e) { }
  });

  NC.pausa = { silence, get muted() { return state.muted; } };

  // ---------- seguridad del motor de cinematicas ----------
  // si una escena termina de forma anomala, el juego no puede quedarse con timeScale = 0
  try {
    if (window.NC && NC.cine && typeof NC.cine.play === 'function') {
      // el estado publico del motor no era fiable: la clase del body si lo es
      try {
        Object.defineProperty(NC.cine, 'on', {
          configurable: true,
          get() { return document.body.classList.contains('ncCineOn'); }
        });
      } catch (e) { }
      // el motor expone su propia funcion de salto: la usamos si existe
      const _play = NC.cine.play;
      NC.cine.play = function () {
        const r = _play.apply(this, arguments);
        const chk = () => {
          try {
            if (document.body.classList.contains('ncCineOn')) return;
            if (typeof timeScale === 'number' && timeScale === 0 && typeof running !== 'undefined' && running) timeScale = 1;
          } catch (e) { }
        };
        setTimeout(chk, 150); setTimeout(chk, 800); setTimeout(chk, 1800); setTimeout(chk, 3200);
        return r;
      };
      // Escape: si hay escena, la saltamos limpiamente y devolvemos el control
      addEventListener('keydown', e => {
        try {
          if (e.code !== 'Escape') return;
          if (!document.body.classList.contains('ncCineOn')) return;
          let done = false;
          for (const k of ['skip', 'skipNow', 'end', 'finish', 'abortar']) {
            if (typeof NC.cine[k] === 'function') { NC.cine[k](true); done = true; break; }
          }
          if (!done) {
            document.body.classList.remove('ncCineOn');
            if (typeof timeScale === 'number') timeScale = 1;
          }
        } catch (e2) { }
      }, true);
    }
  } catch (e) { }

  // ---------- titulo del menu ----------
  try {
    const side = document.querySelector('#pause .side');
    if (side && !side.querySelector('.t')) {
      const t = document.createElement('div');
      t.className = 't'; t.textContent = 'NEON COAST';
      const h2 = side.querySelector('h2');
      if (h2 && h2.nextSibling) h2.parentNode.insertBefore(t, h2.nextSibling); else side.insertBefore(t, side.firstChild);
    }
  } catch (e) { }

  NC.log('pausa: menu rediseñado, audio silenciable y simulacion congelada');
})();
