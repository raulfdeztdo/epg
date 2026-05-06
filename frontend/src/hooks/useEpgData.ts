import { useState, useEffect, useCallback } from 'react'
import { parseGuideXml, type ParsedEpgData } from '../utils/parseGuide'

interface UseEpgDataResult {
  data: ParsedEpgData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useEpgData(): UseEpgDataResult {
  const [data, setData] = useState<ParsedEpgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/guide.xml')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const text = await response.text()
      const contentLength = response.headers.get('content-length')
      const fileSize = contentLength ? parseInt(contentLength) : new Blob([text]).size

      const parsed = parseGuideXml(text, fileSize)
      setData(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching EPG data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
