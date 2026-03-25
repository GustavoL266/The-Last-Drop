// State
let water = 100;
let maxWater = 100;
let food = 100;
let maxFood = 100;
let pop = 10;
let days = 1;
let energy = 0;
let maxEnergy = 100;
let solarPanels = 0;
let drills = 0;
let schoolsBuilt = 0;

// Metrics
let baseWaterConsumption = 2; // per person per day
let baseFoodConsumption = 1;  // per person per day
let huntDuration = 8;

// Time & Loop
let lastTime = 0;
const DAY_DURATION = 20; // seconds
let dayTimer = DAY_DURATION;
let isRationing = false;
let isPaused = false;

let cooldowns = {
    dig: 0,
    school: 0,
    hunt: 0
};

// DOM Elements
const waterBar = document.getElementById('water-bar');
const waterText = document.getElementById('water-text');
const foodBar = document.getElementById('food-bar');
const foodText = document.getElementById('food-text');
const popText = document.getElementById('pop-text');
const daysText = document.getElementById('days-text');
const dayBarFill = document.getElementById('day-bar-fill');
const eventLog = document.getElementById('event-log');
const energySection = document.getElementById('energy-section');
const energyBar = document.getElementById('energy-bar');
const energyText = document.getElementById('energy-text');

const btnPause = document.getElementById('btn-pause');
const btnRation = document.getElementById('btn-ration');
const btnDig = document.getElementById('btn-dig');
const btnHunt = document.getElementById('btn-hunt');
const btnSchool = document.getElementById('btn-school');
const btnSolar = document.getElementById('btn-solar');
const btnDrill = document.getElementById('btn-drill');
const advActionsCtr = document.getElementById('advanced-actions-container');
const unlockMsg = document.getElementById('unlock-msg');
const unlockDrillMsg = document.getElementById('unlock-drill-msg');

const gameOverModal = document.getElementById('game-over-modal');
const gameTitle = document.getElementById('game-over-title');
const gameDesc = document.getElementById('game-over-desc');
const finalDays = document.getElementById('final-days');
const btnRestart = document.getElementById('btn-restart');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('weather-overlay');
const pauseOverlay = document.getElementById('pause-overlay');

// Graphics Entities
const villageRect = { x: 200, y: 200, w: 200, h: 140 };
const peopleDots = [];
const buildings = [{ type: 'main-well', x: villageRect.x + villageRect.w/2, y: villageRect.y + villageRect.h/2 }];
const floatingTexts = [];
const particles = [];
let weatherState = 'normal';
let weatherTimer = 0;

// Init
function init() {
    water = 100; maxWater = 100; food = 100; maxFood = 100; pop = 10; days = 1; huntDuration = 8; 
    dayTimer = DAY_DURATION; isRationing = false; isPaused = false;
    energy = 0; maxEnergy = 100; solarPanels = 0; drills = 0; schoolsBuilt = 0;
    if (btnPause) btnPause.innerText = "Pausar Jogo (Esc) ⏸️";
    cooldowns = { dig: 0, school: 0, hunt: 0 };
    
    peopleDots.length = 0;
    for (let i = 0; i < pop; i++) spawnPerson();
    
    buildings.length = 1; // Keep only center main-well
    floatingTexts.length = 0;
    particles.length = 0;
    
    eventLog.innerHTML = `<li class="neutral-event">Dia 1: O tempo corre sem parar... Os recursos escorrem pelos dedos.</li>`;
    gameOverModal.classList.add('hidden');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    weatherState = 'normal';
    overlay.style.backgroundColor = 'transparent';
    
    lastTime = performance.now();
    updateHUD();
    requestAnimationFrame(gameLoop);
}

function spawnPerson() {
    peopleDots.push({
        x: villageRect.x + 10 + Math.random() * (villageRect.w - 20),
        y: villageRect.y + 10 + Math.random() * (villageRect.h - 20),
        vx: (Math.random() - 0.5) * 40, // pixels per sec
        vy: (Math.random() - 0.5) * 40,
        state: 'wandering', // or 'walking', 'digging', 'schooling'
        targetX: 0,
        targetY: 0,
        timer: 0
    });
}

function log(msg, type = "neutral-event") {
    const li = document.createElement('li');
    li.className = type;
    li.innerText = `Dia ${days}: ${msg}`;
    eventLog.prepend(li);
}

function spawnFloatingText(text, color, x, y) {
    floatingTexts.push({ text, color, x, y, age: 0, life: 1.5 });
}

function spawnWaterParticles(x, y, count) {
    for(let i=0; i<count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 60,
            vy: -Math.random() * 100 - 50,
            life: 1.0,
            age: 0,
            color: '#3498db',
            size: Math.random() * 3 + 2
        });
    }
}

function updateHUD() {
    water = Math.max(0, Math.min(water, maxWater));
    const wPct = (water / maxWater) * 100;
    waterBar.style.width = `${wPct}%`;
    waterText.innerText = `${Math.floor(water)}/${maxWater}`;
    if (wPct < 25) waterBar.style.backgroundColor = '#e74c3c';
    else waterBar.style.backgroundColor = 'var(--water-color)';

    food = Math.max(0, Math.min(food, maxFood));
    const fPct = (food / maxFood) * 100;
    foodBar.style.width = `${fPct}%`;
    foodText.innerText = `${Math.floor(food)}/${maxFood}`;
    if (fPct < 25) foodBar.style.backgroundColor = '#e74c3c';
    else foodBar.style.backgroundColor = 'var(--food-color)';

    popText.innerText = Math.floor(pop);
    daysText.innerText = days;
    dayBarFill.style.width = `${((DAY_DURATION - dayTimer) / DAY_DURATION) * 100}%`;

    energy = Math.max(0, Math.min(energy, maxEnergy));
    if (energyBar) energyBar.style.width = `${(energy / maxEnergy) * 100}%`;
    if (energyText) energyText.innerText = `${Math.floor(energy)}/${maxEnergy}`;

    if (schoolsBuilt >= 10) {
        if (advActionsCtr) advActionsCtr.classList.remove('hidden');
        if (unlockMsg) unlockMsg.classList.add('hidden');
    } else {
        if (advActionsCtr) advActionsCtr.classList.add('hidden');
        if (unlockMsg) unlockMsg.classList.remove('hidden');
    }

    if (solarPanels >= 1) {
        if (energySection) energySection.classList.remove('hidden');
        if (btnDrill) btnDrill.classList.remove('hidden');
        if (unlockDrillMsg) unlockDrillMsg.classList.add('hidden');
    } else {
        if (energySection) energySection.classList.add('hidden');
        if (btnDrill) btnDrill.classList.add('hidden');
        if (unlockDrillMsg) unlockDrillMsg.classList.remove('hidden');
    }

    updateButtons();

    if (water <= 0) endGame("As reservas secaram totalmente. Fim da linha.");
    if (pop <= 0) endGame("Toda a população pereceu de fome ou fugiu.");
}

function updateButtons() {
    // Dig
    if (cooldowns.dig > 0) {
        btnDig.disabled = true;
        btnDig.innerText = `Cavando... (${Math.ceil(cooldowns.dig)}s)`;
    } else {
        btnDig.disabled = (food < 15);
        btnDig.innerText = `Cavar Poço (15 🍎)`;
    }

    // School
    if (cooldowns.school > 0) {
        btnSchool.disabled = true;
        btnSchool.innerText = `Construindo... (${Math.ceil(cooldowns.school)}s)`;
    } else {
        btnSchool.disabled = (water < 20);
        btnSchool.innerText = `Construir Escola (${schoolsBuilt}) 🏫`;
    }

    if (btnSolar) {
        btnSolar.disabled = (food < 50 || water < 200);
        btnSolar.innerText = `Painel Solar (${solarPanels}) ☀️`;
    }
    if (btnDrill) {
        btnDrill.disabled = (food < 50 || water < 50);
        btnDrill.innerText = `Broca D'Água (${drills}) 🪛`;
    }

    // Hunt
    if (cooldowns.hunt > 0) {
        btnHunt.disabled = true;
        btnHunt.innerText = `Caçando... (${Math.ceil(cooldowns.hunt)}s)`;
    } else {
        btnHunt.disabled = (food < 3 || water < 5);
        btnHunt.innerText = `Caçar Expedição 🎯`;
    }

    // Ration
    if (isRationing) {
        btnRation.disabled = true;
        btnRation.innerText = `Racionando... (${Math.ceil(dayTimer)}s)`;
    } else {
        btnRation.disabled = false;
        btnRation.innerText = `Racionar Água`;
    }
}

function endGame(reason) {
    gameOverModal.classList.remove('hidden');
    gameDesc.innerText = reason;
    finalDays.innerText = days;
}

// User Actions
if (btnPause) {
    btnPause.addEventListener('click', () => {
        isPaused = !isPaused;
        if (isPaused) {
            btnPause.innerText = "Retomar Jogo (Esc) ▶️";
            log("Jogo pausado.", "neutral-event");
            if (pauseOverlay) pauseOverlay.classList.remove('hidden');
        } else {
            btnPause.innerText = "Pausar Jogo (Esc) ⏸️";
            log("Jogo retomado.", "neutral-event");
            if (pauseOverlay) pauseOverlay.classList.add('hidden');
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (btnPause && !gameOverModal.classList.contains('hidden')) return; // ignore if game over
        if (btnPause) btnPause.click();
    }
});

btnRation.addEventListener('click', () => {
    isRationing = true;
    log(`Decreto ativado pro resto do dia! O estresse aumentou.`, 'warn-event');
    
    // Immediate chance of losing someone
    if (Math.random() < 0.20 && pop > 1) {
        let lost = Math.floor(Math.random() * 2) + 1;
        pop -= lost;
        log(`${lost} pessoa(s) se revoltaram com o racionamento e fugiram!`, 'bad-event');
        spawnFloatingText(`-${lost} 👥`, '#e74c3c', villageRect.x + villageRect.w/2, villageRect.y + 20);
        while(peopleDots.length > pop) peopleDots.pop();
    }
    updateHUD();
});

function getWorker() {
    let available = peopleDots.filter(p => p.state === 'wandering');
    return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : peopleDots[0];
}

btnDig.addEventListener('click', () => {
    if (food < 15 || cooldowns.dig > 0) return;
    food -= 15;
    cooldowns.dig = 5;
    
    let worker = getWorker();
    if (worker) {
        worker.state = 'walking_to_dig';
        worker.targetX = villageRect.x + 20 + Math.random() * (villageRect.w - 40);
        worker.targetY = villageRect.y + 20 + Math.random() * (villageRect.h - 40);
        spawnFloatingText("-15 🍎", '#e67e22', worker.x, worker.y);
    }
    updateHUD();
});

btnHunt.addEventListener('click', () => {
    if (food < 3 || water < 5 || cooldowns.hunt > 0) return;
    food -= 3;
    water -= 5;
    cooldowns.hunt = huntDuration;
    
    let worker = getWorker();
    if (worker) {
        worker.state = 'walking_to_hunt';
        // Go outside the village
        worker.targetX = Math.random() < 0.5 ? Math.random() * (villageRect.x - 20) : villageRect.x + villageRect.w + 20 + Math.random() * (canvas.width - villageRect.x - villageRect.w - 40);
        worker.targetY = Math.random() < 0.5 ? Math.random() * (villageRect.y - 20) : villageRect.y + villageRect.h + 20 + Math.random() * (canvas.height - villageRect.y - villageRect.h - 40);
        
        spawnFloatingText("-3 🍎 -5 💧", '#e74c3c', worker.x, worker.y);
    }
    updateHUD();
});

btnSchool.addEventListener('click', () => {
    if (water < 20 || cooldowns.school > 0) return;
    water -= 20;
    cooldowns.school = 10;

    let worker = getWorker();
    if (worker) {
        worker.state = 'walking_to_school';
        worker.targetX = villageRect.x + 20 + Math.random() * (villageRect.w - 40);
        worker.targetY = villageRect.y + 20 + Math.random() * (villageRect.h - 40);
        spawnFloatingText("-20 💧", '#3498db', worker.x, worker.y);
    }
    updateHUD();
});

if (btnSolar) {
    btnSolar.addEventListener('click', () => {
        if (food < 50 || water < 200) return;
        food -= 50; water -= 200;
        solarPanels++;
        maxEnergy += 50;
        buildings.push({ type: 'solar', x: villageRect.x + 10 + Math.random()*180, y: villageRect.y + 10 + Math.random()*120 });
        spawnFloatingText("-50 🍎 -200 💧", '#f1c40f', villageRect.x + villageRect.w/2, villageRect.y + villageRect.h/2);
        log("Um Painel Solar foi instalado. Limite de Energia +50 e geração local ativa.", "good-event");
        updateHUD();
    });
}

if (btnDrill) {
    btnDrill.addEventListener('click', () => {
        if (food < 50 || water < 50) return;
        food -= 50; water -= 50;
        drills++;
        buildings.push({ type: 'drill', x: villageRect.x + 10 + Math.random()*180, y: villageRect.y + 10 + Math.random()*120 });
        spawnFloatingText("-50 🍎 -50 💧", '#7f8c8d', villageRect.x + villageRect.w/2, villageRect.y + villageRect.h/2);
        log("Uma Broca D'Água foi ativada. Consome Energia continuamente para gerar Água.", "good-event");
        updateHUD();
    });
}

btnRestart.addEventListener('click', init);

// Realtime Loop Update
function gameLoop(timestamp) {
    if(!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000; // in seconds
    lastTime = timestamp;
    
    // hard cap dt to prevent huge jumps if tab was inactive
    if (dt > 0.1) dt = 0.1;

    if(!gameOverModal.classList.contains('hidden')) {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    updateSim(dt);
    drawCanvas(dt);
    requestAnimationFrame(gameLoop);
}

function updateSim(dt) {
    // 1. Day Timer
    dayTimer -= dt;
    if (dayTimer <= 0) {
        dayTimer = DAY_DURATION;
        days++;
        
        // Growth logic
        if (water >= (pop * 2) + 10 && food >= (pop * 2) + 10 && !isRationing) {
            let growth = Math.floor(Math.random() * 2) + 1;
            pop += growth;
            log(`Prosperidade na vila! Atraímos ${growth} novo(s) morador(es).`, 'good-event');
            spawnFloatingText(`+${growth} 👥`, '#ecf0f1', villageRect.x + villageRect.w/2, villageRect.y + 20);
            while(peopleDots.length < pop) spawnPerson();
        }

        isRationing = false; // Reset rationing at the end of the day

        // Weather Roll every day start
        weatherState = 'normal';
        overlay.style.backgroundColor = 'transparent';
        let roll = Math.random();
        if (roll < 0.15) {
            weatherState = 'heat';
            weatherTimer = DAY_DURATION;
            log(`Onda de calor extremo! O sol drena nossa água rapidamente.`, 'bad-event');
            overlay.style.backgroundColor = 'rgba(255, 69, 0, 0.15)';
        } else if (roll > 0.90) {
            weatherState = 'rain';
            weatherTimer = 5; // Rain lasts 5s
            log(`Chuvas repentinas ajudaram a encher os poços!`, 'good-event');
            overlay.style.backgroundColor = 'rgba(0, 150, 255, 0.15)';
        } else {
            log(`Um novo dia escaldante se inicia.`);
        }
    }

    if (weatherTimer > 0) {
        weatherTimer -= dt;
        if (weatherTimer <= 0) {
            weatherState = 'normal';
            overlay.style.backgroundColor = 'transparent';
        }
    }

    // 2. Resource Drain
    // Regra: a cada 10 pessoas -> 1 de água e 1 de comida a cada 2s (= 0.5 por seg cada)
    let waterDrainPerSec = (pop / 10) * 0.5;
    if (weatherState === 'heat') waterDrainPerSec *= 1.5;
    if (isRationing) waterDrainPerSec *= 0.5;

    let foodDrainPerSec = (pop / 10) * 0.5;
    let dailyFoodGain = pop * 0.4; 

    // Apply drain/gain via dt
    water -= waterDrainPerSec * dt;
    food -= foodDrainPerSec * dt;
    food += (dailyFoodGain / DAY_DURATION) * dt;
    
    // ENERGY AND MACHINERY
    energy += (solarPanels * 2) * dt;
    let drillCost = drills * 1 * dt; // 1 energy per second per drill
    let drillsActive = drills;
    if (energy < drillCost) {
        drillsActive = energy / (1 * dt);
    }
    energy -= drillsActive * 1 * dt;
    water += drillsActive * (1/3) * dt; // 1 water per 3s per active drill
    
    // Limits Check
    energy = Math.max(0, Math.min(energy, maxEnergy));

    if (weatherState === 'rain') {
        let rainGain = 20 / 5; // +20 spread over 5s
        water += rainGain * dt;
    }

    // Starvation check
    if (food <= 0) {
        // Starvation logic every second
        if (Math.random() < 0.2 * dt) {
            pop--;
            log(`Uma pessoa sucumbiu à inanição!`, 'bad-event');
            spawnFloatingText(`-1 👥`, '#e74c3c', villageRect.x + villageRect.w/2, villageRect.y + 20);
            if(peopleDots.length > Math.floor(pop)) peopleDots.pop();
        }
        food = 0;
    }

    // 3. Timers & Cooldowns

    if (cooldowns.dig > 0) {
        cooldowns.dig -= dt;
        if (cooldowns.dig <= 0) {
            // Dig finished
            let w = peopleDots.find(p => p.state === 'digging');
            if (w) w.state = 'wandering';

            let chance = 0.45;
            if (pop < 5) chance -= 0.20;
            else if (pop > 15) chance += 0.15;

            if (Math.random() < chance) {
                let baseGain = 20 + Math.floor(Math.random()*20);
                let gained = baseGain + Math.floor(pop / 2);
                water += gained;
                let nx = w ? w.x : villageRect.x + villageRect.w/2;
                let ny = w ? w.y : villageRect.y + villageRect.h/2;
                buildings.push({ type: 'well', x: nx, y: ny });
                spawnFloatingText(`+${gained} 💧`, '#3498db', nx, ny);
                spawnWaterParticles(nx, ny, 15);
                log(`Novo lençol freático encontrado (+${gained} Água)!`, 'good-event');
            } else {
                let nx = w ? w.x : villageRect.x + villageRect.w/2;
                let ny = w ? w.y : villageRect.y + villageRect.h/2;
                spawnFloatingText(`Nada...`, '#e0e0e0', nx, ny);
                log(`Esforço em vão. Apenas areia seca.`, 'bad-event');
            }
        }
    }

    if (cooldowns.school > 0) {
        cooldowns.school -= dt;
        if (cooldowns.school <= 0) {
            // School finished
            let w = peopleDots.find(p => p.state === 'schooling');
            if (w) w.state = 'wandering';

            huntDuration = Math.max(4, huntDuration - 0.25);
            maxWater = Math.floor(maxWater * 1.1);
            maxFood = Math.floor(maxFood * 1.1);
            schoolsBuilt++;
            let nx = w ? w.x : villageRect.x + villageRect.w/2;
            let ny = w ? w.y : villageRect.y + villageRect.h/2;
            buildings.push({ type: 'school', x: nx, y: ny });
            spawnFloatingText(`Limites +10%`, '#9b59b6', nx, ny);
            log(`Nova escola construída! A caça está mais eficiente e nossos armazéns aumentaram.`, 'good-event');
        }
    }

    if (cooldowns.hunt > 0) {
        cooldowns.hunt -= dt;
        if (cooldowns.hunt <= 0) {
            // Hunt finished
            let w = peopleDots.find(p => p.state === 'hunting');
            if (w) w.state = 'wandering';

            // Success chance based on population size
            let chance = 0.60;
            if (pop < 5) chance -= 0.20;
            else if (pop > 15) chance += 0.15;

            if (Math.random() < chance) {
                let baseGain = 20 + Math.floor(Math.random()*16);
                let gained = baseGain + Math.floor(pop / 2);
                food += gained;
                let nx = w ? w.x : villageRect.x + villageRect.w/2;
                let ny = w ? w.y : villageRect.y + villageRect.h/2;
                spawnFloatingText(`+${gained} 🍎`, '#e67e22', nx, ny);
                log(`Expedição bem sucedida! Trouxeram +${gained} de Comida.`, 'good-event');
            } else {
                let nx = w ? w.x : villageRect.x + villageRect.w/2;
                let ny = w ? w.y : villageRect.y + villageRect.h/2;
                spawnFloatingText(`Nada...`, '#e0e0e0', nx, ny);
                log(`Os caçadores voltaram de mãos vazias.`, 'bad-event');
            }
        }
    }

    // 4. Update Agents
    peopleDots.forEach(p => {
        if (p.state === 'wandering') {
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Bounce
            if (p.x <= villageRect.x + 5 || p.x >= villageRect.x + villageRect.w - 5) {
                p.vx *= -1;
                p.x = Math.max(villageRect.x+6, Math.min(p.x, villageRect.x + villageRect.w - 6));
            }
            if (p.y <= villageRect.y + 5 || p.y >= villageRect.y + villageRect.h - 5) {
                p.vy *= -1;
                p.y = Math.max(villageRect.y+6, Math.min(p.y, villageRect.y + villageRect.h - 6));
            }

            if(Math.random() < 0.05) {
                p.vx += (Math.random() - 0.5) * 50;
                p.vy += (Math.random() - 0.5) * 50;
                let speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
                if(speed > 60) { p.vx = (p.vx/speed)*60; p.vy = (p.vy/speed)*60; }
            }
        } 
        else if (p.state.startsWith('walking_to_')) {
            // Move toward target
            let dx = p.targetX - p.x;
            let dy = p.targetY - p.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 2) {
                if (p.state === 'walking_to_dig') { p.state = 'digging'; p.timer = 0; }
                if (p.state === 'walking_to_school') { p.state = 'schooling'; p.timer = 0; }
                if (p.state === 'walking_to_hunt') { p.state = 'hunting'; p.timer = 0; }
            } else {
                p.x += (dx/dist) * 80 * dt;
                p.y += (dy/dist) * 80 * dt;
            }
        }
    });

    // 5. Particles Update
    for(let i=particles.length-1; i>=0; i--) {
        let pt = particles[i];
        pt.age += dt;
        pt.vy += 200 * dt; // Gravity
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if(pt.age >= pt.life) particles.splice(i, 1);
    }

    // 6. Floating Texts
    for(let i=floatingTexts.length-1; i>=0; i--) {
        let ft = floatingTexts[i];
        ft.age += dt;
        ft.y -= 20 * dt; // Move up
        if(ft.age >= ft.life) floatingTexts.splice(i, 1);
    }

    updateHUD();
}

function drawCanvas(dt) {
    // Clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Plantations color based on water %
    let moisture = Math.max(0, water / maxWater);
    let r = Math.floor(192 - (192-46)*moisture);
    let g = Math.floor(152 + (204-152)*moisture);
    let b = Math.floor(83 + (113-83)*moisture);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    
    let pSize = 40;
    for(let i = 0; i < canvas.width; i += pSize) {
        for(let j = 0; j < canvas.height; j += pSize) {
            let padding = 10;
            if (i + pSize > villageRect.x - padding && i < villageRect.x + villageRect.w + padding &&
                j + pSize > villageRect.y - padding && j < villageRect.y + villageRect.h + padding) {
                continue;
            }
            ctx.fillRect(i+4, j+4, pSize-8, pSize-8);
        }
    }

    // Village Soil
    ctx.fillStyle = '#6a4a2b';
    ctx.fillRect(villageRect.x, villageRect.y, villageRect.w, villageRect.h);

    // Buildings
    buildings.forEach(b => {
        if (b.type === 'main-well' || b.type === 'well') {
            // Foundation
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.type==='main-well'?12:8, 0, Math.PI * 2);
            ctx.fill();
            // Water inside
            ctx.fillStyle = 'var(--water-color)';
            ctx.beginPath();
            ctx.arc(b.x, b.y, (b.type==='main-well'?8:5) * (moisture + 0.1), 0, Math.PI * 2);
            ctx.fill();
        } else if (b.type === 'school') {
            ctx.fillStyle = '#8e44ad'; // Purple school
            ctx.fillRect(b.x - 8, b.y - 8, 16, 16);
            ctx.fillStyle = '#ecf0f1'; // Roof
            ctx.beginPath();
            ctx.moveTo(b.x - 10, b.y - 8);
            ctx.lineTo(b.x, b.y - 15);
            ctx.lineTo(b.x + 10, b.y - 8);
            ctx.fill();
            // Flag
            ctx.fillStyle = '#f1c40f'; 
            ctx.fillRect(b.x-2, b.y-16, 4, 4);
        } else if (b.type === 'solar') {
            ctx.fillStyle = '#f39c12';
            ctx.fillRect(b.x - 8, b.y - 4, 16, 8);
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(b.x - 6, b.y - 2, 12, 4);
        } else if (b.type === 'drill') {
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(b.x - 4, b.y - 10, 8, 10);
            ctx.fillStyle = '#bdc3c7';
            ctx.fillRect(b.x - 2, b.y - 12, 4, 4);
        }
    });

    // Drawing Water Droplets (Visual Representation of Water scattered in main well)
    // Small animated drops bubbling when rain or just static based on water
    if (weatherState === 'rain') {
        ctx.fillStyle = 'rgba(52, 152, 219, 0.5)';
        for(let k=0; k<10; k++) {
           ctx.beginPath();
           ctx.arc(Math.random()*canvas.width, Math.random()*canvas.height, Math.random()*3+1, 0, Math.PI*2);
           ctx.fill();
        }
    }

    // People
    peopleDots.forEach(p => {
        let drawY = p.y;
        
        // Digging animation: little jumps
        if (p.state === 'digging' || p.state === 'schooling' || p.state === 'hunting') {
            p.timer += dt * 10;
            drawY -= Math.abs(Math.sin(p.timer)) * 4; // Bouncing up and down quickly
            
            // Draw a tiny tool
            if (p.state === 'digging') {
                ctx.strokeStyle = '#95a5a6';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(p.x, drawY);
                ctx.lineTo(p.x + 6, drawY - 6);
                ctx.stroke();
            } else if (p.state === 'schooling') {
                // Draw a tiny book (just a color dot)
                ctx.fillStyle = '#f1c40f';
                ctx.beginPath();
                ctx.arc(p.x + 4, drawY - 2, 2, 0, Math.PI*2);
                ctx.fill();
            } else if (p.state === 'hunting') {
                // Draw a tiny spear
                ctx.strokeStyle = '#c0392b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(p.x, drawY);
                ctx.lineTo(p.x + 8, drawY - 8);
                ctx.stroke();
            }
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(p.x, drawY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Particles
    particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2);
        ctx.fill();
    });

    // Floating Texts
    ctx.font = 'bold 16px Oswald, sans-serif';
    ctx.textAlign = 'center';
    floatingTexts.forEach(ft => {
        ctx.fillStyle = ft.color;
        
        // fade out
        let alpha = 1.0;
        if (ft.age > ft.life * 0.7) {
            alpha = 1.0 - ((ft.age - ft.life * 0.7) / (ft.life * 0.3));
        }
        ctx.globalAlpha = alpha;
        
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0; // reset
    });
}

// Start
init();
