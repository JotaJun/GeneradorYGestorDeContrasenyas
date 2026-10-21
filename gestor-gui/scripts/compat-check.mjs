// Comprueba que el cifrado TypeScript (hash-wasm + node:crypto) es compatible con Python.
// Uso: node scripts/compat-check.mjs   (necesita python3 con "cryptography" instalado)
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { argon2id } from 'hash-wasm'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const pw = 'contraseña-maestra-ñ✓'
const texto = 'G-$E;PRB"n0LF8|J'

const derivar = async (salt) => {
  const h = Buffer.from(await argon2id({
    password: Buffer.from(pw, 'utf8'), salt, parallelism: 4, iterations: 3,
    memorySize: 65536, hashLength: 32, outputType: 'binary'
  }))
  return { key: h.subarray(0, 16), iv: h.subarray(16) }
}

const py = (codigo, entrada) =>
  execFileSync('python3', ['-I', '-c', codigo], {
    cwd: path.join(raiz, 'Encriptadores'), input: entrada, encoding: 'utf8'
  }).trim()

const pyCifrar = `import sys,base64; sys.path.insert(0,'.')
from xaes_modificado import cifrar
print(base64.b64encode(cifrar(sys.stdin.read().encode(), ${JSON.stringify(pw)})).decode())`
const pyDescifrar = `import sys,base64; sys.path.insert(0,'.')
from xaes_modificado import descifrar
print(descifrar(base64.b64decode(sys.stdin.read()), ${JSON.stringify(pw)}).decode())`

// Python -> TypeScript
const deJs = Buffer.from(py(pyCifrar, texto), 'base64')
const { key, iv } = await derivar(deJs.subarray(8, 24))
const d = createDecipheriv('aes-128-cbc', key, iv)
const claro = Buffer.concat([d.update(deJs.subarray(24)), d.final()]).toString('utf8')
console.log('Python -> TS:', claro === texto ? 'OK' : 'FALLO')

// TypeScript -> Python
const salt = randomBytes(16)
const k = await derivar(salt)
const c = createCipheriv('aes-128-cbc', k.key, k.iv)
const cifrado = Buffer.concat([Buffer.from('Salted__'), salt, c.update(texto), c.final()])
const vuelta = py(pyDescifrar, cifrado.toString('base64'))
console.log('TS -> Python:', vuelta === texto ? 'OK' : 'FALLO')
process.exit(claro === texto && vuelta === texto ? 0 : 1)
