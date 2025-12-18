import { mountShell } from '../../shared/shell/shell.js';

const PRODUCTS = [
  { id: 1, name: 'Chocolate Cake', emoji: '🎂', price: 2.5, detail: 'Bakery Fresh', sale: true, type: 'distractor' },
  { id: 2, name: 'Premium Steak Mince', emoji: '🥩', price: 8.5, detail: '500g - Organic', type: 'mince_premium' },
  { id: 3, name: 'Standard Beef Mince', emoji: '🥩', price: 4.0, detail: '500g - 20% Fat', type: 'mince_std' },
  { id: 4, name: 'Fresh Egg Pasta', emoji: '🍝', price: 3.5, detail: 'Handmade', type: 'pasta_prem' },
  { id: 5, name: 'Dry Spaghetti', emoji: '🍝', price: 0.9, detail: 'Value Pack', type: 'pasta_std' },
  { id: 6, name: 'Dolmio Pasta Sauce', emoji: '🥫', price: 2.5, detail: 'Original Jar', oos: true, type: 'sauce_jar' },
  { id: 7, name: 'Chopped Tomatoes', emoji: '🥫', price: 0.8, detail: 'Tinned', type: 'sauce_sub' },
  { id: 8, name: 'Vintage Cheddar', emoji: '🧀', price: 4.5, detail: 'Aged 2 Years', type: 'cheese_prem' },
  { id: 9, name: 'Mild Cheddar', emoji: '🧀', price: 2.5, detail: 'Everyday Block', type: 'cheese_std' },
  { id: 10, name: 'Fresh Milk (1L)', emoji: '🥛', price: 1.1, detail: 'Semi-Skimmed', type: 'milk', vol: 1 },
  { id: 11, name: 'Small Milk (500ml)', emoji: '🥛', price: 0.7, detail: 'To-Go Bottle', type: 'milk_small', vol: 0.5 },
  { id: 12, name: 'Banana Bunch', emoji: '🍌', price: 1.5, detail: 'Fairtrade', type: 'fruit' },
  { id: 13, name: 'Green Apples', emoji: '🍏', price: 2.2, detail: 'Pack of 6', type: 'fruit' },
  { id: 14, name: 'Coca Cola', emoji: '🥤', price: 3.0, detail: 'Multipack', type: 'distractor' },
  { id: 15, name: 'Red Wine', emoji: '🍷', price: 8.0, detail: 'Merlot', type: 'distractor' },
];

const SHOPPING_LIST = [
  'Minced Beef (500g)',
  'Spaghetti',
  'Jar of Tomato Sauce',
  'Cheddar Cheese',
  'Milk (2 Liters)',
  'Fresh Fruit',
];

const BUDGET_LIMIT = 25.0;

const { content } = mountShell({
  appTitle: 'FreshMarket Budget Shop',
  appTagline: 'Stay on list, stay on budget, and finish the family meal plan.',
  navLinks: [{ href: '../../index.html', label: 'Home' }],
});

content.classList.add('freshmarket-app');
content.innerHTML = `
  <section class="intro-card" aria-live="polite">
    <div class="badge" aria-hidden="true">🛒 Budget Drill</div>
    <h2 style="margin: 10px 0 6px">The Budget Shop</h2>
    <p style="margin: 0; color: var(--fresh-muted)">
      Collect every ingredient on the list without exceeding <strong>£25.00</strong>.
      Out-of-stock items require a logical substitute.
    </p>
  </section>

  <div class="app-layout" id="main-content">
    <section class="panel" aria-labelledby="list-heading">
      <div class="panel-header">
        <h3 class="panel-title" id="list-heading">Shopping List</h3>
        <p class="paper-meta" style="margin: 4px 0 0">Scenario: Family meal • Budget: £25.00</p>
      </div>
      <div class="panel-body">
        <div class="paper-list" id="shopping-list" aria-live="polite"></div>
      </div>
    </section>

    <section class="panel" aria-labelledby="aisle-heading">
      <div class="panel-header">
        <h3 class="panel-title" id="aisle-heading">Market Aisle</h3>
        <p class="paper-meta" style="margin: 4px 0 0">Tap items to add them to your trolley.</p>
      </div>
      <div class="panel-body">
        <div class="shop-grid" id="product-grid"></div>
      </div>
    </section>

    <section class="panel" aria-labelledby="cart-heading">
      <div class="panel-header">
        <h3 class="panel-title" id="cart-heading">Your Trolley</h3>
        <div class="budget-box" id="budget-box">
          <div>
            <div class="section-label">Remaining</div>
            <div class="section-value" id="budget-val">£25.00</div>
          </div>
          <div>
            <div class="section-label">Total</div>
            <div class="section-value" id="total-val">£0.00</div>
          </div>
        </div>
      </div>
      <div class="panel-body">
        <div class="cart-items" id="cart-list"></div>
      </div>
      <div class="checkout-footer">
        <button class="btn btn-primary" id="checkout-btn">Checkout</button>
      </div>
    </section>
  </div>

  <div class="overlay" id="intro-screen" role="dialog" aria-modal="true">
    <div class="modal">
      <h1>🛒 The Budget Shop</h1>
      <p><strong>Scenario:</strong> You are shopping for a family dinner.</p>
      <p><strong>Rules:</strong></p>
      <ul>
        <li>You have a strict budget of <strong>£25.00</strong>.</li>
        <li>You must buy <strong>everything</strong> on the list.</li>
        <li>If an item is out of stock, find a logical substitute.</li>
        <li>Avoid impulse buys (items not on the list).</li>
      </ul>
      <button class="btn btn-primary" id="start-btn">Start Shopping</button>
    </div>
  </div>

  <div class="overlay is-hidden" id="report-screen" role="dialog" aria-modal="true">
    <div class="modal">
      <h2>Checkout Report</h2>
      <div class="report-grid">
        <div class="report-card">
          <div class="section-label">Budget</div>
          <div class="section-value" id="res-budget">Pass</div>
        </div>
        <div class="report-card">
          <div class="section-label">Items Found</div>
          <div class="section-value" id="res-items">0/6</div>
        </div>
      </div>
      <table class="result-table" id="res-table">
        <thead>
          <tr>
            <th>Task / Category</th>
            <th>Result</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody id="res-body"></tbody>
      </table>
      <div style="margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn btn-primary" id="restart-btn">Try Again</button>
      </div>
    </div>
  </div>
`;

const productGrid = content.querySelector('#product-grid');
const cartList = content.querySelector('#cart-list');
const budgetBox = content.querySelector('#budget-box');
const budgetVal = content.querySelector('#budget-val');
const totalVal = content.querySelector('#total-val');
const reportScreen = content.querySelector('#report-screen');
const introScreen = content.querySelector('#intro-screen');
const resBudget = content.querySelector('#res-budget');
const resItems = content.querySelector('#res-items');
const resBody = content.querySelector('#res-body');

let cart = [];

function formatCurrency(value) {
  return `£${value.toFixed(2)}`;
}

function renderShoppingList() {
  const listContainer = content.querySelector('#shopping-list');
  listContainer.innerHTML = `
    <h3>📝 Shopping List</h3>
    <p class="paper-meta">Tap boxes to check off items as you go.</p>
  `;

  SHOPPING_LIST.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.setAttribute('role', 'checkbox');
    row.setAttribute('aria-checked', 'false');

    const box = document.createElement('span');
    box.className = 'checkmark';
    box.innerHTML = '&nbsp;';

    const label = document.createElement('span');
    label.textContent = item;

    row.append(box, label);
    row.addEventListener('click', () => {
      const isChecked = row.classList.toggle('checked');
      row.setAttribute('aria-checked', String(isChecked));
      box.innerHTML = isChecked ? '✓' : '&nbsp;';
    });

    listContainer.appendChild(row);
  });
}

function renderProducts() {
  productGrid.innerHTML = '';

  PRODUCTS.forEach((product) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.setAttribute('aria-label', `${product.name} ${product.detail}`);

    if (product.oos) {
      card.style.opacity = '0.6';
    }

    if (product.sale) {
      const sale = document.createElement('div');
      sale.className = 'badge-sale';
      sale.textContent = '50% OFF';
      card.appendChild(sale);
    }

    if (product.oos) {
      const oos = document.createElement('div');
      oos.className = 'badge-oos';
      oos.textContent = 'Sold Out';
      card.appendChild(oos);
    }

    const emoji = document.createElement('span');
    emoji.className = 'product-emoji';
    emoji.textContent = product.emoji;

    const name = document.createElement('div');
    name.className = 'product-name';
    name.textContent = product.name;

    const detail = document.createElement('div');
    detail.className = 'product-detail';
    detail.textContent = product.detail;

    const price = document.createElement('div');
    price.className = 'product-price';
    price.textContent = formatCurrency(product.price);

    const addButton = document.createElement('button');
    addButton.className = 'btn btn-primary';
    addButton.textContent = product.oos ? 'Out of Stock' : 'Add to Trolley';
    addButton.disabled = Boolean(product.oos);
    addButton.addEventListener('click', () => addToCart(product.id));

    const footer = document.createElement('div');
    footer.className = 'product-footer';
    footer.append(price, addButton);

    card.append(emoji, name, detail, footer);
    productGrid.appendChild(card);
  });
}

function addToCart(productId) {
  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product) return;
  cart.push(product);
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  cartList.innerHTML = '';
  if (cart.length === 0) {
    cartList.innerHTML = '<div class="empty-copy">Trolley is empty</div>';
  } else {
    cart.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'cart-row';

      const meta = document.createElement('div');
      meta.className = 'cart-meta';
      meta.textContent = `${item.emoji} ${item.name}`;

      const actions = document.createElement('div');
      actions.className = 'cart-actions';

      const price = document.createElement('div');
      price.textContent = formatCurrency(item.price);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.setAttribute('aria-label', `Remove ${item.name}`);
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', () => removeFromCart(index));

      actions.append(price, removeBtn);
      row.append(meta, actions);
      cartList.appendChild(row);
    });
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const remaining = BUDGET_LIMIT - total;

  totalVal.textContent = formatCurrency(total);
  budgetVal.textContent = formatCurrency(remaining);
  budgetBox.classList.toggle('over-budget', remaining < 0);
}

function finishShop() {
  const totalSpent = cart.reduce((sum, item) => sum + item.price, 0);
  const budgetOk = totalSpent <= BUDGET_LIMIT;

  const hasMince = cart.some((item) => item.type === 'mince_premium' || item.type === 'mince_std');
  const hasPasta = cart.some((item) => item.type === 'pasta_prem' || item.type === 'pasta_std');
  const hasCheese = cart.some((item) => item.type === 'cheese_prem' || item.type === 'cheese_std');
  const hasFruit = cart.some((item) => item.type === 'fruit');
  const hasSauceSub = cart.some((item) => item.type === 'sauce_sub');
  const milkVolume = cart
    .filter((item) => item.type === 'milk' || item.type === 'milk_small')
    .reduce((sum, item) => sum + (item.vol || 0), 0);
  const milkOk = milkVolume >= 2;
  const distractorCount = cart.filter((item) => item.type === 'distractor').length;
  const boughtCake = cart.some((item) => item.name === 'Chocolate Cake');

  let itemsFound = 0;
  if (hasMince) itemsFound += 1;
  if (hasPasta) itemsFound += 1;
  if (hasSauceSub) itemsFound += 1;
  if (hasCheese) itemsFound += 1;
  if (milkOk) itemsFound += 1;
  if (hasFruit) itemsFound += 1;

  renderReport({
    budgetOk,
    itemsFound,
    totalSpent,
    hasMince,
    hasPasta,
    hasSauceSub,
    hasCheese,
    milkOk,
    milkVolume,
    distractorCount,
    boughtCake,
  });
}

function renderReport(result) {
  resBudget.textContent = result.budgetOk ? 'PASS' : 'FAIL (Over Budget)';
  resBudget.style.color = result.budgetOk ? 'var(--fresh-primary)' : 'var(--fresh-danger)';
  resItems.textContent = `${result.itemsFound}/6`;

  resBody.innerHTML = '';
  const addRow = (task, success, note) => {
    const row = document.createElement('tr');

    const taskCell = document.createElement('td');
    taskCell.textContent = task;

    const resultCell = document.createElement('td');
    resultCell.className = success ? 'result-pass' : 'result-fail';
    resultCell.textContent = success ? 'Pass' : 'Fail';

    const noteCell = document.createElement('td');
    noteCell.textContent = note;
    noteCell.style.fontSize = '13px';
    noteCell.style.color = 'var(--fresh-muted)';

    row.append(taskCell, resultCell, noteCell);
    resBody.appendChild(row);
  };

  const expensiveMince = cart.some((item) => item.type === 'mince_premium');
  addRow('Minced Meat', result.hasMince, result.hasMince ? (expensiveMince ? 'Bought Premium (High Cost)' : 'Bought Standard (Good Budgeting)') : 'Forgot Item');
  addRow('Sauce Substitution', result.hasSauceSub, result.hasSauceSub ? 'Correctly substituted Tinned Tomatoes' : 'Failed to find substitute for out-of-stock sauce');
  addRow('Milk Quantity (2L)', result.milkOk, result.milkOk ? 'Bought 2 Liters' : `Bought ${result.milkVolume}L (Target: 2L)`);
  addRow('Impulse Control', result.distractorCount === 0, result.boughtCake ? 'Bought the Chocolate Cake (Impulse)' : result.distractorCount > 0 ? 'Bought unnecessary items' : 'Stuck to list');
  addRow('Budget Management', result.budgetOk, `Spent ${formatCurrency(result.totalSpent)} (Limit: £25.00)`);

  reportScreen.classList.remove('is-hidden');
}

function resetExperience() {
  cart = [];
  renderCart();
  renderShoppingList();
  reportScreen.classList.add('is-hidden');
  introScreen.classList.remove('is-hidden');
}

function wireInteractions() {
  const startBtn = content.querySelector('#start-btn');
  const checkoutBtn = content.querySelector('#checkout-btn');
  const restartBtn = content.querySelector('#restart-btn');

  startBtn.addEventListener('click', () => {
    introScreen.classList.add('is-hidden');
  });

  checkoutBtn.addEventListener('click', finishShop);
  restartBtn.addEventListener('click', resetExperience);
}

renderShoppingList();
renderProducts();
renderCart();
wireInteractions();
