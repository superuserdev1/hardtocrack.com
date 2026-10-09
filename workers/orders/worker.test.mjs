import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker,{drain,normalize} from './worker.mjs';
class D1 {
 constructor(){this.sqlite=new DatabaseSync(':memory:');this.sqlite.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));}
 prepare(sql){const db=this;return {args:[],bind(...args){this.args=args;return this;},async first(){return db.sqlite.prepare(sql).get(...this.args)||null;},async all(){return {results:db.sqlite.prepare(sql).all(...this.args)};},async run(){const r=db.sqlite.prepare(sql).run(...this.args);return {meta:{changes:Number(r.changes)}};},sync(){const stmt=db.sqlite.prepare(sql);const r=stmt.run(...this.args);return {meta:{changes:Number(r.changes)}};}};}
 async batch(list){this.sqlite.exec('BEGIN');try{const results=list.map(s=>s.sync());this.sqlite.exec('COMMIT');return results;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
}
const env={DB:new D1(),ORDERS_ENABLED:'true',RESEND_API_KEY:'test',TURNSTILE_SECRET_KEY:'test',TURNSTILE_SITE_KEY:'test',CODE_PEPPER:'a'.repeat(48),ADMIN_TOKEN:'b'.repeat(48),MAIL_FROM:'pedidos@avisos.example.com',HTC_EMAIL:'htc@example.com'};
const waits=[];const ctx={waitUntil(p){waits.push(p);}};
let captchaValid=true,ambiguous=false,captchaFailure=null;const accepted=new Map(),calls=[];
globalThis.fetch=async(url,options)=>{
 if(String(url).includes('siteverify'))return captchaFailure?Response.json(captchaFailure.body,{status:captchaFailure.status}):Response.json({success:captchaValid,hostname:'www.hardtocrack.com',action:'order'});
 if(String(url)==='https://api.resend.com/emails'){
  const key=options.headers['Idempotency-Key'],body=JSON.parse(options.body);calls.push({key,body});
  if(!accepted.has(key))accepted.set(key,body);
  if(ambiguous){ambiguous=false;throw new Error('Simulated timeout after provider accepted message');}
  return Response.json({id:'email-'+key});
 }throw new Error('Unexpected network call');
};
async function request(path='',body,admin=false,origin='https://www.hardtocrack.com'){
 const headers={Origin:origin,'CF-Connecting-IP':'192.0.2.1'};
 if(body)headers['Content-Type']='application/json';if(admin)headers.Authorization='Bearer '+env.ADMIN_TOKEN;
 const r=await worker.fetch(new Request('https://htc-orders.example.com/api/orders'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),env,ctx);
 return {status:r.status,data:await r.json()};
}
const direct=()=>({source:'direct',reference:'HTC-WEB-001',customer_name:'Cliente',customer_email:'customer@example.com',model:'Google Pixel 9a',pack:'Privacy',privacy:true,details:{apps:['Signal'],comentarios:'Solo preferencias'},request_key:crypto.randomUUID(),turnstile_token:'test'});
async function settle(){while(waits.length)await waits.shift();}
test('orders flow with real SQLite transactions, mocked captcha and mocked email only',async t=>{
 let id,storeCode,storeOrder;
 await t.test('feature disabled and missing credentials fail closed',async()=>{
  env.ORDERS_ENABLED='false';assert.equal((await request('/config')).data.enabled,false);assert.equal((await request('',direct())).status,503);env.ORDERS_ENABLED='true';
 });
 await t.test('untrusted origin, absent privacy and failed captcha rejected',async()=>{
  assert.equal((await request('',direct(),false,'https://evil.example')).status,403);
  assert.equal((await request('',{...direct(),privacy:false})).status,400);
  captchaValid=false;assert.equal((await request('',direct())).status,403);captchaValid=true;
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM orders').get().n,0);
 });
 await t.test('Turnstile errors distinguish configuration, expiry and availability without saving orders',async()=>{
  for(const [code,status,message]of [['invalid-input-secret',400,'mal configurada'],['missing-input-secret',400,'mal configurada'],['timeout-or-duplicate',200,'caducado'],['internal-error',500,'temporalmente']]){
   captchaFailure={status,body:{success:false,'error-codes':[code]}};
   const result=await request('',direct());assert.equal(result.status,code==='timeout-or-duplicate'?403:503);assert.ok(result.data.error.includes(message));
  }
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM orders').get().n,0);
  captchaFailure=null;env.DB.sqlite.exec('DELETE FROM rate_limits');
 });
 await t.test('direct submission saved with atomic outbox and three lifecycle emails',async()=>{
  const body=direct(),r=await request('',body);assert.equal(r.status,201);id=r.data.id;
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM mail_outbox').get().n,2);
  await settle();assert.equal(accepted.size,2);
  const replay=await request('',body);assert.equal(replay.data.id,id);assert.equal(replay.data.duplicate,true);
  assert.equal((await request('',{...body,customer_name:'Other'})).status,409);
 });
 await t.test('administration protected; six character code stored only as HMAC',async()=>{
  assert.equal((await request('/admin/list')).status,401);
  const r=await request('/admin/stores',{ref:'HTC-MAD-001',name:'Tienda',email:'store@example.com',receipt_email:'receipts@example.com'},true);
  assert.equal(r.status,200);storeCode=r.data.code;assert.match(storeCode,/^[A-HJ-NP-Z2-9]{6}$/);
  assert.notEqual(env.DB.sqlite.prepare('SELECT code_hash FROM stores').get().code_hash,storeCode);
  assert.ok(!(JSON.stringify((await request('/admin/stores',undefined,true)).data)).includes(storeCode));
 });
 await t.test('shop code and staff required; database controls recipient',async()=>{
  const body={...direct(),source:'store',reference:'HTC-MAD-001',staff_name:'Personal',store_code:storeCode,receipt_email:'attacker@example.com'};
  assert.equal((await request('',{...body,store_code:'AAAAAA'})).status,403);
  assert.equal((await request('',{...body,staff_name:''})).status,400);
  const r=await request('',body);assert.equal(r.status,201);storeOrder=r.data.id;await settle();
  const mail=[...accepted.values()].filter(m=>m.subject.includes(storeOrder));assert.equal(mail.length,3);
  assert.ok(mail.some(m=>m.to==='receipts@example.com'));assert.ok(!mail.some(m=>m.to==='attacker@example.com'));
  assert.ok(mail.find(m=>m.to==='htc@example.com').text.includes('receipts@example.com'));
 });
 await t.test('client guide keeps store attribution without private code',async()=>{
  env.DB.sqlite.exec('DELETE FROM rate_limits');
  const r=await request('',{...direct(),source:'guide',reference:'HTC-MAD-001'});assert.equal(r.status,201);await settle();
  assert.equal(env.DB.sqlite.prepare('SELECT store_ref FROM orders WHERE id=?').get(r.data.id).store_ref,'HTC-MAD-001');
  assert.equal((await request('',{...direct(),source:'guide',reference:'HTC-MAD-030'})).status,400);
 });
 await t.test('acceptance sends estimate once; shipping requires valid HTTPS tracking',async()=>{
  const r=await request(`/admin/${id}/status`,{status:'accepted'},true);assert.equal(r.status,200);await settle();
  const count=accepted.size;assert.equal((await request(`/admin/${id}/status`,{status:'accepted'},true)).data.duplicate,true);await settle();assert.equal(accepted.size,count);
  assert.ok([...accepted.values()].some(m=>m.subject.includes(id)&&m.text.includes('3 a 5 días laborables')));
  assert.equal((await request(`/admin/${id}/status`,{status:'shipped',carrier:'Transportista',tracking_url:'javascript:alert(1)'},true)).status,400);
  assert.equal((await request(`/admin/${id}/status`,{status:'shipped',carrier:'Transportista',tracking_url:'https://tracking.example.com/123'},true)).status,200);await settle();
  assert.ok([...accepted.values()].some(m=>m.subject.includes(id)&&m.text.includes('https://tracking.example.com/123')));
 });
 await t.test('concurrent decisions produce one transition and matching messages',async()=>{
  const [a,b]=await Promise.all([request(`/admin/${storeOrder}/status`,{status:'accepted'},true),request(`/admin/${storeOrder}/status`,{status:'rejected',reason:'No disponible'},true)]);
  assert.ok([a.status,b.status].includes(409));await settle();
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM events WHERE order_id=? AND status!='received'").get(storeOrder).n,1);
 });
 await t.test('ambiguous email retry uses identical idempotency key and payload',async()=>{
  ambiguous=true;const r=await request('',direct());assert.equal(r.status,201);await settle();
  const pending=env.DB.sqlite.prepare("SELECT * FROM mail_outbox WHERE order_id=? AND status='pending'").get(r.data.id);assert.ok(pending);
  env.DB.sqlite.prepare('UPDATE mail_outbox SET available_at=0 WHERE id=?').run(pending.id);const n=accepted.size;await drain(env);assert.equal(accepted.size,n);
  const repeats=calls.filter(c=>c.key===pending.id);assert.equal(repeats.length,2);assert.deepEqual(repeats[0].body,repeats[1].body);
 });
 await t.test('expired ambiguous send paused for review rather than duplicated',async()=>{
  const row=env.DB.sqlite.prepare('SELECT id FROM mail_outbox LIMIT 1').get();env.DB.sqlite.prepare("UPDATE mail_outbox SET status='pending',available_at=0,first_attempt=? WHERE id=?").run(Math.floor(Date.now()/1000)-24*3600,row.id);
  const before=calls.length;await drain(env);assert.equal(calls.length,before);assert.equal(env.DB.sqlite.prepare('SELECT status FROM mail_outbox WHERE id=?').get(row.id).status,'review');
 });
 await t.test('code rotation revokes old code; inactive store rejected',async()=>{
  env.DB.sqlite.exec('DELETE FROM rate_limits');
  const r=await request('/admin/stores',{ref:'HTC-MAD-001',name:'Tienda',email:'store@example.com',rotate_code:true},true);assert.notEqual(r.data.code,storeCode);
  assert.equal((await request('',{...direct(),source:'store',reference:'HTC-MAD-001',staff_name:'Personal',store_code:storeCode})).status,403);
  await request('/admin/stores',{ref:'HTC-MAD-001',name:'Tienda',email:'store@example.com',active:false},true);
  assert.equal((await request('',{...direct(),source:'guide',reference:'HTC-MAD-001'})).status,400);
 });
 await t.test('body limit, field lengths and per-IP rate limit',async()=>{
  assert.throws(()=>normalize({...direct(),customer_name:'x'.repeat(101)}));
  env.DB.sqlite.exec('DELETE FROM rate_limits');for(let i=0;i<12;i++)await request('',{...direct(),privacy:false});assert.equal((await request('',direct())).status,429);
  const r=await worker.fetch(new Request('https://htc-orders.example.com/api/orders',{method:'POST',headers:{Origin:'https://www.hardtocrack.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.2'},body:JSON.stringify({x:'a'.repeat(25000)})}),env,ctx);assert.equal(r.status,413);
 });
 env.DB.sqlite.close();
});
