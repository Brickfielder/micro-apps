(() => {
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

  const state = {
    stage: 'intro',
    step: 'idle',
    scenario: scenarios.withdraw20,
    card: null,
    activeCardPin: '',
    pinBuffer: '',
    pinErrors: 0,
    startTime: 0,
    actions: {},
    mode: 'standard',
    pinChange: null,
  };

  const elements = {
    stages: {
      intro: document.getElementById('stage-intro'),
      task: document.getElementById('stage-task'),
      debrief: document.getElementById('stage-debrief'),
    },
    selects: {
      scenario: document.getElementById('scenario'),
      assist: document.getElementById('assist'),
      card: document.getElementById('card'),
    },
    buttons: {
      start: document.getElementById('startBtn'),
      abort: document.getElementById('abortBtn'),
      restart: document.getElementById('restartBtn'),
    },
    screenTitle: document.getElementById('screenTitle'),
    screenText: document.getElementById('screenText'),
    pinHint: document.getElementById('pinHint'),
    slots: {
      card: document.getElementById('slot-card'),
      cash: document.getElementById('slot-cash'),
      receipt: document.getElementById('slot-receipt'),
    },
    graphics: {
      cash: document.getElementById('gfx-cash'),
      receipt: document.getElementById('gfx-receipt'),
    },
    results: {
      icon: document.getElementById('res-icon'),
      message: document.getElementById('res-msg'),
      time: document.getElementById('res-time'),
      pin: document.getElementById('res-pin'),
    },
    keyContainer: document.getElementById('keys'),
  };

  function init() {
    buildKeypad();
    bindFDKs();
    bindSlots();
    bindNav();
  }

  function buildKeypad() {
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
  }

  function bindFDKs() {
    ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'].forEach((id) => {
      const button = document.getElementById(id);
      button.addEventListener('click', () => {
        const action = state.actions[id];
        if (action) action();
      });
    });
  }

  function bindSlots() {
    elements.slots.card.addEventListener('click', onCardClick);
    elements.slots.cash.addEventListener('click', onCashClick);
    elements.slots.receipt.addEventListener('click', onReceiptClick);
  }

  function bindNav() {
    elements.buttons.start.addEventListener('click', startSession);
    elements.buttons.abort.addEventListener('click', () => endSession(false, 'Aborted'));
    elements.buttons.restart.addEventListener('click', () => switchStage('intro'));
  }

  function switchStage(name) {
    Object.values(elements.stages).forEach((stage) => stage.classList.remove('active'));
    elements.stages[name].classList.add('active');
    state.stage = name;
    window.scrollTo(0, 0);
  }

  function startSession() {
    const scenarioId = elements.selects.scenario.value;
    const cardId = elements.selects.card.value;
    const mode = elements.selects.assist.value;

    state.scenario = scenarios[scenarioId];
    state.card = cards[cardId];
    state.activeCardPin = state.card.pin;
    state.mode = mode;
    state.startTime = Date.now();
    state.pinBuffer = '';
    state.pinErrors = 0;
    state.step = 'insert_card';
    state.pinChange = null;

    resetSlots();
    elements.slots.card.classList.add('active', 'ejected');
    updateScreen('WELCOME', 'Please insert your card');

    if (mode === 'guided') {
      elements.pinHint.style.display = 'block';
      elements.pinHint.textContent = `PIN: ${state.activeCardPin}`;
      speak('Welcome. Please insert your card.');
    } else {
      elements.pinHint.style.display = 'none';
    }

    switchStage('task');
  }

  function endSession(success, message) {
    const elapsedSeconds = ((Date.now() - state.startTime) / 1000).toFixed(1);
    elements.results.icon.textContent = success ? '✅' : '❌';
    elements.results.message.textContent = message || (success ? 'Transaction Complete' : 'Transaction Failed');
    elements.results.time.textContent = `${elapsedSeconds}s`;
    elements.results.pin.textContent = state.pinErrors;
    switchStage('debrief');
  }

  function updateScreen(title, mainText, options = {}) {
    elements.screenTitle.textContent = title;
    elements.screenText.innerHTML = mainText;
    clearOptions();

    Object.entries(options).forEach(([key, opt]) => {
      const label = document.getElementById(`lbl-${key}`);
      label.textContent = opt.label;
      label.classList.add('visible');
      state.actions[key] = opt.action;
    });

    if (state.mode === 'guided' && mainText) {
      speak(mainText.replace(/<[^>]*>/g, ''));
    }
  }

  function clearOptions() {
    ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'].forEach((id) => {
      const label = document.getElementById(`lbl-${id}`);
      label.textContent = '';
      label.classList.remove('visible');
    });
    state.actions = {};
  }

  function onCardClick() {
    if (state.step === 'insert_card') {
      elements.slots.card.classList.remove('ejected', 'active');
      elements.slots.card.classList.add('inserted');
      state.step = 'pin';
      updateScreen('SECURITY CHECK', 'Enter your 4-digit PIN<br>Then press ENTER');
    } else if (state.step === 'take_card') {
      endSession(true, 'Card retrieved. Have a nice day.');
    }
  }

  function onCashClick() {
    if (state.step !== 'take_cash') return;
    elements.graphics.cash.style.height = '0';
    elements.slots.cash.classList.remove('active');

    if (state.scenario.type === 'withdraw') {
      state.step = 'return_card';
      ejectCard();
    }
  }

  function onReceiptClick() {
    if (state.step !== 'take_receipt') return;
    elements.graphics.receipt.style.height = '0';
    elements.slots.receipt.classList.remove('active');
    state.step = 'return_card';
    ejectCard();
  }

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

  function showScenarioIntro() {
    const { title, type, amount } = state.scenario;
    const description = getScenarioDescription(type, amount);

    updateScreen('SCENARIO', `${title}<br>${description}`, {
      R1: { label: 'Start Scenario', action: () => runScenario(type, amount) },
      R4: { label: 'Main Menu', action: showMainMenu },
    });
  }

  function getScenarioDescription(type, amount) {
    const descriptions = {
      withdraw: `Practice withdrawing cash${amount ? ` (£${amount})` : ''}.`,
      balance: 'Review an account balance with the option to print a receipt.',
      topup: 'Complete a quick mobile top-up using side buttons.',
      pin: 'Update your card PIN securely.',
    };
    return descriptions[type] || '';
  }

  function runScenario(type, amount) {
    switch (type) {
      case 'withdraw':
        startWithdraw(amount);
        break;
      case 'balance':
        doBalance();
        break;
      case 'topup':
        doTopUp();
        break;
      case 'pin':
        startPinChangeFlow();
        break;
      default:
        showMainMenu();
    }
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
    const labelFor = (amount) => (defaultAmount === amount ? `£${amount} (Scenario)` : `£${amount}`);

    const options = {
      R1: { label: labelFor(50), action: () => dispenseCash(50) },
      R2: { label: labelFor(20), action: () => dispenseCash(20) },
      R3: { label: labelFor(10), action: () => dispenseCash(10) },
      R4: { label: labelFor(5), action: () => dispenseCash(5) },
      L4: { label: 'Cancel', action: showMainMenu },
    };

    updateScreen('WITHDRAWAL', 'Select Amount', options);
  }

  function doBalance() {
    state.step = 'balance';
    updateScreen('BALANCE', 'Your Balance is:<br><h1>£1,240.00</h1>', {
      R4: { label: 'Print Receipt', action: () => printReceipt() },
      L4: { label: 'Back', action: showMainMenu },
    });
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

  function printReceipt() {
    updateScreen('PLEASE WAIT', 'Printing...');
    setTimeout(() => {
      elements.graphics.receipt.style.height = '60px';
      elements.slots.receipt.classList.add('active');
      state.step = 'take_receipt';
      updateScreen('COLLECT RECEIPT', 'Please take receipt');
    }, 1200);
  }

  function ejectCard() {
    state.step = 'take_card';
    elements.slots.card.classList.remove('inserted');
    elements.slots.card.classList.add('ejected', 'active');
    updateScreen('THANK YOU', 'Please take your card');
  }

  function resetSlots() {
    elements.graphics.cash.style.height = '0';
    elements.graphics.receipt.style.height = '0';
    elements.slots.cash.classList.remove('active');
    elements.slots.receipt.classList.remove('active');
    elements.slots.card.className = 'slot-unit slot-card ejected';
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    window.speechSynthesis.speak(utterance);
  }

  init();
})();
