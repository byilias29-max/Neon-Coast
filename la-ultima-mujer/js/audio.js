'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — paisaje sonoro procedural (Web Audio)
   Sin muestras externas: ambientes, voces de radio, pasos,
   lluvia, mecanismos y una partitura mínima sintetizada.
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const A = {};
  LM.Audio = A;

  let ctx = null;
  let master = null;
  let compressor = null;
  let ambientBus = null;
  let sfxBus = null;
  let musicBus = null;
  let voiceBus = null;
  let reverb = null;
  let reverbGain = null;
  let noiseBuffer = null;
  let settings = null;
  let unlocked = false;
  let starting = false;
  let desiredScene = 'menu';
  let currentScene = '';
  let ambient = null;
  let musicNext = 7;
  let sceneTime = 0;
  let duck = 1;
  let duckTarget = 1;
  let radioLoop = null;
  let tapeLoop = null;
  let heartbeatNext = 0;
  let lastFootstep = 0;
  let unlockHooked = false;

  const AMBIENT_LEVEL = 0.52;
  const MUSIC_LEVEL = 0.46;
  const SFX_LEVEL = 0.7;
  const VOICE_LEVEL = 0.72;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const now = () => ctx ? ctx.currentTime : 0;
  const pct = v => Math.pow(Math.max(0, Math.min(100, v == null ? 50 : v)) / 100, 1.45);

  function hookUnlock() {
    if (unlockHooked) return;
    unlockHooked = true;
    const go = () => { A.unlock(); };
    window.addEventListener('pointerdown', go, { passive: true });
    window.addEventListener('keydown', go);
    window.addEventListener('touchstart', go, { passive: true });
  }

  A.init = function (s) {
    settings = s || LM.Settings || {};
    hookUnlock();
  };

  A.unlock = function () {
    if (unlocked || starting) return Promise.resolve(unlocked);
    starting = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { starting = false; return Promise.resolve(false); }
      ctx = new AC();
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 16;
      compressor.ratio.value = 3;
      compressor.attack.value = .012;
      compressor.release.value = .35;

      master = ctx.createGain();
      master.gain.value = pct(settings.master == null ? 80 : settings.master);
      master.connect(compressor);
      compressor.connect(ctx.destination);

      ambientBus = ctx.createGain();
      sfxBus = ctx.createGain();
      musicBus = ctx.createGain();
      voiceBus = ctx.createGain();
      ambientBus.connect(master);
      sfxBus.connect(master);
      musicBus.connect(master);
      voiceBus.connect(master);

      noiseBuffer = makeNoiseBuffer(4);
      reverb = ctx.createConvolver();
      reverb.buffer = makeImpulse(3.2, 2.6);
      reverbGain = ctx.createGain();
      reverbGain.gain.value = .34;
      reverb.connect(reverbGain);
      reverbGain.connect(master);

      applyLevels(0);
      unlocked = true;
      starting = false;
      const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
      return resume.then(() => {
        startAmbient(desiredScene || 'menu', 2.4);
        musicNext = 2.5 + Math.random() * 4;
        return true;
      }).catch(() => true);
    } catch (e) {
      starting = false;
      unlocked = false;
      return Promise.resolve(false);
    }
  };

  function makeNoiseBuffer(seconds) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + .018 * white) / 1.018;
        data[i] = white * .72 + last * 1.8;
      }
    }
    return buffer;
  }

  function makeImpulse(seconds, decay) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 40 ? i / 40 : 1);
      }
    }
    return buffer;
  }

  function applyLevels(time) {
    if (!ctx) return;
    const t = time == null ? now() : time;
    const m = pct(settings.master == null ? 80 : settings.master);
    if (master) master.gain.setTargetAtTime(m, t, .18);
    if (ambientBus) ambientBus.gain.setTargetAtTime(pct(settings.ambient) * AMBIENT_LEVEL * duck, t, .2);
    if (sfxBus) sfxBus.gain.setTargetAtTime(pct(settings.sfx) * SFX_LEVEL, t, .12);
    if (musicBus) musicBus.gain.setTargetAtTime(pct(settings.music) * MUSIC_LEVEL * duck, t, .25);
    if (voiceBus) voiceBus.gain.setTargetAtTime(pct(settings.voice) * VOICE_LEVEL, t, .16);
  }

  A.setSettings = function (s) {
    settings = s || settings || LM.Settings || {};
    if (ctx) applyLevels();
  };

  A.setDucked = function (on) {
    duckTarget = on ? .54 : 1;
  };

  A.isReady = () => unlocked;

  /* ============================================================
     AMBIENTES
     ============================================================ */
  function stopAmbient(fade) {
    if (!ambient) return;
    const a = ambient;
    ambient = null;
    try {
      a.gain.gain.cancelScheduledValues(now());
      a.gain.gain.setTargetAtTime(0.0001, now(), Math.max(.06, (fade || .8) / 3));
    } catch (e) { /* noop */ }
    setTimeout(() => {
      for (const n of a.nodes) {
        try { n.stop(); } catch (e) { /* noop */ }
        try { n.disconnect(); } catch (e) { /* noop */ }
      }
      try { a.gain.disconnect(); } catch (e) { /* noop */ }
    }, Math.max(700, (fade || .8) * 1000 + 300));
  }

  function makeAmbientGroup() {
    const g = ctx.createGain();
    g.gain.value = .0001;
    g.connect(ambientBus);
    return { gain: g, nodes: [] };
  }

  function addNoise(group, opts) {
    opts = opts || {};
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    src.playbackRate.value = opts.rate || 1;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.type || 'lowpass';
    filter.frequency.value = opts.freq || 500;
    filter.Q.value = opts.q == null ? .7 : opts.q;
    const gain = ctx.createGain();
    gain.gain.value = opts.vol == null ? .04 : opts.vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(group.gain);
    src.start(now());
    group.nodes.push(src, filter, gain);
    return { src, filter, gain };
  }

  function addTone(group, opts) {
    opts = opts || {};
    const osc = ctx.createOscillator();
    osc.type = opts.type || 'sine';
    osc.frequency.value = opts.freq || 60;
    osc.detune.value = opts.detune || 0;
    const gain = ctx.createGain();
    gain.gain.value = opts.vol == null ? .015 : opts.vol;
    let tail = gain;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = opts.filterType || 'lowpass';
      f.frequency.value = opts.filter;
      f.Q.value = opts.q || 1;
      gain.connect(f);
      tail = f;
      group.nodes.push(f);
    }
    if (opts.lfo) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = opts.lfo;
      const lg = ctx.createGain();
      lg.gain.value = opts.lfoGain == null ? .004 : opts.lfoGain;
      lfo.connect(lg);
      lg.connect(gain.gain);
      lfo.start(now());
      group.nodes.push(lfo, lg);
    }
    osc.connect(gain);
    tail.connect(group.gain);
    osc.start(now());
    group.nodes.push(osc, gain);
    return { osc, gain };
  }

  function startAmbient(id, fade) {
    if (!ctx) { desiredScene = id; return; }
    if (currentScene === id && ambient) return;
    currentScene = id;
    sceneTime = 0;
    stopAmbient(fade || 1.4);
    const g = makeAmbientGroup();
    ambient = g;

    if (id === 'clinic' || id === 'menu' || id === 'clinic_room') {
      addNoise(g, { type: 'lowpass', freq: 420, vol: id === 'menu' ? .055 : .04, rate: .8 });
      addNoise(g, { type: 'bandpass', freq: 1900, q: .5, vol: .012 });
      addTone(g, { freq: 55, vol: .012, lfo: .19, lfoGain: .004 });
      addTone(g, { freq: 110, type: 'triangle', vol: .006, lfo: .31, lfoGain: .002 });
      if (id === 'clinic_room') {
        addTone(g, { freq: 7310, vol: .0009, filter: 5000, filterType: 'lowpass' });
      }
    } else if (id === 'street') {
      addNoise(g, { type: 'highpass', freq: 420, vol: .095, rate: 1.05 });
      addNoise(g, { type: 'lowpass', freq: 180, vol: .06, rate: .72 });
      addNoise(g, { type: 'bandpass', freq: 1200, q: .8, vol: .021 });
      addTone(g, { freq: 41, type: 'sine', vol: .01, lfo: .12, lfoGain: .003 });
    } else if (id === 'house') {
      addNoise(g, { type: 'lowpass', freq: 220, vol: .05, rate: .64 });
      addNoise(g, { type: 'bandpass', freq: 780, q: 1.4, vol: .008 });
      addTone(g, { freq: 48, vol: .009, lfo: .17, lfoGain: .003 });
      addTone(g, { freq: 96, type: 'triangle', vol: .0035 });
    } else if (id === 'basement') {
      addTone(g, { freq: 50, vol: .022, lfo: .8, lfoGain: .008 });
      addTone(g, { freq: 100, type: 'triangle', vol: .009, lfo: 1.7, lfoGain: .004 });
      addNoise(g, { type: 'bandpass', freq: 240, q: .8, vol: .03, rate: .7 });
      addNoise(g, { type: 'highpass', freq: 4600, vol: .005 });
    } else if (id === 'chapter') {
      addNoise(g, { type: 'lowpass', freq: 300, vol: .025 });
      addTone(g, { freq: 82, vol: .008, lfo: .09, lfoGain: .003 });
    } else {
      addNoise(g, { type: 'lowpass', freq: 340, vol: .038 });
      addTone(g, { freq: 58, vol: .008 });
    }

    try {
      g.gain.gain.setTargetAtTime(1, now(), Math.max(.08, (fade || 1.4) / 2.4));
    } catch (e) { /* noop */ }
  }

  A.setScene = function (id) {
    const map = {
      clinic_room: 'clinic_room', clinic_hall: 'clinic', street: 'street',
      house_ground: 'house', house_upstairs: 'house', house_basement: 'basement'
    };
    const amb = map[id] || id || 'menu';
    desiredScene = amb;
    if (ctx) startAmbient(amb, 1.6);
  };

  A.setMenu = function () {
    desiredScene = 'menu';
    if (ctx) startAmbient('menu', 1.8);
  };

  A.stopAmbient = function () {
    stopAmbient(.8);
    currentScene = '';
  };

  /* ============================================================
     SÍNTESIS BÁSICA
     ============================================================ */
  function sfxTone(freq, dur, opts) {
    if (!unlocked) return;
    opts = opts || {};
    const t = now();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(Math.max(18, freq), t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(18, opts.slide), t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, opts.vol || .06), t + (opts.attack || .008));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let tail = g;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = opts.filterType || 'lowpass';
      f.frequency.value = opts.filter;
      f.Q.value = opts.q || .8;
      g.connect(f);
      tail = f;
    }
    o.connect(g);
    tail.connect(opts.bus || sfxBus);
    if (opts.reverb) {
      const send = ctx.createGain();
      send.gain.value = opts.reverb;
      tail.connect(send);
      send.connect(reverb);
    }
    o.start(t);
    o.stop(t + dur + .04);
  }

  function sfxNoise(dur, opts) {
    if (!unlocked) return;
    opts = opts || {};
    const t = now();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    src.playbackRate.value = opts.rate || 1;
    const f = ctx.createBiquadFilter();
    f.type = opts.type || 'highpass';
    f.frequency.setValueAtTime(opts.freq || 1200, t);
    if (opts.slide) f.frequency.exponentialRampToValueAtTime(Math.max(30, opts.slide), t + dur);
    f.Q.value = opts.q == null ? .7 : opts.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, opts.vol || .08), t + (opts.attack || .01));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(opts.bus || sfxBus);
    if (opts.reverb) {
      const send = ctx.createGain();
      send.gain.value = opts.reverb;
      g.connect(send); send.connect(reverb);
    }
    src.start(t);
    src.stop(t + dur + .03);
  }

  function bell(freq, dur, vol, delay) {
    if (!unlocked) return;
    const t = now() + (delay || 0);
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o2.type = 'triangle';
    o.frequency.value = freq; o2.frequency.value = freq * 2.01;
    const g2 = ctx.createGain(); g2.gain.value = .22;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || .06, t + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicBus);
    const send = ctx.createGain(); send.gain.value = .3;
    g.connect(send); send.connect(reverb);
    o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
  }

  function piano(freq, delay, vol) {
    if (!unlocked) return;
    const t = now() + (delay || 0);
    const dur = rnd(2.2, 4.2);
    const o = ctx.createOscillator();
    const h = ctx.createOscillator();
    const g = ctx.createGain();
    const hg = ctx.createGain();
    o.type = 'sine'; h.type = 'triangle';
    o.frequency.value = freq;
    h.frequency.value = freq * 2.001;
    hg.gain.value = .15;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || .035, t + .025);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); h.connect(hg); hg.connect(g); g.connect(musicBus);
    const send = ctx.createGain(); send.gain.value = .6;
    g.connect(send); send.connect(reverb);
    o.start(t); h.start(t); o.stop(t + dur); h.stop(t + dur);
  }

  /* ============================================================
     EVENTOS DE INTERFAZ Y JUEGO
     ============================================================ */
  A.uiClick = function () {
    if (!unlocked) return;
    sfxTone(520, .045, { vol: .018, type: 'triangle', filter: 1800 });
    sfxNoise(.035, { vol: .012, freq: 2600, type: 'highpass' });
  };

  A.uiHover = function () {
    if (!unlocked) return;
    sfxTone(880, .025, { vol: .004, type: 'sine' });
  };

  A.footstep = function (run, crouch) {
    if (!unlocked) return;
    const t = now();
    if (t - lastFootstep < (crouch ? .42 : run ? .22 : .32)) return;
    lastFootstep = t;
    const v = crouch ? .018 : run ? .045 : .029;
    sfxNoise(crouch ? .1 : .16, { vol: v, freq: rnd(600, 980), type: 'lowpass', attack: .003 });
    sfxTone(rnd(52, 70), .12, { vol: v * .7, type: 'sine', filter: 170 });
  };

  A.door = function (close) {
    if (!unlocked) return;
    sfxNoise(.8, { vol: .05, freq: close ? 2900 : 1200, slide: close ? 700 : 360, type: 'bandpass', q: 1.8, attack: .05 });
    sfxTone(close ? 92 : 74, .32, { vol: .07, type: 'triangle', slide: close ? 48 : 58, filter: 380 });
    setTimeout(() => sfxNoise(.13, { vol: .06, freq: 420, type: 'lowpass', attack: .002 }), close ? 330 : 650);
  };

  A.item = function () {
    if (!unlocked) return;
    sfxNoise(.3, { vol: .028, freq: 3800, type: 'highpass' });
    sfxTone(784, .4, { vol: .025, type: 'sine', reverb: .3 });
    sfxTone(1174, .26, { vol: .012, type: 'sine' });
  };

  A.paper = function () {
    if (!unlocked) return;
    sfxNoise(.34, { vol: .04, freq: 3300, type: 'highpass', rate: .9 });
    setTimeout(() => sfxNoise(.16, { vol: .023, freq: 4800, type: 'highpass' }), 120);
  };

  A.save = function () {
    if (!unlocked) return;
    sfxTone(659.25, .25, { vol: .022, type: 'sine', reverb: .2 });
    sfxTone(987.77, .4, { vol: .014, type: 'sine', reverb: .25 });
  };

  A.torch = function (on) {
    if (!unlocked) return;
    sfxNoise(.45, { vol: on ? .042 : .025, freq: on ? 520 : 1700, slide: on ? 1800 : 320, type: 'bandpass', q: .8, attack: .05 });
  };

  A.oil = function () {
    if (!unlocked) return;
    sfxNoise(.5, { vol: .035, freq: 430, type: 'lowpass', attack: .06 });
    sfxTone(260, .18, { vol: .014, type: 'triangle', slide: 170 });
  };

  A.dialTick = function (dir) {
    if (!unlocked) return;
    sfxNoise(.045, { vol: .035, freq: 2400, type: 'bandpass', q: 5, attack: .001 });
    sfxTone(dir > 0 ? 1140 : 900, .06, { vol: .018, type: 'square', filter: 2200 });
  };

  A.dialFail = function () {
    if (!unlocked) return;
    sfxTone(72, .6, { vol: .09, type: 'triangle', slide: 42, filter: 260 });
    sfxNoise(.4, { vol: .045, freq: 300, type: 'lowpass' });
  };

  A.dialSuccess = function () {
    if (!unlocked) return;
    sfxNoise(.4, { vol: .03, freq: 600, type: 'bandpass', q: 2 });
    [196, 246.94, 293.66, 392].forEach((f, i) => bell(f, 2.6, .05, i * .12));
  };

  A.musicbox = function () {
    if (!unlocked) return;
    const notes = [523.25, 440, 659.25, 392];
    notes.forEach((f, i) => {
      const delay = i * .48;
      bell(f, 1.7, .045, delay);
      setTimeout(() => {
        if (!unlocked) return;
        sfxTone(f * 2.005, .9, { vol: .012, type: 'sine', bus: musicBus, reverb: .4 });
      }, delay * 1000);
    });
  };

  A.knock = function (pattern) {
    if (!unlocked) return;
    const counts = pattern || [3, 2, 4];
    let delay = 0;
    counts.forEach(n => {
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          if (!unlocked) return;
          sfxTone(rnd(62, 78), .24, { vol: .065, type: 'sine', slide: 46, filter: 200, reverb: .28 });
          sfxNoise(.12, { vol: .035, freq: 300, type: 'lowpass', attack: .002 });
        }, delay * 1000);
        delay += .27;
      }
      delay += .62;
    });
  };

  A.heartbeat = function () {
    if (!unlocked) return;
    sfxTone(48, .32, { vol: .062, type: 'sine', slide: 34 });
    setTimeout(() => sfxTone(42, .28, { vol: .045, type: 'sine', slide: 30 }), 220);
  };

  A.whisper = function (pan) {
    if (!unlocked) return;
    const t = now();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.playbackRate.value = .8;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1250; f.Q.value = 2.5;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'lowpass'; f2.frequency.value = 2800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.024, t + .25);
    g.gain.setValueAtTime(.024, t + .8);
    g.gain.exponentialRampToValueAtTime(.0001, t + 2.2);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan == null ? -.3 : pan; src.connect(f); f.connect(f2); f2.connect(g); g.connect(p); p.connect(voiceBus); }
    else { src.connect(f); f.connect(f2); f2.connect(g); g.connect(voiceBus); }
    src.start(t); src.stop(t + 2.3);
    sfxTone(128, 1.4, { vol: .006, type: 'sine', slide: 104, bus: voiceBus });
  };

  A.radioStart = function () {
    if (!unlocked || radioLoop) return;
    const g = ctx.createGain();
    g.gain.value = .0001;
    g.connect(voiceBus);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer; src.loop = true; src.playbackRate.value = .52;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = .7;
    src.connect(f); f.connect(g);
    src.start();
    g.gain.setTargetAtTime(.032, now(), .25);
    radioLoop = { src, g };
    sfxTone(714, .25, { vol: .022, type: 'sine', slide: 1200, bus: voiceBus });
  };

  A.radioStop = function () {
    if (!radioLoop) return;
    const r = radioLoop; radioLoop = null;
    try {
      r.g.gain.setTargetAtTime(.0001, now(), .08);
      setTimeout(() => { try { r.src.stop(); r.src.disconnect(); r.g.disconnect(); } catch (e) { /* noop */ } }, 400);
    } catch (e) { /* noop */ }
  };

  A.voiceBlip = function (who) {
    if (!unlocked) return;
    const base = who === 'ELÍAS' ? 108 : who === 'NADIA' ? 176 : who === 'LUCÍA' ? 154 : 126;
    sfxTone(base, .12, { vol: .008, type: 'sine', filter: 440, bus: voiceBus, reverb: .15 });
  };

  A.tapeStart = function () {
    if (!unlocked || tapeLoop) return;
    const g = ctx.createGain();
    g.gain.value = .0001;
    g.connect(voiceBus);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer; src.loop = true; src.playbackRate.value = .36;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2300; f.Q.value = .9;
    src.connect(f); f.connect(g);
    src.start();
    g.gain.setTargetAtTime(.026, now(), .3);
    sfxTone(62, 1.1, { vol: .018, type: 'triangle', slide: 55, bus: voiceBus, filter: 280 });
    tapeLoop = { src, g };
  };

  A.tapeStop = function () {
    if (!tapeLoop) return;
    const r = tapeLoop; tapeLoop = null;
    try {
      r.g.gain.setTargetAtTime(.0001, now(), .12);
      setTimeout(() => { try { r.src.stop(); r.src.disconnect(); r.g.disconnect(); } catch (e) { /* noop */ } }, 450);
    } catch (e) { /* noop */ }
  };

  A.thunder = function (intensity, delay) {
    if (!unlocked) return;
    const d = (delay || 0) * 1000;
    const vol = .12 * (intensity == null ? .8 : intensity);
    setTimeout(() => {
      if (!unlocked) return;
      sfxNoise(3.2, { vol: vol, freq: 260, slide: 80, type: 'lowpass', attack: .08, reverb: .3 });
      setTimeout(() => sfxNoise(1.6, { vol: vol * .45, freq: 180, slide: 55, type: 'lowpass', attack: .2 }), 240);
      sfxTone(38, 2.2, { vol: vol * .5, type: 'sine', slide: 26, filter: 90 });
    }, Math.max(0, d));
  };

  A.scare = function () {
    if (!unlocked) return;
    sfxNoise(.7, { vol: .06, freq: 2400, slide: 120, type: 'bandpass', q: 1.2, attack: .01 });
    sfxTone(61, 1.1, { vol: .07, type: 'sine', slide: 38 });
    A.whisper(-.6);
  };

  A.chapter = function () {
    if (!unlocked) return;
    [130.81, 196, 261.63, 329.63].forEach((f, i) => bell(f, 5.5, .032, i * .5));
    sfxNoise(4, { vol: .016, freq: 380, type: 'lowpass', attack: 1.2 });
  };

  A.ambientEvent = function (kind) {
    if (!unlocked) return;
    if (kind === 'house') {
      sfxNoise(1.8, { vol: .016, freq: 420, slide: 210, type: 'bandpass', q: 3, attack: .2 });
      sfxTone(rnd(80, 115), 1.7, { vol: .005, type: 'triangle', slide: rnd(62, 86), filter: 240 });
    } else if (kind === 'basement') {
      sfxNoise(.22, { vol: .025, freq: 1500, type: 'bandpass', q: 4, attack: .002 });
      sfxTone(rnd(900, 1400), .22, { vol: .004, type: 'sine', slide: 300 });
    } else if (kind === 'street') {
      sfxNoise(2.2, { vol: .015, freq: 600, slide: 300, type: 'bandpass', q: 1.4, attack: .4 });
    } else if (kind === 'clinic' || kind === 'clinic_room') {
      sfxTone(120, .5, { vol: .004, type: 'triangle', filter: 400 });
    }
  };

  /* ============================================================
     ACTUALIZACIÓN DE PARTITURA Y EVENTOS DE AMBIENTE
     ============================================================ */
  A.update = function (dt) {
    if (!unlocked || !ctx) return;
    dt = Math.min(.1, dt || 0);
    sceneTime += dt;

    // Suaviza el ducking de la interfaz.
    if (Math.abs(duck - duckTarget) > .002) {
      duck += (duckTarget - duck) * Math.min(1, dt * 3.4);
      applyLevels();
    }

    const idle = (settings.music || 0) <= 0;
    if (!idle) {
      musicNext -= dt;
      if (musicNext <= 0) {
        const s = currentScene;
        const menuNotes = [110, 164.81, 196, 246.94, 220];
        const houseNotes = [130.81, 146.83, 174.61, 196, 220];
        const basementNotes = [65.41, 82.41, 98, 110, 123.47];
        const streetNotes = [98, 130.81, 146.83, 164.81];
        const clinicNotes = [174.61, 196, 220, 261.63];
        let pool = houseNotes;
        let octave = 1;
        if (s === 'menu') { pool = menuNotes; octave = 1; }
        else if (s === 'street') { pool = streetNotes; octave = .5; }
        else if (s === 'basement') { pool = basementNotes; octave = 1; }
        else if (s === 'clinic' || s === 'clinic_room') { pool = clinicNotes; octave = .5; }
        const n = pool[(Math.random() * pool.length) | 0] * octave;
        piano(n, 0, rnd(.022, .04));
        if (Math.random() < .34) piano(n * (Math.random() < .5 ? 1.5 : 2), rnd(.55, 1.8), rnd(.01, .02));
        musicNext = s === 'menu' ? rnd(8, 16) : s === 'house' ? rnd(10, 21) : rnd(9, 19);
      }
    }

    // Ruidos orgánicos ocasionales.
    if (currentScene === 'house' && Math.random() < dt * .028) A.ambientEvent('house');
    if (currentScene === 'basement' && Math.random() < dt * .04) A.ambientEvent('basement');
    if (currentScene === 'street' && Math.random() < dt * .012) A.ambientEvent('street');
    if ((currentScene === 'clinic' || currentScene === 'clinic_room') && Math.random() < dt * .016) A.ambientEvent('clinic');

    if (radioLoop && Math.random() < dt * .5) {
      sfxTone(rnd(220, 560), .04, { vol: .003, type: 'square', bus: voiceBus, filter: 900 });
    }
    if (tapeLoop && Math.random() < dt * .6) {
      sfxNoise(.06, { vol: .006, freq: rnd(1400, 2800), type: 'bandpass', q: 4, bus: voiceBus });
    }
  };

  A.suspend = function () {
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  };

  A.resume = function () {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };

  A.ready = () => !!ctx;
})();
