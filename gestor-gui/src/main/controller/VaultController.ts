import type { IpcMain } from 'electron'
import { VaultError } from '../model/errors'
import type { Vault } from '../model/Vault'
import type { Result } from '../../shared/types'

const INACTIVIDAD_MS = 5 * 60_000
const LIMPIAR_PORTAPAPELES_MS = 20_000

/** Lo mínimo que el controlador necesita del portapapeles (lo cumple el de Electron). */
export interface ClipboardPort {
  writeText(texto: string): Promise<void>
  readText(): Promise<string>
  clear(): void
}

/** Cómo avisa el controlador a la vista de que el gestor se ha bloqueado. */
export interface LockNotifier {
  notifyLocked(): void
}

/**
 * Controlador: recibe las peticiones de la vista (IPC), valida la entrada,
 * llama al modelo y devuelve siempre un Result. También gestiona la sesión
 * (bloqueo por inactividad) y el portapapeles.
 */
export class VaultController {
  private temporizadorInactividad: NodeJS.Timeout | undefined

  constructor(
    private readonly vault: Vault,
    private readonly clipboard: ClipboardPort,
    private readonly vista: LockNotifier
  ) {}

  register(ipc: IpcMain): void {
    ipc.handle('vault:status', () => this.run(() => this.vault.status()))
    ipc.handle('vault:createMaster', (_e, p, c) =>
      this.run(() => this.vault.createMaster(this.texto(p), this.texto(c)))
    )
    ipc.handle('vault:unlock', (_e, p) => this.run(() => this.vault.unlock(this.texto(p))))
    ipc.handle('vault:lock', () => this.run(() => this.lock()))
    ipc.handle('vault:listSites', () => this.run(() => this.vault.listSites()))
    ipc.handle('vault:addSite', (_e, s, o) =>
      this.run(() => this.vault.addSite(this.texto(s), o === true))
    )
    ipc.handle('vault:revealPassword', (_e, s) =>
      this.run(() => this.vault.revealPassword(this.texto(s)))
    )
    ipc.handle('vault:copyPassword', (_e, s) => this.run(() => this.copiar(this.texto(s))))
    ipc.handle('vault:deleteSite', (_e, s) => this.run(() => this.vault.deleteSite(this.texto(s))))
  }

  /** Bloquea el gestor y avisa a la vista. */
  lock(): void {
    this.vault.lock()
    clearTimeout(this.temporizadorInactividad)
    this.vista.notifyLocked()
  }

  private async copiar(site: string): Promise<void> {
    const contrasenya = await this.vault.revealPassword(site)
    await this.clipboard.writeText(contrasenya)
    // Vacía el portapapeles pasado un tiempo, solo si sigue conteniendo esa contraseña
    setTimeout(() => {
      void this.clipboard.readText().then((actual) => {
        if (actual === contrasenya) this.clipboard.clear()
      })
    }, LIMPIAR_PORTAPAPELES_MS)
  }

  private texto(valor: unknown): string {
    if (typeof valor !== 'string') throw new VaultError('Entrada no válida.')
    return valor
  }

  private reiniciarInactividad(): void {
    clearTimeout(this.temporizadorInactividad)
    this.temporizadorInactividad = setTimeout(() => this.lock(), INACTIVIDAD_MS)
  }

  /** Ejecuta una acción y la convierte en Result; los errores internos no se filtran a la vista. */
  private async run<T>(accion: () => Promise<T> | T): Promise<Result<T>> {
    try {
      const data = await accion()
      this.reiniciarInactividad()
      return { ok: true, data }
    } catch (e) {
      if (e instanceof VaultError) return { ok: false, error: e.message }
      console.error(e)
      return { ok: false, error: 'Error interno.' }
    }
  }
}
