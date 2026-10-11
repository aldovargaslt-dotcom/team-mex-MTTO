import fs from 'node:fs/promises';
const root='/workspace/team-mex-MTTO/docs';
const targets=await (await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0, mode='error', pending=new Map(), logs=[];
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
const unit={id:'test-u1',numeroInterno:'PRUEBA-UX-001',placas:'PRUEBA',estado:'ACTIVA',tipo:{id:'test-type',nombre:'Camión',icono:null}};
const visit={id:'test-v1',estado:'CERRADO',tipo:'CORRECTIVO',km:100,choferNombre:'PRUEBA',createdAt:'2026-10-11T00:00:00Z',updatedAt:'2026-10-11T00:00:00Z',cerradoAt:'2026-10-11T00:00:00Z',trabajosCount:1};
ws.addEventListener('message',async e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(m.error):p?.resolve(m.result);return;}if(m.method!=='Fetch.requestPaused')return;const {requestId,request}=m.params;const p=new URL(request.url).pathname;let data=[],status=200;
if(mode==='error'){status=503;data={message:'Fuente de prueba no disponible'};}
else if(p==='/backend/unidades')data=[unit];
else if(p.includes('/unidades/')&&p.endsWith('/visitas'))data=[visit];
else if(p==='/backend/andon/avisos'){status=503;data={message:'Fuente de prueba no disponible'};}
else if(p==='/backend/inventario/stock')data=[{id:'test-item',sku:'PRUEBA-01',nombre:'Refacción de prueba',qty:0,uom:'PZA',minQty:1,alerta:'AGOTADO'}];
else if(p==='/backend/visitas/test-v1')data={...visit,unidadId:unit.id,unidadNumeroInterno:unit.numeroInterno,chofer:{nombre:'PRUEBA'},tipoVehiculoNombre:'Camión',trabajos:[{id:'test-t',categoria:'A',item:'Prueba'}],fotos:[],firmas:[],piezas:[{id:'test-line',itemId:'test-item',qty:1,origen:'DESDE_STOCK'}]};
else if(p==='/backend/inventario/items'){await new Promise(r=>setTimeout(r,6000));data=[{id:'test-item',sku:'PRUEBA-01',nombre:'Refacción de prueba',stock:10,uom:'PZA'}];}
logs.push({mode,path:p,status,fixture:true});await send('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(data)).toString('base64')});});
await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*/backend/*'}]});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function evaluate(expression){return (await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;}
async function until(expr){for(let i=0;i<90;i++){if(await evaluate('Boolean('+expr+')'))return;await pause(500);}throw Error('Timeout '+expr);}
async function click(expr){await until(expr);await evaluate(expr+'.click()');await pause(1000);}
async function capture(name){await pause(400);const s=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(root+'/screenshots/mtto-sprint-1/'+name+'.png',Buffer.from(s.data,'base64'));return await evaluate('document.body.innerText');}
let results={};
for(const [vp,width,height] of [['d1440',1440,900],['m390',390,844]]){
await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
mode='error';await send('Page.navigate',{url:'http://127.0.0.1:3000/'});await until("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Entrar como supervisor'))");await click("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Entrar como supervisor'))");await until("document.body.innerText.includes('No se pudo cargar')");results['inicio_error_'+vp]=await capture('antes_inicio_error_'+vp);
mode='partial';await send('Page.reload');await until("document.body.innerText.includes('Refacción de prueba')");results['inicio_parcial_'+vp]=await capture('antes_inicio_parcial_'+vp);
mode='error';await click("document.querySelector('a[href=\"/ordenes\"]')");await until("document.body.innerText.includes('No hay órdenes')");results['ordenes_error_'+vp]=await capture('antes_ordenes_error_'+vp);
mode='partial';await click("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Cerradas')");await send('Page.reload');await until("document.body.innerText.includes('PRUEBA-UX-001')");
if(vp==='d1440'){await until("document.body.innerText.includes('Sin piezas')");results['piezas_cargando_'+vp]=await capture('antes_piezas_cargando_'+vp);await pause(6500);}
// Aplicar búsqueda mediante el setter nativo de React y evento input.
await evaluate("(()=>{const e=document.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'SIN-COINCIDENCIA');e.dispatchEvent(new Event('input',{bubbles:true}));})()");await pause(1200);results['filtro_'+vp]=await capture('antes_ordenes_filtro_'+vp);
results['geometria_'+vp]=await evaluate("Array.from(document.querySelectorAll('.inbox-copy,.ordenes-primary')).map(e=>({text:e.innerText,rect:{w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height},color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}))");
}
await fs.writeFile(root+'/evidence/mtto-sprint-1/baseline-cdp.json',JSON.stringify({mechanism:'Chromium CDP, respuestas sintéticas interceptadas; sin API/DB ni datos públicos',results,requests:logs},null,2));ws.close();
