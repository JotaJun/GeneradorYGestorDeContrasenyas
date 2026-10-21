import json
import os
import sys
import getpass
import hmac

from cryptography.hazmat.primitives.kdf.argon2 import Argon2id
import base64

from Generador import generar_contrasenya
from Encriptadores.xaes_modificado import (
    cifrar,
    descifrar,
    ARGON2_ITERACIONES,
    ARGON2_LANES,
    ARGON2_MEMORIA_KIB,
)

ARCHIVO_CONTRASENYAS = "contrasenyas.json"
ARCHIVO_MAESTRA = ".master_hash"

TAM_SALT = 16
LONGITUD_MINIMA = 8
MAX_INTENTOS = 3


def _hash_contrasenya(contrasenya: str, salt: bytes) -> bytes:
    """Genera un hash Argon2id de la contraseña maestra para verificación."""
    kdf = Argon2id(
        salt=salt,
        length=32,
        iterations=ARGON2_ITERACIONES,
        lanes=ARGON2_LANES,
        memory_cost=ARGON2_MEMORIA_KIB,
    )
    return kdf.derive(contrasenya.encode())


def _crear_contrasenya_maestra() -> str:
    """Pide una contraseña maestra nueva (sin mostrarla en pantalla) y la guarda como salt + hash."""
    print("No hay contraseña maestra configurada. Vamos a crear una.")
    print(f"(Mínimo {LONGITUD_MINIMA} caracteres. Lo que escribas no se mostrará en pantalla.)\n")

    while True:
        contrasenya = getpass.getpass("Nueva contraseña maestra: ")
        if len(contrasenya) < LONGITUD_MINIMA:
            print(f"La contraseña debe tener al menos {LONGITUD_MINIMA} caracteres.\n")
            continue

        confirmacion = getpass.getpass("Confirma la contraseña maestra: ")
        if not hmac.compare_digest(contrasenya.encode(), confirmacion.encode()):
            print("Las contraseñas no coinciden. Inténtalo de nuevo.\n")
            continue
        break

    salt = os.urandom(TAM_SALT)
    hash_maestro = _hash_contrasenya(contrasenya, salt)

    descriptor = os.open(ARCHIVO_MAESTRA, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "wb") as f:
        f.write(salt + hash_maestro)

    print("Contraseña maestra creada correctamente.")
    return contrasenya


def _verificar_contrasenya_maestra() -> str:
    """Pide la contraseña maestra existente y la comprueba contra el hash guardado."""
    with open(ARCHIVO_MAESTRA, "rb") as f:
        contenido = f.read()
    salt, hash_guardado = contenido[:TAM_SALT], contenido[TAM_SALT:]

    for intento in range(1, MAX_INTENTOS + 1):
        contrasenya = getpass.getpass("Contraseña maestra: ")
        if hmac.compare_digest(_hash_contrasenya(contrasenya, salt), hash_guardado):
            return contrasenya
        print(f"Contraseña incorrecta ({intento}/{MAX_INTENTOS}).")

    print("Demasiados intentos fallidos.")
    sys.exit(1)


def _obtener_contrasenya_maestra() -> str:
    """Crea la contraseña maestra si no existe; si existe, la pide y la verifica."""
    if not os.path.exists(ARCHIVO_MAESTRA):
        return _crear_contrasenya_maestra()
    return _verificar_contrasenya_maestra()


def _cargar_sites() -> dict[str, str]:
    """Lee el JSON {site: contraseña_cifrada}. Si no existe, devuelve un diccionario vacío."""
    if not os.path.exists(ARCHIVO_CONTRASENYAS):
        return {}
    try:
        with open(ARCHIVO_CONTRASENYAS, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        print(f"Error: {ARCHIVO_CONTRASENYAS} no es un JSON válido.")
        sys.exit(1)


def _guardar_sites(sites: dict[str, str]) -> None:
    """Guarda el JSON {site: contraseña_cifrada} (permisos 600, escritura atómica)."""
    temporal = ARCHIVO_CONTRASENYAS + ".tmp"
    descriptor = os.open(temporal, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as f:
        json.dump(sites, f, indent=2, ensure_ascii=False)
    os.replace(temporal, ARCHIVO_CONTRASENYAS)


def _confirmar(pregunta: str) -> bool:
    """Pregunta sí/no al usuario."""
    return input(f"{pregunta} (s/n): ").strip().lower() in ("s", "si", "sí")


def _elegir_site(sites: dict[str, str]) -> str | None:
    """Muestra los sites numerados y devuelve el elegido (o None si se cancela)."""
    nombres = sorted(sites)
    for i, nombre in enumerate(nombres, start=1):
        print(f"  {i}. {nombre}")

    eleccion = input("Elige un site (número o nombre, vacío para cancelar): ").strip()
    if not eleccion:
        return None
    if eleccion.isdigit() and 1 <= int(eleccion) <= len(nombres):
        return nombres[int(eleccion) - 1]
    if eleccion in sites:
        return eleccion
    print("Site no encontrado.")
    return None


def anyadir_site(sites: dict[str, str], password_maestra: str) -> None:
    """Opción 1: genera una contraseña para un site nuevo y la guarda cifrada."""
    site = input("Nombre del site: ").strip()
    if not site:
        print("El nombre no puede estar vacío.")
        return
    if site in sites and not _confirmar(f"'{site}' ya existe. ¿Generar una contraseña nueva y sobrescribirla?"):
        return

    contrasenya = generar_contrasenya()
    cifrada = cifrar(contrasenya.encode(), password_maestra)
    sites[site] = base64.b64encode(cifrada).decode()
    _guardar_sites(sites)
    print(f"Contraseña generada y guardada para '{site}'.")


def listar_sites(sites: dict[str, str]) -> None:
    """Opción 2: lista los sites guardados."""
    if not sites:
        print("No hay sites guardados.")
        return
    print("Sites guardados:")
    for nombre in sorted(sites):
        print(f"  - {nombre}")


def mostrar_contrasenya(sites: dict[str, str], password_maestra: str) -> None:
    """Opción 3: muestra la contraseña de un site tras pedir confirmación."""
    if not sites:
        print("No hay sites guardados.")
        return
    site = _elegir_site(sites)
    if site is None:
        return
    if not _confirmar(f"¿Seguro que quieres mostrar la contraseña de '{site}' por pantalla?"):
        print("Operación cancelada.")
        return

    try:
        cifrada = base64.b64decode(sites[site])
        contrasenya = descifrar(cifrada, password_maestra).decode()
    except ValueError:
        print("No se pudo descifrar la contraseña (datos corruptos o clave incorrecta).")
        return
    print(f"Contraseña de '{site}': {contrasenya}")


def borrar_site(sites: dict[str, str]) -> None:
    """Opción 4: borra un site tras pedir confirmación."""
    if not sites:
        print("No hay sites guardados.")
        return
    site = _elegir_site(sites)
    if site is None:
        return
    if not _confirmar(f"¿Seguro que quieres borrar '{site}'? No se puede deshacer."):
        print("Operación cancelada.")
        return

    del sites[site]
    _guardar_sites(sites)
    print(f"'{site}' borrado.")


def menu() -> str:
    """Muestra el menú principal y devuelve la opción elegida."""
    print("\n=== Gestor de Contraseñas ===")
    print("1. Añadir site (genera contraseña)")
    print("2. Listar sites")
    print("3. Mostrar contraseña de un site")
    print("4. Borrar un site")
    print("5. Salir")
    return input("Elige una opción: ").strip()


def main() -> None:
    password_maestra = _obtener_contrasenya_maestra()
    sites = _cargar_sites()

    while True:
        opcion = menu()
        if opcion == "1":
            anyadir_site(sites, password_maestra)
        elif opcion == "2":
            listar_sites(sites)
        elif opcion == "3":
            mostrar_contrasenya(sites, password_maestra)
        elif opcion == "4":
            borrar_site(sites)
        elif opcion == "5":
            print("Hasta luego.")
            break
        else:
            print("Opción no válida.")


if __name__ == "__main__":
    main()
