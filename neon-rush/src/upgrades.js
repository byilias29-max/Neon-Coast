/* NEON RUSH - progresion: cartas, meta-mejoras, avatares y contratos */
(function () {
  'use strict';
  const NR = window.NR || {};
  const M = NR.M;
  const TAU = NR.TAU;

  /* ================= CARTAS DE PARTIDA ================= */
  const cards = [];
  function card(o) { cards.push(o); return o; }

  const R = { common: 0, rare: 1, epic: 2, legendary: 3 };

  /* --- armas --- */
  card({
    id: 'w_twin', name: 'GEMELA', icon: '◈', rarity: R.rare, max: 1, cat: 'arma',
    desc: () => 'Anade el arma GEMELA (dos canones).',
    apply(run) { run.addWeapon('twin'); }
  });
  card({
    id: 'w_scatter', name: 'ALBA', icon: '❋', rarity: R.rare, max: 1, cat: 'arma',
    desc: () => 'Anade el arma ALBA (abanico de metralla).',
    apply(run) { run.addWeapon('scatter'); }
  });
  card({
    id: 'w_arc', name: 'ARCO', icon: '⚡', rarity: R.rare, max: 1, cat: 'arma',
    desc: () => 'Anade el arma ARCO (rayo en cadena).',
    apply(run) { run.addWeapon('arc'); }
  });
  card({
    id: 'w_rail', name: 'RAIL', icon: '➤', rarity: R.epic, max: 1, cat: 'arma',
    desc: () => 'Anade el arma RAIL (aguja perforante).',
    apply(run) { run.addWeapon('rail'); }
  });
  card({
    id: 'w_seeker', name: 'SEGUIDOR', icon: '⊙', rarity: R.epic, max: 1, cat: 'arma',
    desc: () => 'Anade el arma SEGUIDOR (misiles rastreadores).',
    apply(run) { run.addWeapon('seeker'); }
  });
  card({
    id: 'w_nova', name: 'NOVA', icon: '✹', rarity: R.legendary, max: 1, cat: 'arma',
    desc: () => 'Anade el arma NOVA (ondas expansivas).',
    apply(run) { run.addWeapon('nova'); }
  });
  card({
    id: 'w_drones', name: 'DRONES', icon: '❂', rarity: R.legendary, max: 1, cat: 'arma',
    desc: () => 'Anade DRONES orbitales que disparan solos.',
    apply(run) { run.addWeapon('drones'); }
  });
  card({
    id: 'w_afilado', name: 'AFILADO', icon: '▲', rarity: R.common, max: 99, cat: 'arma',
    desc: (l) => 'Mejora un arma: +25% de dano y -12% de recarga.',
    apply(run) {
      const ids = Object.keys(NR.Weapons);
      const owned = run.weapons.filter(w => w !== 'pulse');
      const pool = owned.length ? owned : ids;
      const pick = pool[(Math.random() * pool.length) | 0];
      run.wlv[pick] = (run.wlv[pick] || 0) + 1;
      run.notify('Arma mejorada: ' + NR.Weapons[pick].name);
    }
  });

  /* --- estadisticas --- */
  card({
    id: 's_dmg', name: 'MUNICION', icon: '◆', rarity: R.common, max: 6, cat: 'stat',
    desc: () => '+18% de dano.',
    apply(run) { run.stats.dmg *= 1.18; }
  });
  card({
    id: 's_rate', name: 'CADENCIA', icon: '≫', rarity: R.common, max: 6, cat: 'stat',
    desc: () => '+14% de cadencia de disparo.',
    apply(run) { run.stats.fireRate *= 1.14; }
  });
  card({
    id: 's_speed', name: 'PIES LIGEROS', icon: '»', rarity: R.common, max: 5, cat: 'stat',
    desc: () => '+12% de velocidad de movimiento.',
    apply(run) { run.stats.speed *= 1.12; }
  });
  card({
    id: 's_hp', name: 'CORAZA', icon: '♥', rarity: R.common, max: 6, cat: 'stat',
    desc: () => '+25 de vida maxima.',
    apply(run) { run.stats.maxHp += 25; }
  });
  card({
    id: 's_armor', name: 'BLINDAJE', icon: '◘', rarity: R.common, max: 5, cat: 'stat',
    desc: () => '-9% de dano recibido.',
    apply(run) { run.stats.armor = Math.min(0.6, run.stats.armor + 0.09); }
  });
  card({
    id: 's_dash', name: 'IMPULSO', icon: '»', rarity: R.rare, max: 2, cat: 'stat',
    desc: () => '+1 carga de dash.',
    apply(run) { run.stats.dashCharges += 1; }
  });
  card({
    id: 's_dashcd', name: 'RECARGA', icon: '⟳', rarity: R.rare, max: 4, cat: 'stat',
    desc: () => '-22% de recarga del dash.',
    apply(run) { run.stats.dashCd *= 0.78; }
  });
  card({
    id: 's_crit', name: 'CRITICO', icon: '✦', rarity: R.rare, max: 5, cat: 'stat',
    desc: () => '+10% de probabilidad de critico.',
    apply(run) { run.stats.crit += 0.10; }
  });
  card({
    id: 's_magnet', name: 'IMAN', icon: '⊙', rarity: R.common, max: 4, cat: 'stat',
    desc: () => '+60% de radio de atraccion de eter.',
    apply(run) { run.stats.magnet *= 1.6; }
  });
  card({
    id: 's_luck', name: 'SUERTE', icon: '☘', rarity: R.rare, max: 4, cat: 'stat',
    desc: () => '+15% de botin raro y suerte de carta.',
    apply(run) { run.stats.luck += 0.15; }
  });
  card({
    id: 's_xp', name: 'ETER', icon: '⬢', rarity: R.common, max: 5, cat: 'stat',
    desc: () => '+25% de eter obtenido.',
    apply(run) { run.stats.xpGain *= 1.25; }
  });
  card({
    id: 's_pierce', name: 'PERFORANTE', icon: '➾', rarity: R.rare, max: 3, cat: 'stat',
    desc: () => 'Tus balas atraviesan +1 enemigo.',
    apply(run) { run.stats.pierce += 1; }
  });
  card({
    id: 's_bspeed', name: 'VELOCIDAD', icon: '»', rarity: R.common, max: 4, cat: 'stat',
    desc: () => '+22% de velocidad de bala.',
    apply(run) { run.stats.bulletSpeed *= 1.22; }
  });
  card({
    id: 's_regen', name: 'REGENERACION', icon: '✚', rarity: R.rare, max: 4, cat: 'stat',
    desc: () => '+1.2 de vida por segundo.',
    apply(run) { run.stats.regen += 1.2; }
  });
  card({
    id: 's_shield', name: 'ESCUDO', icon: '◇', rarity: R.rare, max: 4, cat: 'stat',
    desc: () => '+25 de escudo regenerativo.',
    apply(run) { run.stats.shield += 25; }
  });
  card({
    id: 's_hyper', name: 'OVERDRIVE', icon: '∞', rarity: R.epic, max: 4, cat: 'stat',
    desc: () => '+30% de duracion del hiper.',
    apply(run) { run.stats.hyperDur *= 1.3; }
  });

  /* --- riesgo / recompensa --- */
  card({
    id: 'r_carne', name: 'MODO CARNE', icon: '☠', rarity: R.epic, max: 3, cat: 'riesgo',
    desc: () => '+45% de dano, -22% de vida.',
    apply(run) { run.stats.dmg *= 1.45; run.stats.maxHp *= 0.78; }
  });
  card({
    id: 'r_vampiro', name: 'VAMPIRO', icon: '🩸', rarity: R.epic, max: 3, cat: 'riesgo',
    desc: () => '+7% de robo de vida, -15% de vida.',
    apply(run) { run.stats.lifesteal += 0.07; run.stats.maxHp *= 0.85; }
  });
  card({
    id: 'r_doble', name: 'DOBLE O NADA', icon: '⚡', rarity: R.legendary, max: 2, cat: 'riesgo',
    desc: () => '+90% de dano, -35% de vida.',
    apply(run) { run.stats.dmg *= 1.90; run.stats.maxHp *= 0.65; }
  });
  card({
    id: 'r_prisma', name: 'PRISMA', icon: '◈', rarity: R.epic, max: 3, cat: 'riesgo',
    desc: () => 'Tus balas explotan al impactar.',
    apply(run) { run.stats.prisma += 1; }
  });
  card({
    id: 'r_eco', name: 'ECO', icon: '⟲', rarity: R.rare, max: 3, cat: 'riesgo',
    desc: () => 'Cada disparo deja una copia retardada.',
    apply(run) { run.stats.echo += 1; }
  });
  card({
    id: 'r_aliento', name: 'SEGUNDO ALIENTO', icon: '❦', rarity: R.legendary, max: 1, cat: 'riesgo',
    desc: () => 'Revives una vez al morir, al 50% de vida.',
    apply(run) { run.revives += 1; }
  });
  card({
    id: 'r_campana', name: 'CAMPANA', icon: '◉', rarity: R.epic, max: 2, cat: 'riesgo',
    desc: () => 'Cada 18s: escudo, curacion y empuje de enemigos.',
    apply(run) { run.stats.bell += 1; }
  });
  card({
    id: 'r_frenesi', name: 'FRENESI', icon: '∞', rarity: R.epic, max: 3, cat: 'riesgo',
    desc: () => '+1 de carga de dash y +20% de cadencia.',
    apply(run) { run.stats.dashCharges += 1; run.stats.fireRate *= 1.2; }
  });
  card({
    id: 'r_oro', name: 'AVARO', icon: '⬣', rarity: R.rare, max: 3, cat: 'riesgo',
    desc: () => '+40% de eter, -10% de dano.',
    apply(run) { run.stats.xpGain *= 1.4; run.stats.dmg *= 0.90; }
  });

  const Cards = (NR.Cards = {
    pool: cards,
    rarityWeight: [60, 27, 11, 2],

    draw(run, n) {
      const out = [];
      const used = {};
      const luck = run.stats.luck || 0;
      let guard = 0;
      while (out.length < n && guard++ < 300) {
        const eligible = cards.filter(c => c.max > (run.cardLvls[c.id] || 0) && !used[c.id]);
        if (!eligible.length) break;
        /* peso por rareza + suerte */
        let total = 0;
        const weights = eligible.map(c => {
          let w = this.rarityWeight[c.rarity] * (c.rarity > 0 ? 1 + luck * c.rarity * 0.4 : 1);
          if (c.cat === 'arma' && run.weapons.length >= 4) w *= 0.35;
          if (c.cat === 'arma' && run.weapons.indexOf(c.id.replace('w_', '')) >= 0) w = 0;
          total += w;
          return w;
        });
        let r = Math.random() * total, idx = 0;
        for (let i = 0; i < eligible.length; i++) { r -= weights[i]; if (r <= 0) { idx = i; break; } }
        const c = eligible[idx];
        used[c.id] = 1;
        out.push(c);
      }
      /* si no hay cartas nuevas, ofrece mejoras de stats */
      if (!out.length) {
        const fallback = cards.filter(c => c.max > (run.cardLvls[c.id] || 0));
        if (fallback.length) out.push(fallback[(Math.random() * fallback.length) | 0]);
      }
      return out;
    },

    apply(c, run) {
      run.cardLvls[c.id] = (run.cardLvls[c.id] || 0) + 1;
      c.apply(run);
    }
  });

  /* ================= META-MEJORAS ================= */
  const meta = [
    { id: 'm_dmg', name: 'NUCLEO DE IMPACTO', icon: '◆', max: 10, desc: '+8% de dano', cost: (l) => 40 + l * 38, apply: (s) => { s.dmg *= 1.08; } },
    { id: 'm_rate', name: 'CAMARA DE FUEGO', icon: '≫', max: 8, desc: '+6% de cadencia', cost: (l) => 45 + l * 42, apply: (s) => { s.fireRate *= 1.06; } },
    { id: 'm_hp', name: 'PROTOCOLO VITAL', icon: '♥', max: 10, desc: '+12 de vida', cost: (l) => 35 + l * 30, apply: (s) => { s.maxHp += 12; } },
    { id: 'm_speed', name: 'SERVO', icon: '»', max: 6, desc: '+5% de velocidad', cost: (l) => 55 + l * 50, apply: (s) => { s.speed *= 1.05; } },
    { id: 'm_dash', name: 'PROPULSORES', icon: '⟫', max: 2, desc: '+1 carga de dash', cost: (l) => 260 + l * 300, apply: (s) => { s.dashCharges += 1; } },
    { id: 'm_crit', name: 'OPTICA', icon: '✦', max: 6, desc: '+3% de critico', cost: (l) => 60 + l * 55, apply: (s) => { s.crit += 0.03; } },
    { id: 'm_luck', name: 'SORTE', icon: '☘', max: 6, desc: '+6% de suerte', cost: (l) => 50 + l * 45, apply: (s) => { s.luck += 0.06; } },
    { id: 'm_magnet', name: 'IMAN DEVA', icon: '⊙', max: 5, desc: '+25% de imán', cost: (l) => 45 + l * 40, apply: (s) => { s.magnet *= 1.25; } },
    { id: 'm_shield', name: 'ESCUDO REACTOR', icon: '◇', max: 5, desc: '+10 de escudo', cost: (l) => 70 + l * 60, apply: (s) => { s.shield += 10; } },
    { id: 'm_hyper', name: 'INYECTOR', icon: '∞', max: 4, desc: '+15% de hiper', cost: (l) => 90 + l * 80, apply: (s) => { s.hyperDur *= 1.15; } },
    { id: 'm_xp', name: 'RECOLECTOR', icon: '⬢', max: 6, desc: '+10% de eter', cost: (l) => 40 + l * 35, apply: (s) => { s.xpGain *= 1.10; } },
    { id: 'm_cards', name: 'VISION', icon: '◈', max: 2, desc: '+1 carta por eleccion', cost: (l) => 220 + l * 260, apply: (s) => { s.cardChoices += 1; } },
    { id: 'm_score', name: 'EXPLOIT', icon: '★', max: 5, desc: '+12% de puntos', cost: (l) => 55 + l * 50, apply: (s) => { s.score *= 1.12; } }
  ];

  const Meta = (NR.Meta = {
    list: meta,

    level(id) { return NR.Save.data.meta[id] || 0; },

    stats() {
      const s = {
        dmg: 1, fireRate: 1, speed: 1, maxHp: 100, armor: 0, dashCharges: 1,
        dashCd: 1, crit: 0.05, critDmg: 2, magnet: 1, luck: 0, xpGain: 1,
        bulletSpeed: 1, pierce: 0, lifesteal: 0, regen: 0, hyperDur: 1,
        shield: 0, cardChoices: 3, score: 1,
        prisma: 0, echo: 0, bell: 0
      };
      for (const m of meta) {
        const l = this.level(m.id);
        for (let i = 0; i < l; i++) m.apply(s);
      }
      return s;
    },

    buy(id) {
      const m = meta.find(x => x.id === id);
      if (!m) return false;
      const l = this.level(id);
      if (l >= m.max) return false;
      const c = m.cost(l);
      if (NR.Save.data.nucleos < c) return false;
      NR.Save.data.nucleos -= c;
      NR.Save.data.meta[id] = l + 1;
      NR.Save.save();
      return true;
    }
  });

  /* ================= AVATARES ================= */
  const avatars = [
    { id: 'nova', name: 'NOVA', icon: '◆', unlock: 0, dmg: 1, hp: 1, speed: 1, rate: 1, crit: 0, shield: 0, dash: 0, desc: 'Equilibrada. Sin trampas.' },
    { id: 'volta', name: 'VOLTA', icon: '⚡', unlock: 700, dmg: 1, hp: 0.72, speed: 1, rate: 1.45, crit: 0, shield: 0, dash: 0, desc: '+45% cadencia, -28% vida.' },
    { id: 'titan', name: 'TITAN', icon: '⬢', unlock: 1800, dmg: 1, hp: 1.65, speed: 0.88, rate: 1, crit: 0, shield: 20, dash: 0, desc: '+65% vida, +20 escudo, -12% vel.' },
    { id: 'ghost', name: 'FANTASMA', icon: '☽', unlock: 3500, dmg: 0.82, hp: 1, speed: 1.12, rate: 1, crit: 0.02, shield: 0, dash: 1, desc: '+1 dash, +12% vel, -18% dano.' },
    { id: 'crisis', name: 'CRISIS', icon: '✹', unlock: 6000, dmg: 1.28, hp: 0.85, speed: 1, rate: 1, crit: 0.15, shield: 0, dash: 0, desc: '+28% dano, +15% crit, -15% vida.' }
  ];

  const Avatars = (NR.Avatars = {
    list: avatars,
    get(id) {
      return avatars.find(a => a.id === id) || avatars[0];
    },
    unlocked(id) {
      return (NR.Save.data.totalNucleos >= this.get(id).unlock) || !!NR.Save.data.unlocked[id];
    },
    unlockCheck() {
      for (const a of avatars) {
        if (!NR.Save.data.unlocked[a.id] && NR.Save.data.totalNucleos >= a.unlock) {
          NR.Save.data.unlocked[a.id] = true;
          NR.Save.save();
          return a;
        }
      }
      return null;
    },
    select(id) {
      if (!this.unlocked(id)) return false;
      NR.Save.data.avatar = id;
      NR.Save.save();
      return true;
    }
  });

  /* ================= CONTRATOS DIARIOS ================= */
  const contractDefs = [
    { id: 'kills', text: (n) => 'Elimina ' + n + ' enemigos en una partida', goal: 200, reward: 90, pick: [150, 200, 300, 400] },
    { id: 'wave', text: (n) => 'Llega a la oleada ' + n, goal: 12, reward: 120, pick: [8, 10, 12, 15, 20] },
    { id: 'score', text: (n) => 'Consigue ' + M.fmt(n) + ' puntos', goal: 15000, reward: 100, pick: [8000, 15000, 25000, 40000] },
    { id: 'combo', text: (n) => 'Alcanza un combo de ' + n, goal: 20, reward: 110, pick: [12, 20, 30, 45] },
    { id: 'cores', text: (n) => 'Recoge ' + n + ' nucleos', goal: 30, reward: 130, pick: [15, 30, 50, 80] },
    { id: 'nodmg', text: () => 'Termina una oleada sin recibir dano', goal: 1, reward: 160, pick: [1] },
    { id: 'hyper', text: (n) => 'Activa el hiper ' + n + ' veces', goal: 3, reward: 90, pick: [2, 3, 5, 8] },
    { id: 'elite', text: (n) => 'Elimina ' + n + ' enemigos de elite', goal: 12, reward: 140, pick: [6, 12, 20, 30] }
  ];

  const Contracts = (NR.Contracts = {
    list: [],
    refresh() {
      const d = NR.Save.data;
      const today = NR.dailySeed();
      if (d.contracts.date === String(today) && d.contracts.list && d.contracts.list.length) {
        this.list = d.contracts.list;
        return;
      }
      const rng = NR.RNG(today ^ 0x5eed);
      const pool = contractDefs.slice();
      const out = [];
      for (let i = 0; i < 3 && pool.length; i++) {
        const k = pool.splice((rng() * pool.length) | 0, 1)[0];
        const goal = k.pick[Math.floor(rng() * k.pick.length)];
        out.push({
          id: k.id, goal, reward: Math.round(k.reward * (goal / k.goal)),
          progress: 0, done: false, claimed: false,
          text: k.text(goal)
        });
      }
      d.contracts = { date: String(today), list: out };
      NR.Save.save();
      this.list = out;
    },

    /* progreso con maximos de la partida */
    report(run) {
      for (const c of this.list) {
        let v = 0;
        switch (c.id) {
          case 'kills': v = run.kills; break;
          case 'wave': v = run.wave; break;
          case 'score': v = run.score; break;
          case 'combo': v = run.maxCombo; break;
          case 'cores': v = NR.Save.data.nucleos; break;
          case 'nodmg': v = run.noDamage ? 1 : 0; break;
          case 'hyper': v = run.hyperUses; break;
          case 'elite': v = run.eliteKills; break;
        }
        if (v > c.progress) c.progress = v;
        if (c.progress >= c.goal) c.done = true;
      }
      NR.Save.save();
    },

    claimable() { return this.list.filter(c => c.done && !c.claimed); },

    claim(c) {
      if (!c.done || c.claimed) return 0;
      c.claimed = true;
      NR.Save.addNucleos(c.reward);
      NR.Save.save();
      return c.reward;
    }
  });

  NR.Cards = Cards;
  NR.Meta = Meta;
  NR.Avatars = Avatars;
  NR.Contracts = Contracts;
})();
