import {contextBridge,ipcRenderer} from 'electron';
import type {Request} from '../core/contracts';
contextBridge.exposeInMainWorld('chai',{request:(request:Request)=>ipcRenderer.invoke('chai:request',request)});
