import { mountShell } from '../../shared/shell/shell.js';

// --- Game Constants ---
const FPS = 60;
const TRACK_WIDTH = 800;
const TRACK_HEIGHT = 600;
const CAR_SIZE = 10;
const MAX_LAPS = 3;

// --- Game State ---
let gameState = 'start'; // start, race, results
let animationFrameId;
let player;
let ais = [];
let track = [];
let keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
let startTime = 0;
let finishTime = 0;
let playerRank = 0;

// --- DOM Elements ---
let canvas, ctx;
let hudLap, hudPos;
let viewStart, viewGame, viewResults;
let resultPosMsg, btnStart, btnRestart;

// --- Car Class ---
class Car {
  constructor(x, y, color, isPlayer = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.isPlayer = isPlayer;
    this.angle = 0; // Radians
    this.speed = 0;
    this.maxSpeed = isPlayer ? 6.5 : 5 + Math.random() * 1.5; // AI speed variation
    this.accel = 0.1;
    this.friction = 0.96;
    this.turnSpeed = 0.05;
    this.lap = 1;
    this.nextCheckpointIndex = 1; // Index of the next track point to aim for
    this.finished = false;
    this.finishTime = 0;
  }

  update() {
    if (this.finished) return;

    if (this.isPlayer) {
      // Player Control
      if (keys.ArrowUp) this.speed += this.accel;
      if (keys.ArrowDown) this.speed -= this.accel;
      if (Math.abs(this.speed) > 0.1) {
        if (keys.ArrowLeft) this.angle -= this.turnSpeed;
        if (keys.ArrowRight) this.angle += this.turnSpeed;
      }
    } else {
      // AI Logic
      const target = track[this.nextCheckpointIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Calculate desired angle
      let desiredAngle = Math.atan2(dy, dx);

      // Smooth turning towards target
      let angleDiff = desiredAngle - this.angle;
      // Normalize angle diff to -PI to PI
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) > this.turnSpeed) {
        this.angle += Math.sign(angleDiff) * this.turnSpeed;
      } else {
        this.angle = desiredAngle;
      }

      // Accelerate if facing roughly the right way
      if (Math.abs(angleDiff) < Math.PI / 2) {
         if (this.speed < this.maxSpeed) this.speed += this.accel;
      } else {
        this.speed *= 0.95; // Slow down for sharp turns
      }

      // Checkpoint reached?
      if (dist < 50) {
        this.nextCheckpointIndex = (this.nextCheckpointIndex + 1) % track.length;
        if (this.nextCheckpointIndex === 1) {
             this.lap++;
             if (this.lap > MAX_LAPS) {
                 this.finished = true;
                 this.finishTime = Date.now();
             }
        }
      }
    }

    // Physics
    this.speed *= this.friction;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Boundary Check (Simple bounce)
    if (this.x < 0 || this.x > TRACK_WIDTH || this.y < 0 || this.y > TRACK_HEIGHT) {
        this.speed *= -0.5;
        this.x = Math.max(0, Math.min(TRACK_WIDTH, this.x));
        this.y = Math.max(0, Math.min(TRACK_HEIGHT, this.y));
    }

    // Player Checkpoint Logic (simplified: assume following track roughly)
    if (this.isPlayer) {
         const target = track[this.nextCheckpointIndex];
         const dx = target.x - this.x;
         const dy = target.y - this.y;
         const dist = Math.sqrt(dx * dx + dy * dy);
         if (dist < 80) { // Larger radius for player
            this.nextCheckpointIndex = (this.nextCheckpointIndex + 1) % track.length;
             if (this.nextCheckpointIndex === 1) {
                 this.lap++;
                 if (this.lap > MAX_LAPS) {
                     endGame();
                 }
             }
         }
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-CAR_SIZE, -CAR_SIZE/2, CAR_SIZE * 2, CAR_SIZE);

    // Windshield
    ctx.fillStyle = '#add8e6';
    ctx.fillRect(0, -CAR_SIZE/2 + 2, 5, CAR_SIZE - 4);

    ctx.restore();
  }
}

// --- Track Generation ---
function generateTrack() {
  const points = [];
  const cx = TRACK_WIDTH / 2;
  const cy = TRACK_HEIGHT / 2;
  const rx = TRACK_WIDTH * 0.4;
  const ry = TRACK_HEIGHT * 0.35;
  const segments = 40;

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    // Add complex curves
    const rVar = Math.sin(angle * 3) * 40 + Math.cos(angle * 5) * 20;
    points.push({
      x: cx + (rx + rVar) * Math.cos(angle),
      y: cy + (ry + rVar) * Math.sin(angle)
    });
  }
  return points;
}

// --- Main Init ---
const shell = mountShell({
  appTitle: 'Speed Racer',
  appTagline: 'Race against 5 AIs on a realistic track',
  navLinks: []
});

const content = shell.content;
content.innerHTML = `
  <div class="game-container">
    <div id="view-start" class="view-section active">
      <h1>Speed Racer</h1>
      <p class="instructions">
        Race against 5 opponents!<br>
        Complete ${MAX_LAPS} laps to win.<br>
        Use Arrow Keys or Touch buttons to drive.
      </p>
      <button id="btn-start" class="btn">Start Race</button>
    </div>

    <div id="view-game" class="view-section">
      <div class="hud">
        <div id="hud-lap">Lap: 1/${MAX_LAPS}</div>
        <div id="hud-pos">Pos: 6/6</div>
      </div>
      <canvas id="game-canvas" width="${TRACK_WIDTH}" height="${TRACK_HEIGHT}"></canvas>

      <div class="controls">
        <div class="touch-btn" id="btn-left">◀</div>
        <div class="touch-btn" id="btn-gas">Go</div>
        <div class="touch-btn" id="btn-right">▶</div>
      </div>
    </div>

    <div id="view-results" class="view-section">
      <h2 class="success">Race Finished!</h2>
      <p id="result-pos" style="font-size: 2rem; margin: 20px 0;">Rank: #1</p>
      <button id="btn-restart" class="btn">Play Again</button>
    </div>
  </div>
`;

// Get Elements
viewStart = document.getElementById('view-start');
viewGame = document.getElementById('view-game');
viewResults = document.getElementById('view-results');
hudLap = document.getElementById('hud-lap');
hudPos = document.getElementById('hud-pos');
resultPosMsg = document.getElementById('result-pos');
canvas = document.getElementById('game-canvas');
ctx = canvas.getContext('2d');

// --- Input Handling ---
window.addEventListener('keydown', (e) => {
  if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// Touch Controls
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnGas = document.getElementById('btn-gas');

const handleTouch = (btn, key, active) => {
  btn.addEventListener(active ? 'touchstart' : 'touchend', (e) => {
    e.preventDefault();
    keys[key] = active;
  });
  btn.addEventListener(active ? 'mousedown' : 'mouseup', (e) => {
     keys[key] = active;
  });
};

handleTouch(btnLeft, 'ArrowLeft', true);
handleTouch(btnLeft, 'ArrowLeft', false);
handleTouch(btnRight, 'ArrowRight', true);
handleTouch(btnRight, 'ArrowRight', false);
handleTouch(btnGas, 'ArrowUp', true);
handleTouch(btnGas, 'ArrowUp', false);


// --- Game Loop ---
function initGame() {
  track = generateTrack();
  player = new Car(track[0].x, track[0].y, '#ff0000', true);
  player.angle = Math.PI / 2; // Face roughly forward

  ais = [];
  const colors = ['#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];
  for (let i = 0; i < 5; i++) {
    // Stagger start positions slightly
    let startX = track[0].x - (i+1) * 20;
    let startY = track[0].y + (i % 2 === 0 ? 20 : -20);
    let ai = new Car(startX, startY, colors[i]);
    ai.nextCheckpointIndex = 1;
    ai.angle = Math.PI / 2;
    ais.push(ai);
  }

  player.lap = 1;
  player.nextCheckpointIndex = 1;
  player.finished = false;
}

function update() {
  player.update();
  ais.forEach(ai => ai.update());

  // Calculate Position
  const allCars = [player, ...ais];
  // Sort by lap (desc), then nextCheckpoint (desc), then distance to next checkpoint (asc)
  allCars.sort((a, b) => {
     if (a.finished && !b.finished) return -1;
     if (!a.finished && b.finished) return 1;
     if (a.finished && b.finished) return a.finishTime - b.finishTime;

     if (a.lap !== b.lap) return b.lap - a.lap;
     if (a.nextCheckpointIndex !== b.nextCheckpointIndex) {
         // Handle wrap around index cases carefully or just assume forward progress
         // For a simple loop, higher index usually means further ahead
         return b.nextCheckpointIndex - a.nextCheckpointIndex;
     }
     // Distance to checkpoint
     const distA = Math.hypot(track[a.nextCheckpointIndex].x - a.x, track[a.nextCheckpointIndex].y - a.y);
     const distB = Math.hypot(track[b.nextCheckpointIndex].x - b.x, track[b.nextCheckpointIndex].y - b.y);
     return distA - distB;
  });

  const rank = allCars.indexOf(player) + 1;
  hudPos.textContent = `Pos: ${rank}/6`;
  hudLap.textContent = `Lap: ${Math.min(player.lap, MAX_LAPS)}/${MAX_LAPS}`;
  playerRank = rank;
}

function draw() {
  // Clear
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT);

  // Draw Track
  ctx.beginPath();
  ctx.moveTo(track[0].x, track[0].y);
  for (let i = 1; i < track.length; i++) {
    ctx.lineTo(track[i].x, track[i].y);
  }
  ctx.closePath();
  ctx.lineWidth = 60;
  ctx.strokeStyle = '#555';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Draw Start/Finish Line
  ctx.save();
  ctx.translate(track[0].x, track[0].y);
  // Estimate direction of track at start
  let dx = track[1].x - track[0].x;
  let dy = track[1].y - track[0].y;
  let angle = Math.atan2(dy, dx);
  ctx.rotate(angle);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, -30, 10, 60); // Checkered line base
  ctx.restore();

  // Draw Center Line (dashed)
  ctx.beginPath();
  ctx.moveTo(track[0].x, track[0].y);
  for (let i = 1; i < track.length; i++) {
    ctx.lineTo(track[i].x, track[i].y);
  }
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.setLineDash([10, 15]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw Checkpoints (Debug)
  // track.forEach(p => { ctx.fillStyle='red'; ctx.fillRect(p.x-2, p.y-2, 4, 4); });

  // Draw Cars
  ais.forEach(ai => ai.draw());
  player.draw();
}

function loop() {
  if (gameState !== 'race') return;

  update();
  draw();

  animationFrameId = requestAnimationFrame(loop);
}

function startGame() {
  gameState = 'race';
  viewStart.classList.remove('active');
  viewGame.classList.add('active');
  viewResults.classList.remove('active');

  initGame();
  loop();
}

function endGame() {
  gameState = 'results';
  cancelAnimationFrame(animationFrameId);
  viewGame.classList.remove('active');
  viewResults.classList.add('active');
  resultPosMsg.textContent = `You finished #${playerRank}!`;
}

// --- Event Listeners ---
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', () => {
    viewResults.classList.remove('active');
    viewStart.classList.add('active');
});

// Fit Canvas to Screen (Simple scaling)
function resize() {
   // Logic to scale canvas via CSS to fit screen while maintaining aspect ratio
   // Already handled by CSS max-width/max-height, but we can make internal resolution match if needed.
   // For now, fixed resolution 800x600 scaled by CSS is fine for "retro" feel.
}
window.addEventListener('resize', resize);
resize();
