import { useEffect, useState } from 'react'
import { vaultService } from '../model/vaultService'

/** Controlador de la pantalla de acceso: crear la maestra o desbloquear. */
export function useAuthController(
  hasMaster: boolean,
  lockoutSeconds: number,
  onUnlocked: () => void
) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [lockout, setLockout] = useState(lockoutSeconds)

  useEffect(() => {
    if (lockout <= 0) return
    const t = setTimeout(() => setLockout((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [lockout])

  async function submit(): Promise<void> {
    setError('')
    setBusy(true)
    const r = hasMaster
      ? await vaultService.unlock(password)
      : await vaultService.createMaster(password, confirmation)
    setBusy(false)
    setPassword('')
    setConfirmation('')
    if (r.ok) {
      onUnlocked()
      return
    }
    setError(r.error)
    const s = await vaultService.status()
    if (s.ok) setLockout(s.data.lockoutSeconds)
  }

  return {
    hasMaster,
    password,
    setPassword,
    confirmation,
    setConfirmation,
    error,
    busy,
    lockout,
    submit
  }
}

export type AuthController = ReturnType<typeof useAuthController>
