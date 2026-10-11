import fs from 'node:fs/promises';
import { browser, pause, root } from './cdp-session.mjs';
const b = await browser(); const {send,evaluate,until,click,button,link,input,capture,key}=b;
let mode='error', overrides={}, logs=[], checks=[], texts={};
const type={id:'test-type',nombre:'Camión de prueba',descripcion:null};
const units=[1,2,3].map(i=>({id:'test-u'+i,numeroInterno:'PRUEBA-UX-'+i,placas:'PRUEBA-'+i,estado:'ACTIVA',tipo:type}));
const visits=units.map((u,i)=>({id:'test-v'+(i+1),estado:'BORRADOR',tipo:'CORRECTIVO',km:100,choferNombre:'PRUEBA',createdAt:'2026-10-11T00:00:00Z',updatedAt:'2026-10-11T00:00:00Z',trabajosCount:1,unidadId:u.id,unidadNumeroInterno:u.numeroInterno,tipoVehiculoId:type.id,tipoVehiculoNombre:type.nombre,chofer:{id:'test-driver',nombre:'PRUEBA'},trabajos:[{id:'test-t',categoria:'A',item:'Prueba'}],fotos:[],firmas:[],piezas:[{id:'test-line',itemId:'test-item',qty:1,origen:'DESDE_STOCK'}]}));
const item={itemId:'test-item',id:'test-item',sku:'PRUEBA-01',nombre:'Refacción de prueba',stock:10,qty:10,uom:'PZA',minQty:1,alerta:'AGOTADO',familiaId:'test-family'};
const pending={id:'test-pend',visitaId:'test-v1',itemId:item.id,sku:item.sku,nombre:item.nombre,qty:4,uom:'PZA',createdAt:'2026-10-11T00:00:00Z',estado:'PENDIENTE',ticketDataUrl:null};
const movement={id:'test-mov',visitaId:'test-v1',itemId:item.id,sku:item.sku,nombre:item.nombre,qty:1,uom:'PZA',tipo:'SALIDA_OT',createdAt:'2026-10-11T00:00:00Z'};
function fixture(path){
 if(path==='/backend/notifications/badge')return {unread:2};
 if(mode==='empty')return [];
 if(path==='/backend/unidades')return units;
 if(path.endsWith('/visitas')&&path.includes('/unidades/'))return [visits[Number(path.split('/')[3].slice(-1))-1]];
 if(path.startsWith('/backend/visitas/'))return mode==='closed'?{...visits[0],estado:'CERRADO'}:visits.find(v=>path.endsWith(v.id))??visits[0];
 if(path==='/backend/choferes')return [{id:'test-driver',nombre:'PRUEBA',estado:'ACTIVO'}];
 if(path==='/backend/unidades/tipos')return [type];
 if(path.endsWith('/hub'))return {fichaCorta:{ultimoKm:50}};
 if(path==='/backend/catalogo/trabajos')return [{categoria:'A',nombre:'Prueba',items:['Prueba']}];
 if(path==='/backend/inventario/items'||path==='/backend/inventario/skus')return [item];
 if(path==='/backend/inventario/stock')return [item];
 if(path==='/backend/inventario/movimientos')return [movement];
 if(path==='/backend/inventario/pendientes-comprobante')return [pending];
 if(path==='/backend/andon/avisos')return [];
 return [];
}
b.events.set('Fetch.requestPaused',async ({requestId,request})=>{const path=new URL(request.url).pathname;const rule=overrides[path];const status=rule?.status??(mode==='error'?503:200);const delay=rule?.delay??0;if(delay)await pause(delay);const data=status===200?rule?.data??fixture(path):{message:'Fuente de prueba no disponible'};logs.push({path,status,mode,fixture:true});await send('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(data)).toString('base64')}).catch(()=>{});});
await send('Fetch.enable',{patterns:[{urlPattern:'*/backend/*'}]});
function contrast(fg,bg){const lum=s=>{const values=s.match(/[0-9.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return values[0]*.2126+values[1]*.7152+values[2]*.0722};const a=lum(fg), b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
function check(name,pass,detail){checks.push({name,status:pass?'PASS':'FAIL',detail});if(!pass)console.log('FAIL',name,detail);}
async function text(){return evaluate('document.body.innerText');}
async function navigate(href){await send('Page.navigate',{url:'http://127.0.0.1:3000'+href});await pause(300);}
async function retryLast(){const expr="Array.from(document.querySelectorAll('.read-status button')).find(e=>e.parentElement.querySelector('[role=alert]'))";await click(expr);return expr;}
try{
for(const [vp,width,height] of [['d1440',1440,900],['d1024',1024,768],['m390',390,844]]){
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 mode='error';overrides={};await navigate('/');await click("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Entrar como supervisor'))");await until("document.body.innerText.includes('No se pudo cargar')");texts['inicio_error_'+vp]=await capture('despues_inicio_error_'+vp);
 check('AC01 Inicio error '+vp,!texts['inicio_error_'+vp].includes('Nada requiere'),texts['inicio_error_'+vp]);
 mode='ready';overrides={'/backend/andon/avisos':{status:503}};await send('Page.reload');await until("document.body.innerText.includes('Refacción de prueba')");texts['inicio_parcial_'+vp]=await capture('despues_inicio_parcial_'+vp);
 const geo=await evaluate("Array.from(document.querySelectorAll('.inbox-source-state')).map(e=>e.getBoundingClientRect().width).filter(w=>w>0)");check('AC05 ancho error '+vp,geo.every(w=>w>200),geo);
 const before=logs.length;overrides={};const retry=await retryLast();await until("document.body.innerText.includes('Consulta actualizada.')");const after=logs.slice(before);check('AC02 reintento fuente Inicio '+vp,after.filter(x=>x.path!='/backend/notifications/badge').every(x=>x.path==='/backend/andon/avisos'),after);check('AC11 foco reintento Inicio '+vp,await evaluate("document.activeElement?.textContent.includes('Reintentar')"),await evaluate('({tag:document.activeElement?.tagName,label:document.activeElement?.textContent.slice(0,80)})'));
 texts['inicio_recuperado_'+vp]=await capture('despues_inicio_recuperado_'+vp);
 mode='error';await send('Page.reload');await until("document.querySelectorAll('[role=alert]').length===4");mode='empty';for(let i=0;i<4;i++){await retryLast();await pause(450);}await until("document.body.innerText.includes('Nada requiere atención')");texts['inicio_recuperado_vacio_'+vp]=await capture('despues_inicio_recuperado_vacio_'+vp);check('AC04 Inicio recovery vacío real '+vp,await evaluate("!document.querySelector('.inbox-list')"),texts['inicio_recuperado_vacio_'+vp]);
 for(const href of ['/ordenes','/unidades','/inventario/stock','/inventario/consumo','/inventario/movimientos','/inventario/pendientes','/andon','/notificaciones']){
  mode='error';overrides={};if(href.startsWith('/inventario/')){if(!(await evaluate("document.querySelector('a[href=\"/inventario/stock\"]')")))await click(link('/inventario'));await click(link(href));}else if(await evaluate(`Boolean(${link(href)})`)) await click(link(href)); else await navigate(href);
  await until("document.querySelector('[role=alert]')");const name=href.slice(1).replaceAll('/','_');texts[name+'_error_'+vp]=await capture('despues_'+name+'_error_'+vp);check('AC01 '+name+' error '+vp,!/No hay|Nada requiere|Sin piezas/.test(texts[name+'_error_'+vp]),texts[name+'_error_'+vp]);
  mode='empty';for(let i=0;i<7;i++){const e=await evaluate("Array.from(document.querySelectorAll('.read-status button')).find(e=>e.parentElement.querySelector('[role=alert]'))?.outerHTML");if(!e)break;await retryLast();await pause(450);}
  await pause(350);texts[name+'_vacio_'+vp]=await capture('despues_'+name+'_vacio_'+vp);check('AC04 '+name+' vacío '+vp,!await evaluate("document.querySelector('[role=alert]')"),texts[name+'_vacio_'+vp]);
 }
 mode='ready';overrides={};await click(link('/ordenes'));await until("document.querySelectorAll('.ordenes-row').length===3");
 const cta=await evaluate("(()=>{const e=Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()==='+ Nueva orden');const s=getComputedStyle(e);return {color:s.color,bg:s.backgroundColor,font:s.fontFamily}})()");check('AC06 CTA navy '+vp,cta.color==='rgb(36, 40, 77)' && contrast(cta.color, cta.bg) >= 4.5,cta);
 await click(button('+ Nueva orden'));await until("document.querySelector('[role=dialog]')");texts['nueva_orden_lista_'+vp]=await capture('despues_nueva_orden_lista_'+vp);await key('Escape','Escape',27);await pause(450);check('AC11 foco Nueva orden '+vp,await evaluate("document.activeElement?.textContent.trim()==='+ Nueva orden'"),await evaluate('({tag:document.activeElement?.tagName,label:document.activeElement?.textContent.slice(0,80)})'));
 // Original audited case: three correctivo drafts filtered as preventivo.
 await click("document.querySelector('button[aria-label=\"Filtros\"]')");
 await click(button('Preventivo'));await until("document.body.innerText.includes('Sin coincidencias con estos filtros')");texts['ordenes_filtro_'+vp]=await capture('despues_ordenes_filtro_'+vp);await click(button('Quitar filtros'));await until("document.querySelectorAll('.ordenes-row').length===3");check('AC07 3→0→3 cola '+vp,await evaluate("!location.search.includes('tipo=')&&!location.search.includes('cola=cerradas')"),await evaluate('location.search'));
 await input('.ordenes-head__search input','NO-COINCIDE');await until("document.body.innerText.includes('Sin coincidencias')");await click(button('Quitar filtros'));await until("document.querySelectorAll('.ordenes-row').length===3");check('AC07 texto y foco '+vp,await evaluate("document.activeElement===document.querySelector('.ordenes-head__search input')&&!location.search.includes('q=')"),await evaluate('location.search'));
 // Retry only failed units while keeping loaded rows and query selection.
 overrides={'/backend/unidades/test-u2/visitas':{status:503}};await send('Page.reload');await until("document.body.innerText.includes('Consulta parcial')");check('AC02 órdenes parcial '+vp,await evaluate("document.querySelectorAll('.ordenes-row').length===2"),await text());texts['ordenes_parcial_'+vp]=await capture('despues_ordenes_parcial_'+vp);const start=logs.length;overrides={};await retryLast();await until("document.querySelectorAll('.ordenes-row').length===3");check('AC02 órdenes retry unidad '+vp,logs.slice(start).filter(r=>r.path.endsWith('/visitas')).every(r=>r.path==='/backend/unidades/test-u2/visitas'),logs.slice(start));
 // Relation delayed/error: persisted lines must remain, never assert absence.
 mode='closed';overrides={'/backend/inventario/items':{status:503,delay:1600}};await click(button('Cerradas')); // fixture closed only detail; summaries remain draft: deep document below after clicked list exercise.
 await navigate('/unidades/test-u1/visitas/test-v1');await until("document.body.innerText.includes('Nombre de refacción no disponible')");check('AC03 relación pendiente '+vp,!(await text()).includes('Sin piezas'),await text());await until("document.body.innerText.includes('No se pudieron consultar las piezas')");texts['documento_piezas_error_'+vp]=await capture('despues_documento_piezas_error_'+vp);overrides={};await click(button('Reintentar piezas'));await until("document.body.innerText.includes('Refacción de prueba')");texts['documento_recuperado_'+vp]=await capture('despues_documento_recuperado_'+vp);
 mode='ready';overrides={'/backend/inventario/movimientos':{status:503}};await click(link('/inventario'));await click(link('/inventario/consumo'));await until("document.body.innerText.includes('No disponible')");texts['consumo_parcial_'+vp]=await capture('despues_consumo_parcial_'+vp);check('AC01 consumo parcial conserva externa '+vp,/no disponible/i.test(texts['consumo_parcial_'+vp])&&texts['consumo_parcial_'+vp].includes('4'),texts['consumo_parcial_'+vp]);overrides={};await click("document.querySelector('.read-status button')");await until("document.body.innerText.includes('1 pza desde stock') || document.body.innerText.includes('1 piezas desde stock') || document.body.innerText.includes('1 pieza desde stock')");texts['consumo_recuperado_'+vp]=await capture('despues_consumo_recuperado_'+vp);
 for(const status of [404,403,503]){overrides={'/backend/visitas/test-v1':{status}};await click(link('/inventario/movimientos'));await until("document.body.innerText.includes('ID: test-v1')");if(vp==='m390')await evaluate("(()=>{document.querySelectorAll('.table-wrap').forEach(e=>e.scrollLeft=e.scrollWidth);document.querySelectorAll('table').forEach(e=>{e.parentElement.scrollLeft=e.parentElement.scrollWidth})})()");texts['referencia_'+status+'_'+vp]=await capture('despues_referencia_'+status+'_'+vp);check('AC09 sin enlace falso '+status+' '+vp,await evaluate("!document.querySelector('a[href=\"/unidades/test-u1/visitas/test-v1\"]')"),texts['referencia_'+status+'_'+vp]);if(status===503){overrides={};await click(button('Reintentar referencia'));await until("document.body.innerText.includes('OT · PRUEBA-UX-1')");check('AC09 referencia recuperación '+vp,true,await text());}await click(link('/inventario/consumo'));}
}
}catch(e){checks.push({name:'runner',status:'FAIL',detail:e.message});console.log(e.message);console.log((await text()).slice(-4500));}
await fs.writeFile(root+'/evidence/mtto-sprint-1/after-states-cdp.json',JSON.stringify({mechanism:'Chromium CDP click-through; synthetic controlled read responses, not API persistence proof',checks,texts,requests:logs},null,2));await send('Fetch.disable');b.ws.close();console.log(JSON.stringify({pass:checks.filter(c=>c.status==='PASS').length,fail:checks.filter(c=>c.status==='FAIL').length}));
