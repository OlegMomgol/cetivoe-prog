import dgram from 'node:dgram';

const PORT = 3030;
const GROUP_A = '239.255.10.10';
const GROUP_B = '239.255.10.11';

const mode = (process.argv[2] || 'unicast').toLowerCase();

let target;
let text;

if (mode === 'multicast') {
  const which = (process.argv[3] || 'group-a').toLowerCase();
  text = process.argv[4] || 'MULTICAST: NetLab announcement';
  target = which === 'group-b' ? GROUP_B : GROUP_A;
} else {
  target = process.argv[3];
  text = process.argv[4] || (mode.toUpperCase() + ': NetLab announcement');
}

const usage = () => {
  console.log('Использование:');
  console.log('  node sender.mjs unicast   <IP>        "текст"');
  console.log('  node sender.mjs broadcast <BCAST-IP>  "текст"');
  console.log('  node sender.mjs multicast [group-a|group-b] "текст"');
  process.exit(1);
};

if (!target) usage();
if (!['unicast', 'broadcast', 'multicast'].includes(mode)) usage();

const socket = dgram.createSocket('udp4');

socket.on('error', (error) => {
  console.error('[SENDER ERROR]', error.message);
  socket.close();
});

socket.bind(0, '0.0.0.0', () => {
  try {
    if (mode === 'broadcast') {
      socket.setBroadcast(true);
    }

    if (mode === 'multicast') {
      socket.setMulticastTTL(1);         
      socket.setMulticastLoopback(true);  
      if (process.env.MULTICAST_IFACE) {
        socket.setMulticastInterface(process.env.MULTICAST_IFACE);
      }
    }
  } catch (error) {
    console.error('Настройка сокета:', error.message);
    socket.close();
    return;
  }

  socket.send(text, PORT, target, (error) => {
    if (error) {
      console.error('Отправка не удалась:', error.message);
    } else {
      console.log('Датаграмма передана ОС:', text);
      console.log('Режим:', mode, '→ Назначение:', target + ':' + PORT);
      console.log('Примечание: это НЕ подтверждение доставки получателю.');
    }
    socket.close();
  });
});
