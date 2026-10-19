/* Neon Coast - decorado.js
   Mobiliario urbano procedural detallado.
   Busca el tag ?v=9f en index.html al editar este archivo. */
(function () {
  'use strict';
  const NC = window.NC;
  if (!NC || !window.THREE) return;
  const T = THREE;
  const bls = slabL, bx = boxes;
  const CELLv = CELL, Rv = R, Hv = H, PI = Math.PI;

  const rnum = (a, b) => a + Math.random() * (b - a);
  const add = (k, g) => DC_G[k].push(g);
  const pc = (g, c) => DC_G.paint.push({ g: g, c: c });
  const box = (w, h, d, x, y, z) => new T.BoxGeometry(w, h, d).translate(x, y, z);
  const cyl = (rt, rb, h, x, y, z, s) => new T.CylinderGeometry(rt, rb, h, s || 10).translate(x, y, z);
  const capCyl = (r, h, x, y, z) => {
    const g = new T.CylinderGeometry(r, r, h, 16);
    g.translate(x, y, z);
    const s = new T.SphereGeometry(r, 16, 8, 0, PI * 2, 0, PI / 2);
    const s2 = s.clone().rotateX(PI).translate(x, y + h / 2, z);
    s.translate(x, y - h / 2, z);
    return merge([g, s, s2]);
  };
  const mergeGeometries = (geos) => {
    if (!geos.length) return new T.BufferGeometry();
    const merged = new T.BufferGeometry();
    const positions = [], normals = [], uvs = [], colors = [], indices = [];
    let offset = 0;
    for (const geo of geos) {
      if (geo.attributes.position) positions.push(...geo.attributes.position.array);
      if (geo.attributes.normal) normals.push(...geo.attributes.normal.array);
      if (geo.attributes.uv) uvs.push(...geo.attributes.uv.array);
      if (geo.attributes.color) colors.push(...geo.attributes.color.array);
      if (geo.index) geo.index.array.forEach(i => indices.push(i + offset));
      offset += geo.attributes.position.count;
    }
    merged.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    if (normals.length) merged.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
    if (uvs.length) merged.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    if (colors.length) merged.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    if (indices.length) merged.setIndex(indices);
    return merged;
  };
  const cg = (geometry, color) => {
    const c = new T.Color(color);
    const colors = [];
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    return geometry;
  };


  /* ---------------- texturas propias ---------------- */
  function DC_mkc(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  function DC_mkt(c, rx, ry, lin) {
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    t.encoding = lin ? T.LinearEncoding : T.sRGBEncoding; t.anisotropy = 4; return t;
  }

  const DC_metalC = DC_mkc(64, 64, (x) => {
    x.fillStyle = '#6d6a63'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 300; i++) { const r = Math.random() * 60 | 0; x.fillStyle = `rgba(${120 + r},${70 + r * .6},${38 + r * .3},${.06 + Math.random() * .28})`; x.fillRect(Math.random() * 64, Math.random() * 64, 1 + Math.random() * 3, 1 + Math.random() * 3); }
  });
  const DC_concC = DC_mkc(128, 128, (x) => {
    x.fillStyle = '#9a958c'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { const v = 120 + Math.random() * 70 | 0; x.fillStyle = `rgba(${v},${v - 4},${v - 12},${.1 + Math.random() * .3})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 3); }
  });
  const DC_woodC = DC_mkc(64, 128, (x) => {
    x.fillStyle = '#6b4d34'; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 260; i++) { const v = Math.random() * 60 | 0; x.fillStyle = `rgba(${60 + v},${40 + v * .7},${24 + v * .5},${.25 + Math.random() * .4})`; x.fillRect(Math.random() * 64, 0, 1 + Math.random() * 3, 10 + Math.random() * 40); }
  });
  const DC_plasticC = DC_mkc(32, 32, (x) => {
    x.fillStyle = '#3a3a3a'; x.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 80; i++) { const v = 20 + Math.random() * 30 | 0; x.fillStyle = `rgba(${v},${v},${v},${.2 + Math.random() * .4})`; x.fillRect(Math.random() * 32, Math.random() * 32, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  });

  const DC_MAT = {
    metal: new T.MeshStandardMaterial({ map: DC_mkt(DC_metalC, 2, 2), roughness: .45, metalness: .72 }),
    conc: new T.MeshStandardMaterial({ map: DC_mkt(DC_concC, 2, 2), roughness: .92, metalness: .02 }),
    wood: new T.MeshStandardMaterial({ map: DC_mkt(DC_woodC, 2, 2), roughness: .7, metalness: .01 }),
    plastic: new T.MeshStandardMaterial({ map: DC_mkt(DC_plasticC, 1, 1), roughness: .6, metalness: .05 }),
    paint_mat: new T.MeshStandardMaterial({ vertexColors: true, roughness: .78 }),
    alu: new T.MeshStandardMaterial({ color: 0xa8adb6, roughness: .52, metalness: .45 }),
    glass: new T.MeshStandardMaterial({ color: 0x16222e, roughness: .08, metalness: .25, transparent: true, opacity: .72 }),
    roadsign: new T.MeshStandardMaterial({ color: 0xcccccc, roughness: .8, metalness: .1 }),
    water: new T.MeshStandardMaterial({ color: 0x2f5f9a, roughness: .05, metalness: .1, transparent: true, opacity: .8 }),
    cloth: new T.MeshStandardMaterial({ color: 0x4a4a4a, roughness: .85, metalness: .05 })
  };

  const DC_G = { metal: [], conc: [], wood: [], plastic: [], alu: [], glass: [], roadsign: [], water: [], cloth: [], paint: [] };

  const DC_GREY = 0x7d7a74, DC_WOOD = 0x6b4a32, DC_RED = 0xb03a2e, DC_BLUE = 0x2f5f9a, DC_GREEN = 0x2f9a5f, DC_YELLOW = 0xd8d2c0, DC_BROWN = 0x7a6a2f;

  const DC_collides = (x, z, pad = 1.2) => {
    for (const b of bx) {
      if (Math.abs(x - b.x) < b.hw + pad && Math.abs(z - b.z) < b.hd + pad) return true;
    }
    return false;
  };

  // --- Funciones para crear props ---

  // Parada de bus
  function DC_busStop(x, z, rotY = 0) {
    const y = 0.5;
    // Base de poste
    add('metal', cyl(.1, .1, 2.5, x, y + 1.25, z, 10));
    // Techo curvo
    const roof = new T.CylinderGeometry(1.6, 1.6, 0.1, 32, 1, 0, PI);
    roof.rotateX(PI / 2); roof.translate(x, y + 2.5, z);
    add('metal', roof);
    // Panel de cristal
    add('glass', box(2.8, 1.8, .05, x, y + 1.5, z - .8));
    // Banco
    DC_bench(x - 0.7, z + 0.8, rotY);
  }

  // Banco
  function DC_bench(x, z, rotY = 0) {
    const y = 0.4;
    // Patas
    add('metal', box(.15, .8, .15, x - .7, y, z - .2));
    add('metal', box(.15, .8, .15, x + .7, y, z - .2));
    // Asiento
    for (let i = 0; i < 4; i++) {
      pc(box(1.8, .08, .2, x, y + .8 + i * .1, z + .05 + i * .02), DC_WOOD);
    }
    // Respaldo
    for (let i = 0; i < 3; i++) {
      pc(box(1.8, .08, .2, x, y + 1.2 + i * .1, z - .2 - i * .02), DC_WOOD);
    }
  }

  // Fuente de plaza
  function DC_fountain(x, z) {
    const y = 0.4;
    add('conc', cyl(1.8, 2.0, .8, x, y + .4, z, 20)); // Base
    add('conc', cyl(.6, .7, 1.2, x, y + 1.3, z, 16)); // Columna
    add('conc', cyl(1.0, 1.0, .2, x, y + 2.0, z, 20)); // Tazon superior
    // Agua
    add('water', cyl(1.5, 1.5, .1, x, y + .75, z, 20));
    add('water', cyl(.9, .9, .1, x, y + 1.9, z, 20));
    // Chorro de agua
    add('water', cyl(.08, .02, .5, x, y + 2.25, z, 8));
  }

  // Quiosco de prensa
  function DC_newsKiosk(x, z, rotY = 0) {
    const y = 1.0;
    // Base y paredes
    add('plastic', box(2.5, 2.0, 2.0, x, y, z)); // Cuerpo principal
    // Ventanas
    add('glass', box(2.2, 1.0, .05, x, y + .5, z - 1.02));
    add('glass', box(.05, 1.0, 1.8, x - 1.27, y + .5, z));
    add('glass', box(.05, 1.0, 1.8, x + 1.27, y + .5, z));
    // Toldo (parte frontal)
    const awning = new T.BoxGeometry(2.7, 0.1, 1.0);
    awning.translate(x, y + 2.05, z - 0.5);
    pc(awning, DC_RED);
    // Techo
    add('plastic', box(2.7, .1, 2.2, x, y + 2.15, z));

    bx.push({ x: x, z: z, hw: 1.25, hd: 1.0 }); // Colision
  }

  // Bicicleta de apoyo (aparcada)
  function DC_bike(x, z, rotY = 0) {
    const y = 0.6;
    // Ruedas
    add('metal', cyl(.3, .3, .05, x - .6, y, z, 20).rotateX(PI / 2));
    add('metal', cyl(.3, .3, .05, x + .6, y, z, 20).rotateX(PI / 2));
    // Cuadro
    pc(cyl(.04, .04, 1.2, x, y + .2, z, 8).rotateZ(PI / 4), DC_GREY);
    pc(cyl(.04, .04, .8, x - .3, y + .6, z, 8).rotateZ(-PI / 4), DC_GREY);
    pc(cyl(.04, .04, .7, x + .3, y + .6, z, 8).rotateZ(PI / 2), DC_GREY);
    // Manillar
    add('plastic', box(.4, .05, .05, x - .3, y + .9, z).rotateY(PI / 2));
    // Asiento
    add('plastic', box(.1, .2, .25, x + .2, y + .8, z).rotateX(PI / 6));
  }

  // Contenedor de ropa de colores
  function DC_clothesContainer(x, z, rotY = 0) {
    const y = 1.0;
    const body = box(1.8, 2.0, 1.4, x, y, z);
    pc(body, pick([DC_RED, DC_BLUE, DC_GREEN, DC_YELLOW])); // Color aleatorio
    // Tapa
    add('plastic', box(1.9, .15, 1.5, x, y + 1.07, z));
    // Ranura
    const slot = box(.8, .2, .05, x, y + .8, z - .71);
    pc(slot, DC_GREY);

    bx.push({ x: x, z: z, hw: 0.9, hd: 0.7 }); // Colision
  }

  // Valla metalica
  function DC_metalFence(x, z, rotY = 0, length = 4) {
    const y = 0.5;
    for (let i = 0; i < length; i++) {
      const segX = x + i * 1.5 - (length - 1) * 0.75;
      // Postes verticales
      add('metal', cyl(.05, .05, 1.5, segX, y + .75, z, 8));
      if (i < length - 1) {
        // Barras horizontales
        add('metal', box(1.5, .05, .05, segX + .75, y + 1.2, z));
        add('metal', box(1.5, .05, .05, segX + .75, y + .5, z));
      }
    }
  }

  // Papelera
  function DC_bin(x, z, rotY = 0, type = 'round') {
    const y = 0.5;
    if (type === 'round') {
      add('metal', cyl(.4, .35, 1.0, x, y + .5, z, 16));
      add('plastic', cyl(.45, .45, .1, x, y + 1.05, z, 16)); // Tapa
    } else { // Cuadrada
      add('metal', box(.8, 1.0, .8, x, y + .5, z));
      add('plastic', box(.9, .1, .9, x, y + 1.05, z)); // Tapa
    }
  }

  // Buzon
  function DC_mailbox(x, z, rotY = 0) {
    const y = 1.0;
    add('plastic', box(.8, 1.2, .6, x, y + .6, z)); // Cuerpo principal
    add('plastic', box(.9, .1, .7, x, y + 1.2, z)); // Techo
    add('metal', cyl(.08, .08, .8, x, y - .4, z, 8)); // Poste
    pc(box(.05, .15, .4, x, y + .8, z + .3), DC_RED); // Ranura de correo

    bx.push({ x: x, z: z, hw: 0.4, hd: 0.3 }); // Colision
  }

  // Hidrante industrial
  function DC_hydrant(x, z) {
    const y = 0.3;
    add('metal', cyl(.2, .2, .6, x, y + .3, z, 12)); // Base
    add('metal', cyl(.18, .18, .5, x, y + .75, z, 12)); // Cuerpo
    add('metal', box(.1, .2, .4, x + .2, y + .7, z, 10)); // Salida
    add('metal', box(.1, .2, .4, x - .2, y + .7, z, 10)); // Salida
  }

  // SeÃ±al de trafico
  function DC_trafficSign(x, z, rotY = 0, type = 'stop') {
    const y = 2.0;
    add('metal', cyl(.08, .08, 3.0, x, y - 1.5, z, 8)); // Poste
    if (type === 'stop') {
      const sign = new T.BoxGeometry(1.0, 1.0, .05);
      sign.translate(x, y, z);
      pc(sign, DC_RED);
      // Texto "STOP" con una pequeÃ±a textura
      const stopC = DC_mkc(64, 64, (ctx) => {
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 64, 64);
        ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black'; ctx.fillText('STOP', 32, 32);
      });
      const stopTex = DC_mkt(stopC);
      const stopMat = new T.MeshStandardMaterial({ map: stopTex, roughness: .8 });
      const plane = new T.Mesh(new T.PlaneGeometry(0.8, 0.8), stopMat);
      plane.position.set(x, y, z + .03);
      plane.rotation.y = rotY;
      DC_G.roadsign.push(plane.geometry.applyMatrix4(plane.matrix)); // Add plane geometry to roadsign list
    } else { // Advertencia general (triangular)
      const sign = new T.Shape();
      sign.moveTo(0, .5);
      sign.lineTo(-.4, -.5);
      sign.lineTo(.4, -.5);
      sign.lineTo(0, .5);
      const extrudeSettings = { depth: 0.05, bevelEnabled: false };
      const geo = new T.ExtrudeGeometry(sign, extrudeSettings);
      geo.translate(x, y, z);
      pc(geo, DC_YELLOW);
    }
  }

  // Poste de alumbrado con farola
  function DC_streetLamp(x, z, rotY = 0) {
    const y = 3.5;
    add('metal', cyl(.12, .12, 6.0, x, y - 3.0, z, 12)); // Poste principal
    add('metal', box(1.8, .1, .1, x + .9, y, z).rotateY(rotY)); // Brazo horizontal
    add('alu', box(.3, .3, .3, x + 1.8, y, z).rotateY(rotY)); // Farola
    add('glass', box(.2, .2, .2, x + 1.8, y, z).rotateY(rotY)); // Cristal de farola
  }

  // Cajas de madera apiladas
  function DC_stackedBoxes(x, z, rotY = 0) {
    const y = 0.5;
    add('wood', box(1.0, .6, .8, x, y, z).rotateY(rnum(0, PI / 4)));
    add('wood', box(.9, .7, .7, x + .6, y + .6, z - .3).rotateY(rnum(0, PI / 4)));
    add('wood', box(.7, .5, .9, x - .5, y + 1.2, z + .2).rotateY(rnum(0, PI / 4)));
  }

  // Pale
  function DC_pallet(x, z, rotY = 0) {
    const y = 0.2;
    add('wood', box(1.2, .1, .8, x, y + .05, z)); // Cubierta superior
    add('wood', box(.1, .2, .8, x - .5, y - .1, z)); // Patas
    add('wood', box(.1, .2, .8, x, y - .1, z));
    add('wood', box(.1, .2, .8, x + .5, y - .1, z));
    add('wood', box(1.2, .1, .8, x, y - .25, z)); // Cubierta inferior
  }

  // Consola de musica (como las de exterior)
  function DC_musicConsole(x, z, rotY = 0) {
    const y = 0.7;
    add('plastic', box(1.0, 1.4, .8, x, y, z)); // Cuerpo principal
    add('glass', box(.8, .4, .05, x, y + .6, z - .42)); // Pantalla
    pc(box(.1, .1, .05, x - .25, y + .2, z - .42), DC_GREY); // Boton 1
    pc(box(.1, .1, .05, x, y + .2, z - .42), DC_GREY); // Boton 2
    pc(box(.1, .1, .05, x + .25, y + .2, z - .42), DC_GREY); // Boton 3
    add('metal', cyl(.15, .15, .05, x - .35, y + .85, z - .42, 8)); // Altavoz 1
    add('metal', cyl(.15, .15, .05, x + .35, y + .85, z - .42, 8)); // Altavoz 2

    bx.push({ x: x, z: z, hw: 0.5, hd: 0.4 }); // Colision
  }

  // Vallas de obra
  function DC_constructionFence(x, z, rotY = 0, length = 3) {
    const y = 0.5;
    for (let i = 0; i < length; i++) {
      const segX = x + i * 2.0 - (length - 1) * 1.0;
      // Panel
      add('metal', box(1.8, 2.0, .05, segX, y + 1.0, z));
      // Base
      add('plastic', box(2.0, .1, .4, segX, y - .05, z));
    }
  }


  /* ---------------- siembra de props ---------------- */
  const DC_totalProps = [];

  bls.forEach(bc => {
    const cx = bc[0], cz = bc[1];
    const zn = (typeof zoneOf === 'function') ? zoneOf(cx, cz) : 1;
    let nProps = 0;

    if (zn === 4 || zn === 1) { // Zonas comerciales/residenciales de alta densidad
      nProps = rnum(2, 5);
    } else if (zn === 2 || zn === 3) { // Zonas residenciales medias
      nProps = rnum(1, 3);
    } else if (zn === 0) { // Zonas industriales (baja densidad)
      nProps = rnum(0, 1);
    } else if (zn === 5) { // Zona abandonada (vertederos, ruinas)
      nProps = rnum(3, 6);
    }

    for (let i = 0; i < nProps; i++) {
      let tries = 0;
      let placed = false;
      while (tries < 10 && !placed) {
        const a = Math.random() * PI * 2;
        const r = rnum(3, 15); // Radio dentro de la manzana
        const px = cx + Math.cos(a) * r;
        const pz = cz + Math.sin(a) * r;
      // nunca sobre el asfalto: la calzada ocupa +-R/2 de cada eje de celula
      const dRoadX = Math.abs(px - Math.round(px / CELLv) * CELLv), dRoadZ = Math.abs(pz - Math.round(pz / CELLv) * CELLv);
      if (dRoadX < Rv / 2 + 2.5 || dRoadZ < Rv / 2 + 2.5) continue;
        const rotY = Math.random() * PI * 2;
        const scale = rnum(0.8, 1.2);

        if (DC_collides(px, pz, 1.2)) { // Pad de 1.2m para evitar solapamientos
          tries++;
          continue;
        }

        const propTypes = [];
        if (zn === 5) { // Zona abandonada
          propTypes.push('clothesContainer', 'stackedBoxes', 'pallet', 'constructionFence', 'bin');
        } else if (zn === 4 || zn === 1) { // Comerciales / Central
          propTypes.push('busStop', 'bench', 'fountain', 'newsKiosk', 'bike', 'bin', 'mailbox', 'hydrant', 'trafficSign', 'streetLamp', 'stackedBoxes', 'pallet', 'musicConsole');
        } else { // Residenciales / Industrial
          propTypes.push('bench', 'bike', 'bin', 'mailbox', 'streetLamp', 'stackedBoxes', 'pallet');
        }

        const chosenProp = pick(propTypes);
        let currentPropGeos = [];

        switch (chosenProp) {
          case 'busStop':
            DC_busStop(px, pz, rotY);
            break;
          case 'bench':
            DC_bench(px, pz, rotY);
            break;
          case 'fountain':
            DC_fountain(px, pz);
            break;
          case 'newsKiosk':
            DC_newsKiosk(px, pz, rotY);
            break;
          case 'bike':
            DC_bike(px, pz, rotY);
            break;
          case 'clothesContainer':
            DC_clothesContainer(px, pz, rotY);
            break;
          case 'metalFence':
            DC_metalFence(px, pz, rotY);
            break;
          case 'bin':
            DC_bin(px, pz, rotY, Math.random() < 0.5 ? 'round' : 'square');
            break;
          case 'mailbox':
            DC_mailbox(px, pz, rotY);
            break;
          case 'hydrant':
            DC_hydrant(px, pz);
            break;
          case 'trafficSign':
            DC_trafficSign(px, pz, rotY, Math.random() < 0.5 ? 'stop' : 'warning');
            break;
          case 'streetLamp':
            DC_streetLamp(px, pz, rotY);
            break;
          case 'stackedBoxes':
            DC_stackedBoxes(px, pz, rotY);
            break;
          case 'pallet':
            DC_pallet(px, pz, rotY);
            break;
          case 'musicConsole':
            DC_musicConsole(px, pz, rotY);
            break;
          case 'constructionFence':
            DC_constructionFence(px, pz, rotY);
            break;
        }
        DC_totalProps.push({ x: px, z: pz, type: chosenProp, rotY: rotY, scale: scale });
        placed = true;
      }
    }
  });


  /* ---------------- montaje ---------------- */
  const DC_MESH = {
    metal: DC_MAT.metal, conc: DC_MAT.conc, wood: DC_MAT.wood, plastic: DC_MAT.plastic,
    alu: DC_MAT.alu, glass: DC_MAT.glass, roadsign: DC_MAT.roadsign, water: DC_MAT.water, cloth: DC_MAT.cloth
  };
  Object.keys(DC_MESH).forEach(k => {
    if (!DC_G[k].length) return;
    const m = new T.Mesh(mergeGeometries(DC_G[k]), DC_MESH[k]);
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
  });
  if (DC_G.paint.length) {
    const list = DC_G.paint.map(o => cg(o.g, o.c));
    const m = new T.Mesh(mergeGeometries(list), DC_MAT.paint_mat);
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
  }

  NC.log('decorado: ' + DC_totalProps.length + ' props urbanos sembrados');
})();
