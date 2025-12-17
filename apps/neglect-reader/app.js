(function initReaderApp() {
  const stages = {
    intro: document.getElementById('stage-intro'),
    task: document.getElementById('stage-task'),
    debrief: document.getElementById('stage-debrief'),
  };

  const reader = document.getElementById('reader');
  const modeControl = document.getElementById('modeControl');
  const pagesEl = document.getElementById('pages');
  const pageStatus = document.getElementById('pageStatus');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const fabNext = document.getElementById('fabNext');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const exportBtn = document.getElementById('exportBtn');

  const pages = Array.from(pagesEl.querySelectorAll('.page'));

  const state = {
    pageIndex: 0,
    startTime: null,
    resizeTimer: null,
  };

  function switchStage(stageName) {
    Object.values(stages).forEach((el) => el.classList.remove('active'));
    stages[stageName].classList.add('active');
    window.scrollTo(0, 0);
  }

  function formatDuration(start, end) {
    const durationMs = end - start;
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function currentMode() {
    return modeControl.querySelector('input[name="mode"]:checked')?.value || 'none';
  }

  function clearLeadWords(page) {
    page?.querySelectorAll('.wd.lead').forEach((el) => el.classList.remove('lead'));
  }

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
    const mode = currentMode();
    reader.classList.remove('mode-none', 'mode-stripe', 'mode-sweep', 'mode-firstwords');
    reader.classList.add(`mode-${mode}`);

    if (mode === 'firstwords') {
      requestAnimationFrame(() => applyLeadWords(pages[state.pageIndex]));
    } else {
      clearLeadWords(pages[state.pageIndex]);
    }
  }

  function render() {
    pages.forEach((page, index) => page.classList.toggle('current', index === state.pageIndex));
    pageStatus.textContent = `Page ${state.pageIndex + 1} of ${pages.length}`;

    prevBtn.disabled = state.pageIndex === 0;

    const isLast = state.pageIndex === pages.length - 1;
    nextBtn.textContent = isLast ? 'Finish' : 'Next →';
    fabNext.textContent = isLast ? '✓' : '➜';

    pagesEl.setAttribute('aria-label', `Story page ${state.pageIndex + 1} of ${pages.length}`);

    if (currentMode() === 'firstwords') {
      requestAnimationFrame(() => applyLeadWords(pages[state.pageIndex]));
    }
  }

  function go(delta) {
    if (state.pageIndex === pages.length - 1 && delta === 1) {
      endTask();
      return;
    }

    const nextIndex = Math.max(0, Math.min(pages.length - 1, state.pageIndex + delta));
    if (nextIndex === state.pageIndex) return;

    state.pageIndex = nextIndex;
    render();
    reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startTask() {
    state.startTime = Date.now();
    switchStage('task');
    updateMode();
  }

  function endTask() {
    const endTime = Date.now();
    const durationLabel = state.startTime ? formatDuration(state.startTime, endTime) : '0:00';

    const modeInput = modeControl.querySelector('input[name="mode"]:checked');
    const modeLabel = modeInput ? modeInput.nextElementSibling.textContent : 'None';

    document.getElementById('res-time').textContent = durationLabel;
    document.getElementById('res-mode').textContent = modeLabel;

    switchStage('debrief');
  }

  function bindKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
      if (!stages.task.classList.contains('active')) return;

      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);

      if (['1', '2', '3', '4'].includes(event.key)) {
        const map = {
          1: 'mode-none',
          2: 'mode-stripe',
          3: 'mode-sweep',
          4: 'mode-firstwords',
        };
        const target = document.getElementById(map[event.key]);
        if (target) {
          target.checked = true;
          updateMode();
        }
      }
    });
  }

  function bindSwipeNavigation() {
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
  }

  function handleResize() {
    if (currentMode() !== 'firstwords') return;
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => applyLeadWords(pages[state.pageIndex]), 150);
  }

  function bindUI() {
    prevBtn.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));
    fabNext.addEventListener('click', () => go(1));
    modeControl.addEventListener('change', updateMode);

    startBtn.addEventListener('click', startTask);
    restartBtn.addEventListener('click', () => window.location.reload());
    exportBtn.addEventListener('click', () => alert('Data exported to clinician dashboard.'));

    window.addEventListener('resize', handleResize);
  }

  function init() {
    render();
    bindUI();
    bindKeyboardNavigation();
    bindSwipeNavigation();
  }

  init();
})();
