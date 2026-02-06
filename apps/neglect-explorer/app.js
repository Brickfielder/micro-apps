import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

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
  yaw: 0,
  cueCounts: { soft: 0, medium: 0, strong: 0, assist: 0 },
  lastLeftLookAt: 0,
  lastLeftCollectAt: 0,
  leftCollectionTimes: [],
  leftOrientationMs: 0,
  orientTickAt: performance.now(),
  activeCueStage: 'none',
  assistMode: false,
};

const clock = new THREE.Clock();
const canvas = document.getElementById('sceneCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#17233b');
scene.fog = new THREE.Fog('#17233b', 20, 60);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.6, -12);

const hemi = new THREE.HemisphereLight('#f4f7ff', '#415364', 1.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffffff', 0.8);
sun.position.set(6, 15, 7);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: '#293650', roughness: 0.95, metalness: 0.02 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

const world = new THREE.Group();
scene.add(world);
const decorGroup = new THREE.Group();
const targetGroup = new THREE.Group();
world.add(decorGroup, targetGroup);

const DIFFICULTY_SPEED = { easy: 3.5, medium: 4.1, hard: 4.6 };

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
  const files = ['./levels/kitchen.json', './levels/garden.json'];
  const data = await Promise.all(files.map((f) => fetch(f).then((r) => r.json())));
  appState.levelData = data;
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose?.());
    child.material?.dispose?.();
  }
}

function buildDecor(level) {
  clearGroup(decorGroup);
  for (const d of level.decor) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(d.w, d.h, d.d),
      new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.7 }),
    );
    mesh.position.set(d.x, d.h / 2, d.z);
    decorGroup.add(mesh);
  }
}

function buildTargets(level) {
  clearGroup(targetGroup);
  appState.targets = [];
  const cfg = appState.config;
  const pairCount = Math.max(2, Math.floor(cfg.targetCount / 2));
  const rand = mulberry32(Number(cfg.seed) + level.seedOffset + appState.currentRound * 31);
  const contrast = cfg.targetContrast === 'high' ? 0.95 : 0.75;
  const baseSize = Number(cfg.targetSize);

  for (let i = 0; i < pairCount; i += 1) {
    const z = THREE.MathUtils.lerp(-8, 12, rand());
    const x = THREE.MathUtils.lerp(2.5, 10.5, rand());
    const positions = [
      { side: 'left', x: -x, z },
      { side: 'right', x, z },
    ];

    positions.forEach((p) => {
      const color = p.side === 'left' ? new THREE.Color(1, contrast * 0.5, contrast * 0.5) : new THREE.Color(0.5, 0.8, 1);
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color.clone().multiplyScalar(0.15) });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(baseSize, 20, 20), mat);
      mesh.position.set(p.x, baseSize + 0.05, p.z);
      mesh.userData = { side: p.side, collected: false, baseSize };
      targetGroup.add(mesh);
      appState.targets.push(mesh);
    });
  }
}

function applyAssistMode(on) {
  appState.assistMode = on;
  appState.targets.forEach((target) => {
    if (target.userData.side !== 'left' || target.userData.collected) return;
    const scale = on ? 1.45 : 1;
    target.scale.setScalar(scale);
    target.material.emissiveIntensity = on ? 1.35 : 0.35;
  });
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

  camera.position.set(level.spawn.x, level.spawn.y, level.spawn.z);
  appState.yaw = level.spawn.heading;
  camera.rotation.set(0, appState.yaw, 0);
  buildDecor(level);
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

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function updateMovement(dt) {
  const speed = DIFFICULTY_SPEED[appState.config.difficulty] || 4;
  const turnPressed = appState.keys.ArrowLeft || appState.keys.ArrowRight;

  if (turnPressed) {
    const direction = appState.keys.ArrowLeft ? 1 : -1;
    if (appState.config.snapTurn === 'on') {
      if (!appState.keys._snapLatch) {
        appState.yaw += direction * (Math.PI / 8);
        appState.keys._snapLatch = true;
      }
    } else {
      appState.yaw += direction * dt * 1.8;
    }
  } else {
    appState.keys._snapLatch = false;
  }

  camera.rotation.y = appState.yaw;
  const forward = appState.keys.ArrowUp || appState.keys.KeyW;
  const backward = appState.config.movementMode === 'forward-back' && (appState.keys.ArrowDown || appState.keys.KeyS);
  if (forward || backward) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).multiplyScalar(speed * dt * (forward ? 1 : -0.65));
    camera.position.add(dir);
    const level = appState.levelData[appState.currentRound % appState.levelData.length];
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, level.bounds.minX, level.bounds.maxX);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, level.bounds.minZ, level.bounds.maxZ);
  }
}

function collectTargets() {
  let left = 0;
  let right = 0;
  const now = performance.now();
  for (const target of appState.targets) {
    if (target.userData.collected) {
      if (target.userData.side === 'left') left += 1;
      else right += 1;
      continue;
    }
    const distance = camera.position.distanceTo(target.position);
    if (distance < 1.1) {
      target.userData.collected = true;
      target.visible = false;
      tone(target.userData.side === 'left' ? 610 : 520, 0.09);
      if (target.userData.side === 'left') {
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
  return Math.sin(appState.yaw) > 0.13;
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
  if (stage === 'strong') {
    appState.cueCounts.strong += 1;
    const leftTarget = appState.targets.find((t) => !t.userData.collected && t.userData.side === 'left');
    if (leftTarget) {
      leftTarget.material.emissive.set('#ffff88');
      leftTarget.material.emissiveIntensity = 1.4;
      setTimeout(() => {
        if (!leftTarget.userData.collected) {
          leftTarget.material.emissive.set('#552222');
          leftTarget.material.emissiveIntensity = appState.assistMode ? 1.35 : 0.35;
        }
      }, 2500);
    }
  }
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

function bindEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.addEventListener('keydown', (e) => {
    appState.keys[e.code] = true;
    if (e.code === 'KeyT') {
      ui.settingsPanel.classList.toggle('hidden');
    }
  });
  document.addEventListener('keyup', (e) => {
    appState.keys[e.code] = false;
  });

  ui.applySettings.addEventListener('click', restartSession);
  ui.downloadJson.addEventListener('click', exportJson);
  ui.downloadCsv.addEventListener('click', exportCsv);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  const now = performance.now();
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

  if (collected.left + collected.right >= appState.targets.length) {
    completeRound(collected);
  }

  if (maybeFinishSession()) {
    renderer.render(scene, camera);
    return;
  }

  renderer.render(scene, camera);
}

await loadLevels();
bindEvents();
restartSession();
animate();
