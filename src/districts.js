/* Neon Coast - distritos: ropaje del mundo
   - entrada monumental de cada barrio (postes + letrero con su color)
   - palmeras alineadas en la avenida de la playa (Colina Mar)
   - barcos despuntando al este del mar + botes amarrados en el muelle
   - contenedores rusticos alrededor de la nave abandonada (FACTORY)
   Todo es escenografia barata: pocas geometrias, sin sombras dinamicas. */
(function () {
  'use strict';
  if (!window.NC || !window.THREE) return;
  const NC = window.NC;

  // ---- letreros de bienvenida a cada barrio (en las fronteras cardinales)
  try {
    const TZ = [['PUERTO VIEJO', '#9a6bff', 0, -EXT + 18], ['FLEMING SUR', '#3dff9a', 0, EXT - 18], ['BETICA', '#ff5a7a', -EXT + 18, 0], ['COLINA MAR', '#ffd24a', EXT - 18, 0]];
    const poleM = new THREE.MeshStandardMaterial({ color: 0x2a2a36, roughness: .8 });
    for (const s of TZ) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const q = c.getContext('2d');
      q.fillStyle = '#161033'; q.fillRect(0, 0, 512, 96); q.strokeStyle = s[1]; q.lineWidth = 6; q.strokeRect(8, 8, 496, 80);
      q.fillStyle = s[1]; q.font = 'bold 44px Arial'; q.textAlign = 'center'; q.fillText(s[0], 256, 64);
      const vert = s[2] === 0 // letrero sobre calle horizontal (norte/sur)
        ;
      const board = new THREE.Mesh(new THREE.BoxGeometry(vert ? 10 : .3, 2.5, vert ? .3 : 10),
        new THREE.MeshStandardMaterial({ map: tex(c), emissive: 0xffffff, emissiveMap: tex(c), emissiveIntensity: .35, roughness: .8 }));
      board.position.set(s[2], 6.4, s[3]); board.rotation.y = vert ? 0 : Math.PI / 2; scene.add(board);
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 6.4, 8), poleM),
        p2 = p1.clone();
      p1.position.set(s[2] + (vert ? 4 : .8), 3.2, s[3] - (vert ? .8 : 4));
      p2.position.set(s[2] - (vert ? 4 : .8), 3.2, s[3] + (vert ? .8 : 4));
      scene.add(p1, p2);
      if (vert) { boxes.push({ x: s[2] - 4, z: s[3], hw: .18, hd: .18 }, { x: s[2] + 4, z: s[3], hw: .18, hd: .18 }); }
      else { boxes.push({ x: s[2], z: s[3] - 4, hw: .18, hd: .18 }, { x: s[2], z: s[3] + 4, hw: .18, hd: .18 }); }
    }
  } catch (e) { NC.log('district gates', e); }

  // ---- avenida de palmeras al este (Colina Mar) y al muelle
  try {
    for (let z = -380; z <= 380; z += 42) if (Math.abs(z) > 60) palms.push([EXT + 34, z]);
    for (let x = 430; x <= 452; x += 11) { palms.push([x, 188]); palms.push([x, 220]); }
  } catch (e) { NC.log('palms', e); }

  // ---- mar: barcos al ancla y rowboats en el muelle
  try {
    const hullM = new THREE.MeshStandardMaterial({ color: 0x5a4034, roughness: .8 }),
      cabM = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: .5 }),
      mastM = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: .6 });
    [[EXT + 150, -180, 14], [EXT + 240, 40, 20], [EXT + 190, 220, 12]].forEach(b => {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 4, b[2]), hullM); hull.position.y = -1;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 5), cabM); cab.position.set(0, 2.4, -b[2] * .22);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(.14, .2, 11, 7), mastM); mast.position.set(0, 5.8, b[2] * .1);
      g.add(hull, cab, mast); g.position.set(b[0], 1.4, b[1]); g.rotation.y = Math.random() * 6.3;
      scene.add(g);
    });
    [[444, 190], [448, 216]].forEach(r => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, .8, 3.6), hullM), new THREE.Mesh(new THREE.BoxGeometry(1, .7, 1.1), cabM));
      g.children[0].position.y = .1; g.children[1].position.set(0, .55, -.9);
      g.position.set(r[0], .8, r[1]); scene.add(g);
    });
  } catch (e) { NC.log('boats', e); }

  // ---- contenedores alrededor de la nave abandonada
  try {
    if (window.FACTORY) {
      const F = window.FACTORY, cols = [0x8a4a2a, 0x2a6a6e, 0xb06018, 0x54402e];
      const spots = [[F.x - 22, F.z + 6, .2], [F.x - 22, F.z + 14, -.1], [F.x + 22, F.z - 8, .5], [F.x + 8, F.z - 24, .12], [F.x - 10, F.z + 24, -.3], [F.x + 24, F.z + 18, .65]];
      spots.forEach((s, k) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(7, 2.8, 2.6), new THREE.MeshStandardMaterial({ color: cols[k % 4], roughness: .95, metalness: .15 }));
        m.position.set(s[0], 1.5, s[1]); m.rotation.y = s[2]; m.castShadow = true; scene.add(m);
        boxes.push({ x: s[0], z: s[1], hw: 3.6, hd: 1.6 });
      });
      // pila de palets y bidones (escombros que cuentan historias)
      const pl = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: .95 });
      for (let k = 0; k < 4; k++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, .18, 1.4), pl);
        m.position.set(F.x - 14 + k * .2, .3 + k * .2, F.z - 16 + (k % 2) * .3); m.rotation.y = k * .4; scene.add(m);
      }
      const dr = new THREE.MeshStandardMaterial({ color: 0x9c2a2a, roughness: .6, metalness: .4 });
      for (let k = 0; k < 3; k++) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 1.2, 10), dr);
        m.position.set(F.x + 16 + (k % 3) * 1.2, .6, F.z - 14 - (k > 2 ? 1.4 : 0)); scene.add(m);
        boxes.push({ x: m.position.x, z: m.position.z, hw: .5, hd: .5 });
      }
    }
  } catch (e) { NC.log('factory props', e); }

  NC.log('districts: letreros de barrio, avenidas, mar y nave detallados');
})();
