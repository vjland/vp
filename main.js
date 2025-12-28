
import * as Game from './logic.js';

// --- State ---
let shoe = [];
let history = [];
let balance = 10000;
let currentBets = {}; // { target: amount }
let gameState = 'initializing'; // initializing, betting, dealing, result
let dealMode = 'manual'; // manual, auto
let selectedChip = 100;
let timer = 10;
let timerInterval = null;
let shoeStats = { total: 416, used: 0 };
let lastResult = null;

// --- DOM Elements ---
const elements = {
    balance: document.getElementById('balance-display'),
    shoeProgress: document.getElementById('shoe-progress'),
    shoeCount: document.getElementById('shoe-count'),
    playerCards: document.getElementById('player-cards'),
    bankerCards: document.getElementById('banker-cards'),
    playerScore: document.getElementById('player-score'),
    bankerScore: document.getElementById('banker-score'),
    initializingLabel: document.getElementById('initializing-label'),
    burnValue: document.getElementById('burn-value'),
    resultLabel: document.getElementById('result-label'),
    timerContainer: document.getElementById('timer-container'),
    timerDisplay: document.getElementById('timer-display'),
    modeToggle: document.getElementById('mode-toggle'),
    modeText: document.getElementById('mode-text'),
    modeIndicator: document.getElementById('mode-indicator'),
    bettingAreas: document.getElementById('betting-areas'),
    chipSelection: document.getElementById('chip-selection'),
    dealBtn: document.getElementById('deal-btn'),
    dealBtnContainer: document.getElementById('deal-button-container'),
    newShoeBtn: document.getElementById('new-shoe-btn'),
    modalContainer: document.getElementById('modal-container'),
    modalConfirm: document.getElementById('modal-confirm'),
    modalCancel: document.getElementById('modal-cancel'),
    // Roadmaps
    beadPlate: document.getElementById('bead-plate'),
    bigRoad: document.getElementById('big-road'),
    bigEyeBoy: document.getElementById('big-eye-boy'),
    smallRoad: document.getElementById('small-road'),
    cockroachRoad: document.getElementById('cockroach-road'),
};

const CHIP_VALUES = [10, 50, 100, 500, 1000];

// --- Initialization ---
function init() {
    setupBettingAreas();
    setupChips();
    attachEventListeners();
    startNewShoe();
}

function attachEventListeners() {
    elements.modeToggle.addEventListener('click', toggleMode);
    elements.dealBtn.addEventListener('click', () => handleDeal(true));
    elements.newShoeBtn.addEventListener('click', () => elements.modalContainer.classList.remove('hidden'));
    elements.modalCancel.addEventListener('click', () => elements.modalContainer.classList.add('hidden'));
    elements.modalConfirm.addEventListener('click', () => {
        elements.modalContainer.classList.add('hidden');
        startNewShoe();
    });
}

function startNewShoe() {
    history = [];
    lastResult = null;
    currentBets = {};
    gameState = 'initializing';
    
    shoe = Game.createShoe(8);
    const burn = shoe[0].value === 0 ? 10 : shoe[0].value;
    
    elements.initializingLabel.classList.remove('hidden');
    elements.resultLabel.classList.add('hidden');
    elements.burnValue.textContent = burn;
    
    render();

    setTimeout(() => {
        shoe = shoe.slice(burn + 1);
        shoeStats.used = burn + 1;
        gameState = 'betting';
        elements.initializingLabel.classList.add('hidden');
        elements.resultLabel.classList.remove('hidden');
        if (dealMode === 'auto') startTimer();
        render();
    }, 1500);
}

function toggleMode() {
    dealMode = dealMode === 'manual' ? 'auto' : 'manual';
    elements.modeText.textContent = dealMode.toUpperCase();
    
    if (dealMode === 'auto') {
        elements.modeToggle.classList.replace('bg-orange-600/20', 'bg-blue-600/20');
        elements.modeToggle.classList.replace('border-orange-500/50', 'border-blue-500/50');
        elements.modeIndicator.classList.replace('bg-orange-400', 'bg-blue-400');
        elements.timerContainer.classList.remove('hidden');
        if (gameState === 'betting') startTimer();
    } else {
        elements.modeToggle.classList.replace('bg-blue-600/20', 'bg-orange-600/20');
        elements.modeToggle.classList.replace('border-blue-500/50', 'border-orange-500/50');
        elements.modeIndicator.classList.replace('bg-blue-400', 'bg-orange-400');
        elements.timerContainer.classList.add('hidden');
        stopTimer();
    }
    render();
}

function startTimer() {
    stopTimer();
    timer = 10;
    elements.timerDisplay.textContent = timer;
    timerInterval = setInterval(() => {
        timer--;
        elements.timerDisplay.textContent = timer;
        if (timer <= 0) {
            stopTimer();
            handleDeal(false);
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

function handleDeal(instant = false) {
    if (gameState !== 'betting') return;
    if (shoe.length < 10) {
        startNewShoe();
        return;
    }

    gameState = 'dealing';
    stopTimer();
    render();

    const { result, usedCards } = Game.playHand(shoe);
    
    const finalize = () => {
        lastResult = result;
        history.push(result);
        shoe = shoe.slice(usedCards);
        shoeStats.used += usedCards;
        
        // Payout logic
        let payout = 0;
        for (const [target, amt] of Object.entries(currentBets)) {
            if (target === Game.BetTarget.Player && result.winner === Game.Winner.Player) payout += amt * 2;
            if (target === Game.BetTarget.Banker && result.winner === Game.Winner.Banker) payout += amt * 1.95;
            if (target === Game.BetTarget.Tie && result.winner === Game.Winner.Tie) payout += amt * 9;
            if (result.winner === Game.Winner.Tie && (target === Game.BetTarget.Player || target === Game.BetTarget.Banker)) payout += amt;
            if (target === Game.BetTarget.PlayerPair && result.isPairPlayer) payout += amt * 12;
            if (target === Game.BetTarget.BankerPair && result.isPairBanker) payout += amt * 12;
        }
        balance += payout;
        gameState = 'result';
        render();

        setTimeout(() => {
            currentBets = {};
            gameState = 'betting';
            if (dealMode === 'auto') startTimer();
            render();
        }, dealMode === 'manual' ? 1000 : 4000);
    };

    if (instant) finalize();
    else setTimeout(finalize, 1000);
}

// --- Rendering Logic ---
function render() {
    // Header & Balance
    elements.balance.textContent = `$${balance.toLocaleString()}`;
    elements.shoeCount.textContent = `${shoeStats.used}/${shoeStats.total}`;
    elements.shoeProgress.style.width = `${(shoeStats.used / shoeStats.total) * 100}%`;

    // Cards
    renderCards(elements.playerCards, lastResult?.playerCards || []);
    renderCards(elements.bankerCards, lastResult?.bankerCards || []);
    elements.playerScore.textContent = lastResult?.playerScore ?? '0';
    elements.bankerScore.textContent = lastResult?.bankerScore ?? '0';

    // Result Label
    if (lastResult) {
        elements.resultLabel.textContent = lastResult.winner === Game.Winner.Tie ? 'TIE' : lastResult.winner === Game.Winner.Player ? 'PLAYER' : 'BANKER';
        elements.resultLabel.className = `text-center px-4 py-2 rounded-lg font-black text-xs md:text-lg transition-all shadow-xl ring-1 ring-white/10 ${
            lastResult.winner === Game.Winner.Player ? 'bg-blue-600/80 shadow-blue-600/20' : 
            lastResult.winner === Game.Winner.Banker ? 'bg-red-600/80 shadow-red-600/20' : 'bg-green-600/80 shadow-green-600/20'
        }`;
    } else {
        elements.resultLabel.textContent = '...';
        elements.resultLabel.className = 'text-center px-4 py-2 rounded-lg font-black text-xs md:text-lg transition-all shadow-xl ring-1 ring-white/10 bg-white/5 text-white/20';
    }

    // Buttons
    elements.dealBtnContainer.style.display = (dealMode === 'manual' && gameState === 'betting') ? 'block' : 'none';
    
    // Betting & Chips
    updateBettingAreas();
    updateChips();
    
    // Roadmaps
    renderRoadmaps();
}

function renderCards(container, cards) {
    container.innerHTML = '';
    if (cards.length === 0) {
        container.innerHTML = '<div class="w-12 h-16 md:w-16 md:h-24 bg-white/5 border border-white/10 rounded-md flex items-center justify-center text-white/20">?</div>';
        return;
    }
    cards.forEach(card => {
        const isRed = card.suit === Game.Suit.Hearts || card.suit === Game.Suit.Diamonds;
        const cardEl = document.createElement('div');
        cardEl.className = 'w-12 h-16 md:w-16 md:h-24 bg-white rounded-md shadow-xl flex flex-col p-1 transition-all transform';
        cardEl.innerHTML = `
            <div class="text-[10px] md:text-sm font-bold leading-none ${isRed ? 'text-red-600' : 'text-black'}">${card.rank}</div>
            <div class="flex-grow flex items-center justify-center text-lg md:text-2xl ${isRed ? 'text-red-600' : 'text-black'}">${card.suit}</div>
            <div class="text-[10px] md:text-sm font-bold leading-none self-end rotate-180 ${isRed ? 'text-red-600' : 'text-black'}">${card.rank}</div>
        `;
        container.appendChild(cardEl);
    });
}

function setupBettingAreas() {
    const areas = [
        { id: Game.BetTarget.PlayerPair, label: 'PLAYER PAIR', odds: '11:1', color: 'blue-900/40', text: 'blue-300' },
        { id: Game.BetTarget.Player, label: 'PLAYER', odds: '1:1', color: 'blue-600/80', text: 'white', large: true },
        { id: Game.BetTarget.Tie, label: 'TIE', odds: '8:1', color: 'green-700/80', text: 'white', large: true },
        { id: Game.BetTarget.Banker, label: 'BANKER', odds: '0.95:1', color: 'red-600/80', text: 'white', large: true },
        { id: Game.BetTarget.BankerPair, label: 'BANKER PAIR', odds: '11:1', color: 'red-900/40', text: 'red-300' },
    ];

    elements.bettingAreas.innerHTML = '';
    areas.forEach(area => {
        const btn = document.createElement('button');
        btn.id = `bet-${area.id.replace(' ', '-')}`;
        btn.className = `relative rounded-lg border-2 border-white/10 flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg bg-${area.color}`;
        btn.innerHTML = `
            <span class="${area.large ? 'text-sm font-black' : 'text-[10px] font-bold'} text-${area.text} tracking-widest">${area.label}</span>
            <span class="${area.large ? 'text-xl font-black' : 'text-sm font-bold'} text-white">${area.odds}</span>
            <div id="chip-on-${area.id.replace(' ', '-')}" class="hidden absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-2 py-0.5 rounded-full text-xs font-bold border-2 border-white shadow-md">$0</div>
        `;
        btn.addEventListener('click', () => placeBet(area.id));
        elements.bettingAreas.appendChild(btn);
    });
}

function placeBet(target) {
    if (gameState !== 'betting') return;
    if (balance < selectedChip) return;
    
    balance -= selectedChip;
    currentBets[target] = (currentBets[target] || 0) + selectedChip;
    render();
}

function updateBettingAreas() {
    Object.values(Game.BetTarget).forEach(target => {
        const chipEl = document.getElementById(`chip-on-${target.replace(' ', '-')}`);
        if (currentBets[target]) {
            chipEl.textContent = `$${currentBets[target]}`;
            chipEl.classList.remove('hidden');
        } else {
            chipEl.classList.add('hidden');
        }
    });
}

function setupChips() {
    elements.chipSelection.innerHTML = '';
    CHIP_VALUES.forEach(val => {
        const chip = document.createElement('button');
        chip.id = `chip-${val}`;
        chip.className = `w-12 h-12 md:w-14 md:h-14 rounded-full border-4 flex items-center justify-center font-bold text-sm transition-transform hover:scale-110 shadow-xl border-white/20`;
        
        let colorClass = '';
        if (val === 10) colorClass = 'bg-white text-black';
        else if (val === 50) colorClass = 'bg-red-600';
        else if (val === 100) colorClass = 'bg-black text-white';
        else if (val === 500) colorClass = 'bg-purple-600';
        else if (val === 1000) colorClass = 'bg-orange-600';
        
        chip.className += ` ${colorClass}`;
        chip.textContent = val;
        chip.addEventListener('click', () => {
            selectedChip = val;
            updateChips();
        });
        elements.chipSelection.appendChild(chip);
    });
    updateChips();
}

function updateChips() {
    CHIP_VALUES.forEach(val => {
        const chip = document.getElementById(`chip-${val}`);
        if (selectedChip === val) {
            chip.classList.add('scale-110', 'border-yellow-400', 'ring-4', 'ring-yellow-400/20');
        } else {
            chip.classList.remove('scale-110', 'border-yellow-400', 'ring-4', 'ring-yellow-400/20');
        }
    });
}

// --- Roadmap Rendering ---
function renderRoadmaps() {
    const { matrix: bigMatrix, path } = Game.generateBigRoad(history);
    
    // Bead Plate
    renderGrid(elements.beadPlate, 12, 'w-5 h-5 md:w-6 md:h-6', (r, c) => {
        const index = c * 6 + r;
        const res = history[index];
        if (!res) return '';
        const color = res.winner === Game.Winner.Banker ? 'bg-red-600' : res.winner === Game.Winner.Player ? 'bg-blue-600' : 'bg-green-600';
        const label = res.winner === Game.Winner.Banker ? '庄' : res.winner === Game.Winner.Player ? '闲' : '和';
        return `
            <div class="w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-bold text-white shadow-sm ${color}">
                ${label}
                ${res.isPairBanker ? '<div class="absolute top-0 right-0 w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-red-400 border border-white"></div>' : ''}
                ${res.isPairPlayer ? '<div class="absolute bottom-0 left-0 w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-blue-400 border border-white"></div>' : ''}
            </div>
        `;
    });

    // Big Road
    renderGrid(elements.bigRoad, 100, 'w-4 h-4 md:w-5 md:h-5', (r, c) => {
        const cell = bigMatrix[r][c];
        if (!cell) return '';
        const border = cell.winner === Game.Winner.Banker ? 'border-red-500' : cell.winner === Game.Winner.Player ? 'border-blue-500' : 'border-green-500';
        return `
            <div class="w-3 h-3 md:w-4 md:h-4 rounded-full border-[1.5px] flex items-center justify-center relative ${border}">
                ${cell.ties > 0 ? '<div class="absolute w-full h-[1.5px] bg-green-500 rotate-45 pointer-events-none opacity-80"></div>' : ''}
                ${cell.ties > 1 ? `<span class="text-[7px] font-bold text-green-500 z-10 leading-none">${cell.ties}</span>` : ''}
            </div>
        `;
    });

    // Big Eye Boy
    const bebMatrix = Game.generateDerivedRoad(bigMatrix, path, 1);
    renderGrid(elements.bigEyeBoy, 60, 'w-3 h-3 md:w-3.5 md:h-3.5', (r, c) => {
        const color = bebMatrix[r][c];
        if (!color) return '';
        return `<div class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full border-[1.5px] ${color === 'red' ? 'border-red-500' : 'border-blue-500'}"></div>`;
    });

    // Small Road
    const smMatrix = Game.generateDerivedRoad(bigMatrix, path, 2);
    renderGrid(elements.smallRoad, 60, 'w-3 h-3 md:w-3.5 md:h-3.5', (r, c) => {
        const color = smMatrix[r][c];
        if (!color) return '';
        return `<div class="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${color === 'red' ? 'bg-red-500' : 'bg-blue-500'}"></div>`;
    });

    // Cockroach Road
    const crMatrix = Game.generateDerivedRoad(bigMatrix, path, 3);
    renderGrid(elements.cockroachRoad, 60, 'w-3 h-3 md:w-3.5 md:h-3.5', (r, c) => {
        const color = crMatrix[r][c];
        if (!color) return '';
        return `<div class="w-[1.5px] h-[70%] rotate-45 ${color === 'red' ? 'bg-red-500' : 'bg-blue-500'}"></div>`;
    });
}

function renderGrid(container, cols, cellSize, cellRenderer) {
    container.innerHTML = '';
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < 6; r++) {
            const cell = document.createElement('div');
            cell.className = `${cellSize} roadmap-cell`;
            cell.innerHTML = cellRenderer(r, c);
            container.appendChild(cell);
        }
    }
}

// --- Start ---
init();
