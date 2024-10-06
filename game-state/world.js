class World {
    constructor() {
        this.players = {};
        this.bullets = {};
        this.map = null;
    }

    addPlayer(id, position, rotation) {
        this.players[id] = new Player(id, position, rotation);
    }

    updatePlayer(id, position, rotation) {
        if (this.players[id]) {
            this.players[id].update(position, rotation);
        }
    }

    removePlayer(id) {
        delete this.players[id];
    }

    addBullet(id, position, angle) {
        this.bullets[id] = new Bullet(id, position, angle);
    }

    updateBullet(id, position) {
        if (this.bullets[id]) {
            this.bullets[id].update(position);
        }
    }

    setMap(trees) {
        this.map = new GameMap(trees);
    }
}