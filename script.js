// State
let water = 100;
let maxWater = 100;
let food = 100;
let maxFood = 100;
let pop = 10;
let days = 1;

// Metrics
let baseWaterConsumption = 2; // per person
let baseFoodConsumption = 1;  // per person
let techLevel = 0;
let isRationing = false;

// DOM
const waterBar = document.getElementById('water-bar');
const waterText = document.getElementById('water-text');
const foodBar = document.getElementById('food-bar');
const foodText = document.getElementById('food-text');
const popText = document.getElementById('pop-text');
const daysText = document.getElementById('days-text');
const eventLog = document.getElementById('event-log');

const btnNextDay = document.getElementById('btn-next-day');
const btnRation = document.getElementById('btn-ration');
const btnDig = document.getElementById('btn-dig');
const btnResearch = document.getElementById('btn-research');

const gameOverModal = document.getElementById('game-over-modal');
const gameTitle = document.getElementById('game-over-title');
const gameDesc = document.getElementById('game-over-desc');
const finalDays = document.getElementById('final-days');
const btnRestart = document.getElementById('btn-restart');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('weather-overlay');

// Simulation graphics objects
const peopleDots = [];
const villageRect = { x: 200, y: 200, w: 200, h: 140 };
let weatherState = 'normal'; // normal, heat, rain

// Init
function init() {
    water = 100; food = 100; pop = 10; days = 1; techLevel = 0; isRationing = false;
    peopleDots.length = 0;
    
    for (let i = 0; i < pop; i++) spawnPerson();
    
    eventLog.innerHTML = `<li class="neutral-event">Dia 1: A seca castiga nosso lar. Temos reservas limitadas de água.</li>`;
    gameOverModal.classList.add('hidden');
    weatherState = 'normal';
    overlay.style.backgroundColor = 'transparent';
    
    updateHUD();
    requestAnimationFrame(gameLoop);
}

function spawnPerson() {
    peopleDots.push({
        x: villageRect.x + Math.random() * villageRect.w,
        y: villageRect.y + Math.random() * villageRect.h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
    });
}

function log(msg, type = "neutral-event") {
    const li = document.createElement('li');
    li.className = type;
    li.innerText = `Dia ${days}: ${msg}`;
    eventLog.prepend(li);
}

function updateHUD() {
    // Water
    water = Math.max(0, Math.min(water, maxWater));
    const wPct = (water / maxWater) * 100;
    waterBar.style.width = `${wPct}%`;
    waterText.innerText = `${Math.floor(water)}/${maxWater}`;
    if (wPct < 25) waterBar.style.backgroundColor = '#e74c3c';
    else waterBar.style.backgroundColor = 'var(--water-color)';

    // Food
    food = Math.max(0, Math.min(food, maxFood));
    const fPct = (food / maxFood) * 100;
    foodBar.style.width = `${fPct}%`;
    foodText.innerText = `${Math.floor(food)}/${maxFood}`;
    if (fPct < 25) foodBar.style.backgroundColor = '#e74c3c';
    else foodBar.style.backgroundColor = 'var(--food-color)';

    // Pop & Days
    popText.innerText = pop;
    daysText.innerText = days;

    // Check game over
    if (water <= 0) {
        updateCanvasDots();
        endGame("As reservas de água secaram. A vila teve que ser abandonada.");
        return;
    } else if (pop <= 0) {
        updateCanvasDots();
        endGame("Toda a população pereceu. A vila agora é apenas areia e silêncio.");
        return;
    }

    updateCanvasDots();
    updateButtons();
}

function updateCanvasDots() {
    while (peopleDots.length > pop) peopleDots.pop();
    while (peopleDots.length < pop) spawnPerson();
}

function updateButtons() {
    btnDig.disabled = (food < 15);
    btnResearch.disabled = (water < 20);
    if(isRationing) {
        btnRation.innerText = "Racionamento Ativo";
        btnRation.disabled = true;
    } else {
        btnRation.innerText = "Racionar Água";
        btnRation.disabled = false;
    }
}

function endGame(reason) {
    gameOverModal.classList.remove('hidden');
    gameDesc.innerText = reason;
    finalDays.innerText = days;
}

// Logic / Actions
btnNextDay.addEventListener('click', () => {
    days++;
    let dailyWater = baseWaterConsumption * pop * Math.pow(0.9, techLevel);
    let dailyFood = baseFoodConsumption * pop;

    let waterStr = "-"+Math.floor(dailyWater)+" 💧";
    let foodStr = "-"+Math.floor(dailyFood)+" 🍎";

    if (isRationing) {
        dailyWater *= 0.5;
        waterStr = "-"+Math.floor(dailyWater)+" 💧";
        if (Math.random() < 0.20 && pop > 1) {
            let lost = Math.floor(Math.random() * 2) + 1;
            pop -= lost;
            log(`Devido ao racionamento brutal, ${lost} pessoa(s) não aguentaram ou fugiram.`, 'bad-event');
        } else {
            log(`O racionamento gerou grande tensão, mas hoje todos sobreviveram.`, 'warn-event');
        }
        isRationing = false;
    }

    // Weather events!
    weatherState = 'normal';
    overlay.style.backgroundColor = 'transparent';
    let weatherRoll = Math.random();
    
    if (weatherRoll < 0.15) {
        weatherState = 'heat';
        dailyWater *= 1.5;
        waterStr = "-"+Math.floor(dailyWater)+" 💧";
        log(`Onda de calor extremo! O consumo de água foi violentamente alto (${waterStr}, ${foodStr}).`, 'bad-event');
        overlay.style.backgroundColor = 'rgba(255, 69, 0, 0.15)'; // Reddish orange
    } else if (weatherRoll > 0.90) {
        weatherState = 'rain';
        let gained = Math.floor(Math.random() * 20) + 10;
        water += gained;
        log(`Milagre! Uma chuva rápida encheu os reservatórios (+${gained} 💧, consumiu ${foodStr}).`, 'good-event');
        overlay.style.backgroundColor = 'rgba(0, 150, 255, 0.15)'; // Blueish
    } else {
        log(`Mais um dia árduo avança. (${waterStr}, ${foodStr})`);
    }

    // Work / Base Food Generation (some subsistence farming, roughly enough to replace 50% max)
    let foodGain = pop * 0.4;
    food += foodGain;

    // Apply consumption
    water -= dailyWater;
    food -= dailyFood;

    // Food starvation Check
    if (food <= 0) {
        let starveDeath = Math.floor(Math.random() * 2) + 1;
        pop = Math.max(0, pop - starveDeath);
        log(`A comida acabou! A fome levou ${starveDeath} habitante(s).`, 'bad-event');
        food = 0;
    }

    updateHUD();
});

btnRation.addEventListener('click', () => {
    isRationing = true;
    log(`Decreto ativado: Racionamento de água. O povo sofrerá mais amanhã.`, 'warn-event');
    updateButtons();
});

btnDig.addEventListener('click', () => {
    if (food < 15) return;
    food -= 15;
    
    let success = Math.random() < 0.45;
    if (success) {
        let gained = 20 + Math.floor(Math.random()*20);
        water += gained;
        log(`Sucesso escavando a terra! Lençol de água encontrado: +${gained} 💧 (-15 🍎).`, 'good-event');
    } else {
        log(`Tempo e energia gastos cavando poeira seca. Nada foi encontrado (-15 🍎).`, 'bad-event');
    }
    updateHUD();
});

btnResearch.addEventListener('click', () => {
    if (water < 20) return;
    water -= 20;
    techLevel++;
    log(`Avanço: Novo sistema de filtração de umidade! O consumo futuro abaixou em 10% (-20 💧).`, 'good-event');
    updateHUD();
});

btnRestart.addEventListener('click', init);

// Graphics Loop
function gameLoop() {
    if(!gameOverModal.classList.contains('hidden')) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Clear background
    ctx.fillStyle = '#1a1a1a'; // deep dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw plantations
    let moisture = water / maxWater;
    // When moisture is high, it's green. When low, brown.
    // Green max: R:46, G:204, B:113 (Emerald)
    // Brown dry: R:192, G:152, B:83 
    
    let r = Math.floor(192 - (192-46)*moisture);
    let g = Math.floor(152 + (204-152)*moisture);
    let b = Math.floor(83 + (113-83)*moisture);

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    
    // Grid of plantations around village
    let pSize = 40;
    for(let i = 0; i < canvas.width; i += pSize) {
        for(let j = 0; j < canvas.height; j += pSize) {
            // Outline village safely
            let padding = 10;
            if (i + pSize > villageRect.x - padding && i < villageRect.x + villageRect.w + padding &&
                j + pSize > villageRect.y - padding && j < villageRect.y + villageRect.h + padding) {
                continue;
            }
            
            // Draw fields
            ctx.fillRect(i+4, j+4, pSize-8, pSize-8);
        }
    }

    // Draw Village Soil
    ctx.fillStyle = '#6a4a2b'; 
    ctx.fillRect(villageRect.x, villageRect.y, villageRect.w, villageRect.h);

    // Draw the "Well" / Center piece
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(villageRect.x + villageRect.w/2, villageRect.y + villageRect.h/2, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'var(--water-color)';
    ctx.beginPath();
    ctx.arc(villageRect.x + villageRect.w/2, villageRect.y + villageRect.h/2, 8 * (water/maxWater), 0, Math.PI * 2);
    ctx.fill();


    // Draw People
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    peopleDots.forEach(p => {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce inside village
        if (p.x <= villageRect.x + 5 || p.x >= villageRect.x + villageRect.w - 5) {
            p.vx *= -1;
            p.x = Math.max(villageRect.x+6, Math.min(p.x, villageRect.x + villageRect.w - 6));
        }
        if (p.y <= villageRect.y + 5 || p.y >= villageRect.y + villageRect.h - 5) {
            p.vy *= -1;
            p.y = Math.max(villageRect.y+6, Math.min(p.y, villageRect.y + villageRect.h - 6));
        }

        // Random jitter
        if(Math.random() < 0.05) {
            p.vx += (Math.random() - 0.5) * 0.4;
            p.vy += (Math.random() - 0.5) * 0.4;
            
            // Limit speed
            let speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
            if(speed > 0.8) {
                p.vx = (p.vx/speed) * 0.8;
                p.vy = (p.vy/speed) * 0.8;
            }
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Add tiny shadow/border to people dots
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    requestAnimationFrame(gameLoop);
}

// Start
init();
