import { mountShell } from '../../shared/shell/shell.js';
import { AppWorkflow } from '../../shared/shell/workflow.js';
import { createButton } from '../../shared/ui/components.js';

// --- State Management ---
let sessionState = {
    pageIndex: 0,
    startTime: null,
    endTime: null,
    mode: 'none',
    modeLabel: 'None',
    resizeTimer: null,
    clinicianComment: ''
};

// --- Shell Setup ---
const { content } = mountShell({
  appTitle: 'Left-Anchor Reader',
  appTagline: 'Visuo-Spatial Neglect Trainer',
  navLinks: [{ href: '../../index.html', label: 'Home' }],
});

// --- Workflow Views ---

// 1. Instructions View
function createInstructions(workflow) {
  const container = document.createElement('div');
  container.className = 'stage active';
  container.id = 'stage-intro';

  container.innerHTML = `
      <div class="screen-content">
        <div class="instruction-icon" aria-hidden="true">📖</div>
        <h1 id="intro-heading">Left-Anchor Reader</h1>
        <p class="instruction-desc">
          This reading exercise is designed to help with Visuo-Spatial Neglect. You will read a short story across several pages.
        </p>
        <div class="task-panel" aria-label="Instructions">
          <strong>Instructions</strong>
          <ul>
            <li>Use the toolbar to select a visual cue if needed (Red Stripe, Sweeping Light, or Highlighted Words).</li>
            <li>Read carefully from left to right, keeping an eye on the left margin.</li>
            <li>Swipe or click "Next" to turn the page.</li>
          </ul>
        </div>
      </div>
  `;

  const startBtn = createButton('Start Reading', { variant: 'primary' });
  startBtn.className = 'btn primary full-width';
  startBtn.addEventListener('click', () => {
      sessionState.startTime = Date.now();
      workflow.changeStep('task');
  });

  container.querySelector('.screen-content').appendChild(startBtn);

  return container;
}

// 2. Task View
function createTask(workflow) {
    const container = document.createElement('div');
    container.className = 'stage active';
    container.id = 'stage-task';

    container.innerHTML = `
      <div class="toolbar" role="group" aria-label="Support mode">
        <span class="mode-label">Support:</span>
        <div class="segmented" id="modeControl">
          <input type="radio" id="mode-none" name="mode" value="none" />
          <label for="mode-none" title="No external support">None</label>

          <input type="radio" id="mode-stripe" name="mode" value="stripe" />
          <label for="mode-stripe" title="Pulsating red stripe on the left">Left stripe</label>

          <input type="radio" id="mode-sweep" name="mode" value="sweep" />
          <label for="mode-sweep" title="Right-to-left sweeping light">Sweep</label>

          <input type="radio" id="mode-firstwords" name="mode" value="firstwords" />
          <label for="mode-firstwords" title="Colour the first two words on each line">Lead-words</label>
        </div>
      </div>

      <section class="reader" id="reader" aria-label="Reading area">
        <div class="left-stripe" aria-hidden="true"></div>
        <div class="sweep" aria-hidden="true"></div>

        <h2 class="title">The River's Memory</h2>

        <div class="pages" id="pages" tabindex="0" aria-label="Story pages">
          <article class="page" data-index="0">
            <p>
              On the edge of a quiet village, a boy named Leo often sat by the river after school, skipping stones and talking to himself about the day’s little dramas. One afternoon, an old man appeared on the opposite bank, fishing with a rod so worn it looked older than Leo’s grandparents. For a while, they just nodded at each other across the water, strangers bound by the same silence. Then the man called out, “You’re throwing them too flat—let the stone breathe before it flies.” Leo tried again, and the stone danced five times before sinking. The old man smiled, and from that day, they met there most evenings.
            </p>
          </article>

          <article class="page" data-index="1">
            <p>
              The old man’s name was Arthur. He had been a carpenter once, a widower now, his stories shaped by both laughter and ache. Leo would bring his homework, and Arthur would bring tales of his youth—of building boats, of losing a friend in the war, of the first time he held his newborn daughter. Sometimes, they spoke little. Sometimes, they said everything without needing words. Leo started to notice how the sun seemed to linger a little longer when Arthur laughed, how the world felt smaller and kinder when they sat side by side.
            </p>
          </article>

          <article class="page" data-index="2">
            <p>
              When winter came and the river froze, Arthur stopped coming. Leo crossed the bridge and found the old house shuttered, the chair by the hearth empty but warm with memory. He sat by the fire, holding a small wooden boat Arthur had carved for him weeks before, its hull smooth as a wish. Years later, when Leo was grown and teaching his own son to skip stones, he told him, “Let the stone breathe before it flies.” And as the boy’s laughter echoed across the water, Leo smiled—because the river still remembered.
            </p>
          </article>
        </div>

        <div class="pager" aria-live="polite">
          <span id="pageStatus" class="hint">Page 1 of 3</span>
          <div class="buttons">
            <button class="btn" id="prevBtn" aria-label="Previous page">← Prev</button>
            <button class="btn primary" id="nextBtn" aria-label="Next page">Next →</button>
          </div>
        </div>
      </section>

      <button class="btn primary next-fab" id="fabNext" aria-label="Next page">➜</button>
    `;

    // Elements
    const reader = container.querySelector('#reader');
    const modeControl = container.querySelector('#modeControl');
    const pagesEl = container.querySelector('#pages');
    const pageStatus = container.querySelector('#pageStatus');
    const prevBtn = container.querySelector('#prevBtn');
    const nextBtn = container.querySelector('#nextBtn');
    const fabNext = container.querySelector('#fabNext');
    const pages = Array.from(pagesEl.querySelectorAll('.page'));

    // --- Helpers ---
    function ensureWrapped(page) {
        if (page.dataset.wrapped === '1') return;
        page.dataset.wrapped = '1';

        const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            return node.nodeValue.trim().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
        });

        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        const wordRe = /[\w’'-]+/g;
        for (const textNode of textNodes) {
        const fragment = document.createDocumentFragment();
        const text = textNode.nodeValue;
        let lastIndex = 0;
        let match;

        while ((match = wordRe.exec(text)) !== null) {
            const [word] = match;
            if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }
            const span = document.createElement('span');
            span.className = 'wd';
            span.textContent = word;
            fragment.appendChild(span);
            lastIndex = match.index + word.length;
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        textNode.parentNode.replaceChild(fragment, textNode);
        }
    }

    function clearLeadWords(page) {
        page?.querySelectorAll('.wd.lead').forEach((el) => el.classList.remove('lead'));
    }

    function applyLeadWords(page) {
        if (!page) return;
        ensureWrapped(page);
        clearLeadWords(page);

        const words = Array.from(page.querySelectorAll('.wd'));
        if (!words.length) return;

        let currentLineTop = null;
        let colouredOnLine = 0;
        const tolerance = 4;

        for (const word of words) {
        const { offsetTop } = word;
        if (currentLineTop === null || Math.abs(offsetTop - currentLineTop) > tolerance) {
            currentLineTop = offsetTop;
            colouredOnLine = 0;
        }
        if (colouredOnLine < 2) {
            word.classList.add('lead');
            colouredOnLine += 1;
        }
        }
    }

    function updateMode() {
        const modeInput = modeControl.querySelector('input[name="mode"]:checked');
        const mode = modeInput?.value || 'none';

        sessionState.mode = mode;
        sessionState.modeLabel = modeInput ? modeInput.nextElementSibling.textContent : 'None';

        reader.classList.remove('mode-none', 'mode-stripe', 'mode-sweep', 'mode-firstwords');
        reader.classList.add(`mode-${mode}`);

        if (mode === 'firstwords') {
            requestAnimationFrame(() => applyLeadWords(pages[sessionState.pageIndex]));
        } else {
            clearLeadWords(pages[sessionState.pageIndex]);
        }
    }

    function render() {
        pages.forEach((page, index) => page.classList.toggle('current', index === sessionState.pageIndex));
        pageStatus.textContent = `Page ${sessionState.pageIndex + 1} of ${pages.length}`;

        prevBtn.disabled = sessionState.pageIndex === 0;

        const isLast = sessionState.pageIndex === pages.length - 1;
        nextBtn.textContent = isLast ? 'Finish' : 'Next →';
        fabNext.textContent = isLast ? '✓' : '➜';

        pagesEl.setAttribute('aria-label', `Story page ${sessionState.pageIndex + 1} of ${pages.length}`);

        if (sessionState.mode === 'firstwords') {
          requestAnimationFrame(() => applyLeadWords(pages[sessionState.pageIndex]));
        }
    }

    function go(delta) {
        if (sessionState.pageIndex === pages.length - 1 && delta === 1) {
            endTask();
            return;
        }

        const nextIndex = Math.max(0, Math.min(pages.length - 1, sessionState.pageIndex + delta));
        if (nextIndex === sessionState.pageIndex) return;

        sessionState.pageIndex = nextIndex;
        render();
        reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function endTask() {
        sessionState.endTime = Date.now();
        workflow.changeStep('stats');
    }

    // --- Events ---
    modeControl.addEventListener('change', updateMode);
    prevBtn.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));
    fabNext.addEventListener('click', () => go(1));

    // Keyboard navigation
    document.addEventListener('keydown', (event) => {
        // Only active if in task view (which is always true here since this is inside createTask, but good to be safe if listener persisted)
        // Since createTask returns a new container and listeners are attached to elements inside it or window,
        // we need to be careful. Window listeners accumulate if not removed.
        // However, for simplicity in this refactor, we'll attach to document but check visibility?
        // Actually, cleaner is to attach to document and rely on the fact that if we switch views,
        // the old view is gone. But 'keydown' is global.
        // We should probably remove it on cleanup, but AppWorkflow doesn't have a cleanup hook yet.
        // For now, let's check if the container is still in the DOM.
        if (!document.body.contains(container)) return;

        if (event.key === 'ArrowLeft') go(-1);
        if (event.key === 'ArrowRight') go(1);

        if (['1', '2', '3', '4'].includes(event.key)) {
            const map = {
                1: 'mode-none',
                2: 'mode-stripe',
                3: 'mode-sweep',
                4: 'mode-firstwords',
            };
            const target = modeControl.querySelector(`#${map[event.key]}`);
            if (target) {
                target.checked = true;
                updateMode();
            }
        }
    });

    // Swipe navigation
    let touchStartX = 0;
    let touchStartY = 0;
    const SWIPE_X = 50;
    const SWIPE_Y = 60;

    pagesEl.addEventListener(
        'touchstart',
        (event) => {
            touchStartX = event.changedTouches[0].clientX;
            touchStartY = event.changedTouches[0].clientY;
        },
        { passive: true },
    );

    pagesEl.addEventListener(
        'touchend',
        (event) => {
            const dx = event.changedTouches[0].clientX - touchStartX;
            const dy = event.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > SWIPE_X && Math.abs(dy) < SWIPE_Y) {
                go(dx < 0 ? 1 : -1);
            }
        },
        { passive: true },
    );

    window.addEventListener('resize', () => {
        if (!document.body.contains(container)) return;
        if (sessionState.mode !== 'firstwords') return;
        clearTimeout(sessionState.resizeTimer);
        sessionState.resizeTimer = setTimeout(() => applyLeadWords(pages[sessionState.pageIndex]), 150);
    });

    // Set initial mode selection based on sessionState
    const initialModeInput = modeControl.querySelector(`input[value="${sessionState.mode}"]`);
    if(initialModeInput) initialModeInput.checked = true;

    // Initialize
    updateMode();
    render();

    return container;
}

// 3. Stats View
function createStats(workflow) {
    const container = document.createElement('div');
    container.className = 'stage active';
    container.id = 'stage-debrief';

    function formatDuration(start, end) {
        const durationMs = end - start;
        const totalSeconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    const durationLabel = sessionState.startTime ? formatDuration(sessionState.startTime, sessionState.endTime) : '0:00';

    container.innerHTML = `
      <div class="screen-content">
        <h1 id="debrief-heading">Session Complete</h1>
        <p>Great job reading through the story.</p>

        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-val" id="res-time">${durationLabel}</span>
            <span class="stat-lbl">Time Taken</span>
          </div>
          <div class="stat-card">
            <span class="stat-val" id="res-mode">${sessionState.modeLabel}</span>
            <span class="stat-lbl">Mode Used</span>
          </div>
        </div>

        <div class="comment-block">
          <label class="comment-label" for="clinicianComment">Clinician comment</label>
          <textarea
            id="clinicianComment"
            name="clinicianComment"
            class="comment-area"
            placeholder="Add any observations or follow-up notes here..."
            rows="3"
          >${sessionState.clinicianComment}</textarea>
        </div>

        <div class="footer-actions">
        </div>
      </div>
    `;

    const commentInput = container.querySelector('#clinicianComment');
    commentInput.addEventListener('input', () => {
        sessionState.clinicianComment = commentInput.value;
    });

    const restartBtn = createButton('Restart', { variant: 'secondary' });
    restartBtn.addEventListener('click', () => {
        sessionState.pageIndex = 0;
        sessionState.startTime = null;
        sessionState.endTime = null;
        workflow.changeStep('instructions');
    });

    const exportBtn = createButton('Export Result', { variant: 'primary' });
    exportBtn.addEventListener('click', () => {
        const endTime = sessionState.endTime || Date.now();
        const durationSeconds = sessionState.startTime ? Math.round((endTime - sessionState.startTime) / 1000) : 0;

        const entries = {
          'Start Time': sessionState.startTime ? new Date(sessionState.startTime).toISOString() : '',
          'End Time': new Date(endTime).toISOString(),
          'Duration (seconds)': durationSeconds,
          'Duration (label)': sessionState.startTime ? formatDuration(sessionState.startTime, endTime) : '0:00',
          'Mode Used': sessionState.modeLabel,
          'Pages Read': `3 of 3`, // Hardcoded for this story length
          'Clinician Comment': sessionState.clinicianComment.trim(),
        };

        const headers = Object.keys(entries);
        const row = headers
          .map((key) => {
            const value = entries[key];
            const escaped = String(value ?? '').replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',');

        const csvContent = `${headers.join(',')}\n${row}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'neglect-reader-results.csv';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    container.querySelector('.footer-actions').append(restartBtn, exportBtn);

    return container;
}


// --- Initialize Workflow ---
const workflow = new AppWorkflow({ container: content });
workflow.init({
  instructions: createInstructions,
  task: createTask,
  stats: createStats,
});
