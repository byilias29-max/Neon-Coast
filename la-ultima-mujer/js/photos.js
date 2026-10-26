'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — archivo fotográfico procedural
   Cada imagen se pinta en un canvas y se convierte en data URL.
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U;
  const P = {};
  LM.Photos = P;

  const records = new Map();
  const order = [];
  let pending = 0;
  let readyResolve;
  const readyPromise = new Promise(resolve => { readyResolve = resolve; });

  P.loaded = false;
  P.ready = () => readyPromise;
  P.url = name => records.has(name) ? records.get(name).url : '';
  P.image = name => {
    const r = records.get(name);
    return r && r.ready ? r.img : null;
  };
  P.names = () => order.slice();

  function finish(ctx, w, h, opts) {
    opts = opts || {};
    // polvo y arañazos
    const rng = U.rng('photo-finish-' + (opts.seed || 1));
    if (opts.grain !== false) {
      for (let i = 0; i < 1400; i++) {
        const a = rng() * (opts.grainAlpha || .06);
        ctx.fillStyle = rng() > .55 ? `rgba(255,246,224,${a})` : `rgba(0,0,0,${a})`;
        ctx.fillRect(rng() * w, rng() * h, 1, 1);
      }
    }
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(232,220,197,${.03 + rng() * .05})`;
      ctx.lineWidth = .5;
      const x = rng() * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (rng() - .5) * 20, h * .35, x + (rng() - .5) * 30, h * .7, x + (rng() - .5) * 18, h);
      ctx.stroke();
    }
    if (opts.stains !== false) {
      for (let i = 0; i < 5; i++) {
        const x = rng() * w, y = rng() * h;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 6 + rng() * 30);
        g.addColorStop(0, `rgba(30,23,16,${.04 + rng() * .07})`);
        g.addColorStop(1, 'rgba(30,23,16,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 6 + rng() * 30, 0, 7); ctx.fill();
      }
    }
    // viñeta fotográfica
    const v = ctx.createRadialGradient(w / 2, h / 2, h * .22, w / 2, h / 2, w * .7);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(.72, 'rgba(0,0,0,.1)');
    v.addColorStop(1, `rgba(0,0,0,${opts.vignette || .5})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    // tinte / luz
    if (opts.tint) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = opts.tint;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (opts.lightLeak) {
      ctx.globalCompositeOperation = 'screen';
      const l = ctx.createLinearGradient(0, 0, w, h);
      l.addColorStop(0, 'rgba(203,116,58,.14)');
      l.addColorStop(.5, 'rgba(203,116,58,0)');
      l.addColorStop(1, 'rgba(128,78,35,.08)');
      ctx.fillStyle = l; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function softFigure(ctx, x, y, s, skin, cloth, opts) {
    opts = opts || {};
    const h = 120 * s, w = 44 * s;
    ctx.save();
    ctx.translate(x, y);
    // cuerpo
    const g = ctx.createLinearGradient(-w, -h, w, 10);
    g.addColorStop(0, cloth[0]);
    g.addColorStop(.55, cloth[1]);
    g.addColorStop(1, cloth[2] || '#171714');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w * .7, 0);
    ctx.bezierCurveTo(-w * .95, -h * .38, -w * .55, -h * .78, -w * .26, -h * .84);
    ctx.quadraticCurveTo(0, -h * .93, w * .26, -h * .84);
    ctx.bezierCurveTo(w * .55, -h * .78, w * .95, -h * .38, w * .7, 0);
    ctx.closePath(); ctx.fill();
    // cuello
    ctx.fillStyle = skin[1];
    ctx.fillRect(-4 * s, -h * .92, 8 * s, 12 * s);
    // cabeza
    const hg = ctx.createLinearGradient(-12 * s, -h * 1.18, 13 * s, -h * .85);
    hg.addColorStop(0, skin[0]); hg.addColorStop(.6, skin[1]); hg.addColorStop(1, skin[2]);
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.ellipse(0, -h * 1.02, 12.5 * s, 15 * s, opts.tilt || 0, 0, 7); ctx.fill();
    // pelo
    ctx.fillStyle = opts.hair || '#211a15';
    if (opts.hairStyle === 'long') {
      ctx.beginPath();
      ctx.ellipse(0, -h * 1.08, 14 * s, 15 * s, 0, Math.PI * 1.02, Math.PI * 2.02); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-13 * s, -h * 1.02);
      ctx.quadraticCurveTo(-20 * s, -h * .78, -13 * s, -h * .62);
      ctx.lineTo(-7 * s, -h * .72);
      ctx.quadraticCurveTo(-11 * s, -h * .88, -10 * s, -h * 1.02);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(0, -h * 1.1, 13 * s, 10 * s, 0, Math.PI, Math.PI * 2); ctx.fill();
    }
    // rasgos
    ctx.fillStyle = 'rgba(42,27,20,.75)';
    ctx.beginPath(); ctx.ellipse(-4.8 * s, -h * 1.02, 1.2 * s, .9 * s, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.8 * s, -h * 1.02, 1.2 * s, .9 * s, 0, 0, 7); ctx.fill();
    if (opts.smile !== false) {
      ctx.strokeStyle = 'rgba(74,40,32,.55)'; ctx.lineWidth = .8 * s;
      ctx.beginPath();
      ctx.arc(0, -h * .96, 3.2 * s, .15, Math.PI - .15); ctx.stroke();
    }
    // cuello / escote
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(0, -h * .83, 10 * s, 3 * s, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  function make(name, fn) {
    const c = U.createCanvas(480, 360);
    const ctx = c.getContext('2d');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    fn(ctx, 480, 360);
    const url = c.toDataURL('image/png');
    const rec = { canvas: c, img: new Image(), url, ready: false };
    records.set(name, rec);
    order.push(name);
    pending++;
    rec.img.onload = () => {
      rec.ready = true;
      pending--;
      if (pending <= 0) {
        P.loaded = true;
        readyResolve(true);
      }
    };
    rec.img.onerror = () => {
      pending--;
      if (pending <= 0) { P.loaded = true; readyResolve(false); }
    };
    rec.img.src = url;
    return rec;
  }

  /* ------------------------------------------------------------
     CASA 14 — fotografía familiar de los Rueda (invierno de 1989)
     ------------------------------------------------------------ */
  make('rueda_family', (ctx, w, h) => {
    // interior del salón, luz de ventana
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#70634e'); bg.addColorStop(.45, '#4d4639'); bg.addColorStop(1, '#221f1a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // pared con papel
    ctx.fillStyle = 'rgba(102,89,64,.55)';
    ctx.fillRect(0, 0, w, h * .62);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = `rgba(50,41,30,${.04 + i * .006})`;
      ctx.fillRect(i * 64, 0, 12, h * .62);
    }
    // ventana con luz fría
    const win = ctx.createLinearGradient(250, 25, 440, 220);
    win.addColorStop(0, '#c7c3ac'); win.addColorStop(.5, '#8b927f'); win.addColorStop(1, '#3c443e');
    ctx.fillStyle = win;
    ctx.fillRect(250, 28, 188, 196);
    ctx.fillStyle = 'rgba(40,36,28,.85)';
    ctx.fillRect(344, 28, 5, 196);
    ctx.fillRect(250, 124, 188, 5);
    // cortinas
    ctx.fillStyle = 'rgba(91,68,46,.8)';
    ctx.beginPath(); ctx.moveTo(232, 20); ctx.lineTo(275, 20); ctx.quadraticCurveTo(260, 140, 280, 230); ctx.lineTo(228, 230); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(450, 20); ctx.lineTo(416, 20); ctx.quadraticCurveTo(430, 140, 412, 230); ctx.lineTo(462, 230); ctx.closePath(); ctx.fill();
    // sofá
    ctx.fillStyle = '#3e3227';
    ctx.beginPath(); ctx.moveTo(20, 250); ctx.lineTo(460, 250); ctx.lineTo(450, 342); ctx.lineTo(30, 342); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(120,95,66,.22)';
    for (let i = 0; i < 5; i++) ctx.fillRect(40 + i * 82, 258, 2, 76);
    // figuras: Irene, Elías niño, Nadia niña
    softFigure(ctx, 138, 282, 1.08, ['#b69b7b', '#937556', '#5d4634'], ['#7c6a4c', '#4a4031', '#1b1914'], { hair: '#2b2119', hairStyle: 'long', tilt: -.05 });
    // Irene: vestido y collar
    ctx.fillStyle = 'rgba(214,196,158,.55)';
    ctx.beginPath(); ctx.arc(138, 202, 2.2, 0, 7); ctx.fill();
    // Elías niño
    softFigure(ctx, 258, 300, .78, ['#c0a586', '#9f8161', '#624a35'], ['#5b5d4f', '#3b4136', '#171a16'], { hair: '#34271c', tilt: .04 });
    // Nadia niña con impermeable amarillo
    softFigure(ctx, 352, 306, .7, ['#c5ab8d', '#a38364', '#66503c'], ['#b09b52', '#82743d', '#3c3820'], { hair: '#3b2b1e', hairStyle: 'long', tilt: .07 });
    // dibujo de una luna en la pared
    ctx.strokeStyle = 'rgba(55,46,34,.55)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(84, 92, 24, .4, 5.4); ctx.stroke();
    // alfombra
    ctx.fillStyle = 'rgba(82,54,41,.55)';
    ctx.beginPath(); ctx.ellipse(245, 327, 190, 32, 0, 0, 7); ctx.fill();
    // veladura sepia
    ctx.fillStyle = 'rgba(188,147,96,.18)'; ctx.globalCompositeOperation = 'soft-light';
    ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'source-over';
    // borde de la foto
    ctx.strokeStyle = 'rgba(236,221,188,.14)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, h - 6);
    finish(ctx, w, h, { seed: 11, tint: 'rgba(166,118,62,.32)', lightLeak: true, vignette: .55 });
  });

  /* ------------------------------------------------------------
     RADIO FARO — equipo de la emisora, última foto juntos
     ------------------------------------------------------------ */
  make('radio_team', (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#132427'); bg.addColorStop(.55, '#0b1517'); bg.addColorStop(1, '#05090a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // ventana nocturna con ciudad
    ctx.fillStyle = 'rgba(24,42,45,.8)'; ctx.fillRect(252, 28, 198, 134);
    for (let i = 0; i < 18; i++) {
      const rng = U.rng('team-city-' + i);
      ctx.fillStyle = `rgba(${160 + rng() * 55 | 0},${128 + rng() * 45 | 0},${72 + rng() * 30 | 0},${.1 + rng() * .22})`;
      ctx.fillRect(258 + rng() * 180, 52 + rng() * 90, 2, 2);
    }
    ctx.strokeStyle = 'rgba(130,153,147,.2)'; ctx.lineWidth = 3;
    ctx.strokeRect(252, 28, 198, 134);
    ctx.beginPath(); ctx.moveTo(351, 28); ctx.lineTo(351, 162); ctx.stroke();
    // mesa de mezclas
    ctx.fillStyle = '#22251f'; ctx.fillRect(0, 292, w, 68);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = 'rgba(25,29,26,.9)'; ctx.fillRect(18 + i * 32, 304, 20, 43);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(210,147,79,.65)' : 'rgba(140,151,131,.35)';
      ctx.beginPath(); ctx.arc(28 + i * 32, 313, 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(9,12,11,.7)'; ctx.fillRect(24 + i * 32, 320, 8, 20);
    }
    // Mara (izquierda) con auriculares
    softFigure(ctx, 134, 302, 1.2, ['#c6a888', '#a18265', '#5e4736'], ['#3b4b43', '#26332d', '#111714'], { hair: '#1d1a15', hairStyle: 'long', tilt: -.03, smile: false });
    ctx.strokeStyle = '#151816'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(134, 184, 18, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    ctx.fillStyle = '#1c211e'; ctx.fillRect(115, 181, 8, 14); ctx.fillRect(145, 181, 8, 14);
    // Lucía (centro) con bata clara
    softFigure(ctx, 242, 310, 1.15, ['#d0b08e', '#aa896b', '#6f5541'], ['#7b8377', '#59655c', '#262e29'], { hair: '#30241c', hairStyle: 'long', tilt: .03 });
    // Elías (derecha) con chaqueta oscura
    softFigure(ctx, 348, 296, 1.24, ['#b99b7d', '#96775a', '#563f2f'], ['#413d35', '#292824', '#101211'], { hair: '#2c2a25', tilt: -.04, smile: false });
    // vasos y cinta
    ctx.fillStyle = 'rgba(190,183,155,.22)'; ctx.fillRect(290, 286, 25, 8);
    // rótulo radio faro
    ctx.save(); ctx.translate(40, 38); ctx.rotate(-.01);
    ctx.fillStyle = 'rgba(200,188,155,.16)'; ctx.font = '11px "Bahnschrift",sans-serif'; ctx.fillText('RADIO FARO · 91.7', 0, 0);
    ctx.restore();
    finish(ctx, w, h, { seed: 23, tint: 'rgba(50,89,91,.25)', vignette: .5, grainAlpha: .08 });
  });

  /* ------------------------------------------------------------
     VIGILANCIA — cámara 03, Clínica Aurora
     ------------------------------------------------------------ */
  make('surveillance', (ctx, w, h) => {
    ctx.fillStyle = '#0d1212'; ctx.fillRect(0, 0, w, h);
    // suelo clínico en perspectiva
    const g = ctx.createLinearGradient(0, 80, 0, h);
    g.addColorStop(0, '#39413c'); g.addColorStop(.55, '#252c29'); g.addColorStop(1, '#111615');
    ctx.fillStyle = g; ctx.fillRect(0, 78, w, h - 78);
    // baldosas
    ctx.strokeStyle = 'rgba(161,170,151,.07)'; ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * 72 - 100, h); ctx.lineTo(240 + (i - 4) * 30, 90); ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const y = 130 + i * 42;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // pared
    ctx.fillStyle = '#2a302c'; ctx.fillRect(0, 60, w, 28);
    // cama a la izquierda
    ctx.save(); ctx.translate(95, 162); ctx.rotate(.02);
    ctx.fillStyle = '#1a1f1d'; ctx.fillRect(-42, 22, 150, 146);
    ctx.fillStyle = '#78827a'; ctx.fillRect(-38, 18, 142, 136);
    ctx.fillStyle = 'rgba(190,197,183,.35)'; ctx.fillRect(-26, 30, 116, 52);
    ctx.strokeStyle = 'rgba(60,68,62,.6)'; ctx.lineWidth = 2;
    ctx.strokeRect(-38, 18, 142, 136);
    // Mara dormida
    ctx.fillStyle = 'rgba(36,31,26,.9)';
    ctx.beginPath(); ctx.ellipse(18, 115, 19, 26, -.3, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(195,171,142,.6)';
    ctx.beginPath(); ctx.ellipse(4, 90, 9, 11, -.5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(31,28,23,.93)';
    ctx.beginPath(); ctx.ellipse(1, 86, 11, 12, -.5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(51,48,40,.85)'; ctx.fillRect(-6, 132, 90, 18);
    ctx.restore();
    // mesa y gotero
    ctx.fillStyle = '#222824'; ctx.fillRect(334, 176, 92, 12); ctx.fillRect(344, 188, 8, 78); ctx.fillRect(404, 188, 8, 78);
    ctx.strokeStyle = 'rgba(140,152,139,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(366, 188); ctx.lineTo(366, 110); ctx.lineTo(390, 110); ctx.stroke();
    ctx.fillStyle = 'rgba(167,177,158,.3)'; ctx.fillRect(386, 110, 12, 30);
    // puerta al fondo
    ctx.fillStyle = '#161d1b'; ctx.fillRect(226, 58, 70, 22);
    ctx.fillStyle = 'rgba(173,155,105,.22)'; ctx.fillRect(236, 80, 50, 2);
    // ruido de cámara
    const rng = U.rng('surveillance-noise');
    for (let i = 0; i < 8000; i++) {
      const a = rng() * .09;
      ctx.fillStyle = rng() > .5 ? `rgba(220,232,215,${a})` : `rgba(0,0,0,${a})`;
      ctx.fillRect(rng() * w, rng() * h, 1, 1);
    }
    // scanlines
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, y, w, 1);
    }
    // marco / datos de cámara
    ctx.strokeStyle = 'rgba(198,218,196,.45)'; ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = 'rgba(204,222,198,.7)'; ctx.font = '10px "Consolas",monospace';
    ctx.fillText('CAM 03 · CLÍNICA AURORA', 28, 38);
    ctx.fillText('18-OCT  03:12:44', 348, 38);
    ctx.fillStyle = 'rgba(191,74,58,.9)';
    ctx.beginPath(); ctx.arc(28, 50, 3, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(204,222,198,.5)'; ctx.font = '8px "Consolas",monospace';
    ctx.fillText('REC', 36, 53);
    // retícula
    ctx.strokeStyle = 'rgba(198,218,196,.18)';
    ctx.beginPath(); ctx.moveTo(w / 2, 60); ctx.lineTo(w / 2, h - 26); ctx.moveTo(24, h / 2); ctx.lineTo(w - 24, h / 2); ctx.stroke();
    // anotación
    ctx.strokeStyle = 'rgba(184,72,55,.6)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(208, 172, 38, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(191,78,60,.75)'; ctx.font = '9px "Consolas",monospace';
    ctx.fillText('M-07', 292, 238);
    finish(ctx, w, h, { seed: 37, grainAlpha: .03, vignette: .7, stains: false });
  });

  /* ------------------------------------------------------------
     NADIA — fotografía bajo la lluvia, impermeable amarillo
     ------------------------------------------------------------ */
  make('nadia_photo', (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0c191b'); bg.addColorStop(.55, '#162425'); bg.addColorStop(1, '#090e0e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // farola
    const lamp = ctx.createRadialGradient(342, 86, 4, 342, 86, 210);
    lamp.addColorStop(0, 'rgba(238,181,104,.55)'); lamp.addColorStop(.4, 'rgba(194,134,73,.16)'); lamp.addColorStop(1, 'rgba(194,134,73,0)');
    ctx.fillStyle = lamp; ctx.fillRect(0, 0, w, h);
    // calle mojada
    ctx.fillStyle = 'rgba(31,42,41,.9)'; ctx.fillRect(0, 256, w, 104);
    for (let i = 0; i < 30; i++) {
      const rng = U.rng('nadia-street-' + i);
      ctx.fillStyle = `rgba(210,159,90,${.03 + rng() * .08})`;
      ctx.fillRect(rng() * w, 260 + rng() * 90, 2 + rng() * 40, 1);
    }
    // edificios
    ctx.fillStyle = 'rgba(8,13,14,.9)';
    ctx.fillRect(0, 0, 120, 260); ctx.fillRect(388, 0, 92, 260);
    ctx.fillStyle = 'rgba(201,173,111,.12)';
    ctx.fillRect(28, 56, 22, 30); ctx.fillRect(70, 112, 18, 26);
    // figura con impermeable
    ctx.save(); ctx.translate(246, 330);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(0, 2, 58, 16, 0, 0, 7); ctx.fill();
    const coat = ctx.createLinearGradient(-52, -190, 52, 12);
    coat.addColorStop(0, '#d1bb62'); coat.addColorStop(.35, '#a18f4a'); coat.addColorStop(.75, '#5d562f'); coat.addColorStop(1, '#242417');
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-54, 0);
    ctx.bezierCurveTo(-64, -72, -52, -150, -28, -174);
    ctx.quadraticCurveTo(0, -194, 28, -174);
    ctx.bezierCurveTo(52, -150, 64, -72, 54, 0);
    ctx.closePath(); ctx.fill();
    // brillos
    ctx.strokeStyle = 'rgba(249,237,181,.18)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(-37 + i * 15, -160); ctx.quadraticCurveTo(-50 + i * 17, -70, -36 + i * 16, -2); ctx.stroke();
    }
    // capucha y cara en sombra
    ctx.fillStyle = '#8e8048';
    ctx.beginPath(); ctx.ellipse(0, -186, 42, 36, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(18,18,14,.82)';
    ctx.beginPath(); ctx.ellipse(0, -184, 30, 28, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(190,159,126,.42)';
    ctx.beginPath(); ctx.ellipse(0, -181, 17, 20, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(17,16,13,.8)';
    ctx.beginPath(); ctx.ellipse(-7, -186, 2, 2.4, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7, -186, 2, 2.4, 0, 0, 7); ctx.fill();
    // lluvia en el impermeable
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = 'rgba(230,238,210,.2)';
      ctx.beginPath(); ctx.ellipse(-46 + (i * 29) % 90, -150 + (i * 41) % 140, .8, 2.2, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
    // lluvia
    for (let i = 0; i < 120; i++) {
      const rng = U.rng('nadia-rain-' + i);
      ctx.strokeStyle = `rgba(190,214,204,${.04 + rng() * .1})`;
      ctx.lineWidth = .6;
      const x = rng() * w, y = rng() * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12 + rng() * 18); ctx.stroke();
    }
    finish(ctx, w, h, { seed: 41, tint: 'rgba(45,72,67,.25)', vignette: .65, grainAlpha: .07 });
  });

  /* ------------------------------------------------------------
     DIBUJO INFANTIL — las cuatro marcas de la canción de Irene
     ------------------------------------------------------------ */
  make('child_drawing', (ctx, w, h) => {
    ctx.fillStyle = '#c7bda3'; ctx.fillRect(0, 0, w, h);
    // grano de papel
    const rng = U.rng('drawing-paper');
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = `rgba(80,67,46,${rng() * .045})`;
      ctx.fillRect(rng() * w, rng() * h, 1, 1);
    }
    // doblez
    ctx.strokeStyle = 'rgba(90,75,52,.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 180); ctx.lineTo(w, 180); ctx.stroke();
    // casa
    ctx.strokeStyle = 'rgba(90,55,42,.8)'; ctx.lineWidth = 4;
    ctx.strokeRect(70, 180, 150, 110);
    ctx.beginPath(); ctx.moveTo(55, 182); ctx.lineTo(145, 100); ctx.lineTo(238, 182); ctx.closePath(); ctx.stroke();
    // puerta
    ctx.fillStyle = 'rgba(99,65,48,.6)'; ctx.fillRect(128, 232, 35, 58);
    // luna
    ctx.strokeStyle = 'rgba(161,126,52,.85)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(365, 92, 38, .4, 5.65); ctx.stroke();
    ctx.fillStyle = 'rgba(190,154,70,.35)';
    ctx.beginPath(); ctx.arc(355, 84, 5, 0, 7); ctx.fill();
    // mano
    ctx.strokeStyle = 'rgba(117,77,57,.82)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(340, 236, 24, 27, -.2, 0, 7); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(323 + i * 9, 219);
      ctx.quadraticCurveTo(318 + i * 10, 198 - (i === 1 || i === 2 ? 8 : 0), 325 + i * 9, 204);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(317, 236); ctx.quadraticCurveTo(302, 242, 309, 253); ctx.stroke();
    // campana
    ctx.strokeStyle = 'rgba(106,92,50,.85)'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(196, 110); ctx.quadraticCurveTo(190, 74, 218, 60);
    ctx.quadraticCurveTo(246, 74, 240, 110);
    ctx.lineTo(250, 118); ctx.lineTo(186, 118); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(218, 124, 4, 0, 7); ctx.stroke();
    // cuervo
    ctx.fillStyle = 'rgba(52,46,40,.78)';
    ctx.beginPath();
    ctx.moveTo(345, 152); ctx.quadraticCurveTo(370, 130, 384, 148);
    ctx.quadraticCurveTo(374, 156, 381, 166); ctx.quadraticCurveTo(365, 160, 355, 169);
    ctx.quadraticCurveTo(352, 159, 345, 152); ctx.fill();
    ctx.beginPath(); ctx.arc(382, 143, 4, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(90,55,38,.8)'; ctx.beginPath(); ctx.moveTo(386, 143); ctx.lineTo(394, 146); ctx.lineTo(386, 147); ctx.fill();
    // figuras / ojos
    ctx.fillStyle = 'rgba(88,66,47,.6)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.ellipse(80 + i * 36, 318, 5, 7, 0, 0, 7); ctx.fill();
    }
    // flechas y números infantiles
    ctx.strokeStyle = 'rgba(126,64,52,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(260, 300); ctx.quadraticCurveTo(300, 280, 322, 260); ctx.stroke();
    ctx.fillStyle = 'rgba(126,64,52,.65)'; ctx.font = '20px "Comic Sans MS",cursive';
    ctx.fillText('no dormir', 40, 70);
    ctx.font = '16px "Comic Sans MS",cursive';
    ctx.fillText('nadia, 7 años', 318, 330);
    finish(ctx, w, h, { seed: 53, grainAlpha: .02, stains: true, vignette: .16 });
  });

  /* ------------------------------------------------------------
     ESPECTROGRAMA NANA-18
     ------------------------------------------------------------ */
  make('spectrogram', (ctx, w, h) => {
    ctx.fillStyle = '#071013'; ctx.fillRect(0, 0, w, h);
    // rejilla
    ctx.strokeStyle = 'rgba(98,133,127,.15)'; ctx.lineWidth = .6;
    for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // espectro
    const rng = U.rng('spectro-18n');
    for (let x = 0; x < w; x += 2) {
      const base = h * .62 + Math.sin(x * .045) * 20 + Math.sin(x * .013) * 40;
      for (let y = 30; y < h - 30; y += 3) {
        const d = Math.abs(y - base);
        let a = .015;
        if (d < 7) a += .3 * (1 - d / 7);
        if (d > 16 && d < 36) a += .09 * (1 - (d - 16) / 20);
        if (rng() > .985) a += .2;
        if (x > 300 && x < 345) a *= .35;
        if (a < .02) continue;
        const hue = 145 + Math.sin(y * .03 + x * .01) * 18;
        ctx.fillStyle = `hsla(${hue},44%,${48 + a * 60}%,${a})`;
        ctx.fillRect(x, y, 2, 2.4);
      }
    }
    // armónicos marcados
    ctx.strokeStyle = 'rgba(207,157,92,.6)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = 118 + i * 51;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.setLineDash([]);
    // anotaciones
    ctx.fillStyle = 'rgba(196,219,208,.65)'; ctx.font = '9px "Consolas",monospace';
    ctx.fillText('NANA-18 / VOZ + PORTADORA 91.7', 18, 24);
    ctx.fillText('Hz 4000', 8, 48); ctx.fillText('2000', 8, 100); ctx.fillText('800', 8, 152); ctx.fillText('200', 8, 204);
    ctx.fillStyle = 'rgba(191,82,62,.85)';
    ctx.fillText('MARCA DE SINCRONÍA', 286, 326);
    ctx.strokeStyle = 'rgba(191,82,62,.7)';
    ctx.strokeRect(300, 38, 45, 260);
    // regla
    ctx.fillStyle = 'rgba(196,219,208,.2)'; ctx.fillRect(0, h - 22, w, 1);
    ctx.fillStyle = 'rgba(196,219,208,.45)'; ctx.font = '8px "Consolas",monospace';
    for (let i = 0; i < 9; i++) ctx.fillText((i * 1.5).toFixed(1) + 's', 16 + i * 52, h - 8);
    finish(ctx, w, h, { seed: 61, grainAlpha: .04, vignette: .5, stains: false, tint: 'rgba(29,67,65,.2)' });
  });

  /* ------------------------------------------------------------
     LUCÍA — retrato de archivo, bata de enfermera
     ------------------------------------------------------------ */
  make('lucia_photo', (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#3a403a'); bg.addColorStop(.55, '#252d29'); bg.addColorStop(1, '#0f1513');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // ventana difusa
    const light = ctx.createRadialGradient(355, 40, 4, 340, 120, 260);
    light.addColorStop(0, 'rgba(225,216,183,.24)'); light.addColorStop(1, 'rgba(225,216,183,0)');
    ctx.fillStyle = light; ctx.fillRect(0, 0, w, h);
    // figura central
    softFigure(ctx, 246, 342, 1.72, ['#c8a98a', '#a68468', '#6e503d'], ['#8b9286', '#6b746a', '#2e3732'], { hair: '#2b2019', hairStyle: 'long', tilt: .02 });
    // bata, cuello y tarjeta
    ctx.fillStyle = 'rgba(205,211,194,.5)';
    ctx.beginPath(); ctx.moveTo(224, 214); ctx.lineTo(246, 250); ctx.lineTo(266, 214); ctx.lineTo(258, 208); ctx.lineTo(246, 230); ctx.lineTo(234, 208); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(34,42,38,.75)'; ctx.fillRect(292, 284, 34, 20);
    ctx.fillStyle = 'rgba(214,218,199,.55)'; ctx.font = '6px "Consolas",monospace'; ctx.fillText('L. ORIBE', 296, 296);
    // pelo largo
    ctx.strokeStyle = 'rgba(43,32,25,.85)'; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(218 + i * 8, 192);
      ctx.quadraticCurveTo(208 + i * 9, 240, 214 + i * 10, 288);
      ctx.stroke();
    }
    // ojos cansados
    ctx.fillStyle = 'rgba(40,27,21,.6)';
    ctx.beginPath(); ctx.ellipse(226, 204, 7, 3, -.1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(264, 204, 7, 3, .1, 0, 7); ctx.fill();
    // marco de foto clínica
    ctx.strokeStyle = 'rgba(221,211,184,.16)'; ctx.lineWidth = 7; ctx.strokeRect(3, 3, w - 6, h - 6);
    finish(ctx, w, h, { seed: 71, tint: 'rgba(82,97,83,.2)', vignette: .5, grainAlpha: .06 });
  });

  /* ------------------------------------------------------------
     HERMANAS — Mara y Lucía en la azotea de Radio Faro
     ------------------------------------------------------------ */
  make('hermanas', (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1d3034'); bg.addColorStop(.45, '#56645f'); bg.addColorStop(.7, '#8e7c63'); bg.addColorStop(1, '#2a2720');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // ciudad al fondo
    ctx.fillStyle = 'rgba(18,26,26,.55)';
    for (let i = 0; i < 16; i++) {
      const rng = U.rng('sisters-city-' + i);
      ctx.fillRect(i * 32, 190 + rng() * 40, 26 + rng() * 12, 120);
    }
    // barandilla
    ctx.strokeStyle = 'rgba(30,33,29,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 286); ctx.lineTo(w, 286); ctx.stroke();
    for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(20 + i * 50, 286); ctx.lineTo(20 + i * 50, 338); ctx.stroke(); }
    // Mara
    softFigure(ctx, 176, 320, 1.35, ['#c9aa8a', '#a38366', '#634a38'], ['#37463f', '#24302a', '#101614'], { hair: '#1d1a15', hairStyle: 'long', tilt: -.04, smile: false });
    // Lucía apoyada
    softFigure(ctx, 306, 326, 1.28, ['#cfb08f', '#a9896b', '#6b513f'], ['#758078', '#56625b', '#252c28'], { hair: '#30231b', hairStyle: 'long', tilt: .06 });
    // taza compartida
    ctx.fillStyle = 'rgba(198,185,155,.5)'; ctx.fillRect(234, 296, 16, 12);
    // viento / lluvia
    for (let i = 0; i < 60; i++) {
      const rng = U.rng('sisters-rain-' + i);
      ctx.strokeStyle = `rgba(215,223,206,${.02 + rng() * .05})`;
      ctx.lineWidth = .6;
      const x = rng() * w, y = rng() * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 10); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(17,17,15,.85)'; ctx.font = '10px "Segoe Script","Bradley Hand",cursive';
    ctx.fillText('la última noche buena', 292, 330);
    finish(ctx, w, h, { seed: 83, tint: 'rgba(190,143,94,.18)', vignette: .55, lightLeak: true, grainAlpha: .07 });
  });

  /* ------------------------------------------------------------
     ETIQUETA DE LA CINTA — PRUEBA DE VOZ 18N
     ------------------------------------------------------------ */
  make('tape_label', (ctx, w, h) => {
    ctx.fillStyle = '#c3b99f'; ctx.fillRect(0, 0, w, h);
    // etiqueta blanca
    ctx.fillStyle = '#d9d1bd'; ctx.fillRect(38, 54, 404, 254);
    ctx.strokeStyle = 'rgba(58,48,34,.45)'; ctx.lineWidth = 2; ctx.strokeRect(38, 54, 404, 254);
    // renglones
    ctx.strokeStyle = 'rgba(88,74,54,.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(64, 128 + i * 34); ctx.lineTo(416, 128 + i * 34); ctx.stroke();
    }
    // escritura
    ctx.fillStyle = 'rgba(37,42,39,.92)';
    ctx.font = '600 24px "Segoe Script","Bradley Hand",cursive';
    ctx.fillText('PRUEBA DE VOZ — 18N', 66, 100);
    ctx.font = '17px "Segoe Script","Bradley Hand",cursive';
    ctx.fillText('No usar sin autorización.', 66, 154);
    ctx.fillText('Cinta maestra / Clínica Aurora', 66, 188);
    ctx.fillText('Locutora: L. O.   /   Ing. M. O.', 66, 222);
    // luna dibujada
    ctx.strokeStyle = 'rgba(50,55,50,.8)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(356, 270, 27, .4, 5.6); ctx.stroke();
    // manchas
    const rng = U.rng('tape-stains');
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = `rgba(75,52,33,${.04 + rng() * .08})`;
      ctx.beginPath(); ctx.arc(rng() * w, rng() * h, 6 + rng() * 30, 0, 7); ctx.fill();
    }
    finish(ctx, w, h, { seed: 97, grainAlpha: .02, vignette: .22, stains: true });
  });

  /* ------------------------------------------------------------
     MAPA DE PUERTO NIEBLA — anotaciones de Lucía
     ------------------------------------------------------------ */
  make('map', (ctx, w, h) => {
    ctx.fillStyle = '#b8ad94'; ctx.fillRect(0, 0, w, h);
    const rng = U.rng('map-paper');
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = `rgba(70,58,40,${rng() * .04})`;
      ctx.fillRect(rng() * w, rng() * h, 1, 1);
    }
    // costa
    ctx.fillStyle = 'rgba(79,95,88,.45)';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, 120);
    ctx.bezierCurveTo(380, 150, 300, 120, 220, 180);
    ctx.bezierCurveTo(140, 220, 80, 260, 0, 270);
    ctx.closePath(); ctx.fill();
    // calles
    ctx.strokeStyle = 'rgba(63,54,40,.55)'; ctx.lineWidth = 3;
    const roads = [
      [[30, 300], [430, 290]], [[40, 330], [450, 320]], [[160, 90], [190, 350]],
      [[330, 80], [345, 340]], [[90, 220], [430, 235]], [[250, 160], [260, 350]],
      [[60, 170], [250, 150], [390, 170]]
    ];
    for (const pts of roads) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    // manzanas
    ctx.fillStyle = 'rgba(80,68,48,.18)';
    const blocks = [[70, 245, 60, 35], [220, 250, 50, 40], [290, 260, 40, 30], [180, 190, 42, 22], [360, 200, 30, 24], [370, 300, 45, 26]];
    for (const b of blocks) ctx.fillRect(b[0], b[1], b[2], b[3]);
    // marcas rojas
    ctx.fillStyle = 'rgba(133,54,40,.82)';
    ctx.font = '600 12px "Bahnschrift",sans-serif';
    ctx.fillText('CLÍNICA AURORA', 64, 286);
    ctx.fillText('CASA 14', 268, 250);
    ctx.fillText('RADIO FARO', 350, 160);
    ctx.strokeStyle = 'rgba(133,54,40,.6)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(80, 282, 4, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(290, 245, 5, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(368, 156, 4, 0, 7); ctx.stroke();
    // ruta punteada
    ctx.strokeStyle = 'rgba(133,54,40,.65)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(84, 278); ctx.quadraticCurveTo(160, 300, 220, 270); ctx.quadraticCurveTo(260, 250, 288, 247); ctx.stroke();
    ctx.setLineDash([]);
    // notas
    ctx.fillStyle = 'rgba(58,50,37,.7)'; ctx.font = '11px "Segoe Script","Bradley Hand",cursive';
    ctx.fillText('el túnel no sale en el mapa', 260, 320);
    ctx.fillText('91.7 = llave', 354, 210);
    // brújula
    ctx.strokeStyle = 'rgba(70,58,40,.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(420, 60, 18, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(420, 40); ctx.lineTo(425, 64); ctx.lineTo(420, 60); ctx.lineTo(415, 64); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = 'rgba(70,58,40,.6)'; ctx.font = '8px "Bahnschrift",sans-serif'; ctx.fillText('N', 418, 34);
    finish(ctx, w, h, { seed: 103, grainAlpha: .02, vignette: .18, stains: true });
  });

  /* precalentado: evita un primer frame con imágenes ausentes */
  P.warm = function () {
    for (const rec of records.values()) {
      if (rec.ready) {
        try { rec.canvas.getContext('2d').drawImage(rec.img, 0, 0); } catch (e) { /* noop */ }
      }
    }
  };
})();
