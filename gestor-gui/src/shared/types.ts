/** Resultado de toda llamada IPC: nunca lanza excepciones hacia el renderer. */
export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string }

export interface VaultStatus {
  hasMaster: boolean
  unlocked: boolean
  /** Segundos restantes de bloqueo por demasiados intentos fallidos (0 = sin bloqueo). */
  lockoutSeconds: number
}

export interface VaultApi {
  status(): Promise<Result<VaultStatus>>
  createMaster(password: string, confirmation: string): Promise<Result>
  unlock(password: string): Promise<Result>
  lock(): Promise<Result>
  listSites(): Promise<Result<string[]>>
  addSite(site: string, overwrite: boolean): Promise<Result>
  revealPassword(site: string): Promise<Result<string>>
  copyPassword(site: string): Promise<Result>
  deleteSite(site: string): Promise<Result>
  onLocked(callback: () => void): () => void
}
