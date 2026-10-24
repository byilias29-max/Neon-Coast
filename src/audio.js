/* Neon Coast - audio ambiental: lluvia, truenos, viento, mar y motor suave */
(function () {
  'use strict';
  if (!window.NC) return;
  NC.log('audio: ambiente');

  // ---------- API de silencio centralizado (pausa) ----------
  NC.audio = {
    get context() { return ac; },
    // suspende TODO el contexto: se paran lluvia, viento, mar, motor ytruenos de golpe
    silence() { try { if (ac && ac.state === 'running') ac.suspend(); } catch (e) { } },
    // reanuda sin tocar los niveles: no se duplica ninguna pista
    resume() { try { if (ac && ac.state === 'suspended') ac.resume(); } catch (e) { } },
    isSilent() { try { return !ac || ac.state === 'suspended'; } catch (e) { return true; } }
  };

  let ac = null, master = null;
  let rainG = null, windG = null, seaG = null, engOsc = null, engG = null, engFlt = null;
  let synthG = null, synthOsc = [], synthFlt = [];
  let stepBuf = null;
  let nextThunder = 0, nextNote = 0, currentNote = -1;

  function noiseBuf(seconds) {
    const b = ac.createBuffer(1, seconds * ac.sampleRate, ac.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + w * .02) * .995; d[i] = w * .6 + last * 3; }
    return b;
  }

  function ensure() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ac = new AC();
      master = ac.createGain(); master.gain.value = .8; master.connect(ac.destination);
      // lluvia: ruido por bandpass
      rainG = ac.createGain(); rainG.gain.value = 0;
      const rainF = ac.createBiquadFilter(); rainF.type = 'bandpass'; rainF.frequency.value = 900; rainF.Q.value = .7;
      const rn = ac.createBufferSource(); rn.buffer = noiseBuf(3); rn.loop = true;
      rn.connect(rainF); rainF.connect(rainG); rainG.connect(master); rn.start();
      // viento / nieve: ruido lowpass
      windG = ac.createGain(); windG.gain.value = 0;
      const wf = ac.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 240;
      const wn = ac.createBufferSource(); wn.buffer = noiseBuf(4); wn.loop = true;
      wn.connect(wf); wf.connect(windG); windG.connect(master); wn.start();
      // mar: ruido lowpass profundo con lfo
      seaG = ac.createGain(); seaG.gain.value = 0;
      const sf = ac.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 400;
      const sn = ac.createBufferSource(); sn.buffer = noiseBuf(3); sn.loop = true;
      sn.connect(sf); sf.connect(seaG); seaG.connect(master); sn.start();
      const lfo = ac.createOscillator(); lfo.frequency.value = .11;
      const lg = ac.createGain(); lg.gain.value = .012; lfo.connect(lg); lg.connect(seaG.gain); lfo.start();
      // motor: oscilacion suave
      engOsc = ac.createOscillator(); engOsc.type = 'sawtooth'; engOsc.frequency.value = 55;
      engFlt = ac.createBiquadFilter(); engFlt.type = 'lowpass'; engFlt.frequency.value = 300;
      engG = ac.createGain(); engG.gain.value = 0;
      engOsc.connect(engFlt); engFlt.connect(engG); engG.connect(master); engOsc.start();
      // sintetizador retro (melodía simple)
      synthG = ac.createGain(); synthG.gain.value = 0.08;
      for (let i = 0; i < 2; i++) {
        synthOsc[i] = ac.createOscillator(); synthOsc[i].type = i === 0 ? 'square' : 'triangle';
        synthFlt[i] = ac.createBiquadFilter(); synthFlt[i].type = 'lowpass'; synthFlt[i].frequency.value = 800;
        synthOsc[i].connect(synthFlt[i]); synthFlt[i].connect(synthG);
        synthOsc[i].start();
      }
      synthG.connect(master);
      // pisadas: pequeno buffer de ruido reutilizado (sin crear basura por paso)
      stepBuf = noiseBuf(.16);
      return true;
    } catch (e) { NC.log('audio init', e); ac = null; return false; }
  }

  function ramp(p, v, t = .6) { try { p.setTargetAtTime(v, ac.currentTime, t); } catch (e) { } }

  function thunder() {
    if (!ac) return;
    try {
      const t0 = ac.currentTime;
      const src = ac.createBufferSource(); src.buffer = noiseBuf(3.2);
      const lf = ac.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.setValueAtTime(420, t0); lf.frequency.exponentialRampToValueAtTime(90, t0 + 2.6);
      const g = ac.createGain(); g.gain.setValueAtTime(.0001, t0);
      g.gain.exponentialRampToValueAtTime(.30 + Math.random() * .18, t0 + .15 + Math.random() * .5);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + 2.4 + Math.random());
      src.connect(lf); lf.connect(g); g.connect(master);
      src.start(t0); src.stop(t0 + 3.6);
      // eco corto
      setTimeout(() => {
        try {
          const t1 = ac.currentTime, s2 = ac.createBufferSource(); s2.buffer = noiseBuf(1.4);
          const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 200;
          const g2 = ac.createGain(); g2.gain.setValueAtTime(.0001, t1);
          g2.gain.exponentialRampToValueAtTime(.12, t1 + .1); g2.gain.exponentialRampToValueAtTime(.0001, t1 + 1.2);
          s2.connect(f2); f2.connect(g2); g2.connect(master); s2.start(t1); s2.stop(t1 + 1.6);
        } catch (e) { }
      }, 1500 + Math.random() * 900);
    } catch (e) { }
  }

  // pisada: ruido corto con paso alto, volumen bajo y decaimiento rapido
  function step(run) {
    if (!window.SND) return;
    if (!ensure()) return;
    if (!ac || ac.state !== 'running' || !master || !stepBuf) return;
    try {
      const t0 = ac.currentTime;
      const src = ac.createBufferSource(); src.buffer = stepBuf;
      const f = ac.createBiquadFilter(); f.type = 'bandpass';
      f.frequency.setValueAtTime(run ? 1450 : 980, t0);
      f.Q.value = 1.15;
      const g = ac.createGain();
      const vol = run ? .065 : .042;
      g.gain.setValueAtTime(.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + (run ? .11 : .14));
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t0); src.stop(t0 + .17);
    } catch (e) { }
  }

  NC.Audio = { thunder, ensure, step };

  let lastWx = '';
  setInterval(() => {
    try {
      if (!window.SND) { if (ac) { master.gain.value = 0; } return; }
      if (!window.SND) return;
      if (!ensure()) return;
      if (ac.state === 'suspended') { ac.resume().catch(() => { }); if (ac.state === 'suspended') return; }
      master.gain.value = .8;
      const px = P.foot ? P.fx : P.x, pz = P.foot ? P.fz : P.z, spd = speed;
      // lluvia / nieve / viento
      const rain = (WX.wx === 'lluvia') ? 1 : 0, snow = (WX.wx === 'nieve') ? 1 : 0;
      ramp(rainG.gain, rain ? .045 : 0, .8);
      ramp(windG.gain, snow ? .02 : 0, .8);
      // mar
      const dSea = Math.max(0, px - (EXT + 20));
      ramp(seaG.gain, dSea < 220 ? .016 * (1 - dSea / 220) : 0, 1);
      // motor solo en coche
      if (!P.foot) {
        const f = 50 + Math.min(200, spd * 3.2) * (0.9 + .1 * Math.sin(performance.now() / 700));
        engOsc.frequency.setTargetAtTime(f, ac.currentTime, .1);
        engFlt.frequency.setTargetAtTime(240 + spd * 8, ac.currentTime, .2);
        ramp(engG.gain, P.chp <= 0 ? .004 : .018, .3);
      } else ramp(engG.gain, 0, .3);
      // truenos solo bajo lluvia
      if (rain && performance.now() > nextThunder) { thunder(); nextThunder = performance.now() + 12000 + Math.random() * 22000; }
      if (!rain && lastWx === 'lluvia') nextThunder = performance.now() + 5000;
      // sintetizador synthwave: arpegio suave que sube en el coche y en persecución
      try {
        if (synthG && synthOsc[0]) {
          const ahora = performance.now();
          let nivel = .05, vel = 520;
          try { if (window.NC && NC.Pol && NC.Pol.estado === 'persecucion') { nivel = .085; vel = 300; } } catch (e) { }
          if (!P.foot) { nivel += .02; vel = Math.max(220, vel - spd * 3); }
          ramp(synthG.gain, window.SND ? nivel : 0, .9);
          if (ahora > nextNote) {
            const esc = [0, 3, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3];
            const base = P.foot ? 110 : 130.81;
            currentNote = (currentNote + 1) % esc.length;
            const semis = esc[currentNote];
            const f = base * Math.pow(2, semis / 12);
            synthOsc[0].frequency.setTargetAtTime(f, ac.currentTime, .03);
            synthOsc[1].frequency.setTargetAtTime(f * 2.005, ac.currentTime, .03);
            synthFlt[0].frequency.setTargetAtTime(600 + (semis / 15) * 1400, ac.currentTime, .06);
            nextNote = ahora + vel + Math.random() * 90;
          }
        }
      } catch (e) { }
      lastWx = WX.wx;
    } catch (e) { }
  }, 350);
})();
