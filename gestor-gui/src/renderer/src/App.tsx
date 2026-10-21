import { useAuthController } from './controllers/useAuthController'
import { useSessionController } from './controllers/useSessionController'
import { useVaultController } from './controllers/useVaultController'
import AuthView from './views/AuthView'
import VaultView from './views/VaultView'

function Auth({ hasMaster, lockoutSeconds, onUnlocked }: {
  hasMaster: boolean
  lockoutSeconds: number
  onUnlocked: () => void
}): React.JSX.Element {
  return <AuthView c={useAuthController(hasMaster, lockoutSeconds, onUnlocked)} />
}

function Vault({ onLocked }: { onLocked: () => void }): React.JSX.Element {
  return <VaultView c={useVaultController(onLocked)} />
}

/** Elige la vista según el estado de la sesión. */
export default function App(): React.JSX.Element {
  const { status, refresh } = useSessionController()

  if (!status) return <div className="center muted">Cargando…</div>

  return status.unlocked ? (
    <Vault onLocked={refresh} />
  ) : (
    <Auth hasMaster={status.hasMaster} lockoutSeconds={status.lockoutSeconds} onUnlocked={refresh} />
  )
}
