(function () {
 'use strict';
 const API='https://htc-orders.github-ee7.workers.dev/api/orders';
 const form=document.getElementById('orderForm')||document.getElementById('pedido');if(!form)return;
 const store=location.hostname==='partners.hardtocrack.com';
 const source=store?'store':document.getElementById('storeCodeHidden')?'guide':'direct';
 let config=null,bypass=false,prepared=null,requestKey=crypto.randomUUID(),widget=null,sending=false;
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const box=document.createElement('section');box.hidden=true;box.style.cssText='margin-top:24px;padding:20px;border:1px solid #426b76;border-radius:12px';
 const title=document.createElement('h3');title.textContent='Revisa tu solicitud';
 const summary=document.createElement('pre');summary.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:inherit';
 const captcha=document.createElement('div');
 const send=document.createElement('button');send.type='button';send.textContent='Enviar solicitud a HardToCrack';send.className='button button-primary';
 box.append(title,summary,captcha,send);form.append(status,box);
 const value=id=>document.getElementById(id)?.value.trim()||'';
 const array=(data,key)=>data.getAll(key).map(String);
 const ready=fetch(API+'/config',{cache:'no-store',signal:AbortSignal.timeout(7000)}).then(r=>r.ok?r.json():null).catch(()=>null).then(c=>{
  config=c;if(!c?.enabled)return;
  window.HTCOrdersAutomatic=true;
  if(source==='guide'){
   const contact=document.getElementById('contact');contact.type='email';contact.maxLength=180;
   document.querySelector('label[for="contact"]').textContent='Correo electrónico del cliente';
   const privacy=document.createElement('label');privacy.className='helper';
   const check=document.createElement('input');check.type='checkbox';check.name='automatic_privacy';check.required=true;
   privacy.append(check,document.createTextNode(' He leído la información de privacidad.'));form.insertBefore(privacy,status);
  }
  if(source==='store'){
   const contact=document.getElementById('contacto');contact.type='email';contact.maxLength=180;
   document.querySelector('label[for="contacto"]').textContent='Correo electrónico del cliente *';
   const code=document.getElementById('codigo');code.minLength=6;code.maxLength=6;code.pattern='[A-HJ-NP-Z2-9]{6}';code.placeholder='6 caracteres';
   document.getElementById('qr_aviso').textContent='El QR rellena la referencia. Introduce el código de seis caracteres entregado a tu tienda. HTC registrará la solicitud y enviará los acuses automáticamente.';
   document.getElementById('qr_estado').textContent='El código se comprueba en el servidor al enviar la solicitud.';
   document.getElementById('autorizacion').parentElement.querySelector('span').firstChild.textContent='Confirmo que el cliente ha autorizado este pedido y el contacto. He facilitado al cliente la ';
  }
  form.querySelector('button[type="submit"]').textContent='Revisar solicitud';
  status.textContent='Envío automático disponible. Recibirás una referencia al registrar la solicitud.';
  if(source==='store'){
   document.querySelector('h1').textContent='Tramita el pedido del cliente';
   document.querySelector('.intro').textContent='Completa los datos y revisa la solicitud. HardToCrack registrará el pedido y enviará el resumen al cliente, el aviso a HTC y el acuse al correo de la tienda.';
  }
  if(source==='direct')document.querySelector('.submit-row p').textContent='Revisa el resumen y envía la solicitud desde esta página.';
 });
 function detailsOfForm(){
  const result={};for(const el of form.querySelectorAll('input,select,textarea')){
   const key=el.name||el.id;if(!key||['tienda','codigo','cliente','contacto','personal_tienda','autorizacion','cf-turnstile-response'].includes(key)||el.type==='password'||el.type==='hidden')continue;
   if(el.type==='checkbox'){if(el.checked){if(!result[key])result[key]=[];result[key].push(el.value||'Sí');}}else result[key]=el.value;
  }return result;
 }
 function payload(){
  const data=new FormData(form);
  if(source==='direct')return {source,reference:data.get('direct_ref')||value('directRef'),customer_name:data.get('nombre'),customer_email:data.get('email'),contact:data.get('contacto_alternativo'),model:data.get('modelo'),pack:data.get('pack'),type:data.get('tipo'),delivery:data.get('entrega'),privacy:data.has('privacidad'),details:{estado:data.get('estado'),capacidad_color:data.get('capacidad_color'),presupuesto:data.get('presupuesto'),perfiles:array(data,'perfiles'),apps:array(data,'apps'),otras_apps:data.get('otras_apps'),extras:array(data,'extras'),localidad:data.get('localidad'),comentarios:data.get('comentarios')}};
  if(source==='guide')return {source,reference:value('directRefHidden')||value('storeCodeHidden'),customer_name:value('name'),customer_email:value('contact'),model:value('deviceModel'),pack:value('interest'),type:value('requestType'),delivery:value('delivery'),privacy:data.has('automatic_privacy'),details:{comentarios:value('message'),modo:value('requestModeHidden')}};
  return {source,reference:value('tienda'),store_code:value('codigo').toUpperCase(),staff_name:value('personal_tienda'),customer_name:value('cliente'),customer_email:value('contacto'),model:value('modelo'),pack:value('pack'),privacy:document.getElementById('autorizacion').checked,type:'Pedido por encargo del cliente',details:detailsOfForm()};
 }
 function loadCaptcha(){
  if(window.turnstile)return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
   script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar la verificación.'));document.head.append(script);
  });
 }
 form.addEventListener('input',()=>{if(sending)return;prepared=null;box.hidden=true;requestKey=crypto.randomUUID();});
 form.addEventListener('change',()=>{if(sending)return;prepared=null;box.hidden=true;requestKey=crypto.randomUUID();});
 form.addEventListener('submit',async event=>{
  if(bypass){bypass=false;return;}
  event.preventDefault();event.stopImmediatePropagation();await ready;
  if(!config?.enabled){bypass=true;form.requestSubmit();return;}
  if(sending||!form.reportValidity())return;
  prepared=payload();summary.textContent=[`Referencia: ${prepared.reference}`,`Cliente: ${prepared.customer_name}`,`Email: ${prepared.customer_email}`,prepared.staff_name?`Personal de tienda: ${prepared.staff_name}`:'',`Modelo: ${prepared.model}`,`Pack o servicio: ${prepared.pack}`,`Entrega: ${prepared.delivery||'Por confirmar'}`,...Object.entries(prepared.details).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v||'No indicado'}`),'','Solicitud pendiente de revisión. El registro no confirma el precio final ni la compra.'].filter(Boolean).join('\n');
  box.hidden=false;send.disabled=true;status.textContent='Revisa los datos y completa la verificación para enviar.';
  try{await loadCaptcha();if(widget!==null)turnstile.reset(widget);else widget=turnstile.render(captcha,{sitekey:config.site_key,action:'order',callback:()=>{send.disabled=false;},'expired-callback':()=>{send.disabled=true;},'error-callback':()=>{send.disabled=true;status.textContent='No se pudo verificar. Vuelve a revisar la solicitud.';}});}catch(e){status.textContent=e.message;}
  box.scrollIntoView({behavior:'smooth',block:'center'});
 },true);
 send.addEventListener('click',async()=>{
  if(sending||!prepared||!form.reportValidity())return;
  const token=turnstile.getResponse(widget);if(!token)return;
  sending=true;send.disabled=true;status.textContent='Registrando solicitud…';
  try{
   const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...prepared,request_key:requestKey,turnstile_token:token}),signal:AbortSignal.timeout(20000)});
   const result=await response.json();if(!response.ok||!result.registered)throw new Error(result.error||'No se pudo registrar el pedido.');
   title.textContent='Solicitud registrada';status.textContent=`Solicitud ${result.id} registrada. Los correos de recepción están en proceso de envío. HTC revisará el pedido antes de aceptarlo.`;
   send.hidden=true;captcha.hidden=true;
   // Prevent a second submission after success; a page reload starts a new request.
   form.querySelectorAll('input,select,textarea,button[type="submit"]').forEach(el=>el.disabled=true);
  }catch(error){status.textContent=error.name==='TimeoutError'?'No se pudo confirmar la respuesta. Conserva los datos y vuelve a enviar sin modificarlos: se usará la misma referencia de envío para evitar duplicados.':error.message;turnstile.reset(widget);}
  finally{sending=false;}
 });
})();
