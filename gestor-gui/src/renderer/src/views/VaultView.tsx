import type { VaultController } from '../controllers/useVaultController'
import type { PendingAction } from '../model/types'
import ConfirmDialog from './ConfirmDialog'

function textoDialogo(tipo: PendingAction['tipo'], site: string): { t: string; m: string; c: string } {
  switch (tipo) {
    case 'mostrar':
      return {
        t: 'Mostrar contraseña',
        m: `¿Seguro que quieres mostrar la contraseña de '${site}' por pantalla?`,
        c: 'Mostrar'
      }
    case 'borrar':
      return {
        t: 'Borrar site',
        m: `¿Seguro que quieres borrar '${site}'? No se puede deshacer.`,
        c: 'Borrar'
      }
    case 'sobrescribir':
      return {
        t: 'El site ya existe',
        m: `'${site.trim()}' ya existe. ¿Generar una contraseña nueva y sobrescribirla?`,
        c: 'Sobrescribir'
      }
  }
}

/** Vista del gestor: solo pinta el estado del controlador y le delega los eventos. */
export default function VaultView({ c }: { c: VaultController }): React.JSX.Element {
  const dialogo = c.pending ? textoDialogo(c.pending.tipo, c.pending.site) : null
  const mostrando = c.selected !== null && c.revealed?.site === c.selected

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="row between head">
          <h2>Sites</h2>
          <button onClick={() => void c.lock()} title="Bloquear">
            🔒 Bloquear
          </button>
        </div>

        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            void c.addSite()
          }}
        >
          <input
            placeholder="Nuevo site…"
            value={c.newSite}
            onChange={(e) => c.setNewSite(e.target.value)}
          />
          <button className="primary" disabled={!c.newSite.trim()}>
            Añadir
          </button>
        </form>

        <ul className="list">
          {c.sites.length === 0 && <li className="muted empty">No hay sites guardados.</li>}
          {c.sites.map((s) => (
            <li key={s}>
              <button
                className={'item' + (s === c.selected ? ' active' : '')}
                onClick={() => c.select(s)}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="detail">
        {c.selected ? (
          <div className="card">
            <h1>{c.selected}</h1>
            <div className="secret">
              {mostrando && c.revealed ? (
                <code>{c.revealed.contrasenya}</code>
              ) : (
                <span className="muted">••••••••••••••••</span>
              )}
            </div>
            <div className="row">
              {mostrando ? (
                <button onClick={c.hide}>Ocultar</button>
              ) : (
                <button onClick={() => c.requestReveal(c.selected!)}>Mostrar</button>
              )}
              <button className="primary" onClick={() => void c.copy(c.selected!)}>
                Copiar
              </button>
              <button className="danger" onClick={() => c.requestDelete(c.selected!)}>
                Borrar
              </button>
            </div>
            {mostrando && <p className="muted small">Se ocultará automáticamente en 15 s.</p>}
          </div>
        ) : (
          <p className="muted center">Selecciona un site o añade uno nuevo.</p>
        )}

        {c.notice && (
          <p className={c.notice.error ? 'toast error' : 'toast'} onClick={c.dismissNotice}>
            {c.notice.texto}
          </p>
        )}
      </main>

      {dialogo && c.pending && (
        <ConfirmDialog
          titulo={dialogo.t}
          mensaje={dialogo.m}
          confirmar={dialogo.c}
          peligro={c.pending.tipo !== 'mostrar'}
          onConfirm={() => void c.confirmPending()}
          onCancel={c.cancelPending}
        />
      )}
    </div>
  )
}
