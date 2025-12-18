import { mountShell } from '../../shared/shell/shell.js';
import { AppWorkflow } from '../../shared/shell/workflow.js';
import { createButton } from '../../shared/ui/components.js';

// --- Data & Configuration ---
const DEFAULT_EMOTIONS = [
  'happy',
  'excited',
  'frustrated',
  'irritated',
  'calm',
  'disappointed',
  'guilty',
  'sad',
  'defensive',
  'anxious',
  'embarrassed',
  'angry',
  'relieved',
  'neutral',
  'confused',
  'optimistic',
  'proud',
  'distant',
  'supportive',
  'jealous',
  'envious',
  'hurt',
  'curious',
  'content',
  'resentful',
  'surprised',
  'hopeful',
  'grateful',
  'appreciative',
  'concerned',
  'bored',
  'regretful',
  'apathetic',
  'withdrawn',
];

const SCENARIOS = [
  {
    id: 'project-checkin',
    title: 'Project Check-in',
    people: { A: 'Alex', B: 'Morgan' },
    messages: [
      { from: 'A', text: "I reworked the slides again last night. I'm still not sure the client will follow the story." },
      { from: 'B', text: "They'll see the effort you've put in. The flow is much clearer now." },
      { from: 'A', text: "I keep thinking about that awkward silence during the last review." },
      { from: 'B', text: "That was on us for not giving context. I'll step in sooner this time." },
      { from: 'A', text: "Thanks. My stomach's doing flips just imagining their questions." },
      { from: 'B', text: "Let's rehearse together after lunch. We'll tighten the risky sections." },
    ],
    correct: { A: ['anxious', 'hopeful'], B: ['supportive', 'concerned'] },
    cues: {
      A: 'Keeps revisiting past mistakes and anticipates tough questions.',
      B: 'Offers reassurance and plans to help with context and rehearsals.',
    },
  },
  {
    id: 'family-dinner',
    title: 'Family Dinner',
    people: { A: 'Jamie', B: 'Taylor' },
    messages: [
      { from: 'A', text: "Mom texted about tonight. She wants us to talk through the holiday plans together." },
      { from: 'B', text: "Right, and she hinted that we should apologize for missing last weekend." },
      { from: 'A', text: "I already feel guilty. I hate the idea of another argument." },
      { from: 'B', text: "We can be honest without fighting. I'll back you up if it gets tense." },
      { from: 'A', text: "Okay. I just need to breathe and not shut down when dad starts lecturing." },
      { from: 'B', text: "If you need a break, give me the look and we'll step outside for a minute." },
    ],
    correct: { A: ['guilty', 'anxious'], B: ['supportive', 'calm'] },
    cues: {
      A: 'Worries about conflict and expresses remorse before the dinner begins.',
      B: 'Speaks steadily, focuses on solutions, and offers to intervene.',
    },
  },
];

let sessionState = {
    scenarioId: 'project-checkin',
    distractors: 8,
    results: [],
    lastAnalysis: null,
    transcriptHTML: ''
};

// --- Shell Setup ---
const { content } = mountShell({
  appTitle: 'Emotion Chat',
  appTagline: 'Social Cognition Micro-App',
  navLinks: [{ href: '../../index.html', label: 'Home' }],
});

// --- Workflow Views ---

// 1. Instructions View
function createInstructions(workflow) {
  const container = document.createElement('div');
  container.className = 'stage active';
  container.id = 'stage-intro';

  container.innerHTML = `
      <div class="screen-content instruction-card">
        <div class="instruction-icon" aria-hidden="true">💬</div>
        <h1>Emotion Chat</h1>
        <p class="instruction-desc">Observe a conversation between two people. Identify their emotions based on context and dialogue.</p>

        <div class="task-panel" aria-label="What to do">
          <strong>What to do</strong>
          <ul>
            <li>Watch the chat transcript and note how each speaker seems to feel.</li>
            <li>Capture your first impressions, then choose emotions from the guided list.</li>
            <li>Move on to the next scenario when you are ready.</li>
          </ul>
        </div>

        <div class="config-group">
          <div class="ctrl">
            <label for="scenario">Select Scenario</label>
            <select id="scenario"></select>
          </div>
          <div class="ctrl">
            <label for="distractors">Difficulty (distractors per person)</label>
            <select id="distractors">
              <option>6</option><option selected>8</option><option>10</option><option>12</option><option>14</option>
            </select>
          </div>
        </div>

        <div class="action-bar"></div>
      </div>
  `;

  const scenarioSel = container.querySelector('#scenario');
  const distractorsSel = container.querySelector('#distractors');

  SCENARIOS.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.title;
    scenarioSel.appendChild(opt);
  });

  scenarioSel.value = sessionState.scenarioId;
  distractorsSel.value = sessionState.distractors;

  const startBtn = createButton('Start Session', { variant: 'primary' });
  startBtn.className = 'btn primary full';
  startBtn.addEventListener('click', () => {
      sessionState.scenarioId = scenarioSel.value;
      sessionState.distractors = parseInt(distractorsSel.value, 10);
      workflow.changeStep('task');
  });

  container.querySelector('.action-bar').appendChild(startBtn);

  return container;
}

// 2. Task View
function createTask(workflow) {
    const container = document.createElement('div');
    container.className = 'stage active';
    container.id = 'stage-task';

    container.innerHTML = `
      <div class="toolbar-row">
        <span class="small" id="status" aria-live="polite">Playing...</span>
        <span class="small" id="timerText">0s</span>
      </div>

      <div class="app-grid">
        <section class="card" aria-labelledby="chatTitle">
          <h2 id="chatTitle">Chat</h2>
          <div id="chat" class="chat" aria-label="Chat transcript" aria-live="polite"></div>
          <div class="progress-text">
             <span id="progress">0 / 0</span>
          </div>
        </section>

        <section class="card" aria-labelledby="respTitle">
          <h2 id="respTitle">Your Analysis</h2>

          <div class="step-box" id="step1">
            <h3>Step 1 — Free choice</h3>
            <p class="small" id="step1Hint">Wait for the chat to finish...</p>

            <div class="row">
              <div>
                <label class="legend" for="freeA" id="labelA">Person A</label>
                <textarea id="freeA" placeholder="Type emotions..."></textarea>
              </div>
              <div>
                <label class="legend" for="freeB" id="labelB">Person B</label>
                <textarea id="freeB" placeholder="Type emotions..."></textarea>
              </div>
            </div>

            <div class="actions">
              <button class="btn primary" id="proceed" disabled>Continue</button>
            </div>
          </div>

          <div class="step-box" id="step2" hidden>
            <h3>Step 2 — Select from list</h3>

            <div class="legend" id="pillTitleA">Person A</div>
            <div class="pillgrid" id="pillsA"></div>

            <div class="divider"></div>

            <div class="legend" id="pillTitleB">Person B</div>
            <div class="pillgrid" id="pillsB"></div>

            <div class="actions">
              <button class="btn primary" id="submit" disabled>Finish &amp; Review</button>
            </div>
          </div>
        </section>
      </div>
    `;

    // Elements
    const chatEl = container.querySelector('#chat');
    const statusEl = container.querySelector('#status');
    const timerText = container.querySelector('#timerText');
    const progressEl = container.querySelector('#progress');
    const chatTitle = container.querySelector('#chatTitle');
    const step1Div = container.querySelector('#step1');
    const step2Div = container.querySelector('#step2');
    const freeA = container.querySelector('#freeA');
    const freeB = container.querySelector('#freeB');
    const proceedBtn = container.querySelector('#proceed');
    const step1Hint = container.querySelector('#step1Hint');
    const submitBtn = container.querySelector('#submit');
    const pillsA = container.querySelector('#pillsA');
    const pillsB = container.querySelector('#pillsB');
    const labelA = container.querySelector('#labelA');
    const labelB = container.querySelector('#labelB');
    const pillTitleA = container.querySelector('#pillTitleA');
    const pillTitleB = container.querySelector('#pillTitleB');

    // State
    const currentScenario = SCENARIOS.find((s) => s.id === sessionState.scenarioId) || SCENARIOS[0];
    let idx = 0;
    let startTime = Date.now();
    let revealed = false;
    let timer = null;
    let tickInt = null;
    let masterEmotionIds = DEFAULT_EMOTIONS.slice();

    // Setup
    chatTitle.textContent = currentScenario.title;
    const nameA = currentScenario.people?.A || 'A';
    const nameB = currentScenario.people?.B || 'B';
    labelA.textContent = `What was ${nameA} feeling?`;
    labelB.textContent = `What was ${nameB} feeling?`;
    pillTitleA.textContent = nameA;
    pillTitleB.textContent = nameB;

    // Logic
    function secondsSince(t0) { return Math.max(0, Math.round((Date.now() - t0) / 1000)); }
    const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
    const formatEmotion = (id) => id.charAt(0).toUpperCase() + id.slice(1);

    function addBubble(message) {
      const wrap = document.createElement('div');
      const bubble = document.createElement('div');
      const who = document.createElement('span');
      const from = message.from;
      const name = currentScenario?.people?.[from] || from;
      who.className = 'name';
      who.textContent = name;
      bubble.className = `bubble ${from === 'A' ? 'fromA' : 'fromB'}`;
      bubble.textContent = message.text;
      wrap.appendChild(who);
      wrap.appendChild(bubble);
      wrap.style.textAlign = from === 'A' ? 'left' : 'right';
      chatEl.appendChild(wrap);
      chatEl.scrollTop = chatEl.scrollHeight;
    }

    function playChat() {
        statusEl.textContent = 'Playing...';
        timerText.textContent = '0s';

        tickInt = setInterval(() => {
            if (startTime) timerText.textContent = `${secondsSince(startTime)}s`;
        }, 1000);

        const run = () => {
            if (idx >= currentScenario.messages.length) {
            finishChat();
            return;
            }
            const message = currentScenario.messages[idx++];
            addBubble(message);
            progressEl.textContent = `${idx} / ${currentScenario.messages.length}`;
            if (idx >= currentScenario.messages.length) finishChat();
        };

        timer = setInterval(run, 3000);
        run();
    }

    function finishChat() {
        clearInterval(timer);
        clearInterval(tickInt);
        statusEl.textContent = 'Chat complete';
        revealed = true;
        updateProceedState();
    }

    function updateProceedState() {
      const filled = freeA.value.trim().length > 0 && freeB.value.trim().length > 0;
      if (!revealed) {
        step1Hint.textContent = 'Wait for the chat to finish...';
        proceedBtn.disabled = true;
      } else {
        step1Hint.textContent = filled
          ? 'Ready to move on to the curated list.'
          : 'Add a guess for each person before continuing.';
        proceedBtn.disabled = !filled;
      }
    }

    function updateSubmitState() {
      const aChosen = !!pillsA.querySelector('.pill-btn[aria-pressed="true"]');
      const bChosen = !!pillsB.querySelector('.pill-btn[aria-pressed="true"]');
      submitBtn.disabled = !(aChosen && bChosen);
    }

    function buildPills() {
        const N = sessionState.distractors || 8;
        const correctA = Array.isArray(currentScenario?.correct?.A) ? currentScenario.correct.A : [];
        const correctB = Array.isArray(currentScenario?.correct?.B) ? currentScenario.correct.B : [];

        const makeGrid = (arr) => {
            const set = new Set(arr);
            const pool = masterEmotionIds.filter((id) => !set.has(id));
            const distractors = shuffle(pool).slice(0, Math.max(0, N));
            return shuffle([...new Set([...arr, ...distractors])]);
        };

        const renderPills = (pillsContainer, list) => {
            pillsContainer.innerHTML = '';
            list.forEach((id) => {
            const btn = document.createElement('button');
            btn.className = 'pill-btn';
            btn.type = 'button';
            btn.dataset.emotionId = id;
            btn.textContent = formatEmotion(id);
            btn.setAttribute('aria-pressed', 'false');
            btn.addEventListener('click', () => {
                const pressed = btn.getAttribute('aria-pressed') === 'true';
                btn.setAttribute('aria-pressed', String(!pressed));
                updateSubmitState();
            });
            pillsContainer.appendChild(btn);
            });
        };

        renderPills(pillsA, makeGrid(correctA));
        renderPills(pillsB, makeGrid(correctB));
    }

    // Listeners
    freeA.addEventListener('input', updateProceedState);
    freeB.addEventListener('input', updateProceedState);

    proceedBtn.addEventListener('click', () => {
        step1Div.hidden = true;
        step2Div.hidden = false;
        buildPills();
        const first = pillsA.querySelector('.pill-btn');
        if (first) first.focus();
    });

    submitBtn.addEventListener('click', () => {
         const selectedA = [...pillsA.querySelectorAll('.pill-btn[aria-pressed="true"]')].map((b) => b.dataset.emotionId);
          const selectedB = [...pillsB.querySelectorAll('.pill-btn[aria-pressed="true"]')].map((b) => b.dataset.emotionId);
          const corrA = currentScenario.correct?.A || [];
          const corrB = currentScenario.correct?.B || [];

          const setFrom = (arr) => new Set(arr);
          const aSet = setFrom(selectedA);
          const bSet = setFrom(selectedB);
          const cA = setFrom(corrA);
          const cB = setFrom(corrB);
          const aHits = selectedA.filter((id) => cA.has(id));
          const aMiss = corrA.filter((id) => !aSet.has(id));
          const aExtra = selectedA.filter((id) => !cA.has(id));
          const bHits = selectedB.filter((id) => cB.has(id));
          const bMiss = corrB.filter((id) => !bSet.has(id));
          const bExtra = selectedB.filter((id) => !cB.has(id));

          const precision = (hits, picks) => (picks === 0 ? 0 : Math.round((hits / picks) * 100));
          const recall = (hits, total) => (total === 0 ? 0 : Math.round((hits / total) * 100));
          const aPrec = precision(aHits.length, selectedA.length);
          const aRec = recall(aHits.length, corrA.length);
          const bPrec = precision(bHits.length, selectedB.length);
          const bRec = recall(bHits.length, corrB.length);

          const result = {
            scenario: currentScenario.title,
            duration: secondsSince(startTime),
            timestamp: new Date().toISOString(),
            precisionA: aPrec,
            recallA: aRec,
            precisionB: bPrec,
            recallB: bRec,
          };

          sessionState.results.push(result);
          sessionState.lastAnalysis = {
              currentScenario,
              selectedA, selectedB, corrA, corrB,
              aHits, aMiss, aExtra, bHits, bMiss, bExtra,
              aRec, bRec, startTime
          };
          sessionState.transcriptHTML = chatEl.innerHTML;

          workflow.changeStep('stats');
    });

    playChat(); // Auto-start

    return container;
}

// 3. Stats View
function createStats(workflow) {
    const container = document.createElement('div');
    container.className = 'stage active';
    container.id = 'stage-debrief';

    const analysis = sessionState.lastAnalysis;
    const currentScenario = analysis.currentScenario;
    const listFormatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
    const formatEmotion = (id) => id.charAt(0).toUpperCase() + id.slice(1);
    const formatList = (ids) => {
      if (!ids || !ids.length) return 'None selected';
      return listFormatter.format(ids.map(formatEmotion));
    };
    function secondsSince(t0) { return Math.max(0, Math.round((Date.now() - t0) / 1000)); }


    container.innerHTML = `
      <div class="screen-content wide">
        <h1>Results</h1>

        <div class="tags" id="kpi">
            <span class="tag ${analysis.aRec >= 75 ? 'good' : 'bad'}">${currentScenario.people?.A} recall: ${analysis.aRec}%</span>
            <span class="tag ${analysis.bRec >= 75 ? 'good' : 'bad'}">${currentScenario.people?.B} recall: ${analysis.bRec}%</span>
            <span class="tag">Duration: ${secondsSince(analysis.startTime)}s</span>
        </div>
        <div class="divider"></div>

        <div class="feedback-grid">
          <div class="feedback-col" id="fbA">
             <strong>${currentScenario.people?.A || 'A'}</strong>
            <span class="small">Correct labels:</span> ${formatList(analysis.corrA)}<br/>
            <div class="small" style="margin-top:6px">${currentScenario.cues?.A || ''}</div>
            <div class="small" style="margin-top:6px; color:${analysis.aExtra.length ? '#f87171' : '#34d399'}">
              Hits: ${analysis.aHits.length} | Missed: ${analysis.aMiss.length} | Extra: ${analysis.aExtra.length}
            </div>
          </div>
          <div class="feedback-col" id="fbB">
            <strong>${currentScenario.people?.B || 'B'}</strong>
            <span class="small">Correct labels:</span> ${formatList(analysis.corrB)}<br/>
            <div class="small" style="margin-top:6px">${currentScenario.cues?.B || ''}</div>
            <div class="small" style="margin-top:6px; color:${analysis.bExtra.length ? '#f87171' : '#34d399'}">
              Hits: ${analysis.bHits.length} | Missed: ${analysis.bMiss.length} | Extra: ${analysis.bExtra.length}
            </div>
          </div>
        </div>

        <details>
            <summary><strong>Review Transcript</strong></summary>
            <div id="transcript-review" class="transcript-review">${sessionState.transcriptHTML}</div>
        </details>

        <div class="debrief-actions">
        </div>
      </div>
    `;

    const downloadBtn = createButton('Download CSV', { variant: 'primary' });
    downloadBtn.addEventListener('click', () => {
         const headers = Object.keys(sessionState.results[0]);
          const lines = [headers.join(',')].concat(
            sessionState.results.map((row) => headers.map((h) => `"${row[h]}"`).join(',')),
          );
          const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'emotion_chat_results.csv';
          document.body.appendChild(a);
          a.click();
          a.remove();
    });

    const restartBtn = createButton('New Scenario', { variant: 'secondary' });
    restartBtn.addEventListener('click', () => {
         workflow.changeStep('instructions');
    });

    container.querySelector('.debrief-actions').append(restartBtn, downloadBtn);

    return container;
}


// --- Initialize Workflow ---
const workflow = new AppWorkflow({ container: content });
workflow.init({
  instructions: createInstructions,
  task: createTask,
  stats: createStats,
});
