const commonTypos = {
  teh: "the",
  recieve: "receive",
  address: "address",
  wont: "won't",
  dont: "don't",
  cant: "can't",
  its: "it's",
  seperate: "separate",
  definately: "definitely",
  occured: "occurred",
  thx: "thanks",
  u: "you",
};

const scenarios = [
  {
    id: 1,
    sender: "Sarah Jenkins (Manager)",
    subject: "Urgent: Q3 Report Data",
    initials: "SJ",
    body:
      "Hi,<br><br>I'm putting together the Q3 slides for the board meeting tomorrow. I seem to be missing the sales figures from your department.<br><br>Can you please send those over by 3 PM today?<br><br>Thanks,<br>Sarah",
    replyTo: "sarah.jenkins@company.com",
    goals: ["Attach Data", "Confirm Time (3 PM)"],
    tone: "Urgent",
    completed: false,
  },
  {
    id: 2,
    sender: "Dave from Accounting",
    subject: "Lunch on Friday?",
    initials: "DA",
    body:
      "Hey!<br><br>Long time no see. A few of us are heading to that new burger place on Friday around 12:30. Do you want to come along?<br><br>Let me know so I can book the table.<br><br>Cheers,<br>Dave",
    replyTo: "dave.acc@company.com",
    goals: ["Confirm Attendance", "Mention Time"],
    tone: "Casual",
    completed: false,
  },
  {
    id: 3,
    sender: "Client Services",
    subject: "Complaint: Order #4492",
    initials: "CS",
    body:
      "To whom it may concern,<br><br>My order #4492 arrived damaged yesterday. The box was crushed and the product is unusable.<br><br>I expect a full refund immediately.<br><br>Regards,<br>Angry Customer",
    replyTo: "support@client.com",
    goals: ["Apologize", "Offer Refund/Replace", "Formal Sign-off"],
    tone: "Formal",
    completed: false,
  },
  {
    id: 4,
    sender: "Project Team",
    subject: "Meeting Conflict",
    initials: "PT",
    body:
      "Hi Team,<br><br>We scheduled the brainstorming session for Thursday at 10 AM. However, the main conference room is double-booked.<br><br>Can we move this to Friday at 2 PM instead? Please confirm if this works for everyone.<br><br>Best,<br>Project Lead",
    replyTo: "team@company.com",
    goals: ["Confirm Availability", "Check Calendar"],
    tone: "Professional",
    completed: false,
  },
  {
    id: 5,
    sender: "Tom (Developer)",
    subject: "API Integration Delay",
    initials: "TD",
    body:
      "Hi,<br><br>I wanted to give you a heads up. The API integration is proving more difficult than expected. The documentation provided by the vendor is outdated.<br><br>We might need 2 extra days to finish the testing. Is that going to impact the launch?<br><br>Tom",
    replyTo: "tom.dev@company.com",
    goals: ["Acknowledge Delay", "Discuss Impact", "Supportive Tone"],
    tone: "Constructive",
    completed: false,
  },
];

let currentScenario = null;
let editorScore = 100;
let sendingTimer = null;
let sessionStartTime = null;
let sessionEndTime = null;
let tasksCompleted = 0;

const editor = document.getElementById("editor");
const scoreCircle = document.getElementById("scoreCircle");
const suggestionList = document.getElementById("suggestionList");
const goalsList = document.getElementById("goalsList");
const toast = document.getElementById("toast");

const startBtn = document.getElementById("startBtn");
const finishBtn = document.getElementById("finishBtn");
const replyBtn = document.getElementById("replyBtn");
const sendBtn = document.getElementById("sendBtn");
const discardBtn = document.getElementById("discardBtn");
const undoBtn = document.getElementById("undoBtn");
const downloadBtn = document.getElementById("downloadBtn");
const restartBtn = document.getElementById("restartBtn");

startBtn.addEventListener("click", startSession);
finishBtn.addEventListener("click", endSession);
replyBtn.addEventListener("click", startReply);
sendBtn.addEventListener("click", attemptSend);
discardBtn.addEventListener("click", discardDraft);
undoBtn.addEventListener("click", undoSend);
downloadBtn.addEventListener("click", downloadData);
restartBtn.addEventListener("click", () => window.location.reload());

function startSession() {
  sessionStartTime = new Date();
  document.getElementById("viewStart").classList.add("hidden");
  document.getElementById("viewWorkspace").classList.remove("hidden");
  document.getElementById("appHeader").classList.remove("hidden");
  renderInbox();

  editor.addEventListener("input", debounce(analyzeDraft, 500));
}

function endSession() {
  sessionEndTime = new Date();
  document.getElementById("viewWorkspace").classList.add("hidden");
  document.getElementById("appHeader").classList.add("hidden");
  document.getElementById("viewSummary").classList.remove("hidden");

  const durationMs = sessionEndTime - sessionStartTime;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = String(Math.floor((durationMs % 60000) / 1000)).padStart(2, "0");

  document.getElementById("resTasks").innerText = tasksCompleted;
  document.getElementById("resTime").innerText = `${minutes}m ${seconds}s`;
}

function renderInbox() {
  const list = document.getElementById("emailList");
  list.innerHTML = "";

  const remaining = scenarios.filter((scenario) => !scenario.completed).length;
  document.getElementById("inboxCount").innerText = remaining;

  scenarios.forEach((scenario) => {
    const div = document.createElement("div");
    div.className = `email-item ${scenario.completed ? "completed" : "unread"}`;
    div.innerHTML = `
      <div class="sender">${scenario.sender}</div>
      <div class="subject">${scenario.subject}</div>
      <div class="preview">${scenario.body.replace(/<br>/g, " ")}</div>
    `;

    if (!scenario.completed) {
      div.addEventListener("click", () => loadScenario(scenario, div));
    }

    list.appendChild(div);
  });
}

function loadScenario(scenario, element) {
  currentScenario = scenario;

  document.querySelectorAll(".email-item").forEach((item) => item.classList.remove("active"));
  element.classList.add("active");

  document.getElementById("emptyState").classList.add("hidden");
  document.getElementById("activeScenario").classList.remove("hidden");

  document.getElementById("incomingSender").textContent = scenario.sender;
  document.getElementById("incomingSubject").textContent = scenario.subject;
  document.getElementById("incomingBody").innerHTML = scenario.body;
  document.getElementById("avatar").textContent = scenario.initials;

  document.getElementById("composerArea").classList.add("hidden");
  document.getElementById("coachSidebar").classList.remove("active");
  editor.value = "";
  updateCoachUI(100, [], "");
}

function startReply() {
  if (!currentScenario) return;

  document.getElementById("composerArea").classList.remove("hidden");
  document.getElementById("coachSidebar").classList.add("active");
  document.getElementById("toInput").value = currentScenario.replyTo;
  document.getElementById("subjectInput").value = `Re: ${currentScenario.subject}`;
  editor.focus();
  analyzeDraft();
}

function analyzeDraft() {
  if (!currentScenario) return;

  const text = editor.value;
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const textLower = text.toLowerCase();

  let score = 100;
  const issues = [];

  const typosFound = [];
  words.forEach((word) => {
    const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (commonTypos[clean]) {
      typosFound.push(word);
    }
  });
  if (typosFound.length > 0) {
    score -= typosFound.length * 5;
    issues.push({ type: "crit", msg: `Spelling: ${typosFound.slice(0, 3).join(", ")}` });
  }

  if (words.length < 5) {
    score -= 20;
    issues.push({ type: "warn", msg: "Draft is too short." });
  }

  if (!/^(hi|hello|dear|good|hey)/i.test(text)) {
    score -= 10;
    issues.push({ type: "warn", msg: "Add a greeting." });
  }
  if (!/(regards|thanks|best|sincerely|cheers)/i.test(text)) {
    score -= 10;
    issues.push({ type: "warn", msg: "Add a sign-off." });
  }

  const goalsHtml = currentScenario.goals
    .map((goal) => {
      let isMet = false;
      const keywords = goal.toLowerCase().replace(/[()]/g, "").split(" ");
      if (keywords.some((keyword) => textLower.includes(keyword) && keyword.length > 2)) {
        isMet = true;
      }
      if (goal.includes("Attach") && (textLower.includes("attached") || textLower.includes("here is"))) {
        isMet = true;
      }

      if (!isMet && words.length > 10) {
        score -= 5;
      }

      const accent = isMet ? "var(--success)" : "#e1dfdd";
      return `<div class="insight-card" style="border-left: 4px solid ${accent}">${
        isMet ? "✓" : "○"
      } ${goal}</div>`;
    })
    .join("");

  editorScore = Math.max(0, score);
  updateCoachUI(editorScore, issues, goalsHtml);
}

function updateCoachUI(score, issues, goalsHtml) {
  scoreCircle.textContent = score;
  const color = score > 80 ? "var(--success)" : score > 50 ? "#ffaa44" : "var(--danger)";
  scoreCircle.style.borderColor = color;
  scoreCircle.style.color = color;

  if (issues.length === 0 && score === 100) {
    suggestionList.innerHTML = '<div class="insight-card" style="border-color:var(--success)">Looks great!</div>';
  } else {
    suggestionList.innerHTML = issues
      .map(
        (issue) => `
          <div class="insight-card">
            <div class="insight-header"><span>Suggestion</span><span class="badge ${
              issue.type === "crit" ? "badge-crit" : "badge-warn"
            }">${issue.type === "crit" ? "Fix" : "Tip"}</span></div>
            <div class="insight-text">${issue.msg}</div>
          </div>`
      )
      .join("");
  }
  goalsList.innerHTML = goalsHtml;
}

function attemptSend() {
  if (editorScore < 60 && !confirm("Editor Score is low. Send anyway?")) return;

  toast.classList.add("visible");
  sendingTimer = window.setTimeout(finishSend, 4000);
}

function undoSend() {
  if (!sendingTimer) return;
  clearTimeout(sendingTimer);
  sendingTimer = null;
  toast.classList.remove("visible");
}

function finishSend() {
  toast.classList.remove("visible");
  sendingTimer = null;
  window.alert("Sent!");

  if (currentScenario) {
    currentScenario.completed = true;
    tasksCompleted += 1;
  }

  document.getElementById("composerArea").classList.add("hidden");
  document.getElementById("coachSidebar").classList.remove("active");
  document.getElementById("activeScenario").classList.add("hidden");
  document.getElementById("emptyState").classList.remove("hidden");

  renderInbox();
}

function discardDraft() {
  if (!confirm("Discard draft?")) return;
  editor.value = "";
  document.getElementById("composerArea").classList.add("hidden");
  document.getElementById("coachSidebar").classList.remove("active");
}

function downloadData() {
  if (!sessionEndTime || !sessionStartTime) return;

  const durationMs = sessionEndTime - sessionStartTime;
  const minutes = Math.floor(durationMs / 60000);
  const content = `INBOX SIM REPORT\nDate: ${new Date().toLocaleString()}\nTasks Completed: ${tasksCompleted}\nDuration: ${minutes} minutes`;

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "session_data.txt";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function debounce(func, wait) {
  let timeout;
  return function debounced(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
