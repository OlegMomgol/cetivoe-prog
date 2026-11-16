const BASE_URL = 'http://127.0.0.1:3041';
async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    timeout = 1500,
    headers = {}
  } = options;

  const started = performance.now();

  const requestHeaders = body === undefined
    ? { ...headers }
    : { 'Content-Type': 'application/json', ...headers };

  try {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout)
    });

    const elapsed = Math.round(performance.now() - started);
    const contentType = response.headers.get('content-type');
    const cacheControl = response.headers.get('cache-control'); 
    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }

    console.log('\n' + method + ' ' + path);
    console.log('HTTP status:', response.status);
    console.log('response.ok:', response.ok);
    console.log('Content-Type:', contentType);
    console.log('Cache-Control:', cacheControl);
    console.log('Time:', elapsed + ' ms');
    console.log('Body:', data);

    return { status: response.status, ok: response.ok, data };
  } catch (error) {
    const elapsed = Math.round(performance.now() - started);

    console.log('\n' + method + ' ' + path);
    console.log('Нет полного HTTP-ответа');
    console.log('Error:', error.name);
    console.log('Message:', error.message);
    if (error.cause) console.log('Cause:', error.cause.code ?? error.cause.message);
    console.log('Time:', elapsed + ' ms');

    return null;
  }
}

async function getStatus() {
  const result = await request('/api/status');
  return result?.data ?? null;
}

async function createEvent(station, message) {
  const result = await request('/api/events', {
    method: 'POST',
    body: { station, message }
  });
  return result?.data ?? null;
}

async function getEvents() {
  const result = await request('/api/events');
  return result?.data?.events ?? null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getStatusWithRetry(retries = 1, delayMs = 500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await request('/api/status');
    if (result !== null) return result.data;

    if (attempt < retries) {
      console.log(`Повтор GET /api/status через ${delayMs} мс (попытка ${attempt + 2})`);
      await sleep(delayMs);
    }
  }
  return null;
}

const command = (process.argv[2] || 'all').toLowerCase();

async function main() {
  if (command === 'status') {
    const status = await getStatus();
    if (!status) {
      console.error('Не удалось получить статус: сервер недоступен.');
      process.exitCode = 1;
    }
    return;
  }

  if (command === 'events') {
    const events = await getEvents();
    if (!events) {
      console.error('Не удалось получить список событий: сервер недоступен.');
      process.exitCode = 1;
    }
    return;
  }

  if (command === 'send') {
    const station = process.argv[3] || 'PC-07';
    const message = process.argv[4] || 'REQUEST_HELP';
    const event = await createEvent(station, message);
    if (!event) {
      console.error('Не удалось создать событие: сервер недоступен.');
      process.exitCode = 1;
    }
    return;
  }

  if (command === 'retry-status') {
    const status = await getStatusWithRetry(1, 500);
    if (!status) {
      console.error('Статус не получен даже после повтора.');
      process.exitCode = 1;
    }
    return;
  }

  await request('/api/status');
  await request('/api/events');

  await request('/api/events', {
    method: 'POST',
    body: { station: 'PC-07', message: 'REQUEST_HELP' }
  });

  await request('/api/events');
  await request('/missing');
  await request('/api/error');
  await request('/api/slow?ms=3000', { timeout: 4000 });
}

await main();
