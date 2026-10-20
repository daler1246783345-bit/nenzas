
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const $ = (id) => document.getElementById(id);

const scoreEl = $("score");
const coinsEl = $("coins");
const bestEl = $("best");
const overlay = $("overlay");
const overlayIcon = $("overlayIcon");
const overlayTitle = $("overlayTitle");
const overlayText = $("overlayText");
const startBtn = $("startBtn");
const pauseBtn = $("pauseBtn");
const restartBtn = $("restartBtn");
const mobileJump = $("mobileJump");
const statusText = $("statusText");
const pauseIndicator = $("pauseIndicator");

const W = canvas.width;
const H = canvas.height;
const groundY = 350;

let best = 0;

try {
    best = Number(localStorage.getItem("ninjaJumpBest")) || 0;
} catch (error) {
    best = 0;
}

bestEl.textContent = best;

let state = "ready";
let score = 0;
let coins = 0;
let speed = 5;
let distance = 0;
let lastTime = 0;
let spawnTimer = 0;
let coinTimer = 0;
let animationId = 0;

let obstacles = [];
let coinItems = [];
let particles = [];

const ninja = {
    x: 115,
    y: groundY - 65,
    w: 43,
    h: 65,
    vy: 0,
    jumping: false,
    runTime: 0
};

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function saveBest() {
    if (score > best) {
        best = score;
        bestEl.textContent = best;

        try {
            localStorage.setItem("ninjaJumpBest", String(best));
        } catch (error) {
            // O‘yin localStorage ishlamasa ham davom etadi.
        }
    }
}

function updateUI() {
    scoreEl.textContent = score;
    coinsEl.textContent = coins;
}

function showOverlay(icon, title, message, buttonText) {
    overlayIcon.textContent = icon;
    overlayTitle.textContent = title;
    overlayText.textContent = message;
    startBtn.textContent = buttonText;
    overlay.classList.remove("hidden");
}

function hideOverlay() {
    overlay.classList.add("hidden");
}

function resetGame() {
    score = 0;
    coins = 0;
    speed = 5;
    distance = 0;
    spawnTimer = 55;
    coinTimer = 90;

    obstacles = [];
    coinItems = [];
    particles = [];

    ninja.y = groundY - ninja.h;
    ninja.vy = 0;
    ninja.jumping = false;
    ninja.runTime = 0;

    updateUI();
}

function startGame() {
    if (state === "running") return;

    if (state === "ready" || state === "over") {
        resetGame();
    }

    state = "running";
    hideOverlay();
    pauseIndicator.classList.remove("visible");
    pauseBtn.textContent = "Ⅱ";
    statusText.textContent = "O‘yin davom etmoqda";

    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
}

function pauseGame() {
    if (state === "running") {
        state = "paused";
        pauseIndicator.classList.add("visible");
        pauseBtn.textContent = "▶";
        statusText.textContent = "O‘yin to‘xtatildi";
        cancelAnimationFrame(animationId);
    } else if (state === "paused") {
        startGame();
    } else if (state === "ready" || state === "over") {
        startGame();
    }
}

function restartGame() {
    state = "ready";
    cancelAnimationFrame(animationId);
    resetGame();
    pauseIndicator.classList.remove("visible");
    pauseBtn.textContent = "Ⅱ";
    statusText.textContent = "Boshlashga tayyor";

    showOverlay(
        "🥷",
        "Yangi sarguzasht!",
        "Tayyormisan? To‘siqlardan sakra va tangalarni yig‘!",
        "▶ O‘yinni boshlash"
    );

    draw();
}

function jump() {
    if (state === "ready" || state === "over") {
        startGame();
        return;
    }

    if (state !== "running" || ninja.jumping) return;

    ninja.vy = -15;
    ninja.jumping = true;

    makeParticles(
        ninja.x + ninja.w / 2,
        groundY - 3,
        "#e9f3ff",
        5
    );
}

function endGame() {
    state = "over";
    saveBest();
    cancelAnimationFrame(animationId);

    statusText.textContent = "O‘yin tugadi";
    pauseIndicator.classList.remove("visible");
    pauseBtn.textContent = "Ⅱ";

    showOverlay(
        "💥",
        "O‘yin tugadi!",
        `Ball: ${score}  •  Tangalar: ${coins}  •  Rekord: ${best}`,
        "↻ Qayta o‘ynash"
    );
}

function makeParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            vx: random(-2.5, 2.5),
            vy: random(-3, 0.5),
            life: random(15, 28),
            color,
            size: random(2, 5)
        });
    }
}

function spawnObstacle() {
    const tall = Math.random() > 0.45;

    obstacles.push({
        x: W + 20,
        y: groundY - (tall ? 45 : 32),
        w: tall ? 30 : 37,
        h: tall ? 45 : 32,
        type: tall ? "rock" : "box"
    });
}

function spawnCoins() {
    const count = Math.floor(random(3, 6));
    const baseY = random(205, 270);

    for (let i = 0; i < count; i++) {
        coinItems.push({
            x: W + 35 + i * 38,
            y: baseY - Math.sin(i / (count - 1 || 1) * Math.PI) * 24,
            r: 11,
            taken: false,
            spin: random(0, Math.PI * 2)
        });
    }
}

// Chiroyli, rang-barang o‘yin fonini chizish.
function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#73c8f5");
    sky.addColorStop(1, "#d1f2ff");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Quyosh
    ctx.fillStyle = "#fff4b5";
    ctx.beginPath();
    ctx.arc(745, 75, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff55";
    ctx.beginPath();
    ctx.arc(745, 75, 45, 0, Math.PI * 2);
    ctx.fill();

    // Bulutlar
    drawCloud(130 - (distance * 0.12) % 1000, 75, 1);
    drawCloud(480 - (distance * 0.08) % 1000, 125, 0.8);
    drawCloud(880 - (distance * 0.1) % 1100, 60, 1.1);

    // Uzoqdagi tog‘lar
    ctx.fillStyle = "#8dc9c1";
    ctx.beginPath();
    ctx.moveTo(0, 280);
    ctx.lineTo(125, 135);
    ctx.lineTo(260, 280);
    ctx.lineTo(410, 165);
    ctx.lineTo(570, 280);
    ctx.lineTo(720, 145);
    ctx.lineTo(900, 280);
    ctx.lineTo(900, groundY);
    ctx.lineTo(0, groundY);
    ctx.fill();

    // Yaqin tepaliklar
    ctx.fillStyle = "#65ad91";
    ctx.beginPath();
    ctx.moveTo(0, 305);
    ctx.quadraticCurveTo(180, 245, 340, 310);
    ctx.quadraticCurveTo(560, 240, 730, 300);
    ctx.quadraticCurveTo(820, 270, 900, 295);
    ctx.lineTo(900, groundY);
    ctx.lineTo(0, groundY);
    ctx.fill();

    // Yer
    ctx.fillStyle = "#325d43";
    ctx.fillRect(0, groundY, W, H - groundY);

    ctx.fillStyle = "#68c77c";
    ctx.fillRect(0, groundY, W, 8);

    // Harakatlanayotgan yer belgilari
    ctx.fillStyle = "#477957";

    for (let i = 0; i < 22; i++) {
        const x = ((i * 57 - distance * 1.6) % (W + 30) + W + 30)
            % (W + 30);

        ctx.fillRect(x, groundY + 23 + (i % 3) * 14, 20, 3);
    }

    // Kichik o‘tlar
    ctx.strokeStyle = "#9be58e";
    ctx.lineWidth = 2;

    for (let i = 0; i < 28; i++) {
        const x = ((i * 43 - distance * 1.5) % (W + 20) + W + 20)
            % (W + 20);

        ctx.beginPath();
        ctx.moveTo(x, groundY + 8);
        ctx.lineTo(x - 4, groundY + 1);
        ctx.moveTo(x, groundY + 8);
        ctx.lineTo(x + 4, groundY + 2);
        ctx.stroke();
    }
}

function drawCloud(x, y, scale) {
    if (x < -100) x += 1100;

    ctx.fillStyle = "#ffffffc9";
    ctx.beginPath();
    ctx.arc(x, y, 17 * scale, 0, Math.PI * 2);
    ctx.arc(x + 19 * scale, y - 9 * scale, 23 * scale, 0, Math.PI * 2);
    ctx.arc(x + 42 * scale, y, 17 * scale, 0, Math.PI * 2);
    ctx.fill();
}

// Ninja qahramonini kod orqali chizish.
function drawNinja() {
    const x = ninja.x;
    const y = ninja.y;
    const run = ninja.jumping ? 0 : Math.sin(ninja.runTime) * 5;

    ctx.save();

    // Soya
    ctx.fillStyle = "#173a3280";
    ctx.beginPath();
    ctx.ellipse(
        x + ninja.w / 2,
        groundY + 3,
        ninja.jumping ? 14 : 22,
        4,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.translate(x, y);

    // Oyoqlar
    ctx.strokeStyle = "#20273d";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(21, 45);
    ctx.lineTo(17 + run, 58);
    ctx.lineTo(10 + run, 61);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(26, 45);
    ctx.lineTo(31 - run, 57);
    ctx.lineTo(37 - run, 59);
    ctx.stroke();

    // Tana
    ctx.fillStyle = "#242a42";
    ctx.beginPath();
    ctx.roundRect(10, 24, 26, 28, 8);
    ctx.fill();

    // Kiyimdagi belbog‘
    ctx.fillStyle = "#e94f68";
    ctx.fillRect(11, 39, 24, 5);

    // Qo‘llar
    ctx.strokeStyle = "#252b42";
    ctx.lineWidth = 8;

    ctx.beginPath();
    ctx.moveTo(13, 29);
    ctx.lineTo(4, 40 + run);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(33, 29);
    ctx.lineTo(40, 37 - run);
    ctx.stroke();

    // Bosh
    ctx.fillStyle = "#20263d";
    ctx.beginPath();
    ctx.arc(23, 15, 17, 0, Math.PI * 2);
    ctx.fill();

    // Yuz
    ctx.fillStyle = "#f2c6a1";
    ctx.fillRect(10, 13, 26, 10);

    // Niqob
    ctx.fillStyle = "#e94f68";
    ctx.fillRect(9, 10, 29, 8);

    // Ko‘zlar
    ctx.fillStyle = "#fff";
    ctx.fillRect(14, 14, 7, 4);
    ctx.fillRect(26, 14, 7, 4);

    ctx.fillStyle = "#20263d";
    ctx.fillRect(18, 14, 3, 4);
    ctx.fillRect(29, 14, 3, 4);

    // Orqadagi ninja lentasi
    ctx.fillStyle = "#e94f68";
    ctx.beginPath();
    ctx.moveTo(7, 12);
    ctx.lineTo(-5, 7 + run);
    ctx.lineTo(2, 18 + run);
    ctx.lineTo(10, 17);
    ctx.fill();

    // Peshonadagi belgi
    ctx.fillStyle = "#fff0bc";
    ctx.fillRect(21, 5, 4, 4);

    ctx.restore();
}

function drawObstacle(obstacle) {
    const x = obstacle.x;
    const y = obstacle.y;

    if (obstacle.type === "rock") {
        ctx.fillStyle = "#705a71";
        ctx.beginPath();
        ctx.moveTo(x, y + obstacle.h);
        ctx.lineTo(x + 4, y + 15);
        ctx.lineTo(x + 15, y);
        ctx.lineTo(x + obstacle.w - 2, y + 12);
        ctx.lineTo(x + obstacle.w, y + obstacle.h);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#a18ba0";
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 17);
        ctx.lineTo(x + 15, y + 4);
        ctx.lineTo(x + 19, y + 18);
        ctx.fill();
    } else {
        ctx.fillStyle = "#b56b45";
        ctx.fillRect(x, y, obstacle.w, obstacle.h);

        ctx.fillStyle = "#e9a16c";
        ctx.fillRect(x + 3, y + 3, obstacle.w - 6, 5);

        ctx.strokeStyle = "#75452f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 8);
        ctx.lineTo(x + obstacle.w - 4, y + obstacle.h - 4);
        ctx.moveTo(x + obstacle.w - 4, y + 8);
        ctx.lineTo(x + 4, y + obstacle.h - 4);
        ctx.stroke();
    }
}

function drawCoin(coin) {
    const width = Math.max(3, Math.abs(Math.cos(coin.spin)) * 11);

    ctx.save();
    ctx.translate(coin.x, coin.y);

    ctx.fillStyle = "#e6a91e";
    ctx.beginPath();
    ctx.ellipse(0, 0, width, coin.r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#fff0a1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(2, width - 3), coin.r - 3, 0,
        0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#fff3b2";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 0, 1);

    ctx.restore();
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / 28);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    ctx.globalAlpha = 1;
}

function draw() {
    drawBackground();

    for (const coin of coinItems) {
        if (!coin.taken) drawCoin(coin);
    }

    for (const obstacle of obstacles) {
        drawObstacle(obstacle);
    }

    drawNinja();
    drawParticles();
}

function overlaps(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

function update(dt) {
    const step = Math.min(dt / 16.67, 2);

    distance += speed * step;
    speed = Math.min(10, 5 + score / 500);

    ninja.runTime += 0.18 * step;
    ninja.vy += 0.72 * step;
    ninja.y += ninja.vy * step;

    if (ninja.y + ninja.h >= groundY) {
        ninja.y = groundY - ninja.h;
        ninja.vy = 0;
        ninja.jumping = false;
    }

    spawnTimer -= step;
    if (spawnTimer <= 0) {
        spawnObstacle();
        spawnTimer = random(70, 115) * (5 / speed);
    }

    coinTimer -= step;
    if (coinTimer <= 0) {
        spawnCoins();
        coinTimer = random(115, 180);
    }

    const playerBox = {
        x: ninja.x + 8,
        y: ninja.y + 5,
        w: ninja.w - 15,
        h: ninja.h - 9
    };

    for (const obstacle of obstacles) {
        obstacle.x -= speed * step;

        const obstacleBox = {
            x: obstacle.x + 4,
            y: obstacle.y + 5,
            w: obstacle.w - 8,
            h: obstacle.h - 5
        };

        if (overlaps(playerBox, obstacleBox)) {
            endGame();
            return;
        }
    }

    obstacles = obstacles.filter(o => o.x + o.w > -10);

    for (const coin of coinItems) {
        coin.x -= speed * step;
        coin.spin += 0.12 * step;

        if (!coin.taken) {
            const dx = ninja.x + ninja.w / 2 - coin.x;
            const dy = ninja.y + ninja.h / 2 - coin.y;

            if (Math.sqrt(dx * dx + dy * dy) < 34) {
                coin.taken = true;
                coins++;
                score += 25;
                makeParticles(coin.x, coin.y, "#ffdb55", 8);
            }
        }
    }

    coinItems = coinItems.filter(c => c.x > -20 && !c.taken);

    for (const p of particles) {
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.vy += 0.12 * step;
        p.life -= step;
    }

    particles = particles.filter(p => p.life > 0);

    score += step * 0.12;
    scoreEl.textContent = Math.floor(score);
    coinsEl.textContent = coins;

    if (Math.floor(score) > best) {
        best = Math.floor(score);
        bestEl.textContent = best;

        // Rekord vaqti-vaqti bilan saqlanadi.
        if (Math.floor(score) % 10 === 0) saveBest();
    }
}

function loop(now) {
    if (state !== "running") return;

    const dt = Math.min(now - lastTime, 34);
    lastTime = now;

    update(dt);
    draw();

    if (state === "running") {
        animationId = requestAnimationFrame(loop);
    }
}

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", restartGame);
mobileJump.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    jump();
});

canvas.addEventListener("pointerdown", () => {
    if (state === "running") jump();
});

document.addEventListener("keydown", (event) => {
    if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        event.code === "KeyW"
    ) {
        event.preventDefault();

        if (!event.repeat) jump();
    }

    if (event.code === "Escape" || event.code === "KeyP") {
        pauseGame();
    }
});

// Brauzer boshqa oynaga o‘tganda o‘yinni pauzaga olish.
document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "running") {
        pauseGame();
    }
});

resetGame();
draw();
