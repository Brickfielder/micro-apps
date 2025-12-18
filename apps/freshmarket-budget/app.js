import { mountShell } from '../../shared/shell/shell.js';
import { AppWorkflow } from '../../shared/shell/workflow.js';
import { createButton } from '../../shared/ui/components.js';

// --- Data ---
const products = [
    // Distractor / Inhibition Trap (Sale!)
    { id: 1, name: "Chocolate Cake", emoji: "🎂", price: 2.50, detail: "Bakery Fresh", sale: true, type: "distractor" },

    // Meat (Trap: Premium vs Value)
    { id: 2, name: "Premium Steak Mince", emoji: "🥩", price: 8.50, detail: "500g - Organic", type: "mince_premium" },
    { id: 3, name: "Standard Beef Mince", emoji: "🥩", price: 4.00, detail: "500g - 20% Fat", type: "mince_std" },

    // Pasta (Trap: Artisan vs Value)
    { id: 4, name: "Fresh Egg Pasta", emoji: "🍝", price: 3.50, detail: "Handmade", type: "pasta_prem" },
    { id: 5, name: "Dry Spaghetti", emoji: "🍝", price: 0.90, detail: "Value Pack", type: "pasta_std" },

    // Sauce (Trap: Out of Stock -> Problem Solving)
    { id: 6, name: "Dolmio Pasta Sauce", emoji: "🥫", price: 2.50, detail: "Original Jar", oos: true, type: "sauce_jar" },
    { id: 7, name: "Chopped Tomatoes", emoji: "🥫", price: 0.80, detail: "Tinned", type: "sauce_sub" }, // Correct Substitute

    // Cheese (Trap: Price)
    { id: 8, name: "Vintage Cheddar", emoji: "🧀", price: 4.50, detail: "Aged 2 Years", type: "cheese_prem" },
    { id: 9, name: "Mild Cheddar", emoji: "🧀", price: 2.50, detail: "Everyday Block", type: "cheese_std" },

    // Milk (Trap: Volume / Quantity Math)
    { id: 10, name: "Fresh Milk (1L)", emoji: "🥛", price: 1.10, detail: "Semi-Skimmed", type: "milk", vol: 1 },
    { id: 11, name: "Small Milk (500ml)", emoji: "🥛", price: 0.70, detail: "To-Go Bottle", type: "milk_small" },

    // Fruit
    { id: 12, name: "Banana Bunch", emoji: "🍌", price: 1.50, detail: "Fairtrade", type: "fruit" },
    { id: 13, name: "Green Apples", emoji: "🍏", price: 2.20, detail: "Pack of 6", type: "fruit" },

    // Distractors (Waste money)
    { id: 14, name: "Coca Cola", emoji: "🥤", price: 3.00, detail: "Multipack", type: "distractor" },
    { id: 15, name: "Red Wine", emoji: "🍷", price: 8.00, detail: "Merlot", type: "distractor" }
];

const BUDGET_LIMIT = 25.00;

// --- State ---
let sessionState = {
    cart: [],
    startTime: 0
};

// --- Shell Setup ---
const { content } = mountShell({
  appTitle: 'FreshMarket',
  appTagline: 'Cognitive Assessment Mode',
  navLinks: [{ href: '../../index.html', label: 'Home' }],
});

// --- Workflow Views ---

// 1. Instructions View
function createInstructions(workflow) {
  const container = document.createElement('div');
  container.className = 'overlay';
  container.id = 'intro-screen';
  container.classList.remove('hidden'); // Ensure visible

  container.innerHTML = `
        <div class="card-modal">
            <h1>🛒 The Budget Shop</h1>
            <p><strong>Scenario:</strong> You are shopping for a family dinner.</p>
            <p><strong>Rules:</strong></p>
            <ul>
                <li>You have a strict budget of <strong>£25.00</strong>.</li>
                <li>You must buy <strong>everything</strong> on the list.</li>
                <li>If an item is out of stock, find a logical substitute.</li>
                <li>Avoid impulse buys (items not on the list).</li>
            </ul>
        </div>
  `;

  const startBtn = createButton('Start Shopping', { variant: 'primary' });
  startBtn.className = 'btn-checkout'; // Use existing CSS
  startBtn.addEventListener('click', () => {
      sessionState.cart = [];
      sessionState.startTime = Date.now();
      workflow.changeStep('task');
  });

  container.querySelector('.card-modal').appendChild(startBtn);

  return container;
}

// 2. Task View
function createTask(workflow) {
    const container = document.createElement('div');
    // Using main-layout class from app.css

    // Header (re-created here or use global shell?
    // The design has a specific header for the app, but shell provides one too.
    // The user requested consistent structure. Shell provides header.
    // I will use shell header and just put the main content here.

    const mainLayout = document.createElement('div');
    mainLayout.className = 'main-layout';

    mainLayout.innerHTML = `
        <div class="sidebar-left">
            <div class="paper-list">
                <h3>📝 Shopping List</h3>
                <p style="font-size:12px; margin-bottom:15px;">Target: Family Meal<br>Budget: £25.00</p>

                <div class="list-item">
                    <div class="checkbox"></div> <span>Minced Beef (500g)</span>
                </div>
                <div class="list-item">
                    <div class="checkbox"></div> <span>Spaghetti</span>
                </div>
                <div class="list-item">
                    <div class="checkbox"></div> <span>Jar of Tomato Sauce</span>
                </div>
                <div class="list-item">
                    <div class="checkbox"></div> <span>Cheddar Cheese</span>
                </div>
                <div class="list-item">
                    <div class="checkbox"></div> <span>Milk (2 Liters)</span>
                </div>
                <div class="list-item">
                    <div class="checkbox"></div> <span>Fresh Fruit</span>
                </div>

                <p style="margin-top:20px; font-size:11px; color:#666; font-style:italic;">
                    Tap boxes to check off items as you go.
                </p>
            </div>
        </div>

        <div class="shop-aisle" id="product-grid">
        </div>

        <div class="sidebar-right">
            <div class="cart-header">
                <h3 style="margin:0;">Your Trolley</h3>
                <div class="budget-display" id="budget-box">
                    <span>Remaining:</span>
                    <span id="budget-val">£25.00</span>
                </div>
            </div>

            <div class="cart-items" id="cart-list">
                <div style="text-align:center; padding:20px; color:#999; font-style:italic;">Trolley is empty</div>
            </div>

            <div class="cart-footer">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-weight:bold;">
                    <span>Total:</span>
                    <span id="total-val">£0.00</span>
                </div>
            </div>
        </div>
    `;

    container.appendChild(mainLayout);

    // Bind list items
    const listItems = mainLayout.querySelectorAll('.list-item');
    listItems.forEach(item => {
        item.addEventListener('click', () => {
            item.querySelector('.checkbox').classList.toggle('checked');
        });
    });

    // Bind Checkout
    const checkoutBtn = createButton('Checkout', { variant: 'primary' });
    checkoutBtn.className = 'btn-checkout';
    checkoutBtn.addEventListener('click', () => {
        workflow.changeStep('stats');
    });
    mainLayout.querySelector('.cart-footer').appendChild(checkoutBtn);

    // Render Grid
    const grid = mainLayout.querySelector('#product-grid');

    // Helper for Cart UI
    function updateCartUI() {
        const list = mainLayout.querySelector('#cart-list');
        list.innerHTML = '';

        let total = 0;

        if (sessionState.cart.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-style:italic;">Trolley is empty</div>';
        } else {
            sessionState.cart.forEach((item, index) => {
                total += item.price;
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                cartItem.innerHTML = `
                    <div>${item.emoji} ${item.name}</div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <b>£${item.price.toFixed(2)}</b>
                    </div>
                `;
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn-remove';
                removeBtn.innerHTML = '&times;';
                removeBtn.addEventListener('click', () => removeFromCart(index));

                cartItem.querySelector('div:last-child').appendChild(removeBtn);
                list.appendChild(cartItem);
            });
        }

        const remaining = BUDGET_LIMIT - total;
        const budgetBox = mainLayout.querySelector('#budget-box');

        mainLayout.querySelector('#total-val').innerText = `£${total.toFixed(2)}`;
        mainLayout.querySelector('#budget-val').innerText = `£${remaining.toFixed(2)}`;

        if (remaining < 0) {
            budgetBox.classList.add('budget-negative');
        } else {
            budgetBox.classList.remove('budget-negative');
        }
    }

    function addToCart(id) {
        const product = products.find(p => p.id === id);
        sessionState.cart.push(product);
        updateCartUI();
    }

    function removeFromCart(index) {
        sessionState.cart.splice(index, 1);
        updateCartUI();
    }

    products.forEach(p => {
        const isOos = p.oos;
        const btnState = isOos ? 'disabled' : '';
        const btnText = isOos ? 'Out of Stock' : 'Add to Trolley';
        const saleBadge = p.sale ? `<div class="badge-sale">50% OFF</div>` : '';
        const oosBadge = isOos ? `<div class="badge-oos">Sold Out</div>` : '';
        const opacity = isOos ? 'opacity: 0.6;' : '';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.style = opacity;

        card.innerHTML = `
            ${saleBadge} ${oosBadge}
            <div>
                <span class="prod-img">${p.emoji}</span>
                <div class="prod-name">${p.name}</div>
                <div class="prod-detail">${p.detail}</div>
            </div>
            <div>
                <div class="prod-price">£${p.price.toFixed(2)}</div>
            </div>
        `;

        const btn = document.createElement('button');
        btn.className = 'btn-add';
        if(isOos) btn.disabled = true;
        btn.textContent = btnText;
        btn.addEventListener('click', () => addToCart(p.id));

        card.querySelector('div:last-child').appendChild(btn);

        grid.appendChild(card);
    });

    updateCartUI();

    return container;
}

// 3. Stats View
function createStats(workflow) {
    const container = document.createElement('div');
    container.className = 'overlay';
    container.id = 'report-screen';
    container.classList.remove('hidden');

    // Calculate Stats
    const totalSpent = sessionState.cart.reduce((sum, item) => sum + item.price, 0);
    const budgetOk = totalSpent <= BUDGET_LIMIT;

    const hasMince = sessionState.cart.some(i => i.type === 'mince_premium' || i.type === 'mince_std');
    const hasPasta = sessionState.cart.some(i => i.type === 'pasta_prem' || i.type === 'pasta_std');
    const hasCheese = sessionState.cart.some(i => i.type === 'cheese_prem' || i.type === 'cheese_std');
    const hasFruit = sessionState.cart.some(i => i.type === 'fruit');
    const hasSauceSub = sessionState.cart.some(i => i.type === 'sauce_sub'); // Tinned tomatoes
    const milkVolume = sessionState.cart
        .filter(i => i.type === 'milk')
        .reduce((sum, i) => sum + i.vol, 0);
    const milkOk = milkVolume >= 2;
    const distractorCount = sessionState.cart.filter(i => i.type === 'distractor').length;
    const boughtCake = sessionState.cart.some(i => i.name === 'Chocolate Cake');

    let itemsFound = 0;
    if(hasMince) itemsFound++;
    if(hasPasta) itemsFound++;
    if(hasSauceSub) itemsFound++;
    if(hasCheese) itemsFound++;
    if(milkOk) itemsFound++;
    if(hasFruit) itemsFound++;

    container.innerHTML = `
        <div class="card-modal">
            <h2>Checkout Report</h2>

            <div style="display:flex; gap:20px; margin-bottom:20px;">
                <div style="flex:1; background:#f9f9f9; padding:15px; border-radius:8px; text-align:center;">
                    <div style="font-size:12px; color:#666;">BUDGET</div>
                    <div style="font-size:20px; font-weight:bold;" id="res-budget">Pass</div>
                </div>
                <div style="flex:1; background:#f9f9f9; padding:15px; border-radius:8px; text-align:center;">
                    <div style="font-size:12px; color:#666;">ITEMS FOUND</div>
                    <div style="font-size:20px; font-weight:bold;" id="res-items">0/6</div>
                </div>
            </div>

            <table id="res-table">
                <thead>
                    <tr>
                        <th>Task / Category</th>
                        <th>Result</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody id="res-body"></tbody>
            </table>

            <br>
        </div>
    `;

    // Populate Report
    const budgetRes = container.querySelector('#res-budget');
    budgetRes.innerText = budgetOk ? "PASS" : "FAIL (Over Budget)";
    budgetRes.style.color = budgetOk ? "var(--primary)" : "var(--danger)";

    container.querySelector('#res-items').innerText = `${itemsFound}/6`;

    const tbody = container.querySelector('#res-body');

    function addRow(task, success, note) {
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${task}</td>
                <td class="${success ? 'pass' : 'fail'}">${success ? 'Pass' : 'Fail'}</td>
                <td style="font-size:12px; color:#555;">${note}</td>
            </tr>
        `);
    }

    // Mince
    const expensiveMince = sessionState.cart.some(i => i.type === 'mince_premium');
    addRow("Minced Meat", hasMince, hasMince ? (expensiveMince ? "Bought Premium (High Cost)" : "Bought Standard (Good Budgeting)") : "Forgot Item");

    // Sauce
    addRow("Sauce Substitution", hasSauceSub, hasSauceSub ? "Correctly substituted Tinned Tomatoes" : "Failed to find substitute for Out of Stock sauce");

    // Milk
    addRow("Milk Quantity (2L)", milkOk, milkOk ? "Bought 2 Liters" : `Bought ${milkVolume}L (Target: 2L)`);

    // Inhibition
    addRow("Impulse Control", distractorCount === 0, boughtCake ? "Bought the Chocolate Cake (Impulse)" : (distractorCount > 0 ? "Bought unnecessary items" : "Stuck to list"));

    // Budget
    addRow("Budget Management", budgetOk, `Spent £${totalSpent.toFixed(2)} (Limit: £25.00)`);

    // Restart
    const restartBtn = createButton('Try Again', { variant: 'primary' });
    restartBtn.className = 'btn-checkout';
    restartBtn.addEventListener('click', () => {
        workflow.changeStep('instructions');
    });

    container.querySelector('.card-modal').appendChild(restartBtn);

    return container;
}


// --- Initialize Workflow ---
const workflow = new AppWorkflow({ container: content });
workflow.init({
  instructions: createInstructions,
  task: createTask,
  stats: createStats,
});
