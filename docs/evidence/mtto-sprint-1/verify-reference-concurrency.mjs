import fs from 'node:fs/promises';
import { browser, pause, root } from './cdp-session.mjs';
const b = await browser();
const { send, evaluate, until, click, link, capture } = b;
const checks = [], requests = [];
let recover = false;
const movements = [1,2].map(i => ({id:'review-m'+i,visitaId:'review-v'+i,itemId:'review-item',sku:'PRUEBA',nombre:'Prueba concurrente',qty:1,uom:'PZA',tipo:'SALIDA_OT',createdAt:'2026-10-11T00:00:00Z'}));
b.events.set('Fetch.requestPaused', async ({requestId,request}) => {
  const path = new URL(request.url).pathname;
  let status=200, data=[];
  if(path==='/backend/notifications/badge') data={unread:0};
  if(path==='/backend/inventario/movimientos') data=movements;
  if(path.startsWith('/backend/visitas/review-v')) {
    const id=path.split('/').at(-1);
    status=recover?200:503;
    data=recover?{id,unidadId:'review-u'+id.at(-1),unidadNumeroInterno:'PRUEBA-'+id.at(-1)}:{message:'Error de prueba'};
    requests.push({path,status});
    if(recover) await pause(id.endsWith('1')?1200:600);
  }
  await send('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(data)).toString('base64')}).catch(()=>{});
});
await send('Fetch.enable',{patterns:[{urlPattern:'*/backend/*'}]});
try {
  for(const [vp,width,height] of [['d1440',1440,900],['m390',390,844]]) {
    recover=false;
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:'http://127.0.0.1:3000/'});
    await click("Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('Entrar como supervisor'))");
    await until("document.querySelector('a[href=\"/inventario\"]')");
    await click(link('/inventario')); await click(link('/inventario/movimientos'));
    await until("document.querySelectorAll('.ot-reference button').length===2");
    recover=true;
    await click("Array.from(document.querySelectorAll('.ot-reference')).find(e=>e.textContent.includes('review-v1')).querySelector('button')");
    await click("Array.from(document.querySelectorAll('.ot-reference')).find(e=>e.textContent.includes('review-v2')).querySelector('button')");
    await pause(2200);
    const links = await evaluate("Array.from(document.querySelectorAll('.ot-reference a')).map(a=>a.getAttribute('href'))");
    const body = await capture('revision_referencias_concurrentes_'+vp+(process.argv.includes('--before')?'_antes':'_despues'));
    checks.push({name:'AC09 dos reintentos independientes '+vp,status:links.length===2?'PASS':'FAIL',links,body});
  }
} finally {
  await fs.writeFile(root+'/evidence/mtto-sprint-1/reference-concurrency'+(process.argv.includes('--before')?'-before':'-after')+'.json',JSON.stringify({mechanism:'Read-only synthetic fixtures, role picker and actual UI clicks; overlapping GETs with delayed responses, no public API or DB writes.',checks,requests},null,2));
  await send('Fetch.disable');b.ws.close();
}
console.log(checks.map(c=>({name:c.name,status:c.status})));
if(checks.some(c=>c.status==='FAIL')) process.exitCode=1;
