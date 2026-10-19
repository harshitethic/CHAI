import {_electron as electron} from 'playwright';
import {mkdtempSync,mkdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const base=mkdtempSync(join(tmpdir(),'chai-e2e-'));const root=join(base,'workspace');mkdirSync(root);mkdirSync('.qa',{recursive:true});
const executablePath=process.env.CHAI_EXECUTABLE||undefined;
async function launch(){return electron.launch({executablePath,args:[resolve('.')],env:{...process.env,CHAI_DATA_DIR:join(base,'data'),CHAI_TEST_WORKSPACE:root}});}
let app=await launch();try {let page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.getByRole('heading',{name:'Stop chatting. Start doing.'}).waitFor();
await page.screenshot({path:'.qa/home.png'});
await page.getByRole('textbox',{name:'Task goal'}).fill('write notes.txt with content one\ntwo\nthree');
await page.getByRole('button',{name:'Create task',exact:true}).click();
await page.getByRole('button',{name:'Approve plan',exact:true}).waitFor();
await page.getByRole('button',{name:'Approve plan',exact:true}).click();
await page.waitForFunction(()=>document.body.innerText.includes('TASK DONE'));
assert.equal(readFileSync(join(root,'notes.txt'),'utf8'),'one\ntwo\nthree');
await page.screenshot({path:'.qa/work.png'});
const snapshot=await page.evaluate(()=>window.chai.request({op:'snapshot'}));const id=snapshot.tasks[0].id;
await page.reload();await page.getByRole('button',{name:'Work',exact:true}).click();
assert.equal((await page.evaluate(()=>window.chai.request({op:'snapshot'}))).tasks[0].state,'DONE');
const prefs=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());assert.equal(prefs.sandbox,true);assert.equal(prefs.contextIsolation,true);assert.equal(prefs.nodeIntegration,false);
const invalid=await page.evaluate(async()=>{try{await window.chai.request({op:'shell',command:'touch bad'});return false;}catch{return true;}});assert(invalid);
await app.close();app=await launch();page=await app.firstWindow();await page.getByRole('heading',{name:'Stop chatting. Start doing.'}).waitFor();
const again=await page.evaluate(()=>window.chai.request({op:'snapshot'}));assert(again.tasks.some(t=>t.id===id&&t.state==='DONE'));
for(const width of [1024,1440,1920,3440]){await app.evaluate(({BrowserWindow},w)=>BrowserWindow.getAllWindows()[0].setSize(w,1000),width);await page.screenshot({path:`.qa/home-${width}.png`});}
assert.deepEqual(errors,[]);await app.close();console.log('PASS: native Electron task, approval, actual file, renderer reload, app restart, hardened preferences, invalid IPC, four widths.');

} finally { await app.close().catch(()=>{}); }
