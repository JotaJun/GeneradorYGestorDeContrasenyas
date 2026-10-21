import secrets
import string

def generar_contrasenya(longitud=16):
    if longitud < 4:
        raise ValueError("La longitud mínima es 4 para cumplir todos los requisitos.")

    especiales = string.punctuation
    digitos = string.digits
    mayusculas = string.ascii_uppercase
    minusculas = string.ascii_lowercase
    todas = string.ascii_letters + digitos + especiales

    # Garantizar los requisitos mínimos
    contrasenya = [
        secrets.choice(especiales),   # 1 carácter especial
        secrets.choice(digitos),      # 1 dígito
        secrets.choice(digitos),      # 1 dígito (total 2)
        secrets.choice(mayusculas),   # 1 mayúscula
    ]

    # Rellenar el resto con caracteres aleatorios de todos los conjuntos
    for _ in range(longitud - 4):
        contrasenya.append(secrets.choice(todas))

    # Mezclar para que los caracteres obligatorios no estén siempre al inicio
    secrets.SystemRandom().shuffle(contrasenya)

    return ''.join(contrasenya)


if __name__ == "__main__":
    print(generar_contrasenya())
