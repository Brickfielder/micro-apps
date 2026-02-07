import { mountShell, registerServiceWorker } from '../../shared/shell/shell.js';
import { createButton } from '../../shared/ui/components.js';

const TRACK_HALF_WIDTH = 0.95;
const PLAYER_MAX_SPEED = 275;
const PLAYER_BASE_SPEED = 160;
const BOOST_SPEED = 335;
const BOOST_DURATION = 2400;
const BOOST_COOLDOWN = 6200;
const SEGMENT_LENGTH = 180;
const DRAW_DISTANCE = 180;
const CAMERA_DEPTH = 1.1;
const OPPONENT_COUNT = 7;

const state = {
  running: false,
  score: 0,
  best: Number(localStorage.getItem('neon-racer:best') || 0),
  speed: PLAYER_BASE_SPEED,
  distance: 0,
  stamina: BOOST_DURATION,
  cooldown: 0,
  elapsed: 0,
  playerX: 0,
  track: [],
  obstacles: [],
  rivals: [],
  particles: [],
  crashFlash: 0,
  keys: new Set(),
  position: 1,
  status: 'Grid loaded with 7 AI karts. Ready to launch.',
};

const { content } = mountShell({
  appTitle: 'Neon Apex Rush',
  appTagline: 'Pseudo-3D desert circuit with 7 AI rivals, technical turns, and obstacle hazards.',
  navLinks: [{ href: '../../index.html', label: 'Home' }],
});

const card = document.createElement('article');
card.className = 'card racer-layout';

const hud = document.createElement('section');
hud.className = 'hud';
const scoreMetric = buildMetric('Score', '0');
const speedMetric = buildMetric('Speed', `${PLAYER_BASE_SPEED} km/h`);
const distanceMetric = buildMetric('Distance', '0 m');
const boostMetric = buildMetric('Turbo', '100%');
const placeMetric = buildMetric('Position', `1 / ${OPPONENT_COUNT + 1}`);

const status = document.createElement('p');
status.className = 'muted';
status.setAttribute('aria-live', 'polite');
status.textContent = state.status;

const actions = document.createElement('div');
actions.className = 'racer-actions';
const startBtn = createButton('Start race', { variant: 'primary' });
const resetBtn = createButton('Reset');
const boostBtn = createButton('Turbo (Space)');
actions.append(startBtn, boostBtn, resetBtn);

const help = document.createElement('p');
help.className = 'help';
help.innerHTML = 'Controls: <kbd>←</kbd><kbd>→</kbd> steer, <kbd>Space</kbd> turbo. Pass 7 AI karts and dodge barrier cones.';

hud.append(scoreMetric.wrapper, speedMetric.wrapper, distanceMetric.wrapper, boostMetric.wrapper, placeMetric.wrapper, actions, status, help);

const canvasWrap = document.createElement('section');
canvasWrap.className = 'canvas-wrap';
const canvas = document.createElement('canvas');
canvas.id = 'race-canvas';
canvas.width = 900;
canvas.height = 600;
canvas.setAttribute('role', 'img');
canvas.setAttribute('aria-label', 'Pseudo-3D neon kart circuit with AI racers and obstacles');
canvasWrap.appendChild(canvas);

card.append(hud, canvasWrap);
content.appendChild(card);

const ctx = canvas.getContext('2d');
let lastTime = 0;
let boostHeld = false;

function buildMetric(label, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'metric';
  const metricLabel = document.createElement('span');
  metricLabel.className = 'metric-label';
  metricLabel.textContent = label;
  const metricValue = document.createElement('span');
  metricValue.className = 'metric-value';
  metricValue.textContent = value;
  wrapper.append(metricLabel, metricValue);
  return { wrapper, metricValue };
}

function setStatus(message) {
  state.status = message;
  status.textContent = message;
}

function trackLength() {
  return state.track.length * SEGMENT_LENGTH;
}

function normalizeZ(z) {
  const len = trackLength();
  return ((z % len) + len) % len;
}

function forwardDistance(from, to) {
  const len = trackLength();
  let delta = normalizeZ(to) - normalizeZ(from);
  if (delta < 0) delta += len;
  return delta;
}

function buildTrack() {
  state.track = [];
  state.obstacles = [];

  const sections = [
    { len: 75, curve: 0.95, hill: 36 },
    { len: 55, curve: -1.05, hill: -30 },
    { len: 90, curve: 0.35, hill: 24 },
    { len: 65, curve: -1.25, hill: 20 },
    { len: 72, curve: 1.15, hill: -26 },
    { len: 80, curve: -0.55, hill: 18 },
    { len: 84, curve: 1.3, hill: -22 },
    { len: 70, curve: -1.4, hill: 28 },
    { len: 82, curve: 0.5, hill: -12 },
  ];

  let prevCurve = 0;
  let prevHill = 0;
  for (const section of sections) {
    for (let i = 0; i < section.len; i += 1) {
      const t = i / section.len;
      const smooth = t * t * (3 - 2 * t);
      const curve = prevCurve + (section.curve - prevCurve) * smooth;
      const hill = prevHill + (section.hill - prevHill) * smooth;
      state.track.push({ curve, hill });
    }
    prevCurve = section.curve;
    prevHill = section.hill;
  }

  const lanes = [-0.62, -0.25, 0.08, 0.43, 0.7];
  for (let i = 10; i < state.track.length - 20; i += 16) {
    const lane = lanes[i % lanes.length] + Math.sin(i * 0.73) * 0.08;
    state.obstacles.push({
      z: i * SEGMENT_LENGTH + 80,
      x: Math.max(-0.82, Math.min(0.82, lane)),
      type: i % 4 === 0 ? 'barrier' : 'cone',
    });
  }
}

function resetRivals() {
  state.rivals = [];
  const laneSlots = [-0.7, -0.45, -0.2, 0.08, 0.35, 0.58, 0.78];
  for (let i = 0; i < OPPONENT_COUNT; i += 1) {
    state.rivals.push({
      id: i + 1,
      z: normalizeZ(1600 + i * 920),
      x: laneSlots[i],
      targetX: laneSlots[i],
      speed: 138 + i * 9,
      color: `hsl(${(i * 47 + 14) % 360} 85% 58%)`,
    });
  }
}

function resetGame() {
  state.running = false;
  state.score = 0;
  state.speed = PLAYER_BASE_SPEED;
  state.distance = 0;
  state.elapsed = 0;
  state.playerX = 0;
  state.stamina = BOOST_DURATION;
  state.cooldown = 0;
  state.particles = [];
  state.crashFlash = 0;
  state.keys.clear();
  state.position = 1;
  boostHeld = false;
  resetRivals();
  startBtn.textContent = 'Start race';
  setStatus('Race grid reset. 7 AI karts are waiting at the circuit start.');
  render();
  updateHud();
}

function startGame() {
  if (state.running) return;
  state.running = true;
  startBtn.textContent = 'Resume';
  setStatus('Green light! Navigate heavy turns and obstacle lanes.');
}

function triggerBoost() {
  if (!state.running || state.cooldown > 0 || state.stamina <= 120) return;
  boostHeld = true;
  state.speed = BOOST_SPEED;
}

function releaseBoost() {
  if (!boostHeld) return;
  boostHeld = false;
  state.cooldown = BOOST_COOLDOWN;
}

function explodeAtScreen(x, y, color = '255, 224, 132') {
  for (let i = 0; i < 24; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 220;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.55 + Math.random() * 0.45,
      ttl: 0.55 + Math.random() * 0.45,
      size: 2 + Math.random() * 3,
      color,
    });
  }
}

function endRun(reason = 'Crash') {
  state.running = false;
  state.crashFlash = 0.45;
  explodeAtScreen(canvas.width / 2, canvas.height * 0.82);

  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    localStorage.setItem('neon-racer:best', String(state.best));
    setStatus(`${reason}! New record ${state.best}.`);
  } else {
    setStatus(`${reason}! Score ${Math.floor(state.score)}. Best ${state.best}.`);
  }
}

function project(worldX, worldY, worldZ) {
  const z = Math.max(1, worldZ - state.distance);
  const scale = CAMERA_DEPTH / z;
  return {
    x: canvas.width / 2 + scale * worldX * canvas.width * 0.5,
    y: canvas.height * 0.78 - scale * worldY * canvas.height * 0.65,
    w: scale * canvas.width,
    z,
    scale,
  };
}

function getSegment(z) {
  const idx = Math.floor(normalizeZ(z) / SEGMENT_LENGTH) % state.track.length;
  return state.track[(idx + state.track.length) % state.track.length];
}

function drawDesertDunes(horizonY) {
  const nearShift = (state.distance * 0.012) % canvas.width;
  const farShift = (state.distance * 0.007) % canvas.width;

  ctx.fillStyle = 'rgba(250, 146, 90, 0.38)';
  ctx.beginPath();
  ctx.moveTo(-40, canvas.height);
  for (let x = -80; x <= canvas.width + 90; x += 40) {
    const wave = Math.sin((x + nearShift) * 0.012) * 13 + Math.sin((x + nearShift) * 0.03) * 5;
    ctx.lineTo(x, horizonY + 72 + wave);
  }
  ctx.lineTo(canvas.width + 40, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 182, 120, 0.25)';
  ctx.beginPath();
  ctx.moveTo(-40, canvas.height);
  for (let x = -90; x <= canvas.width + 100; x += 48) {
    const wave = Math.sin((x + farShift) * 0.009) * 12;
    ctx.lineTo(x, horizonY + 52 + wave);
  }
  ctx.lineTo(canvas.width + 40, canvas.height);
  ctx.closePath();
  ctx.fill();
}

function drawDistantCity(horizonY) {
  const cityShift = (state.distance * 0.018) % canvas.width;
  const baseY = horizonY + 24;

  for (let i = 0; i < 26; i += 1) {
    const x = ((i * 57 - cityShift) % (canvas.width + 120)) - 60;
    const width = 20 + (i % 4) * 6;
    const height = 44 + ((i * 19) % 78);

    const tower = ctx.createLinearGradient(0, baseY - height, 0, baseY);
    tower.addColorStop(0, 'rgba(122, 236, 255, 0.5)');
    tower.addColorStop(1, 'rgba(26, 66, 112, 0.42)');
    ctx.fillStyle = tower;
    ctx.fillRect(x, baseY - height, width, height);

    ctx.fillStyle = 'rgba(151, 248, 255, 0.6)';
    ctx.fillRect(x + width * 0.42, baseY - height - 7, width * 0.16, 7);
  }

  ctx.strokeStyle = 'rgba(118, 233, 255, 0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -20; x <= canvas.width + 20; x += 16) {
    const wave = Math.sin((x + state.distance * 0.03) * 0.02) * 3;
    if (x === -20) ctx.moveTo(x, baseY + wave);
    else ctx.lineTo(x, baseY + wave);
  }
  ctx.stroke();
}

function drawSky() {
  const horizonY = canvas.height * 0.44;
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#081224');
  sky.addColorStop(0.4, '#1d3460');
  sky.addColorStop(0.7, '#5f3d67');
  sky.addColorStop(1, '#c67a64');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sunX = canvas.width * 0.78;
  const sunY = canvas.height * 0.16;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 88);
  sunGlow.addColorStop(0, 'rgba(255, 248, 210, 0.95)');
  sunGlow.addColorStop(0.5, 'rgba(255, 191, 130, 0.4)');
  sunGlow.addColorStop(1, 'rgba(255, 145, 90, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 88, 0, Math.PI * 2);
  ctx.fill();

  drawDistantCity(horizonY);
  drawDesertDunes(horizonY);
}

function drawSegment(x1, y1, w1, x2, y2, w2, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x1 + w1, y1);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x2 - w2, y2);
  ctx.closePath();
  ctx.fill();
}

function drawTrack() {
  drawSky();
  let x = 0;
  let dx = 0;
  let prev = null;

  for (let n = DRAW_DISTANCE; n > 0; n -= 1) {
    const worldZ = state.distance + n * SEGMENT_LENGTH;
    const seg = getSegment(worldZ);
    const p1 = project(x, seg.hill, worldZ);
    x += dx;
    dx += seg.curve * 0.0022;

    const seg2 = getSegment(worldZ + SEGMENT_LENGTH);
    const p2 = project(x, seg2.hill, worldZ + SEGMENT_LENGTH);
    if (prev && p1.y >= prev.y) continue;

    const rumble1 = p1.w * TRACK_HALF_WIDTH * 1.2;
    const rumble2 = p2.w * TRACK_HALF_WIDTH * 1.2;
    const road1 = p1.w * TRACK_HALF_WIDTH;
    const road2 = p2.w * TRACK_HALF_WIDTH;

    const stripe = Math.floor((worldZ / SEGMENT_LENGTH) % 2) === 0;
    const sandColor = stripe ? '#3a2f29' : '#2f2722';
    const rumbleColor = stripe ? '#00c2ff' : '#ff4d9f';
    const roadColor = stripe ? '#1d223a' : '#161b30';

    ctx.fillStyle = sandColor;
    ctx.fillRect(0, p2.y, canvas.width, (prev ? prev.y : canvas.height) - p2.y);
    drawSegment(p1.x, p1.y, rumble1, p2.x, p2.y, rumble2, rumbleColor);
    drawSegment(p1.x, p1.y, road1, p2.x, p2.y, road2, roadColor);

    const laneW1 = road1 / 3;
    const laneW2 = road2 / 3;
    if (stripe) {
      drawSegment(p1.x - laneW1, p1.y, 2, p2.x - laneW2, p2.y, 2, 'rgba(170,230,255,0.65)');
      drawSegment(p1.x + laneW1, p1.y, 2, p2.x + laneW2, p2.y, 2, 'rgba(170,230,255,0.65)');
    }

    prev = p2;
  }
}

function drawObstacle(obstacle) {
  const dz = forwardDistance(state.distance, obstacle.z);
  if (dz > SEGMENT_LENGTH * DRAW_DISTANCE || dz < 140) return null;

  const seg = getSegment(obstacle.z);
  const p = project(obstacle.x, seg.hill, state.distance + dz);
  const size = Math.max(8, p.scale * (obstacle.type === 'barrier' ? 220 : 130));

  ctx.save();
  ctx.translate(p.x, p.y - size * 0.8);
  if (obstacle.type === 'barrier') {
    ctx.fillStyle = '#ff9968';
    ctx.fillRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.42);
    ctx.fillStyle = '#253458';
    for (let i = -2; i <= 2; i += 1) {
      ctx.fillRect(i * size * 0.1 - 2, -size * 0.3, 4, size * 0.42);
    }
  } else {
    ctx.fillStyle = '#ffbe54';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.38);
    ctx.lineTo(size * 0.2, size * 0.28);
    ctx.lineTo(-size * 0.2, size * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff2ca';
    ctx.fillRect(-size * 0.09, -size * 0.06, size * 0.18, size * 0.1);
  }
  ctx.restore();

  return { x: p.x, y: p.y - size * 0.2, w: size * 0.45, h: size * 0.5, z: dz };
}

function drawRival(rival) {
  const dz = forwardDistance(state.distance, rival.z);
  if (dz > SEGMENT_LENGTH * DRAW_DISTANCE || dz < 110) return null;

  const seg = getSegment(rival.z);
  const p = project(rival.x, seg.hill, state.distance + dz);
  const size = Math.max(8, p.scale * 180);

  ctx.save();
  ctx.translate(p.x, p.y - size * 0.95);
  ctx.fillStyle = rival.color;
  ctx.beginPath();
  ctx.roundRect(-size * 0.34, -size * 0.4, size * 0.68, size * 0.82, size * 0.1);
  ctx.fill();

  ctx.fillStyle = '#09132a';
  ctx.beginPath();
  ctx.roundRect(-size * 0.24, -size * 0.18, size * 0.48, size * 0.42, size * 0.08);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(-size * 0.2, -size * 0.31, size * 0.4, size * 0.07);
  ctx.restore();

  return { x: p.x, y: p.y - size * 0.3, w: size * 0.62, h: size * 0.62, z: dz };
}

function drawPlayer() {
  const y = canvas.height * 0.84;
  const x = canvas.width / 2 + state.playerX * canvas.width * 0.24;
  const w = 95;
  const h = 120;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-state.playerX * 0.16);

  ctx.shadowBlur = 20;
  ctx.shadowColor = 'rgba(95,220,255,0.85)';
  ctx.fillStyle = '#59dcff';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h * 0.58, w, h * 0.76, 12);
  ctx.fill();

  ctx.fillStyle = '#0b1630';
  ctx.beginPath();
  ctx.roundRect(-w * 0.28, -h * 0.38, w * 0.56, h * 0.3, 8);
  ctx.fill();

  ctx.fillStyle = '#b5f7ff';
  ctx.fillRect(-w * 0.26, -h * 0.53, w * 0.52, h * 0.08);

  if (boostHeld) {
    ctx.fillStyle = 'rgba(255, 164, 62, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.12, h * 0.18);
    ctx.lineTo(0, h * 0.5 + Math.random() * 12);
    ctx.lineTo(w * 0.12, h * 0.18);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
  return { x, y: y - 26, w: 72, h: 72 };
}

function drawParticles(delta) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= delta;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.vx *= 0.96;
    p.vy *= 0.96;
    const alpha = Math.max(0, p.life / p.ttl);
    ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function intersects(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) * 0.5 && Math.abs(a.y - b.y) < (a.h + b.h) * 0.5;
}

function chooseAIMove(rival) {
  const upcoming = state.obstacles.find((obs) => {
    const d = forwardDistance(rival.z, obs.z);
    return d > 40 && d < 760;
  });

  if (upcoming && Math.abs(rival.x - upcoming.x) < 0.22) {
    rival.targetX = upcoming.x > 0 ? -0.55 : 0.55;
  } else if (Math.random() < 0.01) {
    rival.targetX = -0.65 + Math.random() * 1.3;
  }
}

function updateRivals(delta) {
  for (const rival of state.rivals) {
    chooseAIMove(rival);
    rival.x += (rival.targetX - rival.x) * delta * 1.8;

    const seg = getSegment(rival.z);
    const curveDrag = Math.abs(seg.curve) * 7;
    rival.speed = Math.max(120, Math.min(285, rival.speed + (165 - curveDrag - rival.speed) * delta * 0.8));
    rival.z = normalizeZ(rival.z + rival.speed * delta * 13);

    for (const obstacle of state.obstacles) {
      const d = forwardDistance(rival.z, obstacle.z);
      if (d < 100 || d > 200) continue;
      if (Math.abs(rival.x - obstacle.x) < 0.2) {
        rival.speed = Math.max(105, rival.speed - 70 * delta);
        rival.targetX = obstacle.x > 0 ? -0.5 : 0.5;
      }
    }
  }
}

function updatePosition() {
  let ahead = 0;
  for (const rival of state.rivals) {
    const toRival = forwardDistance(state.distance, rival.z);
    const toPlayer = forwardDistance(rival.z, state.distance);
    if (toRival < toPlayer) ahead += 1;
  }
  state.position = ahead + 1;
}

function update(delta) {
  const steer = delta * 1.95;
  if (state.keys.has('ArrowLeft')) state.playerX -= steer;
  if (state.keys.has('ArrowRight')) state.playerX += steer;
  state.playerX = Math.max(-1.05, Math.min(1.05, state.playerX));

  const seg = getSegment(state.distance);
  const turnPenalty = Math.abs(seg.curve) * 26;
  const edgePenalty = Math.max(0, Math.abs(state.playerX) - 0.86) * 230;

  if (boostHeld) {
    state.stamina = Math.max(0, state.stamina - delta * 1000);
    if (state.stamina === 0) releaseBoost();
  } else {
    state.speed += (PLAYER_BASE_SPEED - turnPenalty - edgePenalty - state.speed) * delta * 1.3;
    if (state.cooldown > 0) {
      state.cooldown = Math.max(0, state.cooldown - delta * 1000);
      if (state.cooldown === 0) state.stamina = BOOST_DURATION;
    }
  }

  state.distance = normalizeZ(state.distance + state.speed * delta * 16);
  state.score += state.speed * delta * 0.65;
  state.elapsed += delta;

  updateRivals(delta);
  updatePosition();

  if (state.crashFlash > 0) state.crashFlash = Math.max(0, state.crashFlash - delta);
  updateHud();
}

function updateHud() {
  scoreMetric.metricValue.textContent = Math.floor(state.score).toLocaleString();
  speedMetric.metricValue.textContent = `${Math.round(state.speed)} km/h`;
  distanceMetric.metricValue.textContent = `${Math.floor(state.elapsed * 85)} m`;
  placeMetric.metricValue.textContent = `${state.position} / ${OPPONENT_COUNT + 1}`;
  if (state.cooldown > 0) {
    boostMetric.metricValue.textContent = `Cooling ${Math.ceil(state.cooldown / 1000)}s`;
  } else {
    boostMetric.metricValue.textContent = `${Math.round((state.stamina / BOOST_DURATION) * 100)}%`;
  }
}

function render(delta = 0.016) {
  drawTrack();

  const obstacleBoxes = [];
  for (const obstacle of state.obstacles) {
    const box = drawObstacle(obstacle);
    if (box) obstacleBoxes.push(box);
  }

  const rivalBoxes = [];
  for (const rival of state.rivals) {
    const box = drawRival(rival);
    if (box) rivalBoxes.push(box);
  }

  const playerBox = drawPlayer();

  for (const box of obstacleBoxes) {
    if (box.z < 950 && intersects(playerBox, box)) {
      endRun('You hit a track obstacle');
      break;
    }
  }

  for (const box of rivalBoxes) {
    if (box.z < 1000 && intersects(playerBox, box)) {
      endRun('Kart collision');
      break;
    }
  }

  drawParticles(delta);

  if (!state.running) {
    ctx.fillStyle = 'rgba(6, 10, 20, 0.54)';
    ctx.fillRect(canvas.width * 0.16, canvas.height * 0.28, canvas.width * 0.68, canvas.height * 0.24);
    ctx.fillStyle = '#d9f9ff';
    ctx.font = '700 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEON APEX RUSH 3D', canvas.width / 2, canvas.height * 0.39);
    ctx.font = '500 19px system-ui, sans-serif';
    ctx.fillStyle = '#9bcbe5';
    ctx.fillText('Realistic desert circuit • 7 AI opponents • dense obstacle sectors', canvas.width / 2, canvas.height * 0.46);
  }

  if (state.crashFlash > 0) {
    ctx.fillStyle = `rgba(255, 70, 70, ${state.crashFlash})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = Math.min(0.04, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  if (state.running) update(delta);
  render(delta);

  window.requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  if (event.key === ' ') {
    if (!boostHeld) triggerBoost();
    return;
  }
  state.keys.add(event.key);
});

window.addEventListener('keyup', (event) => {
  if (event.key === ' ') {
    releaseBoost();
    return;
  }
  state.keys.delete(event.key);
});

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
boostBtn.addEventListener('pointerdown', triggerBoost);
boostBtn.addEventListener('pointerup', releaseBoost);
boostBtn.addEventListener('pointerleave', releaseBoost);

buildTrack();
resetGame();
window.requestAnimationFrame(gameLoop);
registerServiceWorker();
