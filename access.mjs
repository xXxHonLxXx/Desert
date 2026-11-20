const encoder = new TextEncoder();
const cookieName = 'honl_editor';
const lifetime = 30 * 24 * 60 * 60;
const headers = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};
function hex(bytes) { return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join(''); }
async function digest(value) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
async function signature(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}
function equal(a,b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function page(body,status=200) {return new Response(body,{status,headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});}
function login(invalid=false, secure=false) {
  // SameSite cookie + one-time form token: protects POST even if Safari omits Origin.
  const csrf = hex(crypto.getRandomValues(new Uint8Array(16)));
  const csrfCookie = 'honl_login_csrf='+csrf+'; Path=/; Max-Age=600; HttpOnly; SameSite=Strict'+(secure?'; Secure':'');
  const body = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HONL · Bearbeitungszugang</title><style>body{margin:0;padding:24px;background:#fff4d6;color:#3b280d;font:17px system-ui}main{max-width:440px;margin:9vh auto;padding:24px;background:#fffdf7;border:1px solid #d5b878;border-radius:15px}h1{font-family:Georgia,serif}form,label{display:grid;gap:10px}input,button{font:inherit;padding:12px;border:1px solid #b78f47;border-radius:8px;min-width:0}button{background:#774403;color:white;font-weight:700}p[role]{color:#a02414}</style><main><h1>HONL · Wüstensturm</h1><form method="post" action="/zugang"><input type="hidden" name="csrf" value="${csrf}"><label>Bearbeitungscode<input type="password" name="code" required maxlength="128" autocomplete="current-password"></label><button>Plan bearbeiten</button></form>${invalid?'<p role="alert">Der Bearbeitungscode stimmt nicht oder die Anmeldung ist abgelaufen. Bitte erneut versuchen.</p>':''}</main></html>`;
  return new Response(body,{status:invalid?401:200,headers:{...headers,'Content-Type':'text/html; charset=utf-8','Set-Cookie':csrfCookie}});
}
function cookieValue(request, name) {
  return (request.headers.get('Cookie')||'').split(';').map(item=>item.trim()).find(item=>item.startsWith(name+'='))?.slice(name.length+1)||'';
}

function redirect(cookie) { return new Response(null,{status:303,headers:{...headers,Location:'/', 'Set-Cookie':cookie}}); }
export function editorHandler(editorHtml) {
  return async function handle(request,env) {
    const {pathname,protocol,origin}=new URL(request.url);
    if (!env.EDIT_CODE || env.EDIT_CODE.length<6 || !env.SESSION_SECRET || env.SESSION_SECRET.length<32) return page('Der Bearbeitungszugang ist noch nicht eingerichtet.',503);
    const suffix='; Path=/; HttpOnly; SameSite=Strict'+(protocol==='https:'?'; Secure':'');
    if(request.method==='POST' && (pathname==='/zugang'||pathname==='/abmelden')) {
      // Render kann die interne Host-/Protokoll-Adresse anders darstellen als
      // der Browser. Deshalb NICHT den Browser-Origin mit request.url vergleichen.
      // Cross-Site-POSTs werden stattdessen ueber den Browser-Header abgewiesen.
      // Zusaetzlich verlangt die Anmeldung den einmaligen CSRF-Formularwert,
      // der mit einem HttpOnly-/SameSite=Strict-Cookie uebereinstimmen muss.
      const fetchSite = request.headers.get('Sec-Fetch-Site');
      if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
        return page('Ungültige Anfrage (fremde Webseite).', 403);
      }
      if(pathname==='/abmelden') return redirect(cookieName+'=; Max-Age=0'+suffix);
      let code='', csrf='';
      try {
        const reader=request.body?.getReader(), decoder=new TextDecoder();
        if(!reader) return login(true, protocol==='https:');
        let data='', length=0;
        for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>4096){await reader.cancel();return page('Anfrage zu groß.',413);}data+=decoder.decode(value,{stream:true});}
        const fields=new URLSearchParams(data+decoder.decode());
        code=(fields.get('code')||'').trim();
        csrf=fields.get('csrf')||'';
      } catch {return login(true, protocol==='https:');}
      const csrfCookie=cookieValue(request,'honl_login_csrf');
      if(!/^[0-9a-f]{32}$/.test(csrf) || !equal(csrf,csrfCookie)) return login(true, protocol==='https:');
      if(!equal(await digest(code),await digest(env.EDIT_CODE)))return login(true, protocol==='https:');
      const payload=String(Math.floor(Date.now()/1000)+lifetime)+'.'+hex(crypto.getRandomValues(new Uint8Array(12)));
      const mac=await signature(env.SESSION_SECRET,payload);
      return redirect(cookieName+'='+payload+'.'+mac+'; Max-Age='+lifetime+suffix);
    }
    if(pathname!=='/'||request.method!=='GET')return page('Seite nicht gefunden.',404);
    const cookie=(request.headers.get('Cookie')||'').split(';').map(item=>item.trim()).find(item=>item.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
    if(!/^\d{10}\.[0-9a-f]{24}\.[0-9a-f]{64}$/.test(cookie))return login(false, protocol==='https:');
    const [expiry,nonce,mac]=cookie.split('.');
    if(Number(expiry)<=Math.floor(Date.now()/1000)||!equal(mac,await signature(env.SESSION_SECRET,expiry+'.'+nonce)))return login(false, protocol==='https:');
    return page(editorHtml);
  };
}
