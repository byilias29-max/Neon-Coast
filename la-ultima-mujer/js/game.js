'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — motor de juego
   Estado, exploración, cámara, interacción, narrativa y bucle.
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U;
  const CFG = LM.CONFIG;
  const PLAYER = CFG.PLAYER;
  const G = {};
  LM.Game = G;

  let canvas = null;
  let ctx = null;
  let settings = Object.assign({}, LM.Settings);
  let view = { w: 1280, h: 720, dpr: 1 };
  let mode = 'boot';                 // boot | menu | intro | gameplay | chapter
  let state = null;
  let scene = null;
  let sceneId = '';
  let menuScene = null;
  let cam = { x: 460, y: 320, zoom: 1.14 };
  let menuCam = { x: 1450, y: 520, zoom: 1 };
  let playerVel = { x: 0, y: 0 };
  let playerMoving = false;
  let playerPhase = 0;
  let stepTimer = 0;
  let worldTime = 0;
  let menuTime = 0;
  let paused = true;
  let busy = false;
  let transitioning = false;
  let promptTarget = null;
  let watcher = null;
  let lowFuelWarned = false;
  let emptyWarned = false;
  let lastSaveAt = 0;
  let introToken = 0;
  let initialized = false;

  const colliderCache = new WeakMap();

  Object.defineProperty(G, 'state', {
    get: function () { return state; },
    set: function (value) { state = value; },
    configurable: false
  });

  /* ============================================================
     ESTADO Y PERSISTENCIA
     ============================================================ */
  function freshState() {
    return {
      version: CFG.VERSION,
      chapter: 1,
      sceneId: 'clinic_room',
      player: { x: 382, y: 372, aim: Math.PI },
      torch: { has: false, active: false, fuel: 100 },
      inventory: {},
      documents: [],
      journal: { clues: [], people: ['p_mara'], places: ['pl_room03'], questions: [] },
      flags: {},
      interactions: {},
      taken: [],
      visited: [],
      objective: 'find_light',
      playTime: 0,
      steps: 0,
      chapter_complete: false
    };
  }

  function isObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function arrayOf(v) { return Array.isArray(v) ? v : []; }
  function number(v, fallback, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return U.clamp(n, min, max);
  }

  function asFlags(raw) {
    const out = {};
    if (!isObject(raw)) return out;
    for (const key of Object.keys(raw)) {
      const value = raw[key];
      if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') out[key] = value;
    }
    return out;
  }

  function validJournal(raw) {
    const base = { clues: [], people: ['p_mara'], places: ['pl_room03'], questions: [] };
    if (!isObject(raw)) return base;
    for (const section of Object.keys(base)) {
      const source = LM.Story.journal[section] || {};
      const seen = new Set();
      for (const id of arrayOf(raw[section])) {
        if (typeof id === 'string' && source[id] && !seen.has(id)) {
          seen.add(id);
          base[section].push(id);
        }
      }
    }
    return base;
  }

  function validInventory(raw) {
    const out = {};
    if (!isObject(raw)) return out;
    for (const id of Object.keys(LM.Items)) {
      const qty = Math.floor(number(raw[id], 0, 0, 99));
      if (qty > 0) out[id] = qty;
    }
    return out;
  }

  function hydrate(raw) {
    const st = freshState();
    if (!isObject(raw)) return st;

    if (LM.World.get(raw.sceneId)) st.sceneId = raw.sceneId;
    st.chapter = number(raw.chapter, 1, 1, 6);
    st.objective = LM.Story.objectives[raw.objective] ? raw.objective : 'find_light';
    st.playTime = number(raw.playTime, 0, 0, 9999999);
    st.steps = Math.floor(number(raw.steps, 0, 0, 9999999));
    st.chapter_complete = !!raw.chapter_complete;
    st.inventory = validInventory(raw.inventory);
    st.journal = validJournal(raw.journal);
    st.flags = asFlags(raw.flags);
    st.taken = arrayOf(raw.taken).filter(x => typeof x === 'string');
    st.visited = arrayOf(raw.visited).filter(id => !!LM.World.get(id));
    st.documents = [];
    const docSeen = new Set();
    for (const id of arrayOf(raw.documents)) {
      if (typeof id === 'string' && LM.Story.documents[id] && !docSeen.has(id)) {
        docSeen.add(id);
        st.documents.push(id);
      }
    }
    st.interactions = {};
    if (isObject(raw.interactions)) {
      for (const key of Object.keys(raw.interactions)) {
        if (raw.interactions[key]) st.interactions[key] = true;
      }
    }

    if (isObject(raw.player)) {
      st.player.x = number(raw.player.x, 0, -5000, 5000);
      st.player.y = number(raw.player.y, 0, -5000, 5000);
      st.player.aim = number(raw.player.aim, Math.PI, -Math.PI * 4, Math.PI * 4);
    }
    if (isObject(raw.torch)) {
      st.torch.has = !!raw.torch.has;
      st.torch.active = !!raw.torch.active;
      st.torch.fuel = number(raw.torch.fuel, 100, 0, 100);
    }
    if (st.inventory.antorcha) st.torch.has = true;
    if (st.torch.has && !st.inventory.antorcha) st.inventory.antorcha = 1;
    if (!st.torch.has) {
      st.torch.active = false;
      st.torch.fuel = 0;
    }
    if (!st.torch.active) st.torch.active = false;
    if (st.torch.active && st.torch.fuel <= 0) st.torch.active = false;

    if (st.chapter_complete) st.flags.chapter_complete = true;
    if (!LM.Story.objectives[st.objective]) st.objective = inferObjective(st);

    const sc = LM.World.get(st.sceneId);
    if (sc) {
      const safe = findSafePosition(sc, st.player.x, st.player.y);
      if (!safe.found) {
        const spawn = sc.spawn || { x: sc.w / 2, y: sc.h / 2, aim: 0 };
        st.player.x = spawn.x;
        st.player.y = spawn.y;
        if (!Number.isFinite(Number(raw.player && raw.player.aim))) st.player.aim = spawn.aim || 0;
      } else {
        st.player.x = safe.x;
        st.player.y = safe.y;
      }
      if (st.player.aim == null) st.player.aim = sc.spawn ? sc.spawn.aim : 0;
    } else {
      st.sceneId = 'clinic_room';
    }
    return st;
  }

  function inferObjective(st) {
    const f = st.flags || {};
    if (st.chapter_complete || f.chapter_complete) return 'explore';
    if (f.tape_played) return 'explore';
    if (f.tape_taken || st.inventory.cinta_nana) {
      return st.sceneId === 'clinic_hall' ? 'play_tape' : 'return_refuge';
    }
    if (f.nadia_left || f.met_nadia) return 'take_tape';
    if (f.basement_open) return st.sceneId === 'house_basement' ? 'find_nadia' : 'descend';
    if (f.photo_found) {
      if (f.song_known) return st.sceneId === 'house_ground' ? 'open_basement' : 'find_clue';
      return 'find_door';
    }
    if (f.heard_radio) return st.sceneId === 'house_ground' ? 'photo_wall' : 'go_house';
    if (f.entered_hall) return 'reach_refuge';
    if (st.inventory.antorcha) return 'leave_room';
    return 'find_light';
  }

  function syncPlayer() {
    if (!state) return;
    state.player.x = state.player.x == null ? 0 : state.player.x;
    state.player.y = state.player.y == null ? 0 : state.player.y;
    state.player.aim = state.player.aim == null ? 0 : state.player.aim;
  }

  function writeSave(manual, reason) {
    if (!state) return false;
    syncPlayer();
    const payload = LM.Save.write(state, { reason: reason || 'auto', objective: state.objective });
    if (!payload) {
      if (manual && LM.UI) {
        LM.UI.toast({ kicker: 'ERROR DE ARCHIVO', name: 'No se pudo guardar la partida', icon: LM.Art.icon('journal') });
      }
      return false;
    }
    lastSaveAt = performance.now();
    if (LM.UI) {
      LM.UI.saveIndicator();
      LM.UI.refreshMenu();
      if (manual) {
        LM.UI.toast({ kicker: 'PARTIDA GUARDADA', name: scene ? scene.name : 'Puerto Niebla', icon: LM.Art.icon('journal') });
        if (LM.Audio) LM.Audio.save();
      }
    }
    return true;
  }

  function autoSave(reason, force) {
    if (!state || mode === 'menu' || mode === 'intro' || mode === 'boot') return false;
    const now = performance.now();
    if (!force && now - lastSaveAt < 2600) return false;
    return writeSave(false, reason || 'auto');
  }

  G.saveGame = function (manual) {
    if (!state) return false;
    return writeSave(!!manual, manual ? 'manual' : 'auto');
  };

  /* ============================================================
     GEOMETRÍA, COLISIONES Y POSICIONES SEGURAS
     ============================================================ */
  function getColliders(sc) {
    if (!sc) return [];
    let list = colliderCache.get(sc);
    if (!list) {
      list = LM.World.colliders(sc);
      colliderCache.set(sc, list);
    }
    return list;
  }

  function walkable(sc, x, y) {
    if (!sc) return false;
    if (sc.custom === 'street') {
      return x > 24 && x < sc.w - 24 && y > 468 && y < sc.h - 24;
    }
    const floors = sc.floors || [];
    for (const f of floors) {
      if (x >= f.x + 1 && x <= f.x + f.w - 1 && y >= f.y + 1 && y <= f.y + f.h - 1) return true;
    }
    return false;
  }

  function canStandIn(sc, x, y, radius) {
    if (!walkable(sc, x, y)) return false;
    const r = radius == null ? PLAYER.radius : radius;
    const colliders = getColliders(sc);
    for (let i = 0; i < colliders.length; i++) {
      if (U.circleRect(x, y, r, colliders[i])) return false;
    }
    return true;
  }

  function findSafePosition(sc, x, y) {
    if (!sc) return { x: x || 0, y: y || 0, found: false };
    if (canStandIn(sc, x, y, PLAYER.radius)) return { x, y, found: true };
    for (let ring = 1; ring <= 14; ring++) {
      const distance = ring * 14;
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2 + (ring % 2) * 0.157;
        const nx = x + Math.cos(angle) * distance;
        const ny = y + Math.sin(angle) * distance;
        if (canStandIn(sc, nx, ny, PLAYER.radius)) return { x: nx, y: ny, found: true };
      }
    }
    const spawn = sc.spawn;
    if (spawn && canStandIn(sc, spawn.x, spawn.y, PLAYER.radius)) return { x: spawn.x, y: spawn.y, found: true };
    const floors = sc.floors || [];
    for (const floor of floors) {
      const cx = floor.x + floor.w / 2;
      const cy = floor.y + floor.h / 2;
      if (canStandIn(sc, cx, cy, PLAYER.radius)) return { x: cx, y: cy, found: true };
    }
    return { x: x || 0, y: y || 0, found: false };
  }

  /* ============================================================
     CÁMARA Y VISTA
     ============================================================ */
  function targetZoom(sc) {
    if (!sc) return 1.14;
    if (sc.custom === 'street') return U.clamp(view.h / 900, 0.88, 1.32);
    const fitW = view.w / Math.max(320, sc.w);
    const fitH = view.h / Math.max(260, sc.h);
    return U.clamp(Math.max(fitW, fitH, 1.02), 0.96, 2.15);
  }

  function clampCamera(c, sc) {
    if (!c || !sc) return;
    const halfW = view.w / (2 * c.zoom);
    const halfH = view.h / (2 * c.zoom);
    if (sc.w <= halfW * 2) c.x = sc.w / 2;
    else c.x = U.clamp(c.x, halfW, sc.w - halfW);
    if (sc.h <= halfH * 2) c.y = sc.h / 2;
    else c.y = U.clamp(c.y, halfH, sc.h - halfH);
  }

  function shakeOffset() {
    let x = 0, y = 0;
    if (LM.FX) {
      const s = LM.FX.getShake();
      x += s.x;
      y += s.y;
    }
    if (settings.cameraMotion) {
      x += Math.sin(worldTime * 0.23) * 1.15;
      y += Math.cos(worldTime * 0.17) * 0.85;
    }
    return { x, y };
  }

  function renderCamera() {
    const z = cam.zoom || 1;
    const s = shakeOffset();
    return { x: cam.x - s.x / z, y: cam.y - s.y / z, zoom: z };
  }

  function worldToScreen(x, y, rc) {
    const c = rc || renderCamera();
    return {
      x: (x - c.x) * c.zoom + view.w / 2,
      y: (y - c.y) * c.zoom + view.h / 2
    };
  }

  function torchOrigin() {
    if (!state) return { x: 0, y: 0, aim: 0 };
    const p = state.player;
    const aim = p.aim || 0;
    return {
      x: p.x + Math.cos(aim) * 18,
      y: p.y + Math.sin(aim) * 18 - 12,
      aim
    };
  }

  function torchScreenPosition() {
    const t = torchOrigin();
    const rc = renderCamera();
    return worldToScreen(t.x, t.y, rc);
  }

  function updateCamera(dt) {
    if (!state || !scene) return;
    const aim = state.player.aim || 0;
    const ahead = PLAYER.interactRange * 0.68;
    const targetX = state.player.x + Math.cos(aim) * ahead;
    const targetY = state.player.y + Math.sin(aim) * ahead * 0.7;
    const smooth = CFG.CAMERA.smoothing;
    cam.x = U.damp(cam.x, targetX, smooth, dt);
    cam.y = U.damp(cam.y, targetY, smooth, dt);
    cam.zoom = U.damp(cam.zoom, targetZoom(scene), 3.2, dt);
    clampCamera(cam, scene);
  }

  function updateMenuCamera(dt) {
    if (!menuScene) return;
    const speed = settings.reduceMotion ? 0.22 : 1;
    const drift = Math.sin(menuTime * 0.045 * speed) * 165;
    const targetX = 1450 + drift;
    const targetY = 522 + Math.cos(menuTime * 0.036 * speed) * 10;
    menuCam.x = U.damp(menuCam.x, targetX, 0.8, dt);
    menuCam.y = U.damp(menuCam.y, targetY, 0.8, dt);
    menuCam.zoom = U.damp(menuCam.zoom, targetZoom(menuScene), 2.2, dt);
    clampCamera(menuCam, menuScene);
  }

  function menuRenderCamera() {
    const z = menuCam.zoom || 1;
    const sway = settings.cameraMotion
      ? { x: Math.sin(menuTime * 0.17) * 1.6, y: Math.cos(menuTime * 0.13) * 1.1 }
      : { x: 0, y: 0 };
    return { x: menuCam.x - sway.x / z, y: menuCam.y - sway.y / z, zoom: z };
  }

  /* ============================================================
     CARGA DE ESCENAS
     ============================================================ */
  function loadScene(id, spot, options) {
    const opts = options || {};
    const next = LM.World.prepare(id);
    if (!next) throw new Error('Escena desconocida: ' + id);

    const first = !!state && state.visited.indexOf(id) < 0;
    scene = next;
    sceneId = id;
    promptTarget = null;
    watcher = null;
    if (LM.UI) LM.UI.closePrompt();

    if (state) {
      if (first) state.visited.push(id);
      state.sceneId = id;
      const source = spot || next.spawn || { x: next.w / 2, y: next.h / 2, aim: 0 };
      const safe = findSafePosition(next, Number(source.x) || next.w / 2, Number(source.y) || next.h / 2);
      state.player.x = safe.x;
      state.player.y = safe.y;
      state.player.aim = Number.isFinite(Number(source.aim)) ? Number(source.aim) : (next.spawn ? next.spawn.aim : 0);
      playerVel.x = 0;
      playerVel.y = 0;
      playerMoving = false;
      stepTimer = 0;
      cam.zoom = targetZoom(next);
      cam.x = state.player.x + Math.cos(state.player.aim) * CFG.CAMERA.lookAhead;
      cam.y = state.player.y + Math.sin(state.player.aim) * CFG.CAMERA.lookAhead * 0.7;
      clampCamera(cam, next);
    }

    if (LM.Lighting) LM.Lighting.reset(next);
    if (LM.FX) LM.FX.setScene(next);
    if (LM.Audio) LM.Audio.setScene(id);
    if (state) syncSceneEntry(first, next);
    if (state) refreshHud();
    if (!opts.silent && state) enterSceneFlavor(first, next);
    return { scene: next, first };
  }

  function enterSceneFlavor(first, sc) {
    if (!state || !sc || !LM.UI) return;
    LM.UI.setLocation(sc.location || sc.name || 'Puerto Niebla');
    if (first) {
      const thoughts = {
        clinic_room: 'La habitación 03 huele a desinfectante y a aceite. La puerta está al fondo, pero la oscuridad pesa más.',
        clinic_hall: LM.Story.thoughts.corridor_dark,
        street: LM.Story.thoughts.street_first,
        house_ground: 'La casa 14 huele a polvo, a cera y a una canción que nadie ha cantado en veinte años.',
        house_upstairs: 'Los escalones terminan en un pasillo que parece más estrecho de lo que recordaba.',
        house_basement: LM.Story.thoughts.basement_cold
      };
      const line = thoughts[sc.id];
      if (line) {
        const expected = sc.id;
        setTimeout(function () {
          if (!state || sceneId !== expected || mode !== 'gameplay' || LM.UI.isBlocking()) return;
          say('MARA', line, { monologue: true });
        }, 820);
      }
    }
  }

  async function travelTo(target, spot, options) {
    if (!state || transitioning) return false;
    const opts = options || {};
    const targetScene = LM.World.get(target);
    if (!targetScene) return false;
    transitioning = true;
    busy = true;
    playerVel.x = 0;
    playerVel.y = 0;
    playerMoving = false;
    if (LM.UI) {
      LM.UI.closePrompt();
      LM.UI.clearSubtitles();
    }
    if (LM.Audio) LM.Audio.door(false);
    fadeScreen(true);
    const token = ++travelToken;
    await U.wait(360);
    if (token !== travelToken || !state) return false;
    const first = state.visited.indexOf(target) < 0;
    loadScene(target, spot, { silent: true });
    if (opts.onLoad) opts.onLoad(first, scene);
    await U.wait(160);
    fadeScreen(false);
    await U.wait(680);
    if (token !== travelToken) return false;
    transitioning = false;
    busy = false;
    if (state) {
      enterSceneFlavor(first, scene);
      autoSave('scene', false);
      refreshHud();
    }
    return true;
  }

  let travelToken = 0;
  function fadeScreen(on) {
    const el = document.getElementById('screen-fade');
    if (!el) return;
    el.classList.toggle('on', !!on);
  }

  /* ============================================================
     HUD Y AVISOS
     ============================================================ */
  function say(who, text, options) {
    if (!LM.UI || !text) return;
    const opts = Object.assign({ monologue: who === 'MARA' && !(options && options.radio) }, options || {});
    LM.UI.showSubtitle(who, text, opts);
  }

  function setObjective(id) {
    if (!state || !LM.Story.objectives[id]) return;
    state.objective = id;
    if (LM.UI) LM.UI.setObjective(LM.Story.objectives[id].text);
  }

  function refreshHud() {
    if (!state || !LM.UI) return;
    const objective = LM.Story.objectives[state.objective];
    LM.UI.setObjective(objective ? objective.text : 'Explorar Puerto Niebla.');
    LM.UI.updateTorch(state.torch.has, state.torch.active, state.torch.fuel);
    LM.UI.updateInventory(state);
  }

  function toastItem(id) {
    if (LM.UI) LM.UI.toastItem(id);
  }

  function grantItem(id, qty, options) {
    if (!state || !LM.Items[id]) return false;
    const opts = options || {};
    const amount = Math.max(1, Math.floor(qty || 1));
    state.inventory[id] = (state.inventory[id] || 0) + amount;
    if (id === 'antorcha') {
      state.torch.has = true;
      state.torch.fuel = Math.max(state.torch.fuel || 0, PLAYER.torchFuelMax);
      state.torch.active = true;
      lowFuelWarned = false;
      emptyWarned = false;
      if (LM.Audio) LM.Audio.torch(true);
    }
    if (opts.toast !== false) toastItem(id);
    refreshHud();
    return true;
  }

  function addJournal(entries) {
    if (!state || !Array.isArray(entries) || !entries.length) return [];
    const added = [];
    for (const pair of entries) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const kind = pair[0];
      const id = pair[1];
      const section = state.journal[kind];
      const data = LM.Story.journal[kind];
      if (!section || !data || !data[id]) continue;
      if (section.indexOf(id) >= 0) continue;
      section.push(id);
      added.push({ kind, id, entry: data[id] });
    }
    if (added.length && LM.UI) {
      if (added.length === 1) LM.UI.notifyJournal(added[0].kind, added[0].entry);
      else {
        LM.UI.toast({
          kicker: 'DIARIO DE INVESTIGACIÓN',
          name: added.length + ' entradas nuevas',
          icon: LM.Art.icon('journal')
        });
      }
    }
    return added;
  }

  function grantDocument(docId, options) {
    if (!state || !LM.Story.documents[docId]) return false;
    const opts = options || {};
    const doc = LM.Story.documents[docId];
    const isNew = state.documents.indexOf(docId) < 0;
    if (isNew) state.documents.push(docId);
    if (doc.journal) addJournal(doc.journal);
    afterDocument(docId);
    if (opts.open !== false && LM.UI) LM.UI.openReader(docId, opts.reader || null);
    if (LM.Audio) LM.Audio.paper();
    if (isNew) autoSave('document', false);
    return true;
  }

  function afterDocument(docId) {
    if (!state) return;
    if (docId === 'poema_lucia' || docId === 'diario_lucia' || docId === 'dibujo_nadia') {
      state.flags.song_known = true;
      if (state.objective === 'find_clue' || state.objective === 'find_door') {
        if (state.flags.photo_found) setObjective('open_basement');
      }
    }
    if (docId === 'transcripcion_18n') state.flags.knows_voice = true;
    if (docId === 'foto_reverso') state.flags.surveillance_seen = true;
    if (docId === 'mapa_lucia') state.flags.map_seen = true;
    if (docId === 'carta_irene') state.flags.tunnel_known = true;
    refreshHud();
  }

  /* ============================================================
     CICLO DE VIDA
     ============================================================ */
  G.init = function (options) {
    if (initialized) return;
    initialized = true;
    settings = Object.assign({}, LM.Settings, (options && options.settings) || {});
    canvas = document.getElementById('game-canvas');
    if (!canvas) throw new Error('No se encontró el lienzo del juego.');
    ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) throw new Error('Canvas 2D no está disponible.');

    LM.Input.init(canvas);
    LM.Audio.init(settings);
    LM.Audio.setMenu();
    LM.FX.init(settings);
    LM.FX.resize(window.innerWidth, window.innerHeight);
    LM.Lighting.setQuality(settings.quality);

    menuScene = LM.World.prepare('street');
    G.resize();
    LM.UI.init(G);
    LM.Cinematic.init(G);
    LM.Audio.setMenu();
    LM.UI.openMenu();

    window.addEventListener('resize', G.resize, { passive: true });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', G.resize, { passive: true });
  };

  G.resize = function () {
    if (!canvas) return;
    const quality = CFG.QUALITY[settings.quality] || CFG.QUALITY.high;
    const dpr = Math.min(window.devicePixelRatio || 1, quality.dprCap || 2);
    const w = Math.max(320, window.innerWidth || 1280);
    const h = Math.max(240, window.innerHeight || 720);
    view = { w, h, dpr };
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    LM.FX.resize(w, h);

    if (mode === 'menu' && menuScene) {
      menuCam.zoom = targetZoom(menuScene);
      clampCamera(menuCam, menuScene);
    } else if (scene && state) {
      cam.zoom = targetZoom(scene);
      clampCamera(cam, scene);
    }
  };

  G.menuShown = function () {
    introToken++;
    mode = 'menu';
    paused = true;
    busy = false;
    transitioning = false;
    playerVel.x = 0;
    playerVel.y = 0;
    playerMoving = false;
    watcher = null;
    promptTarget = null;
    state = null;
    scene = menuScene;
    sceneId = menuScene ? menuScene.id : '';
    if (LM.UI) {
      LM.UI.showHUD(false);
      LM.UI.closePrompt();
      LM.UI.clearSubtitles();
      LM.UI.setCursor(0, 0, false, false);
    }
    if (LM.Audio) {
      LM.Audio.radioStop();
      LM.Audio.tapeStop();
      LM.Audio.setDucked(false);
      LM.Audio.setMenu();
    }
    if (menuScene) {
      if (LM.Lighting) LM.Lighting.reset(menuScene);
      if (LM.FX) LM.FX.setScene(menuScene);
      menuCam.zoom = targetZoom(menuScene);
      clampCamera(menuCam, menuScene);
    }
    document.body.classList.remove('letterboxed');
  };

  G.newGame = function () {
    if (!initialized) return;
    LM.Save.clear();
    if (LM.UI) LM.UI.refreshMenu();
    if (LM.Audio) {
      LM.Audio.radioStop();
      LM.Audio.tapeStop();
      LM.Audio.setDucked(false);
    }
    state = freshState();
    mode = 'intro';
    paused = false;
    busy = true;
    transitioning = false;
    introToken++;
    lowFuelWarned = false;
    emptyWarned = false;
    lastSaveAt = 0;
    playerVel.x = 0;
    playerVel.y = 0;
    playerMoving = false;
    playerPhase = 0;
    stepTimer = 0;
    loadScene('clinic_room', state.player, { silent: true });
    if (LM.UI) {
      LM.UI.toGame();
      LM.UI.showHUD(false);
      LM.UI.clearSubtitles();
    }
    const token = introToken;
    setTimeout(function () {
      if (token !== introToken || mode !== 'intro') return;
      if (LM.Cinematic) {
        LM.Cinematic.playIntro().then(function () {
          if (mode === 'intro' && token === introToken) G.onIntroFinished();
        }).catch(function (err) {
          console.error(err);
          if (mode === 'intro' && token === introToken) G.onIntroFinished();
        });
      } else {
        G.onIntroFinished();
      }
    }, 120);
  };

  G.onIntroFinished = function () {
    if (mode !== 'intro' || !state) return;
    mode = 'gameplay';
    paused = false;
    busy = false;
    if (LM.UI) {
      LM.UI.toGame();
      LM.UI.showHUD(true);
    }
    refreshHud();
    enterSceneFlavor(true, scene);
    setObjective('find_light');
    autoSave('chapter-start', true);
  };

  G.continueGame = async function () {
    const data = LM.Save.load();
    if (!data) {
      if (LM.UI) LM.UI.refreshMenu();
      return false;
    }
    busy = true;
    transitioning = true;
    fadeScreen(true);
    await U.wait(320);
    try {
      state = hydrate(data.state);
      mode = 'gameplay';
      paused = true;
      introToken++;
      lowFuelWarned = state.torch.fuel <= 24;
      emptyWarned = state.torch.fuel <= 0;
      loadScene(state.sceneId, state.player, { silent: false });
      if (LM.UI) {
        LM.UI.toGame();
        LM.UI.showHUD(true);
      }
      refreshHud();
      await U.wait(220);
      fadeScreen(false);
      await U.wait(620);
      paused = false;
      busy = false;
      transitioning = false;
      if (LM.UI) {
        LM.UI.setLocation(scene.location || scene.name);
      }
      const objective = state.objective;
      if (objective === 'play_tape') {
        say('MARA', 'La clínica sigue en silencio. El magnetófono del control espera.', { monologue: true });
      } else if (objective === 'return_refuge') {
        say('MARA', LM.Story.thoughts.refuge_return, { monologue: true });
      }
      return true;
    } catch (err) {
      console.error(err);
      fadeScreen(false);
      busy = false;
      transitioning = false;
      paused = false;
      if (LM.UI) LM.UI.toast({ kicker: 'ERROR DE ARCHIVO', name: 'No se pudo recuperar la partida', icon: LM.Art.icon('journal') });
      return false;
    }
  };

  G.quitToMenu = function () {
    if (state) writeSave(false, 'quit');
    state = null;
    if (LM.UI) LM.UI.openMenu();
    else G.menuShown();
  };

  G.pauseGame = function () {
    if (mode !== 'gameplay' || !state) return;
    paused = true;
    playerVel.x = 0;
    playerVel.y = 0;
    playerMoving = false;
    if (LM.Audio) LM.Audio.setDucked(true);
    if (LM.UI) LM.UI.closePrompt();
  };

  G.resumeGame = function () {
    if (!state) return;
    paused = false;
    mode = 'gameplay';
    playerMoving = false;
    refreshHud();
    if (LM.Audio) LM.Audio.setDucked(false);
    if (LM.UI) LM.UI.showHUD(true);
    if (LM.Input) LM.Input.clear();
  };

  G.uiResumed = function () {
    if (!state || mode === 'intro' || mode === 'menu' || mode === 'boot') return;
    paused = false;
    playerMoving = false;
    if (mode === 'gameplay') {
      if (LM.Audio) LM.Audio.setDucked(false);
      if (LM.UI) LM.UI.showHUD(true);
      refreshHud();
    }
  };

  G.applySettings = function (next) {
    const previousQuality = settings.quality;
    settings = Object.assign({}, LM.Settings, next || {});
    if (LM.Audio) LM.Audio.setSettings(settings);
    if (LM.FX) LM.FX.configure(settings);
    if (LM.Lighting) LM.Lighting.setQuality(settings.quality);
    if (previousQuality !== settings.quality) G.resize();
    if (mode === 'menu' && menuScene) clampCamera(menuCam, menuScene);
    if (scene && state) clampCamera(cam, scene);
  };

  G.chapterExplore = function () {
    if (!state) return;
    mode = 'gameplay';
    paused = false;
    busy = false;
    setObjective('explore');
    if (LM.Audio) {
      LM.Audio.setDucked(false);
      LM.Audio.setScene(state.sceneId);
    }
    if (LM.UI) {
      LM.UI.showHUD(true);
      LM.UI.setLocation(scene ? (scene.location || scene.name) : 'Puerto Niebla');
    }
    refreshHud();
    autoSave('chapter-explore', true);
  };

  /* ============================================================
     BUCLE PRINCIPAL, ENTRADA Y SIMULACIÓN
     ============================================================ */
  let playerCrouching = false;
  let hudFuelClock = 0;

  function pressedCodes() {
    if (!LM.Input) return [];
    const out = [];
    for (const code of Object.keys(LM.Input.pressed)) {
      if (LM.Input.pressed[code]) out.push(code);
    }
    return out;
  }

  function delegateUIKeys() {
    if (!LM.UI || !LM.Input) return;
    for (const code of pressedCodes()) {
      if (LM.UI.handleKey(code)) LM.Input.consume(code);
    }
  }

  function setCursorFromMouse(active) {
    if (!LM.UI || !LM.Input) return;
    const m = LM.Input.mouse;
    const show = !!active && !!(m.active || m.moved);
    LM.UI.setCursor(m.x || 0, m.y || 0, show, show && !!promptTarget);
  }

  function handleGameplayKeys() {
    const I = LM.Input;
    if (!I) return false;
    if (I.wasPressed('Escape') || I.wasPressed('KeyP')) {
      if (LM.UI) LM.UI.openPause();
      return true;
    }
    if (I.wasPressed('KeyJ')) {
      if (LM.UI) LM.UI.openJournal();
      return true;
    }
    if (I.wasPressed('KeyI')) {
      if (LM.UI) LM.UI.openInventory();
      return true;
    }
    if (I.wasPressed('KeyF')) {
      G.toggleTorch();
      return true;
    }
    if (I.wasPressed('KeyR')) {
      G.useOil();
      return true;
    }
    if (I.wasPressed('KeyE') || I.wasPressed('Enter')) {
      interact();
      return true;
    }
    return false;
  }

  function updateAim(dt) {
    if (!state) return;
    const p = state.player;
    const m = LM.Input.mouse;
    if (m.active) {
      const wx = cam.x + (m.x - view.w / 2) / (cam.zoom || 1);
      const wy = cam.y + (m.y - view.h / 2) / (cam.zoom || 1);
      const target = Math.atan2(wy - p.y, wx - p.x);
      p.aim = U.angleLerp(p.aim, target, 1 - Math.exp(-22 * dt));
      return;
    }
    const axis = LM.Input.axis();
    if (axis.x || axis.y) {
      const target = Math.atan2(axis.y, axis.x);
      p.aim = U.angleLerp(p.aim, target, 1 - Math.exp(-9 * dt));
    }
  }

  function approach(value, target, amount) {
    if (value < target) return Math.min(value + amount, target);
    if (value > target) return Math.max(value - amount, target);
    return target;
  }

  function movePlayer(dx, dy) {
    if (!state || !scene) return 0;
    const p = state.player;
    const total = Math.hypot(dx, dy);
    if (total < .0001) return 0;
    const steps = Math.max(1, Math.min(9, Math.ceil(total / 4)));
    const sx = dx / steps;
    const sy = dy / steps;
    const ox = p.x, oy = p.y;
    for (let i = 0; i < steps; i++) {
      if (canStandIn(scene, p.x + sx, p.y, PLAYER.radius)) p.x += sx;
      else { playerVel.x = 0; }
      if (canStandIn(scene, p.x, p.y + sy, PLAYER.radius)) p.y += sy;
      else { playerVel.y = 0; }
    }
    return U.dist(ox, oy, p.x, p.y);
  }

  function updateMovement(dt) {
    if (!state || !scene) return;
    const axis = LM.Input.axis();
    playerCrouching = LM.Input.isCrouching();
    const running = LM.Input.isRunning() && !playerCrouching;
    const max = playerCrouching ? PLAYER.crouch : running ? PLAYER.run : PLAYER.walk;
    const tx = axis.x * max;
    const ty = axis.y * max;
    const rate = (axis.x || axis.y) ? PLAYER.accel : PLAYER.friction;
    playerVel.x = approach(playerVel.x, tx, rate * dt);
    playerVel.y = approach(playerVel.y, ty, rate * dt);

    const moved = movePlayer(playerVel.x * dt, playerVel.y * dt);
    const speed = Math.hypot(playerVel.x, playerVel.y);
    playerMoving = moved > .06 && speed > 8;
    if (playerMoving) {
      playerPhase += dt * (4.6 + Math.min(9, speed / 23));
      stepTimer -= dt;
      if (stepTimer <= 0) {
        if (LM.Audio) LM.Audio.footstep(running, playerCrouching);
        stepTimer = playerCrouching ? .52 : running ? .26 : .38;
      }
    } else {
      playerPhase += dt * 1.15;
      stepTimer = Math.min(stepTimer, .06);
    }
    state.steps += moved;
    state.playTime += dt;
  }

  function updateTorchBurn(dt) {
    if (!state) return;
    const torch = state.torch;
    if (!torch.has || !torch.active) return;
    torch.fuel = Math.max(0, torch.fuel - PLAYER.torchBurnPerSec * dt);
    hudFuelClock -= dt;
    if (hudFuelClock <= 0 && LM.UI) {
      hudFuelClock = .25;
      LM.UI.updateTorch(torch.has, torch.active, torch.fuel);
    }
    if (!lowFuelWarned && torch.fuel <= 24) {
      lowFuelWarned = true;
      if (LM.UI) {
        LM.UI.toast({ kicker: 'ANTORCHA', name: 'La llama se está apagando', icon: LM.Art.icon('torch') });
      }
    }
    if (torch.fuel <= 0) {
      torch.active = false;
      if (!emptyWarned) {
        emptyWarned = true;
        if (LM.Audio) LM.Audio.torch(false);
        say('MARA', 'La llama se ha apagado. Sin luz, la casa es otra casa.', { monologue: true, danger: true });
      }
      refreshHud();
    }
  }

  function findInteraction() {
    if (!state || !scene) return null;
    const p = state.player;
    const list = scene.interactions || [];
    let best = null;
    let bestD = Infinity;
    for (const it of list) {
      const available = it.type === 'door' ? true : LM.World.interactionAvailable(it, state);
      if (!available) continue;
      if (it.type === 'takeTape' && state.flags.tape_taken) continue;
      const d = U.dist(p.x, p.y, it.x, it.y);
      const reach = (it.radius || 48) + 6;
      if (d > reach) continue;
      if (d < bestD) { bestD = d; best = it; }
    }
    return best;
  }

  function updatePrompt() {
    if (!LM.UI) return;
    if (!state || !scene || paused || busy || transitioning || LM.UI.isBlocking()) {
      promptTarget = null;
      LM.UI.closePrompt();
      return;
    }
    const target = findInteraction();
    promptTarget = target;
    if (!target) {
      LM.UI.closePrompt();
      return;
    }
    const rc = renderCamera();
    const s = worldToScreen(target.x, target.y, rc);
    const x = U.clamp(s.x, 110, view.w - 110);
    const y = U.clamp(s.y - 18, 86, view.h - 86);
    LM.UI.showPrompt(target, x, y);
  }

  function updateWatcher(dt) {
    if (!watcher) return;
    watcher.life -= dt;
    if (watcher.life <= 0) watcher = null;
  }

  function checkTriggers() {
    if (!state || !scene) return;
    const p = state.player;
    for (const t of scene.triggers || []) {
      if (t.requiresFlags) {
        let ok = true;
        for (const f of t.requiresFlags) if (!state.flags[f]) { ok = false; break; }
        if (!ok) continue;
      }
      if (t.notFlags) {
        let blocked = false;
        for (const f of t.notFlags) if (state.flags[f]) { blocked = true; break; }
        if (blocked) continue;
      }
      if (!U.pointInRect(p.x, p.y, t)) continue;
      triggerEvent(t.event, t);
      break;
    }
  }

  function updateGameplay(dt) {
    if (!state || !scene) return;
    flushPendingThought();
    updateAim(dt);
    updateMovement(dt);
    updateTorchBurn(dt);
    updateWatcher(dt);
    updateCamera(dt);
    updatePrompt();
    checkTriggers();
  }

  function updateAtmosphere(dt) {
    if (!LM.FX) return;
    let on = false;
    let pos = null;
    if (state) {
      on = !!(state.torch.active && state.torch.fuel > 0);
      const t = torchOrigin();
      pos = worldToScreen(t.x, t.y, renderCamera());
    }
    LM.FX.setTorch(on, pos ? pos.x : 0, pos ? pos.y : 0);
    LM.FX.update(dt, { torch: on, torchPos: pos || undefined });
  }

  function updateMenuAtmosphere(dt) {
    if (!LM.FX) return;
    LM.FX.setTorch(false, 0, 0);
    LM.FX.update(dt, { torch: false });
  }

  G.frame = function (rawDt) {
    if (!initialized) return;
    const dt = U.clamp(Number(rawDt) || 0, 0, .05);
    worldTime += dt;
    menuTime += dt;
    if (LM.Audio) LM.Audio.update(dt);

    const blocking = !!(LM.UI && LM.UI.isBlocking());

    if (blocking) {
      if (mode === 'menu') {
        updateMenuCamera(dt);
        updateMenuAtmosphere(dt);
      } else {
        updateAtmosphere(dt);
        if (LM.UI) LM.UI.closePrompt();
      }
      delegateUIKeys();
      setCursorFromMouse(false);
      if (mode === 'menu' || !state || !scene) renderMenu();
      else renderWorld();
      LM.Input.endFrame();
      return;
    }

    if (mode === 'menu') {
      updateMenuCamera(dt);
      updateMenuAtmosphere(dt);
      setCursorFromMouse(false);
      renderMenu();
      LM.Input.endFrame();
      return;
    }

    if (mode === 'intro') {
      if (LM.Input.wasPressed('Escape') && LM.Cinematic && LM.Cinematic.isActive()) {
        LM.Cinematic.skip();
      }
      if (state && scene) {
        updateCamera(dt * .35);
        updateAtmosphere(dt);
        setCursorFromMouse(false);
        renderWorld();
      } else {
        renderMenu();
      }
      LM.Input.endFrame();
      return;
    }

    if ((mode === 'gameplay' || mode === 'chapter') && state && scene) {
      const active = mode === 'gameplay' && !paused && !busy && !transitioning;
      if (active) handleGameplayKeys();

      if (LM.UI && LM.UI.isBlocking()) {
        updateAtmosphere(dt);
        LM.UI.closePrompt();
        setCursorFromMouse(false);
        renderWorld();
        LM.Input.endFrame();
        return;
      }

      if (active) updateGameplay(dt);
      else {
        updateCamera(dt);
        updatePrompt();
      }
      updateAtmosphere(dt);
      setCursorFromMouse(mode === 'gameplay' && !paused && !busy && !transitioning);
      renderWorld();
      LM.Input.endFrame();
      return;
    }

    renderMenu();
    LM.Input.endFrame();
  };

  /* ============================================================
     RENDER
     ============================================================ */
  function drawOrderedWorld(rc) {
    if (!scene || !state) return;
    const p = state.player;
    const halfW = view.w / (2 * (rc.zoom || 1)) + 80;
    const halfH = view.h / (2 * (rc.zoom || 1)) + 80;
    const visible = (x, y, w, h) => {
      return x + w > rc.x - halfW && x < rc.x + halfW && y + h > rc.y - halfH && y < rc.y + halfH;
    };
    const list = [];

    for (const prop of scene.props || []) {
      if (!LM.World.visibleProp(prop, state)) continue;
      if (!visible(prop.x, prop.y, prop.w || 60, prop.h || 60)) continue;
      list.push({ y: prop.y + (prop.h || 60), kind: 'prop', data: prop });
    }

    for (const npc of scene.npcs || []) {
      if (!LM.World.visibleNpc(npc, state)) continue;
      if (!visible(npc.x - 40, npc.y - 80, 80, 100)) continue;
      list.push({ y: npc.y + 8, kind: 'npc', data: npc });
    }

    if (watcher) {
      list.push({ y: watcher.y + 10, kind: 'watcher', data: watcher });
    }

    list.push({ y: p.y + 8, kind: 'player', data: p });
    list.sort((a, b) => a.y - b.y);

    for (const item of list) {
      if (item.kind === 'prop') LM.Props.draw(ctx, item.data, worldTime);
      else if (item.kind === 'npc') {
        const npc = item.data;
        LM.Characters.drawNadia(ctx, npc.x, npc.y, { aim: npc.aim, t: worldTime, crouch: false });
      } else if (item.kind === 'player') {
        const active = state.torch.has && state.torch.active && state.torch.fuel > 0;
        LM.Characters.drawMara(ctx, p.x, p.y, {
          aim: p.aim,
          moving: playerMoving,
          phase: playerPhase,
          torch: active,
          fuel: state.torch.fuel,
          t: worldTime,
          crouch: playerCrouching,
          hideTorch: !state.torch.has
        });
      } else if (item.kind === 'watcher') {
        const w = item.data;
        const fade = U.clamp(w.life * 1.8, 0, 1);
        LM.Characters.drawWatcher(ctx, w.x, w.y, {
          t: worldTime,
          alpha: (w.alpha == null ? .8 : w.alpha) * fade,
          scale: w.scale || 1
        });
      }
    }
  }

  function renderWorld() {
    if (!scene || !ctx) return;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.fillStyle = scene.voidColor || '#040707';
    ctx.fillRect(0, 0, view.w, view.h);
    if (scene._bg) {
      const rc = renderCamera();
      ctx.save();
      ctx.translate(view.w / 2, view.h / 2);
      ctx.scale(rc.zoom, rc.zoom);
      ctx.translate(-rc.x, -rc.y);
      ctx.drawImage(scene._bg, 0, 0);
      drawOrderedWorld(rc);
      ctx.restore();

      if (LM.Lighting) {
        const t = torchOrigin();
        const torch = {
          x: t.x, y: t.y, aim: t.aim,
          active: !!(state && state.torch.active && state.torch.fuel > 0),
          fuel: state ? state.torch.fuel : 0
        };
        LM.Lighting.render(ctx, view, rc, scene, torch, worldTime);
      }
      if (LM.FX) LM.FX.render(ctx, view, rc);
    }
  }

  function renderMenu() {
    if (!menuScene || !ctx) return;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.fillStyle = menuScene.voidColor || '#040707';
    ctx.fillRect(0, 0, view.w, view.h);
    const rc = menuRenderCamera();
    ctx.save();
    ctx.translate(view.w / 2, view.h / 2);
    ctx.scale(rc.zoom, rc.zoom);
    ctx.translate(-rc.x, -rc.y);
    if (menuScene._bg) ctx.drawImage(menuScene._bg, 0, 0);
    const props = menuScene.props || [];
    for (const p of props) {
      if (p.x + (p.w || 60) < rc.x - view.w / (2 * rc.zoom) - 80) continue;
      if (p.x > rc.x + view.w / (2 * rc.zoom) + 80) continue;
      LM.Props.draw(ctx, p, menuTime);
    }
    ctx.restore();

    if (LM.Lighting) LM.Lighting.render(ctx, view, rc, menuScene, null, menuTime);
    if (LM.FX) LM.FX.render(ctx, view, rc);
  }


  /* ============================================================
     PROGRESIÓN DE ESCENA Y OBJETIVOS
     ============================================================ */
  let pendingThought = null;

  function hasItem(id) {
    if (!state || !id) return false;
    if (id === 'antorcha') return !!state.torch.has;
    return (state.inventory[id] || 0) > 0;
  }

  function setFlag(name, value) {
    if (!state || !name) return;
    state.flags[name] = value === undefined ? true : value;
  }

  function syncSceneEntry(first, sc) {
    if (!state || !sc) return;
    if (sc.id === 'clinic_hall' && !state.flags.entered_hall) state.flags.entered_hall = true;
    const places = {
      clinic_room: 'pl_room03',
      clinic_hall: 'pl_clinic',
      street: 'pl_street',
      house_ground: 'pl_house',
      house_upstairs: 'pl_house',
      house_basement: 'pl_basement'
    };
    const place = places[sc.id];
    if (place) addJournal([['places', place]]);
    refreshObjectiveForScene(sc);
  }

  function refreshObjectiveForScene(sc) {
    if (!state || !sc) return;
    const f = state.flags || {};
    if (state.chapter_complete || f.chapter_complete) {
      setObjective('explore');
      return;
    }
    if (state.flags.tape_taken || hasItem('cinta_nana')) {
      setObjective(sc.id === 'clinic_hall' ? 'play_tape' : 'return_refuge');
      return;
    }
    if (f.met_nadia) {
      setObjective('take_tape');
      return;
    }
    if (f.basement_open) {
      setObjective(sc.id === 'house_basement' ? 'find_nadia' : 'descend');
      return;
    }
    if (f.photo_found) {
      if (f.song_known) {
        setObjective('open_basement');
      } else if (sc.id === 'house_upstairs') {
        setObjective('find_clue');
      } else {
        setObjective('find_door');
      }
      return;
    }
    if (f.heard_radio) {
      if (sc.id === 'house_ground') setObjective('photo_wall');
      else if (sc.id === 'house_upstairs') setObjective('photo_wall');
      else if (sc.id === 'street') setObjective('go_house');
      else setObjective('go_house');
      return;
    }
    if (f.entered_hall) {
      setObjective('reach_refuge');
      return;
    }
    if (hasItem('antorcha')) {
      setObjective('leave_room');
      return;
    }
    setObjective('find_light');
  }

  /* ============================================================
     INTERACCIÓN CONTEXTUAL
     ============================================================ */
  function queueThought(text, options) {
    if (!text) return;
    pendingThought = { text: text, options: options || null };
  }

  function flushPendingThought() {
    if (!pendingThought) return;
    if (!state || !LM.UI || LM.UI.isBlocking()) return;
    const item = pendingThought;
    pendingThought = null;
    say('MARA', item.text, Object.assign({ monologue: true }, item.options || {}));
  }

  function markUsed(it) {
    if (state && it && it.id) state.interactions[it.id] = true;
  }

  function interactionToast(name, iconId) {
    if (!LM.UI) return;
    LM.UI.toast({
      kicker: 'OBJETO ADQUIRIDO',
      name: name,
      icon: LM.Art.icon(iconId || 'journal')
    });
  }

  function burstAt(it, amount) {
    if (!LM.FX) return;
    const spot = worldToScreen(it.x, it.y, renderCamera());
    LM.FX.burstDust(spot.x, spot.y, amount || 5);
  }

  function journalHasClue(list, clueId) {
    if (!Array.isArray(list)) return false;
    return list.some(pair => Array.isArray(pair) && pair[0] === 'clues' && pair[1] === clueId);
  }

  function interact() {
    if (!state || !scene || mode !== 'gameplay' || paused || busy || transitioning) return false;
    if (LM.UI && LM.UI.isBlocking()) return false;
    const target = promptTarget || findInteraction();
    if (!target) return false;
    executeInteraction(target);
    return true;
  }

  function executeInteraction(it) {
    if (!it) return;
    switch (it.type) {
      case 'door': useDoor(it); break;
      case 'item':
      case 'multi': takeItem(it); break;
      case 'document': readDocument(it); break;
      case 'examine': examineThing(it); break;
      case 'radio': useRadio(it); break;
      case 'recorder': useRecorder(it); break;
      case 'save': useSavePoint(it); break;
      case 'dial': useBasementDial(it); break;
      case 'photoWall': usePhotoWall(it); break;
      case 'musicbox': useMusicBox(it); break;
      case 'takeTape': useTakeTape(it); break;
      case 'phone': answerPhone(it); break;
      default: examineThing(it); break;
    }
  }

  function takeItem(it) {
    if (!state || !it || state.taken.indexOf(it.id) >= 0) return;
    const ids = it.type === 'multi' ? (it.items || []) : [it.item];
    const valid = ids.filter(id => !!LM.Items[id]);
    if (!valid.length) return;
    for (const id of valid) grantItem(id, 1, { toast: false });
    state.taken.push(it.id);
    markUsed(it);
    if (it.journal) addJournal(it.journal);
    if (it.flag) setFlag(it.flag);
    if (it.objectiveAfter) setObjective(it.objectiveAfter);
    if (it.thought) say('MARA', it.thought, { monologue: true });
    if (it.toast) interactionToast(it.toast, LM.Items[valid[0]].icon);
    else {
      for (const id of valid) toastItem(id);
    }
    if (LM.Audio) LM.Audio.item();
    burstAt(it, 6);
    refreshHud();
    autoSave('item', false);
  }

  function readDocument(it) {
    if (!state || !it || !it.doc || !LM.Story.documents[it.doc]) return;
    markUsed(it);
    if (it.flag) setFlag(it.flag);
    if (it.journal) addJournal(it.journal);
    grantDocument(it.doc);
    if (it.objectiveAfter) setObjective(it.objectiveAfter);
    refreshHud();
  }

  function examineThing(it) {
    if (!state || !it) return;
    markUsed(it);
    if (it.journal) addJournal(it.journal);
    if (it.flag) setFlag(it.flag);
    if (it.objectiveAfter) setObjective(it.objectiveAfter);
    if (journalHasClue(it.journal, 'c_poem') && !state.flags.song_known) {
      state.flags.song_known = true;
      if (state.flags.photo_found && (state.objective === 'find_door' || state.objective === 'find_clue')) {
        setObjective('open_basement');
      }
    }
    if (it.thought) say('MARA', it.thought, { monologue: true });
    examineEffects(it);
    refreshHud();
  }

  function examineEffects(it) {
    switch (it.id) {
      case 'house_piano':
        if (LM.Audio) LM.Audio.musicbox();
        break;
      case 'house_study_radio':
        if (LM.Audio) {
          LM.Audio.voiceBlip('NADIA');
          LM.Audio.whisper(.4);
        }
        break;
      case 'up_irene_door':
        if (LM.Audio) LM.Audio.knock([3, 2, 4]);
        if (LM.FX) LM.FX.shake(2.2, .55);
        break;
      case 'room_mirror':
        if (LM.Audio) LM.Audio.heartbeat();
        break;
      case 'house_fireplace':
        burstAt(it, 9);
        break;
      case 'base_furnace':
        if (LM.Audio) LM.Audio.heartbeat();
        if (LM.FX) LM.FX.shake(1.2, .35);
        break;
      case 'base_mic':
        if (LM.Audio) LM.Audio.voiceBlip('NADIA');
        break;
      case 'base_tunnel':
      case 'street_footprints':
      case 'street_manhole':
      case 'street_window':
      case 'up_bed_nadia':
        if (LM.Audio) LM.Audio.whisper(.3);
        break;
      default:
        break;
    }
  }

  function useDoor(it) {
    if (!state || !it || !it.target) return;
    if (it.requiresItem && !hasItem(it.requiresItem)) {
      say('MARA', it.lockedText || 'No puedo abrir esta puerta todavía.', { monologue: true });
      return;
    }
    if (it.requiresFlags) {
      for (const f of it.requiresFlags) {
        if (!state.flags[f]) {
          say('MARA', it.lockedText || 'La puerta no cede. Falta algo.', { monologue: true });
          return;
        }
      }
    }
    markUsed(it);
    travelTo(it.target, it.spawn).then(function (ok) {
      if (!ok || !it.thought || !state) return;
      setTimeout(function () {
        if (!state || !scene || mode !== 'gameplay' || (LM.UI && LM.UI.isBlocking())) return;
        say('MARA', it.thought, { monologue: true });
      }, 380);
    });
  }

  function useRadio(it) {
    if (!state || !it || !it.dialogue || !LM.UI) return;
    markUsed(it);
    if (LM.Audio) {
      LM.Audio.setDucked(true);
      LM.Audio.radioStart();
    }
    LM.UI.openDialogue(it.dialogue, function () {
      if (LM.Audio) {
        LM.Audio.radioStop();
        LM.Audio.setDucked(false);
      }
      if (!state) return;
      const first = !state.flags.heard_radio;
      setFlag('heard_radio');
      addJournal([
        ['clues', 'c_radio'],
        ['people', 'p_elias'],
        ['people', 'p_nadia'],
        ['questions', 'q_voice'],
        ['places', 'pl_house']
      ]);
      if (first) {
        setObjective('go_house');
        refreshHud();
        autoSave('radio', true);
        setTimeout(function () {
          if (!state || sceneId !== 'clinic_hall' || mode !== 'gameplay') return;
          if (LM.UI && LM.UI.isBlocking()) return;
          say('MARA', 'El cierre magnético de urgencias ha cedido. La calle está al final del pasillo.', { monologue: true });
        }, 1500);
      }
    });
  }

  function useRecorder(it) {
    if (!state || !it) return;
    markUsed(it);
    if (!state.flags.met_nadia) {
      say('MARA', LM.Story.thoughts.recorder, { monologue: true });
      return;
    }
    if (!hasItem('cinta_nana')) {
      say('MARA', 'El carrete del magnetófono está vacío. La cinta sigue en el sótano de la Casa 14.', { monologue: true });
      setObjective('take_tape');
      refreshHud();
      return;
    }
    const first = !state.chapter_complete;
    if (LM.Audio) {
      LM.Audio.setDucked(true);
      LM.Audio.tapeStart();
    }
    LM.UI.openDialogue('ending_tape', function () {
      if (LM.Audio) {
        LM.Audio.tapeStop();
        LM.Audio.setDucked(false);
      }
      if (!state) return;
      state.flags.tape_played = true;
      state.chapter_complete = true;
      state.flags.chapter_complete = true;
      state.chapter = 1;
      addJournal([
        ['clues', 'c_tape'],
        ['clues', 'c_isolation'],
        ['questions', 'q_voice'],
        ['questions', 'q_lucia'],
        ['people', 'p_lucia']
      ]);
      setObjective('explore');
      refreshHud();
      autoSave('chapter-complete', true);
      if (!first) return;
      mode = 'chapter';
      paused = true;
      busy = true;
      if (LM.FX) {
        LM.FX.flash(.1, 900);
        LM.FX.shake(2, .45);
      }
      setTimeout(function () {
        if (!state || mode !== 'chapter') return;
        if (LM.UI) LM.UI.showChapter(state);
      }, 720);
    });
  }

  function useSavePoint(it) {
    if (!state || !it) return;
    markUsed(it);
    if (it.thought) say('MARA', it.thought, { monologue: true });
    G.saveGame(true);
  }

  function useBasementDial(it) {
    if (!state || !it) return;
    if (!hasItem('diapason')) {
      say('MARA', it.lockedText || LM.Story.thoughts.door_no_fork, { monologue: true });
      return;
    }
    if (!state.flags.photo_found) {
      say('MARA', 'Cuatro marcas en la puerta. Antes de girarlas, necesito saber qué quería decir la casa. La pared de fotografías del salón guarda algo.', { monologue: true });
      setObjective('photo_wall');
      refreshHud();
      return;
    }
    if (!state.flags.song_known) {
      say('MARA', 'El diapasón entra en la hendidura, pero la casa espera el orden de una canción que todavía no sé. La respuesta está en el estudio y en la planta alta.', { monologue: true });
      setObjective('find_clue');
      refreshHud();
      return;
    }
    markUsed(it);
    if (LM.Audio) LM.Audio.heartbeat();
    LM.UI.openDial({
      onSolved: function () {
        if (!state) return;
        setFlag('basement_open');
        addJournal([['places', 'pl_basement']]);
        setObjective('descend');
        refreshHud();
        autoSave('basement-open', true);
        if (LM.FX) {
          LM.FX.flash(.09, 700);
          LM.FX.shake(2.4, .5);
        }
        setTimeout(function () {
          if (!state) return;
          travelTo('house_basement', { x: 238, y: 232, aim: Math.PI / 2 });
        }, 320);
      },
      onClose: function () {
        if (state) say('MARA', LM.Story.thoughts.door_with_fork, { monologue: true });
      }
    });
  }

  function usePhotoWall(it) {
    if (!state || !it) return;
    markUsed(it);
    const first = !state.flags.photo_found;
    if (!first) {
      grantDocument(it.doc);
      return;
    }
    setFlag('photo_found');
    if (it.flag) setFlag(it.flag);
    if (it.item) grantItem(it.item, 1);
    if (it.journal) addJournal(it.journal);
    setObjective(state.flags.song_known ? 'open_basement' : (it.objectiveAfter || 'find_door'));
    grantDocument(it.doc);
    queueThought(it.thought || LM.Story.thoughts.photo_hidden);
    if (LM.Audio) LM.Audio.heartbeat();
    if (LM.FX) {
      LM.FX.flash(.16, 700);
      LM.FX.shake(1.6, .35);
    }
    refreshHud();
    autoSave('photo-wall', true);
  }

  function useMusicBox(it) {
    if (!state || !it) return;
    markUsed(it);
    setFlag('musicbox_heard');
    if (LM.Audio) LM.Audio.musicbox();
    if (LM.FX) LM.FX.flash(.06, 1400);
    say('MARA', 'La caja no tiene bailarina. Solo un cilindro y cuatro dientes. La melodía asciende por la pared y se detiene justo encima de la puerta del sótano.', { monologue: true });
    addJournal([['questions', 'q_last']]);
    refreshHud();
  }

  function useTakeTape(it) {
    if (!state || !it || !state.flags.met_nadia) return;
    if (state.flags.tape_taken) return;
    markUsed(it);
    grantItem('cinta_nana', 1, { toast: false });
    toastItem('cinta_nana');
    setFlag('tape_taken');
    addJournal([['questions', 'q_voice'], ['places', 'pl_basement']]);
    setObjective('return_refuge');
    if (it.thought) say('MARA', it.thought, { monologue: true });
    if (LM.Audio) LM.Audio.item();
    burstAt(it, 5);
    refreshHud();
    autoSave('tape', true);
  }

  function answerPhone(it) {
    if (!state || !it) return;
    markUsed(it);
    if (it.journal) addJournal(it.journal);
    if (it.thought) say('MARA', it.thought, { monologue: true });
    if (LM.Audio) {
      LM.Audio.heartbeat();
      LM.Audio.whisper(-.25);
    }
    if (LM.FX) LM.FX.shake(1.1, .3);
    refreshHud();
    autoSave('phone', false);
  }

  /* ============================================================
     EVENTOS NARRATIVOS
     ============================================================ */
  function spawnWatcher(x, y, life, alpha, scale) {
    watcher = {
      x: x,
      y: y,
      life: life == null ? 3.4 : life,
      alpha: alpha == null ? .68 : alpha,
      scale: scale == null ? 1 : scale
    };
  }

  function triggerEvent(name, trigger) {
    if (!state) return;
    switch (name) {
      case 'watcher_hall':
        if (state.flags.watcher_seen) return;
        setFlag('watcher_seen');
        spawnWatcher(300, 300, 4.2, .72, .96);
        addJournal([['questions', 'q_awake']]);
        if (LM.Audio) {
          LM.Audio.scare();
          LM.Audio.heartbeat();
        }
        if (LM.FX) {
          LM.FX.flash(.08, 280);
          LM.FX.shake(2.6, .45);
        }
        say('MARA', LM.Story.thoughts.watcher_hall, { monologue: true, danger: true });
        autoSave('watcher', true);
        break;
      case 'street_watcher':
        if (state.flags.watcher_street) return;
        setFlag('watcher_street');
        spawnWatcher(1272, 512, 5.2, .55, 1);
        addJournal([['questions', 'q_nadia']]);
        if (LM.Audio) {
          LM.Audio.whisper(-.45);
          LM.Audio.heartbeat();
        }
        if (LM.FX) LM.FX.shake(1.4, .35);
        say('MARA', 'Bajo la lluvia hay una figura inmóvil junto a la farmacia. No lleva paraguas. Cuando la miro de frente, ya solo queda una farola encendida.', { monologue: true, danger: true });
        break;
      case 'street_house_look':
        if (state.flags.house_look) return;
        setFlag('house_look');
        if (!state.flags.photo_found) setObjective('enter_house');
        addJournal([['places', 'pl_house'], ['questions', 'q_nadia']]);
        if (LM.Audio) LM.Audio.heartbeat();
        say('MARA', LM.Story.thoughts.house_window, { monologue: true });
        refreshHud();
        break;
      case 'house_study_whisper':
        if (state.flags.house_whisper) return;
        setFlag('house_whisper');
        addJournal([['questions', 'q_voice']]);
        if (LM.Audio) {
          LM.Audio.whisper(.35);
          LM.Audio.heartbeat();
        }
        if (LM.FX) LM.FX.shake(1.2, .35);
        setTimeout(function () {
          if (!state || sceneId !== 'house_ground' || mode !== 'gameplay') return;
          if (LM.UI && LM.UI.isBlocking()) return;
          say('VOZ', '«La puerta no se abre con la voz. Se abre con la canción.»', { radio: true, danger: true });
        }, 650);
        break;
      case 'house_presence':
        if (state.flags.house_presence) return;
        setFlag('house_presence');
        spawnWatcher(1088, 292, 2.8, .42, .96);
        addJournal([['questions', 'q_last']]);
        if (LM.Audio) {
          LM.Audio.heartbeat();
          LM.Audio.whisper(.5);
        }
        if (LM.FX) LM.FX.shake(1.8, .4);
        say('MARA', 'La casa ha cambiado de postura. El pasillo que acabo de cruzar ya no termina donde terminaba.', { monologue: true, danger: true });
        break;
      case 'upstairs_knock':
        if (state.flags.upstairs_knock) return;
        setFlag('upstairs_knock');
        addJournal([['people', 'p_irene'], ['questions', 'q_last']]);
        if (!state.flags.song_known) setObjective('find_clue');
        if (LM.Audio) LM.Audio.knock([3, 2, 4]);
        if (LM.FX) LM.FX.shake(2, .5);
        setTimeout(function () {
          if (!state || sceneId !== 'house_upstairs' || mode !== 'gameplay') return;
          if (LM.UI && LM.UI.isBlocking()) return;
          say('MARA', 'Tres golpes. Dos. Cuatro. La habitación de Irene responde desde el otro lado de una puerta que lleva cerrada veinte años.', { monologue: true, danger: true });
        }, 900);
        refreshHud();
        break;
      case 'nadia_meet':
        startNadiaEncounter(trigger);
        break;
      case 'basement_whisper':
        if (state.flags.basement_whisper) return;
        setFlag('basement_whisper');
        addJournal([['questions', 'q_voice'], ['questions', 'q_last']]);
        if (LM.Audio) {
          LM.Audio.whisper(.55);
          LM.Audio.heartbeat();
        }
        if (LM.FX) LM.FX.shake(1.3, .4);
        setTimeout(function () {
          if (!state || sceneId !== 'house_basement' || mode !== 'gameplay') return;
          if (LM.UI && LM.UI.isBlocking()) return;
          say('NADIA', 'No mires la aguja cuando suba sola. Ya está escuchando.', { radio: true, danger: true });
        }, 800);
        break;
      default:
        break;
    }
  }

  function startNadiaEncounter(trigger) {
    if (!state || state.flags.met_nadia) return;
    if (!LM.UI) return;
    setFlag('met_nadia');
    state.interactions['trigger:' + (trigger ? trigger.id : 'nadia')] = true;
    const npc = (scene.npcs || []).find(n => n.id === 'nadia');
    if (npc) {
      state.player.aim = Math.atan2(npc.y - state.player.y, npc.x - state.player.x);
    }
    if (LM.Audio) {
      LM.Audio.radioStop();
      LM.Audio.tapeStop();
      LM.Audio.heartbeat();
      LM.Audio.whisper(.15);
    }
    if (LM.FX) LM.FX.shake(1.5, .35);
    LM.UI.openDialogue('nadia_basement', function () {
      if (!state) return;
      setFlag('met_nadia');
      setFlag('nadia_left');
      grantItem('cinta_nadia', 1, { toast: false });
      grantItem('llave_radio', 1, { toast: false });
      toastItem('cinta_nadia');
      toastItem('llave_radio');
      addJournal([
        ['people', 'p_nadia'],
        ['people', 'p_irene'],
        ['clues', 'c_key'],
        ['questions', 'q_nadia'],
        ['places', 'pl_basement']
      ]);
      setObjective('take_tape');
      if (LM.Audio) LM.Audio.item();
      if (LM.FX) {
        LM.FX.flash(.18, 720);
        LM.FX.shake(2.2, .45);
      }
      refreshHud();
      autoSave('nadia', true);
      setTimeout(function () {
        if (!state || !state.flags.met_nadia) return;
        if (LM.UI && LM.UI.isBlocking()) return;
        say('MARA', LM.Story.thoughts.key_taken, { monologue: true });
      }, 1100);
    });
  }

  /* ============================================================
     ANTORCHA Y ACEITE
     ============================================================ */
  G.toggleTorch = function () {
    if (!state) return;
    if (!state.torch.has) {
      say('MARA', 'Todavía no tengo luz. Sin ella, esta habitación es solo una lista de ruidos.', { monologue: true });
      return;
    }
    if (state.torch.active) {
      state.torch.active = false;
      if (LM.Audio) LM.Audio.torch(false);
      refreshHud();
      return;
    }
    if (state.torch.fuel <= 0) {
      say('MARA', 'La antorcha está seca. Necesito aceite antes de volver a encenderla.', { monologue: true });
      return;
    }
    state.torch.active = true;
    lowFuelWarned = state.torch.fuel <= 24;
    emptyWarned = false;
    if (LM.Audio) LM.Audio.torch(true);
    refreshHud();
  };

  G.useOil = function () {
    if (!state) return false;
    if (!state.torch.has) return false;
    const amount = state.inventory.petroleo || 0;
    if (amount <= 0) {
      if (LM.UI) {
        LM.UI.toast({ kicker: 'ANTORCHA', name: LM.Story.toasts.no_oil, icon: LM.Art.icon('oil') });
      }
      return false;
    }
    if (state.torch.fuel >= PLAYER.torchFuelMax - .5) {
      if (LM.UI) {
        LM.UI.toast({ kicker: 'ANTORCHA', name: 'El depósito ya está lleno', icon: LM.Art.icon('torch') });
      }
      return false;
    }
    state.inventory.petroleo = amount - 1;
    if (state.inventory.petroleo <= 0) delete state.inventory.petroleo;
    state.torch.fuel = Math.min(PLAYER.torchFuelMax, state.torch.fuel + PLAYER.torchOilRestore);
    state.torch.active = true;
    lowFuelWarned = state.torch.fuel <= 24;
    emptyWarned = false;
    if (LM.Audio) {
      LM.Audio.oil();
      LM.Audio.torch(true);
    }
    if (LM.UI) {
      LM.UI.toast({ kicker: 'ANTORCHA', name: LM.Story.toasts.oil_used, icon: LM.Art.icon('oil') });
      LM.UI.updateInventory(state);
    }
    refreshHud();
    return true;
  };

  /* ============================================================
     PRUEBA DE ARRANQUE
     ============================================================ */
  G.debug = {
    scene: () => sceneId,
    mode: () => mode,
    objective: () => state && state.objective,
    flags: () => state && Object.assign({}, state.flags),
    player: () => state && { x: Math.round(state.player.x), y: Math.round(state.player.y), aim: state.player.aim },
    torch: () => state && Object.assign({}, state.torch),
    inventory: () => state && Object.assign({}, state.inventory),
    prompt: () => promptTarget && { id: promptTarget.id, label: promptTarget.label, verb: promptTarget.verb },
    ui: () => LM.UI && LM.UI.currentScreen()
  };
})();
