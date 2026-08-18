(() => {
  "use strict";

  const STORAGE_KEY = "valdora-idle-save-v1";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const RARITIES = {
    common: { label: "Comum", color: "#9099a1", multiplier: 1, weight: 64 },
    rare: { label: "Raro", color: "#5da9df", multiplier: 1.4, weight: 25 },
    epic: { label: "Épico", color: "#a879dc", multiplier: 2, weight: 9 },
    legendary: { label: "Lendário", color: "#e6b958", multiplier: 3.1, weight: 2 }
  };

  const SLOT_META = {
    weapon: { label: "Arma", icon: "⚔" },
    armor: { label: "Armadura", icon: "♜" },
    helmet: { label: "Elmo", icon: "♛" },
    ring: { label: "Anel", icon: "◈" }
  };

  const ITEM_POOLS = {
    weapon: ["Espada do Vigia", "Lâmina Cinzenta", "Sabre do Exilado", "Espada de Cinzas"],
    armor: ["Couraça do Errante", "Cota da Vigília", "Armadura de Ferro Negro", "Peitoral do Bastião"],
    helmet: ["Elmo do Sentinela", "Capuz do Caçador", "Viseira do Juramento", "Coroa de Ferro"],
    ring: ["Anel das Brasas", "Selo do Andarilho", "Aliança do Crepúsculo", "Sinete Esquecido"]
  };

  const ZONES = [
    {
      id: "ruins",
      title: "Ruínas do Crepúsculo",
      subtitle: "Território recomendado · Nv. 1–4",
      unlock: 1,
      range: [1, 4],
      icon: "⌂",
      enemies: ["Lobo Cinzento", "Fera das Ruínas", "Cão de Pedra"],
      baseHp: 54,
      baseAttack: 6,
      exp: 22,
      gold: 14,
      tint: "none"
    },
    {
      id: "blackwood",
      title: "Bosque de Ferro Negro",
      subtitle: "Território recomendado · Nv. 4–8",
      unlock: 4,
      range: [4, 8],
      icon: "♠",
      enemies: ["Fera do Bosque", "Lobo Enraizado", "Rastreador Corrompido"],
      baseHp: 125,
      baseAttack: 13,
      exp: 48,
      gold: 31,
      tint: "hue-rotate(55deg) saturate(.75)"
    },
    {
      id: "ashcave",
      title: "Fendas de Cinza",
      subtitle: "Território recomendado · Nv. 8–14",
      unlock: 8,
      range: [8, 14],
      icon: "▲",
      enemies: ["Devorador de Brasas", "Presa Carbonizada", "Besta Magmática"],
      baseHp: 280,
      baseAttack: 25,
      exp: 105,
      gold: 68,
      tint: "hue-rotate(-20deg) saturate(1.25) brightness(.9)"
    }
  ];

  const MISSIONS = [
    { id: "kills5", icon: "⚔", title: "Primeiro sangue", copy: "Derrote 5 criaturas.", field: "kills", goal: 5, gold: 180, gems: 5 },
    { id: "level3", icon: "✦", title: "O despertar", copy: "Alcance o nível 3.", field: "level", goal: 3, gold: 320, gems: 8 },
    { id: "enchant1", icon: "◆", title: "Centelha da forja", copy: "Realize 1 tentativa de enchant.", field: "enchantAttempts", goal: 1, gold: 240, gems: 10 },
    { id: "arena1", icon: "♜", title: "Glória no Coliseu", copy: "Vença 1 duelo no Coliseu.", field: "arenaWins", goal: 1, gold: 400, gems: 12 }
  ];

  const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const formatNumber = (value) => Math.floor(value).toLocaleString("pt-BR");

  function createStarterItem(slot, name, stats) {
    return { id: makeId(), slot, name, rarity: "common", enchant: 0, ...stats };
  }

  function initialState() {
    return {
      version: 1,
      lastSeen: Date.now(),
      running: true,
      sound: false,
      zoneIndex: 0,
      gold: 240,
      gems: 25,
      potions: 3,
      level: 1,
      xp: 0,
      hp: 108,
      kills: 0,
      enchantAttempts: 0,
      arenaWins: 0,
      arenaLosses: 0,
      arenaPoints: 1000,
      claimedMissions: [],
      inventory: [],
      equipment: {
        weapon: createStarterItem("weapon", "Espada de Recruta", { attack: 7, defense: 0, crit: 1 }),
        armor: createStarterItem("armor", "Cota de Couro Gasta", { attack: 0, defense: 5, crit: 0 }),
        helmet: null,
        ring: null
      }
    };
  }

  function loadState() {
    const fresh = initialState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== 1) return fresh;
      return {
        ...fresh,
        ...saved,
        equipment: { ...fresh.equipment, ...(saved.equipment || {}) },
        inventory: Array.isArray(saved.inventory) ? saved.inventory : [],
        claimedMissions: Array.isArray(saved.claimedMissions) ? saved.claimedMissions : []
      };
    } catch {
      return fresh;
    }
  }

  let state = loadState();
  let enemy = null;
  let combatLocked = false;
  let selectedInventoryId = null;
  let inventoryFilter = "all";
  let forgeSlot = "weapon";
  let audioContext = null;

  function saveState() {
    state.lastSeen = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function xpNeeded(level = state.level) {
    return Math.floor(92 * Math.pow(level, 1.32));
  }

  function itemStats(item) {
    if (!item) return { attack: 0, defense: 0, crit: 0 };
    const enchantMultiplier = 1 + item.enchant * 0.115;
    return {
      attack: Math.round((item.attack || 0) * enchantMultiplier),
      defense: Math.round((item.defense || 0) * enchantMultiplier),
      crit: Number(((item.crit || 0) + item.enchant * 0.18).toFixed(1))
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

    const attack = 10 + state.level * 3 + gear.attack;
    const defense = 4 + state.level * 1.5 + gear.defense;
    const crit = Math.min(42, 5 + gear.crit);
    const maxHp = Math.round(90 + state.level * 18 + gear.defense * 2.5);
    const power = Math.round(attack * 6 + defense * 4.5 + maxHp * .48 + crit * 3 + state.level * 18);
    return { attack, defense, crit, maxHp, power };
  }

  function weightedRarity(zoneIndex = state.zoneIndex) {
    const roll = Math.random() * 100;
    const bonus = zoneIndex * 2.2;
    if (roll < 2 + bonus) return "legendary";
    if (roll < 11 + bonus * 1.3) return "epic";
    if (roll < 36 + bonus * 1.8) return "rare";
    return "common";
  }

  function generateItem(forcedSlot = null) {
    const slotKeys = Object.keys(SLOT_META);
    const slot = forcedSlot || slotKeys[randomBetween(0, slotKeys.length - 1)];
    const rarity = weightedRarity();
    const rarityData = RARITIES[rarity];
    const zoneScale = 1 + state.zoneIndex * .65 + Math.max(0, state.level - 1) * .08;
    const base = rarityData.multiplier * zoneScale;
    const suffixes = rarity === "legendary" ? ["do Eclipse", "da Chama Eterna"] : rarity === "epic" ? ["do Juramento", "Ancestral"] : ["", "do Vigia"];
    const baseName = ITEM_POOLS[slot][randomBetween(0, ITEM_POOLS[slot].length - 1)];
    const suffix = suffixes[randomBetween(0, suffixes.length - 1)];
    const stats = { attack: 0, defense: 0, crit: 0 };

    if (slot === "weapon") {
      stats.attack = Math.max(5, Math.round(randomBetween(6, 11) * base));
      stats.crit = Number((randomBetween(4, 14) / 10 * rarityData.multiplier).toFixed(1));
    } else if (slot === "armor") {
      stats.defense = Math.max(4, Math.round(randomBetween(5, 10) * base));
    } else if (slot === "helmet") {
      stats.defense = Math.max(2, Math.round(randomBetween(3, 7) * base));
      stats.crit = Number((randomBetween(1, 7) / 10 * rarityData.multiplier).toFixed(1));
    } else {
      stats.attack = Math.max(1, Math.round(randomBetween(1, 4) * base));
      stats.crit = Number((randomBetween(6, 18) / 10 * rarityData.multiplier).toFixed(1));
    }

    return {
      id: makeId(),
      slot,
      name: `${baseName}${suffix ? ` ${suffix}` : ""}`,
      rarity,
      enchant: 0,
      ...stats
    };
  }

  function spawnEnemy() {
    const zone = ZONES[state.zoneIndex];
    const level = randomBetween(zone.range[0], Math.min(zone.range[1], Math.max(zone.range[0] + 1, state.level + 1)));
    const eliteRoll = Math.random();
    const rank = eliteRoll < .035 ? "boss" : eliteRoll < .15 ? "elite" : "common";
    const multiplier = rank === "boss" ? 3.2 : rank === "elite" ? 1.65 : 1;
    const name = rank === "boss" ? `Alfa ${zone.enemies[0]}` : zone.enemies[randomBetween(0, zone.enemies.length - 1)];
    const maxHp = Math.round(zone.baseHp * (1 + (level - zone.range[0]) * .16) * multiplier);

    enemy = {
      name,
      level,
      rank,
      maxHp,
      hp: maxHp,
      attack: Math.round(zone.baseAttack * (1 + (level - zone.range[0]) * .12) * (rank === "boss" ? 1.7 : rank === "elite" ? 1.28 : 1)),
      defense: Math.round(level * 1.1 + (rank === "boss" ? 5 : rank === "elite" ? 2 : 0)),
      exp: Math.round(zone.exp * multiplier * (1 + (level - zone.range[0]) * .08)),
      gold: Math.round(zone.gold * multiplier * (1 + (level - zone.range[0]) * .08))
    };

    const entity = $("#enemyEntity");
    entity.classList.remove("defeated", "hit", "attack");
    entity.style.filter = `${zone.tint} ${rank === "elite" ? "brightness(1.15)" : rank === "boss" ? "saturate(1.35) brightness(1.12)" : ""}`;
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
    }
    if (levelsGained > 0) {
      state.hp = playerStats().maxHp;
      if (!quiet) {
        showActivity(`Nível ${state.level} alcançado! Seus atributos foram restaurados.`);
        showLevelUp();
        playTone("level");
      }
    }
    return levelsGained;
  }

  function showLevelUp() {
    const heading = $(".zone-heading");
    const original = heading.innerHTML;
    heading.innerHTML = `<span>EVOLUÇÃO</span><strong>NÍVEL ${state.level}</strong><small>Seu poder aumentou</small>`;
    heading.style.animation = "none";
    void heading.offsetWidth;
    heading.style.animation = "zoneEnter .5s ease both";
    setTimeout(() => {
      heading.innerHTML = original;
      renderHud();
    }, 2100);
  }

  function combatTick() {
    if (!state.running || combatLocked || !enemy) return;
    combatLocked = true;
    const stats = playerStats();
    const crit = Math.random() * 100 < stats.crit;
    const rawDamage = stats.attack * (.86 + Math.random() * .29) * (crit ? 1.75 : 1);
    const damage = Math.max(1, Math.round(rawDamage - enemy.defense * .36));

    animatePlayerAttack(damage, crit);
    enemy.hp = Math.max(0, enemy.hp - damage);
    renderHud();

    if (enemy.hp <= 0) {
      setTimeout(handleEnemyDefeat, 260);
      return;
    }

    setTimeout(() => {
      if (enemy.hp > 0) enemyAttack();
    }, 430);

    setTimeout(() => { combatLocked = false; }, 770);
  }

  function enemyAttack() {
    const stats = playerStats();
    const damage = Math.max(1, Math.round(enemy.attack * (.85 + Math.random() * .28) - stats.defense * .34));
    state.hp = Math.max(0, state.hp - damage);
    const entity = $("#enemyEntity");
    entity.classList.remove("attack");
    void entity.offsetWidth;
    entity.classList.add("attack");
    setTimeout(() => $("#heroEntity").classList.add("hit"), 115);
    setTimeout(() => $("#heroEntity").classList.remove("hit"), 350);
    showDamage(damage, false, true);
    renderHud();

    if (state.hp <= 0) handlePlayerDefeat();
  }

  function animatePlayerAttack(damage, crit) {
    const hero = $("#heroEntity");
    const target = $("#enemyEntity");
    const flash = $("#combatFlash");
    hero.classList.remove("attack");
    void hero.offsetWidth;
    hero.classList.add("attack");
    setTimeout(() => {
      target.classList.add("hit");
      flash.classList.remove("show");
      void flash.offsetWidth;
      flash.classList.add("show");
      showDamage(damage, crit, false);
      playTone(crit ? "crit" : "hit");
    }, 180);
    setTimeout(() => target.classList.remove("hit"), 410);
  }

  function showDamage(value, crit, fromEnemy) {
    const node = document.createElement("span");
    node.className = `damage-number${crit ? " crit" : ""}${fromEnemy ? " enemy-damage" : ""}`;
    node.textContent = `${crit ? "CRIT " : ""}-${value}`;
    $("#damageLayer").appendChild(node);
    setTimeout(() => node.remove(), 850);
  }

  function handleEnemyDefeat() {
    $("#enemyEntity").classList.add("defeated");
    state.kills += 1;
    state.gold += enemy.gold;
    addExperience(enemy.exp);
    state.hp = Math.min(playerStats().maxHp, state.hp + Math.round(playerStats().maxHp * .08));
    showActivity(`${enemy.name} derrotado · +${enemy.exp} EXP · +${enemy.gold} ouro`);

    const lootChance = enemy.rank === "boss" ? 1 : enemy.rank === "elite" ? .78 : .46;
    if (Math.random() < lootChance) {
      const item = generateItem();
      state.inventory.unshift(item);
      if (state.inventory.length > 40) state.inventory.pop();
      showLoot(item);
    }

    saveState();
    renderHud();
    setTimeout(() => {
      spawnEnemy();
      combatLocked = false;
    }, 780);
  }

  function handlePlayerDefeat() {
    state.running = false;
    $("#heroEntity").classList.add("defeated");
    showActivity("Kael foi derrotado e está se recuperando no acampamento...");
    setTimeout(() => {
      state.hp = Math.round(playerStats().maxHp * .72);
      state.running = true;
      $("#heroEntity").classList.remove("defeated");
      renderHud();
      showActivity("Recuperado. A caçada automática foi retomada.");
      combatLocked = false;
    }, 1800);
  }

  function showLoot(item) {
    const rarity = RARITIES[item.rarity];
    const toast = $("#lootToast");
    $("#lootToastIcon").textContent = SLOT_META[item.slot].icon;
    $("#lootToastName").textContent = `${item.name}${item.enchant ? ` +${item.enchant}` : ""}`;
    toast.style.setProperty("--loot-color", rarity.color);
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
    playTone(item.rarity === "legendary" ? "legendary" : "loot");
  }

  function showActivity(text) {
    $("#activityText").textContent = text;
  }

  function renderHud() {
    const stats = playerStats();
    const maxHp = stats.maxHp;
    state.hp = clamp(state.hp, 0, maxHp);
    const xpTarget = xpNeeded();
    const xpPercent = clamp(state.xp / xpTarget * 100, 0, 100);
    const hpPercent = clamp(state.hp / maxHp * 100, 0, 100);
    const zone = ZONES[state.zoneIndex];

    $("#goldValue").textContent = formatNumber(state.gold);
    $("#gemValue").textContent = formatNumber(state.gems);
    $("#levelValue").textContent = state.level;
    $("#heroLevelFloat").textContent = `Nv. ${state.level}`;
    $("#powerValue").textContent = `Poder ${formatNumber(stats.power)}`;
    $("#attackValue").textContent = Math.round(stats.attack);
    $("#defenseValue").textContent = Math.round(stats.defense);
    $("#critValue").textContent = `${stats.crit.toFixed(1)}%`;
    $("#playerHpBar").style.width = `${hpPercent}%`;
    $("#playerHpText").textContent = `${Math.round(state.hp)} / ${maxHp}`;
    $("#playerXpBar").style.width = `${xpPercent}%`;
    $("#playerXpText").textContent = `${Math.floor(xpPercent)}%`;
    $("#killValue").textContent = formatNumber(state.kills);
    $("#potionCount").textContent = state.potions;
    $("#inventoryBadge").textContent = state.inventory.length;
    $("#inventoryBadge").dataset.empty = state.inventory.length === 0;
    $("#soundToggle").classList.toggle("muted", !state.sound);

    $("#zoneTitle").textContent = zone.title;
    $("#zoneSubtitle").textContent = zone.subtitle;
    $("#zoneButtonText").textContent = zone.title;

    if (enemy) {
      const enemyPercent = clamp(enemy.hp / enemy.maxHp * 100, 0, 100);
      const rankLabel = enemy.rank === "boss" ? "CHEFE" : enemy.rank === "elite" ? "ELITE" : "COMUM";
      $("#enemyName").textContent = enemy.name;
      $("#enemyNameFloat").textContent = enemy.name;
      $("#enemyLevel").textContent = `Nv. ${enemy.level}`;
      $("#enemyLevelFloat").textContent = `Nv. ${enemy.level}`;
      $("#enemyRarity").textContent = rankLabel;
      $("#enemyRarity").style.color = enemy.rank === "boss" ? RARITIES.legendary.color : enemy.rank === "elite" ? RARITIES.epic.color : "#aab0b5";
      $("#enemyHpBar").style.width = `${enemyPercent}%`;
      $("#enemyHpText").textContent = `${Math.ceil(enemy.hp)} / ${enemy.maxHp}`;
      $("#enemyReward").textContent = `${enemy.exp} EXP · ${enemy.gold} ouro`;
    }

    const auto = $("#autoToggle");
    auto.classList.toggle("active", state.running);
    auto.querySelector("small").textContent = state.running ? "ATIVADA" : "PAUSADA";
    renderEquipmentStrip();
    updateMissionBadge();
  }

  function renderEquipmentStrip() {
    $("#equipmentStrip").innerHTML = Object.entries(SLOT_META).map(([slot, meta]) => {
      const item = state.equipment[slot];
      const color = item ? RARITIES[item.rarity].color : "#687079";
      return `<button class="gear-slot ${item ? "filled" : ""}" data-open-slot="${slot}" data-label="${meta.label}" style="--rarity:${color}" title="${item ? item.name : `Slot de ${meta.label}`}">
        <span class="gear-icon">${meta.icon}</span>${item?.enchant ? `<small>+${item.enchant}</small>` : ""}
      </button>`;
    }).join("");
  }

  function openDrawer(view) {
    $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === view));
    if (view === "hunt") {
      closeDrawer();
      return;
    }

    const titles = {
      inventory: ["PERSONAGEM", "Inventário"],
      forge: ["APRIMORAMENTO", "Forja das Brasas"],
      coliseum: ["PVP ASSÍNCRONO", "Coliseu"],
      missions: ["JORNADA", "Missões"]
    };
    $("#drawerEyebrow").textContent = titles[view][0];
    $("#drawerTitle").textContent = titles[view][1];
    $("#drawer").dataset.view = view;
    $("#drawer").classList.add("open");
    $("#drawer").setAttribute("aria-hidden", "false");

    if (view === "inventory") renderInventory();
    if (view === "forge") renderForge();
    if (view === "coliseum") renderColiseum();
    if (view === "missions") renderMissions();
  }

  function closeDrawer() {
    $("#drawer").classList.remove("open");
    $("#drawer").setAttribute("aria-hidden", "true");
    $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === "hunt"));
  }

  function renderInventory(selectedId = selectedInventoryId) {
    selectedInventoryId = selectedId;
    const selected = state.inventory.find(item => item.id === selectedId);
    const filtered = inventoryFilter === "all" ? state.inventory : state.inventory.filter(item => item.slot === inventoryFilter);
    const filters = [{ id: "all", label: "Todos" }, ...Object.entries(SLOT_META).map(([id, meta]) => ({ id, label: meta.label }))];
    const filterHtml = `<div class="inventory-toolbar">${filters.map(filter => `<button class="filter-chip ${inventoryFilter === filter.id ? "active" : ""}" data-filter="${filter.id}">${filter.label}</button>`).join("")}</div>`;

    const selectedHtml = selected ? renderItemDetail(selected) : "";
    const gridHtml = filtered.length ? `<div class="inventory-grid">${filtered.map(item => {
      const rarity = RARITIES[item.rarity];
      return `<button class="item-card" data-item-id="${item.id}" style="--rarity:${rarity.color}">
        ${item.enchant ? `<span class="enchant-tag">+${item.enchant}</span>` : ""}
        <span class="item-icon">${SLOT_META[item.slot].icon}</span>
        <strong>${item.name}</strong><small>${rarity.label} · ${SLOT_META[item.slot].label}</small>
      </button>`;
    }).join("")}</div>` : `<div class="empty-state"><span>◇</span><strong>Nenhum item aqui</strong><p>Continue caçando para encontrar equipamentos.</p></div>`;

    $("#drawerContent").innerHTML = `<p class="section-copy">Compare os drops encontrados e monte sua combinação de poder. O inventário deste protótipo comporta 40 itens.</p>${selectedHtml}${filterHtml}${gridHtml}`;
  }

  function renderItemDetail(item) {
    const rarity = RARITIES[item.rarity];
    const stats = itemStats(item);
    const equipped = state.equipment[item.slot];
    const compare = equipped ? itemStats(equipped) : { attack: 0, defense: 0, crit: 0 };
    const sellValue = itemSellValue(item);
    return `<div class="item-detail" style="--rarity:${rarity.color}; margin-bottom:14px">
      <div class="item-detail-icon">${SLOT_META[item.slot].icon}</div>
      <div>
        <small style="color:${rarity.color}">${rarity.label.toUpperCase()} · ${SLOT_META[item.slot].label.toUpperCase()}</small>
        <h3>${item.name}${item.enchant ? ` +${item.enchant}` : ""}</h3>
        <p>${equipped ? `Comparando com ${equipped.name}${equipped.enchant ? ` +${equipped.enchant}` : ""}.` : "Nenhum item equipado neste slot."}</p>
      </div>
      <div style="grid-column:1/-1">
        <div class="item-stat-list">
          ${stats.attack ? `<div><span>Ataque</span><strong>${stats.attack} <em style="color:${stats.attack >= compare.attack ? "#67bd88" : "#c86b65"}">${signed(stats.attack - compare.attack)}</em></strong></div>` : ""}
          ${stats.defense ? `<div><span>Defesa</span><strong>${stats.defense} <em style="color:${stats.defense >= compare.defense ? "#67bd88" : "#c86b65"}">${signed(stats.defense - compare.defense)}</em></strong></div>` : ""}
          ${stats.crit ? `<div><span>Crítico</span><strong>${stats.crit.toFixed(1)}% <em style="color:${stats.crit >= compare.crit ? "#67bd88" : "#c86b65"}">${signed(stats.crit - compare.crit, "%")}</em></strong></div>` : ""}
        </div>
        <div class="button-row"><button class="gold-button" data-equip-item="${item.id}">EQUIPAR</button><button class="danger-button" data-sell-item="${item.id}">VENDER · ${sellValue} ●</button></div>
      </div>
    </div>`;
  }

  function signed(value, suffix = "") {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? "+" : ""}${rounded}${suffix}`;
  }

  function equipItem(id) {
    const index = state.inventory.findIndex(item => item.id === id);
    if (index < 0) return;
    const item = state.inventory.splice(index, 1)[0];
    const old = state.equipment[item.slot];
    state.equipment[item.slot] = item;
    if (old) state.inventory.unshift(old);
    selectedInventoryId = null;
    state.hp = Math.min(state.hp, playerStats().maxHp);
    showActivity(`${item.name} foi equipado.`);
    playTone("equip");
    saveState();
    renderHud();
    renderInventory();
  }

  function itemSellValue(item) {
    return Math.round(20 * RARITIES[item.rarity].multiplier * (1 + state.zoneIndex * .4) * (1 + item.enchant * .45));
  }

  function sellItem(id) {
    const index = state.inventory.findIndex(item => item.id === id);
    if (index < 0) return;
    const item = state.inventory[index];
    const value = itemSellValue(item);
    state.gold += value;
    state.inventory.splice(index, 1);
    selectedInventoryId = null;
    showActivity(`${item.name} vendido por ${value} ouro.`);
    saveState();
    renderHud();
    renderInventory();
  }

  function renderForge() {
    const slots = Object.keys(SLOT_META);
    if (!state.equipment[forgeSlot]) forgeSlot = slots.find(slot => state.equipment[slot]) || "weapon";
    const item = state.equipment[forgeSlot];
    const rarity = item ? RARITIES[item.rarity] : RARITIES.common;
    const chance = item ? enchantChance(item.enchant) : 0;
    const cost = item ? enchantCost(item) : 0;
    const maxed = item?.enchant >= 10;

    $("#drawerContent").innerHTML = `<p class="section-copy">Fortaleça equipamentos usando ouro. Até +5 a falha não reduz o enchant; a partir do +6, existe risco de perder um nível.</p>
      <div class="forge-altar" style="--rarity:${rarity.color}">
        ${item ? `<div class="forge-item">${SLOT_META[item.slot].icon}</div><small>${rarity.label.toUpperCase()} · ${SLOT_META[item.slot].label.toUpperCase()}</small><h3>${item.name} ${item.enchant ? `+${item.enchant}` : "+0"}</h3>
        <div class="forge-chance"><div><span>Chance de sucesso</span><strong>${maxed ? "MÁXIMO" : `${chance}%`}</strong></div><div class="chance-track"><i style="width:${maxed ? 100 : chance}%"></i></div></div>
        <div class="forge-cost"><span>Custo da tentativa</span><strong>${formatNumber(cost)} ouro</strong></div>
        <button class="gold-button" style="width:100%" data-enchant ${state.gold < cost || maxed ? "disabled" : ""}>${maxed ? "ENCHANT MÁXIMO" : `TENTAR +${item.enchant + 1}`}</button>` : `<div class="empty-state"><strong>Nenhum equipamento</strong></div>`}
      </div>
      <div class="forge-slots">${slots.map(slot => {
        const equipped = state.equipment[slot];
        const color = equipped ? RARITIES[equipped.rarity].color : "#687079";
        return `<button class="forge-slot ${forgeSlot === slot ? "active" : ""}" data-forge-slot="${slot}" style="--rarity:${color}" ${!equipped ? "disabled" : ""}><span>${SLOT_META[slot].icon}</span><strong>${equipped ? `${SLOT_META[slot].label} ${equipped.enchant ? `+${equipped.enchant}` : "+0"}` : "Vazio"}</strong></button>`;
      }).join("")}</div>`;
  }

  function enchantChance(level) {
    return [100, 92, 84, 74, 62, 48, 34, 23, 14, 8][Math.min(level, 9)];
  }

  function enchantCost(item) {
    return Math.round(75 * (item.enchant + 1) * RARITIES[item.rarity].multiplier * (1 + item.enchant * .36));
  }

  function attemptEnchant() {
    const item = state.equipment[forgeSlot];
    if (!item || item.enchant >= 10) return;
    const cost = enchantCost(item);
    if (state.gold < cost) return;
    state.gold -= cost;
    state.enchantAttempts += 1;
    const success = Math.random() * 100 < enchantChance(item.enchant);
    if (success) {
      item.enchant += 1;
      showActivity(`${item.name} alcançou +${item.enchant}!`);
      playTone(item.enchant >= 7 ? "legendary" : "level");
      flashForgeResult(true, `ENCHANT +${item.enchant}`, "A chama respondeu ao seu chamado.");
    } else {
      const lostLevel = item.enchant >= 6;
      if (lostLevel) item.enchant -= 1;
      showActivity(`A tentativa de enchant falhou${lostLevel ? ` e o item voltou para +${item.enchant}` : ""}.`);
      playTone("fail");
      flashForgeResult(false, "FALHA NA FORJA", lostLevel ? `O equipamento regrediu para +${item.enchant}.` : "O equipamento não perdeu nível.");
    }
    saveState();
    renderHud();
    renderForge();
  }

  function flashForgeResult(success, title, copy) {
    showModal(`<div class="modal-crest"><span>${success ? "✦" : "×"}</span></div><h2>${title}</h2><p>${copy}</p><button class="${success ? "gold-button" : "dark-button"}" style="width:100%" data-close-modal>CONTINUAR</button>`);
  }

  function renderColiseum() {
    const power = playerStats().power;
    const opponents = [
      { name: "Mira da Névoa", className: "Arqueira Sombria", factor: .82, reward: 55 },
      { name: "Boros Punho de Ferro", className: "Guardião", factor: 1.02, reward: 90 },
      { name: "Lyra Cinza", className: "Oráculo das Brasas", factor: 1.27, reward: 145 }
    ].map((opponent, index) => ({ ...opponent, power: Math.max(180, Math.round(power * opponent.factor + (index - 1) * 12)) }));

    $("#drawerContent").innerHTML = `<p class="section-copy">Enfrente projeções de outros heróis. Neste protótipo, o duelo compara poder, equipamentos e uma pequena variação de combate.</p>
      <div class="coliseum-score"><div class="score-box"><small>PONTOS DE HONRA</small><strong>${formatNumber(state.arenaPoints)}</strong></div><div class="score-box"><small>VITÓRIAS / DERROTAS</small><strong>${state.arenaWins} / ${state.arenaLosses}</strong></div></div>
      <div class="opponent-list">${opponents.map((opponent, index) => `<div class="opponent-card">
        <div class="opponent-rank">#${Math.max(1, 48 - state.arenaWins * 2 + index * 7)}</div>
        <div><h3>${opponent.name}</h3><p>${opponent.className} · Poder ${formatNumber(opponent.power)}</p></div>
        <button class="${opponent.power <= power ? "gold-button" : "dark-button"}" data-duel="${index}" data-power="${opponent.power}" data-reward="${opponent.reward}">DESAFIAR</button>
      </div>`).join("")}</div>`;
  }

  function duelOpponent(button) {
    const opponentPower = Number(button.dataset.power);
    const reward = Number(button.dataset.reward);
    const myRoll = playerStats().power * (.82 + Math.random() * .36);
    const enemyRoll = opponentPower * (.84 + Math.random() * .32);
    const win = myRoll >= enemyRoll;
    if (win) {
      state.arenaWins += 1;
      state.arenaPoints += randomBetween(18, 31);
      state.gold += reward;
    } else {
      state.arenaLosses += 1;
      state.arenaPoints = Math.max(0, state.arenaPoints - randomBetween(7, 14));
    }
    saveState();
    renderHud();
    renderColiseum();
    playTone(win ? "level" : "fail");
    showModal(`<div class="modal-crest"><span>${win ? "♜" : "⚔"}</span></div><h2>Duelo concluído</h2><div class="result-banner ${win ? "win" : "loss"}">${win ? "VITÓRIA" : "DERROTA"}</div><p>${win ? `Você conquistou honra e recebeu ${reward} de ouro.` : "Seu adversário venceu desta vez. Aprimore seu equipamento e tente novamente."}</p><button class="${win ? "gold-button" : "dark-button"}" style="width:100%" data-close-modal>VOLTAR AO COLISEU</button>`);
  }

  function missionValue(mission) {
    if (mission.field === "level") return state.level;
    return state[mission.field] || 0;
  }

  function renderMissions() {
    $("#drawerContent").innerHTML = `<p class="section-copy">Objetivos curtos para testar o ritmo de progressão e ensinar os sistemas principais.</p><div class="mission-list">${MISSIONS.map(mission => {
      const value = missionValue(mission);
      const claimed = state.claimedMissions.includes(mission.id);
      const complete = value >= mission.goal;
      const progress = clamp(value / mission.goal * 100, 0, 100);
      return `<div class="mission-card ${complete && !claimed ? "claimable" : ""}">
        <div class="mission-icon">${mission.icon}</div>
        <div><h3>${mission.title}</h3><p>${mission.copy} · ${Math.min(value, mission.goal)}/${mission.goal}</p><div class="mission-progress"><i style="width:${progress}%"></i></div></div>
        <button class="${complete && !claimed ? "gold-button" : "dark-button"}" data-claim="${mission.id}" ${!complete || claimed ? "disabled" : ""}>${claimed ? "COLETADO" : complete ? `+${mission.gold} ●` : "EM CURSO"}</button>
      </div>`;
    }).join("")}</div>`;
  }

  function updateMissionBadge() {
    const claimable = MISSIONS.filter(mission => missionValue(mission) >= mission.goal && !state.claimedMissions.includes(mission.id)).length;
    $("#missionBadge").textContent = claimable;
    $("#missionBadge").dataset.empty = claimable === 0;
  }

  function claimMission(id) {
    const mission = MISSIONS.find(entry => entry.id === id);
    if (!mission || missionValue(mission) < mission.goal || state.claimedMissions.includes(id)) return;
    state.claimedMissions.push(id);
    state.gold += mission.gold;
    state.gems += mission.gems;
    showActivity(`Missão concluída · +${mission.gold} ouro · +${mission.gems} cristais`);
    playTone("loot");
    saveState();
    renderHud();
    renderMissions();
  }

  function renderZones() {
    $("#drawerEyebrow").textContent = "MAPA DE VALDORA";
    $("#drawerTitle").textContent = "Regiões de caça";
    $("#drawer").dataset.view = "zones";
    $("#drawer").classList.add("open");
    $("#drawer").setAttribute("aria-hidden", "false");
    $("#drawerContent").innerHTML = `<p class="section-copy">Áreas mais perigosas entregam mais experiência, ouro e melhores chances de raridade.</p><div class="zone-list">${ZONES.map((zone, index) => {
      const locked = state.level < zone.unlock;
      return `<div class="zone-card ${locked ? "locked" : ""} ${index === state.zoneIndex ? "active" : ""}" data-zone="${index}"><div class="zone-icon">${locked ? "⌁" : zone.icon}</div><div><h3>${zone.title}</h3><p>${zone.subtitle}${locked ? ` · Libera no Nv. ${zone.unlock}` : ""}</p></div><span>${index === state.zoneIndex ? "●" : "›"}</span></div>`;
    }).join("")}</div>`;
  }

  function selectZone(index) {
    const zone = ZONES[index];
    if (!zone || state.level < zone.unlock) return;
    state.zoneIndex = index;
    combatLocked = false;
    spawnEnemy();
    saveState();
    closeDrawer();
    showActivity(`Caçada iniciada em ${zone.title}.`);
  }

  function usePotion() {
    const stats = playerStats();
    if (state.potions <= 0 || state.hp >= stats.maxHp) return;
    state.potions -= 1;
    state.hp = Math.min(stats.maxHp, state.hp + Math.round(stats.maxHp * .48));
    showActivity("Poção utilizada · 48% do HP recuperado.");
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
    const elapsedSeconds = Math.min(8 * 60 * 60, Math.max(0, (Date.now() - Number(state.lastSeen || Date.now())) / 1000));
    if (elapsedSeconds < 60) return;
    const zone = ZONES[state.zoneIndex];
    const stats = playerStats();
    const estimatedSecondsPerKill = clamp(9.5 - stats.power / 600, 3.8, 9.5);
    const kills = Math.max(1, Math.floor(elapsedSeconds / estimatedSecondsPerKill * .58));
    const gold = Math.round(kills * zone.gold * .72);
    const xp = Math.round(kills * zone.exp * .72);
    const itemCount = Math.min(6, Math.floor(kills / 14));
    const oldLevel = state.level;
    state.gold += gold;
    state.kills += kills;
    addExperience(xp, true);
    for (let i = 0; i < itemCount && state.inventory.length < 40; i += 1) state.inventory.unshift(generateItem());
    state.hp = playerStats().maxHp;
    saveState();
    setTimeout(() => {
      showModal(`<div class="modal-crest"><span>☾</span></div><h2>Enquanto você esteve fora</h2><p>Kael continuou caçando por ${formatDuration(elapsedSeconds)} nas ${zone.title.toLowerCase()}.</p><div class="reward-summary"><div><span>ABATES</span><strong>${formatNumber(kills)}</strong></div><div><span>OURO</span><strong>${formatNumber(gold)}</strong></div><div><span>ITENS</span><strong>${itemCount}</strong></div></div>${state.level > oldLevel ? `<p style="color:var(--gold-light)">Você alcançou o nível ${state.level}.</p>` : ""}<button class="gold-button" style="width:100%" data-close-modal>COLETAR RECOMPENSAS</button>`);
    }, 500);
  }

  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? `${hours}h ${minutes}min` : `${Math.max(1, minutes)}min`;
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
      const nav = event.target.closest("[data-view]");
      if (nav) {
        event.preventDefault();
        openDrawer(nav.dataset.view);
        return;
      }
      if (event.target.closest("[data-close-drawer]")) closeDrawer();
      if (event.target.closest("[data-close-modal]")) closeModal();

      const slot = event.target.closest("[data-open-slot]");
      if (slot) {
        inventoryFilter = slot.dataset.openSlot;
        openDrawer("inventory");
        renderInventory();
      }

      const filter = event.target.closest("[data-filter]");
      if (filter) {
        inventoryFilter = filter.dataset.filter;
        selectedInventoryId = null;
        renderInventory();
      }

      const item = event.target.closest("[data-item-id]");
      if (item) renderInventory(item.dataset.itemId);

      const equip = event.target.closest("[data-equip-item]");
      if (equip) equipItem(equip.dataset.equipItem);

      const sell = event.target.closest("[data-sell-item]");
      if (sell) sellItem(sell.dataset.sellItem);

      const forgeSelect = event.target.closest("[data-forge-slot]");
      if (forgeSelect && !forgeSelect.disabled) {
        forgeSlot = forgeSelect.dataset.forgeSlot;
        renderForge();
      }

      if (event.target.closest("[data-enchant]")) attemptEnchant();

      const duel = event.target.closest("[data-duel]");
      if (duel) duelOpponent(duel);

      const claim = event.target.closest("[data-claim]");
      if (claim) claimMission(claim.dataset.claim);

      const zone = event.target.closest("[data-zone]");
      if (zone) selectZone(Number(zone.dataset.zone));
    });

    $("#autoToggle").addEventListener("click", () => {
      state.running = !state.running;
      showActivity(state.running ? "Caçada automática retomada." : "Caçada automática pausada.");
      renderHud();
      saveState();
    });
    $("#potionButton").addEventListener("click", usePotion);
    $("#zoneButton").addEventListener("click", renderZones);
    $("#soundToggle").addEventListener("click", () => {
      state.sound = !state.sound;
      if (state.sound) playTone("equip");
      renderHud();
      saveState();
    });
    $("#resetButton").addEventListener("click", () => {
      showModal(`<div class="modal-crest"><span>↺</span></div><h2>Reiniciar o teste?</h2><p>Todo o progresso local, itens e enchants serão apagados.</p><div class="button-row"><button class="dark-button" data-close-modal>CANCELAR</button><button class="danger-button" id="confirmReset">REINICIAR</button></div>`);
      setTimeout(() => {
        $("#confirmReset")?.addEventListener("click", () => {
          localStorage.removeItem(STORAGE_KEY);
          location.reload();
        });
      });
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeModal();
        closeDrawer();
      }
    });
    window.addEventListener("beforeunload", saveState);
  }

  function init() {
    const maxHp = playerStats().maxHp;
    if (!Number.isFinite(state.hp) || state.hp <= 0) state.hp = maxHp;
    applyOfflineProgress();
    bindEvents();
    spawnEnemy();
    renderHud();
    setInterval(combatTick, 850);
    setInterval(saveState, 10000);
  }

  init();
})();
