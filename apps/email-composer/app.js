/* --- COMMON SPELL CHECK DICTIONARY --- */
const commonTypos = {
  teh: "the",
  recieve: "receive",
  receiveing: "receiving",
  adress: "address",
  addrress: "address",
  wont: "won't",
  dont: "don't",
  cant: "can't",
  its: "it's (if possessive check context)",
  seperate: "separate",
  definately: "definitely",
  occured: "occurred",
  untill: "until",
  alot: "a lot",
  tommorow: "tomorrow",
  tmmrw: "tomorrow",
  thx: "thanks",
  pls: "please",
  u: "you",
  ur: "your",
  i: "I",
  im: "I'm",
  wich: "which"
};

/* --- DOM ELEMENTS --- */
const stageIntro = document.getElementById("stage-intro");
const stageWorkspace = document.getElementById("stage-workspace");
const stageDebrief = document.getElementById("stage-debrief");

const startBtn = document.getElementById("startBtn");
const finishTaskBtn = document.getElementById("finishTaskBtn");
const checkButton = document.getElementById("checkButton");
const checkButtonRibbon = document.getElementById("checkButtonRibbon");
const clearButton = document.getElementById("clearButton");

const subjectInput = document.getElementById("subjectInput");
const bodyInput = document.getElementById("bodyInput");
const toInput = document.getElementById("toInput");
const feedbackList = document.getElementById("feedbackList");
const statusSummary = document.getElementById("statusSummary");

// Core Checklist
const checklist = {
  greeting: document.getElementById("greetingCheck"),
  purpose: document.getElementById("purposeCheck"),
  details: document.getElementById("detailsCheck"),
  closing: document.getElementById("closingCheck")
};
const checklistContainer = document.getElementById("checklistContainer");

const guidanceInput = document.getElementById("guidanceInput");
const applyGuidanceButton = document.getElementById("applyGuidance");
let guidanceItems = []; // Array of strings e.g. ["Appointment Time"]
let sessionStartTime, sessionEndTime;

/* --- STAGE NAVIGATION --- */
startBtn.addEventListener("click", () => {
  sessionStartTime = new Date();
  stageIntro.classList.remove("active");
  stageWorkspace.classList.add("active");
});

finishTaskBtn.addEventListener("click", () => {
  if (toInput.value === "" || bodyInput.value === "") {
    alert("Please add a recipient and a message before sending.");
    return;
  }
  sessionEndTime = new Date();
  analyseEmail();
  stageWorkspace.classList.remove("active");
  stageDebrief.classList.add("active");
});

document.getElementById("restartBtn").addEventListener("click", () => window.location.reload());

/* --- ANALYSIS LOGIC --- */

function createFeedbackItem(message, tone) {
  const li = document.createElement("li");
  li.className = "feedback-item";
  li.dataset.tone = tone;
  li.textContent = message;
  return li;
}

function checkSpelling(text) {
  const feedback = [];
  const words = text.split(/[\s,.!?":;]+/);

  const foundTypos = [];
  words.forEach((word) => {
    const lower = word.toLowerCase();
    if (commonTypos[lower]) {
      foundTypos.push({ bad: word, good: commonTypos[lower] });
    }
  });
  // Deduplicate
  const uniqueTypos = [...new Set(foundTypos.map(JSON.stringify))].map(JSON.parse);
  uniqueTypos.forEach((typo) => {
    feedback.push(createFeedbackItem(`Spelling: Change "${typo.bad}" to "${typo.good}".`, "spelling"));
  });
  return feedback;
}

function analyseEmail() {
  feedbackList.innerHTML = "";
  const feedback = [];

  const subject = subjectInput.value.trim();
  const body = bodyInput.value.trim();
  const toValue = toInput.value.trim();
  const combinedText = (subject + " " + body).toLowerCase();
  const wordCount = body.split(/\s+/).filter((n) => n !== "").length;

  // 1. Reset Core Checklist
  Object.values(checklist).forEach((box) => (box.checked = false));

  // 2. Reset Custom Checklist Items
  const customCheckboxes = document.querySelectorAll(".custom-checklist-input");
  customCheckboxes.forEach((box) => (box.checked = false));

  // --- CHECKS ---

  if (!toValue) {
    feedback.push(createFeedbackItem('Missing Recipient: Add an email to the "To" line.', "critical"));
  }

  if (!subject) {
    feedback.push(createFeedbackItem("Missing Subject: Add a short title for your email.", "critical"));
  } else if (subject.toLowerCase() === "no subject") {
    feedback.push(createFeedbackItem("Subject: Please write a specific subject.", "warning"));
  }

  if (!body) {
    feedback.push(createFeedbackItem("Missing Message: The email body is empty.", "critical"));
  } else {
    if (wordCount < 10) feedback.push(createFeedbackItem("Too Short: Add more detail to your message.", "warning"));
    if (wordCount > 200) feedback.push(createFeedbackItem("Too Long: Try to keep it concise.", "warning"));

    // Core Checklist Logic
    if (/^\s*(hi|hello|dear|good morning|good afternoon)\b/i.test(body)) checklist.greeting.checked = true;
    else feedback.push(createFeedbackItem('Structure: Start with a greeting (e.g., "Hello").', "warning"));

    if (/(thank|regards|sincerely|best|cheers)/i.test(body)) checklist.closing.checked = true;
    else feedback.push(createFeedbackItem('Structure: Add a sign-off (e.g., "Regards").', "warning"));

    if (wordCount > 15) checklist.purpose.checked = true;
    if (/\d|appointment|meeting|attached|question/.test(body.toLowerCase())) checklist.details.checked = true;
  }

  // 3. Custom Checklist Logic
  customCheckboxes.forEach((box) => {
    const term = box.dataset.term;
    if (combinedText.includes(term)) {
      box.checked = true;
    } else {
      feedback.push(createFeedbackItem(`Missing Checklist Item: Please include "${term}".`, "warning"));
    }
  });

  // 4. Run Spell Check
  const spellingFeedback = checkSpelling(body + " " + subject);
  spellingFeedback.forEach((item) => feedback.push(item));

  // 5. Render
  if (feedback.length === 0) {
    feedback.push(createFeedbackItem("Looks great! You are ready to send.", "positive"));
    statusSummary.textContent = "All checks passed";
    statusSummary.style.color = "#107c10";
  } else {
    statusSummary.textContent = "Suggestions found";
    statusSummary.style.color = "#d13438";
  }

  feedback.forEach((item) => feedbackList.appendChild(item));
}

/* --- GUIDANCE LOGIC (UPDATED) --- */
applyGuidanceButton.addEventListener("click", () => {
  const text = guidanceInput.value;
  if (!text) return;

  // Parse new items
  const newItems = text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  guidanceItems = [...guidanceItems, ...newItems]; // Append to existing if any

  // Clear current CUSTOM items from DOM to re-render (keeps order clean)
  document.querySelectorAll(".custom-checklist-label").forEach((el) => el.remove());

  // Render all custom items into the checklist container
  guidanceItems.forEach((item) => {
    const label = document.createElement("label");
    label.className = "custom-checklist-label custom-item"; // Class for styling/removal

    const input = document.createElement("input");
    input.type = "checkbox";
    input.disabled = true; // User can't click, Coach checks it
    input.className = "custom-checklist-input";
    input.dataset.term = item.toLowerCase(); // Store for analysis

    label.appendChild(input);
    label.appendChild(document.createTextNode(item));

    checklistContainer.appendChild(label);
  });

  // Clear input ONLY. Do NOT run analysis yet.
  guidanceInput.value = "";
});

/* --- EVENT LISTENERS --- */
checkButton.addEventListener("click", analyseEmail);
checkButtonRibbon.addEventListener("click", analyseEmail);

clearButton.addEventListener("click", () => {
  if (confirm("Discard this draft?")) {
    toInput.value = "";
    document.getElementById("ccInput").value = "";
    subjectInput.value = "";
    bodyInput.value = "";
    feedbackList.innerHTML = "";
  }
});

/* --- CSV DOWNLOAD --- */
document.getElementById("downloadCsvBtn").addEventListener("click", () => {
  const notes = document.getElementById("therapistNotes").value;

  // Check which custom items were achieved
  const customAchieved = [];
  document.querySelectorAll(".custom-checklist-input").forEach((box) => {
    if (box.checked) customAchieved.push(box.dataset.term);
  });

  const csvContent = [
    ["Start", sessionStartTime.toLocaleTimeString()],
    ["End", sessionEndTime.toLocaleTimeString()],
    ["To", toInput.value],
    ["Subject", subjectInput.value],
    ["Body", bodyInput.value.replace(/\n/g, " ")],
    ["Custom Items Found", customAchieved.join("; ")],
    ["Notes", notes.replace(/\n/g, " ")]
  ]
    .map((e) => `"${e[0]}","${e[1]}"`)
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "session_report.csv";
  a.click();
});
