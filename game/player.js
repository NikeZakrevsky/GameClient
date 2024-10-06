import { bowTexture, shadowTexture, arrowTexture, bodyTexture } from '../assets/assetLoader.js';
import { checkCollision, borderCollision } from './collision.js'

const radius = 10;

export function createPlayerContainer() {
    const playerContainer = new PIXI.Container();

    const body = new PIXI.Sprite(bodyTexture);
    const bow = new PIXI.Sprite(bowTexture);
    const arrow = new PIXI.Sprite(arrowTexture);
    const shadow = new PIXI.Sprite(shadowTexture);

    shadow.anchor.set(0.5, 0.5);
    bow.anchor.set(0, 0.5);
    arrow.anchor.set(0, 1);
    body.anchor.set(0.5, 0.5);

    body.scale.set(1.3);
    bow.scale.set(0.9);
    arrow.scale.set(0.9);

    shadow.y = body.height / 2;
    bow.x += 10;
    arrow.x += 10;
    shadow.alpha = 0.5;

    playerContainer.addChild(shadow, body, bow, arrow);

    return playerContainer
}

export function updatePlayerSprite(playerContainer, player) {
    const bow = playerContainer.children[2];
    const arrow = playerContainer.children[3];

    playerContainer.x = player.x;
    playerContainer.y = player.y;

    bow.x = Math.cos(player.lookDirection) * radius;
    bow.y = Math.sin(player.lookDirection) * radius;
    bow.rotation = player.lookDirection;

    arrow.x = bow.x + Math.cos(player.lookDirection);
    arrow.y = bow.y + Math.sin(player.lookDirection);
    arrow.rotation = player.lookDirection;

    const body = playerContainer.children[1];
    body.scale.x = (player.lookDirection < Math.PI / 2 && player.lookDirection > -Math.PI / 2) ? 1.3 : -1.3;
}

export function updatePlayerPosition(keys, mapContainer, playerContainer, obstacles, app) {
    const speed = 5;
    const bobAmount = 1.5;
    const bobSpeed = 0.04;
    const originalY = app.renderer.height / 2

    let moveX = 0, moveY = 0, isMoving = false;

    if (keys['w']) { moveY += speed; isMoving = true; }
    if (keys['s']) { moveY -= speed; isMoving = true; }
    if (keys['a']) { moveX += speed; isMoving = true; }
    if (keys['d']) { moveX -= speed; isMoving = true; }

    const newMapX = mapContainer.x + moveX;
    const newMapY = mapContainer.y + moveY;

    const playerTranslated = { x: playerContainer.x - newMapX, y: playerContainer.y - newMapY };

    if (!checkCollision(playerTranslated, playerContainer.width, playerContainer.height, obstacles) && !borderCollision(playerTranslated)) {
        mapContainer.x = newMapX;
        mapContainer.y = newMapY;

        if (isMoving) {
            playerContainer.y = originalY + Math.sin(app.ticker.lastTime * bobSpeed) * bobAmount;
        } else {
            playerContainer.y = originalY;
        }
    }
}