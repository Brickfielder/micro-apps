import { mountShell } from '../../shared/shell/shell.js';
import { AppWorkflow } from '../../shared/shell/workflow.js';
import { createButton } from '../../shared/ui/components.js';

// --- Data ---
const emails = [
    // 1. ACTION (Clear Tasks)
    { id: 1, from: "Mom", subject: "Call me back", body: "Hi, please give me a ring when you have a moment.", cat: "Action", correct: "action", time: "09:00" },
    { id: 2, from: "Boss (Dave)", subject: "Q3 Report", body: "I need the quarterly figures on my desk by 5pm today.", cat: "Action", correct: "action", time: "09:05" },
    { id: 3, from: "Dentist", subject: "Appointment Reminder", body: "Reminder: Checkup tomorrow at 10am. Please call to confirm.", cat: "Action", correct: "action", time: "09:10" },
    { id: 4, from: "Team Lead", subject: "Who is covering for Sarah?", body: "Sarah is sick. Can you reply and let me know if you can take her shift?", cat: "Action", correct: "action", time: "09:15" },
    { id: 5, from: "Credit Card", subject: "Payment Due", body: "Your statement is ready. Minimum payment due in 2 days.", cat: "Action", correct: "action", time: "09:20" },
    { id: 6, from: "IT Desk", subject: "Laptop Upgrade", body: "Your new laptop is ready. Please come to the IT desk to collect it.", cat: "Action", correct: "action", time: "09:30" },

    // 2. ARCHIVE (Reference / Info / No Action)
    { id: 7, from: "Amazon", subject: "Order #4451 Shipped", body: "Your order has been dispatched. Track it online.", cat: "Archive", correct: "archive", time: "09:35" },
    { id: 8, from: "HR Dept", subject: "Office Closed Friday", body: "The office will be closed this Friday for maintenance. Enjoy the long weekend.", cat: "Archive", correct: "archive", time: "09:40" },
    { id: 9, from: "Uber Receipts", subject: "Your Tuesday trip", body: "Here is your receipt for $14.50.", cat: "Archive", correct: "archive", time: "09:42" },
    { id: 10, from: "Sarah (Colleague)", subject: "Meeting Notes", body: "Here are the notes from yesterday's meeting for your records. No reply needed.", cat: "Archive", correct: "archive", time: "09:45" },
    { id: 11, from: "System Admin", subject: "Maintenance Complete", body: "The server update finished successfully at 3am.", cat: "Archive", correct: "archive", time: "09:50" },

    // 3. DELETE (Spam / Junk)
    { id: 12, from: "Lottery", subject: "YOU WON $500!", body: "Click here to claim your prize instantly!", cat: "Delete", correct: "delete", time: "09:55" },
    { id: 13, from: "LinkedIn", subject: "5 people viewed your profile", body: "See who is looking at you. Upgrade to Premium.", cat: "Delete", correct: "delete", time: "10:00" },
    { id: 14, from: "Unknown", subject: "Viagra Cheap", body: "Best prices for pills. Buy now.", cat: "Delete", correct: "delete", time: "10:05" },
    { id: 15, from: "Newsletter", subject: "Summer Sale 50% Off", body: "Buy our new clothes. Sale ends today.", cat: "Delete", correct: "delete", time: "10:10" },
    { id: 16, from: "Chain Letter", subject: "Fwd: Fwd: Funny Cat", body: "Send this to 10 friends or bad luck will happen!", cat: "Delete", correct: "delete", time: "10:15" },

    // 4. TRAPS (Inhibition / Attention)
    // Trap A: Phishing (Looks like Action, is Delete)
    { id: 17, from: "IT Support (Security)", subject: "Password Expiry", body: "Your password expires in 1 hour. Click here: http://sketchy-url.com/login", cat: "Trap (Phishing)", correct: "delete", time: "10:20" },

    // Trap B: Phishing (Looks like Action, is Delete)
    { id: 18, from: "Bank Alert", subject: "Account Suspended", body: "Unusual activity detected. Kindly dwnload the attached file to restore access.", cat: "Trap (Phishing)", correct: "delete", time: "10:25" },

    // Trap C: Reply All Error (Looks like Action, is Archive/Delete)
    { id: 19, from: "CEO (All Staff)", subject: "Welcome New Hire", body: "Please welcome John to the team! (Please do not Reply All to this email).", cat: "Trap (Instruction)", correct: "archive", time: "10:30" },

    // Trap D: Distractor (Looks like Emergency, is Joke)
    { id: 20, from: "Best Friend", subject: "URGENT!!!", body: "Just kidding. Wanted to get your attention. Lunch?", cat: "Trap (Distractor)", correct: "delete", time: "10:35" }
];

// --- State ---
let sessionState = {
    currentIndex: 0,
    results: [],
    startTime: 0,
    emailStartTime: 0,
    totalTimeFormatted: '00:00'
};

// --- Shell Setup ---
const { content } = mountShell({
  appTitle: 'Outlook Simulation',
  appTagline: 'Triage 20 inbox messages quickly and choose the best action.',
  navLinks: [{ href: '../../index.html', label: 'Home' }],
});

// --- Workflow Views ---

// 1. Instructions View
function createInstructions(workflow) {
  const container = document.createElement('div');
  container.className = 'overlay-screen';
  container.id = 'screen-intro';

  container.innerHTML = `
        <div class="card">
            <h1 style="color:var(--outlook-blue); margin-top:0;">Outlook Simulation</h1>
            <p><strong>Scenario:</strong> You have returned to work after a week off. Your inbox has 20 unread items.</p>
            <p><strong>Your Task:</strong> Clear the inbox completely by processing one email at a time.</p>
            <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
            <p>For each email, choose the BEST action:</p>
            <ul style="line-height:1.6;">
                <li>🗑️ <strong>DELETE:</strong> Spam, Junk, or irrelevant notifications.</li>
                <li>📂 <strong>ARCHIVE:</strong> Information to keep (Receipts, FYIs, "Closed" notices). No response needed.</li>
                <li>⚡ <strong>REPLY / ACTION:</strong> Requires you to do something, reply, or is marked Urgent.</li>
            </ul>
            <div style="text-align:center;">
            </div>
        </div>
  `;

  const startBtn = createButton('Start Assessment', { variant: 'primary' });
  startBtn.className = 'btn-primary';
  startBtn.addEventListener('click', () => {
      sessionState.currentIndex = 0;
      sessionState.results = [];
      sessionState.startTime = Date.now();
      sessionState.emailStartTime = Date.now();
      workflow.changeStep('task');
  });

  container.querySelector('.card > div').appendChild(startBtn);

  return container;
}

// 2. Task View
function createTask(workflow) {
    const container = document.createElement('div');
    // Using main-container class from styles.css but wrapping it

    // Header for Timer
    const header = document.createElement('div');
    header.className = 'app-header';
    header.innerHTML = `
        <span style="margin-right: 15px;">:::</span>
        <span>Outlook Simulation</span>
        <span style="flex:1;"></span>
        <span id="timer" style="font-weight: normal; font-size: 14px;">00:00</span>
    `;

    const mainContainer = document.createElement('div');
    mainContainer.className = 'main-container';

    mainContainer.innerHTML = `
        <div class="folder-pane">
            <div class="folder-item active">Inbox <span id="count-display" style="float:right; font-weight:bold; color:var(--outlook-blue)">20</span></div>
            <div class="folder-item">Sent Items</div>
            <div class="folder-item">Drafts</div>
            <div class="folder-item">Archive</div>
            <div class="folder-item">Deleted Items</div>
        </div>

        <div class="email-list-pane" id="email-list">
            </div>

        <div class="reading-pane">
            <div class="toolbar">
                <button class="tool-btn btn-delete" id="btn-delete">
                    🗑️ Delete
                </button>
                <button class="tool-btn btn-archive" id="btn-archive">
                    📂 Archive
                </button>
                <button class="tool-btn btn-action" id="btn-action">
                    ⚡ Reply / Action
                </button>
                <span style="flex:1;"></span>
                <span style="font-size:12px; color:var(--text-meta);">Assessment Mode</span>
            </div>

            <div class="email-content" id="email-view">
                <div class="message-header">
                    <div class="msg-subject" id="disp-subject"></div>
                    <div class="msg-from" id="disp-from"></div>
                    <div class="msg-to">To: You</div>
                </div>
                <div class="msg-body" id="disp-body"></div>
            </div>
        </div>
    `;

    container.append(header, mainContainer);

    // Elements
    const uiList = mainContainer.querySelector('#email-list');
    const uiSubject = mainContainer.querySelector('#disp-subject');
    const uiFrom = mainContainer.querySelector('#disp-from');
    const uiBody = mainContainer.querySelector('#disp-body');
    const uiCount = mainContainer.querySelector('#count-display');
    const uiTimer = header.querySelector('#timer');

    let timerInt;

    // Logic
    function updateTimer() {
        const sec = Math.floor((Date.now() - sessionState.startTime) / 1000);
        const m = Math.floor(sec / 60).toString().padStart(2,'0');
        const s = (sec % 60).toString().padStart(2,'0');
        uiTimer.innerText = `${m}:${s}`;
        sessionState.totalTimeFormatted = `${m}:${s}`;
    }

    function renderList() {
        uiList.innerHTML = '';
        emails.forEach((e, idx) => {
            // If processed, hide it
            if (idx < sessionState.currentIndex) return;

            const initial = e.from.charAt(0).toUpperCase();
            const isActive = idx === sessionState.currentIndex ? 'selected' : '';

            const html = `
            <div class="email-preview ${isActive}" id="email-${idx}">
                <div class="avatar-circle">${initial}</div>
                <div class="preview-sender bold">${e.from}</div>
                <div class="preview-subject">${e.subject}</div>
                <div class="preview-snippet">${e.body}</div>
                <div class="time-stamp">${e.time}</div>
            </div>
            `;
            uiList.insertAdjacentHTML('beforeend', html);
        });
        uiCount.innerText = emails.length - sessionState.currentIndex;
    }

    function loadEmail(idx) {
        if (idx >= emails.length) {
            endGame();
            return;
        }
        const e = emails[idx];
        uiSubject.innerText = e.subject;
        uiFrom.innerText = e.from;
        uiBody.innerText = e.body;

        // Reset local timer for this specific email
        sessionState.emailStartTime = Date.now();
        renderList();
    }

    function handleAction(userAction) {
        const e = emails[sessionState.currentIndex];
        const timeTaken = Date.now() - sessionState.emailStartTime;

        // Logic Check
        let isCorrect = (userAction === e.correct);

        // Exception for "URGENT" joke (ID 20): Delete or Archive is fine, just don't Action.
        if (e.id === 20 && (userAction === 'delete' || userAction === 'archive')) {
            isCorrect = true;
        }

        // Exception for "Welcome New Hire" (ID 19): Archive is best, Delete is OK. Action is Fail.
        if (e.id === 19 && (userAction === 'delete' || userAction === 'archive')) {
            isCorrect = true;
        }

        sessionState.results.push({
            id: e.id,
            cat: e.cat,
            userAction: userAction,
            correctAction: e.correct,
            isCorrect: isCorrect,
            timeMs: timeTaken
        });

        sessionState.currentIndex++;
        loadEmail(sessionState.currentIndex);
    }

    function endGame() {
        clearInterval(timerInt);
        workflow.changeStep('stats');
    }

    // Bindings
    mainContainer.querySelector('#btn-delete').addEventListener('click', () => handleAction('delete'));
    mainContainer.querySelector('#btn-archive').addEventListener('click', () => handleAction('archive'));
    mainContainer.querySelector('#btn-action').addEventListener('click', () => handleAction('action'));

    // Init
    timerInt = setInterval(updateTimer, 1000);
    renderList();
    loadEmail(sessionState.currentIndex);

    return container;
}

// 3. Stats View
function createStats(workflow) {
    const container = document.createElement('div');
    container.className = 'overlay-screen';
    container.id = 'screen-report';
    container.classList.remove('hidden'); // ensure visible

    // CALC STATS
    const totalCorrect = sessionState.results.filter(r => r.isCorrect).length;
    const accuracy = Math.round((totalCorrect / emails.length) * 100);
    const totalTime = Date.now() - sessionState.startTime;
    const avgSpeed = Math.round((totalTime / emails.length) / 1000 * 10) / 10;

    // Build Rows
    let rowsHTML = '';
    sessionState.results.forEach((r, idx) => {
        const badgeClass = r.isCorrect ? 'badge-correct' : 'badge-wrong';
        rowsHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td>${r.cat}</td>
                <td><span class="badge ${badgeClass}">${r.userAction.toUpperCase()}</span></td>
                <td>${r.correctAction.toUpperCase()}</td>
                <td>${(r.timeMs/1000).toFixed(1)}s</td>
            </tr>
        `;
    });

    container.innerHTML = `
        <div class="card" style="max-width:800px; max-height: 90vh; overflow-y:auto;">
            <h2 style="margin-top:0;">Assessment Complete</h2>
            <div style="display:flex; justify-content:space-around; margin-bottom:20px; background:#f9f9f9; padding:15px; border-radius:4px;">
                <div>
                    <div style="font-size:12px; color:gray;">ACCURACY</div>
                    <div style="font-size:24px; font-weight:bold;" id="score-accuracy">${accuracy}%</div>
                </div>
                <div>
                    <div style="font-size:12px; color:gray;">TOTAL TIME</div>
                    <div style="font-size:24px; font-weight:bold;" id="score-time">${sessionState.totalTimeFormatted}</div>
                </div>
                <div>
                    <div style="font-size:12px; color:gray;">AVG SPEED</div>
                    <div style="font-size:24px; font-weight:bold;" id="score-speed">${avgSpeed}s</div>
                </div>
            </div>

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
                <tbody id="report-body">
                   ${rowsHTML}
                </tbody>
            </table>

            <div style="text-align:center;">
            </div>
        </div>
    `;

    const restartBtn = createButton('Restart', { variant: 'primary' });
    restartBtn.className = 'btn-primary';
    restartBtn.addEventListener('click', () => {
         workflow.changeStep('instructions');
    });

    container.querySelector('.card > div:last-child').appendChild(restartBtn);

    return container;
}


// --- Initialize Workflow ---
const workflow = new AppWorkflow({ container: content });
workflow.init({
  instructions: createInstructions,
  task: createTask,
  stats: createStats,
});
