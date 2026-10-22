/* NEON RUSH - audio 100% procedural (WebAudio, sin ficheros) */
(function () {
  'use strict';
  const NR = window.NR || {};
  const M = NR.M;

  const A = (NR.Audio = {
    ctx: null, master: null, sfx: null, mus: null, comp: null,
    noiseBuf: null, ready: false, muted: false,
    _schedId: 0,

    init() {
      if (this.ctx) { this.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());

      const comp = (this.comp = ctx.createDynamicsCompressor());
      comp.threshold.value = -14; comp.knee.value = 22; comp.ratio.value = 9;
      comp.attack.value = 0.004; comp.release.value = 0.22;

      const master = (this.master = ctx.createGain());
      master.gain.value = 0.8;
      comp.connect(master); master.connect(ctx.destination);

      const sfx = (this.sfx = ctx.createGain()); sfx.gain.value = 0.95; sfx.connect(comp);
      const mus = (this.mus = ctx.createGain()); mus.gain.value = 0.34; mus.connect(comp);

      /* reverb corto para dar cuerpo */
      const conv = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 1.1);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
      }
      conv.buffer = ir;
      const wet = ctx.createGain(); wet.gain.value = 0.22;
      conv.connect(wet); wet.connect(comp);
      this.verb = conv;

      /* buffer de ruido reutilizable */
      const nlen = Math.floor(ctx.sampleRate * 1.2);
      const nb = ctx.createBuffer(1, nlen, ctx.sampleRate);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
      this.noiseBuf = nb;

      this.ready = true;
      this.muted = !!NR.Save.data.settings.mute;
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.startMusic();
    },

    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

    setMuted(v) {
      this.muted = v;
      if (this.master) this.master.gain.setTargetAtTime(v ? 0 : 0.8, this.ctx.currentTime, 0.05);
      if (NR.Save) { NR.Save.data.settings.mute = v; NR.Save.save(); }
    },

    /* ---------- helpers de sintesis ---------- */
    now() { return this.ctx.currentTime; },

    osc(type, freq, t, dur, vol, bus, opts) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (opts && opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + dur);
      if (opts && opts.detune) o.detune.value = opts.detune;
      const peak = Math.max(0.0002, vol);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + (opts && opts.atk ? opts.atk : 0.006));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      let out = bus || this.sfx;
      if (opts && opts.filter) {
        const f = ctx.createBiquadFilter();
        f.type = opts.filter; f.frequency.value = opts.fc || 1200;
        if (opts.fcTo) f.frequency.exponentialRampToValueAtTime(opts.fcTo, t + dur);
        f.Q.value = opts.q || 1;
        g.connect(f); f.connect(out);
      } else g.connect(out);
      if (opts && opts.verb) { const vg = ctx.createGain(); vg.gain.value = opts.verb; g.connect(vg); vg.connect(this.verb); }
      o.start(t); o.stop(t + dur + 0.02);
      return o;
    },

    noise(t, dur, vol, opts) {
      const ctx = this.ctx;
      const s = ctx.createBufferSource();
      s.buffer = this.noiseBuf;
      s.loop = true;
      s.playbackRate.value = (opts && opts.rate) || 1;
      const g = ctx.createGain();
      const peak = Math.max(0.0002, vol);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + (opts && opts.atk ? opts.atk : 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const f = ctx.createBiquadFilter();
      f.type = (opts && opts.filter) || 'bandpass';
      f.frequency.setValueAtTime(opts && opts.fc ? opts.fc : 1800, t);
      if (opts && opts.fcTo) f.frequency.exponentialRampToValueAtTime(opts.fcTo, t + dur);
      f.Q.value = (opts && opts.q) || 1.1;
      s.connect(f); f.connect(g); g.connect((opts && opts.bus) || this.sfx);
      if (opts && opts.verb) { const vg = ctx.createGain(); vg.gain.value = opts.verb; g.connect(vg); vg.connect(this.verb); }
      s.start(t); s.stop(t + dur + 0.02);
    },

    /* ---------- efectos ---------- */
    shot(pitch, kind) {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      const p = pitch || 1;
      if (kind === 'rail') {
        this.osc('sawtooth', 220 * p, t, 0.22, 0.16, this.sfx, { to: 90 * p, filter: 'lowpass', fc: 4200, fcTo: 600, verb: 0.25 });
        this.noise(t, 0.16, 0.09, { fc: 5200, fcTo: 900, filter: 'bandpass', q: 2 });
      } else if (kind === 'scatter') {
        this.noise(t, 0.13, 0.16, { fc: 1500 * p, fcTo: 300, filter: 'lowpass', q: 0.8 });
        this.osc('square', 140 * p, t, 0.09, 0.1, this.sfx, { to: 60 * p });
      } else if (kind === 'arc') {
        this.noise(t, 0.09, 0.09, { fc: 4200, fcTo: 6800, filter: 'bandpass', q: 6, verb: 0.2 });
      } else {
        this.osc('square', 660 * p, t, 0.06, 0.075, this.sfx, { to: 300 * p });
        this.osc('triangle', 1320 * p, t, 0.035, 0.03, this.sfx, { to: 600 * p });
      }
    },

    hit(crit) {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      this.noise(t, crit ? 0.09 : 0.055, crit ? 0.14 : 0.09, { fc: crit ? 3200 : 2100, fcTo: 500, filter: 'bandpass', q: 1.4 });
      if (crit) this.osc('triangle', 1500, t, 0.07, 0.06, this.sfx, { to: 700 });
    },

    kill(combo, big) {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      const p = 1 + Math.min(1.2, combo * 0.012);
      this.noise(t, big ? 0.5 : 0.2, big ? 0.3 : 0.17, { fc: 1200 * p, fcTo: 120, filter: 'lowpass', q: 1.1, verb: big ? 0.5 : 0.2 });
      this.osc('sawtooth', (big ? 180 : 340) * p, t, big ? 0.4 : 0.16, big ? 0.2 : 0.1, this.sfx, { to: 45, filter: 'lowpass', fc: 2400, fcTo: 200 });
    },

    explode() {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      this.noise(t, 0.6, 0.34, { fc: 900, fcTo: 60, filter: 'lowpass', verb: 0.6 });
      this.osc('sine', 110, t, 0.45, 0.24, this.sfx, { to: 32 });
    },

    pickup(v) {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      const p = 1 + (v || 0) * 0.04;
      this.osc('triangle', 880 * p, t, 0.07, 0.08, this.sfx, { verb: 0.2 });
      this.osc('triangle', 1320 * p, t + 0.045, 0.07, 0.06, this.sfx, { verb: 0.2 });
    },

    dash() {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      this.noise(t, 0.24, 0.16, { fc: 400, fcTo: 3000, filter: 'bandpass', q: 1.6 });
      this.osc('sine', 180, t, 0.18, 0.08, this.sfx, { to: 700 });
    },

    hurt() {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      this.osc('square', 190, t, 0.26, 0.2, this.sfx, { to: 55, filter: 'lowpass', fc: 900 });
      this.noise(t, 0.22, 0.18, { fc: 700, fcTo: 120, filter: 'lowpass', verb: 0.3 });
    },

    ui(up) {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      this.osc('square', up ? 660 : 440, t, 0.05, 0.05, this.sfx, { to: up ? 990 : 330 });
    },

    waveUp() {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      [0, 0.07, 0.14].forEach((d, i) => this.osc('sawtooth', 220 * Math.pow(1.335, i), t + d, 0.18, 0.11, this.sfx, { filter: 'lowpass', fc: 2600, verb: 0.4 }));
    },

    card() {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      [523, 659, 784, 1046].forEach((f, i) => this.osc('triangle', f, t + i * 0.05, 0.22, 0.09, this.sfx, { verb: 0.35 }));
    },

    hyper() {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      this.osc('sawtooth', 110, t, 1.1, 0.16, this.sfx, { to: 1400, filter: 'lowpass', fc: 500, fcTo: 6000, verb: 0.6 });
      this.noise(t, 1.0, 0.12, { fc: 300, fcTo: 7000, filter: 'bandpass', q: 1.2 });
      [0, 0.12, 0.24].forEach((d, i) => this.osc('square', 330 * Math.pow(1.26, i), t + d, 0.4, 0.08, this.sfx, { verb: 0.5 }));
    },

    boss() {
      if (!this.ready || this.muted) return;
      const t = this.now() + 0.001;
      this.osc('sine', 70, t, 1.6, 0.32, this.sfx, { to: 28, verb: 0.7 });
      this.noise(t, 1.2, 0.2, { fc: 500, fcTo: 90, filter: 'lowpass', verb: 0.6 });
    },

    /* ---------- musica generativa ---------- */
    music: {
      on: false, step: 0, next: 0, bpm: 128, intensity: 0, root: 45, scale: 0,
      bar: 0, duck: 1
    },

    startMusic() {
      if (!this.ctx || this.music.on) return;
      this.music.on = true;
      this.music.next = this.now() + 0.1;
      const self = this;
      this._schedId = setInterval(() => self._schedule(), 25);
    },

    scales: [
      [0, 2, 3, 5, 7, 8, 10],   /* menor natural */
      [0, 1, 3, 5, 7, 8, 10],   /* frigio */
      [0, 2, 3, 5, 7, 8, 11],   /* menor armonica */
      [0, 2, 3, 5, 7, 9, 10],   /* dorio */
      [0, 3, 5, 7, 10],         /* pentatonica menor */
      [0, 1, 4, 5, 7, 8, 11]    /* locrio */
    ],

    setMusic(wave, intensity) {
      const m = this.music;
      m.bpm = 124 + Math.min(26, wave * 1.6);
      m.scale = wave % this.scales.length;
      const roots = [45, 45, 48, 43, 50, 45];
      m.root = roots[Math.floor(wave / 4) % roots.length];
      m.intensity = intensity;
    },

    _schedule() {
      if (!this.ready) return;
      const m = this.music;
      const ctx = this.ctx;
      const stepDur = 60 / m.bpm / 4;
      while (m.next < ctx.currentTime + 0.14) {
        this._step(m.step, m.next, stepDur);
        m.next += stepDur;
        m.step = (m.step + 1) % 64;
        if (m.step === 0) m.bar++;
      }
    },

    _step(step, t, dur) {
      const m = this.music;
      const sc = this.scales[m.scale];
      const I = m.intensity;
      const beat = step % 16;
      const bar = Math.floor(step / 16);

      /* bombo */
      if (beat === 0 || beat === 8 || (beat === 6 && I > 0.5) || (beat === 11 && I > 0.75)) {
        this.osc('sine', 130, t, 0.16, 0.5, this.mus, { to: 42 });
        this.noise(t, 0.05, 0.12, { fc: 200, fcTo: 80, filter: 'lowpass', bus: this.mus });
      }
      /* caja */
      if (beat === 4 || beat === 12) {
        this.noise(t, 0.13, 0.22, { fc: 1900, fcTo: 900, filter: 'bandpass', q: 0.9, bus: this.mus, verb: 0.25 });
      }
      /* charles */
      if (beat % 2 === 0 || (I > 0.6 && beat % 1 === 0)) {
        this.noise(t, 0.03, 0.05 + (beat % 4 === 0 ? 0.03 : 0), { fc: 8000, filter: 'highpass', bus: this.mus });
      }
      /* bajo */
      const bassPat = [0, -1, 0, 7, -1, 5, -1, 3];
      if (I > 0.12 && beat % 2 === 0) {
        const s = bassPat[(beat / 2 + bar) % bassPat.length];
        if (s >= 0) {
          const midi = m.root - 12 + sc[s % sc.length];
          this.osc('sawtooth', 440 * Math.pow(2, (midi - 69) / 12), t, dur * 1.8, 0.24, this.mus,
            { filter: 'lowpass', fc: 380 + I * 900, fcTo: 220, q: 6 });
        }
      }
      /* arpegio */
      if (I > 0.42 && beat % 1 === 0) {
        const idx = [0, 2, 4, 6, 4, 2][beat % 6];
        const midi = m.root + sc[idx % sc.length] + 12;
        this.osc('square', 440 * Math.pow(2, (midi - 69) / 12), t, dur * 0.9, 0.075, this.mus,
          { filter: 'lowpass', fc: 2200 + I * 2600, verb: 0.18 });
      }
      /* pad de fondo */
      if (step === 0 && I < 0.5) {
        const midi = m.root + sc[0] + 12;
        this.osc('triangle', 440 * Math.pow(2, (midi - 69) / 12), t, dur * 15, 0.05, this.mus,
          { filter: 'lowpass', fc: 1200, verb: 0.5 });
      }
      /* lead de tension */
      if (I > 0.8 && (beat === 0 || beat === 6 || beat === 10)) {
        const midi = m.root + sc[(bar * 2) % sc.length] + 24;
        this.osc('sawtooth', 440 * Math.pow(2, (midi - 69) / 12), t, dur * 3, 0.06, this.mus,
          { filter: 'lowpass', fc: 3600, verb: 0.4 });
      }
    },

    duck(v, time) {
      if (!this.ready) return;
      const t = this.now();
      this.mus.gain.cancelScheduledValues(t);
      this.mus.gain.setTargetAtTime(0.34 * v, t, 0.05);
      this.mus.gain.setTargetAtTime(0.34, t + (time || 0.4), 0.15);
    }
  });
})();
