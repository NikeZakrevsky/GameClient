import { Player } from './player.js';

class GameEngine {
    constructor(canvasId, serverUrl) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.player = new Player(100, 100, 'player.png', this.canvas.width, this.canvas.height);
        this.keys = {};
        this.bindEvents();

        this.userId = Date.now()
        // Создаем WebSocket соединение
        this.socket = new WebSocket(serverUrl);
        this.socket.onopen = () => {
            console.log('WebSocket connection established');
            this.isConnected = true; // устанавливаем флаг соединения
            this.sendNewPlayerMessage();
        };
        this.socket.onmessage = (event) => {
            console.log('Message from server:', event.data);
        };
        this.socket.onclose = () => {
            console.log('WebSocket connection closed');
            this.isConnected = false; // обновляем флаг соединения
        };

        this.lastPosition = { x: this.player.x, y: this.player.y }; // хранение последней позиции
        this.gameLoop();
    }

    bindEvents() {
        window.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
    }

    update() {
        let dx = 0;
        let dy = 0;

        // Обработка нажатых клавиш
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            dy = -1; // движение вверх
        }
        if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            dy = 1; // движение вниз
        }
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            dx = -1; // движение влево
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            dx = 1; // движение вправо
        }

        // Обновляем позицию игрока
        this.player.move(dx, dy);

        // Отправляем новые координаты на сервер, если они изменились
        this.sendPosition();
    }

    sendPosition() {
        const currentPosition = { x: this.player.x, y: this.player.y };

        // Проверяем, изменились ли координаты
        if (this.isConnected && 
            (currentPosition.x !== this.lastPosition.x || currentPosition.y !== this.lastPosition.y)) {
            this.socket.send(`MOVE;id:${this.userId},x:${currentPosition.x},y:${currentPosition.y}`); // отправляем координаты в формате JSON
            this.lastPosition = currentPosition; // обновляем последнюю позицию
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // очищаем канвас
        this.player.draw(this.ctx);
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop()); // продолжаем цикл
    }

    sendNewPlayerMessage() {
        if (this.isConnected) {
            this.socket.send(`NEW_PLAYER;id:${this.userId}`); // отправляем сообщение о новом игроке
        }
    }
}

// Инициализация игры
const gameEngine = new GameEngine('gameCanvas', 'ws://localhost:8080'); // замените на URL вашего WebSocket сервера
