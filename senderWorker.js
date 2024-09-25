let socket = null;
const messageQueue = [];

// Инициализация WebSocket
onmessage = (event) => {
    const { type, serverUrl, message } = event.data;

    if (type === 'init') {
        socket = new WebSocket(serverUrl);

        socket.onopen = () => {
            console.log('WebSocket (Worker) connection established');
            // Отправляем все сообщения из очереди
            messageQueue.forEach(msg => socket.send(msg));
            messageQueue.length = 0; // Очищаем очередь
        };

        socket.onmessage = (event) => {
            postMessage({ type: 'serverMessage', data: event.data });
        };

        socket.onclose = () => {
            console.log('WebSocket (Worker) connection closed');
        };
    }

    if (type === 'send') {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        } else {
            messageQueue.push(message); // Добавляем в очередь, если соединение не открыто
        }
    }
};
