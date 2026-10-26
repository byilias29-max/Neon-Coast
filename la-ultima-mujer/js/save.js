'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — persistencia local
   Partida: lam_save_v1 · Ajustes: lam_settings_v1
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const S = {};
  LM.Save = S;

  const SAVE_KEY = (LM.CONFIG && LM.CONFIG.SAVE_KEY) || 'lam_save_v1';
  const SETTINGS_KEY = (LM.CONFIG && LM.CONFIG.SETTINGS_KEY) || 'lam_settings_v1';
  const memory = {};

  function storageGet(key) {
    try {
      if (window.localStorage) return window.localStorage.getItem(key);
    } catch (e) { /* almacenamiento restringido */ }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  }

  function storageSet(key, value) {
    memory[key] = value;
    try {
      if (window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (e) { /* modo privado o cuota */ }
    return false;
  }

  function storageRemove(key) {
    delete memory[key];
    try { if (window.localStorage) window.localStorage.removeItem(key); } catch (e) { /* noop */ }
  }

  function num(v, fallback, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  S.loadSettings = function () {
    const defaults = Object.assign({}, LM.Settings || {});
    let stored = null;
    try { stored = JSON.parse(storageGet(SETTINGS_KEY) || 'null'); } catch (e) { stored = null; }
    if (!stored || typeof stored !== 'object') return defaults;

    const out = defaults;
    for (const key of ['master', 'ambient', 'sfx', 'music', 'voice']) {
      out[key] = num(stored[key], defaults[key], 0, 100);
    }
    out.quality = ['low', 'medium', 'high'].indexOf(stored.quality) >= 0 ? stored.quality : defaults.quality;
    for (const key of ['grain', 'particles', 'cameraMotion', 'largeText', 'subtitles', 'reduceMotion']) {
      if (typeof stored[key] === 'boolean') out[key] = stored[key];
    }
    return out;
  };

  S.saveSettings = function (settings) {
    try {
      storageSet(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (e) {
      return false;
    }
  };

  S.has = function () {
    return !!S.load();
  };

  S.load = function () {
    let data = null;
    try { data = JSON.parse(storageGet(SAVE_KEY) || 'null'); } catch (e) { data = null; }
    if (!data || typeof data !== 'object') return null;
    if (!data.state || typeof data.state !== 'object') return null;
    if (!data.version) data.version = (LM.CONFIG && LM.CONFIG.VERSION) || '1.0.0';
    const sceneId = data.state.sceneId;
    if (!sceneId || !(LM.World && LM.World.get(sceneId))) return null;
    return data;
  };

  S.meta = function () {
    const data = S.load();
    if (!data) return null;
    const st = data.state;
    const scene = LM.World && LM.World.get(st.sceneId);
    const objective = LM.Story && LM.Story.objectives && LM.Story.objectives[st.objective];
    return {
      savedAt: data.savedAt || data.timestamp || null,
      playTime: st.playTime || 0,
      sceneId: st.sceneId,
      location: scene ? scene.location : 'Puerto Niebla',
      sceneName: scene ? scene.name : 'Puerto Niebla',
      objective: objective ? objective.text : '',
      chapter: st.chapter || 1,
      completed: !!st.chapter_complete
    };
  };

  S.write = function (state, meta) {
    const now = Date.now();
    const payload = {
      version: (LM.CONFIG && LM.CONFIG.VERSION) || '1.0.0',
      savedAt: now,
      chapter: (state && state.chapter) || 1,
      state: state,
      meta: meta || null
    };
    try {
      storageSet(SAVE_KEY, JSON.stringify(payload));
      return payload;
    } catch (e) {
      return null;
    }
  };

  S.clear = function () {
    storageRemove(SAVE_KEY);
  };

  S.formatDate = function (timestamp) {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      const pad = n => String(n).padStart(2, '0');
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) { return ''; }
  };
})();
