import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto'
import { argon2id } from 'hash-wasm'

// Mismos parámetros y formato que Encriptadores/xaes_modificado.py
const CABECERA = Buffer.from('Salted__')
export const TAM_SALT = 16
const ARGON2_ITERACIONES = 3
const ARGON2_LANES = 4
const ARGON2_MEMORIA_KIB = 65536 // 64 MiB

async function argon2(password: string, salt: Uint8Array): Promise<Buffer> {
  const hash = await argon2id({
    password: Buffer.from(password, 'utf8'),
    salt,
    parallelism: ARGON2_LANES,
    iterations: ARGON2_ITERACIONES,
    memorySize: ARGON2_MEMORIA_KIB,
    hashLength: 32,
    outputType: 'binary'
  })
  return Buffer.from(hash)
}

/** Clave AES-128 (16 bytes) + IV (16 bytes) derivados con Argon2id. */
async function derivarKeyIv(password: string, salt: Uint8Array): Promise<{ key: Buffer; iv: Buffer }> {
  const derivado = await argon2(password, salt)
  return { key: derivado.subarray(0, 16), iv: derivado.subarray(16) }
}

/** Devuelve: "Salted__" + salt(16) + AES-128-CBC(PKCS7). */
export async function cifrar(datos: Buffer, passwordMaestra: string): Promise<Buffer> {
  const salt = randomBytes(TAM_SALT)
  const { key, iv } = await derivarKeyIv(passwordMaestra, salt)
  const cipher = createCipheriv('aes-128-cbc', key, iv)
  return Buffer.concat([CABECERA, salt, cipher.update(datos), cipher.final()])
}

export async function descifrar(datosCifrados: Buffer, passwordMaestra: string): Promise<Buffer> {
  if (!datosCifrados.subarray(0, 8).equals(CABECERA)) {
    throw new Error('Los datos no tienen el formato de cifrado esperado (Salted__).')
  }
  const inicio = 8 + TAM_SALT
  const salt = datosCifrados.subarray(8, inicio)
  const { key, iv } = await derivarKeyIv(passwordMaestra, salt)
  const decipher = createDecipheriv('aes-128-cbc', key, iv)
  try {
    return Buffer.concat([decipher.update(datosCifrados.subarray(inicio)), decipher.final()])
  } catch {
    throw new Error('No se pudo descifrar (datos corruptos o clave incorrecta).')
  }
}

/** Hash de verificación de la contraseña maestra (igual que _hash_contrasenya en Gestor.py). */
export function hashMaestra(password: string, salt: Uint8Array): Promise<Buffer> {
  return argon2(password, salt)
}

export function iguales(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && timingSafeEqual(a, b)
}
