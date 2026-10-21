interface Props {
  titulo: string
  mensaje: string
  confirmar: string
  peligro?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog(p: Props): React.JSX.Element {
  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={p.onCancel}>
      <div className="card dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{p.titulo}</h2>
        <p>{p.mensaje}</p>
        <div className="row end">
          <button onClick={p.onCancel}>Cancelar</button>
          <button className={p.peligro ? 'danger' : 'primary'} onClick={p.onConfirm} autoFocus>
            {p.confirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
