import { mountShell, registerServiceWorker } from '../../shared/shell/shell.js';
import { createButton } from '../../shared/ui/components.js';
import { formatTime } from '../../shared/utils/format.js';
import { saveJSON, loadJSON } from '../../shared/utils/storage.js';

const STORAGE_KEY = 'demo-timer:settings';
const saved = loadJSON(STORAGE_KEY, { minutes: 25 });

const state = {
  durationMinutes: Number(saved.minutes) || 25,
  remainingMs: (Number(saved.minutes) || 25) * 60 * 1000,
  running: false,
  timerId: null,
};

const { content } = mountShell({
  appTitle: 'Demo Timer',
  appTagline: 'Minimal focus timer with presets and persistence.',
  navLinks: [{ href: '../../index.html', label: 'Home' }],
});

const card = document.createElement('article');
card.className = 'card timer-card';

const intro = document.createElement('p');
intro.textContent = 'Stay on track with quick presets and an accessible, offline-friendly timer.';

const display = document.createElement('div');
display.className = 'timer-display';
display.setAttribute('role', 'timer');
display.setAttribute('aria-live', 'polite');

const controls = document.createElement('div');
controls.className = 'timer-controls';

const startBtn = createButton('Start', { variant: 'primary' });
const pauseBtn = createButton('Pause');
const resetBtn = createButton('Reset');

const presets = document.createElement('div');
presets.className = 'timer-presets';

[5, 10, 25].forEach((minutes) => {
  const btn = createButton(`${minutes} min`);
  btn.addEventListener('click', () => setDuration(minutes));
  presets.appendChild(btn);
});

const customRow = document.createElement('div');
customRow.className = 'input-row';

const label = document.createElement('label');
label.innerHTML = '<span>Custom minutes</span>';
const minutesInput = document.createElement('input');
minutesInput.type = 'number';
minutesInput.min = '1';
minutesInput.max = '120';
minutesInput.value = state.durationMinutes;
minutesInput.inputMode = 'numeric';
minutesInput.addEventListener('change', () => {
  const value = Number(minutesInput.value);
  if (!Number.isFinite(value) || value <= 0) return;
  setDuration(value);
});
label.appendChild(minutesInput);
customRow.appendChild(label);

controls.append(startBtn, pauseBtn, resetBtn);

const presetLabel = document.createElement('p');
presetLabel.className = 'muted';
presetLabel.textContent = 'Quick presets';

const status = document.createElement('p');
status.className = 'muted';
status.textContent = 'Ready';
status.setAttribute('aria-live', 'polite');

card.append(intro, display, controls, presetLabel, presets, customRow, status);
content.appendChild(card);

function setDuration(minutes) {
  state.durationMinutes = minutes;
  state.remainingMs = minutes * 60 * 1000;
  minutesInput.value = minutes;
  saveJSON(STORAGE_KEY, { minutes });
  updateDisplay();
  status.textContent = `Duration set to ${minutes} minutes`;
}

function updateDisplay() {
  display.textContent = formatTime(state.remainingMs);
}

function tick() {
  state.remainingMs -= 1000;
  if (state.remainingMs <= 0) {
    state.remainingMs = 0;
    stopTimer();
    status.textContent = 'Time is up!';
  }
  updateDisplay();
}

function startTimer() {
  if (state.running) return;
  state.running = true;
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
  updateDisplay();
  status.textContent = 'Timer reset';
}

startBtn.addEventListener('click', () => startTimer());
pauseBtn.addEventListener('click', () => {
  stopTimer();
  status.textContent = 'Paused';
});
resetBtn.addEventListener('click', resetTimer);

updateDisplay();
registerServiceWorker();
