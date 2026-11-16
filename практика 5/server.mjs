import net from 'node:net';

const HOST = '127.0.0.1';
const PORT = 3020;
const MAX_CLIENTS = 5;          
const IDLE_MS = 20_000;
const IDLE_WARN_MS = 15_000;     
const MAX_LINE_BYTES = 1024;

const clients = new Map();
let nextId = 1;


function ts() {
  return new Date().toISOString();
}

function send(socket, line) {
  if (!socket.destroyed && !socket.writableEnded) {
    socket.write(line + '\n');
  }
}

function broadcast(line, except = null) {
  for (const socket of clients.keys()) {
    if (socket !== except) send(socket, line);
  }
}

function buildHelp() {
  return [
    'HELP   — список команд',
    'PING   — проверка связи (PONG)',
    'STATS  — число клиентов и команд',
    'SAY X  — сообщение всем участникам',
    'WHO    — список подключённых пользователей',
    'IDLE   — время бездействия текущего клиента',
    'QUIT   — отключиться'
  ].join('\n');
}

const server = net.createServer((socket) => {
  socket.setEncoding('utf8');

  socket.on('error', (error) => {
    console.error('[SOCKET ERROR]', ts(), error.code, error.message);
  });

  if (clients.size >= MAX_CLIENTS) {
    socket.end('ERROR SERVER_FULL\n');
    return;
  }

  const id = 'user-' + nextId++;
  const state = {
    id,
    pending: '',
    commands: 0,
    lastActivity: Date.now()   
  };

  clients.set(socket, state);
  socket.setTimeout(IDLE_MS);

  const warnTimer = setTimeout(() => {
    if (clients.has(socket)) {
      send(socket, 'WARNING IDLE: соединение будет закрыто через 5 с');
      console.log('[WARN]', ts(), id);
    }
  }, IDLE_WARN_MS);

  console.log('[CONNECT]', ts(), id,
    socket.remoteAddress + ': ' + socket.remotePort);

  send(socket, 'WELCOME ' + id);
  broadcast('[SYSTEM] ' + id + ' joined', socket);

  socket.on('data', (chunk) => {
    state.pending += chunk;
    state.lastActivity = Date.now();  

    let index;
    while ((index = state.pending.indexOf('\n')) !== -1) {
      const line = state.pending.slice(0, index).trim();
      state.pending = state.pending.slice(index + 1);

      if (Buffer.byteLength(line, 'utf8') > MAX_LINE_BYTES) {
        socket.end('ERROR LINE_TOO_LONG\n');
        return;
      }

      if (!line) continue;

      state.commands++;
      state.lastActivity = Date.now();

      if (line === 'PING') {
        send(socket, 'PONG');

      } else if (line === 'STATS') {
        send(socket,
          'STATS clients=' + clients.size +
          ' commands=' + state.commands);

      } else if (line.startsWith('SAY ')) {
        const text = line.slice(4).trim();
        if (!text) {
          send(socket, 'ERROR EMPTY_MESSAGE');
        } else {
          broadcast('[' + id + '] ' + text, socket);
          send(socket, 'SENT');
        }

      } else if (line === 'WHO') {
        const rows = [];
        for (const s of clients.keys()) {
          const st = clients.get(s);
          rows.push(st.id + ' ' + s.remoteAddress + ':' + s.remotePort);
        }
        send(socket, 'WHO ' + rows.length + '\n' + rows.join('\n'));

      } else if (line === 'HELP') {
        send(socket, buildHelp());

      } else if (line === 'IDLE') {
        const sec = Math.floor((Date.now() - state.lastActivity) / 1000);
        send(socket, 'IDLE ' + sec + 's');

      } else if (line === 'QUIT') {
        socket.end('BYE\n');
        return;

      } else {
        send(socket, 'ERROR UNKNOWN_COMMAND');
      }
    }

    if (Buffer.byteLength(state.pending, 'utf8') > MAX_LINE_BYTES) {
      socket.end('ERROR LINE_TOO_LONG\n');
    }
  });

  socket.on('timeout', () => {
    console.log('[TIMEOUT]', ts(), id);
    socket.end('ERROR IDLE_TIMEOUT\n');
  });

  socket.on('close', () => {
    clearTimeout(warnTimer);             
    if (!clients.delete(socket)) return;
    console.log('[CLOSE]', ts(), id, 'active=' + clients.size);
    broadcast('[SYSTEM] ' + id + ' left');
  });
});

server.on('error', (error) => {
  console.error('[SERVER ERROR]', ts(), error.code, error.message);
});

server.listen(PORT, HOST, () => {
  console.log('NetLab 05: ' + HOST + ':' + PORT);
});
