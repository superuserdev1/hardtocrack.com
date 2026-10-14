// Guardrail for ES/EN/NL/PT prices. Canonical values in data/pack-prices.json.
// This validates existing HTML: it does not rewrite content or alter commercial terms.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const pricing=JSON.parse(readFileSync(new URL('../data/pack-prices.json',import.meta.url),'utf8'));
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const targets=['index.html','precios/index.html','guia/index.html','pedidos/index.html','en/index.html','nl/index.html','pt/index.html'];
let failures=0;
function check(ok,description){if(!ok){console.error('FAIL:',description);failures++;}else console.log('OK:',description);}
for(const path of targets){
 const html=read(path);
 for(const [name,v] of Object.entries(pricing.packs)){
  const card=html.match(new RegExp('data-pack-card="'+name+'"[\\s\\S]{0,250}?class="htc-pack-price">([0-9]+) €'));
  const home=html.match(new RegExp('<div class="pack-name">'+name+'</div>[\\s\\S]{0,300}?<div class="price">([0-9]+) €</div>'));
  const pt=html.match(new RegExp('<div class="pack-name">'+name+'</div>[\\s\\S]{0,320}?<span class="price-old">([0-9]+) €</span><span class="price-new">([0-9]+) €</span>'));
  const value=card?.[1]||home?.[1]||pt?.[1];
  if(value)check(Number(value)===v.pvp,`${path}: ${name} regular ${value} = ${v.pvp}`);
  if(pt)check(Number(pt[2])===v.online,`${path}: ${name} discounted ${pt[2]} = ${v.online}`);
  const option=[...html.matchAll(/<option[^>]*>([^<]+)<\/option>/g)].map(m=>m[1]).find(s=>s.startsWith(name+' — oferta online'));
  if(option)check(option.includes(String(v.online)+' €'),`${path}: ${name} Portuguese selector ${option}`);
 }
 if(/class="promo-note"/.test(html)){
  for(const [name,v] of Object.entries(pricing.packs)){
   const promo=html.match(new RegExp(name+': <span class="promo-discount">(?:€)?([0-9]+) €?<\\/span><\\/b> <s>(?:€)?([0-9]+)'));
   check(!!promo&&Number(promo[1])===v.online&&Number(promo[2])===v.pvp,`${path}: promotional ${name} matches canonical prices`);
  }
 }
}
check(pricing.offer_until==='2026-10-31','Promotion expiration date has not changed');
check(pricing.offer_scope==='direct_online_only','Offer applies only to direct online reservations');
if(failures)process.exitCode=1;
