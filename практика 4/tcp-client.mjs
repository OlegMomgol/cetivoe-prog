import net from 'node:net';
import { performance } from 'node:perf_hooks';

const MESSAGE = 'PING'; 

const socket = net.createConnection({
  host: '127.0.0.1',
  port: 3010
});

socket.setEncoding('utf8');

let startedAt = null;

socket.on('connect', () => {
  console.log('TCP: соединение установлено');
  socket.write(MESSAGE + '\n');
});

socket.on('data', (chunk) => {
  const elapsed = performance.now() - startedAt;
  console.log('TCP ответ: ' + chunk.trim());
  console.log('TCP время (мс): ' + elapsed.toFixed(3));
});

socket.on('close', () => {
  console.log('TCP: соединение закрыто');
});

socket.on('error', (error) => {
  console.error('TCP ошибка:', error.code, error.message);
});

startedAt = performance.now();
socket.emit('connect-start', startedAt); 
