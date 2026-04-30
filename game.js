const sectors = {
  left: { index: 0, label: "влево" },
  center: { index: 1, label: "по центру" },
  right: { index: 2, label: "вправо" },
};

const weapons = {
  singlePistol: {
    name: "Пистолет однозарядный",
    shotText: "из однозарядного пистолета",
    directDamage: 18,
    armorPiercing: 0.05,
    type: "direct",
  },
  semiPistol: {
    name: "Полуавтоматический пистолет",
    shotText: "из полуавтоматического пистолета",
    directDamage: 15,
    armorPiercing: 0.08,
    type: "direct",
  },
  carbine: {
    name: "Карабин",
    shotText: "из карабина",
    directDamage: 24,
    armorPiercing: 0.12,
    type: "direct",
  },
  shotgun: {
    name: "Дробовик",
    shotText: "из дробовика",
    directDamage: 12,
    grazeDamage: 3,
    armorPiercing: 0,
    type: "spread",
  },
};

const armor = {
  none: {
    name: "без брони",
    displayName: "Без брони",
    reduction: 0,
  },
  vestOne: {
    name: "бронежилет",
    displayName: "Бронежилет I",
    reduction: 4,
  },
  helmetOne: {
    name: "шлем",
    displayName: "Шлем I",
    reduction: 3,
  },
};

const state = {
  round: 1,
  battleStarted: false,
  battleOver: false,
  roundSeconds: 20,
  timerId: null,
  players: [
    {
      id: "playerOne",
      name: "Егерь",
      health: 100,
      maxHealth: 100,
      weaponKey: "shotgun",
      armorKey: "vestOne",
      armor: armor.vestOne,
    },
    {
      id: "playerTwo",
      name: "Стрелок",
      health: 100,
      maxHealth: 100,
      weaponKey: "semiPistol",
      armorKey: "helmetOne",
      armor: armor.helmetOne,
    },
  ],
};

const elements = {
  roundNumber: document.querySelector("#roundNumber"),
  timerValue: document.querySelector("#timerValue"),
  battleLog: document.querySelector("#battleLog"),
  battleStatus: document.querySelector("#battleStatus"),
  startBattleButton: document.querySelector("#startBattleButton"),
  makeMoveButton: document.querySelector("#makeMoveButton"),
  resetButton: document.querySelector("#resetButton"),
  loadoutForm: document.querySelector("#loadoutForm"),
  loadoutLock: document.querySelector("#loadoutLock"),
  playerOneHealth: document.querySelector("#playerOneHealth"),
  playerTwoHealth: document.querySelector("#playerTwoHealth"),
  playerOneHealthFill: document.querySelector("#playerOneHealthFill"),
  playerTwoHealthFill: document.querySelector("#playerTwoHealthFill"),
  playerOneCard: document.querySelector("#playerOneCard"),
  playerTwoCard: document.querySelector("#playerTwoCard"),
  playerOneFigure: document.querySelector("#playerOneFigure"),
  playerTwoFigure: document.querySelector("#playerTwoFigure"),
  playerOneWeapon: document.querySelector("#playerOneWeapon"),
  playerOneArmor: document.querySelector("#playerOneArmor"),
  playerOneWeaponName: document.querySelector("#playerOneWeaponName"),
  playerTwoWeaponName: document.querySelector("#playerTwoWeaponName"),
  playerOneArmorName: document.querySelector("#playerOneArmorName"),
  playerTwoArmorName: document.querySelector("#playerTwoArmorName"),
  shotLineOne: document.querySelector("#shotLineOne"),
  shotLineTwo: document.querySelector("#shotLineTwo"),
  impactOne: document.querySelector("#impactOne"),
  impactTwo: document.querySelector("#impactTwo"),
};

function getCheckedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

function getMoves() {
  return [
    {
      playerIndex: 0,
      shoot: getCheckedValue("playerShoot"),
      dodge: getCheckedValue("playerDodge"),
      weaponKey: state.players[0].weaponKey,
    },
    getOpponentMove(),
  ];
}

function getTimeoutMoves() {
  return [
    {
      playerIndex: 0,
      shoot: "none",
      dodge: "center",
      weaponKey: state.players[0].weaponKey,
    },
    getOpponentMove(),
  ];
}

function getOpponentMove() {
  const sectorKeys = Object.keys(sectors);
  return {
    playerIndex: 1,
    shoot: randomFrom(sectorKeys),
    dodge: randomFrom(sectorKeys),
    weaponKey: state.players[1].weaponKey,
  };
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function applyArmor(damage, target) {
  if (damage <= 0 || !target.armor) {
    return { damage, blocked: 0 };
  }

  const blocked = Math.min(target.armor.reduction, damage - 1);
  return {
    damage: Math.max(0, damage - blocked),
    blocked,
  };
}

function resolveShot(attacker, target, move, targetMove) {
  if (move.shoot === "none") {
    return {
      damage: 0,
      blocked: 0,
      hitType: "no-shot",
      text: `${attacker.name} не успел сделать ход, остался на месте и не стрелял.`,
    };
  }

  const weapon = weapons[move.weaponKey];
  const distance = Math.abs(sectors[move.shoot].index - sectors[targetMove.dodge].index);

  if (distance === 0) {
    const armoredHit = applyArmor(weapon.directDamage, target);
    return {
      damage: armoredHit.damage,
      blocked: armoredHit.blocked,
      hitType: "direct",
      text: buildDirectHitText(attacker, target, move, targetMove, weapon, armoredHit),
    };
  }

  if (weapon.type === "spread" && distance === 1) {
    return {
      damage: weapon.grazeDamage,
      blocked: 0,
      hitType: "graze",
      text: `${target.name} увернулся ${sectors[targetMove.dodge].label}, но несколько дробин в него попали, отняв -${weapon.grazeDamage} здоровья.`,
    };
  }

  return {
    damage: 0,
    blocked: 0,
    hitType: "miss",
    text: buildMissText(attacker, target, move, targetMove, weapon),
  };
}

function buildDirectHitText(attacker, target, move, targetMove, weapon, armoredHit) {
  const armorText =
    armoredHit.blocked > 0
      ? ` ${capitalize(target.armor.name)} погасил ${armoredHit.blocked} урона.`
      : "";

  return `${attacker.name} выстрелил ${weapon.shotText} ${sectors[move.shoot].label} и попал в игрока ${target.name}, нанеся -${armoredHit.damage} здоровья.${armorText}`;
}

function buildMissText(attacker, target, move, targetMove, weapon) {
  if (weapon.type === "spread") {
    return `${attacker.name} выстрелил из дробовика ${sectors[move.shoot].label}, но ${target.name} ушел ${sectors[targetMove.dodge].label}. Дробь рассеялась, попадания нет.`;
  }

  return `${attacker.name} выстрелил ${weapon.shotText} ${sectors[move.shoot].label} и промахнулся. ${target.name} увернулся ${sectors[targetMove.dodge].label}.`;
}

function resolveRound() {
  if (!state.battleStarted || state.battleOver) {
    return;
  }

  stopTimer();
  const moves = getMoves();
  playRound(moves);
}

function resolveTimeoutRound() {
  if (!state.battleStarted || state.battleOver) {
    return;
  }

  stopTimer();
  prependSystemLog(`Время раунда ${state.round} вышло. Егерь остался на месте и не стрелял.`);
  playRound(getTimeoutMoves());
}

function playRound(moves) {
  const p1 = state.players[0];
  const p2 = state.players[1];
  const p1Shot = resolveShot(p1, p2, moves[0], moves[1]);
  const p2Shot = resolveShot(p2, p1, moves[1], moves[0]);

  p2.health = Math.max(0, p2.health - p1Shot.damage);
  p1.health = Math.max(0, p1.health - p2Shot.damage);

  animateRound(moves, p1Shot, p2Shot);
  addRoundLog(p1Shot.text, p2Shot.text);
  updateUi();
  finishRoundIfNeeded();
}

function addRoundLog(firstText, secondText) {
  const firstItem = document.createElement("li");
  firstItem.textContent = `Раунд ${state.round}: ${firstText}`;
  const secondItem = document.createElement("li");
  secondItem.textContent = `Раунд ${state.round}: ${secondText}`;

  elements.battleLog.prepend(secondItem);
  elements.battleLog.prepend(firstItem);
}

function finishRoundIfNeeded() {
  const [p1, p2] = state.players;

  if (p1.health <= 0 || p2.health <= 0) {
    state.battleOver = true;
    state.battleStarted = false;
    stopTimer();
    elements.makeMoveButton.disabled = true;

    if (p1.health <= 0 && p2.health <= 0) {
      elements.battleStatus.textContent = "Ничья";
      elements.playerOneCard.classList.add("defeated");
      elements.playerTwoCard.classList.add("defeated");
      prependSystemLog("Оба игрока потеряли все здоровье. Бой завершился ничьей.");
      return;
    }

    const winner = p1.health > 0 ? p1 : p2;
    const loser = p1.health > 0 ? p2 : p1;
    elements.battleStatus.textContent = `Победил ${winner.name}`;
    document.querySelector(`#${winner.id}Card`).classList.add("winner");
    document.querySelector(`#${loser.id}Card`).classList.add("defeated");
    prependSystemLog(`${winner.name} выиграл бой. В полной версии он получит очки, опыт и запись в рейтинг.`);
    return;
  }

  state.round += 1;
  elements.roundNumber.textContent = state.round;
  startTimer();
}

function prependSystemLog(text) {
  const item = document.createElement("li");
  item.textContent = text;
  elements.battleLog.prepend(item);
}

function animateRound(moves, p1Shot, p2Shot) {
  setDodgeClass(elements.playerOneFigure, "fighter-left", moves[0].dodge);
  setDodgeClass(elements.playerTwoFigure, "fighter-right", moves[1].dodge);

  fireLine(elements.shotLineOne, moves[0].shoot);
  fireLine(elements.shotLineTwo, moves[1].shoot);

  showImpact(elements.impactTwo, p1Shot.damage);
  showImpact(elements.impactOne, p2Shot.damage);
}

function setDodgeClass(figure, baseClass, direction) {
  figure.className = `fighter-figure ${baseClass} dodge-${direction}`;
}

function fireLine(line, sector) {
  line.classList.remove("fire", "shoot-left", "shoot-center", "shoot-right");
  if (sector === "none") {
    return;
  }

  void line.offsetWidth;
  line.classList.add("fire", `shoot-${sector}`);
}

function showImpact(impact, damage) {
  impact.textContent = damage > 0 ? `-${damage}` : "мимо";
  impact.classList.remove("show");
  void impact.offsetWidth;
  impact.classList.add("show");
}

function updateUi() {
  const [p1, p2] = state.players;
  elements.playerOneHealth.textContent = p1.health;
  elements.playerTwoHealth.textContent = p2.health;
  updateHealthFill(elements.playerOneHealthFill, p1.health, p1.maxHealth);
  updateHealthFill(elements.playerTwoHealthFill, p2.health, p2.maxHealth);
  elements.playerOneWeaponName.textContent = weapons[p1.weaponKey].name;
  elements.playerTwoWeaponName.textContent = weapons[p2.weaponKey].name;
  elements.playerOneArmorName.textContent = armor[p1.armorKey].displayName;
  elements.playerTwoArmorName.textContent = armor[p2.armorKey].displayName;
}

function updateHealthFill(fill, health, maxHealth) {
  const percent = Math.max(0, Math.round((health / maxHealth) * 100));
  fill.style.width = `${percent}%`;
  fill.classList.toggle("low", percent <= 35);
}

function startBattle() {
  if (state.battleStarted) {
    return;
  }

  state.battleStarted = true;
  state.battleOver = false;
  applySelectedLoadout();
  lockLoadout(true);
  elements.battleStatus.textContent = "Бой идет";
  elements.startBattleButton.disabled = true;
  elements.makeMoveButton.disabled = false;
  elements.battleLog.innerHTML = "<li>Бой начался. Снаряжение зафиксировано до конца боя.</li>";
  startTimer();
  updateUi();
}

function resetBattle() {
  state.round = 1;
  state.battleStarted = false;
  state.battleOver = false;
  stopTimer();
  state.players.forEach((player) => {
    player.health = player.maxHealth;
  });
  applySelectedLoadout();
  lockLoadout(false);

  elements.roundNumber.textContent = "1";
  elements.battleStatus.textContent = "Ожидание боя";
  elements.startBattleButton.disabled = false;
  elements.makeMoveButton.disabled = true;
  elements.battleLog.innerHTML = "<li>Выберите снаряжение и начните бой.</li>";
  elements.playerOneCard.classList.remove("winner", "defeated");
  elements.playerTwoCard.classList.remove("winner", "defeated");
  setDodgeClass(elements.playerOneFigure, "fighter-left", "center");
  setDodgeClass(elements.playerTwoFigure, "fighter-right", "center");
  updateUi();
}

function applySelectedLoadout() {
  const player = state.players[0];
  player.weaponKey = elements.playerOneWeapon.value;
  player.armorKey = elements.playerOneArmor.value;
  player.armor = armor[player.armorKey];
}

function lockLoadout(locked) {
  elements.playerOneWeapon.disabled = locked;
  elements.playerOneArmor.disabled = locked;
  elements.loadoutForm.classList.toggle("locked", locked);
  elements.loadoutLock.classList.toggle("locked", locked);
  elements.loadoutLock.textContent = locked ? "Зафиксировано" : "Можно менять";
}

function startTimer() {
  state.roundSeconds = 20;
  updateTimerUi();
  stopTimer();
  state.timerId = window.setInterval(() => {
    state.roundSeconds -= 1;
    updateTimerUi();

    if (state.roundSeconds <= 0) {
      resolveTimeoutRound();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerUi() {
  elements.timerValue.textContent = state.roundSeconds;
  const panel = elements.timerValue.closest(".timer-panel");
  panel.classList.toggle("warning", state.roundSeconds <= 10 && state.roundSeconds > 5);
  panel.classList.toggle("danger", state.roundSeconds <= 5);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

elements.startBattleButton.addEventListener("click", startBattle);
elements.makeMoveButton.addEventListener("click", resolveRound);
elements.resetButton.addEventListener("click", resetBattle);
elements.playerOneWeapon.addEventListener("change", syncLoadoutPreview);
elements.playerOneArmor.addEventListener("change", syncLoadoutPreview);

function syncLoadoutPreview() {
  if (state.battleStarted) {
    return;
  }

  applySelectedLoadout();
  updateUi();
}

resetBattle();
