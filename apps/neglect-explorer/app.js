const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = {
  score: document.getElementById('scoreLabel'),
  lives: document.getElementById('livesLabel'),
  level: document.getElementById('levelLabel'),
  status: document.getElementById('statusLabel'),
  restart: document.getElementById('restartBtn'),
};

const CELL = 28;
const MAZE = [
  '###############',
  '#.............#',
  '#.###.###.###.#',
  '#o###.###.###o#',
  '#.............#',
  '#.###.#.#.###.#',
  '#.....#.#.....#',
  '#####.#.#.#####',
  '#.....#.#.....#',
  '#.###.#.#.###.#',
  '#.............#',
  '#o###.###.###o#',
  '#.............#',
  '###############',
];

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

const state = {
  score: 0,
  lives: 3,
  level: 1,
  pelletsLeft: 0,
  frightenedUntil: 0,
  running: true,
  player: { x: 1, y: 1, dir: 'right', nextDir: 'right' },
  ghosts: [],
  pelletMap: [],
};

function initLevel(resetScore = false) {
  if (resetScore) {
    state.score = 0;
    state.lives = 3;
    state.level = 1;
  }

  state.pelletMap = MAZE.map((row) => row.split(''));
  state.pelletsLeft = state.pelletMap.reduce((sum, row) => sum + row.filter((c) => c === '.' || c === 'o').length, 0);
  state.player = { x: 1, y: 1, dir: 'right', nextDir: 'right' };
  state.frightenedUntil = 0;

  state.ghosts = [
    makeGhost(13, 1, '#ff5c8a'),
    makeGhost(13, 12, '#73d6ff'),
    makeGhost(1, 12, '#ff9d40'),
  ];

  state.running = true;
  ui.status.textContent = 'Eat every pellet. Avoid ghosts.';
  syncUi();
}

function makeGhost(x, y, color) {
  return { x, y, dir: 'left', color, speedTick: 0 };
}

function syncUi() {
  ui.score.textContent = String(state.score);
  ui.lives.textContent = String(state.lives);
  ui.level.textContent = String(state.level);
}

function isWall(x, y) {
  if (y < 0 || y >= MAZE.length || x < 0 || x >= MAZE[0].length) return true;
  return MAZE[y][x] === '#';
}

function tryMove(entity, dir) {
  const next = DIRS[dir];
  const nx = entity.x + next.x;
  const ny = entity.y + next.y;
  if (!isWall(nx, ny)) {
    entity.x = nx;
    entity.y = ny;
    entity.dir = dir;
    return true;
  }
  return false;
}

function stepPlayer() {
  tryMove(state.player, state.player.nextDir) || tryMove(state.player, state.player.dir);

  const tile = state.pelletMap[state.player.y][state.player.x];
  if (tile === '.' || tile === 'o') {
    state.pelletMap[state.player.y][state.player.x] = ' ';
    state.pelletsLeft -= 1;
    state.score += tile === 'o' ? 50 : 10;
    if (tile === 'o') {
      state.frightenedUntil = performance.now() + 7000;
      ui.status.textContent = 'Power pellet! Ghosts are vulnerable.';
    }
    syncUi();
  }

  if (state.pelletsLeft <= 0) {
    state.level += 1;
    ui.status.textContent = `Level ${state.level}! Speed increases.`;
    initLevel();
  }
}

function stepGhosts(dt) {
  for (const ghost of state.ghosts) {
    ghost.speedTick += dt;
    const stepDelay = state.frightenedUntil > performance.now() ? 0.23 : Math.max(0.1, 0.17 - state.level * 0.01);
    if (ghost.speedTick < stepDelay) continue;
    ghost.speedTick = 0;

    const options = Object.keys(DIRS).filter((dir) => {
      const next = DIRS[dir];
      return !isWall(ghost.x + next.x, ghost.y + next.y);
    });

    const target = state.player;
    options.sort((a, b) => {
      const da = distanceAfterMove(ghost, a, target);
      const db = distanceAfterMove(ghost, b, target);
      if (state.frightenedUntil > performance.now()) return db - da;
      return da - db;
    });

    const selected = Math.random() < 0.2 ? options[Math.floor(Math.random() * options.length)] : options[0];
    tryMove(ghost, selected);
  }
}

function distanceAfterMove(entity, dir, target) {
  const step = DIRS[dir];
  return Math.hypot(entity.x + step.x - target.x, entity.y + step.y - target.y);
}

function handleCollisions() {
  for (const ghost of state.ghosts) {
    if (ghost.x !== state.player.x || ghost.y !== state.player.y) continue;

    if (state.frightenedUntil > performance.now()) {
      state.score += 200;
      ghost.x = 13;
      ghost.y = 1;
      ui.status.textContent = 'Ghost eaten!';
      syncUi();
      continue;
    }

    state.lives -= 1;
    syncUi();
    if (state.lives <= 0) {
      state.running = false;
      ui.status.textContent = 'Game over. Tap Restart to play again.';
      return;
    }

    ui.status.textContent = 'Ouch! Keep going.';
    state.player.x = 1;
    state.player.y = 1;
  }
}

function draw() {
  const size = CELL;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < MAZE.length; y += 1) {
    for (let x = 0; x < MAZE[y].length; x += 1) {
      const px = x * size;
      const py = y * size;

      if (MAZE[y][x] === '#') {
        ctx.fillStyle = '#2437aa';
        ctx.fillRect(px, py, size, size);
        ctx.strokeStyle = '#7ea3ff';
        ctx.strokeRect(px + 2, py + 2, size - 4, size - 4);
      }

      const pellet = state.pelletMap[y][x];
      if (pellet === '.' || pellet === 'o') {
        ctx.fillStyle = pellet === 'o' ? '#ffd66a' : '#fff7c2';
        ctx.beginPath();
        ctx.arc(px + size / 2, py + size / 2, pellet === 'o' ? 6 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawPlayer();
  drawGhosts();
}

function drawPlayer() {
  const mouth = (Math.sin(performance.now() / 95) + 1) * 0.2;
  const centerX = state.player.x * CELL + CELL / 2;
  const centerY = state.player.y * CELL + CELL / 2;
  const angle = { right: 0, left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2 }[state.player.dir];

  ctx.fillStyle = '#f6cf3f';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, 11, angle + mouth, angle - mouth + Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}

function drawGhosts() {
  const frightened = state.frightenedUntil > performance.now();
  for (const ghost of state.ghosts) {
    const x = ghost.x * CELL + CELL / 2;
    const y = ghost.y * CELL + CELL / 2;

    ctx.fillStyle = frightened ? '#5b7cff' : ghost.color;
    ctx.beginPath();
    ctx.arc(x, y - 2, 10, Math.PI, 0);
    ctx.rect(x - 10, y - 2, 20, 10);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 4, y, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 4, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

let last = performance.now();
let tick = 0;
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  tick += dt;

  if (state.running && tick > 0.12) {
    tick = 0;
    stepPlayer();
    stepGhosts(dt);
    handleCollisions();
  }

  draw();
  requestAnimationFrame(loop);
}

function setDirection(dir) {
  if (DIRS[dir]) state.player.nextDir = dir;
}

document.addEventListener('keydown', (event) => {
  const map = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
  };
  if (map[event.code]) {
    event.preventDefault();
    setDirection(map[event.code]);
  }
});

for (const button of document.querySelectorAll('[data-dir]')) {
  button.addEventListener('pointerdown', () => setDirection(button.dataset.dir));
}

let touchStart = null;
canvas.addEventListener('touchstart', (event) => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
});
canvas.addEventListener('touchend', (event) => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    setDirection(dx > 0 ? 'right' : 'left');
  } else {
    setDirection(dy > 0 ? 'down' : 'up');
  }
  touchStart = null;
});

ui.restart.addEventListener('click', () => initLevel(true));

initLevel(true);
requestAnimationFrame(loop);
