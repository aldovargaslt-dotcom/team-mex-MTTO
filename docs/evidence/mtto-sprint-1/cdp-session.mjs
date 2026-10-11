import fs from 'node:fs/promises';
export const root = new URL('../..', import.meta.url).pathname;
export const pause = ms => new Promise(r => setTimeout(r, ms));
export async function browser() {
  const pages = await (await fetch('http://127.0.0.1:9223/json')).json();
  const ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let n = 0; const pending = new Map(); const events = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++n; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p?.reject(m.error) : p?.resolve(m.result); } else events.get(m.method)?.(m.params); });
  await send('Page.enable'); await send('Runtime.enable');
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression: `(()=>{const result=(${expression});return result instanceof Node ? Boolean(result) : result;})()`, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.text + ' ' + r.exceptionDetails.exception?.description); return r.result.value; };
  const until = async expression => { for (let i = 0; i < 160; i++) { try { if (await evaluate(`Boolean(${expression})`)) return; } catch (e) { if (!e.message.includes('Cannot read properties of null')) throw e; } await pause(250); } throw Error('Timeout: ' + expression); };
  const click = async expression => { await until(expression); await evaluate(`(()=>{const e=${expression};e.focus();e.click();})()`); await pause(250); };
  const button = text => `Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()===${JSON.stringify(text)})`;
  const link = href => `document.querySelector('a[href="${href}"]')`;
  const input = async (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.focus();Object.getOwnPropertyDescriptor(${selector.includes('textarea') ? 'HTMLTextAreaElement' : selector.includes('select') ? 'HTMLSelectElement' : 'HTMLInputElement'}.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const capture = async name => { await pause(300); await evaluate("document.querySelectorAll('nextjs-portal').forEach(e=>e.style.display='none')"); const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await fs.writeFile(root + '/screenshots/mtto-sprint-1/' + name + '.png', Buffer.from(shot.data, 'base64')); return evaluate('document.body.innerText'); };
  const key = async (key, code, v) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: v }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: v }); };
  return { ws, send, events, evaluate, until, click, button, link, input, capture, key };
}
