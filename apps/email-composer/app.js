import { mountShell } from '../../shared/shell/shell.js';
import { AppWorkflow } from '../../shared/shell/workflow.js';
import { createButton } from '../../shared/ui/components.js';

// --- Data & Configuration ---
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

let sessionState = {
    startTime: null,
    endTime: null,
    to: '',
    subject: '',
    body: '',
    guidanceItems: [],
    customAchieved: [],
    therapistNotes: ''
};

// --- Shell Setup ---
const { content } = mountShell({
  appTitle: 'Email Composer Coach',
  appTagline: 'Outlook-style email writing practice with coaching.',
  navLinks: [{ href: '../../index.html', label: 'Home' }],
});

// --- Workflow Views ---

// 1. Instructions View
function createInstructions(workflow) {
  const container = document.createElement('div');
  container.id = 'stage-intro';
  container.className = 'app-stage active';

  container.innerHTML = `
      <div class="card intro-container text-center">
        <div class="intro-icon">📧</div>
        <h1>Email Practice</h1>
        <p>You are about to write a professional email in a simulated Outlook environment.</p>
        <div class="task-box">
          <strong>Task:</strong><br>
          1. Compose an email to a colleague or organisation.<br>
          2. Use the <strong>"Check Draft"</strong> button to get feedback on tone, structure, and spelling.<br>
          3. When satisfied, click <strong>"Send"</strong> to finish.
        </div>
      </div>
  `;

  const startBtn = createButton('Start Composition', { variant: 'primary' });
  startBtn.className = 'btn btn-primary start-btn'; // preserve original class for styling if needed
  startBtn.addEventListener('click', () => {
      sessionState.startTime = new Date();
      workflow.changeStep('task');
  });

  container.querySelector('.intro-container').appendChild(startBtn);

  return container;
}

// 2. Task View
function createTask(workflow) {
    const container = document.createElement('div');
    container.id = 'stage-workspace';
    container.className = 'app-stage active'; // Ensure it's visible

    container.innerHTML = `
      <div class="grid two-col">
        <section class="card outlook-window">
          <div class="ribbon">
            <div id="finishTaskBtnContainer" style="display:inline-block"></div>
            <div class="vertical-divider" aria-hidden="true"></div>
            <button class="ribbon-btn" title="Attach">
              <span>📎</span>
              <span>Attach</span>
            </button>
            <button class="ribbon-btn" id="checkButtonRibbon">
              <span>abc✓</span>
              <span>Spelling</span>
            </button>
            <div class="flex-spacer" aria-hidden="true"></div>
            <button class="ribbon-btn" id="clearButton">
              <span>🗑️</span>
              <span>Discard</span>
            </button>
          </div>

          <div class="email-headers">
            <div class="header-row">
              <label for="fromInput">From</label>
              <input type="text" id="fromInput" value="you@outlook-sim.com" readonly />
            </div>
            <div class="header-row">
              <label for="toInput">To</label>
              <input type="text" id="toInput" placeholder="Recipient" />
            </div>
            <div class="header-row">
              <label for="ccInput">Cc</label>
              <input type="text" id="ccInput" placeholder="" />
            </div>
            <div class="header-row no-border">
              <label for="subjectInput">Subject</label>
              <input type="text" id="subjectInput" placeholder="Add a subject" />
            </div>
          </div>

          <div class="separator-line"></div>

          <div class="editor-container">
            <textarea id="bodyInput" class="email-body" placeholder="Type your message here..." spellcheck="true"></textarea>
          </div>

          <div class="actions-bar">
            <div id="statusSummary">Draft in progress</div>
            <div id="checkButtonContainer"></div>
          </div>
        </section>

        <aside class="card coach-panel">
          <h2>Coach Insights</h2>
          <p class="coach-description">Click <strong>Check Draft</strong> to analyze spelling, tone, and clarity.</p>

          <ul class="feedback-list" id="feedbackList"></ul>

          <div class="checklist" id="checklistContainer">
            <strong class="checklist-title">Essential Elements</strong>
            <label><input type="checkbox" id="greetingCheck" disabled /> Greeting</label>
            <label><input type="checkbox" id="purposeCheck" disabled /> Clear Purpose</label>
            <label><input type="checkbox" id="detailsCheck" disabled /> Key Details</label>
            <label><input type="checkbox" id="closingCheck" disabled /> Sign-off</label>
          </div>

          <div class="therapist-area">
            <strong class="therapist-title">Guidance Prompts</strong>
            <p class="therapist-hint">Therapist: Enter items the user must include (comma separated).</p>
            <textarea id="guidanceInput" placeholder="e.g. Appointment time, Account number"></textarea>
            <button id="applyGuidance" class="btn btn-secondary full-width-btn">Add to Checklist</button>
          </div>
        </aside>
      </div>
    `;

    // Elements
    const toInput = container.querySelector("#toInput");
    const subjectInput = container.querySelector("#subjectInput");
    const bodyInput = container.querySelector("#bodyInput");
    const feedbackList = container.querySelector("#feedbackList");
    const statusSummary = container.querySelector("#statusSummary");
    const checklistContainer = container.querySelector("#checklistContainer");
    const guidanceInput = container.querySelector("#guidanceInput");

    // Core Checklist
    const checklist = {
        greeting: container.querySelector("#greetingCheck"),
        purpose: container.querySelector("#purposeCheck"),
        details: container.querySelector("#detailsCheck"),
        closing: container.querySelector("#closingCheck")
    };

    // --- Buttons ---

    const finishTaskBtn = document.createElement('button');
    finishTaskBtn.className = 'send-btn-group';
    finishTaskBtn.innerHTML = `<span>Send</span><span class="send-btn-divider">Example</span>`;
    finishTaskBtn.addEventListener('click', () => {
        if (toInput.value === "" || bodyInput.value === "") {
            alert("Please add a recipient and a message before sending.");
            return;
        }
        sessionState.endTime = new Date();
        sessionState.to = toInput.value;
        sessionState.subject = subjectInput.value;
        sessionState.body = bodyInput.value;

        analyseEmail(); // Run one last analysis to capture checklist state

        // Capture custom achieved
        sessionState.customAchieved = [];
        container.querySelectorAll(".custom-checklist-input").forEach((box) => {
            if (box.checked) sessionState.customAchieved.push(box.dataset.term);
        });

        workflow.changeStep('stats');
    });
    container.querySelector('#finishTaskBtnContainer').appendChild(finishTaskBtn);


    const checkButton = document.createElement('button');
    checkButton.className = 'btn btn-secondary';
    checkButton.innerHTML = `<span class="check-icon">✓</span> Check Draft`;
    checkButton.addEventListener('click', analyseEmail);
    container.querySelector('#checkButtonContainer').appendChild(checkButton);

    container.querySelector('#checkButtonRibbon').addEventListener('click', analyseEmail);

    container.querySelector('#clearButton').addEventListener('click', () => {
        if (confirm("Discard this draft?")) {
            toInput.value = "";
            container.querySelector("#ccInput").value = "";
            subjectInput.value = "";
            bodyInput.value = "";
            feedbackList.innerHTML = "";
        }
    });

    container.querySelector('#applyGuidance').addEventListener('click', () => {
        const text = guidanceInput.value;
        if (!text) return;

        // Parse new items
        const newItems = text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
        sessionState.guidanceItems = [...sessionState.guidanceItems, ...newItems]; // Append to existing if any

        renderGuidanceItems();

        // Clear input ONLY. Do NOT run analysis yet.
        guidanceInput.value = "";
    });

    function renderGuidanceItems() {
        // Clear current CUSTOM items from DOM to re-render (keeps order clean)
        container.querySelectorAll(".custom-checklist-label").forEach((el) => el.remove());

        // Render all custom items into the checklist container
        sessionState.guidanceItems.forEach((item) => {
            const label = document.createElement("label");
            label.className = "custom-checklist-label custom-item";

            const input = document.createElement("input");
            input.type = "checkbox";
            input.disabled = true;
            input.className = "custom-checklist-input";
            input.dataset.term = item.toLowerCase();

            label.appendChild(input);
            label.appendChild(document.createTextNode(item));

            checklistContainer.appendChild(label);
        });
    }

    // --- Analysis Logic ---

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
        const customCheckboxes = container.querySelectorAll(".custom-checklist-input");
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

    // Restore state if returning (not implementing full state restore for simplicity right now, but easy to add)
    // If we wanted to persist draft content when switching tabs, we'd read from sessionState here.
    if(sessionState.guidanceItems.length > 0) {
        renderGuidanceItems();
    }

    return container;
}

// 3. Stats View
function createStats(workflow) {
    const container = document.createElement('div');
    container.id = 'stage-debrief';
    container.className = 'app-stage active';

    container.innerHTML = `
      <div class="card intro-container">
        <div class="intro-icon success">✓</div>
        <h1 class="text-center">Email Sent</h1>
        <p class="text-center">The email has been simulated as sent. Please review the session.</p>

        <div class="notes-section">
          <label class="therapist-title" for="therapistNotes">Therapist Observations</label>
          <textarea id="therapistNotes"></textarea>
        </div>

        <div class="debrief-actions">
        </div>
      </div>
    `;

    const downloadCsvBtn = createButton('Download Report', { variant: 'primary' });
    downloadCsvBtn.addEventListener('click', () => {
         const notes = container.querySelector("#therapistNotes").value;

          const csvContent = [
            ["Start", sessionState.startTime.toLocaleTimeString()],
            ["End", sessionState.endTime.toLocaleTimeString()],
            ["To", sessionState.to],
            ["Subject", sessionState.subject],
            ["Body", sessionState.body.replace(/\n/g, " ")],
            ["Custom Items Found", sessionState.customAchieved.join("; ")],
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

    const restartBtn = createButton('New Session', { variant: 'secondary' });
    restartBtn.addEventListener('click', () => {
        sessionState = {
            startTime: null,
            endTime: null,
            to: '',
            subject: '',
            body: '',
            guidanceItems: [],
            customAchieved: [],
            therapistNotes: ''
        };
        workflow.changeStep('instructions');
    });

    const actions = container.querySelector('.debrief-actions');
    actions.append(downloadCsvBtn, restartBtn);

    return container;
}


// --- Initialize Workflow ---
const workflow = new AppWorkflow({ container: content });
workflow.init({
  instructions: createInstructions,
  task: createTask,
  stats: createStats,
});
