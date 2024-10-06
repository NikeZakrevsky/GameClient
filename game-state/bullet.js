class Bullet {
    constructor(id, position, angle) {
        this.id = id;
        this.position = position;
        this.angle = angle;
    }

    update(position) {
        this.position = position;
    }
}