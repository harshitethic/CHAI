import {app,BrowserWindow,WebContentsView,ipcMain,dialog,session,shell,desktopCapturer,Menu} from 'electron';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFileSync,mkdirSync} from 'node:fs';
import {Store} from '../core/store';
import {Engine} from '../core/engine';
import {Gateway,workspace} from '../core/gateway';
import {requestSchema,redact} from '../core/contracts';
import {models} from '../core/providers';
if(process.env.CHAI_DATA_DIR)app.setPath('userData',process.env.CHAI_DATA_DIR);
process.umask(0o077);
let main:BrowserWindow;let store:Store;let engine:Engine;let availableModels:string[]=[];let providerError:string|null=null;
const windows=new Map<string,BrowserWindow>();let browserView:WebContentsView|undefined;
const rendererURL=pathToFileURL(join(__dirname,'index.html')).href;
function allowedProvider(url:string){try{const u=new URL(url);return u.protocol==='https:'&&['chatgpt.com','auth.openai.com','auth0.openai.com','accounts.google.com','login.microsoftonline.com','appleid.apple.com'].includes(u.hostname);}catch{return false;}}
function guard(view:WebContentsView,allow:(u:string)=>boolean){const wc=view.webContents;
 wc.setWindowOpenHandler(()=>({action:'deny'}));wc.on('will-navigate',(e,url)=>{if(!allow(url))e.preventDefault();});wc.on('will-redirect',(e,url)=>{if(!allow(url))e.preventDefault();});
 wc.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));wc.session.setPermissionCheckHandler(()=>false);wc.session.on('will-download',e=>e.preventDefault());
}
async function remoteWindow(key:string,url:string,provider:boolean){
 if(windows.has(key)){windows.get(key)!.focus();return;}
 const win=new BrowserWindow({width:1100,height:800,title:provider?`CHAI ${key} · ChatGPT interactive only`:'CHAI · Isolated browser',backgroundColor:'#18191b',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
 const view=new WebContentsView({webPreferences:{partition:provider?'persist:chai-chatgpt':'chai-browser',sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
 guard(view,provider?allowedProvider:u=>{try{const parsed=new URL(u);return parsed.protocol==='https:'&&parsed.origin===new URL(url).origin;}catch{return false;}});
 win.contentView.addChildView(view);const bounds=()=>{const [width,height]=win.getContentSize();view.setBounds({x:0,y:0,width,height});};bounds();win.on('resize',bounds);
 windows.set(key,win);if(!provider)browserView=view;
 win.on('closed',()=>{windows.delete(key);if(!provider)browserView=undefined;if(!view.webContents.isDestroyed())view.webContents.close();});
 try{await view.webContents.loadURL(url);}catch(e){await dialog.showMessageBox(win,{type:'warning',message:'This page could not load',detail:String(e)+'\nChatGPT remains manual. Use the external-browser option if embedded sign-in is blocked.'});}
}
async function confirm(message:string,detail:string){return (await dialog.showMessageBox(main,{type:'warning',message,detail,buttons:['Cancel','Allow once'],defaultId:0,cancelId:0,noLink:true})).response===1;}
async function saveImage(data:Buffer,label:string){const target=await dialog.showSaveDialog(main,{title:label,defaultPath:'chai-capture.png',filters:[{name:'PNG',extensions:['png']}]});if(target.canceled||!target.filePath)return null;writeFileSync(target.filePath,data,{mode:0o600});return target.filePath;}
app.whenReady().then(()=>{
 const data=app.getPath('userData');mkdirSync(data,{recursive:true,mode:0o700});store=new Store(join(data,'chai.sqlite'));engine=new Engine(store,new Gateway(join(app.isPackaged?__dirname.replace('app.asar','app.asar.unpacked'):__dirname,'files.py')));
 if(process.env.CHAI_TEST_WORKSPACE)store.setting('workspace',workspace(process.env.CHAI_TEST_WORKSPACE));
 main=new BrowserWindow({width:1440,height:950,minWidth:940,minHeight:660,title:'CHAI — Stop chatting. Start doing.',backgroundColor:'#18191b',webPreferences:{preload:join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
 main.webContents.setWindowOpenHandler(()=>({action:'deny'}));main.webContents.on('will-navigate',e=>e.preventDefault());session.defaultSession.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'CHAI',submenu:[{label:'Stop all actions',accelerator:'CommandOrControl+Shift+.',click:()=>engine.stop()},{type:'separator'},{role:'quit'}]},{label:'View',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]}]));
 ipcMain.handle('chai:request',async(event,input:unknown)=>{
  if(event.sender!==main.webContents||event.senderFrame!==main.webContents.mainFrame||event.senderFrame.url!==rendererURL)throw Error('Untrusted IPC sender');
  const req=requestSchema.parse(input);
  switch(req.op){
   case 'snapshot':return {tasks:store.tasks(),events:store.events(),workspace:store.setting('workspace')??null,models:availableModels,providerError};
   case 'workspace':{const result=await dialog.showOpenDialog(main,{properties:['openDirectory','createDirectory'],title:'Choose a dedicated CHAI workspace'});if(result.canceled)return null;const path=workspace(result.filePaths[0]);store.setting('workspace',path);return path;}
   case 'create':{const root=store.setting('workspace');if(!root)throw Error('Choose a workspace first');return engine.create(req.goal,workspace(root),req.mode,req.model,req.plan);}
   case 'approve':return engine.approve(req.id,req.allow);
   case 'resume':return engine.resume(req.id);
   case 'pause':return engine.pause(req.id);
   case 'stop':engine.stop();return true;
   case 'undo':if(await confirm('Restore recorded file versions?','Only files that still match the recorded result will be restored. Newly created files are retained.'))return engine.undo(req.id);return false;
   case 'delete':{const t=store.get(req.id);if(!['DONE','FAILED','CANCELED','PAUSED'].includes(t.state)||engine.active.size)throw Error('Stop active work first');if(!await confirm('Delete this task history?','This removes its local logs and undo snapshots. Files in the workspace remain.'))return false;store.db.exec('BEGIN');try{for(const table of ['events','effects','approvals'])store.db.prepare(`DELETE FROM ${table} WHERE taskId=?`).run(req.id);store.db.prepare('DELETE FROM tasks WHERE id=?').run(req.id);store.db.exec('COMMIT');}catch(e){store.db.exec('ROLLBACK');throw e;}return true;}
   case 'export':{const t=store.get(req.id);const path=await dialog.showSaveDialog(main,{defaultPath:`chai-${t.id}.json`});if(!path.canceled&&path.filePath){writeFileSync(path.filePath,redact(JSON.stringify({task:t,events:store.events().filter(e=>e.taskId===t.id)},null,2)),{mode:0o600});return path.filePath;}return null;}
   case 'models':try{availableModels=await models();providerError=null;}catch(e){availableModels=[];providerError=String(e);}return availableModels;
   case 'provider':return remoteWindow(req.role,'https://chatgpt.com/',true);
   case 'external-chat':return shell.openExternal('https://chatgpt.com/');
   case 'clear-provider':if(await confirm('Clear CHAI’s ChatGPT sign-in?','Closes CHAI provider windows and clears only CHAI’s isolated browser partition.')){for(const [key,win] of windows)if(key!=='browser')win.close();await session.fromPartition('persist:chai-chatgpt').clearStorageData();return true;}return false;
   case 'browser':{const url=new URL(req.url);if(url.protocol!=='https:'||url.username||url.password)throw Error('Use a public HTTPS URL without credentials');if(!await confirm('Open isolated browser?',`Destination: ${url.origin}. Browsing contacts this website. Navigation is restricted to this origin; downloads and device permissions are disabled.`))return;windows.get('browser')?.close();return remoteWindow('browser',url.href,false);}
   case 'browser-capture':if(!browserView)throw Error('Open an isolated browser first');if(!await confirm('Capture the isolated browser?','This saves the visible page, which may include private information.'))return null;return saveImage((await browserView.webContents.capturePage()).toPNG(),'Save browser screenshot');
   case 'browser-click':if(!browserView)throw Error('Open an isolated browser first');if(!await confirm('Click in isolated browser?',`Single left click at ${req.x}, ${req.y}. Check the visible target first; this may submit a form or change a remote account.`))return false;browserView.webContents.sendInputEvent({type:'mouseDown',x:req.x,y:req.y,button:'left',clickCount:1});browserView.webContents.sendInputEvent({type:'mouseUp',x:req.x,y:req.y,button:'left',clickCount:1});store.event('host','builder','BROWSER_CLICK',JSON.stringify({x:req.x,y:req.y}));return true;
   case 'desktop-click':if(!await confirm('Click on your desktop?',`Single left click at ${req.x}, ${req.y} on the X11 desktop. Review the target. This may affect other applications.`))return false;await engine.gateway.run('/usr/bin/xdotool',['mousemove','--sync',String(req.x),String(req.y),'click','1'],app.getPath('userData'));store.event('host','builder','DESKTOP_CLICK',JSON.stringify({x:req.x,y:req.y}));return true;
   case 'capture':{if(!await confirm('Capture your desktop?','Visible windows can contain private information. You will choose a screen and where to save the image. No image is sent to a model.'))return null;const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:3840,height:2160}});const choice=await dialog.showMessageBox(main,{message:'Choose screen',buttons:['Cancel',...sources.map(s=>s.name)],cancelId:0,defaultId:0});if(choice.response===0)return null;store.event('host','builder','SCREENSHOT','User requested one desktop capture.');return saveImage(sources[choice.response-1].thumbnail.toPNG(),'Save desktop screenshot');}
  }
 });
 void main.loadFile(join(__dirname,'index.html'));
 main.on('close',()=>{for(const t of store.tasks())engine.pause(t.id);for(const win of windows.values())win.close();});
}).catch(e=>{console.error(redact(String(e)));app.exit(1);});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{engine?.gateway.stop();});
