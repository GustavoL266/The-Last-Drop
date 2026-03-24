// State
let water = 100;
let maxWater = 100;
let food = 100;
let maxFood = 100;
let pop = 10;
let days = 1;

// Metrics
let baseWaterConsumption = 2; // per person per day
let baseFoodConsumption = 1;  // per person per day
let techLevel = 0;

// Time & Loop
let lastTime = 0;
const DAY_DURATION = 20; // seconds
let dayTimer = DAY_DURATION;
let isRationing = false;
let rationingTimer = 0;

let cooldowns = {
    dig: 0,
    research: 0
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
    water = 100; food = 100; pop = 10; days = 1; techLevel = 0; 
    dayTimer = DAY_DURATION; isRationing = false; rationingTimer = 0;
    cooldowns = { dig: 0, research: 0 };
    
    peopleDots.length = 0;
    for (let i = 0; i < pop; i++) spawnPerson();
    
    buildings.length = 1; // Keep only center main-well
    floatingTexts.length = 0;
    particles.length = 0;
    
    eventLog.innerHTML = `<li class="neutral-event">Dia 1: O tempo corre sem parar... Os recursos escorrem pelos dedos.</li>`;
    gameOverModal.classList.add('hidden');
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
        state: 'wandering', // or 'walking', 'digging', 'researching'
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

    // Research
    if (cooldowns.research > 0) {
        btnResearch.disabled = true;
        btnResearch.innerText = `Pesquisando... (${Math.ceil(cooldowns.research)}s)`;
    } else {
        btnResearch.disabled = (water < 20);
        btnResearch.innerText = `Pesquisar Reúso (20 💧)`;
    }

    // Ration
    if (rationingTimer > 0) {
        btnRation.disabled = true;
        btnRation.innerText = `Racionando... (${Math.ceil(rationingTimer)}s)`;
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
btnRation.addEventListener('click', () => {
    isRationing = true;
    rationingTimer = DAY_DURATION; // Lasts 1 day real-time (20s)
    log(`Decreto de Racionamento! O estresse popular aumentou.`, 'warn-event');
    
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

btnResearch.addEventListener('click', () => {
    if (water < 20 || cooldowns.research > 0) return;
    water -= 20;
    cooldowns.research = 10;

    let worker = getWorker();
    if (worker) {
        worker.state = 'walking_to_research';
        worker.targetX = villageRect.x + 20 + Math.random() * (villageRect.w - 40);
        worker.targetY = villageRect.y + 20 + Math.random() * (villageRect.h - 40);
        spawnFloatingText("-20 💧", '#3498db', worker.x, worker.y);
    }
    updateHUD();
});

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
    let dailyWater = baseWaterConsumption * pop * Math.pow(0.9, techLevel);
    if (weatherState === 'heat') dailyWater *= 1.5;
    if (isRationing) dailyWater *= 0.5;

    let dailyFood = baseFoodConsumption * pop;
    let dailyFoodGain = pop * 0.4; 

    // Drain/gain over DAY_DURATION
    water -= (dailyWater / DAY_DURATION) * dt;
    food -= (dailyFood / DAY_DURATION) * dt;
    food += (dailyFoodGain / DAY_DURATION) * dt;
    
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
    if (rationingTimer > 0) {
        rationingTimer -= dt;
        if (rationingTimer <= 0) {
            isRationing = false;
        }
    }

    if (cooldowns.dig > 0) {
        cooldowns.dig -= dt;
        if (cooldowns.dig <= 0) {
            // Dig finished
            let w = peopleDots.find(p => p.state === 'digging');
            if (w) w.state = 'wandering';

            if (Math.random() < 0.45) {
                let gained = 20 + Math.floor(Math.random()*20);
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

    if (cooldowns.research > 0) {
        cooldowns.research -= dt;
        if (cooldowns.research <= 0) {
            // Research finished
            let w = peopleDots.find(p => p.state === 'researching');
            if (w) w.state = 'wandering';

            techLevel++;
            let nx = w ? w.x : villageRect.x + villageRect.w/2;
            let ny = w ? w.y : villageRect.y + villageRect.h/2;
            buildings.push({ type: 'tent', x: nx, y: ny });
            spawnFloatingText(`Eficiência +`, '#9b59b6', nx, ny);
            log(`Nova tenda de pesquisa construída! Eficiência hídrica +10%.`, 'good-event');
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
                if (p.state === 'walking_to_research') { p.state = 'researching'; p.timer = 0; }
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
        } else if (b.type === 'tent') {
            ctx.fillStyle = '#8e44ad'; // Purple tent
            ctx.beginPath();
            ctx.moveTo(b.x, b.y - 10);
            ctx.lineTo(b.x - 10, b.y + 10);
            ctx.lineTo(b.x + 10, b.y + 10);
            ctx.fill();
            ctx.fillStyle = '#f1c40f'; // Lamp/flag
            ctx.fillRect(b.x-2, b.y-12, 4, 4);
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
        if (p.state === 'digging' || p.state === 'researching') {
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
            } else if (p.state === 'researching') {
                // Draw a tiny flask or book (just a color dot)
                ctx.fillStyle = '#f1c40f';
                ctx.beginPath();
                ctx.arc(p.x + 4, drawY - 2, 2, 0, Math.PI*2);
                ctx.fill();
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
