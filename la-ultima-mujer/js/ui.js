'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — interfaz, diario, lectura, diálogo y HUD
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const U = LM.U;
  const UI = {};
  LM.UI = UI;

  let game = null;
  let currentScreen = null;
  let settingsReturn = 'screen-menu';
  let journalReturn = 'gameplay';
  let inventoryReturn = 'gameplay';
  let pauseReturn = 'gameplay';
  let dialogueState = null;
  let dialState = null;
  let confirmResolver = null;
  let confirmOpen = false;
  let subtitleQueue = [];
  let subtitleTimer = 0;
  let subtitleCurrent = null;
  let saveTimer = 0;
  let locationTimer = 0;
  let selectedItem = null;
  let activeJournalTab = 'clues';
  let lastTorch = { has: null, active: null, fuel: null };
  let promptId = null;

  const $ = U.$;
  let el = {};

  function cache() {
    el = {
      hud: $('#hud'),
      objective: $('#hud-objective'),
      objectiveText: $('#hud-objective-text'),
      chapterLabel: $('#hud-chapter'),
      location: $('#hud-location'),
      save: $('#hud-save'),
      torch: $('#hud-torch'),
      torchLabel: $('#hud-torch-label'),
      torchFill: $('#hud-torch-fill'),
      prompt: $('#interaction-prompt'),
      promptVerb: $('#prompt-verb'),
      promptName: $('#prompt-name'),
      subtitleLayer: $('#subtitle-layer'),
      subtitleSpeaker: $('#subtitle-speaker'),
      subtitleText: $('#subtitle-text'),
      toastLayer: $('#toast-layer'),
      cursor: $('#cursor-dot'),
      continueBtn: $('#btn-continue'),
      continueMeta: $('#continue-meta'),
      campaignGrid: $('#campaign-grid'),
      journal: $('#screen-journal'),
      journalLocation: $('#journal-location'),
      inventoryGrid: $('#inventory-grid'),
      inventoryDetail: $('#inventory-detail'),
      detailIcon: $('#detail-icon'),
      detailType: $('#detail-type'),
      detailName: $('#detail-name'),
      detailDesc: $('#detail-desc'),
      fuelDetail: $('#fuel-detail'),
      detailFuelFill: $('#detail-fuel-fill'),
      detailFuelText: $('#detail-fuel-text'),
      readerPaper: $('#document-paper'),
      docKicker: $('#doc-kicker'),
      docCode: $('#doc-code'),
      docTitle: $('#doc-title'),
      docMeta: $('#doc-meta'),
      docContent: $('#doc-content'),
      docSign: $('#doc-sign'),
      readerProgress: $('#reader-progress'),
      readerScroll: $('#reader-scroll'),
      dialogueScreen: $('#screen-dialogue'),
      dialoguePortrait: $('#dialogue-portrait'),
      dialogueSpeaker: $('#dialogue-speaker'),
      dialogueText: $('#dialogue-text'),
      dialogueChoices: $('#dialogue-choices'),
      dialogueNext: $('#dialogue-next'),
      dialScreen: $('#screen-dial'),
      dialDevice: $('#dial-device'),
      dialSymbols: $('#dial-symbols'),
      dialHint: $('#dial-hint'),
      dialFeedback: $('#dial-feedback'),
      dialConfirm: $('#dial-confirm'),
      chapter: $('#screen-chapter'),
      chapterEyebrow: $('#chapter-eyebrow'),
      chapterTitle: $('#chapter-title'),
      chapterQuote: $('#chapter-quote'),
      chapterStats: $('#chapter-stats'),
      chapterNext: $('#chapter-next'),
      confirmBackdrop: $('#confirm-backdrop'),
      confirmTitle: $('#confirm-title'),
      confirmText: $('#confirm-text'),
      confirmOk: $('#confirm-ok'),
      confirmCancel: $('#confirm-cancel'),
      pauseName: $('#pause-name'),
      pauseObjective: $('#pause-objective'),
      pauseChapter: $('#pause-chapter'),
      pauseLocation: $('#pause-location'),
      pauseTime: $('#pause-time'),
      pauseFuel: $('#pause-fuel')
    };
  }

  UI.init = function (g) {
    game = g;
    cache();
    bindActions();
    bindSettings();
    bindJournalTabs();
    bindReader();
    bindDialogue();
    bindDial();
    bindConfirm();
    renderCampaign(el.campaignGrid);
    refreshSettings();
    refreshMenu();
    showHUD(false);
    document.body.classList.add('ui-open');
    closePrompt();
    if (el.dialSymbols) {
      el.dialSymbols.innerHTML = LM.Story.symbols.map(s => `<span title="${U.escapeHTML(s.verb)}"><i>${s.svg}</i>${U.escapeHTML(s.name)}</span>`).join('');
    }
    if (el.dialHint) el.dialHint.textContent = LM.Story.dialHint;
  };

  /* ============================================================
     UTILIDADES DE PANTALLA
     ============================================================ */
  function screenEl(name) { return document.getElementById(name); }

  function showScreen(name) {
    const next = screenEl(name);
    if (!next) return;
    if (currentScreen === name) return;
    if (currentScreen) {
      const old = screenEl(currentScreen);
      if (old) old.classList.remove('active', 'entering');
    }
    currentScreen = name;
    next.classList.add('active');
    next.classList.add('entering');
    setTimeout(() => next.classList.remove('entering'), 620);
    document.body.classList.add('ui-open');
    showHUD(false);
    closePrompt();
  }

  function hideScreen() {
    if (currentScreen) {
      const old = screenEl(currentScreen);
      if (old) old.classList.remove('active', 'entering');
    }
    currentScreen = null;
    document.body.classList.remove('ui-open');
  }

  function returnTo(name) {
    if (!name || name === 'gameplay') {
      hideScreen();
      if (game) game.uiResumed();
      return;
    }
    showScreen(name);
  }

  UI.currentScreen = () => currentScreen;
  UI.isBlocking = () => !!currentScreen || confirmOpen;
  UI.isMenu = () => currentScreen === 'screen-menu';

  UI.showHUD = showHUD;
  function showHUD(on) {
    if (!el.hud) return;
    el.hud.classList.toggle('visible', !!on);
    if (!on) el.hud.classList.add('hidden-instant');
    else {
      el.hud.classList.remove('hidden-instant');
      el.objective.classList.add('show');
      const ctrl = $('.hud-controls', el.hud);
      if (ctrl) ctrl.classList.add('show');
    }
  }

  UI.toGame = function () {
    hideScreen();
    if (game) game.uiResumed();
  };

  /* ============================================================
     MENÚ PRINCIPAL
     ============================================================ */
  function refreshMenu() {
    if (!el.continueBtn) return;
    const meta = LM.Save.meta();
    if (meta) {
      el.continueBtn.removeAttribute('disabled');
      if (el.continueMeta) {
        const t = U.formatTime(meta.playTime);
        el.continueMeta.textContent = meta.sceneName + ' · ' + t;
      }
    } else {
      el.continueBtn.setAttribute('disabled', 'disabled');
      if (el.continueMeta) el.continueMeta.textContent = 'SIN ARCHIVO';
    }
  }
  UI.refreshMenu = refreshMenu;

  UI.openMenu = function () {
    refreshMenu();
    showScreen('screen-menu');
    if (el.hud) el.hud.classList.remove('visible');
    document.body.classList.add('ui-open');
    if (game) game.menuShown();
  };

  function closeToMenu() {
    showScreen('screen-menu');
    refreshMenu();
    if (game) game.menuShown();
  }

  function openCampaign() {
    renderCampaign(el.campaignGrid);
    showScreen('screen-campaign');
  }

  function openCredits() {
    showScreen('screen-credits');
  }

  /* ============================================================
     CAMPAÑA
     ============================================================ */
  function renderCampaign(container) {
    if (!container) return;
    container.innerHTML = LM.Story.campaign.map(ch => {
      const enabled = ch.available;
      return `<article class="chapter-card${enabled ? '' : ' locked'}">
        <span class="chapter-tag">${enabled ? 'DISPONIBLE' : 'ARCHIVADO'}</span>
        <span class="chapter-no">CAPÍTULO ${ch.no}</span>
        <h3>${U.escapeHTML(ch.title)}</h3>
        <p>${U.escapeHTML(ch.description)}</p>
        <span class="chapter-tag" style="position:static;display:inline-block;margin-top:2px">${U.escapeHTML(ch.location)}</span>
      </article>`;
    }).join('');
  }

  /* ============================================================
     AJUSTES
     ============================================================ */
  function bindSettings() {
    const ranges = [
      ['master', 'set-master', 'out-master'],
      ['ambient', 'set-ambient', 'out-ambient'],
      ['sfx', 'set-sfx', 'out-sfx'],
      ['music', 'set-music', 'out-music'],
      ['voice', 'set-voice', 'out-voice']
    ];
    for (const [key, inputId, outId] of ranges) {
      const input = document.getElementById(inputId);
      const out = document.getElementById(outId);
      if (!input) continue;
      const sync = () => {
        LM.Settings[key] = Number(input.value);
        if (out) out.value = input.value;
        persistSettings();
      };
      input.addEventListener('input', sync);
      input.addEventListener('change', sync);
    }

    const toggles = [
      ['grain', 'set-grain'], ['particles', 'set-particles'],
      ['cameraMotion', 'set-camera-motion'], ['largeText', 'set-large-text'],
      ['subtitles', 'set-subtitles'], ['reduceMotion', 'set-reduce-motion']
    ];
    for (const [key, id] of toggles) {
      const input = document.getElementById(id);
      if (!input) continue;
      input.addEventListener('change', () => {
        LM.Settings[key] = !!input.checked;
        persistSettings();
      });
    }

    const quality = document.getElementById('set-quality');
    if (quality) {
      quality.querySelectorAll('button[data-value]').forEach(btn => {
        btn.addEventListener('click', () => {
          LM.Settings.quality = btn.dataset.value;
          quality.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
          persistSettings();
        });
      });
    }
  }

  function applySettingsClasses() {
    document.body.classList.toggle('no-grain', !LM.Settings.grain);
    document.body.classList.toggle('reduce-motion', !!LM.Settings.reduceMotion);
    document.body.classList.toggle('large-text', !!LM.Settings.largeText);
    document.body.classList.toggle('no-subtitles', !LM.Settings.subtitles);
  }

  function refreshSettings() {
    const rangeIds = {
      master: 'set-master', ambient: 'set-ambient', sfx: 'set-sfx', music: 'set-music', voice: 'set-voice'
    };
    for (const key of Object.keys(rangeIds)) {
      const input = document.getElementById(rangeIds[key]);
      const out = document.getElementById('out-' + key);
      if (input) input.value = LM.Settings[key];
      if (out) out.value = LM.Settings[key];
    }
    const checks = {
      grain: 'set-grain', particles: 'set-particles', cameraMotion: 'set-camera-motion',
      largeText: 'set-large-text', subtitles: 'set-subtitles', reduceMotion: 'set-reduce-motion'
    };
    for (const key of Object.keys(checks)) {
      const input = document.getElementById(checks[key]);
      if (input) input.checked = !!LM.Settings[key];
    }
    const quality = document.getElementById('set-quality');
    if (quality) quality.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.value === LM.Settings.quality));
    applySettingsClasses();
  }
  UI.refreshSettings = refreshSettings;

  function persistSettings() {
    applySettingsClasses();
    LM.Save.saveSettings(LM.Settings);
    if (LM.Audio) LM.Audio.setSettings(LM.Settings);
    if (game) game.applySettings(LM.Settings);
  }

  function openSettings(from) {
    settingsReturn = from || (currentScreen === 'screen-pause' ? 'screen-pause' : 'screen-menu');
    refreshSettings();
    showScreen('screen-settings');
  }

  function closeSettings() {
    if (settingsReturn === 'screen-pause') {
      if (game) game.pauseGame();
      showScreen('screen-pause');
      refreshPause();
    } else {
      closeToMenu();
    }
  }

  /* ============================================================
     PAUSA
     ============================================================ */
  function openPause() {
    if (!game || !game.state) return;
    pauseReturn = currentScreen || 'gameplay';
    refreshPause();
    game.pauseGame();
    showScreen('screen-pause');
  }

  function refreshPause() {
    if (!game || !game.state) return;
    const st = game.state;
    const scene = LM.World.get(st.sceneId);
    const objective = LM.Story.objectives[st.objective];
    if (el.pauseName) el.pauseName.textContent = 'MARA ORIBE';
    if (el.pauseObjective) el.pauseObjective.textContent = objective ? objective.text : 'Explorar.';
    if (el.pauseChapter) el.pauseChapter.textContent = 'I — La señal';
    if (el.pauseLocation) el.pauseLocation.textContent = scene ? scene.location : 'Puerto Niebla';
    if (el.pauseTime) el.pauseTime.textContent = U.formatTime(st.playTime || 0);
    if (el.pauseFuel) {
      if (st.torch && st.torch.has) {
        const per = Math.round(st.torch.fuel);
        el.pauseFuel.textContent = per + '% · ' + (st.torch.active ? 'ENCENDIDA' : 'APAGADA');
      } else el.pauseFuel.textContent = '—';
    }
  }

  function closePauseToGame() {
    if (game) game.resumeGame();
    hideScreen();
  }

  /* ============================================================
     DIARIO
     ============================================================ */
  function bindJournalTabs() {
    document.querySelectorAll('.journal-tabs button').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  function switchTab(tab) {
    activeJournalTab = tab || 'clues';
    document.querySelectorAll('.journal-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === activeJournalTab));
    document.querySelectorAll('.journal-page').forEach(p => p.classList.toggle('active', p.id === 'page-' + activeJournalTab));
  }

  function openJournal() {
    if (!game || !game.state) return;
    journalReturn = currentScreen === 'screen-pause' ? 'screen-pause' : 'gameplay';
    renderJournal(game.state);
    switchTab(activeJournalTab);
    showScreen('screen-journal');
  }

  function entryHTML(kind, title, text, extraClass) {
    return `<div class="entry ${extraClass || ''}">
      <span class="entry-kind">${U.escapeHTML(kind || 'NOTA')}</span>
      <div><h3>${U.escapeHTML(title)}</h3><p>${U.escapeHTML(text || '')}</p></div>
    </div>`;
  }

  function emptyHTML(text) {
    return `<div class="entry empty">${U.escapeHTML(text)}</div>`;
  }

  function renderJournal(state) {
    if (!state || !state.journal) return;
    const data = LM.Story.journal;
    let newClues = '';
    let newPeople = '';
    let newPlaces = '';
    let newQuestions = '';
    for (const id of state.journal.clues || []) {
      const e = data.clues[id];
      if (e) newClues += entryHTML(e.kind, e.title, e.text);
    }
    for (const id of state.journal.people || []) {
      const e = data.people[id];
      if (e) newPeople += entryHTML(e.role, e.title, e.text);
    }
    for (const id of state.journal.places || []) {
      const e = data.places[id];
      if (e) newPlaces += entryHTML(e.sub, e.title, e.text);
    }
    for (const id of state.journal.questions || []) {
      const e = data.questions[id];
      if (e) newQuestions += entryHTML('PREGUNTA', e.title, e.text);
    }
    const setList = (id, html, emptyText) => {
      const node = document.getElementById(id);
      if (node) node.innerHTML = html || emptyHTML(emptyText);
    };
    setList('list-clues', newClues, 'Todavía no he anotado ninguna prueba. La casa y la clínica tardarán en hablar.');
    setList('list-people', newPeople, 'Ningún nombre todavía. Solo el mío, y ni siquiera estoy segura de cuánto significa.');
    setList('list-places', newPlaces, 'La ciudad empieza en esta habitación. El resto aún no existe.');
    setList('list-questions', newQuestions, 'Las preguntas llegarán cuando deje de tener miedo a las respuestas.');

    const campaign = document.getElementById('list-campaign');
    if (campaign) {
      campaign.innerHTML = LM.Story.campaign.map(ch => entryHTML(
        'CAPÍTULO ' + ch.no,
        ch.title + (ch.available ? ' · disponible' : ' · archivo futuro'),
        ch.description + ' — ' + ch.contains,
        ch.available ? '' : ''
      )).join('');
    }

    const counts = {
      clues: (state.journal.clues || []).length,
      people: (state.journal.people || []).length,
      places: (state.journal.places || []).length,
      questions: (state.journal.questions || []).length
    };
    for (const k of Object.keys(counts)) {
      const c = document.getElementById('count-' + k);
      if (c) c.textContent = counts[k];
    }
    const scene = LM.World.get(state.sceneId);
    if (el.journalLocation) el.journalLocation.textContent = ((scene ? scene.location : 'PUERTO NIEBLA') + ' · ARCHIVO 07').toUpperCase();
  }

  function closeJournal() {
    if (journalReturn === 'screen-pause') showScreen('screen-pause');
    else returnTo('gameplay');
  }

  /* ============================================================
     INVENTARIO
     ============================================================ */
  function itemIds(state) {
    const ids = [];
    if (!state) return ids;
    for (const id of Object.keys(LM.Items)) {
      if (state.inventory && (state.inventory[id] || 0) > 0) ids.push(id);
    }
    return ids;
  }

  function openInventory() {
    if (!game || !game.state) return;
    inventoryReturn = currentScreen === 'screen-pause' ? 'screen-pause' : 'gameplay';
    renderInventory(game.state);
    showScreen('screen-inventory');
  }

  function renderInventory(state) {
    if (!state) return;
    const ids = itemIds(state);
    if (!ids.length) selectedItem = null;
    else if (!selectedItem || ids.indexOf(selectedItem) < 0) selectedItem = ids[0];
    if (el.inventoryGrid) {
      const slots = 10;
      let html = '';
      for (let i = 0; i < slots; i++) {
        const id = ids[i];
        if (id) {
          const item = LM.Items[id];
          const qty = state.inventory[id] || 1;
          html += `<button class="inv-item${id === selectedItem ? ' selected' : ''}" data-item="${id}" aria-label="${U.escapeHTML(item.name)}">
            <img src="${LM.Art.icon(item.icon)}" alt="">
            <span class="inv-name">${U.escapeHTML(item.short || item.name)}</span>
            ${qty > 1 ? `<span class="inv-qty">×${qty}</span>` : ''}
          </button>`;
        } else {
          html += '<div class="inv-item empty-slot"><span class="inv-empty">vacío</span></div>';
        }
      }
      el.inventoryGrid.innerHTML = html;
      el.inventoryGrid.querySelectorAll('[data-item]').forEach(btn => {
        btn.addEventListener('click', () => selectInventoryItem(btn.dataset.item));
      });
    }
    renderInventoryDetail(state);
  }

  function selectInventoryItem(id) {
    selectedItem = id;
    if (el.inventoryGrid) {
      el.inventoryGrid.querySelectorAll('.inv-item').forEach(b => b.classList.toggle('selected', b.dataset.item === id));
    }
    renderInventoryDetail(game.state);
  }

  function renderInventoryDetail(state) {
    if (!state || !el.detailName) return;
    const id = selectedItem;
    if (!id) {
      if (el.detailIcon) el.detailIcon.innerHTML = '';
      if (el.detailType) el.detailType.textContent = 'SIN OBJETOS';
      if (el.detailName) el.detailName.textContent = 'Los bolsillos vacíos';
      if (el.detailDesc) el.detailDesc.textContent = 'Todavía no llevo nada que pueda ayudarme. Ni siquiera una cerilla.';
      if (el.fuelDetail) el.fuelDetail.style.display = 'none';
      return;
    }
    const item = LM.Items[id];
    if (!item) return;
    if (el.detailIcon) el.detailIcon.innerHTML = `<img src="${LM.Art.icon(item.icon)}" alt="">`;
    if (el.detailType) el.detailType.textContent = item.type || 'OBJETO';
    if (el.detailName) el.detailName.textContent = item.name;
    if (el.detailDesc) el.detailDesc.textContent = item.desc;
    if (el.fuelDetail) {
      el.fuelDetail.style.display = id === 'antorcha' ? 'flex' : 'none';
      if (id === 'antorcha' && state.torch) {
        if (el.detailFuelFill) el.detailFuelFill.style.width = U.clamp(state.torch.fuel, 0, 100) + '%';
        if (el.detailFuelText) el.detailFuelText.textContent = Math.round(state.torch.fuel) + '%' + (state.torch.active ? ' · ENCENDIDA' : ' · APAGADA');
      }
    }
  }

  function updateInventoryIfOpen(state) {
    if (currentScreen === 'screen-inventory') renderInventory(state);
  }

  function closeInventory() {
    if (inventoryReturn === 'screen-pause') showScreen('screen-pause');
    else returnTo('gameplay');
  }

  /* ============================================================
     LECTOR DE DOCUMENTOS
     ============================================================ */
  function updateReaderScroll() {
    const paper = el.readerPaper;
    const hint = el.readerScroll;
    if (!paper || !hint) return;
    const hasMore = paper.scrollHeight - paper.clientHeight > 4 &&
      paper.scrollTop + paper.clientHeight < paper.scrollHeight - 10;
    hint.classList.toggle('visible', hasMore);
  }

  function bindReader() {
    const paper = $('#document-paper');
    if (paper) {
      // Evita que el clic sobre el texto cierre el lector por accidente.
      paper.addEventListener('click', e => e.stopPropagation());
      paper.addEventListener('scroll', updateReaderScroll, { passive: true });
    }
    window.addEventListener('resize', function () {
      if (currentScreen === 'screen-reader') updateReaderScroll();
    });
  }

  function openReader(docId, options) {
    options = options || {};
    const doc = LM.Story.documents[docId];
    if (!doc) return;
    if (!el.readerPaper) return;
    el.readerPaper.classList.toggle('photo-type', doc.type === 'photo');
    if (el.docKicker) el.docKicker.textContent = doc.kicker || 'DOCUMENTO';
    if (el.docCode) el.docCode.textContent = doc.code || 'PN / ARCHIVO';
    if (el.docTitle) el.docTitle.textContent = doc.title || '';
    if (el.docMeta) el.docMeta.textContent = doc.meta || '';
    let content = '';
    if (doc.type === 'photo' && doc.photo && LM.Photos) {
      const url = LM.Photos.url(doc.photo);
      if (url) {
        content += `<div class="photo-frame"><img src="${url}" alt="${U.escapeHTML(doc.title || 'Fotografía')}"><span>${U.escapeHTML(doc.code || 'ARCHIVO FOTOGRÁFICO')} · PUERTO NIEBLA</span></div>`;
      }
    }
    content += doc.html || '';
    if (el.docContent) el.docContent.innerHTML = content;
    if (el.docSign) el.docSign.innerHTML = doc.sign ? U.escapeHTML(doc.sign) : '';
    if (el.readerProgress) {
      if (options.index && options.total) el.readerProgress.textContent = String(options.index).padStart(2, '0') + ' / ' + String(options.total).padStart(2, '0');
      else el.readerProgress.textContent = 'ARCHIVO DE PUERTO NIEBLA';
    }
    showScreen('screen-reader');
    const scroll = el.readerPaper;
    if (scroll) {
      scroll.scrollTop = 0;
      setTimeout(updateReaderScroll, 60);
    }
    LM.Audio.paper();
  }

  function closeReader() {
    returnTo('gameplay');
  }

  /* ============================================================
     DIÁLOGO
     ============================================================ */
  function bindDialogue() {
    if (el.dialogueScreen) {
      el.dialogueScreen.addEventListener('click', function (e) {
        if (!dialogueState) return;
        if (e.target.closest('button')) return;
        if (e.target.closest('#screen-dialogue')) advanceDialogue();
      });
    }
  }

  function openDialogue(id, onComplete) {
    const data = LM.Story.dialogues[id];
    if (!data || !data.nodes) {
      if (onComplete) onComplete();
      return;
    }
    dialogueState = {
      id: id,
      data: data,
      nodeId: data.start,
      lineIndex: 0,
      typing: false,
      timer: null,
      text: '',
      onComplete: onComplete,
      finished: false,
      choicesShown: false
    };
    showScreen('screen-dialogue');
    enterNode(data.start);
  }

  function enterNode(nodeId) {
    const d = dialogueState;
    if (!d) return;
    const node = d.data.nodes[nodeId];
    if (!node) { finishDialogue(); return; }
    d.nodeId = nodeId;
    d.lineIndex = 0;
    d.choicesShown = false;
    if (el.dialogueChoices) el.dialogueChoices.innerHTML = '';
    if (el.dialogueNext) el.dialogueNext.style.display = 'none';
    showLine(node.lines[0]);
  }

  function showLine(line) {
    const d = dialogueState;
    if (!d || !line) return;
    d.line = line;
    d.typing = true;
    d.text = line.text || '';
    if (d.timer) clearInterval(d.timer);

    const narration = line.who === 'NARRACIÓN';
    if (el.dialogueScreen) el.dialogueScreen.classList.toggle('narration', narration);
    if (el.dialogueSpeaker) el.dialogueSpeaker.textContent = line.who || '';
    if (el.dialoguePortrait) {
      let image = '';
      if (line.photo && LM.Photos) image = LM.Photos.url(line.photo);
      else if (line.portrait) image = LM.Characters.portrait(line.portrait);
      if (image) {
        el.dialoguePortrait.style.backgroundImage = 'url("' + image + '")';
        el.dialoguePortrait.classList.add('has-image');
      } else {
        el.dialoguePortrait.style.backgroundImage = '';
        el.dialoguePortrait.classList.remove('has-image');
      }
    }
    if (el.dialogueText) el.dialogueText.textContent = '';
    if (el.dialogueNext) el.dialogueNext.style.display = 'none';
    if (el.dialogueChoices) el.dialogueChoices.innerHTML = '';
    if (LM.Audio) {
      if (line.radio || line.who === 'ELÍAS' || line.who === 'NADIA' || line.who === 'LUCÍA') LM.Audio.voiceBlip(line.who);
      else if (!narration) LM.Audio.uiHover();
    }
    let i = 0;
    const full = d.text;
    if (!full) { completeTyping(); return; }
    d.timer = setInterval(() => {
      if (!dialogueState || dialogueState !== d) return;
      i += 1;
      if (el.dialogueText) el.dialogueText.textContent = full.slice(0, i);
      if (i >= full.length) {
        clearInterval(d.timer);
        d.timer = null;
        completeTyping();
      }
    }, 22);
  }

  function completeTyping() {
    const d = dialogueState;
    if (!d) return;
    if (d.timer) { clearInterval(d.timer); d.timer = null; }
    if (el.dialogueText) el.dialogueText.textContent = d.text;
    d.typing = false;
    const node = d.data.nodes[d.nodeId];
    const last = node && d.lineIndex >= node.lines.length - 1;
    if (last && node.choices && node.choices.length) {
      showChoices(node.choices);
    } else if (el.dialogueNext) {
      el.dialogueNext.style.display = 'block';
    }
  }

  function showChoices(choices) {
    const d = dialogueState;
    if (!d || !el.dialogueChoices) return;
    d.choicesShown = true;
    if (el.dialogueNext) el.dialogueNext.style.display = 'none';
    el.dialogueChoices.innerHTML = '';
    choices.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.text;
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        LM.Audio.uiClick();
        if (!dialogueState) return;
        dialogueState.choicesShown = false;
        el.dialogueChoices.innerHTML = '';
        enterNode(c.next);
      });
      el.dialogueChoices.appendChild(b);
    });
  }

  function advanceDialogue() {
    const d = dialogueState;
    if (!d) return;
    if (d.typing) { completeTyping(); return; }
    if (d.choicesShown) return;
    const node = d.data.nodes[d.nodeId];
    if (!node) { finishDialogue(); return; }
    if (d.lineIndex < node.lines.length - 1) {
      d.lineIndex += 1;
      showLine(node.lines[d.lineIndex]);
      return;
    }
    if (node.next) {
      enterNode(node.next);
      return;
    }
    finishDialogue();
  }

  function finishDialogue() {
    const d = dialogueState;
    if (!d || d.finished) return;
    d.finished = true;
    if (d.timer) clearInterval(d.timer);
    dialogueState = null;
    if (el.dialogueChoices) el.dialogueChoices.innerHTML = '';
    if (el.dialogueScreen) el.dialogueScreen.classList.remove('narration');
    hideScreen();
    if (el.dialoguePortrait) {
      el.dialoguePortrait.classList.remove('has-image');
      el.dialoguePortrait.style.backgroundImage = '';
    }
    if (game) game.uiResumed();
    if (d.onComplete) {
      setTimeout(() => { try { d.onComplete(); } catch (e) { console.error(e); } }, 90);
    }
  }

  /* ============================================================
     MECANISMO DE LA PUERTA
     ============================================================ */
  function bindDial() {
    if (!el.dialScreen) return;
    document.querySelectorAll('.dial-slot').forEach(slot => {
      const index = Number(slot.dataset.slot);
      slot.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!dialState || dialState.solved) return;
          rotateDial(index, Number(btn.dataset.dir));
        });
      });
    });
    if (el.dialConfirm) {
      el.dialConfirm.addEventListener('click', attemptDial);
    }
  }

  function openDial(options) {
    options = options || {};
    dialState = {
      slots: [3, 2, 0, 1],
      focus: 0,
      solved: false,
      onSolved: options.onSolved,
      onClose: options.onClose,
      returnToGame: true
    };
    if (el.dialFeedback) el.dialFeedback.textContent = '';
    if (el.dialDevice) el.dialDevice.classList.remove('denied');
    renderDial();
    showScreen('screen-dial');
  }

  function renderDial() {
    if (!dialState) return;
    document.querySelectorAll('.dial-slot').forEach(slot => {
      const i = Number(slot.dataset.slot);
      const sym = LM.Story.symbols[dialState.slots[i] % LM.Story.symbols.length];
      const face = slot.querySelector('.dial-face span');
      if (face) face.innerHTML = sym.svg;
      slot.classList.toggle('focused', dialState.focus === i);
    });
    if (el.dialFeedback) el.dialFeedback.textContent = '';
  }

  function rotateDial(index, dir) {
    if (!dialState) return;
    dialState.focus = index;
    dialState.slots[index] = (dialState.slots[index] + (dir > 0 ? 1 : -1) + 4) % 4;
    LM.Audio.dialTick(dir);
    renderDial();
  }

  function attemptDial() {
    if (!dialState || dialState.solved) return;
    const solution = LM.Story.dialSolution;
    const values = dialState.slots.map(i => LM.Story.symbols[i].id);
    const ok = solution.every((s, i) => s === values[i]);
    if (ok) {
      dialState.solved = true;
      if (el.dialFeedback) el.dialFeedback.textContent = 'La cerradura cede. La casa recuerda.';
      LM.Audio.dialSuccess();
      const d = dialState;
      setTimeout(() => {
        closeDial(true);
        if (d.onSolved) d.onSolved();
      }, 780);
    } else {
      if (el.dialFeedback) el.dialFeedback.textContent = LM.Story.thoughts.dial_wrong;
      if (el.dialDevice) {
        el.dialDevice.classList.remove('denied');
        void el.dialDevice.offsetWidth;
        el.dialDevice.classList.add('denied');
      }
      LM.Audio.dialFail();
    }
  }

  function closeDial(solved) {
    const d = dialState;
    dialState = null;
    if (currentScreen === 'screen-dial') resumeFromDialogueScreen();
    if (!solved && d && d.onClose) d.onClose();
  }

  function resumeFromDialogueScreen() {
    hideScreen();
    if (game) game.uiResumed();
  }

  function placeDialFocus() {
    if (!dialState) return;
    dialState.focus = (dialState.focus + 1) % 4;
    renderDial();
  }

  /* ============================================================
     FIN DE CAPÍTULO
     ============================================================ */
  function showChapter(state) {
    if (!state) return;
    const c = LM.Story.chapterEnd;
    if (el.chapterEyebrow) el.chapterEyebrow.textContent = c.eyebrow;
    if (el.chapterTitle) el.chapterTitle.textContent = c.title;
    if (el.chapterQuote) el.chapterQuote.textContent = c.quote;
    if (el.chapterNext) el.chapterNext.textContent = c.next;
    if (el.chapterStats) {
      const docs = (state.documents || []).length;
      const clues = (state.journal && state.journal.clues ? state.journal.clues.length : 0);
      const places = (state.journal && state.journal.places ? state.journal.places.length : 0);
      el.chapterStats.innerHTML =
        `<span><b>${U.formatTime(state.playTime || 0)}</b>${U.escapeHTML(c.stats[0])}</span>` +
        `<span><b>${String(docs).padStart(2, '0')}</b>${U.escapeHTML(c.stats[1])}</span>` +
        `<span><b>${String(clues).padStart(2, '0')}</b>${U.escapeHTML(c.stats[2])}</span>` +
        `<span><b>${String(places).padStart(2, '0')}</b>${U.escapeHTML(c.stats[3])}</span>`;
    }
    showScreen('screen-chapter');
    LM.Audio.chapter();
  }

  function chapterExplore() {
    hideScreen();
    if (game) game.chapterExplore();
  }

  /* ============================================================
     CONFIRMACIÓN
     ============================================================ */
  function bindConfirm() {
    if (el.confirmOk) el.confirmOk.addEventListener('click', () => resolveConfirm(true));
    if (el.confirmCancel) el.confirmCancel.addEventListener('click', () => resolveConfirm(false));
  }

  function confirm(opts) {
    opts = opts || {};
    if (confirmOpen) resolveConfirm(false);
    if (el.confirmTitle) el.confirmTitle.textContent = opts.title || '¿Continuar?';
    if (el.confirmText) el.confirmText.textContent = opts.text || '';
    if (el.confirmOk) el.confirmOk.textContent = opts.ok || 'CONFIRMAR';
    if (el.confirmCancel) el.confirmCancel.textContent = opts.cancel || 'CANCELAR';
    if (el.confirmBackdrop) el.confirmBackdrop.classList.add('active');
    confirmOpen = true;
    return new Promise(resolve => { confirmResolver = resolve; });
  }

  function resolveConfirm(value) {
    if (!confirmOpen) return;
    confirmOpen = false;
    if (el.confirmBackdrop) el.confirmBackdrop.classList.remove('active');
    const r = confirmResolver;
    confirmResolver = null;
    if (r) r(!!value);
  }
  UI.confirm = confirm;
  UI.resolveConfirm = resolveConfirm;

  /* ============================================================
     NOTIFICACIONES, SUBTÍTULOS, HUD
     ============================================================ */
  function toast(opts) {
    if (!el.toastLayer) return;
    opts = opts || {};
    const div = document.createElement('div');
    div.className = 'toast';
    const img = opts.icon ? `<img src="${opts.icon}" alt="">` : '';
    div.innerHTML = img + `<div><span class="toast-kicker">${U.escapeHTML(opts.kicker || 'REGISTRO')}</span><span class="toast-name">${U.escapeHTML(opts.name || '')}</span></div>`;
    el.toastLayer.appendChild(div);
    setTimeout(() => { try { div.remove(); } catch (e) { /* noop */ } }, 4600);
  }

  const journalLabels = {
    clues: 'NUEVA PISTA', people: 'NUEVA PERSONA', places: 'NUEVO LUGAR', questions: 'NUEVA PREGUNTA'
  };

  function notifyJournal(kind, entry) {
    if (!entry) return;
    toast({
      kicker: journalLabels[kind] || 'DIARIO ACTUALIZADO',
      name: entry.title || 'Entrada añadida',
      icon: LM.Art.icon('journal')
    });
  }

  function toastItem(itemId) {
    const item = LM.Items[itemId];
    if (!item) return;
    toast({ kicker: 'OBJETO ADQUIRIDO', name: item.name, icon: LM.Art.icon(item.icon) });
  }

  function showSubtitle(speaker, text, options) {
    options = options || {};
    if (!LM.Settings.subtitles) return;
    if (!el.subtitleLayer) return;
    const item = { speaker: speaker || '', text: text || '', options: options, duration: options.duration };
    subtitleQueue.push(item);
    if (!subtitleCurrent) pumpSubtitles();
  }

  function pumpSubtitles() {
    if (!el.subtitleLayer || subtitleCurrent) return;
    const item = subtitleQueue.shift();
    if (!item) { el.subtitleLayer.classList.remove('radio', 'danger', 'monologue'); return; }
    subtitleCurrent = item;
    if (el.subtitleSpeaker) el.subtitleSpeaker.textContent = item.speaker || '';
    if (el.subtitleText) el.subtitleText.textContent = item.text || '';
    el.subtitleLayer.classList.toggle('radio', !!item.options.radio);
    el.subtitleLayer.classList.toggle('danger', !!item.options.danger);
    el.subtitleLayer.classList.toggle('monologue', !!item.options.monologue || item.speaker === 'MARA');
    const box = el.subtitleLayer.querySelector('.subtitle-box');
    if (box) box.classList.add('show');
    const duration = item.duration || U.clamp(1800 + (item.text || '').length * 42, 2800, 9500);
    clearTimeout(subtitleTimer);
    subtitleTimer = setTimeout(() => {
      if (box) box.classList.remove('show');
      setTimeout(() => {
        subtitleCurrent = null;
        pumpSubtitles();
      }, 380);
    }, duration);
  }

  function clearSubtitles() {
    subtitleQueue = [];
    subtitleCurrent = null;
    clearTimeout(subtitleTimer);
    if (el.subtitleLayer) {
      el.subtitleLayer.classList.remove('radio', 'danger', 'monologue');
      const box = el.subtitleLayer.querySelector('.subtitle-box');
      if (box) box.classList.remove('show');
    }
  }

  function setObjective(text) {
    if (el.objectiveText) el.objectiveText.textContent = text || '';
    if (el.objective) el.objective.classList.add('show');
  }

  function setLocation(text) {
    if (!el.location) return;
    el.location.textContent = text || '';
    el.location.classList.add('show');
    clearTimeout(locationTimer);
    locationTimer = setTimeout(() => el.location.classList.remove('show'), 4600);
  }

  function updateTorch(has, active, fuel) {
    if (!el.torch) return;
    has = !!has; active = !!active; fuel = U.clamp(fuel == null ? 0 : fuel, 0, 100);
    el.torch.classList.toggle('visible', has);
    if (lastTorch.has === has && lastTorch.active === active && Math.abs(lastTorch.fuel - fuel) < .25) return;
    lastTorch = { has, active, fuel };
    if (el.torchLabel) el.torchLabel.textContent = !has ? 'SIN LUZ' : active ? 'ANTORCHA · ENCENDIDA' : 'ANTORCHA · APAGADA';
    if (el.torchFill) el.torchFill.style.width = fuel + '%';
  }

  function saveIndicator() {
    if (!el.save) return;
    el.save.classList.add('show');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => el.save.classList.remove('show'), 2200);
  }

  function showPrompt(interaction, x, y) {
    if (!el.prompt || !interaction) return;
    if (promptId !== interaction.id) {
      promptId = interaction.id;
      if (el.promptVerb) el.promptVerb.textContent = (interaction.verb || 'Examinar').toUpperCase();
      if (el.promptName) el.promptName.textContent = interaction.prompt || interaction.label || '';
    }
    el.prompt.style.left = Math.round(x) + 'px';
    el.prompt.style.top = Math.round(y) + 'px';
    el.prompt.classList.add('show');
    el.prompt.setAttribute('aria-hidden', 'false');
  }

  function closePrompt() {
    promptId = null;
    if (el.prompt) {
      el.prompt.classList.remove('show');
      el.prompt.setAttribute('aria-hidden', 'true');
    }
  }

  function setCursor(x, y, active, hot) {
    if (!el.cursor) return;
    el.cursor.style.left = x + 'px';
    el.cursor.style.top = y + 'px';
    el.cursor.classList.toggle('active', !!active);
    el.cursor.classList.toggle('hot', !!hot);
  }

  /* ============================================================
     TECLADO CONTEXTUAL
     ============================================================ */
  UI.handleKey = function (code) {
    if (!code) return false;
    if (confirmOpen) {
      if (code === 'Escape') { resolveConfirm(false); return true; }
      if (code === 'Enter') { resolveConfirm(true); return true; }
      return false;
    }
    if (!currentScreen) return false;

    if (currentScreen === 'screen-menu') {
      return false;
    }
    if (currentScreen === 'screen-campaign' || currentScreen === 'screen-credits') {
      if (code === 'Escape' || code === 'Backspace') { closeToMenu(); return true; }
      return false;
    }
    if (currentScreen === 'screen-settings') {
      if (code === 'Escape') { closeSettings(); return true; }
      return false;
    }
    if (currentScreen === 'screen-pause') {
      if (code === 'Escape' || code === 'Enter') { closePauseToGame(); return true; }
      if (code === 'KeyJ') { openJournal(); return true; }
      if (code === 'KeyI') { openInventory(); return true; }
      return false;
    }
    if (currentScreen === 'screen-journal') {
      if (code === 'Escape' || code === 'KeyJ') { closeJournal(); return true; }
      if (code === 'KeyI') { openInventory(); return true; }
      return false;
    }
    if (currentScreen === 'screen-inventory') {
      if (code === 'Escape' || code === 'KeyI') { closeInventory(); return true; }
      if (code === 'KeyJ') { openJournal(); return true; }
      if (code === 'KeyR' && game) { game.useOil(); renderInventory(game.state); return true; }
      return false;
    }
    if (currentScreen === 'screen-reader') {
      if (code === 'Escape' || code === 'KeyE' || code === 'Enter') { closeReader(); return true; }
      if (code === 'ArrowDown' || code === 'PageDown') {
        if (el.readerPaper) {
          const amount = code === 'PageDown' ? Math.max(160, el.readerPaper.clientHeight * .82) : 54;
          el.readerPaper.scrollBy({ top: amount, behavior: 'smooth' });
        }
        return true;
      }
      if (code === 'ArrowUp' || code === 'PageUp') {
        if (el.readerPaper) {
          const amount = code === 'PageUp' ? Math.max(160, el.readerPaper.clientHeight * .82) : 54;
          el.readerPaper.scrollBy({ top: -amount, behavior: 'smooth' });
        }
        return true;
      }
      return false;
    }
    if (currentScreen === 'screen-dialogue') {
      if (code === 'KeyE' || code === 'Enter' || code === 'Space') {
        advanceDialogue();
        return true;
      }
      if (code === 'Escape') {
        // No se puede abandonar una conversación a medias; ESC completa la línea.
        advanceDialogue();
        return true;
      }
      return false;
    }
    if (currentScreen === 'screen-dial') {
      if (code === 'Escape') { closeDial(false); return true; }
      if (code === 'Enter') { attemptDial(); return true; }
      if (code === 'ArrowLeft' || code === 'KeyA') {
        if (dialState) { dialState.focus = (dialState.focus + 3) % 4; renderDial(); }
        return true;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        if (dialState) { dialState.focus = (dialState.focus + 1) % 4; renderDial(); }
        return true;
      }
      if (code === 'ArrowUp' || code === 'KeyW') {
        if (dialState) rotateDial(dialState.focus, 1);
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        if (dialState) rotateDial(dialState.focus, -1);
        return true;
      }
      if (/^Digit[1-4]$/.test(code)) {
        if (dialState) { dialState.focus = Number(code.slice(-1)) - 1; renderDial(); }
        return true;
      }
      return false;
    }
    if (currentScreen === 'screen-chapter') {
      if (code === 'Escape') { chapterExplore(); return true; }
      return false;
    }
    return false;
  };

  /* ============================================================
     ACCIONES DE BOTONES
     ============================================================ */
  function bindActions() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();
      if (LM.Audio) LM.Audio.uiClick();
      const action = btn.dataset.action;
      switch (action) {
        case 'new-game': {
          if (!game) return;
          if (LM.Save.has()) {
            confirm({
              title: 'Comenzar de nuevo',
              text: 'Hay un archivo de guardado. Si inicias una nueva partida, el progreso anterior se perderá.',
              ok: 'NUEVA PARTIDA'
            }).then(ok => { if (ok) game.newGame(); });
          } else game.newGame();
          break;
        }
        case 'continue':
          if (game && !U.$('#btn-continue').hasAttribute('disabled')) game.continueGame();
          break;
        case 'campaign':
          openCampaign();
          break;
        case 'credits':
          openCredits();
          break;
        case 'back-menu':
          closeToMenu();
          break;
        case 'settings':
          openSettings(currentScreen === 'screen-pause' ? 'screen-pause' : 'screen-menu');
          break;
        case 'close-settings':
          closeSettings();
          break;
        case 'resume':
          closePauseToGame();
          break;
        case 'journal':
          openJournal();
          break;
        case 'inventory':
          openInventory();
          break;
        case 'save':
          if (game) game.saveGame(true);
          break;
        case 'quit':
          confirm({
            title: '¿Abandonar la partida?',
            text: 'El último punto seguro queda guardado. Podrás continuar desde el menú principal.',
            ok: 'ABANDONAR'
          }).then(ok => { if (ok && game) game.quitToMenu(); });
          break;
        case 'close-journal':
          closeJournal();
          break;
        case 'close-inventory':
          closeInventory();
          break;
        case 'close-reader':
          closeReader();
          break;
        case 'close-dial':
          closeDial(false);
          break;
        case 'chapter-explore':
          chapterExplore();
          break;
        case 'chapter-menu':
          if (game) game.quitToMenu();
          break;
        default:
          break;
      }
    });

    document.addEventListener('pointerover', function (e) {
      if (e.target.closest('button') && LM.Audio && LM.Audio.isReady()) LM.Audio.uiHover();
    });
  }

  /* ============================================================
     API PÚBLICA
     ============================================================ */
  UI.openPause = openPause;
  UI.refreshPause = refreshPause;
  UI.openJournal = openJournal;
  UI.openInventory = openInventory;
  UI.openSettings = openSettings;
  UI.openCampaign = openCampaign;
  UI.updateInventory = updateInventoryIfOpen;
  UI.openReader = openReader;
  UI.closeReader = closeReader;
  UI.openDialogue = openDialogue;
  UI.openDial = openDial;
  UI.closeDial = closeDial;
  UI.showChapter = showChapter;
  UI.toast = toast;
  UI.notifyJournal = notifyJournal;
  UI.toastItem = toastItem;
  UI.showSubtitle = showSubtitle;
  UI.clearSubtitles = clearSubtitles;
  UI.setObjective = setObjective;
  UI.setLocation = setLocation;
  UI.updateTorch = updateTorch;
  UI.saveIndicator = saveIndicator;
  UI.showPrompt = showPrompt;
  UI.closePrompt = closePrompt;
  UI.setCursor = setCursor;
  UI.renderJournal = renderJournal;
  UI.renderInventory = renderInventory;
  UI.refreshMenu = refreshMenu;
  UI.showSettings = refreshSettings;
  UI.home = closeToMenu;
})();
