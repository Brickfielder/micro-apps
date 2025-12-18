import { mountShell, registerServiceWorker } from '../../shared/shell/shell.js';
import { formatTime } from '../../shared/utils/format.js';
import { saveJSON, loadJSON } from '../../shared/utils/storage.js';

const STORAGE_KEY = 'demo-timer:settings';
const saved = loadJSON(STORAGE_KEY, { minutes: 25 });

const state = {
  durationMinutes: Number(saved.minutes) || 25,
  remainingMs: (Number(saved.minutes) || 25) * 60 * 1000,
  running: false,
  timerId: null,
  sessionStart: null,
  sessions: [],
};

const { content } = mountShell({
  appTitle: 'Demo Timer',
  appTagline: 'Consistent three-step flow: instructions, focus time, and review.',
  navLinks: [{ href: '../../index.html', label: 'Home' }],
});

const layout = document.createElement('main');
layout.className = 'app-layout';
content.appendChild(layout);

const header = document.createElement('header');
header.className = 'app-header';
header.innerHTML = `
  <div class="badge-inline">⏱️ Timer Tool</div>
  <div class="meta">
    <h1>Demo Timer</h1>
    <p>Follow the same structure as the other apps: learn, do, review.</p>
  </div>
`;
layout.appendChild(header);

const stageIntro = document.createElement('section');
stageIntro.id = 'stage-intro';
stageIntro.className = 'stage active';
stageIntro.innerHTML = `
  <article class="instruction-card card">
    <div class="instruction-icon" aria-hidden="true">📋</div>
    <h2 class="instruction-title">How this timer works</h2>
    <p class="instruction-desc">Choose a duration, start the timer, and record a summary at the end.</p>
    <div class="task-panel">
      <strong>Steps</strong>
      <ul>
        <li>Pick a preset or set a custom duration.</li>
        <li>Start, pause, or reset the countdown as needed.</li>
        <li>Finish to log your session stats for later review.</li>
      </ul>
    </div>
    <div class="field-group">
      <label for="intro-duration">Default duration (minutes)</label>
      <input id="intro-duration" type="number" min="1" max="180" value="${state.durationMinutes}" />
    </div>
    <div class="flex-between">
      <div class="chip-row">
        <span class="chip">Saves last duration</span>
        <span class="chip">Accessible controls</span>
        <span class="chip">Offline ready</span>
      </div>
      <button class="btn primary" id="start-flow">Start timer</button>
    </div>
  </article>
`;

const stageTask = document.createElement('section');
stageTask.id = 'stage-task';
stageTask.className = 'stage';
stageTask.innerHTML = `
  <article class="card stage-grid">
    <div class="flex-between">
      <div>
        <p class="instruction-desc" id="status">Ready</p>
        <div class="badge-inline" id="durationLabel"></div>
      </div>
      <div class="chip" id="sessionCounter">0 sessions</div>
    </div>

    <div class="timer-display" id="timerDisplay" role="timer" aria-live="polite"></div>

    <div class="timer-controls">
      <button class="btn primary" id="startBtn">Start</button>
      <button class="btn" id="pauseBtn" disabled>Pause</button>
      <button class="btn" id="resetBtn">Reset</button>
      <button class="btn" id="finishBtn">Finish & review</button>
    </div>

    <div class="stack">
      <label class="instruction-desc">Quick presets</label>
      <div class="timer-presets" id="presets"></div>
      <div class="field-group">
        <label for="minutesInput">Custom minutes</label>
        <input id="minutesInput" type="number" min="1" max="120" />
      </div>
    </div>
  </article>
`;

const stageDebrief = document.createElement('section');
stageDebrief.id = 'stage-debrief';
stageDebrief.className = 'stage';
stageDebrief.innerHTML = `
  <article class="summary-card card">
    <h2>Session summary</h2>
    <p class="instruction-desc">Review the metrics from your last run before restarting.</p>
    <div class="summary-grid">
      <div class="summary-tile">
        <div class="label">Duration set</div>
        <div class="value" id="summary-duration">-</div>
      </div>
      <div class="summary-tile">
        <div class="label">Actual time</div>
        <div class="value" id="summary-actual">-</div>
      </div>
      <div class="summary-tile">
        <div class="label">Sessions completed</div>
        <div class="value" id="summary-count">0</div>
      </div>
    </div>
    <div class="stack">
      <label for="notes" class="instruction-desc">Clinician / facilitator notes</label>
      <textarea id="notes" rows="3"></textarea>
    </div>
    <div class="flex-between">
      <button class="btn" id="restart">Restart flow</button>
      <button class="btn primary" id="backToTimer">Back to timer</button>
    </div>
  </article>
`;

layout.append(stageIntro, stageTask, stageDebrief);

const introDuration = stageIntro.querySelector('#intro-duration');
const startFlowBtn = stageIntro.querySelector('#start-flow');
const timerDisplay = stageTask.querySelector('#timerDisplay');
const status = stageTask.querySelector('#status');
const durationLabel = stageTask.querySelector('#durationLabel');
const sessionCounter = stageTask.querySelector('#sessionCounter');
const startBtn = stageTask.querySelector('#startBtn');
const pauseBtn = stageTask.querySelector('#pauseBtn');
const resetBtn = stageTask.querySelector('#resetBtn');
const finishBtn = stageTask.querySelector('#finishBtn');
const presets = stageTask.querySelector('#presets');
const minutesInput = stageTask.querySelector('#minutesInput');
const summaryDuration = stageDebrief.querySelector('#summary-duration');
const summaryActual = stageDebrief.querySelector('#summary-actual');
const summaryCount = stageDebrief.querySelector('#summary-count');
const restartBtn = stageDebrief.querySelector('#restart');
const backToTimerBtn = stageDebrief.querySelector('#backToTimer');
const notesField = stageDebrief.querySelector('#notes');

function showStage(section) {
  [stageIntro, stageTask, stageDebrief].forEach((el) => el.classList.remove('active'));
  section.classList.add('active');
}

function syncDuration(newMinutes) {
  state.durationMinutes = newMinutes;
  state.remainingMs = newMinutes * 60 * 1000;
  minutesInput.value = newMinutes;
  durationLabel.textContent = `${newMinutes} minute session`;
  saveJSON(STORAGE_KEY, { minutes: newMinutes });
  updateDisplay();
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(state.remainingMs);
}

function tick() {
  state.remainingMs -= 1000;
  if (state.remainingMs <= 0) {
    state.remainingMs = 0;
    completeSession('Timer ended');
    return;
  }
  updateDisplay();
}

function startTimer() {
  if (state.running) return;
  state.running = true;
  state.sessionStart = Date.now();
  status.textContent = 'Timer running';
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  state.timerId = window.setInterval(tick, 1000);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.running = false;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

function resetTimer() {
  stopTimer();
  state.remainingMs = state.durationMinutes * 60 * 1000;
  status.textContent = 'Timer reset';
  updateDisplay();
}

function completeSession(reason) {
  stopTimer();
  const elapsedMs = Math.max(0, state.durationMinutes * 60 * 1000 - state.remainingMs);
  state.sessions.push({
    duration: state.durationMinutes,
    elapsedMs,
    reason,
    notes: notesField.value,
  });
  summaryDuration.textContent = `${state.durationMinutes} minutes`;
  summaryActual.textContent = formatTime(elapsedMs);
  summaryCount.textContent = `${state.sessions.length}`;
  sessionCounter.textContent = `${state.sessions.length} session${state.sessions.length === 1 ? '' : 's'}`;
  status.textContent = `${reason}.`;
  showStage(stageDebrief);
}

startFlowBtn.addEventListener('click', () => {
  const minutes = Number(introDuration.value);
  if (Number.isFinite(minutes) && minutes > 0) {
    syncDuration(minutes);
  }
  notesField.value = '';
  showStage(stageTask);
  updateDisplay();
});

[5, 10, 25].forEach((minutes) => {
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = `${minutes} min`;
  btn.addEventListener('click', () => syncDuration(minutes));
  presets.appendChild(btn);
});

minutesInput.addEventListener('change', () => {
  const value = Number(minutesInput.value);
  if (!Number.isFinite(value) || value <= 0) return;
  syncDuration(value);
});

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', () => {
  stopTimer();
  status.textContent = 'Paused';
});
resetBtn.addEventListener('click', resetTimer);
finishBtn.addEventListener('click', () => completeSession('Session finished'));

restartBtn.addEventListener('click', () => {
  resetTimer();
  showStage(stageIntro);
});

backToTimerBtn.addEventListener('click', () => {
  resetTimer();
  showStage(stageTask);
});

syncDuration(state.durationMinutes);
updateDisplay();
registerServiceWorker();
