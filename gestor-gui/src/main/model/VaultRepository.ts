import { promises as fs } from 'node:fs'
import path from 'node:path'
import { VaultError } from './errors'

const ARCHIVO_MAESTRA = '.master_hash'
const ARCHIVO_CONTRASENYAS = 'contrasenyas.json'

/** Contraseñas guardadas: { site: contraseña_cifrada_en_base64 } */
export type Sitios = Record<string, string>

/** Persistencia en disco. Es la única parte del modelo que conoce el sistema de archivos. */
export class VaultRepository {
  constructor(private readonly dir: string) {}

  private get rutaMaestra(): string {
    return path.join(this.dir, ARCHIVO_MAESTRA)
  }
  private get rutaSites(): string {
    return path.join(this.dir, ARCHIVO_CONTRASENYAS)
  }

  async existeMaestra(): Promise<boolean> {
    try {
      await fs.access(this.rutaMaestra)
      return true
    } catch {
      return false
    }
  }

  /** Contenido de .master_hash (salt + hash) o null si no existe. */
  async leerMaestra(): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.rutaMaestra)
    } catch {
      return null
    }
  }

  async guardarMaestra(contenido: Buffer): Promise<void> {
    await fs.writeFile(this.rutaMaestra, contenido, { mode: 0o600 })
  }

  async leerSites(): Promise<Sitios> {
    try {
      return JSON.parse(await fs.readFile(this.rutaSites, 'utf8')) as Sitios
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return {}
      throw new VaultError(`${ARCHIVO_CONTRASENYAS} no es un JSON válido.`)
    }
  }

  /** Escritura atómica: archivo temporal + rename. */
  async guardarSites(sites: Sitios): Promise<void> {
    const temporal = this.rutaSites + '.tmp'
    await fs.writeFile(temporal, JSON.stringify(sites, null, 2), { mode: 0o600 })
    await fs.rename(temporal, this.rutaSites)
  }
}
