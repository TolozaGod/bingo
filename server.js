const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const drawn = new Set();
const clients = new Set();

const state = () => JSON.stringify({ numbers: [...drawn].sort((a, b) => a - b) });
const broadcast = () => clients.forEach((res) => res.write(`data: ${state()}\n\n`));

const pages = { '/': 'display.html', '/display': 'display.html', '/control': 'control.html' };

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
    });
  });
}

const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'GET' && url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${state()}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'GET' && url === '/api/state') return send(res, 200, JSON.parse(state()));

  if (req.method === 'POST' && ['/api/add', '/api/remove', '/api/clear'].includes(url)) {
    if (url === '/api/clear') {
      drawn.clear();
    } else {
      const { number } = await readBody(req);
      const n = Number(number);
      if (!Number.isInteger(n) || n < 1 ||       n > 90) {
              return send(res, 400, { error: 'Número deve ser inteiro entre 1 e 90' });
      }
      if (url === '/api/add') drawn.add(n); else drawn.delete(n);
    }
    broadcast();
    return send(res, 200, JSON.parse(state()));
  }

  if (req.method === 'GET' && pages[url]) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(PUBLIC, pages[url])).pipe(res);
  }

  res.writeHead(404);
  res.end('Not found');
}).listen(PORT, () => {
  console.log(`Exibição:    http://localhost:${PORT}/`);
  console.log(`Controlador: http://localhost:${PORT}/control`);
});
