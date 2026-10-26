'use strict';
/* ============================================================
   Personajes procedurales: cuerpo en juego, retratos y presencia
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U, Art = LM.Art;
  const C = {};
  LM.Characters = C;

  /* ---------- helpers de pintura ---------- */
  function skinGradient(ctx, x, y, w, h, tone) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    if (tone === 'pale') {
      g.addColorStop(0, '#d8c0a5'); g.addColorStop(.45, '#b99c7d'); g.addColorStop(.8, '#8d725b'); g.addColorStop(1, '#5e493a');
    } else if (tone === 'old') {
      g.addColorStop(0, '#c1a78c'); g.addColorStop(.4, '#9c8068'); g.addColorStop(.8, '#715b49'); g.addColorStop(1, '#4a3b30');
    } else {
      g.addColorStop(0, '#d6b293'); g.addColorStop(.38, '#b98f6d'); g.addColorStop(.78, '#8e674f'); g.addColorStop(1, '#5b4233');
    }
    return g;
  }
  function noise(ctx, w, h, a = .04, seed = 1) {
    const n = U.createCanvas(64, 64);
    const nx = n.getContext('2d');
    const img = nx.createImageData(64, 64);
    const rng = U.rng('portrait-noise-' + seed);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + rng() * 130 | 0;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    nx.putImageData(img, 0, 0);
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay';
    const pat = ctx.createPattern(n, 'repeat'); ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  function grade(ctx, w, h, seed = 1) {
    // viñeta, polvo, líneas de vídeo
    const v = ctx.createRadialGradient(w * .5, h * .42, w * .2, w * .5, h * .5, w * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(.65, 'rgba(2,5,6,.18)'); v.addColorStop(1, 'rgba(1,3,4,.72)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(5,10,10,.12)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    const rng = U.rng('portrait-dust-' + seed);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(224,213,187,${rng() * .045})`;
      ctx.fillRect(rng() * w, rng() * h, 1 + rng(), 1);
    }
    noise(ctx, w, h, .045, seed);
  }
  function eye(ctx, x, y, rx, ry, iris, look = 0) {
    ctx.save();
    // cuenca
    ctx.fillStyle = 'rgba(55,37,28,.28)';
    U.ellipse(ctx, x, y - 2, rx * 1.3, ry * 1.5, 0); ctx.fill();
    // forma del ojo
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.quadraticCurveTo(x, y - ry * 1.6, x + rx, y);
    ctx.quadraticCurveTo(x, y + ry * 1.15, x - rx, y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(218,204,184,.9)'; ctx.fill();
    // iris
    const ix = x + look * rx * .35;
    const g = ctx.createRadialGradient(ix, y, .5, ix, y, ry * .85);
    g.addColorStop(0, '#2b2118'); g.addColorStop(.45, iris); g.addColorStop(.8, '#2c2018'); g.addColorStop(1, '#120d0a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ix, y, ry * .82, 0, 7); ctx.fill();
    ctx.fillStyle = '#16100b'; ctx.beginPath(); ctx.arc(ix, y, ry * .34, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,247,225,.85)'; ctx.beginPath(); ctx.arc(ix - ry * .28, y - ry * .3, ry * .16, 0, 7); ctx.fill();
    // párpado superior
    ctx.strokeStyle = 'rgba(30,20,15,.75)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x - rx, y); ctx.quadraticCurveTo(x, y - ry * 1.7, x + rx, y); ctx.stroke();
    ctx.strokeStyle = 'rgba(46,29,22,.35)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(x - rx * .8, y + ry * .55); ctx.quadraticCurveTo(x, y + ry * .9, x + rx * .65, y + ry * .35); ctx.stroke();
    ctx.restore();
  }
  function lips(ctx, x, y, w, h, color) {
    const g = ctx.createLinearGradient(x - w, y, x + w, y + h);
    g.addColorStop(0, color); g.addColorStop(.5, '#7c433d'); g.addColorStop(1, '#4f2b29');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * .4, y - h * .8, x, y - h * .2);
    ctx.quadraticCurveTo(x + w * .4, y - h * .8, x + w, y);
    ctx.quadraticCurveTo(x + w * .35, y + h, x, y + h * .35);
    ctx.quadraticCurveTo(x - w * .35, y + h, x - w, y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(46,25,22,.5)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(x - w * .9, y); ctx.quadraticCurveTo(x, y + h * .25, x + w * .9, y); ctx.stroke();
    ctx.fillStyle = 'rgba(238,207,181,.2)'; ctx.beginPath(); ctx.ellipse(x - w * .2, y + h * .35, w * .35, h * .18, 0, 0, 7); ctx.fill();
  }
  function hairStrands(ctx, x, y, w, h, color, seed, n = 18) {
    const rng = U.rng('hair-' + seed);
    for (let i = 0; i < n; i++) {
      const sx = x + (rng() - .5) * w, sy = y + (rng() - .5) * h;
      ctx.strokeStyle = color.replace('ALPHA', (.08 + rng() * .14).toFixed(3));
      ctx.lineWidth = .5 + rng() * 1.1;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + (rng() - .5) * 18, sy + 8 + rng() * 20, sx + (rng() - .5) * 10, sy + 22 + rng() * 30, sx + (rng() - .5) * 16, sy + 36 + rng() * 42);
      ctx.stroke();
    }
  }

  /* ============================================================
     RETRATOS
     ============================================================ */
  const portraits = {};
  C.portrait = function (kind) {
    if (portraits[kind]) return portraits[kind];
    const c = U.createCanvas(260, 320);
    const ctx = c.getContext('2d');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const seed = U.hashString(kind) % 1000;
    // fondo
    const bg = ctx.createLinearGradient(0, 0, 240, 320);
    if (kind === 'nadia') {
      bg.addColorStop(0, '#1d2a27'); bg.addColorStop(.55, '#0f1817'); bg.addColorStop(1, '#070d0d');
    } else if (kind === 'elias') {
      bg.addColorStop(0, '#2c2721'); bg.addColorStop(.5, '#171513'); bg.addColorStop(1, '#080909');
    } else {
      bg.addColorStop(0, '#26342f'); bg.addColorStop(.55, '#131d1b'); bg.addColorStop(1, '#070b0b');
    }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 260, 320);
    // ventana / foco de luz
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const light = ctx.createRadialGradient(kind === 'nadia' ? 60 : 195, 45, 5, 195, 130, 240);
    light.addColorStop(0, kind === 'nadia' ? 'rgba(137,171,155,.16)' : 'rgba(204,157,102,.2)');
    light.addColorStop(.4, 'rgba(113,142,131,.06)'); light.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = light; ctx.fillRect(0, 0, 260, 320); ctx.restore();
    const rng = U.rng('portrait-bg-' + seed);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(180,166,134,${rng() * .035})`;
      U.ellipse(ctx, rng() * 260, rng() * 260, 8 + rng() * 60, 2 + rng() * 14, rng() * 3); ctx.fill();
    }

    if (kind === 'nadia') drawNadiaPortrait(ctx);
    else if (kind === 'elias') drawEliasPortrait(ctx);
    else drawMaraPortrait(ctx);

    grade(ctx, 260, 320, seed);
    portraits[kind] = c.toDataURL('image/png');
    return portraits[kind];
  };

  function drawMaraPortrait(ctx) {
    const cx = 130;
    // hombros / abrigo
    ctx.fillStyle = '#1a231f';
    ctx.beginPath();
    ctx.moveTo(18, 320); ctx.bezierCurveTo(22, 258, 52, 232, 98, 222);
    ctx.lineTo(164, 222); ctx.bezierCurveTo(214, 235, 240, 265, 245, 320); ctx.closePath(); ctx.fill();
    const cg = ctx.createLinearGradient(0, 210, 260, 320);
    cg.addColorStop(0, '#45544b'); cg.addColorStop(.5, '#2c3832'); cg.addColorStop(1, '#141c18');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(26, 320); ctx.bezierCurveTo(34, 264, 68, 236, 102, 226); ctx.lineTo(160, 226);
    ctx.bezierCurveTo(204, 244, 228, 280, 236, 320); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = `rgba(${105 + i * 2},${117 + i},${100 + i},${.045 + i * .004})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(60 + i * 18, 250 + (i % 2) * 10); ctx.quadraticCurveTo(58 + i * 18, 285, 48 + i * 19, 320); ctx.stroke();
    }
    // cuello
    ctx.fillStyle = skinGradient(ctx, 95, 185, 70, 70, 'warm');
    ctx.beginPath(); ctx.moveTo(108, 190); ctx.lineTo(151, 190); ctx.lineTo(157, 239); ctx.quadraticCurveTo(130, 249, 102, 236); ctx.closePath(); ctx.fill();
    // bufanda
    const sg = ctx.createLinearGradient(70, 222, 196, 270);
    sg.addColorStop(0, '#673b38'); sg.addColorStop(.5, '#44282a'); sg.addColorStop(1, '#221719');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.moveTo(68, 232); ctx.quadraticCurveTo(128, 210, 194, 236); ctx.lineTo(201, 261); ctx.quadraticCurveTo(136, 241, 64, 263); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,18,19,.7)'; ctx.fillRect(146, 243, 32, 78);
    ctx.strokeStyle = 'rgba(184,135,111,.14)'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(78 + i * 17, 238); ctx.lineTo(82 + i * 17, 257); ctx.stroke(); }
    // cabeza
    const facePath = new Path2D();
    facePath.moveTo(cx - 42, 120);
    facePath.bezierCurveTo(cx - 46, 82, cx - 30, 67, cx, 66);
    facePath.bezierCurveTo(cx + 32, 67, cx + 46, 84, cx + 42, 121);
    facePath.bezierCurveTo(cx + 40, 154, cx + 27, 174, cx + 8, 184);
    facePath.bezierCurveTo(cx - 1, 189, cx - 13, 186, cx - 23, 177);
    facePath.bezierCurveTo(cx - 38, 162, cx - 43, 145, cx - 42, 120);
    facePath.closePath();
    ctx.fillStyle = skinGradient(ctx, 84, 67, 94, 122, 'warm');
    ctx.fill(facePath);
    ctx.save(); ctx.clip(facePath);
    // sombras del rostro
    const cheek = ctx.createRadialGradient(162, 133, 3, 157, 145, 55);
    cheek.addColorStop(0, 'rgba(86,57,43,.3)'); cheek.addColorStop(1, 'rgba(86,57,43,0)');
    ctx.fillStyle = cheek; ctx.fillRect(90, 60, 100, 140);
    const lightFace = ctx.createRadialGradient(104, 100, 2, 106, 122, 55);
    lightFace.addColorStop(0, 'rgba(238,209,169,.22)'); lightFace.addColorStop(1, 'rgba(238,209,169,0)');
    ctx.fillStyle = lightFace; ctx.fillRect(80, 55, 100, 140);
    // rubor
    ctx.fillStyle = 'rgba(144,68,59,.12)';
    U.ellipse(ctx, 104, 148, 16, 9, -.2); ctx.fill();
    U.ellipse(ctx, 160, 146, 14, 8, .2); ctx.fill();
    ctx.restore();
    // cejas
    ctx.strokeStyle = 'rgba(52,35,25,.8)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(98, 118); ctx.quadraticCurveTo(109, 112, 122, 117); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(143, 116); ctx.quadraticCurveTo(156, 110, 166, 116); ctx.stroke();
    // ojos
    eye(ctx, 110, 132, 10, 5.4, '#5f6b4a', .2);
    eye(ctx, 153, 131, 10, 5.4, '#5f6b4a', -.15);
    // nariz
    ctx.strokeStyle = 'rgba(92,59,43,.45)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(129, 133); ctx.quadraticCurveTo(126, 149, 132, 156); ctx.stroke();
    ctx.fillStyle = 'rgba(240,206,173,.14)'; ctx.beginPath(); ctx.arc(124, 152, 2, 0, 7); ctx.fill();
    // boca
    lips(ctx, 131, 169, 18, 6.5, '#8b554c');
    // mandíbula / barbilla
    ctx.fillStyle = 'rgba(79,51,39,.12)'; U.ellipse(ctx, 131, 181, 11, 4); ctx.fill();
    // pelo
    const hg = ctx.createLinearGradient(80, 65, 174, 170);
    hg.addColorStop(0, '#2b2722'); hg.addColorStop(.35, '#1a1815'); hg.addColorStop(.7, '#0d0d0c'); hg.addColorStop(1, '#191613');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(cx - 47, 129);
    ctx.bezierCurveTo(cx - 60, 90, cx - 48, 59, cx - 16, 48);
    ctx.bezierCurveTo(cx + 23, 37, cx + 61, 63, cx + 51, 111);
    ctx.bezierCurveTo(cx + 48, 126, cx + 43, 137, cx + 39, 140);
    ctx.bezierCurveTo(cx + 45, 113, cx + 34, 88, cx + 12, 83);
    ctx.bezierCurveTo(cx - 17, 77, cx - 35, 98, cx - 32, 128);
    ctx.bezierCurveTo(cx - 33, 144, cx - 40, 160, cx - 47, 168);
    ctx.closePath(); ctx.fill();
    // raya / mechones
    ctx.strokeStyle = 'rgba(118,105,87,.16)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.moveTo(cx - 30 + i * 11, 60 + (i % 3) * 4);
      ctx.bezierCurveTo(cx - 34 + i * 12, 85, cx - 43 + i * 11, 118, cx - 45 + i * 8, 150); ctx.stroke();
    }
    // moño bajo
    ctx.fillStyle = '#141311';
    U.ellipse(ctx, cx + 48, 137, 16, 23, -.4); ctx.fill();
    ctx.strokeStyle = 'rgba(125,112,90,.14)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.ellipse(cx + 48, 137, 6 + i * 2, 9 + i * 2.5, -.4, .3, 2.3); ctx.stroke();
    }
    hairStrands(ctx, cx - 5, 70, 75, 70, 'rgba(121,109,88,ALPHA)', 21, 12);
    // mechón sobre la mejilla
    ctx.strokeStyle = 'rgba(23,21,18,.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 39, 96); ctx.bezierCurveTo(cx - 46, 120, cx - 39, 145, cx - 31, 157); ctx.stroke();
    // iluminación
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const rim = ctx.createLinearGradient(84, 80, 116, 190);
    rim.addColorStop(0, 'rgba(235,200,151,.16)'); rim.addColorStop(1, 'rgba(235,200,151,0)');
    ctx.fillStyle = rim; ctx.fillRect(75, 60, 60, 140);
    ctx.restore();
    // pendiente pequeña
    ctx.fillStyle = 'rgba(156,117,62,.6)'; ctx.beginPath(); ctx.arc(173, 156, 2, 0, 7); ctx.fill();
  }

  function drawNadiaPortrait(ctx) {
    const cx = 132;
    // capucha amarilla
    ctx.save();
    const hood = ctx.createLinearGradient(38, 80, 225, 260);
    hood.addColorStop(0, '#767344'); hood.addColorStop(.25, '#a59554'); hood.addColorStop(.55, '#71673a'); hood.addColorStop(1, '#35331e');
    ctx.fillStyle = hood;
    ctx.beginPath();
    ctx.moveTo(28, 320); ctx.bezierCurveTo(34, 236, 54, 86, 75, 55);
    ctx.bezierCurveTo(102, 26, 178, 28, 197, 63);
    ctx.bezierCurveTo(216, 98, 224, 230, 232, 320); ctx.closePath(); ctx.fill();
    // interior de la capucha
    ctx.fillStyle = 'rgba(18,20,16,.72)';
    ctx.beginPath();
    ctx.moveTo(63, 320); ctx.bezierCurveTo(58, 190, 68, 91, 92, 67);
    ctx.bezierCurveTo(125, 46, 169, 53, 186, 82);
    ctx.bezierCurveTo(204, 113, 198, 220, 196, 320); ctx.closePath(); ctx.fill();
    // reflejos húmedos
    ctx.strokeStyle = 'rgba(214,206,164,.15)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 10; i++) {
      const x = 55 + i * 17;
      ctx.beginPath(); ctx.moveTo(x, 280 + (i % 3) * 10); ctx.quadraticCurveTo(x - 3, 180 - i * 4, x + 5, 90 + i * 2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(16,18,14,.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(57, 245); ctx.bezierCurveTo(52, 141, 75, 85, 97, 70); ctx.stroke();
    ctx.restore();
    // cuello / cara
    const facePath = new Path2D();
    facePath.moveTo(cx - 38, 117);
    facePath.bezierCurveTo(cx - 41, 79, cx - 22, 65, cx + 4, 65);
    facePath.bezierCurveTo(cx + 34, 66, cx + 43, 87, cx + 38, 123);
    facePath.bezierCurveTo(cx + 35, 156, cx + 23, 176, cx + 5, 184);
    facePath.bezierCurveTo(cx - 7, 189, cx - 22, 183, cx - 31, 172);
    facePath.bezierCurveTo(cx - 39, 159, cx - 40, 138, cx - 38, 117);
    facePath.closePath();
    ctx.fillStyle = skinGradient(ctx, 92, 65, 86, 122, 'pale');
    ctx.fill(facePath);
    ctx.save(); ctx.clip(facePath);
    const sh = ctx.createRadialGradient(166, 120, 5, 160, 145, 60);
    sh.addColorStop(0, 'rgba(55,44,36,.34)'); sh.addColorStop(1, 'rgba(55,44,36,0)');
    ctx.fillStyle = sh; ctx.fillRect(85, 55, 110, 145);
    // pecas / suciedad
    const rng = U.rng('nadia-freckles');
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(84,54,42,${.10 + rng() * .12})`;
      ctx.beginPath(); ctx.arc(110 + rng() * 34, 145 + rng() * 15, .5 + rng() * .8, 0, 7); ctx.fill();
    }
    // herida en la ceja
    ctx.strokeStyle = 'rgba(91,44,38,.65)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(153, 115); ctx.lineTo(160, 123); ctx.stroke();
    ctx.restore();
    // cejas
    ctx.strokeStyle = 'rgba(49,36,28,.82)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(101, 119); ctx.quadraticCurveTo(112, 114, 122, 119); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(142, 118); ctx.quadraticCurveTo(153, 112, 165, 118); ctx.stroke();
    // ojos
    eye(ctx, 111, 133, 9.5, 5, '#4d6460', .15);
    eye(ctx, 153, 132, 9.5, 5, '#4d6460', -.1);
    // ojeras
    ctx.strokeStyle = 'rgba(93,67,54,.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(101, 141); ctx.quadraticCurveTo(111, 147, 121, 140); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(144, 140); ctx.quadraticCurveTo(154, 146, 164, 140); ctx.stroke();
    // nariz / boca
    ctx.strokeStyle = 'rgba(98,64,49,.48)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(131, 135); ctx.quadraticCurveTo(128, 149, 134, 155); ctx.stroke();
    lips(ctx, 132, 168, 16, 6, '#8d5a51');
    ctx.strokeStyle = 'rgba(92,42,40,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(127, 174); ctx.lineTo(135, 175); ctx.stroke();
    // pelo mojado bajo la capucha
    ctx.fillStyle = '#211d18';
    ctx.beginPath(); ctx.moveTo(92, 120); ctx.bezierCurveTo(86, 86, 106, 63, 133, 63);
    ctx.bezierCurveTo(162, 62, 178, 83, 171, 111);
    ctx.bezierCurveTo(159, 90, 143, 85, 128, 88); ctx.bezierCurveTo(110, 91, 101, 103, 97, 128); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(24,21,17,.95)'; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const x = 95 + i * 11;
      ctx.beginPath(); ctx.moveTo(x, 92 + (i % 3) * 8); ctx.bezierCurveTo(x - 7, 120, x - 10, 150, x - 8, 178); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(209,198,158,.1)';
    for (let i = 0; i < 6; i++) { U.ellipse(ctx, 88 + i * 19, 87 + (i % 2) * 8, 1.4, 3, .2); ctx.fill(); }
    // gotas en la capucha
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = 'rgba(221,228,201,.18)';
      ctx.beginPath(); ctx.ellipse(55 + (i * 23) % 150, 50 + i * 16, 1.2, 2.5, .2, 0, 7); ctx.fill();
    }
  }

  function drawEliasPortrait(ctx) {
    const cx = 130;
    // jersey / hombros
    const cg = ctx.createLinearGradient(0, 220, 260, 320);
    cg.addColorStop(0, '#574b3d'); cg.addColorStop(.5, '#372f27'); cg.addColorStop(1, '#1b1815');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(15, 320); ctx.bezierCurveTo(25, 260, 65, 235, 102, 226); ctx.lineTo(162, 226);
    ctx.bezierCurveTo(208, 238, 238, 272, 245, 320); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(166,147,115,.08)'; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(20 + i * 19, 260); ctx.lineTo(15 + i * 20, 320); ctx.stroke(); }
    // cuello
    ctx.fillStyle = skinGradient(ctx, 98, 180, 64, 70, 'old');
    ctx.beginPath(); ctx.moveTo(111, 185); ctx.lineTo(150, 185); ctx.lineTo(156, 235); ctx.lineTo(104, 238); ctx.closePath(); ctx.fill();
    // cabeza
    const facePath = new Path2D();
    facePath.moveTo(cx - 41, 115);
    facePath.bezierCurveTo(cx - 44, 81, cx - 26, 64, cx + 1, 63);
    facePath.bezierCurveTo(cx + 33, 63, cx + 46, 82, cx + 41, 117);
    facePath.bezierCurveTo(cx + 40, 150, cx + 28, 171, cx + 7, 182);
    facePath.bezierCurveTo(cx - 10, 189, cx - 27, 183, cx - 35, 167);
    facePath.bezierCurveTo(cx - 42, 151, cx - 42, 132, cx - 41, 115);
    facePath.closePath();
    ctx.fillStyle = skinGradient(ctx, 88, 62, 86, 125, 'old');
    ctx.fill(facePath);
    ctx.save(); ctx.clip(facePath);
    const sh = ctx.createRadialGradient(163, 125, 4, 153, 146, 56);
    sh.addColorStop(0, 'rgba(55,40,32,.32)'); sh.addColorStop(1, 'rgba(55,40,32,0)');
    ctx.fillStyle = sh; ctx.fillRect(84, 55, 100, 140);
    // arrugas
    ctx.strokeStyle = 'rgba(74,54,42,.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(104, 108); ctx.quadraticCurveTo(114, 104, 123, 107); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(100, 148); ctx.quadraticCurveTo(110, 154, 120, 149); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(143, 148); ctx.quadraticCurveTo(154, 153, 163, 147); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(126, 81); ctx.quadraticCurveTo(132, 78, 138, 82); ctx.stroke();
    ctx.restore();
    // canas / pelo
    ctx.fillStyle = '#8e8980';
    ctx.beginPath();
    ctx.moveTo(cx - 44, 116); ctx.bezierCurveTo(cx - 56, 74, cx - 35, 51, cx + 1, 48);
    ctx.bezierCurveTo(cx + 35, 46, cx + 58, 67, cx + 48, 108);
    ctx.bezierCurveTo(cx + 46, 88, cx + 28, 73, cx + 3, 71);
    ctx.bezierCurveTo(cx - 21, 69, cx - 34, 84, cx - 36, 111); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(203,197,182,.16)'; ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(cx - 30 + i * 10, 58 + (i % 3) * 4); ctx.bezierCurveTo(cx - 24 + i * 10, 78, cx - 30 + i * 11, 94, cx - 25 + i * 10, 105); ctx.stroke(); }
    // cejas canosas
    ctx.strokeStyle = 'rgba(167,157,141,.65)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(95, 113); ctx.quadraticCurveTo(108, 106, 124, 112); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(142, 111); ctx.quadraticCurveTo(158, 105, 169, 112); ctx.stroke();
    // ojos bajo gafas
    eye(ctx, 108, 128, 9, 4.8, '#5e6558', .1);
    eye(ctx, 154, 127, 9, 4.8, '#5e6558', -.1);
    // gafas
    ctx.strokeStyle = 'rgba(177,160,124,.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(92, 116, 34, 24, 7) : ctx.rect(92, 116, 34, 24); ctx.stroke();
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(139, 115, 35, 24, 7) : ctx.rect(139, 115, 35, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(126, 124); ctx.lineTo(139, 123); ctx.stroke();
    ctx.fillStyle = 'rgba(154,172,159,.05)'; ctx.fillRect(94, 118, 30, 20); ctx.fillRect(141, 117, 31, 20);
    // nariz
    ctx.strokeStyle = 'rgba(87,59,46,.48)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(131, 130); ctx.quadraticCurveTo(127, 149, 133, 157); ctx.stroke();
    // barba
    ctx.fillStyle = 'rgba(139,132,121,.75)';
    ctx.beginPath();
    ctx.moveTo(94, 153); ctx.bezierCurveTo(92, 188, 112, 221, 132, 225);
    ctx.bezierCurveTo(157, 223, 175, 188, 167, 155);
    ctx.bezierCurveTo(160, 178, 148, 189, 131, 190);
    ctx.bezierCurveTo(112, 189, 102, 177, 94, 153); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(201,195,181,.18)'; ctx.lineWidth = .8;
    for (let i = 0; i < 14; i++) { const x = 98 + (i * 17) % 68; ctx.beginPath(); ctx.moveTo(x, 163 + (i % 4) * 5); ctx.quadraticCurveTo(x - 2, 180 + (i % 5) * 5, x + 2, 204); ctx.stroke(); }
    lips(ctx, 130, 166, 14, 4.5, '#78524b');
    // bigote
    ctx.fillStyle = 'rgba(142,134,121,.8)';
    ctx.beginPath(); ctx.moveTo(116, 159); ctx.quadraticCurveTo(130, 154, 146, 160); ctx.quadraticCurveTo(132, 163, 116, 159); ctx.fill();
    // auricular / luz de radio
    ctx.fillStyle = '#1c1e1a'; ctx.beginPath(); ctx.arc(174, 146, 8, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(190,169,128,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(174, 146, 5.5, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(28,30,25,.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(174, 154); ctx.bezierCurveTo(176, 178, 158, 196, 160, 224); ctx.stroke();
    // interferencia
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = `rgba(199,213,196,${.035 + (i % 3) * .018})`;
      ctx.fillRect(0, 40 + i * 22, 260, 1 + (i % 2));
    }
    ctx.restore();
  }

  /* ============================================================
     CUERPOS EN JUEGO
     ============================================================ */
  function bodyBase(ctx, x, y, aim, moving, phase, scale) {
    // devuelve información de orientación y balanceo
    const bob = moving ? Math.sin(phase * 2) * 1.4 : Math.sin(phase * .55) * .5;
    const lean = moving ? Math.sin(phase * 2 + Math.PI / 2) * .035 : 0;
    return { bob, lean, dx: Math.cos(aim), dy: Math.sin(aim) };
  }

  C.drawMara = function (ctx, x, y, o) {
    o = o || {};
    const aim = o.aim == null ? -Math.PI / 2 : o.aim;
    const moving = !!o.moving;
    const phase = o.phase || 0;
    const crouch = o.crouch ? .82 : 1;
    const torch = !!o.torch;
    const fuel = o.fuel == null ? 100 : o.fuel;
    const t = o.t || 0;
    const scale = o.scale || 1;
    const dx = Math.cos(aim), dy = Math.sin(aim);
    const side = dx >= 0 ? 1 : -1;
    const front = U.clamp(-dy * .7 + .3, 0, 1);
    const bob = (moving ? Math.sin(phase * 2) : Math.sin(t * 1.1)) * (moving ? 1.2 : .35);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    // sombra
    ctx.save();
    const sg = ctx.createRadialGradient(0, 9, 2, 0, 9, 25);
    sg.addColorStop(0, 'rgba(0,0,0,.45)'); sg.addColorStop(.65, 'rgba(0,0,0,.18)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    U.ellipse(ctx, 0, 10, 24, 8); ctx.fill();
    ctx.restore();
    // piernas
    const legSwing = moving ? Math.sin(phase * 2) * 4 : 0;
    ctx.strokeStyle = 'rgba(22,25,22,.95)'; ctx.lineCap = 'round';
    ctx.lineWidth = 5.4;
    ctx.beginPath(); ctx.moveTo(-5, 6); ctx.lineTo(-5 + legSwing * .5, 17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, 6); ctx.lineTo(5 - legSwing * .5, 17); ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(77,66,51,.7)';
    ctx.beginPath(); ctx.moveTo(-5 + legSwing * .5, 17); ctx.lineTo(-7 + legSwing * .7, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5 - legSwing * .5, 17); ctx.lineTo(7 - legSwing * .7, 20); ctx.stroke();
    ctx.translate(0, bob * crouch);
    // abrigo (vista superior en 3/4)
    const coatW = 23, coatH = 33;
    const grad = ctx.createLinearGradient(-coatW, -20, coatW, 14);
    grad.addColorStop(0, '#4d5b4f'); grad.addColorStop(.4, '#2f3b34'); grad.addColorStop(.75, '#1b211e'); grad.addColorStop(1, '#0e1210');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-coatW * .55, -18);
    ctx.bezierCurveTo(-coatW * 1.02, -8, -coatW * .95, 7, -coatW * .75, 13 + Math.sin(t * 2) * 1.2);
    ctx.lineTo(-coatW * .52, 15);
    ctx.lineTo(-coatW * .36, 12);
    ctx.lineTo(-3, 15);
    ctx.lineTo(5, 12);
    ctx.lineTo(coatW * .4, 15);
    ctx.lineTo(coatW * .56, 12);
    ctx.lineTo(coatW * .72, 14 + Math.sin(t * 2 + 1) * 1.2);
    ctx.bezierCurveTo(coatW * .94, 6, coatW * .98, -9, coatW * .55, -18);
    ctx.closePath(); ctx.fill();
    // pliegues
    ctx.strokeStyle = 'rgba(128,144,127,.12)'; ctx.lineWidth = .8;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(-12 + i * 6, -13);
      ctx.quadraticCurveTo(-17 + i * 7, 0, -15 + i * 7, 13); ctx.stroke();
    }
    // humedad / brillo
    ctx.fillStyle = 'rgba(173,190,172,.04)';
    ctx.beginPath(); ctx.ellipse(-8, -5, 9, 16, -.3, 0, 7); ctx.fill();
    // bufanda
    ctx.fillStyle = '#5b3533';
    ctx.beginPath(); ctx.ellipse(0, -20, 13, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#432426';
    ctx.beginPath(); ctx.moveTo(8, -19); ctx.quadraticCurveTo(18, -9, 12, 5); ctx.quadraticCurveTo(8, -5, 4, -18); ctx.fill();
    // brazos
    // brazo izquierdo
    const armSwing = moving ? Math.sin(phase * 2 + Math.PI) * 5 : 0;
    ctx.strokeStyle = '#28322d'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-coatW * .7, -12);
    ctx.quadraticCurveTo(-coatW * 1.0, -3, -coatW * .8 + armSwing * .3, 8); ctx.stroke();
    ctx.fillStyle = 'rgba(190,160,128,.55)';
    ctx.beginPath(); ctx.arc(-coatW * .8 + armSwing * .3, 9, 2.8, 0, 7); ctx.fill();
    // brazo derecho con antorcha
    const reach = 22 + Math.sin(t * 1.7) * .8;
    const hx = dx * reach, hy = dy * reach - 9;
    ctx.strokeStyle = '#2d382f'; ctx.lineWidth = 7.4;
    ctx.beginPath(); ctx.moveTo(coatW * .65, -13);
    ctx.quadraticCurveTo(dx * 12 + side * 8, dy * 5 - 14, hx, hy); ctx.stroke();
    ctx.strokeStyle = 'rgba(117,126,106,.16)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(coatW * .65, -15); ctx.quadraticCurveTo(dx * 13 + side * 6, dy * 5 - 16, hx - 2, hy - 2); ctx.stroke();
    // mano
    ctx.fillStyle = 'rgba(201,172,139,.8)';
    ctx.beginPath(); ctx.arc(hx, hy, 2.8, 0, 7); ctx.fill();
    // cabeza
    const headX = dx * 3.2, headY = -25 + dy * 1.4;
    // cuello
    ctx.fillStyle = 'rgba(159,126,96,.55)'; ctx.fillRect(-3 + headX * .4, -22 + headY * .1, 6, 4);
    const hg = ctx.createLinearGradient(headX - 10, headY - 10, headX + 10, headY + 10);
    hg.addColorStop(0, '#d3ad89'); hg.addColorStop(.55, '#ad8665'); hg.addColorStop(1, '#6d4e39');
    ctx.fillStyle = hg;
    U.ellipse(ctx, headX, headY, 9.4, 10.1, 0); ctx.fill();
    // pelo (según orientación)
    ctx.fillStyle = '#171713';
    ctx.beginPath();
    if (dy < -.25) {
      // de espaldas
      ctx.ellipse(headX, headY - 1, 9.8, 10.3, 0, 0, 7);
    } else {
      ctx.ellipse(headX, headY - 2.5, 9.6, 8.6, 0, Math.PI, Math.PI * 2);
      // flequillo
      ctx.beginPath(); ctx.ellipse(headX - 3.6, headY - 4.5, 5.4, 3.8, -.2, 0, 7); ctx.fill();
    }
    ctx.fill();
    // mechones
    ctx.strokeStyle = 'rgba(20,19,16,.9)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(headX - 8, headY - 1); ctx.quadraticCurveTo(headX - 13, headY + 5, headX - 9, headY + 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(headX + 8, headY - 2); ctx.quadraticCurveTo(headX + 12, headY + 4, headX + 8, headY + 9); ctx.stroke();
    // coleta
    ctx.fillStyle = '#161612';
    const tailX = -dx * 8, tailY = -dy * 3 + 4;
    U.ellipse(ctx, headX + tailX, headY + tailY, 4.4, 3.4, aim + .4); ctx.fill();
    // rasgos (solo si se ve la cara)
    if (front > .12) {
      ctx.globalAlpha = U.clamp(front * 1.3, 0, .9);
      ctx.fillStyle = 'rgba(40,27,20,.8)';
      const eyeOff = side * 2.2;
      ctx.beginPath(); ctx.arc(headX - 3.4 + eyeOff, headY + 1.2, .8, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(headX + 3.2 + eyeOff, headY + 1.2, .8, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(70,40,31,.6)'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(headX - 2.2 + eyeOff, headY + 4); ctx.lineTo(headX + 2.2 + eyeOff, headY + 4); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // antorcha en la mano
    if (torch) {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(aim + Math.PI / 2);
      // mango
      const mg = ctx.createLinearGradient(-3, 0, 3, 16);
      mg.addColorStop(0, '#a98852'); mg.addColorStop(.5, '#6f5233'); mg.addColorStop(1, '#38281a');
      ctx.fillStyle = mg; ctx.fillRect(-2.4, 0, 4.8, 17);
      ctx.fillStyle = '#c1a26a'; ctx.fillRect(-3.2, 0, 6.4, 2);
      // trapo embreado
      ctx.fillStyle = '#4b3320'; ctx.beginPath(); ctx.ellipse(0, -3, 4.2, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#6d4829'; ctx.beginPath(); ctx.ellipse(-1, -4, 2.6, 5.2, .3, 0, 7); ctx.fill();
      // llama
      const flick = .75 + Math.sin(t * 17 + 2) * .12 + Math.sin(t * 29) * .06;
      const fs = (fuel > 0 ? 1 : .25) * flick;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const fg = ctx.createRadialGradient(0, -14, 1, 0, -11, 20 * fs);
      fg.addColorStop(0, 'rgba(255,240,199,.95)'); fg.addColorStop(.25, 'rgba(255,204,128,.75)');
      fg.addColorStop(.55, 'rgba(240,139,65,.28)'); fg.addColorStop(1, 'rgba(198,74,26,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, -13, 20 * fs, 0, 7); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,231,176,.9)';
      ctx.beginPath(); ctx.moveTo(0, -19 * fs - 3);
      ctx.bezierCurveTo(5 * fs, -13, 3 * fs, -6, 0, -5);
      ctx.bezierCurveTo(-3 * fs, -6, -5 * fs, -13, 0, -19 * fs - 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,168,83,.75)';
      ctx.beginPath(); ctx.moveTo(0, -14 * fs - 2); ctx.bezierCurveTo(2.4, -10, 1.8, -6, 0, -5); ctx.bezierCurveTo(-1.8, -6, -2.4, -10, 0, -14 * fs - 2); ctx.fill();
      ctx.restore();
    } else if (!o.hideTorch) {
      // antorcha apagada, colgando
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(aim + Math.PI / 2);
      ctx.fillStyle = '#533d28'; ctx.fillRect(-2, 0, 4, 15);
      ctx.fillStyle = '#412c1b'; ctx.beginPath(); ctx.ellipse(0, -2, 3.2, 4.4, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  C.drawNadia = function (ctx, x, y, o) {
    o = o || {};
    const aim = o.aim == null ? Math.PI / 2 : o.aim;
    const t = o.t || 0;
    const crouch = o.crouch ? .86 : 1;
    const dx = Math.cos(aim), dy = Math.sin(aim);
    ctx.save();
    ctx.translate(x, y);
    // sombra
    const sg = ctx.createRadialGradient(0, 10, 2, 0, 10, 25);
    sg.addColorStop(0, 'rgba(0,0,0,.44)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; U.ellipse(ctx, 0, 10, 23, 8); ctx.fill();
    // piernas (botas amarillas)
    ctx.strokeStyle = 'rgba(24,26,19,.95)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-6, 17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(6, 17); ctx.stroke();
    ctx.strokeStyle = 'rgba(112,99,54,.8)'; ctx.lineWidth = 2.3;
    ctx.beginPath(); ctx.moveTo(-6, 17); ctx.lineTo(-7, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 17); ctx.lineTo(7, 20); ctx.stroke();
    ctx.translate(0, (Math.sin(t * 1.3) * .4) * crouch);
    // impermeable amarillo
    const g = ctx.createLinearGradient(-26, -23, 26, 15);
    g.addColorStop(0, '#b9a65b'); g.addColorStop(.25, '#8f8249'); g.addColorStop(.6, '#615b35'); g.addColorStop(1, '#2a2b1a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-23, -17);
    ctx.bezierCurveTo(-32, -7, -30, 6, -26, 14);
    ctx.lineTo(-14, 16); ctx.lineTo(-8, 12); ctx.lineTo(0, 16); ctx.lineTo(8, 12); ctx.lineTo(15, 16); ctx.lineTo(26, 14);
    ctx.bezierCurveTo(30, 5, 32, -8, 22, -17); ctx.closePath(); ctx.fill();
    // brillos de plástico mojado
    ctx.strokeStyle = 'rgba(225,217,166,.18)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-17 + i * 7, -13); ctx.quadraticCurveTo(-22 + i * 8, 0, -18 + i * 8, 12); ctx.stroke(); }
    ctx.fillStyle = 'rgba(236,226,171,.13)';
    ctx.beginPath(); ctx.ellipse(-9, -6, 6, 12, -.3, 0, 7); ctx.fill();
    // bolsillos
    ctx.strokeStyle = 'rgba(45,44,27,.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(-20, 1, 10, 7); ctx.strokeRect(10, 1, 10, 7);
    // capucha
    ctx.fillStyle = '#847a45';
    ctx.beginPath(); ctx.ellipse(0, -23, 14, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(36,35,23,.7)';
    U.ellipse(ctx, dx * 2, -23 + dy * 1.2, 9, 8); ctx.fill();
    // cara
    const hx = dx * 2.4, hy = -23 + dy * 1.5;
    ctx.fillStyle = 'rgba(205,178,147,.85)'; U.ellipse(ctx, hx, hy, 7.4, 8.2); ctx.fill();
    ctx.fillStyle = 'rgba(22,22,17,.85)';
    if (dy < -.3) U.ellipse(ctx, hx, hy - 1, 8, 8.5); else {
      ctx.beginPath(); ctx.ellipse(hx, hy - 2, 7.6, 6, 0, Math.PI, Math.PI * 2); ctx.fill();
    }
    if (dy > -.2) {
      ctx.fillStyle = 'rgba(44,29,22,.8)';
      ctx.beginPath(); ctx.arc(hx - 2.5, hy + .4, .65, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + 2.5, hy + .4, .65, 0, 7); ctx.fill();
    }
    // hombro y brazo
    ctx.strokeStyle = '#6e653b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const ax = dx * 18, ay = dy * 13 - 8;
    ctx.beginPath(); ctx.moveTo(16, -14); ctx.quadraticCurveTo(dx * 9 + 7, dy * 3 - 10, ax, ay); ctx.stroke();
    ctx.fillStyle = 'rgba(202,173,141,.75)'; ctx.beginPath(); ctx.arc(ax, ay, 2.2, 0, 7); ctx.fill();
    // linterna apagada
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(aim);
    ctx.fillStyle = '#31352b'; U.roundRect(ctx, 0, -2, 10, 4, 1.5); ctx.fill();
    ctx.fillStyle = 'rgba(178,190,157,.3)'; ctx.fillRect(9, -1.5, 2, 3);
    ctx.restore();
    // gotas
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = 'rgba(222,229,201,.2)';
      ctx.beginPath(); ctx.ellipse(-16 + i * 8, -10 + (i % 2) * 9, .8, 1.8, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
  };

  C.drawWatcher = function (ctx, x, y, o) {
    o = o || {};
    const t = o.t || 0;
    const alpha = o.alpha == null ? .75 : o.alpha;
    const scale = o.scale || 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    // sombra estirada
    const sg = ctx.createLinearGradient(0, 0, 0, 45);
    sg.addColorStop(0, 'rgba(0,0,0,.4)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(0, 12, 18, 34, 0, 0, 7); ctx.fill();
    // cuerpo largo
    const g = ctx.createLinearGradient(0, -38, 0, 12);
    g.addColorStop(0, 'rgba(15,19,18,.96)'); g.addColorStop(.55, 'rgba(6,9,9,.98)'); g.addColorStop(1, 'rgba(2,3,3,1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-9, -50);
    ctx.bezierCurveTo(-15, -34, -18, -12, -19, 10);
    ctx.lineTo(-9, 16); ctx.lineTo(-2, 10); ctx.lineTo(5, 16); ctx.lineTo(14, 9);
    ctx.bezierCurveTo(18, -12, 18, -34, 8, -50); ctx.closePath(); ctx.fill();
    // cabeza inclinada
    ctx.fillStyle = 'rgba(8,11,10,.98)';
    U.ellipse(ctx, 2 + Math.sin(t * .22) * 1.4, -54, 8.4, 10, .12); ctx.fill();
    // rostro vacío
    ctx.fillStyle = 'rgba(143,139,120,.1)';
    U.ellipse(ctx, 1, -55, 4.5, 6.2, .1); ctx.fill();
    // brazos demasiado largos
    ctx.strokeStyle = 'rgba(5,8,7,.96)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-8, -42); ctx.bezierCurveTo(-19, -26, -21, -8, -18, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -43); ctx.bezierCurveTo(17, -27, 20, -12, 18 + Math.sin(t * .4) * 2, 7); ctx.stroke();
    // goteo
    ctx.strokeStyle = 'rgba(144,161,149,.13)'; ctx.lineWidth = .7;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-5 + i * 6, -44); ctx.lineTo(-5 + i * 6, -36); ctx.stroke(); }
    ctx.restore();
  };

  // retrato de respaldo para documentos / créditos
  C.silhouette = function (ctx, x, y, alpha = .6) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#141a18';
    ctx.beginPath(); ctx.arc(x, y - 10, 8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 15, y + 15); ctx.quadraticCurveTo(x - 13, y - 2, x, y - 2); ctx.quadraticCurveTo(x + 13, y - 2, x + 15, y + 15); ctx.fill();
    ctx.restore();
  };
})();
