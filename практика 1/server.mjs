import net from 'node:net';

const HOST = '127.0.0.1';
const PORT = 3000;

let connectionCount = 0;

const server = net.createServer((socket) => {
  connectionCount++;

  console.log(
    'Подключился клиент: ' +
      socket.remoteAddress + ':' + socket.remotePort
  );
  console.log('Подключений с момента старта: ' + connectionCount);

  socket.setEncoding('utf8');

  socket.on('data', (chunk) => {
    const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    const message = chunk.trim();
    console.log(`[${time}] ${message}`);
    socket.write('ACK: ' + chunk);
  });

  socket.on('end', () => {
    console.log('Клиент завершил соединение');
  });

  socket.on('error', (error) => {
    console.error('Ошибка клиента: ' + error.message);
  });
});

server.on('error', (error) => {
  console.error('Ошибка сервера: ' + error.message);
});

server.listen(PORT, HOST, () => {
  console.log('NetLab v1.0 — сервер запущен');
  console.log('NetLab ожидает подключения: ' + HOST + ':' + PORT);
});
