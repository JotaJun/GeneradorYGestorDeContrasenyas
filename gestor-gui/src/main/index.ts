import { app, BrowserWindow, clipboard, ipcMain } from 'electron'
import path from 'node:path'
import { VaultController } from './controller/VaultController'
import { Vault } from './model/Vault'
import { VaultRepository } from './model/VaultRepository'
import { MainWindow } from './view/MainWindow'

/** En desarrollo usa la carpeta del proyecto Python (mismos .master_hash y contrasenyas.json). */
function carpetaDatos(): string {
  if (process.env.GESTOR_DATA_DIR) return path.resolve(process.env.GESTOR_DATA_DIR)
  return app.isPackaged ? app.getPath('userData') : path.resolve(app.getAppPath(), '..')
}

// Raíz de composición: aquí se crean y conectan Modelo, Vista y Controlador.
app.whenReady().then(() => {
  const repositorio = new VaultRepository(carpetaDatos())
  const vault = new Vault(repositorio)
  const ventana = new MainWindow()
  const controlador = new VaultController(vault, clipboard, ventana)

  controlador.register(ipcMain)

  app.on('web-contents-created', (_e, contents) => {
    contents.session.setPermissionRequestHandler((_wc, _permiso, cb) => cb(false))
  })

  const abrir = (): void => ventana.open(() => controlador.lock())
  abrir()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) abrir()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
