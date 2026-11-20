import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {editorHandler} from './access.mjs';

const {EDIT_CODE, SESSION_SECRET, PORT='3000', PUBLIC_ORIGIN} = process.env;
if (!EDIT_CODE || EDIT_CODE.length < 6 || !SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error('EDIT_CODE (mindestens 6 Zeichen) und SESSION_SECRET (mindestens 32 Zeichen) setzen.');
}

const editor = await readFile(new URL('./editor.html', import.meta.url), 'utf8');
const viewer = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const handleEditor = editorHandler(editor);

createServer(async (req, res) => {
  try {
    // Wichtig fuer Render: Die Herkunft aus dem tatsaechlichen Host der Anfrage
    // bestimmen, nicht aus PUBLIC_ORIGIN (das bei Tippfehlern abweichen kann).
    const host = req.headers.host || (PUBLIC_ORIGIN ? new URL(PUBLIC_ORIGIN).host : `localhost:${PORT}`);
    if (!/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) {
      res.writeHead(400); res.end('Ungueltiger Host'); return;
    }
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
    const protocol = forwardedProto === 'https' || forwardedProto === 'http'
      ? forwardedProto
      : (host.toLowerCase().endsWith('.onrender.com') ? 'https' : 'http');
    const origin = `${protocol}://${host}`;
    const path = req.url?.startsWith('/') ? req.url : '/';
    const url = new URL(path, origin);
    const method = req.method || 'GET';
    const request = new Request(url, {
      method,
      headers: req.headers,
      ...(method === 'GET' || method === 'HEAD' ? {} : {body: Readable.toWeb(req), duplex: 'half'})
    });
    const isViewer = (url.pathname === '/ansicht' || url.pathname === '/index.html') && method === 'GET';
    const reply = isViewer
      ? new Response(viewer, {headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-Robots-Tag': 'noindex',
          'Referrer-Policy': 'no-referrer'
        }})
      : await handleEditor(request, {EDIT_CODE, SESSION_SECRET});
    res.writeHead(reply.status, Object.fromEntries(reply.headers));
    res.end(Buffer.from(await reply.arrayBuffer()));
  } catch (error) {
    console.error('Wuestensturm Serverfehler:', error);
    res.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
    res.end('Serverfehler');
  }
}).listen(Number(PORT), '0.0.0.0', () => console.log('Wuestensturm laeuft auf Port ' + PORT));
