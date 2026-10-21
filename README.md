# Gestor de Contraseñas (Electron + React + TypeScript)

Aplicación de escritorio para generar y guardar contraseñas de forma segura. Cada contraseña se genera automáticamente, se cifra con una contraseña maestra y se guarda en un archivo JSON local. Nada sale de tu equipo.

Es la versión gráfica del gestor de terminal en Python (`Gestor.py`) y usa el mismo formato de archivos, así que ambas versiones pueden compartir datos.

## Características

- Contraseña maestra con confirmación al crearla. Lo que escribes no se muestra.
- Generación automática de contraseñas de 16 caracteres (con al menos 1 carácter especial, 2 dígitos y 1 mayúscula).
- Añadir, listar, mostrar y borrar sites.
- Confirmación antes de mostrar una contraseña por pantalla o de borrar un site.
- Copiar al portapapeles: se vacía solo a los 20 segundos.
- Bloqueo automático tras 5 minutos de inactividad y botón para bloquear a mano.
- Bloqueo de 30 segundos tras 3 intentos fallidos de contraseña maestra.

## Requisitos

| Dependencia | Versión | Para qué |
|---|---|---|
| Node.js | 22.12 o superior | Compilar y ejecutar en desarrollo |
| npm | Incluido con Node | Instalar paquetes |
| libfuse2 (`libfuse2t64` en Ubuntu 24.04) | Cualquiera | Solo para ejecutar el AppImage en Linux |
| Python 3 + `cryptography` | Opcional | Solo para `npm run test:compat` |

Con Node 18 o anterior la instalación avisa con `EBADENGINE` y el build puede fallar. La forma más cómoda de tener Node 22 es [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 22
nvm use 22
```

### Paquetes de npm

Se instalan solos con `npm install`.

**En ejecución**
- `react` y `react-dom` 19: interfaz.
- `hash-wasm`: Argon2id (derivación de claves) sin módulos nativos.

**Solo para desarrollo y compilación**
- `electron` 44, `electron-vite` 6, `vite` 8, `@vitejs/plugin-react`
- `typescript` y `@types/node`, `@types/react`, `@types/react-dom`
- `electron-builder`: genera el instalable

## Instalación

Desde la carpeta `gestor-gui`:

```bash
npm install
```

## Uso

### Modo desarrollo

```bash
npm run dev
```

Abre la ventana directamente. En este modo la app usa los archivos de la carpeta del proyecto Python (`.master_hash` y `contrasenyas.json`).

### Generar el instalable (Linux)

```bash
npm run dist
```

El resultado queda en `dist/Gestor de Contraseñas-1.0.0.AppImage`. Para ejecutarlo:

```bash
chmod +x "dist/Gestor de Contraseñas-1.0.0.AppImage"
./"dist/Gestor de Contraseñas-1.0.0.AppImage"
```

Si no quieres instalar FUSE, usa la versión descomprimida que genera el mismo build:

```bash
./dist/linux-unpacked/gestor-gui --no-sandbox
```

### Abrirlo con un comando (opcional)

```bash
mkdir -p ~/.local/bin
cat > ~/.local/bin/Gestor <<'EOT'
#!/bin/sh
nohup "/RUTA/COMPLETA/gestor-gui/dist/Gestor de Contraseñas-1.0.0.AppImage" "$@" >/dev/null 2>&1 &
EOT
chmod +x ~/.local/bin/Gestor
```

Sustituye `/RUTA/COMPLETA` por la ruta real. A partir de ahí, escribir `Gestor` en la terminal abre la app.

## Cómo se usa la aplicación

1. **Primer arranque.** Si no hay contraseña maestra, la app te pide crear una (mínimo 8 caracteres) y confirmarla. Guárdala bien: **no se puede recuperar** y sin ella no se pueden descifrar las contraseñas.
2. **Siguientes arranques.** Introduce la contraseña maestra para desbloquear.
3. **Añadir un site.** Escribe el nombre en el campo "Nuevo site…" y pulsa *Añadir*. La contraseña se genera y se guarda cifrada. Si el site ya existe, la app pregunta antes de sobrescribirlo.
4. **Ver los sites.** Aparecen en la lista de la izquierda.
5. **Mostrar una contraseña.** Selecciona el site y pulsa *Mostrar*; confirma el aviso. Se oculta sola a los 15 segundos.
6. **Copiar una contraseña.** Selecciona el site y pulsa *Copiar*. Se borra del portapapeles a los 20 segundos.
7. **Borrar un site.** Selecciona el site, pulsa *Borrar* y confirma. No se puede deshacer.
8. **Bloquear.** El botón *Bloquear* vuelve a pedir la contraseña maestra. También se bloquea solo tras 5 minutos sin actividad.

## Dónde se guardan los datos

| Archivo | Contenido |
|---|---|
| `.master_hash` | Salt (16 bytes) + hash Argon2id de la contraseña maestra |
| `contrasenyas.json` | `{ "site": "contraseña_cifrada_en_base64" }` |

Ambos se guardan con permisos `600` (solo tu usuario).

La carpeta depende de cómo se ejecute:

- `npm run dev`: la carpeta del proyecto Python (la carpeta superior a `gestor-gui`).
- App empaquetada: la carpeta de datos del usuario (en Linux, `~/.config/gestor-gui/`).
- Para forzar una carpeta, usa la variable `GESTOR_DATA_DIR`:

```bash
GESTOR_DATA_DIR="/ruta/a/mis/datos" ./"dist/Gestor de Contraseñas-1.0.0.AppImage"
```

Haz copia de seguridad de esos dos archivos. Sin `.master_hash` y sin tu contraseña maestra, el contenido de `contrasenyas.json` no es recuperable.

## Seguridad

- **Derivación de clave:** Argon2id (3 iteraciones, 4 lanes, 64 MiB), con una salt aleatoria de 16 bytes por cada contraseña guardada.
- **Cifrado:** AES-128-CBC con relleno PKCS7. Formato de cada dato: `Salted__` + salt + texto cifrado.
- **Aislamiento:** la contraseña maestra solo vive en el proceso principal de Electron. La interfaz no la ve ni puede leerla; solo recibe resultados de cada operación.
- **Electron:** `contextIsolation` y `sandbox` activados, `nodeIntegration` desactivado, política de seguridad de contenido (CSP) restrictiva y sin navegación externa ni permisos del navegador.
- **Limitación conocida:** AES-CBC no autentica los datos, por lo que una modificación manual del JSON podría dar un error de descifrado o texto sin sentido. No es un problema de confidencialidad, pero no detecta manipulaciones.

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca la app en modo desarrollo |
| `npm run build` | Compila main, preload y renderer en `out/` |
| `npm run typecheck` | Comprueba los tipos de TypeScript |
| `npm run dist` | Compila y genera el instalable en `dist/` |
| `npm run test:compat` | Comprueba que el cifrado es compatible con el de Python (necesita `python3` y `cryptography`) |

## Estructura del proyecto

```
gestor-gui/
├── electron-builder.yml       Configuración del instalable
├── electron.vite.config.ts    Configuración del build
├── build/icon.png             Icono de la app
├── scripts/compat-check.mjs   Prueba de compatibilidad con Python
└── src/
    ├── main/                  Proceso principal (Node)
    │   ├── index.ts           Ventana, IPC, bloqueo por inactividad, portapapeles
    │   ├── vault.ts           Lógica de la contraseña maestra y de los sites
    │   ├── crypto.ts          Argon2id + AES-128-CBC
    │   └── generator.ts       Generador de contraseñas
    ├── preload/               Puente seguro entre main y la interfaz
    ├── shared/types.ts        Tipos compartidos
    └── renderer/              Interfaz React
        └── src/components/    AuthScreen, VaultScreen, ConfirmDialog
```

## Problemas frecuentes

- **`electron-vite: not found`**: faltan las dependencias; ejecuta `npm install` dentro de `gestor-gui`.
- **Avisos `EBADENGINE` o fallos al compilar**: tu versión de Node es antigua; usa Node 22 (`nvm use 22`), borra `node_modules` y repite `npm install`.
- **`libfuse.so.2` al abrir el AppImage**: instala FUSE (`sudo apt install libfuse2t64`) o usa `dist/linux-unpacked/gestor-gui --no-sandbox`.
- **"Contraseña incorrecta" con datos del gestor de Python antiguo**: los archivos creados con PBKDF2 no son compatibles. Borra `.master_hash` y `contrasenyas.dat` y empieza de nuevo.
