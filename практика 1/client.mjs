import net from 'node:net';

const HOST = '127.0.0.1';
const PORT = 3000;
// 4
const MESSAGE = process.argv[2] || 'EVENT: PC-07 REQUEST_HELP';

const socket = net.createConnection({ host: HOST, port: PORT }, () => {
  console.log('Соединение с NetLab установлено');
  socket.write(MESSAGE + '\n');
});

socket.setEncoding('utf8');

socket.on('data', (chunk) => {
  console.log('Ответ сервера: ' + chunk.trim());
  socket.end();
});

// 5
socket.on('error', (error) => {
  console.error('Не удалось подключиться: ' + error.message);
});

// 6
socket.on('close', () => {
  console.log('Соединение закрыто');
});
