import { Player } from './player.js';

class GameEngine {
    constructor(canvasId, serverUrl) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.player = new Player(100, 100, 'player.png', this.canvas.width, this.canvas.height);
        this.otherPlayers = {};
        this.keys = {};
        this.bindEvents();

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

        this.startPositionSending();
        this.gameLoop();
    }

    uuidv4() {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
          (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
    }

    startPositionSending() {
        setInterval(() => {
            this.sendPosition();
        }, 16); // Отправляем координаты каждые 50 мс
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
        this.otherPlayers = []
        players.forEach(playerData => {
            if (playerData.playerId !== this.userId) {
                if (!this.otherPlayers[playerData.playerId]) {
                    this.otherPlayers[playerData.playerId] = {
                        player: new Player(playerData.x, playerData.y, 'player.png', this.canvas.width, this.canvas.height),
                        previousPosition: { x: playerData.x, y: playerData.y },
                        targetPosition: { x: playerData.x, y: playerData.y },
                        interpolationTime: 0
                    };
                } else {
                    const otherPlayer = this.otherPlayers[playerData.playerId];
                    otherPlayer.previousPosition = { ...otherPlayer.targetPosition };
                    otherPlayer.targetPosition = { x: playerData.x, y: playerData.y };
                    otherPlayer.interpolationTime = 0;
                }
            }
        });
    }

    interpolatePlayer(otherPlayer) {
        const t = Math.min(otherPlayer.interpolationTime / 150, 1); // Интерполяция между предыдущей и целевой позицией
        otherPlayer.player.x = otherPlayer.previousPosition.x + t * (otherPlayer.targetPosition.x - otherPlayer.previousPosition.x);
        otherPlayer.player.y = otherPlayer.previousPosition.y + t * (otherPlayer.targetPosition.y - otherPlayer.previousPosition.y);
        otherPlayer.interpolationTime += 16; // Ожидаем, что requestAnimationFrame работает примерно с частотой 60fps (16 мс на кадр)
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

        // Обновляем позиции других игроков
        Object.values(this.otherPlayers).forEach(otherPlayer => {
            this.interpolatePlayer(otherPlayer);
        });
    }

    sendPosition() {
        const currentPosition = { x: this.player.x, y: this.player.y };

        // Отправляем координаты в воркер
        this.senderWorker.postMessage({
            type: 'send',
            message: `MOVE;id:${this.userId};x:${currentPosition.x},y:${currentPosition.y}`
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.player.draw(this.ctx);
        Object.values(this.otherPlayers).forEach(otherPlayer => {
            otherPlayer.player.draw(this.ctx);
        });
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    sendNewPlayerMessage() {
        this.senderWorker.postMessage({ type: 'send', message: `NEW_PLAYER;id:${this.userId}` });
    }

    handleServerMessage(data) {
        if (data.type === 'PLAYER_LIST') {
            this.updateOtherPlayers(data.players);
        }
    }
}

// Инициализация игры
const gameEngine = new GameEngine('gameCanvas', 'ws://103.13.211.120:8080');
