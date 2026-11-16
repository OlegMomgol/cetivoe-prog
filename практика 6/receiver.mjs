import dgram from 'node:dgram';
import { createInterface } from 'node:readline';

const PORT = 3030;
const GROUP_A = '239.255.10.10';   
const GROUP_B = '239.255.10.11';  
const IFACE = process.env.MULTICAST_IFACE; 

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

function stamp() {
  return new Date().toISOString();
}

socket.on('message', (buffer, sender) => {
  console.log(
    '[' + stamp() + '] [RECEIVED] ' +
    buffer.toString('utf8') +
    ' FROM ' + sender.address + ':' + sender.port
  );
});

socket.on('error', (error) => {
  console.error('[RECEIVER ERROR]', error.message);
  socket.close();
});

socket.on('close', () => {
  console.log('Приёмник остановлен');
  rl.close();
});

socket.bind(PORT, '0.0.0.0', () => {
  console.log('UDP приёмник: порт ' + PORT);

  for (const group of [GROUP_A, GROUP_B]) {
    try {
      socket.addMembership(group, IFACE);
      console.log('Подписка на группу: ' + group);
    } catch (error) {
      console.log('Multicast ' + group + ' недоступен:', error.message);
    }
  }

  console.log('Unicast/Broadcast по-прежнему можно проверить');
});

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'receiver> '
});

rl.on('line', (line) => {
  const cmd = line.trim().toUpperCase();
  if (cmd === 'STOP') {
    console.log('Локальная команда STOP: завершаем приёмник');
    try {
      socket.dropMembership(GROUP_A, IFACE);
      socket.dropMembership(GROUP_B, IFACE);
    } catch {  }
    socket.close();
  } else if (cmd) {
    console.log('Неизвестная локальная команда. Доступно: STOP');
  }
  rl.prompt();
});

rl.prompt();
