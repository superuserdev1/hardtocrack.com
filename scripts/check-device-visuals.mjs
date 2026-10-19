import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const files=['index.html','en/index.html','nl/index.html','pt/index.html'];
const cssFiles=['assets/css/tokens.css','assets/css/site.css'];
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sharedCss=cssFiles.map(p=>{try{return read(p)}catch{return ''}}).join('\n');
const names=['Google Pixel 8a','Google Pixel 9a','Google Pixel 10a','Google Pixel 10 Pro'];
const prices=JSON.parse(read('data/pack-prices.json')).packs;
for(const file of files){
 const html=read(file),s=html+'\n'+sharedCss,start=html.indexOf('id="dispositivos"'),end=html.indexOf('</section>',start);
 assert(start>=0&&end>start,file+': device section missing');
 const device=html.slice(start,end);
 for(const name of names)assert(device.includes('<h3>'+name+'</h3>'),file+': missing '+name);
 const count=(device.match(/class="device-visual"/g)||[]).length;
 assert.equal(count,4,file+': expected four visible phone illustrations');
 assert.equal((device.match(/class="phone-mock"/g)||[]).length,4,file+': phone mockup count');
 assert(s.includes('.camera-bar::before,.camera-bar::after'),file+': PT camera-bar styles missing');
 assert(s.includes('@media(max-width:900px){.device-grid{grid-template-columns:1fr}'),file+': mobile layout missing');
 for(const [name,{pvp,online}] of Object.entries(prices)){
  const p=s.match(new RegExp(name+': <span class="promo-discount">(?:€)?([0-9]+)\\s*€?<\\/span><\\/b> <s>(?:€)?([0-9]+)'));
  assert(p,file+': offer banner missing for '+name);
  assert.equal(Number(p[1]),online,file+': '+name+' online price');
  assert.equal(Number(p[2]),pvp,file+': '+name+' regular price');
 }
 console.log('PASS',file,': 4 CSS phones, responsive rules and unchanged prices');
}
