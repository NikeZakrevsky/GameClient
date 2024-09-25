export class Player {
    constructor(x, y, imageId, canvasWidth, canvasHeight) {
        this.x = x;
        this.y = y;
        this.imageId = imageId;
        this.speed = 5; // скорость движения игрока
        this.image = new Image();
        this.image.src = imageId; // загружаем изображение
        this.canvasWidth = canvasWidth; // ширина канваса
        this.canvasHeight = canvasHeight; // высота канваса
        this.width = 50; // ширина изображения игрока (настраивайте под ваше изображение)
        this.height = 50; // высота изображения игрока (настраивайте под ваше изображение)
    }

    update() {
        // обновляем позицию игрока (метод можно расширить по необходимости)
    }

    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y);
    }

    move(dx, dy) {
        // Рассчитываем новые координаты
        const newX = this.x + dx * this.speed;
        const newY = this.y + dy * this.speed;

        // Проверяем границы канваса
        if (newX >= 0 && newX + this.width <= this.canvasWidth) {
            this.x = newX; // обновляем позицию по X, если в пределах границ
        }
        if (newY >= 0 && newY + this.height <= this.canvasHeight) {
            this.y = newY; // обновляем позицию по Y, если в пределах границ
        }
    }
}
