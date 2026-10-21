import type { VaultApi } from '../../../shared/types'

/**
 * Modelo (lado renderer): único punto de acceso a los datos del gestor.
 * Los controladores dependen de esta interfaz y no del objeto global window.
 */
export const vaultService: VaultApi = {
  status: () => window.api.status(),
  createMaster: (password, confirmation) => window.api.createMaster(password, confirmation),
  unlock: (password) => window.api.unlock(password),
  lock: () => window.api.lock(),
  listSites: () => window.api.listSites(),
  addSite: (site, overwrite) => window.api.addSite(site, overwrite),
  revealPassword: (site) => window.api.revealPassword(site),
  copyPassword: (site) => window.api.copyPassword(site),
  deleteSite: (site) => window.api.deleteSite(site),
  onLocked: (callback) => window.api.onLocked(callback)
}
