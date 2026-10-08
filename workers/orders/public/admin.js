(()=>{
 'use strict';let credential='';const $=id=>document.getElementById(id);
 const note=text=>{$('status').textContent=text;};
 async function api(path,body){const r=await fetch('/api/orders/admin/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+credential,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'No se pudo completar la operación.');return data;}
 function el(tag,text){const n=document.createElement(tag);n.textContent=text;return n;}
 async function refresh(){
  const session=credential;const [data,stores]=await Promise.all([api('list'),api('stores')]);if(!credential||credential!==session)return;$('workspace').hidden=false;$('orders').replaceChildren();$('stores').replaceChildren();
  for(const s of stores.stores){const button=el('button',`${s.ref} · ${s.name} · ${s.active?'Activa':'Inactiva'} · ${s.receipt_email}`);button.type='button';button.onclick=()=>{for(const key of ['ref','name','email','receipt_email'])$('store').elements[key].value=s[key];$('store').elements.active.checked=Boolean(s.active);$('store').elements.rotate_code.checked=false;$('code').hidden=true;};$('stores').append(button);}
  $('mail').textContent=data.mail.length?`Correos pendientes o en revisión: ${data.mail.length}. `+data.mail.filter(m=>m.status==='review').map(m=>`${m.order_id}: requiere revisión manual (${m.last_error})`).join(' '):'Sin correos pendientes. “Procesado” significa aceptado por el proveedor; no confirma la entrega al buzón.';
  for(const o of data.orders){const p=JSON.parse(o.payload),article=el('article','');article.append(el('h3',`${o.id} · ${o.status}`),el('p',`${p.reference} · ${p.customer_name} · ${p.customer_email} · ${p.model} · ${p.pack}`));const details=el('details','');details.append(el('summary','Ver solicitud'),el('pre',JSON.stringify(p,null,2)));article.append(details);
   const actionForm=el('form','');
   if(o.status==='received'){const reason=el('textarea','');reason.placeholder='Motivo si rechazas la solicitud';actionForm.append(reason);for(const [state,label]of [['accepted','Aceptar pedido'],['rejected','Rechazar solicitud']]){const b=el('button',label);b.type='button';b.onclick=()=>change(o.id,{status:state,reason:reason.value},b);actionForm.append(b);}}
   if(o.status==='accepted'){const carrier=el('input','');carrier.placeholder='Transportista';carrier.required=true;const tracking=el('input','');tracking.type='url';tracking.placeholder='https://… enlace de seguimiento';tracking.required=true;const b=el('button','Marcar enviado y notificar');actionForm.append(carrier,tracking,b);actionForm.onsubmit=e=>{e.preventDefault();change(o.id,{status:'shipped',carrier:carrier.value,tracking_url:tracking.value},b);};}
   if(o.status==='shipped'){const link=el('a','Ver seguimiento');link.href=o.tracking_url;link.target='_blank';link.rel='noopener noreferrer';article.append(link);}
   article.append(actionForm);$('orders').append(article);
  }
 }
 async function change(id,body,button){button.disabled=true;try{await api(id+'/status',body);note('Estado actualizado. Los correos están en la cola de envío.');await refresh();}catch(e){note(e.message);}finally{button.disabled=false;}}
 $('login').onsubmit=async e=>{e.preventDefault();credential=$('token').value;$('token').value='';try{await refresh();note('Acceso autorizado.');}catch(err){note(err.message);}};
 $('logout').onclick=()=>{credential='';$('token').value='';$('workspace').hidden=true;$('orders').replaceChildren();$('stores').replaceChildren();$('code').textContent='';$('code').hidden=true;note('Sesión cerrada.');};
 $('store').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,button=f.querySelector('button');button.disabled=true;try{const data=Object.fromEntries(new FormData(f));data.active=f.elements.active.checked;data.rotate_code=f.elements.rotate_code.checked;const r=await api('stores',data);$('code').hidden=!r.code;$('code').textContent=r.code?`${r.ref}: ${r.code}\nEntrega este código por separado al responsable. Guarda una copia privada; HTC no puede recuperarlo, solo sustituirlo.`:'';note(`Tienda guardada. Acuses y seguimiento: ${r.receipt_email}`);await refresh();}catch(err){note(err.message);}finally{button.disabled=false;}};
 $('refresh').onclick=()=>refresh().catch(e=>note(e.message));$('drain').onclick=async()=>{try{await api('drain',{});note('Procesamiento de correos solicitado. Actualiza la lista en unos segundos.');}catch(e){note(e.message);}};
})();
