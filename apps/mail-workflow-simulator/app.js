import { registerServiceWorker } from '../../shared/shell/shell.js';
import { formatTime } from '../../shared/utils/format.js';
import { loadJSON, saveJSON } from '../../shared/utils/storage.js';

const SUMMARY_STORAGE_KEY = 'mail-workflow-simulator:last-summary';

const commonTypos = {
  teh: 'the',
  recieve: 'receive',
  wont: "won't",
  dont: "don't",
  cant: "can't",
  seperate: 'separate',
  definately: 'definitely',
  occured: 'occurred',
  thx: 'thanks',
  u: 'you',
  adress: 'address',
};

const quickRows = [
  ['q1', '09:00', 'Mom', 'Call me back', 'Hi, please give me a ring when you have a moment.', 'Quick reply'],
  ['q2', '09:05', 'Dave (Boss)', 'Q3 Report', 'I need the quarterly figures on my desk by 5 PM today. Please acknowledge receipt.', 'Quick reply'],
  ['q3', '09:10', 'Dr. Smith', 'Appointment Reminder', 'Reminder: Checkup tomorrow at 10 AM. Please reply to confirm attendance.', 'Quick reply'],
  ['q4', '09:15', 'Team Lead', 'Shift Coverage', 'Sarah is out sick. Can you let me know if you can take her shift tomorrow?', 'Quick reply'],
  ['q5', '09:20', 'Amex Service', 'Payment Due', 'Your statement is ready. Minimum payment due in 2 days. Log in to pay.', 'Quick reply'],
  ['q6', '09:30', 'IT Helpdesk', 'Laptop Refresh', 'Your new laptop is configured. Please reply with a time you can stop by to pick it up.', 'Quick reply'],
];

const triageRows = [
  ['a1', '09:35', 'Amazon Orders', 'Order #4451 Shipped', 'Your order has been dispatched. Track it online via the portal.', 'archive', 'Reference'],
  ['a2', '09:40', 'HR Department', 'Office Closed Friday', 'The office will be closed this Friday for facility maintenance. Enjoy the long weekend.', 'archive', 'Reference'],
  ['a3', '09:42', 'Uber Receipts', 'Your Tuesday trip', 'Here is your receipt for $14.50. Thank you for riding.', 'archive', 'Receipt'],
  ['a4', '09:45', 'Sarah Jenkins', 'Meeting Notes', "Attached are the notes from yesterday's meeting for your records. No reply needed.", 'archive', 'Reference'],
  ['a5', '09:50', 'System Admin', 'Maintenance Complete', 'The server update finished successfully at 3 AM. No issues reported.', 'archive', 'Reference'],
  ['d1', '09:55', 'Prize Winner', 'YOU WON $500!', 'Click here to claim your prize instantly. Limited time offer.', 'delete', 'Spam'],
  ['d2', '10:00', 'LinkedIn', '5 people viewed your profile', 'See who is looking at you. Upgrade to Premium to unlock full access.', 'delete', 'Promotional'],
  ['d3', '10:05', 'Unknown', 'Cheap Meds', 'Best prices for pills. Buy now. Discreet shipping.', 'delete', 'Spam'],
  ['d4', '10:10', 'Fashion Weekly', 'Summer Sale 50% Off', 'Buy our new clothes. Sale ends today. Unsubscribe if you want.', 'delete', 'Promotional'],
  ['d5', '10:15', 'Chain Letter', 'Fwd: Fwd: Funny Cat', 'Send this to 10 friends or bad luck will happen. Do not break the chain.', 'delete', 'Distractor'],
  ['t1', '10:20', 'IT Support (Security)', 'Password Expiry', 'Your password expires in 1 hour. Click here: http://sketchy-url.com/login', 'delete', 'Phishing'],
  ['t2', '10:25', 'Bank Alert', 'Account Suspended', 'Unusual activity detected. Kindly download the attached file to restore access immediately.', 'delete', 'Phishing'],
  ['t3', '10:30', 'CEO (All Staff)', 'Welcome New Hire', 'Please welcome John to the team. Please do not Reply All to this email.', 'archive', 'Policy trap', ['archive', 'delete']],
  ['t4', '10:35', 'Best Friend', 'URGENT!!!', 'Just kidding. Wanted to get your attention. Lunch?', 'delete', 'Distractor', ['archive', 'delete']],
];

const composeRows = [
  {
    id: 'c1',
    time: '10:45',
    sender: 'Sarah Jenkins (Manager)',
    subject: 'Urgent: Q3 Report Data',
    preview: 'Need the sales figures from your department by 3 PM today.',
    body: "Hi,\n\nI'm putting together the Q3 slides for the board meeting tomorrow. I seem to be missing the sales figures from your department.\n\nCan you please send those over by 3 PM today?\n\nThanks,\nSarah",
    initials: 'SJ',
    replyTo: 'sarah.jenkins@company.com',
    tone: 'Urgent',
    goals: [
      goal('Attach the data or promise to send it promptly', ['attached', 'sales figures', 'spreadsheet', 'report', 'sending']),
      goal('Confirm the 3 PM deadline', ['3 pm', '3pm', 'before 3', 'by 3', 'this afternoon']),
    ],
  },
  {
    id: 'c2',
    time: '10:50',
    sender: 'Dave from Accounting',
    subject: 'Lunch on Friday?',
    preview: 'A few of us are heading to the new burger place on Friday around 12:30.',
    body: 'Hey!\n\nLong time no see. A few of us are heading to that new burger place on Friday around 12:30. Do you want to come along?\n\nLet me know so I can book the table.\n\nCheers,\nDave',
    initials: 'DA',
    replyTo: 'dave.acc@company.com',
    tone: 'Casual',
    goals: [
      goal('Confirm whether you are attending', ['count me in', 'i can make it', 'i can join', 'i will join', 'i cannot make it', 'i cant make it']),
      goal('Mention the Friday 12:30 timing', ['12:30', '1230', 'friday']),
    ],
  },
  {
    id: 'c3',
    time: '10:55',
    sender: 'Client Services',
    subject: 'Complaint: Order #4492',
    preview: 'Order #4492 arrived damaged and the customer expects a resolution immediately.',
    body: 'To whom it may concern,\n\nMy order #4492 arrived damaged yesterday. The box was crushed and the product is unusable.\n\nI expect a full refund immediately.\n\nRegards,\nAngry Customer',
    initials: 'CS',
    replyTo: 'support@client.com',
    tone: 'Formal',
    goals: [
      goal('Apologize clearly', ['sorry', 'apologize', 'apologies', 'regret']),
      goal('Offer a refund or replacement', ['refund', 'replace', 'replacement', 'send a new', 'arrange a refund']),
      goal('Use a formal sign-off', ['sincerely', 'regards', 'kind regards']),
    ],
  },
  {
    id: 'c4',
    time: '11:00',
    sender: 'Project Team',
    subject: 'Meeting Conflict',
    preview: 'Thursday at 10 AM is double-booked. Can we move to Friday at 2 PM?',
    body: 'Hi Team,\n\nWe scheduled the brainstorming session for Thursday at 10 AM. However, the main conference room is double-booked.\n\nCan we move this to Friday at 2 PM instead? Please confirm if this works for everyone.\n\nBest,\nProject Lead',
    initials: 'PT',
    replyTo: 'team@company.com',
    tone: 'Professional',
    goals: [
      goal('Confirm your availability', ['works for me', 'i am available', 'i can do', 'that works', 'i can attend']),
      goal('Reference the calendar or meeting time', ['calendar', 'friday', '2 pm', '2pm', 'meeting']),
    ],
  },
  {
    id: 'c5',
    time: '11:05',
    sender: 'Tom (Developer)',
    subject: 'API Integration Delay',
    preview: 'Vendor documentation is outdated and testing may need 2 extra days.',
    body: 'Hi,\n\nI wanted to give you a heads up. The API integration is proving more difficult than expected. The documentation provided by the vendor is outdated.\n\nWe might need 2 extra days to finish the testing. Is that going to impact the launch?\n\nTom',
    initials: 'TD',
    replyTo: 'tom.dev@company.com',
    tone: 'Supportive',
    goals: [
      goal('Acknowledge the delay', ['understand', 'thanks for flagging', 'noted', 'appreciate the update']),
      goal('Discuss launch impact or next steps', ['launch', 'impact', 'next step', 'mitigation', 'timeline']),
      goal('Use a supportive tone', ['happy to help', 'let us', "let's", 'work through', 'support']),
    ],
  },
];

const seedItems = [
  ...quickRows.map(([id, time, sender, subject, body, category]) =>
    quickItem({ id, time, sender, subject, preview: body, bodyHtml: toHtml(body), category })
  ),
  ...triageRows.map(([id, time, sender, subject, body, requiredAction, category, acceptedActions]) =>
    triageItem({ id, time, sender, subject, preview: body, bodyHtml: toHtml(body), requiredAction, category, acceptedActions })
  ),
  ...composeRows.map((item) =>
    composeItem({ ...item, bodyHtml: toHtml(item.body), category: 'Composed reply' })
  ),
];

const root = document.getElementById('app-root');
const lastSummary = loadJSON(SUMMARY_STORAGE_KEY, null);

const state = {
  items: cloneSeedItems(),
  currentId: seedItems[0]?.id || null,
  started: false,
  finished: false,
  startTime: null,
  endTime: null,
  timerId: null,
  currentOpenedAt: null,
  results: [],
  drafts: {},
  composerItemId: null,
  pendingSend: null,
  toastTimer: null,
};

root.innerHTML = `
  <div class="app-shell">
    <div id="modal-intro" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h2>Email Management Assessment</h2>
        </div>
        <div class="modal-body">
          <p><strong>Objective:</strong> Process all inbox items as efficiently as possible while adhering to corporate communication protocols.</p>
          <ul class="instruction-list">
            <li><strong>Reply</strong> to direct requests, tasks, and any message that opens the guided composer.</li>
            <li><strong>Archive</strong> notifications, receipts, and reference material that require no action.</li>
            <li><strong>Delete</strong> spam, promotional newsletters, distractions, and phishing attempts.</li>
          </ul>
          <p class="modal-note">Note: Some reply items now ask you to draft a full response before the message is cleared.</p>
          <p class="modal-note">Last recorded run: <strong id="recent-summary">${lastSummary ? `${lastSummary.accuracy}% accuracy` : 'No runs yet'}</strong></p>
        </div>
        <div class="modal-footer">
          <button class="primary-btn" id="start-btn" type="button">Begin Assessment</button>
        </div>
      </div>
    </div>

    <div id="modal-report" class="modal-overlay hidden">
      <div class="modal-card report-card">
        <div class="modal-header">
          <h2>Assessment Results</h2>
        </div>
        <div class="modal-body modal-body--flush">
          <div class="score-row">
            <div>
              <div class="score-label">ACCURACY</div>
              <div class="score-value score-primary" id="score-accuracy">0%</div>
            </div>
            <div>
              <div class="score-label">TOTAL TIME</div>
              <div class="score-value" id="score-time">00:00</div>
            </div>
            <div>
              <div class="score-label">AVG REPLY SCORE</div>
              <div class="score-value" id="score-reply">--</div>
            </div>
            <div>
              <div class="score-label">PROCESSED</div>
              <div class="score-value" id="score-processed">0</div>
            </div>
          </div>
          <div class="report-table-wrap">
            <table class="report-table">
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Category</th>
                  <th>Needed</th>
                  <th>Taken</th>
                  <th>Reply Score</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody id="report-body"></tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="secondary-btn" id="download-btn" type="button">Download Report</button>
          <button class="primary-btn" id="restart-btn" type="button">Restart Module</button>
        </div>
      </div>
    </div>

    <div class="app-header">
      <div class="logo">
        <span>Inbox Simulation</span>
      </div>
      <div>
        <div class="timer-box" id="timer">00:00</div>
      </div>
    </div>

    <div class="main-stage">
      <div class="folder-pane">
        <div class="folder-header">
          <span>Inbox</span>
          <span class="count" id="count-display">${seedItems.length}</span>
        </div>
        <div class="email-list" id="email-list"></div>
      </div>

      <div class="reading-pane">
        <div class="ribbon-bar" id="ribbon">
          <button class="ribbon-btn btn-reply" id="reply-action" type="button">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M6.5 3.5v-2l-5 4.5 5 4.5v-2c3.5 0 6 2 6 5.5-1-2.5-3-4.5-6-4.5z" stroke="none" /></svg>
            Reply
          </button>
          <div class="ribbon-divider"></div>
          <button class="ribbon-btn btn-archive" id="archive-action" type="button">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M14 2v2H2V2h12zm-1 3v9H3V5h10zM6 8h4v1H6V8z" fill-rule="evenodd" /></svg>
            Archive
          </button>
          <button class="ribbon-btn btn-delete" id="delete-action" type="button">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 2L9 1H7l-1 1H2v1h12V2h-4zM3 14c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V4H3v10z" fill-rule="evenodd" /></svg>
            Delete
          </button>
        </div>

        <div class="reading-workspace">
          <div id="email-display" class="email-scroll-area"></div>
          <aside id="coach-pane" class="coach-pane hidden"></aside>
        </div>
      </div>
    </div>

    <div id="toast" class="toast" role="status" aria-live="polite">
      <span id="toast-message"></span>
      <button id="toast-action" class="toast-action hidden" type="button">Undo</button>
    </div>
  </div>
`;

const ui = {
  intro: document.getElementById('modal-intro'),
  report: document.getElementById('modal-report'),
  recentSummary: document.getElementById('recent-summary'),
  timer: document.getElementById('timer'),
  count: document.getElementById('count-display'),
  list: document.getElementById('email-list'),
  display: document.getElementById('email-display'),
  coachPane: document.getElementById('coach-pane'),
  replyAction: document.getElementById('reply-action'),
  archiveAction: document.getElementById('archive-action'),
  deleteAction: document.getElementById('delete-action'),
  scoreAccuracy: document.getElementById('score-accuracy'),
  scoreTime: document.getElementById('score-time'),
  scoreReply: document.getElementById('score-reply'),
  scoreProcessed: document.getElementById('score-processed'),
  reportBody: document.getElementById('report-body'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message'),
  toastAction: document.getElementById('toast-action'),
};

document.getElementById('start-btn').addEventListener('click', startSession);
document.getElementById('restart-btn').addEventListener('click', restartSession);
document.getElementById('download-btn').addEventListener('click', downloadReport);
ui.replyAction.addEventListener('click', () => handleAction('reply'));
ui.archiveAction.addEventListener('click', () => handleAction('archive'));
ui.deleteAction.addEventListener('click', () => handleAction('delete'));
ui.toastAction.addEventListener('click', undoSend);

renderAll();
registerServiceWorker();

function startSession() {
  resetState();
  state.started = true;
  state.startTime = Date.now();
  state.currentOpenedAt = Date.now();
  ui.intro.classList.add('hidden');
  ui.report.classList.add('hidden');
  state.timerId = window.setInterval(updateTimer, 1000);
  updateTimer();
  renderAll();
}

function restartSession() {
  clearTimers();
  resetState();
  ui.report.classList.add('hidden');
  ui.intro.classList.remove('hidden');
  hideToast();
  renderAll();
}

function resetState() {
  state.items = cloneSeedItems();
  state.currentId = state.items[0]?.id || null;
  state.started = false;
  state.finished = false;
  state.startTime = null;
  state.endTime = null;
  state.currentOpenedAt = null;
  state.results = [];
  state.drafts = {};
  state.composerItemId = null;
  state.pendingSend = null;
}

function cloneSeedItems() {
  return seedItems.map((item) => ({
    ...item,
    goals: item.goals.map((entry) => ({ ...entry, keywords: [...entry.keywords] })),
    acceptedActions: [...item.acceptedActions],
    completed: false,
  }));
}

function goal(label, keywords) {
  return { label, keywords };
}

function quickItem(config) {
  return { ...config, requiredAction: 'reply', acceptedActions: ['reply'], replyMode: 'quick', replyTo: '', tone: '', goals: [] };
}

function triageItem(config) {
  return { ...config, acceptedActions: config.acceptedActions || [config.requiredAction], replyMode: null, replyTo: '', tone: '', goals: [] };
}

function composeItem(config) {
  return { ...config, requiredAction: 'reply', acceptedActions: ['reply'], replyMode: 'compose' };
}

function toHtml(text) {
  return text
    .split('\n\n')
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br />')}</p>`)
    .join('');
}

function clearTimers() {
  if (state.timerId) clearInterval(state.timerId);
  if (state.pendingSend?.timerId) clearTimeout(state.pendingSend.timerId);
  if (state.toastTimer) clearTimeout(state.toastTimer);
  state.timerId = null;
  state.pendingSend = null;
  state.toastTimer = null;
}

function updateTimer() {
  ui.timer.textContent = formatTime(state.startTime ? Date.now() - state.startTime : 0);
}

function renderAll() {
  renderHeaderStats();
  renderList();
  renderReadingPane();
  renderReport();
}

function renderHeaderStats() {
  const remaining = state.items.filter((item) => !item.completed).length;
  ui.count.textContent = String(remaining);
  ui.recentSummary.textContent = lastSummary ? `${lastSummary.accuracy}% accuracy` : 'No runs yet';
}

function renderList() {
  ui.list.innerHTML = '';
  const current = getCurrentItem();

  state.items.forEach((item) => {
    if (item.completed) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = ['email-item', current?.id === item.id ? 'selected' : '']
      .filter(Boolean)
      .join(' ');
    button.disabled = Boolean(state.pendingSend);
    button.addEventListener('click', () => selectItem(item.id));

    button.innerHTML = `
      <div class="item-top">
        <div class="item-person">
          <div class="avatar">${escapeHtml(getInitials(item.sender, item.initials))}</div>
          <span class="sender-name">${escapeHtml(item.sender)}</span>
        </div>
        <span class="send-time">${item.time}</span>
      </div>
      <div class="subject-line">${escapeHtml(item.subject)}</div>
      <div class="preview-text">${escapeHtml(item.preview)}</div>
    `;

    ui.list.appendChild(button);
  });
}

function renderReadingPane() {
  const current = getCurrentItem();
  const disabled = !state.started || !current || current.completed || Boolean(state.pendingSend);
  ui.replyAction.disabled = disabled;
  ui.archiveAction.disabled = disabled;
  ui.deleteAction.disabled = disabled;

  if (!current) {
    ui.display.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-2-2H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
        <h3>All caught up</h3>
        <p>You have processed all items in your inbox.</p>
      </div>
    `;
    ui.coachPane.classList.add('hidden');
    ui.coachPane.innerHTML = '';
    return;
  }

  const composeGuidance = current.replyMode === 'compose'
    ? `
      <div class="message-guidance">
        <strong>Draft reply required</strong>
        <div>Use Reply to open the editor and send a full response for this message.</div>
      </div>
    `
    : '';

  ui.display.innerHTML = `
    <div class="message-header">
      <div class="message-subject">${escapeHtml(current.subject)}</div>
      <div class="sender-block">
        <div class="avatar">${escapeHtml(getInitials(current.sender, current.initials))}</div>
        <div class="sender-details">
          <strong>${escapeHtml(current.sender)}</strong>
          <span>${current.replyTo ? `Reply to ${escapeHtml(current.replyTo)} · ` : ''}Received: Today, ${current.time}</span>
        </div>
      </div>
    </div>
    <div class="message-body">${current.bodyHtml}</div>
    ${composeGuidance}
  `;

  if (current.replyMode === 'compose' && state.composerItemId === current.id && !current.completed) {
    ui.display.insertAdjacentHTML('beforeend', buildComposerMarkup(current));
  }

  renderCoachPane(current);
  bindComposeEvents(current);
}

function buildComposerMarkup(item) {
  const draft = getDraft(item);
  return `
    <div class="compose-layout">
      <section class="compose-card">
        <div class="compose-toolbar">
          <button class="compose-btn primary" id="send-draft" type="button">Send</button>
          <button class="compose-btn" id="discard-draft" type="button">Discard</button>
        </div>
        <div class="compose-fields">
          <div class="compose-row">
            <label for="draft-to">To:</label>
            <input id="draft-to" type="text" value="${escapeAttribute(item.replyTo)}" readonly />
          </div>
          <div class="compose-row">
            <label for="draft-subject">Subject:</label>
            <input id="draft-subject" type="text" value="${escapeAttribute(draft.subject)}" />
          </div>
        </div>
        <textarea id="draft-body" class="compose-editor" placeholder="Type your reply here...">${escapeHtml(draft.body)}</textarea>
      </section>
    </div>
  `;
}

function renderCoachPane(current) {
  if (current.replyMode !== 'compose' || state.composerItemId !== current.id || current.completed) {
    ui.coachPane.classList.add('hidden');
    ui.coachPane.innerHTML = '';
    return;
  }

  const analysis = analyzeDraft(current, getDraft(current).body);
  const issues = analysis.issues.length
    ? analysis.issues
    : [{ title: 'Ready to send', detail: 'Greeting, structure, and goals all look strong.' }];

  ui.coachPane.classList.remove('hidden');
  ui.coachPane.innerHTML = `
    <div class="coach-header">
      <div class="score-circle" id="score-circle">${analysis.score}</div>
      <h3 style="margin-top: 12px;">Editor Score</h3>
      <p>Live guidance while you draft.</p>
    </div>
    <div class="coach-body">
      <div class="coach-section">
        <h4>Suggestions</h4>
        <div class="coach-list" id="coach-list"></div>
      </div>
      <div class="coach-section">
        <h4>Scenario goals</h4>
        <div class="goal-list" id="goal-list"></div>
      </div>
    </div>
  `;

  const scoreCircle = document.getElementById('score-circle');
  scoreCircle.style.borderColor = getScoreColor(analysis.score);
  scoreCircle.style.color = getScoreColor(analysis.score);

  const coachList = document.getElementById('coach-list');
  issues.forEach((issue) => {
    const card = document.createElement('div');
    card.className = 'coach-card';
    card.innerHTML = `<strong>${escapeHtml(issue.title)}</strong><div>${escapeHtml(issue.detail)}</div>`;
    coachList.appendChild(card);
  });

  const goalList = document.getElementById('goal-list');
  analysis.goalChecks.forEach((goalCheck) => {
    const card = document.createElement('div');
    card.className = `goal-card ${goalCheck.met ? 'met' : 'pending'}`;
    card.innerHTML = `<strong>${goalCheck.met ? 'Covered' : 'Still missing'}</strong><div>${escapeHtml(goalCheck.label)}</div>`;
    goalList.appendChild(card);
  });
}

function bindComposeEvents(current) {
  if (current.replyMode !== 'compose' || state.composerItemId !== current.id || current.completed) return;

  const sendBtn = document.getElementById('send-draft');
  const discardBtn = document.getElementById('discard-draft');
  const subjectInput = document.getElementById('draft-subject');
  const bodyInput = document.getElementById('draft-body');

  if (!sendBtn || !discardBtn || !subjectInput || !bodyInput) return;

  sendBtn.disabled = Boolean(state.pendingSend);
  discardBtn.disabled = Boolean(state.pendingSend);

  sendBtn.addEventListener('click', attemptSend);
  discardBtn.addEventListener('click', discardDraft);
  subjectInput.addEventListener('input', (event) => {
    getDraft(current).subject = event.target.value;
  });
  bodyInput.addEventListener('input', (event) => {
    getDraft(current).body = event.target.value;
    renderCoachPane(current);
  });
}

function renderReport() {
  if (!state.finished) return;

  const accuracy = getAccuracy() ?? 0;
  const replyAverage = getAverageReplyScore();
  const totalTime = state.startTime ? formatTime((state.endTime || Date.now()) - state.startTime) : '00:00';

  ui.scoreAccuracy.textContent = `${accuracy}%`;
  ui.scoreTime.textContent = totalTime;
  ui.scoreReply.textContent = replyAverage === null ? '--' : `${replyAverage}`;
  ui.scoreProcessed.textContent = `${state.results.length}/${state.items.length}`;

  ui.reportBody.innerHTML = '';
  state.results.forEach((result) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${escapeHtml(result.sender)}</strong><br />${escapeHtml(result.subject)}</td>
      <td>${escapeHtml(result.category)}</td>
      <td>${escapeHtml(actionLabel(result.requiredAction))}</td>
      <td>${escapeHtml(actionLabel(result.actionTaken))}</td>
      <td>${result.replyScore === null ? '—' : result.replyScore}</td>
      <td><span class="status-badge ${result.isCorrect ? 'status-pass' : 'status-fail'}">${result.isCorrect ? 'PASS' : 'FAIL'}</span></td>
    `;
    ui.reportBody.appendChild(row);
  });
}

function selectItem(id) {
  if (state.pendingSend) return;
  const item = state.items.find((entry) => entry.id === id && !entry.completed);
  if (!item) return;
  state.currentId = id;
  state.currentOpenedAt = Date.now();
  if (state.composerItemId && state.composerItemId !== id) state.composerItemId = null;
  renderAll();
}

function handleAction(action) {
  const current = getCurrentItem();
  if (!current || current.completed || state.pendingSend) return;

  if (action === 'reply' && current.replyMode === 'compose') {
    state.composerItemId = current.id;
    renderReadingPane();
    return;
  }

  completeItem(current, action, null);
}

function completeItem(item, actionTaken, replyScore) {
  item.completed = true;
  state.composerItemId = state.composerItemId === item.id ? null : state.composerItemId;

  state.results.push({
    id: item.id,
    sender: item.sender,
    subject: item.subject,
    category: item.category,
    requiredAction: item.requiredAction,
    actionTaken,
    isCorrect: item.acceptedActions.includes(actionTaken),
    replyScore,
    timeMs: state.currentOpenedAt ? Date.now() - state.currentOpenedAt : 0,
  });

  const remaining = state.items.filter((entry) => !entry.completed);
  const currentIndex = state.items.findIndex((entry) => entry.id === item.id);
  const next = state.items.slice(currentIndex + 1).find((entry) => !entry.completed) || remaining[0] || null;

  state.currentId = next?.id || null;
  state.currentOpenedAt = next ? Date.now() : null;

  if (!remaining.length) {
    finishSession(true);
    return;
  }

  renderAll();
}

function attemptSend() {
  const current = getCurrentItem();
  if (!current || current.replyMode !== 'compose' || state.pendingSend) return;

  const analysis = analyzeDraft(current, getDraft(current).body);
  if (analysis.score < 60 && !window.confirm('Reply score is low. Send anyway?')) return;

  state.pendingSend = {
    itemId: current.id,
    timerId: window.setTimeout(() => finalizeSend(current.id, analysis.score), 4000),
  };

  showToast(`Sending reply to ${current.sender}...`, true);
  renderAll();
}

function finalizeSend(itemId, replyScore) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;
  state.pendingSend = null;
  hideToast();
  completeItem(item, 'reply', replyScore);
  showTransientToast(`Reply sent to ${item.sender}.`);
}

function undoSend() {
  if (!state.pendingSend) return;
  clearTimeout(state.pendingSend.timerId);
  state.pendingSend = null;
  hideToast();
  renderAll();
}

function discardDraft() {
  const current = getCurrentItem();
  if (!current || current.replyMode !== 'compose') return;
  if (!window.confirm('Discard draft?')) return;
  state.drafts[current.id] = defaultDraft(current);
  state.composerItemId = null;
  renderReadingPane();
}

function finishSession(completedAll) {
  clearTimers();
  state.finished = true;
  state.endTime = Date.now();

  const summary = {
    accuracy: getAccuracy() ?? 0,
    averageReplyScore: getAverageReplyScore(),
    processed: state.results.length,
    completedAll,
    endedAt: new Date().toISOString(),
  };
  saveJSON(SUMMARY_STORAGE_KEY, summary);

  ui.report.classList.remove('hidden');
  renderAll();
}

function downloadReport() {
  if (!state.finished) return;

  const lines = [
    'MAIL WORKFLOW SIMULATOR REPORT',
    `Generated: ${new Date().toLocaleString()}`,
    `Processed: ${state.results.length}/${state.items.length}`,
    `Accuracy: ${getAccuracy() ?? 0}%`,
    `Average reply score: ${getAverageReplyScore() ?? '--'}`,
    `Total time: ${state.startTime ? formatTime((state.endTime || Date.now()) - state.startTime) : '00:00'}`,
    '',
    'DETAILS',
    ...state.results.map(
      (result) =>
        `${result.sender} | ${result.subject} | Category: ${result.category} | Needed: ${actionLabel(result.requiredAction)} | Took: ${actionLabel(result.actionTaken)} | Reply score: ${result.replyScore ?? '--'} | ${result.isCorrect ? 'PASS' : 'FAIL'}`
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mail-workflow-report.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getCurrentItem() {
  return state.items.find((item) => item.id === state.currentId && !item.completed) || null;
}

function getResult(itemId) {
  return state.results.find((entry) => entry.id === itemId) || null;
}

function getAccuracy() {
  if (!state.results.length) return null;
  return Math.round((state.results.filter((entry) => entry.isCorrect).length / state.results.length) * 100);
}

function getAverageReplyScore() {
  const scores = state.results.filter((entry) => entry.replyScore !== null).map((entry) => entry.replyScore);
  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function getDraft(item) {
  if (!state.drafts[item.id]) state.drafts[item.id] = defaultDraft(item);
  return state.drafts[item.id];
}

function defaultDraft(item) {
  return { subject: `Re: ${item.subject}`, body: '' };
}

function analyzeDraft(item, text) {
  const words = text.split(/\s+/).filter(Boolean);
  const normalized = text.toLowerCase();
  let score = 100;
  const issues = [];

  const typoMatches = words
    .map((word) => word.replace(/[^a-zA-Z]/g, '').toLowerCase())
    .filter((word) => commonTypos[word]);

  if (typoMatches.length) {
    score -= Math.min(20, typoMatches.length * 5);
    issues.push({ title: 'Spelling cleanup', detail: `Check: ${typoMatches.slice(0, 3).join(', ')}.` });
  }

  if (words.length < 10) {
    score -= 18;
    issues.push({ title: 'Thin draft', detail: 'Add a little more detail before you send.' });
  }

  if (!/^(hi|hello|dear|good morning|good afternoon|hey)\b/i.test(text.trim())) {
    score -= 10;
    issues.push({ title: 'Greeting', detail: 'Open with a greeting so the reply feels complete.' });
  }

  if (!/(regards|thanks|best|sincerely|cheers|kind regards)/i.test(text)) {
    score -= 10;
    issues.push({ title: 'Sign-off', detail: 'Close with a clear sign-off.' });
  }

  const toneIssue = getToneIssue(item.tone, normalized);
  if (toneIssue) {
    score -= 8;
    issues.push(toneIssue);
  }

  const goalChecks = item.goals.map((entry) => {
    const met = entry.keywords.some((keyword) => normalized.includes(keyword));
    if (!met && words.length > 12) score -= 5;
    return { label: entry.label, met };
  });

  return { score: Math.max(0, score), issues, goalChecks };
}

function getToneIssue(tone, text) {
  if (tone === 'Urgent' && !/(3 pm|3pm|today|by 3|this afternoon)/.test(text)) {
    return { title: 'Urgency cue', detail: 'Acknowledge the deadline so the urgency is clear.' };
  }
  if (tone === 'Casual' && !/(sounds good|count me in|see you|i can make it|i can join)/.test(text)) {
    return { title: 'Tone match', detail: 'Keep this one light and conversational.' };
  }
  if (tone === 'Formal' && !/(sorry|apolog|regret|regards|sincerely|kind regards)/.test(text)) {
    return { title: 'Formal tone', detail: 'Acknowledge the complaint in more formal language.' };
  }
  if (tone === 'Professional' && !/(works for me|available|calendar|confirm|friday|2 pm|2pm)/.test(text)) {
    return { title: 'Professional tone', detail: 'Confirm availability and reference the proposed timing.' };
  }
  if (tone === 'Supportive' && !/(understand|appreciate|thanks for flagging|happy to help|support|work through)/.test(text)) {
    return { title: 'Supportive tone', detail: 'Show that you understand the issue and want to help.' };
  }
  return null;
}

function getScoreColor(score) {
  if (score >= 85) return '#107c10';
  if (score >= 65) return '#8a6f00';
  return '#d13438';
}

function getInitials(sender, fallback = '') {
  if (fallback) return fallback;
  return sender
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function showToast(message, withUndo) {
  ui.toastMessage.textContent = message;
  ui.toast.classList.add('visible');
  ui.toastAction.classList.toggle('hidden', !withUndo);
}

function showTransientToast(message) {
  showToast(message, false);
  state.toastTimer = window.setTimeout(hideToast, 1800);
}

function hideToast() {
  ui.toast.classList.remove('visible');
  ui.toastAction.classList.add('hidden');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}
