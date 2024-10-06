const app = new PIXI.Application({ background: "#2e313d", resizeTo: window });
document.body.appendChild(app.view);

let bowTexture, bowAltTexture, shadowTexture, arrowTexture, bodyTexture, treeTexture;

await loadAssets();

const serverUrl = 'ws://localhost:8080'
const userId = uuidv4();
const playerSprites = {};
const keys = {};
const bullets = {};
const radius = 10;
const obstacles = [];

const playerContainer = createPlayerContainer();
const mapContainer = new PIXI.Container();

playerContainer.x = app.renderer.screen.width / 2;
playerContainer.y = app.renderer.screen.height / 2;

app.stage.addChild(mapContainer);
app.stage.addChild(playerContainer);

const senderWorker = new Worker('senderWorker.js');
senderWorker.postMessage({ type: 'init', serverUrl });
senderWorker.onmessage = handleWorkerMessage;

setupKeyboardListeners(keys);
setupMouseMovement(playerContainer);

app.ticker.add(() => updatePlayerPosition(keys, mapContainer, playerContainer, obstacles));

async function loadAssets() {
    await PIXI.Assets.load(
        ['images/player.png', 'images/arrow.png', 'images/shadow.png', 'images/bow.png', 'images/bow_alt.png', 'images/tree.png']
    );

    bowTexture = PIXI.Texture.from('images/bow.png');
    bowAltTexture = PIXI.Texture.from('images/bow_alt.png');
    shadowTexture = PIXI.Texture.from('images/shadow.png');
    arrowTexture = PIXI.Texture.from('images/arrow.png');
    bodyTexture = PIXI.Texture.from('images/player.png')
    treeTexture = PIXI.Texture.from('images/tree.png')
}

function handleWorkerMessage(event) {
    const { type, data } = event.data;

    if (type === 'serverMessage') {
        const parsedData = JSON.parse(data);
        switch (parsedData.type) {
            case 'PLAYER_LIST':
                updateOtherPlayers(parsedData.players);
                updateBullets(parsedData.players);
                break;
            case 'MAP':
                createMap(parsedData.trees);
                break;
        }
    }
}

sendNewPlayerMessage();

function updateBullets(players) {
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


            if (bulletOutOfBounds(bulletData) || bulletHitObstacle(bulletData)) {
                mapContainer.removeChild(bulletSprite);
                bullets[player.playerId].splice(index, 1);
            }
        });
    });
}

function bulletOutOfBounds(bulletData) {
    return bulletData.x < 0 || bulletData.x > 2000 || bulletData.y < 0 || bulletData.y > 2000;
}

function bulletHitObstacle(bulletData) {
    for (const obstacle of obstacles) {
        const bulletBounds = new PIXI.Rectangle(bulletData.x, bulletData.y, 10, 10);
        if (rectanglesIntersect(bulletBounds, obstacle)) {
            return true;
        }
    }
    return false;
}

function updateOtherPlayers(players) {
    players.forEach(player => {
        if (player.playerId !== userId) {
            let otherPlayerContainer = playerSprites[player.id];
            if (!otherPlayerContainer) {
                otherPlayerContainer = createPlayerContainer();
                playerSprites[player.id] = otherPlayerContainer;
                mapContainer.addChild(otherPlayerContainer);
            }
            updatePlayerSprite(otherPlayerContainer, player);
        }
    });
}

function updatePlayerSprite(playerContainer, player) {
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

function createTreeSprite(data) {
    const tree = new PIXI.Sprite(treeTexture);
    tree.x = data.x;
    tree.y = data.y;
    return tree;
}

function createShadowSprite(tree) {
    const shadow = new PIXI.Sprite(shadowTexture);
    shadow.anchor.set(0.5, 0.5);
    shadow.x = tree.x + tree.width / 2;
    shadow.y = tree.y + tree.height / 2 + 45;
    shadow.alpha = 0.5;
    return shadow;
}

async function createMap(trees) {

    trees.forEach(treeData => {
        const tree = createTreeSprite(treeData);
        const shadow = createShadowSprite(tree);

        mapContainer.addChild(shadow, tree);
        obstacles.push(tree.getBounds());
    });

    return obstacles;
}

function translatePlayerPosition() {
    return { x: playerContainer.x - mapContainer.x, y: playerContainer.y - mapContainer.y }
}

function startPositionSending() {
    sendPosition();
    requestAnimationFrame(startPositionSending);
}

startPositionSending();

function sendPosition() {
    const currentPosition = translatePlayerPosition();
    
    let message = {
        'playerId': userId,
        'event': 'MOVE',
        'position': {
            x: currentPosition.x,
            y: currentPosition.y
        },
        'lookDirection': playerContainer.children[2].rotation
    };

    senderWorker.postMessage({
        type: 'send',
        message: JSON.stringify(message)
    });
}

function sendNewPlayerMessage() {

    let message = {
        'playerId': userId,
        'event': 'NEW_PLAYER'
    };

    senderWorker.postMessage({ 
        type: 'send',
        message: JSON.stringify(message)
    });
}

function createPlayerContainer() {
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

function setupKeyboardListeners() {
    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);
}

function setupMouseMovement() {
    window.addEventListener('mousemove', event => updatePlayerRotation(event.clientX, event.clientY));
    window.addEventListener('mousedown', () => playerContainer.children[2].texture = bowAltTexture);
    window.addEventListener('mouseup', shootArrow);
}

function updatePlayerRotation(mouseX, mouseY) {
    const dx = mouseX - playerContainer.x;
    const dy = mouseY - playerContainer.y;
    const angle = Math.atan2(dy, dx);

    const bow = playerContainer.children[2];
    const arrow = playerContainer.children[3];

    bow.x = Math.cos(angle) * radius;
    bow.y = Math.sin(angle) * radius;
    bow.rotation = angle;

    arrow.x = bow.x + Math.cos(angle);
    arrow.y = bow.y + Math.sin(angle);
    arrow.rotation = angle;

    const body = playerContainer.children[1];
    body.scale.x = (angle < Math.PI / 2 && angle > -Math.PI / 2) ? 1.3 : -1.3;
}

function shootArrow() {
    playerContainer.children[2].texture = bowTexture;

    const message = {
        playerId: userId,
        event: 'SHOOT',
        position: translatePlayerPosition(),
        angle: playerContainer.children[2].rotation
    };

    senderWorker.postMessage({
        type: 'send',
        message: JSON.stringify(message)
    });
}

// function shootArrow(playerContainer) {
//     const arrow = PIXI.Sprite.from('images/arrow.png');
//     arrow.anchor.set(0.5, 1);
//     arrow.scale.set(0.9);

//     const bow = playerContainer.children[2];
//     arrow.x = playerContainer.x + bow.x;
//     arrow.y = playerContainer.y + bow.y;

//     const angle = bow.rotation;
//     const speed = 10;
//     arrow.rotation = angle;

//     app.stage.addChild(arrow);
//     const moveArrow = () => {
//         arrow.x += Math.cos(angle) * speed;
//         arrow.y += Math.sin(angle) * speed;

//         if (arrow.x < 0 || arrow.x > app.renderer.width || arrow.y < 0 || arrow.y > app.renderer.height) {
//             arrow.destroy();
//         } else {
//             requestAnimationFrame(moveArrow);
//         }
//     };

//     moveArrow();
// }

function updatePlayerPosition(keys, mapContainer, playerContainer, obstacles) {
    const speed = 5;
    const bobAmount = 1.5;
    const bobSpeed = 0.04;
    const originalY = app.renderer.height / 2;

    let moveX = 0, moveY = 0, isMoving = false;

    if (keys['w']) { moveY += speed; isMoving = true; }
    if (keys['s']) { moveY -= speed; isMoving = true; }
    if (keys['a']) { moveX += speed; isMoving = true; }
    if (keys['d']) { moveX -= speed; isMoving = true; }

    const newMapX = mapContainer.x + moveX;
    const newMapY = mapContainer.y + moveY;

    const playerTranslated = { x: playerContainer.x - newMapX, y: playerContainer.y - newMapY };

    if (!checkCollision(playerTranslated) && !borderCollision(playerTranslated)) {
        mapContainer.x = newMapX;
        mapContainer.y = newMapY;

        if (isMoving) {
            playerContainer.y = originalY + Math.sin(app.ticker.lastTime * bobSpeed) * bobAmount;
        } else {
            playerContainer.y = originalY;
        }
    }
}

function borderCollision(position) {
    return position.x < 0 || position.x > 2000 || position.y < 0 || position.y > 2000;
}

function checkCollision(position) {
    const playerBounds = new PIXI.Rectangle(position.x, position.y, playerContainer.width, playerContainer.height);
    return obstacles.some(obstacle => rectanglesIntersect(playerBounds, obstacle));
}

function rectanglesIntersect(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}