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

const RESULTS = [];

const stages = {
  intro: document.getElementById('stage-intro'),
  task: document.getElementById('stage-task'),
  debrief: document.getElementById('stage-debrief'),
};

const scenarioSel = document.getElementById('scenario');
const distractorsSel = document.getElementById('distractors');
const startBtn = document.getElementById('startBtn');

const chatEl = document.getElementById('chat');
const statusEl = document.getElementById('status');
const timerText = document.getElementById('timerText');
const progressEl = document.getElementById('progress');
const chatTitle = document.getElementById('chatTitle');

const step1Div = document.getElementById('step1');
const step2Div = document.getElementById('step2');
const freeA = document.getElementById('freeA');
const freeB = document.getElementById('freeB');
const proceedBtn = document.getElementById('proceed');
const step1Hint = document.getElementById('step1Hint');
const submitBtn = document.getElementById('submit');

const pillsA = document.getElementById('pillsA');
const pillsB = document.getElementById('pillsB');
const labelA = document.getElementById('labelA');
const labelB = document.getElementById('labelB');
const pillTitleA = document.getElementById('pillTitleA');
const pillTitleB = document.getElementById('pillTitleB');

const fbA = document.getElementById('fbA');
const fbB = document.getElementById('fbB');
const kpi = document.getElementById('kpi');
const downloadBtn = document.getElementById('download');
const restartBtn = document.getElementById('restartBtn');
const transcriptReview = document.getElementById('transcript-review');

let masterEmotionIds = DEFAULT_EMOTIONS.slice();
let current = null;
let idx = 0;
let revealed = false;
let startTime = 0;
let endTime = 0;
let timer = null;
let tickInt = null;
let listFormatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const secondsSince = (t0) => Math.max(0, Math.round((Date.now() - t0) / 1000));
const formatEmotion = (id) => id.charAt(0).toUpperCase() + id.slice(1);
const formatList = (ids) => {
  if (!ids || !ids.length) return 'None selected';
  return listFormatter.format(ids.map(formatEmotion));
};

function switchStage(name) {
  Object.values(stages).forEach((el) => el.classList.remove('active'));
  stages[name].classList.add('active');
  window.scrollTo(0, 0);
}

function populateScenarioList(selectedId) {
  scenarioSel.innerHTML = '';
  SCENARIOS.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.title;
    scenarioSel.appendChild(opt);
  });
  if (selectedId) scenarioSel.value = selectedId;
}

function resetState() {
  idx = 0;
  revealed = false;
  startTime = 0;
  endTime = 0;
  clearInterval(timer);
  clearInterval(tickInt);
  chatEl.innerHTML = '';
  step2Div.hidden = true;
  step1Div.hidden = false;
  freeA.value = '';
  freeB.value = '';
  progressEl.textContent = '0 / 0';
  step1Hint.textContent = 'Wait for the chat to finish...';
  submitBtn.disabled = true;
  proceedBtn.disabled = true;
  downloadBtn.disabled = RESULTS.length === 0;
}

function startTask() {
  const id = scenarioSel.value;
  if (!SCENARIOS.length || !id) return;

  current = SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
  resetState();

  chatTitle.textContent = current.title;
  const nameA = current.people?.A || 'A';
  const nameB = current.people?.B || 'B';
  labelA.textContent = `What was ${nameA} feeling?`;
  labelB.textContent = `What was ${nameB} feeling?`;
  pillTitleA.textContent = nameA;
  pillTitleB.textContent = nameB;

  buildPills();
  switchStage('task');
  playChat();
}

function addBubble(message) {
  const wrap = document.createElement('div');
  const bubble = document.createElement('div');
  const who = document.createElement('span');
  const from = message.from;
  const name = current?.people?.[from] || from;
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
  startTime = Date.now();
  timerText.textContent = '0s';

  tickInt = setInterval(() => {
    if (startTime) timerText.textContent = `${secondsSince(startTime)}s`;
  }, 1000);

  const run = () => {
    if (idx >= current.messages.length) {
      finishChat();
      return;
    }
    const message = current.messages[idx++];
    addBubble(message);
    progressEl.textContent = `${idx} / ${current.messages.length}`;
    if (idx >= current.messages.length) finishChat();
  };

  timer = setInterval(run, 3000);
  run();
}

function finishChat() {
  clearInterval(timer);
  endTime = Date.now();
  clearInterval(tickInt);
  statusEl.textContent = 'Chat complete';
  revealed = true;
  updateProceedState();
}

function buildPills() {
  const N = parseInt(distractorsSel.value, 10) || 8;
  const correctA = Array.isArray(current?.correct?.A) ? current.correct.A : [];
  const correctB = Array.isArray(current?.correct?.B) ? current.correct.B : [];

  const makeGrid = (arr) => {
    const set = new Set(arr);
    const pool = masterEmotionIds.filter((id) => !set.has(id));
    const distractors = shuffle(pool).slice(0, Math.max(0, N));
    return shuffle([...new Set([...arr, ...distractors])]);
  };

  const renderPills = (container, list) => {
    container.innerHTML = '';
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
      container.appendChild(btn);
    });
  };

  renderPills(pillsA, makeGrid(correctA));
  renderPills(pillsB, makeGrid(correctB));
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

function proceedToStep2() {
  step1Div.hidden = true;
  step2Div.hidden = false;
  const first = pillsA.querySelector('.pill-btn');
  if (first) first.focus();
}

function computeFeedback() {
  const selectedA = [...pillsA.querySelectorAll('.pill-btn[aria-pressed="true"]')].map((b) => b.dataset.emotionId);
  const selectedB = [...pillsB.querySelectorAll('.pill-btn[aria-pressed="true"]')].map((b) => b.dataset.emotionId);
  const corrA = current.correct?.A || [];
  const corrB = current.correct?.B || [];

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

  fbA.innerHTML = `
    <strong>${current.people?.A || 'A'}</strong>
    <span class="small">Correct labels:</span> ${formatList(corrA)}<br/>
    <div class="small" style="margin-top:6px">${current.cues?.A || ''}</div>
    <div class="small" style="margin-top:6px; color:${aExtra.length ? '#f87171' : '#34d399'}">
      Hits: ${aHits.length} | Missed: ${aMiss.length} | Extra: ${aExtra.length}
    </div>
  `;
  fbB.innerHTML = `
    <strong>${current.people?.B || 'B'}</strong>
    <span class="small">Correct labels:</span> ${formatList(corrB)}<br/>
    <div class="small" style="margin-top:6px">${current.cues?.B || ''}</div>
    <div class="small" style="margin-top:6px; color:${bExtra.length ? '#f87171' : '#34d399'}">
      Hits: ${bHits.length} | Missed: ${bMiss.length} | Extra: ${bExtra.length}
    </div>
  `;

  kpi.innerHTML = `
    <span class="tag ${aRec >= 75 ? 'good' : 'bad'}">${current.people?.A} recall: ${aRec}%</span>
    <span class="tag ${bRec >= 75 ? 'good' : 'bad'}">${current.people?.B} recall: ${bRec}%</span>
    <span class="tag">Duration: ${secondsSince(startTime)}s</span>
  `;

  transcriptReview.innerHTML = chatEl.innerHTML;

  RESULTS.push({
    scenario: current.title,
    duration: secondsSince(startTime),
    timestamp: new Date().toISOString(),
    precisionA: aPrec,
    recallA: aRec,
    precisionB: bPrec,
    recallB: bRec,
  });

  downloadBtn.disabled = false;
  switchStage('debrief');
}

function downloadCSV() {
  if (!RESULTS.length) return;
  const headers = Object.keys(RESULTS[0]);
  const lines = [headers.join(',')].concat(
    RESULTS.map((row) => headers.map((h) => `"${row[h]}"`).join(',')),
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'emotion_chat_results.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function restart() {
  clearInterval(timer);
  clearInterval(tickInt);
  switchStage('intro');
}

startBtn.addEventListener('click', startTask);
proceedBtn.addEventListener('click', proceedToStep2);
submitBtn.addEventListener('click', computeFeedback);
freeA.addEventListener('input', updateProceedState);
freeB.addEventListener('input', updateProceedState);
restartBtn.addEventListener('click', restart);
downloadBtn.addEventListener('click', downloadCSV);

populateScenarioList();
