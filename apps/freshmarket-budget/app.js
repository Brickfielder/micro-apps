// --- DATASET ---
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

// --- STATE ---
let cart = [];
const BUDGET_LIMIT = 25.00;
let startTime = 0;

function showStage(id) {
    const stages = ['intro-screen', 'stage-task', 'report-screen'];
    stages.forEach(stageId => {
        const el = document.getElementById(stageId);
        if (!el) return;
        el.classList.remove('active');
    });
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

// --- INIT ---
function startGame() {
    showStage('stage-task');
    startTime = Date.now();
    renderShop();
}

// --- RENDER SHOP ---
function renderShop() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    products.forEach(p => {
        const isOos = p.oos;
        const btnState = isOos ? 'disabled' : '';
        const btnText = isOos ? 'Out of Stock' : 'Add to Trolley';
        const saleBadge = p.sale ? `<div class="badge-sale">50% OFF</div>` : '';
        const oosBadge = isOos ? `<div class="badge-oos">Sold Out</div>` : '';
        const opacity = isOos ? 'opacity: 0.6;' : '';

        const html = `
        <div class="product-card" style="${opacity}">
            ${saleBadge} ${oosBadge}
            <div>
                <span class="prod-img">${p.emoji}</span>
                <div class="prod-name">${p.name}</div>
                <div class="prod-detail">${p.detail}</div>
            </div>
            <div>
                <div class="prod-price">£${p.price.toFixed(2)}</div>
                <button class="btn-add" ${btnState} onclick="addToCart(${p.id})">${btnText}</button>
            </div>
        </div>
        `;
        grid.insertAdjacentHTML('beforeend', html);
    });
}

// --- CART LOGIC ---
function addToCart(id) {
    const product = products.find(p => p.id === id);
    cart.push(product);
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById('cart-list');
    list.innerHTML = '';

    let total = 0;

    if (cart.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-style:italic;">Trolley is empty</div>';
    } else {
        cart.forEach((item, index) => {
            total += item.price;
            list.insertAdjacentHTML('beforeend', `
                <div class="cart-item">
                    <div>${item.emoji} ${item.name}</div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <b>£${item.price.toFixed(2)}</b>
                        <button class="btn-remove" onclick="removeFromCart(${index})">&times;</button>
                    </div>
                </div>
            `);
        });
    }

    const remaining = BUDGET_LIMIT - total;
    const budgetBox = document.getElementById('budget-box');

    document.getElementById('total-val').innerText = `£${total.toFixed(2)}`;
    document.getElementById('budget-val').innerText = `£${remaining.toFixed(2)}`;

    if (remaining < 0) {
        budgetBox.classList.add('budget-negative');
    } else {
        budgetBox.classList.remove('budget-negative');
    }
}

function toggleCheck(el) {
    el.querySelector('.checkbox').classList.toggle('checked');
    // This is purely visual for the user to help them track
}

// --- SCORING & REPORT ---
function finishShop() {
    // 1. Calculate Finances
    const totalSpent = cart.reduce((sum, item) => sum + item.price, 0);
    const budgetOk = totalSpent <= BUDGET_LIMIT;

    // 2. Logic Checks
    const hasMince = cart.some(i => i.type === 'mince_premium' || i.type === 'mince_std');
    const hasPasta = cart.some(i => i.type === 'pasta_prem' || i.type === 'pasta_std');
    const hasCheese = cart.some(i => i.type === 'cheese_prem' || i.type === 'cheese_std');
    const hasFruit = cart.some(i => i.type === 'fruit');

    // Complex Logic: Sauce Substitution
    const hasSauceSub = cart.some(i => i.type === 'sauce_sub'); // Tinned tomatoes

    // Complex Logic: Milk Volume (Need 2 Liters)
    const milkVolume = cart
        .filter(i => i.type === 'milk')
        .reduce((sum, i) => sum + i.vol, 0);
    const milkOk = milkVolume >= 2;

    // Complex Logic: Inhibtion (Did they buy the cake?)
    const distractorCount = cart.filter(i => i.type === 'distractor').length;
    const boughtCake = cart.some(i => i.name === 'Chocolate Cake');

    // 3. Score
    let itemsFound = 0;
    if(hasMince) itemsFound++;
    if(hasPasta) itemsFound++;
    if(hasSauceSub) itemsFound++;
    if(hasCheese) itemsFound++;
    if(milkOk) itemsFound++;
    if(hasFruit) itemsFound++;

    // 4. Render Report
    showStage('report-screen');

    const budgetRes = document.getElementById('res-budget');
    budgetRes.innerText = budgetOk ? "PASS" : "FAIL (Over Budget)";
    budgetRes.style.color = budgetOk ? "var(--primary)" : "var(--danger)";

    document.getElementById('res-items').innerText = `${itemsFound}/6`;
    const elapsed = startTime ? Date.now() - startTime : 0;
    document.getElementById('res-time').innerText = formatDuration(elapsed);

    const tbody = document.getElementById('res-body');
    tbody.innerHTML = '';

    // Helper to add row
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
    const expensiveMince = cart.some(i => i.type === 'mince_premium');
    addRow("Minced Meat", hasMince, hasMince ? (expensiveMince ? "Bought Premium (High Cost)" : "Bought Standard (Good Budgeting)") : "Forgot Item");

    // Sauce (Problem Solving)
    addRow("Sauce Substitution", hasSauceSub, hasSauceSub ? "Correctly substituted Tinned Tomatoes" : "Failed to find substitute for Out of Stock sauce");

    // Milk (Math)
    addRow("Milk Quantity (2L)", milkOk, milkOk ? "Bought 2 Liters" : `Bought ${milkVolume}L (Target: 2L)`);

    // Inhibition
    addRow("Impulse Control", distractorCount === 0, boughtCake ? "Bought the Chocolate Cake (Impulse)" : (distractorCount > 0 ? "Bought unnecessary items" : "Stuck to list"));

    // Budget
    addRow("Budget Management", budgetOk, `Spent £${totalSpent.toFixed(2)} (Limit: £25.00)`);

}
