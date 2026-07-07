const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
// Passenger (LWS/cPanel) fournit PORT ; en local : NODE_PORT ou 8000
const port = process.env.PORT || process.env.NODE_PORT || 8000;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname, query } = parsedUrl;
    if (pathname.startsWith('/.well-known')) {
      const filePath = path.join(process.cwd(), pathname.substring(1));
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(fileContent);
        return;
      } catch (error) {
        console.error(error);
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
    }
    handle(req, res, parsedUrl);
  });

  // Sur LWS, Passenger intercepte listen() — appeler sans argument si PORT absent
  if (process.env.PASSENGER_APP_ENV) {
    server.listen();
    console.log('> Ready via Phusion Passenger');
  } else {
    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`);
    });
  }
});