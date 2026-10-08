const ORIGINS = new Set(['https://hardtocrack.com','https://www.hardtocrack.com','https://partners.hardtocrack.com']);
const BASE = '/api/orders';
const EMAIL = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;
const REF = /^HTC-[A-Z]{3}-\d{3}$/;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const now = () => Math.floor(Date.now()/1000);
const uuid = () => crypto.randomUUID();
class ApiError extends Error { constructor(status, message) {super(message); this.status=status;} }
const fail = (status,message) => {throw new ApiError(status,message);};
function field(value,max=200,required=false) {
 if(typeof value !== 'string') {if(required) fail(400,'Falta un campo obligatorio.'); return '';}
 const s=value.trim(); if(s.length>max||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s)) fail(400,'Un campo tiene un formato o longitud incorrectos.');
 if(required&&!s) fail(400,'Completa los campos obligatorios.'); return s;
}
function email(value,required=true) {const s=field(value,180,required).toLowerCase(); if((s||required)&&!EMAIL.test(s))fail(400,'Introduce un correo electrónico válido.');return s;}
async function digest(value) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function hmac(secret,value) {
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
}
function same(a,b) {if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
function configured(env) {
 return env.ORDERS_ENABLED==='true'&&env.DB&&env.RESEND_API_KEY&&env.TURNSTILE_SECRET_KEY&&env.TURNSTILE_SITE_KEY&&env.CODE_PEPPER?.length>=32&&env.ADMIN_TOKEN?.length>=32&&EMAIL.test(env.MAIL_FROM||'')&&EMAIL.test(env.HTC_EMAIL||'');
}
async function jsonBody(request) {
 if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Usa JSON.');
 const reader=request.body?.getReader();if(!reader)fail(400,'Falta el formulario.');
 const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>24000){await reader.cancel();fail(413,'El formulario es demasiado grande.');}chunks.push(value);}
 const buffer=new Uint8Array(length);let pos=0;for(const c of chunks){buffer.set(c,pos);pos+=c.length;}
 let body;try{body=JSON.parse(new TextDecoder().decode(buffer));}catch{fail(400,'El formulario no es válido.');}
 if(!body||Array.isArray(body)||typeof body!=='object')fail(400,'El formulario no es válido.');return body;
}
async function limit(env,request,scope,max) {
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 const bucket=Math.floor(now()/600),key=await hmac(env.CODE_PEPPER,`${scope}:${ip}:${bucket}`);
 const row=await env.DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now()+1200).first();
 if(row.count>max)fail(429,'Demasiados intentos. Espera unos minutos.');
}
async function captcha(env,request,token) {
 const origin=request.headers.get('Origin');if(!ORIGINS.has(origin))fail(403,'Origen no permitido.');
 const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:field(token,2048,true),remoteip:request.headers.get('CF-Connecting-IP'),idempotency_key:uuid()}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)fail(503,'No se pudo verificar el formulario. Vuelve a intentarlo.');
 const data=await r.json();if(!data.success||data.hostname!==new URL(origin).hostname||data.action!=='order')fail(403,'Repite la verificación del formulario.');
}
export function normalize(p) {
 if(!['direct','guide','store'].includes(p.source))fail(400,'Origen de pedido no válido.');
 const ref=field(p.reference,20,true).toUpperCase();if(!REF.test(ref))fail(400,'Referencia no válida.');
 if(p.source==='direct'&&ref!=='HTC-WEB-001')fail(400,'Referencia directa no válida.');
 if(ref.startsWith('HTC-WEB-')&&ref!=='HTC-WEB-001')fail(400,'Referencia no asignada.');
 if(p.source==='store'&&ref==='HTC-WEB-001')fail(400,'Selecciona una tienda.');
 if(p.privacy!==true)fail(400,'Confirma la información de privacidad.');
 const details=p.details||{};if(typeof details!=='object'||Array.isArray(details))fail(400,'Detalles no válidos.');
 const clean={};if(Object.keys(details).length>70)fail(400,'Demasiados campos.');
 for(const [k,v]of Object.entries(details)){if(!/^[a-zA-Z_][a-zA-Z0-9_]{0,45}$/.test(k))fail(400,'Campo no válido.');if(Array.isArray(v)){if(v.length>30)fail(400,'Demasiadas opciones.');clean[k]=v.map(x=>field(x,250));}else if(typeof v==='boolean')clean[k]=v;else clean[k]=field(v,2000);}
 const model=field(p.model,100,true),pack=field(p.pack,100,true);
 if(!['Essential','Privacy','Elite','Consultar','Solo instalación GrapheneOS','Servicio o accesorio individual','Necesito asesoramiento'].includes(pack))fail(400,'Selecciona un pack o servicio válido.');
 return {source:p.source,reference:ref,customer_name:field(p.customer_name,100,true),customer_email:email(p.customer_email),contact:field(p.contact,180),staff_name:field(p.staff_name,100,p.source==='store'),model,pack,type:field(p.type,120),delivery:field(p.delivery,120),privacy:true,details:clean};
}
function recap(p) {
 return [`Nombre o alias: ${p.customer_name}`,`Email: ${p.customer_email}`,`Otro contacto: ${p.contact||'No indicado'}`,`Modelo: ${p.model}`,`Pack o servicio: ${p.pack}`,`Tipo: ${p.type||'Pedido'}`,`Entrega: ${p.delivery||'Por confirmar'}`,p.staff_name?`Personal de tienda: ${p.staff_name}`:'',...Object.entries(p.details).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v}`)].filter(Boolean).join('\n');
}
function messages(env,order,status,extra={}) {
 const p=JSON.parse(order.payload),id=order.id,ref=p.reference;
 const titles={received:'Solicitud recibida',accepted:'Pedido aceptado',shipped:'Pedido enviado',rejected:'Solicitud no aceptada'};
 const texts={received:'Hemos recibido tu solicitud. Está pendiente de revisión y todavía no confirma la compra ni el precio final.',accepted:'Tu pedido ha sido aceptado y está en proceso. La previsión orientativa de finalización y envío es de 3 a 5 días laborables, sin compromiso de fecha. Te avisaremos cuando salga.',shipped:`Tu pedido ha sido enviado.\nTransportista: ${extra.carrier}\nSeguimiento: ${extra.tracking_url}`,rejected:`No podemos aceptar esta solicitud.\nMotivo: ${extra.reason}`};
 const subject=`[${id}] ${titles[status]} · HardToCrack`;
 const main=`HardToCrack\n\n${titles[status]}\nReferencia de pedido: ${id}\nReferencia de origen: ${ref}\n\n${texts[status]}\n\n${recap(p)}\n\nContacto: pedidos@hardtocrack.com`;
 const list=[{role:'customer',to:p.customer_email,subject,text:main},{role:'htc',to:env.HTC_EMAIL,subject,text:`${main}\n\nCanal: ${p.source}\nCorreo de referencia de tienda: ${extra.store_email||'Sin tienda'}\nCorreo de acuse y seguimiento: ${order.receipt_email||'Sin tienda'}`}];
 if(order.receipt_email)list.push({role:'store',to:order.receipt_email,subject,text:`HardToCrack · ${titles[status]}\n\nPedido: ${id}\nTienda: ${ref}\nModelo: ${p.model}\nPack: ${p.pack}\nPersonal: ${p.staff_name||'Solicitud del cliente'}\n\n${texts[status]}\n\nLos datos personales del cliente constan en el registro de HTC.`});
 return list.map(m=>({...m,from:env.MAIL_FROM,reply_to:env.HTC_EMAIL}));
}
function enqueue(db,orderId,eventId,message,conditionSql,conditionArgs) {
 return db.prepare(`INSERT OR IGNORE INTO mail_outbox(id,order_id,message,available_at) SELECT ?,?,?,? WHERE EXISTS (${conditionSql})`).bind(`${eventId}:${message.role}`,orderId,JSON.stringify(message),now(),...conditionArgs);
}
async function createOrder(request,env,ctx) {
 if(!configured(env))fail(503,'El envío automático todavía no está disponible.');
 await limit(env,request,'submission',12);const raw=await jsonBody(request),p=normalize(raw);
 const key=field(raw.request_key,80,true);if(!/^[0-9a-f-]{36}$/i.test(key))fail(400,'Identificador de envío no válido.');
 const hash=await digest(JSON.stringify(p));
 await captcha(env,request,raw.turnstile_token);
 let store=null;if(p.reference!=='HTC-WEB-001'){
  store=await env.DB.prepare('SELECT * FROM stores WHERE ref=? AND active=1').bind(p.reference).first();
  if(!store)fail(400,'La tienda todavía no está habilitada para pedidos automáticos. Contacta con HTC.');
  if(p.source==='store') {const code=field(raw.store_code,20,true).toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code)||!same(await hmac(env.CODE_PEPPER,`${p.reference}:${code}`),store.code_hash))fail(403,'Referencia o código de tienda incorrectos.');}
 }
 const previous=await env.DB.prepare('SELECT id,request_hash FROM orders WHERE request_key=?').bind(key).first();
 if(previous){if(previous.request_hash!==hash)fail(409,'Ese envío ya existe con otros datos.');return {ok:true,id:previous.id,registered:true,email_status:'queued_or_processed',duplicate:true};}
 const id=`HTC-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${uuid().replaceAll('-','').slice(0,12).toUpperCase()}`;
 const order={id,payload:JSON.stringify(p),receipt_email:store?.receipt_email||''},stamp=now();
 const statements=[env.DB.prepare('INSERT OR IGNORE INTO orders(id,request_key,request_hash,source,store_ref,customer_email,payload,receipt_email,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,key,hash,p.source,store?.ref||null,p.customer_email,order.payload,order.receipt_email,stamp,stamp),env.DB.prepare('INSERT OR IGNORE INTO events(id,order_id,status,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=?)').bind(`${id}:received`,id,'received',stamp,id)];
 for(const m of messages(env,order,'received',{store_email:store?.email}))statements.push(enqueue(env.DB,id,`${id}:received`,m,'SELECT 1 FROM orders WHERE id=?',[id]));
 await env.DB.batch(statements);
 const saved=await env.DB.prepare('SELECT id,request_hash FROM orders WHERE request_key=?').bind(key).first();if(saved.request_hash!==hash)fail(409,'Ese envío ya existe con otros datos.');
 ctx.waitUntil(drain(env));return {ok:true,id:saved.id,registered:true,email_status:'queued',duplicate:saved.id!==id};
}
async function admin(request,env) {
 if(!env.DB||!env.CODE_PEPPER||env.ADMIN_TOKEN?.length<32)fail(503,'Administración pendiente de configurar.');
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
 if(!env.ADMIN_TOKEN||!same(await digest(token),await digest(env.ADMIN_TOKEN)))fail(401,'Credencial interna no válida.');
 await limit(env,request,'admin',150);
}
function newCode() {return Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>alphabet[b%alphabet.length]).join('');}
async function saveStore(request,env) {
 const p=await jsonBody(request),ref=field(p.ref,20,true).toUpperCase();if(!REF.test(ref)||ref.startsWith('HTC-WEB-'))fail(400,'Referencia de tienda no válida.');
 const existing=await env.DB.prepare('SELECT code_hash FROM stores WHERE ref=?').bind(ref).first();
 const code=!existing||p.rotate_code===true?newCode():null;
 const codeHash=code?await hmac(env.CODE_PEPPER,`${ref}:${code}`):existing.code_hash;
 const main=email(p.email),receipt=email(p.receipt_email||p.email);
 await env.DB.prepare('INSERT INTO stores(ref,name,email,receipt_email,code_hash,active,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(ref) DO UPDATE SET name=excluded.name,email=excluded.email,receipt_email=excluded.receipt_email,code_hash=excluded.code_hash,active=excluded.active,updated_at=excluded.updated_at').bind(ref,field(p.name,120,true),main,receipt,codeHash,p.active===false?0:1,now()).run();
 return {ok:true,ref,code,receipt_email:receipt};
}
async function transition(request,env,ctx,id) {
 if(!configured(env))fail(503,"Active y configure el servicio antes de cambiar estados.");
 const body=await jsonBody(request),status=field(body.status,20,true);if(!['accepted','shipped','rejected'].includes(status))fail(400,'Estado no válido.');
 const order=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();if(!order)fail(404,'Pedido no encontrado.');
 if(order.status===status)return {ok:true,id,status,duplicate:true};
 const previous=status==='shipped'?'accepted':'received';if(order.status!==previous)fail(409,'El pedido no permite ese cambio de estado.');
 const extra={carrier:field(body.carrier,100,status==='shipped'),tracking_url:field(body.tracking_url,1000,status==='shipped'),reason:field(body.reason,500,status==='rejected')};
 if(status==='shipped'){let u;try{u=new URL(extra.tracking_url);}catch{fail(400,'Enlace de seguimiento no válido.');}if(u.protocol!=='https:'||u.username||u.password)fail(400,'Usa un enlace HTTPS de seguimiento.');}
 const store=order.store_ref?await env.DB.prepare('SELECT email FROM stores WHERE ref=?').bind(order.store_ref).first():null;
 const eventId=uuid(),stamp=now();
 const statements=[env.DB.prepare('UPDATE orders SET status=?,tracking_url=?,carrier=?,reason=?,updated_at=?,transition_id=? WHERE id=? AND status=?').bind(status,extra.tracking_url,extra.carrier,extra.reason,stamp,eventId,id,previous),env.DB.prepare('INSERT INTO events(id,order_id,status,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND transition_id=?)').bind(eventId,id,status,stamp,id,eventId)];
 for(const m of messages(env,order,status,{...extra,store_email:store?.email}))statements.push(enqueue(env.DB,id,eventId,m,'SELECT 1 FROM orders WHERE id=? AND transition_id=?',[id,eventId]));
 const results=await env.DB.batch(statements);if(!results[0].meta.changes)fail(409,'El pedido cambió mientras lo revisabas. Recarga la lista.');
 ctx.waitUntil(drain(env));return {ok:true,id,status,email_status:'queued'};
}
export async function drain(env) {
 if(!configured(env))return;
 for(let i=0;i<5;i++){
  const time=now(),lease=uuid();
  const row=await env.DB.prepare(`UPDATE mail_outbox SET status='sending',lease_until=?,lease_token=?,attempts=attempts+1,first_attempt=CASE WHEN first_attempt=0 THEN ? ELSE first_attempt END WHERE id=(SELECT id FROM mail_outbox WHERE (status='pending' AND available_at<=?) OR (status='sending' AND lease_until<?) ORDER BY available_at LIMIT 1) RETURNING *`).bind(time+120,lease,time,time,time).first();if(!row)break;
  // Resend keeps idempotency keys for 24h. Never blindly retry an ambiguous send beyond that window.
  if(time-row.first_attempt>23*3600||row.attempts>15){await env.DB.prepare("UPDATE mail_outbox SET status='review',last_error='Revisión requerida; ventana de reintento agotada' WHERE id=? AND lease_token=?").bind(row.id,lease).run();continue;}
  try{
   const m=JSON.parse(row.message);delete m.role;
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':row.id},body:JSON.stringify(m),signal:AbortSignal.timeout(15000)});
   const result=await response.json();if(!response.ok||!result.id)throw new Error(`Proveedor HTTP ${response.status}`);
   await env.DB.prepare("UPDATE mail_outbox SET status='sent',provider_id=?,last_error='',lease_until=0 WHERE id=? AND lease_token=?").bind(result.id,row.id,lease).run();
  }catch(error){await env.DB.prepare("UPDATE mail_outbox SET status='pending',available_at=?,last_error=?,lease_until=0 WHERE id=? AND lease_token=?").bind(time+Math.min(3600,60*2**Math.min(row.attempts,6)),String(error.message).slice(0,150),row.id,lease).run();}
 }
}
async function route(request,env,ctx) {
 const url=new URL(request.url),path=url.pathname;
 if(path===`${BASE}/config`&&request.method==='GET'){
  let enabled=Boolean(configured(env));if(enabled){try{await env.DB.prepare('SELECT id FROM orders LIMIT 1').first();}catch{enabled=false;}}
  return {enabled,site_key:enabled?env.TURNSTILE_SITE_KEY:null};
 }
 if(path===BASE&&request.method==='POST')return createOrder(request,env,ctx);
 if(path.startsWith(`${BASE}/admin`)){
  await admin(request,env);
  if(path===`${BASE}/admin/stores`&&request.method==='POST')return saveStore(request,env);
  if(path===`${BASE}/admin/stores`&&request.method==='GET')return {stores:(await env.DB.prepare('SELECT ref,name,email,receipt_email,active FROM stores ORDER BY ref').all()).results};
  if(path===`${BASE}/admin/list`&&request.method==='GET')return {orders:(await env.DB.prepare('SELECT id,status,store_ref,payload,created_at,tracking_url,carrier FROM orders ORDER BY created_at DESC LIMIT 100').all()).results,mail:(await env.DB.prepare("SELECT id,order_id,status,attempts,last_error FROM mail_outbox WHERE status!='sent' ORDER BY available_at LIMIT 100").all()).results};
  const match=path.match(/^\/api\/orders\/admin\/([A-Z0-9-]+)\/status$/);if(match&&request.method==='POST')return transition(request,env,ctx,match[1]);
  if(path===`${BASE}/admin/drain`&&request.method==='POST'){ctx.waitUntil(drain(env));return {ok:true};}
 }
 fail(404,'Ruta no encontrada.');
}
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);if(!url.pathname.startsWith(BASE))return env.ASSETS.fetch(request);
  const origin=request.headers.get('Origin'),allowed=ORIGINS.has(origin)||origin===url.origin;
  const headers={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(allowed){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='GET,POST,OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type,Authorization';}
  if(origin&&!allowed)return new Response(JSON.stringify({error:'Origen no permitido.'}),{status:403,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  try{return new Response(JSON.stringify(await route(request,env,ctx)),{status:request.method==='POST'&&url.pathname===BASE?201:200,headers});}catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof ApiError?e.message:'No se pudo completar la operación. Conserva el formulario y vuelve a intentarlo.'}),{status:e instanceof ApiError?e.status:503,headers});}
 },
 async scheduled(event,env,ctx){ctx.waitUntil((async()=>{await drain(env);if(env.DB)await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(now()).run();})());}
};
