import { mountShell } from '../../shared/shell/shell.js';

const emails = [
  { id: 1, from: 'Mom', subject: 'Call me back', body: 'Hi, please give me a ring when you have a moment.', cat: 'Action', correct: 'action', time: '09:00' },
  { id: 2, from: 'Boss (Dave)', subject: 'Q3 Report', body: 'I need the quarterly figures on my desk by 5pm today.', cat: 'Action', correct: 'action', time: '09:05' },
  { id: 3, from: 'Dentist', subject: 'Appointment Reminder', body: 'Reminder: Checkup tomorrow at 10am. Please call to confirm.', cat: 'Action', correct: 'action', time: '09:10' },
  { id: 4, from: 'Team Lead', subject: 'Who is covering for Sarah?', body: 'Sarah is sick. Can you reply and let me know if you can take her shift?', cat: 'Action', correct: 'action', time: '09:15' },
  { id: 5, from: 'Credit Card', subject: 'Payment Due', body: 'Your statement is ready. Minimum payment due in 2 days.', cat: 'Action', correct: 'action', time: '09:20' },
  { id: 6, from: 'IT Desk', subject: 'Laptop Upgrade', body: 'Your new laptop is ready. Please come to the IT desk to collect it.', cat: 'Action', correct: 'action', time: '09:30' },
  { id: 7, from: 'Amazon', subject: 'Order #4451 Shipped', body: 'Your order has been dispatched. Track it online.', cat: 'Archive', correct: 'archive', time: '09:35' },
  { id: 8, from: 'HR Dept', subject: 'Office Closed Friday', body: 'The office will be closed this Friday for maintenance. Enjoy the long weekend.', cat: 'Archive', correct: 'archive', time: '09:40' },
  { id: 9, from: 'Uber Receipts', subject: 'Your Tuesday trip', body: 'Here is your receipt for $14.50.', cat: 'Archive', correct: 'archive', time: '09:42' },
  { id: 10, from: 'Sarah (Colleague)', subject: 'Meeting Notes', body: "Here are the notes from yesterday's meeting for your records. No reply needed.", cat: 'Archive', correct: 'archive', time: '09:45' },
  { id: 11, from: 'System Admin', subject: 'Maintenance Complete', body: 'The server update finished successfully at 3am.', cat: 'Archive', correct: 'archive', time: '09:50' },
  { id: 12, from: 'Lottery', subject: 'YOU WON $500!', body: 'Click here to claim your prize instantly!', cat: 'Delete', correct: 'delete', time: '09:55' },
  { id: 13, from: 'LinkedIn', subject: '5 people viewed your profile', body: 'See who is looking at you. Upgrade to Premium.', cat: 'Delete', correct: 'delete', time: '10:00' },
  { id: 14, from: 'Unknown', subject: 'Viagra Cheap', body: 'Best prices for pills. Buy now.', cat: 'Delete', correct: 'delete', time: '10:05' },
  { id: 15, from: 'Newsletter', subject: 'Summer Sale 50% Off', body: 'Buy our new clothes. Sale ends today.', cat: 'Delete', correct: 'delete', time: '10:10' },
  { id: 16, from: 'Chain Letter', subject: 'Fwd: Fwd: Funny Cat', body: 'Send this to 10 friends or bad luck will happen!', cat: 'Delete', correct: 'delete', time: '10:15' },
  { id: 17, from: 'IT Support (Security)', subject: 'Password Expiry', body: 'Your password expires in 1 hour. Click here: http://sketchy-url.com/login', cat: 'Trap (Phishing)', correct: 'delete', time: '10:20' },
  { id: 18, from: 'Bank Alert', subject: 'Account Suspended', body: 'Unusual activity detected. Kindly dwnload the attached file to restore access.', cat: 'Trap (Phishing)', correct: 'delete', time: '10:25' },
  { id: 19, from: 'CEO (All Staff)', subject: 'Welcome New Hire', body: 'Please welcome John to the team! (Please do not Reply All to this email).', cat: 'Trap (Instruction)', correct: 'archive', time: '10:30' },
  { id: 20, from: 'Best Friend', subject: 'URGENT!!!', body: 'Just kidding. Wanted to get your attention. Lunch?', cat: 'Trap (Distractor)', correct: 'delete', time: '10:35' }
];

const state = {
  currentIndex: 0,
  results: [],
  startTime: 0,
  emailStart: 0,
  timer: null
};

const { content } = mountShell({
  appTitle: 'Outlook Simulation',
  appTagline: 'Triage 20 inbox messages and choose the best action.'
});

content.classList.add('app-shell-content');
content.innerHTML = `
  <section class="app-stage" id="stage-intro">
    <div class="instruction-wrapper">
      <div class="instruction-card" aria-labelledby="intro-heading">
        <div class="instruction-icon" aria-hidden="true">📮</div>
        <h2 class="instruction-title" id="intro-heading">Outlook Simulation</h2>
        <p class="instruction-desc">
          You just returned from a week off and have 20 unread items. Process them quickly and accurately.
        </p>
        <div class="task-panel">
          <strong>Task:</strong>
          <ul>
            <li>🗑️ <strong>Delete</strong> spam, junk, or irrelevant notifications.</li>
            <li>📂 <strong>Archive</strong> information to keep. No response required.</li>
            <li>⚡ <strong>Reply / Action</strong> when you must respond or do something.</li>
          </ul>
        </div>
        <button class="primary-btn" id="start-btn">Start Assessment</button>
      </div>
    </div>
  </section>

  <section class="app-stage" id="stage-workspace" hidden>
    <header class="toolbar">
      <button class="action-btn delete" data-action="delete">🗑️ Delete</button>
      <button class="action-btn archive" data-action="archive">📂 Archive</button>
      <button class="action-btn reply" data-action="action">⚡ Reply / Action</button>
      <div class="toolbar-label">Assessment Mode · <span id="timer">00:00</span></div>
    </header>
    <div class="stage-body">
      <div class="workspace">
        <aside class="folder-pane" aria-label="Folders">
          <div class="folder-item active">Inbox <span id="remaining-count">20</span></div>
          <div class="folder-item" aria-hidden="true">Sent Items</div>
          <div class="folder-item" aria-hidden="true">Drafts</div>
          <div class="folder-item" aria-hidden="true">Archive</div>
          <div class="folder-item" aria-hidden="true">Deleted Items</div>
        </aside>
        <section class="email-list-pane" aria-label="Email list">
          <div id="email-list"></div>
        </section>
        <section class="reading-pane" aria-live="polite">
          <div class="email-content">
            <div class="message-header">
              <p class="msg-subject" id="view-subject"></p>
              <p class="msg-from" id="view-from"></p>
              <p class="msg-to">To: You</p>
            </div>
            <p class="msg-body" id="view-body"></p>
          </div>
        </section>
      </div>
    </div>
  </section>

  <section class="app-stage" id="stage-results" hidden>
    <div class="results-screen">
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Accuracy</div>
          <div class="stat-value" id="stat-accuracy">0%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Time</div>
          <div class="stat-value" id="stat-time">00:00</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Speed</div>
          <div class="stat-value" id="stat-speed">0s</div>
        </div>
      </div>
      <div class="table-actions">
        <button class="primary-btn" id="restart-btn">Restart</button>
      </div>
      <div class="table-wrapper">
        <table class="report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Category</th>
              <th>Your Action</th>
              <th>Correct Action</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody id="report-body"></tbody>
        </table>
      </div>
    </div>
  </section>
`;

const ui = {
  introStage: document.getElementById('stage-intro'),
  workspaceStage: document.getElementById('stage-workspace'),
  resultsStage: document.getElementById('stage-results'),
  startBtn: document.getElementById('start-btn'),
  restartBtn: document.getElementById('restart-btn'),
  emailList: document.getElementById('email-list'),
  subject: document.getElementById('view-subject'),
  from: document.getElementById('view-from'),
  body: document.getElementById('view-body'),
  remaining: document.getElementById('remaining-count'),
  timer: document.getElementById('timer'),
  reportBody: document.getElementById('report-body'),
  statAccuracy: document.getElementById('stat-accuracy'),
  statTime: document.getElementById('stat-time'),
  statSpeed: document.getElementById('stat-speed')
};

ui.startBtn.addEventListener('click', startGame);
ui.restartBtn.addEventListener('click', () => window.location.reload());
document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () => handleAction(btn.dataset.action));
});

function startGame() {
  state.currentIndex = 0;
  state.results = [];
  state.startTime = Date.now();
  state.emailStart = Date.now();

  ui.introStage.hidden = true;
  ui.workspaceStage.hidden = false;
  renderList();
  loadEmail(0);

  state.timer = setInterval(updateTimer, 1000);
}

function updateTimer() {
  const sec = Math.floor((Date.now() - state.startTime) / 1000);
  const minutes = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (sec % 60).toString().padStart(2, '0');
  ui.timer.textContent = `${minutes}:${seconds}`;
}

function renderList() {
  ui.emailList.innerHTML = '';
  emails.forEach((email, idx) => {
    if (idx < state.currentIndex) return;

    const item = document.createElement('article');
    item.className = `email-preview ${idx === state.currentIndex ? 'selected' : ''}`;
    item.id = `email-${email.id}`;
    item.setAttribute('aria-label', `${email.from}: ${email.subject}`);

    item.innerHTML = `
      <div class="avatar-circle">${email.from.charAt(0).toUpperCase()}</div>
      <p class="preview-sender">${email.from}</p>
      <p class="preview-subject">${email.subject}</p>
      <p class="preview-snippet">${email.body}</p>
      <span class="time-stamp">${email.time}</span>
    `;

    ui.emailList.appendChild(item);
  });

  ui.remaining.textContent = emails.length - state.currentIndex;
}

function loadEmail(index) {
  if (index >= emails.length) {
    endGame();
    return;
  }

  const email = emails[index];
  ui.subject.textContent = email.subject;
  ui.from.textContent = email.from;
  ui.body.textContent = email.body;

  state.emailStart = Date.now();
  renderList();
}

function handleAction(userAction) {
  const email = emails[state.currentIndex];
  const timeTaken = Date.now() - state.emailStart;

  let isCorrect = userAction === email.correct;
  if (email.id === 20 && (userAction === 'delete' || userAction === 'archive')) {
    isCorrect = true;
  }
  if (email.id === 19 && (userAction === 'delete' || userAction === 'archive')) {
    isCorrect = true;
  }

  state.results.push({
    id: email.id,
    cat: email.cat,
    userAction,
    correctAction: email.correct,
    isCorrect,
    timeMs: timeTaken
  });

  state.currentIndex += 1;
  loadEmail(state.currentIndex);
}

function endGame() {
  clearInterval(state.timer);
  ui.workspaceStage.hidden = true;
  ui.resultsStage.hidden = false;

  const totalCorrect = state.results.filter((r) => r.isCorrect).length;
  const accuracy = Math.round((totalCorrect / emails.length) * 100);
  const totalTimeMs = Date.now() - state.startTime;
  const avgSpeed = Math.round((totalTimeMs / emails.length / 1000) * 10) / 10;

  ui.statAccuracy.textContent = `${accuracy}%`;
  ui.statTime.textContent = ui.timer.textContent;
  ui.statSpeed.textContent = `${avgSpeed}s`;

  ui.reportBody.innerHTML = '';
  state.results.forEach((result, idx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>${result.cat}</td>
      <td><span class="badge ${result.isCorrect ? 'correct' : 'wrong'}">${result.userAction.toUpperCase()}</span></td>
      <td>${result.correctAction.toUpperCase()}</td>
      <td>${(result.timeMs / 1000).toFixed(1)}s</td>
    `;
    ui.reportBody.appendChild(row);
  });
}
