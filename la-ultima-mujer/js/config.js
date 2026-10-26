'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — configuración global
   ============================================================ */
window.LM = window.LM || {};

LM.CONFIG = {
  VERSION: '1.0.0',
  TITLE: 'LA ÚLTIMA MUJER',
  SAVE_KEY: 'lam_save_v1',
  SETTINGS_KEY: 'lam_settings_v1',
  CHAPTER: 1,
  PLAYER: {
    walk: 118,
    run: 204,
    crouch: 66,
    accel: 1050,
    friction: 1250,
    radius: 10,
    interactRange: 62,
    torchRange: 330,
    torchAngle: 0.96,
    torchFuelMax: 100,
    torchBurnPerSec: 0.055,
    torchOilRestore: 38
  },
  CAMERA: {
    smoothing: 5.4,
    lookAhead: 42,
    zoom: 1.14,
    zoomMin: 0.92,
    zoomMax: 1.55
  },
  LIGHT: {
    quality: 'high',
    rayStep: 0.024,
    softSamples: 3,
    ambient: 0.085,
    darkness: 'rgba(3,7,10,0.925)',
    torchCore: '#ffe1b0',
    torchMid: '#ff9e4d',
    torchEdge: '#8f3517'
  },
  QUALITY: {
    low:    { dprCap: 1,   lightScale: 0.38, rays: 110, dust: 18, shadows: 1, rain: 70 },
    medium: { dprCap: 1.5, lightScale: 0.55, rays: 170, dust: 34, shadows: 2, rain: 120 },
    high:   { dprCap: 2,   lightScale: 0.7,  rays: 230, dust: 56, shadows: 3, rain: 180 }
  },
  PALETTE: {
    ink: '#070a0c',
    paper: '#d8cfbc',
    ivory: '#e9e1d1',
    rust: '#b87552',
    rustDeep: '#6f3d2b',
    cold: '#5b7b84',
    moss: '#617068',
    amber: '#c9925a',
    blood: '#5b2421',
    torch: '#ffb15f'
  }
};

LM.Items = {
  antorcha: {
    id: 'antorcha', name: 'Antorcha de aceite', short: 'Antorcha',
    type: 'Equipo · fuente de luz',
    desc: 'Una antorcha de mango de latón y trapo embreado. La llama tiembla con cada corriente de aire. El aceite no es infinito.',
    icon: 'torch'
  },
  petroleo: {
    id: 'petroleo', name: 'Frasco de aceite', short: 'Aceite',
    type: 'Consumible',
    desc: 'Aceite mineral para lámparas. Bastante para mantener la llama viva un rato más. El olor me recuerda al taller de Lucía.',
    icon: 'oil'
  },
  mechero: {
    id: 'mechero', name: 'Mechero de Lucía', short: 'Mechero',
    type: 'Objeto personal',
    desc: 'Un mechero de gasolina con la inicial L. grabada a cuchillo. Lucía lo usaba para encender las velas del hospital cuando se iba la luz.',
    icon: 'lighter'
  },
  diapason: {
    id: 'diapason', name: 'Diapasón de latón', short: 'Diapasón',
    type: 'Objeto personal',
    desc: 'Un diapasón pequeño, desafinado, con una L. tallada en la base. No recuerdo haberlo guardado. Sí recuerdo el sonido.',
    icon: 'tuning'
  },
  cinta_nana: {
    id: 'cinta_nana', name: 'Cinta «PRUEBA DE VOZ — 18N»', short: 'Cinta 18N',
    type: 'Prueba · audio',
    desc: 'Una cinta de carrete de una sola pista. La etiqueta está escrita con la letra de Elías. En el centro, alguien ha dibujado una pequeña luna.',
    icon: 'cassette'
  },
  foto_mara: {
    id: 'foto_mara', name: 'Fotografía de vigilancia', short: 'Fotografía',
    type: 'Prueba · imagen',
    desc: 'Una fotografía de mí, dormida en la habitación 03 de la Clínica Aurora. Detrás: «M-07. No despertar. Todavía no.»',
    icon: 'photo'
  },
  llave_radio: {
    id: 'llave_radio', name: 'Llave de Radio Faro', short: 'Llave de radio',
    type: 'Llave · acceso',
    desc: 'Una llave de latón con la frecuencia 91.7 grabada en el vástago. Estaba en el sótano de los Rueda, junto al transmisor.',
    icon: 'key'
  },
  cinta_nadia: {
    id: 'cinta_nadia', name: 'Cinta sin etiqueta', short: 'Cinta sin etiqueta',
    type: 'Prueba · audio',
    desc: 'Nadia me la dio antes de desaparecer por el túnel. La cinta está húmeda. En la carcasa alguien escribió: «Para cuando quieras recordar sin que te lo cuenten».',
    icon: 'cassette'
  }
};

LM.Settings = {
  master: 80,
  ambient: 85,
  sfx: 90,
  music: 55,
  voice: 95,
  quality: 'high',
  grain: true,
  particles: true,
  cameraMotion: true,
  largeText: false,
  subtitles: true,
  reduceMotion: false
};
