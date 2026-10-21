/* Neon Coast - vidas: historias personales, relaciones que evolucionan y rutinas
   de los personajes importantes. Se apoya en el estado de la historia (S.rel / S.flags),
   en el sistema de dialogo (dlgShow) y en las rutinas de los actores (CAST[i].at()),
   sin crear un sistema paralelo ni duplicar lo que ya funciona. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const NC = window.NC;

  // ============================================================ 1. fichas de personaje
  const VIDA = {
    marcos: {
      n: 'Marcos', rol: 'dueño del kiosco', edad: 47,
      voz: 'rápida, de barrio, con hambre de sermonear',
      deseo: 'que el kiosco aguante hasta el invierno',
      miedo: 'perder el kiosco que heredó de su padre',
      secreto: 'está debiendo dinero a quien le vendía los recién llegados',
      aspecto: { sh: 0xd9a441, pa: 0x4a3322, ha: 0x3c2b1e, hat: 2 },
      rutina: [
        { de: .22, a: .62, en: 'kiosco' },
        { de: .62, a: .88, en: 'bar' },
        { de: .88, a: 1, en: 'kiosco' },
        { de: 0, a: .22, en: 'puerto' }
      ],
      lineas: {
        primera: 'Otra vez por aqui. Mira, te voy a ser sincero: no me sobra el tiempo, pero me sobra el trabajo. Si me das una mano, yo te echo un cable.',
        normal: 'El kiosco esta abierto. Si tengo un rato te pongo un cafe, que te veo con mala cara.',
        gracias: 'Como me ayudes con esto, te lo recuerdo. De verdad.',
        desconfia: 'Vaya, el de siempre apareciendo cuando ya no queda nada que repartir.',
        tarde: 'Llegas tarde, eh. He cerrado el cajon de las cuentas.'
      }
    },
    aurora: {
      n: 'Aurora', rol: 'tu hermana', edad: 24,
      voz: 'rápida y nerviosa, se ríe para tapar lo que no dice',
      deseo: 'que no te metas en problemas por su causa',
      miedo: 'que discovers en que anda',
      secreto: 'trabaja de noche en un sitio que no quiere que sepas',
      aspecto: { sh: 0xffd24a, pa: 0x6a3a22, ha: 0x6b4a32, hat: 0 },
      rutina: [
        { de: .25, a: .58, en: 'casa' },
        { de: .58, a: .8, en: 'puerto' },
        { de: .8, a: 1, en: 'casa' }
      ],
      lineas: {
        primera: 'Hola. Estoy bien, de verdad. Solo... ultimamente no duermo bien. No me preguntes por que.',
        normal: 'Has comido? Se te nota. Tia, en serio.',
        gracias: 'Gracias, de verdad. Se me caia una encima.',
        desconfia: 'No se, hoy no me apetece. En otro momento.'
      }
    },
    elena: {
      n: 'Elena', rol: 'dueña del Club Neón', edad: 38,
      voz: 'cálida, calculadora, siempre con una copa en la mano',
      deseo: 'que el Club vuelva a ser lo que fue',
      miedo: 'que la deuda del local la termine cerrando',
      secreto: 'el Club no da tanto dinero: lo sostiene un acuerdo que no explica',
      aspecto: { sh: 0xff5a7a, pa: 0x2a1a3a, ha: 0x1a1a24, hat: 0 },
      rutina: [{ de: .0, a: 1, en: 'club' }],
      lineas: {
        primera: 'Entra, entra. No te asomes a la calle a estas horas, que la costa tiene mala fama. Bueno, tu me entiendes. En serio, deja de mirarme asi y dime que buscas.',
        normal: 'Te pongo algo? Y no, no acepto consejos.',
        gracias: 'Mira, no te hago esperar: me has ahorrado una noche larga. Te lo agradesco.',
        desconfia: 'Con lo que se dice por ahi, prefiero no hablar contigo. De momento.'
      }
    },
    vera: {
      n: 'Vera', rol: 'médica de la clínica', edad: 52,
      voz: 'clara y severa, sin adornos',
      deseo: 'que nadie de los que ve cada noche repita la misma historia',
      miedo: 'que la clínica cierre por falta de personal',
      secreto: 'atiende a escondidas a quien no puede pagar y no puede decírselo a nadie',
      aspecto: { sh: 0xd8e6ee, pa: 0x9aa7b8, ha: 0x8a4a1a, hat: 0 },
      rutina: [{ de: .05, a: .95, en: 'clinica' }],
      lineas: {
        primera: 'Diga. Y no me diga que solo es una gripa si viene a las tres de la mañana.',
        normal: 'Tenga, beba agua. Necesita dormir mas de lo que necesita todo lo demás.',
        gracias: 'Ha hecho bien en avisar. De verdad.',
        desconfia: 'Ahora no puedo atenderle. Vuelva manana.'
      }
    },
    alcaide: {
      n: 'Sgto. Alcaide', rol: 'sargento del puerto', edad: 45,
      voz: 'secas, de hombre con las manos atadas por el protocolo',
      deseo: 'que el puerto deje de ser un sitio sin control',
      miedo: 'que le remuevan el turno por丢丢ar de más',
      secreto: 'sabe más de lo que cuenta de aquella noche en la nave',
      aspecto: { sh: 0x1e3a8a, pa: 0x172554, ha: 0x555555, hat: 1 },
      rutina: [{ de: 0, a: 1, en: 'puerto' }],
      lineas: {
        primera: 'Tú otra vez. Escucha, no quiero problemas y traes cara de traermelos. Habla claro y nos entendimos bien.',
        normal: 'Aqui no ha pasado nada. Y mientras no pase, mejor.',
        gracias: 'Has hecho bien. No lo repitas muy alto.',
        desconfia: 'Apártate. Y no me mires así.'
      }
    },
    ficha: {
      n: 'Ficha', rol: 'cobra deudas del puerto', edad: 33,
      voz: 'cariño y afilada, como quien cobra de verdad',
      deseo: 'saldar la deuda de su hermano',
      miedo: 'que su hermano acabe en la DPC',
      secreto: 'debe dinero a gente que no perdona',
      aspecto: { sh: 0x2e2e2e, pa: 0x14141e, ha: 0x140d0b, hat: 0 },
      rutina: [{ de: 0, a: 1, en: 'puerto' }],
      lineas: {
        primera: 'Eh, eh, tranquilo. Yo solo paso por aqui. Tu cara no es de las que yo olvido... Mira, ¿necesitas algo o vamos?',
        normal: 'Dime que vienes a pagar, y me dices a quien le debes.',
        gracias: 'Mira, eso si es un detalle. Se te nota cuando quieres mucho a alguien.',
        desconfia: 'No. Ni hablar. Tu nombre me suena, y no me gusta.'
      }
    },
    // secundarios con vida propia
    rita: {
      n: 'Rita Vidal', rol: 'informante de Colina', edad: 41,
      voz: 'baja, prudente, habla mirando al mar',
      deseo: 'salir del puerto con su hermano',
      miedo: 'que la gente que la busca la encuentre por fin',
      secreto: 'trabaja para dos personas a la vez',
      aspecto: { sh: 0x2f6f8a, pa: 0x2a2a36, ha: 0x3a2418, hat: 0 },
      rutina: [{ de: .1, a: .95, en: 'puerto' }],
      lineas: {
        primera: 'No te acerques mucho. Hablo bajo y tu haces lo mismo. ¿Sabes algo de una caja?',
        normal: 'Aqui todo se compra y todo se vende. Yo solo miro.',
        gracias: 'Te lo he dicho porque me fío de ti. No abuses.'
      }
    },
    mecanico: {
      n: 'Toni', rol: 'mecánico del Taller Nitro', edad: 36,
      voz: 'gruesa, irónica, con las manos siempre sucias',
      deseo: 'que el taller no cierre en Mayo',
      miedo: 'dejar a medias a su socio, que lleva años con el taller',
      secreto: 'tiene una deuda con el que le vendio el local',
      aspecto: { sh: 0xff8a3a, pa: 0x2a2a2a, ha: 0x1a1a1a, hat: 3 },
      rutina: [{ de: .25, a: .75, en: 'taller' }],
      lineas: {
        primera: 'Si vienes a decirme que se ha roto otra vez, te cobro la consulta. Y luego lo miro, porque no te lo cobro igual.',
        normal: 'Dame la llave, mira el motor y no toques el cable de la batería.',
        gracias: 'Venga, un café lo pagas tú. Que hoy he tenido un dia de mil.'
      }
    },
    farmaceutica: {
      n: 'Luz', rol: 'farmacéutica', edad: 29,
      voz: 'clara, profesional, un punto tensa',
      deseo: 'que la farmacia del barrio no cierre',
      miedo: 'que la deuda de la farmacia crezca sin que nadie la vea',
      secreto: 'vende sin receta lo que le piden en el barrio',
      aspecto: { sh: 0x3dff9a, pa: 0x223344, ha: 0x6b4a32, hat: 0 },
      rutina: [{ de: .2, a: .7, en: 'tienda' }],
      lineas: {
        primera: 'Diga. Y si es para la receta, la tiene a mano, por favor.',
        normal: '¿Toma usted algo? Le va a venir bien, le Sentirá mejor.',
        gracias: 'Se lo agradezco. De verdad.'
      }
    }
  };

  // el estado de la historia vive dentro de su modulo: se accede por la via que expone
  function estado() {
    try {
      if (window.NC && NC.sto && NC.sto.debug && typeof NC.sto.debug.S === 'function') return NC.sto.debug.S();
    } catch (e) { }
    try { if (typeof S !== 'undefined') return S; } catch (e) { }
    return null;
  }
  function capitulo() { const s = estado(); return s && typeof s.ch === 'number' ? s.ch : 0; }

  // ============================================================ 2. estado de relacion (sobre S.rel del juego)
  function rel(id) {
    try {
      const s = estado();
      if (!s) return { conf: 0, visto: 0, ultima: '', memoria: [] };
      if (!s.rel) s.rel = {};
      if (!s.rel[id]) s.rel[id] = { conf: 0, visto: 0, ultima: '', memoria: [] };
      return s.rel[id];
    } catch (e) { return { conf: 0, visto: 0, ultima: '', memoria: [] }; }
  }
  function guardar() {
    // la historia guarda S en localStorage; se fuerza el guardado si el juego lo expone
    try {
      if (window.NC && NC.sto && NC.sto.debug && typeof NC.sto.debug.save === 'function') NC.sto.debug.save(true);
      else if (typeof saveStory === 'function') saveStory(true);
    } catch (e) { }
  }
  function confianza(id, delta) {
    const r = rel(id);
    r.conf = Math.max(0, Math.min(5, r.conf + delta));
    guardar();
    return r.conf;
  }
  function recuerda(id, ev) {
    const r = rel(id);
    if (r.memoria.indexOf(ev) < 0) { r.memoria.push(ev); r.ultima = ev; }
    guardar();
  }
  function linePara(id) {
    const v = VIDA[id]; if (!v) return '';
    const r = rel(id);
    const L = v.lineas || {};
    if (r.visto === 0 && L.primera) { r.visto = 1; return L.primera; }
    if (r.memoria.indexOf('traicion') >= 0 && L.desconfia) return L.desconfia;
    if (r.conf >= 3 && L.gracias) return L.gracias;
    if (r.ultima === 'tarde' && L.tarde) return L.tarde;
    return L.normal || '';
  }

  // ============================================================ 3. rutina de los actores
  function sitio(id, fase) {
    const v = VIDA[id]; if (!v) return null;
    const r = v.rutina.find(x => fase >= x.de && fase < x.a) || v.rutina[0];
    try {
      switch (r.en) {
        case 'kiosco': {                       // el kiosco de Fleming Sur: el comercio mas al sur
          let best = null, bd = 1e9;
          for (const s2 of shops) { const d = Math.hypot(s2.x, s2.z - 266); if (s2.z > 200 && d < bd) { bd = d; best = s2; } }
          return best ? { x: best.x + 2.3, z: best.z - 0.5 } : { x: 38, z: 267 };
        }
        case 'bar': { const b = bars && bars[0]; return b ? { x: b.x + 2.4, z: b.z + 2.8 } : null; }
        case 'club': { return { x: EXT + 30 - 4, z: -150 + 4 }; }
        case 'clinica': { return typeof CLINIC !== 'undefined' ? { x: CLINIC.x + 1.6, z: CLINIC.z + 2.4 } : null; }
        case 'puerto': { return { x: -228 + 2, z: -306 + 2 }; }
        case 'casa': { return { x: EXT + 30 + 2.4, z: 150 + 2.6 }; }
        case 'taller': { const t = carShops && carShops[0]; return t ? { x: t.x - 4, z: t.z + 3 } : null; }
        case 'tienda': { const s = shops && shops[0]; return s ? { x: s.x + 1.6, z: s.z - 1.8 } : null; }
      }
    } catch (e) { }
    return null;
  }
  function faseDia() {
    try { return (WX.t + .5) % 1; } catch (e) { return .5; }
  }
  // rutina: cada actor elige donde estar segun la hora, pero SIEMPRE esta en su sitio
  // cuando el jugador tiene una mision con el (para que no se escape de la historia)
  function aplicarRutinas() {
    try {
      const cast = (window.NC && NC.sto && NC.sto.cast) ? NC.sto.cast : (window.CAST || []);
      if (!cast.length) return;
      const f = faseDia();
      for (const c of cast) {
        const v = VIDA[c.id]; if (!v) continue;
        const destino = sitio(c.id, f);
        if (!destino) continue;
        // si el capitulo actual depende de el, se queda en su sitio de historia
        let fijo = false;
        try { if (capitulo() <= 1 && c.id === 'marcos') fijo = true; } catch (e) { }
        if (fijo) continue;
        c._sitio = destino;
        const at = c.at;
        c.at = function () { return this._sitio || at.call(this); };
      }
    } catch (e) { }
  }

  // ============================================================ 4. dialogo contextual
  // se engancha al dlgShow del juego: la linea personal se anade al dialogo ya existente
  try {
    const _dlg = window.dlgShow;
    if (typeof _dlg === 'function') {
      window.dlgShow = function (c, node, sub) {
        const r = _dlg.apply(this, arguments);
        try {
          const id = (c && c.id) || '';
          const extra = linePara(id);
          if (extra) {
            const box = document.getElementById('dlg');
            if (box) {
              const p = document.createElement('div');
              p.className = 'vidaLine';
              p.style.cssText = 'margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.14);font-style:italic;opacity:.92;line-height:1.5';
              p.textContent = extra;
              const cont = box.querySelector('#dlgTxt') || box.querySelector('p') || box;
              cont.appendChild(p);
            }
          }
        } catch (e) { }
        return r;
      };
    }
  } catch (e) { }

  // ============================================================ 5.umericos: primera vez que te ve
  try {
    const _int = window.interact;
    window.interact = function () {
      const antes = capitulo();
      const r = _int && _int.apply(this, arguments);
      try {
        const ahora = capitulo();
        if (ahora > antes) {
          // el capitolo avanza: se recordan los acontecimientos relevantes
          const cast2 = (window.NC && NC.sto && NC.sto.cast) ? NC.sto.cast : (window.CAST || []);
          for (const c of cast2) if (c && c.id) { rel(c.id).visto = Math.max(1, rel(c.id).visto); }
          if (ahora === 2) { confianza('marcos', 1); recuerda('marcos', 'encargos'); }
          if (ahora === 4) { confianza('marcos', 1); recuerda('marcos', 'pago'); }
        }
      } catch (e) { }
      return r;
    };
  } catch (e) { }

  // ============================================================ 6. aspecto propio de cada personaje
  try {
    const cast3 = (window.NC && NC.sto && NC.sto.cast) ? NC.sto.cast : (window.CAST || []);
    for (const c of cast3) {
      const v = VIDA[c.id]; if (!v || !v.aspecto) continue;
      if (!v.aspecto.__hecho) {
        c.sh = v.aspecto.sh; c.pa = v.aspecto.pa; c.ha = v.aspecto.ha; c.hat = v.aspecto.hat;
        v.aspecto.__hecho = true;
      }
    }
  } catch (e) { }

  // ============================================================ 7. ciclo
  NC.hooks.post.push(() => {
    try {
      if (!window.__vidasInit) {
        window.__vidasInit = true;
        try { aplicarRutinas(); } catch (e) { }
        NC.log('vidas: ' + Object.keys(VIDA).length + ' personajes con historia, relacion y rutina');
      }
    } catch (e) { }
  });

  // la linea personal del dialogue va en su propio hook (aislado de las rutinas)
  function inyectarLinea() {
    try {
      const dlg = document.getElementById('dlg');
      if (!dlg) return;
      const txt = dlg.textContent || '';
      if (txt.trim().length < 12) { window.__vidaCache = null; return; }
      if (dlg.querySelector('.vidaLine')) return;
      let who = null;
      for (const id in VIDA) { const v = VIDA[id]; if (v.n && txt.indexOf(v.n) >= 0) { who = id; break; } }
      if (!who) return;
      if (!window.__vidaCache || window.__vidaCache.id !== who) window.__vidaCache = { id: who, txt: linePara(who) };
      if (!window.__vidaCache.txt) return;
      const p = document.createElement('div');
      p.className = 'vidaLine';
      p.style.cssText = 'margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.14);font-style:italic;opacity:.92;line-height:1.55';
      p.textContent = window.__vidaCache.txt;
      (dlg.querySelector('#dlgTxt') || dlg.querySelector('p') || dlg).appendChild(p);
    } catch (e) { }
  }
  try {
    const obs = new MutationObserver(() => inyectarLinea());
    const startObs = () => {
      const dlg = document.getElementById('dlg');
      if (dlg) { try { obs.observe(dlg, { childList: true, subtree: true, characterData: true }); } catch (e) { } }
    };
    if (document.getElementById('dlg')) startObs();
    else setTimeout(startObs, 1200);
  } catch (e) { }
  NC.hooks.post.push(() => { try { inyectarLinea(); } catch (e) { } });

  NC.vidas = { VIDA, rel, confianza, recuerda, linePara, sitio };
  NC.log('vidas: historias personales, relaciones y rutinas de los personajes');
})();
