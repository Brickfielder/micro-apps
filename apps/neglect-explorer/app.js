const ui = {
  roundLabel: document.getElementById('roundLabel'),
  timerLabel: document.getElementById('timerLabel'),
  collectLabel: document.getElementById('collectLabel'),
  cueLabel: document.getElementById('cueLabel'),
  softArrow: document.getElementById('softArrow'),
  edgePulse: document.getElementById('edgePulse'),
  settingsPanel: document.getElementById('settingsPanel'),
  patientId: document.getElementById('patientId'),
  sessionMinutes: document.getElementById('sessionMinutes'),
  difficulty: document.getElementById('difficulty'),
  cueingMode: document.getElementById('cueingMode'),
  targetCount: document.getElementById('targetCount'),
  targetSize: document.getElementById('targetSize'),
  targetContrast: document.getElementById('targetContrast'),
  movementMode: document.getElementById('movementMode'),
  snapTurn: document.getElementById('snapTurn'),
  audioEnabled: document.getElementById('audioEnabled'),
  seed: document.getElementById('seed'),
  applySettings: document.getElementById('applySettings'),
  downloadJson: document.getElementById('downloadJson'),
  downloadCsv: document.getElementById('downloadCsv'),
};

const canvas = document.getElementById('sceneCanvas');
const ctx = canvas.getContext('2d');

const appState = {
  sessionStart: 0,
  roundStart: 0,
  rounds: [],
  currentRound: 0,
  activeLevelName: 'Kitchen',
  config: {},
  levelData: [],
  targets: [],
  keys: {},
  player: { x: 0, z: -12, yaw: 0 },
  cueCounts: { soft: 0, medium: 0, strong: 0, assist: 0 },
  lastLeftLookAt: 0,
  lastLeftCollectAt: 0,
  leftCollectionTimes: [],
  leftOrientationMs: 0,
  orientTickAt: performance.now(),
  activeCueStage: 'none',
  assistMode: false,
};

const DIFFICULTY_SPEED = { easy: 3.5, medium: 4.1, hard: 4.6 };
const DEFAULT_LEVELS = [
  {
    name: 'Kitchen',
    seedOffset: 11,
    spawn: { x: 0, y: 1.6, z: -12, heading: 0 },
    bounds: { minX: -16, maxX: 16, minZ: -16, maxZ: 16 },
    decor: [
      { type: 'counter', x: -10, z: 6, w: 4, h: 1.2, d: 2, color: '#8e7f66' },
      { type: 'counter', x: 10, z: 6, w: 4, h: 1.2, d: 2, color: '#8e7f66' },
      { type: 'table', x: 0, z: 2, w: 5, h: 1.0, d: 3, color: '#a38a6e' },
      { type: 'cabinet', x: -12, z: -6, w: 2.8, h: 3, d: 1.4, color: '#a39078' },
      { type: 'cabinet', x: 12, z: -6, w: 2.8, h: 3, d: 1.4, color: '#a39078' },
    ],
  },
  {
    name: 'Garden',
    seedOffset: 29,
    spawn: { x: 0, y: 1.6, z: -14, heading: 0 },
    bounds: { minX: -18, maxX: 18, minZ: -18, maxZ: 18 },
    decor: [
      { type: 'hedge', x: -14, z: 0, w: 2, h: 2, d: 20, color: '#4f7d3c' },
      { type: 'hedge', x: 14, z: 0, w: 2, h: 2, d: 20, color: '#4f7d3c' },
      { type: 'path', x: 0, z: 0, w: 8, h: 0.12, d: 26, color: '#c7b796' },
      { type: 'planter', x: -8, z: 7, w: 2.5, h: 1, d: 2.5, color: '#7c6552' },
      { type: 'planter', x: 8, z: 7, w: 2.5, h: 1, d: 2.5, color: '#7c6552' },
    ],
  },
];

function mulberry32(seed) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tone(freq = 520, duration = 0.13) {
  if (appState.config.audioEnabled !== 'on') return;
  const audioCtx = tone.ctx || (tone.ctx = new (window.AudioContext || window.webkitAudioContext)());
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = 0.0001;
  gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration + 0.02);
}

async function loadLevels() {
  try {
    const files = ['./levels/kitchen.json', './levels/garden.json'];
    const data = await Promise.all(
      files.map((f) =>
        fetch(f).then((r) => {
          if (!r.ok) throw new Error(`Failed to load ${f}: ${r.status}`);
          return r.json();
        }),
      ),
    );
    appState.levelData = data;
  } catch (err) {
    console.warn('Falling back to embedded level data.', err);
    appState.levelData = DEFAULT_LEVELS;
    ui.cueLabel.textContent = 'Cue: offline level fallback active';
  }
}

function buildTargets(level) {
  appState.targets = [];
  const cfg = appState.config;
  const pairCount = Math.max(2, Math.floor(cfg.targetCount / 2));
  const rand = mulberry32(Number(cfg.seed) + level.seedOffset + appState.currentRound * 31);
  const baseSize = Number(cfg.targetSize);

  for (let i = 0; i < pairCount; i += 1) {
    const z = -8 + 20 * rand();
    const x = 2.5 + 8 * rand();
    appState.targets.push({ side: 'left', x: -x, z, size: baseSize, collected: false });
    appState.targets.push({ side: 'right', x, z, size: baseSize, collected: false });
  }
}

function applyAssistMode(on) {
  appState.assistMode = on;
}

function startRound(roundIndex) {
  const level = appState.levelData[roundIndex % appState.levelData.length];
  appState.activeLevelName = level.name;
  appState.currentRound = roundIndex;
  appState.roundStart = performance.now();
  appState.leftCollectionTimes = [];
  appState.leftOrientationMs = 0;
  appState.orientTickAt = performance.now();
  appState.lastLeftLookAt = performance.now();
  appState.lastLeftCollectAt = performance.now();
  appState.activeCueStage = 'none';
  appState.cueCounts = { soft: 0, medium: 0, strong: 0, assist: 0 };

  appState.player.x = level.spawn.x;
  appState.player.z = level.spawn.z;
  appState.player.yaw = level.spawn.heading;
  buildTargets(level);
  applyAssistMode(false);

  ui.roundLabel.textContent = `Round ${roundIndex + 1} · ${level.name}`;
  ui.cueLabel.textContent = 'Cue: none';
  ui.collectLabel.textContent = 'Left 0 | Right 0';
}

function pullSettings() {
  return {
    patientId: ui.patientId.value.trim() || 'P-Unknown',
    sessionMinutes: Number(ui.sessionMinutes.value),
    difficulty: ui.difficulty.value,
    cueingMode: ui.cueingMode.value,
    targetCount: Number(ui.targetCount.value),
    targetSize: Number(ui.targetSize.value),
    targetContrast: ui.targetContrast.value,
    movementMode: ui.movementMode.value,
    snapTurn: ui.snapTurn.value,
    audioEnabled: ui.audioEnabled.value,
    seed: Number(ui.seed.value),
  };
}

function restartSession() {
  appState.config = pullSettings();
  appState.sessionStart = performance.now();
  appState.rounds = [];
  startRound(0);
}

function updateMovement(dt) {
  const speed = DIFFICULTY_SPEED[appState.config.difficulty] || 4;
  const turnPressed = appState.keys.ArrowLeft || appState.keys.ArrowRight;

  if (turnPressed) {
    const direction = appState.keys.ArrowLeft ? 1 : -1;
    if (appState.config.snapTurn === 'on') {
      if (!appState.keys._snapLatch) {
        appState.player.yaw += direction * (Math.PI / 8);
        appState.keys._snapLatch = true;
      }
    } else {
      appState.player.yaw += direction * dt * 1.8;
    }
  } else {
    appState.keys._snapLatch = false;
  }

  const forward = appState.keys.ArrowUp || appState.keys.KeyW;
  const backward = appState.config.movementMode === 'forward-back' && (appState.keys.ArrowDown || appState.keys.KeyS);
  if (forward || backward) {
    const direction = forward ? 1 : -0.65;
    appState.player.x += Math.sin(appState.player.yaw) * speed * dt * direction;
    appState.player.z -= Math.cos(appState.player.yaw) * speed * dt * direction;

    const level = appState.levelData[appState.currentRound % appState.levelData.length];
    appState.player.x = Math.max(level.bounds.minX, Math.min(level.bounds.maxX, appState.player.x));
    appState.player.z = Math.max(level.bounds.minZ, Math.min(level.bounds.maxZ, appState.player.z));
  }
}

function collectTargets() {
  let left = 0;
  let right = 0;
  const now = performance.now();
  for (const target of appState.targets) {
    if (target.collected) {
      if (target.side === 'left') left += 1;
      else right += 1;
      continue;
    }

    const dx = appState.player.x - target.x;
    const dz = appState.player.z - target.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 1.1) {
      target.collected = true;
      tone(target.side === 'left' ? 610 : 520, 0.09);
      if (target.side === 'left') {
        left += 1;
        appState.lastLeftCollectAt = now;
        appState.leftCollectionTimes.push(now);
      } else {
        right += 1;
      }
    }
  }
  ui.collectLabel.textContent = `Left ${left} | Right ${right}`;
  return { left, right };
}

function orientedLeft() {
  return Math.sin(appState.player.yaw) > 0.13;
}

function triggerCue(stage) {
  if (appState.activeCueStage === stage) return;
  appState.activeCueStage = stage;
  ui.cueLabel.textContent = `Cue: ${stage}`;

  if (stage === 'soft') {
    appState.cueCounts.soft += 1;
    ui.softArrow.classList.add('active');
    setTimeout(() => ui.softArrow.classList.remove('active'), 2400);
  }
  if (stage === 'medium') {
    appState.cueCounts.medium += 1;
    ui.edgePulse.classList.add('active');
    tone(720, 0.2);
    setTimeout(() => ui.edgePulse.classList.remove('active'), 2800);
  }
  if (stage === 'strong') appState.cueCounts.strong += 1;
  if (stage === 'assist') {
    appState.cueCounts.assist += 1;
    applyAssistMode(true);
  }
}

function evaluateCues(now) {
  if (appState.config.cueingMode === 'off') return;
  if (appState.config.cueingMode === 'strong') {
    if (now - appState.lastLeftCollectAt > 20000) triggerCue('strong');
    return;
  }
  if (now - appState.lastLeftLookAt > 8000) triggerCue('soft');
  if (now - appState.lastLeftCollectAt > 15000) triggerCue('medium');
  if (now - appState.lastLeftCollectAt > 20000) triggerCue('strong');
  if (now - appState.lastLeftCollectAt > 28000) triggerCue('assist');
}

function completeRound(collected) {
  const now = performance.now();
  const roundSeconds = (now - appState.roundStart) / 1000;
  const firstLeft = appState.leftCollectionTimes[0];
  const round = {
    patientId: appState.config.patientId,
    round: appState.currentRound + 1,
    level: appState.activeLevelName,
    difficulty: appState.config.difficulty,
    leftCollected: collected.left,
    rightCollected: collected.right,
    timeToFirstLeft: firstLeft ? Number(((firstLeft - appState.roundStart) / 1000).toFixed(2)) : null,
    percentTimeOrientedLeft: Number(((appState.leftOrientationMs / (roundSeconds * 1000)) * 100).toFixed(1)),
    cueSoft: appState.cueCounts.soft,
    cueMedium: appState.cueCounts.medium,
    cueStrong: appState.cueCounts.strong,
    cueAssist: appState.cueCounts.assist,
    roundDurationSec: Number(roundSeconds.toFixed(2)),
  };
  appState.rounds.push(round);
  startRound(appState.currentRound + 1);
}

function maybeFinishSession() {
  const elapsed = (performance.now() - appState.sessionStart) / 1000;
  const max = appState.config.sessionMinutes * 60;
  if (elapsed < max) return false;
  ui.cueLabel.textContent = 'Cue: session complete';
  return true;
}

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    config: appState.config,
    rounds: appState.rounds,
  };
  download(`neglect-explorer-${appState.config.patientId}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function exportCsv() {
  if (!appState.rounds.length) return;
  const headers = Object.keys(appState.rounds[0]);
  const rows = [headers.join(',')];
  appState.rounds.forEach((r) => {
    rows.push(headers.map((h) => JSON.stringify(r[h] ?? '')).join(','));
  });
  download(`neglect-explorer-${appState.config.patientId}.csv`, rows.join('\n'), 'text/csv');
}

function worldToScreen(x, z, level) {
  const pad = 50;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const sx = ((x - level.bounds.minX) / (level.bounds.maxX - level.bounds.minX)) * w + pad;
  const sy = ((z - level.bounds.minZ) / (level.bounds.maxZ - level.bounds.minZ)) * h + pad;
  return { x: sx, y: sy };
}

function drawScene() {
  const level = appState.levelData[appState.currentRound % appState.levelData.length];
  if (!level) return;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#1b2a45');
  grad.addColorStop(1, '#0f1728');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  level.decor.forEach((d) => {
    const p = worldToScreen(d.x, d.z, level);
    const scaleX = (d.w / (level.bounds.maxX - level.bounds.minX)) * (canvas.width - 100);
    const scaleY = (d.d / (level.bounds.maxZ - level.bounds.minZ)) * (canvas.height - 100);
    ctx.fillStyle = d.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(p.x - scaleX / 2, p.y - scaleY / 2, scaleX, scaleY);
    ctx.globalAlpha = 1;
  });

  appState.targets.forEach((t) => {
    if (t.collected) return;
    const p = worldToScreen(t.x, t.z, level);
    const radius = Math.max(6, t.size * 8 * (appState.assistMode && t.side === 'left' ? 1.45 : 1));
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = t.side === 'left' ? '#ff7b7b' : '#7dbdff';
    if (appState.assistMode && t.side === 'left') {
      ctx.shadowColor = '#ffff88';
      ctx.shadowBlur = 18;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  const player = worldToScreen(appState.player.x, appState.player.z, level);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.sin(appState.player.yaw) * 18, player.y - Math.cos(appState.player.yaw) * 18);
  ctx.stroke();

  ctx.fillStyle = 'rgba(245, 248, 255, 0.8)';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText('Fallback renderer active (network-safe mode)', 16, canvas.height - 20);
}

function bindEvents() {
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  document.addEventListener('keydown', (e) => {
    appState.keys[e.code] = true;
    if (e.code === 'KeyT') ui.settingsPanel.classList.toggle('hidden');
  });
  document.addEventListener('keyup', (e) => {
    appState.keys[e.code] = false;
  });

  ui.applySettings.addEventListener('click', restartSession);
  ui.downloadJson.addEventListener('click', exportJson);
  ui.downloadCsv.addEventListener('click', exportCsv);
}

let lastFrame = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!appState.sessionStart) return;

  updateMovement(dt);
  const collected = collectTargets();

  const orientDt = now - appState.orientTickAt;
  appState.orientTickAt = now;
  if (orientedLeft()) {
    appState.leftOrientationMs += orientDt;
    appState.lastLeftLookAt = now;
    if (appState.activeCueStage === 'soft') appState.activeCueStage = 'none';
  }

  evaluateCues(now);

  const elapsed = Math.floor((now - appState.sessionStart) / 1000);
  ui.timerLabel.textContent = new Date(elapsed * 1000).toISOString().slice(14, 19);

  if (collected.left + collected.right >= appState.targets.length) completeRound(collected);

  drawScene();
  maybeFinishSession();
}

await loadLevels();
bindEvents();
restartSession();
requestAnimationFrame(animate);
