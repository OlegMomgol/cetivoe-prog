import dgram from 'node:dgram';
import { performance } from 'node:perf_hooks';

const MESSAGE = 'PING'; 

const HOST = '127.0.0.1';
const PORT = 3011;

const client = dgram.createSocket('udp4');
let completed = false;
let startedAt = null;

const timer = setTimeout(() => {
  if (completed) return;
  completed = true;
  console.log('UDP: ответ не получен за 2 секунды');
  client.close();
}, 2000);

client.on('message', (data, sender) => {
  if (completed) return;
  completed = true;
  clearTimeout(timer);

  const elapsed = performance.now() - startedAt;
  console.log('UDP ответ: ' + data.toString('utf8'));
  console.log('Отправитель: ' + sender.address + ':' + sender.port);
  console.log('UDP время (мс): ' + elapsed.toFixed(3));

  client.close();
});

client.on('error', (error) => {
  console.error('UDP ошибка:', error.message);
  if (!completed) {
    completed = true;
    clearTimeout(timer);
  }
  client.close();
});

startedAt = performance.now();
client.send(MESSAGE, PORT, HOST, (error) => {
  if (error) {
    console.error('Ошибка отправки:', error.message);
  } else {
    console.log('UDP: датаграмма передана ОС');
  }
});
