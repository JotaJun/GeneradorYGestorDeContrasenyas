import { useCallback, useEffect, useState } from 'react'
import type { VaultStatus } from '../../../shared/types'
import { vaultService } from '../model/vaultService'

/** Controlador de sesión: sabe si hay maestra y si el gestor está desbloqueado. */
export function useSessionController(): { status: VaultStatus | null; refresh: () => Promise<void> } {
  const [status, setStatus] = useState<VaultStatus | null>(null)

  const refresh = useCallback(async () => {
    const r = await vaultService.status()
    if (r.ok) setStatus(r.data)
  }, [])

  useEffect(() => {
    void refresh()
    // El proceso main avisa cuando se bloquea por inactividad
    return vaultService.onLocked(() => void refresh())
  }, [refresh])

  return { status, refresh }
}
