/* =================================
   RED BALL COLOR BLOCKS
   MAIN JAVASCRIPT
================================= */

const USERS_KEY = "rbcb_users";
const SESSION_KEY = "rbcb_session";
const GAME_KEY = "rbcb_game_data";

const COLORS = ["red", "blue", "green", "yellow", "purple"];

const TARGETS = [100, 150, 200, 250, 300];
const TIMES = [60, 55, 50, 45, 40];

const ROWS = 8;
const COLS = 8;

function readData(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function currentUser() {
    return localStorage.getItem(SESSION_KEY);
}

function getGameData(username) {
    const data = readData(GAME_KEY, {});
    return data[username] || {
        highScore: 0,
        lastScore: 0,
        gamesPlayed: 0
    };
}

function saveGameData(username, result) {
    const data = readData(GAME_KEY, {});
    const oldData = data[username] || {
        highScore: 0,
        lastScore: 0,
        gamesPlayed: 0
    };

    data[username] = {
        highScore: Math.max(oldData.highScore, result),
        lastScore: result,
        gamesPlayed: oldData.gamesPlayed + 1
    };

    saveData(GAME_KEY, data);
}

function getUnlockedLevel(username) {
    return Number(
        localStorage.getItem("rbcb_unlocked_" + username)
    ) || 1;
}

/* =================================
   DOM CONTENT LOADED
================================= */

document.addEventListener("DOMContentLoaded", function () {

    initRegister();
    initLogin();
    initLogout();
    initDashboard();
    initLevelPage();
    initGame();

});

/* =================================
   REGISTER
================================= */

function initRegister() {
    const form = document.getElementById("registerForm");

    if (!form) return;

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const username = document
            .getElementById("registerUsername")
            .value.trim();

        const password = document
            .getElementById("registerPassword")
            .value;

        const confirmPassword = document
            .getElementById("confirmPassword")
            .value;

        const message = document.getElementById("registerMessage");

        if (username.length < 3) {
            message.textContent =
                "Username minimal 3 karakter.";
            message.style.color = "#ff5964";
            return;
        }

        if (password.length < 4) {
            message.textContent =
                "Password minimal 4 karakter.";
            message.style.color = "#ff5964";
            return;
        }

        if (password !== confirmPassword) {
            message.textContent =
                "Konfirmasi password tidak sama.";
            message.style.color = "#ff5964";
            return;
        }

        const users = readData(USERS_KEY, []);

        const exists = users.some(
            user => user.username.toLowerCase() === username.toLowerCase()
        );

        if (exists) {
            message.textContent =
                "Username sudah digunakan.";
            message.style.color = "#ff5964";
            return;
        }

        users.push({
            username: username,
            password: password
        });

        saveData(USERS_KEY, users);

        message.textContent =
            "Pendaftaran berhasil! Silakan login.";

        message.style.color = "#35d58a";

        form.reset();

        setTimeout(function () {
            window.location.href = "login.html";
        }, 1000);
    });
}

/* =================================
   LOGIN
================================= */

function initLogin() {
    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const username = document
            .getElementById("loginUsername")
            .value.trim();

        const password = document
            .getElementById("loginPassword")
            .value;

        const message = document.getElementById("loginMessage");

        const users = readData(USERS_KEY, []);

        const user = users.find(function (item) {
            return (
                item.username.toLowerCase() === username.toLowerCase() &&
                item.password === password
            );
        });

        if (!user) {
            message.textContent =
                "Username atau password salah.";

            message.style.color = "#ff5964";
            return;
        }

        localStorage.setItem(SESSION_KEY, user.username);

        message.textContent = "Login berhasil!";
        message.style.color = "#35d58a";

        setTimeout(function () {
            window.location.href = "dashboard.html";
        }, 500);
    });
}

/* =================================
   LOGOUT
================================= */

function initLogout() {
    const button = document.getElementById("logoutBtn");

    if (!button) return;

    button.addEventListener("click", function () {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = "index.html";
    });
}

/* =================================
   DASHBOARD
================================= */

function initDashboard() {
    const playerName = document.getElementById("playerName");

    if (!playerName) return;

    const username = currentUser();

    if (!username) {
        window.location.href = "login.html";
        return;
    }

    const data = getGameData(username);

    playerName.textContent = username;

    document.getElementById("highScore").textContent =
        data.highScore;

    document.getElementById("lastScore").textContent =
        data.lastScore;

    document.getElementById("gamesPlayed").textContent =
        data.gamesPlayed;
}

/* =================================
   LEVEL PAGE
================================= */

function initLevelPage() {
    const cards = document.querySelectorAll(".level-card");

    if (cards.length === 0) return;

    const username = currentUser();

    if (!username) {
        window.location.href = "login.html";
        return;
    }

    const unlockedLevel = getUnlockedLevel(username);

    cards.forEach(function (card) {
        const level = Number(card.dataset.level);
        const small = card.querySelector("small");

        if (level <= unlockedLevel) {
            card.disabled = false;
            small.textContent = "Terbuka - Mainkan";

        } else {
            card.disabled = true;
            small.textContent = "🔒 Terkunci";
        }

        card.addEventListener("click", function () {
            if (level > unlockedLevel) return;

            localStorage.setItem(
                "rbcb_selected_level",
                level
            );

            window.location.href = "game.html";
        });
    });
}

/* =================================
   GAME
================================= */

function initGame() {
    const board = document.getElementById("board");

    if (!board) return;

    const username = currentUser();

    if (!username) {
        window.location.href = "login.html";
        return;
    }

    const scoreElement = document.getElementById("score");
    const targetElement = document.getElementById("target");
    const timerElement = document.getElementById("timer");
    const levelElement = document.getElementById("level");
    const messageElement = document.getElementById("gameMessage");
    const restartButton = document.getElementById("restartBtn");

    let grid = [];
    let score = 0;
    let level = Number(
        localStorage.getItem("rbcb_selected_level")
    ) || 1;

    let timeLeft = TIMES[level - 1];
    let timer = null;
    let gameFinished = false;

    const target = TARGETS[level - 1];

    /* Membuat papan */

    function makeGrid() {
        grid = [];

        for (let row = 0; row < ROWS; row++) {
            const newRow = [];

            for (let col = 0; col < COLS; col++) {
                const randomColor =
                    COLORS[Math.floor(Math.random() * COLORS.length)];

                newRow.push(randomColor);
            }

            grid.push(newRow);
        }
    }

    /* Menampilkan papan */

    function renderBoard() {
        board.innerHTML = "";

        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const block = document.createElement("button");

                block.type = "button";
                block.className = "block " + (grid[row][col] || "");
                block.dataset.row = row;
                block.dataset.col = col;

                block.addEventListener("click", function () {
                    handleBlockClick(row, col);
                });

                board.appendChild(block);
            }
        }
    }

    /* Mencari kelompok warna yang sama */

    function findGroup(startRow, startCol) {
        const color = grid[startRow][startCol];

        if (!color) return [];

        const visited = new Set();
        const group = [];

        const stack = [[startRow, startCol]];

        while (stack.length > 0) {
            const [row, col] = stack.pop();

            const key = row + "," + col;

            if (
                row < 0 ||
                row >= ROWS ||
                col < 0 ||
                col >= COLS ||
                visited.has(key) ||
                grid[row][col] !== color
            ) {
                continue;
            }

            visited.add(key);
            group.push([row, col]);

            stack.push(
                [row + 1, col],
                [row - 1, col],
                [row, col + 1],
                [row, col - 1]
            );
        }

        return group;
    }

    /* Menghapus kelompok blok */

    function removeGroup(group) {
        group.forEach(function ([row, col]) {
            grid[row][col] = null;
        });

        score += group.length * group.length * 5;
    }

    /* Menjatuhkan blok */

    function applyGravity() {
        for (let col = 0; col < COLS; col++) {
            const remaining = [];

            for (let row = ROWS - 1; row >= 0; row--) {
                if (grid[row][col]) {
                    remaining.push(grid[row][col]);
                }
            }

            for (let row = ROWS - 1; row >= 0; row--) {
                const index = ROWS - 1 - row;

                grid[row][col] = remaining[index] || null;
            }
        }

        for (let col = 0; col < COLS; col++) {
            for (let row = 0; row < ROWS; row++) {
                if (!grid[row][col]) {
                    grid[row][col] =
                        COLORS[Math.floor(Math.random() * COLORS.length)];
                }
            }
        }
    }

    /* Memperbarui informasi game */

    function updateInfo() {
        scoreElement.textContent = score;
        targetElement.textContent = target;
        timerElement.textContent = timeLeft;
        levelElement.textContent = level;
    }

    /* Saat blok diklik */

    function handleBlockClick(row, col) {
        if (gameFinished || !grid[row][col]) return;

        const group = findGroup(row, col);

        if (group.length < 2) {
            messageElement.textContent =
                "Pilih minimal dua blok dengan warna sama!";
            return;
        }

        removeGroup(group);
        applyGravity();

        updateInfo();
        renderBoard();

        messageElement.textContent =
            "Bagus! Kamu mendapatkan " +
            (group.length * group.length * 5) +
            " poin.";

        if (score >= target) {
            completeLevel();
        }
    }

    /* Menyimpan hasil permainan */

    function saveResult() {
        saveGameData(username, score);
    }

    /* Menyelesaikan level */

    function completeLevel() {
        if (gameFinished) return;

        gameFinished = true;
        clearInterval(timer);

        saveResult();

        const unlocked = getUnlockedLevel(username);

        if (level < 5 && level >= unlocked) {
            localStorage.setItem(
                "rbcb_unlocked_" + username,
                level + 1
            );
        }

        if (level === 5) {
            messageElement.textContent =
                "🎉 Selamat! Kamu menyelesaikan semua level! Skor: " + score;
        } else {
            messageElement.textContent =
                "🎉 Level " + level +
                " berhasil diselesaikan! Level berikutnya terbuka.";
        }

        restartButton.textContent = "Kembali ke Level";
        restartButton.onclick = function () {
            window.location.href = "level.html";
        };
    }

    /* Game berakhir */

    function finishGame() {
        if (gameFinished) return;

        gameFinished = true;
        clearInterval(timer);

        saveResult();

        messageElement.textContent =
            "Waktu habis! Skor akhir kamu: " + score;

        restartButton.textContent = "Coba Lagi";
        restartButton.onclick = startGame;
    }

    /* Timer */

    function startTimer() {
        clearInterval(timer);

        timer = setInterval(function () {
            if (gameFinished) return;

            timeLeft--;
            updateInfo();

            if (timeLeft <= 0) {
                finishGame();
            }
        }, 1000);
    }

    /* Memulai game */

    function startGame() {
        clearInterval(timer);

        score = 0;
        timeLeft = TIMES[level - 1];
        gameFinished = false;

        restartButton.textContent = "Mulai Ulang";
        restartButton.onclick = startGame;

        messageElement.textContent =
            "Pilih kelompok blok dengan warna yang sama!";

        makeGrid();
        updateInfo();
        renderBoard();
        startTimer();
    }

    restartButton.addEventListener("click", startGame);

    startGame();
}