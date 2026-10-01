import { useState, useEffect, useCallback } from 'react'
import { useAutoRefresh } from './useAutoRefresh'

export interface LineupGroup {
  name: string
  channels: string[]
}

export interface Lineup {
  generatedAt: string
  groups: LineupGroup[]
  logos: Record<string, string>
}

/**
 * Loads lineup.json: channel groups and order generated from the private M3U list.
 * Returns null while loading or when the file is missing, so callers can fall back.
 */
export function useLineup(refreshInterval?: number): { lineup: Lineup | null; loading: boolean } {
  const [lineup, setLineup] = useState<Lineup | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLineup = useCallback(async () => {
    try {
      const response = await fetch('/lineup.json', { cache: 'no-cache' })
      if (!response.ok) return
      const json = (await response.json()) as Lineup
      if (Array.isArray(json.groups)) setLineup(json)
    } catch {
      // Keep the previous lineup (or none) when the file is missing or invalid
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLineup()
  }, [fetchLineup])

  useAutoRefresh(fetchLineup, refreshInterval)

  return { lineup, loading }
}
