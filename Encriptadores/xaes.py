import sys
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding

if len(sys.argv) < 3:
    print("Uso: cat fichero | python3 xaes.py -option password ")
    exit(-1)

password = sys.argv[2]
option = sys.argv[1]


if option == "-d":
    textoParaDesencriptar = sys.stdin.buffer.read()  # para que lea de la entrada estándar
                                                    # y pueda leer el archivo que se le pasa
                                                    # desde terminal

    # Primero comprobamos si los 8 primero bytes del mensaje
    # contienen la firma Salted__ habitual de la encriptación aes
    firma: bytes = textoParaDesencriptar[:8]
    if firma != b"Salted__":
        print("No es cifrado aes", file=sys.stderr)
        exit(-1)
    salt: bytes = textoParaDesencriptar[8:16]
    textoCifradoSinCabecera = textoParaDesencriptar[16:]
    cabecera: bytes = b"Salted__" + salt


elif option == "-e": #Cifrar
    textoParaEncriptar = sys.stdin.buffer.read()
    salt: bytes = os.urandom(8) # Usamos os.urandom en vez del módulo random ya que este es
                                # más seguro criptográficamente hablando (consultar readme)
    cabecera: bytes = b"Salted__" + salt

else:
    print("Invalid option")
    exit(-1)


kdf = PBKDF2HMAC(algorithm=hashes.SHA256(),
                     length=32,
                     salt=salt,
                     iterations=10000)
password_bytes: bytes = password.encode()
clave_key_iv = kdf.derive(password_bytes)

key,iv = clave_key_iv[:16], clave_key_iv[16:]


if option == "-d":
    cifrado = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cifrado.decryptor()

    datos_descifrados_con_relleno = decryptor.update(textoCifradoSinCabecera) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()

    datos_descifrados = unpadder.update(datos_descifrados_con_relleno) + unpadder.finalize()

elif option == "-e":
    padder = padding.PKCS7(128).padder()
    datos_con_relleno = padder.update(textoParaEncriptar) + padder.finalize()
    cifrado = Cipher(algorithms.AES(key), modes.CBC(iv))

    encryptor = cifrado.encryptor()

    datos_cifrados = encryptor.update(datos_con_relleno) + encryptor.finalize()

if option == "-d":
    sys.stdout.buffer.write(datos_descifrados)
else:
    sys.stdout.buffer.write(cabecera)
    sys.stdout.buffer.write(datos_cifrados)
    

