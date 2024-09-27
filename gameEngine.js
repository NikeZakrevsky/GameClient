import { Player } from './player.js';

let interpolationValue = 0.01;
let updateRateMs = 50

class OtherPlayer {
    constructor(x, y, sprite, width, height) {
        this.sprite = new Image();
        this.sprite.src = sprite;
        this.width = width;
        this.height = height;

        // Текущая и предыдущая позиции
        this.currentPos = { x: x, y: y };
        this.previousPos = { x: x, y: y };

        this.checkbox = document.getElementById('interpolationCheckbox');
    }

    updatePosition(newX, newY) {
        this.previousPos = { ...this.currentPos };
        this.currentPos = { x: newX, y: newY };
    }

    interpolate() {


        this.previousPos.x += (this.currentPos.x - this.previousPos.x) * interpolationValue;
        this.previousPos.y += (this.currentPos.y - this.previousPos.y) * interpolationValue;

    }

    draw(ctx) {
        if (this.checkbox.checked) {
            this.interpolate();
        }
        ctx.drawImage(this.sprite, this.previousPos.x, this.previousPos.y);
    }
}

class GameEngine {
    constructor(canvasId, serverUrl) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.player = new Player(100, 100, 'player.png', this.canvas.width, this.canvas.height);
        this.otherPlayers = {};
        this.keys = {};
        this.bindEvents();

        this.positionIntervalId = null;

        this.userId = this.uuidv4();
        this.senderWorker = new Worker('senderWorker.js');
        this.senderWorker.postMessage({ type: 'init', serverUrl });

        this.sendNewPlayerMessage();

        this.senderWorker.onmessage = (event) => {
            const { type, data } = event.data;
            if (type === 'serverMessage') {
                this.handleServerMessage(JSON.parse(data));
            }
        };

        this.lastFrameTime = performance.now();
        this.fps = 0;
        this.frames = 0;

        // For TPS (server updates)
        this.lastServerUpdateTime = performance.now();
        this.tps = 0;
        this.serverTicks = 0;

        this.startPositionSending();
        this.gameLoop();
        this.initUIControls();
    }

    uuidv4() {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
          (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
    }

    initUIControls() {
        const interpolationSlider = document.getElementById('interpolationSlider');
        const interpolationSliderValueDisplay = document.getElementById('interpolationSliderValue');

        interpolationSlider.addEventListener('input', () => {
            const value = parseFloat(interpolationSlider.value);
            interpolationSliderValueDisplay.textContent = value;
            interpolationValue = value;
        });

        const updateRateMsSlider = document.getElementById('updateRateMsSlider');
        const updateRateMsSliderValueDisplay = document.getElementById('updateRateMsSliderValue');

        updateRateMsSlider.addEventListener('input', () => {
            const value = parseFloat(updateRateMsSlider.value);
            updateRateMsSliderValueDisplay.textContent = value;
            updateRateMs = value;
            this.startPositionSending();
        });
    }

    startPositionSending() {
        if (this.positionIntervalId) {
            clearInterval(this.positionIntervalId); // Очистить старый интервал, если он существует
        }
        this.positionIntervalId = setInterval(() => {
            this.sendPosition();
        }, updateRateMs); // Используем текущее значение updateRateMs
    }

    bindEvents() {
        window.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
    }

    updateOtherPlayers(players) {
        Object.keys(this.otherPlayers).forEach(playerId => {
            let flag = false
            players.forEach(playerData => {
                if (playerData.playerId != playerId) {
                    flag = true
                    
                }
            });
            if (!flag) {
                delete this.otherPlayers[playerId];
            }
        });
        players.forEach(playerData => {
            if (playerData.playerId !== this.userId) {
                if (!this.otherPlayers[playerData.playerId]) {
                    this.otherPlayers[playerData.playerId] = new OtherPlayer(
                        playerData.x, playerData.y, 'player.png', this.canvas.width, this.canvas.height
                    );
                } else {
                    this.otherPlayers[playerData.playerId].updatePosition(playerData.x, playerData.y);
                }
            }
        });
    }

    update() {
        let dx = 0;
        let dy = 0;

        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            dy = -1;
        }
        if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            dy = 1;
        }
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            dx = -1;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            dx = 1;
        }

        this.player.move(dx, dy);
    }

    sendPosition() {
        console.log("Send")
        const currentPosition = { x: this.player.x, y: this.player.y };

        // Отправляем координаты в воркер
        this.senderWorker.postMessage({
            type: 'send',
            message: `MOVE;id:${this.userId};x:${currentPosition.x},y:${currentPosition.y}`
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
        // Отрисовываем своего игрока
        this.player.draw(this.ctx);
    
        // Отрисовываем других игроков с интерполяцией
        Object.values(this.otherPlayers).forEach(otherPlayer => {
            otherPlayer.draw(this.ctx);
        });

        // Increment the frame count
        this.frames++;

        // Draw FPS and TPS
        this.ctx.fillStyle = 'black';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`FPS: ${this.fps.toFixed(1)}`, 10, 30);
        this.ctx.fillText(`TPS: ${this.tps.toFixed(1)}`, 10, 60);
    }

    calculateFPS() {
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        this.fps = this.frames / (deltaTime / 1000);
        this.lastFrameTime = now;
        this.frames = 0;
    }

    calculateTPS() {
        const now = performance.now();
        const deltaTime = now - this.lastServerUpdateTime;
        this.tps = this.serverTicks / (deltaTime / 1000);
        this.lastServerUpdateTime = now;
        this.serverTicks = 0;
    }

    gameLoop() {
        this.update();
        this.draw();

        // Calculate FPS every second
        if (performance.now() - this.lastFrameTime >= 1000) {
            this.calculateFPS();
        }

        // Calculate TPS every second
        if (performance.now() - this.lastServerUpdateTime >= 1000) {
            this.calculateTPS();
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    sendNewPlayerMessage() {
        this.senderWorker.postMessage({ type: 'send', message: `NEW_PLAYER;id:${this.userId}` });
    }

    handleServerMessage(data) {
        if (data.type === 'PLAYER_LIST') {
            this.updateOtherPlayers(data.players);
            this.serverTicks++; // Increment server tick count for TPS calculation
        }
    }
}

// Инициализация игры
const gameEngine = new GameEngine('gameCanvas', 'ws://103.13.211.120:8080');
