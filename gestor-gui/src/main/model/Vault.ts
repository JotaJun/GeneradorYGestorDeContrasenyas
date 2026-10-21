import { randomBytes } from 'node:crypto'
import { cifrar, descifrar, hashMaestra, iguales, TAM_SALT } from './crypto'
import { VaultError } from './errors'
import { generarContrasenya } from './generator'
import type { VaultRepository } from './VaultRepository'
import type { VaultStatus } from '../../shared/types'

const LONGITUD_MINIMA = 8
const MAX_INTENTOS = 3
const BLOQUEO_MS = 30_000

/** Lógica de negocio del gestor. No sabe nada de Electron, ventanas ni IPC. */
export class Vault {
  private masterPassword: string | null = null
  private fallos = 0
  private bloqueadoHasta = 0

  constructor(private readonly repo: VaultRepository) {}

  async status(): Promise<VaultStatus> {
    return {
      hasMaster: await this.repo.existeMaestra(),
      unlocked: this.masterPassword !== null,
      lockoutSeconds: Math.max(0, Math.ceil((this.bloqueadoHasta - Date.now()) / 1000))
    }
  }

  async createMaster(password: string, confirmation: string): Promise<void> {
    if (await this.repo.existeMaestra()) throw new VaultError('Ya existe una contraseña maestra.')
    if (password.length < LONGITUD_MINIMA) {
      throw new VaultError(`La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres.`)
    }
    if (password !== confirmation) throw new VaultError('Las contraseñas no coinciden.')

    const salt = randomBytes(TAM_SALT)
    const hash = await hashMaestra(password, salt)
    await this.repo.guardarMaestra(Buffer.concat([salt, hash]))
    this.masterPassword = password
  }

  async unlock(password: string): Promise<void> {
    const restante = Math.ceil((this.bloqueadoHasta - Date.now()) / 1000)
    if (restante > 0) throw new VaultError(`Demasiados intentos. Espera ${restante} s.`)

    const contenido = await this.repo.leerMaestra()
    if (!contenido) throw new VaultError('No hay contraseña maestra configurada.')
    const salt = contenido.subarray(0, TAM_SALT)
    const guardado = contenido.subarray(TAM_SALT)

    if (iguales(await hashMaestra(password, salt), guardado)) {
      this.fallos = 0
      this.masterPassword = password
      return
    }
    this.fallos++
    if (this.fallos >= MAX_INTENTOS) {
      this.fallos = 0
      this.bloqueadoHasta = Date.now() + BLOQUEO_MS
      throw new VaultError(`Demasiados intentos fallidos. Espera ${BLOQUEO_MS / 1000} s.`)
    }
    throw new VaultError(`Contraseña incorrecta (${this.fallos}/${MAX_INTENTOS}).`)
  }

  lock(): void {
    this.masterPassword = null
  }

  private maestra(): string {
    if (this.masterPassword === null) throw new VaultError('El gestor está bloqueado.')
    return this.masterPassword
  }

  async listSites(): Promise<string[]> {
    this.maestra()
    return Object.keys(await this.repo.leerSites()).sort((a, b) => a.localeCompare(b))
  }

  async addSite(site: string, overwrite: boolean): Promise<void> {
    const maestra = this.maestra()
    const nombre = site.trim()
    if (!nombre) throw new VaultError('El nombre no puede estar vacío.')

    const sites = await this.repo.leerSites()
    if (Object.hasOwn(sites, nombre) && !overwrite) throw new VaultError('EXISTS')

    const cifrada = await cifrar(Buffer.from(generarContrasenya(), 'utf8'), maestra)
    sites[nombre] = cifrada.toString('base64')
    await this.repo.guardarSites(sites)
  }

  async revealPassword(site: string): Promise<string> {
    const maestra = this.maestra()
    const sites = await this.repo.leerSites()
    if (!Object.hasOwn(sites, site)) throw new VaultError('Site no encontrado.')
    try {
      return (await descifrar(Buffer.from(sites[site], 'base64'), maestra)).toString('utf8')
    } catch (e) {
      throw new VaultError((e as Error).message)
    }
  }

  async deleteSite(site: string): Promise<void> {
    this.maestra()
    const sites = await this.repo.leerSites()
    if (!Object.hasOwn(sites, site)) throw new VaultError('Site no encontrado.')
    delete sites[site]
    await this.repo.guardarSites(sites)
  }
}
