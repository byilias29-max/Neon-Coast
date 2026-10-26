'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — escenarios, colisiones y puntos de interés
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U;
  const W = {};
  LM.World = W;

  const scenes = {};
  W.scenes = scenes;

  function wall(x, y, w, h, face, style, seed, extra) {
    return Object.assign({ x, y, w, h, face, style: style || 'plaster', seed: seed || 1, shadowDepth: 22 }, extra || {});
  }
  function prop(type, x, y, w, h, extra) {
    return Object.assign({ type, x, y, w, h }, extra || {});
  }
  function rect(x, y, w, h) { return { x, y, w, h }; }
  function entry(arr, data) { arr.push(data); return data; }

  /* ============================================================
     HABITACIÓN 03 — CLÍNICA AURORA
     ============================================================ */
  scenes.clinic_room = {
    id: 'clinic_room',
    name: 'Habitación 03',
    location: 'Clínica Aurora · Ala este',
    ambience: 'clinic',
    w: 920, h: 640,
    voidColor: '#030606',
    darkness: 0.9,
    spawn: { x: 382, y: 372, aim: Math.PI },
    floors: [
      { type: 'tile', variant: 'clinic', x: 138, y: 118, w: 644, h: 442, seed: 5, size: 64, tint: 'rgba(20,32,30,.18)' }
    ],
    walls: [
      wall(100, 80, 720, 38, 's', 'clinic', 5),
      wall(100, 118, 38, 480, 'e', 'clinic', 7),
      wall(782, 118, 38, 480, 'w', 'clinic', 7),
      wall(100, 598, 330, 38, 'n', 'clinic', 9),
      wall(502, 598, 318, 38, 'n', 'clinic', 9)
    ],
    windows: [
      { x: 620, y: 86, w: 120, h: 27, frame: '#2b3531', curtain: false, warm: false }
    ],
    doors: [
      { x: 430, y: 548, w: 72, h: 18, orientation: 'h', plaque: '03' }
    ],
    wallArt: [
      { type: 'clock', x: 168, y: 88, w: 34, h: 34 },
      { type: 'notice', x: 286, y: 88, w: 92, h: 48 },
      { type: 'mirror', x: 756, y: 292, w: 18, h: 84 },
      { type: 'sign', x: 438, y: 522, w: 56, h: 13, text: 'SALIDA', font: 6 }
    ],
    floorDetails: [
      { type: 'puddle', x: 280, y: 470, rx: 34, ry: 10, alpha: .2 },
      { type: 'paper', x: 520, y: 420, w: 14, h: 18, rot: .4 },
      { type: 'stain', x: 710, y: 520, rx: 38, ry: 18, color: '#253a34', alpha: .12 },
      { type: 'threshold', x: 430, y: 556, w: 72, h: 5 }
    ],
    floorProps: [
      { type: 'papers', x: 540, y: 470, w: 70, h: 50, n: 3 },
      { type: 'stain', x: 250, y: 520, w: 90, h: 50, color: '#1e342f', alpha: .13 }
    ],
    props: [
      prop('bed', 180, 170, 150, 245, { seed: 3 }),
      prop('nightstand', 350, 180, 54, 44, { seed: 4 }),
      prop('desk', 560, 170, 120, 64, { seed: 6 }),
      prop('chair', 602, 250, 42, 48, { seed: 8, color: '#3c4b43' }),
      prop('cabinet', 690, 190, 58, 105, { seed: 11 }),
      prop('ivstand', 470, 150, 28, 90),
      prop('wheelchair', 700, 440, 52, 48, { seed: 4 }),
      prop('plant', 150, 500, 40, 55, { seed: 12 }),
      prop('files', 650, 175, 28, 22, { seed: 2 }),
      prop('coat', 562, 292, 38, 74, { seed: 9 })
    ],
    colliders: [
      rect(190, 186, 130, 212), rect(354, 186, 46, 34), rect(566, 185, 110, 46),
      rect(606, 272, 34, 22), rect(696, 202, 46, 88), rect(474, 160, 18, 54),
      rect(706, 456, 40, 26), rect(154, 514, 32, 34), rect(566, 300, 30, 62)
    ],
    lights: [
      { x: 680, y: 158, r: 220, color: 'rgba(93,130,139,.26)', flicker: .08, speed: .3 },
      { x: 452, y: 306, r: 180, color: 'rgba(180,165,130,.11)', flicker: .4, speed: 9 },
      { x: 382, y: 372, r: 42, color: 'rgba(255,221,177,.05)', flicker: 0 }
    ],
    interactions: [
      {
        id: 'room_drawer', x: 376, y: 232, radius: 54, type: 'item', item: 'antorcha',
        label: 'Cajón de la mesilla', verb: 'Abrir', prompt: 'Recoger antorcha',
        thought: 'La antorcha está cargada. El mango conserva la marca de unos dedos que no son los míos.',
        toast: 'Antorcha de aceite', journal: [['clues', 'c_light']], objectiveAfter: 'leave_room'
      },
      {
        id: 'room_note', x: 600, y: 240, radius: 50, type: 'document', doc: 'nota_lucia',
        label: 'Nota manuscrita', verb: 'Leer'
      },
      {
        id: 'room_chart', x: 712, y: 306, radius: 46, type: 'document', doc: 'expediente_m07',
        label: 'Expediente clínico', verb: 'Leer'
      },
      {
        id: 'room_coat', x: 578, y: 322, radius: 50, type: 'multi', items: ['diapason', 'mechero'],
        label: 'Abrigo de Mara', verb: 'Registrar', prompt: 'Registrar bolsillos',
        thought: 'El diapasón sigue tibio. El mechero también. Como si alguien los hubiera usado hace un momento.',
        toast: 'Diapasón y mechero', journal: [['clues', 'c_tuning'], ['clues', 'c_lighter']]
      },
      {
        id: 'room_bed', x: 255, y: 402, radius: 52, type: 'examine',
        label: 'Cama de hospital', verb: 'Examinar',
        thought: 'Las sábanas están frías. En la etiqueta pone M-07. No pone mi nombre.',
        journal: [['people', 'p_mara']]
      },
      {
        id: 'room_mirror', x: 754, y: 334, radius: 48, type: 'examine',
        label: 'Espejo', verb: 'Mirar',
        thought: LM.Story.thoughts.room_03_mirror,
        journal: [['questions', 'q_awake']]
      },
      {
        id: 'room_window', x: 680, y: 150, radius: 62, type: 'examine',
        label: 'Ventana', verb: 'Mirar',
        thought: 'La lluvia golpea el cristal. Al fondo, la torre de Radio Faro sigue encendida. Su luz roja parpadea cada cuatro segundos.'
      },
      {
        id: 'room_door', x: 466, y: 546, radius: 72, type: 'door',
        label: 'Puerta del pasillo', verb: 'Abrir',
        target: 'clinic_hall', spawn: { x: 295, y: 238, aim: Math.PI / 2 },
        requiresItem: 'antorcha',
        lockedText: 'La habitación está demasiado oscura. No puedo cruzar el pasillo a ciegas.',
        thought: 'El pasillo huele a lluvia y a café recalentado.'
      }
    ],
    triggers: []
  };

  /* ============================================================
     CONTROL DE ENFERMERÍA — CLÍNICA AURORA
     ============================================================ */
  scenes.clinic_hall = {
    id: 'clinic_hall',
    name: 'Control de enfermería',
    location: 'Clínica Aurora · Planta baja',
    ambience: 'clinic',
    w: 1400, h: 800,
    voidColor: '#030606',
    darkness: 0.91,
    spawn: { x: 1160, y: 354, aim: Math.PI },
    floors: [
      { type: 'tile', variant: 'clinic', x: 140, y: 200, w: 1000, h: 300, seed: 14, size: 60, tint: 'rgba(18,29,27,.18)' },
      { type: 'tile', variant: 'clinic', x: 500, y: 500, w: 420, h: 260, seed: 17, size: 52, tint: 'rgba(22,28,25,.22)' }
    ],
    walls: [
      wall(100, 160, 160, 40, 's', 'clinic', 12),
      wall(330, 160, 370, 40, 's', 'clinic', 12),
      wall(770, 160, 210, 40, 's', 'clinic', 12),
      wall(1050, 160, 130, 40, 's', 'clinic', 12),
      wall(100, 200, 40, 560, 'e', 'clinic', 13),
      wall(1180, 200, 40, 100, 'w', 'clinic', 13),
      wall(1180, 400, 40, 360, 'w', 'clinic', 13),
      wall(100, 760, 1080, 40, 'n', 'clinic', 15),
      wall(100, 500, 400, 40, 'n', 'clinic', 16),
      wall(920, 500, 260, 40, 'n', 'clinic', 16)
    ],
    windows: [
      { x: 1042, y: 166, w: 80, h: 26, frame: '#28322f', warm: false }
    ],
    doors: [
      { x: 260, y: 170, w: 70, h: 18, orientation: 'h', plaque: '03' },
      { x: 700, y: 170, w: 70, h: 18, orientation: 'h', plaque: '04' },
      { x: 980, y: 170, w: 70, h: 18, orientation: 'h', plaque: '05' },
      { x: 1180, y: 300, w: 40, h: 100, orientation: 'v' }
    ],
    wallArt: [
      { type: 'notice', x: 820, y: 164, w: 94, h: 66 },
      { type: 'clock', x: 1086, y: 164, w: 38, h: 38 },
      { type: 'sign', x: 1120, y: 318, w: 38, h: 64, text: 'URGENCIAS', rot: Math.PI / 2, font: 5 },
      { type: 'poster', x: 180, y: 166, w: 56, h: 82, title: 'SILENCIO', lines: 5, paper: '#b3aa92' }
    ],
    floorDetails: [
      { type: 'puddle', x: 470, y: 458, rx: 42, ry: 11, alpha: .18 },
      { type: 'stain', x: 980, y: 440, rx: 60, ry: 24, color: '#233d36', alpha: .11 },
      { type: 'threshold', x: 260, y: 194, w: 70, h: 4 },
      { type: 'chalk', x: 1140, y: 490, n: 3, color: 'rgba(191,186,157,.14)' }
    ],
    floorProps: [
      { type: 'papers', x: 560, y: 420, w: 90, h: 50, n: 5 },
      { type: 'cable', x: 900, y: 300, x2: 1010, y2: 480, pts: 7, wobble: 22, seed: 2 }
    ],
    props: [
      prop('gurney', 356, 245, 82, 160, { seed: 3 }),
      prop('wheelchair', 176, 404, 52, 48, { seed: 6 }),
      prop('ivstand', 300, 224, 28, 90),
      prop('chair', 856, 226, 48, 54, { seed: 2, color: '#3e4a42' }),
      prop('chair', 918, 226, 48, 54, { seed: 3, color: '#3a453e' }),
      prop('cooler', 1016, 424, 44, 70),
      prop('plant', 1080, 650, 46, 60, { seed: 21 }),
      prop('reception', 620, 522, 240, 72, { seed: 4 }),
      prop('radio', 688, 500, 52, 34, { seed: 7, on: true }),
      prop('recorder', 808, 506, 64, 50, { seed: 5 }),
      prop('telephone', 640, 494, 36, 28, { seed: 9 }),
      prop('files', 878, 514, 32, 26, { seed: 4 }),
      prop('suitcase', 150, 540, 46, 35, { seed: 8 })
    ],
    colliders: [
      rect(364, 262, 66, 126), rect(180, 420, 44, 26), rect(304, 232, 18, 54),
      rect(860, 248, 40, 25), rect(922, 248, 40, 25), rect(1020, 438, 36, 48),
      rect(1084, 664, 38, 38), rect(630, 542, 220, 44), rect(692, 512, 44, 20),
      rect(812, 518, 56, 34), rect(642, 504, 32, 14), rect(882, 520, 24, 15),
      rect(154, 550, 38, 22)
    ],
    lights: [
      { x: 310, y: 280, r: 300, color: 'rgba(174,188,163,.18)', flicker: .12, speed: 2.1 },
      { x: 760, y: 282, r: 250, color: 'rgba(166,180,158,.13)', flicker: .55, speed: 13 },
      { x: 1110, y: 352, r: 190, color: 'rgba(87,142,120,.2)', flicker: .1, speed: 3 },
      { x: 748, y: 566, r: 300, color: 'rgba(188,153,106,.22)', flicker: .16, speed: 1.7 }
    ],
    interactions: [
      {
        id: 'hall_room03', x: 295, y: 210, radius: 66, type: 'door',
        label: 'Habitación 03', verb: 'Entrar', target: 'clinic_room',
        spawn: { x: 466, y: 522, aim: -Math.PI / 2 },
        thought: 'La puerta 03 se cierra sola detrás de mí.'
      },
      {
        id: 'hall_exit', x: 1150, y: 350, radius: 78, type: 'door',
        label: 'Puerta de urgencias', verb: 'Abrir', target: 'street',
        spawn: { x: 326, y: 510, aim: Math.PI / 2 },
        requiresFlags: ['heard_radio'],
        lockedText: 'El cierre magnético sigue activo. La radio del control debe tener el código de apertura.',
        thought: 'El aire de la calle entra en ráfagas. Huele a asfalto mojado y a humo.'
      },
      {
        id: 'hall_radio', x: 716, y: 548, radius: 54, type: 'radio',
        label: 'Radio de control', verb: 'Escuchar', dialogue: 'radio_clinic'
      },
      {
        id: 'hall_recorder', x: 842, y: 562, radius: 56, type: 'recorder',
        label: 'Magnetófono', verb: 'Usar', prompt: 'Usar magnetófono'
      },
      {
        id: 'hall_save', x: 660, y: 600, radius: 44, type: 'save',
        label: 'Cuaderno de guardia', verb: 'Guardar', prompt: 'Guardar progreso'
      },
      {
        id: 'hall_board', x: 866, y: 220, radius: 54, type: 'document', doc: 'cartel_lucia',
        label: 'Tablón de anuncios', verb: 'Examinar'
      },
      {
        id: 'hall_clock', x: 1098, y: 218, radius: 46, type: 'examine',
        label: 'Reloj de pared', verb: 'Mirar',
        thought: 'Las agujas están paradas a las 19:42. El segundero tiembla, pero no avanza.',
        journal: [['questions', 'q_awake']]
      },
      {
        id: 'hall_gurney', x: 394, y: 428, radius: 48, type: 'examine',
        label: 'Camilla cubierta', verb: 'Examinar',
        thought: 'Bajo la sábana solo hay almohadas dobladas. Alguien quería que pareciera un cuerpo.'
      },
      {
        id: 'hall_sala04', x: 735, y: 212, radius: 50, type: 'examine',
        label: 'Sala 04', verb: 'Abrir',
        thought: 'La puerta está cerrada por dentro. Al otro lado, alguien respira muy despacio.'
      },
      {
        id: 'hall_sala05', x: 1015, y: 212, radius: 50, type: 'examine',
        label: 'Sala 05', verb: 'Abrir',
        thought: 'La puerta está atrancada con una camilla. No pienso moverla.'
      },
      {
        id: 'hall_cooler', x: 1038, y: 448, radius: 46, type: 'examine',
        label: 'Fuente de agua', verb: 'Examinar',
        thought: 'El garrafón está lleno. El vaso de plástico sigue en el dispensador, a medio llenar.'
      }
    ],
    triggers: [
      {
        id: 'watcher_hall', x: 820, y: 200, w: 360, h: 300,
        requiresFlags: ['heard_radio'], notFlags: ['watcher_seen'], event: 'watcher_hall'
      }
    ]
  };

  /* ============================================================
     CALLE ALHELÍ
     ============================================================ */
  scenes.street = {
    id: 'street',
    name: 'Calle Alhelí',
    location: 'Puerto Niebla · Distrito Norte',
    ambience: 'rain',
    custom: 'street',
    w: 2240, h: 1120,
    voidColor: '#050909',
    darkness: 0.66,
    spawn: { x: 326, y: 520, aim: Math.PI / 2 },
    buildings: [
      { id: 'clinic', x: 50, w: 530, top: 34, base: 430, style: 'clinic', windows: 3, doorX: 300, seed: 4 },
      { id: 'pharmacy', x: 650, w: 360, top: 52, base: 430, style: 'pharmacy', seed: 7 },
      { id: 'dark1', x: 1030, w: 220, top: 70, base: 430, style: 'dark', windows: 2, seed: 12 },
      { id: 'house14', x: 1280, w: 430, top: 20, base: 430, style: 'house', doorX: 1400, seed: 3, litUpstairs: true, silhouette: false },
      { id: 'dark2', x: 1770, w: 430, top: 48, base: 430, style: 'dark', windows: 3, seed: 19 }
    ],
    walls: [],
    windows: [],
    doors: [],
    wallArt: [],
    floorDetails: [],
    props: [
      prop('bench', 150, 502, 100, 44, { seed: 3 }),
      prop('streetlamp', 520, 500, 36, 170, { seed: 2, on: true }),
      prop('planter', 420, 502, 58, 40, { seed: 7 }),
      prop('trashbags', 572, 528, 44, 30, { seed: 4 }),
      prop('bike', 700, 540, 55, 40, { seed: 5 }),
      prop('newsbox', 884, 502, 32, 42, { seed: 6 }),
      prop('phonebooth', 1040, 500, 58, 112, { seed: 8 }),
      prop('dumpster', 1198, 502, 90, 58, { seed: 9 }),
      prop('barrel', 1130, 610, 38, 48, { seed: 2 }),
      prop('car', 780, 818, 170, 82, { seed: 3, color: '#34433f' }),
      prop('bench', 1100, 780, 100, 44, { seed: 7 }),
      prop('streetlamp', 1650, 480, 36, 180, { seed: 4, on: true }),
      prop('busstop', 1800, 520, 120, 40, { seed: 5 }),
      prop('barrier', 1900, 700, 90, 34, { seed: 6 }),
      prop('hydrant', 980, 650, 26, 32, { seed: 1 }),
      prop('cart', 620, 758, 60, 44, { seed: 3 }),
      prop('trashbags', 2080, 702, 60, 32, { seed: 8 }),
      prop('mailbox', 1710, 506, 26, 38, { seed: 4 })
    ],
    colliders: [
      rect(0, 0, 2240, 470), rect(0, 1080, 2240, 40), rect(0, 0, 20, 1120), rect(2220, 0, 20, 1120),
      rect(155, 518, 90, 20), rect(424, 518, 50, 20), rect(790, 834, 150, 50),
      rect(1045, 516, 48, 60), rect(1202, 522, 82, 32), rect(1104, 796, 92, 22),
      rect(1904, 708, 82, 18), rect(1655, 536, 26, 110), rect(525, 606, 24, 55),
      rect(1812, 534, 96, 18)
    ],
    lights: [
      { x: 540, y: 610, r: 320, color: 'rgba(226,167,96,.3)', flicker: .13, speed: 2.3 },
      { x: 1668, y: 590, r: 330, color: 'rgba(224,166,95,.28)', flicker: .18, speed: 1.5 },
      { x: 346, y: 484, r: 230, color: 'rgba(154,182,159,.22)', flicker: .08, speed: 4 },
      { x: 1460, y: 484, r: 270, color: 'rgba(218,165,98,.24)', flicker: .1, speed: 2.7 },
      { x: 1068, y: 574, r: 140, color: 'rgba(124,170,163,.16)', flicker: .3, speed: 5 }
    ],
    interactions: [
      {
        id: 'street_clinic', x: 346, y: 464, radius: 92, type: 'door',
        label: 'Clínica Aurora', verb: 'Entrar', target: 'clinic_hall',
        spawn: { x: 1148, y: 350, aim: Math.PI }
      },
      {
        id: 'street_house', x: 1443, y: 462, radius: 96, type: 'door',
        label: 'Casa 14', verb: 'Entrar', target: 'house_ground',
        spawn: { x: 650, y: 806, aim: -Math.PI / 2 },
        requiresFlags: ['heard_radio'],
        lockedText: 'La puerta está cerrada. En el interfono, una voz metálica repite una frecuencia: 91.7.'
      },
      {
        id: 'street_poster', x: 924, y: 474, radius: 64, type: 'document', doc: 'cartel_lucia',
        label: 'Cartel en la persiana', verb: 'Leer'
      },
      {
        id: 'street_bench', x: 204, y: 540, radius: 52, type: 'document', doc: 'panfleto_nana',
        label: 'Panfleto municipal', verb: 'Leer'
      },
      {
        id: 'street_phone', x: 1068, y: 580, radius: 58, type: 'phone',
        label: 'Cabina telefónica', verb: 'Contestar',
        thought: 'El auricular está frío. Al otro lado, una voz de mujer susurra: «No mires atrás. Todavía no.»',
        journal: [['questions', 'q_nadia']], once: true
      },
      {
        id: 'street_car_oil', x: 816, y: 872, radius: 52, type: 'item', item: 'petroleo',
        label: 'Asiento del conductor', verb: 'Registrar', prompt: 'Recoger aceite',
        thought: 'Hay un frasco de aceite en el asiento. El coche está abierto. El motor sigue templado.'
      },
      {
        id: 'street_car_log', x: 924, y: 872, radius: 54, type: 'document', doc: 'registro_policia',
        label: 'Libreta en el salpicadero', verb: 'Leer'
      },
      {
        id: 'street_footprints', x: 1545, y: 512, radius: 50, type: 'examine',
        label: 'Huellas húmedas', verb: 'Examinar',
        thought: 'Huellas descalzas. Salen de la casa 14 y terminan en la puerta de la clínica. Alguien caminó bajo la lluvia sin zapatos.',
        journal: [['questions', 'q_awake']]
      },
      {
        id: 'street_window', x: 1618, y: 468, radius: 64, type: 'examine',
        label: 'Ventana iluminada', verb: 'Mirar',
        thought: LM.Story.thoughts.house_window,
        journal: [['questions', 'q_nadia']]
      },
      {
        id: 'street_manhole', x: 780, y: 766, radius: 52, type: 'examine',
        label: 'Tapa de alcantarilla', verb: 'Examinar',
        thought: 'La tapa está desplazada unos centímetros. Las marcas de arañazos van de dentro hacia fuera.',
        journal: [['questions', 'q_tunnel'], ['places', 'pl_tunnel']]
      },
      {
        id: 'street_busstop', x: 1858, y: 568, radius: 58, type: 'document', doc: 'recorte_radio',
        label: 'Marquesina del autobús', verb: 'Examinar'
      },
      {
        id: 'street_barrier', x: 1945, y: 716, radius: 52, type: 'examine',
        label: 'Cordón policial', verb: 'Examinar',
        thought: 'Una cinta de la policía cierra el acceso al puerto. El viento la ha roto en dos sitios. Nadie ha pasado por aquí en días.'
      },
      {
        id: 'street_pharmacy', x: 916, y: 462, radius: 58, type: 'examine',
        label: 'Farmacia Santa Elena', verb: 'Abrir',
        thought: 'La persiana metálica está echada. Dentro, una radio sigue emitiendo para nadie.'
      }
    ],
    triggers: [
      {
        id: 'street_watcher', x: 900, y: 480, w: 340, h: 360,
        notFlags: ['watcher_street'], event: 'street_watcher'
      },
      {
        id: 'street_house_look', x: 1320, y: 480, w: 300, h: 300,
        notFlags: ['house_look'], event: 'street_house_look'
      }
    ]
  };

  /* ============================================================
     CASA 14 — PLANTA BAJA
     ============================================================ */
  scenes.house_ground = {
    id: 'house_ground',
    name: 'Casa 14 · Planta baja',
    location: 'Calle Alhelí · Puerto Niebla',
    ambience: 'house',
    w: 1320, h: 920,
    voidColor: '#030505',
    darkness: 0.91,
    spawn: { x: 650, y: 806, aim: -Math.PI / 2 },
    floors: [
      { type: 'wood', variant: 'house', x: 115, y: 105, w: 1090, h: 755, seed: 31, boardH: 34, tint: 'rgba(37,29,23,.16)' }
    ],
    walls: [
      wall(70, 60, 1180, 45, 's', 'wallpaper', 31),
      wall(70, 105, 45, 800, 'e', 'wallpaper', 32),
      wall(1205, 105, 45, 800, 'w', 'wallpaper', 32),
      wall(70, 860, 540, 45, 'n', 'wallpaper', 33),
      wall(690, 860, 560, 45, 'n', 'wallpaper', 33),
      wall(615, 105, 40, 195, 'e', 'wallpaper', 35),
      wall(615, 370, 40, 75, 'e', 'wallpaper', 35),
      wall(655, 445, 35, 40, 's', 'wallpaper', 36),
      wall(760, 445, 445, 40, 's', 'wallpaper', 36),
      wall(115, 575, 315, 40, 's', 'wallpaper', 37),
      wall(540, 575, 75, 40, 's', 'wallpaper', 37),
      wall(760, 485, 40, 165, 'w', 'wallpaper', 38),
      wall(760, 730, 40, 130, 'w', 'wallpaper', 38)
    ],
    windows: [
      { x: 175, y: 66, w: 96, h: 30, frame: '#3b3224', curtain: true, warm: false },
      { x: 1036, y: 66, w: 96, h: 30, frame: '#3b3224', curtain: false, warm: false }
    ],
    doors: [
      { x: 610, y: 846, w: 80, h: 18, orientation: 'h' },
      { x: 760, y: 650, w: 40, h: 80, orientation: 'v' },
      { x: 615, y: 300, w: 40, h: 70, orientation: 'v' }
    ],
    wallArt: [
      { type: 'photo', x: 244, y: 113, w: 112, h: 88, photo: 'rueda_family', frame: '#4a3927' },
      { type: 'photo', x: 368, y: 118, w: 76, h: 62, photo: 'nadia_photo', frame: '#3d3122' },
      { type: 'photo', x: 456, y: 122, w: 62, h: 52, photo: 'radio_team', frame: '#3b3023' },
      { type: 'clock', x: 552, y: 114, w: 38, h: 38 },
      { type: 'photo', x: 948, y: 494, w: 104, h: 70, photo: 'map', frame: '#443826' },
      { type: 'photo', x: 1066, y: 498, w: 80, h: 58, photo: 'hermanas', frame: '#3e3224' },
      { type: 'poster', x: 1048, y: 118, w: 74, h: 104, title: 'NANA', lines: 8, paper: '#b5aa8d', stamp: '18-OCT' },
      { type: 'notice', x: 790, y: 110, w: 80, h: 55 },
      { type: 'mirror', x: 700, y: 620, w: 18, h: 62 }
    ],
    floorDetails: [
      { type: 'rug', x: 320, y: 400, w: 250, h: 160, color: '#4d3a2b', seed: 7 },
      { type: 'rug', x: 500, y: 660, w: 100, h: 160, color: '#43362a', seed: 9 },
      { type: 'puddle', x: 650, y: 826, rx: 48, ry: 12, alpha: .14 },
      { type: 'stain', x: 1140, y: 760, rx: 56, ry: 22, color: '#1f1a14', alpha: .12 },
      { type: 'threshold', x: 610, y: 856, w: 80, h: 4 },
      { type: 'chalk', x: 700, y: 290, n: 2, color: 'rgba(61,52,38,.2)' }
    ],
    floorProps: [
      { type: 'papers', x: 840, y: 690, w: 80, h: 50, n: 4 },
      { type: 'books', x: 820, y: 660, w: 50, h: 40, n: 6 },
      { type: 'toys', x: 690, y: 330, w: 80, h: 50, n: 5 },
      { type: 'stain', x: 180, y: 700, w: 100, h: 50, color: '#291e16', alpha: .1 }
    ],
    props: [
      prop('fireplace', 124, 248, 100, 56, { seed: 3 }),
      prop('sofa', 182, 382, 152, 72, { seed: 4 }),
      prop('armchair', 426, 330, 62, 58, { seed: 6 }),
      prop('coffee', 318, 392, 96, 46, { seed: 2 }),
      prop('piano', 430, 130, 112, 74, { seed: 8 }),
      prop('sideboard', 548, 250, 54, 90, { seed: 3 }),
      prop('floorlamp', 148, 520, 34, 96, { seed: 1 }),
      prop('bookshelf', 562, 380, 44, 120, { seed: 7 }),
      prop('plant', 574, 542, 34, 48, { seed: 11 }),
      prop('kitchen', 850, 116, 152, 48, { seed: 4 }),
      prop('sink', 918, 122, 52, 32, { seed: 5 }),
      prop('stove', 1028, 128, 66, 58, { seed: 7 }),
      prop('fridge', 1108, 126, 58, 92, { seed: 8 }),
      prop('table', 826, 226, 110, 76, { seed: 4 }),
      prop('chair', 792, 248, 40, 46, { seed: 2 }),
      prop('chair', 948, 248, 40, 46, { seed: 3 }),
      prop('chair', 862, 312, 40, 46, { seed: 5 }),
      prop('washer', 1118, 248, 56, 62, { seed: 6 }),
      prop('sideboard', 642, 180, 46, 84, { seed: 9 }),
      prop('stairs', 148, 626, 184, 124, { seed: 5 }),
      prop('halltable', 640, 738, 72, 50, { seed: 6 }),
      prop('telephone', 658, 720, 36, 28, { seed: 4 }),
      prop('hatstand', 744, 752, 40, 98, { seed: 2 }),
      prop('desk', 876, 598, 144, 66, { seed: 9 }),
      prop('chair', 924, 672, 42, 48, { seed: 6 }),
      prop('bookshelf', 798, 500, 52, 170, { seed: 12 }),
      prop('files', 1042, 642, 62, 42, { seed: 7 }),
      prop('typewriter', 918, 590, 52, 32, { seed: 3 }),
      prop('recorder', 1008, 560, 62, 50, { seed: 8 }),
      prop('irondoor', 1120, 612, 70, 108, { seed: 9 }),
      prop('floorlamp', 1038, 520, 32, 92, { seed: 3 }),
      prop('suitcase', 640, 580, 46, 34, { seed: 4 }),
      prop('radio', 1140, 350, 50, 34, { seed: 6, on: true })
    ],
    colliders: [
      rect(132, 262, 92, 42), rect(192, 398, 132, 46), rect(432, 344, 50, 34),
      rect(326, 408, 80, 26), rect(440, 148, 92, 42), rect(552, 264, 44, 62),
      rect(152, 536, 26, 64), rect(566, 392, 36, 86), rect(572, 550, 30, 32),
      rect(856, 130, 140, 26), rect(924, 130, 38, 18), rect(1036, 142, 50, 34),
      rect(1114, 142, 46, 62), rect(832, 242, 96, 44), rect(796, 260, 32, 22),
      rect(952, 260, 32, 22), rect(866, 324, 32, 22), rect(1124, 262, 44, 36),
      rect(646, 194, 38, 62), rect(156, 646, 168, 86), rect(646, 752, 62, 24),
      rect(748, 768, 32, 72), rect(884, 616, 126, 36), rect(930, 688, 32, 24),
      rect(804, 514, 42, 136), rect(1048, 654, 52, 22), rect(1124, 632, 58, 88),
      rect(1042, 532, 24, 60), rect(644, 592, 38, 24)
    ],
    lights: [
      { x: 224, y: 158, r: 230, color: 'rgba(98,126,132,.22)', flicker: .06, speed: 8 },
      { x: 177, y: 326, r: 190, color: 'rgba(213,124,66,.24)', flicker: .55, speed: 2.6 },
      { x: 684, y: 620, r: 220, color: 'rgba(192,156,109,.18)', flicker: .32, speed: 7 },
      { x: 952, y: 604, r: 210, color: 'rgba(218,169,105,.24)', flicker: .2, speed: 3.2 },
      { x: 952, y: 300, r: 190, color: 'rgba(159,154,122,.12)', flicker: .18, speed: 1.9 },
      { x: 1158, y: 694, r: 120, color: 'rgba(117,152,125,.1)', flicker: .4, speed: 6 }
    ],
    interactions: [
      {
        id: 'house_exit', x: 650, y: 852, radius: 70, type: 'door',
        label: 'Puerta de la calle', verb: 'Salir', target: 'street',
        spawn: { x: 1443, y: 510, aim: Math.PI / 2 },
        thought: 'La lluvia vuelve a entrar en la casa.'
      },
      {
        id: 'house_photo_wall', x: 360, y: 192, radius: 76, type: 'photoWall',
        label: 'Pared de fotografías', verb: 'Examinar', doc: 'foto_reverso', item: 'foto_mara',
        thought: LM.Story.thoughts.photo_hidden,
        journal: [['clues', 'c_surveillance'], ['questions', 'q_awake'], ['people', 'p_elias']],
        objectiveAfter: 'find_door', flag: 'photo_found'
      },
      {
        id: 'house_stairs', x: 240, y: 748, radius: 72, type: 'door',
        label: 'Escalera a la planta alta', verb: 'Subir', target: 'house_upstairs',
        spawn: { x: 510, y: 648, aim: -Math.PI / 2 },
        thought: 'Los escalones crujen en un orden que casi parece una frase.'
      },
      {
        id: 'house_poem', x: 914, y: 630, radius: 52, type: 'document', doc: 'poema_lucia',
        label: 'Papel doblado sobre el escritorio', verb: 'Leer'
      },
      {
        id: 'house_diary', x: 824, y: 604, radius: 52, type: 'document', doc: 'diario_lucia',
        label: 'Libro oculto tras los libros', verb: 'Examinar'
      },
      {
        id: 'house_map', x: 1000, y: 548, radius: 56, type: 'document', doc: 'mapa_lucia',
        label: 'Mapa anotado', verb: 'Examinar'
      },
      {
        id: 'house_files', x: 1068, y: 682, radius: 54, type: 'document', doc: 'informe_nana',
        label: 'Informe técnico', verb: 'Leer'
      },
      {
        id: 'house_basement_door', x: 1154, y: 738, radius: 70, type: 'dial',
        label: 'Puerta del sótano', verb: 'Examinar', prompt: 'Estudiar la puerta',
        requiresItem: 'diapason',
        lockedText: LM.Story.thoughts.door_no_fork,
        thought: LM.Story.thoughts.door_with_fork
      },
      {
        id: 'house_kitchen_log', x: 900, y: 180, radius: 52, type: 'document', doc: 'registro_policia',
        label: 'Libreta sobre la encimera', verb: 'Leer'
      },
      {
        id: 'house_kitchen_poster', x: 1084, y: 180, radius: 54, type: 'document', doc: 'panfleto_nana',
        label: 'Cartel de NANA', verb: 'Leer'
      },
      {
        id: 'house_save', x: 676, y: 762, radius: 48, type: 'save',
        label: 'Teléfono de la casa', verb: 'Usar', prompt: 'Guardar progreso',
        thought: 'Marco el número del control de la clínica. La línea está muerta, pero el contestador guarda mi posición.'
      },
      {
        id: 'house_fireplace', x: 178, y: 312, radius: 50, type: 'examine',
        label: 'Chimenea', verb: 'Examinar',
        thought: 'Las cenizas están frías. Alguien quemó fotografías aquí. Quedan esquinas de rostros y una luna dibujada a mano.'
      },
      {
        id: 'house_piano', x: 486, y: 210, radius: 54, type: 'examine',
        label: 'Piano', verb: 'Tocar',
        thought: 'Una sola tecla responde. La nota vibra en el suelo y se cuela por la rejilla del sótano.',
        journal: [['clues', 'c_poem']]
      },
      {
        id: 'house_study_radio', x: 1164, y: 390, radius: 50, type: 'examine',
        label: 'Radio antigua', verb: 'Encender',
        thought: 'La radio emite una señal de onda corta. Una voz de mujer repite números. Al acercarme, cambia a mi nombre.',
        journal: [['questions', 'q_voice']]
      },
      {
        id: 'house_nadia_door_look', x: 520, y: 150, radius: 64, type: 'examine',
        label: 'Retrato de Nadia', verb: 'Mirar',
        thought: 'En la foto, Nadia tiene siete años y lleva el mismo impermeable amarillo que la mujer del sótano. El tiempo no ha pasado por ella.',
        journal: [['people', 'p_nadia'], ['questions', 'q_nadia']]
      }
    ],
    triggers: [
      {
        id: 'house_study_whisper', x: 800, y: 485, w: 405, h: 375,
        notFlags: ['house_whisper'], event: 'house_study_whisper'
      },
      {
        id: 'house_presence', x: 400, y: 560, w: 480, h: 300,
        requiresFlags: ['photo_found'], notFlags: ['house_presence'], event: 'house_presence'
      }
    ]
  };

  /* ============================================================
     CASA 14 — PLANTA ALTA
     ============================================================ */
  scenes.house_upstairs = {
    id: 'house_upstairs',
    name: 'Casa 14 · Planta alta',
    location: 'Calle Alhelí · Puerto Niebla',
    ambience: 'house',
    w: 1040, h: 760,
    voidColor: '#030505',
    darkness: 0.92,
    spawn: { x: 510, y: 648, aim: -Math.PI / 2 },
    floors: [
      { type: 'wood', variant: 'house', x: 102, y: 92, w: 836, h: 608, seed: 43, boardH: 30, tint: 'rgba(35,28,22,.18)' }
    ],
    walls: [
      wall(60, 50, 920, 42, 's', 'wallpaper', 41),
      wall(60, 92, 42, 608, 'e', 'wallpaper', 42),
      wall(938, 92, 42, 608, 'w', 'wallpaper', 42),
      wall(60, 700, 410, 42, 'n', 'wallpaper', 43),
      wall(550, 700, 430, 42, 'n', 'wallpaper', 43),
      wall(450, 92, 40, 208, 'w', 'wallpaper', 44),
      wall(450, 370, 40, 80, 'w', 'wallpaper', 44),
      wall(590, 92, 40, 208, 'w', 'wallpaper', 45),
      wall(590, 370, 40, 80, 'w', 'wallpaper', 45),
      wall(100, 450, 350, 40, 'n', 'wallpaper', 46),
      wall(630, 450, 308, 40, 'n', 'wallpaper', 46)
    ],
    windows: [
      { x: 200, y: 56, w: 80, h: 28, frame: '#3a3024', curtain: true, warm: false },
      { x: 756, y: 56, w: 84, h: 28, frame: '#3a3024', curtain: false, warm: false }
    ],
    doors: [
      { x: 480, y: 88, w: 80, h: 18, orientation: 'h' },
      { x: 450, y: 300, w: 40, h: 70, orientation: 'v' },
      { x: 590, y: 300, w: 40, h: 70, orientation: 'v' },
      { x: 470, y: 700, w: 80, h: 18, orientation: 'h' }
    ],
    wallArt: [
      { type: 'drawing', x: 282, y: 112, w: 74, h: 58, caption: 'nadia' },
      { type: 'childmarks', x: 146, y: 600, w: 100, h: 30 },
      { type: 'notice', x: 796, y: 108, w: 90, h: 62 },
      { type: 'photo', x: 884, y: 306, w: 62, h: 48, photo: 'radio_team', frame: '#3c3123' },
      { type: 'clock', x: 474, y: 116, w: 34, h: 34 },
      { type: 'mirror', x: 646, y: 500, w: 20, h: 70 }
    ],
    floorDetails: [
      { type: 'rug', x: 240, y: 240, w: 160, h: 120, color: '#514134', seed: 4 },
      { type: 'rug', x: 470, y: 540, w: 100, h: 140, color: '#44372b', seed: 7 },
      { type: 'paper', x: 770, y: 560, w: 14, h: 18, rot: -.5 },
      { type: 'stain', x: 860, y: 620, rx: 46, ry: 18, color: '#221811', alpha: .1 },
      { type: 'threshold', x: 470, y: 710, w: 80, h: 4 }
    ],
    floorProps: [
      { type: 'toys', x: 220, y: 350, w: 80, h: 60, n: 8 },
      { type: 'papers', x: 760, y: 600, w: 90, h: 50, n: 5 },
      { type: 'books', x: 880, y: 640, w: 40, h: 30, n: 4 }
    ],
    props: [
      prop('smallbed', 140, 142, 112, 152, { seed: 3 }),
      prop('toychest', 300, 148, 70, 55, { seed: 6 }),
      prop('desk', 154, 384, 104, 56, { seed: 4 }),
      prop('chair', 186, 438, 40, 46, { seed: 5 }),
      prop('wardrobe', 338, 300, 54, 106, { seed: 7 }),
      prop('plant', 312, 500, 32, 46, { seed: 9 }),
      prop('smallbed', 648, 142, 112, 152, { seed: 8 }),
      prop('desk', 716, 200, 130, 64, { seed: 10 }),
      prop('chair', 762, 270, 42, 48, { seed: 3 }),
      prop('bookshelf', 856, 118, 50, 154, { seed: 13 }),
      prop('wardrobe', 648, 338, 54, 102, { seed: 11 }),
      prop('typewriter', 750, 190, 50, 32, { seed: 5 }),
      prop('files', 832, 228, 40, 30, { seed: 3 }),
      prop('halltable', 364, 556, 80, 50, { seed: 6 }),
      prop('floorlamp', 846, 520, 32, 92, { seed: 5 }),
      prop('plant', 122, 530, 32, 46, { seed: 12 }),
      prop('crate', 610, 566, 44, 38, { seed: 4 })
    ],
    colliders: [
      rect(146, 158, 98, 124), rect(306, 160, 58, 34), rect(160, 400, 92, 32),
      rect(192, 454, 30, 24), rect(344, 316, 44, 78), rect(316, 514, 24, 28),
      rect(654, 158, 98, 124), rect(722, 216, 118, 34), rect(768, 286, 32, 24),
      rect(862, 134, 40, 124), rect(654, 354, 44, 74), rect(756, 204, 40, 16),
      rect(838, 234, 30, 18), rect(370, 570, 64, 24), rect(852, 536, 24, 62),
      rect(128, 544, 24, 30), rect(616, 578, 34, 20)
    ],
    lights: [
      { x: 290, y: 270, r: 190, color: 'rgba(127,151,137,.2)', flicker: .2, speed: 2.4 },
      { x: 530, y: 520, r: 250, color: 'rgba(195,157,108,.17)', flicker: .42, speed: 8 },
      { x: 782, y: 254, r: 190, color: 'rgba(218,168,103,.22)', flicker: .16, speed: 3.1 },
      { x: 760, y: 306, r: 150, color: 'rgba(84,110,104,.12)', flicker: .1, speed: 1.4 }
    ],
    interactions: [
      {
        id: 'up_drawing', x: 318, y: 152, radius: 58, type: 'document', doc: 'dibujo_nadia',
        label: 'Dibujo infantil', verb: 'Examinar'
      },
      {
        id: 'up_musicbox', x: 334, y: 220, radius: 52, type: 'musicbox',
        label: 'Caja de música', verb: 'Abrir', prompt: 'Abrir caja de música'
      },
      {
        id: 'up_letter', x: 208, y: 444, radius: 52, type: 'document', doc: 'carta_irene',
        label: 'Carta escondida', verb: 'Leer'
      },
      {
        id: 'up_notebook', x: 782, y: 272, radius: 54, type: 'document', doc: 'cuaderno_elias',
        label: 'Cuaderno de Elías', verb: 'Leer'
      },
      {
        id: 'up_clipping', x: 842, y: 174, radius: 52, type: 'document', doc: 'recorte_radio',
        label: 'Recorte de prensa', verb: 'Leer'
      },
      {
        id: 'up_irene_door', x: 520, y: 152, radius: 66, type: 'examine',
        label: 'Habitación de Irene', verb: 'Abrir',
        thought: 'La puerta está cerrada con llave. Al otro lado, alguien golpea tres veces. Luego dos. Luego cuatro.',
        journal: [['questions', 'q_last'], ['people', 'p_irene']]
      },
      {
        id: 'up_bed_nadia', x: 196, y: 318, radius: 50, type: 'examine',
        label: 'Cama de Nadia', verb: 'Examinar',
        thought: 'La cama está hecha. Sobre la almohada hay un impermeable amarillo doblado, pequeño, de niña. No está húmedo.'
      },
      {
        id: 'up_stairs', x: 510, y: 694, radius: 70, type: 'door',
        label: 'Escalera', verb: 'Bajar', target: 'house_ground',
        spawn: { x: 240, y: 760, aim: 0 }
      }
    ],
    triggers: [
      {
        id: 'upstairs_knock', x: 440, y: 120, w: 160, h: 280,
        notFlags: ['upstairs_knock'], event: 'upstairs_knock'
      }
    ]
  };

  /* ============================================================
     CASA 14 — SÓTANO
     ============================================================ */
  scenes.house_basement = {
    id: 'house_basement',
    name: 'Casa 14 · Sótano',
    location: 'Calle Alhelí · Puerto Niebla',
    ambience: 'basement',
    w: 1400, h: 820,
    voidColor: '#020404',
    darkness: 0.95,
    spawn: { x: 238, y: 232, aim: Math.PI / 2 },
    floors: [
      { type: 'concrete', x: 125, y: 115, w: 1150, h: 660, seed: 55, dark: true, joints: true, tint: 'rgba(17,23,20,.22)' }
    ],
    walls: [
      wall(80, 70, 1240, 45, 's', 'brick', 51),
      wall(80, 115, 45, 660, 'e', 'brick', 52),
      wall(1275, 115, 45, 660, 'w', 'brick', 52),
      wall(80, 775, 1240, 45, 'n', 'brick', 53)
    ],
    windows: [],
    doors: [],
    wallArt: [
      { type: 'sign', x: 990, y: 126, w: 180, h: 24, text: 'ESTUDIO DE GRABACIÓN · NANA', font: 7 },
      { type: 'vent', x: 560, y: 130, w: 70, h: 32 },
      { type: 'childmarks', x: 260, y: 700, w: 110, h: 34 },
      { type: 'sign', x: 160, y: 128, w: 120, h: 22, text: 'PROHIBIDO GRABAR', font: 5 }
    ],
    floorDetails: [
      { type: 'puddle', x: 1140, y: 480, rx: 70, ry: 18, alpha: .2 },
      { type: 'stain', x: 420, y: 600, rx: 90, ry: 34, color: '#151d19', alpha: .18 },
      { type: 'debris', x: 740, y: 710, w: 80, h: 30, n: 14, seed: 4 },
      { type: 'cable', x: 850, y: 250, w: 40, h: 20, n: 3 },
      { type: 'wax', x: 710, y: 330, w: 60, h: 30, n: 8 }
    ],
    floorProps: [
      { type: 'papers', x: 860, y: 700, w: 100, h: 50, n: 6 },
      { type: 'books', x: 520, y: 700, w: 50, h: 40, n: 5 },
      { type: 'stain', x: 1020, y: 560, w: 120, h: 60, color: '#0c100e', alpha: .2 },
      { type: 'mud', x: 220, y: 260, w: 90, h: 50, n: 10 }
    ],
    props: [
      prop('stairs', 150, 118, 176, 116, { seed: 2 }),
      prop('boiler', 136, 276, 90, 110, { seed: 3 }),
      prop('furnace', 146, 438, 100, 98, { seed: 4 }),
      prop('workbench', 292, 186, 154, 70, { seed: 5 }),
      prop('shelf', 292, 560, 128, 40, { seed: 6 }),
      prop('barrel', 438, 236, 38, 52, { seed: 7 }),
      prop('barrel', 486, 260, 38, 52, { seed: 8 }),
      prop('generator', 500, 512, 100, 80, { seed: 9 }),
      prop('hanging', 636, 142, 30, 92, { seed: 2 }),
      prop('hanging', 814, 138, 30, 92, { seed: 3 }),
      prop('hanging', 1004, 144, 30, 92, { seed: 4 }),
      prop('transmitter', 902, 256, 180, 142, { seed: 5 }),
      prop('mic', 864, 366, 30, 66, { seed: 6 }),
      prop('stool', 992, 430, 42, 46, { seed: 7 }),
      prop('reelrec', 1080, 322, 98, 68, { seed: 8 }),
      prop('workbench', 726, 606, 160, 68, { seed: 9 }),
      prop('oilcan', 754, 596, 24, 26, { seed: 3 }),
      prop('laundry', 596, 652, 70, 58, { seed: 4 }),
      prop('sink', 552, 588, 60, 40, { seed: 5 }),
      prop('candle', 704, 330, 20, 30, { seed: 2 }),
      prop('candle', 748, 344, 20, 30, { seed: 3 }),
      prop('fusebox', 134, 164, 40, 52, { seed: 6 }),
      prop('pipe', 360, 128, 200, 28, { seed: 4 }),
      prop('barrel', 1180, 610, 40, 54, { seed: 10 }),
      prop('crate', 660, 540, 44, 40, { seed: 5 }),
      prop('irondoor', 1260, 332, 70, 110, { seed: 11 })
    ],
    colliders: [
      rect(156, 128, 164, 94), rect(140, 290, 82, 84), rect(150, 452, 92, 70),
      rect(298, 202, 142, 40), rect(296, 570, 116, 22), rect(444, 250, 30, 34),
      rect(492, 274, 30, 34), rect(506, 528, 88, 48), rect(642, 162, 18, 52),
      rect(820, 158, 18, 52), rect(1010, 164, 18, 52), rect(914, 282, 156, 92),
      rect(870, 386, 20, 40), rect(996, 446, 34, 20), rect(1088, 340, 78, 36),
      rect(734, 622, 144, 36), rect(758, 606, 16, 14), rect(602, 668, 58, 30),
      rect(556, 600, 50, 18), rect(1184, 624, 32, 30), rect(664, 556, 34, 20),
      rect(1268, 350, 56, 86)
    ],
    lights: [
      { x: 650, y: 238, r: 260, color: 'rgba(210,174,116,.2)', flicker: .65, speed: 11 },
      { x: 1000, y: 320, r: 240, color: 'rgba(98,144,133,.18)', flicker: .2, speed: 4 },
      { x: 196, y: 498, r: 240, color: 'rgba(218,112,57,.24)', flicker: .5, speed: 2.2 },
      { x: 1286, y: 430, r: 160, color: 'rgba(91,129,107,.16)', flicker: .12, speed: 2.6 },
      { x: 790, y: 634, r: 190, color: 'rgba(203,161,99,.18)', flicker: .28, speed: 5 }
    ],
    interactions: [
      {
        id: 'base_stairs', x: 236, y: 218, radius: 64, type: 'door',
        label: 'Escalera al piso superior', verb: 'Subir', target: 'house_ground',
        spawn: { x: 1158, y: 736, aim: Math.PI }
      },
      {
        id: 'base_recorder', x: 1120, y: 420, radius: 58, type: 'takeTape',
        label: 'Carrete del magnetófono', verb: 'Examinar', prompt: 'Tomar la cinta',
        requiresFlags: ['met_nadia']
      },
      {
        id: 'base_transcript', x: 900, y: 452, radius: 54, type: 'document', doc: 'transcripcion_18n',
        label: 'Transcripción sobre el transmisor', verb: 'Leer'
      },
      {
        id: 'base_oil', x: 772, y: 640, radius: 50, type: 'item', item: 'petroleo',
        label: 'Frasco de aceite', verb: 'Recoger', prompt: 'Recoger aceite'
      },
      {
        id: 'base_mic', x: 880, y: 434, radius: 48, type: 'examine',
        label: 'Micrófono', verb: 'Examinar',
        thought: 'El micrófono está caliente. Alguien ha hablado por él hace menos de una hora.',
        journal: [['questions', 'q_voice']]
      },
      {
        id: 'base_tunnel', x: 1268, y: 466, radius: 58, type: 'examine',
        label: 'Puerta de hierro', verb: 'Examinar',
        requiresFlags: ['met_nadia'],
        thought: 'La puerta está abierta. Detrás, un túnel de ladrillo baja hacia el mar. El aire huele a sal y a cable quemado.',
        journal: [['places', 'pl_tunnel'], ['questions', 'q_tunnel']]
      },
      {
        id: 'base_furnace', x: 194, y: 552, radius: 50, type: 'examine',
        label: 'Caldera', verb: 'Examinar',
        thought: 'La caldera está apagada, pero el suelo alrededor está tibio. Las tuberías golpean con un ritmo lento, como un corazón.'
      }
    ],
    npcs: [
      {
        id: 'nadia', kind: 'nadia', x: 1120, y: 292, aim: Math.PI,
        hideIfFlag: 'nadia_left', light: { r: 130, color: 'rgba(221,190,113,.16)' }
      }
    ],
    triggers: [
      {
        id: 'basement_meet', x: 700, y: 180, w: 520, h: 430,
        notFlags: ['met_nadia'], event: 'nadia_meet'
      },
      {
        id: 'basement_whisper', x: 940, y: 180, w: 280, h: 280,
        requiresFlags: ['met_nadia'], notFlags: ['basement_whisper'], event: 'basement_whisper'
      }
    ]
  };

  /* ============================================================
     API
     ============================================================ */
  W.get = function (id) { return scenes[id] || null; };

  W.build = function (id) {
    const scene = scenes[id];
    if (!scene) throw new Error('Escena desconocida: ' + id);
    if (!scene._ready) {
      scene._bg = LM.Art.Scenery.renderStatic(scene);
      scene._ready = true;
    }
    return scene;
  };

  W.prepare = function (id) {
    const scene = W.build(id);
    if (!scene._segments) {
      const segs = [];
      const add = r => {
        const x1 = r.x, y1 = r.y, x2 = r.x + r.w, y2 = r.y + r.h;
        segs.push(
          { x1, y1, x2, y2: y1 },
          { x1: x2, y1, x2, y2 },
          { x1: x2, y1: y2, x2: x1, y2 },
          { x1, y1: y2, x2: x1, y2: y1 }
        );
      };
      for (const w of scene.walls || []) add(w);
      for (const r of scene.colliders || []) add(r);
      scene._segments = segs;
    }
    return scene;
  };

  W.colliders = function (scene) {
    return (scene.walls || []).concat(scene.colliders || []);
  };

  W.segments = function (scene) {
    return W.prepare(scene.id)._segments;
  };

  W.visibleProp = function (p, state) {
    if (p.hideIfTaken && state.taken && state.taken.indexOf(p.hideIfTaken) >= 0) return false;
    if (p.hideIfFlag && state.flags && state.flags[p.hideIfFlag]) return false;
    if (p.showIfFlag && !(state.flags && state.flags[p.showIfFlag])) return false;
    return true;
  };

  W.visibleNpc = function (n, state) {
    if (n.hideIfFlag && state.flags && state.flags[n.hideIfFlag]) return false;
    if (n.showIfFlag && !(state.flags && state.flags[n.showIfFlag])) return false;
    return true;
  };

  W.interactionAvailable = function (it, state) {
    if (!it) return false;
    if (it.hideIfTaken && state.taken && state.taken.indexOf(it.hideIfTaken) >= 0) return false;
    if (it.requiresFlags) {
      for (const f of it.requiresFlags) if (!state.flags[f]) return false;
    }
    if (it.notFlags) {
      for (const f of it.notFlags) if (state.flags[f]) return false;
    }
    if (it.type === 'item' || it.type === 'multi') {
      if (state.taken && state.taken.indexOf(it.id) >= 0) return false;
    }
    if (it.once && state.interactions && state.interactions[it.id]) return false;
    return true;
  };

  /* utilidades para la UI / depuración */
  W.sceneCount = () => Object.keys(scenes).length;
  W.all = () => Object.values(scenes);
})();
