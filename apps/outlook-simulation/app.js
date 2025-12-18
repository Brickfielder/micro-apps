// --- 20 ITEM DATASET ---
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
    // Note: Trap D is subjective, but in a work sim, deleting personal distractions is usually 'Correct'.
    // We will accept Delete or Archive for #20 in logic below.
];

// --- STATE ---
let currentIndex = 0;
let results = [];
let startTime = 0;
let emailStartTime = 0;
let timerInt;

// --- ELEMENTS ---
const uiList = document.getElementById('email-list');
const uiSubject = document.getElementById('disp-subject');
const uiFrom = document.getElementById('disp-from');
const uiBody = document.getElementById('disp-body');
const uiCount = document.getElementById('count-display');
const uiTimer = document.getElementById('timer');

// --- LOGIC ---

function startGame() {
    document.getElementById('screen-intro').classList.add('hidden');
    startTime = Date.now();
    emailStartTime = Date.now();
    timerInt = setInterval(updateTimer, 1000);
    renderList();
    loadEmail(0);
}

function updateTimer() {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(sec / 60).toString().padStart(2,'0');
    const s = (sec % 60).toString().padStart(2,'0');
    uiTimer.innerText = `${m}:${s}`;
}

function renderList() {
    uiList.innerHTML = '';
    emails.forEach((e, idx) => {
        // If processed, hide it
        if (idx < currentIndex) return;

        const initial = e.from.charAt(0).toUpperCase();
        const isActive = idx === currentIndex ? 'selected' : '';

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
    uiCount.innerText = emails.length - currentIndex;
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
    emailStartTime = Date.now();
    renderList(); // Re-render to update 'selected' state and hide processed
}

function handleAction(userAction) {
    const e = emails[currentIndex];
    const timeTaken = Date.now() - emailStartTime;

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

    results.push({
        id: e.id,
        cat: e.cat,
        userAction: userAction,
        correctAction: e.correct,
        isCorrect: isCorrect,
        timeMs: timeTaken
    });

    currentIndex++;
    loadEmail(currentIndex);
}

function endGame() {
    clearInterval(timerInt);
    document.getElementById('screen-report').classList.remove('hidden');

    // CALC STATS
    const totalCorrect = results.filter(r => r.isCorrect).length;
    const accuracy = Math.round((totalCorrect / emails.length) * 100);
    const totalTime = Date.now() - startTime;
    const avgSpeed = Math.round((totalTime / emails.length) / 1000 * 10) / 10;

    document.getElementById('score-accuracy').innerText = accuracy + "%";
    document.getElementById('score-time').innerText = uiTimer.innerText;
    document.getElementById('score-speed').innerText = avgSpeed + "s";

    // POPULATE TABLE
    const tbody = document.getElementById('report-body');
    results.forEach((r, idx) => {
        const tr = document.createElement('tr');
        const badgeClass = r.isCorrect ? 'badge-correct' : 'badge-wrong';
        const label = r.isCorrect ? 'PASS' : 'FAIL';

        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${r.cat}</td>
            <td><span class="badge ${badgeClass}">${r.userAction.toUpperCase()}</span></td>
            <td>${r.correctAction.toUpperCase()}</td>
            <td>${(r.timeMs/1000).toFixed(1)}s</td>
        `;
        tbody.appendChild(tr);
    });
}
