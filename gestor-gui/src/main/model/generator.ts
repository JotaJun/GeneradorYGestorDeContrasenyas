import { randomInt } from 'node:crypto'

// Equivalente a Generador.py (string.punctuation de Python)
const ESPECIALES = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'
const DIGITOS = '0123456789'
const MAYUSCULAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const MINUSCULAS = 'abcdefghijklmnopqrstuvwxyz'
const TODAS = MAYUSCULAS + MINUSCULAS + DIGITOS + ESPECIALES

const elegir = (conjunto: string): string => conjunto[randomInt(conjunto.length)]

export function generarContrasenya(longitud = 16): string {
  if (longitud < 4) throw new Error('La longitud mínima es 4 para cumplir todos los requisitos.')

  // 1 especial, 2 dígitos y 1 mayúscula garantizados; el resto aleatorio
  const caracteres = [elegir(ESPECIALES), elegir(DIGITOS), elegir(DIGITOS), elegir(MAYUSCULAS)]
  for (let i = 0; i < longitud - 4; i++) caracteres.push(elegir(TODAS))

  // Fisher-Yates con aleatoriedad criptográfica
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]]
  }
  return caracteres.join('')
}
