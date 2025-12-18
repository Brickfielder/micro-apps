const START_TIME = 9 * 60;
const DEADLINE = 11 * 60; // 11:00
const START_BUDGET = 15.0;

const COORDS = {
    HOME: [300, 250],
    ZOO: [300, 100],
    WEST: [150, 250],
    PO: [450, 250],
    CENTRAL: [450, 100],
    OLDTOWN: [550, 250],
    HOSP: [450, 400],
    AIRPORT: [450, 550],
};

let time = START_TIME;
let budget = START_BUDGET;
let leg = 1;

const uiTime = document.getElementById('ui-time');
const uiCash = document.getElementById('ui-cash');
const uiList = document.getElementById('options-list');
const userPin = document.getElementById('user-pin');

function startGame() {
    document.getElementById('modal-start').classList.add('hidden');
    setupLeg(1);
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function updateHUD() {
    uiTime.innerText = formatTime(time);
    uiCash.innerText = `£${budget.toFixed(2)}`;
    if (budget < 4) uiCash.classList.add('low');
}

function movePin(locName) {
    const [x, y] = COORDS[locName];
    userPin.setAttribute('transform', `translate(${x}, ${y})`);
}

function setupLeg(num) {
    leg = num;
    updateHUD();
    uiList.innerHTML = '';

    if (leg === 1) {
        movePin('HOME');
        const opts = [
            { name: 'Bus 99', dest: 'West End', cost: 2.0, time: 20, wait: 5, loc: 'WEST', type: 'bus' },
            { name: 'Bus 55', dest: 'High St / PO', cost: 2.0, time: 35, wait: 8, loc: 'PO', type: 'bus' },
            { name: 'Metro Blue', dest: 'Old Town', cost: 3.5, time: 25, wait: 2, loc: 'OLDTOWN', type: 'tram' },
            { name: 'Taxi', dest: 'West End', cost: 14.0, time: 10, wait: 2, loc: 'WEST', type: 'taxi' },
            { name: 'Bus 10A', dest: 'City Zoo', cost: 2.0, time: 20, wait: 6, loc: 'ZOO', type: 'bus' },
            { name: 'Walk', dest: 'via Footpath', cost: 0.0, time: 30, wait: 0, loc: 'WEST', type: 'walk' },
        ];
        renderOpts(opts);
    } else if (leg === 2) {
        movePin('WEST');
        const opts = [
            { name: 'Bus 99 (Return)', dest: 'Home / Zoo', cost: 2.0, time: 20, wait: 5, loc: 'HOME', type: 'bus' },
            { name: 'Bus 55', dest: 'High St / PO', cost: 2.0, time: 25, wait: 10, loc: 'PO', type: 'bus' },
            { name: 'Bus 202', dest: 'City Airport', cost: 3.5, time: 40, wait: 5, loc: 'AIRPORT', type: 'bus' },
            { name: 'Tram Link', dest: 'Central Stn', cost: 3.0, time: 40, wait: 5, loc: 'CENTRAL', type: 'tram' },
            { name: 'Taxi', dest: 'High St Direct', cost: 8.0, time: 15, wait: 2, loc: 'PO', type: 'taxi' },
            { name: 'Walk', dest: 'via Footpath', cost: 0.0, time: 60, wait: 0, loc: 'PO', type: 'walk' },
        ];
        renderOpts(opts);
    } else if (leg === 3) {
        movePin('PO');
        const opts = [
            { name: 'Bus 101', dest: 'Central Stn', cost: 2.5, time: 20, wait: 5, loc: 'CENTRAL', type: 'bus' },
            { name: 'Bus 88', dest: 'Medical Park', cost: 2.5, time: 15, wait: 35, loc: 'HOSP', type: 'bus' },
            { name: 'Tram Line', dest: 'Old Town', cost: 3.0, time: 15, wait: 4, loc: 'OLDTOWN', type: 'tram' },
            { name: 'Bus 700', dest: 'City Airport', cost: 2.5, time: 30, wait: 12, loc: 'HOSP', type: 'bus' },
            { name: 'Walk', dest: 'via Footpath', cost: 0.0, time: 45, wait: 0, loc: 'HOSP', type: 'walk' },
            { name: 'Uber', dest: 'Medical Park', cost: 8.0, time: 15, wait: 3, loc: 'HOSP', type: 'taxi' },
        ];
        renderOpts(opts);
    }
}

function renderOpts(opts) {
    opts.forEach((option) => {
        const div = document.createElement('div');
        div.className = 'option-card';
        div.onclick = () => handleChoice(option);

        let icon = '🚌';
        if (option.type === 'walk') icon = '🚶';
        if (option.type === 'taxi') icon = '🚕';
        if (option.type === 'tram') icon = '🚋';

        div.innerHTML = `
            <div class="opt-top">
                <span class="opt-title">${icon} ${option.name}</span>
                <span class="opt-price">£${option.cost.toFixed(2)}</span>
            </div>
            <span class="opt-dest">to ${option.dest}</span>
            <div class="opt-meta">
                <span>⏳ ${option.time} min</span>
                <span>WAIT: ${option.wait} min</span>
            </div>
        `;
        uiList.appendChild(div);
    });
}

function handleChoice(opt) {
    if (opt.cost > budget) {
        time += 5;
        updateHUD();
        document.getElementById('modal-poor').classList.remove('hidden');
        return;
    }

    budget -= opt.cost;
    time += opt.time + opt.wait;
    movePin(opt.loc);
    updateHUD();

    if (leg === 1) {
        if (opt.loc === 'WEST') {
            time += 10;
            setupLeg(2);
        } else {
            endGame(false, `${opt.loc} (Wrong Stop)`);
        }
    } else if (leg === 2) {
        if (opt.loc === 'PO') {
            time += 10;
            setupLeg(3);
        } else {
            endGame(false, `${opt.loc} (Wrong Stop)`);
        }
    } else if (leg === 3) {
        if (opt.loc === 'HOSP') {
            endGame(true, 'Medical Park');
        } else if (opt.loc === 'AIRPORT') {
            endGame(false, 'City Airport (Missed Stop)');
        } else {
            endGame(false, opt.loc);
        }
    }
}

function closePoor() {
    document.getElementById('modal-poor').classList.add('hidden');
}

function endGame(success, loc) {
    document.getElementById('modal-end').classList.remove('hidden');
    const stat = document.getElementById('res-status');

    document.getElementById('res-loc').innerText = loc;
    document.getElementById('res-time').innerText = formatTime(time);
    document.getElementById('res-cash').innerText = `£${budget.toFixed(2)}`;

    if (success && time <= DEADLINE) {
        stat.innerText = 'SUCCESS';
        stat.style.color = 'green';
    } else if (success) {
        stat.innerText = 'LATE';
        stat.style.color = 'orange';
    } else {
        stat.innerText = 'FAILED';
        stat.style.color = 'red';
    }
}

function downloadReport() {
    const status = document.getElementById('res-status').innerText;
    const loc = document.getElementById('res-loc').innerText;
    const timeStr = document.getElementById('res-time').innerText;
    const cash = document.getElementById('res-cash').innerText;

    const fileContent = `METRO NAV MISSION REPORT\n-----------------------\nStatus: ${status}\nFinal Location: ${loc}\nArrival Time: ${timeStr}\nBudget Remaining: ${cash}\n\nGenerated by Metro Nav App`;

    const element = document.createElement('a');
    const file = new Blob([fileContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'mission_report.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

window.startGame = startGame;
window.closePoor = closePoor;
window.downloadReport = downloadReport;
