import { useCallback, useEffect, useRef, useState } from 'react'
import { vaultService } from '../model/vaultService'
import type { Notice, PendingAction, RevealedPassword } from '../model/types'

const OCULTAR_TRAS_MS = 15_000

/** Controlador del gestor: sites, selección, acciones y confirmaciones. */
export function useVaultController(onLocked: () => void) {
  const [sites, setSites] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [newSite, setNewSite] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [revealed, setRevealed] = useState<RevealedPassword | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const notify = (texto: string, error = false): void => setNotice({ texto, error })

  const load = useCallback(async () => {
    const r = await vaultService.listSites()
    if (r.ok) setSites(r.data)
    else setNotice({ texto: r.error, error: true })
  }, [])

  useEffect(() => {
    void load()
    return () => clearTimeout(timer.current)
  }, [load])

  const hide = useCallback((): void => {
    clearTimeout(timer.current)
    setRevealed(null)
  }, [])

  function select(site: string): void {
    setSelected(site)
    if (revealed?.site !== site) hide()
  }

  async function addSite(overwrite = false, name = newSite): Promise<void> {
    const r = await vaultService.addSite(name, overwrite)
    if (r.ok) {
      notify(`Contraseña generada y guardada para '${name.trim()}'.`)
      setNewSite('')
      setSelected(name.trim())
      await load()
    } else if (r.error === 'EXISTS') {
      setPending({ tipo: 'sobrescribir', site: name })
    } else {
      notify(r.error, true)
    }
  }

  const requestReveal = (site: string): void => setPending({ tipo: 'mostrar', site })
  const requestDelete = (site: string): void => setPending({ tipo: 'borrar', site })
  const cancelPending = (): void => setPending(null)

  async function confirmPending(): Promise<void> {
    if (!pending) return
    const { tipo, site } = pending
    setPending(null)

    if (tipo === 'sobrescribir') return addSite(true, site)

    if (tipo === 'mostrar') {
      const r = await vaultService.revealPassword(site)
      if (!r.ok) return notify(r.error, true)
      clearTimeout(timer.current)
      setRevealed({ site, contrasenya: r.data })
      timer.current = setTimeout(() => setRevealed(null), OCULTAR_TRAS_MS)
      return
    }

    const r = await vaultService.deleteSite(site)
    if (!r.ok) return notify(r.error, true)
    notify(`'${site}' borrado.`)
    if (selected === site) setSelected(null)
    if (revealed?.site === site) hide()
    await load()
  }

  async function copy(site: string): Promise<void> {
    const r = await vaultService.copyPassword(site)
    notify(r.ok ? 'Copiada. Se borrará del portapapeles en 20 s.' : r.error, !r.ok)
  }

  async function lock(): Promise<void> {
    hide()
    await vaultService.lock()
    onLocked()
  }

  return {
    sites,
    selected,
    select,
    newSite,
    setNewSite,
    addSite,
    notice,
    dismissNotice: () => setNotice(null),
    pending,
    requestReveal,
    requestDelete,
    confirmPending,
    cancelPending,
    revealed,
    hide,
    copy,
    lock
  }
}

export type VaultController = ReturnType<typeof useVaultController>
