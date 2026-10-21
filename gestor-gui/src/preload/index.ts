import { contextBridge, ipcRenderer } from 'electron'
import type { VaultApi } from '../shared/types'

const api: VaultApi = {
  status: () => ipcRenderer.invoke('vault:status'),
  createMaster: (password, confirmation) =>
    ipcRenderer.invoke('vault:createMaster', password, confirmation),
  unlock: (password) => ipcRenderer.invoke('vault:unlock', password),
  lock: () => ipcRenderer.invoke('vault:lock'),
  listSites: () => ipcRenderer.invoke('vault:listSites'),
  addSite: (site, overwrite) => ipcRenderer.invoke('vault:addSite', site, overwrite),
  revealPassword: (site) => ipcRenderer.invoke('vault:revealPassword', site),
  copyPassword: (site) => ipcRenderer.invoke('vault:copyPassword', site),
  deleteSite: (site) => ipcRenderer.invoke('vault:deleteSite', site),
  onLocked: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('vault:locked', listener)
    return () => ipcRenderer.removeListener('vault:locked', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
