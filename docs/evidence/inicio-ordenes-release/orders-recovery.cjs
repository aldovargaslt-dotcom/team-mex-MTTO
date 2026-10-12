const cd=require('./cdp.cjs');
(async()=>{
 const c=await cd.connect(); const {send,evaluate:ev,until,click,pause,screenshot:shot}=c;
 const out='/workspace/team-mex-MTTO/docs/screenshots/orders-work-queue/';
 let recover=false, detailOk=false; const calls={good:0,bad:0,checks:0};
 const good='11111111-1111-4111-8111-111111111111',bad='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
 const unit={id:good,numeroInterno:'FOTON',placas:'VU2625C',fotoDataUrl:null,tipo:{nombre:'Camión'}};
 const order={id,unidadId:good,unidadNumeroInterno:'FOTON',estado:'BORRADOR',tipo:'CORRECTIVO',openedAt:'2026-10-11T11:00:00Z',createdAt:'2026-10-11T10:00:00Z',updatedAt:'2026-10-11T11:00:00Z',km:200,chofer:{nombre:'WERO'},trabajos:[],fotos:[],firmas:[],piezas:[],observaciones:null};
 cd.onEvent=async e=>{if(e.method!=='Fetch.requestPaused')return;const p=new URL(e.params.request.url).pathname;let body,code=200;
  if(p==='/backend/unidades')body=[unit,{...unit,id:bad,numeroInterno:'URVAN'}];
  else if(p.includes('/unidades/')&&p.endsWith('/visitas')){const fail=p.includes(bad);calls[fail?'bad':'good']++;code=fail&&!recover?503:200;body=code===200?fail?[]:[order]:{message:'Consulta no disponible'};}
  else if(p==='/backend/checks'){calls.checks++;code=recover?200:503;body=code===200?{items:[],nextCursor:null}:{message:'Revisiones no disponibles'};}
  else if(p.startsWith('/backend/visitas/')){code=detailOk?200:503;body=detailOk?order:{message:'Detalle no disponible'};}
  if(p.startsWith('/backend/visitas/'))console.log('detail response',code,p);await send('Fetch.fulfillRequest',{requestId:e.params.requestId,responseCode:code,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
 };
 await send('Fetch.enable',{patterns:[{urlPattern:'*/backend/unidades*'},{urlPattern:'*/backend/checks*'},{urlPattern:'*/backend/visitas/*'}]});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:3040/'});await until(`document.body.innerText.includes('Entrar como supervisor')`);
 await click(`[...document.querySelectorAll('button')].find(e=>e.innerText.includes('Entrar como supervisor'))`);
 await send('Page.navigate',{url:'http://127.0.0.1:3040/ordenes'});await until(`document.body.innerText.includes('Consulta parcial. Falta consultar: URVAN, revisiones.')`);
 await shot(out+'supervisor_partial_m390.png');const before={...calls};recover=true;
 await click(`[...document.querySelectorAll('button')].find(e=>e.innerText==='Reintentar')`);await until(`document.body.innerText.includes('Consulta actualizada.')`);
 if(calls.good!==before.good||calls.bad!==before.bad+1||calls.checks!==before.checks+1)throw Error('Partial retry refetched successful source '+JSON.stringify(calls));
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await until(`document.body.innerText.includes('No se pudo abrir la orden.')`);await shot(out+'supervisor_detail_error_d1440.png');
 console.log('retry controls',await ev(`[...document.querySelectorAll('.ordenes-detail button')].map(e=>({text:e.innerText,r:e.getBoundingClientRect().toJSON()}))`));detailOk=true;await click(`[...document.querySelectorAll('.ordenes-detail button')].find(e=>e.innerText==='Reintentar')`);
 await until(`document.body.innerText.includes('Trabajos')||document.body.innerText.includes('Tipo de mantenimiento')`);
 await shot(out+'supervisor_recovered_d1440.png');
 console.log('PASS partial retries only failed units/checks, detailretry independent',calls,await ev(`document.documentElement.scrollWidth<=innerWidth`));
 await send('Fetch.disable');c.close();
})().catch(e=>{console.error(e);process.exit(1)});
