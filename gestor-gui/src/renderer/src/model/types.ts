/** Acción pendiente de confirmación por parte del usuario. */
export interface PendingAction {
  tipo: 'mostrar' | 'borrar' | 'sobrescribir'
  site: string
}

/** Contraseña descifrada que se está mostrando en pantalla. */
export interface RevealedPassword {
  site: string
  contrasenya: string
}

export interface Notice {
  texto: string
  error: boolean
}
