import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { PageViewMode } from '@/types'

export function useViewMode(pageKey: string, defaultMode: PageViewMode = 'cards') {
  const user = useAuthStore((state) => state.user)
  const [viewMode, setViewMode] = useState<PageViewMode>(defaultMode)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    const storageKey = `${pageKey}-view-mode-${user.id}`
    const saved = localStorage.getItem(storageKey)
    if (saved === 'cards' || saved === 'list') {
      setViewMode(saved)
    }
    setLoaded(true)
  }, [user?.id, pageKey])

  useEffect(() => {
    if (!user?.id || !loaded) return

    const storageKey = `${pageKey}-view-mode-${user.id}`
    localStorage.setItem(storageKey, viewMode)
  }, [user?.id, loaded, viewMode, pageKey])

  return { viewMode, setViewMode, loaded }
}
