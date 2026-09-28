(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const ui = {
    app: document.getElementById("app"),
    setupPanel: document.getElementById("setupPanel"),
    upgradePanel: document.getElementById("upgradePanel"),
    gameOverPanel: document.getElementById("gameOverPanel"),
    truckChoices: document.getElementById("truckChoices"),
    locationChoices: document.getElementById("locationChoices"),
    truckStatLine: document.getElementById("truckStatLine"),
    locationStatLine: document.getElementById("locationStatLine"),
    startButton: document.getElementById("startButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    pauseButton: document.getElementById("pauseButton"),
    restartButton: document.getElementById("restartButton"),
    hpBar: document.getElementById("hpBar"),
    hpText: document.getElementById("hpText"),
    waveText: document.getElementById("waveText"),
    timerText: document.getElementById("timerText"),
    scoreText: document.getElementById("scoreText"),
    coinText: document.getElementById("coinText"),
    locationLabel: document.getElementById("locationLabel"),
    weaponList: document.getElementById("weaponList"),
    shopSubtitle: document.getElementById("shopSubtitle"),
    shopSummary: document.getElementById("shopSummary"),
    upgradeChoices: document.getElementById("upgradeChoices"),
    continueButton: document.getElementById("continueButton"),
    finalScore: document.getElementById("finalScore"),
    finalWave: document.getElementById("finalWave"),
    finalKills: document.getElementById("finalKills"),
    bestScore: document.getElementById("bestScore"),
    finalStats: document.getElementById("finalStats"),
    sendScoreButton: document.getElementById("sendScoreButton"),
    playAgainButton: document.getElementById("playAgainButton"),
    joystick: document.getElementById("joystick"),
    joystickThumb: document.querySelector("#joystick span")
  };

  const tg = window.Telegram?.WebApp;
  const tgVersion = tg?.version ? tg.version.split(".").map((part) => Number(part) || 0) : [0, 0];
  const tgAtLeast = (major, minor) => tgVersion[0] > major || (tgVersion[0] === major && tgVersion[1] >= minor);
  const canUseTelegramColors = Boolean(tg && tgAtLeast(6, 1));
  const canUseHaptics = Boolean(tg?.HapticFeedback && tgAtLeast(6, 1));
  const canUseTelegramFullscreen = Boolean(tg && tgAtLeast(8, 0) && typeof tg.requestFullscreen === "function");

  function getViewportSize() {
    const viewport = window.visualViewport;
    const tgHeight = Number(tg?.viewportHeight || 0);
    const tgStableHeight = Number(tg?.viewportStableHeight || 0);
    return {
      width: Math.max(320, viewport?.width || window.innerWidth || document.documentElement.clientWidth || 320),
      height: Math.max(320, tgHeight || tgStableHeight || viewport?.height || window.innerHeight || document.documentElement.clientHeight || 520)
    };
  }

  function syncViewportSize() {
    const { height } = getViewportSize();
    document.documentElement.style.setProperty("--app-height", `${height}px`);
    resize();
  }

  function requestTelegramFullscreen() {
    if (!tg) return;
    try {
      tg.expand();
    } catch {
      // Older Telegram clients can ignore expand requests.
    }
    if (!canUseTelegramFullscreen || tg.isFullscreen) return;
    try {
      tg.requestFullscreen({ blur: false });
    } catch {
      try {
        tg.requestFullscreen();
      } catch {
        // Fullscreen is optional and can be unsupported on some Telegram Desktop builds.
      }
    }
  }

  function requestBrowserFullscreen() {
    const target = ui.app || document.documentElement;
    if (document.fullscreenElement || !document.fullscreenEnabled || typeof target.requestFullscreen !== "function") return;
    try {
      target.requestFullscreen({ navigationUI: "hide" }).catch(() => target.requestFullscreen().catch(() => {}));
    } catch {
      target.requestFullscreen().catch(() => {});
    }
  }

  function requestGameFullscreen() {
    requestTelegramFullscreen();
    requestBrowserFullscreen();
    window.setTimeout(syncViewportSize, 80);
    window.setTimeout(syncViewportSize, 260);
    window.setTimeout(syncViewportSize, 700);
  }

  if (tg) {
    tg.ready();
    requestTelegramFullscreen();
    if (typeof tg.onEvent === "function") {
      tg.onEvent("viewportChanged", syncViewportSize);
      tg.onEvent("fullscreenChanged", syncViewportSize);
      tg.onEvent("fullscreenFailed", syncViewportSize);
    }
    if (canUseTelegramColors) {
      tg.setHeaderColor("#1a1e27");
      tg.setBackgroundColor("#11141a");
    }
  }

  const trucks = [
    {
      id: "long",
      name: "VP Магистраль",
      meta: "длинный кузов · стартовая башня",
      hp: 150,
      armor: 2,
      speed: 172,
      weapon: "turret",
      colorA: "#7b1acb",
      colorB: "#d23ecf",
      accent: "#ffbe55",
      stat: "HP 150 · броня 2 · башня"
    },
    {
      id: "sprint",
      name: "VP Экспресс",
      meta: "быстрый фургон · боковые рейки",
      hp: 112,
      armor: 0,
      speed: 218,
      weapon: "side",
      colorA: "#1657e8",
      colorB: "#40d3ff",
      accent: "#56d9ff",
      stat: "HP 112 · скорость 218 · рейки"
    },
    {
      id: "block",
      name: "VP Бронеборт",
      meta: "тяжелая доставка · EMP-катушка",
      hp: 185,
      armor: 4,
      speed: 142,
      weapon: "emp",
      colorA: "#323a47",
      colorB: "#8d97a8",
      accent: "#5fe195",
      stat: "HP 185 · броня 4 · EMP"
    }
  ];

  const locations = [
    {
      id: "yard",
      name: "Складской двор",
      meta: "погрузочные полосы · открытые углы",
      stat: "широкая арена · ровный спавн",
      base: "#20242d",
      grid: "#303645",
      accent: "#b728d9",
      hazard: "#ffbe55"
    },
    {
      id: "road",
      name: "Лесная трасса",
      meta: "дорога доставки · плотные края",
      stat: "узкие обочины · быстрые стаи",
      base: "#15251c",
      grid: "#274336",
      accent: "#4dc986",
      hazard: "#f1d56b"
    }
  ];

  const droneTypes = [
    {
      id: "scout",
      name: "Легкий дрон",
      hp: 18,
      speed: 82,
      damage: 9,
      radius: 12,
      score: 8,
      coins: 2,
      color: "#65dcff"
    },
    {
      id: "carrier",
      name: "Грузовой дрон",
      hp: 44,
      speed: 58,
      damage: 13,
      radius: 16,
      score: 16,
      coins: 4,
      color: "#ffbe55"
    },
    {
      id: "sting",
      name: "Рой-перехватчик",
      hp: 15,
      speed: 118,
      damage: 7,
      radius: 10,
      score: 12,
      coins: 3,
      color: "#ff5e76"
    },
    {
      id: "shield",
      name: "Щитовой дрон",
      hp: 92,
      speed: 46,
      damage: 18,
      radius: 20,
      score: 34,
      coins: 7,
      color: "#b889ff"
    },
    {
      id: "command",
      name: "Командный дрон",
      hp: 260,
      speed: 38,
      damage: 26,
      radius: 31,
      score: 150,
      coins: 22,
      color: "#f5f7ff",
      boss: true
    }
  ];

  const bossTypes = [
    {
      id: "overlord",
      name: "Дрон-надзиратель",
      hp: 360,
      speed: 46,
      damage: 28,
      radius: 34,
      score: 220,
      coins: 34,
      color: "#f5f7ff",
      boss: true,
      bossKind: "overlord"
    },
    {
      id: "bulwark",
      name: "Щитовой крейсер",
      hp: 540,
      speed: 34,
      damage: 34,
      radius: 42,
      score: 320,
      coins: 46,
      color: "#b889ff",
      boss: true,
      bossKind: "bulwark"
    },
    {
      id: "hive",
      name: "Матка роя",
      hp: 470,
      speed: 42,
      damage: 30,
      radius: 39,
      score: 360,
      coins: 52,
      color: "#ffbe55",
      boss: true,
      bossKind: "hive"
    },
    {
      id: "reaper",
      name: "Красный перехватчик",
      hp: 430,
      speed: 68,
      damage: 31,
      radius: 33,
      score: 410,
      coins: 58,
      color: "#ff5e76",
      boss: true,
      bossKind: "reaper"
    }
  ];

  const upgradePool = [
    {
      id: "turret",
      title: "Кабинная башня",
      text: "Автотурель чаще фокусирует ближайшие цели.",
      baseCost: 12,
      apply(player) {
        player.weapons.turret += 1;
      }
    },
    {
      id: "side",
      title: "Боковые рейки",
      text: "Два ствола на бортах дают плотный залп.",
      baseCost: 14,
      apply(player) {
        player.weapons.side += 1;
      }
    },
    {
      id: "emp",
      title: "EMP-катушка",
      text: "Импульс вокруг кузова замедляет и добивает рой.",
      baseCost: 16,
      apply(player) {
        player.weapons.emp += 1;
      }
    },
    {
      id: "rockets",
      title: "Кассета ракет",
      text: "Редкие снаряды взрываются по площади.",
      baseCost: 18,
      apply(player) {
        player.weapons.rockets += 1;
      }
    },
    {
      id: "damage",
      title: "Калибровка стволов",
      text: "Все установленное оружие наносит больше урона.",
      baseCost: 13,
      apply(player) {
        player.damage *= 1.18;
      }
    },
    {
      id: "rate",
      title: "Быстрый привод",
      text: "Оружие быстрее возвращается в готовность.",
      baseCost: 13,
      apply(player) {
        player.fireRate *= 1.16;
      }
    },
    {
      id: "armor",
      title: "Листы брони",
      text: "Контактный урон от дронов становится ниже.",
      baseCost: 12,
      apply(player) {
        player.armor += 1;
      }
    },
    {
      id: "engine",
      title: "Форсированный мотор",
      text: "Грузовик быстрее выходит из окружения.",
      baseCost: 11,
      apply(player) {
        player.speed += 18;
      }
    },
    {
      id: "frame",
      title: "Усиленная рама",
      text: "Максимальная прочность растет, часть HP чинится.",
      baseCost: 15,
      apply(player) {
        player.maxHp += 24;
        player.hp = Math.min(player.maxHp, player.hp + 42);
      }
    },
    {
      id: "repair",
      title: "Срочный ремонт",
      text: "Восстанавливает большой кусок прочности.",
      baseCost: 9,
      apply(player) {
        player.hp = Math.min(player.maxHp, player.hp + 58);
      }
    }
  ];

  const weaponLabels = {
    turret: "Башня",
    side: "Рейки",
    emp: "EMP",
    rockets: "Ракеты"
  };

  const art = {
    maps: {
      yard: createArtImage("./assets/map-yard.png"),
      road: createArtImage("./assets/map-road.png")
    },
    trucks: {
      long: createArtImage("./assets/truck-long.png"),
      sprint: createArtImage("./assets/truck-sprint.png"),
      block: createArtImage("./assets/truck-block.png")
    },
    drones: {
      scout: createArtImage("./assets/drone-scout.png"),
      sting: createArtImage("./assets/drone-sting.png"),
      carrier: createArtImage("./assets/drone-carrier.png"),
      shield: createArtImage("./assets/drone-shield.png"),
      command: createArtImage("./assets/drone-boss.png"),
      boss: createArtImage("./assets/drone-boss.png")
    },
    weapons: {
      turret: createWeaponSprite("turret"),
      side: createWeaponSprite("side"),
      emp: createWeaponSprite("emp"),
      rockets: createWeaponSprite("rockets")
    },
    ammo: {
      bullet: createWeaponSprite("bullet"),
      rocket: createWeaponSprite("rocket"),
      casing: createWeaponSprite("casing")
    }
  };
  const weaponIconUrls = Object.fromEntries(
    Object.entries(art.weapons).map(([key, image]) => [key, image.toDataURL("image/png")])
  );

  const keys = new Set();
  const view = { w: 0, h: 0, dpr: 1 };
  const joystick = { active: false, id: null, x: 0, y: 0, originX: 0, originY: 0, max: 44 };
  const state = {
    mode: "setup",
    paused: false,
    selectedTruck: "long",
    selectedLocation: "yard",
    wave: 1,
    waveTime: 0,
    waveKills: 0,
    waveKillGoal: 18,
    spawnTimer: 0,
    bossSpawned: false,
    bossAlive: false,
    waveCleared: false,
    score: 0,
    coins: 0,
    kills: 0,
    best: Number(localStorage.getItem("vpTruckSurvivorsBest") || 0),
    lastShopBonus: 0,
    shopBought: false
  };

  let runStats = createRunStats();
  let player = null;
  let enemies = [];
  let projectiles = [];
  let particles = [];
  let pulses = [];
  let hazards = [];
  let tireMarks = [];
  let floaters = [];
  let muzzleFlashes = [];
  let decals = [];
  let bossBanner = null;
  let screenShake = 0;
  let nextEnemyId = 1;
  let lastFrame = performance.now();
  let animationTime = 0;
  let audioCtx = null;
  let audioMaster = null;
  const soundTimers = new Map();
  const musicTracks = [
    "./assets/music/sand-and-chrome-1.mp3",
    "./assets/music/sand-and-chrome-2.mp3"
  ];
  let musicAudio = null;
  let musicTrackIndex = 0;
  let musicFadeTimer = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function choose(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function ensureAudio() {
    if (audioCtx) {
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      return;
    }
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    audioCtx = new AudioContextCtor();
    audioMaster = audioCtx.createGain();
    audioMaster.gain.value = 0.42;
    audioMaster.connect(audioCtx.destination);
  }

  function canPlaySound(key, gap = 0.035) {
    if (!audioCtx || !audioMaster) return false;
    const now = audioCtx.currentTime;
    const previous = soundTimers.get(key) || 0;
    if (now - previous < gap) return false;
    soundTimers.set(key, now);
    return true;
  }

  function tone(freq, duration, type = "sine", gain = 0.08, delay = 0, endFreq = null) {
    if (!audioCtx || !audioMaster) return;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    const now = audioCtx.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
    const attack = Math.min(0.028, Math.max(0.01, duration * 0.24));
    const releaseAt = Math.max(now + attack + 0.01, now + duration - attack);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + attack);
    amp.gain.setValueAtTime(gain, releaseAt);
    amp.gain.linearRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp);
    amp.connect(audioMaster);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noise(duration, gain = 0.08, delay = 0, filterFreq = 900) {
    if (!audioCtx || !audioMaster) return;
    const sampleCount = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      channel[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }
    const source = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const amp = audioCtx.createGain();
    const now = audioCtx.currentTime + delay;
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFreq, now);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(audioMaster);
    source.start(now);
  }

  function playSound(name, intensity = 1) {
    if (!audioCtx || !audioMaster) return;
    const power = clamp(intensity, 0.2, 1.8);
    if (name === "shoot" && canPlaySound("shoot", 0.22)) {
      tone(540, 0.12, "triangle", 0.018 * power, 0, 420);
    } else if (name === "side" && canPlaySound("side", 0.24)) {
      tone(430, 0.11, "triangle", 0.016 * power, 0, 340);
    } else if (name === "rocket" && canPlaySound("rocket", 0.12)) {
      tone(155, 0.18, "sawtooth", 0.07 * power, 0, 72);
      noise(0.16, 0.045 * power, 0, 580);
    } else if (name === "explosion" && canPlaySound("explosion", 0.09)) {
      tone(78, 0.34, "sine", 0.12 * power, 0, 38);
      noise(0.28, 0.12 * power, 0, 520);
    } else if (name === "emp" && canPlaySound("emp", 0.26)) {
      tone(220, 0.22, "sine", 0.07 * power, 0, 660);
      tone(980, 0.12, "triangle", 0.035 * power, 0.03, 440);
      noise(0.16, 0.03 * power, 0, 3400);
    } else if (name === "hit") {
      return;
    } else if (name === "damage" && canPlaySound("damage", 0.12)) {
      tone(92, 0.2, "sawtooth", 0.085 * power, 0, 58);
      noise(0.12, 0.04 * power, 0, 700);
    } else if (name === "upgrade" && canPlaySound("upgrade", 0.16)) {
      tone(420, 0.08, "triangle", 0.06 * power);
      tone(680, 0.11, "triangle", 0.055 * power, 0.07);
      tone(920, 0.13, "triangle", 0.045 * power, 0.15);
    } else if (name === "gameover" && canPlaySound("gameover", 0.4)) {
      tone(180, 0.18, "sawtooth", 0.08 * power);
      tone(110, 0.32, "sine", 0.08 * power, 0.16, 58);
    }
  }

  function startBackgroundMusic() {
    ensureAudio();
    ensureMusicAudio();
    if (!musicAudio) return;
    if (!musicAudio.src) loadMusicTrack(musicTrackIndex);
    musicAudio.loop = false;
    musicAudio.play()
      .then(() => fadeMusicTo(0.48, 900))
      .catch(() => {});
  }

  function stopBackgroundMusic() {
    if (!musicAudio) return;
    fadeMusicTo(0, 320, () => {
      musicAudio.pause();
      musicAudio.currentTime = 0;
      musicTrackIndex = 0;
      loadMusicTrack(musicTrackIndex);
    });
  }

  function setMusicPaused(paused) {
    ensureMusicAudio();
    if (!musicAudio) return;
    if (paused) {
      fadeMusicTo(0, 220, () => musicAudio.pause());
      return;
    }
    if (!musicAudio.src) loadMusicTrack(musicTrackIndex);
    musicAudio.play()
      .then(() => fadeMusicTo(0.48, 450))
      .catch(() => {});
  }

  function ensureMusicAudio() {
    if (musicAudio) return;
    musicAudio = new Audio();
    musicAudio.preload = "auto";
    musicAudio.volume = 0;
    musicAudio.addEventListener("ended", playNextMusicTrack);
    musicAudio.addEventListener("error", () => {
      musicTrackIndex = (musicTrackIndex + 1) % musicTracks.length;
      if (state.mode !== "setup" && state.mode !== "gameover" && !state.paused) {
        loadMusicTrack(musicTrackIndex);
        musicAudio.play().catch(() => {});
      }
    });
  }

  function loadMusicTrack(index) {
    if (!musicAudio) return;
    musicAudio.src = musicTracks[index % musicTracks.length];
    musicAudio.load();
  }

  function playNextMusicTrack() {
    if (!musicAudio || state.mode === "setup" || state.mode === "gameover") return;
    musicTrackIndex = (musicTrackIndex + 1) % musicTracks.length;
    loadMusicTrack(musicTrackIndex);
    musicAudio.volume = 0.48;
    if (!state.paused) musicAudio.play().catch(() => {});
  }

  function fadeMusicTo(targetVolume, duration = 500, onDone = null) {
    if (!musicAudio) return;
    if (musicFadeTimer) {
      window.clearInterval(musicFadeTimer);
      musicFadeTimer = null;
    }
    const startVolume = musicAudio.volume;
    const startedAt = performance.now();
    const target = clamp(targetVolume, 0, 1);
    musicFadeTimer = window.setInterval(() => {
      const progress = clamp((performance.now() - startedAt) / Math.max(1, duration), 0, 1);
      musicAudio.volume = startVolume + (target - startVolume) * progress;
      if (progress >= 1) {
        window.clearInterval(musicFadeTimer);
        musicFadeTimer = null;
        if (onDone) onDone();
      }
    }, 40);
  }

  function createArtImage(src) {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    return image;
  }

  function isArtReady(image) {
    return Boolean(image?.complete && image.naturalWidth > 0);
  }

  function spriteRoundRect(spriteCtx, x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    spriteCtx.beginPath();
    spriteCtx.moveTo(x + radius, y);
    spriteCtx.lineTo(x + w - radius, y);
    spriteCtx.quadraticCurveTo(x + w, y, x + w, y + radius);
    spriteCtx.lineTo(x + w, y + h - radius);
    spriteCtx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    spriteCtx.lineTo(x + radius, y + h);
    spriteCtx.quadraticCurveTo(x, y + h, x, y + h - radius);
    spriteCtx.lineTo(x, y + radius);
    spriteCtx.quadraticCurveTo(x, y, x + radius, y);
    spriteCtx.closePath();
  }

  function createSprite(width, height, drawSprite) {
    const sprite = document.createElement("canvas");
    sprite.width = width;
    sprite.height = height;
    const spriteCtx = sprite.getContext("2d");
    spriteCtx.imageSmoothingEnabled = true;
    drawSprite(spriteCtx, width, height);
    return sprite;
  }

  function createWeaponSprite(kind) {
    return createSprite(96, 96, (spriteCtx, width, height) => {
      const cx = width / 2;
      const cy = height / 2;
      spriteCtx.clearRect(0, 0, width, height);
      spriteCtx.save();
      spriteCtx.translate(cx, cy);
      spriteCtx.shadowColor = "rgba(0, 0, 0, 0.48)";
      spriteCtx.shadowBlur = 12;
      spriteCtx.shadowOffsetY = 5;

      if (kind === "turret") {
        const metal = spriteCtx.createLinearGradient(-32, -24, 36, 26);
        metal.addColorStop(0, "#edf7ff");
        metal.addColorStop(0.3, "#57dfff");
        metal.addColorStop(1, "#142335");
        spriteCtx.fillStyle = "#0b1018";
        spriteCtx.beginPath();
        spriteCtx.arc(-6, 0, 23, 0, Math.PI * 2);
        spriteCtx.fill();
        spriteCtx.strokeStyle = "#56d9ff";
        spriteCtx.lineWidth = 5;
        spriteCtx.stroke();
        spriteCtx.fillStyle = metal;
        spriteRoundRect(spriteCtx, 4, -8, 48, 16, 8);
        spriteCtx.fill();
        spriteCtx.fillStyle = "#f5fbff";
        spriteRoundRect(spriteCtx, 40, -5, 16, 10, 5);
        spriteCtx.fill();
        spriteCtx.fillStyle = "#ffbe55";
        spriteCtx.beginPath();
        spriteCtx.moveTo(57, 0);
        spriteCtx.lineTo(72, -9);
        spriteCtx.lineTo(72, 9);
        spriteCtx.closePath();
        spriteCtx.fill();
      } else if (kind === "side") {
        const rail = spriteCtx.createLinearGradient(-36, -16, 38, 18);
        rail.addColorStop(0, "#fff2bf");
        rail.addColorStop(0.42, "#ffbe55");
        rail.addColorStop(1, "#563017");
        spriteCtx.fillStyle = rail;
        spriteRoundRect(spriteCtx, -38, -19, 76, 12, 6);
        spriteCtx.fill();
        spriteRoundRect(spriteCtx, -38, 7, 76, 12, 6);
        spriteCtx.fill();
        spriteCtx.fillStyle = "#11151e";
        for (let i = -26; i <= 26; i += 18) {
          spriteRoundRect(spriteCtx, i, -15, 10, 4, 2);
          spriteCtx.fill();
          spriteRoundRect(spriteCtx, i, 11, 10, 4, 2);
          spriteCtx.fill();
        }
        spriteCtx.strokeStyle = "rgba(255, 255, 255, 0.62)";
        spriteCtx.lineWidth = 2;
        spriteCtx.beginPath();
        spriteCtx.moveTo(-31, -20);
        spriteCtx.lineTo(31, -20);
        spriteCtx.moveTo(-31, 6);
        spriteCtx.lineTo(31, 6);
        spriteCtx.stroke();
      } else if (kind === "emp") {
        const coil = spriteCtx.createRadialGradient(0, 0, 4, 0, 0, 36);
        coil.addColorStop(0, "#f6ffff");
        coil.addColorStop(0.34, "#70f6ff");
        coil.addColorStop(1, "#122d3c");
        spriteCtx.fillStyle = "#081019";
        spriteCtx.beginPath();
        spriteCtx.arc(0, 0, 31, 0, Math.PI * 2);
        spriteCtx.fill();
        spriteCtx.strokeStyle = coil;
        spriteCtx.lineWidth = 7;
        for (let r = 10; r <= 31; r += 10) {
          spriteCtx.beginPath();
          spriteCtx.arc(0, 0, r, 0.18, Math.PI * 1.8);
          spriteCtx.stroke();
        }
        spriteCtx.strokeStyle = "#ffffff";
        spriteCtx.lineWidth = 2;
        spriteCtx.beginPath();
        spriteCtx.moveTo(-34, -4);
        spriteCtx.lineTo(-18, -14);
        spriteCtx.lineTo(-5, -2);
        spriteCtx.lineTo(10, -16);
        spriteCtx.lineTo(29, -5);
        spriteCtx.stroke();
      } else if (kind === "rockets") {
        for (const y of [-13, 13]) {
          const rocket = spriteCtx.createLinearGradient(-35, y - 8, 35, y + 8);
          rocket.addColorStop(0, "#24151a");
          rocket.addColorStop(0.42, "#ff7f5c");
          rocket.addColorStop(1, "#fff0c9");
          spriteCtx.fillStyle = rocket;
          spriteRoundRect(spriteCtx, -38, y - 8, 58, 16, 8);
          spriteCtx.fill();
          spriteCtx.fillStyle = "#ffbe55";
          spriteCtx.beginPath();
          spriteCtx.moveTo(19, y - 10);
          spriteCtx.lineTo(42, y);
          spriteCtx.lineTo(19, y + 10);
          spriteCtx.closePath();
          spriteCtx.fill();
          spriteCtx.fillStyle = "#10131a";
          spriteCtx.fillRect(-39, y - 9, 8, 18);
        }
      } else if (kind === "bullet") {
        const bullet = spriteCtx.createLinearGradient(-34, -9, 35, 10);
        bullet.addColorStop(0, "#2b1c0d");
        bullet.addColorStop(0.22, "#ffbe55");
        bullet.addColorStop(0.7, "#f6fbff");
        bullet.addColorStop(1, "#56d9ff");
        spriteCtx.rotate(-0.12);
        spriteCtx.fillStyle = bullet;
        spriteRoundRect(spriteCtx, -34, -8, 54, 16, 8);
        spriteCtx.fill();
        spriteCtx.beginPath();
        spriteCtx.moveTo(18, -9);
        spriteCtx.lineTo(39, 0);
        spriteCtx.lineTo(18, 9);
        spriteCtx.closePath();
        spriteCtx.fill();
      } else if (kind === "rocket") {
        const body = spriteCtx.createLinearGradient(-34, -14, 38, 14);
        body.addColorStop(0, "#2a1514");
        body.addColorStop(0.38, "#ff7f5c");
        body.addColorStop(0.74, "#ffe0a6");
        body.addColorStop(1, "#ffffff");
        spriteCtx.fillStyle = body;
        spriteRoundRect(spriteCtx, -34, -11, 54, 22, 9);
        spriteCtx.fill();
        spriteCtx.fillStyle = "#ffbe55";
        spriteCtx.beginPath();
        spriteCtx.moveTo(20, -13);
        spriteCtx.lineTo(44, 0);
        spriteCtx.lineTo(20, 13);
        spriteCtx.closePath();
        spriteCtx.fill();
        spriteCtx.fillStyle = "#10131a";
        spriteCtx.fillRect(-36, -12, 9, 24);
      } else if (kind === "casing") {
        const brass = spriteCtx.createLinearGradient(-18, -10, 22, 10);
        brass.addColorStop(0, "#7a4617");
        brass.addColorStop(0.4, "#ffbe55");
        brass.addColorStop(1, "#fff1b4");
        spriteCtx.rotate(0.38);
        spriteCtx.fillStyle = brass;
        spriteRoundRect(spriteCtx, -20, -8, 40, 16, 5);
        spriteCtx.fill();
        spriteCtx.strokeStyle = "#5d3515";
        spriteCtx.lineWidth = 3;
        spriteCtx.beginPath();
        spriteCtx.moveTo(-10, -8);
        spriteCtx.lineTo(-10, 8);
        spriteCtx.stroke();
      }

      spriteCtx.restore();
    });
  }

  function createRunStats() {
    return {
      startedAt: performance.now(),
      finishedAt: 0,
      durationSeconds: 0,
      distance: 0,
      shotsFired: 0,
      bulletsFired: 0,
      rocketsFired: 0,
      empCasts: 0,
      damageDealt: 0,
      damageTaken: 0,
      hitsTaken: 0,
      coinsEarned: 0,
      coinsSpent: 0,
      serviceBonuses: 0,
      wavesCleared: 0,
      bossesKilled: 0,
      killsByType: {},
      bossKills: {},
      upgrades: []
    };
  }

  function finishRunStats() {
    if (!runStats.finishedAt) runStats.finishedAt = performance.now();
    runStats.durationSeconds = Math.max(0, Math.round((runStats.finishedAt - runStats.startedAt) / 1000));
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${minutes}:${String(rest).padStart(2, "0")}`;
  }

  function formatNumber(value) {
    return String(Math.round(Number(value) || 0));
  }

  function getEnemyTypeName(id) {
    return [...droneTypes, ...bossTypes].find((enemy) => enemy.id === id)?.name || id;
  }

  function summarizeKillsByType(limit = 3) {
    const entries = Object.entries(runStats.killsByType)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    if (!entries.length) return "нет";
    return entries.map(([id, count]) => `${getEnemyTypeName(id)}: ${count}`).join(" · ");
  }

  function snapshotRunStats() {
    const now = runStats.finishedAt || performance.now();
    const durationSeconds = Math.max(0, Math.round((now - runStats.startedAt) / 1000));
    return {
      durationSeconds,
      duration: formatDuration(durationSeconds),
      distance: Math.round(runStats.distance),
      shotsFired: runStats.shotsFired,
      bulletsFired: runStats.bulletsFired,
      rocketsFired: runStats.rocketsFired,
      empCasts: runStats.empCasts,
      damageDealt: Math.round(runStats.damageDealt),
      damageTaken: Math.round(runStats.damageTaken),
      hitsTaken: runStats.hitsTaken,
      coinsEarned: Math.round(runStats.coinsEarned),
      coinsSpent: Math.round(runStats.coinsSpent),
      serviceBonuses: Math.round(runStats.serviceBonuses),
      wavesCleared: runStats.wavesCleared,
      bossesKilled: runStats.bossesKilled,
      killsByType: { ...runStats.killsByType },
      bossKills: { ...runStats.bossKills },
      upgrades: runStats.upgrades.slice(-12)
    };
  }

  function renderFinalStats() {
    if (!ui.finalStats) return;
    const stats = snapshotRunStats();
    const upgrades = stats.upgrades.length
      ? stats.upgrades.map((upgrade) => upgrade.title).slice(-3).join(" · ")
      : "без покупок";
    ui.finalStats.classList.remove("hidden");
    ui.finalStats.innerHTML = [
      ["Время", stats.duration],
      ["Зачищено волн", formatNumber(stats.wavesCleared)],
      ["Урон нанесен", formatNumber(stats.damageDealt)],
      ["Урон получен", `${formatNumber(stats.damageTaken)} / ${formatNumber(stats.hitsTaken)} ударов`],
      ["Выстрелы", `${formatNumber(stats.shotsFired)} · ракет ${formatNumber(stats.rocketsFired)} · EMP ${formatNumber(stats.empCasts)}`],
      ["Детали", `+${formatNumber(stats.coinsEarned)} / -${formatNumber(stats.coinsSpent)}`],
      ["Боссы", formatNumber(stats.bossesKilled)],
      ["Топ целей", summarizeKillsByType()],
      ["Апгрейды", upgrades],
      ["Дистанция", `${formatNumber(stats.distance)} м`]
    ].map(([label, value]) => `<div class="stat-line"><small>${label}</small><b>${value}</b></div>`).join("");
  }

  function buildResultPayload() {
    const stats = snapshotRunStats();
    const truck = getTruck();
    const location = getLocation();
    return {
      type: "vp_truck_survivors_result",
      event: "complete",
      progress: 100,
      game: "vp_truck_survivors",
      score: state.score,
      wave: state.wave,
      kills: state.kills,
      truck: state.selectedTruck,
      truckName: truck.name,
      location: state.selectedLocation,
      locationName: location.name,
      stats
    };
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function isBossWave(wave = state.wave) {
    return wave % 3 === 0;
  }

  function getWaveKillGoal(wave = state.wave) {
    const locationBonus = state.selectedLocation === "road" ? 2 : 0;
    return 13 + wave * 4 + locationBonus + (isBossWave(wave) ? 1 : 0);
  }

  function getWaveQuotaBeforeBoss() {
    return isBossWave() ? Math.max(1, state.waveKillGoal - 1) : state.waveKillGoal;
  }

  function getBossForWave(wave = state.wave) {
    return bossTypes[Math.floor((wave / 3 - 1) % bossTypes.length)];
  }

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const { width, height } = getViewportSize();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = Math.max(320, width || rect.width);
    view.h = Math.max(320, height || rect.height);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (player) {
      player.x = clamp(player.x, 34, view.w - 34);
      player.y = clamp(player.y, 34, view.h - 34);
    }
  }

  function getTruck() {
    return trucks.find((truck) => truck.id === state.selectedTruck) || trucks[0];
  }

  function getLocation() {
    return locations.find((location) => location.id === state.selectedLocation) || locations[0];
  }

  function renderSetupChoices() {
    ui.truckChoices.innerHTML = "";
    trucks.forEach((truck) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `choice-card${truck.id === state.selectedTruck ? " selected" : ""}`;
      button.dataset.truck = truck.id;
      button.innerHTML = `<strong>${truck.name}</strong><span>${truck.meta}</span>`;
      button.addEventListener("click", () => {
        state.selectedTruck = truck.id;
        renderSetupChoices();
        updateSelectionText();
        lightHaptic();
      });
      ui.truckChoices.appendChild(button);
    });

    ui.locationChoices.innerHTML = "";
    locations.forEach((location) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `choice-card${location.id === state.selectedLocation ? " selected" : ""}`;
      button.dataset.location = location.id;
      button.innerHTML = `<strong>${location.name}</strong><span>${location.meta}</span>`;
      button.addEventListener("click", () => {
        state.selectedLocation = location.id;
        renderSetupChoices();
        updateSelectionText();
        lightHaptic();
      });
      ui.locationChoices.appendChild(button);
    });
  }

  function updateSelectionText() {
    ui.truckStatLine.textContent = getTruck().stat;
    ui.locationStatLine.textContent = getLocation().stat;
    ui.locationLabel.textContent = getLocation().name;
  }

  function makePlayer() {
    const truck = getTruck();
    const weapons = { turret: 0, side: 0, emp: 0, rockets: 0 };
    weapons[truck.weapon] = 1;
    return {
      x: view.w / 2,
      y: view.h / 2,
      r: 27,
      angle: -Math.PI / 2,
      maxHp: truck.hp,
      hp: truck.hp,
      armor: truck.armor,
      speed: truck.speed,
      damage: 1,
      fireRate: 1,
      weapons,
      cooldowns: { turret: 0.15, side: 0.2, emp: 0.9, rockets: 1.2 },
      truck
    };
  }

  function startGame() {
    ensureAudio();
    requestGameFullscreen();
    startBackgroundMusic();
    resize();
    runStats = createRunStats();
    player = makePlayer();
    enemies = [];
    projectiles = [];
    particles = [];
    pulses = [];
    hazards = [];
    tireMarks = [];
    floaters = [];
    muzzleFlashes = [];
    decals = [];
    bossBanner = null;
    screenShake = 0;
    nextEnemyId = 1;
    Object.assign(state, {
      mode: "playing",
      paused: false,
      wave: 1,
      waveTime: 0,
      waveKills: 0,
      waveKillGoal: getWaveKillGoal(1),
      spawnTimer: 0.35,
      bossSpawned: false,
      bossAlive: false,
      waveCleared: false,
      score: 0,
      coins: 0,
      kills: 0,
      lastShopBonus: 0,
      shopBought: false
    });
    ui.setupPanel.classList.add("hidden");
    ui.upgradePanel.classList.add("hidden");
    ui.gameOverPanel.classList.add("hidden");
    ui.finalStats?.classList.add("hidden");
    if (ui.finalStats) ui.finalStats.innerHTML = "";
    ui.pauseButton.textContent = "II";
    updateSelectionText();
    updateHud();
    lightHaptic();
  }

  function beginWave() {
    resetJoystick();
    state.mode = "playing";
    state.paused = false;
    state.waveTime = 0;
    state.waveKills = 0;
    state.waveKillGoal = getWaveKillGoal(state.wave);
    state.spawnTimer = 0.45;
    state.bossSpawned = false;
    state.bossAlive = false;
    state.waveCleared = false;
    state.shopBought = false;
    enemies = [];
    projectiles = [];
    pulses = [];
    hazards = [];
    muzzleFlashes = [];
    bossBanner = null;
    ui.upgradePanel.classList.add("hidden");
    ui.pauseButton.textContent = "II";
    updateHud();
    setMusicPaused(false);
  }

  function openShop() {
    resetJoystick();
    setMusicPaused(false);
    const bossBonus = isBossWave() ? 14 + state.wave * 2 : 0;
    const bonus = 8 + state.wave * 4 + Math.floor(player.hp / player.maxHp * 5) + bossBonus;
    state.coins += bonus;
    runStats.coinsEarned += bonus;
    runStats.serviceBonuses += bonus;
    runStats.wavesCleared += 1;
    state.lastShopBonus = bonus;
    state.mode = "shop";
    state.paused = false;
    enemies = [];
    projectiles = [];
    pulses = [];
    hazards = [];
    muzzleFlashes = [];
    bossBanner = null;
    ui.shopSubtitle.textContent = `Волна ${state.wave} закрыта`;
    ui.shopSummary.textContent = `Бонус сервиса: ${bonus} деталей · всего: ${state.coins}`;
    renderUpgradeChoices();
    ui.upgradePanel.classList.remove("hidden");
    updateHud();
    playSound("upgrade", 0.85);
    mediumHaptic();
  }

  function renderUpgradeChoices() {
    const pool = [...upgradePool].sort(() => Math.random() - 0.5).slice(0, 3);
    ui.upgradeChoices.innerHTML = "";
    ui.continueButton.disabled = false;
    pool.forEach((upgrade) => {
      const price = Math.round(upgrade.baseCost + state.wave * 3 + Math.random() * 4);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-card";
      button.disabled = state.shopBought || state.coins < price;
      button.innerHTML = `<strong>${upgrade.title}</strong><span>${upgrade.text}</span><em>${price} деталей</em>`;
      button.addEventListener("click", () => {
        if (state.shopBought || state.coins < price) return;
        state.coins -= price;
        runStats.coinsSpent += price;
        runStats.upgrades.push({ id: upgrade.id, title: upgrade.title, price, wave: state.wave });
        state.shopBought = true;
        upgrade.apply(player);
        addFloater(player.x, player.y - 46, upgrade.title, "#ffbe55");
        renderUpgradeChoices();
        updateHud();
        playSound("upgrade");
        mediumHaptic();
      });
      ui.upgradeChoices.appendChild(button);
    });
  }

  function gameOver() {
    resetJoystick();
    stopBackgroundMusic();
    finishRunStats();
    state.mode = "gameover";
    state.paused = false;
    state.best = Math.max(state.best, state.score);
    localStorage.setItem("vpTruckSurvivorsBest", String(state.best));
    ui.finalScore.textContent = String(state.score);
    ui.finalWave.textContent = String(state.wave);
    ui.finalKills.textContent = String(state.kills);
    ui.bestScore.textContent = String(state.best);
    renderFinalStats();
    ui.gameOverPanel.classList.remove("hidden");
    ui.sendScoreButton.classList.toggle("hidden", !tg);
    updateHud();
    playSound("gameover");
    if (canUseHaptics) tg.HapticFeedback.notificationOccurred("error");
  }

  function togglePause() {
    if (state.mode !== "playing") return;
    state.paused = !state.paused;
    ui.pauseButton.textContent = state.paused ? ">" : "II";
    setMusicPaused(state.paused);
    if (state.paused) resetJoystick();
    lightHaptic();
  }

  function getMoveVector() {
    let x = joystick.x;
    let y = joystick.y;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) x -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) x += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) y -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y, len };
  }

  function update(dt) {
    animationTime += dt;
    updateParticles(dt);
    if (state.mode !== "playing" || state.paused || !player) return;

    state.waveTime += dt;
    updateHazards(dt);
    if (state.mode !== "playing") return;
    const move = getMoveVector();
    if (move.len > 0.06) {
      const stepX = move.x * player.speed * dt;
      const stepY = move.y * player.speed * dt;
      player.x += stepX;
      player.y += stepY;
      runStats.distance += Math.hypot(stepX, stepY);
      player.angle = Math.atan2(move.y, move.x);
      if (Math.random() < dt * 18) addTireMark();
      if (Math.random() < dt * 12) addExhaust();
    } else {
      const target = nearestEnemy(player.x, player.y);
      if (target) player.angle = Math.atan2(target.y - player.y, target.x - player.x);
    }
    player.x = clamp(player.x, 34, view.w - 34);
    player.y = clamp(player.y, 34, view.h - 34);

    updateWeapons(dt);
    updateProjectiles(dt);
    if (state.mode !== "playing") return;
    if (state.waveCleared) {
      openShop();
      return;
    }
    updateEnemies(dt);
    if (state.mode !== "playing") return;
    if (state.waveCleared) {
      openShop();
      return;
    }
    updateSpawning(dt);
    updateHud();
  }

  function addTireMark() {
    const rearX = player.x - Math.cos(player.angle) * 30;
    const rearY = player.y - Math.sin(player.angle) * 30;
    const sideX = Math.cos(player.angle + Math.PI / 2) * 16;
    const sideY = Math.sin(player.angle + Math.PI / 2) * 16;
    tireMarks.push({
      x1: rearX + sideX,
      y1: rearY + sideY,
      x2: rearX - sideX,
      y2: rearY - sideY,
      angle: player.angle,
      life: 2.2,
      maxLife: 2.2
    });
    if (tireMarks.length > 90) tireMarks.shift();
  }

  function addExhaust() {
    const rearX = player.x - Math.cos(player.angle) * 43;
    const rearY = player.y - Math.sin(player.angle) * 43;
    const life = random(0.45, 0.8);
    particles.push({
      kind: "smoke",
      x: rearX + random(-4, 4),
      y: rearY + random(-4, 4),
      vx: -Math.cos(player.angle) * random(18, 42) + random(-10, 10),
      vy: -Math.sin(player.angle) * random(18, 42) + random(-10, 10),
      size: random(7, 13),
      color: "rgba(188, 198, 214, 0.55)",
      life,
      maxLife: life
    });
  }

  function addHazard(x, y, radius, delay, life, damage, color) {
    hazards.push({
      x: clamp(x, 42, view.w - 42),
      y: clamp(y, 42, view.h - 42),
      radius,
      delay,
      maxDelay: delay,
      life,
      maxLife: life,
      damage,
      color,
      hit: false
    });
  }

  function updateHazards(dt) {
    for (const hazard of hazards) {
      if (hazard.delay > 0) {
        hazard.delay -= dt;
        continue;
      }

      hazard.life -= dt;
      if (!hazard.hit && player && Math.hypot(player.x - hazard.x, player.y - hazard.y) <= hazard.radius + player.r * 0.4) {
        hazard.hit = true;
        damagePlayer(hazard.damage);
      }
    }
    hazards = hazards.filter((hazard) => hazard.delay > 0 || hazard.life > 0);
  }

  function updateSpawning(dt) {
    if (state.waveCleared) return;
    const quotaBeforeBoss = getWaveQuotaBeforeBoss();
    if (isBossWave() && !state.bossSpawned && state.waveKills >= quotaBeforeBoss) {
      spawnBoss();
      return;
    }
    if (state.waveKills >= quotaBeforeBoss) return;

    state.spawnTimer -= dt;
    while (state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer += getSpawnInterval();
    }
  }

  function getSpawnInterval() {
    const base = state.selectedLocation === "road" ? 0.82 : 0.95;
    return Math.max(0.22, base - state.wave * 0.065 - state.waveTime * 0.004);
  }

  function spawnBoss() {
    const bossType = getBossForWave();
    state.bossSpawned = true;
    state.bossAlive = true;
    const boss = spawnEnemy(bossType.id);
    if (!boss) return;
    bossBanner = { text: boss.name, color: boss.color, life: 2.2, maxLife: 2.2 };
    addFloater(view.w / 2, 132, boss.name, boss.color);
    screenShake = Math.max(screenShake, 7);
    mediumHaptic();
  }

  function pickDroneType() {
    const wave = state.wave;
    const roll = Math.random();
    if (wave >= 4 && roll > 0.88) return droneTypes[3];
    if (wave >= 2 && roll > 0.66) return droneTypes[1];
    if (wave >= 3 && roll < 0.22) return droneTypes[2];
    return droneTypes[0];
  }

  function spawnEnemy(forceType) {
    const type = forceType ? [...droneTypes, ...bossTypes].find((drone) => drone.id === forceType) : pickDroneType();
    if (!type) return null;
    const side = Math.floor(Math.random() * 4);
    const margin = type.boss ? 96 : 58;
    let x = random(-margin, view.w + margin);
    let y = random(-margin, view.h + margin);
    if (side === 0) y = -margin;
    if (side === 1) x = view.w + margin;
    if (side === 2) y = view.h + margin;
    if (side === 3) x = -margin;

    const hpScale = type.boss ? 1 + (state.wave - 3) * 0.22 : 1 + (state.wave - 1) * 0.18;
    const speedScale = type.boss ? 1 + Math.min(0.22, (state.wave - 3) * 0.018) : 1 + Math.min(0.32, (state.wave - 1) * 0.025);
    const enemy = {
      id: nextEnemyId++,
      type: type.id,
      name: type.name,
      x,
      y,
      r: type.radius,
      hp: type.hp * hpScale,
      maxHp: type.hp * hpScale,
      speed: type.speed * speedScale,
      damage: type.damage + state.wave * 0.7,
      score: Math.round(type.score * hpScale),
      coins: type.coins + Math.floor(state.wave / 3),
      color: type.color,
      boss: Boolean(type.boss),
      bossKind: type.bossKind || null,
      angle: 0,
      hitCooldown: 0,
      slow: 0,
      attackTimer: type.boss ? 1.2 : 0,
      summonTimer: type.boss ? 2.8 : 0,
      chargeTime: 0,
      chargeAngle: 0,
      wobble: random(0, Math.PI * 2)
    };
    enemies.push(enemy);
    return enemy;
  }

  function updateBoss(enemy, dt) {
    enemy.attackTimer -= dt;
    enemy.summonTimer -= dt;
    enemy.chargeTime = Math.max(0, enemy.chargeTime - dt);

    if (enemy.summonTimer <= 0 && enemy.bossKind === "hive") {
      for (let i = 0; i < 4; i += 1) {
        const minion = spawnEnemy(i % 2 ? "sting" : "scout");
        if (minion) {
          minion.x = enemy.x + random(-42, 42);
          minion.y = enemy.y + random(-42, 42);
          minion.hp *= 0.72;
          minion.maxHp = minion.hp;
        }
      }
      addFloater(enemy.x, enemy.y - enemy.r - 22, "рой", enemy.color);
      enemy.summonTimer = 4.8;
    }

    if (enemy.attackTimer > 0) return;

    if (enemy.bossKind === "bulwark") {
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 / 8) * i + animationTime * 0.18;
        addHazard(enemy.x + Math.cos(angle) * 118, enemy.y + Math.sin(angle) * 118, 38, 0.82, 0.36, enemy.damage, enemy.color);
      }
      enemy.attackTimer = 3.4;
      return;
    }

    if (enemy.bossKind === "reaper") {
      enemy.chargeAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      enemy.chargeTime = 0.62;
      for (let i = 1; i <= 4; i += 1) {
        addHazard(enemy.x + Math.cos(enemy.chargeAngle) * i * 58, enemy.y + Math.sin(enemy.chargeAngle) * i * 58, 30, 0.42 + i * 0.05, 0.28, enemy.damage + 4, enemy.color);
      }
      enemy.attackTimer = 2.65;
      return;
    }

    const rings = enemy.bossKind === "hive" ? 4 : 3;
    for (let i = 0; i < rings; i += 1) {
      const offset = i === 0 ? 0 : random(48, 130);
      const angle = random(0, Math.PI * 2);
      addHazard(player.x + Math.cos(angle) * offset, player.y + Math.sin(angle) * offset, 34 + i * 6, 0.72 + i * 0.12, 0.32, enemy.damage, enemy.color);
    }
    enemy.attackTimer = enemy.bossKind === "hive" ? 2.8 : 2.35;
  }

  function updateEnemies(dt) {
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);
      enemy.slow = Math.max(0, enemy.slow - dt);
      if (enemy.boss) updateBoss(enemy, dt);
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      const slowFactor = enemy.slow > 0 ? 0.42 : 1;
      enemy.angle = Math.atan2(dy, dx);
      const moveAngle = enemy.chargeTime > 0 ? enemy.chargeAngle : enemy.angle;
      const chargeBoost = enemy.chargeTime > 0 ? 3.2 : 1;
      enemy.x += Math.cos(moveAngle) * enemy.speed * slowFactor * chargeBoost * dt;
      enemy.y += Math.sin(moveAngle) * enemy.speed * slowFactor * chargeBoost * dt;

      const contact = enemy.r + player.r - len;
      if (contact > 0 && enemy.hitCooldown <= 0) {
        damagePlayer(enemy.damage);
        enemy.hitCooldown = 0.62;
        enemy.x -= (dx / len) * (18 + contact);
        enemy.y -= (dy / len) * (18 + contact);
      }
    }
    enemies = enemies.filter((enemy) => !enemy.dead);
  }

  function updateWeapons(dt) {
    Object.keys(player.cooldowns).forEach((key) => {
      player.cooldowns[key] = Math.max(0, player.cooldowns[key] - dt);
    });

    const target = nearestEnemy(player.x, player.y);
    if (!target) return;
    const angle = Math.atan2(target.y - player.y, target.x - player.x);

    if (player.weapons.turret > 0 && player.cooldowns.turret <= 0) {
      const level = player.weapons.turret;
      const source = mountPoint(angle, 15, 0);
      fireBullet(source.x, source.y, angle, 390, (12 + level * 5) * player.damage, 4, "#56d9ff", level > 3 ? 1 : 0);
      player.cooldowns.turret = Math.max(0.14, 0.58 / player.fireRate / (1 + level * 0.08));
    }

    if (player.weapons.side > 0 && player.cooldowns.side <= 0) {
      const level = player.weapons.side;
      const spread = level > 2 ? 0.24 : 0.14;
      const left = mountPoint(player.angle, 6, -19);
      const right = mountPoint(player.angle, 6, 19);
      fireBullet(left.x, left.y, angle - spread, 430, (9 + level * 4) * player.damage, 3.5, "#ffbe55", 0);
      fireBullet(right.x, right.y, angle + spread, 430, (9 + level * 4) * player.damage, 3.5, "#ffbe55", 0);
      player.cooldowns.side = Math.max(0.18, 0.82 / player.fireRate / (1 + level * 0.07));
    }

    if (player.weapons.rockets > 0 && player.cooldowns.rockets <= 0) {
      const level = player.weapons.rockets;
      const source = mountPoint(player.angle, -18, level % 2 ? -17 : 17);
      fireRocket(source.x, source.y, angle, (32 + level * 12) * player.damage, 44 + level * 7);
      player.cooldowns.rockets = Math.max(0.78, 2.35 / player.fireRate / (1 + level * 0.09));
    }

    if (player.weapons.emp > 0 && player.cooldowns.emp <= 0) {
      const level = player.weapons.emp;
      const radius = 104 + level * 18;
      runStats.empCasts += 1;
      pulses.push({ x: player.x, y: player.y, radius: 10, max: radius, life: 0.32, maxLife: 0.32, color: "#70f6ff" });
      for (let i = 0; i < 16; i += 1) {
        const arcAngle = (Math.PI * 2 / 16) * i + random(-0.12, 0.12);
        particles.push({
          kind: "spark",
          x: player.x + Math.cos(arcAngle) * random(18, 34),
          y: player.y + Math.sin(arcAngle) * random(18, 34),
          vx: Math.cos(arcAngle) * random(120, 240),
          vy: Math.sin(arcAngle) * random(120, 240),
          size: random(2, 5),
          color: "#70f6ff",
          life: random(0.16, 0.34),
          maxLife: 0.34
        });
      }
      for (const enemy of enemies) {
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist <= radius) {
          damageEnemy(enemy, (10 + level * 8) * player.damage, "#70f6ff");
          enemy.slow = Math.max(enemy.slow, 1.2);
          const push = (radius - dist) / radius * 22;
          const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
          enemy.x += Math.cos(angleToEnemy) * push;
          enemy.y += Math.sin(angleToEnemy) * push;
        }
      }
      player.cooldowns.emp = Math.max(0.9, 3.1 / player.fireRate / (1 + level * 0.08));
      playSound("emp", 1 + level * 0.08);
      lightHaptic();
    }
  }

  function mountPoint(angle, forward, side) {
    return {
      x: player.x + Math.cos(angle) * forward + Math.cos(angle + Math.PI / 2) * side,
      y: player.y + Math.sin(angle) * forward + Math.sin(angle + Math.PI / 2) * side
    };
  }

  function addMuzzleFlash(x, y, angle, color, size = 22) {
    muzzleFlashes.push({
      x,
      y,
      angle,
      color,
      size,
      life: 0.09,
      maxLife: 0.09
    });
    const back = angle + Math.PI;
    particles.push({
      kind: "smoke",
      x: x + Math.cos(back) * 7,
      y: y + Math.sin(back) * 7,
      vx: Math.cos(back) * random(18, 42) + random(-10, 10),
      vy: Math.sin(back) * random(18, 42) + random(-10, 10),
      size: random(5, 9),
      color: "rgba(196, 210, 230, 0.42)",
      life: random(0.22, 0.38),
      maxLife: 0.38
    });
  }

  function ejectCasing(x, y, angle) {
    const side = angle + Math.PI / 2 + random(-0.4, 0.4);
    particles.push({
      kind: "casing",
      x,
      y,
      vx: Math.cos(side) * random(40, 82) - Math.cos(angle) * 18,
      vy: Math.sin(side) * random(40, 82) - Math.sin(angle) * 18,
      size: random(8, 12),
      angle: random(0, Math.PI * 2),
      spin: random(-10, 10),
      color: "#ffbe55",
      life: random(0.42, 0.72),
      maxLife: 0.72
    });
  }

  function addImpact(x, y, angle, color, power = 1) {
    const count = Math.round(5 + power * 4);
    for (let i = 0; i < count; i += 1) {
      const spread = angle + Math.PI + random(-0.9, 0.9);
      particles.push({
        kind: "spark",
        x,
        y,
        vx: Math.cos(spread) * random(55, 160) * power,
        vy: Math.sin(spread) * random(55, 160) * power,
        size: random(1.8, 4.2),
        color,
        life: random(0.13, 0.32),
        maxLife: 0.32
      });
    }
    pulses.push({ x, y, radius: 3, max: 18 + power * 8, life: 0.14, maxLife: 0.14, color });
    playSound("hit", 0.55 + power * 0.2);
  }

  function addRocketTrail(projectile) {
    const back = Math.atan2(projectile.vy, projectile.vx) + Math.PI;
    for (let i = 0; i < 2; i += 1) {
      particles.push({
        kind: i ? "smoke" : "spark",
        x: projectile.x + Math.cos(back) * random(8, 16) + random(-3, 3),
        y: projectile.y + Math.sin(back) * random(8, 16) + random(-3, 3),
        vx: Math.cos(back) * random(45, 105) + random(-20, 20),
        vy: Math.sin(back) * random(45, 105) + random(-20, 20),
        size: i ? random(6, 12) : random(2.4, 4.8),
        color: i ? "rgba(188, 198, 214, 0.44)" : "#ffbe55",
        life: i ? random(0.35, 0.62) : random(0.12, 0.24),
        maxLife: i ? 0.62 : 0.24
      });
    }
  }

  function fireBullet(x, y, angle, speed, damage, radius, color, pierce) {
    runStats.shotsFired += 1;
    runStats.bulletsFired += 1;
    addMuzzleFlash(x, y, angle, color, radius * 6);
    ejectCasing(x, y, angle);
    playSound(color === "#ffbe55" ? "side" : "shoot");
    projectiles.push({
      type: "bullet",
      angle,
      x,
      y,
      px: x,
      py: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      r: radius,
      color,
      pierce,
      life: 1.45,
      maxLife: 1.45
    });
  }

  function fireRocket(x, y, angle, damage, splash) {
    runStats.shotsFired += 1;
    runStats.rocketsFired += 1;
    addMuzzleFlash(x, y, angle, "#ff7f5c", 34);
    playSound("rocket");
    projectiles.push({
      type: "rocket",
      angle,
      x,
      y,
      px: x,
      py: y,
      vx: Math.cos(angle) * 290,
      vy: Math.sin(angle) * 290,
      damage,
      splash,
      r: 7,
      color: "#ff7f5c",
      life: 2.2,
      maxLife: 2.2
    });
  }

  function updateProjectiles(dt) {
    for (const projectile of projectiles) {
      if (projectile.dead) continue;
      projectile.life -= dt;
      projectile.px = projectile.x;
      projectile.py = projectile.y;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.angle = Math.atan2(projectile.vy, projectile.vx);
      if (projectile.type === "rocket") addRocketTrail(projectile);

      if (
        projectile.life <= 0 ||
        projectile.x < -90 ||
        projectile.x > view.w + 90 ||
        projectile.y < -90 ||
        projectile.y > view.h + 90
      ) {
        projectile.dead = true;
        continue;
      }

      for (const enemy of enemies) {
        if (enemy.dead) continue;
        if (Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) <= enemy.r + projectile.r) {
          if (projectile.type === "rocket") {
            explode(projectile.x, projectile.y, projectile.splash, projectile.damage);
            projectile.dead = true;
            break;
          }
          addImpact(projectile.x, projectile.y, projectile.angle, projectile.color, projectile.r / 4);
          damageEnemy(enemy, projectile.damage, projectile.color);
          if (projectile.pierce > 0) {
            projectile.pierce -= 1;
          } else {
            projectile.dead = true;
            break;
          }
        }
      }
    }
    projectiles = projectiles.filter((projectile) => !projectile.dead);
  }

  function explode(x, y, radius, damage) {
    screenShake = Math.max(screenShake, 4);
    pulses.push({ x, y, radius: 8, max: radius, life: 0.26, maxLife: 0.26, color: "#ffbe55" });
    decals.push({ x, y, radius: radius * 0.52, life: 3.6, maxLife: 3.6, color: "rgba(0, 0, 0, 0.32)" });
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist <= radius + enemy.r) {
        damageEnemy(enemy, damage * (1 - dist / (radius * 1.5)), "#ffbe55");
      }
    }
    burst(x, y, "#ffbe55", 16, 140);
    for (let i = 0; i < 18; i += 1) {
      particles.push({
        kind: "smoke",
        x: x + random(-8, 8),
        y: y + random(-8, 8),
        vx: Math.cos(random(0, Math.PI * 2)) * random(30, 125),
        vy: Math.sin(random(0, Math.PI * 2)) * random(30, 125),
        size: random(10, 22),
        color: "rgba(126, 116, 106, 0.5)",
        life: random(0.55, 1.1),
        maxLife: 1.1
      });
    }
    playSound("explosion", radius / 58);
    lightHaptic();
  }

  function nearestEnemy(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = enemy;
      }
    }
    return best;
  }

  function damageEnemy(enemy, amount, color) {
    if (enemy.dead) return;
    const safeAmount = Math.max(1, amount);
    const applied = Math.min(safeAmount, Math.max(0, enemy.hp));
    runStats.damageDealt += applied;
    enemy.hp -= safeAmount;
    if (Math.random() < 0.16) addParticle(enemy.x, enemy.y, color || enemy.color, 70, 0.24);
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    state.score += enemy.score;
    state.coins += enemy.coins;
    state.kills += 1;
    runStats.coinsEarned += enemy.coins;
    runStats.killsByType[enemy.type] = (runStats.killsByType[enemy.type] || 0) + 1;
    const countsForWave = !isBossWave() || !state.bossSpawned || enemy.boss;
    if (countsForWave) {
      state.waveKills = Math.min(state.waveKillGoal, state.waveKills + 1);
    }
    if (enemy.boss) {
      state.bossAlive = false;
      runStats.bossesKilled += 1;
      runStats.bossKills[enemy.type] = (runStats.bossKills[enemy.type] || 0) + 1;
    }
    if (state.waveKills >= state.waveKillGoal && (!isBossWave() || !state.bossAlive)) {
      state.waveCleared = true;
    }
    burst(enemy.x, enemy.y, enemy.color, enemy.boss ? 34 : 12, enemy.boss ? 210 : 115);
    if (enemy.boss) playSound("explosion", 1.35);
    if (enemy.boss) screenShake = Math.max(screenShake, 6);
    if (enemy.boss) addFloater(enemy.x, enemy.y - 28, `+${enemy.coins} деталей`, "#ffbe55");
    if (Math.random() < 0.035) {
      player.hp = Math.min(player.maxHp, player.hp + 6);
      addFloater(enemy.x, enemy.y - 16, "+HP", "#5fe195");
    }
  }

  function damagePlayer(amount) {
    const reduced = Math.max(1, Math.round(amount - player.armor));
    player.hp -= reduced;
    runStats.damageTaken += reduced;
    runStats.hitsTaken += 1;
    addFloater(player.x, player.y - 38, `-${reduced}`, "#ff5e76");
    burst(player.x, player.y, "#ff5e76", 6, 90);
    screenShake = Math.max(screenShake, 5);
    playSound("damage");
    if (canUseHaptics) tg.HapticFeedback.impactOccurred("heavy");
    if (player.hp <= 0) {
      player.hp = 0;
      gameOver();
    }
  }

  function addParticle(x, y, color, speed, life) {
    const angle = random(0, Math.PI * 2);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * random(speed * 0.25, speed),
      vy: Math.sin(angle) * random(speed * 0.25, speed),
      size: random(2, 5),
      color,
      life,
      maxLife: life
    });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) addParticle(x, y, color, speed, random(0.18, 0.42));
  }

  function addFloater(x, y, text, color) {
    floaters.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  function updateParticles(dt) {
    screenShake = Math.max(0, screenShake - dt * 24);

    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (typeof particle.angle === "number") particle.angle += (particle.spin || 0) * dt;
      const drag = particle.kind === "smoke" ? 0.86 : 2.6;
      particle.vx *= 1 - dt * drag;
      particle.vy *= 1 - dt * drag;
    }
    particles = particles.filter((particle) => particle.life > 0);

    for (const flash of muzzleFlashes) {
      flash.life -= dt;
    }
    muzzleFlashes = muzzleFlashes.filter((flash) => flash.life > 0);

    for (const decal of decals) {
      decal.life -= dt;
    }
    decals = decals.filter((decal) => decal.life > 0);

    for (const mark of tireMarks) {
      mark.life -= dt;
    }
    tireMarks = tireMarks.filter((mark) => mark.life > 0);

    for (const pulse of pulses) {
      pulse.life -= dt;
      const t = 1 - pulse.life / pulse.maxLife;
      pulse.radius = pulse.max * t;
    }
    pulses = pulses.filter((pulse) => pulse.life > 0);

    if (bossBanner) {
      bossBanner.life -= dt;
      if (bossBanner.life <= 0) bossBanner = null;
    }

    for (const floater of floaters) {
      floater.life -= dt;
      floater.y -= 32 * dt;
    }
    floaters = floaters.filter((floater) => floater.life > 0);
  }

  function updateHud() {
    if (!player) {
      ui.hpText.textContent = "100/100";
      ui.hpBar.style.width = "100%";
      ui.timerText.textContent = `0/${getWaveKillGoal(1)} K`;
      ui.weaponList.innerHTML = "";
      return;
    }
    const hpPercent = clamp(player.hp / player.maxHp, 0, 1);
    ui.hpBar.style.width = `${hpPercent * 100}%`;
    ui.hpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;
    ui.waveText.textContent = String(state.wave);
    ui.timerText.textContent = `${Math.min(state.waveKills, state.waveKillGoal)}/${state.waveKillGoal} K`;
    ui.scoreText.textContent = String(state.score);
    ui.coinText.textContent = String(state.coins);
    ui.locationLabel.textContent = getLocation().name;

    const weapons = Object.entries(player.weapons).filter(([, level]) => level > 0);
    ui.weaponList.innerHTML = weapons
      .map(([key, level]) => {
        const icon = weaponIconUrls[key] || "";
        return `<div class="weapon-pill"><i class="weapon-icon" style="background-image:url('${icon}')"></i><span>${weaponLabels[key]}</span><b>${level}</b></div>`;
      })
      .join("");
  }

  function draw() {
    ctx.clearRect(0, 0, view.w, view.h);
    const shakeX = screenShake > 0 ? random(-screenShake, screenShake) : 0;
    const shakeY = screenShake > 0 ? random(-screenShake, screenShake) : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawLocation();
    drawTireMarks();
    drawEntityShadows();
    drawHazards();
    drawPulses();
    drawDecals();
    drawProjectiles();
    drawEnemies();
    if (player) drawTruck();
    drawMuzzleFlashes();
    drawParticles();
    drawForegroundDecor(getLocation());
    drawFloaters();
    ctx.restore();
    drawBossHud();
    drawBossBanner();
    drawDamageOverlay();
    if (state.paused) drawPauseOverlay();
  }

  function drawLocation() {
    const location = getLocation();
    if (drawArtMap(location)) {
      drawAtmosphere(location);
      return;
    }

    const baseGradient = ctx.createLinearGradient(0, 0, view.w, view.h);
    baseGradient.addColorStop(0, location.base);
    baseGradient.addColorStop(0.58, location.id === "yard" ? "#171c25" : "#101a14");
    baseGradient.addColorStop(1, location.id === "yard" ? "#252036" : "#1d2d21");
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, view.w, view.h);
    drawGroundTexture(location);

    if (location.id === "yard") {
      drawYard(location);
    } else {
      drawRoad(location);
    }
    drawAtmosphere(location);
  }

  function drawArtMap(location) {
    const image = art.maps[location.id];
    if (!isArtReady(image)) return false;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const viewRatio = view.w / view.h;
    let sx = 0;
    let sy = 0;
    let sw = image.naturalWidth;
    let sh = image.naturalHeight;
    if (imageRatio > viewRatio) {
      sw = image.naturalHeight * viewRatio;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / viewRatio;
      sy = (image.naturalHeight - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, view.w, view.h);

    ctx.save();
    const grade = ctx.createLinearGradient(0, 0, view.w, view.h);
    if (location.id === "yard") {
      grade.addColorStop(0, "rgba(86, 217, 255, 0.08)");
      grade.addColorStop(0.5, "rgba(0, 0, 0, 0)");
      grade.addColorStop(1, "rgba(183, 40, 217, 0.1)");
    } else {
      grade.addColorStop(0, "rgba(77, 201, 134, 0.08)");
      grade.addColorStop(0.52, "rgba(0, 0, 0, 0)");
      grade.addColorStop(1, "rgba(241, 213, 107, 0.06)");
    }
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
    return true;
  }

  function drawAtmosphere(location) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = location.id === "yard" ? "#56d9ff" : "#f1d56b";
    for (let i = 0; i < 42; i += 1) {
      const x = (randomSeed(i + 101, 0, view.w) + animationTime * randomSeed(i + 15, 3, 12)) % view.w;
      const y = (randomSeed(i + 211, 0, view.h) + animationTime * randomSeed(i + 31, 4, 18)) % view.h;
      ctx.beginPath();
      ctx.arc(x, y, randomSeed(i + 7, 0.8, 2.3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.22;
    const sweepX = (animationTime * 54) % (view.w + 260) - 160;
    const beam = ctx.createLinearGradient(sweepX, 0, sweepX + 180, 0);
    beam.addColorStop(0, "rgba(255, 255, 255, 0)");
    beam.addColorStop(0.5, location.id === "yard" ? "rgba(86, 217, 255, 0.22)" : "rgba(255, 190, 85, 0.18)");
    beam.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = beam;
    ctx.save();
    ctx.translate(sweepX, view.h / 2);
    ctx.rotate(-0.18);
    ctx.fillRect(-90, -view.h, 180, view.h * 2);
    ctx.restore();
    ctx.restore();
  }

  function drawGroundTexture(location) {
    const isYard = location.id === "yard";
    ctx.save();
    ctx.globalAlpha = isYard ? 0.34 : 0.28;
    for (let i = 0; i < 96; i += 1) {
      const x = randomSeed(i + 801, -30, view.w + 30);
      const y = randomSeed(i + 911, -30, view.h + 30);
      const w = randomSeed(i + 17, isYard ? 16 : 22, isYard ? 78 : 104);
      const h = randomSeed(i + 19, 2, isYard ? 9 : 5);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(randomSeed(i + 23, -0.42, 0.42));
      ctx.fillStyle = isYard
        ? (i % 3 === 0 ? "rgba(255, 255, 255, 0.045)" : "rgba(0, 0, 0, 0.14)")
        : (i % 3 === 0 ? "rgba(77, 201, 134, 0.09)" : "rgba(0, 0, 0, 0.18)");
      roundRect(-w / 2, -h / 2, w, h, Math.min(4, h));
      ctx.fill();
      ctx.restore();
    }

    ctx.globalAlpha = isYard ? 0.18 : 0.24;
    ctx.strokeStyle = isYard ? "rgba(255, 255, 255, 0.08)" : "rgba(124, 190, 126, 0.16)";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    for (let i = 0; i < 46; i += 1) {
      const x = randomSeed(i + 551, 0, view.w);
      const y = randomSeed(i + 651, 0, view.h);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + randomSeed(i + 61, -22, 24), y + randomSeed(i + 71, 8, 42));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSoftShadow(x, y, rx, ry, angle = 0, alpha = 0.3) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(rx, ry);
    const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    shadow.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
    shadow.addColorStop(0.62, `rgba(0, 0, 0, ${alpha * 0.46})`);
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSmallBolts(x, y, w, h, count, color = "rgba(255, 255, 255, 0.48)") {
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < count; i += 1) {
      const px = x + (w / Math.max(1, count - 1)) * i;
      ctx.beginPath();
      ctx.arc(px, y, 1.2, 0, Math.PI * 2);
      ctx.arc(px, y + h, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEntityShadows() {
    ctx.save();
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      drawSoftShadow(enemy.x + enemy.r * 0.28, enemy.y + enemy.r * 0.48, enemy.r * 1.7, enemy.r * 0.78, enemy.angle * 0.12, enemy.boss ? 0.42 : 0.28);
    }
    if (player) {
      const truck = player.truck;
      const bodyLength = truck.id === "long" ? 94 : truck.id === "sprint" ? 76 : 88;
      const bodyWidth = truck.id === "block" ? 50 : 44;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      drawSoftShadow(6, 12, bodyLength * 0.72, bodyWidth * 0.94, 0, 0.42);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawForegroundDecor(location) {
    ctx.save();
    if (location.id === "yard") {
      ctx.globalAlpha = 0.34;
      const lamp = ctx.createLinearGradient(0, view.h * 0.18, view.w, view.h);
      lamp.addColorStop(0, "rgba(86, 217, 255, 0.16)");
      lamp.addColorStop(0.5, "rgba(255, 190, 85, 0.03)");
      lamp.addColorStop(1, "rgba(183, 40, 217, 0.12)");
      ctx.fillStyle = lamp;
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = "rgba(255, 190, 85, 0.34)";
      ctx.lineWidth = 5;
      ctx.setLineDash([42, 22]);
      ctx.lineDashOffset = -animationTime * 28;
      ctx.beginPath();
      ctx.moveTo(0, view.h - 110);
      ctx.lineTo(view.w, view.h - 110);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.globalAlpha = 0.28;
      for (let i = 0; i < 7; i += 1) {
        const side = i % 2 ? view.w + 12 : -12;
        const y = (i * 118 + animationTime * 7) % (view.h + 160) - 80;
        const s = randomSeed(i + 71, 38, 72);
        ctx.fillStyle = i % 2 ? "rgba(50, 151, 92, 0.5)" : "rgba(77, 201, 134, 0.46)";
        ctx.beginPath();
        ctx.ellipse(side, y, s * 0.92, s * 0.42, i % 2 ? -0.48 : 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(7, 13, 9, 0.3)";
        ctx.beginPath();
        ctx.ellipse(side, y + 18, s * 0.7, s * 0.22, i % 2 ? -0.48 : 0.48, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawPuddle(x, y, w, h, tint = "rgba(86, 217, 255, 0.2)") {
    ctx.save();
    const reflection = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h));
    reflection.addColorStop(0, tint);
    reflection.addColorStop(0.62, "rgba(255, 255, 255, 0.045)");
    reflection.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = reflection;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.48;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.1, y - h * 0.08, w * 0.58, h * 0.32, -0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawContainer(x, y, w, h, color, seed = 0) {
    ctx.save();
    drawSoftShadow(x + w * 0.54, y + h * 0.68, w * 0.62, h * 0.66, 0.04, 0.32);
    const body = ctx.createLinearGradient(x, y, x + w, y + h);
    body.addColorStop(0, "rgba(255, 255, 255, 0.18)");
    body.addColorStop(0.18, color);
    body.addColorStop(1, "rgba(10, 14, 20, 0.9)");
    const side = ctx.createLinearGradient(x, y + h * 0.5, x, y + h + 12);
    side.addColorStop(0, "rgba(255, 255, 255, 0.04)");
    side.addColorStop(1, "rgba(0, 0, 0, 0.46)");
    ctx.fillStyle = side;
    roundRect(x + 7, y + 10, w, h, 5);
    ctx.fill();
    ctx.fillStyle = body;
    roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(8, 12, 18, 0.74)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    roundRect(x + 5, y + 5, w - 10, h * 0.22, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    roundRect(x + 5, y + h * 0.62, w - 10, h * 0.3, 4);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55;
    for (let i = 1; i < 5; i += 1) {
      const lineX = x + (w / 5) * i;
      ctx.beginPath();
      ctx.moveTo(lineX, y + 7);
      ctx.lineTo(lineX, y + h - 7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = seed % 2 ? "rgba(255, 190, 85, 0.45)" : "rgba(86, 217, 255, 0.38)";
    roundRect(x + w - 24, y + 9, 12, h - 18, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.44)";
    ctx.fillRect(x + 10, y + 10, w * 0.34, 4);
    ctx.fillStyle = "rgba(8, 12, 18, 0.46)";
    for (let i = 0; i < 4; i += 1) {
      const px = x + 8 + i * (w - 18) / 3;
      roundRect(px - 2, y + h - 8, 4, 5, 2);
      ctx.fill();
    }
    drawSmallBolts(x + 9, y + 5, w - 18, h - 10, 6, "rgba(255, 255, 255, 0.36)");
    ctx.restore();
  }

  function drawPalletStack(x, y, seed = 0) {
    ctx.save();
    drawSoftShadow(x + 42, y + 28, 48, 24, -0.08, 0.28);
    for (let i = 0; i < 4; i += 1) {
      const rowY = y + i * 10;
      const rowX = x + i * 3;
      ctx.fillStyle = i % 2 ? "rgba(135, 80, 38, 0.9)" : "rgba(201, 139, 67, 0.92)";
      roundRect(rowX, rowY, 74 - i * 5, 9, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(rowX + 7, rowY + 2, 54 - i * 4, 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      ctx.fillRect(rowX + 6, rowY + 7, 58 - i * 4, 2);
    }
    ctx.fillStyle = seed % 2 ? "rgba(183, 40, 217, 0.7)" : "rgba(86, 217, 255, 0.62)";
    roundRect(x + 10, y - 15, 36, 23, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    roundRect(x + 13, y - 12, 30, 8, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.fillRect(x + 17, y - 4, 20, 3);
    ctx.restore();
  }

  function drawForklift(x, y, angle = 0, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    drawSoftShadow(6, 11, 46, 24, 0, 0.32);
    const hull = ctx.createLinearGradient(-28, -18, 24, 18);
    hull.addColorStop(0, "#ffe08f");
    hull.addColorStop(0.42, "#ffbe55");
    hull.addColorStop(1, "#a65b24");
    ctx.fillStyle = hull;
    roundRect(-25, -15, 46, 30, 7);
    ctx.fill();
    ctx.strokeStyle = "rgba(16, 19, 26, 0.74)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(16, 24, 34, 0.84)";
    roundRect(-9, -22, 23, 18, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(86, 217, 255, 0.26)";
    roundRect(-4, -18, 12, 8, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(16, 19, 26, 0.86)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(22, -16);
    ctx.lineTo(39, -16);
    ctx.lineTo(39, 21);
    ctx.moveTo(22, 16);
    ctx.lineTo(47, 16);
    ctx.moveTo(39, -3);
    ctx.lineTo(52, -3);
    ctx.stroke();
    ctx.fillStyle = "rgba(16, 19, 26, 0.96)";
    for (const wy of [-16, 16]) {
      ctx.beginPath();
      ctx.arc(-16, wy, 7, 0, Math.PI * 2);
      ctx.arc(16, wy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
      ctx.beginPath();
      ctx.arc(-16, wy, 2.8, 0, Math.PI * 2);
      ctx.arc(16, wy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(16, 19, 26, 0.96)";
    }
    ctx.fillStyle = "#fff1aa";
    ctx.beginPath();
    ctx.arc(21, -7, 3, 0, Math.PI * 2);
    ctx.arc(21, 7, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLightPole(x, y, color = "#56d9ff") {
    ctx.save();
    ctx.strokeStyle = "rgba(190, 206, 218, 0.42)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 72);
    ctx.lineTo(x + 28, y - 72);
    ctx.stroke();
    const glow = ctx.createRadialGradient(x + 30, y - 68, 0, x + 30, y - 68, 82);
    glow.addColorStop(0, `${color}66`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x + 30, y - 68, 82, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(x + 23, y - 78, 20, 10, 5);
    ctx.fill();
    ctx.restore();
  }

  function drawRoadSign(x, y, seed = 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(210, 220, 232, 0.62)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 42);
    ctx.stroke();
    ctx.fillStyle = seed % 2 ? "#ffbe55" : "#56d9ff";
    roundRect(x - 26, y - 66, 52, 24, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(16, 19, 26, 0.76)";
    ctx.beginPath();
    ctx.moveTo(x + 17, y - 54);
    ctx.lineTo(x + 3, y - 62);
    ctx.lineTo(x + 3, y - 58);
    ctx.lineTo(x - 18, y - 58);
    ctx.lineTo(x - 18, y - 50);
    ctx.lineTo(x + 3, y - 50);
    ctx.lineTo(x + 3, y - 46);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSecurityGate(x, y, w) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    roundRect(x + 6, y + 8, w, 42, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(210, 220, 232, 0.58)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y + 36);
    ctx.lineTo(x + w, y + 36);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 94, 118, 0.78)";
    ctx.lineWidth = 4;
    for (let i = 0; i < w; i += 42) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + 25);
      ctx.lineTo(x + i + 22, y + 47);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(16, 19, 26, 0.88)";
    roundRect(x + w + 8, y, 58, 58, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(86, 217, 255, 0.36)";
    ctx.fillRect(x + w + 19, y + 12, 36, 7);
    ctx.fillStyle = "rgba(255, 190, 85, 0.8)";
    ctx.beginPath();
    ctx.arc(x + w + 49, y + 36, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTireMarks() {
    ctx.save();
    ctx.lineCap = "round";
    for (const mark of tireMarks) {
      const alpha = clamp(mark.life / mark.maxLife, 0, 1) * 0.34;
      const forwardX = Math.cos(mark.angle) * 14;
      const forwardY = Math.sin(mark.angle) * 14;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#07090d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mark.x1, mark.y1);
      ctx.lineTo(mark.x1 + forwardX, mark.y1 + forwardY);
      ctx.moveTo(mark.x2, mark.y2);
      ctx.lineTo(mark.x2 + forwardX, mark.y2 + forwardY);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawYard(location) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = location.grid;
    ctx.lineWidth = 1;
    const offset = (animationTime * 8) % 52;
    for (let x = -52 + offset; x < view.w + 52; x += 52) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, view.h);
      ctx.stroke();
    }
    for (let y = -52 + offset; y < view.h + 52; y += 52) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(view.w, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.48;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 127 + 34) % view.w;
      const y = (i * 83 + 214) % view.h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + randomSeed(i + 61, -36, 42), y + randomSeed(i + 71, 18, 58));
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    for (let i = 0; i < 12; i += 1) {
      const x = (i * 163 + 48) % view.w;
      const y = (i * 97 + 276) % view.h;
      roundRect(x, y, 46, 8, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(x + 6, y + 3, 34, 1);
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = "rgba(18, 22, 30, 0.72)";
    ctx.fillRect(0, 78, view.w, 92);
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    for (let i = 0; i < 9; i += 1) {
      const bayX = 26 + i * 142;
      if (bayX > view.w) break;
      roundRect(bayX, 96, 92, 54, 5);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(86, 217, 255, 0.16)";
      ctx.fillRect(bayX + 10, 106, 72, 6);
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    }
    ctx.fillStyle = "rgba(255, 190, 85, 0.82)";
    for (let x = 0; x < view.w; x += 48) {
      ctx.save();
      ctx.translate(x, 168);
      ctx.rotate(-0.55);
      ctx.fillRect(-18, -3, 36, 6);
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    drawSecurityGate(24, view.h - 96, Math.min(240, view.w * 0.24));
    drawLightPole(42, 254, "#56d9ff");
    drawLightPole(view.w - 96, 292, "#ffbe55");
    drawLightPole(view.w * 0.52, view.h - 84, "#b889ff");
    drawContainer(view.w - 164, 198, 128, 52, "rgba(86, 217, 255, 0.68)", 1);
    drawContainer(view.w - 142, 256, 108, 48, "rgba(183, 40, 217, 0.62)", 2);
    drawContainer(34, view.h * 0.54, 132, 52, "rgba(255, 94, 118, 0.58)", 3);
    drawPalletStack(192, 238, 1);
    drawPalletStack(view.w - 262, view.h - 186, 2);
    drawPalletStack(view.w * 0.42, 226, 3);
    drawForklift(view.w * 0.72, view.h - 142, -0.36, 0.86);
    drawForklift(252, view.h - 256, 0.22, 0.78);
    drawPuddle(view.w * 0.36, view.h * 0.72, 64, 22, "rgba(86, 217, 255, 0.18)");
    drawPuddle(view.w * 0.68, 344, 48, 16, "rgba(255, 190, 85, 0.12)");
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "rgba(183, 40, 217, 0.2)";
    for (let i = 0; i < 5; i += 1) {
      roundRect(24 + i * 96, 118, 58, 128, 5);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255, 190, 85, 0.54)";
    for (let i = 0; i < 12; i += 1) {
      ctx.fillRect((i * 126 + 20) % view.w, view.h - 112, 62, 5);
    }
    ctx.fillStyle = "rgba(126, 86, 44, 0.65)";
    for (let i = 0; i < 7; i += 1) {
      const x = (i * 151 + 52) % view.w;
      const y = (i % 2 ? view.h - 190 : 284);
      roundRect(x, y, 64, 42, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(212, 154, 71, 0.5)";
      ctx.fillRect(x + 6, y + 10, 52, 4);
      ctx.fillRect(x + 6, y + 27, 52, 4);
      ctx.fillStyle = "rgba(126, 86, 44, 0.65)";
    }
    ctx.fillStyle = "rgba(255, 94, 118, 0.74)";
    for (let i = 0; i < 6; i += 1) {
      const x = (i * 207 + 82) % view.w;
      const y = (i % 2 ? view.h - 260 : 218);
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x - 10, y + 12);
      ctx.lineTo(x + 10, y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.fillRect(x - 6, y + 1, 12, 3);
      ctx.fillStyle = "rgba(255, 94, 118, 0.74)";
    }
    ctx.restore();
  }

  function drawRoad(location) {
    const roadW = Math.min(380, view.w * 0.58);
    const x = view.w / 2 - roadW / 2;
    ctx.fillStyle = "#1b2522";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = "#242a31";
    ctx.fillRect(x, 0, roadW, view.h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(x - 18, 0, 18, view.h);
    ctx.fillRect(x + roadW, 0, 18, view.h);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(x + 18, 0, 4, view.h);
    ctx.fillRect(x + roadW - 22, 0, 4, view.h);

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#0b0f13";
    ctx.lineWidth = 1;
    for (let i = 0; i < 22; i += 1) {
      const crackX = x + randomSeed(i + 41, 44, roadW - 44);
      const crackY = (i * 67 + animationTime * 10) % (view.h + 70) - 35;
      ctx.beginPath();
      ctx.moveTo(crackX, crackY);
      ctx.lineTo(crackX + randomSeed(i + 9, -12, 12), crackY + randomSeed(i + 11, 18, 42));
      ctx.lineTo(crackX + randomSeed(i + 13, -20, 20), crackY + randomSeed(i + 15, 48, 74));
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(241, 213, 107, 0.72)";
    ctx.lineWidth = 5;
    ctx.setLineDash([32, 24]);
    ctx.lineDashOffset = -animationTime * 80;
    ctx.beginPath();
    ctx.moveTo(view.w / 2, -40);
    ctx.lineTo(view.w / 2, view.h + 40);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "rgba(255, 190, 85, 0.22)";
    for (let y = -30; y < view.h + 60; y += 54) {
      ctx.fillRect(x + 30, y, 28, 5);
      ctx.fillRect(x + roadW - 58, y + 18, 28, 5);
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
    for (let i = 0; i < 16; i += 1) {
      const patchX = x + randomSeed(i + 121, 55, roadW - 95);
      const patchY = (i * 91 + animationTime * 5) % (view.h + 90) - 45;
      roundRect(patchX, patchY, randomSeed(i + 5, 34, 76), randomSeed(i + 9, 9, 22), 7);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(190, 206, 218, 0.34)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x - 34, 0);
    ctx.lineTo(x - 34, view.h);
    ctx.moveTo(x + roadW + 34, 0);
    ctx.lineTo(x + roadW + 34, view.h);
    ctx.stroke();
    ctx.strokeStyle = "rgba(12, 16, 21, 0.72)";
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 24]);
    ctx.lineDashOffset = animationTime * 42;
    ctx.beginPath();
    ctx.moveTo(x - 34, 0);
    ctx.lineTo(x - 34, view.h);
    ctx.moveTo(x + roadW + 34, 0);
    ctx.lineTo(x + roadW + 34, view.h);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    drawSecurityGate(x + roadW + 58, view.h * 0.18, 150);
    drawRoadSign(x - 74, view.h * 0.2, 1);
    drawRoadSign(x + roadW + 72, view.h * 0.58, 2);
    drawLightPole(x - 62, view.h * 0.44, "#f1d56b");
    drawLightPole(x + roadW + 52, view.h * 0.74, "#56d9ff");
    drawContainer(x - 158, view.h - 164, 112, 46, "rgba(76, 201, 134, 0.54)", 4);
    drawPalletStack(x + roadW + 104, view.h - 122, 5);
    drawPuddle(x + roadW * 0.38, view.h * 0.36, 54, 16, "rgba(180, 205, 226, 0.16)");
    drawPuddle(x + roadW * 0.62, view.h * 0.78, 42, 13, "rgba(180, 205, 226, 0.12)");
    ctx.fillStyle = "rgba(7, 11, 9, 0.42)";
    for (let i = 0; i < 18; i += 1) {
      const side = i % 2 ? -1 : 1;
      const rockX = side < 0 ? x - randomSeed(i + 44, 72, 170) : x + roadW + randomSeed(i + 45, 72, 170);
      const rockY = (i * 59 + 34) % view.h;
      ctx.beginPath();
      ctx.ellipse(rockX, rockY, randomSeed(i + 88, 5, 13), randomSeed(i + 91, 3, 8), randomSeed(i + 92, -0.8, 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    for (let i = 0; i < 20; i += 1) {
      const side = i % 2 ? -1 : 1;
      const tx = side < 0 ? x - randomSeed(i, 36, 108) : x + roadW + randomSeed(i, 36, 108);
      const ty = (i * 93 + (animationTime * 16)) % (view.h + 120) - 60;
      drawTree(tx, ty, location.accent, i);
    }
    ctx.restore();
  }

  function randomSeed(seed, min, max) {
    const value = Math.sin(seed * 999.13) * 43758.5453;
    return min + (value - Math.floor(value)) * (max - min);
  }

  function drawTree(x, y, color, seed) {
    const size = randomSeed(seed + 3, 15, 28);
    ctx.fillStyle = "rgba(8, 17, 12, 0.38)";
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 5, size * 0.82, size * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(74, 49, 31, 0.82)";
    roundRect(x - size * 0.1, y + size * 0.32, size * 0.2, size * 0.62, 3);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.48;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - size * 0.74, y + size * 0.72);
    ctx.lineTo(x + size * 0.74, y + size * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.36;
    ctx.fillStyle = "#d4f7c5";
    ctx.beginPath();
    ctx.moveTo(x + size * 0.1, y - size * 0.82);
    ctx.lineTo(x - size * 0.38, y + size * 0.2);
    ctx.lineTo(x + size * 0.5, y + size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = "rgba(8, 17, 12, 0.4)";
    ctx.beginPath();
    ctx.moveTo(x - size * 0.18, y - size * 0.42);
    ctx.lineTo(x - size * 0.7, y + size * 0.7);
    ctx.lineTo(x - size * 0.08, y + size * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawTruckSpriteArt(truck, bodyLength, bodyWidth) {
    const image = art.trucks[truck.id];
    if (!isArtReady(image)) return false;
    const targetW = truck.id === "long" ? 126 : truck.id === "sprint" ? 96 : 112;
    const aspect = image.naturalWidth / image.naturalHeight;
    const targetH = targetW / aspect;

    ctx.save();
    ctx.globalAlpha = 0.36;
    const beam = ctx.createLinearGradient(targetW * 0.34, 0, targetW * 1.42, 0);
    beam.addColorStop(0, "rgba(255, 241, 170, 0.42)");
    beam.addColorStop(1, "rgba(255, 241, 170, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(targetW * 0.34, -targetH * 0.24);
    ctx.lineTo(targetW * 1.42, -targetH * 0.72);
    ctx.lineTo(targetW * 1.42, targetH * 0.72);
    ctx.lineTo(targetW * 0.34, targetH * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    drawSoftShadow(4, targetH * 0.22, targetW * 0.58, targetH * 0.56, 0, 0.38);
    ctx.drawImage(image, -targetW / 2, -targetH / 2, targetW, targetH);

    const badgeW = targetW * 0.22;
    const badgeH = Math.max(17, targetH * 0.34);
    const badgeX = truck.id === "long" ? -targetW * 0.18 : -targetW * 0.08;
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    roundRect(badgeX - badgeW / 2, -badgeH / 2, badgeW, badgeH, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(16, 19, 26, 0.26)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#212633";
    ctx.font = `900 ${Math.max(13, badgeH * 0.58)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("vp", badgeX, 0);

    ctx.strokeStyle = truck.accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.65;
    roundRect(-targetW * 0.5 + 3, -targetH * 0.5 + 3, targetW - 6, targetH - 6, 10);
    ctx.stroke();
    ctx.globalAlpha = 1;

    drawMountedWeapons(Math.max(bodyLength, targetW * 0.78), Math.max(bodyWidth, targetH * 0.72), truck);
    return true;
  }

  function drawTruck() {
    const truck = player.truck;
    const bodyLength = truck.id === "long" ? 94 : truck.id === "sprint" ? 76 : 88;
    const bodyWidth = truck.id === "block" ? 50 : 44;
    const cabLength = truck.id === "sprint" ? 31 : 34;
    const cargoLength = bodyLength - cabLength + 8;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    if (drawTruckSpriteArt(truck, bodyLength, bodyWidth)) {
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.34;
    const beam = ctx.createLinearGradient(bodyLength * 0.38, 0, bodyLength * 1.35, 0);
    beam.addColorStop(0, "rgba(255, 241, 170, 0.38)");
    beam.addColorStop(1, "rgba(255, 241, 170, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(bodyLength * 0.34, -bodyWidth * 0.32);
    ctx.lineTo(bodyLength * 1.35, -bodyWidth * 0.98);
    ctx.lineTo(bodyLength * 1.35, bodyWidth * 0.98);
    ctx.lineTo(bodyLength * 0.34, bodyWidth * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    drawSoftShadow(2, 10, bodyLength * 0.7, bodyWidth * 0.9, 0, 0.38);

    ctx.fillStyle = "rgba(7, 10, 15, 0.72)";
    roundRect(-bodyLength * 0.42, -bodyWidth * 0.36, bodyLength * 0.78, bodyWidth * 0.72, 8);
    ctx.fill();

    ctx.fillStyle = "#10131a";
    const wheelXs = [-bodyLength * 0.34, bodyLength * 0.22];
    for (const wheelX of wheelXs) {
      roundRect(wheelX - 13, -bodyWidth * 0.67, 27, 10, 5);
      ctx.fill();
      roundRect(wheelX - 13, bodyWidth * 0.47, 27, 10, 5);
      ctx.fill();
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      for (let i = -8; i <= 8; i += 8) {
        ctx.fillRect(wheelX + i, -bodyWidth * 0.67, 2, 10);
        ctx.fillRect(wheelX + i, bodyWidth * 0.47, 2, 10);
      }
      ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
      ctx.fillRect(wheelX - 7, -bodyWidth * 0.65, 14, 2);
      ctx.fillRect(wheelX - 7, bodyWidth * 0.55, 14, 2);
      ctx.fillStyle = "#10131a";
    }

    const bodyGradient = ctx.createLinearGradient(-bodyLength / 2, 0, bodyLength / 2, 0);
    bodyGradient.addColorStop(0, truck.colorA);
    bodyGradient.addColorStop(0.52, truck.colorB);
    bodyGradient.addColorStop(1, truck.colorB);
    ctx.fillStyle = bodyGradient;
    roundRect(-bodyLength * 0.5, -bodyWidth * 0.5, bodyLength, bodyWidth, 9);
    ctx.fill();
    ctx.strokeStyle = "rgba(5, 8, 12, 0.84)";
    ctx.lineWidth = 3;
    ctx.stroke();

    const sideGradient = ctx.createLinearGradient(0, -bodyWidth * 0.06, 0, bodyWidth * 0.56);
    sideGradient.addColorStop(0, "rgba(255, 255, 255, 0.04)");
    sideGradient.addColorStop(1, "rgba(0, 0, 0, 0.34)");
    ctx.fillStyle = sideGradient;
    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.47, bodyWidth * 0.08);
    ctx.lineTo(bodyLength * 0.45, bodyWidth * 0.08);
    ctx.lineTo(bodyLength * 0.39, bodyWidth * 0.48);
    ctx.lineTo(-bodyLength * 0.43, bodyWidth * 0.48);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.46, -bodyWidth * 0.46);
    ctx.lineTo(bodyLength * 0.4, -bodyWidth * 0.46);
    ctx.lineTo(bodyLength * 0.33, -bodyWidth * 0.34);
    ctx.lineTo(-bodyLength * 0.43, -bodyWidth * 0.35);
    ctx.closePath();
    ctx.fill();

    const topHighlight = ctx.createLinearGradient(-bodyLength * 0.48, -bodyWidth * 0.5, bodyLength * 0.44, bodyWidth * 0.5);
    topHighlight.addColorStop(0, "rgba(255, 255, 255, 0.26)");
    topHighlight.addColorStop(0.35, "rgba(255, 255, 255, 0.08)");
    topHighlight.addColorStop(1, "rgba(0, 0, 0, 0.16)");
    ctx.fillStyle = topHighlight;
    roundRect(-bodyLength * 0.47, -bodyWidth * 0.43, bodyLength * 0.9, bodyWidth * 0.34, 7);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    roundRect(-bodyLength * 0.46, -bodyWidth * 0.38, cargoLength * 0.62, bodyWidth * 0.76, 7);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      const lineX = -bodyLength * 0.36 + i * (cargoLength * 0.18);
      ctx.beginPath();
      ctx.moveTo(lineX, -bodyWidth * 0.32);
      ctx.lineTo(lineX, bodyWidth * 0.32);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 190, 85, 0.62)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const strapX = -bodyLength * 0.42 + i * bodyLength * 0.18;
      ctx.beginPath();
      ctx.moveTo(strapX, -bodyWidth * 0.43);
      ctx.lineTo(strapX + bodyLength * 0.12, bodyWidth * 0.43);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.52)";
    for (let i = 0; i < 8; i += 1) {
      const rivetX = -bodyLength * 0.43 + i * bodyLength * 0.105;
      ctx.beginPath();
      ctx.arc(rivetX, -bodyWidth * 0.43, 1.3, 0, Math.PI * 2);
      ctx.arc(rivetX, bodyWidth * 0.43, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    drawSmallBolts(-bodyLength * 0.43, -bodyWidth * 0.46, bodyLength * 0.82, bodyWidth * 0.92, 9, "rgba(255, 255, 255, 0.34)");

    const cabX = bodyLength * 0.18;
    const cabGradient = ctx.createLinearGradient(cabX, -bodyWidth * 0.44, bodyLength * 0.48, bodyWidth * 0.44);
    cabGradient.addColorStop(0, "rgba(255, 255, 255, 0.18)");
    cabGradient.addColorStop(1, "rgba(255, 255, 255, 0.04)");
    ctx.fillStyle = cabGradient;
    roundRect(cabX, -bodyWidth * 0.44, cabLength, bodyWidth * 0.88, 8);
    ctx.fill();

    ctx.fillStyle = "#dfeaff";
    roundRect(bodyLength * 0.24, -bodyWidth * 0.29, 14, bodyWidth * 0.58, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.moveTo(bodyLength * 0.26, -bodyWidth * 0.2);
    ctx.lineTo(bodyLength * 0.35, -bodyWidth * 0.27);
    ctx.lineTo(bodyLength * 0.34, -bodyWidth * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(10, 16, 24, 0.36)";
    roundRect(bodyLength * 0.39, -bodyWidth * 0.28, 9, bodyWidth * 0.23, 4);
    ctx.fill();
    roundRect(bodyLength * 0.39, bodyWidth * 0.05, 9, bodyWidth * 0.23, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(8, 12, 18, 0.64)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cabX + cabLength * 0.52, -bodyWidth * 0.36);
    ctx.lineTo(cabX + cabLength * 0.52, bodyWidth * 0.36);
    ctx.stroke();
    ctx.fillStyle = "#11151e";
    roundRect(bodyLength * 0.18, -bodyWidth * 0.62, 14, 6, 3);
    ctx.fill();
    roundRect(bodyLength * 0.18, bodyWidth * 0.48, 14, 6, 3);
    ctx.fill();
    ctx.fillStyle = "#ffbe55";
    ctx.beginPath();
    ctx.arc(bodyLength * 0.2, -bodyWidth * 0.03, 3.4, 0, Math.PI * 2);
    ctx.arc(bodyLength * 0.28, -bodyWidth * 0.03, 3.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.93)";
    roundRect(-bodyLength * 0.18, -15, 39, 30, 7);
    ctx.fill();
    ctx.fillStyle = "#212633";
    ctx.font = "900 18px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("vp", -bodyLength * 0.18 + 19.5, -1);
    ctx.strokeStyle = "rgba(16, 19, 26, 0.22)";
    ctx.lineWidth = 1;
    roundRect(-bodyLength * 0.18 + 3, -12, 33, 24, 5);
    ctx.stroke();

    ctx.fillStyle = "#fff1aa";
    ctx.beginPath();
    ctx.arc(bodyLength * 0.5 - 3, -bodyWidth * 0.23, 4, 0, Math.PI * 2);
    ctx.arc(bodyLength * 0.5 - 3, bodyWidth * 0.23, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(16, 19, 26, 0.86)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const grilleY = -bodyWidth * 0.16 + i * bodyWidth * 0.1;
      ctx.beginPath();
      ctx.moveTo(bodyLength * 0.43, grilleY);
      ctx.lineTo(bodyLength * 0.5, grilleY);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(16, 19, 26, 0.76)";
    roundRect(bodyLength * 0.47, -bodyWidth * 0.34, 8, bodyWidth * 0.68, 3);
    ctx.fill();
    ctx.fillStyle = "#ff5e76";
    ctx.fillRect(-bodyLength * 0.52, -bodyWidth * 0.32, 4, 10);
    ctx.fillRect(-bodyLength * 0.52, bodyWidth * 0.12, 4, 10);
    ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
    ctx.fillRect(-bodyLength * 0.49, -bodyWidth * 0.23, 8, 2);
    ctx.fillRect(-bodyLength * 0.49, bodyWidth * 0.2, 8, 2);

    ctx.strokeStyle = truck.accent;
    ctx.lineWidth = 2;
    roundRect(-bodyLength * 0.5 + 4, -bodyWidth * 0.5 + 4, bodyLength - 8, bodyWidth - 8, 7);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.44, -bodyWidth * 0.28);
    ctx.bezierCurveTo(-bodyLength * 0.2, -bodyWidth * 0.38, bodyLength * 0.16, -bodyWidth * 0.36, bodyLength * 0.36, -bodyWidth * 0.24);
    ctx.stroke();

    drawMountedWeapons(bodyLength, bodyWidth, truck);
    ctx.restore();
  }

  function drawMountedWeapons(bodyLength, bodyWidth, truck) {
    if (player.weapons.turret > 0) {
      const target = nearestEnemy(player.x, player.y);
      const turretAngle = target ? Math.atan2(target.y - player.y, target.x - player.x) - player.angle : 0;
      ctx.save();
      ctx.translate(4, 0);
      ctx.rotate(turretAngle);
      ctx.drawImage(art.weapons.turret, -27, -27, 64, 54);
      ctx.restore();
    }

    if (player.weapons.side > 0) {
      ctx.drawImage(art.weapons.side, -44, -bodyWidth * 0.86, 88, 38);
      ctx.drawImage(art.weapons.side, -44, bodyWidth * 0.38, 88, 38);
    }

    if (player.weapons.emp > 0) {
      ctx.drawImage(art.weapons.emp, -27, -27, 54, 54);
      ctx.strokeStyle = "#70f6ff";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.64;
      ctx.beginPath();
      ctx.arc(-2, 0, 20 + Math.sin(animationTime * 8) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (player.weapons.rockets > 0) {
      ctx.drawImage(art.weapons.rockets, -bodyLength * 0.44, -bodyWidth * 0.66, 68, 42);
      ctx.drawImage(art.weapons.rockets, -bodyLength * 0.44, bodyWidth * 0.2, 68, 42);
    }

    if (truck.id === "block") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
      ctx.lineWidth = 3;
      ctx.strokeRect(-bodyLength * 0.36, -bodyWidth * 0.38, bodyLength * 0.72, bodyWidth * 0.76);
    }
  }

  function drawEnemies() {
    for (const enemy of enemies) drawDrone(enemy);
  }

  function drawEnemyHpBar(enemy) {
    if (enemy.hp >= enemy.maxHp) return;
    const w = enemy.boss ? 86 : 42;
    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    roundRect(enemy.x - w / 2, enemy.y - enemy.r - 18, w, 6, 3);
    ctx.fill();
    ctx.fillStyle = enemy.color;
    roundRect(enemy.x - w / 2, enemy.y - enemy.r - 18, w * clamp(enemy.hp / enemy.maxHp, 0, 1), 6, 3);
    ctx.fill();
  }

  function drawDroneSpriteArt(enemy, r) {
    const image = enemy.boss ? art.drones.boss : art.drones[enemy.type];
    if (!isArtReady(image)) return false;
    const aspect = image.naturalWidth / image.naturalHeight;
    const widthScale = enemy.boss
      ? 6.4
      : enemy.type === "shield"
        ? 5.0
        : enemy.type === "carrier"
          ? 4.9
          : enemy.type === "sting"
            ? 5.4
            : 4.1;
    const targetW = r * widthScale;
    const targetH = targetW / aspect;

    const glow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, Math.max(targetW, targetH) * 0.72);
    glow.addColorStop(0, `${enemy.color}88`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalAlpha = enemy.boss ? 0.34 : 0.22;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(targetW, targetH) * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    drawSoftShadow(r * 0.16, r * 0.42, targetW * 0.42, targetH * 0.3, 0, enemy.boss ? 0.36 : 0.26);
    ctx.drawImage(image, -targetW / 2, -targetH / 2, targetW, targetH);

    if (enemy.type === "shield" && !enemy.boss) {
      ctx.globalAlpha = 0.58 + Math.sin(animationTime * 5) * 0.12;
      ctx.strokeStyle = "rgba(184, 137, 255, 0.78)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(targetW, targetH) * 0.36, -0.9, 0.9);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (enemy.boss) {
      ctx.strokeStyle = enemy.color;
      ctx.globalAlpha = 0.62;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(targetW, targetH) * 0.42 + Math.sin(animationTime * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    return true;
  }

  function drawDrone(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    const pulse = 1 + Math.sin(animationTime * 5 + enemy.wobble) * 0.06;
    const r = enemy.r * pulse;

    if (drawDroneSpriteArt(enemy, r)) {
      ctx.restore();
      drawEnemyHpBar(enemy);
      return;
    }

    const glow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.1);
    glow.addColorStop(0, `${enemy.color}cc`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalAlpha = enemy.boss ? 0.28 : 0.18;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.beginPath();
    ctx.ellipse(4, 6, r * 1.48, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(5, 8, 12, 0.78)";
    ctx.lineWidth = enemy.boss ? 7 : 5;
    ctx.beginPath();
    ctx.moveTo(-r * 1.08, -r * 0.86);
    ctx.lineTo(r * 1.08, r * 0.86);
    ctx.moveTo(-r * 1.08, r * 0.86);
    ctx.lineTo(r * 1.08, -r * 0.86);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.36)";
    ctx.lineWidth = enemy.boss ? 3 : 2;
    ctx.stroke();

    const rotorSpin = animationTime * (enemy.type === "sting" ? 20 : 14);
    drawRotor(-r * 1.08, -r * 0.86, r * 0.5, rotorSpin, enemy.color);
    drawRotor(-r * 1.08, r * 0.86, r * 0.5, rotorSpin + 1, enemy.color);
    drawRotor(r * 1.08, -r * 0.86, r * 0.5, rotorSpin + 2, enemy.color);
    drawRotor(r * 1.08, r * 0.86, r * 0.5, rotorSpin + 3, enemy.color);

    ctx.fillStyle = enemy.color;
    if (enemy.type === "shield") {
      ctx.strokeStyle = "rgba(184, 137, 255, 0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (enemy.boss) {
      const bossGradient = ctx.createLinearGradient(-r, -r, r, r);
      bossGradient.addColorStop(0, "#f5f7ff");
      bossGradient.addColorStop(0.56, "#b8c8ff");
      bossGradient.addColorStop(1, "#ff6b80");
      ctx.fillStyle = bossGradient;
      roundRect(-r * 1.18, -r * 0.78, r * 2.36, r * 1.56, 9);
      ctx.fill();
      ctx.fillStyle = "rgba(16, 19, 26, 0.45)";
      roundRect(-r * 0.28, -r * 0.48, r * 0.9, r * 0.96, 5);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(8, 12, 18, 0.42)";
      roundRect(-r * 1.02, r * 0.34, r * 2.04, r * 0.34, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      roundRect(-r * 0.92, -r * 0.68, r * 1.26, r * 0.28, 6);
      ctx.fill();
      if (enemy.bossKind === "bulwark") {
        ctx.strokeStyle = "rgba(184, 137, 255, 0.78)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.45 + Math.sin(animationTime * 5) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(184, 137, 255, 0.36)";
        for (let i = 0; i < 6; i += 1) {
          const a = Math.PI * 2 / 6 * i;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92, r * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (enemy.bossKind === "hive") {
        ctx.fillStyle = "rgba(255, 190, 85, 0.82)";
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.ellipse(-r * 0.34, i * r * 0.42, r * 0.28, r * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (enemy.bossKind === "reaper") {
        ctx.fillStyle = "#ff5e76";
        ctx.beginPath();
        ctx.moveTo(r * 1.38, 0);
        ctx.lineTo(r * 0.36, -r * 0.72);
        ctx.lineTo(r * 0.56, 0);
        ctx.lineTo(r * 0.36, r * 0.72);
        ctx.closePath();
        ctx.fill();
      }
      if (enemy.bossKind === "overlord") {
        ctx.strokeStyle = "#56d9ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-r * 0.1, -r * 0.76);
        ctx.lineTo(-r * 0.48, -r * 1.26);
        ctx.moveTo(r * 0.1, -r * 0.76);
        ctx.lineTo(r * 0.48, -r * 1.26);
        ctx.stroke();
      }
    } else {
      const bodyGradient = ctx.createLinearGradient(-r, -r, r, r);
      bodyGradient.addColorStop(0, "rgba(255, 255, 255, 0.72)");
      bodyGradient.addColorStop(0.28, enemy.color);
      bodyGradient.addColorStop(1, "rgba(10, 14, 20, 0.72)");
      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      if (enemy.type === "sting") {
        ctx.moveTo(r * 1.02, 0);
        ctx.lineTo(r * 0.28, -r * 0.66);
        ctx.lineTo(-r * 0.8, -r * 0.42);
        ctx.lineTo(-r * 0.54, 0);
        ctx.lineTo(-r * 0.8, r * 0.42);
        ctx.lineTo(r * 0.28, r * 0.66);
      } else if (enemy.type === "carrier") {
        ctx.moveTo(r * 0.92, 0);
        ctx.bezierCurveTo(r * 0.74, -r * 0.64, -r * 0.48, -r * 0.72, -r * 0.92, -r * 0.22);
        ctx.lineTo(-r * 0.92, r * 0.22);
        ctx.bezierCurveTo(-r * 0.48, r * 0.72, r * 0.74, r * 0.64, r * 0.92, 0);
      } else {
        ctx.moveTo(r * 0.86, 0);
        ctx.lineTo(r * 0.46, -r * 0.58);
        ctx.lineTo(-r * 0.32, -r * 0.72);
        ctx.lineTo(-r * 0.84, -r * 0.22);
        ctx.lineTo(-r * 0.84, r * 0.22);
        ctx.lineTo(-r * 0.32, r * 0.72);
        ctx.lineTo(r * 0.46, r * 0.58);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(8, 12, 18, 0.76)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      ctx.beginPath();
      ctx.ellipse(-r * 0.18, -r * 0.18, r * 0.48, r * 0.2, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.58, r * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(16, 19, 26, 0.86)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, r * 0.52);
    ctx.lineTo(-r * 0.55, r * 0.96);
    ctx.moveTo(r * 0.2, r * 0.52);
    ctx.lineTo(r * 0.48, r * 0.92);
    ctx.stroke();

    if (enemy.type === "scout") {
      ctx.strokeStyle = "#65dcff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.32);
      ctx.lineTo(-r * 0.82, -r * 0.72);
      ctx.stroke();
      ctx.fillStyle = "#65dcff";
      ctx.beginPath();
      ctx.arc(-r * 0.85, -r * 0.75, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (enemy.type === "carrier") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.74)";
      roundRect(-r * 0.58, -r * 0.38, r * 0.8, r * 0.76, 5);
      ctx.fill();
      ctx.fillStyle = "rgba(16, 19, 26, 0.62)";
      ctx.fillRect(-r * 0.42, -r * 0.12, r * 0.46, r * 0.08);
      ctx.fillRect(-r * 0.42, r * 0.12, r * 0.46, r * 0.08);
      ctx.strokeStyle = "rgba(255, 190, 85, 0.62)";
      ctx.lineWidth = 1.5;
      roundRect(-r * 0.5, -r * 0.3, r * 0.62, r * 0.6, 4);
      ctx.stroke();
    }
    if (enemy.type === "shield") {
      ctx.fillStyle = "rgba(184, 137, 255, 0.36)";
      roundRect(-r * 0.72, -r * 0.42, r * 0.36, r * 0.84, 4);
      ctx.fill();
      roundRect(r * 0.38, -r * 0.42, r * 0.36, r * 0.84, 4);
      ctx.fill();
    }
    if (enemy.type === "sting") {
      ctx.fillStyle = "#ff5e76";
      ctx.beginPath();
      ctx.moveTo(r * 1.08, 0);
      ctx.lineTo(r * 0.34, -r * 0.34);
      ctx.lineTo(r * 0.34, r * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#ffbe55";
      ctx.beginPath();
      ctx.moveTo(-r * 0.72, -r * 0.42);
      ctx.lineTo(-r * 1.34, -r * 0.78);
      ctx.lineTo(-r * 0.9, -r * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.72, r * 0.42);
      ctx.lineTo(-r * 1.34, r * 0.78);
      ctx.lineTo(-r * 0.9, r * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#10131a";
    ctx.beginPath();
    ctx.arc(r * 0.33, 0, Math.max(2, r * 0.16), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5f7ff";
    ctx.beginPath();
    ctx.arc(r * 0.38, -r * 0.02, Math.max(1.2, r * 0.07), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.arc(r * 0.44, -r * 0.08, Math.max(0.7, r * 0.035), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (enemy.hp < enemy.maxHp) {
      drawEnemyHpBar(enemy);
    }
  }

  function drawRotor(x, y, size, spin, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.save();
    ctx.rotate(spin * 0.35);
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, size * 0.18);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.28, size * 0.54, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(16, 19, 26, 0.8)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.86, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.02, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(spin);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.68)";
    ctx.lineWidth = Math.max(1.7, size * 0.16);
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(-size * 0.72, -size * 0.3);
    ctx.lineTo(size * 0.72, size * 0.3);
    ctx.moveTo(size * 0.3, -size * 0.72);
    ctx.lineTo(-size * 0.3, size * 0.72);
    ctx.stroke();
    ctx.fillStyle = "rgba(16, 19, 26, 0.86)";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, size * 0.18), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.2, size * 0.08), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDecals() {
    ctx.save();
    for (const decal of decals) {
      const alpha = clamp(decal.life / decal.maxLife, 0, 1);
      const stain = ctx.createRadialGradient(decal.x, decal.y, 0, decal.x, decal.y, decal.radius);
      stain.addColorStop(0, decal.color);
      stain.addColorStop(0.58, `rgba(0, 0, 0, ${0.16 * alpha})`);
      stain.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalAlpha = alpha;
      ctx.fillStyle = stain;
      ctx.beginPath();
      ctx.ellipse(decal.x, decal.y, decal.radius * 1.24, decal.radius * 0.76, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawMuzzleFlashes() {
    ctx.save();
    for (const flash of muzzleFlashes) {
      const alpha = clamp(flash.life / flash.maxLife, 0, 1);
      ctx.save();
      ctx.translate(flash.x, flash.y);
      ctx.rotate(flash.angle);
      const flame = ctx.createRadialGradient(0, 0, 0, flash.size * 0.42, 0, flash.size);
      flame.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      flame.addColorStop(0.28, flash.color);
      flame.addColorStop(1, "rgba(255, 190, 85, 0)");
      ctx.globalAlpha = alpha;
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(-4, -flash.size * 0.26);
      ctx.quadraticCurveTo(flash.size * 0.5, -flash.size * 0.34, flash.size, 0);
      ctx.quadraticCurveTo(flash.size * 0.5, flash.size * 0.34, -4, flash.size * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawProjectiles() {
    for (const projectile of projectiles) {
      const glowRadius = projectile.type === "rocket" ? projectile.r * 6.4 : projectile.r * 5.2;
      const glow = ctx.createRadialGradient(projectile.x, projectile.y, 0, projectile.x, projectile.y, glowRadius);
      glow.addColorStop(0, projectile.color);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalAlpha = projectile.type === "rocket" ? 0.42 : 0.28;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = projectile.type === "rocket" ? 5 : 2.5;
      ctx.globalAlpha = projectile.type === "rocket" ? 0.46 : 0.62;
      ctx.beginPath();
      ctx.moveTo(projectile.px, projectile.py);
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const sprite = projectile.type === "rocket" ? art.ammo.rocket : art.ammo.bullet;
      const w = projectile.type === "rocket" ? 42 : 30;
      const h = projectile.type === "rocket" ? 24 : 14;
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(projectile.angle || 0);
      ctx.drawImage(sprite, -w * 0.55, -h / 2, w, h);
      ctx.restore();
    }
  }

  function drawHazards() {
    for (const hazard of hazards) {
      ctx.save();
      if (hazard.delay > 0) {
        const progress = clamp(1 - hazard.delay / hazard.maxDelay, 0, 1);
        const pulse = 0.55 + Math.sin(animationTime * 18) * 0.18;
        ctx.globalAlpha = 0.38 + progress * 0.34;
        ctx.fillStyle = hazard.color;
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.radius * progress, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = hazard.color;
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -animationTime * 46;
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const alpha = clamp(hazard.life / hazard.maxLife, 0, 1);
        const glow = ctx.createRadialGradient(hazard.x, hazard.y, 0, hazard.x, hazard.y, hazard.radius * 1.35);
        glow.addColorStop(0, `${hazard.color}cc`);
        glow.addColorStop(0.45, `${hazard.color}55`);
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.globalAlpha = alpha;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.radius * 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.62)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.radius * (1.08 - alpha * 0.18), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawPulses() {
    for (const pulse of pulses) {
      const alpha = clamp(pulse.life / pulse.maxLife, 0, 1);
      ctx.strokeStyle = pulse.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.12;
      ctx.fillStyle = pulse.color;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawParticles() {
    for (const particle of particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      if (particle.kind === "smoke") {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, particle.size * (1.2 - alpha * 0.3), particle.size * 0.72, animationTime, 0, Math.PI * 2);
        ctx.fill();
      } else if (particle.kind === "casing") {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.angle || 0);
        ctx.globalAlpha = alpha;
        const w = particle.size * 2.4;
        const h = particle.size;
        ctx.drawImage(art.ammo.casing, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else if (particle.kind === "spark") {
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = Math.max(1, particle.size * alpha);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - particle.vx * 0.045, particle.y - particle.vy * 0.045);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, Math.max(1, particle.size * 0.28 * alpha), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - particle.vx * 0.035, particle.y - particle.vy * 0.035);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters() {
    ctx.save();
    ctx.font = "800 13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const floater of floaters) {
      const alpha = clamp(floater.life / floater.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.fillText(floater.text, floater.x + 1, floater.y + 1);
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function getActiveBoss() {
    return enemies.find((enemy) => enemy.boss && !enemy.dead);
  }

  function drawBossHud() {
    const boss = getActiveBoss();
    if (!boss || state.mode !== "playing") return;
    const width = Math.min(540, view.w - 32);
    const x = (view.w - width) / 2;
    const y = view.w < 720 ? 158 : 78;
    const hp = clamp(boss.hp / boss.maxHp, 0, 1);

    ctx.save();
    ctx.fillStyle = "rgba(8, 10, 14, 0.68)";
    roundRect(x, y, width, 34, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const fill = ctx.createLinearGradient(x, y, x + width, y);
    fill.addColorStop(0, boss.color);
    fill.addColorStop(0.72, "#ff5e76");
    fill.addColorStop(1, "#ffbe55");
    ctx.fillStyle = fill;
    roundRect(x + 6, y + 18, (width - 12) * hp, 9, 5);
    ctx.fill();

    ctx.fillStyle = "#f4f6fb";
    ctx.font = "800 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(boss.name, x + 12, y + 10);
    ctx.fillStyle = "rgba(244, 246, 251, 0.72)";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.ceil(boss.hp)}/${Math.ceil(boss.maxHp)}`, x + width - 12, y + 10);
    ctx.restore();
  }

  function drawBossBanner() {
    if (!bossBanner) return;
    const alpha = clamp(bossBanner.life / bossBanner.maxLife, 0, 1);
    const scale = 1 + (1 - alpha) * 0.08;
    ctx.save();
    ctx.translate(view.w / 2, view.h * 0.34);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(8, 10, 14, 0.72)";
    roundRect(-190, -35, 380, 70, 8);
    ctx.fill();
    ctx.strokeStyle = bossBanner.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = bossBanner.color;
    ctx.font = "900 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("БОСС", 0, -14);
    ctx.fillStyle = "#f4f6fb";
    ctx.font = "900 28px Inter, system-ui, sans-serif";
    ctx.fillText(bossBanner.text, 0, 14);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawDamageOverlay() {
    if (!player || state.mode === "setup") return;
    const hpPercent = clamp(player.hp / player.maxHp, 0, 1);
    if (hpPercent > 0.38) return;
    const danger = 1 - hpPercent / 0.38;
    const pulse = 0.72 + Math.sin(animationTime * 9) * 0.18;
    ctx.save();
    ctx.globalAlpha = danger * pulse;
    const edge = ctx.createRadialGradient(view.w / 2, view.h / 2, view.w * 0.18, view.w / 2, view.h / 2, view.w * 0.74);
    edge.addColorStop(0, "rgba(255, 94, 118, 0)");
    edge.addColorStop(0.72, "rgba(255, 94, 118, 0.04)");
    edge.addColorStop(1, "rgba(255, 94, 118, 0.36)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }

  function drawPauseOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(9, 12, 16, 0.42)";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = "#f4f6fb";
    ctx.font = "900 40px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Пауза", view.w / 2, view.h / 2);
    ctx.restore();
  }

  function lightHaptic() {
    if (canUseHaptics) tg.HapticFeedback.selectionChanged();
  }

  function mediumHaptic() {
    if (canUseHaptics) tg.HapticFeedback.impactOccurred("medium");
  }

  function isInteractivePointerTarget(target) {
    return Boolean(target?.closest?.("button, a, input, textarea, select, .modal-panel, .action-bar"));
  }

  function placeJoystick(event) {
    const size = ui.joystick.offsetWidth || 118;
    const half = size / 2;
    const width = window.visualViewport?.width || window.innerWidth || view.w;
    const height = window.visualViewport?.height || window.innerHeight || view.h;
    const left = clamp(event.clientX - half, 10, Math.max(10, width - size - 10));
    const top = clamp(event.clientY - half, 10, Math.max(10, height - size - 10));
    ui.joystick.style.left = `${left}px`;
    ui.joystick.style.top = `${top}px`;
    ui.joystick.style.bottom = "auto";
    joystick.originX = left + half;
    joystick.originY = top + half;
    joystick.max = size * 0.36;
    ui.joystick.classList.add("active");
  }

  function updateJoystickAt(clientX, clientY) {
    const max = joystick.max || 44;
    const dx = clientX - joystick.originX;
    const dy = clientY - joystick.originY;
    const len = Math.hypot(dx, dy);
    const scale = len > max ? max / len : 1;
    const tx = dx * scale;
    const ty = dy * scale;
    joystick.x = tx / max;
    joystick.y = ty / max;
    ui.joystickThumb.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;
  }

  function updateJoystick(event) {
    updateJoystickAt(event.clientX, event.clientY);
  }

  function resetJoystick() {
    joystick.active = false;
    joystick.id = null;
    joystick.x = 0;
    joystick.y = 0;
    ui.joystick.classList.remove("active");
    ui.joystickThumb.style.transform = "translate(-50%, -50%)";
  }

  function startJoystickAt(event, clientX, clientY, id) {
    if (state.mode !== "playing" || state.paused || isInteractivePointerTarget(event.target)) return;
    if (joystick.active) return;
    ensureAudio();
    event.preventDefault();
    joystick.active = true;
    joystick.id = id;
    placeJoystick({ clientX, clientY });
    updateJoystickAt(clientX, clientY);
  }

  function startJoystick(event) {
    startJoystickAt(event, event.clientX, event.clientY, event.pointerId ?? "pointer");
  }

  ui.app.addEventListener("pointerdown", startJoystick, { passive: false });

  window.addEventListener("pointermove", (event) => {
    const id = event.pointerId ?? "pointer";
    if (!joystick.active || joystick.id !== id) return;
    event.preventDefault();
    updateJoystick(event);
  }, { passive: false });

  window.addEventListener("pointerup", (event) => {
    const id = event.pointerId ?? "pointer";
    if (joystick.id === id) resetJoystick();
  });
  window.addEventListener("pointercancel", (event) => {
    const id = event.pointerId ?? "pointer";
    if (joystick.id === id) resetJoystick();
  });

  ui.app.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    startJoystickAt(event, event.clientX, event.clientY, "mouse");
  }, { passive: false });

  window.addEventListener("mousemove", (event) => {
    if (!joystick.active || joystick.id !== "mouse") return;
    event.preventDefault();
    updateJoystickAt(event.clientX, event.clientY);
  }, { passive: false });

  window.addEventListener("mouseup", () => {
    if (joystick.id === "mouse") resetJoystick();
  });

  ui.app.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    startJoystickAt(event, touch.clientX, touch.clientY, touch.identifier);
  }, { passive: false });

  window.addEventListener("touchmove", (event) => {
    if (!joystick.active || typeof joystick.id !== "number") return;
    const touch = [...event.changedTouches].find((item) => item.identifier === joystick.id);
    if (!touch) return;
    event.preventDefault();
    updateJoystickAt(touch.clientX, touch.clientY);
  }, { passive: false });

  window.addEventListener("touchend", (event) => {
    if (typeof joystick.id !== "number") return;
    if ([...event.changedTouches].some((item) => item.identifier === joystick.id)) resetJoystick();
  });

  window.addEventListener("touchcancel", (event) => {
    if (typeof joystick.id !== "number") return;
    if ([...event.changedTouches].some((item) => item.identifier === joystick.id)) resetJoystick();
  });

  window.addEventListener("keydown", (event) => {
    keys.add(event.code);
    if (event.code === "Space") {
      event.preventDefault();
      togglePause();
    }
    if (event.code === "Enter") {
      if (state.mode === "setup") startGame();
      else if (state.mode === "shop") {
        state.wave += 1;
        beginWave();
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  window.addEventListener("resize", syncViewportSize);
  window.visualViewport?.addEventListener("resize", syncViewportSize);
  document.addEventListener("fullscreenchange", syncViewportSize);

  ui.startButton.addEventListener("click", startGame);
  ui.fullscreenButton.addEventListener("click", () => {
    ensureAudio();
    requestGameFullscreen();
    lightHaptic();
  });
  ui.pauseButton.addEventListener("click", togglePause);
  ui.restartButton.addEventListener("click", () => {
    if (state.mode === "setup") return;
    stopBackgroundMusic();
    ui.setupPanel.classList.remove("hidden");
    ui.upgradePanel.classList.add("hidden");
    ui.gameOverPanel.classList.add("hidden");
    ui.finalStats?.classList.add("hidden");
    if (ui.finalStats) ui.finalStats.innerHTML = "";
    state.mode = "setup";
    runStats = createRunStats();
    player = null;
    enemies = [];
    projectiles = [];
    particles = [];
    pulses = [];
    hazards = [];
    tireMarks = [];
    floaters = [];
    muzzleFlashes = [];
    decals = [];
    bossBanner = null;
    updateHud();
    lightHaptic();
  });
  ui.continueButton.addEventListener("click", () => {
    state.wave += 1;
    beginWave();
    lightHaptic();
  });
  ui.playAgainButton.addEventListener("click", () => {
    stopBackgroundMusic();
    ui.gameOverPanel.classList.add("hidden");
    ui.setupPanel.classList.remove("hidden");
    ui.finalStats?.classList.add("hidden");
    if (ui.finalStats) ui.finalStats.innerHTML = "";
    state.mode = "setup";
    runStats = createRunStats();
    player = null;
    enemies = [];
    projectiles = [];
    particles = [];
    pulses = [];
    hazards = [];
    tireMarks = [];
    floaters = [];
    muzzleFlashes = [];
    decals = [];
    bossBanner = null;
    updateHud();
    lightHaptic();
  });
  ui.sendScoreButton.addEventListener("click", () => {
    if (!tg) return;
    finishRunStats();
    tg.sendData(JSON.stringify(buildResultPayload()));
  });

  function loop(now) {
    const dt = Math.min(0.034, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  syncViewportSize();
  renderSetupChoices();
  updateSelectionText();
  updateHud();
  requestAnimationFrame(loop);
})();
