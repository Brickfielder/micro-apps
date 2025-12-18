import { mountShell } from '../../shared/shell/shell.js';
import { AppWorkflow } from '../../shared/shell/workflow.js';
import { createButton } from '../../shared/ui/components.js';

// --- Assets & Data ---
const cards = {
  A: { pin: '5241', name: 'Blue' },
  B: { pin: '7309', name: 'Gold' },
};

const scenarios = {
  withdraw20: { title: 'Withdraw £20', type: 'withdraw', amount: 20 },
  balance: { title: 'Check Balance', type: 'balance' },
  topup: { title: 'Mobile Top-up', type: 'topup' },
  pin: { title: 'Change PIN', type: 'pin' },
};

// --- Shell Setup ---
const { content } = mountShell({
  appTitle: 'CashPoint Coach',
  appTagline: 'Practice ATM interactions with guided assistance.',
  navLinks: [{ href: '../../index.html', label: 'Home' }],
});

// --- State Management ---
// We'll keep a session state object that survives between view re-renders (if needed)
// but mostly the task view will manage its own internal state during the task.
let sessionState = {
  scenarioId: 'withdraw20',
  mode: 'standard',
  cardId: 'A',
  lastResult: null
};

// --- Workflow Views ---

// 1. Instructions View
function createInstructions(workflow) {
  const container = document.createElement('div');
  container.className = 'instruction-shell';

  container.innerHTML = `
    <div class="instruction-card">
      <div class="instruction-icon" aria-hidden="true">🏧</div>
      <h1 class="instruction-title">Welcome to the ATM simulator</h1>
      <p class="instruction-desc">Choose a scenario, pick your preferred mode, and start practicing secure ATM interactions.</p>

      <div class="task-panel" aria-label="How it works">
        <strong>How it works</strong>
        <ul>
          <li>Use the side buttons beside the screen to select on-screen options.</li>
          <li>Enter PINs and amounts with the keypad. Cancel or clear as needed.</li>
          <li>Click the card, cash, or receipt slots to insert or collect items.</li>
        </ul>
      </div>

      <div class="config-grid intro-grid">
        <label class="ctrl">
          <span>Scenario</span>
          <select id="scenario-select">
            <option value="withdraw20">Withdraw £20</option>
            <option value="balance">Check Balance</option>
            <option value="topup">Mobile Top-up</option>
            <option value="pin">Change PIN</option>
          </select>
        </label>
        <label class="ctrl">
          <span>Mode</span>
          <select id="mode-select">
            <option value="guided">Guided (Voice + Text)</option>
            <option value="standard" selected>Standard</option>
          </select>
        </label>
        <label class="ctrl">
          <span>Card</span>
          <select id="card-select">
            <option value="A">Blue Card (PIN: 5241)</option>
            <option value="B">Gold Card (PIN: 7309)</option>
          </select>
        </label>
      </div>

      <div class="instruction-actions"></div>
    </div>
  `;

  // Restore selection if returning
  const scenarioSelect = container.querySelector('#scenario-select');
  const modeSelect = container.querySelector('#mode-select');
  const cardSelect = container.querySelector('#card-select');

  scenarioSelect.value = sessionState.scenarioId;
  modeSelect.value = sessionState.mode;
  cardSelect.value = sessionState.cardId;

  const startBtn = createButton('Insert Card to Start', { variant: 'primary' });
  startBtn.id = 'startBtn'; // keeping ID for CSS if needed
  startBtn.addEventListener('click', () => {
    sessionState.scenarioId = scenarioSelect.value;
    sessionState.mode = modeSelect.value;
    sessionState.cardId = cardSelect.value;
    workflow.changeStep('task');
  });

  container.querySelector('.instruction-actions').appendChild(startBtn);

  return container;
}

// 2. Task View
function createTask(workflow) {
  const container = document.createElement('div');
  container.id = 'stage-task';
  container.className = 'stage active'; // Using existing CSS classes

  // HTML Structure from original index.html
  container.innerHTML = `
      <div class="atm-wrapper">
        <div class="atm-unit">
          <div class="atm-sign">
            <span class="sign-top">CASH</span>
            <span class="sign-sub">MACHINE</span>
          </div>

          <div class="atm-body">
            <div class="col-left">
              <div class="screen-assembly">
                <div class="fdk-col left">
                  <button class="fdk-btn" id="L1" aria-label="Left option 1"></button>
                  <button class="fdk-btn" id="L2" aria-label="Left option 2"></button>
                  <button class="fdk-btn" id="L3" aria-label="Left option 3"></button>
                  <button class="fdk-btn" id="L4" aria-label="Left option 4"></button>
                </div>

                <div class="crt-screen">
                  <div class="screen-header" id="screenTitle">WELCOME</div>
                  <div class="screen-main" id="screenText">System Ready</div>

                  <div class="os-labels" aria-hidden="true">
                    <div class="os-col left">
                      <div class="os-label" id="lbl-L1"></div>
                      <div class="os-label" id="lbl-L2"></div>
                      <div class="os-label" id="lbl-L3"></div>
                      <div class="os-label" id="lbl-L4"></div>
                    </div>
                    <div class="os-col right">
                      <div class="os-label" id="lbl-R1"></div>
                      <div class="os-label" id="lbl-R2"></div>
                      <div class="os-label" id="lbl-R3"></div>
                      <div class="os-label" id="lbl-R4"></div>
                    </div>
                  </div>
                </div>

                <div class="fdk-col right">
                  <button class="fdk-btn" id="R1" aria-label="Right option 1"></button>
                  <button class="fdk-btn" id="R2" aria-label="Right option 2"></button>
                  <button class="fdk-btn" id="R3" aria-label="Right option 3"></button>
                  <button class="fdk-btn" id="R4" aria-label="Right option 4"></button>
                </div>
              </div>

              <div class="keypad-shelf">
                <div class="keys" id="keys" aria-label="Keypad"></div>
              </div>
            </div>

            <div class="col-right">
              <div class="slot-unit" id="slot-receipt">
                <div class="slot-label">Receipt</div>
                <div class="slot-face">
                  <div class="receipt-graphic" id="gfx-receipt">RCPT</div>
                  <div class="slot-aperture"></div>
                </div>
              </div>

              <div class="slot-unit slot-card ejected active" id="slot-card">
                <div class="slot-label">Card</div>
                <div class="slot-face">
                  <div class="card-graphic" aria-hidden="true"></div>
                  <div class="slot-aperture"></div>
                </div>
              </div>

              <div class="slot-unit" id="slot-cash">
                <div class="slot-label">Cash</div>
                <div class="slot-face">
                  <div class="cash-graphic" id="gfx-cash"></div>
                  <div class="slot-aperture"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="helper-badge" id="pinHint" aria-live="polite"></div>
        </div>

        <div class="controls">
          <button id="abortBtn" class="btn secondary">Abort Transaction</button>
        </div>
      </div>
  `;

  // --- Task Logic ---

  const state = {
    step: 'idle',
    scenario: scenarios[sessionState.scenarioId],
    card: cards[sessionState.cardId],
    activeCardPin: cards[sessionState.cardId].pin,
    pinBuffer: '',
    pinErrors: 0,
    startTime: Date.now(),
    actions: {},
    mode: sessionState.mode,
    pinChange: null,
  };

  const elements = {
    screenTitle: container.querySelector('#screenTitle'),
    screenText: container.querySelector('#screenText'),
    pinHint: container.querySelector('#pinHint'),
    slots: {
        card: container.querySelector('#slot-card'),
        cash: container.querySelector('#slot-cash'),
        receipt: container.querySelector('#slot-receipt'),
    },
    graphics: {
        cash: container.querySelector('#gfx-cash'),
        receipt: container.querySelector('#gfx-receipt'),
    },
    keyContainer: container.querySelector('#keys'),
    abortBtn: container.querySelector('#abortBtn')
  };

  // Helper functions
  function speak(text) {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      window.speechSynthesis.speak(utterance);
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function updateScreen(title, mainText, options = {}) {
    elements.screenTitle.textContent = title;
    elements.screenText.innerHTML = mainText;

    // Clear options
    ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'].forEach((id) => {
      const label = container.querySelector(`#lbl-${id}`);
      label.textContent = '';
      label.classList.remove('visible');
    });
    state.actions = {};

    Object.entries(options).forEach(([key, opt]) => {
      const label = container.querySelector(`#lbl-${key}`);
      label.textContent = opt.label;
      label.classList.add('visible');
      state.actions[key] = opt.action;
    });

    if (state.mode === 'guided' && mainText) {
      speak(mainText.replace(/<[^>]*>/g, ''));
    }
  }

  function endSession(success, message) {
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - state.startTime) / 1000));

    sessionState.lastResult = {
      scenario: state.scenario?.title || 'N/A',
      mode: state.mode,
      card: state.card?.name || 'N/A',
      success,
      message,
      timeSeconds: elapsedSeconds,
      pinErrors: state.pinErrors,
      timestamp: new Date().toISOString(),
      formattedTime: formatTime(elapsedSeconds)
    };

    workflow.changeStep('stats');
  }

  // --- Interaction Handlers ---

  function onKey(key) {
    if (state.step === 'pin') {
      handlePinEntry(key);
    } else if (state.step === 'pin_change') {
      handlePinChangeEntry(key);
    }
  }

  function handlePinEntry(key) {
    if (key === 'Clear') {
      state.pinBuffer = '';
      elements.screenText.innerHTML = 'Enter your 4-digit PIN<br>Then press ENTER';
      return;
    }

    if (key === 'Cancel') {
      ejectCard();
      return;
    }

    if (key === 'Enter') {
      if (state.pinBuffer === state.activeCardPin) {
        state.step = 'scenario_intro';
        showScenarioIntro();
      } else {
        state.pinErrors += 1;
        state.pinBuffer = '';
        updateScreen('INCORRECT PIN', 'Please try again.');
        if (state.pinErrors >= 3) endSession(false, 'Card Retained: Too many attempts');
      }
      return;
    }

    if (state.pinBuffer.length < 4 && /^\d$/.test(key)) {
      state.pinBuffer += key;
      elements.screenText.innerHTML = 'Enter PIN:<br>' + '*'.repeat(state.pinBuffer.length);
    }
  }

  function handlePinChangeEntry(key) {
    if (key === 'Clear') {
        state.pinBuffer = '';
        const prompt = state.pinChange.stage === 'new' ? 'Enter new 4-digit PIN<br>Then press ENTER' : 'Re-enter new PIN<br>Then press ENTER';
        elements.screenText.innerHTML = prompt;
        return;
      }

      if (key === 'Cancel') {
        showMainMenu();
        return;
      }

      if (key === 'Enter') {
        if (state.pinBuffer.length !== 4) {
          updateScreen('CHANGE PIN', 'PIN must be 4 digits.<br>Please try again.', {
            L4: { label: 'Cancel', action: showMainMenu },
          });
          state.pinBuffer = '';
          return;
        }

        if (state.pinChange.stage === 'new') {
          state.pinChange.temp = state.pinBuffer;
          state.pinBuffer = '';
          state.pinChange.stage = 'confirm';
          updateScreen('CONFIRM PIN', 'Re-enter new PIN<br>Then press ENTER', {
            L4: { label: 'Cancel', action: showMainMenu },
          });
          return;
        }

        if (state.pinBuffer === state.pinChange.temp) {
          state.activeCardPin = state.pinBuffer;
          state.pinBuffer = '';
          endSession(true, 'PIN changed successfully');
        } else {
          state.pinBuffer = '';
          state.pinChange.stage = 'new';
          updateScreen('PIN MISMATCH', 'Entries did not match.<br>Start again.', {
            L4: { label: 'Cancel', action: showMainMenu },
          });
        }
        return;
      }

      if (state.pinBuffer.length < 4 && /^\d$/.test(key)) {
        state.pinBuffer += key;
        elements.screenText.innerHTML = 'Enter PIN:<br>' + '*'.repeat(state.pinBuffer.length);
      }
  }

  function showScenarioIntro() {
    const { title, type, amount } = state.scenario;
    const description = (type === 'withdraw' ? `Practice withdrawing cash${amount ? ` (£${amount})` : ''}.` :
                         type === 'balance' ? 'Review an account balance with the option to print a receipt.' :
                         type === 'topup' ? 'Complete a quick mobile top-up using side buttons.' :
                         'Update your card PIN securely.');

    updateScreen('SCENARIO', `${title}<br>${description}`, {
      R1: { label: 'Start Scenario', action: () => runScenario(type, amount) },
      R4: { label: 'Main Menu', action: showMainMenu },
    });
  }

  function runScenario(type, amount) {
    if (type === 'withdraw') startWithdraw(amount);
    else if (type === 'balance') doBalance();
    else if (type === 'topup') doTopUp();
    else if (type === 'pin') startPinChangeFlow();
    else showMainMenu();
  }

  function showMainMenu() {
    state.step = 'menu';
    updateScreen('MAIN MENU', 'Select a transaction', {
      R1: { label: 'Withdraw Cash', action: () => startWithdraw() },
      R2: { label: 'Check Balance', action: () => doBalance() },
      R3: { label: 'Mobile Top-Up', action: () => doTopUp() },
      R4: { label: 'Return Card', action: () => ejectCard() },
    });
  }

  function startWithdraw(defaultAmount) {
    const labelFor = (amount) => `£${amount}`;
    const options = {
      R1: { label: labelFor(50), action: () => dispenseCash(50) },
      R2: { label: labelFor(20), action: () => dispenseCash(20) },
      R3: { label: labelFor(10), action: () => dispenseCash(10) },
      R4: { label: labelFor(5), action: () => dispenseCash(5) },
      L4: { label: 'Cancel', action: showMainMenu },
    };
    updateScreen('WITHDRAWAL', 'Select Amount', options);
  }

  function dispenseCash(amount) {
    state.step = 'dispensing';
    updateScreen('PLEASE WAIT', `Dispensing £${amount}...`);
    setTimeout(() => {
      elements.graphics.cash.style.height = '40px';
      elements.slots.cash.classList.add('active');
      state.step = 'take_cash';
      updateScreen('COLLECT CASH', 'Please take your cash');
    }, 1200);
  }

  function doBalance() {
    state.step = 'balance';
    updateScreen('BALANCE', 'Your Balance is:<br><h1>£1,240.00</h1>', {
      R4: { label: 'Print Receipt', action: () => printReceipt() },
      L4: { label: 'Back', action: showMainMenu },
    });
  }

  function printReceipt() {
    updateScreen('PLEASE WAIT', 'Printing...');
    setTimeout(() => {
      elements.graphics.receipt.style.height = '60px';
      elements.slots.receipt.classList.add('active');
      state.step = 'take_receipt';
      updateScreen('COLLECT RECEIPT', 'Please take receipt');
    }, 1200);
  }

  function doTopUp() {
    state.step = 'topup';
    updateScreen('TOP UP', 'Select Network', {
      R1: { label: 'Vodafone', action: () => confirmTopUp('Vodafone') },
      R2: { label: 'O2', action: () => confirmTopUp('O2') },
      L4: { label: 'Back', action: showMainMenu },
    });
  }

  function confirmTopUp(network) {
    endSession(true, `${network} top up successful`);
  }

  function startPinChangeFlow() {
    state.pinChange = { stage: 'new', temp: '' };
    state.pinBuffer = '';
    state.step = 'pin_change';
    updateScreen('CHANGE PIN', 'Enter new 4-digit PIN<br>Then press ENTER', {
      L4: { label: 'Cancel', action: showMainMenu },
    });
  }

  function ejectCard() {
    state.step = 'take_card';
    elements.slots.card.classList.remove('inserted');
    elements.slots.card.classList.add('ejected', 'active');
    updateScreen('THANK YOU', 'Please take your card');
  }


  // --- Event Bindings ---

  // Keypad
  const layout = ['1', '2', '3', 'Cancel', '4', '5', '6', 'Clear', '7', '8', '9', 'Enter', '', '0', '', ''];
  layout.forEach((keyLabel) => {
      const btn = document.createElement('button');
      btn.className = 'key';

      if (!keyLabel) {
        btn.classList.add('empty');
      } else {
        btn.textContent = keyLabel;
        if (['Cancel', 'Clear', 'Enter'].includes(keyLabel)) {
          btn.classList.add(`fn-${keyLabel.toLowerCase()}`);
        }
        btn.addEventListener('click', () => onKey(keyLabel));
      }

      elements.keyContainer.appendChild(btn);
  });

  // FDKs
  ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'].forEach((id) => {
      const button = container.querySelector(`#${id}`);
      button.addEventListener('click', () => {
        const action = state.actions[id];
        if (action) action();
      });
  });

  // Slots
  elements.slots.card.addEventListener('click', () => {
    if (state.step === 'insert_card') {
      elements.slots.card.classList.remove('ejected', 'active');
      elements.slots.card.classList.add('inserted');
      state.step = 'pin';
      updateScreen('SECURITY CHECK', 'Enter your 4-digit PIN<br>Then press ENTER');
    } else if (state.step === 'take_card') {
      endSession(true, 'Card retrieved. Have a nice day.');
    }
  });

  elements.slots.cash.addEventListener('click', () => {
    if (state.step !== 'take_cash') return;
    elements.graphics.cash.style.height = '0';
    elements.slots.cash.classList.remove('active');

    if (state.scenario.type === 'withdraw') {
      state.step = 'return_card';
      ejectCard();
    }
  });

  elements.slots.receipt.addEventListener('click', () => {
    if (state.step !== 'take_receipt') return;
    elements.graphics.receipt.style.height = '0';
    elements.slots.receipt.classList.remove('active');
    state.step = 'return_card';
    ejectCard();
  });

  elements.abortBtn.addEventListener('click', () => endSession(false, 'Aborted'));


  // --- Initialization ---
  state.step = 'insert_card';
  elements.slots.card.classList.add('active', 'ejected');
  updateScreen('WELCOME', 'Please insert your card');

  if (state.mode === 'guided') {
      elements.pinHint.style.display = 'block';
      elements.pinHint.textContent = `PIN: ${state.activeCardPin}`;
      speak('Welcome. Please insert your card.');
  } else {
      elements.pinHint.style.display = 'none';
  }


  return container;
}


// 3. Stats View
function createStats(workflow) {
  const container = document.createElement('div');
  container.className = 'summary-card';
  const result = sessionState.lastResult;

  container.innerHTML = `
        <h1 id="debrief-heading">Session Complete</h1>
        <p id="res-msg">${result.message}</p>

        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-val">${result.formattedTime}</span>
            <span class="stat-lbl">Time Taken</span>
          </div>
          <div class="stat-card">
            <span class="stat-val">${result.mode === 'guided' ? 'Guided' : 'Standard'}</span>
            <span class="stat-lbl">Mode Used</span>
          </div>
          <div class="stat-card">
            <span class="stat-val">${result.scenario}</span>
            <span class="stat-lbl">Scenario</span>
          </div>
          <div class="stat-card">
            <span class="stat-val">${result.pinErrors}</span>
            <span class="stat-lbl">PIN Errors</span>
          </div>
        </div>

        <div class="comment-block">
          <label class="comment-label" for="clinicianComment">Clinician comment</label>
          <textarea
            id="clinicianComment"
            name="clinicianComment"
            class="comment-area"
            placeholder="Add any observations or follow-up notes here..."
            rows="3"
          ></textarea>
        </div>

        <div class="footer-actions"></div>
  `;

  const actions = container.querySelector('.footer-actions');

  const restartBtn = createButton('Restart', { variant: 'secondary' });
  restartBtn.addEventListener('click', () => workflow.changeStep('instructions'));

  const downloadBtn = createButton('Export Result', { variant: 'primary' });
  downloadBtn.addEventListener('click', () => {
      downloadStats(result, container.querySelector('#clinicianComment').value);
  });

  actions.append(restartBtn, downloadBtn);

  return container;
}

function downloadStats(result, comment) {
    const headers = ['Scenario', 'Mode', 'Card', 'Result', 'Message', 'TimeSeconds', 'PinErrors', 'Timestamp', 'Comment'];
    const values = [
      result.scenario,
      result.mode,
      result.card,
      result.success ? 'Success' : 'Failure',
      result.message,
      result.timeSeconds,
      result.pinErrors,
      result.timestamp,
      comment || '',
    ];

    const csv = `${headers.join(',')}\n${values
      .map((value) => {
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',')}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cashpoint-session-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}


// --- Initialize Workflow ---
const workflow = new AppWorkflow({ container: content });
workflow.init({
  instructions: createInstructions,
  task: createTask,
  stats: createStats,
});
