import net from 'node:net';

const HOST = '127.0.0.1';
const PORT = 3003;

const clients = new Map();
let nextId = 1;

function send(socket, text) {
  if (!socket.destroyed && !socket.writableEnded) {
    socket.write(text + '\n');
  }
}

function broadcast(text, except = null) {
  for (const socket of clients.keys()) {
    if (socket !== except) send(socket, text);
  }
}

function isNameTaken(name, exceptSocket = null) {
  for (const [socket, info] of clients) {
    if (socket !== exceptSocket && info.name.toLowerCase() === name.toLowerCase()) {
      return true;
    }
  }
  return false;
}

function findSocketByName(name) {
  for (const [socket, info] of clients) {
    if (info.name.toLowerCase() === name.toLowerCase()) return socket;
  }
  return null;
}

const server = net.createServer((socket) => {
  const name = 'user-' + nextId++;
  const info = {
    name,
    address: socket.remoteAddress,
    port: socket.remotePort,
  };
  clients.set(socket, info);
  socket.setEncoding('utf8');

  let pending = '';

  console.log(
    `[+] ${name} подключился (${info.address}:${info.port}). Онлайн: ${clients.size}`
  );

  send(socket, 'WELCOME ' + name);
  send(socket, 'Команды: /say текст, /list, /online, /name Имя, /me действие, /to Имя текст, /quit');
  broadcast('[SYSTEM] ' + name + ' вошёл в чат', socket);

  socket.on('data', (chunk) => {
    pending += chunk;

    let index;
    while ((index = pending.indexOf('\n')) !== -1) {
      const command = pending.slice(0, index).trim();
      pending = pending.slice(index + 1);

      if (!command) continue;

      if (command == '/list') {
        const names = [...clients.values()].map((c) => c.name).join(', ');
        send(socket, 'Онлайн: ' + names);
        continue;
      }

      if (command === '/online') {
        send(socket, 'ONLINE: ' + clients.size);
        continue;
      }
      
      if (command.startsWith('/name ')) {
        const newName = command.slice(6).trim();

        if (!newName) {
          send(socket, 'ERROR: имя не может быть пустым');
          continue;
        }
        if (/\s/.test(newName)) {
          send(socket, 'ERROR: имя не должно содержать пробелов');
          continue;
        }
        if (isNameTaken(newName, socket)) {
          send(socket, 'ERROR: имя "' + newName + '" уже занято');
          continue;
        }

        const oldName = info.name;
        info.name = newName; 
        send(socket, 'OK: имя изменено на ' + newName);
        broadcast('[SYSTEM] ' + oldName + ' теперь ' + newName, socket);
        console.log(`[~] ${oldName} -> ${newName}`);
        continue;
      }

      if (command.startsWith('/say ')) {
        const message = command.slice(5).trim();
        if (!message) {
          send(socket, 'ERROR: пустое сообщение');
          continue;
        }
        broadcast('[' + info.name + '] ' + message, socket);
        send(socket, 'SENT: ' + message);
        continue;
      }

      if (command.startsWith('/me ')) {
        const action = command.slice(4).trim();
        if (!action) {
          send(socket, 'ERROR: пустое действие');
          continue;
        }
        broadcast('* ' + info.name + ' ' + action, socket);
        send(socket, 'SENT: * ' + info.name + ' ' + action);
        continue;
      }

      if (command.startsWith('/to ')) {
        const rest = command.slice(4).trim();
        const spaceIdx = rest.indexOf(' ');
        if (spaceIdx === -1) {
          send(socket, 'ERROR: используйте /to Имя Сообщение');
          continue;
        }
        const targetName = rest.slice(0, spaceIdx);
        const message = rest.slice(spaceIdx + 1).trim();
        if (!message) {
          send(socket, 'ERROR: пустое сообщение');
          continue;
        }
        const targetSocket = findSocketByName(targetName);
        if (!targetSocket) {
          send(socket, 'ERROR: пользователь "' + targetName + '" не найден');
          continue;
        }
        send(targetSocket, '[PM от ' + info.name + '] ' + message);
        send(socket, 'SENT (PM to ' + targetName + '): ' + message);
        continue;
      }

      if (command '/quit') {
        socket.end('BYE\n');
        return;
      }

      send(socket, 'ERROR: неизвестная команда');
    }

    if (pending.length > 2048) {
      socket.end('ERROR: строка слишком длинная\n');
    }
  });

  socket.on('close', () => {
    const info = clients.get(socket);
    clients.delete(socket);
    broadcast('[SYSTEM] ' + (info ? info.name : '?') + ' вышел из чата');
    console.log(
      `[-] ${info ? info.name : '?'} отключился. Онлайн: ${clients.size}`
    );
  });

  socket.on('error', (error) => {
    console.error((clients.get(socket)?.name || 'socket') + ': ' + error.message);
  });
});

server.on('error', (error) => {
  console.error('Ошибка сервера:', error.message);
});

server.listen(PORT, HOST, () => {
  console.log('NetLab Chat: ' + HOST + ':' + PORT);
});
