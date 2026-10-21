import type { AuthController } from '../controllers/useAuthController'

/** Vista de acceso: solo pinta el estado del controlador y le delega los eventos. */
export default function AuthView({ c }: { c: AuthController }): React.JSX.Element {
  return (
    <div className="center">
      <form
        className="card auth"
        onSubmit={(e) => {
          e.preventDefault()
          void c.submit()
        }}
      >
        <h1>🔐 Gestor de Contraseñas</h1>
        <p className="muted">
          {c.hasMaster
            ? 'Introduce tu contraseña maestra para desbloquear.'
            : 'No hay contraseña maestra. Crea una (mínimo 8 caracteres).'}
        </p>

        <label>
          {c.hasMaster ? 'Contraseña maestra' : 'Nueva contraseña maestra'}
          <input
            type="password"
            autoFocus
            autoComplete="off"
            value={c.password}
            onChange={(e) => c.setPassword(e.target.value)}
          />
        </label>

        {!c.hasMaster && (
          <label>
            Confirma la contraseña maestra
            <input
              type="password"
              autoComplete="off"
              value={c.confirmation}
              onChange={(e) => c.setConfirmation(e.target.value)}
            />
          </label>
        )}

        {c.error && <p className="error">{c.error}</p>}
        {c.lockout > 0 && <p className="error">Bloqueado: espera {c.lockout} s.</p>}

        <button className="primary" disabled={c.busy || c.lockout > 0 || !c.password}>
          {c.busy ? 'Comprobando…' : c.hasMaster ? 'Desbloquear' : 'Crear contraseña maestra'}
        </button>
      </form>
    </div>
  )
}
