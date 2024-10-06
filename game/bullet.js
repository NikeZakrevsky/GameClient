import { arrowTexture } from '../assets/assetLoader.js';
import { rectanglesIntersect } from './collision.js';

const bullets = {};

export function updateBullets(players, mapContainer, obstacles) {
    players.forEach(player => {
        if (!player.bullets || player.bullets.length === 0) {
            if (bullets[player.playerId]) {
                bullets[player.playerId].forEach(bullet => mapContainer.removeChild(bullet));
                delete bullets[player.playerId];
            }
            return;
        }

        if (!bullets[player.playerId]) {
            bullets[player.playerId] = [];
        }

        player.bullets.forEach((bulletData, index) => {
            let bulletSprite = bullets[player.playerId][index];


            if (!bulletSprite) {
                bulletSprite = new PIXI.Sprite(arrowTexture);
                bulletSprite.anchor.set(0.5, 0.5); 
                bulletSprite.scale.set(0.7);
                mapContainer.addChild(bulletSprite);
                bullets[player.playerId][index] = bulletSprite;
            }


            bulletSprite.x = bulletData.x;
            bulletSprite.y = bulletData.y;
            bulletSprite.rotation = bulletData.angle;


            if (bulletOutOfBounds(bulletData) || bulletHitObstacle(bulletData, obstacles)) {
                mapContainer.removeChild(bulletSprite);
                bullets[player.playerId].splice(index, 1);
            }
        });
    });
}

function bulletOutOfBounds(bulletData) {
    return bulletData.x < 0 || bulletData.x > 2000 || bulletData.y < 0 || bulletData.y > 2000;
}

function bulletHitObstacle(bulletData, obstacles) {
    for (const obstacle of obstacles) {
        const bulletBounds = new PIXI.Rectangle(bulletData.x, bulletData.y, 10, 10);
        if (rectanglesIntersect(bulletBounds, obstacle)) {
            return true;
        }
    }
    return false;
}