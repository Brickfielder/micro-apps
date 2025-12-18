import { mountShell, registerServiceWorker } from '../../shared/shell/shell.js';
import { AppWorkflow } from '../../shared/shell/workflow.js';
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

// Instructions View
function createInstructions(workflow) {
  const container = document.createElement('div');

  const card = document.createElement('article');
  card.className = 'card';

  const heading = document.createElement('h2');
  heading.textContent = 'Instructions';

  const text = document.createElement('p');
  text.textContent = 'Stay on track with quick presets and an accessible, offline-friendly timer. Select your duration and start the timer.';

  const startBtn = createButton('Start Timer', { variant: 'primary' });
  startBtn.addEventListener('click', () => workflow.changeStep('task'));

  card.append(heading, text, startBtn);
  container.appendChild(card);

  return container;
}

// Task View
function createTask(workflow) {
  const container = document.createElement('div');
  const card = document.createElement('article');
  card.className = 'card timer-card';

  const display = document.createElement('div');
  display.className = 'timer-display';
  display.setAttribute('role', 'timer');
  display.setAttribute('aria-live', 'polite');

  const controls = document.createElement('div');
  controls.className = 'timer-controls';

  const startBtn = createButton('Start', { variant: 'primary' });
  const pauseBtn = createButton('Pause');
  const resetBtn = createButton('Reset');
  const finishBtn = createButton('Finish Session', { variant: 'primary' }); // To go to stats

  // Timer logic needs to be scoped or re-attached
  let minutesInput;
  let status;

  function setDuration(minutes) {
    state.durationMinutes = minutes;
    state.remainingMs = minutes * 60 * 1000;
    if (minutesInput) minutesInput.value = minutes;
    saveJSON(STORAGE_KEY, { minutes });
    updateDisplay();
    if (status) status.textContent = `Duration set to ${minutes} minutes`;
  }

  function updateDisplay() {
    display.textContent = formatTime(state.remainingMs);
  }

  function tick() {
    state.remainingMs -= 1000;
    if (state.remainingMs <= 0) {
      state.remainingMs = 0;
      stopTimer();
      if (status) status.textContent = 'Time is up!';
      // Optional: Auto-move to stats?
    }
    updateDisplay();
  }

  function startTimer() {
    if (state.running) return;
    state.running = true;
    if (status) status.textContent = 'Timer running';
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
    if (status) status.textContent = 'Timer reset';
  }

  startBtn.addEventListener('click', () => startTimer());
  pauseBtn.addEventListener('click', () => {
    stopTimer();
    if (status) status.textContent = 'Paused';
  });
  resetBtn.addEventListener('click', resetTimer);

  finishBtn.addEventListener('click', () => {
      stopTimer();
      workflow.changeStep('stats');
  });


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
  minutesInput = document.createElement('input');
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

  status = document.createElement('p');
  status.className = 'muted';
  status.textContent = 'Ready';
  status.setAttribute('aria-live', 'polite');

  card.append(display, controls, presetLabel, presets, customRow, status, finishBtn);
  container.appendChild(card);

  updateDisplay(); // Initialize display

  return container;
}

// Stats View
function createStats(workflow) {
  const container = document.createElement('div');
  const card = document.createElement('article');
  card.className = 'card';

  const heading = document.createElement('h2');
  heading.textContent = 'Session Complete';

  const text = document.createElement('p');
  text.textContent = 'Great job focusing! You can restart the timer whenever you are ready.';

  const restartBtn = createButton('Restart', { variant: 'primary' });
  restartBtn.addEventListener('click', () => {
      // Reset state
      state.remainingMs = state.durationMinutes * 60 * 1000;
      state.running = false;
      state.timerId = null;
      workflow.changeStep('instructions');
  });

  card.append(heading, text, restartBtn);
  container.appendChild(card);

  return container;
}

const workflow = new AppWorkflow({ container: content });
workflow.init({
  instructions: createInstructions,
  task: createTask,
  stats: createStats,
});

registerServiceWorker();
