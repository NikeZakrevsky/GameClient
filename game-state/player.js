class Player {
    constructor(id, position, rotation) {
        this.id = id;
        this.position = position;
        this.rotation = rotation;
    }

    update(position, rotation) {
        this.position = position;
        this.rotation = rotation;
    }
}