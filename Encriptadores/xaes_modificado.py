import os

from cryptography.hazmat.primitives.kdf.argon2 import Argon2id
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding

CABECERA = b"Salted__"
TAM_SALT = 16

# Parámetros Argon2id (perfil recomendado por RFC 9106 con memoria reducida)
ARGON2_ITERACIONES = 3
ARGON2_LANES = 4
ARGON2_MEMORIA_KIB = 65536  # 64 MiB


def _derivar_key_iv(password: str, salt: bytes) -> tuple[bytes, bytes]:
    """Deriva una clave AES-128 (16 bytes) y un IV (16 bytes) desde la contraseña maestra con Argon2id."""
    kdf = Argon2id(
        salt=salt,
        length=32,
        iterations=ARGON2_ITERACIONES,
        lanes=ARGON2_LANES,
        memory_cost=ARGON2_MEMORIA_KIB,
    )
    clave_key_iv = kdf.derive(password.encode())
    return clave_key_iv[:16], clave_key_iv[16:]


def cifrar(datos: bytes, password_maestra: str) -> bytes:
    """
    Cifra datos con AES-128-CBC usando una contraseña maestra (clave derivada con Argon2id).
    Devuelve: cabecera (Salted__ + salt de 16 bytes) + datos cifrados.
    """
    salt = os.urandom(TAM_SALT)
    cabecera = CABECERA + salt

    key, iv = _derivar_key_iv(password_maestra, salt)

    padder = padding.PKCS7(128).padder()
    datos_con_relleno = padder.update(datos) + padder.finalize()

    cifrado = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cifrado.encryptor()
    datos_cifrados = encryptor.update(datos_con_relleno) + encryptor.finalize()

    return cabecera + datos_cifrados


def descifrar(datos_cifrados: bytes, password_maestra: str) -> bytes:
    """
    Descifra datos cifrados con AES-128-CBC usando la contraseña maestra (Argon2id).
    Espera el formato: cabecera (Salted__ + salt de 16 bytes) + datos cifrados.
    """
    if datos_cifrados[:8] != CABECERA:
        raise ValueError("Los datos no tienen el formato de cifrado AES esperado (Salted__).")

    inicio_cifrado = 8 + TAM_SALT
    salt = datos_cifrados[8:inicio_cifrado]
    textoCifradoSinCabecera = datos_cifrados[inicio_cifrado:]

    key, iv = _derivar_key_iv(password_maestra, salt)

    cifrado = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cifrado.decryptor()
    datos_descifrados_con_relleno = decryptor.update(textoCifradoSinCabecera) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()
    datos_descifrados = unpadder.update(datos_descifrados_con_relleno) + unpadder.finalize()

    return datos_descifrados
