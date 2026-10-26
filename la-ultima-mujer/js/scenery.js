'use strict';
/* ============================================================
   Pintura de escenarios estáticos: suelos, muros, ventanas,
   decoración de pared y la calle de Puerto Niebla.
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U, Art = LM.Art, Tex = LM.Tex;
  const S = {};
  Art.Scenery = S;

  function floorTexture(floor, scene) {
    if (floor._tex) return floor._tex;
    let c;
    const seed = floor.seed || 1;
    switch (floor.type) {
      case 'wood':
        c = Tex.woodFloorCanvas(floor.w, floor.h, { variant: floor.variant || 'house', seed, boardH: floor.boardH });
        break;
      case 'tile':
        c = Tex.tileFloorCanvas(floor.w, floor.h, { variant: floor.variant || 'clinic', seed, size: floor.size });
        break;
      case 'concrete':
        c = Tex.concreteFloorCanvas(floor.w, floor.h, { seed, dark: floor.dark, joints: floor.joints });
        break;
      case 'asphalt':
        c = Tex.asphaltCanvas(floor.w, floor.h, { seed });
        break;
      case 'carpet':
        c = Tex.carpetCanvas(floor.w, floor.h, { seed, color: floor.color });
        break;
      case 'dirt':
        c = Tex.concreteFloorCanvas(floor.w, floor.h, { seed, dark: true });
        break;
      default:
        c = Tex.concreteFloorCanvas(floor.w, floor.h, { seed });
    }
    // capas de suciedad propias de la estancia
    const x = c.getContext('2d');
    const rng = U.rng('floor-details-' + scene.id + '-' + seed);
    if (floor.damp !== false) {
      for (let i = 0; i < 4 + (floor.w * floor.h / 220000); i++) {
        Tex.softStain(x, rng() * floor.w, rng() * floor.h, 30 + rng() * 120, 20 + rng() * 70, rng() > .6 ? '#111a17' : '#3a2d21', .05 + rng() * .08, rng() * 3);
      }
    }
    floor._tex = c;
    return c;
  }

  function wallShadow(ctx, wall) {
    const face = wall.face || 's';
    let x = wall.x, y = wall.y, w = wall.w, h = wall.h, depth = wall.shadowDepth || 24;
    if (face === 's') { y = wall.y + wall.h; h = depth; }
    else if (face === 'n') { y = wall.y - depth; h = depth; }
    else if (face === 'e') { x = wall.x + wall.w; w = depth; h = wall.h; }
    else { x = wall.x - depth; w = depth; h = wall.h; }
    const horiz = face === 's' || face === 'n';
    const g = horiz
      ? ctx.createLinearGradient(0, face === 's' ? y : y + h, 0, face === 's' ? y + h : y)
      : ctx.createLinearGradient(face === 'e' ? x : x + w, 0, face === 'e' ? x + w : x, 0);
    g.addColorStop(0, 'rgba(0,0,0,.55)');
    g.addColorStop(.35, 'rgba(0,0,0,.24)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  function wallFace(ctx, wall) {
    const face = wall.face || 's';
    const style = wall.style || 'plaster';
    let x, y, w, h;
    const b = 11;
    if (face === 's') { x = wall.x; y = wall.y + wall.h - b; w = wall.w; h = b; }
    else if (face === 'n') { x = wall.x; y = wall.y; w = wall.w; h = b; }
    else if (face === 'e') { x = wall.x + wall.w - b; y = wall.y; w = b; h = wall.h; }
    else { x = wall.x; y = wall.y; w = b; h = wall.h; }
    const tex = Tex.getWallFill(style, wall.seed || 1);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    // frente vertical del muro
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(0,0,0,.05)');
    g.addColorStop(1, 'rgba(0,0,0,.4)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    Art.fillTex(ctx, tex, x, y, w, h, .55);
    // zócalo
    ctx.fillStyle = 'rgba(27,23,18,.72)';
    if (face === 's') ctx.fillRect(x, y + h - 3.5, w, 3.5);
    else if (face === 'n') ctx.fillRect(x, y, w, 3.5);
    else if (face === 'e') ctx.fillRect(x + w - 3.5, y, 3.5, h);
    else ctx.fillRect(x, y, 3.5, h);
    ctx.restore();
  }

  function wallTop(ctx, wall) {
    const style = wall.style || 'plaster';
    const tex = Tex.getWallFill(style, (wall.seed || 1) + 3);
    ctx.save();
    ctx.beginPath();
    U.roundRect(ctx, wall.x, wall.y, wall.w, wall.h, 1);
    ctx.clip();
    ctx.fillStyle = wall.tint || (style === 'brick' ? '#493b31' : style === 'tile' || style === 'clinic' ? '#3c4541' : '#383b34');
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    Art.fillTex(ctx, tex, wall.x, wall.y, wall.w, wall.h, .5);
    // cenefa superior y desgaste
    ctx.fillStyle = 'rgba(200,193,172,.045)';
    ctx.fillRect(wall.x, wall.y, wall.w, 1.5);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(wall.x, wall.y + wall.h - 2, wall.w, 2);
    if (wall.pipes) {
      ctx.strokeStyle = 'rgba(70,60,46,.8)';
      ctx.lineWidth = 3;
      if (wall.w > wall.h) {
        const py = wall.y + wall.h * .35;
        ctx.beginPath(); ctx.moveTo(wall.x + 6, py); ctx.lineTo(wall.x + wall.w - 6, py); ctx.stroke();
        ctx.strokeStyle = 'rgba(157,146,119,.25)'; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.moveTo(wall.x + 6, py - 1); ctx.lineTo(wall.x + wall.w - 6, py - 1); ctx.stroke();
      } else {
        const px = wall.x + wall.w * .35;
        ctx.beginPath(); ctx.moveTo(px, wall.y + 6); ctx.lineTo(px, wall.y + wall.h - 6); ctx.stroke();
      }
    }
    ctx.restore();
  }

  S.drawWindows = function (ctx, scene) {
    for (const win of scene.windows || []) {
      drawWindow(ctx, win, scene);
    }
  };

  function drawWindow(ctx, w, scene) {
    const vertical = w.orientation === 'v';
    const x = w.x, y = w.y, ww = w.w, wh = w.h;
    ctx.save();
    // sombra proyectada sobre el suelo
    const shadowDir = w.side || 's';
    if (!vertical) {
      const g = ctx.createLinearGradient(0, y + wh + 8, 0, y + wh + 60);
      g.addColorStop(0, 'rgba(88,130,139,.11)');
      g.addColorStop(1, 'rgba(88,130,139,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 8, y + wh + 8, ww + 16, 55);
    }
    // marco
    ctx.fillStyle = w.frame || '#2d2a22';
    ctx.fillRect(x - 4, y - 4, ww + 8, wh + 8);
    ctx.fillStyle = '#474133';
    ctx.fillRect(x - 2, y - 2, ww + 4, wh + 4);
    // cristal
    const g = ctx.createLinearGradient(x, y, x + ww, y + wh);
    if (w.warm) {
      g.addColorStop(0, '#6c5635'); g.addColorStop(.4, '#b38a50'); g.addColorStop(.8, '#5b432b'); g.addColorStop(1, '#2e251b');
    } else {
      g.addColorStop(0, '#2d4145'); g.addColorStop(.45, '#557077'); g.addColorStop(.7, '#1d2c2f'); g.addColorStop(1, '#172223');
    }
    ctx.fillStyle = g;
    ctx.fillRect(x, y, ww, wh);
    // paisaje exterior / reflejo
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, ww, wh); ctx.clip();
    if (vertical) {
      const vg = ctx.createLinearGradient(x, y, x + ww, y);
      vg.addColorStop(0, 'rgba(150,180,181,.08)');
      vg.addColorStop(.5, 'rgba(12,20,21,.15)');
      vg.addColorStop(1, 'rgba(181,204,200,.12)');
      ctx.fillStyle = vg; ctx.fillRect(x, y, ww, wh);
    } else {
      // tejados y luces lejanas
      ctx.fillStyle = 'rgba(8,13,14,.55)';
      ctx.beginPath();
      ctx.moveTo(x, y + wh * .64);
      ctx.lineTo(x + ww * .18, y + wh * .48);
      ctx.lineTo(x + ww * .35, y + wh * .6);
      ctx.lineTo(x + ww * .56, y + wh * .43);
      ctx.lineTo(x + ww * .8, y + wh * .6);
      ctx.lineTo(x + ww, y + wh * .5);
      ctx.lineTo(x + ww, y + wh);
      ctx.lineTo(x, y + wh);
      ctx.closePath();
      ctx.fill();
      if (!w.warm) {
        ctx.fillStyle = 'rgba(218,168,96,.13)';
        const rng = U.rng('win-light-' + Math.round(x) + '-' + Math.round(y));
        for (let i = 0; i < 4; i++) ctx.fillRect(x + rng() * ww * .8, y + wh * (.55 + rng() * .3), 2 + rng() * 5, 1.5);
      }
    }
    // lluvia sobre el cristal
    const rng = U.rng('window-rain-' + Math.round(x) + '-' + Math.round(y) + (scene ? scene.id : ''));
    for (let i = 0; i < 18; i++) {
      const rx = x + rng() * ww, ry = y + rng() * wh;
      Art.wetStreak(ctx, rx, ry, 4 + rng() * 18, Math.PI / 2 + .08, .6 + rng() * .7, .11 + rng() * .14);
    }
    for (let i = 0; i < 12; i++) {
      const rx = x + rng() * ww, ry = y + rng() * wh;
      ctx.fillStyle = 'rgba(190,213,208,.18)';
      ctx.beginPath(); ctx.ellipse(rx, ry, .8 + rng() * 1.7, .7 + rng() * 1.4, 0, 0, 7); ctx.fill();
    }
    // reflejo interior
    ctx.fillStyle = 'rgba(213,224,214,.05)';
    ctx.beginPath();
    ctx.moveTo(x + ww * .08, y); ctx.lineTo(x + ww * .35, y); ctx.lineTo(x + ww * .06, y + wh); ctx.lineTo(x, y + wh);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // montantes
    ctx.fillStyle = w.frame || '#2c2921';
    if (vertical) {
      ctx.fillRect(x + ww * .48, y - 4, 4, wh + 8);
      ctx.fillRect(x - 4, y + wh * .3, ww + 8, 3);
      ctx.fillRect(x - 4, y + wh * .7, ww + 8, 3);
    } else {
      ctx.fillRect(x + ww * .5 - 2, y, 4, wh);
      ctx.fillRect(x, y + wh * .46, ww, 3);
    }
    // alféizar / cortina
    if (w.curtain) {
      ctx.fillStyle = 'rgba(126,118,91,.7)';
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 8);
      ctx.quadraticCurveTo(x + ww * .15, y + wh * .4, x + ww * .08, y + wh + 8);
      ctx.lineTo(x - 14, y + wh + 12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(31,29,23,.25)';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x - 7 + i * 4, y + 2, 1, wh - 2);
      }
    }
    // marco exterior + polvo
    ctx.strokeStyle = 'rgba(12,13,11,.8)'; ctx.lineWidth = 2;
    ctx.strokeRect(x - 4, y - 4, ww + 8, wh + 8);
    ctx.strokeStyle = 'rgba(186,170,133,.12)'; ctx.lineWidth = .7;
    ctx.strokeRect(x - 1, y - 1, ww + 2, wh + 2);
    ctx.restore();
  }

  function drawPhotoFrame(ctx, x, y, w, h, opts = {}) {
    const frame = opts.frame || '#3e3021';
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = frame;
    ctx.fillRect(x, y, w, h);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    // imagen
    const imgSrc = opts.photo && LM.Photos ? LM.Photos.url(opts.photo) : null;
    if (imgSrc && LM.Photos && LM.Photos.loaded) {
      const img = LM.Photos.image(opts.photo);
      if (img) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x + 4, y + 4, w - 8, h - 8); ctx.clip();
        ctx.drawImage(img, x + 4, y + 4, w - 8, h - 8);
        ctx.restore();
      }
    } else {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#6b6655'); g.addColorStop(.5, '#313731'); g.addColorStop(1, '#191e1b');
      ctx.fillStyle = g; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      ctx.fillStyle = 'rgba(184,173,150,.35)';
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * .44, w * .12, h * .17, 0, 0, 7); ctx.fill();
      ctx.fillRect(x + w * .28, y + h * .58, w * .44, h * .25);
    }
    // cristal / veladura
    const gl = ctx.createLinearGradient(x, y, x + w, y + h);
    gl.addColorStop(0, 'rgba(255,255,255,.08)');
    gl.addColorStop(.35, 'rgba(255,255,255,0)');
    gl.addColorStop(1, 'rgba(0,0,0,.24)');
    ctx.fillStyle = gl; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(211,193,155,.2)'; ctx.lineWidth = .7;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    // clavo
    ctx.fillStyle = 'rgba(12,11,9,.55)';
    ctx.beginPath(); ctx.arc(x + w / 2, y - 3, 1.2, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawClock(ctx, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * .46;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#2c2117';
    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, 7); ctx.fill();
    ctx.shadowColor = 'transparent';
    const g = ctx.createRadialGradient(cx - r * .25, cy - r * .3, 1, cx, cy, r);
    g.addColorStop(0, '#c8bfa7'); g.addColorStop(.65, '#9a9079'); g.addColorStop(1, '#5f5747');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a2e20'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    // marcas
    ctx.strokeStyle = 'rgba(42,37,29,.65)'; ctx.lineWidth = .7;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * .82, cy + Math.sin(a) * r * .82);
      ctx.lineTo(cx + Math.cos(a) * r * .92, cy + Math.sin(a) * r * .92);
      ctx.stroke();
    }
    // agujas 19:42
    const hourA = ((7 + 42 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    const minA = (42 / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#26221b'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(hourA) * r * .46, cy + Math.sin(hourA) * r * .46); ctx.stroke();
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(minA) * r * .68, cy + Math.sin(minA) * r * .68); ctx.stroke();
    ctx.fillStyle = '#3b2c1d'; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, 7); ctx.fill();
    // grieta
    ctx.strokeStyle = 'rgba(50,45,35,.25)'; ctx.lineWidth = .6;
    ctx.beginPath(); ctx.moveTo(cx - r * .7, cy - r * .3); ctx.lineTo(cx - r * .2, cy + r * .1); ctx.lineTo(cx + r * .55, cy - r * .5); ctx.stroke();
    ctx.restore();
  }

  function drawPoster(ctx, a) {
    const { x, y, w, h } = a;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a.rot || 0);
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
    ctx.fillStyle = a.paper || '#b9ad91';
    ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = 'transparent';
    const rng = U.rng('poster-' + x + y);
    for (let i = 0; i < 6; i++) Tex.softStain(ctx, rng() * w, rng() * h, 5 + rng() * 20, 3 + rng() * 12, '#5f4b32', .05 + rng() * .06);
    ctx.fillStyle = a.ink || '#3f382c';
    ctx.font = `600 ${Math.max(5, w * .11)}px Georgia`;
    ctx.textAlign = 'center';
    const title = (a.title || 'AVISO').toUpperCase();
    ctx.fillText(title, w / 2, h * .22, w - 8);
    ctx.fillStyle = 'rgba(50,43,33,.45)';
    const lines = a.lines || 6;
    for (let i = 0; i < lines; i++) {
      ctx.fillRect(w * .12, h * .35 + i * (h * .075), w * (.76 - (i % 3) * .13), 1);
    }
    if (a.stamp) {
      ctx.save();
      ctx.translate(w * .7, h * .8); ctx.rotate(-.2);
      ctx.strokeStyle = 'rgba(126,52,38,.55)'; ctx.lineWidth = 1.2;
      ctx.strokeRect(-w * .2, -h * .07, w * .4, h * .14);
      ctx.fillStyle = 'rgba(126,52,38,.55)'; ctx.font = `600 ${w * .07}px monospace`;
      ctx.fillText(a.stamp, 0, 2);
      ctx.restore();
    }
    Art.wetStreak(ctx, w * .2, 0, h, Math.PI / 2, .8, .06);
    ctx.strokeStyle = 'rgba(40,34,25,.18)'; ctx.strokeRect(.5, .5, w - 1, h - 1);
    ctx.restore();
  }

  function drawGraffiti(ctx, a) {
    const { x, y, w, h } = a;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a.rot || -.02);
    ctx.fillStyle = a.color || 'rgba(138,52,43,.55)';
    ctx.font = `${a.size || Math.min(h, 42)}px "Bahnschrift","Arial Narrow",sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(a.text || 'NO', 0, h / 2);
    // spray bleed
    const rng = U.rng('graf-' + x + y);
    for (let i = 0; i < 60; i++) {
      const px = rng() * w, py = rng() * h;
      ctx.fillStyle = a.color ? a.color.replace(/[\d.]+\)$/, (rng() * .25 + .03) + ')') : 'rgba(138,52,43,.2)';
      ctx.beginPath(); ctx.arc(px, py, .4 + rng() * 1.6, 0, 7); ctx.fill();
    }
    if (a.underline) {
      ctx.fillStyle = a.color || 'rgba(138,52,43,.5)';
      ctx.fillRect(0, h * .78, w * .8, 1.5);
    }
    ctx.restore();
  }

  function drawNoticeboard(ctx, a) {
    const { x, y, w, h } = a;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#3a2b1c';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#6d5a3e';
    ctx.fillRect(x, y, w, h);
    const rng = U.rng('board-' + x + y);
    for (let i = 0; i < 5; i++) Tex.softStain(ctx, x + rng() * w, y + rng() * h, 8 + rng() * 30, 5 + rng() * 18, '#3f2e1b', .08 + rng() * .08);
    for (let i = 0; i < 7; i++) {
      const pw = w * (.22 + rng() * .17), ph = h * (.2 + rng() * .24);
      const px = x + w * .06 + rng() * (w * .82), py = y + h * .08 + rng() * (h * .72);
      ctx.save();
      ctx.translate(px, py); ctx.rotate((rng() - .5) * .22);
      ctx.fillStyle = rng() > .4 ? '#cfc3a8' : '#a9b0a2';
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.fillStyle = 'rgba(52,46,36,.4)';
      for (let l = 0; l < 4; l++) ctx.fillRect(-pw * .35, -ph * .25 + l * ph * .14, pw * .7, .8);
      if (rng() > .5) {
        ctx.strokeStyle = 'rgba(114,49,39,.6)'; ctx.lineWidth = 1.7;
        ctx.beginPath(); ctx.arc(0, -ph * .27, 1.5, 0, 7); ctx.stroke();
      }
      ctx.restore();
    }
    // hilos rojos
    ctx.strokeStyle = 'rgba(123,48,38,.45)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(x + w * .2, y + h * .3); ctx.lineTo(x + w * .5, y + h * .5); ctx.lineTo(x + w * .75, y + h * .35); ctx.stroke();
    ctx.restore();
  }

  function drawMirror(ctx, a) {
    const { x, y, w, h } = a;
    ctx.save();
    ctx.fillStyle = '#3b3428';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#7b8782'); g.addColorStop(.35, '#9ea8a0'); g.addColorStop(.55, '#4e5a56'); g.addColorStop(1, '#202a28');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    // reflejo borroso
    ctx.fillStyle = 'rgba(20,27,25,.35)';
    ctx.beginPath();
    ctx.moveTo(x + w * .2, y + h); ctx.lineTo(x + w * .45, y + h * .3); ctx.lineTo(x + w * .62, y + h * .3); ctx.lineTo(x + w * .8, y + h);
    ctx.closePath(); ctx.fill();
    // manchas y grieta
    const rng = U.rng('mirror-' + x + y);
    for (let i = 0; i < 8; i++) Tex.softStain(ctx, x + rng() * w, y + rng() * h, 3 + rng() * 16, 2 + rng() * 9, '#1c2420', .1 + rng() * .2);
    ctx.strokeStyle = 'rgba(220,230,220,.22)'; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.moveTo(x + w * .1, y + h * .7); ctx.lineTo(x + w * .45, y + h * .35); ctx.lineTo(x + w * .55, y + h * .62); ctx.lineTo(x + w * .92, y + h * .25); ctx.stroke();
    ctx.strokeStyle = 'rgba(15,20,18,.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    ctx.restore();
  }

  function drawChildMarks(ctx, a) {
    const { x, y, h } = a;
    ctx.save();
    ctx.strokeStyle = 'rgba(52,47,37,.55)'; ctx.lineWidth = .7;
    ctx.fillStyle = 'rgba(52,47,37,.62)';
    ctx.font = '5px "Courier New",monospace';
    const rng = U.rng('marks-' + x + y);
    for (let i = 0; i < 6; i++) {
      const yy = y + i * 7;
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 10 + rng() * 8, yy); ctx.stroke();
      ctx.fillText(2016 + i, x + 18, yy + 2);
    }
    ctx.fillText(a.name || 'IRENE', x + 2, y - 5);
    ctx.restore();
  }

  function drawShelfWall(ctx, a) {
    const { x, y, w, h } = a;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y + h, w, 5);
    ctx.fillStyle = '#473325'; ctx.fillRect(x, y + h - 4, w, 4);
    ctx.fillStyle = 'rgba(165,139,99,.18)'; ctx.fillRect(x, y + h - 5, w, 1);
    const rng = U.rng('wallshelf-' + x + y);
    for (let i = 0; i < 5; i++) {
      Art.bottle(ctx, x + 6 + i * (w / 6) + rng() * 3, y + h - 4 - (10 + rng() * 8), 5 + rng() * 3, 10 + rng() * 8, ['rgba(70,96,76,.65)', 'rgba(100,81,53,.7)', 'rgba(70,77,86,.65)'][i % 3]);
    }
    ctx.restore();
  }

  S.drawWallArt = function (ctx, a) {
    switch (a.type) {
      case 'photo':
        drawPhotoFrame(ctx, a.x, a.y, a.w, a.h, a);
        break;
      case 'photos': {
        const gap = a.gap || 7;
        const cols = a.cols || 3;
        const pw = (a.w - gap * (cols - 1)) / cols;
        const ph = a.h;
        (a.items || []).forEach((item, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          drawPhotoFrame(ctx, a.x + col * (pw + gap), a.y + row * (ph + gap), pw, ph, item);
        });
        break;
      }
      case 'clock': drawClock(ctx, a.x, a.y, a.w, a.h); break;
      case 'poster': drawPoster(ctx, a); break;
      case 'graffiti': drawGraffiti(ctx, a); break;
      case 'notice': drawNoticeboard(ctx, a); break;
      case 'mirror': drawMirror(ctx, a); break;
      case 'childmarks': drawChildMarks(ctx, a); break;
      case 'wallshelf': drawShelfWall(ctx, a); break;
      case 'vent':
        ctx.save();
        ctx.fillStyle = '#33352f'; ctx.fillRect(a.x, a.y, a.w, a.h);
        ctx.strokeStyle = 'rgba(177,171,149,.15)'; ctx.lineWidth = .7;
        for (let i = 4; i < a.h - 2; i += 4) { ctx.beginPath(); ctx.moveTo(a.x + 3, a.y + i); ctx.lineTo(a.x + a.w - 3, a.y + i); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(15,17,15,.5)'; ctx.strokeRect(a.x + .5, a.y + .5, a.w - 1, a.h - 1);
        ctx.restore();
        break;
      case 'sign': {
        ctx.save();
        ctx.translate(a.x, a.y); ctx.rotate(a.rot || 0);
        ctx.fillStyle = a.bg || 'rgba(28,34,32,.8)';
        ctx.fillRect(0, 0, a.w, a.h);
        ctx.strokeStyle = 'rgba(199,187,156,.22)'; ctx.lineWidth = .8;
        ctx.strokeRect(1.5, 1.5, a.w - 3, a.h - 3);
        ctx.fillStyle = a.color || 'rgba(218,209,186,.72)';
        ctx.font = `${a.font || 7}px "Bahnschrift","Arial Narrow",sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((a.text || '').toUpperCase(), a.w / 2, a.h / 2, a.w - 6);
        ctx.restore();
        break;
      }
      case 'light':
        ctx.save();
        ctx.shadowColor = 'rgba(202,220,196,.35)'; ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(146,154,134,.22)';
        ctx.fillRect(a.x, a.y, a.w, a.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(234,240,221,.45)';
        ctx.fillRect(a.x + 4, a.y + 2, a.w - 8, 1.4);
        ctx.strokeStyle = 'rgba(48,50,43,.7)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(a.x, a.y, a.w, a.h);
        ctx.restore();
        break;
      case 'drawing': {
        ctx.save();
        ctx.translate(a.x, a.y); ctx.rotate(a.rot || -.02);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(2, 3, a.w, a.h);
        ctx.fillStyle = '#c8bfa6'; ctx.fillRect(0, 0, a.w, a.h);
        ctx.strokeStyle = 'rgba(61,52,38,.35)'; ctx.lineWidth = .7;
        // casa, figuras y símbolos
        ctx.strokeRect(a.w * .2, a.h * .35, a.w * .35, a.h * .3);
        ctx.beginPath(); ctx.moveTo(a.w * .17, a.h * .35); ctx.lineTo(a.w * .37, a.h * .16); ctx.lineTo(a.w * .58, a.h * .35); ctx.stroke();
        ctx.fillStyle = 'rgba(150,90,50,.35)';
        ctx.beginPath(); ctx.arc(a.w * .37, a.h * .42, a.w * .035, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(77,90,70,.35)';
        ctx.beginPath(); ctx.moveTo(a.w * .72, a.h * .2); ctx.arc(a.w * .7, a.h * .2, a.w * .08, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.w * .3, a.h * .78); ctx.lineTo(a.w * .45, a.h * .65); ctx.lineTo(a.w * .6, a.h * .78); ctx.stroke();
        ctx.fillStyle = 'rgba(61,52,38,.45)';
        ctx.font = `${a.font || 6}px "Segoe Script","Bradley Hand",cursive`;
        ctx.fillText(a.caption || 'irene', a.w * .12, a.h * .94);
        ctx.restore();
        break;
      }
      default:
        break;
    }
  };

  S.drawDoorFrame = function (ctx, door) {
    const horizontal = door.orientation !== 'v';
    ctx.save();
    if (horizontal) {
      // umbral
      ctx.fillStyle = 'rgba(27,25,20,.85)';
      ctx.fillRect(door.x, door.y + door.h - 5, door.w, 5);
      ctx.fillStyle = 'rgba(200,183,145,.09)';
      ctx.fillRect(door.x, door.y + door.h - 5, door.w, 1);
      // jambas
      ctx.fillStyle = 'rgba(42,33,24,.8)';
      ctx.fillRect(door.x - 4, door.y - 2, 5, door.h + 5);
      ctx.fillRect(door.x + door.w - 1, door.y - 2, 5, door.h + 5);
      // placa
      if (door.plaque) {
        ctx.fillStyle = 'rgba(25,29,26,.75)';
        ctx.fillRect(door.x + door.w / 2 - 24, door.y - 11, 48, 13);
        ctx.strokeStyle = 'rgba(205,192,158,.15)'; ctx.lineWidth = .6;
        ctx.strokeRect(door.x + door.w / 2 - 23.5, door.y - 10.5, 47, 12);
        ctx.fillStyle = 'rgba(214,204,180,.65)';
        ctx.font = '6px "Bahnschrift",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(door.plaque.toUpperCase(), door.x + door.w / 2, door.y - 5);
      }
    } else {
      ctx.fillStyle = 'rgba(27,25,20,.85)';
      ctx.fillRect(door.x + door.w - 5, door.y, 5, door.h);
      ctx.fillStyle = 'rgba(42,33,24,.8)';
      ctx.fillRect(door.x - 2, door.y - 4, door.w + 5, 5);
      ctx.fillRect(door.x - 2, door.y + door.h - 1, door.w + 5, 5);
    }
    ctx.restore();
  };

  S.renderStatic = function (scene) {
    const c = U.createCanvas(scene.w, scene.h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = scene.voidColor || '#040707';
    ctx.fillRect(0, 0, scene.w, scene.h);
    if (scene.custom === 'street') {
      paintStreet(ctx, scene);
      scene._bg = c;
      return c;
    }
    // suelos
    for (const floor of scene.floors || []) {
      const tex = floorTexture(floor, scene);
      ctx.save();
      ctx.beginPath();
      U.roundRect(ctx, floor.x, floor.y, floor.w, floor.h, floor.radius || 0);
      ctx.clip();
      ctx.drawImage(tex, floor.x, floor.y, floor.w, floor.h);
      if (floor.tint) {
        ctx.fillStyle = floor.tint;
        ctx.fillRect(floor.x, floor.y, floor.w, floor.h);
      }
      ctx.restore();
      // sombra de unión con el muro
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,.32)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(floor.x + .5, floor.y + .5, floor.w - 1, floor.h - 1);
      ctx.restore();
    }
    // junquillos y puertas: umbrales
    for (const door of scene.doors || []) S.drawDoorFrame(ctx, door);
    // objetos a nivel de suelo
    for (const fp of scene.floorProps || []) {
      if (LM.Props && LM.Props.drawFloor) LM.Props.drawFloor(ctx, fp);
    }
    // decoración de suelo definida a mano
    for (const d of scene.floorDetails || []) {
      switch (d.type) {
        case 'puddle':
          drawPuddle(ctx, d);
          break;
        case 'paper':
          Art.paperSheet(ctx, d.x, d.y, d.w || 15, d.h || 20, d.rot || 0, { color: d.color });
          break;
        case 'debris':
          drawDebris(ctx, d);
          break;
        case 'leaves':
          drawLeaves(ctx, d);
          break;
        case 'moss':
          Art.moss(ctx, d.x, d.y, d.w, d.h, d.alpha || .3, d.seed || 1);
          break;
        case 'threshold':
          ctx.fillStyle = 'rgba(30,27,21,.55)';
          ctx.fillRect(d.x, d.y, d.w, d.h || 3);
          break;
        case 'chalk':
          drawChalk(ctx, d);
          break;
        case 'stain':
          Tex.softStain(ctx, d.x, d.y, d.rx || 40, d.ry || 20, d.color || '#21140f', d.alpha || .12, d.rot || 0);
          break;
        case 'footprints':
          drawFootprints(ctx, d);
          break;
        default: break;
      }
    }
    // sombras de muro sobre el suelo
    for (const wall of scene.walls || []) wallShadow(ctx, wall);
    // muros
    for (const wall of scene.walls || []) {
      wallTop(ctx, wall);
      wallFace(ctx, wall);
      if (wall.footprints !== false) {
        const face = wall.face || 's';
        const horiz = face === 's' || face === 'n';
        const g = ctx.createLinearGradient(
          horiz ? 0 : (face === 'e' ? wall.x + wall.w : wall.x),
          horiz ? (face === 's' ? wall.y + wall.h : wall.y) : 0,
          horiz ? 0 : (face === 'e' ? wall.x + wall.w + 12 : wall.x - 12),
          horiz ? (face === 's' ? wall.y + wall.h + 12 : wall.y - 12) : 0
        );
        g.addColorStop(0, 'rgba(0,0,0,.25)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        if (face === 's') ctx.fillRect(wall.x, wall.y + wall.h, wall.w, 12);
        else if (face === 'n') ctx.fillRect(wall.x, wall.y - 12, wall.w, 12);
        else if (face === 'e') ctx.fillRect(wall.x + wall.w, wall.y, 12, wall.h);
        else ctx.fillRect(wall.x - 12, wall.y, 12, wall.h);
      }
    }
    // esquinas sucias / humedad
    for (const corner of scene.corners || []) {
      const rng = U.rng('corner-' + corner.x + corner.y);
      for (let i = 0; i < 6; i++) Tex.softStain(ctx, corner.x + (rng() - .5) * 26, corner.y + (rng() - .5) * 26, 15 + rng() * 40, 8 + rng() * 22, rng() > .5 ? '#131b17' : '#3d3526', .1 + rng() * .11);
      Art.moss(ctx, corner.x - 16, corner.y - 16, 32, 32, .22, corner.x);
    }
    // ventanas y decoración de pared
    S.drawWindows(ctx, scene);
    for (const a of scene.wallArt || []) S.drawWallArt(ctx, a);
    // objetos pintados sobre el suelo con luz exterior, manchas finales
    for (const d of scene.overlays || []) {
      if (d.type === 'lightpool') {
        const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        g.addColorStop(0, d.color || 'rgba(91,126,135,.18)');
        g.addColorStop(1, 'rgba(91,126,135,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
      } else if (d.type === 'grime') {
        Art.grimeEdge(ctx, d.x, d.y, d.w, d.h, d.side || 'top', d.depth || 20, d.color || 'rgba(10,14,12,.32)', d.seed || 1);
      } else if (d.type === 'text') {
        ctx.save();
        ctx.translate(d.x, d.y); ctx.rotate(d.rot || 0);
        ctx.fillStyle = d.color || 'rgba(190,178,150,.13)';
        ctx.font = `${d.size || 20}px ${d.font || 'Georgia'}`;
        ctx.textAlign = 'center';
        ctx.fillText(d.text, 0, 0);
        ctx.restore();
      }
    }
    scene._bg = c;
    return c;
  };

  function drawPuddle(ctx, p) {
    const rng = U.rng('puddle-' + p.x + '-' + p.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, p.ry ? p.ry / p.rx : .42);
    const g = ctx.createRadialGradient(0, 0, p.rx * .1, 0, 0, p.rx);
    g.addColorStop(0, 'rgba(14,24,26,.55)');
    g.addColorStop(.7, 'rgba(11,19,20,.36)');
    g.addColorStop(1, 'rgba(8,14,15,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, p.rx, 0, 7); ctx.fill();
    // brillos de agua
    ctx.strokeStyle = 'rgba(145,178,176,.16)'; ctx.lineWidth = .7;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.rx * .7, p.rx * .7, .1, .2, .9);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-p.rx * .2, p.rx * .2, p.rx * .35, p.rx * .35, -.2, .1, 1.4);
    ctx.stroke();
    if (p.rain) {
      for (let i = 0; i < 3; i++) {
        const rr = ((Date.now() / 1000) + i) % 3 / 3;
        ctx.strokeStyle = `rgba(181,204,198,${.14 * (1 - rr)})`;
        ctx.beginPath(); ctx.ellipse(0, 0, p.rx * rr * .5, p.rx * rr * .5, 0, 0, 7); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawDebris(ctx, d) {
    const rng = U.rng('debris-' + d.x + '-' + d.y);
    ctx.save();
    for (let i = 0; i < (d.n || 18); i++) {
      const x = d.x + (rng() - .5) * d.w, y = d.y + (rng() - .5) * d.h;
      const t = rng();
      if (t > .7) {
        ctx.fillStyle = 'rgba(51,55,47,.65)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 + rng() * 4, y + 1); ctx.lineTo(x + 1, y + 2 + rng() * 3); ctx.closePath(); ctx.fill();
      } else if (t > .4) {
        Art.glassShard(ctx, x, y, 2 + rng() * 5, rng() * 6);
      } else {
        ctx.strokeStyle = 'rgba(147,133,105,.2)'; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3 + rng() * 6, y + rng() * 3); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawLeaves(ctx, d) {
    const rng = U.rng('leaves-' + d.x + '-' + d.y);
    for (let i = 0; i < (d.n || 30); i++) {
      const x = d.x + (rng() - .5) * d.w, y = d.y + (rng() - .5) * d.h;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rng() * 6);
      ctx.fillStyle = `rgba(${48 + rng() * 35 | 0},${47 + rng() * 28 | 0},${28 + rng() * 15 | 0},${.25 + rng() * .4})`;
      ctx.beginPath(); ctx.ellipse(0, 0, 1 + rng() * 2.3, .5 + rng() * 1.2, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  }

  function drawChalk(ctx, d) {
    ctx.save();
    ctx.strokeStyle = d.color || 'rgba(216,211,189,.25)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    if (d.pts && d.pts.length) {
      ctx.beginPath();
      for (let i = 0; i < d.pts.length; i++) {
        const p = d.pts[i];
        i ? ctx.lineTo(d.x + p[0], d.y + p[1]) : ctx.moveTo(d.x + p[0], d.y + p[1]);
      }
      ctx.stroke();
    } else {
      // Marcas sueltas: trazos cortos e irregulares, como tiza gastada.
      const rng = U.rng('chalk-' + d.x + '-' + d.y);
      const n = d.n || 3;
      for (let i = 0; i < n; i++) {
        const ox = d.x + (rng() - .5) * 26;
        const oy = d.y + (rng() - .5) * 16;
        const len = 7 + rng() * 16;
        const ang = -1.1 + rng() * 2.2;
        const bend = (rng() - .5) * 5;
        ctx.globalAlpha = .55 + rng() * .45;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo(
          ox + Math.cos(ang) * len * .5 + bend,
          oy + Math.sin(ang) * len * .5 - bend,
          ox + Math.cos(ang) * len,
          oy + Math.sin(ang) * len + (rng() - .5) * 3
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawFootprints(ctx, d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle || 0);
    ctx.fillStyle = d.color || 'rgba(59,72,68,.35)';
    for (let i = 0; i < (d.n || 7); i++) {
      const side = i % 2 ? 1 : -1;
      const x = i * (d.step || 28);
      const y = side * 6;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(side * .14);
      ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 8, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -8, 2, 2.4, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  S.drawFootprints = drawFootprints;
  S.drawPuddle = drawPuddle;

  /* ============================================================
     CALLE ALHELÍ — fachadas, asfalto mojado y horizonte
     ============================================================ */
  function paintStreet(ctx, scene) {
    const W = scene.w, H = scene.h;
    const R = scene.street;
    const rng = U.rng('street-' + scene.id);
    // cielo y niebla
    const sky = ctx.createLinearGradient(0, 0, 0, 260);
    sky.addColorStop(0, '#0a1013');
    sky.addColorStop(.55, '#182326');
    sky.addColorStop(1, '#111b1d');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 380);
    // nubes bajas
    for (let i = 0; i < 16; i++) {
      Tex.softStain(ctx, rng() * W, 30 + rng() * 150, 120 + rng() * 380, 30 + rng() * 70, rng() > .5 ? '#2c3a3b' : '#10181a', .04 + rng() * .08);
    }
    // skyline lejano
    ctx.fillStyle = 'rgba(9,15,16,.85)';
    let bx = 0;
    while (bx < W) {
      const bw = 80 + rng() * 180;
      const bh = 35 + rng() * 95;
      ctx.fillRect(bx, 300 - bh, bw, bh);
      bx += bw + 8 + rng() * 40;
    }
    // torre de radio lejana
    drawRadioTower(ctx, W - 300, 0, 250, 300);
    // cableado
    ctx.strokeStyle = 'rgba(4,7,8,.6)'; ctx.lineWidth = .8;
    for (let i = 0; i < 6; i++) {
      const y0 = 203 + i * 8;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.bezierCurveTo(W * .3, y0 + 24, W * .65, y0 - 8, W, y0 + 18);
      ctx.stroke();
    }
    // asfalto / acera base
    ctx.fillStyle = '#252723';
    ctx.fillRect(0, 430, W, H - 430);
    // acera norte
    const sidewalk = Tex.tileFloorCanvas(W, 120, { variant: 'basement', seed: 42, size: 64 });
    ctx.save(); ctx.beginPath(); ctx.rect(0, 430, W, 120); ctx.clip(); ctx.drawImage(sidewalk, 0, 430, W, 120); ctx.restore();
    // asfalto
    const asp = Tex.asphaltCanvas(W, 370, { seed: 11 });
    ctx.save(); ctx.beginPath(); ctx.rect(0, 548, W, 332); ctx.clip(); ctx.drawImage(asp, 0, 548, W, 370); ctx.restore();
    // acera sur
    ctx.save(); ctx.beginPath(); ctx.rect(0, 878, W, H - 878); ctx.clip();
    const sidewalk2 = Tex.tileFloorCanvas(W, H - 878, { variant: 'basement', seed: 77, size: 64 });
    ctx.drawImage(sidewalk2, 0, 878, W, H - 878);
    ctx.restore();
    // bordillos
    ctx.fillStyle = 'rgba(133,131,113,.25)'; ctx.fillRect(0, 542, W, 7);
    ctx.fillStyle = 'rgba(9,12,11,.5)'; ctx.fillRect(0, 549, W, 3);
    ctx.fillStyle = 'rgba(133,131,113,.22)'; ctx.fillRect(0, 872, W, 7);
    ctx.fillStyle = 'rgba(9,12,11,.5)'; ctx.fillRect(0, 875, W, 3);
    // líneas viales
    ctx.strokeStyle = 'rgba(196,187,158,.16)';
    ctx.lineWidth = 3;
    ctx.setLineDash([34, 46]);
    ctx.beginPath(); ctx.moveTo(0, 714); ctx.lineTo(W, 714); ctx.stroke();
    ctx.setLineDash([]);
    // paso de cebra a la clínica
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = 'rgba(197,190,164,.12)';
      ctx.fillRect(210 + i * 42, 566, 22, 56);
    }
    // tapas de alcantarilla
    drawManhole(ctx, 780, 760, 19);
    drawManhole(ctx, 1560, 685, 15);
    // puestas de sol / luces de farola reflejadas en asfalto
    for (let i = 0; i < 18; i++) {
      const x = rng() * W, y = 560 + rng() * 310;
      drawPuddle(ctx, { x, y, rx: 20 + rng() * 90, ry: 8 + rng() * 26, alpha: .2 });
      if (rng() > .5) {
        const g = ctx.createLinearGradient(x, y - 4, x, y + 32);
        g.addColorStop(0, 'rgba(189,141,85,.12)');
        g.addColorStop(1, 'rgba(189,141,85,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 12, y, 24, 34);
      }
    }
    // huellas húmedas hacia la casa 14
    drawFootprints(ctx, { x: 1460, y: 492, n: 13, step: 32, angle: Math.PI, color: 'rgba(35,47,45,.34)', bare: true });
    drawFootprints(ctx, { x: 1220, y: 600, n: 8, step: 34, angle: Math.PI * 1.12, color: 'rgba(35,47,45,.2)' });
    // sombra de los edificios sobre la acera
    const sg = ctx.createLinearGradient(0, 430, 0, 548);
    sg.addColorStop(0, 'rgba(0,0,0,.52)');
    sg.addColorStop(.7, 'rgba(0,0,0,.14)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 430, W, 118);
    // fachadas
    for (const b of scene.buildings || []) drawBuilding(ctx, b, scene);
    // acera sucia
    for (let i = 0; i < 40; i++) {
      Tex.softStain(ctx, rng() * W, 430 + rng() * 120, 10 + rng() * 50, 5 + rng() * 22, rng() > .5 ? '#121815' : '#3e3a30', .03 + rng() * .06);
    }
    Art.grimeEdge(ctx, 0, 430, W, 120, 'top', 50, 'rgba(4,7,8,.5)', 3);
    // barro y hierba en el borde inferior
    for (let i = 0; i < 100; i++) {
      const x = rng() * W, y = 1010 + rng() * 76;
      ctx.strokeStyle = `rgba(${35 + rng() * 30 | 0},${48 + rng() * 30 | 0},${30 + rng() * 20 | 0},${.16 + rng() * .25})`;
      ctx.lineWidth = .6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + rng() * 8 - 4, y - 10 - rng() * 20, x + rng() * 14 - 7, y - 20 - rng() * 18); ctx.stroke();
    }
    // cartel de calle
    drawStreetSign(ctx, 74, 410, 'CALLE ALHELÍ');
    drawStreetSign(ctx, W - 320, 872, 'RADIO FARO · 900 m', true);
    // brillo de lluvia sobre el suelo
    for (let i = 0; i < 80; i++) {
      Art.wetStreak(ctx, rng() * W, 440 + rng() * 550, 3 + rng() * 14, Math.PI / 2 + .07, .4, .05 + rng() * .08);
    }
    // viñeta estática sutil
    const vg = ctx.createRadialGradient(W / 2, 620, 180, W / 2, 620, W * .7);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.46)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  function drawRadioTower(ctx, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(7,11,12,.9)';
    ctx.lineWidth = 1.2;
    const cx = x + w / 2;
    ctx.beginPath(); ctx.moveTo(cx - 4, y + h); ctx.lineTo(cx - 1, y + 10); ctx.lineTo(cx + 1, y + 10); ctx.lineTo(cx + 4, y + h); ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const t = i / 9;
      const yy = y + 30 + t * (h - 50);
      const ww = 3 + t * (w * .4);
      ctx.beginPath(); ctx.moveTo(cx - ww, yy); ctx.lineTo(cx + ww, yy); ctx.stroke();
      if (i < 8) {
        const yy2 = y + 30 + (i + 1) / 9 * (h - 50);
        const ww2 = 3 + (i + 1) / 9 * (w * .4);
        ctx.beginPath(); ctx.moveTo(cx - ww, yy); ctx.lineTo(cx + ww2, yy2); ctx.moveTo(cx + ww, yy); ctx.lineTo(cx - ww2, yy2); ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(165,59,40,.8)';
    ctx.shadowColor = 'rgba(180,64,43,.8)'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(cx, y + 10, 2, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawStreetSign(ctx, x, y, text, right = false) {
    ctx.save();
    ctx.translate(x, y);
    if (right) ctx.rotate(-.015);
    ctx.fillStyle = 'rgba(26,31,29,.84)';
    ctx.fillRect(0, 0, 136, 26);
    ctx.strokeStyle = 'rgba(200,188,158,.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(2.5, 2.5, 131, 21);
    ctx.fillStyle = 'rgba(207,196,169,.7)';
    ctx.font = '8px "Bahnschrift","Arial Narrow",sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText(text, 9, 16);
    ctx.restore();
  }

  function drawManhole(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = 'rgba(15,18,16,.8)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(118,120,105,.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r - 1.5, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(10,13,12,.6)';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(x - Math.sqrt(Math.max(0, r * r - i * i)) + 2, y + i * (r / 3));
      ctx.lineTo(x + Math.sqrt(Math.max(0, r * r - i * i)) - 2, y + i * (r / 3)); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBuilding(ctx, b, scene) {
    const x = b.x, y = b.top || 40, w = b.w, h = (b.base || 430) - y;
    const style = b.style;
    const rng = U.rng('bld-' + b.id);
    ctx.save();
    // estructura general
    if (style === 'clinic') {
      const wallTex = Tex.tileFloorCanvas(w, h, { variant: 'clinic', seed: b.seed || 4, size: 42 });
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(wallTex, x, y, w, h); ctx.restore();
      ctx.fillStyle = 'rgba(17,30,29,.45)'; ctx.fillRect(x, y, w, h);
      // cornisa
      ctx.fillStyle = '#252d2a'; ctx.fillRect(x - 4, y - 6, w + 8, 14);
      ctx.fillStyle = 'rgba(210,200,168,.08)'; ctx.fillRect(x - 4, y - 6, w + 8, 4);
      // grandes ventanales
      for (let i = 0; i < b.windows; i++) {
        const wx = x + 48 + i * ((w - 96) / b.windows);
        drawFacadeWindow(ctx, wx, y + 62, 72, 160, { lit: false, boards: i === 1, rng: rng });
      }
      // puerta doble
      const dx = b.doorX !== undefined ? b.doorX : x + w / 2 - 46;
      drawClinicDoor(ctx, dx, 430 - 142, 92, 142, b);
      // rótulo vertical
      ctx.save();
      ctx.fillStyle = 'rgba(12,20,19,.82)'; ctx.fillRect(x + 16, y + 40, 25, 190);
      ctx.fillStyle = 'rgba(195,197,171,.5)'; ctx.font = '10px "Bahnschrift",sans-serif'; ctx.textAlign = 'center';
      ctx.save(); ctx.translate(x + 28.5, y + 46); ctx.rotate(Math.PI / 2);
      ctx.fillText('CLÍNICA AURORA', 0, 0); ctx.restore(); ctx.restore();
      // manchas de humedad y hiedra
      for (let i = 0; i < 12; i++) Tex.softStain(ctx, x + rng() * w, y + rng() * h, 20 + rng() * 90, 10 + rng() * 50, '#1b2a24', .06 + rng() * .12);
      Art.moss(ctx, x + 18, y + 260, 50, 120, .25, 8);
      Art.moss(ctx, x + w - 80, y + 200, 90, 180, .18, 13);
      // lámpara de emergencia
      ctx.fillStyle = 'rgba(210,148,80,.4)';
      ctx.fillRect(x + 32, y + 286, 12, 4);
      ctx.shadowColor = 'rgba(224,160,92,.5)'; ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(230,173,102,.4)'; ctx.beginPath(); ctx.arc(x + 38, y + 288, 3, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (style === 'pharmacy') {
      const wallTex = Tex.plasterCanvas(w, h, { seed: b.seed || 7, color: '#777363' });
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(wallTex, x, y, w, h); ctx.restore();
      ctx.fillStyle = 'rgba(22,29,27,.34)'; ctx.fillRect(x, y, w, h);
      // cornisa y moldura
      ctx.fillStyle = '#2d2d27'; ctx.fillRect(x - 3, y - 5, w + 6, 12);
      ctx.fillStyle = 'rgba(206,194,160,.06)'; ctx.fillRect(x - 3, y - 5, w + 6, 3);
      // persiana metálica
      ctx.fillStyle = '#2d3330'; ctx.fillRect(x + 30, y + 60, w - 60, 170);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(194,190,168,.05)' : 'rgba(0,0,0,.16)';
        ctx.fillRect(x + 30, y + 62 + i * 14, w - 60, 6);
      }
      ctx.fillStyle = '#181d1b'; ctx.fillRect(x + 30, y + 170, w - 60, 60);
      // cruces de farmacia descoloridas
      ctx.save(); ctx.translate(x + w / 2, y + 36); ctx.rotate(.02);
      ctx.fillStyle = 'rgba(85,112,89,.32)';
      ctx.fillRect(-8, -22, 16, 44); ctx.fillRect(-22, -8, 44, 16);
      ctx.restore();
      // cartel
      ctx.fillStyle = 'rgba(12,19,18,.7)'; ctx.fillRect(x + 22, y + 213, w - 44, 28);
      ctx.fillStyle = 'rgba(194,188,156,.5)'; ctx.font = '11px "Bahnschrift",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('FARMACIA SANTA ELENA', x + w / 2, y + 232);
      // puerta lateral
      drawSimpleDoor(ctx, x + w - 78, 430 - 116, 50, 116, { color: '#302b22', boarded: true });
      // hiedra / desconchones
      Art.moss(ctx, x + 10, y + 240, w - 20, 120, .2, 21);
    } else if (style === 'house') {
      // casa de los Rueda
      const wallTex = Tex.plasterCanvas(w, h, { seed: b.seed || 3, color: b.color || '#857557' });
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(wallTex, x, y, w, h); ctx.restore();
      ctx.fillStyle = 'rgba(22,24,21,.3)'; ctx.fillRect(x, y, w, h);
      // cornisa, tejado
      ctx.fillStyle = '#242522'; ctx.fillRect(x - 6, y - 12, w + 12, 16);
      ctx.fillStyle = 'rgba(201,190,164,.07)'; ctx.fillRect(x - 6, y - 12, w + 12, 3);
      ctx.fillStyle = 'rgba(18,20,18,.65)';
      ctx.beginPath(); ctx.moveTo(x - 10, y - 8); ctx.lineTo(x + 28, y - 48); ctx.lineTo(x + w - 24, y - 52); ctx.lineTo(x + w + 8, y - 6); ctx.closePath(); ctx.fill();
      // ventanas de la planta alta
      drawFacadeWindow(ctx, x + 42, y + 46, 74, 106, { lit: false, curtains: true, rng: rng });
      drawFacadeWindow(ctx, x + w - 128, y + 46, 78, 106, { lit: b.litUpstairs, curtains: true, rng: rng, silhouette: b.silhouette });
      // ventanal central con balcón
      ctx.fillStyle = 'rgba(31,28,22,.65)'; ctx.fillRect(x + 154, y + 172, 116, 106);
      drawFacadeWindow(ctx, x + 160, y + 176, 104, 98, { lit: true, warm: true, curtains: true, rng: rng, balcony: true });
      // puerta principal con escalones
      const dx = b.doorX !== undefined ? b.doorX : x + 194;
      drawHouseDoor(ctx, dx, 430 - 150, 86, 150, b);
      // número 14 sobre la puerta
      ctx.fillStyle = 'rgba(13,18,16,.75)'; ctx.fillRect(dx + 24, 430 - 178, 38, 19);
      ctx.strokeStyle = 'rgba(201,184,145,.2)'; ctx.strokeRect(dx + 25, 430 - 177, 36, 17);
      ctx.fillStyle = 'rgba(219,202,169,.7)'; ctx.font = '11px Georgia'; ctx.textAlign = 'center';
      ctx.fillText('14', dx + 43, 430 - 164);
      // buzón
      ctx.fillStyle = 'rgba(31,33,29,.8)'; ctx.fillRect(dx + 94, 430 - 98, 22, 30);
      ctx.fillStyle = 'rgba(171,158,130,.22)'; ctx.fillRect(dx + 97, 430 - 95, 16, 3);
      // hiedra, humedad
      Art.moss(ctx, x + 6, y + 280, 24, 120, .27, 31);
      Art.moss(ctx, x + w - 30, y + 190, 28, 160, .24, 36);
      for (let i = 0; i < 15; i++) Tex.softStain(ctx, x + rng() * w, y + rng() * h, 10 + rng() * 60, 8 + rng() * 50, '#2d3228', .04 + rng() * .09);
      // placa con el apellido
      ctx.fillStyle = 'rgba(26,29,25,.65)'; ctx.fillRect(dx - 16, 430 - 166, 52, 10);
      ctx.fillStyle = 'rgba(198,187,155,.4)'; ctx.font = '6px "Bahnschrift",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('RUEDA', dx + 10, 430 - 159);
    } else {
      // vivienda oscura / cierre
      const wallTex = Tex.brickCanvas(w, h, { seed: b.seed || 9 });
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(wallTex, x, y, w, h); ctx.restore();
      ctx.fillStyle = 'rgba(12,16,15,.6)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#1d211e'; ctx.fillRect(x - 2, y - 8, w + 4, 12);
      const n = b.windows || 2;
      for (let i = 0; i < n; i++) {
        drawFacadeWindow(ctx, x + 36 + i * ((w - 72) / n), y + 74, 52, 96, { boarded: true, rng: rng });
      }
      // puerta tapiada
      ctx.fillStyle = 'rgba(42,36,29,.8)'; ctx.fillRect(x + w / 2 - 38, 430 - 118, 76, 118);
      ctx.fillStyle = 'rgba(76,65,48,.35)';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + w / 2 - 44, 430 - 112 + i * 27, 88, 9);
      Art.moss(ctx, x + 4, y + 240, w - 8, 145, .16, 44);
    }
    // humedad en el encuentro con la acera
    Art.grimeEdge(ctx, x, 430, w, 90, 'top', 30, 'rgba(4,7,7,.5)', 99);
    // desconchones / suciedad genéricos
    for (let i = 0; i < 18; i++) {
      Art.wetStreak(ctx, x + rng() * w, y + 10 + rng() * (h * .4), 30 + rng() * 160, Math.PI / 2 + .04, .7, .025 + rng() * .04);
    }
    // canalón
    ctx.fillStyle = 'rgba(41,39,32,.8)'; ctx.fillRect(x - 7, y, 4, h);
    ctx.fillStyle = 'rgba(15,19,17,.4)'; ctx.fillRect(x - 8, y + h - 30, 6, 30);
    ctx.restore();
  }

  function drawFacadeWindow(ctx, x, y, w, h, opts) {
    const rng = opts.rng ? U.rng('facade-' + x + y + (opts.rng() * 1000 | 0)) : U.rng('facade-' + x + y);
    ctx.save();
    // marco de piedra
    ctx.fillStyle = 'rgba(26,26,22,.9)';
    ctx.fillRect(x - 7, y - 7, w + 14, h + 14);
    ctx.fillStyle = '#403f34';
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    if (opts.warm && opts.lit) {
      g.addColorStop(0, '#9d7747'); g.addColorStop(.4, '#d6a55e'); g.addColorStop(.7, '#71502f'); g.addColorStop(1, '#2b2117');
    } else {
      g.addColorStop(0, '#2c3a3b'); g.addColorStop(.5, '#1c292b'); g.addColorStop(.8, '#101a1b'); g.addColorStop(1, '#0b1112');
    }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    // montantes
    ctx.fillStyle = 'rgba(24,24,20,.85)';
    ctx.fillRect(x + w / 2 - 2, y, 4, h);
    ctx.fillRect(x, y + h * .45, w, 3);
    if (opts.lit) {
      // luz interior difusa
      const lg = ctx.createRadialGradient(x + w / 2, y + h * .55, 2, x + w / 2, y + h * .55, w * .7);
      lg.addColorStop(0, 'rgba(255,205,132,.3)');
      lg.addColorStop(1, 'rgba(255,180,90,0)');
      ctx.fillStyle = lg; ctx.fillRect(x, y, w, h);
      // silueta
      if (opts.silhouette) {
        ctx.fillStyle = 'rgba(14,17,15,.82)';
        ctx.beginPath(); ctx.ellipse(x + w * .62, y + h * .45, w * .1, h * .12, 0, 0, 7); ctx.fill();
        ctx.fillRect(x + w * .52, y + h * .54, w * .2, h * .4);
      }
    }
    // cortina
    if (opts.curtains) {
      ctx.fillStyle = 'rgba(116,101,75,.45)';
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w * .2, y); ctx.quadraticCurveTo(x + w * .13, y + h * .5, x + w * .22, y + h);
      ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w, y); ctx.lineTo(x + w * .8, y); ctx.quadraticCurveTo(x + w * .87, y + h * .5, x + w * .78, y + h);
      ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
    }
    // tablones
    if (opts.boarded) {
      ctx.fillStyle = 'rgba(51,43,33,.92)';
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(x + w / 2, y + 20 + i * h * .3); ctx.rotate((i - 1) * .06);
        ctx.fillRect(-w * .58, 0, w * 1.16, 12);
        ctx.fillStyle = 'rgba(120,102,75,.22)'; ctx.fillRect(-w * .58, 1, w * 1.16, 2);
        ctx.fillStyle = 'rgba(51,43,33,.92)';
        ctx.restore();
      }
    }
    // lluvia en el cristal
    for (let i = 0; i < 12; i++) {
      Art.wetStreak(ctx, x + rng() * w, y + rng() * h, 5 + rng() * 22, Math.PI / 2 + .03, .5, .06 + rng() * .1);
    }
    // alféizar
    ctx.fillStyle = 'rgba(39,37,30,.9)'; ctx.fillRect(x - 6, y + h + 4, w + 12, 5);
    if (opts.balcony) {
      ctx.strokeStyle = 'rgba(31,30,25,.85)'; ctx.lineWidth = 2;
      ctx.strokeRect(x - 16, y + h + 9, w + 32, 34);
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath(); ctx.moveTo(x - 16 + i * ((w + 32) / 8), y + h + 9); ctx.lineTo(x - 16 + i * ((w + 32) / 8), y + h + 43); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawClinicDoor(ctx, x, y, w, h, b) {
    ctx.save();
    // marco metálico
    ctx.fillStyle = '#222b29'; ctx.fillRect(x - 8, y - 8, w + 16, h + 8);
    ctx.fillStyle = 'rgba(128,143,129,.18)'; ctx.fillRect(x - 8, y - 8, w + 16, 3);
    // puerta de doble hoja
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#354340'); g.addColorStop(.5, '#26322f'); g.addColorStop(1, '#151d1b');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(11,16,15,.75)'; ctx.fillRect(x + w / 2 - 1.5, y, 3, h);
    // cristal superior con lluvia
    ctx.fillStyle = 'rgba(75,101,102,.32)'; ctx.fillRect(x + 9, y + 14, w - 18, h * .35);
    const wg = ctx.createLinearGradient(x, y + 14, x, y + 14 + h * .35);
    wg.addColorStop(0, 'rgba(150,181,176,.16)'); wg.addColorStop(1, 'rgba(20,30,30,.2)');
    ctx.fillStyle = wg; ctx.fillRect(x + 9, y + 14, w - 18, h * .35);
    for (let i = 0; i < 8; i++) Art.wetStreak(ctx, x + 12 + i * 9, y + 16, 12 + (i * 7) % 22, Math.PI / 2 + .04, .5, .12);
    // barra antipánico
    ctx.fillStyle = 'rgba(138,132,104,.5)'; ctx.fillRect(x + 8, y + h * .58, w - 16, 4);
    ctx.fillStyle = 'rgba(14,18,16,.7)'; ctx.fillRect(x + 8, y + h * .58 + 4, w - 16, 2);
    // carteles
    ctx.fillStyle = 'rgba(196,191,164,.5)'; ctx.fillRect(x + 12, y + h * .46, 26, 18);
    ctx.fillStyle = 'rgba(53,47,37,.55)'; ctx.font = '4px monospace'; ctx.fillText('HORARIO', x + 13, y + h * .46 + 7);
    ctx.fillStyle = 'rgba(13,18,16,.9)'; ctx.fillRect(x + w - 30, y + h * .45, 20, 22);
    ctx.strokeStyle = 'rgba(174,165,136,.22)'; ctx.strokeRect(x + w - 29.5, y + h * .45 + .5, 19, 21);
    // camilla / silla reflejada en el cristal
    ctx.fillStyle = 'rgba(20,29,28,.25)';
    ctx.fillRect(x + 18, y + 24, 21, 9);
    ctx.restore();
  }

  function drawHouseDoor(ctx, x, y, w, h, b) {
    ctx.save();
    // escalones
    ctx.fillStyle = '#33332b'; ctx.fillRect(x - 12, y + h - 13, w + 24, 13);
    ctx.fillStyle = '#25251f'; ctx.fillRect(x - 7, y + h - 19, w + 14, 7);
    ctx.strokeStyle = 'rgba(203,191,160,.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 12, y + h - 13); ctx.lineTo(x + w + 12, y + h - 13); ctx.stroke();
    // marco
    ctx.fillStyle = '#2b241b'; ctx.fillRect(x - 9, y - 7, w + 18, h + 7);
    ctx.fillStyle = '#4a3b29'; ctx.fillRect(x - 5, y - 4, w + 10, h + 4);
    // puerta
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#5b3e28'); g.addColorStop(.4, '#3f2a1d'); g.addColorStop(1, '#1f1611');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    // paneles
    ctx.strokeStyle = 'rgba(20,14,10,.7)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 10, y + 16, w - 20, h * .35);
    ctx.strokeRect(x + 10, y + h * .53, w - 20, h * .35);
    ctx.strokeStyle = 'rgba(183,150,107,.12)'; ctx.lineWidth = .7;
    ctx.strokeRect(x + 12, y + 18, w - 24, h * .35 - 4);
    ctx.strokeRect(x + 12, y + h * .53 + 2, w - 24, h * .35 - 4);
    // cristal
    ctx.fillStyle = 'rgba(163,134,86,.15)'; ctx.fillRect(x + 18, y + 24, w - 36, h * .14);
    // pomo
    ctx.fillStyle = 'rgba(184,157,109,.65)'; ctx.beginPath(); ctx.arc(x + w - 14, y + h * .54, 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(13,18,16,.9)'; ctx.fillRect(x + w - 18, y + h * .54 - 1, 4, 2);
    // placa
    ctx.fillStyle = 'rgba(207,194,155,.4)'; ctx.fillRect(x + 11, y + h - 25, 20, 5);
    // rendija de luz
    ctx.fillStyle = 'rgba(225,169,100,.24)'; ctx.fillRect(x + 3, y + h - 12, w - 6, 2);
    ctx.restore();
  }

  function drawSimpleDoor(ctx, x, y, w, h, opts) {
    ctx.save();
    ctx.fillStyle = '#29271f'; ctx.fillRect(x - 4, y - 4, w + 8, h + 4);
    ctx.fillStyle = opts.color || '#3f3426'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(12,10,8,.5)'; ctx.strokeRect(x + 4, y + 5, w - 8, h - 12);
    if (opts.boarded) {
      ctx.fillStyle = 'rgba(70,58,43,.75)';
      for (let i = 0; i < 4; i++) ctx.fillRect(x - 6, y + 16 + i * 25, w + 12, 9);
    }
    ctx.restore();
  }

  LM.Street = { paintStreet };
})();
