import { BrowserWindow, shell } from 'electron'
import path from 'node:path'
import type { LockNotifier } from '../controller/VaultController'

/** Vista (lado main): la ventana que aloja la interfaz React y su configuración de seguridad. */
export class MainWindow implements LockNotifier {
  private ventana: BrowserWindow | null = null

  open(onClosed: () => void): void {
    const ventana = new BrowserWindow({
      width: 900,
      height: 620,
      minWidth: 680,
      minHeight: 460,
      title: 'Gestor de Contraseñas',
      backgroundColor: '#14161a',
      autoHideMenuBar: true,
      // Oculta la ventana hasta que la interfaz esté pintada (evita ver un fondo vacío)
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    this.ventana = ventana
    ventana.once('ready-to-show', () => ventana.show())

    // Sin navegación ni ventanas externas desde el renderer
    ventana.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) void shell.openExternal(url)
      return { action: 'deny' }
    })
    ventana.webContents.on('will-navigate', (e, url) => {
      if (url !== ventana.webContents.getURL()) e.preventDefault()
    })

    if (process.env.ELECTRON_RENDERER_URL) {
      void ventana.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
      void ventana.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    ventana.on('closed', () => {
      this.ventana = null
      onClosed()
    })
  }

  notifyLocked(): void {
    this.ventana?.webContents.send('vault:locked')
  }
}
