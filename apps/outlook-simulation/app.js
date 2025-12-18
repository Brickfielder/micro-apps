const emails = [
    { id: 1, from: "Mom", subject: "Call me back", body: "Hi, please give me a ring when you have a moment.", cat: "Action", correct: "action", time: "09:00" },
    { id: 2, from: "Dave (Boss)", subject: "Q3 Report", body: "I need the quarterly figures on my desk by 5pm today. Please acknowledge receipt.", cat: "Action", correct: "action", time: "09:05" },
    { id: 3, from: "Dr. Smith", subject: "Appointment Reminder", body: "Reminder: Checkup tomorrow at 10am. Please reply to confirm attendance.", cat: "Action", correct: "action", time: "09:10" },
    { id: 4, from: "Team Lead", subject: "Shift Coverage", body: "Sarah is out sick. Can you reply and let me know if you can take her shift tomorrow?", cat: "Action", correct: "action", time: "09:15" },
    { id: 5, from: "Amex Service", subject: "Payment Due", body: "Your statement is ready. Minimum payment due in 2 days. Log in to pay.", cat: "Action", correct: "action", time: "09:20" },
    { id: 6, from: "IT Helpdesk", subject: "Laptop Refresh", body: "Your new laptop is configured. Please reply with a time you can stop by to pick it up.", cat: "Action", correct: "action", time: "09:30" },

    { id: 7, from: "Amazon Orders", subject: "Order #4451 Shipped", body: "Your order has been dispatched. Track it online via the portal.", cat: "Archive", correct: "archive", time: "09:35" },
    { id: 8, from: "HR Department", subject: "Office Closed Friday", body: "The office will be closed this Friday for facility maintenance. Enjoy the long weekend.", cat: "Archive", correct: "archive", time: "09:40" },
    { id: 9, from: "Uber Receipts", subject: "Your Tuesday trip", body: "Here is your receipt for $14.50. Thank you for riding.", cat: "Archive", correct: "archive", time: "09:42" },
    { id: 10, from: "Sarah Jenkins", subject: "Meeting Notes", body: "Attached are the notes from yesterday's meeting for your records. No reply needed.", cat: "Archive", correct: "archive", time: "09:45" },
    { id: 11, from: "System Admin", subject: "Maintenance Complete", body: "The server update finished successfully at 3am. No issues reported.", cat: "Archive", correct: "archive", time: "09:50" },

    { id: 12, from: "Prize Winner", subject: "YOU WON $500!", body: "Click here to claim your prize instantly! Limited time offer.", cat: "Delete", correct: "delete", time: "09:55" },
    { id: 13, from: "LinkedIn", subject: "5 people viewed your profile", body: "See who is looking at you. Upgrade to Premium to unlock full access.", cat: "Delete", correct: "delete", time: "10:00" },
    { id: 14, from: "Unknown", subject: "Cheap Meds", body: "Best prices for pills. Buy now. Discreet shipping.", cat: "Delete", correct: "delete", time: "10:05" },
    { id: 15, from: "Fashion Weekly", subject: "Summer Sale 50% Off", body: "Buy our new clothes. Sale ends today. Unsubscribe if you want.", cat: "Delete", correct: "delete", time: "10:10" },
    { id: 16, from: "Chain Letter", subject: "Fwd: Fwd: Funny Cat", body: "Send this to 10 friends or bad luck will happen! Do not break the chain.", cat: "Delete", correct: "delete", time: "10:15" },

    { id: 17, from: "IT Support (Security)", subject: "Password Expiry", body: "Your password expires in 1 hour. Click here: http://sketchy-url.com/login", cat: "Trap (Phishing)", correct: "delete", time: "10:20" },
    { id: 18, from: "Bank Alert", subject: "Account Suspended", body: "Unusual activity detected. Kindly dwnload the attached file to restore access immediately.", cat: "Trap (Phishing)", correct: "delete", time: "10:25" },
    { id: 19, from: "CEO (All Staff)", subject: "Welcome New Hire", body: "Please welcome John to the team! (Please do not Reply All to this email).", cat: "Trap (Instruction)", correct: "archive", time: "10:30" },
    { id: 20, from: "Best Friend", subject: "URGENT!!!", body: "Just kidding. Wanted to get your attention. Lunch?", cat: "Trap (Distractor)", correct: "delete", time: "10:35" }
];

let currentIndex = 0;
let processedIndices = new Set();
let results = [];
let startTime = 0;
let emailStartTime = 0;
let timerInt;

const uiList = document.getElementById('email-list');
const uiSubject = document.getElementById('disp-subject');
const uiFrom = document.getElementById('disp-from');
const uiTime = document.getElementById('disp-time');
const uiBody = document.getElementById('disp-body');
const uiAvatar = document.getElementById('disp-avatar');
const uiCount = document.getElementById('count-display');
const uiTimer = document.getElementById('timer');
const uiDisplay = document.getElementById('email-display');
const uiEmpty = document.getElementById('empty-state');
const uiRibbon = document.getElementById('ribbon');

function startGame() {
    document.getElementById('modal-intro').classList.add('hidden');
    startTime = Date.now();
    emailStartTime = Date.now();
    processedIndices = new Set();
    results = [];
    timerInt = setInterval(updateTimer, 1000);

    currentIndex = 0;
    renderList();
    loadEmail(0);
}

function updateTimer() {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    uiTimer.innerText = `${m}:${s}`;
}

function renderList() {
    uiList.innerHTML = '';
    const remaining = emails.length - processedIndices.size;
    uiCount.innerText = remaining;

    emails.forEach((e, idx) => {
        if (processedIndices.has(idx)) return;

        const initial = e.from.charAt(0).toUpperCase();
        const isActive = idx === currentIndex ? 'selected' : '';

        const html = `
        <div class="email-item ${isActive}" onclick="selectEmail(${idx})">
            <div class="item-top">
                <div style="display:flex; align-items:center">
                     <div class="avatar" style="width:24px; height:24px; font-size:10px; margin-right:8px;">${initial}</div>
                    <span class="sender-name">${e.from}</span>
                </div>
                <span class="send-time">${e.time}</span>
            </div>
            <div class="subject-line">${e.subject}</div>
            <div class="preview-text">${e.body}</div>
        </div>
        `;
        uiList.insertAdjacentHTML('beforeend', html);
    });
}

function selectEmail(idx) {
    if (processedIndices.has(idx)) return;
    currentIndex = idx;
    loadEmail(idx);
}

function loadEmail(idx) {
    const e = emails[idx];

    uiSubject.innerText = e.subject;
    uiFrom.innerText = e.from;
    uiTime.innerText = `Received: Today, ${e.time}`;
    uiBody.innerText = e.body;
    uiAvatar.innerText = e.from.charAt(0).toUpperCase();

    emailStartTime = Date.now();
    renderList();
}

function handleAction(userAction) {
    if (processedIndices.size === emails.length) return;

    const e = emails[currentIndex];
    const timeTaken = Date.now() - emailStartTime;

    let isCorrect = userAction === e.correct;

    if (e.id === 20 && (userAction === 'delete' || userAction === 'archive')) isCorrect = true;
    if (e.id === 19 && (userAction === 'delete' || userAction === 'archive')) isCorrect = true;

    results.push({
        cat: e.cat,
        userAction: userAction,
        correctAction: e.correct,
        isCorrect: isCorrect,
        timeMs: timeTaken
    });

    processedIndices.add(currentIndex);

    if (processedIndices.size === emails.length) {
        endGame();
        return;
    }

    const nextAvailable = emails.findIndex((mail, i) => !processedIndices.has(i));

    if (nextAvailable !== -1) {
        currentIndex = nextAvailable;
        loadEmail(currentIndex);
    } else {
        renderList();
        uiDisplay.classList.add('hidden');
        uiRibbon.classList.add('hidden');
        uiEmpty.classList.remove('hidden');
    }
}

function endGame() {
    clearInterval(timerInt);
    document.getElementById('modal-report').classList.remove('hidden');
    uiDisplay.classList.add('hidden');
    uiRibbon.classList.add('hidden');
    uiEmpty.classList.remove('hidden');

    const totalCorrect = results.filter((r) => r.isCorrect).length;
    const accuracy = Math.round((totalCorrect / emails.length) * 100);
    const totalTime = Date.now() - startTime;
    const avgSpeed = Math.round((totalTime / emails.length) / 1000 * 10) / 10;

    document.getElementById('score-accuracy').innerText = `${accuracy}%`;
    document.getElementById('score-time').innerText = uiTimer.innerText;
    document.getElementById('score-speed').innerText = `${avgSpeed}s`;

    const tbody = document.getElementById('report-body');
    tbody.innerHTML = '';

    results.forEach((r) => {
        const tr = document.createElement('tr');
        const badgeClass = r.isCorrect ? 'status-pass' : 'status-fail';
        const badgeText = r.isCorrect ? 'PASS' : 'FAIL';

        tr.innerHTML = `
            <td>${r.cat}</td>
            <td style="text-transform: capitalize;">${r.userAction}</td>
            <td style="text-transform: capitalize;">${r.correctAction}</td>
            <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
        `;
        tbody.appendChild(tr);
    });
}
