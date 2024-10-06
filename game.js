import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@10.0.0/+esm';
import { loadAssets } from './assets/assetLoader.js';
import { bowTexture, bowAltTexture, shadowTexture, treeTexture } from '../assets/assetLoader.js';
import { createPlayerContainer, updatePlayerSprite, updatePlayerPosition } from './game/player.js';
import { updateBullets } from './game/bullet.js'

const app = new PIXI.Application({ background: "#2e313d", resizeTo: window });
document.body.appendChild(app.view);

await loadAssets();

const serverUrl = 'ws://localhost:8080'
const userId = uuidv4();
const playerSprites = {};
const keys = {};
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

app.ticker.add(() => updatePlayerPosition(keys, mapContainer, playerContainer, obstacles, app));

function handleWorkerMessage(event) {
    const { type, data } = event.data;

    if (type === 'serverMessage') {
        const parsedData = JSON.parse(data);
        switch (parsedData.type) {
            case 'PLAYER_LIST':
                updateOtherPlayers(parsedData.players);
                updateBullets(parsedData.players, mapContainer, obstacles);
                break;
            case 'MAP':
                createMap(parsedData.trees);
                break;
        }
    }
}

sendNewPlayerMessage();

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