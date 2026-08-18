(() => {
  "use strict";

  const STORAGE_KEY = "valdora-idle-save-v2";
  const LEGACY_STORAGE_KEY = "valdora-idle-save-v1";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const makeId = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const formatNumber = (value) => Math.floor(value || 0).toLocaleString("pt-BR");
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));

  const RARITIES = {
    common: { label: "Comum", color: "#9099a1", multiplier: 1 },
    rare: { label: "Raro", color: "#5da9df", multiplier: 1.42 },
    epic: { label: "Épico", color: "#a879dc", multiplier: 2.05 },
    legendary: { label: "Lendário", color: "#e6b958", multiplier: 3.2 }
  };

  const GRADES = {
    D: { label: "Grau D", minLevel: 1, color: "#aab1b7", multiplier: 1 },
    C: { label: "Grau C", minLevel: 20, color: "#61a6dc", multiplier: 1.5 },
    B: { label: "Grau B", minLevel: 40, color: "#9b79d1", multiplier: 2.2 },
    A: { label: "Grau A", minLevel: 60, color: "#d28456", multiplier: 3.1 },
    S: { label: "Grau S", minLevel: 80, color: "#e8c85d", multiplier: 4.35 }
  };
  const GRADE_ORDER = ["D", "C", "B", "A", "S"];

  const SLOT_META = {
    weapon: { label: "Arma", icon: "⚔" },
    helmet: { label: "Elmo", icon: "♛" },
    chest: { label: "Peitoral", icon: "♜" },
    gloves: { label: "Luvas", icon: "✥" },
    boots: { label: "Botas", icon: "♟" },
    necklace: { label: "Colar", icon: "◇" },
    ring: { label: "Anel", icon: "◈" },
    cloak: { label: "Manto", icon: "⚑" }
  };

  const ITEM_POOLS = {
    weapon: ["Espada do Vigia", "Arco da Bruma", "Cetro do Véu", "Lâmina Cinzenta"],
    helmet: ["Elmo do Sentinela", "Capuz do Caçador", "Diadema Astral", "Viseira do Juramento"],
    chest: ["Couraça do Errante", "Cota da Vigília", "Túnica do Oráculo", "Peitoral do Bastião"],
    gloves: ["Manoplas de Ferro", "Luvas da Névoa", "Braçais Rúnicos", "Punhos do Exilado"],
    boots: ["Grevas da Fronteira", "Botas do Rastreador", "Passos Arcanos", "Botas do Peregrino"],
    necklace: ["Colar do Primeiro Sol", "Medalhão da Lua Pálida", "Talismã do Juramento", "Pingente das Cinzas"],
    ring: ["Anel das Brasas", "Selo do Andarilho", "Sinete Esquecido", "Aliança do Crepúsculo"],
    cloak: ["Manto do Alvorecer", "Capa da Bruma", "Véu do Arquimante", "Estandarte do Bastião"]
  };

  const RACES = {
    valdren: { label: "Valdren", sigil: "✦", copy: "Versáteis e disciplinados.", bonus: { str: 2, dex: 0, con: 1, int: 0, wit: 0 } },
    aelari: { label: "Aelari", sigil: "☾", copy: "Ágeis, atentos e precisos.", bonus: { str: 0, dex: 2, con: 0, int: 0, wit: 1 } },
    dravari: { label: "Dravari", sigil: "◆", copy: "Robustos e implacáveis.", bonus: { str: 1, dex: 0, con: 3, int: -1, wit: 0 } },
    umbrin: { label: "Umbrin", sigil: "♠", copy: "Astutos e ligados ao Véu.", bonus: { str: 0, dex: 1, con: 0, int: 2, wit: 0 } }
  };

  const ARCHETYPES = {
    vanguard: {
      label: "Vanguarda", icon: "⚔", copy: "Combate corpo a corpo e alta resistência.",
      bonus: { str: 2, dex: 0, con: 2, int: -1, wit: 0 },
      skill: "Ruptura do Bastião",
      paths: [
        { id: "duelist", name: "Duelista Rúnico", icon: "⚔", copy: "Pressão ofensiva e golpes críticos." },
        { id: "warden", name: "Guardião de Ferro", icon: "♜", copy: "Defesa, provocação e sobrevivência." }
      ],
      finals: {
        duelist: [
          { id: "blade_master", name: "Mestre da Lâmina", icon: "✥", copy: "Sequências velozes de alto dano." },
          { id: "crimson_herald", name: "Arauto Carmesim", icon: "◆", copy: "Poder crescente sob pressão." }
        ],
        warden: [
          { id: "bastion_marshal", name: "Marechal do Bastião", icon: "♜", copy: "A muralha viva da linha de frente." },
          { id: "amber_sentinel", name: "Sentinela de Âmbar", icon: "◇", copy: "Proteção rúnica e contra-ataque." }
        ]
      }
    },
    ranger: {
      label: "Patrulheiro", icon: "➶", copy: "Velocidade, evasão e precisão à distância.",
      bonus: { str: 0, dex: 3, con: 0, int: 0, wit: 1 },
      skill: "Chuva de Setas",
      paths: [
        { id: "scout", name: "Batedor da Névoa", icon: "➶", copy: "Ataques rápidos e evasivos." },
        { id: "stalker", name: "Predador do Ermo", icon: "♠", copy: "Críticos e execução de alvos." }
      ],
      finals: {
        scout: [
          { id: "horizon_warden", name: "Vigia do Horizonte", icon: "☼", copy: "Mestre do arco e da distância." },
          { id: "wind_strider", name: "Passo do Vendaval", icon: "☽", copy: "Mobilidade e rajadas contínuas." }
        ],
        stalker: [
          { id: "silent_fang", name: "Presa Silenciosa", icon: "♠", copy: "Emboscadas e dano crítico." },
          { id: "wild_harbinger", name: "Arauto Selvagem", icon: "➶", copy: "Caça incansável a monstros raros." }
        ]
      }
    },
    arcanist: {
      label: "Arcanista", icon: "✧", copy: "Magia rúnica, mana e poder elemental.",
      bonus: { str: -1, dex: 0, con: 0, int: 3, wit: 2 },
      skill: "Lança Astral",
      paths: [
        { id: "runist", name: "Adepto Rúnico", icon: "✧", copy: "Explosões arcanas e amplificação." },
        { id: "oracle", name: "Oráculo do Véu", icon: "☾", copy: "Buffs, cura e controle de mana." }
      ],
      finals: {
        runist: [
          { id: "archmage", name: "Arquimante Astral", icon: "✦", copy: "Poder elemental em escala máxima." },
          { id: "rift_weaver", name: "Tecelão de Fendas", icon: "◇", copy: "Rupturas do Véu e dano em cadeia." }
        ],
        oracle: [
          { id: "dawn_hierophant", name: "Hierofante do Alvorecer", icon: "☼", copy: "Bênçãos e proteção superior." },
          { id: "veil_sage", name: "Sábio do Véu", icon: "☾", copy: "Domínio de mana e enfraquecimentos." }
        ]
      }
    }
  };

  const ZONES = [
    {
      id: "frontier", title: "Fronteira de Aurion", subtitle: "Território recomendado · Nv. 1–19", unlock: 1, range: [1, 19],
      icon: "⌂", enemies: ["Lobo da Fronteira", "Saqueador Cinzento", "Javali de Pedra"], baseHp: 58, baseAttack: 6, exp: 28, gold: 18,
      background: "assets/frontier-valley.png", tint: "none", pvp: false
    },
    {
      id: "ruins", title: "Ruínas do Crepúsculo", subtitle: "Território disputado · Nv. 20–39", unlock: 20, range: [20, 39],
      icon: "⌁", enemies: ["Vigia Espectral", "Gárgula Antiga", "Fera das Ruínas"], baseHp: 430, baseAttack: 42, exp: 150, gold: 92,
      background: "assets/courtyard.png", tint: "hue-rotate(-8deg) saturate(1.08)", pvp: true
    },
    {
      id: "blackwood", title: "Bosque de Ferro Negro", subtitle: "Território de clãs · Nv. 40–59", unlock: 40, range: [40, 59],
      icon: "♠", enemies: ["Rastreador Corrompido", "Fera do Bosque", "Cavaleiro Sem Rosto"], baseHp: 1320, baseAttack: 108, exp: 460, gold: 275,
      background: "assets/frontier-valley.png", tint: "hue-rotate(70deg) saturate(.72)", pvp: true
    },
    {
      id: "ashcrater", title: "Cratera das Cinzas", subtitle: "Domínio ancestral · Nv. 60–85", unlock: 60, range: [60, 85],
      icon: "▲", enemies: ["Devorador de Brasas", "Titã Carbonizado", "Serpe Magmática"], baseHp: 3900, baseAttack: 245, exp: 1280, gold: 790,
      background: "assets/courtyard.png", tint: "hue-rotate(-24deg) saturate(1.35) brightness(.92)", pvp: true
    }
  ];

  const MISSIONS = [
    { id: "kills10", icon: "⚔", title: "Batismo de aço", copy: "Derrote 10 criaturas.", field: "kills", goal: 10, gold: 350, gems: 5 },
    { id: "level20", icon: "✦", title: "Primeira especialização", copy: "Alcance o nível 20.", field: "level", goal: 20, gold: 2200, gems: 18 },
    { id: "enchant3", icon: "◆", title: "Mestre da forja", copy: "Realize 3 tentativas de enchant.", field: "enchantAttempts", goal: 3, gold: 1200, gems: 12 },
    { id: "arena1", icon: "♜", title: "Conclave de heróis", copy: "Vença 1 duelo ranqueado.", field: "arenaWins", goal: 1, gold: 1600, gems: 14 },
    { id: "boss1", icon: "♛", title: "Queda de Valakas", copy: "Derrote Valakas uma vez.", field: "worldBossWins", goal: 1, gold: 5000, gems: 35 },
    { id: "territory1", icon: "⚑", title: "Pelo estandarte", copy: "Vença 1 guerra territorial.", field: "territoryWins", goal: 1, gold: 3400, gems: 24 }
  ];

  const MARKET_PRODUCTS = {
    potions: { icon: "✚", name: "Poções rubras", copy: "Recupera 48% do HP. Pacote com 5.", currency: "gold", price: 180, amount: 5 },
    ether: { icon: "✧", name: "Cargas de Éter", copy: "Amplifica em 50% o dano de um ataque. Pacote com 50.", currency: "gold", price: 260, amount: 50 },
    scrolls: { icon: "▤", name: "Pergaminho de enchant", copy: "Necessário para uma tentativa comum.", currency: "gold", price: 950, amount: 1 },
    blessed: { icon: "✦", name: "Pergaminho selado", copy: "Protege o equipamento da quebra.", currency: "gems", price: 22, amount: 1 }
  };

  const FIELD_SPAWNS = [
    { x: 39, y: 38 },
    { x: 64, y: 27 },
    { x: 72, y: 66 },
    { x: 36, y: 70 }
  ];

  const FIELD_LANDMARKS = [
    { id: "warden", x: 26, y: 25, range: 12 },
    { id: "shrine", x: 79, y: 33, range: 11 }
  ];

  const FIELD_PATROL_ROUTE = [
    { x: 48, y: 72 }, { x: 34, y: 60 }, { x: 42, y: 42 },
    { x: 59, y: 32 }, { x: 73, y: 50 }, { x: 66, y: 69 }
  ];

  function createStarterItem(slot, name, stats) {
    return { id: makeId(), slot, name, rarity: "common", grade: "D", enchant: 0, ...stats };
  }

  function starterEquipment(archetype) {
    const weapons = {
      vanguard: createStarterItem("weapon", "Espada de Recruta", { attack: 8, defense: 0, crit: 1 }),
      ranger: createStarterItem("weapon", "Arco de Recruta", { attack: 7, defense: 0, crit: 2.2 }),
      arcanist: createStarterItem("weapon", "Cetro de Recruta", { attack: 9, defense: 0, crit: .5 })
    };
    return {
      weapon: weapons[archetype] || weapons.vanguard,
      helmet: null,
      chest: createStarterItem("chest", "Cota de Couro Gasta", { attack: 0, defense: 6, crit: 0 }),
      gloves: null,
      boots: createStarterItem("boots", "Botas de Viagem", { attack: 0, defense: 2, crit: .4 }),
      necklace: null,
      ring: null,
      cloak: null
    };
  }

  function initialState() {
    return {
      version: 2, created: false, name: "Kael", race: "valdren", archetype: "vanguard",
      classTier: 0, classPath: null, finalClass: null,
      attributes: { str: 0, dex: 0, con: 0, int: 0, wit: 0 }, attributePoints: 0,
      lastSeen: Date.now(), running: false, sound: false, speed: 1, zoneIndex: 0,
      targetMode: "any", autoPotion: true, autoEther: false,
      gold: 420, gems: 35, honor: 0, potions: 8, etherCharges: 80, scrolls: 4, blessedScrolls: 1, useBlessedScroll: false,
      level: 1, xp: 0, hp: 0, mp: 0, kills: 0, skillUses: 0, enchantAttempts: 0,
      arenaWins: 0, arenaLosses: 0, arenaPoints: 1000,
      pvpKills: 0, karma: 0, territoryWins: 0, territoryCooldownUntil: 0,
      clan: { joined: false, name: "", influence: 0 },
      worldBossWins: 0, bossCooldownUntil: 0,
      fieldPosition: { x: 50, y: 72 }, fieldAutoHunt: false, fieldHuntTarget: "", huntContractKills: 0, huntContractsCompleted: 0, shrineCooldownUntil: 0,
      activeBuffs: { furyUntil: 0, wardUntil: 0 },
      marketPurchases: 0, claimedMissions: [], inventory: [],
      equipment: starterEquipment("vanguard")
    };
  }

  function normalizeItem(item, fallbackSlot) {
    if (!item) return null;
    return {
      id: item.id || makeId(), slot: item.slot === "armor" ? "chest" : (item.slot || fallbackSlot),
      name: item.name || "Equipamento antigo", rarity: RARITIES[item.rarity] ? item.rarity : "common",
      grade: GRADES[item.grade] ? item.grade : "D", enchant: Number(item.enchant || 0),
      attack: Number(item.attack || 0), defense: Number(item.defense || 0), crit: Number(item.crit || 0)
    };
  }

  function normalizeState(saved) {
    const fresh = initialState();
    const merged = {
      ...fresh, ...saved, version: 2,
      attributes: { ...fresh.attributes, ...(saved.attributes || {}) },
      activeBuffs: { ...fresh.activeBuffs, ...(saved.activeBuffs || {}) },
      fieldPosition: { ...fresh.fieldPosition, ...(saved.fieldPosition || {}) },
      clan: { ...fresh.clan, ...(saved.clan || {}) },
      claimedMissions: Array.isArray(saved.claimedMissions) ? saved.claimedMissions : [],
      inventory: Array.isArray(saved.inventory) ? saved.inventory.map((item) => normalizeItem(item, item.slot)) : []
    };
    merged.equipment = {};
    Object.keys(SLOT_META).forEach((slot) => {
      const source = saved.equipment && (saved.equipment[slot] || (slot === "chest" ? saved.equipment.armor : null));
      merged.equipment[slot] = normalizeItem(source, slot);
    });
    return merged;
  }

  function migrateLegacy(legacy) {
    const fresh = initialState();
    return normalizeState({
      ...fresh, ...legacy, version: 2, created: true, name: "Kael", race: "valdren", archetype: "vanguard",
      classTier: 0, classPath: null, finalClass: null, honor: legacy.arenaPoints || 0,
      etherCharges: 80, scrolls: 4, blessedScrolls: 1,
      equipment: legacy.equipment || fresh.equipment
    });
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.version === 2) return normalizeState(saved);
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
      if (legacy && legacy.version === 1) return migrateLegacy(legacy);
    } catch {
      return initialState();
    }
    return initialState();
  }

  let state = loadState();
  let enemy = null;
  let encounterActive = false;
  let activeFieldEnemyId = null;
  let fieldEnemies = [];
  let nearbyFieldTarget = null;
  let fieldMoveTimer = null;
  let autoHuntTimer = null;
  let patrolRouteIndex = 0;
  let combatLocked = false;
  let selectedInventoryId = null;
  let inventoryFilter = "all";
  let forgeSlot = "weapon";
  let conflictTab = "boss";
  let draftRace = state.race;
  let draftArchetype = state.archetype;
  let audioContext = null;
  const cooldowns = { classSkill: 0, buff: 0 };

  function saveState() {
    state.lastSeen = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function xpNeeded(level = state.level) {
    return Math.floor(88 * Math.pow(level, 1.29));
  }

  function gradeForLevel(level = state.level) {
    let grade = "D";
    GRADE_ORDER.forEach((key) => {
      if (level >= GRADES[key].minLevel) grade = key;
    });
    return grade;
  }

  function nextGrade(grade) {
    return GRADE_ORDER[Math.min(GRADE_ORDER.length - 1, GRADE_ORDER.indexOf(grade) + 1)];
  }

  function currentClassName() {
    const archetype = ARCHETYPES[state.archetype] || ARCHETYPES.vanguard;
    if (state.classTier === 0 || !state.classPath) return archetype.label;
    const path = archetype.paths.find((entry) => entry.id === state.classPath);
    if (state.classTier === 1 || !state.finalClass) return path ? path.name : archetype.label;
    const final = (archetype.finals[state.classPath] || []).find((entry) => entry.id === state.finalClass);
    return final ? final.name : (path ? path.name : archetype.label);
  }

  function classIcon() {
    const archetype = ARCHETYPES[state.archetype] || ARCHETYPES.vanguard;
    if (state.classTier === 2) {
      const final = (archetype.finals[state.classPath] || []).find((entry) => entry.id === state.finalClass);
      if (final) return final.icon;
    }
    if (state.classTier === 1) {
      const path = archetype.paths.find((entry) => entry.id === state.classPath);
      if (path) return path.icon;
    }
    return archetype.icon;
  }

  function attributeTotals() {
    const base = { str: 8, dex: 8, con: 8, int: 8, wit: 8 };
    const race = RACES[state.race] || RACES.valdren;
    const archetype = ARCHETYPES[state.archetype] || ARCHETYPES.vanguard;
    Object.keys(base).forEach((key) => {
      base[key] += Number(race.bonus[key] || 0) + Number(archetype.bonus[key] || 0) + Number(state.attributes[key] || 0);
    });
    return base;
  }

  function itemStats(item) {
    if (!item) return { attack: 0, defense: 0, crit: 0 };
    const enchantMultiplier = 1 + Number(item.enchant || 0) * .12;
    return {
      attack: Math.round(Number(item.attack || 0) * enchantMultiplier),
      defense: Math.round(Number(item.defense || 0) * enchantMultiplier),
      crit: Number((Number(item.crit || 0) + Number(item.enchant || 0) * .18).toFixed(1))
    };
  }

  function playerStats() {
    const gear = Object.values(state.equipment).reduce((total, item) => {
      const stats = itemStats(item);
      total.attack += stats.attack;
      total.defense += stats.defense;
      total.crit += stats.crit;
      return total;
    }, { attack: 0, defense: 0, crit: 0 });
    const attributes = attributeTotals();
    const archetype = state.archetype;
    const primary = archetype === "arcanist" ? attributes.int : archetype === "ranger" ? attributes.dex : attributes.str;
    const tierMultiplier = 1 + state.classTier * .085;
    const fury = state.activeBuffs.furyUntil > Date.now() ? 1.2 : 1;
    const ward = state.activeBuffs.wardUntil > Date.now() ? 1.22 : 1;
    const attack = (8 + state.level * 2.7 + primary * 1.85 + gear.attack) * tierMultiplier * fury;
    const defense = (4 + state.level * 1.25 + attributes.con * 1.42 + gear.defense) * ward;
    const crit = Math.min(55, 3 + attributes.dex * .42 + gear.crit + (archetype === "ranger" ? 4 : 0));
    const evasion = Math.min(38, 2 + attributes.dex * .3 + (archetype === "ranger" ? 3 : 0));
    const maxHp = Math.round(78 + state.level * 16 + attributes.con * 10.5 + gear.defense * 2.4 + (archetype === "vanguard" ? 35 : 0));
    const maxMp = Math.round(42 + state.level * 4 + attributes.int * 5.5 + attributes.wit * 4 + (archetype === "arcanist" ? 35 : 0));
    const power = Math.round(attack * 6 + defense * 4.6 + maxHp * .44 + maxMp * .2 + crit * 3.2 + evasion * 2 + state.level * 20);
    return { attack, defense, crit, evasion, maxHp, maxMp, power, attributes };
  }

  function weightedRarity(bossDrop) {
    const roll = Math.random() * 100;
    const zoneBonus = state.zoneIndex * 2.2 + (bossDrop ? 12 : 0);
    if (roll < 2 + zoneBonus) return "legendary";
    if (roll < 11 + zoneBonus * 1.2) return "epic";
    if (roll < 36 + zoneBonus * 1.65) return "rare";
    return "common";
  }

  function generateItem(options = {}) {
    const slotKeys = Object.keys(SLOT_META);
    const slot = options.forcedSlot || slotKeys[randomBetween(0, slotKeys.length - 1)];
    const rarity = options.forcedRarity || weightedRarity(options.bossDrop);
    const naturalGrade = gradeForLevel();
    const grade = options.forcedGrade || (options.bossDrop ? nextGrade(naturalGrade) : naturalGrade);
    const rarityData = RARITIES[rarity];
    const gradeData = GRADES[grade];
    const levelScale = 1 + Math.max(0, state.level - gradeData.minLevel) * .018;
    const base = rarityData.multiplier * gradeData.multiplier * levelScale;
    const suffixes = rarity === "legendary" ? ["do Eclipse", "da Chama Eterna"] : rarity === "epic" ? ["do Juramento", "Ancestral"] : ["", "do Vigia"];
    const baseName = ITEM_POOLS[slot][randomBetween(0, ITEM_POOLS[slot].length - 1)];
    const suffix = suffixes[randomBetween(0, suffixes.length - 1)];
    const stats = { attack: 0, defense: 0, crit: 0 };
    if (slot === "weapon") {
      stats.attack = Math.max(6, Math.round(randomBetween(7, 12) * base));
      stats.crit = Number((randomBetween(4, 14) / 10 * rarityData.multiplier).toFixed(1));
    } else if (["chest", "helmet", "gloves", "boots", "cloak"].includes(slot)) {
      const slotFactor = slot === "chest" ? 1 : slot === "helmet" ? .7 : .48;
      stats.defense = Math.max(2, Math.round(randomBetween(5, 10) * base * slotFactor));
      stats.crit = slot === "gloves" || slot === "boots" ? Number((randomBetween(1, 8) / 10 * rarityData.multiplier).toFixed(1)) : 0;
    } else {
      stats.attack = Math.max(1, Math.round(randomBetween(1, 4) * base));
      stats.crit = Number((randomBetween(6, 18) / 10 * rarityData.multiplier).toFixed(1));
    }
    return { id: makeId(), slot, name: baseName + (suffix ? " " + suffix : ""), rarity, grade, enchant: 0, ...stats };
  }

  function enchantVisual(item) {
    const level = Number(item && item.enchant || 0);
    if (level >= 10) return { size: "23px", color: "rgba(238,72,46,.78)" };
    if (level >= 7) return { size: "18px", color: "rgba(71,151,245,.72)" };
    if (level >= 4) return { size: "13px", color: "rgba(91,209,139,.62)" };
    return { size: "0px", color: "transparent" };
  }

  function itemStyle(item) {
    const rarity = RARITIES[item.rarity];
    const glow = enchantVisual(item);
    return "--rarity:" + rarity.color + ";--glow-size:" + glow.size + ";--glow-color:" + glow.color;
  }

  function fieldDistance(x1, y1, x2, y2) {
    return Math.hypot((x1 - x2) * 1.15, y1 - y2);
  }

  function buildFieldEnemies() {
    const zone = ZONES[state.zoneIndex];
    if (!zone.enemies.includes(state.fieldHuntTarget)) state.fieldHuntTarget = zone.enemies[0];
    fieldEnemies = FIELD_SPAWNS.map((spawn, index) => {
      let rank = targetRank();
      if (index === 1 && rank === "common") rank = "elite";
      const baseName = zone.enemies[(index + state.zoneIndex) % zone.enemies.length];
      return { id: "field-" + state.zoneIndex + "-" + index + "-" + Date.now(), baseName, rank, x: spawn.x, y: spawn.y, respawnUntil: 0 };
    });
    renderExploration();
  }

  function renderFieldPlayer() {
    const player = $("#fieldPlayer");
    if (!player) return;
    player.style.left = state.fieldPosition.x + "%";
    player.style.top = state.fieldPosition.y + "%";
    $("#fieldPlayerName").textContent = state.name;
    $("#fieldPlayerClass").textContent = currentClassName();
  }

  function renderExploration() {
    if (!$("#fieldEnemies")) return;
    const now = Date.now();
    $("#fieldEnemies").innerHTML = fieldEnemies.map((target) => {
      const respawning = target.respawnUntil > now;
      const rankLabel = target.rank === "boss" ? "CHEFE DE CAMPO" : target.rank === "elite" ? "ELITE" : "CRIATURA";
      const name = target.rank === "boss" ? "Alfa " + target.baseName : target.rank === "elite" ? target.baseName + " Veterano" : target.baseName;
      const selected = target.id === activeFieldEnemyId;
      const marked = target.baseName === state.fieldHuntTarget;
      const variant = ZONES[state.zoneIndex].enemies.indexOf(target.baseName);
      const hpPercent = selected && enemy ? clamp(enemy.hp / enemy.maxHp * 100, 0, 100) : 100;
      return "<button class='field-enemy variant-" + variant + " " + target.rank + " " + (respawning ? "respawning " : "") + (selected ? "selected-target " : "") + (marked ? "hunt-marked" : "") + "' style='--field-x:" + target.x + "%;--field-y:" + target.y + "%' data-field-enemy='" + target.id + "' " + (respawning ? "disabled" : "") + "><span class='field-sprite monster-field-sprite'><img src='assets/shadow-wolf-run-sheet.png' alt='" + escapeHtml(name) + "'></span><span class='field-enemy-label'><strong>" + escapeHtml(name) + "</strong><small>" + (respawning ? "RETORNANDO" : marked ? "ALVO DA CAÇA" : rankLabel) + "</small></span><span class='field-enemy-hp'><i style='width:" + hpPercent + "%'></i></span></button>";
    }).join("");
    const zone = ZONES[state.zoneIndex];
    $("#fieldTargetPicker").innerHTML = zone.enemies.map((name, index) => "<button class='field-target-option variant-" + index + " " + (state.fieldHuntTarget === name ? "selected" : "") + "' data-hunt-target='" + escapeHtml(name) + "'><span class='field-target-icon'><img src='assets/shadow-wolf-run-sheet.png' alt=''></span><b>" + escapeHtml(name) + "</b></button>").join("");
    const progress = clamp(Number(state.huntContractKills || 0), 0, 3);
    $("#fieldQuestBar").style.width = progress / 3 * 100 + "%";
    $("#fieldQuestText").textContent = progress + "/3";
    $("#fieldQuestTitle").textContent = state.fieldAutoHunt ? "Caçando " + state.fieldHuntTarget : "Escolha a criatura que deseja caçar";
    $("#fieldHuntState").textContent = state.fieldAutoHunt ? (encounterActive ? "EM COMBATE" : "PATRULHANDO") : "PARADA";
    $("#fieldAutoHuntToggle").querySelector("b").textContent = state.fieldAutoHunt ? "PARAR CAÇADA" : "INICIAR CAÇADA";
    $("#fieldAutoHuntCopy").textContent = state.fieldAutoHunt ? "Procurando " + state.fieldHuntTarget : "O herói seguirá o alvo pelo mapa";
    $(".field-hunt-card").classList.toggle("active", state.fieldAutoHunt);
    renderFieldPlayer();
    checkNearbyFieldTarget();
  }

  function enterExploration(message = "") {
    encounterActive = false;
    activeFieldEnemyId = null;
    combatLocked = false;
    $("#world").classList.add("exploring");
    $("#world").classList.remove("combat-active", "field-combat-active");
    $("#heroEntity").classList.remove("defeated");
    $("#fieldPlayer").classList.remove("attacking", "hit");
    if (!fieldEnemies.length) buildFieldEnemies();
    renderExploration();
    renderHud();
    if (message) showActivity(message);
    if (state.fieldAutoHunt) scheduleAutoHunt(650);
  }

  function beginFieldEncounter(target) {
    if (!target || target.respawnUntil > Date.now() || encounterActive || !state.created) return;
    clearTimeout(autoHuntTimer);
    encounterActive = true;
    activeFieldEnemyId = target.id;
    combatLocked = false;
    $("#world").classList.add("exploring", "field-combat-active");
    $("#world").classList.remove("combat-active");
    if (state.fieldAutoHunt) state.running = true;
    spawnEnemy(target);
    renderExploration();
    showActivity((state.fieldAutoHunt ? "Caça automática encontrou " : "Encontro iniciado contra ") + enemy.name + ".");
  }

  function fleeFieldEncounter() {
    if (!encounterActive) return;
    stopFieldAutoHunt(false);
    enterExploration("Você recuou do combate. Escolha outro caminho ou tente novamente.");
    saveState();
  }

  function moveFieldPlayerTo(x, y, callback = null, automatic = false) {
    if (encounterActive || !state.created) return;
    clearTimeout(fieldMoveTimer);
    const nextX = clamp(Number(x), 12, 88);
    const nextY = clamp(Number(y), 18, 82);
    const distance = fieldDistance(state.fieldPosition.x, state.fieldPosition.y, nextX, nextY);
    const duration = automatic ? clamp(Math.round(distance * 34), 480, 1800) : clamp(Math.round(distance * 28), 220, 900);
    state.fieldPosition.x = nextX;
    state.fieldPosition.y = nextY;
    const player = $("#fieldPlayer");
    player.style.transitionDuration = duration + "ms";
    player.classList.add("walking");
    renderFieldPlayer();
    fieldMoveTimer = setTimeout(() => {
      player.classList.remove("walking");
      checkNearbyFieldTarget();
      saveState();
      if (callback) callback();
    }, duration + 30);
  }

  function moveFieldPlayer(direction) {
    const steps = { up: [0, -4], down: [0, 4], left: [-4, 0], right: [4, 0] };
    const delta = steps[direction];
    if (!delta) return;
    moveFieldPlayerTo(state.fieldPosition.x + delta[0], state.fieldPosition.y + delta[1]);
  }

  function requestFieldEncounter(id) {
    const target = fieldEnemies.find((entry) => entry.id === id);
    if (!target || target.respawnUntil > Date.now()) return;
    selectFieldHuntTarget(target.baseName);
    if (!state.fieldAutoHunt) startFieldAutoHunt();
    else scheduleAutoHunt(80);
  }

  function selectFieldHuntTarget(name) {
    const zone = ZONES[state.zoneIndex];
    if (!zone.enemies.includes(name)) return;
    clearTimeout(fieldMoveTimer);
    $("#fieldPlayer")?.classList.remove("walking");
    state.fieldHuntTarget = name;
    showActivity("Alvo selecionado: " + name + ".");
    saveState();
    renderExploration();
    if (state.fieldAutoHunt) scheduleAutoHunt(80);
  }

  function startFieldAutoHunt() {
    if (!state.created) return;
    const zone = ZONES[state.zoneIndex];
    if (!zone.enemies.includes(state.fieldHuntTarget)) state.fieldHuntTarget = zone.enemies[0];
    state.fieldAutoHunt = true;
    state.running = true;
    showActivity("Caça iniciada: procurando " + state.fieldHuntTarget + ".");
    saveState();
    renderExploration();
    scheduleAutoHunt(120);
  }

  function stopFieldAutoHunt(showMessage = true) {
    clearTimeout(autoHuntTimer);
    state.fieldAutoHunt = false;
    if (encounterActive) state.running = false;
    $("#fieldPlayer")?.classList.remove("walking");
    if (showMessage) showActivity("Caça automática interrompida.");
    saveState();
    renderExploration();
    renderHud();
  }

  function toggleFieldAutoHunt() {
    if (state.fieldAutoHunt) stopFieldAutoHunt();
    else startFieldAutoHunt();
  }

  function scheduleAutoHunt(delay = 400) {
    clearTimeout(autoHuntTimer);
    if (!state.fieldAutoHunt) return;
    autoHuntTimer = setTimeout(autoHuntStep, delay);
  }

  function autoHuntStep() {
    if (!state.fieldAutoHunt || !state.created) return;
    if (encounterActive) {
      state.running = true;
      return;
    }
    if ($("#modal").classList.contains("open") || $("#drawer").classList.contains("open")) {
      scheduleAutoHunt(800);
      return;
    }
    const available = fieldEnemies.filter((target) => target.baseName === state.fieldHuntTarget && target.respawnUntil <= Date.now());
    available.sort((a, b) => fieldDistance(state.fieldPosition.x, state.fieldPosition.y, a.x, a.y) - fieldDistance(state.fieldPosition.x, state.fieldPosition.y, b.x, b.y));
    const target = available[0];
    if (target) {
      showActivity("Rastreando " + state.fieldHuntTarget + " pelo campo...");
      moveFieldPlayerTo(target.x, target.y + 4, () => {
        if (state.fieldAutoHunt && target.respawnUntil <= Date.now() && !$("#modal").classList.contains("open") && !$("#drawer").classList.contains("open")) beginFieldEncounter(target);
        else scheduleAutoHunt(300);
      }, true);
      return;
    }
    const waypoint = FIELD_PATROL_ROUTE[patrolRouteIndex % FIELD_PATROL_ROUTE.length];
    patrolRouteIndex += 1;
    showActivity("Nenhum " + state.fieldHuntTarget + " disponível. Patrulhando a região...");
    moveFieldPlayerTo(waypoint.x, waypoint.y, () => scheduleAutoHunt(550), true);
  }

  function checkNearbyFieldTarget() {
    if (encounterActive || !$("#interactionPrompt")) return;
    const candidates = fieldEnemies.filter((target) => target.respawnUntil <= Date.now()).map((target) => ({
      type: "enemy", id: target.id, x: target.x, y: target.y, range: 10,
      label: "ENFRENTAR " + target.baseName.toUpperCase()
    })).concat(FIELD_LANDMARKS.map((landmark) => ({
      ...landmark, type: "landmark", label: landmark.id === "warden" ? "CONVERSAR COM O VIGIA" : "ATIVAR O ALTAR"
    })));
    candidates.sort((a, b) => fieldDistance(state.fieldPosition.x, state.fieldPosition.y, a.x, a.y) - fieldDistance(state.fieldPosition.x, state.fieldPosition.y, b.x, b.y));
    nearbyFieldTarget = candidates.find((candidate) => fieldDistance(state.fieldPosition.x, state.fieldPosition.y, candidate.x, candidate.y) <= candidate.range) || null;
    const prompt = $("#interactionPrompt");
    prompt.classList.toggle("ready", Boolean(nearbyFieldTarget));
    $("#interactionText").textContent = nearbyFieldTarget ? nearbyFieldTarget.label : "EXPLORE O CAMPO E ENCONTRE UM ALVO";
    $$(".field-enemy,.field-landmark").forEach((node) => node.classList.remove("focused"));
    if (nearbyFieldTarget) {
      const selector = nearbyFieldTarget.type === "enemy" ? "[data-field-enemy='" + nearbyFieldTarget.id + "']" : "[data-field-action='" + nearbyFieldTarget.id + "']";
      $(selector)?.classList.add("focused");
    }
  }

  function interactWithNearbyTarget() {
    if (!nearbyFieldTarget || encounterActive) return;
    if (nearbyFieldTarget.type === "enemy") requestFieldEncounter(nearbyFieldTarget.id);
    else interactWithLandmark(nearbyFieldTarget.id);
  }

  function interactWithLandmark(id) {
    if (id === "warden") {
      showModal("<div class='modal-crest'><span>⚑</span></div><h2>Vigia Rowan</h2><p>A fronteira precisa de caçadores. Derrube três criaturas no campo e receba uma recompensa adicional de experiência e ouro.</p><div class='score-row'><div class='score-box'><small>PROGRESSO</small><strong>" + state.huntContractKills + "/3</strong></div><div class='score-box'><small>CONTRATOS</small><strong>" + state.huntContractsCompleted + "</strong></div><div class='score-box'><small>REGIÃO</small><strong>Nv. " + ZONES[state.zoneIndex].range[0] + "+</strong></div></div><button class='gold-button' style='width:100%' data-field-rest>DESCANSAR NO POSTO</button>");
    }
    if (id === "shrine") activateFieldShrine();
  }

  function activateFieldShrine() {
    const remaining = Math.ceil((state.shrineCooldownUntil - Date.now()) / 1000);
    if (remaining > 0) {
      showActivity("O Altar antigo recuperará sua energia em " + remaining + "s.");
      return;
    }
    state.activeBuffs.furyUntil = Math.max(state.activeBuffs.furyUntil, Date.now() + 90000);
    state.activeBuffs.wardUntil = Math.max(state.activeBuffs.wardUntil, Date.now() + 90000);
    state.shrineCooldownUntil = Date.now() + 120000;
    showActivity("Bênção do Altar: ataque e defesa ampliados por 90 segundos.");
    playTone("level");
    saveState();
    renderHud();
  }

  function restAtFieldPost() {
    const stats = playerStats();
    state.hp = stats.maxHp;
    state.mp = stats.maxMp;
    closeModal();
    showActivity("Rowan restaurou seu HP e MP. Boa caça!");
    playTone("potion");
    saveState();
    renderHud();
  }

  function targetRank() {
    const roll = Math.random();
    if (state.targetMode === "boss") return roll < .32 ? "boss" : roll < .68 ? "elite" : "common";
    if (state.targetMode === "elite") return roll < .08 ? "boss" : roll < .62 ? "elite" : "common";
    return roll < .035 ? "boss" : roll < .16 ? "elite" : "common";
  }

  function spawnEnemy(fieldTarget = null) {
    const zone = ZONES[state.zoneIndex];
    const upperLevel = Math.min(zone.range[1], Math.max(zone.range[0] + 1, state.level + 1));
    const level = randomBetween(zone.range[0], upperLevel);
    const rank = fieldTarget ? fieldTarget.rank : targetRank();
    const multiplier = rank === "boss" ? 3.4 : rank === "elite" ? 1.72 : 1;
    const baseName = fieldTarget ? fieldTarget.baseName : zone.enemies[randomBetween(0, zone.enemies.length - 1)];
    const name = rank === "boss" ? "Alfa " + baseName : rank === "elite" ? baseName + " Veterano" : baseName;
    const maxHp = Math.round(zone.baseHp * (1 + (level - zone.range[0]) * .105) * multiplier);
    enemy = {
      name, level, rank, maxHp, hp: maxHp,
      attack: Math.round(zone.baseAttack * (1 + (level - zone.range[0]) * .075) * (rank === "boss" ? 1.78 : rank === "elite" ? 1.3 : 1)),
      defense: Math.round(level * 1.18 + (rank === "boss" ? 12 : rank === "elite" ? 5 : 0)),
      exp: Math.round(zone.exp * multiplier * (1 + (level - zone.range[0]) * .045)),
      gold: Math.round(zone.gold * multiplier * (1 + (level - zone.range[0]) * .045)),
      fieldId: fieldTarget ? fieldTarget.id : null
    };
    const entity = $("#enemyEntity");
    entity.classList.remove("defeated", "hit", "attack");
    entity.style.filter = zone.tint + (rank === "elite" ? " brightness(1.14)" : rank === "boss" ? " saturate(1.35) brightness(1.12)" : "");
    entity.style.transform = rank === "boss" ? "scale(1.12)" : "";
    renderHud();
  }

  function addExperience(amount, quiet = false) {
    state.xp += amount;
    let levelsGained = 0;
    while (state.xp >= xpNeeded()) {
      state.xp -= xpNeeded();
      state.level += 1;
      levelsGained += 1;
      if (state.level % 5 === 0) state.attributePoints += 1;
    }
    if (levelsGained > 0) {
      const stats = playerStats();
      state.hp = stats.maxHp;
      state.mp = stats.maxMp;
      if (!quiet) {
        showActivity("Nível " + state.level + " alcançado. Seus atributos foram restaurados.");
        showLevelUp();
        playTone("level");
      }
    }
    return levelsGained;
  }

  function showLevelUp() {
    const heading = $(".zone-heading");
    const original = heading.innerHTML;
    heading.innerHTML = "<div class='zone-channel'><span>EVOLUÇÃO</span></div><strong>NÍVEL " + state.level + "</strong><small>Novo ponto ou especialização disponível</small>";
    heading.style.animation = "none";
    void heading.offsetWidth;
    heading.style.animation = "zoneEnter .5s ease both";
    setTimeout(() => {
      heading.innerHTML = original;
      renderHud();
    }, 2200);
  }

  function playerAttack(multiplier = 1, label = "", force = false) {
    if (!encounterActive || (!state.running && !force) || combatLocked || !enemy || !state.created) return false;
    combatLocked = true;
    const stats = playerStats();
    const crit = Math.random() * 100 < stats.crit;
    let etherMultiplier = 1;
    if (state.autoEther && state.etherCharges > 0) {
      state.etherCharges -= 1;
      etherMultiplier = 1.5;
      $("#heroAura").classList.add("active");
      setTimeout(() => $("#heroAura").classList.remove("active"), 420);
    }
    const rawDamage = stats.attack * (.86 + Math.random() * .29) * (crit ? 1.76 : 1) * multiplier * etherMultiplier;
    const damage = Math.max(1, Math.round(rawDamage - enemy.defense * .34));
    animatePlayerAttack(damage, crit);
    enemy.hp = Math.max(0, enemy.hp - damage);
    state.mp = Math.min(stats.maxMp, state.mp + Math.max(1, Math.round(stats.maxMp * .015)));
    if (label) showActivity(label + " atingiu " + enemy.name + " por " + damage + ".");
    renderHud();
    if (enemy.hp <= 0) {
      setTimeout(handleEnemyDefeat, Math.round(240 / state.speed));
      return true;
    }
    setTimeout(() => {
      if (enemy && enemy.hp > 0) enemyAttack();
    }, Math.round(410 / state.speed));
    setTimeout(() => { combatLocked = false; }, Math.round(720 / state.speed));
    return true;
  }

  function combatTick() {
    if (encounterActive) playerAttack(1, "", false);
  }

  function enemyAttack() {
    if (!encounterActive || !enemy) {
      combatLocked = false;
      return;
    }
    const stats = playerStats();
    if (Math.random() * 100 < stats.evasion) {
      showDamage("ESQUIVA", false, true);
      combatLocked = false;
      return;
    }
    const damage = Math.max(1, Math.round(enemy.attack * (.85 + Math.random() * .28) - stats.defense * .33));
    state.hp = Math.max(0, state.hp - damage);
    const entity = $("#enemyEntity");
    const fieldEntity = activeFieldEnemyId ? $("[data-field-enemy='" + activeFieldEnemyId + "']") : null;
    entity.classList.remove("attack");
    void entity.offsetWidth;
    entity.classList.add("attack");
    if (fieldEntity) {
      fieldEntity.classList.remove("attacking");
      void fieldEntity.offsetWidth;
      fieldEntity.classList.add("attacking");
    }
    setTimeout(() => $("#heroEntity").classList.add("hit"), 100);
    setTimeout(() => $("#heroEntity").classList.remove("hit"), 320);
    setTimeout(() => $("#fieldPlayer").classList.add("hit"), 100);
    setTimeout(() => $("#fieldPlayer").classList.remove("hit"), 320);
    showDamage(damage, false, true);
    if (state.autoPotion && state.potions > 0 && state.hp / stats.maxHp <= .35) usePotion(true);
    renderHud();
    if (state.hp <= 0) handlePlayerDefeat();
  }

  function animatePlayerAttack(damage, crit) {
    const hero = $("#heroEntity");
    const target = $("#enemyEntity");
    const fieldHero = $("#fieldPlayer");
    const fieldTarget = activeFieldEnemyId ? $("[data-field-enemy='" + activeFieldEnemyId + "']") : null;
    const flash = $("#combatFlash");
    hero.classList.remove("attack");
    void hero.offsetWidth;
    hero.classList.add("attack");
    fieldHero.classList.remove("attacking");
    void fieldHero.offsetWidth;
    fieldHero.classList.add("attacking");
    setTimeout(() => {
      target.classList.add("hit");
      fieldTarget?.classList.add("hit");
      flash.classList.remove("show");
      void flash.offsetWidth;
      flash.classList.add("show");
      showDamage(damage, crit, false);
      playTone(crit ? "crit" : "hit");
    }, Math.round(170 / state.speed));
    setTimeout(() => {
      target.classList.remove("hit");
      fieldTarget?.classList.remove("hit");
      fieldHero.classList.remove("attacking");
    }, Math.round(390 / state.speed));
  }

  function showDamage(value, crit, fromEnemy) {
    const node = document.createElement("span");
    node.className = "damage-number" + (crit ? " crit" : "") + (fromEnemy ? " enemy-damage" : "");
    node.textContent = typeof value === "string" ? value : (crit ? "CRIT -" : "-") + value;
    $("#damageLayer").appendChild(node);
    setTimeout(() => node.remove(), 850);
    if (encounterActive) {
      const fieldNode = document.createElement("span");
      const target = fieldEnemies.find((entry) => entry.id === activeFieldEnemyId);
      fieldNode.className = "field-damage" + (crit ? " crit" : "") + (fromEnemy ? " enemy-damage" : "");
      fieldNode.textContent = typeof value === "string" ? value : (crit ? "CRIT -" : "-") + value;
      fieldNode.style.left = (fromEnemy ? state.fieldPosition.x : target?.x || 50) + "%";
      fieldNode.style.top = (fromEnemy ? state.fieldPosition.y - 7 : (target?.y || 50) - 8) + "%";
      $("#explorationLayer").appendChild(fieldNode);
      setTimeout(() => fieldNode.remove(), 850);
    }
  }

  function handleEnemyDefeat() {
    $("#enemyEntity").classList.add("defeated");
    if (activeFieldEnemyId) $("[data-field-enemy='" + activeFieldEnemyId + "']")?.classList.add("defeated");
    const defeatedEnemy = enemy;
    const fieldTarget = fieldEnemies.find((target) => target.id === activeFieldEnemyId);
    state.kills += 1;
    state.karma = Math.max(0, state.karma - 2);
    state.gold += defeatedEnemy.gold;
    addExperience(defeatedEnemy.exp);
    state.huntContractKills = Number(state.huntContractKills || 0) + 1;
    let contractReward = "";
    if (state.huntContractKills >= 3) {
      const zone = ZONES[state.zoneIndex];
      const bonusGold = zone.gold * 8;
      const bonusExperience = zone.exp * 5;
      state.huntContractKills = 0;
      state.huntContractsCompleted = Number(state.huntContractsCompleted || 0) + 1;
      state.gold += bonusGold;
      addExperience(bonusExperience);
      contractReward = " · CONTRATO CONCLUÍDO +" + bonusGold + " ouro";
      playTone("legendary");
    }
    const stats = playerStats();
    state.hp = Math.min(stats.maxHp, state.hp + Math.round(stats.maxHp * .08));
    state.mp = Math.min(stats.maxMp, state.mp + Math.round(stats.maxMp * .07));
    showActivity(defeatedEnemy.name + " derrotado · +" + defeatedEnemy.exp + " EXP · +" + defeatedEnemy.gold + " ouro" + contractReward);
    const lootChance = defeatedEnemy.rank === "boss" ? 1 : defeatedEnemy.rank === "elite" ? .8 : .45;
    if (Math.random() < lootChance) {
      const item = generateItem({ bossDrop: defeatedEnemy.rank === "boss" });
      state.inventory.unshift(item);
      if (state.inventory.length > 60) state.inventory.pop();
      showLoot(item);
    }
    if (Math.random() < (defeatedEnemy.rank === "boss" ? .55 : .08)) state.scrolls += 1;
    state.etherCharges += defeatedEnemy.rank === "boss" ? randomBetween(8, 16) : randomBetween(0, 3);
    if (fieldTarget) fieldTarget.respawnUntil = Date.now() + 12000;
    saveState();
    renderHud();
    setTimeout(() => {
      enterExploration(state.fieldAutoHunt ? "Alvo abatido. Retomando a patrulha automática..." : "Volte ao campo para escolher seu próximo alvo.");
    }, Math.round(720 / state.speed));
  }

  function handlePlayerDefeat() {
    state.running = false;
    state.fieldAutoHunt = false;
    clearTimeout(autoHuntTimer);
    $("#heroEntity").classList.add("defeated");
    showActivity(escapeHtml(state.name) + " foi derrotado e retornará ao posto da fronteira.");
    setTimeout(() => {
      const stats = playerStats();
      state.hp = Math.round(stats.maxHp * .72);
      state.mp = Math.round(stats.maxMp * .72);
      $("#heroEntity").classList.remove("defeated");
      enterExploration("Recuperado no posto. Escolha outro alvo quando estiver pronto.");
      saveState();
    }, 1800);
  }

  function showLoot(item) {
    const rarity = RARITIES[item.rarity];
    const toast = $("#lootToast");
    $("#lootToastIcon").textContent = SLOT_META[item.slot].icon;
    $("#lootToastName").textContent = item.name + (item.enchant ? " +" + item.enchant : "");
    $("#lootToastGrade").textContent = GRADES[item.grade].label + " · " + rarity.label;
    toast.style.setProperty("--loot-color", rarity.color);
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
    playTone(item.rarity === "legendary" ? "legendary" : "loot");
  }

  function showActivity(text) {
    $("#activityText").textContent = String(text).replace(/&[^;]+;/g, "");
  }

  function buffRemaining(until) {
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  }

  function renderBuffs() {
    const buffs = [];
    if (state.activeBuffs.furyUntil > Date.now()) buffs.push({ icon: "⚔", name: "Fúria Rúnica", seconds: buffRemaining(state.activeBuffs.furyUntil) });
    if (state.activeBuffs.wardUntil > Date.now()) buffs.push({ icon: "◇", name: "Barreira do Véu", seconds: buffRemaining(state.activeBuffs.wardUntil) });
    $("#buffStrip").innerHTML = buffs.length ? buffs.map((buff) => "<span class='buff-icon' title='" + buff.name + "'>" + buff.icon + "<small>" + buff.seconds + "</small></span>").join("") : "<span class='buff-empty'>Nenhum efeito ativo</span>";
  }

  function renderHud() {
    const stats = playerStats();
    state.hp = clamp(state.hp, 0, stats.maxHp);
    state.mp = clamp(state.mp, 0, stats.maxMp);
    const zone = ZONES[state.zoneIndex];
    const xpPercent = clamp(state.xp / xpNeeded() * 100, 0, 100);
    const hpPercent = clamp(state.hp / stats.maxHp * 100, 0, 100);
    const mpPercent = clamp(state.mp / stats.maxMp * 100, 0, 100);
    const safeName = escapeHtml(state.name);
    $("#goldValue").textContent = formatNumber(state.gold);
    $("#gemValue").textContent = formatNumber(state.gems);
    $("#honorValue").textContent = formatNumber(state.honor);
    $("#levelValue").textContent = state.level;
    $("#heroLevelFloat").textContent = "Nv. " + state.level;
    $("#playerName").textContent = state.name;
    $("#heroNameFloat").textContent = state.name;
    $("#raceLabel").textContent = RACES[state.race].label;
    $("#classLabel").textContent = currentClassName().toUpperCase();
    $("#powerValue").textContent = "Poder " + formatNumber(stats.power);
    $("#attackValue").textContent = Math.round(stats.attack);
    $("#defenseValue").textContent = Math.round(stats.defense);
    $("#critValue").textContent = stats.crit.toFixed(1) + "%";
    $("#playerHpBar").style.width = hpPercent + "%";
    $("#playerHpText").textContent = Math.round(state.hp) + " / " + stats.maxHp;
    $("#playerMpBar").style.width = mpPercent + "%";
    $("#playerMpText").textContent = Math.round(state.mp) + " / " + stats.maxMp;
    $("#playerXpBar").style.width = xpPercent + "%";
    $("#playerXpText").textContent = Math.floor(xpPercent) + "%";
    $("#killValue").textContent = formatNumber(state.kills);
    $("#karmaValue").textContent = formatNumber(state.karma);
    $("#karmaValue").classList.toggle("danger", state.karma > 0);
    $("#potionCount").textContent = state.potions;
    $("#etherCount").textContent = state.etherCharges;
    $("#etherStatus").textContent = state.autoEther ? "AUTOMÁTICA" : "DESATIVADA";
    $("#etherToggle").classList.toggle("active", state.autoEther);
    $("#inventoryBadge").textContent = state.inventory.length;
    $("#inventoryBadge").dataset.empty = state.inventory.length === 0;
    $("#soundToggle").classList.toggle("muted", !state.sound);
    $("#autoPotionToggle").checked = state.autoPotion;
    $("#targetModeLabel").textContent = { any: "QUALQUER ALVO", elite: "ELITES", boss: "CHEFES" }[state.targetMode];
    $("#gradeBadge").textContent = "GRAU " + gradeForLevel();
    $("#zoneTitle").textContent = zone.title;
    $("#zoneSubtitle").textContent = zone.subtitle;
    $("#zoneButtonText").textContent = zone.title;
    $("#world").style.setProperty("--zone-bg", "url('" + zone.background + "')");
    $("#world").style.setProperty("--zone-map-bg", "url('assets/frontier-hunting-ground.png')");
    $("#pvpZoneFlag").textContent = zone.pvp ? "ZONA PVP" : "ZONA SEGURA";
    $("#pvpZoneFlag").classList.toggle("danger", zone.pvp);
    const promotionReady = (state.level >= 20 && state.classTier === 0) || (state.level >= 40 && state.classTier === 1);
    $("#classBadge").dataset.empty = !promotionReady;
    $("#conflictBadge").textContent = Date.now() >= state.bossCooldownUntil ? "!" : "";
    $("#conflictBadge").dataset.empty = Date.now() < state.bossCooldownUntil;
    if (enemy) {
      const enemyPercent = clamp(enemy.hp / enemy.maxHp * 100, 0, 100);
      const rankLabel = enemy.rank === "boss" ? "CHEFE" : enemy.rank === "elite" ? "ELITE" : "COMUM";
      $("#enemyName").textContent = enemy.name;
      $("#enemyNameFloat").textContent = enemy.name;
      $("#enemyLevel").textContent = "Nv. " + enemy.level;
      $("#enemyLevelFloat").textContent = "Nv. " + enemy.level;
      $("#enemyRarity").textContent = rankLabel;
      $("#enemyRarity").style.color = enemy.rank === "boss" ? RARITIES.legendary.color : enemy.rank === "elite" ? RARITIES.epic.color : "#aab0b5";
      $("#enemyHpBar").style.width = enemyPercent + "%";
      $("#enemyHpText").textContent = Math.ceil(enemy.hp) + " / " + enemy.maxHp;
      $("#enemyReward").textContent = enemy.exp + " EXP · " + enemy.gold + " ouro";
      const fieldHp = activeFieldEnemyId ? $("[data-field-enemy='" + activeFieldEnemyId + "'] .field-enemy-hp i") : null;
      if (fieldHp) fieldHp.style.width = enemyPercent + "%";
    }
    const auto = $("#autoToggle");
    auto.classList.toggle("active", state.running);
    auto.querySelector("small").textContent = state.running ? "ATIVADO" : "PAUSADO";
    $("#combatModeText").textContent = state.running ? "COMBATE AUTOMÁTICO" : "COMBATE MANUAL";
    $$(".speed").forEach((button) => button.classList.toggle("active", Number(button.dataset.speed) === state.speed));
    renderBuffs();
    renderEquipmentStrip();
    renderSkillBar();
  }

  function renderEquipmentStrip() {
    $("#equipmentStrip").innerHTML = Object.entries(SLOT_META).map(([slot, meta]) => {
      const item = state.equipment[slot];
      const style = item ? itemStyle(item) : "--rarity:#657078";
      return "<button class='gear-slot " + (item ? "filled" : "") + "' data-open-slot='" + slot + "' style='" + style + "' title='" + escapeHtml(item ? item.name : meta.label) + "'><span class='gear-icon'>" + meta.icon + "</span>" + (item && item.enchant ? "<small>+" + item.enchant + "</small>" : "") + "</button>";
    }).join("");
  }

  function skillDefinitions() {
    const archetype = ARCHETYPES[state.archetype];
    return [
      { id: "attack", key: "1", icon: archetype.icon, name: "Ataque", count: "" },
      { id: "class", key: "2", icon: "✦", name: archetype.skill, count: "18 MP" },
      { id: "potion", key: "3", icon: "✚", name: "Poção rubra", count: state.potions },
      { id: "ether", key: "4", icon: "✧", name: "Carga de Éter", count: state.etherCharges },
      { id: "buff", key: "5", icon: "◇", name: "Fúria Rúnica", count: "25 MP" },
      { id: "boss", key: "6", icon: "♛", name: "Chefe mundial", count: "" }
    ];
  }

  function renderSkillBar() {
    if (!$("#skillBar")) return;
    $("#skillBar").innerHTML = skillDefinitions().map((skill) => {
      const cooldownKey = skill.id === "class" ? "classSkill" : skill.id === "buff" ? "buff" : null;
      const seconds = cooldownKey ? Math.max(0, Math.ceil((cooldowns[cooldownKey] - Date.now()) / 1000)) : 0;
      const active = skill.id === "ether" && state.autoEther;
      return "<button class='skill-slot " + (active ? "active " : "") + (seconds ? "cooldown" : "") + "' data-skill='" + skill.id + "' data-cooldown='" + (seconds || "") + "' title='" + skill.name + "'><small>" + skill.key + "</small><span class='skill-icon'>" + skill.icon + "</span><b>" + skill.count + "</b></button>";
    }).join("");
  }

  function useSkill(id) {
    const stats = playerStats();
    if (id === "attack") playerAttack(1, "", true);
    if (id === "class") {
      if (cooldowns.classSkill > Date.now() || state.mp < 18) return;
      if (playerAttack(2.15 + state.classTier * .18, ARCHETYPES[state.archetype].skill, true)) {
        state.mp -= 18;
        state.skillUses += 1;
        cooldowns.classSkill = Date.now() + 8000;
        playTone("crit");
      }
    }
    if (id === "potion") usePotion(false);
    if (id === "ether") {
      state.autoEther = !state.autoEther;
      showActivity("Cargas de Éter " + (state.autoEther ? "ativadas para cada ataque." : "desativadas."));
    }
    if (id === "buff") {
      if (cooldowns.buff > Date.now() || state.mp < 25) return;
      state.mp -= 25;
      state.activeBuffs.furyUntil = Date.now() + 60000;
      state.activeBuffs.wardUntil = Date.now() + 60000;
      cooldowns.buff = Date.now() + 30000;
      state.skillUses += 1;
      showActivity("Fúria Rúnica e Barreira do Véu ativas por 60 segundos.");
      playTone("level");
    }
    if (id === "boss") {
      openDrawer("conflict");
      renderConflict("boss");
    }
    saveState();
    renderHud();
  }

  function drawerTitle(view) {
    return {
      character: ["FICHA E PROGRESSÃO", "Personagem"],
      inventory: ["EQUIPAMENTO", "Inventário e paper doll"],
      forge: ["APRIMORAMENTO", "Forja Rúnica"],
      market: ["ECONOMIA DE L2IDLE", "Mercado"],
      conflict: ["RAIDS E PVP", "Bosses"],
      missions: ["JORNADA", "Missões"],
      zones: ["MAPA DE L2IDLE", "Regiões de caça"]
    }[view];
  }

  function openDrawer(view) {
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    if (view === "hunt") {
      closeDrawer();
      return;
    }
    const title = drawerTitle(view);
    $("#drawerEyebrow").textContent = title[0];
    $("#drawerTitle").textContent = title[1];
    $("#drawer").dataset.view = view;
    $("#drawer").classList.add("open");
    $("#drawer").setAttribute("aria-hidden", "false");
    if (view === "character") renderCharacter();
    if (view === "inventory") renderInventory();
    if (view === "forge") renderForge();
    if (view === "market") renderMarket();
    if (view === "conflict") renderConflict();
    if (view === "missions") renderMissions();
    if (view === "zones") renderZones();
  }

  function closeDrawer() {
    $("#drawer").classList.remove("open");
    $("#drawer").setAttribute("aria-hidden", "true");
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === "hunt"));
  }

  function promotionReady() {
    return (state.level >= 20 && state.classTier === 0) || (state.level >= 40 && state.classTier === 1);
  }

  function renderCharacter() {
    const stats = playerStats();
    const attrs = stats.attributes;
    const archetype = ARCHETYPES[state.archetype];
    const race = RACES[state.race];
    const nextLevel = state.classTier === 0 ? 20 : state.classTier === 1 ? 40 : null;
    const promotion = promotionReady()
      ? "<div class='promotion-card'><div class='promotion-icon'>" + classIcon() + "</div><div><h3>Especialização disponível</h3><p>Seu treinamento permite escolher um novo caminho de classe.</p></div><button class='gold-button' data-open-promotion>ESCOLHER CLASSE</button></div>"
      : "<div class='promotion-card'><div class='promotion-icon'>" + (state.classTier === 2 ? "✦" : "⌛") + "</div><div><h3>" + (state.classTier === 2 ? "Classe máxima alcançada" : "Próxima promoção no nível " + nextLevel) + "</h3><p>" + (state.classTier === 2 ? "Sua especialização final está ativa." : "Continue caçando para abrir novas especializações.") + "</p></div></div>";
    const treeNodes = [
      { tier: 0, name: archetype.label, active: state.classTier === 0 },
      { tier: 1, name: state.classPath ? currentTierOneName() : "Especialização Nv. 20", active: state.classTier === 1, locked: !state.classPath },
      { tier: 2, name: state.finalClass ? currentClassName() : "Especialização Nv. 40", active: state.classTier === 2, locked: !state.finalClass }
    ].map((node) => "<div class='class-node " + (node.active ? "active " : "") + (node.locked ? "locked" : "") + "'><small>CLASSE " + node.tier + "</small><strong>" + escapeHtml(node.name) + "</strong></div>").join("");
    const attributeNames = { str: "FOR", dex: "DES", con: "CON", int: "INT", wit: "ESP" };
    const attributeHtml = Object.keys(attributeNames).map((key) => "<div class='attribute-card'><small>" + attributeNames[key] + "</small><strong>" + attrs[key] + "</strong><button data-attribute='" + key + "' " + (state.attributePoints <= 0 ? "disabled" : "") + ">+</button></div>").join("");
    $("#drawerContent").innerHTML =
      "<div class='character-banner'><div class='portrait-frame'><img src='assets/duskblade.png' alt='Retrato'></div><div><small style='color:var(--gold)'>" + escapeHtml(race.label.toUpperCase()) + " · " + escapeHtml(currentClassName().toUpperCase()) + "</small><h3>" + escapeHtml(state.name) + "</h3><p>Poder " + formatNumber(stats.power) + " · Evasão " + stats.evasion.toFixed(1) + "% · Grau " + gradeForLevel() + "</p></div><div class='level-orb'>" + state.level + "</div></div>" +
      "<div class='section-kicker'>ATRIBUTOS · " + state.attributePoints + " PONTOS DISPONÍVEIS</div><div class='attribute-grid'>" + attributeHtml + "</div>" +
      "<div class='section-kicker'>CAMINHO DE CLASSE</div>" + promotion + "<div class='class-tree' style='margin-top:8px'>" + treeNodes + "</div>" +
      "<div class='section-kicker'>HABILIDADES ATIVAS</div><div class='skill-list'>" +
      "<div class='skill-info'><span>" + archetype.icon + "</span><div><strong>Ataque de " + archetype.label + "</strong><small>Ataque básico adaptado ao seu arquétipo.</small></div></div>" +
      "<div class='skill-info'><span>✦</span><div><strong>" + archetype.skill + "</strong><small>Golpe especial por 18 MP e recarga de 8s.</small></div></div>" +
      "<div class='skill-info'><span>◇</span><div><strong>Fúria Rúnica</strong><small>+20% ataque e +22% defesa por 60s.</small></div></div>" +
      "<div class='skill-info'><span>✧</span><div><strong>Carga de Éter</strong><small>Consumível original que amplifica cada ataque em 50%.</small></div></div></div>" +
      "<div class='section-kicker'>JORNADA</div><button class='dark-button' data-view='missions'>VER MISSÕES E RECOMPENSAS</button>" +
      "<div class='button-row'><button class='dark-button' data-recreate>REFAZER PERSONAGEM</button><button class='dark-button' data-presentation>ATIVAR MODO APRESENTAÇÃO</button></div>";
  }

  function currentTierOneName() {
    const path = ARCHETYPES[state.archetype].paths.find((entry) => entry.id === state.classPath);
    return path ? path.name : ARCHETYPES[state.archetype].label;
  }

  function openPromotion() {
    if (!promotionReady()) return;
    const archetype = ARCHETYPES[state.archetype];
    const choices = state.classTier === 0 ? archetype.paths : (archetype.finals[state.classPath] || []);
    const tierLabel = state.classTier === 0 ? "PRIMEIRA ESPECIALIZAÇÃO" : "ESPECIALIZAÇÃO FINAL";
    const html = choices.map((choice) => "<button class='choice-card' data-promote='" + choice.id + "'><span>" + choice.icon + "</span><div><strong>" + choice.name + "</strong><small>" + choice.copy + "</small></div><b>›</b></button>").join("");
    showModal("<div class='modal-crest'><span>" + classIcon() + "</span></div><h2>" + tierLabel + "</h2><p>Esta escolha define o próximo ramo de habilidades do seu personagem.</p><div class='choice-list'>" + html + "</div>");
  }

  function promoteClass(id) {
    const archetype = ARCHETYPES[state.archetype];
    if (state.classTier === 0 && state.level >= 20 && archetype.paths.some((entry) => entry.id === id)) {
      state.classPath = id;
      state.classTier = 1;
    } else if (state.classTier === 1 && state.level >= 40 && (archetype.finals[state.classPath] || []).some((entry) => entry.id === id)) {
      state.finalClass = id;
      state.classTier = 2;
    } else return;
    state.attributePoints += 2;
    const stats = playerStats();
    state.hp = stats.maxHp;
    state.mp = stats.maxMp;
    closeModal();
    showActivity("Promoção concluída: " + currentClassName() + ".");
    playTone("legendary");
    saveState();
    renderHud();
    renderCharacter();
  }

  function allocateAttribute(key) {
    if (state.attributePoints <= 0 || !Object.prototype.hasOwnProperty.call(state.attributes, key)) return;
    state.attributes[key] += 1;
    state.attributePoints -= 1;
    saveState();
    renderHud();
    renderCharacter();
  }

  function renderPaperDoll() {
    return "<div class='paper-doll'><div class='paper-figure'></div>" + Object.entries(SLOT_META).map(([slot, meta]) => {
      const item = state.equipment[slot];
      return "<button class='paper-slot " + (item ? "filled" : "") + "' data-paper-slot='" + slot + "' style='" + (item ? itemStyle(item) : "--rarity:#657078") + "'><span>" + meta.icon + "</span><small>" + (item ? escapeHtml(item.name) : meta.label) + "</small>" + (item && item.enchant ? "<b>+" + item.enchant + "</b>" : "") + "</button>";
    }).join("") + "</div>";
  }

  function renderInventory(selectedId = selectedInventoryId) {
    selectedInventoryId = selectedId;
    const selected = state.inventory.find((item) => item.id === selectedId);
    const filtered = inventoryFilter === "all" ? state.inventory : state.inventory.filter((item) => item.slot === inventoryFilter);
    const filters = "<button class='filter-button " + (inventoryFilter === "all" ? "active" : "") + "' data-filter='all'>TODOS</button>" + Object.entries(SLOT_META).map(([slot, meta]) => "<button class='filter-button " + (inventoryFilter === slot ? "active" : "") + "' data-filter='" + slot + "'>" + meta.icon + " " + meta.label.toUpperCase() + "</button>").join("");
    const cards = filtered.length ? "<div class='inventory-grid'>" + filtered.map((item) => {
      const rarity = RARITIES[item.rarity];
      return "<button class='item-card " + (item.id === selectedId ? "selected" : "") + "' data-item-id='" + item.id + "' style='" + itemStyle(item) + "'><span class='grade-chip' style='--grade-color:" + GRADES[item.grade].color + "'>" + item.grade + "</span><span class='item-icon'>" + SLOT_META[item.slot].icon + "</span><strong>" + escapeHtml(item.name) + (item.enchant ? " +" + item.enchant : "") + "</strong><small>" + rarity.label + "</small></button>";
    }).join("") + "</div>" : "<div class='empty-state'><span>◇</span><strong>Nenhum item aqui</strong><p>Continue caçando ou visite o mercado.</p></div>";
    const detail = selected ? renderItemDetail(selected) : "";
    $("#drawerContent").innerHTML = "<p class='section-copy'>Equipe oito slots no paper doll. Graus superiores exigem níveis 20, 40, 60 e 80.</p><div class='inventory-layout'>" + renderPaperDoll() + "<div class='inventory-side'>" + detail + "<div class='inventory-toolbar'>" + filters + "</div>" + cards + "</div></div>";
  }

  function renderItemDetail(item) {
    const rarity = RARITIES[item.rarity];
    const grade = GRADES[item.grade];
    const stats = itemStats(item);
    const equipped = state.equipment[item.slot];
    const compare = equipped ? itemStats(equipped) : { attack: 0, defense: 0, crit: 0 };
    const locked = state.level < grade.minLevel;
    return "<div class='item-detail' style='" + itemStyle(item) + ";margin-bottom:10px'><div class='item-detail-icon'>" + SLOT_META[item.slot].icon + "</div><div><small style='color:" + rarity.color + "'>" + rarity.label.toUpperCase() + " · " + grade.label.toUpperCase() + "</small><h3>" + escapeHtml(item.name) + (item.enchant ? " +" + item.enchant : "") + "</h3><p>" + (locked ? "Requer nível " + grade.minLevel + "." : equipped ? "Comparando com " + escapeHtml(equipped.name) + "." : "Slot livre para equipar.") + "</p></div><div style='grid-column:1/-1'><div class='item-stat-list'>" +
      (stats.attack ? "<div><span>Ataque</span><strong>" + stats.attack + " <em style='color:" + (stats.attack >= compare.attack ? "#67bd88" : "#c86b65") + "'>" + signed(stats.attack - compare.attack) + "</em></strong></div>" : "") +
      (stats.defense ? "<div><span>Defesa</span><strong>" + stats.defense + " <em style='color:" + (stats.defense >= compare.defense ? "#67bd88" : "#c86b65") + "'>" + signed(stats.defense - compare.defense) + "</em></strong></div>" : "") +
      (stats.crit ? "<div><span>Crítico</span><strong>" + stats.crit.toFixed(1) + "% <em style='color:" + (stats.crit >= compare.crit ? "#67bd88" : "#c86b65") + "'>" + signed(stats.crit - compare.crit, "%") + "</em></strong></div>" : "") +
      "</div><div class='button-row'><button class='gold-button' data-equip-item='" + item.id + "' " + (locked ? "disabled" : "") + ">EQUIPAR</button><button class='danger-button' data-sell-item='" + item.id + "'>VENDER · " + itemSellValue(item) + " ●</button></div></div></div>";
  }

  function signed(value, suffix = "") {
    const rounded = Math.round(value * 10) / 10;
    return (rounded > 0 ? "+" : "") + rounded + suffix;
  }

  function equipItem(id) {
    const index = state.inventory.findIndex((item) => item.id === id);
    if (index < 0) return;
    const item = state.inventory[index];
    if (state.level < GRADES[item.grade].minLevel) return;
    state.inventory.splice(index, 1);
    const old = state.equipment[item.slot];
    state.equipment[item.slot] = item;
    if (old) state.inventory.unshift(old);
    selectedInventoryId = null;
    const stats = playerStats();
    state.hp = Math.min(state.hp, stats.maxHp);
    state.mp = Math.min(state.mp, stats.maxMp);
    showActivity(item.name + " foi equipado.");
    playTone("equip");
    saveState();
    renderHud();
    renderInventory();
  }

  function itemSellValue(item) {
    return Math.round(24 * RARITIES[item.rarity].multiplier * GRADES[item.grade].multiplier * (1 + item.enchant * .48));
  }

  function sellItem(id) {
    const index = state.inventory.findIndex((item) => item.id === id);
    if (index < 0) return;
    const item = state.inventory[index];
    const value = itemSellValue(item);
    state.gold += value;
    state.inventory.splice(index, 1);
    selectedInventoryId = null;
    showActivity(item.name + " vendido por " + value + " ouro.");
    saveState();
    renderHud();
    renderInventory();
  }

  function enchantChance(level) {
    return [100, 95, 86, 76, 63, 50, 38, 27, 18, 11, 7, 4][Math.min(level, 11)];
  }

  function enchantCost(item) {
    return Math.round(90 * (item.enchant + 1) * RARITIES[item.rarity].multiplier * GRADES[item.grade].multiplier * (1 + item.enchant * .33));
  }

  function renderForge() {
    const slots = Object.keys(SLOT_META);
    if (!state.equipment[forgeSlot]) forgeSlot = slots.find((slot) => state.equipment[slot]) || "weapon";
    const item = state.equipment[forgeSlot];
    const rarity = item ? RARITIES[item.rarity] : RARITIES.common;
    const chance = item ? enchantChance(item.enchant) : 0;
    const cost = item ? enchantCost(item) : 0;
    const maxed = item && item.enchant >= 12;
    const risky = item && item.enchant >= 4 && !state.useBlessedScroll;
    const scrollCount = state.useBlessedScroll ? state.blessedScrolls : state.scrolls;
    $("#drawerContent").innerHTML =
      "<p class='section-copy'>Cada tentativa consome ouro e um pergaminho. Após +4, uma falha comum quebra o equipamento; o pergaminho selado evita a quebra e reduz um nível.</p><div class='forge-layout'><div class='forge-altar' style='" + (item ? itemStyle(item) : "--rarity:#687079") + "'>" +
      (item ? "<div class='forge-item'>" + SLOT_META[item.slot].icon + "</div><small>" + rarity.label.toUpperCase() + " · " + GRADES[item.grade].label.toUpperCase() + "</small><h3>" + escapeHtml(item.name) + " +" + item.enchant + "</h3><div class='forge-chance'><div><span>Chance de sucesso</span><strong>" + (maxed ? "MÁXIMO" : chance + "%") + "</strong></div><div class='chance-track'><i style='width:" + (maxed ? 100 : chance) + "%'></i></div></div><div class='forge-cost'><span>" + (risky ? "RISCO: QUEBRA DO ITEM" : state.useBlessedScroll ? "Proteção contra quebra ativa" : "Zona segura até +4") + "</span><strong>" + formatNumber(cost) + " ouro</strong></div><button class='" + (risky ? "danger-button" : "gold-button") + "' style='width:100%' data-enchant " + (state.gold < cost || maxed || scrollCount <= 0 ? "disabled" : "") + ">" + (maxed ? "ENCHANT MÁXIMO" : "TENTAR +" + (item.enchant + 1)) + "</button>" : "<div class='empty-state'><strong>Nenhum equipamento</strong></div>") +
      "</div><div><div class='scroll-choice'><button class='scroll-card " + (!state.useBlessedScroll ? "active" : "") + "' data-scroll-type='normal'><span>▤</span><div><strong>Comum</strong><small>Falha após +4 quebra o item.</small></div><b>" + state.scrolls + "</b></button><button class='scroll-card " + (state.useBlessedScroll ? "active" : "") + "' data-scroll-type='blessed'><span>✦</span><div><strong>Selado</strong><small>Evita quebra; pode reduzir 1 nível.</small></div><b>" + state.blessedScrolls + "</b></button></div><div class='forge-slots'>" + slots.map((slot) => {
        const equipped = state.equipment[slot];
        return "<button class='forge-slot " + (forgeSlot === slot ? "active" : "") + "' data-forge-slot='" + slot + "' style='--rarity:" + (equipped ? RARITIES[equipped.rarity].color : "#687079") + "' " + (!equipped ? "disabled" : "") + "><span>" + SLOT_META[slot].icon + "</span><strong>" + (equipped ? SLOT_META[slot].label + " +" + equipped.enchant : "Vazio") + "</strong></button>";
      }).join("") + "</div><button class='dark-button' style='width:100%;margin-top:8px' data-view='market'>COMPRAR PERGAMINHOS</button></div></div>";
  }

  function attemptEnchant() {
    const item = state.equipment[forgeSlot];
    if (!item || item.enchant >= 12) return;
    const cost = enchantCost(item);
    const usingBlessed = state.useBlessedScroll;
    if (state.gold < cost || (usingBlessed ? state.blessedScrolls : state.scrolls) <= 0) return;
    state.gold -= cost;
    if (usingBlessed) state.blessedScrolls -= 1;
    else state.scrolls -= 1;
    state.enchantAttempts += 1;
    const success = Math.random() * 100 < enchantChance(item.enchant);
    if (success) {
      item.enchant += 1;
      showActivity(item.name + " alcançou +" + item.enchant + ".");
      playTone(item.enchant >= 7 ? "legendary" : "level");
      flashForgeResult(true, "ENCHANT +" + item.enchant, item.enchant >= 10 ? "A arma irradia uma aura carmesim." : "As runas aceitaram o aprimoramento.");
    } else if (!usingBlessed && item.enchant >= 4) {
      const brokenName = item.name + " +" + item.enchant;
      state.equipment[forgeSlot] = null;
      showActivity(brokenName + " se partiu durante o enchant.");
      playTone("fail");
      flashForgeResult(false, "EQUIPAMENTO QUEBRADO", brokenName + " foi destruído. Pergaminhos selados evitam esse risco.");
    } else {
      if (usingBlessed && item.enchant > 0) item.enchant -= 1;
      showActivity("A tentativa de enchant falhou.");
      playTone("fail");
      flashForgeResult(false, "FALHA NA FORJA", usingBlessed ? "O selo protegeu o item, mas o enchant regrediu para +" + item.enchant + "." : "O equipamento permaneceu intacto.");
    }
    saveState();
    renderHud();
    renderForge();
  }

  function flashForgeResult(success, title, copy) {
    showModal("<div class='modal-crest'><span>" + (success ? "✦" : "×") + "</span></div><h2>" + title + "</h2><p>" + escapeHtml(copy) + "</p><button class='" + (success ? "gold-button" : "dark-button") + "' style='width:100%' data-close-modal>CONTINUAR</button>");
  }

  function marketTax() {
    return Math.min(.25, state.karma / 2000 * .25);
  }

  function productPrice(product) {
    return Math.round(product.price * (1 + marketTax()));
  }

  function renderMarket() {
    const tax = Math.round(marketTax() * 100);
    const productHtml = Object.entries(MARKET_PRODUCTS).map(([id, product]) => {
      const price = productPrice(product);
      const balance = product.currency === "gems" ? state.gems : state.gold;
      const currencyIcon = product.currency === "gems" ? "◆" : "●";
      return "<div class='market-card'><span>" + product.icon + "</span><div><h3>" + product.name + "</h3><p>" + product.copy + "</p></div><button class='gold-button' data-buy-product='" + id + "' " + (balance < price ? "disabled" : "") + ">" + formatNumber(price) + " " + currencyIcon + "</button></div>";
    }).join("");
    const listings = [
      { grade: gradeForLevel(), rarity: "rare", slot: "weapon", price: 1800 },
      { grade: nextGrade(gradeForLevel()), rarity: "epic", slot: "chest", price: 4200 }
    ].map((listing, index) => "<div class='market-card'><span>" + SLOT_META[listing.slot].icon + "</span><div><h3>" + (index ? "Couraça do Mercador" : "Arma de caravana") + "</h3><p>" + GRADES[listing.grade].label + " · " + RARITIES[listing.rarity].label + " · oferta simulada</p></div><button class='dark-button' data-buy-listing='" + index + "' data-grade='" + listing.grade + "' data-rarity='" + listing.rarity + "' data-slot='" + listing.slot + "' data-price='" + listing.price + "' " + (state.gold < listing.price ? "disabled" : "") + ">" + formatNumber(listing.price) + " ●</button></div>").join("");
    $("#drawerContent").innerHTML = "<p class='section-copy'>Compre suprimentos, pergaminhos e equipamentos de outros aventureiros. Karma elevado aumenta as taxas do mercado.</p><div class='market-summary'><div class='summary-box'><small>OURO</small><strong>" + formatNumber(state.gold) + "</strong></div><div class='summary-box'><small>TAXA DE KARMA</small><strong>" + tax + "%</strong></div><div class='summary-box'><small>COMPRAS</small><strong>" + state.marketPurchases + "</strong></div></div><div class='section-kicker'>SUPRIMENTOS</div><div class='market-grid'>" + productHtml + "</div><div class='section-kicker'>OFERTAS DE JOGADORES</div><div class='market-grid'>" + listings + "</div>";
  }

  function buyProduct(id) {
    const product = MARKET_PRODUCTS[id];
    if (!product) return;
    const price = productPrice(product);
    if (state[product.currency] < price) return;
    state[product.currency] -= price;
    if (id === "potions") state.potions += product.amount;
    if (id === "ether") state.etherCharges += product.amount;
    if (id === "scrolls") state.scrolls += product.amount;
    if (id === "blessed") state.blessedScrolls += product.amount;
    state.marketPurchases += 1;
    showActivity(product.name + " adquirido no mercado.");
    playTone("equip");
    saveState();
    renderHud();
    renderMarket();
  }

  function buyListing(button) {
    const price = Number(button.dataset.price);
    if (state.gold < price || state.inventory.length >= 60) return;
    state.gold -= price;
    const item = generateItem({ forcedGrade: button.dataset.grade, forcedRarity: button.dataset.rarity, forcedSlot: button.dataset.slot });
    state.inventory.unshift(item);
    state.marketPurchases += 1;
    showLoot(item);
    saveState();
    renderHud();
    renderMarket();
  }

  function renderConflict(tab = conflictTab) {
    conflictTab = tab;
    const tabs = [["boss", "CHEFE MUNDIAL"], ["conclave", "CONCLAVE"], ["clan", "CLÃ E TERRITÓRIO"]].map(([id, label]) => "<button class='conflict-tab " + (tab === id ? "active" : "") + "' data-conflict-tab='" + id + "'>" + label + "</button>").join("");
    let content = "";
    if (tab === "boss") content = renderBossPanel();
    if (tab === "conclave") content = renderConclave();
    if (tab === "clan") content = renderClanWar();
    $("#drawerContent").innerHTML = "<div class='conflict-tabs'>" + tabs + "</div>" + content;
  }

  function renderBossPanel() {
    const stats = playerStats();
    const remaining = Math.max(0, Math.ceil((state.bossCooldownUntil - Date.now()) / 1000));
    const recommended = Math.max(650, Math.round(stats.power * 1.08));
    return "<div class='boss-raid'><div class='boss-art'></div><div class='boss-title'><small>EVENTO DE MUNDO · EXPEDIÇÃO DE 12 HERÓIS</small><h3>Valakas</h3><p>O dragão Valakas despertou sob a Cratera das Cinzas.</p></div><div class='raid-stats'><div><small>PODER RECOMENDADO</small><strong>" + formatNumber(recommended) + "</strong></div><div><small>SEU PODER</small><strong>" + formatNumber(stats.power) + "</strong></div><div><small>VITÓRIAS</small><strong>" + state.worldBossWins + "</strong></div></div><div class='boss-actions'><button class='danger-button' style='width:100%' data-world-boss " + (remaining ? "disabled" : "") + ">" + (remaining ? "NOVA EXPEDIÇÃO EM " + remaining + "s" : "ENTRAR NA EXPEDIÇÃO") + "</button></div></div><div class='section-kicker'>DROP RARO</div><p class='section-copy'>A vitória garante um equipamento lendário e pode antecipar o próximo grau disponível.</p>";
  }

  function challengeWorldBoss() {
    if (Date.now() < state.bossCooldownUntil) return;
    const stats = playerStats();
    const groupPower = stats.power * (7.8 + Math.random() * 4.8);
    const bossPower = stats.power * (8.6 + Math.random() * 3.6);
    const win = groupPower >= bossPower;
    if (win) {
      state.worldBossWins += 1;
      state.gold += 3500 + state.level * 90;
      state.gems += 28;
      state.honor += 240;
      const item = generateItem({ bossDrop: true, forcedRarity: "legendary" });
      state.inventory.unshift(item);
      state.bossCooldownUntil = Date.now() + 180000;
      showLoot(item);
    } else {
      state.bossCooldownUntil = Date.now() + 30000;
    }
    saveState();
    renderHud();
    renderConflict("boss");
    playTone(win ? "legendary" : "fail");
    showModal("<div class='modal-crest'><span>" + (win ? "♛" : "⚔") + "</span></div><h2>Expedição concluída</h2><div class='result-banner " + (win ? "win" : "loss") + "'>" + (win ? "CHEFE DERROTADO" : "EXPEDIÇÃO RECUOU") + "</div><p>" + (win ? "Valakas tombou. Você recebeu um drop lendário, ouro, cristais e honra." : "A linha de frente não resistiu. Reforce seu equipamento e reúna uma nova expedição.") + "</p><button class='dark-button' style='width:100%' data-close-modal>VOLTAR</button>");
  }

  function renderConclave() {
    const power = playerStats().power;
    const opponents = [
      { name: "Mira da Névoa", className: "Batedora da Névoa", factor: .84, reward: 220 },
      { name: "Boros Punho de Ferro", className: "Guardião de Ferro", factor: 1.03, reward: 360 },
      { name: "Lyra Cinza", className: "Adepta Rúnica", factor: 1.26, reward: 540 }
    ].map((opponent, index) => ({ ...opponent, power: Math.max(180, Math.round(power * opponent.factor + index * 22)) }));
    return "<p class='section-copy'>O Conclave é uma competição original de duelos assíncronos. Poder, classe e uma variação tática definem o resultado.</p><div class='score-row'><div class='score-box'><small>PONTOS DO CONCLAVE</small><strong>" + formatNumber(state.arenaPoints) + "</strong></div><div class='score-box'><small>HONRA</small><strong>" + formatNumber(state.honor) + "</strong></div><div class='score-box'><small>V / D</small><strong>" + state.arenaWins + " / " + state.arenaLosses + "</strong></div></div><div class='opponent-list'>" + opponents.map((opponent, index) => "<div class='opponent-card'><div class='opponent-rank'>#" + Math.max(1, 48 - state.arenaWins * 2 + index * 7) + "</div><div><h3>" + opponent.name + "</h3><p>" + opponent.className + " · Poder " + formatNumber(opponent.power) + "</p></div><button class='" + (opponent.power <= power ? "gold-button" : "dark-button") + "' data-duel='" + index + "' data-power='" + opponent.power + "' data-reward='" + opponent.reward + "'>DESAFIAR</button></div>").join("") + "</div>";
  }

  function duelOpponent(button) {
    const opponentPower = Number(button.dataset.power);
    const reward = Number(button.dataset.reward);
    const myRoll = playerStats().power * (.82 + Math.random() * .38);
    const enemyRoll = opponentPower * (.84 + Math.random() * .32);
    const win = myRoll >= enemyRoll;
    if (win) {
      state.arenaWins += 1;
      state.arenaPoints += randomBetween(18, 31);
      state.honor += randomBetween(22, 40);
      state.gold += reward;
    } else {
      state.arenaLosses += 1;
      state.arenaPoints = Math.max(0, state.arenaPoints - randomBetween(7, 14));
    }
    saveState();
    renderHud();
    renderConflict("conclave");
    playTone(win ? "level" : "fail");
    showModal("<div class='modal-crest'><span>" + (win ? "♜" : "⚔") + "</span></div><h2>Duelo concluído</h2><div class='result-banner " + (win ? "win" : "loss") + "'>" + (win ? "VITÓRIA" : "DERROTA") + "</div><p>" + (win ? "Você conquistou honra, pontos do Conclave e " + reward + " de ouro." : "Seu adversário venceu. Aprimore os atributos e tente novamente.") + "</p><button class='dark-button' style='width:100%' data-close-modal>VOLTAR</button>");
  }

  function renderClanWar() {
    const clanName = state.clan.joined ? state.clan.name : "Sem clã";
    const territoryRemaining = Math.max(0, Math.ceil((state.territoryCooldownUntil - Date.now()) / 1000));
    return "<p class='section-copy'>Clãs disputam influência nas fortalezas de L2idle. Abates hostis aumentam karma e a taxa do mercado.</p><div class='clan-card'><div class='clan-emblem'>⚜</div><div><h3>" + escapeHtml(clanName) + "</h3><p>" + (state.clan.joined ? "Influência " + state.clan.influence + " · membro da coalizão de Aurion." : "Junte-se a uma companhia para participar das guerras.") + "</p></div><button class='gold-button' data-join-clan " + (state.clan.joined ? "disabled" : "") + ">" + (state.clan.joined ? "MEMBRO" : "ENTRAR") + "</button></div><div class='territory-card'><div class='territory-icon'>⚑</div><div><h3>Guerra da Fortaleza de Aurion</h3><p>Evento simulado de território. Requer clã e recompensa influência.</p></div><button class='danger-button' data-territory-war " + (!state.clan.joined || territoryRemaining ? "disabled" : "") + ">" + (territoryRemaining ? territoryRemaining + "s" : "LUTAR") + "</button></div><div class='territory-card'><div class='territory-icon'>☠</div><div><h3>Caçada hostil</h3><p>Enfrente outro aventureiro no mundo aberto. +120 karma.</p></div><button class='dark-button' data-pk-hunt>ATACAR</button></div><div class='score-row' style='margin-top:9px'><div class='score-box'><small>ABATES PVP</small><strong>" + state.pvpKills + "</strong></div><div class='score-box'><small>KARMA</small><strong>" + state.karma + "</strong></div><div class='score-box'><small>VITÓRIAS TERRITORIAIS</small><strong>" + state.territoryWins + "</strong></div></div>";
  }

  function joinClan() {
    if (state.clan.joined) return;
    state.clan = { joined: true, name: "Sentinelas de Aurion", influence: 10 };
    showActivity("Você entrou no clã Sentinelas de Aurion.");
    playTone("level");
    saveState();
    renderConflict("clan");
  }

  function territoryWar() {
    if (!state.clan.joined || Date.now() < state.territoryCooldownUntil) return;
    const win = Math.random() < Math.min(.82, .46 + playerStats().power / 10000 + state.clan.influence / 1000);
    state.territoryCooldownUntil = Date.now() + 90000;
    if (win) {
      state.territoryWins += 1;
      state.clan.influence += 35;
      state.honor += 120;
      state.gold += 1800;
    } else {
      state.clan.influence = Math.max(0, state.clan.influence - 5);
    }
    saveState();
    renderHud();
    renderConflict("clan");
    showModal("<div class='modal-crest'><span>⚑</span></div><h2>Guerra territorial</h2><div class='result-banner " + (win ? "win" : "loss") + "'>" + (win ? "FORTALEZA CONQUISTADA" : "CERCO REPELIDO") + "</div><p>" + (win ? "Seu clã ganhou influência, honra e ouro." : "A defesa inimiga resistiu ao cerco desta vez.") + "</p><button class='dark-button' style='width:100%' data-close-modal>CONTINUAR</button>");
  }

  function pkHunt() {
    const win = Math.random() < .62;
    state.karma += 120;
    if (win) {
      state.pvpKills += 1;
      state.gold += 520;
      state.honor += 25;
    }
    saveState();
    renderHud();
    renderConflict("clan");
    showModal("<div class='modal-crest'><span>☠</span></div><h2>Confronto no mundo aberto</h2><div class='result-banner " + (win ? "win" : "loss") + "'>" + (win ? "ALVO DERROTADO" : "ALVO ESCAPOU") + "</div><p>Seu karma aumentou. Guardas e mercadores agora observam suas ações.</p><button class='dark-button' style='width:100%' data-close-modal>CONTINUAR</button>");
  }

  function missionValue(mission) {
    if (mission.field === "level") return state.level;
    return Number(state[mission.field] || 0);
  }

  function renderMissions() {
    $("#drawerContent").innerHTML = "<p class='section-copy'>Objetivos da crônica apresentam os sistemas principais e concedem recursos.</p><div class='mission-list'>" + MISSIONS.map((mission) => {
      const value = missionValue(mission);
      const claimed = state.claimedMissions.includes(mission.id);
      const complete = value >= mission.goal;
      const progress = clamp(value / mission.goal * 100, 0, 100);
      return "<div class='mission-card " + (complete && !claimed ? "claimable" : "") + "'><div class='mission-icon'>" + mission.icon + "</div><div><h3>" + mission.title + "</h3><p>" + mission.copy + " · " + Math.min(value, mission.goal) + "/" + mission.goal + "</p><div class='mission-progress'><i style='width:" + progress + "%'></i></div></div><button class='" + (complete && !claimed ? "gold-button" : "dark-button") + "' data-claim='" + mission.id + "' " + (!complete || claimed ? "disabled" : "") + ">" + (claimed ? "COLETADO" : complete ? "+" + mission.gold + " ●" : "EM CURSO") + "</button></div>";
    }).join("") + "</div>";
  }

  function claimMission(id) {
    const mission = MISSIONS.find((entry) => entry.id === id);
    if (!mission || missionValue(mission) < mission.goal || state.claimedMissions.includes(id)) return;
    state.claimedMissions.push(id);
    state.gold += mission.gold;
    state.gems += mission.gems;
    showActivity("Missão concluída · +" + mission.gold + " ouro · +" + mission.gems + " cristais");
    playTone("loot");
    saveState();
    renderHud();
    renderMissions();
  }

  function renderZones() {
    $("#drawerContent").innerHTML = "<p class='section-copy'>Teleporte para áreas com novos graus, inimigos e regras de PvP.</p><div class='zone-list'>" + ZONES.map((zone, index) => {
      const locked = state.level < zone.unlock;
      return "<div class='zone-card " + (locked ? "locked " : "") + (index === state.zoneIndex ? "active" : "") + "' data-zone='" + index + "'><div class='zone-icon'>" + (locked ? "⌁" : zone.icon) + "</div><div><h3>" + zone.title + "</h3><p>" + zone.subtitle + (locked ? " · libera no Nv. " + zone.unlock : "") + "</p></div><span>" + (index === state.zoneIndex ? "●" : "›") + "</span></div>";
    }).join("") + "</div>";
  }

  function selectZone(index) {
    const zone = ZONES[index];
    if (!zone || state.level < zone.unlock) return;
    state.zoneIndex = index;
    combatLocked = false;
    state.fieldPosition = { x: 50, y: 72 };
    buildFieldEnemies();
    saveState();
    closeDrawer();
    enterExploration("Teleporte concluído: " + zone.title + ". Explore o mapa e escolha sua presa.");
  }

  function usePotion(automatic) {
    const stats = playerStats();
    if (state.potions <= 0 || state.hp >= stats.maxHp) return;
    state.potions -= 1;
    state.hp = Math.min(stats.maxHp, state.hp + Math.round(stats.maxHp * .48));
    showActivity((automatic ? "Poção automática" : "Poção") + " utilizada · 48% do HP recuperado.");
    playTone("potion");
    renderHud();
    saveState();
  }

  function showModal(html) {
    $("#modalContent").innerHTML = html;
    $("#modal").classList.add("open");
    $("#modal").setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    $("#modal").classList.remove("open");
    $("#modal").setAttribute("aria-hidden", "true");
  }

  function applyOfflineProgress() {
    if (!state.created) return;
    const elapsedSeconds = Math.min(8 * 60 * 60, Math.max(0, (Date.now() - Number(state.lastSeen || Date.now())) / 1000));
    if (elapsedSeconds < 60) return;
    const zone = ZONES[state.zoneIndex];
    const stats = playerStats();
    const secondsPerKill = clamp(10.5 - stats.power / 900, 4.2, 10.5);
    const kills = Math.max(1, Math.floor(elapsedSeconds / secondsPerKill * .55));
    const gold = Math.round(kills * zone.gold * .68);
    const xp = Math.round(kills * zone.exp * .68);
    const itemCount = Math.min(6, Math.floor(kills / 18));
    const oldLevel = state.level;
    state.gold += gold;
    state.kills += kills;
    addExperience(xp, true);
    for (let i = 0; i < itemCount && state.inventory.length < 60; i += 1) state.inventory.unshift(generateItem());
    state.hp = playerStats().maxHp;
    state.mp = playerStats().maxMp;
    saveState();
    setTimeout(() => {
      showModal("<div class='modal-crest'><span>☾</span></div><h2>Enquanto você esteve fora</h2><p>" + escapeHtml(state.name) + " caçou por " + formatDuration(elapsedSeconds) + " em " + zone.title + ".</p><div class='score-row'><div class='score-box'><small>ABATES</small><strong>" + formatNumber(kills) + "</strong></div><div class='score-box'><small>OURO</small><strong>" + formatNumber(gold) + "</strong></div><div class='score-box'><small>ITENS</small><strong>" + itemCount + "</strong></div></div>" + (state.level > oldLevel ? "<p style='color:var(--gold-light)'>Você alcançou o nível " + state.level + ".</p>" : "") + "<button class='gold-button' style='width:100%' data-close-modal>COLETAR</button>");
    }, 550);
  }

  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? hours + "h " + minutes + "min" : Math.max(1, minutes) + "min";
  }

  function renderCreation() {
    $("#creationScreen").classList.toggle("open", !state.created);
    $("#creationScreen").setAttribute("aria-hidden", state.created ? "true" : "false");
    if (state.created) return;
    $("#characterNameInput").value = state.name || "Kael";
    $("#raceGrid").innerHTML = Object.entries(RACES).map(([id, race]) => "<button class='creation-option " + (draftRace === id ? "active" : "") + "' data-race='" + id + "'><span>" + race.sigil + "</span><strong>" + race.label + "</strong><small>" + race.copy + "</small></button>").join("");
    $("#archetypeGrid").innerHTML = Object.entries(ARCHETYPES).map(([id, archetype]) => "<button class='creation-option " + (draftArchetype === id ? "active" : "") + "' data-archetype='" + id + "'><span>" + archetype.icon + "</span><strong>" + archetype.label + "</strong><small>" + archetype.copy + "</small></button>").join("");
    $("#creationSummary").innerHTML = "<strong>" + RACES[draftRace].label + " " + ARCHETYPES[draftArchetype].label + "</strong> · " + RACES[draftRace].copy + " " + ARCHETYPES[draftArchetype].copy;
  }

  function createCharacter() {
    const name = $("#characterNameInput").value.trim().replace(/[<>]/g, "").slice(0, 16);
    if (name.length < 3) {
      $("#characterNameInput").focus();
      return;
    }
    state.name = name;
    state.race = draftRace;
    state.archetype = draftArchetype;
    state.created = true;
    state.classTier = 0;
    state.classPath = null;
    state.finalClass = null;
    state.equipment = starterEquipment(draftArchetype);
    const stats = playerStats();
    state.hp = stats.maxHp;
    state.mp = stats.maxMp;
    saveState();
    renderCreation();
    buildFieldEnemies();
    enterExploration();
    renderHud();
    showActivity("Bem-vindo a L2idle, " + state.name + ". Escolha uma criatura e inicie a caçada.");
    playTone("level");
  }

  function activatePresentationMode() {
    showModal("<div class='modal-crest'><span>▶</span></div><h2>Modo apresentação</h2><p>Leva o personagem ao nível 40, libera recursos e itens de amostra. As promoções continuam disponíveis para demonstrar as escolhas.</p><div class='button-row'><button class='dark-button' data-close-modal>CANCELAR</button><button class='gold-button' data-confirm-presentation>ATIVAR</button></div>");
  }

  function confirmPresentationMode() {
    state.created = true;
    state.level = Math.max(40, state.level);
    state.xp = 0;
    state.gold = Math.max(50000, state.gold);
    state.gems = Math.max(500, state.gems);
    state.honor = Math.max(1200, state.honor);
    state.potions = Math.max(50, state.potions);
    state.etherCharges = Math.max(500, state.etherCharges);
    state.scrolls = Math.max(25, state.scrolls);
    state.blessedScrolls = Math.max(8, state.blessedScrolls);
    state.attributePoints = Math.max(8, state.attributePoints);
    ["weapon", "helmet", "chest", "gloves", "boots", "necklace", "ring", "cloak"].forEach((slot, index) => {
      state.inventory.unshift(generateItem({ forcedSlot: slot, forcedGrade: index < 3 ? "B" : "C", forcedRarity: index % 3 === 0 ? "epic" : "rare" }));
    });
    const stats = playerStats();
    state.hp = stats.maxHp;
    state.mp = stats.maxMp;
    state.zoneIndex = Math.max(state.zoneIndex, 2);
    closeModal();
    closeDrawer();
    buildFieldEnemies();
    enterExploration();
    saveState();
    renderHud();
    showActivity("Modo apresentação ativo: nível 40 e sistemas liberados.");
    playTone("legendary");
  }

  function playTone(type) {
    if (!state.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const settings = {
        hit: [115, .035, "square"], crit: [240, .08, "sawtooth"], loot: [520, .12, "sine"],
        legendary: [720, .32, "sine"], equip: [340, .08, "triangle"], level: [620, .22, "sine"],
        fail: [82, .15, "sawtooth"], potion: [440, .12, "sine"]
      }[type] || [220, .05, "sine"];
      oscillator.frequency.setValueAtTime(settings[0], now);
      if (["loot", "level", "legendary"].includes(type)) oscillator.frequency.exponentialRampToValueAtTime(settings[0] * 1.5, now + settings[1]);
      oscillator.type = settings[2];
      gain.gain.setValueAtTime(.045, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + settings[1]);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + settings[1]);
    } catch {
      state.sound = false;
    }
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const nav = event.target.closest("button[data-view], a[data-view]");
      if (nav) {
        event.preventDefault();
        openDrawer(nav.dataset.view);
        return;
      }
      const huntTarget = event.target.closest("[data-hunt-target]");
      if (huntTarget) {
        selectFieldHuntTarget(huntTarget.dataset.huntTarget);
        return;
      }
      if (event.target.closest("#fieldAutoHuntToggle")) {
        toggleFieldAutoHunt();
        return;
      }
      const fieldEnemy = event.target.closest("[data-field-enemy]");
      if (fieldEnemy) {
        requestFieldEncounter(fieldEnemy.dataset.fieldEnemy);
        return;
      }
      const fieldAction = event.target.closest("[data-field-action]");
      if (fieldAction) {
        if (state.fieldAutoHunt) stopFieldAutoHunt(false);
        const landmark = FIELD_LANDMARKS.find((entry) => entry.id === fieldAction.dataset.fieldAction);
        if (landmark) moveFieldPlayerTo(landmark.x, landmark.y + 4, () => interactWithLandmark(landmark.id));
        return;
      }
      const movement = event.target.closest("[data-move]");
      if (movement) {
        if (state.fieldAutoHunt) stopFieldAutoHunt(false);
        moveFieldPlayer(movement.dataset.move);
        return;
      }
      if (event.target.closest("#interactionPrompt")) {
        interactWithNearbyTarget();
        return;
      }
      if (event.target.closest("[data-close-drawer]")) closeDrawer();
      if (event.target.closest("[data-close-modal]")) closeModal();
      if (event.target.closest("[data-field-rest]")) restAtFieldPost();
      const race = event.target.closest("[data-race]");
      if (race) { draftRace = race.dataset.race; renderCreation(); }
      const archetype = event.target.closest("[data-archetype]");
      if (archetype) { draftArchetype = archetype.dataset.archetype; renderCreation(); }
      const skill = event.target.closest("[data-skill]");
      if (skill && !skill.classList.contains("cooldown")) useSkill(skill.dataset.skill);
      const attr = event.target.closest("[data-attribute]");
      if (attr) allocateAttribute(attr.dataset.attribute);
      if (event.target.closest("[data-open-promotion]")) openPromotion();
      const promotion = event.target.closest("[data-promote]");
      if (promotion) promoteClass(promotion.dataset.promote);
      const slot = event.target.closest("[data-open-slot], [data-paper-slot]");
      if (slot) {
        inventoryFilter = slot.dataset.openSlot || slot.dataset.paperSlot;
        openDrawer("inventory");
        renderInventory();
      }
      const filter = event.target.closest("[data-filter]");
      if (filter) { inventoryFilter = filter.dataset.filter; selectedInventoryId = null; renderInventory(); }
      const item = event.target.closest("[data-item-id]");
      if (item) renderInventory(item.dataset.itemId);
      const equip = event.target.closest("[data-equip-item]");
      if (equip) equipItem(equip.dataset.equipItem);
      const sell = event.target.closest("[data-sell-item]");
      if (sell) sellItem(sell.dataset.sellItem);
      const forgeSelect = event.target.closest("[data-forge-slot]");
      if (forgeSelect && !forgeSelect.disabled) { forgeSlot = forgeSelect.dataset.forgeSlot; renderForge(); }
      const scrollType = event.target.closest("[data-scroll-type]");
      if (scrollType) { state.useBlessedScroll = scrollType.dataset.scrollType === "blessed"; renderForge(); }
      if (event.target.closest("[data-enchant]")) attemptEnchant();
      const product = event.target.closest("[data-buy-product]");
      if (product) buyProduct(product.dataset.buyProduct);
      const listing = event.target.closest("[data-buy-listing]");
      if (listing) buyListing(listing);
      const tab = event.target.closest("[data-conflict-tab]");
      if (tab) renderConflict(tab.dataset.conflictTab);
      if (event.target.closest("[data-world-boss]")) challengeWorldBoss();
      const duel = event.target.closest("[data-duel]");
      if (duel) duelOpponent(duel);
      if (event.target.closest("[data-join-clan]")) joinClan();
      if (event.target.closest("[data-territory-war]")) territoryWar();
      if (event.target.closest("[data-pk-hunt]")) pkHunt();
      const claim = event.target.closest("[data-claim]");
      if (claim) claimMission(claim.dataset.claim);
      const zone = event.target.closest("[data-zone]");
      if (zone) selectZone(Number(zone.dataset.zone));
      if (event.target.closest("[data-presentation]")) activatePresentationMode();
      if (event.target.closest("[data-confirm-presentation]")) confirmPresentationMode();
      if (event.target.closest("[data-recreate]")) {
        closeDrawer();
        state.created = false;
        draftRace = state.race;
        draftArchetype = state.archetype;
        renderCreation();
      }
      const explorationMap = event.target.closest("#explorationLayer");
      if (explorationMap && !event.target.closest("button,aside,.movement-pad")) {
        if (state.fieldAutoHunt) stopFieldAutoHunt(false);
        const rect = explorationMap.getBoundingClientRect();
        moveFieldPlayerTo((event.clientX - rect.left) / rect.width * 100, (event.clientY - rect.top) / rect.height * 100);
      }
    });
    $("#createCharacterButton").addEventListener("click", createCharacter);
    $("#autoToggle").addEventListener("click", () => {
      state.running = !state.running;
      if (!state.running && state.fieldAutoHunt) {
        state.fieldAutoHunt = false;
        clearTimeout(autoHuntTimer);
        renderExploration();
      }
      showActivity(encounterActive ? (state.running ? "Combate automático ativado." : "Combate automático pausado.") : (state.running ? "Combate automático preparado para o próximo encontro." : "Próximo encontro será controlado manualmente."));
      renderHud();
      saveState();
    });
    $("#potionButton").addEventListener("click", () => usePotion(false));
    $("#fleeButton").addEventListener("click", fleeFieldEncounter);
    $("#zoneButton").addEventListener("click", () => openDrawer("zones"));
    $("#targetModeButton").addEventListener("click", () => {
      state.targetMode = state.targetMode === "any" ? "elite" : state.targetMode === "elite" ? "boss" : "any";
      showActivity("Prioridade de alvo: " + { any: "qualquer", elite: "elites", boss: "chefes" }[state.targetMode] + ".");
      if (!encounterActive) buildFieldEnemies();
      saveState();
    });
    $("#autoPotionToggle").addEventListener("change", (event) => {
      state.autoPotion = event.target.checked;
      saveState();
      renderHud();
    });
    $("#etherToggle").addEventListener("click", () => useSkill("ether"));
    $$(".speed").forEach((button) => button.addEventListener("click", () => {
      state.speed = Number(button.dataset.speed);
      saveState();
      renderHud();
    }));
    $("#soundToggle").addEventListener("click", () => {
      state.sound = !state.sound;
      if (state.sound) playTone("equip");
      renderHud();
      saveState();
    });
    $("#presentationButton").addEventListener("click", activatePresentationMode);
    $("#resetButton").addEventListener("click", () => {
      showModal("<div class='modal-crest'><span>↺</span></div><h2>Reiniciar a crônica?</h2><p>Todo o progresso local, personagem, itens e enchants serão apagados.</p><div class='button-row'><button class='dark-button' data-close-modal>CANCELAR</button><button class='danger-button' id='confirmReset'>REINICIAR</button></div>");
      setTimeout(() => {
        $("#confirmReset")?.addEventListener("click", () => {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          location.reload();
        });
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { closeModal(); closeDrawer(); }
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      const movementKeys = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
      if (!encounterActive && state.created && movementKeys[event.key] && !$("#modal").classList.contains("open") && !$("#drawer").classList.contains("open")) {
        event.preventDefault();
        if (state.fieldAutoHunt) stopFieldAutoHunt(false);
        moveFieldPlayer(movementKeys[event.key]);
        return;
      }
      if (!encounterActive && state.created && event.key.toLowerCase() === "e") {
        interactWithNearbyTarget();
        return;
      }
      if (encounterActive && /^[1-6]$/.test(event.key)) {
        const skill = skillDefinitions()[Number(event.key) - 1];
        if (skill) useSkill(skill.id);
      }
    });
    window.addEventListener("beforeunload", saveState);
  }

  function init() {
    const highestUnlocked = ZONES.reduce((highest, zone, index) => state.level >= zone.unlock ? index : highest, 0);
    state.zoneIndex = clamp(state.zoneIndex, 0, highestUnlocked);
    const stats = playerStats();
    if (!Number.isFinite(state.hp) || state.hp <= 0) state.hp = stats.maxHp;
    if (!Number.isFinite(state.mp) || state.mp <= 0) state.mp = stats.maxMp;
    applyOfflineProgress();
    bindEvents();
    renderCreation();
    buildFieldEnemies();
    enterExploration();
    renderHud();
    setInterval(combatTick, 620);
    setInterval(() => {
      renderBuffs();
      renderSkillBar();
      if (!encounterActive) renderExploration();
      if ($("#drawer").classList.contains("open") && $("#drawer").dataset.view === "conflict" && conflictTab === "boss") renderConflict("boss");
    }, 1000);
    setInterval(saveState, 10000);
  }

  init();
})();
