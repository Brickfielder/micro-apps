
// Configuration
const GRID_ROWS = 10;
const GRID_COLS = 18;

// Puzzle Data
const puzzleData = {
  clues: [
    { number: 1, direction: 'down', row: 0, col: 4, answer: 'MANTOVA', clue: 'Città lombarda circondata da tre laghi artificiali, famosa per il Palazzo Ducale.' },
    { number: 2, direction: 'across', row: 2, col: 0, answer: 'TORINO', clue: 'Fu la prima capitale del Regno d\'Italia; oggi è famosa per il suo Museo Egizio.' },
    { number: 3, direction: 'down', row: 2, col: 9, answer: 'FERRARA', clue: 'Città emiliana che fiorì sotto la dinastia degli Este; il suo simbolo è il Castello Estense.' },
    { number: 4, direction: 'down', row: 2, col: 17, answer: 'PALERMO', clue: 'Il capoluogo siciliano, un crocevia di culture dove spicca il meraviglioso itinerario artistico arabo-normanno.' },
    { number: 5, direction: 'down', row: 3, col: 13, answer: 'BOLOGNA', clue: 'Soprannominata "La Dotta, la Grassa, la Rossa", è celebre per i suoi lunghissimi portici.' },
    { number: 6, direction: 'across', row: 4, col: 8, answer: 'URBINO', clue: 'Città marchigiana che fu una delle culle del Rinascimento; città natale di Raffaello.' },
    { number: 7, direction: 'across', row: 5, col: 13, answer: 'LECCE', clue: 'Città pugliese famosa per le spettacolari decorazioni dei suoi edifici in pietra locale.' },
    { number: 8, direction: 'across', row: 6, col: 3, answer: 'RAVENNA', clue: 'La città celebre in tutto il mondo per i suoi splendidi mosaici bizantini.' },
    { number: 9, direction: 'across', row: 8, col: 3, answer: 'VICENZA', clue: 'La città veneta legata indissolubilmente al genio dell\'architetto Andrea Palladio.' }
  ]
};

// State
let gridState = []; // 2D array storing cell data: { char, number, input, isBlack }
let currentSelection = { row: 0, col: 0, direction: 'across' }; // Focused cell
let timerInterval;
let startTime;
let mistakes = 0;
let isGameActive = false;

// DOM Elements
const appRoot = document.getElementById('app-root');
const instructionsScreen = document.getElementById('instructions-screen');
const taskScreen = document.getElementById('task-screen');
const statsScreen = document.getElementById('stats-screen');
const gridElement = document.getElementById('crossword-grid');
const acrossCluesList = document.getElementById('across-clues');
const downCluesList = document.getElementById('down-clues');
const timerDisplay = document.getElementById('timer-display');
const finalTimeDisplay = document.getElementById('final-time');
const mistakesCountDisplay = document.getElementById('mistakes-count');

// Buttons
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('check-btn').addEventListener('click', checkSolution);
document.getElementById('restart-btn').addEventListener('click', resetGame);
document.getElementById('exit-btn').addEventListener('click', () => location.reload()); // Simple exit

// Initialization
function init() {
  // Set CSS variables
  document.documentElement.style.setProperty('--grid-rows', GRID_ROWS);
  document.documentElement.style.setProperty('--grid-cols', GRID_COLS);

  // Initialize grid state
  gridState = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null).map(() => ({
    answer: null,
    number: null,
    input: '',
    isBlack: true,
    words: { across: null, down: null } // Stores index of clue in puzzleData.clues
  })));

  // Populate grid state from clues
  puzzleData.clues.forEach((clue, index) => {
    let r = clue.row;
    let c = clue.col;

    // Set number at start
    if (gridState[r][c].number === null) {
      gridState[r][c].number = clue.number;
    }

    for (let i = 0; i < clue.answer.length; i++) {
      let cell = gridState[r][c];
      cell.isBlack = false;
      cell.answer = clue.answer[i]; // Note: Overwrites if intersection, should be same

      if (clue.direction === 'across') {
        cell.words.across = index;
        c++;
      } else {
        cell.words.down = index;
        r++;
      }
    }
  });

  renderGrid();
  renderClues();
}

// Rendering
function renderGrid() {
  gridElement.innerHTML = '';
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cellData = gridState[r][c];
      const cellDiv = document.createElement('div');
      cellDiv.className = `cell ${cellData.isBlack ? 'black' : ''}`;
      cellDiv.dataset.row = r;
      cellDiv.dataset.col = c;

      if (!cellData.isBlack) {
        if (cellData.number) {
          const numSpan = document.createElement('span');
          numSpan.className = 'number';
          numSpan.textContent = cellData.number;
          cellDiv.appendChild(numSpan);
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.value = cellData.input;
        input.dataset.row = r;
        input.dataset.col = c;

        // Input Events
        input.addEventListener('focus', () => selectCell(r, c));
        input.addEventListener('keydown', handleInputKey);
        input.addEventListener('input', handleInput);
        input.addEventListener('click', (e) => {
           e.stopPropagation();
           // If already selected, toggle direction
           if (currentSelection.row === r && currentSelection.col === c) {
             toggleDirection();
           } else {
             selectCell(r, c);
           }
        });

        cellDiv.appendChild(input);
      } else {
        cellDiv.addEventListener('click', () => {
             // Click on black square does nothing or deselects
        });
      }
      gridElement.appendChild(cellDiv);
    }
  }
}

function renderClues() {
  acrossCluesList.innerHTML = '';
  downCluesList.innerHTML = '';

  puzzleData.clues.forEach((clue, index) => {
    const li = document.createElement('li');
    li.textContent = `${clue.number}. ${clue.clue}`;
    li.dataset.index = index;
    li.addEventListener('click', () => selectClue(index));

    if (clue.direction === 'across') {
      acrossCluesList.appendChild(li);
    } else {
      downCluesList.appendChild(li);
    }
  });
}

// Interaction
function selectCell(r, c, keepDirection = false) {
  if (gridState[r][c].isBlack) return;

  // Determine direction if not kept
  // Prefer existing direction if valid for this cell
  // If moving into a cell that is part of current direction word, keep it.
  // Else switch.

  const cell = gridState[r][c];

  if (!keepDirection) {
      // Logic to auto-select direction based on availability
      if (currentSelection.direction === 'across' && cell.words.across === null && cell.words.down !== null) {
          currentSelection.direction = 'down';
      } else if (currentSelection.direction === 'down' && cell.words.down === null && cell.words.across !== null) {
          currentSelection.direction = 'across';
      }
  }

  currentSelection.row = r;
  currentSelection.col = c;

  updateHighlights();

  // Focus input
  const input = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"] input`);
  if (input && document.activeElement !== input) {
    input.focus();
  }
}

function toggleDirection() {
  const cell = gridState[currentSelection.row][currentSelection.col];
  if (currentSelection.direction === 'across') {
    if (cell.words.down !== null) currentSelection.direction = 'down';
  } else {
    if (cell.words.across !== null) currentSelection.direction = 'across';
  }
  updateHighlights();
}

function selectClue(index) {
  const clue = puzzleData.clues[index];
  currentSelection.direction = clue.direction;
  selectCell(clue.row, clue.col, true); // Force selection of start cell
}

function updateHighlights() {
  // Clear highlights
  document.querySelectorAll('.cell').forEach(el => {
    el.classList.remove('highlight', 'focus');
  });
  document.querySelectorAll('.clues-panel li').forEach(el => el.classList.remove('active-clue'));

  // Highlight current word
  const cell = gridState[currentSelection.row][currentSelection.col];
  const wordIndex = currentSelection.direction === 'across' ? cell.words.across : cell.words.down;

  if (wordIndex !== null) {
    const clue = puzzleData.clues[wordIndex];

    // Highlight clue
    const clueLi = document.querySelector(`.clues-panel li[data-index="${wordIndex}"]`);
    if (clueLi) {
        clueLi.classList.add('active-clue');
        clueLi.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Highlight cells
    let r = clue.row;
    let c = clue.col;
    for (let i = 0; i < clue.answer.length; i++) {
      const cellDiv = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      if (cellDiv) cellDiv.classList.add('highlight');

      if (clue.direction === 'across') c++;
      else r++;
    }
  }

  // Focus current cell
  const focusDiv = document.querySelector(`.cell[data-row="${currentSelection.row}"][data-col="${currentSelection.col}"]`);
  if (focusDiv) focusDiv.classList.add('focus');
}

function handleInput(e) {
  const val = e.target.value.toUpperCase();
  const r = parseInt(e.target.dataset.row);
  const c = parseInt(e.target.dataset.col);

  // Update state
  gridState[r][c].input = val;
  e.target.value = val; // Force uppercase

  if (val) {
    // Move to next cell
    moveSelection(1);
  }
}

function handleInputKey(e) {
  const r = currentSelection.row;
  const c = currentSelection.col;

  if (e.key === 'Backspace') {
    if (gridState[r][c].input === '') {
      moveSelection(-1);
      e.preventDefault();
    } else {
       gridState[r][c].input = '';
       e.target.value = '';
    }
  } else if (e.key === 'ArrowRight') {
    navigate(0, 1);
  } else if (e.key === 'ArrowLeft') {
    navigate(0, -1);
  } else if (e.key === 'ArrowDown') {
    navigate(1, 0);
  } else if (e.key === 'ArrowUp') {
    navigate(-1, 0);
  }
}

function navigate(dr, dc) {
    let r = currentSelection.row + dr;
    let c = currentSelection.col + dc;

    if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && !gridState[r][c].isBlack) {
        selectCell(r, c, true);
    }
}

function moveSelection(step) {
  const clueIndex = currentSelection.direction === 'across'
    ? gridState[currentSelection.row][currentSelection.col].words.across
    : gridState[currentSelection.row][currentSelection.col].words.down;

  if (clueIndex === null) return;

  const clue = puzzleData.clues[clueIndex];

  // Find current index in the word
  let currentIndex = -1;
  let r = clue.row;
  let c = clue.col;

  const cells = [];
  for(let i=0; i<clue.answer.length; i++) {
      cells.push({r, c});
      if (r === currentSelection.row && c === currentSelection.col) {
          currentIndex = i;
      }
      if (clue.direction === 'across') c++; else r++;
  }

  const nextIndex = currentIndex + step;
  if (nextIndex >= 0 && nextIndex < cells.length) {
      selectCell(cells[nextIndex].r, cells[nextIndex].c, true);
  }
}

// Game Logic
function startGame() {
  instructionsScreen.classList.add('hidden');
  taskScreen.classList.remove('hidden');
  isGameActive = true;
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);

  // Focus first cell
  selectClue(0);
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

function checkSolution() {
  let isCorrect = true;
  let currentMistakes = 0;

  // Validate all cells
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (!gridState[r][c].isBlack) {
        const cellDiv = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
        const input = cellDiv.querySelector('input');

        // Reset classes
        cellDiv.classList.remove('correct', 'wrong');

        if (gridState[r][c].input !== gridState[r][c].answer) {
          isCorrect = false;
          if (gridState[r][c].input !== '') {
              cellDiv.classList.add('wrong');
              currentMistakes++;
          }
        } else {
             // Optional: Show correct feedback immediately? Usually only on full check.
             // Let's show correct too.
             // cellDiv.classList.add('correct');
             // Actually, usually crosswords don't highlight correct letters until game over or request.
             // But prompt implies "Task -> Stats".
        }
      }
    }
  }

  if (isCorrect) {
    endGame();
  } else {
    // If user clicked check, count mistakes?
    // Or just highlight errors?
    // Let's increment mistakes count for stats.
    if (currentMistakes > 0) mistakes++;
  }
}

function endGame() {
  clearInterval(timerInterval);
  isGameActive = false;

  taskScreen.classList.add('hidden');
  statsScreen.classList.remove('hidden');

  finalTimeDisplay.textContent = timerDisplay.textContent;
  mistakesCountDisplay.textContent = mistakes;
}

function resetGame() {
  statsScreen.classList.add('hidden');
  taskScreen.classList.add('hidden');
  instructionsScreen.classList.remove('hidden');

  // Clear inputs
  gridState.forEach(row => row.forEach(cell => {
      cell.input = '';
  }));
  mistakes = 0;
  renderGrid();
  timerDisplay.textContent = "00:00";
}

// Bootstrap
init();
