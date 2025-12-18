const RECIPES = [
  { name: "Espresso", req: ["hot-cup", "espresso"] },
  { name: "Americano", req: ["hot-cup", "espresso", "water"] },
  { name: "Latte", req: ["hot-cup", "espresso", "milk"] },
  { name: "Oat Latte", req: ["hot-cup", "espresso", "oat"] },
  { name: "Vanilla Latte", req: ["hot-cup", "espresso", "milk", "vanilla"] },
  { name: "Mocha", req: ["hot-cup", "espresso", "milk", "cocoa"] },
  { name: "Iced Latte", req: ["iced-cup", "ice", "espresso", "milk"] },
  { name: "Iced Oat Latte", req: ["iced-cup", "ice", "espresso", "oat"] },
  { name: "Iced Americano", req: ["iced-cup", "ice", "espresso", "water"] },
  { name: "Iced Vanilla", req: ["iced-cup", "ice", "espresso", "milk", "vanilla"] },
  { name: "Iced Mocha", req: ["iced-cup", "ice", "espresso", "milk", "cocoa"] },
];

const INGREDIENTS = {
  "hot-cup": { label: "Hot Cup", layerClass: "" },
  "iced-cup": { label: "Iced Cup", layerClass: "" },
  espresso: { label: "Esp", layerClass: "ing-esp" },
  milk: { label: "Milk", layerClass: "ing-milk" },
  oat: { label: "Oat", layerClass: "ing-oat" },
  water: { label: "H2O", layerClass: "ing-water" },
  ice: { label: "Ice", layerClass: "ing-ice" },
  vanilla: { label: "Van", layerClass: "ing-van" },
  cocoa: { label: "Choc", layerClass: "ing-choc" },
};

const SHIFT_DURATION = 60;
const STARTING_ORDER = 100;

const state = {
  score: 0,
  timeLeft: SHIFT_DURATION,
  currentOrder: null,
  build: [],
  gameActive: false,
  timerId: null,
  orderNumber: STARTING_ORDER,
  totalAttempts: 0,
  correctAttempts: 0,
};

const ui = {};

window.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  wireControls();
  updateHud();
});

function cacheElements() {
  ui.score = document.querySelector("#score");
  ui.timer = document.querySelector("#timer");
  ui.orderText = document.querySelector("#order-text");
  ui.orderNum = document.querySelector("#order-num");
  ui.contents = document.querySelector("#cup-contents");
  ui.cup = document.querySelector("#cup-visual");
  ui.gameArea = document.querySelector("#game-bg");
  ui.startOverlay = document.querySelector("#modal-start");
  ui.endOverlay = document.querySelector("#modal-end");
  ui.finalScore = document.querySelector("#final-score");
  ui.statSpeed = document.querySelector("#stat-speed");
  ui.statAcc = document.querySelector("#stat-acc");
}

function wireControls() {
  document.querySelectorAll("[data-ingredient]").forEach((btn) => {
    btn.addEventListener("click", () => addIngredient(btn.dataset.ingredient));
  });

  document.querySelector("#serve-btn").addEventListener("click", serveOrder);
  document.querySelector("#start-btn").addEventListener("click", startShift);
  document.querySelector("#restart-btn").addEventListener("click", () => window.location.reload());
  document.querySelector("#download-btn").addEventListener("click", downloadReport);
}

function startShift() {
  resetState();
  ui.startOverlay.classList.add("hidden");
  state.gameActive = true;
  updateHud();
  pushNewOrder();
  startTimer();
}

function resetState() {
  state.score = 0;
  state.timeLeft = SHIFT_DURATION;
  state.orderNumber = STARTING_ORDER;
  state.totalAttempts = 0;
  state.correctAttempts = 0;
  state.build = [];
  state.currentOrder = null;
  resetCup();
}

function startTimer() {
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    updateHud();
    if (state.timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function pushNewOrder() {
  const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
  state.currentOrder = recipe;
  state.orderNumber += 1;

  ui.orderText.textContent = recipe.name;
  ui.orderNum.textContent = state.orderNumber;
  triggerTicketAnimation();
  resetCup();
  state.build = [];
}

function triggerTicketAnimation() {
  const ticket = document.querySelector("#ticket-display");
  ticket.classList.remove("printing");
  // force reflow for restart
  void ticket.offsetWidth;
  ticket.classList.add("printing");
}

function addIngredient(ingredientId) {
  if (!state.gameActive || !INGREDIENTS[ingredientId]) return;

  const isCup = ingredientId === "hot-cup" || ingredientId === "iced-cup";
  if (isCup) {
    state.build = [ingredientId];
    resetCup();
    applyCupVisual(ingredientId);
    renderLayer(ingredientId);
    return;
  }

  state.build.push(ingredientId);
  renderLayer(ingredientId);
}

function renderLayer(ingredientId) {
  const cfg = INGREDIENTS[ingredientId];
  const layer = document.createElement("div");
  layer.className = `layer ${cfg.layerClass}`.trim();
  layer.textContent = cfg.label;
  ui.contents.appendChild(layer);
}

function applyCupVisual(type) {
  ui.cup.className = "cup";
  if (type === "hot-cup") {
    ui.cup.classList.add("hot");
  }
  if (type === "iced-cup") {
    ui.cup.classList.add("iced");
  }
}

function resetCup() {
  ui.cup.className = "cup";
  ui.contents.innerHTML = "";
}

function serveOrder() {
  if (!state.gameActive || !state.currentOrder) return;

  state.totalAttempts += 1;
  const required = [...state.currentOrder.req].sort().join(",");
  const build = [...state.build].sort().join(",");

  if (required === build) {
    state.score += 1;
    state.correctAttempts += 1;
    provideFeedback(true);
    pushNewOrder();
  } else {
    provideFeedback(false);
    state.build = [];
    resetCup();
  }

  updateHud();
}

function provideFeedback(success) {
  const className = success ? "flash-green" : "flash-red";
  ui.gameArea.classList.remove("flash-green", "flash-red");
  void ui.gameArea.offsetWidth;
  ui.gameArea.classList.add(className);
}

function updateHud() {
  ui.score.textContent = state.score;
  ui.timer.textContent = Math.max(0, state.timeLeft);
  ui.timer.classList.toggle("danger", state.timeLeft <= 10);
}

function endGame() {
  if (!state.gameActive) return;
  state.gameActive = false;
  clearInterval(state.timerId);
  ui.endOverlay.classList.remove("hidden");

  const avgSpeed = state.score > 0 ? (SHIFT_DURATION / state.score).toFixed(2) : "0";
  const accuracy = state.totalAttempts > 0 ? Math.round((state.correctAttempts / state.totalAttempts) * 100) : 0;

  ui.finalScore.textContent = state.score;
  ui.statSpeed.textContent = `${avgSpeed}s`;
  ui.statAcc.textContent = `${accuracy}%`;
}

function downloadReport() {
  const avgSpeed = state.score > 0 ? (SHIFT_DURATION / state.score).toFixed(2) : "0";
  const accuracy = state.totalAttempts > 0 ? Math.round((state.correctAttempts / state.totalAttempts) * 100) : 0;
  const content = `CAFÉ RUSH [BAR MODE]\n-----------------------\nDate: ${new Date().toLocaleDateString()}\nOrders: ${state.score}\nAccuracy: ${accuracy}%\nSpeed: ${avgSpeed}s/order`;

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "barista-report.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
