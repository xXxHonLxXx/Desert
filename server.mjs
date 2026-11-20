import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {editorHandler} from './access.mjs';

const {EDIT_CODE, SESSION_SECRET, PORT='3000', PUBLIC_ORIGIN} = process.env;
if (!EDIT_CODE || EDIT_CODE.length < 6 || !SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error('EDIT_CODE (mindestens 6 Zeichen) und SESSION_SECRET (mindestens 32 Zeichen) setzen.');
}
const origin = new URL(PUBLIC_ORIGIN || `http://localhost:${PORT}`).origin;
const editor = await readFile(new URL('./editor.html', import.meta.url), 'utf8');
const viewer = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const handleEditor = editorHandler(editor);

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', origin);
    const method = req.method || 'GET';
    const request = new Request(url, {
      method,
      headers: req.headers,
      ...(method === 'GET' || method === 'HEAD' ? {} : {body: Readable.toWeb(req), duplex:'half'})
    });
    const isViewer = (url.pathname === '/ansicht' || url.pathname === '/index.html') && method === 'GET';
    const reply = isViewer
      ? new Response(viewer, {headers:{
          'Content-Type':'text/html; charset=utf-8',
          'X-Content-Type-Options':'nosniff',
          'X-Frame-Options':'DENY',
          'X-Robots-Tag':'noindex',
          'Referrer-Policy':'no-referrer'
        }})
      : await handleEditor(request, {EDIT_CODE, SESSION_SECRET});
    res.writeHead(reply.status, Object.fromEntries(reply.headers));
    res.end(Buffer.from(await reply.arrayBuffer()));
  } catch (error) {
    console.error('Wüstensturm Serverfehler:', error);
    res.writeHead(500, {'Content-Type':'text/plain; charset=utf-8'});
    res.end('Serverfehler');
  }
}).listen(Number(PORT), '0.0.0.0', () => console.log('Wüstensturm läuft auf Port '+PORT));
