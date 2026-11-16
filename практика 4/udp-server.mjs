import dgram from 'node:dgram';

const HOST = '127.0.0.1';
const PORT = 3011;

function handleCommand(command) {
  if (command === 'PING') return 'PONG';
  if (command === 'TIME') return new Date().toISOString();
  return 'UNKNOWN';
}

const server = dgram.createSocket('udp4');

server.on('message', (data, sender) => {
  const command = data.toString('utf8').trim();
  console.log('UDP от ' + sender.address + ':' + sender.port + ': ' + command);

  const answer = handleCommand(command);

  server.send(answer, sender.port, sender.address, (error) => {
    if (error) console.error('Ошибка отправки:', error.message);
  });
});

server.on('error', (error) => {
  console.error('UDP сервер:', error.message);
  server.close();
});

server.bind(PORT, HOST, () => {
  console.log('UDP сервер: ' + HOST + ':' + PORT);
});
