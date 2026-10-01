import { useState, useEffect, useCallback, useRef } from 'react'
import { parseGuideXml, type ParsedEpgData } from '../utils/parseGuide'
import { useAutoRefresh } from './useAutoRefresh'

interface UseEpgDataOptions {
  /** Re-download guide.xml in the background every `refreshInterval` ms */
  refreshInterval?: number
}

interface UseEpgDataResult {
  data: ParsedEpgData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useEpgData({ refreshInterval }: UseEpgDataOptions = {}): UseEpgDataResult {
  const [data, setData] = useState<ParsedEpgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const versionRef = useRef<string | null>(null)

  const fetchData = useCallback(async (background = false) => {
    try {
      if (!background) setLoading(true)
      setError(null)

      const response = await fetch('/guide.xml', { cache: 'no-cache' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Skip re-parsing the (large) guide when the server reports the same version
      const version = response.headers.get('etag') || response.headers.get('last-modified')
      if (background && version && version === versionRef.current) return

      const text = await response.text()
      const contentLength = response.headers.get('content-length')
      const fileSize = contentLength ? parseInt(contentLength) : new Blob([text]).size

      versionRef.current = version
      setData(parseGuideXml(text, fileSize))
    } catch (err) {
      // A failed background refresh keeps the data already on screen
      if (!background) setError(err instanceof Error ? err.message : 'Error fetching EPG data')
    } finally {
      if (!background) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const backgroundRefresh = useCallback(() => fetchData(true), [fetchData])
  useAutoRefresh(backgroundRefresh, refreshInterval)

  return { data, loading, error, refetch: fetchData }
}
